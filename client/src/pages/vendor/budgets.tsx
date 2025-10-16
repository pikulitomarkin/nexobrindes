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
import { Plus, FileText, Send, Eye, Search, ShoppingCart, Calculator, Package, Percent, Trash2, Edit, Factory } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { PDFGenerator } from "@/utils/pdfGenerator";
import { CustomizationSelector } from "@/components/customization-selector";
import { phoneMask, currencyMask, parseCurrencyValue } from "@/utils/masks";

export default function VendorBudgets() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const vendorId = user.id; // Use actual vendor ID from logged user
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
  // State for selected producer in product selection
  const [selectedProducerId, setSelectedProducerId] = useState<string>("");

  const [vendorBudgetForm, setVendorBudgetForm] = useState({
    title: "",
    description: "",
    clientId: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    vendorId: vendorId,
    validUntil: "",
    deliveryDeadline: "",
    deliveryType: "delivery", // 'delivery' or 'pickup'
    items: [] as any[],
    paymentMethodId: "",
    shippingMethodId: "",
    installments: 1,
    downPayment: 0,
    remainingAmount: 0,
    shippingCost: 0,
    hasDiscount: false,
    discountType: "percentage",
    discountPercentage: 0,
    discountValue: 0
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

  const { data: allProductsData } = useQuery({
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


  const products = allProductsData?.products || [];

  // Group products by producer
  const productsByProducer = products.reduce((acc, product) => {
    const producerId = product.producerId || 'internal'; // Default to 'internal' if no producer assigned
    if (!acc[producerId]) {
      acc[producerId] = [];
    }
    acc[producerId].push(product);
    return acc;
  }, {} as Record<string, any[]>);


  const { data: paymentMethods } = useQuery({
    queryKey: ["/api/payment-methods"],
    queryFn: async () => {
      const response = await fetch('/api/payment-methods');
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      return response.json();
    },
  });

  const { data: shippingMethods } = useQuery({
    queryKey: ["/api/shipping-methods"],
    queryFn: async () => {
      const response = await fetch('/api/shipping-methods');
      if (!response.ok) throw new Error('Failed to fetch shipping methods');
      return response.json();
    },
  });

  const categories: string[] = ['all', ...new Set((products || []).map((product: any) => product.category).filter(Boolean))];

  // Helper variables for selected payment and shipping methods
  const selectedPaymentMethod = paymentMethods?.find((pm: any) => pm.id === vendorBudgetForm.paymentMethodId);
  const selectedShippingMethod = shippingMethods?.find((sm: any) => sm.id === vendorBudgetForm.shippingMethodId);

  // Calculate shipping cost based on selected method and delivery type
  const calculateShippingCost = () => {
    // If pickup, no shipping cost
    if (vendorBudgetForm.deliveryType === "pickup") return 0;

    if (!selectedShippingMethod) return 0;

    const subtotal = calculateBudgetTotal();

    if (selectedShippingMethod.type === "free") return 0;
    if (selectedShippingMethod.freeShippingThreshold > 0 && subtotal >= selectedShippingMethod.freeShippingThreshold) return 0;
    if (selectedShippingMethod.type === "fixed") return parseFloat(selectedShippingMethod.basePrice);

    // For calculated, return base price as placeholder (could integrate with shipping API)
    return parseFloat(selectedShippingMethod.basePrice || "0");
  };

  // Budget functions
  const addProductToBudget = (product: any, producerId?: string) => {
    const newItem = {
      productId: product.id,
      productName: product.name,
      producerId: producerId || product.producerId || 'internal', // Ensure producerId is captured
      quantity: 1,
      unitPrice: parseFloat(product.basePrice),
      totalPrice: parseFloat(product.basePrice),
      hasItemCustomization: false,
      selectedCustomizationId: "",
      itemCustomizationValue: 0,
      itemCustomizationDescription: "",
      additionalCustomizationNotes: "",
      customizationPhoto: "",
      productWidth: "",
      productHeight: "",
      productDepth: "",
      hasItemDiscount: false,
      itemDiscountType: "percentage",
      itemDiscountPercentage: 0,
      itemDiscountValue: 0
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
        // Recalculate totalPrice based on unitPrice and quantity, excluding customization for now
        item.totalPrice = item.unitPrice * quantity;
      } else if (field === 'itemCustomizationValue') {
        item[field] = parseFloat(value) || 0;
      }
       else {
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
    const subtotal = vendorBudgetForm.items.reduce((total, item) => {
      return total + calculateItemTotal(item);
    }, 0);

    // Apply general discount
    if (vendorBudgetForm.hasDiscount) {
      if (vendorBudgetForm.discountType === 'percentage') {
        const discountAmount = (subtotal * vendorBudgetForm.discountPercentage) / 100;
        return Math.max(0, subtotal - discountAmount);
      } else if (vendorBudgetForm.discountType === 'value') {
        return Math.max(0, subtotal - vendorBudgetForm.discountValue);
      }
    }

    return subtotal;
  };

  const calculateItemTotal = (item: any) => {
    const basePrice = item.unitPrice * item.quantity;
    const customizationValue = item.hasItemCustomization ? item.quantity * (item.itemCustomizationValue || 0) : 0;
    let subtotal = basePrice + customizationValue;

    // Aplicar desconto do item
    if (item.hasItemDiscount) {
      if (item.itemDiscountType === 'percentage') {
        const discountAmount = (basePrice * (item.itemDiscountPercentage || 0)) / 100;
        subtotal = subtotal - discountAmount;
      } else if (item.itemDiscountType === 'value') {
        subtotal = subtotal - (item.itemDiscountValue || 0);
      }
    }

    return Math.max(0, subtotal);
  };

  // Calculate the total including shipping cost
  const calculateTotalWithShipping = () => {
    const subtotal = calculateBudgetTotal();
    const shipping = parseFloat(vendorBudgetForm.shippingCost) || calculateShippingCost();
    return subtotal + shipping;
  };


  const resetBudgetForm = () => {
    setVendorBudgetForm({
      title: "",
      description: "",
      clientId: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      vendorId: vendorId,
      validUntil: "",
      deliveryDeadline: "",
      deliveryType: "delivery",
      items: [],
      paymentMethodId: "",
      shippingMethodId: "",
      installments: 1,
      downPayment: 0,
      remainingAmount: 0,
      shippingCost: 0,
      hasDiscount: false,
      discountType: "percentage",
      discountPercentage: 0,
      discountValue: 0
    });
    setIsEditMode(false);
    setEditingBudgetId(null);
    setSelectedProducerId("");
  };

  const createBudgetMutation = useMutation({
    mutationFn: async (data: any) => {
      const budgetData = {
        ...data,
        totalValue: calculateTotalWithShipping().toFixed(2)
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
        totalValue: calculateTotalWithShipping().toFixed(2)
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
  const [convertClientId, setConvertClientId] = useState("");
  const [convertProducerId, setConvertProducerId] = useState("");
  const [viewBudgetDialogOpen, setViewBudgetDialogOpen] = useState(false);
  const [budgetToView, setBudgetToView] = useState<any>(null);

  const convertToOrderMutation = useMutation({
    mutationFn: async ({ budgetId, clientId, producerId }: { budgetId: string; clientId: string; producerId: string }) => {
      const response = await fetch(`/api/budgets/${budgetId}/convert-to-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao converter orçamento: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidar múltiplas queries para garantir atualização
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/vendor", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });

      setConvertDialogOpen(false);
      setBudgetToConvert(null);
      setConvertClientId("");
      setConvertProducerId("");
      toast({
        title: "Sucesso!",
        description: "Orçamento convertido em pedido com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao converter orçamento",
        variant: "destructive",
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
    if (budgetToConvert && convertClientId) {
      convertToOrderMutation.mutate({
        budgetId: budgetToConvert,
        clientId: convertClientId,
        producerId: '' // Empty since producers are already defined in budget items
      });
    }
  };

  const handleViewBudget = (budget: any) => {
    setBudgetToView(budget);
    setViewBudgetDialogOpen(true);
  };

  const handleEditBudget = (budget: any) => {
    console.log('Editing budget:', budget);

    // Pre-populate form with existing budget data
    setVendorBudgetForm({
      title: budget.title,
      description: budget.description || "",
      clientId: budget.clientId || "",
      contactName: budget.contactName || "",
      contactPhone: budget.contactPhone || "",
      contactEmail: budget.contactEmail || "",
      vendorId: budget.vendorId,
      validUntil: budget.validUntil || "",
      deliveryDeadline: budget.deliveryDeadline || "",
      deliveryType: budget.deliveryType || "delivery",
      items: (budget.items || []).map((item: any) => {
        // Ensure producerId is correctly mapped
        let producerId = item.producerId;
        
        // If producerId is missing, try to find it from the product
        if (!producerId && item.productId) {
          const product = products.find((p: any) => p.id === item.productId);
          producerId = product?.producerId || 'internal';
        }
        
        // Default to 'internal' if still not found
        if (!producerId) {
          producerId = 'internal';
        }

        console.log(`Mapping budget item ${item.productName}: producerId=${producerId}`);

        return {
          productId: item.productId,
          productName: item.productName || item.product?.name || 'Produto não encontrado',
          producerId: producerId,
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: parseFloat(item.totalPrice) || 0,
          hasItemCustomization: item.hasItemCustomization || false,
          selectedCustomizationId: item.selectedCustomizationId || "",
          itemCustomizationValue: parseFloat(item.itemCustomizationValue || 0),
          itemCustomizationDescription: item.itemCustomizationDescription || "",
          additionalCustomizationNotes: item.additionalCustomizationNotes || "",
          customizationPhoto: item.customizationPhoto || "",
          productWidth: item.productWidth || "",
          productHeight: item.productHeight || "",
          productDepth: item.productDepth || "",
          hasItemDiscount: item.hasItemDiscount || false,
          itemDiscountType: item.itemDiscountType || "percentage",
          itemDiscountPercentage: parseFloat(item.itemDiscountPercentage || 0),
          itemDiscountValue: parseFloat(item.itemDiscountValue || 0)
        };
      }),
      paymentMethodId: budget.paymentMethodId || "",
      shippingMethodId: budget.shippingMethodId || "",
      installments: budget.installments || 1,
      downPayment: parseFloat(budget.downPayment || 0),
      remainingAmount: parseFloat(budget.remainingAmount || 0),
      shippingCost: parseFloat(budget.shippingCost || 0),
      hasDiscount: budget.hasDiscount || false,
      discountType: budget.discountType || "percentage",
      discountPercentage: parseFloat(budget.discountPercentage || 0),
      discountValue: parseFloat(budget.discountValue || 0)
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
              <div className="grid grid-cols-4 gap-4">
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
                <div>
                  <Label htmlFor="budget-deliveryDeadline">Prazo de Entrega</Label>
                  <Input
                    id="budget-deliveryDeadline"
                    type="date"
                    value={vendorBudgetForm.deliveryDeadline || ""}
                    onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, deliveryDeadline: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="budget-delivery-type">Tipo de Entrega</Label>
                  <Select
                    value={vendorBudgetForm.deliveryType}
                    onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, deliveryType: value })}
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
                <Label htmlFor="budget-description">Descrição</Label>
                <Textarea
                  id="budget-description"
                  rows={2}
                  value={vendorBudgetForm.description}
                  onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="budget-contact-name">Nome de Contato *</Label>
                  <Input
                    id="budget-contact-name"
                    value={vendorBudgetForm.contactName}
                    onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, contactName: e.target.value })}
                    required
                    placeholder="Nome do cliente/contato"
                  />
                </div>
                <div>
                  <Label htmlFor="budget-contact-phone">Telefone</Label>
                  <Input
                    id="budget-contact-phone"
                    value={vendorBudgetForm.contactPhone}
                    onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, contactPhone: phoneMask(e.target.value) })}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label htmlFor="budget-contact-email">Email</Label>
                  <Input
                    id="budget-contact-email"
                    type="email"
                    value={vendorBudgetForm.contactEmail}
                    onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, contactEmail: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="budget-client">Cliente Cadastrado (Opcional)</Label>
                <Select
                  value={vendorBudgetForm.clientId || "none"}
                  onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, clientId: value === "none" ? "" : value })}
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

              <Separator />

              {/* Product Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Produtos do Orçamento</h3>

                {/* Selected Products */}
                {vendorBudgetForm.items.length > 0 && (
                  <div className="space-y-4">
                    {vendorBudgetForm.items.map((item, index) => (
                      <div key={index} className={`p-4 border rounded-lg ${index % 2 === 0 ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                        {/* Producer Name Header */}
                        <div className="mb-3 p-2 bg-white/80 rounded-md border border-gray-200">
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">
                              Produtor: {item.producerId === 'internal' ? 'Produtos Internos' : 
                                producers?.find((p: any) => p.id === item.producerId)?.name || 'Produtor não encontrado'}
                            </span>
                          </div>
                        </div>
                        
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

                        {/* Product Size Fields */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <Label htmlFor={`width-${index}`}>Largura (cm)</Label>
                            <Input
                              id={`width-${index}`}
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.productWidth}
                              onChange={(e) => updateBudgetItem(index, 'productWidth', e.target.value)}
                              placeholder="Ex: 150.0"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`height-${index}`}>Altura (cm)</Label>
                            <Input
                              id={`height-${index}`}
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.productHeight}
                              onChange={(e) => updateBudgetItem(index, 'productHeight', e.target.value)}
                              placeholder="Ex: 80.0"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`depth-${index}`}>Profundidade (cm)</Label>
                            <Input
                              id={`depth-${index}`}
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.productDepth}
                              onChange={(e) => updateBudgetItem(index, 'productDepth', e.target.value)}
                              placeholder="Ex: 60.0"
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
                            <CustomizationSelector
                              productCategory={products.find((p: any) => p.id === item.productId)?.category}
                              quantity={item.quantity}
                              selectedCustomization={item.selectedCustomizationId || ''}
                              onCustomizationChange={(customization) => {
                                setVendorBudgetForm(prev => {
                                  const newItems = [...prev.items];
                                  const item = { ...newItems[index] };
                                  
                                  if (customization) {
                                    item.selectedCustomizationId = customization.id;
                                    item.itemCustomizationValue = parseFloat(customization.price) || 0;
                                    item.itemCustomizationDescription = customization.name;
                                  } else {
                                    item.selectedCustomizationId = '';
                                  }
                                  
                                  newItems[index] = item;
                                  return { ...prev, items: newItems };
                                });
                              }}
                              onValidationError={(error) => {
                                if (error) {
                                  toast({
                                    title: "Quantidade Insuficiente",
                                    description: error,
                                    variant: "destructive"
                                  });
                                }
                              }}
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
                                onChange={(e) => updateBudgetItem(index, 'additionalCustomizationNotes', e.target.value)}
                                placeholder="Observações extras sobre a personalização..."
                              />
                            </div>

                            {/* Image Upload for Product Customization */}
                            <div>
                              <Label>Imagem da Personalização deste Produto</Label>
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center justify-center w-full">
                                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                    <div className="flex flex-col items-center justify-center pt-2 pb-2">
                                      <svg className="w-6 h-6 mb-2 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
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

                        <div className="flex items-center space-x-2 mb-3">
                          <Switch
                            id={`item-discount-${index}`}
                            checked={item.hasItemDiscount}
                            onCheckedChange={(checked) => updateBudgetItem(index, 'hasItemDiscount', checked)}
                          />
                          <Label htmlFor={`item-discount-${index}`} className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Desconto no Item
                          </Label>
                        </div>

                        {item.hasItemDiscount && (
                          <div className="bg-orange-50 p-3 rounded mb-3 space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label htmlFor={`item-discount-type-${index}`}>Tipo de Desconto</Label>
                                <Select value={item.itemDiscountType || 'percentage'} onValueChange={(value) => updateBudgetItem(index, 'itemDiscountType', value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                                    <SelectItem value="value">Valor Fixo (R$)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {item.itemDiscountType === 'percentage' ? (
                                <div>
                                  <Label htmlFor={`item-discount-percentage-${index}`}>Desconto (%)</Label>
                                  <Input
                                    id={`item-discount-percentage-${index}`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={item.itemDiscountPercentage || 0}
                                    onChange={(e) => updateBudgetItem(index, 'itemDiscountPercentage', parseFloat(e.target.value) || 0)}
                                    placeholder="Ex: 10.50"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <Label htmlFor={`item-discount-value-${index}`}>Desconto (R$)</Label>
                                  <Input
                                    id={`item-discount-value-${index}`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.itemDiscountValue || 0}
                                    onChange={(e) => updateBudgetItem(index, 'itemDiscountValue', parseFloat(e.target.value) || 0)}
                                    placeholder="Ex: 50.00"
                                  />
                                </div>
                              )}
                              <div>
                                <Label>Valor do Desconto</Label>
                                <p className="text-lg font-semibold text-orange-600 mt-2">
                                  R$ {(() => {
                                    const basePrice = item.unitPrice * item.quantity;
                                    if (item.hasItemDiscount) {
                                      if (item.itemDiscountType === 'percentage') {
                                        const discountAmount = (basePrice * (item.itemDiscountPercentage || 0)) / 100;
                                        return discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                      } else {
                                        return (item.itemDiscountValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                      }
                                    }
                                    return '0,00';
                                  })()}
                                </p>
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
                    <CardTitle className="text-base flex items-center gap-2">
                      <Factory className="h-5 w-5" />
                      Adicionar Produtos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Producer Selection */}
                      <div>
                        <Label>Selecionar Produtor</Label>
                        <Select 
                          value={selectedProducerId || ""} 
                          onValueChange={setSelectedProducerId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha um produtor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">Produtos Internos</SelectItem>
                            {producers?.map((producer: any) => (
                              <SelectItem key={producer.id} value={producer.id}>
                                {producer.name} - {producer.specialty}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Product Search */}
                      {selectedProducerId && (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Buscar produtos do produtor..."
                            value={budgetProductSearch}
                            onChange={(e) => setBudgetProductSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      )}

                      {/* Products List */}
                      {selectedProducerId && (
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <div className="mb-3">
                            <h4 className="font-medium text-gray-800">
                              {selectedProducerId === 'internal' ? 'Produtos Internos' : 
                                producers?.find((p: any) => p.id === selectedProducerId)?.name}
                            </h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                            {(() => {
                              const producerProducts = productsByProducer[selectedProducerId] || [];
                              const filteredProducts = producerProducts.filter((product: any) => 
                                !budgetProductSearch || 
                                product.name.toLowerCase().includes(budgetProductSearch.toLowerCase())
                              );

                              if (filteredProducts.length === 0) {
                                return (
                                  <div className="col-span-full text-center py-8">
                                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500">
                                      {budgetProductSearch ? 'Nenhum produto encontrado' : 'Nenhum produto disponível para este produtor'}
                                    </p>
                                  </div>
                                );
                              }

                              return filteredProducts.map((product: any) => (
                                <div 
                                  key={product.id} 
                                  className="p-3 border border-gray-200 rounded-lg bg-white hover:bg-blue-50 cursor-pointer transition-colors" 
                                  onClick={() => addProductToBudget(product, selectedProducerId)}
                                >
                                  <div className="flex items-center gap-3">
                                    {product.imageLink ? (
                                      <img src={product.imageLink} alt={product.name} className="w-10 h-10 object-cover rounded" />
                                    ) : (
                                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                        <Package className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{product.name}</p>
                                      <p className="text-xs text-gray-500">
                                        R$ {parseFloat(product.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </p>
                                      {product.category && (
                                        <p className="text-xs text-blue-600">{product.category}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}

                      {!selectedProducerId && (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                          <Factory className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">Selecione um produtor acima</p>
                          <p className="text-sm text-gray-400">Escolha um produtor para ver seus produtos disponíveis</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment and Shipping Configuration */}
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Pagamento e Frete</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment-method">Forma de Pagamento</Label>
                    <Select value={vendorBudgetForm.paymentMethodId || ""} onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, paymentMethodId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods?.map((method: any) => (
                          <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shipping-method">Método de Frete</Label>
                    <Select value={vendorBudgetForm.shippingMethodId || ""} onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, shippingMethodId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método de frete" />
                      </SelectTrigger>
                      <SelectContent>
                        {shippingMethods?.map((method: any) => (
                          <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Payment Configuration */}
                {selectedPaymentMethod && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium">Configuração de Pagamento</h4>

                    {selectedPaymentMethod.type === "credit_card" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="installments">Número de Parcelas</Label>
                          <Select value={vendorBudgetForm.installments?.toString() || "1"} onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, installments: parseInt(value) })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: selectedPaymentMethod.maxInstallments }, (_, i) => i + 1).map(num => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}x {num > 1 && selectedPaymentMethod.installmentInterest > 0 && `(${selectedPaymentMethod.installmentInterest}% a.m.)`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="down-payment">Valor de Entrada {vendorBudgetForm.deliveryType !== "pickup" && vendorBudgetForm.shippingCost > 0 ? "(Inclui Frete)" : ""} (R$)</Label>
                        <Input
                          id="down-payment"
                          value={vendorBudgetForm.downPayment > 0 ? currencyMask(vendorBudgetForm.downPayment.toString().replace('.', ',')) : ''}
                          onChange={(e) => {
                            const downPayment = parseCurrencyValue(e.target.value);
                            const total = calculateTotalWithShipping();
                            setVendorBudgetForm({
                              ...vendorBudgetForm,
                              downPayment,
                              remainingAmount: Math.max(0, total - downPayment)
                            });
                          }}
                          placeholder="R$ 0,00"
                        />
                        <div className="text-xs text-gray-600 mt-2 space-y-1">
                          <div className="flex justify-between">
                            <span>Subtotal dos Produtos:</span>
                            <span>R$ {calculateBudgetTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          {vendorBudgetForm.deliveryType !== "pickup" && vendorBudgetForm.shippingCost > 0 && (
                            <div className="flex justify-between">
                              <span>Frete:</span>
                              <span>R$ {vendorBudgetForm.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium text-green-700 pt-1 border-t">
                            <span>Entrada para Iniciar:</span>
                            <span>R$ {(vendorBudgetForm.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          {vendorBudgetForm.downPayment > 0 && vendorBudgetForm.deliveryType !== "pickup" && vendorBudgetForm.shippingCost > 0 && (
                            <p className="text-blue-600 font-medium text-sm">
                              * Valor inclui frete de R$ {vendorBudgetForm.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="remaining-amount">Valor Restante (R$)</Label>
                        <Input
                          id="remaining-amount"
                          value={`R$ ${(vendorBudgetForm.remainingAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          disabled
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Valor a pagar após início da produção
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shipping Configuration */}
                {vendorBudgetForm.deliveryType === "pickup" ? (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800">Retirada no Local</h4>
                    <p className="text-sm text-blue-700 mt-2">
                      O cliente irá retirar o pedido no local. Não há cobrança de frete.
                    </p>
                  </div>
                ) : selectedShippingMethod && (
                  <div className="bg-green-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium">Configuração de Frete</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="shipping-cost">Valor do Frete</Label>
                        <Input
                          id="shipping-cost"
                          value={vendorBudgetForm.shippingCost > 0 ? currencyMask(vendorBudgetForm.shippingCost.toString().replace('.', ',')) : ''}
                          onChange={(e) => {
                            const shippingCost = parseCurrencyValue(e.target.value);
                            const total = calculateBudgetTotal() + shippingCost;
                            setVendorBudgetForm({
                              ...vendorBudgetForm,
                              shippingCost,
                              remainingAmount: Math.max(0, total - (vendorBudgetForm.downPayment || 0))
                            });
                          }}
                          placeholder="R$ 0,00"
                        />
                        <p className="text-xs text-gray-500 mt-1">Valor do frete será somado ao total do orçamento</p>
                      </div>
                      <div>
                        <Label>Prazo de Entrega</Label>
                        <p className="text-sm text-gray-600 mt-2">
                          {selectedShippingMethod.estimatedDays} dias úteis
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Discount Section */}
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="has-discount"
                    checked={vendorBudgetForm.hasDiscount}
                    onCheckedChange={(checked) => setVendorBudgetForm({ ...vendorBudgetForm, hasDiscount: checked })}
                  />
                  <Label htmlFor="has-discount" className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Aplicar Desconto
                  </Label>
                </div>

                {vendorBudgetForm.hasDiscount && (
                  <div className="bg-orange-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="discount-type">Tipo de Desconto</Label>
                        <Select value={vendorBudgetForm.discountType} onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, discountType: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                            <SelectItem value="value">Valor Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {vendorBudgetForm.discountType === 'percentage' ? (
                        <div>
                          <Label htmlFor="discount-percentage">Desconto (%)</Label>
                          <Input
                            id="discount-percentage"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={vendorBudgetForm.discountPercentage}
                            onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, discountPercentage: parseFloat(e.target.value) || 0 })}
                            placeholder="Ex: 10.50"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="discount-value">Desconto (R$)</Label>
                          <Input
                            id="discount-value"
                            type="number"
                            step="0.01"
                            min="0"
                            value={vendorBudgetForm.discountValue}
                            onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, discountValue: parseFloat(e.target.value) || 0 })}
                            placeholder="Ex: 150.00"
                          />
                        </div>
                      )}

                      <div>
                        <Label>Valor do Desconto</Label>
                        <p className="text-lg font-semibold text-orange-600 mt-2">
                          R$ {(() => {
                            const itemsSubtotal = vendorBudgetForm.items.reduce((total, item) => {
                              const basePrice = (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1);
                              const customizationValue = item.hasItemCustomization ? (parseInt(item.quantity) || 1) * (parseFloat(item.itemCustomizationValue) || 0) : 0;
                              return total + basePrice + customizationValue;
                            }, 0);

                            if (vendorBudgetForm.discountType === 'percentage') {
                              const discountAmount = (itemsSubtotal * (parseFloat(vendorBudgetForm.discountPercentage) || 0)) / 100;
                              return discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            } else {
                              return (parseFloat(vendorBudgetForm.discountValue) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Budget Total */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal dos Produtos:</span>
                    <span>R$ {(() => {
                      const itemsSubtotal = vendorBudgetForm.items.reduce((total, item) => {
                        const basePrice = (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1);
                        const customizationValue = item.hasItemCustomization ? (parseInt(item.quantity) || 1) * (parseFloat(item.itemCustomizationValue) || 0) : 0;
                        return total + basePrice + customizationValue;
                      }, 0);
                      return itemsSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    })()}</span>
                  </div>
                  {vendorBudgetForm.hasDiscount && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Desconto:</span>
                      <span>- R$ {(() => {
                        const itemsSubtotal = vendorBudgetForm.items.reduce((total, item) => {
                          const basePrice = (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1);
                          const customizationValue = item.hasItemCustomization ? (parseInt(item.quantity) || 1) * (parseFloat(item.itemCustomizationValue) || 0) : 0;
                          return total + basePrice + customizationValue;
                        }, 0);

                        if (vendorBudgetForm.discountType === 'percentage') {
                          const discountAmount = (itemsSubtotal * (parseFloat(vendorBudgetForm.discountPercentage) || 0)) / 100;
                          return discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        } else {
                          return (parseFloat(vendorBudgetForm.discountValue) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        }
                      })()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Frete:</span>
                    <span>
                      {vendorBudgetForm.deliveryType === "pickup" ?
                        "Retirada no local" :
                        `R$ ${(parseFloat(vendorBudgetForm.shippingCost) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      }
                    </span>
                  </div>
                  {vendorBudgetForm.downPayment > 0 && (
                    <div className="bg-green-50 p-3 rounded space-y-1">
                      <div className="flex justify-between text-sm font-medium text-green-700">
                        <span>Valor de Entrada {vendorBudgetForm.deliveryType !== "pickup" && vendorBudgetForm.shippingCost > 0 ? "(Inclui Frete)" : ""}:</span>
                        <span>R$ {(vendorBudgetForm.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {vendorBudgetForm.deliveryType !== "pickup" && vendorBudgetForm.shippingCost > 0 && (
                        <div className="text-xs text-green-600">
                          Inclui produtos + frete para iniciar o projeto
                        </div>
                      )}
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total do Orçamento:</span>
                    <span className="text-blue-600">
                      R$ {calculateTotalWithShipping().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
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
                      <div className="flex space-x-0.5">
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
                        {budget.status !== 'converted' && (
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
                  <Label className="font-semibold">Nome de Contato</Label>
                  <p>{budgetToView.contactName}</p>
                </div>
                {budgetToView.contactPhone && (
                  <div>
                    <Label className="font-semibold">Telefone</Label>
                    <p>{budgetToView.contactPhone}</p>
                  </div>
                )}
                {budgetToView.contactEmail && (
                  <div>
                    <Label className="font-semibold">Email</Label>
                    <p>{budgetToView.contactEmail}</p>
                  </div>
                )}
                {budgetToView.clientName && (
                  <div>
                    <Label className="font-semibold">Cliente Cadastrado</Label>
                    <p>{budgetToView.clientName}</p>
                  </div>
                )}
                <div>
                  <Label className="font-semibold">Data de Criação</Label>
                  <p>{new Date(budgetToView.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <Label className="font-semibold">Válido Até</Label>
                  <p>{budgetToView.validUntil ? new Date(budgetToView.validUntil).toLocaleDateString('pt-BR') : 'Não definido'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Prazo de Entrega</Label>
                  <p>{budgetToView.deliveryDeadline ? new Date(budgetToView.deliveryDeadline).toLocaleDateString('pt-BR') : 'Não definido'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Tipo de Entrega</Label>
                  <p className={budgetToView.deliveryType === 'pickup' ? 'text-blue-600 font-medium' : 'text-green-600 font-medium'}>
                    {budgetToView.deliveryType === 'pickup' ? 'Retirada no Local' : 'Entrega com Frete'}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Valor Total</Label>
                  <p className="text-lg font-bold text-green-600">
                    R$ {parseFloat(budgetToView.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Budget Items */}
              {budgetToView.items && budgetToView.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Itens do Orçamento</h3>
                  <div className="space-y-3">
                    {budgetToView.items.map((item: any, index: number) => (
                      <div key={index} className={`border rounded-lg p-4 ${index % 2 === 0 ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Producer Name Header */}
                            <div className="mb-3 p-2 bg-white/80 rounded-md border border-gray-200">
                              <div className="flex items-center gap-2">
                                <Factory className="h-4 w-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">
                                  Produtor: {item.producerId === 'internal' ? 'Produtos Internos' : 
                                    producers?.find((p: any) => p.id === item.producerId)?.name || 'Produtor não encontrado'}
                                </span>
                              </div>
                            </div>
                            
                            <h4 className="font-medium text-gray-900">
                              {item.productName || 'Produto não encontrado'}
                            </h4>
                            <div className="grid grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Quantidade:</span> {item.quantity}
                              </div>
                              <div>
                                <span className="font-medium">Preço Unit.:</span> R$ {parseFloat(item.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <div>
                                <span className="font-medium">Subtotal:</span> R$ {(parseFloat(item.unitPrice || 0) * parseInt(item.quantity || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <div>
                                <span className="font-medium">Total:</span> R$ {parseFloat(item.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            {item.hasItemCustomization && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                <span className="font-medium text-blue-800">Personalização:</span> {item.itemCustomizationDescription || 'Personalização aplicada'}
                                {item.itemCustomizationValue && (
                                  <span className="ml-2 text-blue-600">
                                    (+R$ {parseFloat(item.itemCustomizationValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                                  </span>
                                )}
                              </div>
                            )}
                            {(item.productWidth || item.productHeight || item.productDepth) && (
                              <div className="mt-2 text-sm text-gray-500">
                                <span className="font-medium">Dimensões:</span>
                                {item.productWidth && ` L: ${item.productWidth}cm`}
                                {item.productHeight && ` A: ${item.productHeight}cm`}
                                {item.productDepth && ` P: ${item.productDepth}cm`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

              {/* Payment and Shipping Information */}
              {(budgetToView.paymentMethodId || budgetToView.shippingMethodId) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Informações de Pagamento e Frete</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    {budgetToView.paymentMethodId && (
                      <div>
                        <Label className="font-semibold">Forma de Pagamento</Label>
                        <p>{paymentMethods?.find((pm: any) => pm.id === budgetToView.paymentMethodId)?.name || 'Não especificado'}</p>
                        {budgetToView.installments > 1 && (
                          <p className="text-sm text-gray-600">{budgetToView.installments}x</p>
                        )}
                        {budgetToView.downPayment > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-sm"><span className="font-medium">Entrada:</span> R$ {parseFloat(budgetToView.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-sm"><span className="font-medium">Restante:</span> R$ {parseFloat(budgetToView.remainingAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {budgetToView.shippingMethodId && (
                      <div>
                        <Label className="font-semibold">Método de Frete</Label>
                        <p>{shippingMethods?.find((sm: any) => sm.id === budgetToView.shippingMethodId)?.name || 'Não especificado'}</p>
                        <p className="text-sm text-gray-600">
                          R$ {parseFloat(budgetToView.shippingCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
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

                      {/* Product Size Information */}
                      {(item.productWidth || item.productHeight || item.productDepth) && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <Label className="text-sm font-medium">Dimensões (cm)</Label>
                          <div className="grid grid-cols-3 gap-4 mt-2">
                            {item.productWidth && (
                              <div>
                                <span className="text-xs text-gray-500">Largura:</span>
                                <p className="font-medium">{item.productWidth} cm</p>
                              </div>
                            )}
                            {item.productHeight && (
                              <div>
                                <span className="text-xs text-gray-500">Altura:</span>
                                <p className="font-medium">{item.productHeight} cm</p>
                              </div>
                            )}
                            {item.productDepth && (
                              <div>
                                <span className="text-xs text-gray-500">Profundidade:</span>
                                <p className="font-medium">{item.productDepth} cm</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {item.hasItemCustomization && (
                        <div className="mt-3 p-3 bg-blue-50 rounded">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Qtd. Personalizada</Label>
                              <p>{item.customizationQuantity || 0} unidades</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Valor Unit. Personalização</Label>
                              <p>R$ {parseFloat(item.itemCustomizationValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Total Personalização</Label>
                              <p className="font-semibold text-blue-600">
                                R$ {((item.customizationQuantity || 0) * parseFloat(item.itemCustomizationValue || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Label className="text-sm font-medium">Descrição</Label>
                            <p>{item.itemCustomizationDescription || 'N/A'}</p>
                          </div>
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <Label className="text-sm font-medium">Total do Item (Produto + Personalização)</Label>
                            <p className="font-semibold text-lg">
                              R$ {(() => {
                                const productTotal = parseFloat(item.unitPrice) * parseInt(item.quantity);
                                const customizationTotal = (item.customizationQuantity || 0) * parseFloat(item.itemCustomizationValue || 0);
                                return (productTotal + customizationTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                              })()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount Details */}
              {budgetToView.hasDiscount && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Desconto Aplicado</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Tipo de Desconto</Label>
                      <p>{budgetToView.discountType === 'percentage' ? 'Porcentagem' : 'Valor Fixo'}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Valor do Desconto</Label>
                      <p className="text-orange-600 font-semibold">
                        {budgetToView.discountType === 'percentage'
                          ? `${budgetToView.discountPercentage}%`
                          : `R$ ${parseFloat(budgetToView.discountValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {budgetToView.items?.filter((item: any) => item.customizationPhoto).map((item: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="font-medium text-lg mb-3">{item.productName}</h4>
                        <div className="flex flex-col items-center">
                          <img
                            src={item.customizationPhoto}
                            alt={`Personalização ${item.productName}`}
                            className="w-full max-w-sm h-64 object-contain rounded-lg border"
                            onError={(e) => {
                              console.error('Erro ao carregar imagem:', item.customizationPhoto);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          {item.itemCustomizationDescription && (
                            <p className="text-sm text-gray-600 mt-3 text-center">{item.itemCustomizationDescription}</p>
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
              Para converter em pedido, é necessário associar um cliente cadastrado. Os produtores já estão definidos pelos produtos do orçamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="convert-client">Cliente *</Label>
              <Select value={convertClientId} onValueChange={setConvertClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Show producers involved in this budget */}
            {budgetToConvert && (() => {
              const budget = budgets?.find((b: any) => b.id === budgetToConvert);
              if (!budget?.items) return null;
              
              const producersInvolved = new Set();
              budget.items.forEach((item: any) => {
                if (item.producerId && item.producerId !== 'internal') {
                  const producer = producers?.find((p: any) => p.id === item.producerId);
                  if (producer) {
                    producersInvolved.add(`${producer.name} - ${producer.specialty}`);
                  }
                } else if (item.producerId === 'internal') {
                  producersInvolved.add('Produtos Internos');
                }
              });
              
              if (producersInvolved.size > 0) {
                return (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <Label className="text-sm font-medium text-blue-800">Produtores Envolvidos:</Label>
                    <ul className="text-sm text-blue-700 mt-1">
                      {Array.from(producersInvolved).map((producer: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                          {producer}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setConvertDialogOpen(false);
                setBudgetToConvert(null);
                setConvertClientId("");
                setConvertProducerId("");
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmConvert}
              disabled={convertToOrderMutation.isPending || !convertClientId}
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