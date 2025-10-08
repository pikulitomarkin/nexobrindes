import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, CheckCircle, AlertCircle, Download, Plus, Link, DollarSign, CreditCard, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinanceReconciliation() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<any[]>([]);
  const [isAssociationDialogOpen, setIsAssociationDialogOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  const { data: reconciliation, isLoading } = useQuery({
    queryKey: ["/api/finance/reconciliation"],
  });

  const { data: bankTransactions } = useQuery({
    queryKey: ["/api/finance/bank-transactions"],
  });

  const { data: expenses } = useQuery({
    queryKey: ["/api/finance/expenses"],
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ["/api/finance/pending-orders"],
  });

  const uploadOFXMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch("/api/finance/ofx-import", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Erro ao importar arquivo OFX");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-transactions"] });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      toast({
        title: "Sucesso!",
        description: "Arquivo OFX importado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível importar o arquivo OFX",
        variant: "destructive",
      });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount).toFixed(2),
          date: new Date(data.date),
          status: 'recorded',
          createdBy: 'current-user'
        }),
      });
      if (!response.ok) throw new Error("Erro ao criar lançamento de gasto");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/expenses"] });
      setIsExpenseDialogOpen(false);
      setExpenseData({
        description: "",
        amount: "",
        category: "",
        date: new Date().toISOString().split('T')[0]
      });
      toast({
        title: "Sucesso!",
        description: "Lançamento de gasto criado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o lançamento de gasto",
        variant: "destructive",
      });
    },
  });

  const associatePaymentMutation = useMutation({
    mutationFn: async ({ transactionId, orderId, amount }: { transactionId: string; orderId: string; amount: string }) => {
      const response = await fetch("/api/finance/associate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId,
          orderId,
          amount: parseFloat(amount).toFixed(2)
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao associar pagamento");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setIsAssociationDialogOpen(false);
      setSelectedOrder(null);
      setSelectedTransactions([]);
      toast({
        title: "Sucesso!",
        description: `Pagamento de R$ ${parseFloat(data.payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} confirmado para o pedido ${selectedOrder?.orderNumber}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível associar o pagamento",
        variant: "destructive",
      });
    },
  });

  const associateMultiplePaymentsMutation = useMutation({
    mutationFn: async ({ transactions, orderId, totalAmount }: { transactions: any[]; orderId: string; totalAmount: string }) => {
      // Validar dados antes de enviar
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        throw new Error("Nenhuma transação selecionada");
      }

      if (!orderId) {
        throw new Error("ID do pedido não informado");
      }

      const payload = {
        transactions: transactions.map((txn, index) => {
          if (!txn || !txn.id) {
            throw new Error(`Transação ${index + 1} não tem ID válido`);
          }
          if (!txn.amount && txn.amount !== 0) {
            throw new Error(`Transação ${index + 1} não tem valor válido`);
          }
          const amount = parseFloat(txn.amount.toString());
          if (isNaN(amount)) {
            throw new Error(`Transação ${index + 1} tem valor inválido: ${txn.amount}`);
          }
          return {
            transactionId: txn.id,
            amount: amount
          };
        }),
        orderId: orderId,
        totalAmount: parseFloat(totalAmount.toString())
      };
      
      console.log("Sending payload to API:", JSON.stringify(payload, null, 2));
      
      const response = await fetch("/api/finance/associate-multiple-payments", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
      });
      
      console.log("API response status:", response.status);
      console.log("API response headers:", Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log("API response text:", responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error(`Resposta inválida do servidor: ${responseText.substring(0, 100)}...`);
      }
      
      if (!response.ok) {
        console.error("API error response data:", responseData);
        const errorMessage = responseData?.error || responseData?.message || `Erro HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      if (!responseData.success) {
        throw new Error(responseData.error || "Falha na operação");
      }
      
      return responseData;
    },
    onSuccess: (data) => {
      console.log("Success response:", data);
      
      queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      
      setIsAssociationDialogOpen(false);
      setSelectedOrder(null);
      setSelectedTransactions([]);
      
      let description = `${data.paymentsCreated} pagamentos totalizando R$ ${parseFloat(data.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} confirmados para o pedido ${selectedOrder?.orderNumber}`;
      
      if (data.errors && data.errors.length > 0) {
        description += `\n\nAvisos: ${data.errors.join('; ')}`;
      }
      
      toast({
        title: "Conciliação Realizada!",
        description: description,
      });
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        title: "Erro na Conciliação",
        description: error.message || "Não foi possível associar os pagamentos. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.name.endsWith('.ofx') || file.name.endsWith('.OFX'))) {
      setSelectedFile(file);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo OFX válido",
        variant: "destructive",
      });
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadOFXMutation.mutate(selectedFile);
    }
  };

  const handleCreateExpense = () => {
    if (expenseData.description && expenseData.amount && expenseData.category) {
      createExpenseMutation.mutate(expenseData);
    }
  };

  const openAssociationDialog = (order: any) => {
    setSelectedOrder(order);
    setSelectedTransactions([]);
    setIsAssociationDialogOpen(true);
  };

  const handleAssociatePayment = () => {
    // Validações básicas
    if (!selectedOrder || selectedTransactions.length === 0) {
      toast({
        title: "Erro de Validação",
        description: "Selecione um pedido e pelo menos uma transação para confirmar o pagamento",
        variant: "destructive",
      });
      return;
    }

    // Validar se todas as transações têm dados válidos
    const invalidTransactions = selectedTransactions.filter(txn => 
      !txn || !txn.id || !txn.amount || isNaN(parseFloat(txn.amount))
    );

    if (invalidTransactions.length > 0) {
      toast({
        title: "Erro de Validação", 
        description: `${invalidTransactions.length} transação(ões) com dados inválidos. Verifique as transações selecionadas.`,
        variant: "destructive",
      });
      return;
    }

    const totalTransactionAmount = selectedTransactions.reduce((sum, txn) => {
      const amount = parseFloat(txn.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    if (totalTransactionAmount <= 0) {
      toast({
        title: "Erro de Validação",
        description: "O valor total das transações deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    const remainingBalance = parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0');

    if (totalTransactionAmount > remainingBalance + (remainingBalance * 0.05)) { // 5% de tolerância
      toast({
        title: "Atenção",
        description: `O valor total das transações (R$ ${totalTransactionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) é maior que o saldo devedor (R$ ${remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Deseja continuar?`,
        variant: "destructive",
      });
      // Continua mesmo assim, mas alerta o usuário
    }

    console.log("Starting payment association with:", {
      selectedOrder: selectedOrder.id,
      transactionsCount: selectedTransactions.length,
      totalAmount: totalTransactionAmount
    });

    // Processar múltiplas transações
    associateMultiplePaymentsMutation.mutate({
      transactions: selectedTransactions,
      orderId: selectedOrder.id,
      totalAmount: totalTransactionAmount.toFixed(2)
    });
  };

  const getCompatibleTransactions = (orderValue: number) => {
    if (!bankTransactions) return [];

    const tolerance = 0.05; // 5% de tolerância
    return bankTransactions.filter((transaction: any) => 
      transaction.status === 'unmatched' &&
      parseFloat(transaction.amount) > 0 && // Apenas entradas (valores positivos)
      Math.abs(parseFloat(transaction.amount) - orderValue) <= (orderValue * tolerance)
    );
  };

  const getAllUnmatchedIncomingTransactions = () => {
    if (!bankTransactions) return [];

    return bankTransactions.filter((transaction: any) => 
      (transaction.status === 'unmatched' || !transaction.status) &&
      parseFloat(transaction.amount) > 0 // Apenas entradas (valores positivos)
    );
  };

  const getAvailableTransactions = (transactions: any[]) => {
    // Remove transações já selecionadas para evitar duplicação visual
    return transactions.filter(txn => !selectedTransactions.find(selected => selected.id === txn.id));
  };

  const handleSelectAllCompatible = (transactions: any[]) => {
    const availableTransactions = getAvailableTransactions(transactions);
    setSelectedTransactions(prev => [...prev, ...availableTransactions]);
  };

  const handleDeselectAll = () => {
    setSelectedTransactions([]);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const unreconciled = bankTransactions?.filter((t: any) => t.status === 'unmatched') || [];
  const reconciled = bankTransactions?.filter((t: any) => t.status === 'matched') || [];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Conciliação Bancária</h1>
          <p className="text-gray-600">Importação de extratos OFX e associação de pagamentos aos pedidos</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg text-white">
                <Upload className="h-4 w-4 mr-2" />
                Importar OFX
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Arquivo OFX</DialogTitle>
                <DialogDescription>
                  Selecione o arquivo OFX do seu banco para importar as transações
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ofx-file">Arquivo OFX</Label>
                  <Input
                    id="ofx-file"
                    type="file"
                    accept=".ofx,.OFX"
                    onChange={handleFileChange}
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-700">{selectedFile.name}</span>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="gradient-bg text-white"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadOFXMutation.isPending}
                  >
                    {uploadOFXMutation.isPending ? "Importando..." : "Importar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Lançar Gasto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lançamento de Gasto</DialogTitle>
                <DialogDescription>
                  Registre um gasto avulso ou despesa não relacionada a pedidos
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="expense-date">Data</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={expenseData.date}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="expense-description">Descrição</Label>
                  <Input
                    id="expense-description"
                    placeholder="Descreva o gasto..."
                    value={expenseData.description}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expense-amount">Valor (R$)</Label>
                    <Input
                      id="expense-amount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={expenseData.amount}
                      onChange={(e) => setExpenseData(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expense-category">Categoria</Label>
                    <select
                      id="expense-category"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={expenseData.category}
                      onChange={(e) => setExpenseData(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      <option value="operational">Operacional</option>
                      <option value="marketing">Marketing</option>
                      <option value="travel">Viagem</option>
                      <option value="equipment">Equipamento</option>
                      <option value="supplies">Material</option>
                      <option value="services">Serviços</option>
                      <option value="other">Outros</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="gradient-bg text-white"
                    onClick={handleCreateExpense}
                    disabled={!expenseData.description || !expenseData.amount || !expenseData.category || createExpenseMutation.isPending}
                  >
                    {createExpenseMutation.isPending ? "Salvando..." : "Salvar Gasto"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transações Conciliadas</p>
                <p className="text-3xl font-bold gradient-text">
                  {reconciled.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-3xl font-bold gradient-text">
                  {unreconciled.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pedidos c/ Saldo</p>
                <p className="text-3xl font-bold gradient-text">
                  {pendingOrders?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gastos do Mês</p>
                <p className="text-3xl font-bold gradient-text">
                  R$ {(expenses?.filter((e: any) => {
                    const expenseMonth = new Date(e.date).getMonth();
                    const currentMonth = new Date().getMonth();
                    return expenseMonth === currentMonth;
                  }).reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0) || 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Reconciliation Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Conciliação de Pagamentos dos Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="awaiting-down-payment" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="awaiting-down-payment" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Aguardando Entrada ({pendingOrders?.filter((order: any) => parseFloat(order.paidValue || '0') === 0).length || 0})
              </TabsTrigger>
              <TabsTrigger value="awaiting-final-payment" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Aguardando Finalização ({pendingOrders?.filter((order: any) => parseFloat(order.paidValue || '0') > 0).length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="awaiting-down-payment" className="mt-6">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingOrders?.filter((order: any) => parseFloat(order.paidValue || '0') === 0).map((order: any) => {
                  const remainingValue = parseFloat(order.totalValue) - parseFloat(order.paidValue || '0');

                  // Get budget down payment info if available
                  let budgetDownPayment = 0;
                  let expectedDownPayment = remainingValue; // Default to remaining value

                  if (order.budgetInfo && order.budgetInfo.downPayment) {
                    budgetDownPayment = parseFloat(order.budgetInfo.downPayment);
                    expectedDownPayment = budgetDownPayment;
                  }

                  // Get transactions that match the expected payment amount
                  const expectedCompatibleTransactions = getCompatibleTransactions(expectedDownPayment);

                  return (
                    <div key={order.id} className="p-4 bg-orange-50 rounded-lg border border-orange-200 hover:border-orange-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-sm text-gray-600">{order.clientName}</p>
                          <p className="text-xs text-gray-500">
                            Criado em: {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">
                            R$ {remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-500">
                            Total: R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {budgetDownPayment > 0 && (
                            <p className="text-xs text-blue-600 font-medium">
                              Entrada esperada: R$ {budgetDownPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                          {budgetDownPayment === 0 && (
                            <p className="text-xs text-orange-600">
                              Aguardando entrada
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {budgetDownPayment > 0 ? (
                            <span className="text-blue-600">
                              Entrada orçamento: R$ {budgetDownPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({Math.round((budgetDownPayment / parseFloat(order.totalValue)) * 100)}%)
                            </span>
                          ) : (
                            <span className="text-orange-600">Aguardando definição de entrada</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {expectedCompatibleTransactions.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              {expectedCompatibleTransactions.length} transação{expectedCompatibleTransactions.length !== 1 ? 'ões' : ''} compatível{expectedCompatibleTransactions.length !== 1 ? 'is' : ''}
                              {budgetDownPayment > 0 && (
                                <span className="ml-1">(R$ {expectedDownPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
                              )}
                            </Badge>
                          )}
                          {getAllUnmatchedIncomingTransactions().length > 0 && expectedCompatibleTransactions.length === 0 && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                              {getAllUnmatchedIncomingTransactions().length} transação{getAllUnmatchedIncomingTransactions().length !== 1 ? 'ões' : ''} disponível{getAllUnmatchedIncomingTransactions().length !== 1 ? 'is' : ''}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            onClick={() => openAssociationDialog(order)}
                            className="gradient-bg text-white hover:opacity-90"
                            disabled={!bankTransactions || bankTransactions.filter((t: any) => (t.status === 'unmatched' || !t.status) && parseFloat(t.amount) > 0).length === 0}
                          >
                            <Link className="h-3 w-3 mr-1" />
                            Confirmar Entrada
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }) || []}

                {(!pendingOrders?.filter((order: any) => parseFloat(order.paidValue || '0') === 0) || pendingOrders.filter((order: any) => parseFloat(order.paidValue || '0') === 0).length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum pedido aguardando entrada</p>
                    <p className="text-xs">Todos os pedidos já receberam o pagamento inicial</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="awaiting-final-payment" className="mt-6">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingOrders?.filter((order: any) => parseFloat(order.paidValue || '0') > 0).map((order: any) => {
                  const remainingValue = parseFloat(order.totalValue) - parseFloat(order.paidValue || '0');
                  const compatibleTransactions = getCompatibleTransactions(remainingValue);

                  return (
                    <div key={order.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-sm text-gray-600">{order.clientName}</p>
                          <p className="text-xs text-gray-500">
                            Criado em: {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">
                            R$ {remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-500">
                            Total: R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-green-600">
                            Pago: R$ {parseFloat(order.paidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="text-green-600">
                            {Math.round((parseFloat(order.paidValue) / parseFloat(order.totalValue)) * 100)}% pago
                          </span>
                          <span className="text-blue-600 ml-2">
                            Aguardando R$ {remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para finalização
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {compatibleTransactions.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              {compatibleTransactions.length} transação{compatibleTransactions.length !== 1 ? 'ões' : ''} compatível{compatibleTransactions.length !== 1 ? 'is' : ''}
                            </Badge>
                          )}
                          {getAllUnmatchedIncomingTransactions().length > 0 && compatibleTransactions.length === 0 && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                              {getAllUnmatchedIncomingTransactions().length} transação{getAllUnmatchedIncomingTransactions().length !== 1 ? 'ões' : ''} disponível{getAllUnmatchedIncomingTransactions().length !== 1 ? 'is' : ''}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            onClick={() => openAssociationDialog(order)}
                            className="gradient-bg text-white hover:opacity-90"
                            disabled={!bankTransactions || bankTransactions.filter((t: any) => (t.status === 'unmatched' || !t.status) && parseFloat(t.amount) > 0).length === 0}
                          >
                            <Link className="h-3 w-3 mr-1" />
                            Confirmar Pagamento Final
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }) || []}

                {(!pendingOrders?.filter((order: any) => parseFloat(order.paidValue || '0') > 0) || pendingOrders.filter((order: any) => parseFloat(order.paidValue || '0') > 0).length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum pedido aguardando pagamento final</p>
                    <p className="text-xs">Todos os pedidos estão aguardando entrada ou já foram finalizados</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Association Dialog */}
      <Dialog open={isAssociationDialogOpen} onOpenChange={setIsAssociationDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Confirmar Pagamento do Pedido
            </DialogTitle>
            <DialogDescription>
              Selecione a transação bancária que corresponde ao pagamento deste pedido. 
              O sistema criará automaticamente o registro de pagamento.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">📋 Pedido Selecionado</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Número:</span> {selectedOrder.orderNumber}
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Cliente:</span> {selectedOrder.clientName}
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Valor Total:</span> 
                    <span className="font-bold"> R$ {parseFloat(selectedOrder.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Já Pago:</span> 
                    <span className="font-bold"> R$ {parseFloat(selectedOrder.paidValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {selectedOrder.budgetInfo && selectedOrder.budgetInfo.downPayment > 0 && parseFloat(selectedOrder.paidValue || '0') === 0 && (
                    <div className="col-span-2 p-2 bg-green-50 rounded border border-green-200">
                      <span className="text-green-700 font-medium">💰 Entrada Esperada (Orçamento):</span> 
                      <span className="font-bold text-green-800"> R$ {selectedOrder.budgetInfo.downPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <div className="text-xs text-green-600 mt-1">
                        Entrada registrada no orçamento original - procure transações com este valor
                      </div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-blue-700 font-medium">Saldo Devedor:</span> 
                    <span className="font-bold text-red-600"> R$ {(parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Selected Transactions Preview */}
              {selectedTransactions.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">
                    ✅ {selectedTransactions.length} Transação{selectedTransactions.length !== 1 ? 'ões' : ''} Selecionada{selectedTransactions.length !== 1 ? 's' : ''}
                  </h4>
                  <div className="space-y-3">
                    {selectedTransactions.map((transaction, index) => (
                      <div key={transaction.id} className="grid grid-cols-2 gap-4 text-sm p-3 bg-white rounded border">
                        <div>
                          <span className="text-green-700 font-medium">#{index + 1} Data:</span> {(() => {
                            if (!transaction.date) return 'Data não disponível';
                            try {
                              const date = new Date(transaction.date);
                              if (isNaN(date.getTime())) return 'Data inválida';
                              return date.toLocaleDateString('pt-BR');
                            } catch (error) {
                              return 'Data inválida';
                            }
                          })()}</div>
                        <div>
                          <span className="text-green-700 font-medium">Valor:</span> 
                          <span className="font-bold"> R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-green-700 font-medium">Descrição:</span> {transaction.description}
                        </div>
                      </div>
                    ))}
                    {selectedOrder && (
                      <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <span className="text-blue-700 font-medium">Resumo dos Pagamentos:</span>
                        <div className="text-sm mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-600">Total das transações: </span>
                            <span className="font-bold text-green-600">
                              R$ {selectedTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Saldo devedor: </span>
                            <span className="font-medium">R$ {(parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">Saldo após pagamentos: </span>
                            <span className={`font-medium ${(parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0') - selectedTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0)) <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                              R$ {Math.max(0, parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0') - selectedTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Compatible Transactions */}
              <div>
                {selectedOrder.budgetInfo && selectedOrder.budgetInfo.downPayment > 0 && parseFloat(selectedOrder.paidValue || '0') === 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-xs font-bold">
                          {getCompatibleTransactions(selectedOrder.budgetInfo.downPayment).length}
                        </span>
                        🎯 Transações Compatíveis com Entrada (R$ {selectedOrder.budgetInfo.downPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                      </h4>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectAllCompatible(getCompatibleTransactions(selectedOrder.budgetInfo.downPayment))}
                          disabled={getAvailableTransactions(getCompatibleTransactions(selectedOrder.budgetInfo.downPayment)).length === 0}
                          className="text-xs"
                        >
                          Selecionar Todas
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-green-50">
                      {getCompatibleTransactions(selectedOrder.budgetInfo.downPayment).map((transaction: any) => (
                        <div
                          key={transaction.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedTransactions.find(t => t.id === transaction.id)
                              ? 'border-green-500 bg-green-100 shadow-md'
                              : 'border-green-200 hover:bg-white hover:shadow-sm'
                          }`}
                          onClick={() => {
                            const isSelected = selectedTransactions.find(t => t.id === transaction.id);
                            if (isSelected) {
                              setSelectedTransactions(prev => prev.filter(t => t.id !== transaction.id));
                            } else {
                              setSelectedTransactions(prev => [...prev, transaction]);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={!!selectedTransactions.find(t => t.id === transaction.id)}
                                onChange={() => {}}
                                className="h-4 w-4 text-green-600 rounded"
                              />
                              <div>
                                <p className="font-medium">{(() => {
                                  if (!transaction.date) return 'Data não disponível';
                                  try {
                                    const date = new Date(transaction.date);
                                    if (isNaN(date.getTime())) return 'Data inválida';
                                    return date.toLocaleDateString('pt-BR');
                                  } catch (error) {
                                    return 'Data inválida';
                                  }
                                })()}</p>
                                <p className="text-sm text-gray-600 truncate max-w-[250px]">{transaction.description}</p>
                                <div className="text-xs text-green-600 font-medium mt-1">
                                  ✓ Corresponde à entrada esperada
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              {transaction.bankRef && (
                                <p className="text-xs text-gray-500">Ref: {transaction.bankRef}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {getCompatibleTransactions(selectedOrder.budgetInfo.downPayment).length === 0 && (
                        <p className="text-center text-gray-500 py-4">Nenhuma transação com valor da entrada encontrada</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
                          {getCompatibleTransactions(parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0')).length}
                        </span>
                        Transações Compatíveis (valor similar ao saldo devedor)
                      </h4>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectAllCompatible(getCompatibleTransactions(parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0')))}
                          disabled={getAvailableTransactions(getCompatibleTransactions(parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0'))).length === 0}
                          className="text-xs"
                        >
                          Selecionar Todas
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                      {getCompatibleTransactions(parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0')).map((transaction: any) => (
                        <div
                          key={transaction.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedTransactions.find(t => t.id === transaction.id)
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:bg-white hover:shadow-sm'
                          }`}
                          onClick={() => {
                            const isSelected = selectedTransactions.find(t => t.id === transaction.id);
                            if (isSelected) {
                              setSelectedTransactions(prev => prev.filter(t => t.id !== transaction.id));
                            } else {
                              setSelectedTransactions(prev => [...prev, transaction]);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={!!selectedTransactions.find(t => t.id === transaction.id)}
                                onChange={() => {}}
                                className="h-4 w-4 text-blue-600 rounded"
                              />
                              <div>
                                <p className="font-medium">{(() => {
                                  if (!transaction.date) return 'Data não disponível';
                                  try {
                                    const date = new Date(transaction.date);
                                    if (isNaN(date.getTime())) return 'Data inválida';
                                    return date.toLocaleDateString('pt-BR');
                                  } catch (error) {
                                    return 'Data inválida';
                                  }
                                })()}</p>
                                <p className="text-sm text-gray-600 truncate max-w-[250px]">{transaction.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              {transaction.bankRef && (
                                <p className="text-xs text-gray-500">Ref: {transaction.bankRef}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {getCompatibleTransactions(parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0')).length === 0 && (
                        <p className="text-center text-gray-500 py-4">Nenhuma transação compatível encontrada</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* All Unreconciled Transactions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                      {getAllUnmatchedIncomingTransactions().length}
                    </span>
                    Todas as Transações Não Conciliadas
                  </h4>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectAllCompatible(getAllUnmatchedIncomingTransactions())}
                      disabled={getAvailableTransactions(getAllUnmatchedIncomingTransactions()).length === 0}
                      className="text-xs"
                    >
                      Selecionar Todas
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                  {getAllUnmatchedIncomingTransactions().map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedTransactions.find(t => t.id === transaction.id)
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:bg-white hover:shadow-sm'
                      }`}
                      onClick={() => {
                        const isSelected = selectedTransactions.find(t => t.id === transaction.id);
                        if (isSelected) {
                          setSelectedTransactions(prev => prev.filter(t => t.id !== transaction.id));
                        } else {
                          setSelectedTransactions(prev => [...prev, transaction]);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={!!selectedTransactions.find(t => t.id === transaction.id)}
                            onChange={() => {}}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <div>
                            <p className="font-medium">{(() => {
                              if (!transaction.date) return 'Data não disponível';
                              try {
                                const date = new Date(transaction.date);
                                if (isNaN(date.getTime())) return 'Data inválida';
                                return date.toLocaleDateString('pt-BR');
                              } catch (error) {
                                return 'Data inválida';
                              }
                            })()}</p>
                            <p className="text-sm text-gray-600 truncate max-w-[250px]">{transaction.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {transaction.bankRef && (
                            <p className="text-xs text-gray-500">Ref: {transaction.bankRef}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <div className="flex space-x-2">
                  {selectedTransactions.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedTransactions([])}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      Limpar Seleção ({selectedTransactions.length})
                    </Button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setIsAssociationDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="gradient-bg text-white"
                    onClick={handleAssociatePayment}
                    disabled={selectedTransactions.length === 0 || associatePaymentMutation.isPending || associateMultiplePaymentsMutation.isPending}
                  >
                    {(associatePaymentMutation.isPending || associateMultiplePaymentsMutation.isPending) 
                      ? "Confirmando..." 
                      : `Confirmar ${selectedTransactions.length > 1 ? `${selectedTransactions.length} Pagamentos` : 'Pagamento'}`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Importações OFX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(bankTransactions || [])?.slice(0, 5).map((transaction: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{(() => {
                      if (!transaction.date) return 'Data não disponível';
                      try {
                        const date = new Date(transaction.date);
                        if (isNaN(date.getTime())) return 'Data inválida';
                        return date.toLocaleDateString('pt-BR');
                      } catch (error) {
                        return 'Erro ao processar data';
                      }
                    })()}</p>
                    <p className="text-sm text-gray-600">{transaction.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-green-600">
                      R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`status-badge ${
                      transaction.status === 'matched' ? 'status-confirmed' : 'status-pending'
                    }`}>
                      {transaction.status === 'matched' ? 'Conciliado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              )) || []}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenses?.slice(0, 5).map((expense: any) => (
                <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{expense.description}</p>
                    <p className="text-sm text-gray-600">
                      {(() => {
                        if (!expense.date) return 'Data não disponível';
                        try {
                          const date = new Date(expense.date);
                          if (isNaN(date.getTime())) return 'Data inválida';
                          return date.toLocaleDateString('pt-BR');
                        } catch (error) {
                          return 'Erro ao processar data';
                        }
                      })()} • {expense.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      R$ {parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`status-badge ${
                      expense.status === 'approved' ? 'status-confirmed' : 'status-pending'
                    }`}>
                      {expense.status === 'approved' ? 'Aprovado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              )) || []}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}