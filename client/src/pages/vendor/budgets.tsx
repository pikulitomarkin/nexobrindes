
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
import { Plus, FileText, Send, Eye, Search, ShoppingCart, Calculator, Package, Percent, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { PDFGenerator } from "@/utils/pdfGenerator";

export default function VendorBudgets() {
  const vendorId = "vendor-1";
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [budgetProductSearch, setBudgetProductSearch] = useState("");
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState("all");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const { toast } = useToast();

  // Image upload functions for individual products
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Erro",
        description: "Imagem deve ter até 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'product-customizations');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const { url } = await response.json();
      
      updateBudgetItem(itemIndex, 'customizationPhoto', url);

      toast({
        title: "Sucesso!",
        description: "Imagem enviada com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar imagem",
        variant: "destructive"
      });
    }
  };

  const removeProductImage = (itemIndex: number) => {
    updateBudgetItem(itemIndex, 'customizationPhoto', '');
  };

  // Budget form state - isolated for vendor
  const [vendorBudgetForm, setVendorBudgetForm] = useState({
    title: "",
    description: "",
    clientId: "",
    vendorId: vendorId,
    validUntil: "",
    items: [] as any[]
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
      itemCustomizationDescription: "",
      customizationPhoto: ""
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
      const customizationValue = item.hasItemCustomization ? (item.itemCustomizationValue || 0) * item.quantity : 0;
      return total + basePrice + customizationValue;
    }, 0);
  };

  const calculateItemTotal = (item: any) => {
    const basePrice = item.unitPrice * item.quantity;
    const customizationValue = item.hasItemCustomization ? (item.itemCustomizationValue || 0) * item.quantity : 0;
    return basePrice + customizationValue;
  };

  const resetBudgetForm = () => {
    setVendorBudgetForm({
      title: "",
      description: "",
      clientId: "",
      vendorId: vendorId,
      validUntil: "",
      items: []
    });
    setIsEditMode(false);
    setEditingBudgetId(null);
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

  const updateBudgetMutation = useMutation({
    mutationFn: async (data: any) => {
      const budgetData = {
        ...data,
        totalValue: calculateBudgetTotal().toFixed(2)
      };
      const response = await fetch(`/api/budgets/${editingBudgetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budgetData),
      });
      if (!response.ok) throw new Error("Erro ao atualizar orçamento");
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
        description: "Orçamento atualizado com sucesso",
      });
    },
  });

  const generatePDFMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const response = await fetch(`/api/budgets/${budgetId}/pdf-data`);
      if (!response.ok) throw new Error("Erro ao buscar dados do orçamento");
      return response.json();
    },
    onSuccess: async (data) => {
      try {
        const pdfGenerator = new PDFGenerator();
        const pdfBlob = await pdfGenerator.generateBudgetPDF(data);
        
        // Create download link
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orcamento-${data.budget.budgetNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Sucesso!",
          description: "PDF gerado e baixado com sucesso!"
        });
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast({
          title: "Erro",
          description: "Erro ao gerar PDF. Tente novamente.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao buscar dados do orçamento.",
        variant: "destructive"
      });
    }
  });

  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [budgetToConvert, setBudgetToConvert] = useState<string | null>(null);
  const [viewBudgetDialogOpen, setViewBudgetDialogOpen] = useState(false);
  const [budgetToView, setBudgetToView] = useState<any>(null);

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

  const handleViewBudget = (budget: any) => {
    setBudgetToView(budget);
    setViewBudgetDialogOpen(true);
  };

  const handleEditBudget = (budget: any) => {
    // Pre-populate form with existing budget data
    setVendorBudgetForm({
      title: budget.title,
      description: budget.description || "",
      clientId: budget.clientId,
      vendorId: budget.vendorId,
      validUntil: budget.validUntil || "",
      items: budget.items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.totalPrice),
        hasItemCustomization: item.hasItemCustomization,
        itemCustomizationValue: parseFloat(item.itemCustomizationValue || 0),
        itemCustomizationDescription: item.itemCustomizationDescription || "",
        customizationPhoto: item.customizationPhoto || ""
      }))
    });
    
    setIsEditMode(true);
    setEditingBudgetId(budget.id);
    setIsBudgetDialogOpen(true);
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
    
    if (isEditMode) {
      updateBudgetMutation.mutate(vendorBudgetForm);
    } else {
      createBudgetMutation.mutate(vendorBudgetForm);
    }
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
        <Dialog open={isBudgetDialogOpen} onOpenChange={(open) => {
          setIsBudgetDialogOpen(open);
          if (open && !isEditMode) {
            // Reset form when opening for new budget
            resetBudgetForm();
            setBudgetProductSearch("");
            setBudgetCategoryFilter("all");
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              className="gradient-bg text-white"
              onClick={() => {
                // Ensure we're in create mode when clicking new budget
                setIsEditMode(false);
                setEditingBudgetId(null);
                resetBudgetForm();
                setBudgetProductSearch("");
                setBudgetCategoryFilter("all");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Editar Orçamento" : "Criar Novo Orçamento"}</DialogTitle>
              <DialogDescription>
                {isEditMode ? "Modifique os dados do orçamento existente" : "Crie um orçamento personalizado com produtos do catálogo"}
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
                          <div className="bg-blue-50 p-3 rounded mb-3 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
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
                            
                            {/* Image Upload for Product Customization */}
                            <div>
                              <Label>Imagem da Personalização deste Produto</Label>
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center justify-center w-full">
                                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                    <div className="flex flex-col items-center justify-center pt-2 pb-2">
                                      <svg className="w-6 h-6 mb-2 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                      </svg>
                                      <p className="text-xs text-gray-500">Clique para enviar imagem</p>
                                    </div>
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={(e) => handleProductImageUpload(e, index)}
                                    />
                                  </label>
                                </div>
                                
                                {item.customizationPhoto && (
                                  <div className="relative inline-block">
                                    <img 
                                      src={item.customizationPhoto} 
                                      alt={`Personalização ${item.productName}`} 
                                      className="w-24 h-24 object-cover rounded-lg"
                                      onError={(e) => {
                                        console.error('Erro ao carregar imagem:', item.customizationPhoto);
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                      onClick={() => removeProductImage(index)}
                                      type="button"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                )}
                              </div>
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
                            {categories.map((category: string) => (
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
                    setBudgetProductSearch("");
                    setBudgetCategoryFilter("all");
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={(isEditMode ? updateBudgetMutation.isPending : createBudgetMutation.isPending) || vendorBudgetForm.items.length === 0}
                >
                  {isEditMode
                    ? (updateBudgetMutation.isPending ? "Atualizando..." : "Atualizar Orçamento")
                    : (createBudgetMutation.isPending ? "Criando..." : "Criar Orçamento")
                  }
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewBudget(budget)}
                          data-testid={`button-view-${budget.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {budget.status !== 'production' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-orange-600 hover:text-orange-900"
                            onClick={() => handleEditBudget(budget)}
                            data-testid={`button-edit-${budget.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => generatePDFMutation.mutate(budget.id)}
                          disabled={generatePDFMutation.isPending}
                          data-testid={`button-pdf-${budget.id}`}
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
                            data-testid={`button-send-${budget.id}`}
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
                            data-testid={`button-convert-${budget.id}`}
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

      {/* View Budget Dialog */}
      <Dialog open={viewBudgetDialogOpen} onOpenChange={setViewBudgetDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Orçamento</DialogTitle>
            <DialogDescription>
              Visualização completa do orçamento {budgetToView?.budgetNumber}
            </DialogDescription>
          </DialogHeader>
          
          {budgetToView && (
            <div className="space-y-6">
              {/* Budget Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="font-semibold">Número do Orçamento</Label>
                  <p className="text-lg">{budgetToView.budgetNumber}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <div className="mt-1">{getStatusBadge(budgetToView.status)}</div>
                </div>
                <div>
                  <Label className="font-semibold">Cliente</Label>
                  <p>{budgetToView.clientName}</p>
                </div>
                <div>
                  <Label className="font-semibold">Data de Criação</Label>
                  <p>{new Date(budgetToView.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <Label className="font-semibold">Válido Até</Label>
                  <p>{budgetToView.validUntil ? new Date(budgetToView.validUntil).toLocaleDateString('pt-BR') : 'Não definido'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Valor Total</Label>
                  <p className="text-lg font-bold text-green-600">
                    R$ {parseFloat(budgetToView.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Budget Details */}
              <div>
                <Label className="font-semibold">Título</Label>
                <p className="mt-1">{budgetToView.title}</p>
              </div>

              {budgetToView.description && (
                <div>
                  <Label className="font-semibold">Descrição</Label>
                  <p className="mt-1">{budgetToView.description}</p>
                </div>
              )}

              {/* Budget Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Itens do Orçamento</h3>
                <div className="space-y-3">
                  {budgetToView.items?.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Produto</Label>
                          <p className="font-semibold">{item.productName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Quantidade</Label>
                          <p>{item.quantity}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Preço Unitário</Label>
                          <p>R$ {parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Subtotal</Label>
                          <p className="font-semibold">
                            R$ {(parseFloat(item.unitPrice) * parseInt(item.quantity)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      
                      {item.hasItemCustomization && (
                        <div className="mt-3 p-3 bg-blue-50 rounded">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Personalização</Label>
                              <p>R$ {parseFloat(item.itemCustomizationValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Descrição</Label>
                              <p>{item.itemCustomizationDescription || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Label className="text-sm font-medium">Total do Item</Label>
                            <p className="font-semibold">
                              R$ {((parseFloat(item.unitPrice) * parseInt(item.quantity)) + parseFloat(item.itemCustomizationValue || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Customization Details */}
              {budgetToView.hasCustomization && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Personalização Geral</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Percentual</Label>
                      <p>{budgetToView.customizationPercentage}%</p>
                    </div>
                    <div>
                      <Label className="font-medium">Valor</Label>
                      <p>R$ {parseFloat(budgetToView.customizationValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="font-medium">Descrição</Label>
                      <p>{budgetToView.customizationDescription}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Customization Images */}
              {budgetToView.items?.some((item: any) => item.customizationPhoto) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Fotos de Personalização por Produto</h3>
                  <div className="space-y-3">
                    {budgetToView.items?.filter((item: any) => item.customizationPhoto).map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <img 
                          src={item.customizationPhoto} 
                          alt={`Personalização ${item.productName}`} 
                          className="w-20 h-20 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.itemCustomizationDescription && (
                            <p className="text-sm text-gray-600">{item.itemCustomizationDescription}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => generatePDFMutation.mutate(budgetToView.id)}
                  disabled={generatePDFMutation.isPending}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {generatePDFMutation.isPending ? 'Gerando...' : 'Baixar PDF'}
                </Button>
                
                {(budgetToView.status === 'draft' || budgetToView.status === 'sent') && (
                  <Button 
                    variant="outline"
                    className="text-blue-600 hover:text-blue-900"
                    onClick={() => {
                      setViewBudgetDialogOpen(false);
                      sendToWhatsAppMutation.mutate(budgetToView.id);
                    }}
                    disabled={sendToWhatsAppMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendToWhatsAppMutation.isPending ? 'Enviando...' : 'Enviar WhatsApp'}
                  </Button>
                )}
                
                {(budgetToView.status === 'sent' || budgetToView.status === 'approved') && (
                  <Button 
                    className="text-green-600 hover:text-green-900"
                    onClick={() => {
                      setViewBudgetDialogOpen(false);
                      handleConvertClick(budgetToView.id);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Converter em Pedido
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setViewBudgetDialogOpen(false);
                    setBudgetToView(null);
                  }}
                  className="ml-auto"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
