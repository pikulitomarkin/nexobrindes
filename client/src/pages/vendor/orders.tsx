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
import { Plus, FileText, Send, Eye, Search, ShoppingCart, Calculator, Package, Percent, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function VendorOrders() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const vendorId = user.id; // Use actual vendor ID from logged user
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [orderProductSearch, setOrderProductSearch] = useState("");
  const [orderCategoryFilter, setOrderCategoryFilter] = useState("all");
  const [showSendToProductionModal, setShowSendToProductionModal] = useState(false);
  const [orderToSend, setOrderToSend] = useState<string | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all"); // Added periodFilter state
  const { toast } = useToast();

  // Order form state - isolated for vendor
  const [vendorOrderForm, setVendorOrderForm] = useState({
    title: "",
    description: "",
    clientId: "",
    vendorId: vendorId,
    deadline: "",
    items: [] as any[]
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/vendors", vendorId, "orders"],
    queryFn: async () => {
      const response = await fetch(`/api/vendors/${vendorId}/orders`);
      if (!response.ok) throw new Error('Failed to fetch vendor orders');
      return response.json();
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/vendors", vendorId, "clients"],
    queryFn: async () => {
      const response = await fetch(`/api/vendors/${vendorId}/clients`);
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ["/api/products", { limit: 9999 }],
    queryFn: async () => {
      const response = await fetch('/api/products?limit=9999');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const { data: producers } = useQuery({
    queryKey: ["/api/producers"],
    queryFn: async () => {
      const response = await fetch('/api/producers');
      if (!response.ok) throw new Error('Failed to fetch producers');
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
  };

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const orderData = {
        ...data,
        totalValue: calculateOrderTotal().toFixed(2),
        status: "confirmed"
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
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "orders"] });
      setIsOrderDialogOpen(false);
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
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "orders"] });
      setShowSendToProductionModal(false);
      setOrderToSend(null);
      setSelectedProducer("");
      toast({
        title: "Sucesso!",
        description: "Pedido enviado para produção",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao enviar pedido para produção",
        variant: "destructive"
      });
    }
  });

  const markNotesReadMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/mark-notes-read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erro ao marcar observações como lidas");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "orders"] });
      toast({
        title: "Observações marcadas como lidas",
        description: "As observações da produção foram marcadas como lidas",
      });
    },
  });

  const handleSendToProductionClick = (orderId: string) => {
    setOrderToSend(orderId);
    setShowSendToProductionModal(true);
  };

  const confirmSendToProduction = () => {
    if (orderToSend && selectedProducer) {
      sendToProductionMutation.mutate({ orderId: orderToSend, producerId: selectedProducer });
    }
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
      pending: "status-badge status-pending",
      confirmed: "status-badge status-confirmed",
      production: "status-badge status-production",
      delayed: "status-badge status-cancelled",
      ready: "status-badge status-pending",
      shipped: "status-badge status-confirmed",
      delivered: "status-badge status-completed",
      cancelled: "status-badge status-cancelled",
    };

    const statusLabels = {
      pending: "Aguardando",
      confirmed: "Confirmado",
      production: "Em Produção",
      delayed: "Em Atraso",
      ready: "Pronto",
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

  // Filter orders based on search term, status, and period
  const filteredOrders = orders?.filter((order: any) => {
    const matchesSearch = searchTerm === "" ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    // Period filter logic
    let matchesPeriod = true;
    if (periodFilter !== "all" && order.createdAt) {
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);

      switch (periodFilter) {
        case "today":
          matchesPeriod = orderDate >= startOfDay;
          break;
        case "week":
          matchesPeriod = orderDate >= startOfWeek;
          break;
        case "month":
          matchesPeriod = orderDate >= startOfMonth;
          break;
        case "quarter":
          matchesPeriod = orderDate >= startOfQuarter;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesPeriod;
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Pedidos</h1>
          <p className="text-gray-600">Gerencie pedidos criados para seus clientes</p>
        </div>
        <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
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
                  <Label htmlFor="order-title">Título do Pedido</Label>
                  <Input
                    id="order-title"
                    value={vendorOrderForm.title}
                    onChange={(e) => setVendorOrderForm({ ...vendorOrderForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="order-deadline">Prazo de Entrega</Label>
                  <Input
                    id="order-deadline"
                    type="date"
                    value={vendorOrderForm.deadline}
                    onChange={(e) => setVendorOrderForm({ ...vendorOrderForm, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="order-description">Descrição</Label>
                <Textarea
                  id="order-description"
                  rows={2}
                  value={vendorOrderForm.description}
                  onChange={(e) => setVendorOrderForm({ ...vendorOrderForm, description: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="order-client">Cliente</Label>
                <Select value={vendorOrderForm.clientId} onValueChange={(value) => setVendorOrderForm({ ...vendorOrderForm, clientId: value })}>
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

              <Separator />

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
                            <Label htmlFor={`unit-price-${index}`}>Preço Unitário</Label>
                            <Input
                              id={`unit-price-${index}`}
                              value={`R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              disabled
                            />
                          </div>
                          <div>
                            <Label htmlFor={`subtotal-${index}`}>Subtotal (Qtd x Preço)</Label>
                            <Input
                              id={`subtotal-${index}`}
                              value={`R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              disabled
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mb-3">
                          <Switch
                            id={`item-customization-${index}`}
                            checked={item.hasItemCustomization}
                            onCheckedChange={(checked) => updateOrderItem(index, 'hasItemCustomization', checked)}
                          />
                          <Label htmlFor={`item-customization-${index}`} className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Personalização do Item
                          </Label>
                        </div>

                        {item.hasItemCustomization && (
                          <div className="grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded mb-3">
                            <div>
                              <Label htmlFor={`item-customization-value-${index}`}>Valor da Personalização (R$)</Label>
                              <Input
                                id={`item-customization-value-${index}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.itemCustomizationValue}
                                onChange={(e) => updateOrderItem(index, 'itemCustomizationValue', e.target.value)}
                                placeholder="0,00"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`item-customization-description-${index}`}>Descrição</Label>
                              <Input
                                id={`item-customization-description-${index}`}
                                value={item.itemCustomizationDescription}
                                onChange={(e) => updateOrderItem(index, 'itemCustomizationDescription', e.target.value)}
                                placeholder="Ex: Gravação, cor especial..."
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-sm">
                          <span>Subtotal:</span>
                          <span className="font-medium">
                            R$ {calculateItemTotal(item).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
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
                          />
                        </div>
                        <Select value={orderCategoryFilter} onValueChange={setOrderCategoryFilter}>
                          <SelectTrigger>
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
                  <span className="text-blue-600">
                    R$ {calculateOrderTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setIsOrderDialogOpen(false);
                    resetOrderForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createOrderMutation.isPending || vendorOrderForm.items.length === 0}
                >
                  {createOrderMutation.isPending ? "Criando..." : "Criar Pedido"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmados</p>
                <p className="text-3xl font-bold gradient-text">
                  {orders?.filter((o: any) => o.status === 'confirmed').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Produção</p>
                <p className="text-3xl font-bold gradient-text">
                  {orders?.filter((o: any) => o.status === 'production').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calculator className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Entregues</p>
                <p className="text-3xl font-bold gradient-text">
                  {orders?.filter((o: any) => o.status === 'delivered').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-lg font-bold gradient-text">
                  R$ {orders?.reduce((total: number, o: any) => total + parseFloat(o.totalValue), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
              </div>
              <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">R$</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por número, título ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="production">Em Produção</SelectItem>
                <SelectItem value="shipped">Enviado</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Períodos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
              </SelectContent>
            </Select>
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
                    Título
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
                {filteredOrders?.map((order: any) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status)}
                          {order.hasUnreadNotes && (
                            <div className="relative">
                              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        {(order.status === 'production' || order.status === 'delayed' || order.status === 'ready' || order.status === 'shipped' || order.status === 'delivered') && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                order.status === 'delayed' ? 'bg-red-500' :
                                order.status === 'ready' ? 'bg-yellow-500' :
                                order.status === 'shipped' ? 'bg-blue-500' :
                                order.status === 'delivered' ? 'bg-green-500' : 'bg-purple-500'
                              }`}
                              style={{
                                width: order.status === 'production' ? '25%' :
                                       order.status === 'delayed' ? '25%' :
                                       order.status === 'ready' ? '50%' :
                                       order.status === 'shipped' ? '75%' : '100%'
                              }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetailsModal(true);
                          }}
                          data-testid={`button-view-${order.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {order.hasUnreadNotes && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-900"
                            onClick={() => markNotesReadMutation.mutate(order.id)}
                            disabled={markNotesReadMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Ciente
                          </Button>
                        )}
                        {(order.status === 'confirmed' || order.status === 'pending') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => handleSendToProductionClick(order.id)}
                            disabled={sendToProductionMutation.isPending}
                            data-testid={`button-production-${order.id}`}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            {sendToProductionMutation.isPending ? 'Enviando...' : 'Enviar p/ Produção'}
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

      {/* Send to Production Confirmation Dialog */}
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
                setOrderToSend(null);
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

      {/* Order Details Modal */}
      <Dialog open={showOrderDetailsModal} onOpenChange={setShowOrderDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Cliente</Label>
                  <p className="text-sm text-gray-900">{selectedOrder.clientName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Valor Total</Label>
                  <p className="text-sm text-gray-900">
                    R$ {parseFloat(selectedOrder.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Data de Criação</Label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {selectedOrder.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Descrição</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedOrder.description}</p>
                </div>
              )}

              {selectedOrder.deadline && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Prazo de Entrega</Label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedOrder.deadline).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {selectedOrder.productionDeadline && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Prazo de Entrega (Atualizado pela Produção)</Label>
                  <p className="text-sm text-gray-900 font-semibold">
                    {new Date(selectedOrder.productionDeadline).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {selectedOrder.productionNotes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Observações da Produção</Label>
                  <div className="mt-1 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">{selectedOrder.productionNotes}</p>
                    {selectedOrder.lastNoteAt && (
                      <p className="text-xs text-orange-600 mt-2">
                        Atualizado em: {new Date(selectedOrder.lastNoteAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedOrder.trackingCode && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Código de Rastreamento</Label>
                  <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-mono font-semibold">{selectedOrder.trackingCode}</p>
                    <p className="text-xs text-blue-600 mt-2">
                      Cliente pode usar este código para rastrear o pedido
                    </p>
                  </div>
                </div>
              )}

              {selectedOrder.deliveryType && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Tipo de Entrega</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedOrder.deliveryType === 'pickup' ? 'Retirada no Local' : 'Entrega em Casa'}
                  </p>
                </div>
              )}

              {/* Progress Bar for Production Status */}
              {(selectedOrder.status === 'production' || selectedOrder.status === 'delayed' || selectedOrder.status === 'ready' || selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered') && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Progresso da Produção</Label>
                  <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${
                        selectedOrder.status === 'delayed' ? 'bg-red-500' :
                        selectedOrder.status === 'ready' ? 'bg-yellow-500' :
                        selectedOrder.status === 'shipped' ? 'bg-blue-500' :
                        selectedOrder.status === 'delivered' ? 'bg-green-500' : 'bg-purple-500'
                      }`}
                      style={{
                        width: selectedOrder.status === 'production' ? '25%' :
                               selectedOrder.status === 'delayed' ? '25%' :
                               selectedOrder.status === 'ready' ? '50%' :
                               selectedOrder.status === 'shipped' ? '75%' : '100%'
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Produção</span>
                    <span>Pronto</span>
                    <span>Enviado</span>
                    <span>Entregue</span>
                  </div>
                </div>
              )}

              {/* Photos from Budget */}
              {selectedOrder.budgetPhotos && selectedOrder.budgetPhotos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Fotos de Personalização</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedOrder.budgetPhotos.map((photo: string, index: number) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <img
                          src={photo}
                          alt={`Personalização ${index + 1}`}
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-2">
                  {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'pending') && (
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setShowOrderDetailsModal(false);
                        handleSendToProductionClick(selectedOrder.id);
                      }}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Enviar para Produção
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowOrderDetailsModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}