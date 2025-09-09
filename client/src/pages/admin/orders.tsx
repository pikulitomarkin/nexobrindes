import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Eye, Send, Filter, Search, Calculator, Package, Percent, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function AdminOrders() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [orderProductSearch, setOrderProductSearch] = useState("");
  const [orderCategoryFilter, setOrderCategoryFilter] = useState("all");
  const { toast } = useToast();

  // Order form state
  const [orderForm, setOrderForm] = useState({
    product: "",
    description: "",
    clientId: "",
    vendorId: "",
    deadline: "",
    hasCustomization: false,
    customizationPercentage: "10.00",
    customizationDescription: "",
    items: [] as any[],
    photos: [] as string[]
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: productsData } = useQuery({
    queryKey: ["/api/products", { limit: 9999 }],
    queryFn: async () => {
      const response = await fetch('/api/products?limit=9999');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const products = productsData?.products || [];
  const categories = ['all', ...Array.from(new Set((products || []).map((product: any) => product.category).filter(Boolean)))];

  // Order functions
  const addProductToOrder = (product: any) => {
    const newItem = {
      productId: product.id,
      productName: product.name,
      quantity: "1",
      unitPrice: product.basePrice,
      totalPrice: product.basePrice,
      hasItemCustomization: false,
      itemCustomizationPercentage: "0.00",
      itemCustomizationDescription: ""
    };
    setOrderForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeProductFromOrder = (index: number) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateOrderTotal = () => {
    const itemsTotal = orderForm.items.reduce((sum, item) => {
      const itemPrice = parseFloat(item.totalPrice || '0');
      
      // Apply item customization
      if (item.hasItemCustomization) {
        const customizationPercentage = parseFloat(item.itemCustomizationPercentage || '0');
        const customizationAmount = itemPrice * (customizationPercentage / 100);
        return sum + itemPrice + customizationAmount;
      }
      
      return sum + itemPrice;
    }, 0);

    // Apply global customization
    if (orderForm.hasCustomization) {
      const customizationPercentage = parseFloat(orderForm.customizationPercentage || '0');
      const customizationAmount = itemsTotal * (customizationPercentage / 100);
      return itemsTotal + customizationAmount;
    }

    return itemsTotal;
  };

  const resetOrderForm = () => {
    setOrderForm({
      product: "",
      description: "",
      clientId: "",
      vendorId: "",
      deadline: "",
      hasCustomization: false,
      customizationPercentage: "10.00",
      customizationDescription: "",
      items: [],
      photos: []
    });
  };

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const orderData = {
        ...data,
        totalValue: calculateOrderTotal().toFixed(2),
        product: data.items.map((item: any) => item.productName).join(", ") || "Pedido Personalizado"
      };
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error("Erro ao criar pedido");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsCreateDialogOpen(false);
      resetOrderForm();
      setOrderProductSearch("");
      setOrderCategoryFilter("all");
      toast({
        title: "Sucesso!",
        description: "Pedido criado com sucesso",
      });
    },
  });

  const sendToProductionMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/send-to-production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erro ao enviar para produção");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Sucesso!",
        description: "Pedido enviado para produção",
      });
    },
  });

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderForm.items.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto ao pedido",
        variant: "destructive"
      });
      return;
    }
    createOrderMutation.mutate(orderForm);
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
      pending: "status-badge status-pending",
      confirmed: "status-badge status-confirmed",
      production: "status-badge status-production",
      shipped: "status-badge status-production",
      delivered: "status-badge status-completed",
      cancelled: "status-badge status-cancelled",
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
      <span className={statusClasses[status as keyof typeof statusClasses] || "status-badge"}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  const filteredOrders = orders?.filter((order: any) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Pedidos</h1>
          <p className="text-gray-600">Controle completo de todos os pedidos do sistema</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-white">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Pedido</DialogTitle>
              <DialogDescription>
                Crie um pedido personalizado com produtos do catálogo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleOrderSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order-description">Descrição do Pedido</Label>
                  <Textarea
                    id="order-description"
                    rows={2}
                    value={orderForm.description}
                    onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
                    placeholder="Descrição detalhada do pedido..."
                  />
                </div>
                <div>
                  <Label htmlFor="order-deadline">Prazo de Entrega</Label>
                  <Input
                    id="order-deadline"
                    type="date"
                    value={orderForm.deadline}
                    onChange={(e) => setOrderForm({ ...orderForm, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order-client">Cliente</Label>
                  <Select value={orderForm.clientId} onValueChange={(value) => setOrderForm({ ...orderForm, clientId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="order-vendor">Vendedor</Label>
                  <Select value={orderForm.vendorId} onValueChange={(value) => setOrderForm({ ...orderForm, vendorId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.map((vendor: any) => (
                        <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Customization Options */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="order-customization"
                    checked={orderForm.hasCustomization}
                    onCheckedChange={(checked) => setOrderForm({ ...orderForm, hasCustomization: checked })}
                  />
                  <Label htmlFor="order-customization" className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Aplicar Personalização Global
                  </Label>
                </div>
                
                {orderForm.hasCustomization && (
                  <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                    <div>
                      <Label htmlFor="order-customization-percentage">Percentual (%)</Label>
                      <Input
                        id="order-customization-percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={orderForm.customizationPercentage}
                        onChange={(e) => setOrderForm({ ...orderForm, customizationPercentage: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="order-customization-description">Descrição da Personalização</Label>
                      <Input
                        id="order-customization-description"
                        value={orderForm.customizationDescription}
                        onChange={(e) => setOrderForm({ ...orderForm, customizationDescription: e.target.value })}
                        placeholder="Ex: Gravação personalizada, cor especial..."
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Product Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Produtos do Pedido</h3>
                
                {/* Selected Products */}
                {orderForm.items.length > 0 && (
                  <div className="space-y-2">
                    {orderForm.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-500">
                            {item.quantity}x R$ {parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = 
                            R$ {parseFloat(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeProductFromOrder(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Products */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Adicionar Produtos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Order Product Search */}
                    <div className="mb-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Buscar produtos..."
                            value={orderProductSearch}
                            onChange={(e) => setOrderProductSearch(e.target.value)}
                            className="pl-9"
                            data-testid="input-order-product-search"
                          />
                        </div>
                        <Select value={orderCategoryFilter} onValueChange={setOrderCategoryFilter}>
                          <SelectTrigger data-testid="select-order-category">
                            <SelectValue placeholder="Categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category === "all" ? "Todas as Categorias" : category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{filteredOrderProducts.length} produtos encontrados</span>
                        {(orderProductSearch || orderCategoryFilter !== "all") && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setOrderProductSearch("");
                              setOrderCategoryFilter("all");
                            }}
                          >
                            Limpar filtros
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                      {filteredOrderProducts.length === 0 ? (
                        <div className="col-span-full text-center py-8">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500">
                            {orderProductSearch || orderCategoryFilter !== "all" ? 
                              "Nenhum produto encontrado com os filtros aplicados" : 
                              "Nenhum produto disponível"}
                          </p>
                        </div>
                      ) : (
                        filteredOrderProducts.map((product: any) => (
                          <div key={product.id} className="p-2 border rounded hover:bg-gray-50 cursor-pointer" 
                               onClick={() => addProductToOrder(product)}>
                            <div className="flex items-center gap-2">
                              {product.imageLink ? (
                                <img src={product.imageLink} alt={product.name} className="w-8 h-8 object-cover rounded" />
                              ) : (
                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                  <Package className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                <p className="text-xs text-gray-500">
                                  R$ {parseFloat(product.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Total */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total do Pedido:</span>
                  <span className="text-green-600">
                    R$ {calculateOrderTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {orderForm.hasCustomization && (
                  <p className="text-sm text-gray-600 mt-1">
                    Inclui {orderForm.customizationPercentage}% de personalização
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetOrderForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createOrderMutation.isPending || orderForm.items.length === 0}
                  className="gradient-bg text-white"
                >
                  {createOrderMutation.isPending ? "Criando..." : "Criar Pedido"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por número, cliente ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Aguardando</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="production">Em Produção</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos ({filteredOrders?.length || 0})</CardTitle>
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
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders?.map((order: any) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.vendorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.product}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="ghost" size="sm" className="mr-2">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      {(order.status === "confirmed" || order.status === "pending") && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-green-600 hover:text-green-900"
                          onClick={() => sendToProductionMutation.mutate(order.id)}
                          disabled={sendToProductionMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Enviar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}