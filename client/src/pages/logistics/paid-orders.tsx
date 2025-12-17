import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Package, ShoppingCart, Store, Eye, Search, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function LogisticsPaidOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const { toast } = useToast();

  // Fetch dropshipping orders
  const { data: dropshippingOrders, isLoading } = useQuery({
    queryKey: ["/api/logistics/dropshipping-orders"],
    queryFn: async () => {
      const response = await fetch("/api/logistics/dropshipping-orders");
      if (!response.ok) throw new Error('Failed to fetch dropshipping orders');
      return response.json();
    },
  });

  // Mutation for updating product status
  const updateProductStatusMutation = useMutation({
    mutationFn: async ({ orderId, productStatus }: { orderId: string; productStatus: string }) => {
      const response = await fetch(`/api/orders/${orderId}/product-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productStatus }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar status');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/dropshipping-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/paid-orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (!dropshippingOrders) return [];
    
    return dropshippingOrders.filter((order: any) => {
      // Status filter
      if (statusFilter !== "all" && order.productStatus !== statusFilter) return false;
      
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          order.orderNumber?.toLowerCase().includes(search) ||
          order.clientName?.toLowerCase().includes(search) ||
          (order.items || []).some((item: any) => 
            item.productName?.toLowerCase().includes(search)
          );
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [dropshippingOrders, statusFilter, searchTerm]);

  // Count orders by status
  const statusCounts = useMemo(() => {
    if (!dropshippingOrders) return { to_buy: 0, purchased: 0, in_store: 0 };
    
    return {
      to_buy: dropshippingOrders.filter((o: any) => o.productStatus === 'to_buy').length,
      purchased: dropshippingOrders.filter((o: any) => o.productStatus === 'purchased').length,
      in_store: dropshippingOrders.filter((o: any) => o.productStatus === 'in_store').length,
    };
  }, [dropshippingOrders]);

  const getProductStatusLabel = (status: string) => {
    switch (status) {
      case 'to_buy': return 'Comprar Produto';
      case 'purchased': return 'Produto Comprado';
      case 'in_store': return 'Produto na Loja';
      default: return status;
    }
  };

  const getProductStatusBadge = (status: string) => {
    switch (status) {
      case 'to_buy':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><ShoppingCart className="h-3 w-3 mr-1" /> Comprar Produto</Badge>;
      case 'purchased':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Package className="h-3 w-3 mr-1" /> Produto Comprado</Badge>;
      case 'in_store':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><Store className="h-3 w-3 mr-1" /> Produto na Loja</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleUpdateStatus = (orderId: string, newStatus: string) => {
    updateProductStatusMutation.mutate({ orderId, productStatus: newStatus });
  };

  // Calculate deadline status
  const getDeadlineInfo = (order: any) => {
    if (!order.deliveryDeadline && !order.deadline) return null;
    
    const deadlineDate = new Date(order.deliveryDeadline || order.deadline);
    const today = new Date();
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Atrasado ${Math.abs(diffDays)} dias`, color: 'text-red-600 bg-red-50', icon: AlertTriangle };
    } else if (diffDays <= 3) {
      return { text: `Prazo: ${diffDays} dias`, color: 'text-orange-600 bg-orange-50', icon: Clock };
    } else {
      return { text: `Prazo: ${deadlineDate.toLocaleDateString('pt-BR')}`, color: 'text-gray-600 bg-gray-50', icon: Clock };
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pedidos Pagos - Aguardando Envio</h1>
        <p className="text-gray-500 mt-2">Pedidos que receberam pagamento e estão prontos para serem enviados à produção</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'to_buy' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'to_buy' ? 'all' : 'to_buy')}
          data-testid="card-status-to-buy"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pagos - Aguardando Envio</p>
                <p className="text-3xl font-bold text-red-600">{statusCounts.to_buy}</p>
                <p className="text-xs text-gray-400">Pedidos a comprar</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <ShoppingCart className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'purchased' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'purchased' ? 'all' : 'purchased')}
          data-testid="card-status-purchased"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Linhas produção</p>
                <p className="text-3xl font-bold text-yellow-600">{statusCounts.purchased}</p>
                <p className="text-xs text-gray-400">Aguardando chegada</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'in_store' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'in_store' ? 'all' : 'in_store')}
          data-testid="card-status-in-store"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total em Acompanhamento</p>
                <p className="text-3xl font-bold text-green-600">{statusCounts.in_store}</p>
                <p className="text-xs text-gray-400">Prontos para envio</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Store className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por número, cliente, produto ou produtor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        {statusFilter !== 'all' && (
          <Button variant="outline" onClick={() => setStatusFilter('all')} data-testid="button-clear-filter">
            Limpar Filtro
          </Button>
        )}
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Pedidos Pagos - Aguardando Envio para Produção ({filteredOrders.length})
          </CardTitle>
          <p className="text-sm text-gray-500">
            Pedidos que receberam pagamento e estão prontos para serem enviados à produção
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum pedido encontrado
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium">PEDIDO</th>
                      <th className="text-left p-3 font-medium">CLIENTE</th>
                      <th className="text-left p-3 font-medium">PRODUTO</th>
                      <th className="text-left p-3 font-medium">PRIORIDADE</th>
                      <th className="text-left p-3 font-medium">TIPO</th>
                      <th className="text-left p-3 font-medium">DATA PAGAMENTO</th>
                      <th className="text-left p-3 font-medium">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order: any) => {
                      const deadlineInfo = getDeadlineInfo(order);
                      const mainProduct = order.items?.[0];
                      
                      return (
                        <tr key={order.id} className="border-b hover:bg-gray-50" data-testid={`row-order-${order.id}`}>
                          <td className="p-3">
                            <div className="font-medium">{order.orderNumber}</div>
                            <div className="text-xs text-gray-500">#{order.id?.slice(-6)}</div>
                          </td>
                          <td className="p-3">
                            <div>{order.clientName || 'Cliente'}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-sm">{mainProduct?.productName || order.product}</div>
                            {order.items?.length > 1 && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Pedido Multi-Produtor
                              </Badge>
                            )}
                            {mainProduct?.producerName && (
                              <div className="text-xs text-purple-600 mt-1">
                                🎯 {mainProduct.producerName}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {getProductStatusBadge(order.productStatus)}
                            {deadlineInfo && (
                              <div className={`flex items-center gap-1 text-xs mt-1 px-2 py-1 rounded ${deadlineInfo.color}`}>
                                <deadlineInfo.icon className="h-3 w-3" />
                                {deadlineInfo.text}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">
                              {order.deliveryType === 'pickup' ? 'Retirada' : 'Entrega'}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowOrderDetailsModal(true);
                                }}
                                data-testid={`button-view-order-${order.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" /> Ver Produtor
                              </Button>
                              
                              {/* Status progression buttons */}
                              {order.productStatus === 'to_buy' && (
                                <Button
                                  size="sm"
                                  className="bg-yellow-600 hover:bg-yellow-700"
                                  onClick={() => handleUpdateStatus(order.id, 'purchased')}
                                  disabled={updateProductStatusMutation.isPending}
                                  data-testid={`button-mark-purchased-${order.id}`}
                                >
                                  <Package className="h-4 w-4 mr-1" /> Marcar Comprado
                                </Button>
                              )}
                              {order.productStatus === 'purchased' && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleUpdateStatus(order.id, 'in_store')}
                                  disabled={updateProductStatusMutation.isPending}
                                  data-testid={`button-mark-in-store-${order.id}`}
                                >
                                  <Store className="h-4 w-4 mr-1" /> Na Loja
                                </Button>
                              )}
                              {order.productStatus === 'in_store' && (
                                <Badge className="bg-green-100 text-green-800 justify-center">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Pronto p/ Envio
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={showOrderDetailsModal} onOpenChange={setShowOrderDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              {selectedOrder?.orderNumber} - {selectedOrder?.clientName}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status do Produto</p>
                  {getProductStatusBadge(selectedOrder.productStatus)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="font-bold text-lg">
                    R$ {parseFloat(selectedOrder.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Itens do Pedido</p>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-500">Qtd: {Math.round(parseFloat(item.quantity || 0))}</p>
                          {item.producerName && (
                            <p className="text-sm text-purple-600">Produtor: {item.producerName}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {selectedOrder.productStatus === 'to_buy' && (
                  <Button
                    className="bg-yellow-600 hover:bg-yellow-700 flex-1"
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, 'purchased');
                      setShowOrderDetailsModal(false);
                    }}
                    disabled={updateProductStatusMutation.isPending}
                  >
                    <Package className="h-4 w-4 mr-2" /> Marcar como Comprado
                  </Button>
                )}
                {selectedOrder.productStatus === 'purchased' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 flex-1"
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, 'in_store');
                      setShowOrderDetailsModal(false);
                    }}
                    disabled={updateProductStatusMutation.isPending}
                  >
                    <Store className="h-4 w-4 mr-2" /> Marcar na Loja
                  </Button>
                )}
                {selectedOrder.productStatus === 'in_store' && (
                  <div className="flex-1 text-center py-2 bg-green-100 text-green-800 rounded-lg">
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Pronto para enviar à produção
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
