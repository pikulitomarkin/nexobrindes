
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
import { Plus, FileText, Send, Eye, Search, ShoppingCart, Calculator, Package, Percent, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function VendorBudgets() {
  const vendorId = "vendor-1";
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [budgetProductSearch, setBudgetProductSearch] = useState("");
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState("all");
  const { toast } = useToast();

  // Budget form state - isolated for vendor
  const [vendorBudgetForm, setVendorBudgetForm] = useState({
    title: "",
    description: "",
    clientId: "",
    vendorId: vendorId,
    validUntil: "",
    items: [] as any[],
    photos: [] as string[]
  });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["/api/budgets/vendor", vendorId],
    queryFn: async () => {
      const response = await fetch(`/api/budgets/vendor/${vendorId}`);
      if (!response.ok) throw new Error('Failed to fetch vendor budgets');
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

  const products = productsData?.products || [];
  const categories = ['all', ...Array.from(new Set((products || []).map((product: any) => product.category).filter(Boolean)))];

  // Budget functions
  const addProductToBudget = (product: any) => {
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
    setVendorBudgetForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateBudgetItem = (index: number, field: string, value: any) => {
    setVendorBudgetForm(prev => {
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

  const removeProductFromBudget = (index: number) => {
    setVendorBudgetForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateBudgetTotal = () => {
    return vendorBudgetForm.items.reduce((total, item) => {
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

  const resetBudgetForm = () => {
    setVendorBudgetForm({
      title: "",
      description: "",
      clientId: "",
      vendorId: vendorId,
      validUntil: "",
      items: [],
      photos: []
    });
  };

  const createBudgetMutation = useMutation({
    mutationFn: async (data: any) => {
      const budgetData = {
        ...data,
        totalValue: calculateBudgetTotal().toFixed(2)
      };
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budgetData),
      });
      if (!response.ok) throw new Error("Erro ao criar orçamento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/vendor", vendorId] });
      setIsBudgetDialogOpen(false);
      resetBudgetForm();
      setBudgetProductSearch("");
      setBudgetCategoryFilter("all");
      toast({
        title: "Sucesso!",
        description: "Orçamento criado com sucesso",
      });
    },
  });

  const generatePDFMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const response = await fetch(`/api/budgets/${budgetId}/pdf`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("Erro ao gerar PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `orcamento-${budgetId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "PDF gerado e baixado",
      });
    },
  });

  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [budgetToConvert, setBudgetToConvert] = useState<string | null>(null);

  const convertToOrderMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const response = await fetch(`/api/budgets/${budgetId}/convert-to-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erro ao converter para pedido");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/vendor", vendorId] });
      setConvertDialogOpen(false);
      setBudgetToConvert(null);
      toast({
        title: "Sucesso!",
        description: "Orçamento convertido em pedido",
      });
    },
  });

  const sendToWhatsAppMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const response = await fetch(`/api/budgets/${budgetId}/send-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erro ao enviar orçamento");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/vendor", vendorId] });
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
      }
      toast({
        title: "Sucesso!",
        description: "Orçamento enviado via WhatsApp",
      });
    },
  });

  const handleConvertClick = (budgetId: string) => {
    setBudgetToConvert(budgetId);
    setConvertDialogOpen(true);
  };

  const handleConfirmConvert = () => {
    if (budgetToConvert) {
      convertToOrderMutation.mutate(budgetToConvert);
    }
  };

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vendorBudgetForm.items.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto ao orçamento",
        variant: "destructive"
      });
      return;
    }
    createBudgetMutation.mutate(vendorBudgetForm);
  };

  // Filter products for budget creation
  const filteredBudgetProducts = products.filter((product: any) => {
    const matchesSearch = !budgetProductSearch || 
      product.name.toLowerCase().includes(budgetProductSearch.toLowerCase()) ||
      product.description?.toLowerCase().includes(budgetProductSearch.toLowerCase()) ||
      product.id.toLowerCase().includes(budgetProductSearch.toLowerCase());
    
    const matchesCategory = budgetCategoryFilter === "all" || 
      product.category === budgetCategoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      draft: "status-badge status-pending",
      sent: "status-badge status-confirmed",
      approved: "status-badge status-production",
      rejected: "status-badge status-cancelled",
      converted: "status-badge status-completed",
    };

    const statusLabels = {
      draft: "Rascunho",
      sent: "Enviado",
      approved: "Aprovado",
      rejected: "Rejeitado",
      converted: "Convertido",
    };

    return (
      <span className={statusClasses[status as keyof typeof statusClasses] || "status-badge"}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  const filteredBudgets = budgets?.filter((budget: any) => {
    const matchesStatus = statusFilter === "all" || budget.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      budget.budgetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Orçamentos</h1>
          <p className="text-gray-600">Gerencie orçamentos criados para seus clientes</p>
        </div>
        <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-white">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Orçamento</DialogTitle>
              <DialogDescription>
                Crie um orçamento personalizado com produtos do catálogo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBudgetSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget-title">Título do Orçamento</Label>
                  <Input
                    id="budget-title"
                    value={vendorBudgetForm.title}
                    onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="budget-validUntil">Válido Até</Label>
                  <Input
                    id="budget-validUntil"
                    type="date"
                    value={vendorBudgetForm.validUntil}
                    onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, validUntil: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="budget-description">Descrição</Label>
                <Textarea
                  id="budget-description"
                  rows={2}
                  value={vendorBudgetForm.description}
                  onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, description: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="budget-client">Cliente</Label>
                <Select value={vendorBudgetForm.clientId} onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, clientId: value })}>
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
                <h3 className="text-lg font-medium">Produtos do Orçamento</h3>
                
                {/* Selected Products */}
                {vendorBudgetForm.items.length > 0 && (
                  <div className="space-y-4">
                    {vendorBudgetForm.items.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{item.productName}</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeProductFromBudget(index)}
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
                              onChange={(e) => updateBudgetItem(index, 'quantity', e.target.value)}
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
                            onCheckedChange={(checked) => updateBudgetItem(index, 'hasItemCustomization', checked)}
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
                                onChange={(e) => updateBudgetItem(index, 'itemCustomizationValue', e.target.value)}
                                placeholder="0,00"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`item-customization-description-${index}`}>Descrição</Label>
                              <Input
                                id={`item-customization-description-${index}`}
                                value={item.itemCustomizationDescription}
                                onChange={(e) => updateBudgetItem(index, 'itemCustomizationDescription', e.target.value)}
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
                    {/* Budget Product Search */}
                    <div className="mb-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Buscar produtos..."
                            value={budgetProductSearch}
                            onChange={(e) => setBudgetProductSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <Select value={budgetCategoryFilter} onValueChange={setBudgetCategoryFilter}>
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
                        <span>{filteredBudgetProducts.length} produtos encontrados</span>
                        {(budgetProductSearch || budgetCategoryFilter !== "all") && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setBudgetProductSearch("");
                              setBudgetCategoryFilter("all");
                            }}
                          >
                            Limpar filtros
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                      {filteredBudgetProducts.length === 0 ? (
                        <div className="col-span-full text-center py-8">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500">
                            {budgetProductSearch || budgetCategoryFilter !== "all" ? 
                              "Nenhum produto encontrado com os filtros aplicados" : 
                              "Nenhum produto disponível"}
                          </p>
                        </div>
                      ) : (
                        filteredBudgetProducts.map((product: any) => (
                          <div key={product.id} className="p-2 border rounded hover:bg-gray-50 cursor-pointer" 
                               onClick={() => addProductToBudget(product)}>
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

              {/* Budget Total */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total do Orçamento:</span>
                  <span className="text-blue-600">
                    R$ {calculateBudgetTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => {
                    setIsBudgetDialogOpen(false);
                    resetBudgetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createBudgetMutation.isPending || vendorBudgetForm.items.length === 0}
                >
                  {createBudgetMutation.isPending ? "Criando..." : "Criar Orçamento"}
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
                <p className="text-sm font-medium text-gray-600">Rascunhos</p>
                <p className="text-3xl font-bold gradient-text">
                  {budgets?.filter((b: any) => b.status === 'draft').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Enviados</p>
                <p className="text-3xl font-bold gradient-text">
                  {budgets?.filter((b: any) => b.status === 'sent').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aprovados</p>
                <p className="text-3xl font-bold gradient-text">
                  {budgets?.filter((b: any) => b.status === 'approved').length || 0}
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
                  R$ {budgets?.reduce((total: number, b: any) => total + parseFloat(b.totalValue), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
              </div>
              <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">R$</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por número, título ou cliente..."
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
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="converted">Convertido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Orçamentos ({filteredBudgets?.length || 0})</CardTitle>
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
                {filteredBudgets?.map((budget: any) => (
                  <tr key={budget.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {budget.budgetNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {budget.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {budget.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(budget.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => generatePDFMutation.mutate(budget.id)}
                          disabled={generatePDFMutation.isPending}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                        {(budget.status === 'draft' || budget.status === 'sent') && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => sendToWhatsAppMutation.mutate(budget.id)}
                            disabled={sendToWhatsAppMutation.isPending}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            {sendToWhatsAppMutation.isPending ? 'Enviando...' : 'Enviar'}
                          </Button>
                        )}
                        {(budget.status === 'sent' || budget.status === 'approved') && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-600 hover:text-green-900"
                            onClick={() => handleConvertClick(budget.id)}
                            disabled={convertToOrderMutation.isPending}
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            {convertToOrderMutation.isPending ? 'Convertendo...' : 'Converter'}
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

      {/* Convert to Order Confirmation Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter Orçamento em Pedido</DialogTitle>
            <DialogDescription>
              Deseja converter este orçamento em pedido? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setConvertDialogOpen(false);
                setBudgetToConvert(null);
              }}
              className="flex-1"
            >
              Não
            </Button>
            <Button 
              onClick={handleConfirmConvert}
              disabled={convertToOrderMutation.isPending}
              className="flex-1"
            >
              {convertToOrderMutation.isPending ? 'Convertendo...' : 'Sim'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
