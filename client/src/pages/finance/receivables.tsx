import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, Eye, DollarSign, TrendingUp, Clock, CheckCircle, Plus, CreditCard, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinanceReceivables() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "",
    transactionId: "",
    notes: "",
  });
  const [newReceivableData, setNewReceivableData] = useState({
    clientName: "",
    description: "",
    amount: "",
    dueDate: "",
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

  // Fetch branches data
  const { data: branches = [] } = useQuery({
    queryKey: ['/api/branches'],
    queryFn: async () => {
      const response = await fetch('/api/branches', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar filiais');
      }
      return response.json();
    }
  });

  // Convert API data to expected format - SEMPRE mostrar valor total original do pedido
  const mockReceivables = receivablesData.map((receivable: any) => ({
    id: receivable.id,
    orderNumber: receivable.orderNumber || `#${receivable.orderId}`,
    clientName: receivable.clientName || 'Cliente não identificado',
    dueDate: receivable.dueDate ? new Date(receivable.dueDate) : new Date(),
    amount: receivable.amount || "0.00", // SEMPRE o valor total original do pedido
    paidAmount: receivable.receivedAmount || "0.00",
    minimumPayment: receivable.minimumPayment || "0.00", // Pagamento mínimo obrigatório (entrada + frete)
    status: receivable.status || "pending",
    createdAt: receivable.createdAt ? new Date(receivable.createdAt) : new Date(),
    lastPaymentDate: receivable.lastPaymentDate ? new Date(receivable.lastPaymentDate) : null,
    shippingCost: receivable.shippingCost || "0.00",
    items: receivable.items || []
  }));

  const receivePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      // Encontrar a conta a receber real
      const receivable = receivablesData.find((r: any) => r.id === data.receivableId);
      if (!receivable) {
        throw new Error('Conta a receber não encontrada');
      }

      // Usar a API específica para pagamento de contas a receber
      const response = await fetch(`/api/receivables/${data.receivableId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: data.amount,
          method: data.method || 'manual',
          transactionId: data.transactionId || `MANUAL-${Date.now()}`,
          notes: data.notes || ''
        })
      });

      if (!response.ok) {
        let errorMessage = 'Erro ao registrar pagamento';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON (like HTML error page), use status text
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/receivables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
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
      // Force refetch after a short delay to ensure data is fresh
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/finance/receivables"] });
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível registrar o pagamento",
        variant: "destructive",
      });
    },
  });

  const createReceivableMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/finance/receivables/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          clientName: data.clientName,
          description: data.description,
          amount: parseFloat(data.amount).toFixed(2),
          dueDate: data.dueDate,
          notes: data.notes
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao criar conta a receber');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/receivables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setIsCreateDialogOpen(false);
      setNewReceivableData({
        clientName: "",
        description: "",
        amount: "",
        dueDate: "",
        notes: "",
      });
      toast({
        title: "Sucesso!",
        description: "Conta a receber criada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a conta a receber",
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
    const matchesBranch = branchFilter === "all" || 
      receivable.branchId === branchFilter ||
      (branchFilter === 'matriz' && (!receivable.branchId || receivable.branchId === 'matriz'));
    return matchesStatus && matchesSearch && matchesBranch;
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

  const handleCreateReceivable = () => {
    if (newReceivableData.clientName && newReceivableData.description && newReceivableData.amount && newReceivableData.dueDate) {
      createReceivableMutation.mutate(newReceivableData);
    }
  };

  // Calcular totais corretos: Valor Original - Valor Recebido = Saldo restante
  const totalToReceive = mockReceivables.reduce((sum, r) => {
    const originalAmount = parseFloat(r.amount); // Valor original do pedido
    const receivedAmount = parseFloat(r.paidAmount || r.receivedAmount || "0");
    return sum + Math.max(0, originalAmount - receivedAmount);
  }, 0);
  
  const totalReceived = mockReceivables.reduce((sum, r) => sum + parseFloat(r.paidAmount || r.receivedAmount || "0"), 0);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="card-hover">
          <CardContent className="panel-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="panel-stat-label">Saldo a Receber</p>
                <p className="panel-stat-value">
                  R$ {totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="panel-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="panel-stat-label">Já Recebido</p>
                <p className="panel-stat-value">
                  R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="panel-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="panel-stat-label">Aguardando Entrada</p>
                <p className="panel-stat-value text-yellow-600">{awaitingEntryCount}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="panel-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="panel-stat-label">Entrada Recebida</p>
                <p className="panel-stat-value text-green-600">{partiallyPaidCount}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-600" />
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

              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Filiais</SelectItem>
                  <SelectItem value="matriz">
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2 text-yellow-600" />
                      Matriz
                    </div>
                  </SelectItem>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                        {branch.name} - {branch.city}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receivables Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="panel-section-title">
              Pedidos a Receber ({filteredReceivables.length})
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-bg text-white panel-button" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Conta a Receber
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nova Conta a Receber</DialogTitle>
                  <DialogDescription>
                    Crie uma nova conta a receber manualmente
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="client-name">Conta a Receber *</Label>
                    <Input
                      id="client-name"
                      placeholder="Nome da conta a receber"
                      value={newReceivableData.clientName}
                      onChange={(e) => setNewReceivableData(prev => ({ ...prev, clientName: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição *</Label>
                    <Input
                      id="description"
                      placeholder="Descrição da conta a receber"
                      value={newReceivableData.description}
                      onChange={(e) => setNewReceivableData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Valor (R$) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={newReceivableData.amount}
                        onChange={(e) => setNewReceivableData(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="due-date">Data de Vencimento *</Label>
                      <Input
                        id="due-date"
                        type="date"
                        value={newReceivableData.dueDate}
                        onChange={(e) => setNewReceivableData(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      placeholder="Observações adicionais"
                      value={newReceivableData.notes}
                      onChange={(e) => setNewReceivableData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      className="gradient-bg text-white"
                      onClick={handleCreateReceivable}
                      disabled={!newReceivableData.clientName || !newReceivableData.description || !newReceivableData.amount || !newReceivableData.dueDate || createReceivableMutation.isPending}
                    >
                      {createReceivableMutation.isPending ? "Criando..." : "Criar Conta a Receber"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full panel-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="panel-table th">
                    Vencimento
                  </th>
                  <th className="panel-table th">
                    Pedido
                  </th>
                  <th className="panel-table th">
                    Cliente
                  </th>
                  <th className="panel-table th">
                    Valor Total
                    <div className="text-xs font-normal text-gray-500">
                      (Valor original do pedido)
                    </div>
                  </th>
                  <th className="panel-table th">
                    Entrada+Frete
                  </th>
                  <th className="panel-table th">
                    Recebido
                  </th>
                  <th className="panel-table th">
                    Saldo
                  </th>
                  <th className="panel-table th">
                    Status
                  </th>
                  <th className="panel-table th">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceivables.map((receivable: any) => {
                  const minimumPayment = parseFloat(receivable.minimumPayment || 0);
                  const paidAmount = parseFloat(receivable.paidAmount || 0);
                  const isMinimumMet = paidAmount >= minimumPayment;

                  return (
                    <tr key={receivable.id} className={!isMinimumMet && minimumPayment > 0 ? 'bg-red-50' : ''}>
                      <td className="panel-table td">
                        {new Date(receivable.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="panel-table td font-medium">
                        {receivable.orderNumber}
                      </td>
                      <td className="panel-table td max-w-[120px] truncate">
                        {receivable.clientName}
                      </td>
                      <td className="panel-table td font-semibold text-blue-600">
                        R$ {parseFloat(receivable.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <div className="text-xs text-gray-500">
                          Valor total do pedido
                        </div>
                      </td>
                      <td className="panel-table td font-semibold">
                        <span className={isMinimumMet ? 'text-green-600' : 'text-red-600'}>
                          R$ {minimumPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {minimumPayment > 0 ? (
                          <div className="text-xs text-gray-500">
                            {isMinimumMet ? '✓ Entrada paga' : '⚠ Entrada obrigatória'}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">
                            Sem entrada definida
                          </div>
                        )}
                      </td>
                      <td className="panel-table td font-semibold text-green-600">
                        R$ {parseFloat(receivable.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="panel-table td font-semibold text-blue-600">
                        R$ {Math.max(0, parseFloat(receivable.amount) - parseFloat(receivable.receivedAmount || receivable.paidAmount || "0")).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="panel-table td">
                        {getStatusBadge(receivable.status)}
                      </td>
                      <td className="panel-table td space-x-1">
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 panel-button"
                            onClick={() => {
                              setSelectedReceivable(receivable);
                              setIsDetailsDialogOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          {receivable.status !== 'paid' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className={`h-7 px-2 panel-button ${!isMinimumMet && minimumPayment > 0 ? 'bg-red-100 text-red-800 hover:bg-red-200' : ''}`}
                              onClick={() => {
                                setSelectedReceivable(receivable);
                                // Suggest minimum payment if not met, otherwise remaining amount
                                const receivedSoFar = parseFloat(receivable.receivedAmount || receivable.paidAmount || "0");
                                const remainingAmount = Math.max(0, parseFloat(receivable.amount) - receivedSoFar);
                                const suggestedAmount = !isMinimumMet && minimumPayment > 0 ? 
                                  minimumPayment.toString() : 
                                  remainingAmount.toString();
                                setPaymentData({
                                  ...paymentData,
                                  amount: suggestedAmount
                                });
                                setIsReceiveDialogOpen(true);
                              }}
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              {!isMinimumMet && minimumPayment > 0 ? 'Entrada' : 'Receber'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              {selectedReceivable?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedReceivable && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Número do Pedido</p>
                  <p className="font-semibold text-gray-900">{selectedReceivable.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cliente</p>
                  <p className="font-semibold text-gray-900">{selectedReceivable.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Data de Vencimento</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedReceivable.dueDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <div>{getStatusBadge(selectedReceivable.status)}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-4">Produtos Comprados</h3>
                {selectedReceivable.items && selectedReceivable.items.length > 0 ? (
                  <div className="space-y-2 mb-6 max-h-48 overflow-y-auto border rounded p-3 bg-gray-50">
                    {selectedReceivable.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm py-2 border-b last:border-b-0">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <p className="text-xs text-gray-500">Qtd: {item.quantity}</p>
                        </div>
                        <p className="text-sm text-gray-700">
                          R$ {(parseFloat(item.totalPrice || item.unitPrice || 0) * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-6">Nenhum produto encontrado</p>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-4">Valores</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Valor Total do Pedido</span>
                    <span className="font-semibold text-blue-600">
                      R$ {parseFloat(selectedReceivable.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {parseFloat(selectedReceivable.shippingCost || 0) > 0 && (
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded">
                      <span className="text-gray-700">Frete</span>
                      <span className="font-semibold text-amber-600">
                        R$ {parseFloat(selectedReceivable.shippingCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Entrada + Frete Mínimo</span>
                    <span className="font-semibold text-orange-600">
                      R$ {parseFloat(selectedReceivable.minimumPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="text-gray-700">Já Recebido</span>
                    <span className="font-semibold text-green-600">
                      R$ {parseFloat(selectedReceivable.paidAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-2 border-blue-200">
                    <span className="text-gray-700 font-semibold">Saldo Restante</span>
                    <span className="font-bold text-blue-600 text-lg">
                      R$ {Math.max(0, parseFloat(selectedReceivable.amount) - parseFloat(selectedReceivable.paidAmount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                  Fechar
                </Button>
                {selectedReceivable.status !== 'paid' && (
                  <Button 
                    className="gradient-bg text-white"
                    onClick={() => {
                      setIsDetailsDialogOpen(false);
                      setSelectedReceivable(selectedReceivable);
                      const minimumPayment = parseFloat(selectedReceivable.minimumPayment || 0);
                      const paidAmount = parseFloat(selectedReceivable.paidAmount || 0);
                      const isMinimumMet = paidAmount >= minimumPayment;
                      const remainingAmount = Math.max(0, parseFloat(selectedReceivable.amount) - paidAmount);
                      const suggestedAmount = !isMinimumMet && minimumPayment > 0 ? 
                        minimumPayment.toString() : 
                        remainingAmount.toString();
                      setPaymentData({
                        ...paymentData,
                        amount: suggestedAmount
                      });
                      setIsReceiveDialogOpen(true);
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Registrar Pagamento
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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