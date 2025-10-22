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
  const [producerValue, setProducerValue] = useState("");
  const [producerNotes, setProducerNotes] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const producerId = user.id;

  const { data: productionOrders, isLoading } = useQuery({
    queryKey: ["/api/production-orders/producer", producerId],
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/producer", producerId, "stats"],
  });



  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: {
      id: string;
      status: string;
      notes?: string;
    }) => {
      const response = await fetch(`/api/production-orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders/producer", producerId] });
      setIsUpdateDialogOpen(false);
      setUpdateNotes("");
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
    if (status === 'ready' && (!order.producerValue || parseFloat(order.producerValue || '0') <= 0)) {
      toast({
        title: "Valor não definido",
        description: "Você deve definir o valor do serviço antes de marcar como pronto.",
        variant: "destructive",
      });
      return;
    }

    updateStatusMutation.mutate({ id: order.id, status });
  };



  const handleSetValue = (order: any) => {
    setSelectedOrder(order);
    if (order.producerValue) {
      setProducerValue(parseFloat(order.producerValue).toFixed(2));
    } else {
      setProducerValue("");
    }
    setProducerNotes(order.producerNotes || "");

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
      notes: producerNotes.trim() || undefined,
    });
  };


  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Aguardando", className: "bg-yellow-100 text-yellow-800" },
      accepted: { label: "Aceito", className: "bg-blue-100 text-blue-800" },
      production: { label: "Em Produção", className: "bg-purple-100 text-purple-800" },
      ready: { label: "Pronto - Em Expedição", className: "bg-green-100 text-green-800" },
      shipped: { label: "Despachado", className: "bg-cyan-100 text-cyan-800" },
      delivered: { label: "Entregue", className: "bg-emerald-100 text-emerald-800" },
      completed: { label: "Finalizado", className: "bg-slate-100 text-slate-800" },
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
              disabled={updateStatusMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {updateStatusMutation.isPending ? 'Aceitando...' : 'Aceitar'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleStatusUpdate(order, 'rejected')}
              disabled={updateStatusMutation.isPending}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              {updateStatusMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}
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
              {updateStatusMutation.isPending ? 'Iniciando...' : 'Iniciar Produção'}
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
            {updateStatusMutation.isPending ? 'Finalizando...' : 'Marcar Pronto'}
          </Button>
        );
      case 'ready':
        return (
          <div className="text-sm text-green-700 font-medium bg-green-50 px-3 py-2 rounded-lg">
            <CheckCircle className="h-4 w-4 mr-1 inline" />
            Produto Pronto - Enviado para Expedição
          </div>
        );
      default:
        return null;
    }
  };

  const filteredOrders = (productionOrders as any[] || []).filter((order: any) => {
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
  });

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Ordens Ativas</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  {stats?.activeOrders || filteredOrders.filter((o: any) => !['completed', 'rejected'].includes(o.status)).length}
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
                  {filteredOrders.filter((o: any) => o.status === 'pending').length}
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
                  {filteredOrders.filter((o: any) => ['accepted', 'production'].includes(o.status)).length}
                </p>
                <p className="text-xs text-purple-600 mt-1">Sendo produzidas</p>
              </div>
              <div className="h-12 w-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Prontos</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {filteredOrders.filter((o: any) => ['ready', 'shipped', 'delivered', 'completed'].includes(o.status)).length}
                </p>
                <p className="text-xs text-green-600 mt-1">Finalizados pela produção</p>
              </div>
              <div className="h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
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
              {filteredOrders.map((order: any) => {
                // Parse order details if available
                let orderDetails = null;
                try {
                  orderDetails = order.orderDetails ? JSON.parse(order.orderDetails) : null;
                } catch (e) {
                  console.log('Error parsing order details:', e);
                }

                return (
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
                                {orderDetails?.orderNumber || `#${order.id.slice(-6)}`}
                              </h3>
                              <span className="text-sm text-gray-600">
                                {orderDetails?.clientDetails?.name || order.clientName || order.order?.clientName || 'Cliente N/A'}
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
                            Pedido: {orderDetails?.orderNumber || order.order?.orderNumber || 'N/A'}
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

                      {/* Product Information */}
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Produto Principal</h4>
                        <p className="text-blue-800">{orderDetails?.product || order.order?.product || 'Produto não especificado'}</p>
                        {orderDetails?.description && (
                          <p className="text-sm text-blue-600 mt-1">{orderDetails.description}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Cliente</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{orderDetails?.clientDetails?.name || order.clientName || order.order?.clientName || 'N/A'}</p>
                              {orderDetails?.clientDetails?.phone && (
                                <p className="text-xs text-gray-500">{orderDetails.clientDetails.phone}</p>
                              )}
                            </div>
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

                      {orderDetails?.shippingAddress && (
                        <div className="mb-4">
                          <Label className="text-sm font-medium text-gray-500">Endereço de Envio</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <p className="text-sm">{orderDetails.shippingAddress}</p>
                          </div>
                        </div>
                      )}

                      {/* Items específicos para este produtor */}
                      {orderDetails?.items && orderDetails.items.length > 0 && (
                        <div className="mb-4">
                          <Label className="text-sm font-medium text-gray-500">Seus Itens para Produzir</Label>
                          <div className="mt-2 space-y-2">
                            {orderDetails.items.map((item: any, index: number) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h5 className="font-medium">{item.productName}</h5>
                                    <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                                    {item.itemCustomizationDescription && (
                                      <p className="text-sm text-blue-600">Personalização: {item.itemCustomizationDescription}</p>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-green-600">
                                    R$ {parseFloat(item.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fotos do orçamento/pedido */}
                      {orderDetails?.photos && orderDetails.photos.length > 0 && (
                        <div className="mb-4">
                          <Label className="text-sm font-medium text-gray-500">Fotos de Referência</Label>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                            {orderDetails.photos.map((photoUrl: string, index: number) => (
                              <div key={index} className="relative group">
                                <img
                                  src={photoUrl}
                                  alt={`Foto ${index + 1}`}
                                  className="w-full h-20 object-cover rounded border hover:opacity-75 transition-opacity cursor-pointer"
                                  onClick={() => window.open(photoUrl, '_blank')}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded flex items-center justify-center">
                                  <span className="text-white text-xs opacity-0 group-hover:opacity-100">Clique para ampliar</span>
                                </div>
                              </div>
                            ))}
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
                );
              })}
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
              Defina o valor que você cobrará por este serviço
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Order Information - Sem valor do pedido */}
            {selectedOrder && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Informações do Pedido</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Produto:</span>
                    <p className="font-medium">{selectedOrder.order?.product || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Cliente:</span>
                    <p className="font-medium">{selectedOrder.clientName || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Prazo:</span>
                    <p className="font-medium">
                      {selectedOrder.deadline ?
                        new Date(selectedOrder.deadline).toLocaleDateString('pt-BR') :
                        'Não definido'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="producer-value">Seu Valor de Serviço (R$)</Label>
              <Input
                id="producer-value"
                type="number"
                step="0.01"
                placeholder="Ex: 850.00"
                value={producerValue}
                onChange={(e) => setProducerValue(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="producer-notes">Observações (Opcional)</Label>
              <Textarea
                id="producer-notes"
                placeholder="Descreva o que está incluído no valor, materiais, prazo, etc."
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
              className="bg-green-600 hover:bg-green-700"
            >
              Definir Valor
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
                  <Label className="text-sm text-gray-600">Prazo</Label>
                  <p className="font-medium">
                    {selectedOrder?.deadline ?
                      new Date(selectedOrder.deadline).toLocaleDateString('pt-BR') :
                      'Não definido'}
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


    </div>
  );
}