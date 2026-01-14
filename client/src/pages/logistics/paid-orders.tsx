import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Package, ShoppingCart, Store, Eye, Search, Clock, AlertTriangle, CheckCircle, User, Phone, Ruler } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface DropshippingItem {
  itemId: string;
  orderId: string;
  orderNumber: string;
  budgetId: string;
  clientName: string;
  clientPhone: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  producerId: string;
  producerName: string;
  purchaseStatus: string;
  deliveryDeadline: string;
  orderCreatedAt: string;
  orderStatus: string;
  hasCustomization: boolean;
  customizationDescription: string | null;
  notes: string | null;
  productWidth: string | null;
  productHeight: string | null;
  productDepth: string | null;
}

export default function LogisticsPaidOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DropshippingItem | null>(null);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [showReadyForProductionModal, setShowReadyForProductionModal] = useState(false);
  const [readyOrderNumber, setReadyOrderNumber] = useState("");
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery<DropshippingItem[]>({
    queryKey: ["/api/logistics/dropshipping-items", statusFilter],
    queryFn: async ({ queryKey }) => {
      const filter = queryKey[1];
      const url = filter !== "all" 
        ? `/api/logistics/dropshipping-items?status=${filter}`
        : "/api/logistics/dropshipping-items";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch dropshipping items");
      return response.json();
    }
  });

  const handleUpdateStatus = async (itemId: string, newStatus: string) => {
    if (loadingItemId) return;
    
    setLoadingItemId(itemId);
    try {
      const response = await fetch(`/api/budget-items/${itemId}/purchase-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseStatus: newStatus }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar status');
      }
      
      const data = await response.json();
      
      // Check if all items are now in_store - show modal
      if (data.allItemsReady) {
        setReadyOrderNumber(data.orderNumber || '');
        setShowReadyForProductionModal(true);
      } else {
        toast({
          title: "Sucesso!",
          description: data.message,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/dropshipping-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/dropshipping-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/paid-orders"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingItemId(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    return items.filter((item: DropshippingItem) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          item.orderNumber?.toLowerCase().includes(search) ||
          item.clientName?.toLowerCase().includes(search) ||
          item.productName?.toLowerCase().includes(search) ||
          item.producerName?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [items, searchTerm]);

  const statusCounts = useMemo(() => {
    if (!items) return { pending: 0, to_buy: 0, purchased: 0, in_store: 0 };
    
    return {
      pending: items.filter((i: DropshippingItem) => i.purchaseStatus === 'pending').length,
      to_buy: items.filter((i: DropshippingItem) => i.purchaseStatus === 'to_buy').length,
      purchased: items.filter((i: DropshippingItem) => i.purchaseStatus === 'purchased').length,
      in_store: items.filter((i: DropshippingItem) => i.purchaseStatus === 'in_store').length,
    };
  }, [items]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'to_buy':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><ShoppingCart className="h-3 w-3 mr-1" /> Comprar</Badge>;
      case 'purchased':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Package className="h-3 w-3 mr-1" /> Comprado</Badge>;
      case 'in_store':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><Store className="h-3 w-3 mr-1" /> Na Loja</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDeadlineInfo = (item: DropshippingItem) => {
    if (!item.deliveryDeadline) return null;
    
    const deadlineDate = new Date(item.deliveryDeadline);
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

  const groupedByOrder = useMemo(() => {
    const groups = new Map<string, DropshippingItem[]>();
    filteredItems.forEach(item => {
      const existing = groups.get(item.orderId) || [];
      existing.push(item);
      groups.set(item.orderId, existing);
    });
    return groups;
  }, [filteredItems]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Aguardando Compra - Produtos</h1>
        <p className="text-gray-500 mt-2">Controle individual de cada produto dos pedidos pagos</p>
      </div>

        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-gray-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          data-testid="card-status-pending"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Aguardando</p>
                <p className="text-3xl font-bold text-gray-600">{statusCounts.pending}</p>
                <p className="text-xs text-gray-400">Pendente</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'to_buy' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'to_buy' ? 'all' : 'to_buy')}
          data-testid="card-status-to-buy"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Para comprar</p>
                <p className="text-3xl font-bold text-red-600">{statusCounts.to_buy}</p>
                <p className="text-xs text-gray-400">Produtos a comprar</p>
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
                <p className="text-sm text-gray-500">Comprado</p>
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
                <p className="text-sm text-gray-500">Na loja</p>
                <p className="text-3xl font-bold text-green-600">{statusCounts.in_store}</p>
                <p className="text-xs text-gray-400">Prontos para envio</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Store className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por pedido, cliente, produto ou produtor..."
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos Individuais ({filteredItems.length})
          </CardTitle>
          <p className="text-sm text-gray-500">
            Controle o status de cada produto separadamente. Quando todos os produtos de um pedido estiverem "Na Loja", o pedido vai para "Aguardando Envio para Produção".
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum produto encontrado
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(groupedByOrder.entries()).map(([orderId, orderItems]) => {
                const firstItem = orderItems[0];
                const allItemsInStore = orderItems.every(i => i.purchaseStatus === 'in_store');
                
                return (
                  <div key={orderId} className="border rounded-lg overflow-hidden">
                    <div className={`p-4 ${allItemsInStore ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="font-bold text-lg">{firstItem.orderNumber}</span>
                            <span className="text-gray-500 ml-2">({orderItems.length} produto{orderItems.length > 1 ? 's' : ''})</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            {firstItem.clientName}
                          </div>
                          {firstItem.clientPhone && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Phone className="h-3 w-3" />
                              {firstItem.clientPhone}
                            </div>
                          )}
                        </div>
                        {allItemsInStore && (
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" /> Pronto para Envio
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="divide-y">
                      {orderItems.map((item) => {
                        const deadlineInfo = getDeadlineInfo(item);
                        
                        return (
                          <div 
                            key={item.itemId} 
                            className="p-4 hover:bg-gray-50 flex justify-between items-center"
                            data-testid={`row-item-${item.itemId}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-medium">{item.productName}</p>
                                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                    <span>Qtd: {Math.round(parseFloat(item.quantity?.toString() || '0'))}</span>
                                    <span className="text-purple-600">Produtor: {item.producerName}</span>
                                    {(item.productWidth || item.productHeight) && (
                                      <span className="flex items-center gap-1">
                                        <Ruler className="h-3 w-3" />
                                        {item.productWidth && `L:${item.productWidth}cm`}
                                        {item.productHeight && ` A:${item.productHeight}cm`}
                                        {item.productDepth && ` P:${item.productDepth}cm`}
                                      </span>
                                    )}
                                  </div>
                                  {item.hasCustomization && item.customizationDescription && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      Personalização: {item.customizationDescription}
                                    </p>
                                  )}
                                  {item.notes && (
                                    <p className="text-xs text-gray-500 mt-1">Obs: {item.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {deadlineInfo && (
                                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${deadlineInfo.color}`}>
                                  <deadlineInfo.icon className="h-3 w-3" />
                                  {deadlineInfo.text}
                                </div>
                              )}
                              
                              {getStatusBadge(item.purchaseStatus)}
                              
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowItemDetailsModal(true);
                                  }}
                                  data-testid={`button-view-item-${item.itemId}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                
                                {item.purchaseStatus === 'pending' && (
                                  <Button
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleUpdateStatus(item.itemId, 'to_buy')}
                                    disabled={loadingItemId === item.itemId}
                                    data-testid={`button-mark-to-buy-${item.itemId}`}
                                  >
                                    {loadingItemId === item.itemId ? '...' : <><ShoppingCart className="h-4 w-4 mr-1" /> A Comprar</>}
                                  </Button>
                                )}
                                
                                {item.purchaseStatus === 'to_buy' && (
                                  <Button
                                    size="sm"
                                    className="bg-yellow-600 hover:bg-yellow-700"
                                    onClick={() => handleUpdateStatus(item.itemId, 'purchased')}
                                    disabled={loadingItemId === item.itemId}
                                    data-testid={`button-mark-purchased-${item.itemId}`}
                                  >
                                    {loadingItemId === item.itemId ? '...' : <><Package className="h-4 w-4 mr-1" /> Comprado</>}
                                  </Button>
                                )}
                                
                                {item.purchaseStatus === 'purchased' && (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleUpdateStatus(item.itemId, 'in_store')}
                                    disabled={loadingItemId === item.itemId}
                                    data-testid={`button-mark-in-store-${item.itemId}`}
                                  >
                                    {loadingItemId === item.itemId ? '...' : <><Store className="h-4 w-4 mr-1" /> Na Loja</>}
                                  </Button>
                                )}
                                
                                {item.purchaseStatus === 'in_store' && (
                                  <Badge className="bg-green-100 text-green-800 py-2">
                                    <CheckCircle className="h-3 w-3 mr-1" /> Na Loja
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showItemDetailsModal} onOpenChange={setShowItemDetailsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Produto</DialogTitle>
            <DialogDescription>
              {selectedItem?.orderNumber} - {selectedItem?.productName}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Pedido</p>
                  <p className="font-medium">{selectedItem.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{selectedItem.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Produto</p>
                  <p className="font-medium">{selectedItem.productName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Quantidade</p>
                  <p className="font-medium">{Math.round(parseFloat(selectedItem.quantity?.toString() || '0'))}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Produtor</p>
                  <p className="font-medium text-purple-600">{selectedItem.producerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedItem.purchaseStatus)}
                </div>
              </div>

              {(selectedItem.productWidth || selectedItem.productHeight || selectedItem.productDepth) && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Dimensões</p>
                  <div className="flex gap-3 text-sm">
                    {selectedItem.productWidth && <span>Largura: {selectedItem.productWidth}cm</span>}
                    {selectedItem.productHeight && <span>Altura: {selectedItem.productHeight}cm</span>}
                    {selectedItem.productDepth && <span>Profundidade: {selectedItem.productDepth}cm</span>}
                  </div>
                </div>
              )}

              {selectedItem.hasCustomization && selectedItem.customizationDescription && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Personalização</p>
                  <p className="text-sm">{selectedItem.customizationDescription}</p>
                </div>
              )}

              {selectedItem.notes && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-700 font-medium">Observações</p>
                  <p className="text-sm">{selectedItem.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {selectedItem.purchaseStatus === 'pending' && (
                  <Button
                    className="bg-red-600 hover:bg-red-700 flex-1"
                    onClick={() => {
                      handleUpdateStatus(selectedItem.itemId, 'to_buy');
                      setShowItemDetailsModal(false);
                    }}
                    disabled={loadingItemId === selectedItem.itemId}
                  >
                    {loadingItemId === selectedItem.itemId ? '...' : <><ShoppingCart className="h-4 w-4 mr-2" /> Marcar "A Comprar"</>}
                  </Button>
                )}
                {selectedItem.purchaseStatus === 'to_buy' && (
                  <Button
                    className="bg-yellow-600 hover:bg-yellow-700 flex-1"
                    onClick={() => {
                      handleUpdateStatus(selectedItem.itemId, 'purchased');
                      setShowItemDetailsModal(false);
                    }}
                    disabled={loadingItemId === selectedItem.itemId}
                  >
                    {loadingItemId === selectedItem.itemId ? '...' : <><Package className="h-4 w-4 mr-2" /> Marcar como Comprado</>}
                  </Button>
                )}
                {selectedItem.purchaseStatus === 'purchased' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 flex-1"
                    onClick={() => {
                      handleUpdateStatus(selectedItem.itemId, 'in_store');
                      setShowItemDetailsModal(false);
                    }}
                    disabled={loadingItemId === selectedItem.itemId}
                  >
                    {loadingItemId === selectedItem.itemId ? '...' : <><Store className="h-4 w-4 mr-2" /> Marcar na Loja</>}
                  </Button>
                )}
                {selectedItem.purchaseStatus === 'in_store' && (
                  <div className="flex-1 text-center py-2 bg-green-100 text-green-800 rounded-lg">
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Produto na loja - pronto para envio
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal when all items are ready for production */}
      <Dialog open={showReadyForProductionModal} onOpenChange={setShowReadyForProductionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Pedido Pronto!
            </DialogTitle>
            <DialogDescription className="pt-4">
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-lg font-medium text-green-800">
                    Todos os produtos do pedido <span className="font-bold">{readyOrderNumber}</span> estão na loja!
                  </p>
                </div>
                <p className="text-gray-600">
                  Este pedido está sendo encaminhado para a <strong>fila de envio para produção</strong>.
                </p>
                <p className="text-sm text-gray-500">
                  Você pode encontrá-lo no Dashboard principal da Logística.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button 
              className="bg-green-600 hover:bg-green-700 px-8"
              onClick={() => setShowReadyForProductionModal(false)}
            >
              OK, Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
