
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle, Download, Plus, Link, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinanceReconciliation() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
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
      if (!response.ok) throw new Error("Erro ao associar pagamento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsAssociationDialogOpen(false);
      setSelectedOrder(null);
      setSelectedTransaction(null);
      toast({
        title: "Sucesso!",
        description: "Pagamento associado ao pedido com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível associar o pagamento",
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
    setIsAssociationDialogOpen(true);
  };

  const handleAssociatePayment = () => {
    if (selectedOrder && selectedTransaction) {
      associatePaymentMutation.mutate({
        transactionId: selectedTransaction.id,
        orderId: selectedOrder.id,
        amount: selectedTransaction.amount
      });
    }
  };

  const getCompatibleTransactions = (orderValue: number) => {
    if (!bankTransactions) return [];
    
    const tolerance = 0.05; // 5% de tolerância
    return bankTransactions.filter((transaction: any) => 
      transaction.status === 'unmatched' &&
      Math.abs(parseFloat(transaction.amount) - orderValue) <= (orderValue * tolerance)
    );
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

      {/* Conciliation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Pending Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pedidos com Saldo Devedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingOrders?.map((order: any) => {
                const remainingValue = parseFloat(order.totalValue) - parseFloat(order.paidValue || '0');
                const compatibleTransactions = getCompatibleTransactions(remainingValue);
                
                return (
                  <div key={order.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.clientName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          R$ {remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">
                          Total: R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {parseFloat(order.paidValue || '0') > 0 ? (
                          <span className="text-green-600">
                            Entrada paga: R$ {parseFloat(order.paidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-yellow-600">Aguardando entrada</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {compatibleTransactions.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {compatibleTransactions.length} transação(ões) compatível(eis)
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          onClick={() => openAssociationDialog(order)}
                          className="gradient-bg text-white"
                          disabled={unreconciled.length === 0}
                        >
                          <Link className="h-3 w-3 mr-1" />
                          Confirmar Pagamento
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }) || []}
              
              {(!pendingOrders || pendingOrders.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum pedido com saldo devedor</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unreconciled Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transações Não Conciliadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {unreconciled.map((transaction: any) => (
                <div key={transaction.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-sm text-gray-600 truncate max-w-[200px]">
                        {transaction.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {transaction.bankRef && (
                        <p className="text-xs text-gray-500">Ref: {transaction.bankRef}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Badge variant="outline" className="text-xs">
                      Aguardando associação
                    </Badge>
                  </div>
                </div>
              ))}
              
              {unreconciled.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Todas as transações foram conciliadas</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Association Dialog */}
      <Dialog open={isAssociationDialogOpen} onOpenChange={setIsAssociationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento do Pedido</DialogTitle>
            <DialogDescription>
              Selecione a transação OFX que corresponde ao pagamento deste pedido
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Pedido Selecionado</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Número:</span> {selectedOrder.orderNumber}
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Cliente:</span> {selectedOrder.clientName}
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Valor Total:</span> R$ {parseFloat(selectedOrder.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Saldo Devedor:</span> R$ {(parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Compatible Transactions */}
              <div>
                <h4 className="font-semibold mb-3">Transações Compatíveis</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getCompatibleTransactions(parseFloat(selectedOrder.totalValue) - parseFloat(selectedOrder.paidValue || '0')).map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTransaction?.id === transaction.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                          <p className="text-sm text-gray-600">{transaction.description}</p>
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

              {/* All Unreconciled Transactions */}
              <div>
                <h4 className="font-semibold mb-3">Todas as Transações Disponíveis</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {unreconciled.map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTransaction?.id === transaction.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                          <p className="text-sm text-gray-600">{transaction.description}</p>
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

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAssociationDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="gradient-bg text-white"
                  onClick={handleAssociatePayment}
                  disabled={!selectedTransaction || associatePaymentMutation.isPending}
                >
                  {associatePaymentMutation.isPending ? "Associando..." : "Confirmar Pagamento"}
                </Button>
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
                    <p className="font-medium text-gray-900">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
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
                      {new Date(expense.date).toLocaleDateString('pt-BR')} • {expense.category}
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
