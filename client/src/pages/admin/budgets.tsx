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
import { PDFGenerator } from "@/utils/pdfGenerator";
import { CustomizationSelector } from "@/components/customization-selector";
import { phoneMask, currencyMask, parseCurrencyValue } from "@/utils/masks";

export default function AdminBudgets() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [budgetProductSearch, setBudgetProductSearch] = useState("");
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState("all");
  const { toast } = useToast();

  // Admin budget form state - independent from vendor
  const [adminBudgetForm, setAdminBudgetForm] = useState({
    title: "",
    description: "",
    clientId: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    vendorId: "",
    validUntil: "",
    deliveryDeadline: "",
    deliveryType: "delivery",
    items: [] as any[],
    photos: [] as string[],
    hasDiscount: false,
    discountType: "percentage",
    discountPercentage: 0,
    discountValue: 0,
    shippingCost: 0,
  });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["/api/budgets/admin"],
    queryFn: async () => {
      const response = await fetch('/api/budgets');
      if (!response.ok) throw new Error('Failed to fetch budgets');
      return response.json();
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      return users.filter((u: any) => u.role === 'client');
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      return users.filter((u: any) => u.role === 'vendor');
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ["/api/products/admin", { limit: 9999 }],
    queryFn: async () => {
      const response = await fetch('/api/products?limit=9999');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const products = productsData?.products || [];
  const categories = ['all', ...Array.from(new Set((products || []).map((product: any) => product.category).filter(Boolean)))];

  // Admin budget functions
  const addProductToAdminBudget = (product: any) => {
    const newItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: parseFloat(product.basePrice),
      totalPrice: parseFloat(product.basePrice),
      hasItemCustomization: false,
      selectedCustomizationId: "",
      itemCustomizationValue: 0,
      itemCustomizationDescription: "",
      additionalCustomizationNotes: "",
      hasGeneralCustomization: false,
      generalCustomizationName: "",
      generalCustomizationValue: 0,
      productWidth: "",
      productHeight: "",
      productDepth: "",
      customizationPhoto: null,
      producerId: product.producerId || null,
    };
    setAdminBudgetForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateAdminBudgetItem = (index: number, field: string, value: any) => {
    setAdminBudgetForm(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };

      if (field === 'quantity') {
        const quantity = parseInt(value) || 1;
        item.quantity = quantity;
        item.totalPrice = item.unitPrice * quantity;
      } else if (field === 'itemCustomizationValue') {
        item[field] = parseFloat(value) || 0;
      } else if (field === 'generalCustomizationValue') {
        item[field] = parseFloat(value) || 0;
      } else if (field === 'hasItemCustomization' || field === 'hasGeneralCustomization') {
        item[field] = value;
        // Reset related fields when toggling customization
        if (!value) {
          if (field === 'hasItemCustomization') {
            item.selectedCustomizationId = "";
            item.itemCustomizationValue = 0;
            item.itemCustomizationDescription = "";
            item.additionalCustomizationNotes = "";
            item.customizationPhoto = null;
          }
          if (field === 'hasGeneralCustomization') {
            item.generalCustomizationName = "";
            item.generalCustomizationValue = 0;
          }
        }
      } else {
        item[field] = value;
      }

      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const removeProductFromAdminBudget = (index: number) => {
    setAdminBudgetForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateAdminBudgetTotal = () => {
    const subtotal = adminBudgetForm.items.reduce((total, item) => {
      const basePrice = item.unitPrice * item.quantity;
      const customizationValue = item.hasItemCustomization ? (item.itemCustomizationValue || 0) : 0;
      const generalCustomizationValue = item.hasGeneralCustomization ? item.quantity * (item.generalCustomizationValue || 0) : 0;
      return total + basePrice + customizationValue + generalCustomizationValue;
    }, 0);

    // Apply discount
    let discountedSubtotal = subtotal;
    if (adminBudgetForm.hasDiscount) {
      if (adminBudgetForm.discountType === 'percentage') {
        const discountAmount = (subtotal * adminBudgetForm.discountPercentage) / 100;
        discountedSubtotal = Math.max(0, subtotal - discountAmount);
      } else if (adminBudgetForm.discountType === 'value') {
        discountedSubtotal = Math.max(0, subtotal - adminBudgetForm.discountValue);
      }
    }

    return discountedSubtotal;
  };

  const calculateAdminItemTotal = (item: any) => {
    const basePrice = item.unitPrice * item.quantity;
    const customizationValue = item.hasItemCustomization ? (item.itemCustomizationValue || 0) : 0;
    const generalCustomizationValue = item.hasGeneralCustomization ? item.quantity * (item.generalCustomizationValue || 0) : 0;
    return basePrice + customizationValue + generalCustomizationValue;
  };

  const calculateAdminTotalWithShipping = () => {
    const subtotal = calculateAdminBudgetTotal();
    const shipping = adminBudgetForm.deliveryType === "pickup" ? 0 : (adminBudgetForm.shippingCost || 0);
    return subtotal + shipping;
  };

  const resetAdminBudgetForm = () => {
    setAdminBudgetForm({
      title: "",
      description: "",
      clientId: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      vendorId: "",
      validUntil: "",
      deliveryDeadline: "",
      deliveryType: "delivery",
      items: [],
      photos: [],
      hasDiscount: false,
      discountType: "percentage",
      discountPercentage: 0,
      discountValue: 0,
      shippingCost: 0,
    });
  };

  const createAdminBudgetMutation = useMutation({
    mutationFn: async (data: any) => {
      const budgetData = {
        ...data,
        totalValue: calculateAdminTotalWithShipping().toFixed(2)
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
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/admin"] });
      setIsCreateDialogOpen(false);
      resetAdminBudgetForm();
      setBudgetProductSearch("");
      setBudgetCategoryFilter("all");
      toast({
        title: "Sucesso!",
        description: "Orçamento criado com sucesso",
      });
    },
  });

  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [budgetToConvert, setBudgetToConvert] = useState<string | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<string>("");

  const { data: producers } = useQuery({
    queryKey: ["/api/producers"],
    queryFn: async () => {
      const response = await fetch('/api/producers');
      if (!response.ok) throw new Error('Failed to fetch producers');
      return response.json();
    },
  });

  const convertToOrderMutation = useMutation({
    mutationFn: async ({ budgetId, producerId }: { budgetId: string; producerId: string }) => {
      const response = await fetch(`/api/budgets/${budgetId}/convert-to-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ producerId }),
      });
      if (!response.ok) throw new Error("Erro ao converter para pedido");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/admin"] });
      setConvertDialogOpen(false);
      setBudgetToConvert(null);
      setSelectedProducer("");
      toast({
        title: "Sucesso!",
        description: "Orçamento convertido em pedido e enviado para o produtor",
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
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/admin"] });
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
      }
      toast({
        title: "Sucesso!",
        description: "Orçamento enviado via WhatsApp",
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

  const handleConvertClick = (budgetId: string) => {
    setBudgetToConvert(budgetId);
    setConvertDialogOpen(true);
  };

  const handleConfirmConvert = () => {
    if (budgetToConvert && selectedProducer) {
      convertToOrderMutation.mutate({ budgetId: budgetToConvert, producerId: selectedProducer });
    }
  };

  const handleAdminBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar produtos obrigatórios
    if (adminBudgetForm.items.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto ao orçamento",
        variant: "destructive"
      });
      return;
    }

    // Validar datas obrigatórias
    if (!adminBudgetForm.validUntil) {
      toast({
        title: "Erro",
        description: "A data 'Válido Até' é obrigatória",
        variant: "destructive"
      });
      return;
    }

    if (!adminBudgetForm.deliveryDeadline) {
      toast({
        title: "Erro",
        description: "O prazo de entrega é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Validar frete quando delivery
    if (adminBudgetForm.deliveryType === "delivery" && adminBudgetForm.shippingCost <= 0) {
      toast({
        title: "Erro",
        description: "O valor do frete é obrigatório quando há entrega",
        variant: "destructive"
      });
      return;
    }

    // Validar datas não podem ser no passado
    const today = new Date().toISOString().split('T')[0];
    if (adminBudgetForm.validUntil < today) {
      toast({
        title: "Erro",
        description: "A data 'Válido Até' não pode ser anterior a hoje",
        variant: "destructive"
      });
      return;
    }

    createAdminBudgetMutation.mutate(adminBudgetForm);
  };

  // Filter products for admin budget creation
  const filteredAdminBudgetProducts = products.filter((product: any) => {
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
      (budget.contactName || budget.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
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

  // Helper function to handle product image uploads
  const handleAdminProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateAdminBudgetItem(index, 'customizationPhoto', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper function to remove product image
  const removeAdminProductImage = (index: number) => {
    updateAdminBudgetItem(index, 'customizationPhoto', null);
  };


  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Orçamentos - Admin</h1>
          <p className="text-gray-600">Crie e gerencie orçamentos para todos os vendedores e clientes</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
            <form onSubmit={handleAdminBudgetSubmit} className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="admin-budget-title">Título do Orçamento *</Label>
                  <Input
                    id="admin-budget-title"
                    value={adminBudgetForm.title}
                    onChange={(e) => setAdminBudgetForm({ ...adminBudgetForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="admin-budget-validUntil">Válido Até *</Label>
                  <Input
                    id="admin-budget-validUntil"
                    type="date"
                    value={adminBudgetForm.validUntil}
                    onChange={(e) => setAdminBudgetForm({ ...adminBudgetForm, validUntil: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="admin-budget-deliveryDeadline">Prazo de Entrega *</Label>
                  <Select
                    value={adminBudgetForm.deliveryDeadline ? (() => {
                      const today = new Date();
                      const deliveryDate = new Date(adminBudgetForm.deliveryDeadline);
                      const diffTime = deliveryDate.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const validDays = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
                      return validDays.find(d => d === diffDays)?.toString() || "";
                    })() : ""}
                    onValueChange={(value) => {
                      const today = new Date();
                      const deliveryDate = new Date(today);
                      deliveryDate.setDate(today.getDate() + parseInt(value));
                      setAdminBudgetForm({ ...adminBudgetForm, deliveryDeadline: deliveryDate.toISOString().split('T')[0] });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o prazo em dias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 dias</SelectItem>
                      <SelectItem value="10">10 dias</SelectItem>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="20">20 dias</SelectItem>
                      <SelectItem value="25">25 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="35">35 dias</SelectItem>
                      <SelectItem value="40">40 dias</SelectItem>
                      <SelectItem value="45">45 dias</SelectItem>
                      <SelectItem value="50">50 dias</SelectItem>
                      <SelectItem value="55">55 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="admin-budget-delivery-type">Tipo de Entrega *</Label>
                  <Select
                    value={adminBudgetForm.deliveryType}
                    onValueChange={(value) => setAdminBudgetForm({ ...adminBudgetForm, deliveryType: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">Entrega com Frete</SelectItem>
                      <SelectItem value="pickup">Retirada no Local</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="admin-budget-description">Descrição</Label>
                <Textarea
                  id="admin-budget-description"
                  rows={2}
                  value={adminBudgetForm.description}
                  onChange={(e) => setAdminBudgetForm({ ...adminBudgetForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="admin-budget-contact-name">Nome de Contato *</Label>
                  <Input
                    id="admin-budget-contact-name"
                    value={adminBudgetForm.contactName}
                    onChange={(e) => setAdminBudgetForm({ ...adminBudgetForm, contactName: e.target.value })}
                    required
                    placeholder="Nome do cliente/contato"
                  />
                </div>
                <div>
                  <Label htmlFor="admin-budget-contact-phone">Telefone</Label>
                  <Input
                    id="admin-budget-contact-phone"
                    value={adminBudgetForm.contactPhone}
                    onChange={(e) => setAdminBudgetForm({ ...adminBudgetForm, contactPhone: phoneMask(e.target.value) })}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label htmlFor="admin-budget-contact-email">Email</Label>
                  <Input
                    id="admin-budget-contact-email"
                    type="email"
                    value={adminBudgetForm.contactEmail}
                    onChange={(e) => setAdminBudgetForm({ ...adminBudgetForm, contactEmail: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="admin-budget-client">Cliente Cadastrado (Opcional)</Label>
                  <Select
                    value={adminBudgetForm.clientId || "none"}
                    onValueChange={(value) => setAdminBudgetForm({ ...adminBudgetForm, clientId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente cadastrado (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum cliente selecionado</SelectItem>
                      {clients?.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="admin-budget-vendor">Vendedor</Label>
                  <Select value={adminBudgetForm.vendorId} onValueChange={(value) => setAdminBudgetForm({ ...adminBudgetForm, vendorId: value })}>
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

              {/* Product Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Produtos do Orçamento</h3>

                {/* Selected Products */}
                {adminBudgetForm.items.length > 0 && (
                  <div className="space-y-4">
                    {adminBudgetForm.items.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{item.productName}</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeProductFromAdminBudget(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <Label htmlFor={`admin-quantity-${index}`}>Quantidade</Label>
                            <Input
                              id={`admin-quantity-${index}`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateAdminBudgetItem(index, 'quantity', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`admin-unit-price-${index}`}>Preço Unitário</Label>
                            <Input
                              id={`admin-unit-price-${index}`}
                              value={`R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              disabled
                            />
                          </div>
                          <div>
                            <Label htmlFor={`admin-subtotal-${index}`}>Subtotal (Qtd x Preço)</Label>
                            <Input
                              id={`admin-subtotal-${index}`}
                              value={`R$ ${(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              disabled
                            />
                          </div>
                        </div>

                        {/* Product Size Fields */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <Label htmlFor={`admin-width-${index}`}>Largura (cm)</Label>
                            <Input
                              id={`admin-width-${index}`}
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.productWidth}
                              onChange={(e) => updateAdminBudgetItem(index, 'productWidth', e.target.value)}
                              placeholder="Ex: 150.0"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`admin-height-${index}`}>Altura (cm)</Label>
                            <Input
                              id={`admin-height-${index}`}
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.productHeight}
                              onChange={(e) => updateAdminBudgetItem(index, 'productHeight', e.target.value)}
                              placeholder="Ex: 80.0"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`admin-depth-${index}`}>Profundidade (cm)</Label>
                            <Input
                              id={`admin-depth-${index}`}
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.productDepth}
                              onChange={(e) => updateAdminBudgetItem(index, 'productDepth', e.target.value)}
                              placeholder="Ex: 60.0"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mb-3">
                          <Switch
                            id={`admin-item-customization-${index}`}
                            checked={item.hasItemCustomization}
                            onCheckedChange={(checked) => updateAdminBudgetItem(index, 'hasItemCustomization', checked)}
                          />
                          <Label htmlFor={`admin-item-customization-${index}`} className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Personalização do Item
                          </Label>
                        </div>

                        {item.hasItemCustomization && (
                          <div className="bg-blue-50 p-3 rounded mb-3 space-y-3">
                            <CustomizationSelector
                              productCategory={products.find((p: any) => p.id === item.productId)?.category}
                              quantity={item.quantity}
                              selectedCustomization={item.selectedCustomizationId}
                              onCustomizationChange={(customization) => {
                                if (customization) {
                                  updateAdminBudgetItem(index, 'selectedCustomizationId', customization.id);
                                  updateAdminBudgetItem(index, 'itemCustomizationValue', customization.price);
                                  updateAdminBudgetItem(index, 'itemCustomizationDescription', customization.name);
                                } else {
                                  updateAdminBudgetItem(index, 'selectedCustomizationId', '');
                                  updateAdminBudgetItem(index, 'itemCustomizationValue', 0);
                                  updateAdminBudgetItem(index, 'itemCustomizationDescription', '');
                                  updateAdminBudgetItem(index, 'additionalCustomizationNotes', '');
                                }
                              }}
                              customizationValue={item.itemCustomizationValue || 0}
                              onCustomizationValueChange={(value) => updateAdminBudgetItem(index, 'itemCustomizationValue', value)}
                              customizationDescription={item.itemCustomizationDescription || ''}
                              onCustomizationDescriptionChange={(description) => updateAdminBudgetItem(index, 'itemCustomizationDescription', description)}
                            />

                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <Label>Total da Personalização</Label>
                                <Input
                                  value={`R$ ${(item.quantity * (item.itemCustomizationValue || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                  disabled
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  {item.quantity} × R$ {(item.itemCustomizationValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ {(item.quantity * (item.itemCustomizationValue || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>

                            <div>
                              <Label>Observações Adicionais (Opcional)</Label>
                              <Input
                                value={item.additionalCustomizationNotes || ''}
                                onChange={(e) => updateAdminBudgetItem(index, 'additionalCustomizationNotes', e.target.value)}
                                placeholder="Observações extras sobre a personalização..."
                              />
                            </div>

                            <div>
                              <Label>
                                Imagem da Personalização - {item.productName}
                                <span className="text-xs text-gray-500 ml-2">
                                  ({item.producerId === 'internal' ? 'Produto Interno' :
                                    producers?.find((p: any) => p.id === item.producerId)?.name || 'Produtor não encontrado'})
                                </span>
                              </Label>
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center justify-center w-full">
                                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                    <div className="flex flex-col items-center justify-center pt-2 pb-2">
                                      <svg className="w-6 h-6 mb-2 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                      </svg>
                                      <p className="text-xs text-gray-500">Clique para enviar imagem</p>
                                      <p className="text-xs text-blue-600 font-medium">
                                        Para: {item.productName}
                                      </p>
                                    </div>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="image/*"
                                      onChange={(e) => handleAdminProductImageUpload(e, index)}
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
                                      onClick={() => removeAdminProductImage(index)}
                                      type="button"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <Separator className="my-4" />

                            <div className="flex items-center space-x-2 mb-3">
                              <Switch
                                id={`admin-general-customization-${index}`}
                                checked={item.hasGeneralCustomization}
                                onCheckedChange={(checked) => updateAdminBudgetItem(index, 'hasGeneralCustomization', checked)}
                              />
                              <Label htmlFor={`admin-general-customization-${index}`} className="flex items-center gap-2">
                                <Percent className="h-4 w-4" />
                                Personalização Geral
                              </Label>
                            </div>

                            {item.hasGeneralCustomization && (
                              <div className="bg-green-50 p-3 rounded mb-3 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor={`admin-general-customization-name-${index}`}>Nome da Personalização</Label>
                                    <Input
                                      id={`admin-general-customization-name-${index}`}
                                      value={item.generalCustomizationName || ''}
                                      onChange={(e) => updateAdminBudgetItem(index, 'generalCustomizationName', e.target.value)}
                                      placeholder="Ex: Bordado, Gravação, etc."
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`admin-general-customization-value-${index}`}>Valor Unitário (R$)</Label>
                                    <Input
                                      id={`admin-general-customization-value-${index}`}
                                      value={item.generalCustomizationValue > 0 ? currencyMask(item.generalCustomizationValue.toString().replace('.', ',')) : ''}
                                      onChange={(e) => {
                                        const value = parseCurrencyValue(e.target.value);
                                        updateAdminBudgetItem(index, 'generalCustomizationValue', value);
                                      }}
                                      placeholder="R$ 0,00"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label>Total da Personalização Geral</Label>
                                  <Input
                                    value={`R$ ${(item.quantity * (item.generalCustomizationValue || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                    disabled
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {item.quantity} × R$ {(item.generalCustomizationValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ {(item.quantity * (item.generalCustomizationValue || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center space-x-2 mb-3">
                          <Switch
                                id={`admin-general-customization-standalone-${index}`}
                                checked={item.hasGeneralCustomization && !item.hasItemCustomization}
                                onCheckedChange={(checked) => {
                                  updateAdminBudgetItem(index, 'hasGeneralCustomization', checked);
                                  if (checked && !item.hasItemCustomization) {
                                    // If enabling general customization and item customization is off,
                                    // ensure general customization is treated as the primary customization.
                                    updateAdminBudgetItem(index, 'hasItemCustomization', true);
                                  } else if (!checked && item.hasItemCustomization) {
                                    // If disabling general customization, but item customization is on,
                                    // keep item customization enabled.
                                  } else if (!checked && !item.hasItemCustomization) {
                                    // If both are off, do nothing.
                                  }
                                }}
                              />
                          <Label htmlFor={`admin-general-customization-standalone-${index}`} className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Personalização Geral (como Item Principal)
                          </Label>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span>Subtotal:</span>
                          <span className="font-medium">
                            R$ {calculateAdminItemTotal(item).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    {/* Admin Budget Product Search */}
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
                        <span>{filteredAdminBudgetProducts.length} produtos encontrados</span>
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
                      {filteredAdminBudgetProducts.length === 0 ? (
                        <div className="col-span-full text-center py-8">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500">
                            {budgetProductSearch || budgetCategoryFilter !== "all" ?
                              "Nenhum produto encontrado com os filtros aplicados" :
                              "Nenhum produto disponível"}
                          </p>
                        </div>
                      ) : (
                        filteredAdminBudgetProducts.map((product: any) => (
                          <div key={product.id} className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                               onClick={() => addProductToAdminBudget(product)}>
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

              {/* Discount Section */}
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="admin-has-discount"
                    checked={adminBudgetForm.hasDiscount}
                    onCheckedChange={(checked) => setAdminBudgetForm({ ...adminBudgetForm, hasDiscount: checked })}
                  />
                  <Label htmlFor="admin-has-discount" className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Aplicar Desconto
                  </Label>
                </div>

                {adminBudgetForm.hasDiscount && (
                  <div className="bg-orange-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="admin-discount-type">Tipo de Desconto</Label>
                        <Select value={adminBudgetForm.discountType} onValueChange={(value) => setAdminBudgetForm({ ...adminBudgetForm, discountType: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                            <SelectItem value="value">Valor Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {adminBudgetForm.discountType === 'percentage' ? (
                        <div>
                          <Label htmlFor="admin-discount-percentage">Desconto (%)</Label>
                          <Input
                            id="admin-discount-percentage"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={adminBudgetForm.discountPercentage}
                            onChange={(e) => setAdminBudgetForm({ ...adminBudgetForm, discountPercentage: parseFloat(e.target.value) || 0 })}
                            placeholder="Ex: 10.50"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="admin-discount-value">Desconto (R$)</Label>
                          <Input
                            id="admin-discount-value"
                            type="number"
                            step="0.01"
                            min="0"
                            value={adminBudgetForm.discountValue}
                            onChange={(e) => setAdminBudgetForm({ ...adminBudgetForm, discountValue: parseFloat(e.target.value) || 0 })}
                            placeholder="Ex: 150.00"
                          />
                        </div>
                      )}

                      <div>
                        <Label>Valor do Desconto</Label>
                        <p className="text-lg font-semibold text-orange-600 mt-2">
                          R$ {(() => {
                            const itemsSubtotal = adminBudgetForm.items.reduce((total, item) => {
                              const basePrice = item.unitPrice * item.quantity;
                              const customizationValue = item.hasItemCustomization ? (item.itemCustomizationValue || 0) : 0;
                              return total + basePrice + customizationValue;
                            }, 0);

                            if (adminBudgetForm.discountType === 'percentage') {
                              return ((itemsSubtotal * adminBudgetForm.discountPercentage) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            } else {
                              return adminBudgetForm.discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping Cost */}
              {adminBudgetForm.deliveryType === "pickup" ? (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800">Retirada no Local</h4>
                  <p className="text-sm text-blue-700 mt-2">
                    O cliente irá retirar o pedido no local. Não há cobrança de frete.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="admin-shipping-cost">Custo do Frete</Label>
                  <Input
                    id="admin-shipping-cost"
                    value={adminBudgetForm.shippingCost > 0 ? `R$ ${adminBudgetForm.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                      const shippingCost = parseFloat(value) || 0;
                      setAdminBudgetForm({ ...adminBudgetForm, shippingCost });
                    }}
                    placeholder="R$ 0,00"
                  />
                </div>
              )}

              {/* Budget Total */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal dos Produtos:</span>
                    <span>R$ {(() => {
                      const itemsSubtotal = adminBudgetForm.items.reduce((total, item) => {
                        const basePrice = item.unitPrice * item.quantity;
                        const customizationValue = item.hasItemCustomization ? (item.itemCustomizationValue || 0) : 0;
                        return total + basePrice + customizationValue;
                      }, 0);
                      return itemsSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    })()}</span>
                  </div>
                  {adminBudgetForm.hasDiscount && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Desconto:</span>
                      <span>- R$ {(() => {
                        const itemsSubtotal = adminBudgetForm.items.reduce((total, item) => {
                          const basePrice = item.unitPrice * item.quantity;
                          const customizationValue = item.hasItemCustomization ? (item.itemCustomizationValue || 0) : 0;
                          return total + basePrice + customizationValue;
                        }, 0);

                        if (adminBudgetForm.discountType === 'percentage') {
                          return ((itemsSubtotal * adminBudgetForm.discountPercentage) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        } else {
                          return adminBudgetForm.discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        }
                      })()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Subtotal com Desconto:</span>
                    <span>R$ {calculateAdminBudgetTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Valor da Entrada:</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Valor do Frete:</span>
                    <span>
                      {adminBudgetForm.deliveryType === "pickup" ?
                        "R$ 0,00" :
                        `R$ ${adminBudgetForm.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-blue-600 bg-blue-50 p-2 rounded">
                    <span>Entrada + Frete (para financeiro):</span>
                    <span>R$ {(adminBudgetForm.deliveryType === "pickup" ? 0 : adminBudgetForm.shippingCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total do Orçamento:</span>
                    <span className="text-blue-600">
                      R$ {calculateAdminTotalWithShipping().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetAdminBudgetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createAdminBudgetMutation.isPending || adminBudgetForm.items.length === 0}
                >
                  {createAdminBudgetMutation.isPending ? "Criando..." : "Criar Orçamento"}
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
                <p className="text-sm font-medium text-gray-600">Total de Orçamentos</p>
                <p className="text-3xl font-bold gradient-text">
                  {budgets?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Calculator className="h-6 w-6 text-gray-600" />
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
                    Vendedor
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
                      {budget.vendorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(budget.status)}
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
                setConvertDialogOpen(false);
                setBudgetToConvert(null);
                setSelectedProducer("");
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmConvert}
              disabled={convertToOrderMutation.isPending || !selectedProducer}
              className="flex-1"
            >
              {convertToOrderMutation.isPending ? 'Convertendo...' : 'Converter e Enviar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}