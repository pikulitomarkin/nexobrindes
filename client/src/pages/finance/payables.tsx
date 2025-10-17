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
import { Search, Eye, DollarSign, TrendingDown, AlertTriangle, Clock, Plus, CreditCard, Factory, Receipt, Users, RefreshCw, Package, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinancePayables() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "",
    transactionId: "",
    notes: "",
  });
  const [refundData, setRefundData] = useState({
    amount: "",
    notes: "",
    method: "", // Added method for refund
  });
  const { toast } = useToast();

  // Fetch all payables data
  const { data: overview, isLoading } = useQuery({
    queryKey: ["/api/finance/overview"],
  });

  // Get pending producer payments
  const { data: pendingProducerPayments = [] } = useQuery({
    queryKey: ["/api/finance/producer-payments/pending"]
  });

  // Get all producer payments for payables
  const { data: producerPayments = [] } = useQuery({
    queryKey: ["/api/finance/producer-payments"]
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/finance/expenses"],
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["/api/commissions"],
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Mutation for paying producer
  const payProducerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/finance/producer-payments/${data.payableId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          paidBy: 'admin-1',
          paymentMethod: data.method,
          transactionId: data.transactionId,
          notes: data.notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao registrar pagamento');
      }

      return response.json();
    },
    onSuccess: () => {
      setIsPayDialogOpen(false);
      setPaymentData({
        amount: "",
        method: "",
        transactionId: "",
        notes: "",
      });
      toast({
        title: "Sucesso!",
        description: "Pagamento registrado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/overview"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível registrar o pagamento",
        variant: "destructive",
      });
    },
  });

  // Mutation for setting refund amount
  const setRefundMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/orders/${data.orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          refundAmount: data.amount,
          refundNotes: data.notes,
          refundMethod: data.method // Include refund method
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao definir valor de estorno');
      }

      return response.json();
    },
    onSuccess: () => {
      setIsRefundDialogOpen(false);
      setRefundData({
        amount: "",
        notes: "",
        method: "", // Reset method
      });
      toast({
        title: "Sucesso!",
        description: "Valor de estorno definido com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/overview"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível definir valor de estorno",
        variant: "destructive",
      });
    },
  });

  // Combine all payables
  const allPayables = [
    // Producer payments
    ...producerPayments.map((payment: any) => ({
      id: `producer-${payment.id}`,
      type: 'producer',
      dueDate: payment.deadline || payment.createdAt,
      description: `Pagamento Produtor - ${payment.product}`,
      amount: payment.amount,
      status: payment.status,
      beneficiary: payment.producerName,
      orderNumber: payment.orderNumber,
      category: 'Produção'
    })),

    // Approved expenses not reimbursed
    ...expenses
      .filter((expense: any) => expense.status === 'approved' && !expense.reimbursedAt)
      .map((expense: any) => ({
        id: `expense-${expense.id}`,
        type: 'expense',
        dueDate: expense.date,
        description: expense.description,
        amount: expense.amount,
        status: 'approved',
        beneficiary: expense.vendorName || 'Despesa Geral',
        category: expense.category,
        orderNumber: expense.orderNumber || '-'
      })),

    // Confirmed commissions not paid
    ...commissions
      .filter((commission: any) => commission.status === 'confirmed' && !commission.paidAt)
      .map((commission: any) => ({
        id: `commission-${commission.id}`,
        type: 'commission',
        dueDate: commission.createdAt,
        description: `Comissão - Pedido ${commission.orderNumber}`,
        amount: commission.amount,
        status: 'confirmed',
        beneficiary: commission.vendorName || commission.partnerName,
        category: commission.type === 'vendor' ? 'Comissão Vendedor' : 'Comissão Parceiro',
        orderNumber: commission.orderNumber
      })),

    // Cancelled orders with payments (refunds)
    ...orders
      .filter((order: any) => order.status === 'cancelled' && parseFloat(order.paidValue || '0') > 0)
      .map((order: any) => ({
        id: `refund-${order.id}`,
        type: 'refund',
        dueDate: order.updatedAt,
        description: `Estorno - ${order.product}`,
        amount: order.refundAmount || order.paidValue,
        status: order.refundAmount ? 'defined' : 'pending_definition',
        beneficiary: order.clientName,
        category: 'Estorno',
        orderNumber: order.orderNumber,
        originalOrder: order
      }))
  ];

  const getStatusBadge = (status: string, type?: string) => {
    const statusMap = {
      pending: { label: "Pendente", variant: "secondary" as const },
      approved: { label: "Aprovado", variant: "outline" as const },
      confirmed: { label: "Confirmado", variant: "outline" as const },
      pending_definition: { label: "Aguardando Valor", variant: "destructive" as const },
      defined: { label: "Valor Definido", variant: "secondary" as const },
      paid: { label: "Pago", variant: "default" as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;

    return (
      <Badge variant={statusInfo.variant} className="capitalize">
        {statusInfo.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const iconMap = {
      producer: <Factory className="h-4 w-4" />,
      expense: <Receipt className="h-4 w-4" />,
      commission: <Users className="h-4 w-4" />,
      refund: <RefreshCw className="h-4 w-4" />,
    };

    return iconMap[type as keyof typeof iconMap] || iconMap.expense;
  };

  const filteredPayables = allPayables.filter((payable: any) => {
    const matchesStatus = statusFilter === "all" || payable.status === statusFilter;
    const matchesType = typeFilter === "all" || payable.type === typeFilter;
    const matchesSearch = searchTerm === "" || 
      payable.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payable.beneficiary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payable.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const handlePayProducer = (producerPayment: any) => {
    setSelectedPayable(producerPayment);
    setPaymentData(prev => ({ 
      ...prev, 
      amount: producerPayment.amount,
      notes: producerPayment.notes || '' 
    }));
    setIsPayDialogOpen(true);
  };

  const handlePay = () => {
    if (selectedPayable && paymentData.amount && paymentData.method) {
      payProducerMutation.mutate({
        payableId: selectedPayable.id.replace('producer-', ''),
        amount: parseFloat(paymentData.amount.replace('R$ ', '').replace(',', '.')),
        method: paymentData.method,
        transactionId: paymentData.transactionId,
        notes: paymentData.notes
      });
    }
  };

  const handleSetRefund = () => {
    if (selectedPayable && refundData.amount && refundData.notes) {
      setRefundMutation.mutate({
        orderId: selectedPayable.originalOrder.id,
        amount: parseFloat(refundData.amount).toFixed(2),
        notes: refundData.notes,
        method: refundData.method, // Pass refund method
      });
    }
  };

  const breakdown = overview?.payablesBreakdown || {
    producers: 0,
    expenses: 0,
    commissions: 0,
    refunds: 0
  };

  const totalPayables = breakdown.producers + breakdown.expenses + breakdown.commissions + breakdown.refunds;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contas a Pagar</h1>
          <p className="text-gray-600">Controle de valores a pagar: produtores, despesas, comissões e estornos</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total a Pagar</p>
                <p className="text-xl font-bold gradient-text">
                  R$ {totalPayables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Produtores</p>
                <p className="text-xl font-bold gradient-text">
                  R$ {breakdown.producers.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Factory className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Despesas</p>
                <p className="text-xl font-bold gradient-text">
                  R$ {breakdown.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Comissões + Estornos</p>
                <p className="text-xl font-bold gradient-text">
                  R$ {(breakdown.commissions + breakdown.refunds).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por descrição, beneficiário ou pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="pending_definition">Aguardando Valor</SelectItem>
                  <SelectItem value="defined">Valor Definido</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="producer">Produtores</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                  <SelectItem value="commission">Comissões</SelectItem>
                  <SelectItem value="refund">Estornos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payables Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contas a Pagar ({filteredPayables.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Descrição
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Beneficiário
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayables.map((payable: any) => (
                  <tr key={payable.id}>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      {new Date(payable.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      <div className="flex items-center">
                        {getTypeIcon(payable.type)}
                        <span className="ml-1 hidden sm:inline">{payable.category || payable.type}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      <div className="max-w-[150px] truncate" title={payable.description}>
                        {payable.description}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      <div className="max-w-[120px] truncate" title={payable.beneficiary}>
                        {payable.beneficiary}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900 font-semibold">
                      R$ {parseFloat(payable.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2">
                      {getStatusBadge(payable.status, payable.type)}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <div className="flex space-x-1">
                        {payable.type === 'producer' && (payable.status === 'approved' || payable.status === 'pending') && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handlePayProducer(payable)}
                          >
                            <CreditCard className="h-3 w-3" />
                          </Button>
                        )}
                        {payable.type === 'refund' && payable.status === 'pending_definition' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              setSelectedPayable(payable);
                              setRefundData(prev => ({ ...prev, amount: payable.amount }));
                              setIsRefundDialogOpen(true);
                            }}
                          >
                            <DollarSign className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento Manual</DialogTitle>
            <DialogDescription>
              {selectedPayable?.type === 'producer' 
                ? `Registrando pagamento de R$ ${parseFloat(selectedPayable.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${selectedPayable.producerName || 'Produtor'}`
                : `Registrando pagamento de ${selectedPayable?.type || 'item'}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Informações do serviço */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Informações do Serviço</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Produtor:</strong> {selectedPayable?.beneficiary}</div>
                  <div><strong>Produto:</strong> {selectedPayable?.description?.replace('Pagamento Produtor - ', '') || 'N/A'}</div>
                  <div><strong>Pedido:</strong> {selectedPayable?.orderNumber || 'N/A'}</div>
                  <div><strong>Categoria:</strong> {selectedPayable?.category}</div>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Valor do Pagamento</h4>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-700">
                    R$ {parseFloat(selectedPayable?.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-green-600">Valor acordado com o produtor</div>
                </div>
              </div>
            </div>

            {/* Campos de pagamento */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="payment-amount">Valor</Label>
                <Input
                  id="payment-amount"
                  type="text"
                  value={selectedPayable?.type === 'producer' 
                    ? `R$ ${parseFloat(selectedPayable.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                    : paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value.replace('R$ ', '').replace(',', '.') }))}
                  placeholder="0,00"
                  disabled={selectedPayable?.type === 'producer'}
                  className={selectedPayable?.type === 'producer' ? 'bg-gray-100' : ''}
                />
                {selectedPayable?.type === 'producer' && (
                  <p className="text-sm text-gray-500 mt-1">Valor definido na ordem de produção</p>
                )}
              </div>

              <div>
                <Label htmlFor="payment-method">Método de Pagamento <span className="text-red-500">*</span></Label>
                <Select 
                  value={paymentData.method}
                  onValueChange={(value) => setPaymentData(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transfer">Transferência Bancária</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                    <SelectItem value="manual">Manual/Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="transaction-id">ID da Transação/Comprovante</Label>
              <Input
                id="transaction-id"
                placeholder="Número do comprovante, ID da transação ou referência do pagamento"
                value={paymentData.transactionId}
                onChange={(e) => setPaymentData(prev => ({ ...prev, transactionId: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="payment-notes">Observações</Label>
              <Textarea
                id="payment-notes"
                placeholder="Adicione observações sobre o pagamento, dados bancários utilizados, ou outras informações relevantes..."
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Alerta de confirmação */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                <div className="text-sm text-yellow-700">
                  <strong>Confirmação:</strong> Certifique-se de que o pagamento foi efetivamente realizado antes de registrar. 
                  Esta ação marcará o pagamento como concluído no sistema.
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="gradient-bg text-white px-6"
                onClick={handlePay}
                disabled={!paymentData.amount || !paymentData.method || payProducerMutation.isPending}
              >
                {payProducerMutation.isPending ? "Processando..." : "Confirmar Pagamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Definir Valor de Estorno</DialogTitle>
            <DialogDescription>
              Defina o valor a ser restituído para {selectedPayable?.beneficiary}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Informações do pedido original */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Informações do Pedido</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Pedido:</strong> {selectedPayable?.orderNumber || 'N/A'}</div>
                  <div><strong>Cliente:</strong> {selectedPayable?.beneficiary}</div>
                  <div><strong>Produto:</strong> {selectedPayable?.description?.replace('Estorno - ', '') || 'N/A'}</div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2">Valores</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Valor Total:</strong> R$ {selectedPayable?.originalOrder?.totalValue ? parseFloat(selectedPayable.originalOrder.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</div>
                  <div><strong>Valor Pago:</strong> R$ {selectedPayable?.originalOrder?.paidValue ? parseFloat(selectedPayable.originalOrder.paidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</div>
                  <div><strong>Status:</strong> <Badge variant="secondary">{selectedPayable?.originalOrder?.status}</Badge></div>
                </div>
              </div>
            </div>

            {/* Campos de estorno */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="refund-amount">Valor a ser Restituído <span className="text-red-500">*</span></Label>
                <Input
                  id="refund-amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={refundData.amount}
                  onChange={(e) => setRefundData(prev => ({ ...prev, amount: e.target.value }))}
                  className="text-lg font-medium"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: R$ {selectedPayable?.originalOrder?.paidValue ? parseFloat(selectedPayable.originalOrder.paidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </p>
              </div>

              <div>
                <Label htmlFor="refund-method">Método de Estorno</Label>
                <Select 
                  value={refundData.method || ''} 
                  onValueChange={(value) => setRefundData(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                    <SelectItem value="credit_reversal">Estorno no Cartão</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit">Crédito para Compra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="refund-notes">Motivo/Observações <span className="text-red-500">*</span></Label>
              <Textarea
                id="refund-notes"
                placeholder="Descreva detalhadamente o motivo do estorno, incluindo justificativa e informações relevantes..."
                value={refundData.notes}
                onChange={(e) => setRefundData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="min-h-[100px]"
              />
            </div>

            {/* Histórico de pagamentos (se disponível) */}
            {selectedPayable?.originalOrder && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Histórico de Pagamentos</h4>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Data do Pedido:</span>
                      <span>{selectedPayable.originalOrder.createdAt ? new Date(selectedPayable.originalOrder.createdAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data de Cancelamento:</span>
                      <span>{selectedPayable.originalOrder.updatedAt ? new Date(selectedPayable.originalOrder.updatedAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Valor Elegível para Estorno:</span>
                      <span className="text-green-600">R$ {selectedPayable?.originalOrder?.paidValue ? parseFloat(selectedPayable.originalOrder.paidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta importante */}
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                <div className="text-sm text-red-700">
                  <strong>Atenção:</strong> O valor de estorno será adicionado às contas a pagar e deverá ser processado pelo departamento financeiro. 
                  Certifique-se de que todas as informações estão corretas antes de confirmar.
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="gradient-bg text-white px-6"
                onClick={handleSetRefund}
                disabled={!refundData.amount || !refundData.notes || setRefundMutation.isPending}
              >
                {setRefundMutation.isPending ? "Salvando..." : "Definir Valor de Estorno"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}