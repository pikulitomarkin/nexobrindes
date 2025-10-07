import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, DollarSign, CheckCircle, Clock, CreditCard, User, Upload, FileText, AlertCircle, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function AdminProducerPayments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAssociationDialogOpen, setIsAssociationDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<any[]>([]);
  const { toast } = useToast();

  const { data: producerPayments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/finance/producer-payments"],
  });

  const { data: pendingPayments } = useQuery<any[]>({
    queryKey: ["/api/finance/producer-payments/pending"],
  });

  const { data: bankTransactions } = useQuery<any[]>({
    queryKey: ["/api/finance/bank-transactions"],
  });

  const uploadOFXMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch("/api/finance/producer-ofx-import", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Erro ao importar arquivo OFX");
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments"] });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      toast({
        title: "Sucesso!",
        description: data.message || "Arquivo OFX importado com sucesso",
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

  const approvePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await apiRequest("POST", `/api/finance/producer-payments/${paymentId}/approve`);
      return res.json();
    },
    onSuccess: async (data: any, paymentId: string) => {
      // Invalidar queries para atualizar a lista
      await queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments/pending"] });

      // Aguardar um pouco para garantir que os dados foram atualizados
      setTimeout(() => {
        // Buscar o pagamento aprovado para abrir o modal de conciliação
        const updatedPendingPayments = queryClient.getQueryData(["/api/finance/producer-payments/pending"]) as any[];
        const payment = updatedPendingPayments?.find((p: any) => p.id === paymentId);

        if (payment && bankTransactions && bankTransactions.length > 0) {
          // Abrir automaticamente o modal de conciliação
          openAssociationDialog(payment);
          toast({
            title: "Pagamento Aprovado!",
            description: "Selecione a transação bancária correspondente para conciliar",
          });
        } else {
          toast({
            title: "Sucesso!",
            description: bankTransactions && bankTransactions.length > 0 ? "Pagamento aprovado. Clique em 'Associar Pagamento' para conciliar." : "Pagamento aprovado. Importe o OFX para fazer a conciliação.",
          });
        }
      }, 300);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o pagamento",
        variant: "destructive",
      });
    },
  });

  const associatePaymentMutation = useMutation({
    mutationFn: async ({ transactions, productionOrderId }: { transactions: any[]; productionOrderId: string }) => {
      console.log("Sending association request:", {
        transactionIds: transactions.map((t: any) => t.id),
        productionOrderId,
        transactionCount: transactions.length
      });

      const res = await apiRequest("POST", "/api/finance/producer-payments/associate-payment", {
        transactionIds: transactions.map((t: any) => t.id),
        productionOrderId,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments/pending"] });
      setIsAssociationDialogOpen(false);
      setSelectedPayment(null);
      setSelectedTransactions([]);

      let toastVariant: "default" | "destructive" = "default";
      let toastTitle = "Sucesso!";
      let toastDescription = data.message || `Pagamento de R$ ${parseFloat(data.payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} confirmado para o produtor ${data.payment.producerName}`;

      // Check if there was an adjustment due to difference
      if (data.payment.hasAdjustment && Math.abs(parseFloat(data.payment.difference)) > 0.01) {
        const difference = parseFloat(data.payment.difference);
        const diffType = difference > 0 ? "sobra" : "falta";
        toastTitle = "Conciliado com Ajuste";
        toastDescription = `${toastDescription}\n\n⚠️ Diferença de R$ ${Math.abs(difference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${diffType}) registrada automaticamente.`;
      }

      toast({
        title: toastTitle,
        description: toastDescription,
        variant: toastVariant,
      });
    },
    onError: (error: any) => {
      console.error("Association error:", error);
      toast({
        title: "Erro na Associação",
        description: error.message || "Não foi possível associar o pagamento. Verifique se as transações são válidas e não foram conciliadas anteriormente.",
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

  const openAssociationDialog = (payment: any) => {
    setSelectedPayment(payment);
    setSelectedTransactions([]);
    setIsAssociationDialogOpen(true);
  };

  const handleAssociatePayment = () => {
    if (!selectedPayment || selectedTransactions.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione um pagamento e pelo menos uma transação para associar",
        variant: "destructive",
      });
      return;
    }

    // Verificar se as transações são válidas
    const invalidTransactions = selectedTransactions.filter(txn => !txn.id || txn.status === 'matched');
    if (invalidTransactions.length > 0) {
      toast({
        title: "Transações Inválidas",
        description: `${invalidTransactions.length} transação${invalidTransactions.length !== 1 ? 'ões' : ''} ${invalidTransactions.length !== 1 ? 'são inválidas ou já foram' : 'é inválida ou já foi'} conciliada${invalidTransactions.length !== 1 ? 's' : ''}`,
        variant: "destructive",
      });
      return;
    }

    const totalTransactionAmount = selectedTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0);
    const paymentAmount = parseFloat(selectedPayment.amount);

    console.log("Association validation:", {
      selectedPayment: selectedPayment.id,
      productionOrderId: selectedPayment.productionOrderId,
      transactionCount: selectedTransactions.length,
      totalTransactionAmount,
      paymentAmount
    });

    if (totalTransactionAmount > paymentAmount * 1.05) { // 5% de tolerância
      toast({
        title: "Atenção",
        description: `O valor total das transações (R$ ${totalTransactionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) é maior que o valor do pagamento (R$ ${paymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Deseja continuar?`,
        variant: "destructive",
      });
    }

    associatePaymentMutation.mutate({
      transactions: selectedTransactions,
      productionOrderId: selectedPayment.productionOrderId
    });
  };

  const getCompatibleTransactions = (paymentAmount: number) => {
    if (!bankTransactions) return [];

    const tolerance = 0.05; // 5% tolerance
    return bankTransactions.filter((transaction: any) => 
      transaction.status === 'unmatched' &&
      transaction.type === 'debit' &&
      parseFloat(transaction.amount) > 0 &&
      Math.abs(parseFloat(transaction.amount) - paymentAmount) <= (paymentAmount * tolerance)
    );
  };

  const getAllUnmatchedDebitTransactions = () => {
    if (!bankTransactions) return [];

    return bankTransactions.filter((transaction: any) => 
      (transaction.status === 'unmatched' || !transaction.status) &&
      transaction.type === 'debit' &&
      parseFloat(transaction.amount) > 0
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Aprovado", color: "bg-blue-100 text-blue-800" },
      paid: { label: "Pago", color: "bg-green-100 text-green-800" },
      rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800" },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;

    return (
      <Badge className={`${statusInfo.color} border-0`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const filteredPayments = producerPayments?.filter((payment: any) => {
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      payment.producerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.product?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate summary statistics
  const totalPending = producerPayments?.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
  const totalApproved = producerPayments?.filter((p: any) => p.status === 'approved').reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
  const totalPaid = producerPayments?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;

  const unreconciled = bankTransactions?.filter((t: any) => t.status === 'unmatched' && t.type === 'debit') || [];
  const reconciled = bankTransactions?.filter((t: any) => t.status === 'matched' && t.type === 'debit') || [];

  const getAvailableTransactions = (transactions: any[]) => {
    return transactions.filter((t: any) => !selectedTransactions.some(st => st.id === t.id));
  };

  const handleSelectAllCompatible = (transactions: any[]) => {
    const availableTransactions = getAvailableTransactions(transactions);
    setSelectedTransactions(prev => [...prev, ...availableTransactions]);
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-page-title">Pagamentos aos Produtores</h1>
          <p className="text-gray-600">Gerencie os pagamentos de serviços de produção e concilie com extratos bancários</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-white" data-testid="button-upload-ofx">
              <Upload className="h-4 w-4 mr-2" />
              Importar OFX
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar Arquivo OFX - Pagamentos</DialogTitle>
              <DialogDescription>
                Selecione o arquivo OFX do banco com as transações de saída (pagamentos aos produtores)
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
                  data-testid="input-ofx-file"
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
                  data-testid="button-confirm-upload"
                >
                  {uploadOFXMutation.isPending ? "Importando..." : "Importar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-total-pending">
                  R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aprovados</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-total-approved">
                  R$ {totalApproved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pagos</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-total-paid">
                  R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transações Pendentes</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-unmatched-transactions">
                  {unreconciled.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending-payments" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending-payments" data-testid="tab-pending-payments">
            Aguardando Aprovação ({pendingPayments?.filter((p: any) => p.status === 'pending').length || 0})
          </TabsTrigger>
          <TabsTrigger value="approved-payments" data-testid="tab-approved-payments">
            Aguardando Pagamento ({pendingPayments?.filter((p: any) => p.status === 'approved').length || 0})
          </TabsTrigger>
          <TabsTrigger value="ofx-transactions" data-testid="tab-ofx-transactions">
            Transações OFX ({unreconciled.length + reconciled.length})
          </TabsTrigger>
          <TabsTrigger value="all-payments" data-testid="tab-all-payments">
            Todos ({filteredPayments?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending-payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos Aguardando Aprovação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingPayments?.filter((p: any) => p.status === 'pending').map((payment: any) => (
                  <div key={payment.id} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 hover:border-yellow-300 transition-colors" data-testid={`card-payment-${payment.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <p className="font-medium text-gray-900">{payment.producerName}</p>
                          <Badge className="bg-gray-100 text-gray-700 text-xs">{payment.orderNumber}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{payment.product}</p>
                        <p className="text-xs text-gray-500">Cliente: {payment.clientName}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            R$ {parseFloat(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {getStatusBadge(payment.status)}
                        </div>
                        <Button
                          onClick={() => approvePaymentMutation.mutate(payment.id)}
                          disabled={approvePaymentMutation.isPending}
                          className="gradient-bg text-white"
                          data-testid={`button-approve-${payment.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar
                        </Button>
                      </div>
                    </div>
                    {payment.notes && (
                      <div className="mt-3 p-2 bg-white rounded border border-yellow-200">
                        <p className="text-xs text-gray-600">{payment.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
                {(!pendingPayments || pendingPayments.filter((p: any) => p.status === 'pending').length === 0) && (
                  <div className="text-center py-12">
                    <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Não há pagamentos aguardando aprovação</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved-payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos Aprovados - Conciliação OFX</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingPayments?.filter((p: any) => p.status === 'approved').map((payment: any) => {
                  const compatibleTransactions = getCompatibleTransactions(parseFloat(payment.amount));

                  return (
                    <div key={payment.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors" data-testid={`card-approved-payment-${payment.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <p className="font-medium text-gray-900">{payment.producerName}</p>
                            <Badge className="bg-gray-100 text-gray-700 text-xs">{payment.orderNumber}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{payment.product}</p>
                          <p className="text-xs text-gray-500">Cliente: {payment.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">
                            R$ {parseFloat(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          {compatibleTransactions.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              {compatibleTransactions.length} transação{compatibleTransactions.length !== 1 ? 'ões' : ''} compatível{compatibleTransactions.length !== 1 ? 'is' : ''}
                            </Badge>
                          )}
                        </div>
                        <Button
                          onClick={() => openAssociationDialog(payment)}
                          variant="outline"
                          size="sm"
                          data-testid={`button-associate-${payment.id}`}
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Associar Pagamento
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {(!pendingPayments || pendingPayments.filter((p: any) => p.status === 'approved').length === 0) && (
                  <div className="text-center py-12">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Não há pagamentos aprovados aguardando conciliação</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ofx-transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transações Bancárias (OFX)</span>
                <Badge variant="secondary" className="text-sm">
                  {unreconciled.length} não conciliadas
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bankTransactions && bankTransactions.length > 0 ? (
                  <>
                    {/* Unreconciled Transactions */}
                    {unreconciled.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-orange-700 mb-3 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Pendentes de Conciliação ({unreconciled.length})
                        </h3>
                        <div className="space-y-2">
                          {unreconciled.map((transaction: any) => (
                            <div key={transaction.id} className="p-4 bg-orange-50 rounded-lg border border-orange-200" data-testid={`ofx-transaction-${transaction.id}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{transaction.description}</p>
                                  <div className="flex gap-4 mt-1">
                                    <p className="text-xs text-gray-600">
                                      Data: {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                    </p>
                                    {transaction.fitId && (
                                      <p className="text-xs text-gray-500">ID: {transaction.fitId}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-red-600">
                                    - R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  <Badge className="bg-orange-100 text-orange-800 text-xs mt-1">
                                    Não Conciliado
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reconciled Transactions */}
                    {reconciled.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Conciliadas ({reconciled.length})
                        </h3>
                        <div className="space-y-2">
                          {reconciled.map((transaction: any) => (
                            <div key={transaction.id} className="p-4 bg-green-50 rounded-lg border border-green-200" data-testid={`ofx-reconciled-${transaction.id}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{transaction.description}</p>
                                  <div className="flex gap-4 mt-1">
                                    <p className="text-xs text-gray-600">
                                      Data: {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                    </p>
                                    {transaction.matchedOrderId && (
                                      <p className="text-xs text-green-700 font-medium">
                                        Pedido: {transaction.matchedOrderId}
                                      </p>
                                    )}
                                  </div>
                                  {transaction.notes && (
                                    <p className="text-xs text-gray-600 mt-1 italic">{transaction.notes}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-red-600">
                                    - R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  <Badge className="bg-green-100 text-green-800 text-xs mt-1">
                                    Conciliado
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma transação OFX importada</h3>
                    <p className="text-gray-500 mb-4">Clique no botão "Importar OFX" para carregar transações bancárias</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-payments" className="mt-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por produtor, pedido ou produto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Todos os Pagamentos ({filteredPayments?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produtor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pedido
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments?.map((payment: any) => (
                      <tr key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            {payment.producerName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {payment.orderNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.product}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.clientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          R$ {parseFloat(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payment.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(!filteredPayments || filteredPayments.length === 0) && (
                <div className="text-center py-12">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum pagamento encontrado</h3>
                  <p className="text-gray-500">Não há pagamentos que correspondam aos filtros selecionados.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Association Dialog */}
      <Dialog open={isAssociationDialogOpen} onOpenChange={setIsAssociationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Conciliar Pagamento de Produtor
            </DialogTitle>
            <DialogDescription>
              Selecione uma ou mais transações bancárias que correspondem ao pagamento deste produtor. 
              Você pode associar múltiplas transações para um único pagamento.
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              {/* Payment Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">💰 Pagamento Selecionado</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Produtor:</span> {selectedPayment.producerName}
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Produto:</span> {selectedPayment.product}
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Valor:</span> 
                    <span className="font-bold"> R$ {parseFloat(selectedPayment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Pedido:</span> {selectedPayment.orderNumber}
                  </div>
                </div>
              </div>

              {/* Selected Transactions Preview */}
              {selectedTransactions.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">
                    ✅ {selectedTransactions.length} Transação{selectedTransactions.length !== 1 ? 'ões' : ''} Selecionada{selectedTransactions.length !== 1 ? 's' : ''}
                  </h4>
                  <div className="space-y-2">
                    {selectedTransactions.map((transaction, index) => (
                      <div key={transaction.id} className="grid grid-cols-2 gap-4 text-sm p-2 bg-white rounded border">
                        <div>
                          <span className="text-green-700 font-medium">#{index + 1} Data:</span> {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </div>
                        <div>
                          <span className="text-green-700 font-medium">Valor:</span> 
                          <span className="font-bold"> R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-green-700 font-medium">Descrição:</span> {transaction.description}
                        </div>
                      </div>
                    ))}
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="text-blue-700 font-medium">Total das transações: </span>
                      <span className="font-bold text-green-600">
                        R$ {selectedTransactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-gray-600 ml-2">
                        (Valor do pagamento: R$ {parseFloat(selectedPayment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Compatible Transactions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-xs font-bold">
                      {getCompatibleTransactions(parseFloat(selectedPayment.amount)).length}
                    </span>
                    🎯 Transações Compatíveis (valor similar)
                  </h4>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectAllCompatible(getCompatibleTransactions(parseFloat(selectedPayment.amount)))}
                      disabled={getAvailableTransactions(getCompatibleTransactions(parseFloat(selectedPayment.amount))).length === 0}
                      className="text-xs"
                    >
                      Selecionar Todas
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-green-50">
                  {getCompatibleTransactions(parseFloat(selectedPayment.amount)).map((transaction: any) => (
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
                            <p className="font-medium">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                            <p className="text-sm text-gray-600 truncate max-w-[250px]">{transaction.description}</p>
                            <div className="text-xs text-green-600 font-medium mt-1">
                              ✓ Valor compatível com pagamento
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
                  {getCompatibleTransactions(parseFloat(selectedPayment.amount)).length === 0 && (
                    <p className="text-center text-gray-500 py-4">Nenhuma transação com valor compatível encontrada</p>
                  )}
                </div>
              </div>

              {/* All Unmatched Debit Transactions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                      {getAllUnmatchedDebitTransactions().length}
                    </span>
                    Todas as Transações de Saída Não Conciliadas
                  </h4>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectAllCompatible(getAllUnmatchedDebitTransactions())}
                      disabled={getAvailableTransactions(getAllUnmatchedDebitTransactions()).length === 0}
                      className="text-xs"
                    >
                      Selecionar Todas
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                  {getAllUnmatchedDebitTransactions().map((transaction: any) => (
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
                            <p className="font-medium">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                            <p className="text-sm text-gray-600 truncate max-w-[250px]">{transaction.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">
                            - R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-orange-600">Débito/Saída</p>
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
                    disabled={selectedTransactions.length === 0 || associatePaymentMutation.isPending}
                  >
                    {associatePaymentMutation.isPending 
                      ? "Associando..." 
                      : `Associar ${selectedTransactions.length > 1 ? `${selectedTransactions.length} Transações` : 'Transação'}`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}