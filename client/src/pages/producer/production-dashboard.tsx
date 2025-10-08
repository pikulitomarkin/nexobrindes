import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Eye, RefreshCw, CheckCircle, Clock, AlertTriangle, Calendar, Package, Truck, MapPin, User, Phone, Mail, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function ProductionDashboard() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isValueDialogOpen, setIsValueDialogOpen] = useState(false);
  const [isValueConfirmationDialogOpen, setIsValueConfirmationDialogOpen] = useState(false); // New state for confirmation modal
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [updateNotes, setUpdateNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [producerValue, setProducerValue] = useState("");
  const [producerNotes, setProducerNotes] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const producerId = user.id;

  const { data: productionOrders, isLoading } = useQuery({
    queryKey: ["/api/production-orders/producer", producerId],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/producer", producerId, "stats"],
  });

  const { data: producerPayments } = useQuery({
    queryKey: ["/api/producer-payments/producer", producerId],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes, deliveryDate, trackingCode }: {
      id: string;
      status: string;
      notes?: string;
      deliveryDate?: string;
      trackingCode?: string;
    }) => {
      const response = await fetch(`/api/production-orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes, deliveryDate, trackingCode }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders/producer", producerId] });
      setIsUpdateDialogOpen(false);
      setUpdateNotes("");
      setDeliveryDate("");
      setTrackingCode("");
      setSelectedOrder(null);
      toast({
        title: "Sucesso!",
        description: "Status atualizado com sucesso",
      });
    },
  });

  const updateValueMutation = useMutation({
    mutationFn: async ({ id, value, notes }: { id: string; value: string; notes?: string }) => {
      const response = await fetch(`/api/production-orders/${id}/value`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, notes }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Erro ao definir valor");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders/producer", producerId] });
      setIsValueDialogOpen(false);
      setIsValueConfirmationDialogOpen(false);
      setProducerValue("");
      setProducerNotes("");
      setSelectedOrder(null);
      toast({
        title: "Sucesso!",
        description: "Valor definido com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao definir valor",
        variant: "destructive",
      });
    }
  });

  const handleStatusUpdate = (order: any, status: string) => {
    // Verificar se o valor está definido antes de permitir mudanças de status críticas
    if ((status === 'ready' || status === 'completed' || status === 'shipped') && (!order.producerValue || parseFloat(order.producerValue || '0') <= 0)) {
      toast({
        title: "Valor não definido",
        description: "Você deve definir o valor do serviço antes de marcar como pronto, enviado ou finalizado.",
        variant: "destructive",
      });
      return;
    }

    if (status === 'completed' || status === 'shipped') {
      setSelectedOrder(order);
      setIsUpdateDialogOpen(true);
    } else {
      updateStatusMutation.mutate({ id: order.id, status });
    }
  };

  const handleUpdateWithTracking = () => {
    if (!selectedOrder) return;

    updateStatusMutation.mutate({
      id: selectedOrder.id,
      status: 'shipped',
      notes: updateNotes,
      deliveryDate: deliveryDate || undefined,
      trackingCode: trackingCode
    });
  };

  const handleSetValue = (order: any) => {
    setSelectedOrder(order);
    if (order.producerValue) {
      setProducerValue(parseFloat(order.producerValue).toFixed(2));
    } else {
      setProducerValue("");
    }
    setProducerNotes(order.producerNotes || "");

    // If the value is already set and locked, don't allow editing
    if (order.producerValueLocked) {
      toast({
        title: "Valor já definido",
        description: "O valor já foi definido e não pode ser alterado",
        variant: "destructive",
      });
      return;
    }

    // If value already exists, go directly to edit dialog
    if (order.producerValue && parseFloat(order.producerValue) > 0) {
      setIsValueDialogOpen(true);
    } else {
      setIsValueDialogOpen(true);
    }
  };

  const handleSaveValue = () => {
    if (!selectedOrder) {
      toast({
        title: "Erro",
        description: "Nenhuma ordem selecionada",
        variant: "destructive",
      });
      return;
    }

    if (!producerValue || producerValue.trim() === '') {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor",
        variant: "destructive",
      });
      return;
    }

    const numericValue = parseFloat(producerValue.replace(',', '.'));
    if (isNaN(numericValue) || numericValue <= 0) {
      toast({
        title: "Erro",
        description: "O valor deve ser um número válido maior que zero",
        variant: "destructive",
      });
      return;
    }

    console.log("Salvando valor:", {
      orderId: selectedOrder.id,
      value: numericValue.toFixed(2),
      notes: producerNotes.trim() || null
    });

    // Show confirmation modal before saving
    setIsValueConfirmationDialogOpen(true);
  };

  const confirmAndSaveValue = () => {
    if (!selectedOrder) return;

    const numericValue = parseFloat(producerValue.replace(',', '.'));
    if (isNaN(numericValue) || numericValue <= 0) {
      toast({
        title: "Erro",
        description: "Valor inválido",
        variant: "destructive",
      });
      return;
    }

    updateValueMutation.mutate({
      id: selectedOrder.id,
      value: numericValue.toFixed(2),
      notes: producerNotes.trim() || null,
    });
  };


  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Aguardando", className: "bg-yellow-100 text-yellow-800" },
      accepted: { label: "Aceito", className: "bg-blue-100 text-blue-800" },
      production: { label: "Em Produção", className: "bg-purple-100 text-purple-800" },
      ready: { label: "Pronto", className: "bg-green-100 text-green-800" },
      shipped: { label: "Enviado", className: "bg-cyan-100 text-cyan-800" },
      delivered: { label: "Entregue", className: "bg-emerald-100 text-emerald-800" },
      completed: { label: "Finalizado", className: "bg-green-100 text-green-800" },
      rejected: { label: "Rejeitado", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] ||
                   { label: status, className: "bg-gray-100 text-gray-800" };

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getNextAction = (order: any) => {
    switch (order.status) {
      case 'pending':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleStatusUpdate(order, 'accepted')}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Aceitar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleStatusUpdate(order, 'rejected')}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Rejeitar
            </Button>
          </div>
        );
      case 'accepted':
          return (
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => handleStatusUpdate(order, 'production')}
              disabled={updateStatusMutation.isPending || !order.producerValue || parseFloat(order.producerValue) <= 0}
              title={(!order.producerValue || parseFloat(order.producerValue) <= 0) ? "Você deve definir o valor do serviço antes de iniciar produção" : ""}
            >
              <Clock className="h-4 w-4 mr-1" />
              Iniciar Produção
            </Button>
          );
      case 'production':
        return (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleStatusUpdate(order, 'ready')}
            disabled={updateStatusMutation.isPending || !order.producerValue}
            title={!order.producerValue ? "Você deve definir o valor do serviço antes de marcar como pronto" : ""}
          >
            <Package className="h-4 w-4 mr-1" />
            Marcar Pronto
          </Button>
        );
      case 'ready':
        return (
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700"
            onClick={() => handleStatusUpdate(order, 'shipped')}
          >
            <Truck className="h-4 w-4 mr-1" />
            Marcar Enviado
          </Button>
        );
      case 'shipped':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleStatusUpdate(order, 'delivered')}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Marcar Entregue
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleStatusUpdate(order, 'completed')}
            >
              Finalizar
            </Button>
          </div>
        );
      case 'delivered':
        return (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleStatusUpdate(order, 'completed')}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Finalizar Ordem
          </Button>
        );
      default:
        return null;
    }
  };

  const filteredOrders = productionOrders?.filter((order: any) => {
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    if (periodFilter !== "all" && order.deadline) {
      const orderDate = new Date(order.deadline);
      const now = new Date();
      const daysDiff = Math.ceil((orderDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

      if (periodFilter === "urgent" && daysDiff > 3) return false;
      if (periodFilter === "week" && daysDiff > 7) return false;
      if (periodFilter === "month" && daysDiff > 30) return false;
    }
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel de Produção</h1>
        <p className="text-gray-600">Gerencie suas ordens de produção e entregas</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Ordens Ativas</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  {stats?.activeOrders || filteredOrders.filter(o => !['completed', 'rejected'].includes(o.status)).length}
                </p>
                <p className="text-xs text-blue-600 mt-1">Total em andamento</p>
              </div>
              <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Aguardando</p>
                <p className="text-3xl font-bold text-yellow-900 mt-2">
                  {filteredOrders.filter(o => o.status === 'pending').length}
                </p>
                <p className="text-xs text-yellow-600 mt-1">Pendentes de aceite</p>
              </div>
              <div className="h-12 w-12 bg-yellow-600 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Em Produção</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  {filteredOrders.filter(o => ['accepted', 'production'].includes(o.status)).length}
                </p>
                <p className="text-xs text-purple-600 mt-1">Sendo produzidas</p>
              </div>
              <div className="h-12 w-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-700">Enviados</p>
                <p className="text-3xl font-bold text-cyan-900 mt-2">
                  {filteredOrders.filter(o => ['shipped', 'delivered'].includes(o.status)).length}
                </p>
                <p className="text-xs text-cyan-600 mt-1">Em transporte</p>
              </div>
              <div className="h-12 w-12 bg-cyan-600 rounded-xl flex items-center justify-center">
                <Truck className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">A Receber</p>
                <p className="text-2xl font-bold text-green-900 mt-2">
                  R$ {(producerPayments?.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-green-600 mt-1">Pagamentos pendentes</p>
              </div>
              <div className="h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending">Aguardando</SelectItem>
            <SelectItem value="accepted">Aceito</SelectItem>
            <SelectItem value="production">Em Produção</SelectItem>
            <SelectItem value="ready">Pronto</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="completed">Finalizado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por prazo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Prazos</SelectItem>
            <SelectItem value="urgent">Urgente (3 dias)</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>



      {/* Orders List with Accordion */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Ordens de Produção
              <Badge variant="outline" className="ml-2">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'ordem' : 'ordens'}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p>Carregando ordens...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma ordem encontrada</h3>
              <p className="text-gray-500">Não há ordens de produção que correspondam aos filtros selecionados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order: any) => (
                <div key={order.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 bg-white">
                  {/* Accordion Header - Always Visible */}
                  <div
                    className="p-5 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 cursor-pointer transition-all duration-200 border-b border-gray-100"
                    onClick={() => {
                      const element = document.getElementById(`order-${order.id}`);
                      if (element) {
                        element.style.display = element.style.display === 'none' ? 'block' : 'none';
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              #{order.id.slice(-6)}
                            </h3>
                            <span className="text-sm text-gray-600">
                              {order.clientName || order.order?.clientName || 'Cliente N/A'}
                            </span>
                          </div>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-3">
                        {order.producerValue && (
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              R$ {parseFloat(order.producerValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500">Valor definido</p>
                          </div>
                        )}
                        {!order.producerValue && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-orange-600">Valor não definido</p>
                            <p className="text-xs text-gray-500">Defina o valor</p>
                          </div>
                        )}
                        <div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs text-gray-600">▼</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content - Collapsible */}
                  <div id={`order-${order.id}`} style={{ display: 'none' }} className="p-6 bg-white border-t">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          Pedido: {order.order?.orderNumber || 'N/A'}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/producer/order/${order.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes Completos
                        </Button>
                      </div>
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Cliente</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <p className="font-medium">{order.clientName || order.order?.clientName || 'N/A'}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Tipo de Entrega</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <p className="font-medium">
                          {order.order?.deliveryType === 'pickup' ? 'Retirada no Local' : 'Entrega em Casa'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Prazo</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <p className="font-medium">
                          {order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : 'Não definido'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {order.order?.shippingAddress && (
                    <div className="mb-4">
                      <Label className="text-sm font-medium text-gray-500">Endereço de Envio</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <p className="text-sm">{order.order.shippingAddress}</p>
                      </div>
                    </div>
                  )}

                  {order.trackingCode && (
                    <div className="mb-4">
                      <Label className="text-sm font-medium text-gray-500">Código de Rastreamento</Label>
                      <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="font-mono font-semibold text-blue-800">{order.trackingCode}</p>
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <div className="mb-4">
                      <Label className="text-sm font-medium text-gray-500">Observações</Label>
                      <div className="mt-1 p-3 bg-gray-50 border rounded">
                        <p className="text-sm">{order.notes}</p>
                        {order.lastNoteAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Última atualização: {new Date(order.lastNoteAt).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Produto: {order.order?.product || 'N/A'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetValue(order)}
                          className="flex items-center gap-1"
                          disabled={order.producerValue && parseFloat(order.producerValue) > 0}
                        >
                          <DollarSign className="h-4 w-4" />
                          {order.producerValue ? 'Valor Definido' : 'Definir Valor'}
                        </Button>
                        {getNextAction(order)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Value Setting Dialog - Step 1: Input Value */}
      <Dialog open={isValueDialogOpen} onOpenChange={setIsValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Valor do Serviço</DialogTitle>
            <DialogDescription>
              Defina o valor que você cobrará pela produção deste pedido
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="producer-value">Valor do Serviço (R$)</Label>
              <Input
                id="producer-value"
                type="number"
                step="0.01"
                min="0.01"
                value={producerValue}
                onChange={(e) => setProducerValue(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <Label htmlFor="producer-notes">Observações (Opcional)</Label>
              <Textarea
                id="producer-notes"
                placeholder="Descreva o que está incluído no valor (material, mão de obra, etc.)"
                value={producerNotes}
                onChange={(e) => setProducerNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsValueDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveValue}
              disabled={!producerValue || parseFloat(producerValue) <= 0}
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Value Confirmation Dialog - Step 2: Confirm Value */}
      <Dialog open={isValueConfirmationDialogOpen} onOpenChange={setIsValueConfirmationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Valor do Serviço</DialogTitle>
            <DialogDescription>
              Verifique se o valor está correto antes de confirmar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Produto</Label>
                  <p className="font-medium">{selectedOrder?.order?.product || selectedOrder?.product}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Cliente</Label>
                  <p className="font-medium">{selectedOrder?.clientName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Valor Total do Pedido</Label>
                  <p className="text-lg font-bold text-green-600">
                    R$ {parseFloat(selectedOrder?.order?.totalValue || selectedOrder?.totalValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Seu Valor</Label>
                  <p className="text-xl font-bold text-blue-600">
                    R$ {parseFloat(producerValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {producerNotes && (
                <div className="mt-3">
                  <Label className="text-sm text-gray-600">Suas Observações</Label>
                  <p className="text-gray-800 bg-white p-2 rounded mt-1">{producerNotes}</p>
                </div>
              )}
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Atenção:</strong> Após confirmar, este valor ficará registrado no sistema e será usado para controle financeiro.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsValueConfirmationDialogOpen(false);
                setIsValueDialogOpen(true);
              }}
            >
              Voltar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={confirmAndSaveValue}
              disabled={updateValueMutation.isPending}
            >
              {updateValueMutation.isPending ? "Confirmando..." : "Confirmar Valor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Dialog with Tracking */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Enviado</DialogTitle>
            <DialogDescription>
              Adicione o código de rastreamento e informações sobre o envio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tracking-code">Código de Rastreamento *</Label>
              <Input
                id="tracking-code"
                placeholder="Ex: BR123456789..."
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="delivery-date">Data de Envio (Opcional)</Label>
              <Input
                id="delivery-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="notes">Observações (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Informações sobre o envio, transportadora, etc..."
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateWithTracking}
              disabled={updateStatusMutation.isPending || !trackingCode}
            >
              {updateStatusMutation.isPending ? "Salvando..." : "Marcar como Enviado"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}