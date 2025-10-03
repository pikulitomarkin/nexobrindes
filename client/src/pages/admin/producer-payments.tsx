import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, DollarSign, CheckCircle, Clock, CreditCard, User, Upload, FileText, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function AdminProducerPayments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isOFXDialogOpen, setIsOFXDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPaymentForReconciliation, setSelectedPaymentForReconciliation] = useState<any>(null);
  const [selectedTransactionForReconciliation, setSelectedTransactionForReconciliation] = useState<any>(null);
  const [isReconciliationDialogOpen, setIsReconciliationDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: producerPayments, isLoading } = useQuery({
    queryKey: ["/api/producer-payments"],
  });

  // Fetch bank transactions for reconciliation
  const { data: bankTransactions, refetch: refetchBankTransactions } = useQuery({
    queryKey: ["/api/finance/bank-transactions"],
    enabled: true, // Always fetch to show available transactions
  });

  // Fetch bank imports history
  const { data: bankImports } = useQuery({
    queryKey: ["/api/finance/bank-imports"],
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/producer-payments/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar pagamento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/producer-payments"] });
      setIsPaymentDialogOpen(false);
      setSelectedPayment(null);
      setPaymentMethod("");
      setPaymentNotes("");
      toast({
        title: "Sucesso!",
        description: "Pagamento atualizado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o pagamento",
        variant: "destructive",
      });
    },
  });

  const uploadOFXMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload-ofx", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao importar OFX");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/producer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-imports"] });
      refetchBankTransactions(); // Refetch bank transactions
      setIsOFXDialogOpen(false);
      setSelectedFile(null);
      toast({
        title: "Sucesso!",
        description: data.message || `${data.transactionsImported || 0} transações importadas`,
      });
    },
    onError: (error: any) => {
      console.error("OFX Upload Error:", error);
      toast({
        title: "Erro na importação",
        description: error.message || "Não foi possível importar o arquivo OFX.",
        variant: "destructive",
      });
    },
  });


  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendente", variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Aprovado", variant: "default" as const, color: "bg-blue-100 text-blue-800" },
      paid: { label: "Pago", variant: "default" as const, color: "bg-green-100 text-green-800" },
      rejected: { label: "Rejeitado", variant: "destructive" as const, color: "bg-red-100 text-red-800" },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;

    return (
      <Badge className={`${statusInfo.color} border-0`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const handleApprove = (payment: any) => {
    updatePaymentMutation.mutate({
      id: payment.id,
      status: "approved",
      approvedBy: "admin-1" // TODO: Get from auth context
    });
  };

  const handleReject = (payment: any) => {
    updatePaymentMutation.mutate({
      id: payment.id,
      status: "rejected",
      approvedBy: "admin-1" // TODO: Get from auth context
    });
  };

  const handleMarkAsPaid = (payment: any) => {
    setSelectedPayment(payment);
    setIsPaymentDialogOpen(true);
  };

  const handleSavePayment = () => {
    if (!selectedPayment || !paymentMethod) {
      toast({
        title: "Erro",
        description: "Por favor, selecione o método de pagamento",
        variant: "destructive",
      });
      return;
    }

    updatePaymentMutation.mutate({
      id: selectedPayment.id,
      status: "paid",
      paidBy: "admin-1", // TODO: Get from auth context
      paymentMethod: paymentMethod,
      notes: paymentNotes
    });
  };

  const filteredPayments = producerPayments?.filter((payment: any) => {
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesSearch = searchTerm === "" ||
      payment.producerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.order?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.order?.product?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filter for payments that are approved but not yet paid (for reconciliation tab)
  const pendingProducerPayments = producerPayments?.filter((p: any) => p.status === 'approved');

  // Calculate summary statistics
  const totalPending = producerPayments?.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
  const totalApproved = producerPayments?.filter((p: any) => p.status === 'approved').reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
  const totalPaid = producerPayments?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;

  // OFX Import Handlers
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadOFXMutation.mutate(selectedFile);
    }
  };

  // Reconciliation Logic
  const getAllUnmatchedOutgoingTransactions = () => {
    if (!bankTransactions) return [];
    return bankTransactions.filter((tx: any) => 
      parseFloat(tx.amount) < 0 && // Negative amounts are outgoing payments
      (tx.status === 'unmatched' || !tx.status)
    );
  };

  const getCompatibleTransactions = (amount: number) => {
    if (!bankTransactions) return [];
    const tolerance = 0.05; // 5% tolerance
    return bankTransactions.filter((tx: any) =>
      parseFloat(tx.amount) < 0 && // Outgoing payments only
      (tx.status === 'unmatched' || !tx.status) &&
      Math.abs(Math.abs(parseFloat(tx.amount)) - amount) <= (amount * tolerance)
    );
  };

  const openReconciliationDialog = (payment: any) => {
    setSelectedPaymentForReconciliation(payment);
    setSelectedTransactionForReconciliation(null);
    setIsReconciliationDialogOpen(true);
  };

  const reconcilePayment = async (paymentId: string, transactionId: string) => {
    try {
      // Mark the transaction as reconciled
      const response = await fetch(`/api/finance/bank-transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'matched',
          matchedPaymentId: paymentId,
          reconciled: true
        }),
      });
      
      if (!response.ok) throw new Error('Erro ao conciliar transação');

      // Mark the producer payment as paid/reconciled
      await updatePaymentMutation.mutateAsync({
        id: paymentId,
        status: 'paid',
        paidBy: 'admin-1', // TODO: Get from auth context
        paymentMethod: 'bank_transfer',
        notes: `Conciliado com transação bancária: ${selectedTransactionForReconciliation?.bankRef || transactionId}`
      });

      queryClient.invalidateQueries({ queryKey: ["/api/producer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-transactions"] });
      refetchBankTransactions();
      setIsReconciliationDialogOpen(false);
      setSelectedPaymentForReconciliation(null);
      setSelectedTransactionForReconciliation(null);
      
      toast({
        title: "Sucesso!",
        description: "Pagamento conciliado com sucesso com a transação bancária.",
      });
    } catch (error: any) {
      toast({
        title: "Erro na conciliação",
        description: error.message || "Não foi possível conciliar o pagamento.",
        variant: "destructive",
      });
    }
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
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Page Header with OFX Import Button */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pagamentos de Produtores</h1>
          <p className="text-gray-600">Gestão de pagamentos para produtores externos</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isOFXDialogOpen} onOpenChange={setIsOFXDialogOpen}>
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
                  Selecione o arquivo OFX do seu banco para importar as transações de saída e conciliar com os pagamentos dos produtores
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
                  <Button variant="outline" onClick={() => setIsOFXDialogOpen(false)}>
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">
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
                <p className="text-2xl font-bold text-blue-600">
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
                <p className="text-2xl font-bold text-green-600">
                  R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments">Gerenciar Pagamentos</TabsTrigger>
          <TabsTrigger value="reconciliation">Conciliação Bancária</TabsTrigger>
          <TabsTrigger value="imports">Histórico de Importações</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos ({filteredPayments?.length || 0})</CardTitle>
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
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data Criação
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments?.map((payment: any) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            {payment.producerName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {payment.order?.orderNumber || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.order?.product || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          R$ {parseFloat(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {payment.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApprove(payment)}
                                  disabled={updatePaymentMutation.isPending}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprovar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReject(payment)}
                                  disabled={updatePaymentMutation.isPending}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Rejeitar
                                </Button>
                              </>
                            )}
                            {payment.status === 'approved' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsPaid(payment)}
                                disabled={updatePaymentMutation.isPending}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Marcar como Pago
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </div>
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
                  <p className="text-gray-500">Não há pagamentos de produtores que correspondam aos filtros selecionados.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Conciliação de Pagamentos Aprovados
              </CardTitle>
              <p className="text-sm text-gray-600">
                Associe as transações bancárias de saída com os pagamentos aprovados para os produtores
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {pendingProducerPayments?.map((payment: any) => {
                  const paymentAmount = parseFloat(payment.amount);
                  const compatibleTransactions = getCompatibleTransactions(paymentAmount);

                  return (
                    <div key={payment.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{payment.producerName}</p>
                          <p className="text-sm text-gray-600">
                            {payment.order?.orderNumber} - {payment.order?.product}
                          </p>
                          <p className="text-xs text-gray-500">
                            Aprovado em: {payment.approvedAt ? new Date(payment.approvedAt).toLocaleDateString('pt-BR') : 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">
                            R$ {paymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge className="bg-blue-100 text-blue-800">Aprovado</Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="text-blue-600">Aguardando pagamento</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {compatibleTransactions.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              {compatibleTransactions.length} transação{compatibleTransactions.length !== 1 ? 'ões' : ''} compatível{compatibleTransactions.length !== 1 ? 'is' : ''}
                            </Badge>
                          )}
                          {getAllUnmatchedOutgoingTransactions().length > 0 && compatibleTransactions.length === 0 && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                              {getAllUnmatchedOutgoingTransactions().length} transação{getAllUnmatchedOutgoingTransactions().length !== 1 ? 'ões' : ''} disponível{getAllUnmatchedOutgoingTransactions().length !== 1 ? 'is' : ''}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            onClick={() => openReconciliationDialog(payment)}
                            className="gradient-bg text-white hover:opacity-90"
                            disabled={!bankTransactions || getAllUnmatchedOutgoingTransactions().length === 0}
                          >
                            <Link className="h-3 w-3 mr-1" />
                            Conciliar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }) || []}

                {(!pendingProducerPayments || pendingProducerPayments.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum pagamento aprovado aguardando conciliação</p>
                    <p className="text-xs">Aprove pagamentos na aba anterior para conciliar aqui</p>
                  </div>
                )}
              </div>

              {/* Seção de Transações Bancárias Disponíveis */}
              {getAllUnmatchedOutgoingTransactions().length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 rounded-full text-xs font-bold">
                      {getAllUnmatchedOutgoingTransactions().length}
                    </span>
                    💳 Transações de Saída Não Conciliadas
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-red-50">
                    {getAllUnmatchedOutgoingTransactions().map((transaction: any) => (
                      <div key={transaction.id} className="p-3 border border-red-200 rounded-lg bg-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                            <p className="text-sm text-gray-600">{transaction.description}</p>
                            <p className="text-xs text-red-600">Saída não conciliada</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600">
                              R$ {Math.abs(parseFloat(transaction.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Histórico de Importações OFX
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!bankImports || bankImports.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma importação encontrada</h3>
                  <p className="text-gray-500">Importe um arquivo OFX para começar a conciliar pagamentos de produtores.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Arquivo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transações
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bankImports.map((imp: any) => (
                        <tr key={imp.id} data-testid={`import-row-${imp.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(imp.importedAt || imp.uploadedAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400" />
                              {imp.fileName || imp.filename || 'Arquivo OFX'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <Badge className="bg-blue-100 text-blue-800 border-0">
                              {imp.transactionCount || 0} transações
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {imp.status === 'completed' ? (
                              <Badge className="bg-green-100 text-green-800 border-0">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Concluído
                              </Badge>
                            ) : imp.status === 'processing' ? (
                              <Badge className="bg-yellow-100 text-yellow-800 border-0">
                                <Clock className="h-3 w-3 mr-1" />
                                Processando
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 border-0">
                                {imp.status}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Pagamento como Realizado</DialogTitle>
            <DialogDescription>
              Confirme o pagamento realizado ao produtor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPayment && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Detalhes do Pagamento</h4>
                <p><strong>Produtor:</strong> {selectedPayment.producerName}</p>
                <p><strong>Valor:</strong> R$ {parseFloat(selectedPayment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p><strong>Pedido:</strong> {selectedPayment.order?.orderNumber}</p>
              </div>
            )}

            <div>
              <Label htmlFor="payment-method">Método de Pagamento *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transfer">Transferência Bancária</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment-notes">Observações (Opcional)</Label>
              <Textarea
                id="payment-notes"
                placeholder="Informações sobre o pagamento..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSavePayment}
              disabled={!paymentMethod || updatePaymentMutation.isPending}
            >
              {updatePaymentMutation.isPending ? "Salvando..." : "Confirmar Pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Dialog */}
      <Dialog open={isReconciliationDialogOpen} onOpenChange={setIsReconciliationDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Conciliar Pagamento do Produtor
            </DialogTitle>
            <DialogDescription>
              Selecione a transação bancária de saída que corresponde ao pagamento deste produtor.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPaymentForReconciliation && (
            <div className="space-y-6">
              {/* Payment Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">💰 Pagamento Selecionado</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Produtor:</span> {selectedPaymentForReconciliation.producerName}
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Pedido:</span> {selectedPaymentForReconciliation.order?.orderNumber}
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Produto:</span> {selectedPaymentForReconciliation.order?.product}
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Valor:</span> 
                    <span className="font-bold"> R$ {parseFloat(selectedPaymentForReconciliation.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-blue-700 font-medium">Status:</span> 
                    <span className="font-bold text-green-600"> Aprovado - Aguardando Pagamento</span>
                  </div>
                </div>
              </div>

              {/* Selected Transaction Preview */}
              {selectedTransactionForReconciliation && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">✅ Transação Selecionada</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700 font-medium">Data:</span> {new Date(selectedTransactionForReconciliation.date).toLocaleDateString('pt-BR')}
                    </div>
                    <div>
                      <span className="text-green-700 font-medium">Valor:</span> 
                      <span className="font-bold"> R$ {Math.abs(parseFloat(selectedTransactionForReconciliation.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-green-700 font-medium">Descrição:</span> {selectedTransactionForReconciliation.description}
                    </div>
                    {selectedTransactionForReconciliation.bankRef && (
                      <div className="col-span-2">
                        <span className="text-green-700 font-medium">Referência:</span> {selectedTransactionForReconciliation.bankRef}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Compatible Transactions */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-xs font-bold">
                    {getCompatibleTransactions(parseFloat(selectedPaymentForReconciliation.amount)).length}
                  </span>
                  🎯 Transações Compatíveis (valor similar)
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-green-50">
                  {getCompatibleTransactions(parseFloat(selectedPaymentForReconciliation.amount)).map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedTransactionForReconciliation?.id === transaction.id
                          ? 'border-green-500 bg-green-100 shadow-md'
                          : 'border-green-200 hover:bg-white hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedTransactionForReconciliation(transaction)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                          <p className="text-sm text-gray-600 truncate max-w-[250px]">{transaction.description}</p>
                          <div className="text-xs text-green-600 font-medium mt-1">
                            ✓ Valor compatível com o pagamento
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">
                            R$ {Math.abs(parseFloat(transaction.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {transaction.bankRef && (
                            <p className="text-xs text-gray-500">Ref: {transaction.bankRef}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {getCompatibleTransactions(parseFloat(selectedPaymentForReconciliation.amount)).length === 0 && (
                    <p className="text-center text-gray-500 py-4">Nenhuma transação com valor compatível encontrada</p>
                  )}
                </div>
              </div>

              {/* All Unreconciled Outgoing Transactions */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                    {getAllUnmatchedOutgoingTransactions().length}
                  </span>
                  Todas as Transações de Saída Não Conciliadas
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                  {getAllUnmatchedOutgoingTransactions().map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedTransactionForReconciliation?.id === transaction.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:bg-white hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedTransactionForReconciliation(transaction)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                          <p className="text-sm text-gray-600 truncate max-w-[250px]">{transaction.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">
                            R$ {Math.abs(parseFloat(transaction.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsReconciliationDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="gradient-bg text-white"
                  onClick={() => {
                    if (selectedTransactionForReconciliation && selectedPaymentForReconciliation) {
                      reconcilePayment(selectedPaymentForReconciliation.id, selectedTransactionForReconciliation.id);
                    }
                  }}
                  disabled={!selectedTransactionForReconciliation}
                >
                  Confirmar Conciliação
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}