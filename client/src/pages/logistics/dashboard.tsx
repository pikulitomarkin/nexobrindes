import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Package, Send, Eye, Search, Truck, Clock, CheckCircle, AlertTriangle, ShoppingCart, DollarSign, Factory } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "react-router-dom"; // Import useLocation

export default function LogisticsDashboard() {
  const location = window.location.pathname; // Get current location
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSendToProductionModal, setShowSendToProductionModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [dispatchTrackingCode, setDispatchTrackingCode] = useState("");
  const { toast } = useToast();

  // Buscar pedidos pagos que precisam ser enviados para produção
  const { data: paidOrders, isLoading: isLoadingPaidOrders } = useQuery({
    queryKey: ["/api/logistics/paid-orders"],
    queryFn: async () => {
      const response = await fetch("/api/logistics/paid-orders");
      if (!response.ok) throw new Error('Failed to fetch paid orders');
      return response.json();
    },
  });

  // Buscar pedidos em produção para acompanhamento (já separados por produtor)
  const { data: productionOrders, isLoading: isLoadingProductionOrders } = useQuery({
    queryKey: ["/api/logistics/production-orders"],
    queryFn: async () => {
      const response = await fetch("/api/production-orders");
      if (!response.ok) throw new Error('Failed to fetch production orders');
      return response.json();
    },
  });



  // Enviar pedido para produtor específico
  const sendToProductionMutation = useMutation({
    mutationFn: async ({ orderId, producerId }: { orderId: string; producerId: string }) => {
      const response = await fetch(`/api/orders/${orderId}/send-to-production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ producerId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao enviar para produção");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/paid-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/production-orders"] });
      setShowSendToProductionModal(false);
      setSelectedOrder(null);
      toast({
        title: "Sucesso!",
        description: `Pedido enviado para produção. ${data.productionOrdersCreated || 1} ordem(ns) de produção criada(s) para: ${data.producerNames?.join(', ') || 'produtor selecionado'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar pedido para produção",
        variant: "destructive",
      });
    },
  });

  // Finalizar envio (marcar como despachado)
  const dispatchOrderMutation = useMutation({
    mutationFn: async ({ productionOrderId, orderId, notes, trackingCode }: {
      productionOrderId: string;
      orderId: string;
      notes: string;
      trackingCode: string;
    }) => {
      const response = await fetch("/api/logistics/dispatch-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionOrderId,
          orderId,
          notes,
          trackingCode
        })
      });
      if (!response.ok) throw new Error("Erro ao despachar pedido");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/production-orders"] });
      toast({
        title: "Sucesso!",
        description: "Pedido despachado para o cliente",
      });
    },
  });

  const handleSendToProduction = (order: any) => {
    setSelectedOrder(order);
    setShowSendToProductionModal(true);
  };

  const confirmSendToProduction = () => {
    if (selectedOrder) {
      sendToProductionMutation.mutate({ orderId: selectedOrder.id });
    }
  };

  const handleDispatchOrder = (order: any) => {
    // order can be either a production order from the production tracking table
    // or a regular order from the paid orders table

    let targetOrder = null;
    let clientName = order.clientName || 'Cliente';

    if (order.orderId) {
      // This is a production order from the tracking table
      targetOrder = order;
      clientName = order.clientName || order.order?.clientName || 'Cliente';
    } else {
      // This is a regular order, find the production order
      const productionOrder = productionOrders?.find((po: any) => po.orderId === order.id);

      if (!productionOrder) {
        toast({
          title: "Erro",
          description: "Ordem de produção não encontrada para este pedido",
          variant: "destructive"
        });
        return;
      }
      targetOrder = order;
    }

    setSelectedOrder(targetOrder);
    setDispatchNotes(`Produto despachado para ${clientName}`);
    setDispatchTrackingCode("");
    setShowDispatchModal(true);
  };

  const confirmDispatch = () => {
    if (!selectedOrder) return;

    // selectedOrder can be either a production order or a regular order
    // If it's a production order, use it directly, otherwise find the production order
    let productionOrder = null;
    let orderId = null;

    if (selectedOrder.orderId) {
      // selectedOrder is a production order
      productionOrder = selectedOrder;
      orderId = selectedOrder.orderId;
    } else {
      // selectedOrder is a regular order, find the production order
      productionOrder = productionOrders?.find((po: any) => po.orderId === selectedOrder.id);
      orderId = selectedOrder.id;
    }

    if (!productionOrder) {
      toast({
        title: "Erro",
        description: "Ordem de produção não encontrada",
        variant: "destructive"
      });
      return;
    }

    dispatchOrderMutation.mutate({
      productionOrderId: productionOrder.id,
      orderId: orderId,
      notes: dispatchNotes,
      trackingCode: dispatchTrackingCode
    });

    setShowDispatchModal(false);
    setDispatchNotes("");
    setDispatchTrackingCode("");
    setSelectedOrder(null);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      paid: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
      confirmed: "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium",
      production: "bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium",
      ready: "bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium animate-pulse",
      shipped: "bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full text-xs font-medium",
      delivered: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
    };

    const statusLabels = {
      paid: "Pago - Aguardando Envio para Produção",
      confirmed: "Confirmado - Pago",
      production: "Em Produção",
      ready: "🚚 PRONTO PARA EXPEDIÇÃO",
      shipped: "Despachado para Cliente",
      delivered: "Entregue ao Cliente",
    };

    return (
      <span className={statusClasses[status as keyof typeof statusClasses] || "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  // Filtrar pedidos pagos
  const filteredPaidOrders = paidOrders?.filter((order: any) => {
    const matchesSearch = searchTerm === "" ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Filtrar pedidos em produção
  const filteredProductionOrders = productionOrders?.filter((order: any) => {
    const matchesSearch = searchTerm === "" ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoadingPaidOrders || isLoadingProductionOrders) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const paidOrdersCount = paidOrders?.length || 0;
  const inProductionCount = productionOrders?.filter((o: any) => o.status === 'production')?.length || 0;
  const readyToShipCount = productionOrders?.filter((o: any) => o.status === 'ready')?.length || 0;

  // Determinar qual seção mostrar baseado na rota
  const getCurrentSection = () => {
    if (location.includes('/logistics/paid-orders')) return 'paid-orders';
    if (location.includes('/logistics/production-tracking')) return 'production-tracking';
    if (location.includes('/logistics/shipments')) return 'shipments';
    if (location.includes('/logistics/paid-orders')) return 'paid-orders'; // Added for clarity, though covered above
    if (location.includes('/logistics/production-tracking')) return 'production-tracking'; // Added for clarity
    if (location.includes('/logistics/shipments')) return 'shipments'; // Added for clarity
    return 'dashboard'; // rota padrão
  };

  const currentSection = getCurrentSection();

  // Função para renderizar o título e descrição baseado na seção
  const getSectionInfo = () => {
    switch (currentSection) {
      case 'paid-orders':
        return {
          title: 'Pedidos Pagos - Aguardando Envio',
          description: 'Pedidos que receberam pagamento e estão prontos para serem enviados à produção'
        };
      case 'production-tracking':
        return {
          title: 'Acompanhamento de Produção',
          description: 'Monitore o status dos pedidos que estão sendo produzidos'
        };
      case 'shipments':
        return {
          title: 'Despachos e Expedição',
          description: 'Gerencie os pedidos prontos para despacho e expedição'
        };
      default:
        return {
          title: 'Painel de Logística',
          description: 'Gerencie pedidos pagos, envios para produção e despachos'
        };
    }
  };

  const sectionInfo = getSectionInfo();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{sectionInfo.title}</h1>
        <p className="text-gray-600">{sectionInfo.description}</p>
      </div>

      {/* Stats Cards - Rendered only for the main dashboard or when relevant */}
      {(currentSection === 'dashboard' || currentSection === 'paid-orders' || currentSection === 'production-tracking' || currentSection === 'shipments') && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {currentSection === 'dashboard' || currentSection === 'paid-orders' ? (
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Pagos - Aguardando Envio</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">{paidOrdersCount}</p>
                    <p className="text-xs text-green-600 mt-1">Para produção</p>
                  </div>
                  <div className="h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {currentSection === 'dashboard' || currentSection === 'production-tracking' ? (
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Em Produção</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">{inProductionCount}</p>
                    <p className="text-xs text-purple-600 mt-1">Sendo produzidos</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-600 rounded-xl flex items-center justify-center">
                    <Factory className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {currentSection === 'dashboard' || currentSection === 'shipments' || currentSection === 'production-tracking' ? (
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Prontos para Expedição</p>
                    <p className="text-3xl font-bold text-orange-900 mt-2">{readyToShipCount}</p>
                    <p className="text-xs text-orange-600 mt-1">Produção finalizada - pronto para despachar</p>
                  </div>
                  <div className="h-12 w-12 bg-orange-600 rounded-xl flex items-center justify-center">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {(currentSection === 'dashboard' || currentSection === 'paid-orders' || currentSection === 'production-tracking' || currentSection === 'shipments') && (
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total em Acompanhamento</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">
                      {(paidOrders?.length || 0) + (productionOrders?.length || 0)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">Pedidos ativos</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Search and Filters - Rendered only when relevant */}
      {(currentSection === 'dashboard' || currentSection === 'production-tracking' || currentSection === 'shipments') && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por número, cliente ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {(currentSection === 'dashboard' || currentSection === 'production-tracking' || currentSection === 'shipments') && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="production">Em Produção</SelectItem>
                    <SelectItem value="ready">Pronto para Despacho</SelectItem>
                    <SelectItem value="shipped">Despachado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pedidos Pagos - Aguardando Envio para Produção */}
      {(currentSection === 'dashboard' || currentSection === 'paid-orders') && (
        <Card className="mb-6">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-800 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pedidos Pagos - Aguardando Envio para Produção ({paidOrdersCount})
            </CardTitle>
            <p className="text-sm text-green-700 mt-2">
              Pedidos que receberam pagamento e estão prontos para serem enviados à produção
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Entrega</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Pagamento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPaidOrders?.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{order.orderNumber}</div>
                        <div className="text-sm text-gray-500">#{order.id.slice(-6)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.clientName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{order.product}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.deliveryType === 'pickup' ? 'Retirada' : 'Entrega'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.lastPaymentDate ? new Date(order.lastPaymentDate).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetailsModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <div className="flex gap-2">
                            {/* Identificar produtores do pedido */}
                            {(() => {
                              const producers = new Set<string>();
                              if (order.items && Array.isArray(order.items)) {
                                order.items.forEach((item: any) => {
                                  if (item.producerId && item.producerId !== 'internal') {
                                    producers.add(item.producerId);
                                  }
                                });
                              }
                              
                              if (producers.size === 0) {
                                return (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled
                                  >
                                    Sem produtores externos
                                  </Button>
                                );
                              }

                              return Array.from(producers).map((producerId) => (
                                <Button
                                  key={producerId}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => sendToProductionMutation.mutate({ orderId: order.id, producerId })}
                                  disabled={sendToProductionMutation.isPending}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Enviar para {producerId === 'producer-1' ? 'Marcenaria' : 'Produtor'}
                                </Button>
                              ));
                            })()}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pedidos em Produção */}
      {(currentSection === 'dashboard' || currentSection === 'production-tracking') && (
        <Card>
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-purple-800 flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Pedidos em Produção - Acompanhamento ({productionOrders?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produtor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProductionOrders?.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{order.orderNumber}</div>
                        <div className="text-sm text-gray-500">#{order.id.slice(-6)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.clientName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.producerName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetailsModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          {order.status === 'ready' && (
                            <Button
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                              onClick={() => handleDispatchOrder(order)}
                              disabled={dispatchOrderMutation.isPending}
                              title="Produto está pronto - clique para despachar ao cliente"
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              {dispatchOrderMutation.isPending ? 'Despachando...' : 'Despachar para Cliente'}
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
      )}

      {/* Pedidos em Expedição */}
      {(currentSection === 'dashboard' || currentSection === 'shipments') && (
        <Card>
          <CardHeader className="bg-cyan-50">
            <CardTitle className="text-cyan-800 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Pedidos Despachados ({productionOrders?.filter(o => o.status === 'shipped').length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código Rastreio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Despacho</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productionOrders?.filter((o: any) => o.status === 'shipped').map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{order.orderNumber}</div>
                        <div className="text-sm text-gray-500">#{order.id.slice(-6)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.clientName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.trackingCode || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.dispatchDate ? new Date(order.dispatchDate).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetailsModal(true);
                          }}>
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
          </CardContent>
        </Card>
      )}


      {/* Modal - Enviar para Produção */}
      <Dialog open={showSendToProductionModal} onOpenChange={setShowSendToProductionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Envio para Produção</DialogTitle>
            <DialogDescription>
              Este pedido será enviado automaticamente para todos os produtores responsáveis pelos itens do pedido.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Informações do Pedido</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700">Pedido:</span>
                    <p className="font-medium">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Cliente:</span>
                    <p className="font-medium">{selectedOrder.clientName}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Valor:</span>
                    <p className="font-medium text-green-600">
                      R$ {parseFloat(selectedOrder.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700">Produto:</span>
                    <p className="font-medium">{selectedOrder.product}</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>✓ Processamento Automático:</strong> O sistema criará ordens de produção separadas para cada produtor envolvido nos itens deste pedido.
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowSendToProductionModal(false);
                setSelectedOrder(null);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmSendToProduction}
              disabled={sendToProductionMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {sendToProductionMutation.isPending ? 'Processando...' : 'Confirmar Envio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal - Detalhes do Pedido */}
      <Dialog open={showOrderDetailsModal} onOpenChange={setShowOrderDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              Informações completas do pedido e itens para produção
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Informações do Pedido</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Número do Pedido</label>
                      <p className="text-lg font-bold">{selectedOrder.orderNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cliente</label>
                      <p>{selectedOrder.clientName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contato</label>
                      <p className="text-sm text-gray-600">
                        {selectedOrder.contactPhone && (
                          <span>Tel: {selectedOrder.contactPhone}<br /></span>
                        )}
                        {selectedOrder.contactEmail && (
                          <span>Email: {selectedOrder.contactEmail}</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Produto Principal</label>
                      <p className="font-medium">{selectedOrder.product}</p>
                    </div>
                    {selectedOrder.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Descrição</label>
                        <p className="text-gray-700 bg-gray-50 p-2 rounded">{selectedOrder.description}</p>
                      </div>
                    )}
                    {selectedOrder.deadline && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Prazo</label>
                        <p>{new Date(selectedOrder.deadline).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Status e Valores</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status Atual</label>
                      <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tipo de Entrega</label>
                      <p className="font-medium">{selectedOrder.deliveryType === 'pickup' ? 'Retirada no Local' : 'Entrega em Casa'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contato do Cliente</label>
                      <p className="font-medium">{selectedOrder.contactPhone || 'Não informado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                      <p>{new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    {selectedOrder.deliveryType === 'delivery' && (
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-500">Endereço de Entrega</label>
                        <p className="text-gray-700 bg-gray-50 p-2 rounded">{selectedOrder.shippingAddress || 'Endereço não informado'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Itens do Pedido */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Itens para Produção ({selectedOrder.items.length})</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item: any, index: number) => {
                      const isExternal = item.producerId && item.producerId !== 'internal';
                      return (
                        <div key={index} className={`p-4 rounded-lg border ${isExternal ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{item.productName}</span>
                                {isExternal && (
                                  <Badge variant="outline" className="text-orange-700 border-orange-300">
                                    Produção Externa
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Quantidade:</span>
                                  <p className="font-medium">{item.quantity}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Valor Unit.:</span>
                                  <p className="font-medium">R$ {parseFloat(item.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                {item.hasItemCustomization && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">Personalização:</span>
                                    <p className="font-medium text-blue-600">{item.itemCustomizationDescription}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                R$ {parseFloat(item.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fotos anexadas */}
              {selectedOrder.budgetPhotos && selectedOrder.budgetPhotos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Fotos de Referência ({selectedOrder.budgetPhotos.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedOrder.budgetPhotos.map((photoUrl: string, index: number) => (
                      <div key={index} className="relative group">
                        <img 
                          src={photoUrl} 
                          alt={`Referência ${index + 1}`}
                          className="w-full h-24 object-cover rounded border hover:opacity-75 transition-opacity cursor-pointer"
                          onClick={() => window.open(photoUrl, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded flex items-center justify-center">
                          <span className="text-white text-xs opacity-0 group-hover:opacity-100">Ampliar</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal - Despachar Pedido */}
      <Dialog open={showDispatchModal} onOpenChange={setShowDispatchModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Despachar Pedido</DialogTitle>
            <DialogDescription>
              Finalize o despacho do pedido para o cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dispatch-notes">Observações do Despacho</Label>
              <Textarea
                id="dispatch-notes"
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Observações sobre o despacho..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="tracking-code">Código de Rastreamento (Opcional)</Label>
              <Input
                id="tracking-code"
                value={dispatchTrackingCode}
                onChange={(e) => setDispatchTrackingCode(e.target.value)}
                placeholder="Ex: BR123456789..."
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDispatchModal(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDispatch}
              disabled={dispatchOrderMutation.isPending || !dispatchNotes.trim()}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {dispatchOrderMutation.isPending ? 'Despachando...' : 'Confirmar Despacho'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}