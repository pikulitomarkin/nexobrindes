import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, DollarSign, TrendingUp, Clock, CheckCircle, Plus, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinanceReceivables() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "",
    transactionId: "",
    notes: "",
  });
  const { toast } = useToast();

  // Fetch real receivables data from API
  const { data: receivablesData = [], isLoading } = useQuery({
    queryKey: ['/api/finance/receivables'],
    queryFn: async () => {
      const response = await fetch('/api/finance/receivables', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar contas a receber');
      }
      return response.json();
    }
  });

  // Convert API data to expected format
  const mockReceivables = receivablesData.map((receivable: any) => ({
    id: receivable.id,
    orderNumber: receivable.orderNumber || `#${receivable.orderId}`,
    clientName: receivable.clientName || 'Cliente não identificado',
    dueDate: receivable.dueDate ? new Date(receivable.dueDate) : new Date(),
    amount: receivable.amount || "0.00",
    paidAmount: receivable.receivedAmount || "0.00",
    status: receivable.status || "pending",
    createdAt: receivable.createdAt ? new Date(receivable.createdAt) : new Date(),
    lastPaymentDate: receivable.lastPaymentDate ? new Date(receivable.lastPaymentDate) : null
  }));

  const receivePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      // Encontrar a conta a receber real para obter o orderId
      const receivable = mockReceivables.find(r => r.id === data.receivableId);
      if (!receivable) {
        throw new Error('Conta a receber não encontrada');
      }

      // O receivable ID tem formato "ar-{orderId}", extrair o orderId real
      let actualOrderId = receivable.id;
      if (receivable.id && receivable.id.startsWith('ar-')) {
        actualOrderId = receivable.id.replace('ar-', '');
      }

      // Criar um pagamento direto via API usando o orderId real
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orderId: actualOrderId, // Usar o ID real do pedido
          amount: data.amount,
          method: data.method,
          status: 'confirmed',
          transactionId: data.transactionId,
          notes: data.notes,
          paidAt: new Date()
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao registrar pagamento');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/receivables'] });
      setIsReceiveDialogOpen(false);
      setSelectedReceivable(null);
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
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível registrar o pagamento",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendente", variant: "secondary" as const },
      partial: { label: "Parcial", variant: "outline" as const },
      paid: { label: "Pago", variant: "default" as const },
      overdue: { label: "Vencido", variant: "destructive" as const },
      cancelled: { label: "Cancelado", variant: "secondary" as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;

    return (
      <Badge variant={statusInfo.variant} className="capitalize">
        {statusInfo.label}
      </Badge>
    );
  };

  const filteredReceivables = mockReceivables.filter((receivable: any) => {
    const matchesStatus = statusFilter === "all" || receivable.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      receivable.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receivable.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleReceivePayment = () => {
    if (selectedReceivable && paymentData.amount) {
      receivePaymentMutation.mutate({
        receivableId: selectedReceivable.id,
        amount: parseFloat(paymentData.amount).toFixed(2),
        method: paymentData.method,
        transactionId: paymentData.transactionId,
        notes: paymentData.notes
      });
    }
  };

  const totalToReceive = mockReceivables.reduce((sum, r) => sum + parseFloat(r.amount) - parseFloat(r.paidAmount), 0);
  const totalReceived = mockReceivables.reduce((sum, r) => sum + parseFloat(r.paidAmount), 0);
  const awaitingEntryCount = mockReceivables.filter(r => r.status === 'pending' || r.status === 'partial').length;
  const partiallyPaidCount = mockReceivables.filter(r => r.status === 'partial').length;
  const overdueCount = mockReceivables.filter(r => r.status === 'overdue').length;
  const pendingCount = mockReceivables.filter(r => r.status === 'pending').length;


  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pedidos a Receber</h1>
        <p className="text-gray-600">Controle de pedidos a receber de clientes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo a Receber</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-sm font-medium text-gray-600">Já Recebido</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-sm font-medium text-gray-600">Aguardando Entrada</p>
                <p className="text-3xl font-bold gradient-text">
                  {awaitingEntryCount}
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
                <p className="text-sm font-medium text-gray-600">Entrada Recebida</p>
                <p className="text-3xl font-bold gradient-text">
                  {partiallyPaidCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
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
                  placeholder="Buscar por pedido ou cliente..."
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
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receivables Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos a Receber ({filteredReceivables.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recebido
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceivables.map((receivable: any) => (
                  <tr key={receivable.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {new Date(receivable.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                      {receivable.orderNumber}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 max-w-[120px] truncate">
                      {receivable.clientName}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-semibold">
                      R$ {parseFloat(receivable.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-semibold">
                      R$ {parseFloat(receivable.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-semibold">
                      R$ {(parseFloat(receivable.amount) - parseFloat(receivable.paidAmount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {getStatusBadge(receivable.status)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        {receivable.status !== 'paid' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              setSelectedReceivable(receivable);
                              setPaymentData({
                                ...paymentData,
                                amount: (parseFloat(receivable.amount) - parseFloat(receivable.paidAmount)).toString()
                              });
                              setIsReceiveDialogOpen(true);
                            }}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Receber
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

      {/* Receive Payment Dialog */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receber Pagamento</DialogTitle>
            <DialogDescription>
              Registre o recebimento para {selectedReceivable?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment-amount">Valor Recebido</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="payment-method">Método</Label>
                <Select 
                  value={paymentData.method} 
                  onValueChange={(value) => setPaymentData(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit_card">Cartão</SelectItem>
                    <SelectItem value="bank_transfer">TED/DOC</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="transaction-id">ID da Transação</Label>
              <Input
                id="transaction-id"
                placeholder="ID ou referência do pagamento"
                value={paymentData.transactionId}
                onChange={(e) => setPaymentData(prev => ({ ...prev, transactionId: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="payment-notes">Observações</Label>
              <Input
                id="payment-notes"
                placeholder="Observações sobre o pagamento"
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="gradient-bg text-white"
                onClick={handleReceivePayment}
                disabled={!paymentData.amount || receivePaymentMutation.isPending}
              >
                {receivePaymentMutation.isPending ? "Salvando..." : "Confirmar Recebimento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}