import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ShoppingCart, Store, Eye, Search, Clock, AlertTriangle, CheckCircle, User, Phone, Ruler, Filter } from "lucide-react";
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
  productCode: string | null;
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
      
      toast({
        title: "Sucesso!",
        description: data.message,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/dropshipping-items"] });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'to_buy':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><ShoppingCart className="h-3 w-3 mr-1" /> Para comprar</Badge>;
      case 'purchased':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Package className="h-3 w-3 mr-1" /> Comprado</Badge>;
      case 'in_store':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><Store className="h-3 w-3 mr-1" /> Na loja</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800 border-red-300"><ShoppingCart className="h-3 w-3 mr-1" /> Para comprar</Badge>;
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Logística Dropshipping</h1>
          <p className="text-gray-500 mt-2">Gerenciamento de compra e recebimento de produtos</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm w-full sm:w-auto">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] border-none focus:ring-0 shadow-none">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="to_buy">Para comprar</SelectItem>
                <SelectItem value="purchased">Comprado</SelectItem>
                <SelectItem value="in_store">Na loja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar pedido, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b bg-gray-50/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-400" />
            Produtos Encontrados ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-3 opacity-20" />
              Carregando produtos...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-20" />
              Nenhum produto encontrado para o filtro selecionado
            </div>
          ) : (
            <div className="divide-y">
              {Array.from(groupedByOrder.entries()).map(([orderId, orderItems]) => {
                const firstItem = orderItems[0];
                const allItemsInStore = orderItems.every(i => i.purchaseStatus === 'in_store');
                
                return (
                  <div key={orderId} className="group">
                    <div className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${allItemsInStore ? 'bg-green-50/50' : 'bg-gray-50/50'}`}>
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded border shadow-sm">
                          <span className="font-bold text-lg text-gray-900">{firstItem.orderNumber}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <User className="h-4 w-4 text-gray-400" />
                            {firstItem.clientName}
                          </div>
                          {firstItem.clientPhone && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Phone className="h-3 w-3" />
                              {firstItem.clientPhone}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-white text-gray-600">
                          {orderItems.length} {orderItems.length > 1 ? 'itens' : 'item'}
                        </Badge>
                        {allItemsInStore && (
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" /> Pronto para Produção
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="divide-y bg-white">
                      {orderItems.map((item) => {
                        const deadlineInfo = getDeadlineInfo(item);
                        
                        return (
                          <div 
                            key={item.itemId} 
                            className="px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-gray-50/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-4">
                                <div className="p-2 bg-purple-50 rounded border border-purple-100 shrink-0">
                                  <Package className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-gray-900 truncate max-w-[400px]">{item.productName}</p>
                                    {item.productCode && (
                                      <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 text-purple-600 border-purple-200 bg-purple-50">
                                        {item.productCode}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                    <span className="bg-gray-100 px-2 rounded font-medium text-gray-700">Qtd: {Math.round(parseFloat(item.quantity?.toString() || '0'))}</span>
                                    <span className="text-purple-600 font-medium">Produtor: {item.producerName}</span>
                                    {(item.productWidth || item.productHeight) && (
                                      <span className="flex items-center gap-1.5 text-xs">
                                        <Ruler className="h-3.5 w-3.5" />
                                        {item.productWidth && `L:${item.productWidth}cm`}
                                        {item.productHeight && ` A:${item.productHeight}cm`}
                                        {item.productDepth && ` P:${item.productDepth}cm`}
                                      </span>
                                    )}
                                  </div>
                                  {item.hasCustomization && item.customizationDescription && (
                                    <div className="mt-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md inline-block border border-blue-100">
                                      <strong>Personalização:</strong> {item.customizationDescription}
                                    </div>
                                  )}
                                  {item.notes && (
                                    <p className="text-xs text-amber-600 mt-1 italic">Obs: {item.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 shrink-0">
                              {deadlineInfo && (
                                <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${deadlineInfo.color}`}>
                                  <deadlineInfo.icon className="h-3.5 w-3.5" />
                                  <span className="font-medium">{deadlineInfo.text}</span>
                                </div>
                              )}
                              
                              <div className="w-[140px] flex justify-center">
                                {getStatusBadge(item.purchaseStatus)}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 w-9 p-0 hover:bg-gray-100"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowItemDetailsModal(true);
                                  }}
                                  title="Ver Detalhes"
                                >
                                  <Eye className="h-4.5 w-4.5 text-gray-500" />
                                </Button>
                                
                                {item.purchaseStatus === 'pending' && (
                                  <Button
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-xs h-9 px-4"
                                    onClick={() => handleUpdateStatus(item.itemId, 'to_buy')}
                                    disabled={loadingItemId === item.itemId}
                                  >
                                    {loadingItemId === item.itemId ? '...' : <><ShoppingCart className="h-3.5 w-3.5 mr-2" /> Para comprar</>}
                                  </Button>
                                )}

                                {item.purchaseStatus === 'to_buy' && (
                                  <Button
                                    size="sm"
                                    className="bg-yellow-600 hover:bg-yellow-700 text-xs h-9 px-4"
                                    onClick={() => handleUpdateStatus(item.itemId, 'purchased')}
                                    disabled={loadingItemId === item.itemId}
                                  >
                                    {loadingItemId === item.itemId ? '...' : <><Package className="h-3.5 w-3.5 mr-2" /> Comprado</>}
                                  </Button>
                                )}
                                
                                {item.purchaseStatus === 'purchased' && (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-xs h-9 px-4"
                                    onClick={() => handleUpdateStatus(item.itemId, 'in_store')}
                                    disabled={loadingItemId === item.itemId}
                                  >
                                    {loadingItemId === item.itemId ? '...' : <><Store className="h-3.5 w-3.5 mr-2" /> Na loja</>}
                                  </Button>
                                )}
                                
                                {item.purchaseStatus === 'in_store' && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 h-9 px-4">
                                    <CheckCircle className="h-3.5 w-3.5 mr-2" /> Na loja
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
                  <p className="font-medium">
                    {selectedItem.productName}
                    {selectedItem.productCode && (
                      <span className="ml-2 text-xs font-mono text-purple-600 bg-purple-50 px-1 rounded border border-purple-100">
                        {selectedItem.productCode}
                      </span>
                    )}
                  </p>
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
                  <p className="text-sm text-gray-500">Status Atual</p>
                  {getStatusBadge(selectedItem.purchaseStatus)}
                </div>
              </div>

              {(selectedItem.productWidth || selectedItem.productHeight || selectedItem.productDepth) && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1 font-medium">Dimensões</p>
                  <div className="flex gap-4 text-sm">
                    {selectedItem.productWidth && <span><strong>L:</strong> {selectedItem.productWidth}cm</span>}
                    {selectedItem.productHeight && <span><strong>A:</strong> {selectedItem.productHeight}cm</span>}
                    {selectedItem.productDepth && <span><strong>P:</strong> {selectedItem.productDepth}cm</span>}
                  </div>
                </div>
              )}

              {selectedItem.hasCustomization && selectedItem.customizationDescription && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                  <p className="text-blue-700 font-semibold mb-1">Personalização</p>
                  <p className="text-gray-700 leading-relaxed">{selectedItem.customizationDescription}</p>
                </div>
              )}

              {selectedItem.notes && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-sm">
                  <p className="text-amber-700 font-semibold mb-1">Observações</p>
                  <p className="text-gray-700 leading-relaxed">{selectedItem.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t mt-4">
                {selectedItem.purchaseStatus === 'pending' && (
                  <Button
                    className="bg-red-600 hover:bg-red-700 flex-1 h-10"
                    onClick={() => {
                      handleUpdateStatus(selectedItem.itemId, 'to_buy');
                      setShowItemDetailsModal(false);
                    }}
                    disabled={loadingItemId === selectedItem.itemId}
                  >
                    {loadingItemId === selectedItem.itemId ? '...' : <><ShoppingCart className="h-4 w-4 mr-2" /> Marcar "Para comprar"</>}
                  </Button>
                )}
                {selectedItem.purchaseStatus === 'to_buy' && (
                  <Button
                    className="bg-yellow-600 hover:bg-yellow-700 flex-1 h-10"
                    onClick={() => {
                      handleUpdateStatus(selectedItem.itemId, 'purchased');
                      setShowItemDetailsModal(false);
                    }}
                    disabled={loadingItemId === selectedItem.itemId}
                  >
                    {loadingItemId === selectedItem.itemId ? '...' : <><Package className="h-4 w-4 mr-2" /> Marcar "Comprado"</>}
                  </Button>
                )}
                {selectedItem.purchaseStatus === 'purchased' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 flex-1 h-10"
                    onClick={() => {
                      handleUpdateStatus(selectedItem.itemId, 'in_store');
                      setShowItemDetailsModal(false);
                    }}
                    disabled={loadingItemId === selectedItem.itemId}
                  >
                    {loadingItemId === selectedItem.itemId ? '...' : <><Store className="h-4 w-4 mr-2" /> Marcar "Na loja"</>}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
