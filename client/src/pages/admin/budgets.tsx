
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
import { Plus, FileText, Send, Eye, Search, ShoppingCart, Calculator, Package, Percent, Trash2, Edit, Factory, Bell, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { PDFGenerator } from "@/utils/pdfGenerator";
import { CustomizationSelector } from "@/components/customization-selector";
import { phoneMask, currencyMask, parseCurrencyValue } from "@/utils/masks";
// Import Badge component
import { Badge } from "@/components/ui/badge";

export default function AdminBudgets() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [budgetProductSearch, setBudgetProductSearch] = useState("");
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState("all");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [viewBudgetDialogOpen, setViewBudgetDialogOpen] = useState(false);
  const [budgetToView, setBudgetToView] = useState<any>(null);
  const { toast } = useToast();

  // State for selected producer in product selection
  const [selectedProducerId, setSelectedProducerId] = useState<string>("");

  // Admin budget form state - independent from vendor
  const [adminBudgetForm, setAdminBudgetForm] = useState({
    title: "",
    description: "",
    clientId: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    vendorId: "",
    branchId: "matriz", // Definir matriz como padrão
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
    paymentMethodId: "", // Added
    shippingMethodId: "", // Added
    installments: 1, // Added
    downPayment: 0, // Added
    remainingAmount: 0, // Added
  });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["/api/budgets/admin"],
    queryFn: async () => {
      const response = await fetch('/api/budgets');
      if (!response.ok) throw new Error('Failed to fetch budgets');
      return response.json();
    },
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      return users.filter((u: any) => u.role === 'client');
    },
  });

  const { data: vendors, isLoading: vendorsLoading } = useQuery({
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

  const { data: producers } = useQuery({
    queryKey: ["/api/producers"],
    queryFn: async () => {
      const response = await fetch('/api/producers');
      if (!response.ok) throw new Error('Failed to fetch producers');
      return response.json();
    },
  });

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

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const response = await fetch('/api/branches');
      if (!response.ok) throw new Error('Failed to fetch branches');
      return response.json();
    },
  });

  const products = productsData?.products || [];
  const categories: string[] = ['all', ...Array.from(new Set((products || []).map((product: any) => product.category).filter(Boolean)))];

  // Group products by producer
  const productsByProducer = products.reduce((acc, product) => {
    const producerId = product.producerId || 'internal'; // Default to 'internal' if no producer assigned
    if (!acc[producerId]) {
      acc[producerId] = [];
    }
    acc[producerId].push(product);
    return acc;
  }, {} as Record<string, any[]>);

  // Helper variables for selected payment and shipping methods - Admin
  const selectedAdminPaymentMethod = paymentMethods?.find((pm: any) => pm.id === adminBudgetForm.paymentMethodId);
  const selectedAdminShippingMethod = shippingMethods?.find((sm: any) => sm.id === adminBudgetForm.shippingMethodId);

  // Calculate shipping cost based on selected method and delivery type
  const calculateAdminShippingCost = () => {
    // If pickup, no shipping cost
    if (adminBudgetForm.deliveryType === "pickup") return 0;

    if (!selectedAdminShippingMethod) return 0;

    const subtotal = calculateAdminBudgetTotal();

    if (selectedAdminShippingMethod.type === "free") return 0;
    if (selectedAdminShippingMethod.freeShippingThreshold > 0 && subtotal >= selectedAdminShippingMethod.freeShippingThreshold) return 0;
    if (selectedAdminShippingMethod.type === "fixed") return parseFloat(selectedAdminShippingMethod.basePrice);

    // For calculated, return base price as placeholder (could integrate with shipping API)
    return parseFloat(selectedAdminShippingMethod.basePrice || "0");
  };

  // Image upload functions for individual products
  const handleAdminProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemIndex: number) => {
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

      updateAdminBudgetItem(itemIndex, 'customizationPhoto', url);

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

  const removeAdminProductImage = (itemIndex: number) => {
    updateAdminBudgetItem(itemIndex, 'customizationPhoto', '');
  };

  // Admin budget functions
  const addProductToAdminBudget = (product: any, producerId?: string) => {
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
      itemDiscountValue: 0,
      // General Customization Fields
      hasGeneralCustomization: false,
      generalCustomizationName: "",
      generalCustomizationValue: 0,
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
        // Recalculate totalPrice based on all components
        item.totalPrice = calculateAdminItemTotal({ ...item, quantity });
      } else if (field === 'itemCustomizationValue' || field === 'generalCustomizationValue') {
        item[field] = parseFloat(value) || 0;
        // Recalculate totalPrice when customization values change
        item.totalPrice = calculateAdminItemTotal({ ...item, [field]: parseFloat(value) || 0 });
      } else if (field === 'hasItemCustomization' || field === 'hasGeneralCustomization') {
        item[field] = Boolean(value);
        // Recalculate totalPrice when customization flags change
        item.totalPrice = calculateAdminItemTotal({ ...item, [field]: Boolean(value) });
      } else {
        item[field] = value;

        // If it's a discount-related field, recalculate totalPrice
        if (field.includes('Discount') || field.includes('discount')) {
          item.totalPrice = calculateAdminItemTotal({ ...item, [field]: value });
        }
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
      return total + calculateAdminItemTotal(item);
    }, 0);

    // Apply general discount
    if (adminBudgetForm.hasDiscount) {
      if (adminBudgetForm.discountType === 'percentage') {
        const discountAmount = (subtotal * adminBudgetForm.discountPercentage) / 100;
        return Math.max(0, subtotal - discountAmount);
      } else if (adminBudgetForm.discountType === 'value') {
        return Math.max(0, subtotal - adminBudgetForm.discountValue);
      }
    }

    return subtotal;
  };

  const calculateAdminItemTotal = (item: any) => {
    const basePrice = item.unitPrice * item.quantity;

    // Item customization (valor por unidade personalizada)
    const itemCustomizationValue = item.hasItemCustomization ? item.quantity * (parseFloat(item.itemCustomizationValue) || 0) : 0;

    // General customization (valor por unidade aplicado à quantidade total)
    const generalCustomizationValue = item.hasGeneralCustomization ? item.quantity * (parseFloat(item.generalCustomizationValue) || 0) : 0;

    let subtotal = basePrice + itemCustomizationValue + generalCustomizationValue;

    // Aplicar desconto do item (sobre o preço base apenas)
    if (item.hasItemDiscount) {
      if (item.itemDiscountType === 'percentage') {
        const discountAmount = (basePrice * (parseFloat(item.itemDiscountPercentage) || 0)) / 100;
        subtotal = subtotal - discountAmount;
      } else if (item.itemDiscountType === 'value') {
        subtotal = subtotal - (parseFloat(item.itemDiscountValue) || 0);
      }
    }

    return Math.max(0, subtotal);
  };

  // Calculate the total including shipping cost
  const calculateAdminTotalWithShipping = () => {
    const subtotal = calculateAdminBudgetTotal();
    const shipping = parseFloat(adminBudgetForm.shippingCost) || calculateAdminShippingCost();
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
      branchId: "matriz", // Manter matriz como padrão no reset
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
      paymentMethodId: "", // Reset
      shippingMethodId: "", // Reset
      installments: 1, // Reset
      downPayment: 0, // Reset
      remainingAmount: 0, // Reset
    });
    setIsEditMode(false);
    setEditingBudgetId(null);
    setSelectedProducerId("");
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

  const updateAdminBudgetMutation = useMutation({
    mutationFn: async (data: any) => {
      const budgetData = {
        ...data,
        totalValue: calculateAdminTotalWithShipping().toFixed(2)
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
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/admin"] });
      setIsCreateDialogOpen(false);
      resetAdminBudgetForm();
      setBudgetProductSearch("");
      setBudgetCategoryFilter("all");
      toast({
        title: "Sucesso!",
        description: "Orçamento atualizado com sucesso",
      });
    },
  });

  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [budgetToConvert, setBudgetToConvert] = useState<string | null>(null);
  const [convertClientId, setConvertClientId] = useState("");
  const [convertDeliveryDate, setConvertDeliveryDate] = useState("");

  const convertToOrderMutation = useMutation({
    mutationFn: async ({ budgetId, clientId, deliveryDate }: { budgetId: string; clientId: string; deliveryDate: string }) => {
      const response = await fetch(`/api/budgets/${budgetId}/convert-to-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, deliveryDate }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao converter orçamento: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidar múltiplas queries para garantir atualização
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/receivables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/payables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

      setConvertDialogOpen(false);
      setBudgetToConvert(null);
      setConvertClientId("");
      setConvertDeliveryDate("");
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
      console.log('Starting PDF generation for budget:', budgetId);
      const response = await fetch(`/api/budgets/${budgetId}/pdf-data`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF data fetch failed:', response.status, errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      console.log('PDF data received successfully:', {
        budgetId: data.budget?.id,
        budgetNumber: data.budget?.budgetNumber,
        itemCount: data.items?.length || 0,
        hasClient: !!data.client,
        hasVendor: !!data.vendor
      });
      return data;
    },
    onSuccess: async (data) => {
      try {
        console.log('Processing PDF generation...');

        // Validate essential data only
        if (!data) {
          throw new Error('Nenhum dado retornado da API');
        }

        if (!data.budget) {
          throw new Error('Dados do orçamento não encontrados na resposta da API');
        }

        // Items validation is now optional - PDF can be generated without items
        console.log(`Generating PDF for budget ${data.budget.budgetNumber} with ${data.items?.length || 0} items`);

        const pdfGenerator = new PDFGenerator();
        const pdfBlob = await pdfGenerator.generateBudgetPDF(data);

        // Create download link
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orcamento-${data.budget.budgetNumber || 'sem-numero'}.pdf`;
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
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          data: data
        });
        toast({
          title: "Erro ao gerar PDF",
          description: `${error.message}. Verifique o console para mais detalhes.`,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error('PDF generation mutation error:', error);
      toast({
        title: "Erro na requisição",
        description: `Erro ao buscar dados do orçamento: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleConvertClick = (budgetId: string) => {
    setBudgetToConvert(budgetId);
    setConvertDialogOpen(true);
  };

  const handleConfirmConvert = () => {
    if (budgetToConvert && convertClientId && convertDeliveryDate) {
      convertToOrderMutation.mutate({
        budgetId: budgetToConvert,
        clientId: convertClientId,
        deliveryDate: convertDeliveryDate,
      });
    }
  };

  const handleViewBudget = (budget: any) => {
    setBudgetToView(budget);
    setViewBudgetDialogOpen(true);
  };

  const handleGeneratePDF = (budget: any) => {
    generatePDFMutation.mutate(budget.id);
  };

  const handleEditBudget = (budget: any) => {
    console.log('Editing budget:', budget);
    console.log('Budget items:', budget.items);

    // Pre-populate form with existing budget data
    setAdminBudgetForm({
      title: budget.title,
      description: budget.description || "",
      clientId: budget.clientId || "",
      contactName: budget.contactName || "",
      contactPhone: budget.contactPhone || "",
      contactEmail: budget.contactEmail || "",
      vendorId: budget.vendorId || "",
      branchId: budget.branchId || "matriz",
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

        console.log(`Mapping budget item ${item.productName}: producerId=${producerId}`, {
          hasItemCustomization: item.hasItemCustomization,
          selectedCustomizationId: item.selectedCustomizationId,
          itemCustomizationValue: item.itemCustomizationValue,
          itemCustomizationDescription: item.itemCustomizationDescription,
          hasGeneralCustomization: item.hasGeneralCustomization,
          generalCustomizationName: item.generalCustomizationName,
          generalCustomizationValue: item.generalCustomizationValue
        });

        return {
          productId: item.productId,
          productName: item.productName || item.product?.name,
          producerId: producerId,
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: parseFloat(item.totalPrice) || 0,
          // Item Customization - use exact saved values without fallback logic
          hasItemCustomization: Boolean(item.hasItemCustomization),
          selectedCustomizationId: item.selectedCustomizationId || "",
          itemCustomizationValue: parseFloat(item.itemCustomizationValue) || 0,
          itemCustomizationDescription: item.itemCustomizationDescription || "",
          additionalCustomizationNotes: item.additionalCustomizationNotes || "",
          customizationPhoto: item.customizationPhoto || "",
          // Product dimensions
          productWidth: item.productWidth ? item.productWidth.toString() : "",
          productHeight: item.productHeight ? item.productHeight.toString() : "",
          productDepth: item.productDepth ? item.productDepth.toString() : "",
          // Item discount
          hasItemDiscount: Boolean(item.hasItemDiscount),
          itemDiscountType: item.itemDiscountType || "percentage",
          itemDiscountPercentage: parseFloat(item.itemDiscountPercentage) || 0,
          itemDiscountValue: parseFloat(item.itemDiscountValue) || 0,
          // General Customization - use exact saved values without fallback logic
          hasGeneralCustomization: Boolean(item.hasGeneralCustomization),
          generalCustomizationName: item.generalCustomizationName || "",
          generalCustomizationValue: parseFloat(item.generalCustomizationValue) || 0,
        };
      }),
      photos: budget.photos || [],
      paymentMethodId: budget.paymentMethodId || "",
      shippingMethodId: budget.shippingMethodId || "",
      installments: budget.installments || 1,
      downPayment: parseFloat(budget.downPayment || 0),
      remainingAmount: parseFloat(budget.remainingAmount || 0),
      shippingCost: parseFloat(budget.shippingCost || 0),
      hasDiscount: Boolean(budget.hasDiscount),
      discountType: budget.discountType || "percentage",
      discountPercentage: parseFloat(budget.discountPercentage || 0),
      discountValue: parseFloat(budget.discountValue || 0)
    });

    setIsEditMode(true);
    setEditingBudgetId(budget.id);
    setIsCreateDialogOpen(true);
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

    // Date validation: validUntil cannot be in the past
    const today = new Date().toISOString().split('T')[0];
    if (adminBudgetForm.validUntil && adminBudgetForm.validUntil < today) {
      toast({
        title: "Erro de Validação",
        description: "A data de 'Válido Até' não pode ser anterior a hoje.",
        variant: "destructive"
      });
      return;
    }

    // Mandatory fields validation
    if (!adminBudgetForm.title) {
      toast({ title: "Erro", description: "O título do orçamento é obrigatório.", variant: "destructive" });
      return;
    }
    if (!adminBudgetForm.contactName) {
      toast({ title: "Erro", description: "O nome de contato é obrigatório.", variant: "destructive" });
      return;
    }
    if (!adminBudgetForm.paymentMethodId) {
      toast({ title: "Erro", description: "A forma de pagamento é obrigatória.", variant: "destructive" });
      return;
    }
    if (adminBudgetForm.installments < 1) {
      toast({ title: "Erro", description: "O número de parcelas deve ser pelo menos 1.", variant: "destructive" });
      return;
    }
    if (adminBudgetForm.downPayment <= 0) {
      toast({ title: "Erro", description: "O valor de entrada é obrigatório.", variant: "destructive" });
      return;
    }
    if (adminBudgetForm.deliveryType !== 'pickup' && !adminBudgetForm.shippingMethodId) {
      toast({ title: "Erro", description: "O método de frete é obrigatório quando o tipo de entrega não é 'Retirada no Local'.", variant: "destructive" });
      return;
    }
    if (adminBudgetForm.deliveryType !== 'pickup' && adminBudgetForm.shippingCost <= 0) {
      toast({ title: "Erro", description: "O custo do frete é obrigatório quando o tipo de entrega não é 'Retirada no Local'.", variant: "destructive" });
      return;
    }

    if (isEditMode) {
      updateAdminBudgetMutation.mutate(adminBudgetForm);
    } else {
      createAdminBudgetMutation.mutate(adminBudgetForm);
    }
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Orçamentos - Admin</h1>
          <p className="text-gray-600">Crie e gerencie orçamentos para todos os vendedores e clientes</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (open && !isEditMode) {
            // Reset form when opening for new budget
            resetAdminBudgetForm();
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
                resetAdminBudgetForm();
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
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      const today = new Date().toISOString().split('T')[0];

                      if (selectedDate < today) {
                        toast({
                          title: "Data Inválida",
                          description: "A data 'Válido Até' não pode ser anterior à data de hoje.",
                          variant: "destructive"
                        });
                        return;
                      }

                      setAdminBudgetForm({ ...adminBudgetForm, validUntil: selectedDate });
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="admin-budget-deliveryDeadline">Prazo de Entrega *</Label>
                  <Select
                    value={adminBudgetForm.deliveryDeadline ? (() => {
                      try {
                        const today = new Date();
                        const deliveryDate = new Date(adminBudgetForm.deliveryDeadline);
                        if (isNaN(deliveryDate.getTime())) return "";
                        const diffTime = deliveryDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const validDays = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
                        return validDays.find(d => d === diffDays)?.toString() || "";
                      } catch (error) {
                        return "";
                      }
                    })() : ""}
                    onValueChange={(value) => {
                      try {
                        const days = parseInt(value);
                        if (isNaN(days)) return;

                        const today = new Date();
                        const deliveryDate = new Date(today);
                        deliveryDate.setDate(today.getDate() + days);

                        if (isNaN(deliveryDate.getTime())) return;

                        setAdminBudgetForm({ ...adminBudgetForm, deliveryDeadline: deliveryDate.toISOString().split('T')[0] });
                      } catch (error) {
                        console.error('Error setting delivery deadline:', error);
                      }
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

              {/* Seleção de Filial */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="admin-budget-branch">Filial do Orçamento *</Label>
                  <Select
                    value={adminBudgetForm.branchId || "matriz"}
                    onValueChange={(value) => setAdminBudgetForm({ ...adminBudgetForm, branchId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a filial" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="matriz">Matriz (Padrão)</SelectItem>
                      {branches?.map((branch: any) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} - {branch.city}
                          {branch.isHeadquarters && " (Matriz)"}
                        </SelectItem>
                      ))}
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
                    disabled={clientsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={clientsLoading ? "Carregando clientes..." : "Selecione um cliente cadastrado (opcional)"} />
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
                  <Select 
                    value={adminBudgetForm.vendorId} 
                    onValueChange={(value) => setAdminBudgetForm({ ...adminBudgetForm, vendorId: value })}
                    disabled={vendorsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={vendorsLoading ? "Carregando vendedores..." : "Selecione um vendedor"} />
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
                <h3 className="text-lg font-medium">Produtos do Orçamento *</h3>

                {/* Selected Products */}
                {adminBudgetForm.items.length > 0 && (
                  <div className="space-y-4">
                    {adminBudgetForm.items.map((item, index) => (
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
                            onClick={() => removeProductFromAdminBudget(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <Label htmlFor={`admin-quantity-${index}`}>Quantidade *</Label>
                            <Input
                              id={`admin-quantity-${index}`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateAdminBudgetItem(index, 'quantity', e.target.value)}
                              required
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

                            {/* Image Upload for Product Customization */}
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
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Adicionar Produtos ao Orçamento *
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedProducerId ? (
                      <div className="text-center py-8">
                        <Button
                          type="button"
                          className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white"
                          onClick={() => setSelectedProducerId("select")}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Produto
                        </Button>
                        <p className="text-sm text-gray-500 mt-2">Clique para escolher um produto</p>
                      </div>
                    ) : selectedProducerId === "select" ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Selecionar Produtor *</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProducerId("select")}
                          >
                            Trocar Produtor
                          </Button>
                        </div>
                        <Select 
                          value="" 
                          onValueChange={(value) => setSelectedProducerId(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha um produtor para ver seus produtos" />
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
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Factory className="h-4 w-4" />
                            Selecionado: {selectedProducerId === 'internal' ? 'Produtos Internos' : 
                              producers?.find((p: any) => p.id === selectedProducerId)?.name || 'Produtor não encontrado'}
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProducerId("select")}
                          >
                            Trocar Produtor
                          </Button>
                        </div>

                        {/* Product Search and Filter */}
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

                        {/* Product List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                          {(() => {
                            const producerProducts = productsByProducer[selectedProducerId] || [];
                            const filteredProducts = producerProducts.filter((product: any) => {
                              const matchesSearch = !budgetProductSearch ||
                                product.name.toLowerCase().includes(budgetProductSearch.toLowerCase()) ||
                                product.description?.toLowerCase().includes(budgetProductSearch.toLowerCase()) ||
                                product.id.toLowerCase().includes(budgetProductSearch.toLowerCase());

                              const matchesCategory = budgetCategoryFilter === "all" ||
                                product.category === budgetCategoryFilter;

                              return matchesSearch && matchesCategory;
                            });

                            if (filteredProducts.length === 0) {
                              return (
                                <div className="col-span-full text-center py-8">
                                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                  <p className="text-gray-500">
                                    {budgetProductSearch || budgetCategoryFilter !== "all" ?
                                      "Nenhum produto encontrado com os filtros aplicados" :
                                      `Nenhum produto disponível para ${selectedProducerId === 'internal' ? 'Produtos Internos' : 'este produtor'}`
                                    }
                                  </p>
                                  {(budgetProductSearch || budgetCategoryFilter !== "all") && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setBudgetProductSearch("");
                                        setBudgetCategoryFilter("all");
                                      }}
                                      className="mt-2"
                                    >
                                      Limpar filtros
                                    </Button>
                                  )}
                                </div>
                              );
                            }

                            return filteredProducts.map((product: any) => (
                              <div 
                                key={product.id} 
                                className="p-2 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => addProductToAdminBudget(product, selectedProducerId)}
                              >
                                <div className="flex items-center gap-2">
                                  {product.imageLink ? (
                                    <img 
                                      src={product.imageLink} 
                                      alt={product.name} 
                                      className="w-8 h-8 object-cover rounded" 
                                    />
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
                                    {product.category && (
                                      <p className="text-xs text-blue-600">{product.category}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                          <span>
                            {(() => {
                              const producerProducts = productsByProducer[selectedProducerId] || [];
                              const filteredProducts = producerProducts.filter((product: any) => {
                                const matchesSearch = !budgetProductSearch ||
                                  product.name.toLowerCase().includes(budgetProductSearch.toLowerCase()) ||
                                  product.description?.toLowerCase().includes(budgetProductSearch.toLowerCase()) ||
                                  product.id.toLowerCase().includes(budgetProductSearch.toLowerCase());

                                const matchesCategory = budgetCategoryFilter === "all" ||
                                  product.category === budgetCategoryFilter;

                                return matchesSearch && matchesCategory;
                              });
                              return `${filteredProducts.length} produtos encontrados`;
                            })()}
                          </span>
                          {(budgetProductSearch || budgetCategoryFilter !== "all") && (
                            <Button
                              type="button"
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
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Payment and Shipping Configuration */}
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Pagamento e Frete</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin-payment-method">Forma de Pagamento *</Label>
                    <Select value={adminBudgetForm.paymentMethodId || ""} onValueChange={(value) => setAdminBudgetForm({ ...adminBudgetForm, paymentMethodId: value }) } required>
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
                    <Label htmlFor="admin-shipping-method">Método de Frete *</Label>
                    <Select value={adminBudgetForm.shippingMethodId || ""} onValueChange={(value) => setAdminBudgetForm({ ...adminBudgetForm, shippingMethodId: value }) } required>
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
                {selectedAdminPaymentMethod && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium">Configuração de Pagamento</h4>

                    {selectedAdminPaymentMethod.type === "credit_card" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="admin-installments">Número de Parcelas *</Label>
                          <Select value={adminBudgetForm.installments?.toString() || "1"} onValueChange={(value) => setAdminBudgetForm({ ...adminBudgetForm, installments: parseInt(value) }) } required>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: selectedAdminPaymentMethod.maxInstallments }, (_, i) => i + 1).map(num => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}x {num > 1 && selectedAdminPaymentMethod.installmentInterest > 0 && `(${selectedAdminPaymentMethod.installmentInterest}% a.m.)`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="admin-down-payment">Valor de Entrada (R$) *</Label>
                        <Input
                          id="admin-down-payment"
                          value={adminBudgetForm.downPayment > 0 ? currencyMask(adminBudgetForm.downPayment.toString().replace('.', ',')) : ''}
                          onChange={(e) => {
                            const downPayment = parseCurrencyValue(e.target.value);
                            const total = calculateAdminTotalWithShipping();
                            setAdminBudgetForm({
                              ...adminBudgetForm,
                              downPayment,
                              remainingAmount: Math.max(0, total - downPayment)
                            });
                          }}
                          placeholder="R$ 0,00"
                          required
                        />
                        <div className="text-xs text-gray-600 mt-2 space-y-1">
                          <div className="flex justify-between">
                            <span>Subtotal dos Produtos:</span>
                            <span>R$ {calculateAdminBudgetTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }</span>
                          </div>
                          {adminBudgetForm.deliveryType !== "pickup" && adminBudgetForm.shippingCost > 0 && (
                            <div className="flex justify-between">
                              <span>Frete:</span>
                              <span>R$ {adminBudgetForm.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium text-green-700 pt-1 border-t">
                            <span>Entrada para Iniciar:</span>
                            <span>R$ {(adminBudgetForm.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }</span>
                          </div>
                          {adminBudgetForm.downPayment > 0 && adminBudgetForm.deliveryType !== "pickup" && adminBudgetForm.shippingCost > 0 && (
                            <p className="text-blue-600 font-medium text-sm">
                              * Valor inclui frete de R$ {adminBudgetForm.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="admin-remaining-amount">Valor Restante (R$)</Label>
                        <Input
                          id="admin-remaining-amount"
                          value={`R$ ${(adminBudgetForm.remainingAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }`}
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
                {adminBudgetForm.deliveryType === "pickup" ? (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800">Retirada no Local</h4>
                    <p className="text-sm text-blue-700 mt-2">
                      O cliente irá retirar o pedido no local. Não há cobrança de frete.
                    </p>
                  </div>
                ) : selectedAdminShippingMethod && (
                  <div className="bg-green-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium">Configuração de Frete</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="admin-shipping-cost">Valor do Frete (R$) *</Label>
                        <Input
                          id="admin-shipping-cost"
                          value={adminBudgetForm.shippingCost > 0 ? currencyMask(adminBudgetForm.shippingCost.toString().replace('.', ',')) : ''}
                          onChange={(e) => {
                            const shippingCost = parseCurrencyValue(e.target.value);
                            const total = calculateAdminBudgetTotal() + shippingCost;
                            setAdminBudgetForm({
                              ...adminBudgetForm,
                              shippingCost,
                              remainingAmount: Math.max(0, total - (adminBudgetForm.downPayment || 0))
                            });
                          }}
                          placeholder="R$ 0,00"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Valor do frete será somado ao total do orçamento</p>
                      </div>
                      <div>
                        <Label>Prazo Estimado</Label>
                        <p className="text-sm text-gray-600 mt-2">
                          {selectedAdminShippingMethod.estimatedDays} dias úteis
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
                              const basePrice = (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1);
                              const customizationValue = item.hasItemCustomization ? (parseInt(item.quantity) || 1) * (parseFloat(item.itemCustomizationValue) || 0) : 0;
                              const generalCustomizationValue = item.hasGeneralCustomization ? (parseInt(item.quantity) || 1) * (parseFloat(item.generalCustomizationValue) || 0) : 0;
                              return total + basePrice + customizationValue + generalCustomizationValue;
                            }, 0);

                            if (adminBudgetForm.discountType === 'percentage') {
                              const discountAmount = (itemsSubtotal * (parseFloat(adminBudgetForm.discountPercentage) || 0)) / 100;
                              return discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            } else {
                              return (parseFloat(adminBudgetForm.discountValue) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
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
                      const itemsSubtotal = adminBudgetForm.items.reduce((total, item) => {
                        const basePrice = item.unitPrice * item.quantity;
                        const itemCustomizationValue = item.hasItemCustomization ? item.quantity * (item.itemCustomizationValue || 0) : 0;
                        const generalCustomizationValue = item.hasGeneralCustomization ? item.quantity * (item.generalCustomizationValue || 0) : 0;
                        return total + basePrice + itemCustomizationValue + generalCustomizationValue;
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
                          const itemCustomizationValue = item.hasItemCustomization ? item.quantity * (item.itemCustomizationValue || 0) : 0;
                          const generalCustomizationValue = item.hasGeneralCustomization ? item.quantity * (item.generalCustomizationValue || 0) : 0;
                          return total + basePrice + itemCustomizationValue + generalCustomizationValue;
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
                    <span>R$ {calculateAdminBudgetTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Valor da Entrada:</span>
                    <span>R$ {adminBudgetForm.downPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Valor do Frete:</span>
                    <span>
                      {adminBudgetForm.deliveryType === "pickup" ? 
                        "R$ 0,00" : 
                        `R$ ${(parseFloat(adminBudgetForm.shippingCost) || calculateAdminShippingCost()).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-blue-600 bg-blue-50 p-2 rounded">
                    <span>Entrada + Frete (para financeiro):</span>
                    <span>R$ {(adminBudgetForm.downPayment + (adminBudgetForm.deliveryType === "pickup" ? 0 : (parseFloat(adminBudgetForm.shippingCost) || calculateAdminShippingCost()))).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total do Orçamento:</span>
                    <span className="text-blue-600">
                      R$ {calculateAdminTotalWithShipping().toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
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
                    setBudgetProductSearch("");
                    setBudgetCategoryFilter("all");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={(isEditMode ? updateAdminBudgetMutation.isPending : createAdminBudgetMutation.isPending) || adminBudgetForm.items.length === 0}
                >
                  {isEditMode
                    ? (updateAdminBudgetMutation.isPending ? "Atualizando..." : "Atualizar Orçamento")
                    : (createAdminBudgetMutation.isPending ? "Criando..." : "Criar Orçamento")
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
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
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
        <div className="flex-1">
          <Input
            placeholder="Buscar por título, descrição ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Seção de Orçamentos Aprovados - Aguardando Conversão */}
      {budgets?.filter((budget: any) => budget.status === 'approved').length > 0 && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            🔔 Solicitações Pendentes - Orçamentos Aprovados pelo Cliente
          </h3>
          <div className="space-y-2">
            {budgets.filter((budget: any) => budget.status === 'approved').map((budget: any) => (
              <div key={budget.id} className="bg-white p-3 rounded border flex justify-between items-center">
                <div>
                  <p className="font-medium">{budget.title}</p>
                  <p className="text-sm text-gray-600">Cliente: {budget.contactName}</p>
                  <p className="text-sm text-green-600">Total: R$ {parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewBudget(budget)}
                  >
                    Ver Detalhes
                  </Button>
                  <Button 
                    size="sm"
                    className="gradient-bg text-white"
                    onClick={() => {
                      setViewBudgetDialogOpen(false);
                      handleConvertClick(budget.id);
                    }}
                  >
                    🏷️ Converter em Pedido
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <tr key={budget.id} className={budget.hasVendorNotification ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {budget.budgetNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        {budget.title}
                        {budget.hasVendorNotification && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            Nova Resposta!
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {budget.contactName || budget.clientName || 'Nome não informado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {budget.vendorName || 'Admin'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        {getStatusBadge(budget.status)}
                        {budget.clientObservations && (
                          <div className={`text-xs p-1 rounded ${
                            budget.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {budget.clientObservations}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewBudget(budget)}
                          data-testid={`button-view-${budget.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {(budget.status === 'draft' || budget.status === 'sent') && (
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
                          onClick={() => handleGeneratePDF(budget)}
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
                            Enviar
                          </Button>
                        )}
                        {budget.status !== 'converted' && (
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              setViewBudgetDialogOpen(false);
                              handleConvertClick(budget.id);
                            }}
                            data-testid={`button-convert-${budget.id}`}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Converter
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
                  <h3 className="text-lg font-semibold mb-4">Itens do Orçamento ({budgetToView.items.length})</h3>
                  <div className="space-y-3">
                    {budgetToView.items.map((item: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg border bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{item.productName}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Quantidade:</span>
                                <p className="font-medium">{item.quantity}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Valor Unit.:</span>
                                <p className="font-medium">R$ {parseFloat(item.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Dimensões:</span>
                                <p className="font-medium">
                                  {item.productWidth && item.productHeight && item.productDepth ? 
                                    `${item.productWidth}×${item.productHeight}×${item.productDepth}cm` : 
                                    'Não informado'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              R$ {parseFloat(item.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        {/* Personalização do Item */}
                        {item.hasItemCustomization && (
                          <div className="bg-blue-50 p-3 rounded mb-2">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-blue-700 font-medium">🎨 Personalização do Item</span>
                            </div>
                            <p className="text-blue-600 font-medium">{item.itemCustomizationDescription || 'Personalização especial'}</p>
                            {item.itemCustomizationValue > 0 && (
                              <p className="text-sm text-blue-500">
                                Valor: +R$ {parseFloat(item.itemCustomizationValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por unidade
                              </p>
                            )}
                            {item.additionalCustomizationNotes && (
                              <p className="text-sm text-blue-500 mt-1">
                                <strong>Observações:</strong> {item.additionalCustomizationNotes}
                              </p>
                            )}
                            {item.customizationPhoto && (
                              <div className="mt-2">
                                <span className="text-xs text-blue-600 block mb-1">Imagem de referência:</span>
                                <img 
                                  src={item.customizationPhoto} 
                                  alt="Personalização do produto" 
                                  className="w-20 h-20 object-cover rounded border cursor-pointer"
                                  onClick={() => window.open(item.customizationPhoto, '_blank')}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Personalização Geral */}
                        {item.hasGeneralCustomization && (
                          <div className="bg-green-50 p-3 rounded">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-green-700 font-medium">✨ Personalização Geral</span>
                            </div>
                            <p className="text-green-600 font-medium">{item.generalCustomizationName || 'Personalização geral'}</p>
                            {item.generalCustomizationValue > 0 && (
                              <p className="text-sm text-green-500">
                                Valor: +R$ {parseFloat(item.generalCustomizationValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por unidade
                              </p>
                            )}
                          </div>
                        )}
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
                            <p className="text-sm"><span className="font-medium">Entrada:</span> R$ {parseFloat(budgetToView.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }</p>
                            <p className="text-sm"><span className="font-medium">Restante:</span> R$ {parseFloat(budgetToView.remainingAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }</p>
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
                          : `R$ ${parseFloat(budgetToView.discountValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }`
                        }
                      </p>
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

                {budgetToView.status !== 'converted' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      setViewBudgetDialogOpen(false);
                      handleConvertClick(budgetToView.id);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Converter
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
              Para converter em pedido, é necessário associar um cliente cadastrado e definir a data de entrega.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="convert-client">Cliente *</Label>
              <Select 
                value={convertClientId} 
                onValueChange={setConvertClientId}
                disabled={clientsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={clientsLoading ? "Carregando clientes..." : "Selecione o cliente"} />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Input for Delivery Date */}
            <div>
              <Label htmlFor="convert-delivery-date">Data de Entrega *</Label>
              <Input
                id="convert-delivery-date"
                type="date"
                value={convertDeliveryDate}
                onChange={(e) => setConvertDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} // Prevent selecting past dates
              />
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
                setConvertDeliveryDate("");
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmConvert}
              disabled={convertToOrderMutation.isPending || !convertClientId || !convertDeliveryDate}
              className="flex-1 gradient-bg text-white"
            >
              {convertToOrderMutation.isPending ? "Convertendo..." : "Converter em Pedido"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
