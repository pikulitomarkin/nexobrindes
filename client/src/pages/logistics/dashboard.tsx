import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Package, Send, Eye, Search, Truck, Clock, CheckCircle, AlertTriangle, ShoppingCart, DollarSign, Factory } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function LogisticsDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSendToProductionModal, setShowSendToProductionModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<string>("");
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
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

  // Buscar pedidos em produção para acompanhamento
  const { data: productionOrders, isLoading: isLoadingProductionOrders } = useQuery({
    queryKey: ["/api/logistics/production-orders"],
    queryFn: async () => {
      const response = await fetch("/api/logistics/production-orders");
      if (!response.ok) throw new Error('Failed to fetch production orders');
      return response.json();
    },
  });

  // Buscar produtores
  const { data: producers } = useQuery({
    queryKey: ["/api/producers"],
    queryFn: async () => {
      const response = await fetch('/api/producers');
      if (!response.ok) throw new Error('Failed to fetch producers');
      return response.json();
    },
  });

  // Enviar pedido para produção
  const sendToProductionMutation = useMutation({
    mutationFn: async ({ orderId, producerId }: { orderId: string; producerId: string }) => {
      const response = await fetch(`/api/orders/${orderId}/send-to-production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ producerId }),
      });
      if (!response.ok) throw new Error("Erro ao enviar para produção");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/paid-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/production-orders"] });
      setShowSendToProductionModal(false);
      setSelectedOrder(null);
      setSelectedProducer("");
      toast({
        title: "Sucesso!",
        description: "Pedido enviado para produção",
      });
    },
  });

  // Finalizar envio (marcar como despachado)
  const dispatchOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/logistics/dispatch-order/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
    if (selectedOrder && selectedProducer) {
      sendToProductionMutation.mutate({ orderId: selectedOrder.id, producerId: selectedProducer });
    }
  };

  const handleDispatchOrder = (orderId: string) => {
    dispatchOrderMutation.mutate(orderId);
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel de Logística</h1>
        <p className="text-gray-600">Gerencie pedidos pagos, envios para produção e despachos</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
      </div>

      {/* Search and Filters */}
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
          </div>
        </CardContent>
      </Card>

      {/* Pedidos Pagos - Aguardando Envio para Produção */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
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
                        <div className="text-sm font-medium text-green-600">
                          R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleSendToProduction(order)}
                            disabled={sendToProductionMutation.isPending}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Enviar para Produção
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

      {/* Pedidos em Produção */}
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
                            onClick={() => handleDispatchOrder(order.id)}
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

      {/* Modal - Enviar para Produção */}
      <Dialog open={showSendToProductionModal} onOpenChange={setShowSendToProductionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para Produção</DialogTitle>
            <DialogDescription>
              Selecione o produtor que receberá este pedido para produção.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="producer-select">Produtor Responsável</Label>
              <Select value={selectedProducer} onValueChange={setSelectedProducer}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produtor" />
                </SelectTrigger>
                <SelectContent>
                  {producers?.map((producer: any) => (
                    <SelectItem key={producer.id} value={producer.id}>
                      {producer.name} - {producer.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowSendToProductionModal(false);
                setSelectedOrder(null);
                setSelectedProducer("");
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmSendToProduction}
              disabled={sendToProductionMutation.isPending || !selectedProducer}
              className="flex-1"
            >
              {sendToProductionMutation.isPending ? 'Enviando...' : 'Enviar para Produção'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal - Detalhes do Pedido */}
      <Dialog open={showOrderDetailsModal} onOpenChange={setShowOrderDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
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
                      <label className="text-sm font-medium text-gray-500">Produto</label>
                      <p>{selectedOrder.product}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Descrição</label>
                      <p className="text-gray-700">{selectedOrder.description}</p>
                    </div>
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
                      <label className="text-sm font-medium text-gray-500">Valor Total</label>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {parseFloat(selectedOrder.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                      <p>{new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}