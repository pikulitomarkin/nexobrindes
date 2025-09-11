
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Eye, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function VendorOrders() {
  const vendorId = "vendor-1";
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderProductSearch, setOrderProductSearch] = useState("");
  const [orderCategoryFilter, setOrderCategoryFilter] = useState("all");
  const { toast } = useToast();

  const [vendorOrderForm, setVendorOrderForm] = useState({
    title: "",
    description: "",
    clientId: "",
    vendorId: vendorId,
    deadline: "",
    items: [] as any[]
  });

  // Queries
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/vendors", vendorId, "orders"],
    queryFn: async () => {
      const response = await fetch(`/api/vendors/${vendorId}/orders`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/vendor/clients", vendorId],
    queryFn: async () => {
      const response = await fetch(`/api/vendors/${vendorId}/clients`);
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch('/api/products?limit=100');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const products = productsData?.products || [];

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderData,
          totalValue: calculateOrderTotal(),
          status: "confirmed"
        }),
      });
      if (!response.ok) throw new Error("Erro ao criar pedido");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "orders"] });
      setShowNewOrderForm(false);
      resetOrderForm();
      toast({
        title: "Sucesso!",
        description: "Pedido criado com sucesso",
      });
    },
  });

  // Order functions
  const addProductToOrder = (product: any) => {
    const newItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: parseFloat(product.basePrice),
      totalPrice: parseFloat(product.basePrice),
      hasItemCustomization: false,
      itemCustomizationValue: 0,
      itemCustomizationDescription: ""
    };
    setVendorOrderForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    setVendorOrderForm(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      
      if (field === 'quantity') {
        const quantity = parseInt(value) || 1;
        item.quantity = quantity;
        item.totalPrice = item.unitPrice * quantity;
      } else if (field === 'itemCustomizationValue') {
        item[field] = parseFloat(value) || 0;
      } else {
        item[field] = value;
      }
      
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const removeProductFromOrder = (index: number) => {
    setVendorOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateOrderTotal = () => {
    return vendorOrderForm.items.reduce((total, item) => {
      const basePrice = item.unitPrice * item.quantity;
      const customizationValue = item.hasItemCustomization ? (item.itemCustomizationValue || 0) : 0;
      return total + basePrice + customizationValue;
    }, 0);
  };

  const calculateItemTotal = (item: any) => {
    const basePrice = item.unitPrice * item.quantity;
    const customizationValue = item.hasItemCustomization ? (item.itemCustomizationValue || 0) : 0;
    return basePrice + customizationValue;
  };

  const resetOrderForm = () => {
    setVendorOrderForm({
      title: "",
      description: "",
      clientId: "",
      vendorId: vendorId,
      deadline: "",
      items: []
    });
    setOrderProductSearch("");
    setOrderCategoryFilter("all");
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vendorOrderForm.items.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto ao pedido",
        variant: "destructive"
      });
      return;
    }
    if (!vendorOrderForm.clientId) {
      toast({
        title: "Erro",
        description: "Selecione um cliente para o pedido",
        variant: "destructive"
      });
      return;
    }
    createOrderMutation.mutate(vendorOrderForm);
  };

  // Filter products for order creation
  const filteredOrderProducts = products.filter((product: any) => {
    const matchesSearch = !orderProductSearch || 
      product.name.toLowerCase().includes(orderProductSearch.toLowerCase()) ||
      product.description?.toLowerCase().includes(orderProductSearch.toLowerCase()) ||
      product.id.toLowerCase().includes(orderProductSearch.toLowerCase());
    
    const matchesCategory = orderCategoryFilter === "all" || 
      product.category === orderCategoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      production: "bg-purple-100 text-purple-800",
      shipped: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const statusLabels = {
      pending: "Aguardando",
      confirmed: "Confirmado",
      production: "Em Produção",
      shipped: "Enviado",
      delivered: "Entregue",
      cancelled: "Cancelado",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[status as keyof typeof statusClasses]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meus Pedidos</h1>
            <p className="text-gray-600">Gerencie seus pedidos de venda</p>
          </div>
          <Dialog open={showNewOrderForm} onOpenChange={setShowNewOrderForm}>
            <DialogTrigger asChild>
              <Button className="gradient-bg text-white">
                <Plus className="h-4 w-4 mr-2" />
                Novo Pedido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Pedido</DialogTitle>
                <DialogDescription>Preencha os dados do pedido</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleOrderSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="order-title">Título do Pedido</Label>
                    <Input
                      id="order-title"
                      value={vendorOrderForm.title}
                      onChange={(e) => setVendorOrderForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Pedido de canecas personalizadas"
                    />
                  </div>
                  <div>
                    <Label htmlFor="order-client">Cliente *</Label>
                    <Select value={vendorOrderForm.clientId} onValueChange={(value) => setVendorOrderForm(prev => ({ ...prev, clientId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="order-deadline">Prazo de Entrega</Label>
                    <Input
                      id="order-deadline"
                      type="date"
                      value={vendorOrderForm.deadline}
                      onChange={(e) => setVendorOrderForm(prev => ({ ...prev, deadline: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="order-description">Observações</Label>
                    <Textarea
                      id="order-description"
                      value={vendorOrderForm.description}
                      onChange={(e) => setVendorOrderForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Observações adicionais sobre o pedido"
                    />
                  </div>
                </div>

                {/* Product Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Produtos do Pedido</h3>
                  
                  {/* Selected Products */}
                  {vendorOrderForm.items.length > 0 && (
                    <div className="space-y-4">
                      {vendorOrderForm.items.map((item, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{item.productName}</h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeProductFromOrder(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div>
                              <Label htmlFor={`quantity-${index}`}>Quantidade</Label>
                              <Input
                                id={`quantity-${index}`}
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Preço Unitário</Label>
                              <div className="p-2 bg-gray-50 rounded text-sm">
                                R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div>
                              <Label>Total do Item</Label>
                              <div className="p-2 bg-gray-50 rounded text-sm font-medium">
                                R$ {calculateItemTotal(item).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <input
                                type="checkbox"
                                id={`customization-${index}`}
                                checked={item.hasItemCustomization}
                                onChange={(e) => updateOrderItem(index, 'hasItemCustomization', e.target.checked)}
                              />
                              <Label htmlFor={`customization-${index}`}>Taxa de Personalização</Label>
                            </div>
                            
                            {item.hasItemCustomization && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor={`customization-value-${index}`}>Valor da Personalização (R$)</Label>
                                  <Input
                                    id={`customization-value-${index}`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.itemCustomizationValue}
                                    onChange={(e) => updateOrderItem(index, 'itemCustomizationValue', e.target.value)}
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`customization-desc-${index}`}>Descrição da Personalização</Label>
                                  <Input
                                    id={`customization-desc-${index}`}
                                    value={item.itemCustomizationDescription}
                                    onChange={(e) => updateOrderItem(index, 'itemCustomizationDescription', e.target.value)}
                                    placeholder="Ex: Logotipo em dourado"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Products Section */}
                  <div className="border rounded-lg p-4">
                    <h4 className="text-md font-medium mb-3">Adicionar Produtos</h4>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <Input
                          placeholder="Buscar produtos..."
                          value={orderProductSearch}
                          onChange={(e) => setOrderProductSearch(e.target.value)}
                        />
                      </div>
                      <div>
                        <Select value={orderCategoryFilter} onValueChange={setOrderCategoryFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Filtrar por categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as categorias</SelectItem>
                            <SelectItem value="canecas">Canecas</SelectItem>
                            <SelectItem value="brindes">Brindes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      {filteredOrderProducts.map((product: any) => (
                        <div key={product.id} className="p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h5 className="font-medium text-sm">{product.name}</h5>
                              <p className="text-xs text-gray-600">{product.friendlyCode}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addProductToOrder(product)}
                              className="ml-2"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm font-medium text-green-600">
                            R$ {parseFloat(product.basePrice || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Total */}
                  {vendorOrderForm.items.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium">Total do Pedido:</span>
                        <span className="text-2xl font-bold text-green-600">
                          R$ {calculateOrderTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewOrderForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-bg text-white"
                    disabled={createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? "Criando..." : "Criar Pedido"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders?.map((order: any) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setShowOrderDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {orders?.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">Nenhum pedido encontrado</p>
              <Button
                onClick={() => setShowNewOrderForm(true)}
                className="gradient-bg text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Pedido
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
