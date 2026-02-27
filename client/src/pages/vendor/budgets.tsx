import { useState, useEffect } from "react";
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
import { Plus, FileText, Send, Eye, Search, ShoppingCart, Calculator, Package, Percent, Trash2, Edit, Factory, Bell, X, Clock, AlertTriangle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { PDFGenerator } from "@/utils/pdfGenerator";
import { CustomizationSelector } from "@/components/customization-selector";
import { phoneMask, currencyMask, parseCurrencyValue } from "@/utils/masks";
// Import Badge component
import { Badge } from "@/components/ui/badge";
import { calculatePriceFromCost as calcPriceFromCost, getProductSalePrice } from "@/lib/pricingCalc";

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
  const [editingDescriptionIndex, setEditingDescriptionIndex] = useState<number | null>(null);
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
  // State for product/producer selection - NEW FLOW: Product first, then producer (same as admin)
  const [selectedProductForProducer, setSelectedProductForProducer] = useState<any>(null);
  const [showProducerSelector, setShowProducerSelector] = useState(false);

  const [vendorBudgetForm, setVendorBudgetForm] = useState({
    title: "",
    description: "",
    clientId: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    vendorId: vendorId,
    branchId: "matriz", // Definir matriz como padrão
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
      console.log(`Fetching budgets for vendor: ${vendorId}`);
      const response = await fetch(`/api/budgets/vendor/${vendorId}`);
      if (!response.ok) {
        console.error(`Failed to fetch budgets: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch vendor budgets');
      }
      const data = await response.json();
      console.log(`Received ${data.length} budgets from API:`, data);
      return data;
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

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products/search", { search: budgetProductSearch, category: budgetCategoryFilter }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, any];
      if (!params.search && params.category === "all") return { products: [], total: 0 };

      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append('search', params.search);
      if (params.category && params.category !== "all") searchParams.append('category', params.category);
      searchParams.append('limit', '1000'); // Buscar todos os produtos correspondentes

      const response = await fetch(`/api/logistics/products?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: budgetProductSearch.length >= 2 || budgetCategoryFilter !== "all"
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

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const response = await fetch('/api/branches');
      if (!response.ok) throw new Error('Failed to fetch branches');
      return response.json();
    },
  });

  const { data: pricingSettings } = useQuery({
    queryKey: ["/api/pricing/settings"],
    queryFn: async () => {
      const response = await fetch('/api/pricing/settings');
      if (!response.ok) return null;
      return response.json();
    },
  });

  const { data: marginTiers } = useQuery({
    queryKey: ["/api/pricing/margin-tiers", pricingSettings?.id],
    queryFn: async () => {
      if (!pricingSettings?.id) return [];
      const response = await fetch(`/api/pricing/margin-tiers/${pricingSettings.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!pricingSettings?.id,
  });

  const calculatePriceFromCost = (costPrice: number, budgetRevenue: number = 0) => {
    return calcPriceFromCost(costPrice, budgetRevenue, pricingSettings, marginTiers);
  };

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
    const costPrice = parseFloat(product.costPrice) || 0;

    const currentRevenue = vendorBudgetForm.items.reduce((total: number, item: any) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
    const sale = getProductSalePrice(product, currentRevenue, pricingSettings, marginTiers);
    const idealPrice = sale.price;
    const minimumPrice = sale.source === 'computed' ? (sale.details?.minimumPrice || 0) : 0;

    const newItem = {
      productId: product.id,
      productName: product.name,
      producerId: producerId || product.producerId || 'internal',
      quantity: 1,
      unitPrice: idealPrice,
      basePriceWithMargin: idealPrice,
      totalPrice: idealPrice,
      costPrice: costPrice,
      minimumPrice: minimumPrice,
      priceSource: sale.source,
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
      hasGeneralCustomization: false,
      generalCustomizationName: "",
      generalCustomizationValue: 0,
      notes: product.description || "",
    };
    setVendorBudgetForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setSelectedProductForProducer(null);
    setShowProducerSelector(false);
  };

  const updateBudgetItem = (index: number, field: string, value: any) => {
    setVendorBudgetForm(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };

      // Helper: unitPrice now equals basePriceWithMargin because customizations are included in the cost base
      const recalcUnitPrice = (it: any) => {
        return Math.round((it.basePriceWithMargin || 0) * 100) / 100;
      };

      if (field === 'quantity') {
        const quantity = parseInt(value) || 1;
        item.quantity = quantity;

        // Só recalcular quando o preço veio de cálculo
        if (item.priceSource === 'computed' && item.costPrice && item.costPrice > 0) {
          const currentRevenue = prev.items.reduce((total: number, it: any, i: number) => {
            const qty = i === index ? quantity : it.quantity;
            return total + (it.unitPrice * qty);
          }, 0);

          // NEW FORMULA: Cost = Product Cost + Customizations
          const customUnit = item.hasItemCustomization ? (parseFloat(item.itemCustomizationValue) || 0) : 0;
          const genUnit = item.hasGeneralCustomization ? (parseFloat(item.generalCustomizationValue) || 0) : 0;
          const totalCost = item.costPrice + customUnit + genUnit;

          const priceCalc = calculatePriceFromCost(totalCost, currentRevenue);
          item.minimumPrice = Math.round(priceCalc.minimumPrice * 100) / 100;
          item.basePriceWithMargin = Math.round(priceCalc.idealPrice * 100) / 100;
          item.unitPrice = recalcUnitPrice(item);
        }

        item.totalPrice = calculateItemTotal({ ...item, quantity, unitPrice: item.unitPrice });
      } else if (field === 'unitPrice') {
        const newPrice = parseFloat(value) || 0;
        item.unitPrice = newPrice;
        item.basePriceWithMargin = newPrice; // No novo modelo, o unitPrice é a base com margem total

        item.totalPrice = calculateItemTotal({ ...item, unitPrice: newPrice });

        // Verificar margem mínima contra o custo total (produto + personalização)
        if (item.minimumPrice && item.minimumPrice > 0 && item.unitPrice < item.minimumPrice) {
          toast({
            title: "Atenção",
            description: `Preço Unitário (R$ ${item.unitPrice.toFixed(2)}) abaixo do mínimo sugerido (R$ ${item.minimumPrice.toFixed(2)}). Necessita aprovação do administrador.`,
            variant: "destructive"
          });
        }
      } else if (field === 'itemCustomizationValue' || field === 'generalCustomizationValue' || field === 'hasItemCustomization' || field === 'hasGeneralCustomization') {
        // Update the specific field
        if (field.startsWith('has')) {
          item[field] = Boolean(value);
        } else {
          item[field] = parseFloat(value) || 0;
        }

        // NOVO FLOW: Sempre que mudar personalização, recalcular ideal e mínimo com base no novo custo total
        if (item.priceSource === 'computed' && item.costPrice && item.costPrice > 0) {
          const currentRevenue = prev.items.reduce((total: number, it: any) => {
            return total + (it.unitPrice * it.quantity);
          }, 0);

          const customUnit = item.hasItemCustomization ? (parseFloat(item.itemCustomizationValue) || 0) : 0;
          const genUnit = item.hasGeneralCustomization ? (parseFloat(item.generalCustomizationValue) || 0) : 0;
          const totalCost = item.costPrice + customUnit + genUnit;

          const priceCalc = calculatePriceFromCost(totalCost, currentRevenue);
          item.minimumPrice = Math.round(priceCalc.minimumPrice * 100) / 100;
          item.basePriceWithMargin = Math.round(priceCalc.idealPrice * 100) / 100;
          item.unitPrice = recalcUnitPrice(item);
        } else {
          // Se for preço manual, o unitPrice deve refletir a mudança direta se não houver cálculo de margem ativo
          if (item.priceSource !== 'computed') {
            const customUnit = item.hasItemCustomization ? (parseFloat(item.itemCustomizationValue) || 0) : 0;
            const genUnit = item.hasGeneralCustomization ? (parseFloat(item.generalCustomizationValue) || 0) : 0;
            item.unitPrice = Math.round((item.basePriceWithMargin + customUnit + genUnit) * 100) / 100;
          } else {
            item.unitPrice = recalcUnitPrice(item);
          }
        }

        item.totalPrice = calculateItemTotal(item);
      } else {
        item[field] = value;

        // If it's a discount-related field, recalculate totalPrice
        if (field.includes('Discount') || field.includes('discount')) {
          item.totalPrice = calculateItemTotal({ ...item, [field]: value });
        }
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

    const allAtMinimum = vendorBudgetForm.items.length > 0 && vendorBudgetForm.items.every(
      (item: any) => item.minimumPrice > 0 && (item.basePriceWithMargin || item.unitPrice) <= item.minimumPrice
    );

    if (vendorBudgetForm.hasDiscount && !allAtMinimum) {
      let discountAmount = 0;
      if (vendorBudgetForm.discountType === 'percentage') {
        discountAmount = (subtotal * vendorBudgetForm.discountPercentage) / 100;
      } else if (vendorBudgetForm.discountType === 'value') {
        discountAmount = vendorBudgetForm.discountValue;
      }

      const minimumTotal = vendorBudgetForm.items.reduce((total, item: any) => {
        // No novo modelo, o minimumPrice já é baseado no custo total (produto + personalização)
        const minUnitPrice = item.minimumPrice > 0 ? item.minimumPrice : (item.basePriceWithMargin || item.unitPrice);
        return total + (minUnitPrice * item.quantity);
      }, 0);

      const discountedTotal = Math.max(0, subtotal - discountAmount);
      return Math.max(minimumTotal, discountedTotal);
    }

    return subtotal;
  };

  const calculateItemTotal = (item: any) => {
    // unitPrice já inclui personalização (basePriceWithMargin + customizations)
    const totalPrice = item.unitPrice * item.quantity;

    let subtotal = totalPrice;

    // Aplicar desconto do item (sobre o preço unitário total que agora inclui tudo)
    if (item.hasItemDiscount) {
      if (item.itemDiscountType === 'percentage') {
        const discountAmount = (totalPrice * (parseFloat(item.itemDiscountPercentage) || 0)) / 100;
        subtotal = subtotal - discountAmount;
      } else if (item.itemDiscountType === 'value') {
        subtotal = subtotal - (parseFloat(item.itemDiscountValue) || 0);
      }
    }

    return Math.max(0, subtotal);
  };

  // Calculate credit card interest
  const calculateCreditCardInterest = () => {
    if (!selectedPaymentMethod || selectedPaymentMethod.type !== 'credit_card') return 0;
    if (vendorBudgetForm.installments <= 1) return 0; // No interest for 1x payment

    const interestRate = parseFloat(selectedPaymentMethod.installmentInterest || '0');
    if (interestRate === 0) return 0;

    const subtotal = calculateBudgetTotal();
    const shipping = parseFloat(vendorBudgetForm.shippingCost) || calculateShippingCost();
    const baseTotal = subtotal + shipping;

    // Calculate interest: rate * number of installments (simple interest)
    const interestValue = (baseTotal * interestRate * vendorBudgetForm.installments) / 100;
    return interestValue;
  };

  // Calculate the total including shipping cost
  const calculateTotalWithShipping = () => {
    const subtotal = calculateBudgetTotal();
    const shipping = parseFloat(vendorBudgetForm.shippingCost) || calculateShippingCost();
    const interest = calculateCreditCardInterest();
    return subtotal + shipping + interest;
  };

  useEffect(() => {
    const totalWithShipping = calculateTotalWithShipping();
    if (totalWithShipping > 0) {
      const half = Math.round(totalWithShipping * 100 / 2) / 100;
      setVendorBudgetForm(prev => ({
        ...prev,
        downPayment: half,
        remainingAmount: Math.max(0, totalWithShipping - half)
      }));
    }
  }, [vendorBudgetForm.items, vendorBudgetForm.hasDiscount, vendorBudgetForm.discountPercentage, vendorBudgetForm.discountValue, vendorBudgetForm.shippingCost]);

  useEffect(() => {
    if (vendorBudgetForm.hasDiscount && vendorBudgetForm.items.length > 0) {
      const allAtMinimum = vendorBudgetForm.items.every(
        (item: any) => item.minimumPrice > 0 && (item.basePriceWithMargin || item.unitPrice) <= item.minimumPrice
      );
      if (allAtMinimum) {
        setVendorBudgetForm(prev => ({
          ...prev,
          hasDiscount: false,
          discountPercentage: 0,
          discountValue: 0,
        }));
        toast({
          title: "Desconto removido",
          description: "Todos os produtos estão no preço mínimo. O desconto foi desabilitado automaticamente.",
          variant: "destructive",
        });
      }
    }
  }, [vendorBudgetForm.items]);

  const resetBudgetForm = () => {
    setVendorBudgetForm({
      title: "",
      description: "",
      clientId: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      vendorId: vendorId,
      branchId: "matriz", // Manter matriz como padrão no reset
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
    setSelectedProductForProducer(null);
    setShowProducerSelector(false);
  };

  const createBudgetMutation = useMutation({
    mutationFn: async (data: any) => {
      const interestValue = calculateCreditCardInterest();
      const interestRate = selectedPaymentMethod?.type === 'credit_card' ? parseFloat(selectedPaymentMethod?.installmentInterest || '0') : 0;
      const budgetData = {
        ...data,
        totalValue: calculateTotalWithShipping().toFixed(2),
        interestRate: interestRate,
        interestValue: interestValue.toFixed(2)
      };
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budgetData),
      });
      if (!response.ok) throw new Error("Erro ao criar orçamento");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/vendor", vendorId] });
      queryClient.setQueryData(["/api/budgets/vendor", vendorId], (old: any) => {
        if (!old) return [data];
        const exists = old.find((b: any) => b.id === data.id);
        if (exists) {
          return old.map((b: any) => b.id === data.id ? data : b);
        }
        return [data, ...old];
      });
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
      const interestValue = calculateCreditCardInterest();
      const interestRate = selectedPaymentMethod?.type === 'credit_card' ? parseFloat(selectedPaymentMethod?.installmentInterest || '0') : 0;
      const budgetData = {
        ...data,
        totalValue: calculateTotalWithShipping().toFixed(2),
        interestRate: interestRate,
        interestValue: interestValue.toFixed(2)
      };
      const response = await fetch(`/api/budgets/${editingBudgetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budgetData),
      });
      if (!response.ok) throw new Error("Erro ao atualizar orçamento");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/vendor", vendorId] });
      queryClient.setQueryData(["/api/budgets/vendor", vendorId], (old: any) => {
        if (!old) return [data];
        return old.map((b: any) => b.id === data.id ? data : b);
      });
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

  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [budgetToConvert, setBudgetToConvert] = useState<string | null>(null);
  const [convertClientId, setConvertClientId] = useState("");
  const [convertProducerId, setConvertProducerId] = useState(""); // This state is not used in the current logic, but kept for potential future use.
  const [convertDeliveryDate, setConvertDeliveryDate] = useState(""); // State for delivery date input
  const [viewBudgetDialogOpen, setViewBudgetDialogOpen] = useState(false);
  const [budgetToView, setBudgetToView] = useState<any>(null);

  const convertToOrderMutation = useMutation({
    mutationFn: async ({ budgetId, clientId, deliveryDate }: { budgetId: string; clientId: string; deliveryDate: string }) => {
      const response = await fetch(`/api/budgets/${budgetId}/convert-to-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, deliveryDate }), // Include deliveryDate
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
      setConvertProducerId(""); // Reset producerId as well
      setConvertDeliveryDate(""); // Reset delivery date
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
    if (budgetToConvert && convertClientId && convertDeliveryDate) { // Added convertDeliveryDate validation
      convertToOrderMutation.mutate({
        budgetId: budgetToConvert,
        clientId: convertClientId,
        deliveryDate: convertDeliveryDate, // Pass deliveryDate
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

  const toNumber = (v: any) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return v;

    let s = String(v).trim();

    // remove moeda e espaços
    s = s.replace("R$", "").replace(/\s/g, "");

    // se vier vazio
    if (!s) return 0;

    // Caso 1: formato BR com vírgula decimal (ex: 4.400.050,00 ou 43,95)
    if (s.includes(",")) {
      s = s.replace(/\./g, ""); // remove milhar
      s = s.replace(",", ".");  // troca decimal
    } else {
      // Caso 2: formato US/ISO com ponto decimal (ex: 88.00)
      // não remove o ponto, só remove separadores estranhos
      // (se tiver milhar com vírgula: 4,400,050.00)
      const parts = s.split(".");
      if (parts.length > 2) {
        // muitos pontos -> provavelmente milhar, remove todos e tenta deixar o último como decimal
        const last = parts.pop();
        s = parts.join("") + "." + last;
      }
      s = s.replace(/,/g, ""); // remove milhar por vírgula
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const toDateInputValue = (iso: any) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  const fromDateInputValue = (yyyyMmDd: string) => {
    if (!yyyyMmDd) return null;
    return new Date(yyyyMmDd + "T00:00:00.000Z").toISOString();
  };

  const handleEditBudget = async (budget: any) => {
    console.log('Editing budget:', budget);

    // Fetch full budget details with items
    try {
      const response = await fetch(`/api/budgets/${budget.id}`);
      if (!response.ok) throw new Error('Erro ao buscar orçamento');
      const fullBudget = await response.json();

      console.log('Budget items:', fullBudget.items);

      // Pre-populate form with existing budget data
      const newDownPayment = Number(fullBudget.paymentInfo?.downPayment ?? fullBudget.downPayment ?? 0);
      const newShippingCost = Number(fullBudget.paymentInfo?.shippingCost ?? fullBudget.shippingCost ?? 0);

      // Build the items array first
      const itemsArray = (fullBudget.items || []).map((item: any) => {
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

        const unitPrice = toNumber(item.unitPrice);
        const product = products.find((p: any) => p.id === item.productId);
        const costPrice = product ? parseFloat(product.costPrice) || 0 : 0;

        // Calcular basePriceWithMargin: unitPrice salvo menos as personalizações
        const itemCustomVal = Boolean(item.hasItemCustomization) ? toNumber(item.itemCustomizationValue) : 0;
        const genCustomVal = Boolean(item.hasGeneralCustomization) ? toNumber(item.generalCustomizationValue) : 0;
        const basePriceWithMargin = Math.max(0, Math.round((unitPrice - itemCustomVal - genCustomVal) * 100) / 100);

        return {
          productId: item.productId,
          productName: item.productName || item.product?.name,
          producerId: producerId,
          quantity: Math.max(1, Math.round(toNumber(item.quantity))),
          unitPrice: unitPrice,
          basePriceWithMargin: basePriceWithMargin,
          minimumPrice: 0,
          costPrice: costPrice,
          priceSource: costPrice > 0 ? 'computed' : 'manual',
          totalPrice: toNumber(item.totalPrice),
          // Item Customization - use exact saved values without fallback logic
          hasItemCustomization: Boolean(item.hasItemCustomization),
          selectedCustomizationId: item.selectedCustomizationId || "",
          itemCustomizationValue: toNumber(item.itemCustomizationValue),
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
          itemDiscountPercentage: toNumber(item.itemDiscountPercentage),
          itemDiscountValue: toNumber(item.itemDiscountValue),
          // General Customization - use exact saved values without fallback logic
          hasGeneralCustomization: Boolean(item.hasGeneralCustomization),
          generalCustomizationName: item.generalCustomizationName || "",
          generalCustomizationValue: toNumber(item.generalCustomizationValue),
        };
      });

      // Recalculate minimumPrice for each item based on costPrice and budget revenue
      const budgetRevenue = itemsArray.reduce((sum: number, item: any) => {
        return sum + (toNumber(item.unitPrice) * item.quantity);
      }, 0);
      for (const item of itemsArray) {
        if (item.costPrice && item.costPrice > 0) {
          const priceCalc = calculatePriceFromCost(item.costPrice, budgetRevenue);
          item.minimumPrice = Math.round(priceCalc.minimumPrice * 100) / 100;
        }
      }

      // Calculate the total for this budget to compute remaining amount correctly
      // unitPrice já inclui personalização
      const subtotalItems = itemsArray.reduce((sum: number, item: any) => {
        let itemPrice = toNumber(item.unitPrice);
        if (item.hasItemDiscount) {
          const baseOnly = item.basePriceWithMargin || itemPrice;
          const discountAmount = item.itemDiscountType === "percentage"
            ? (baseOnly * item.itemDiscountPercentage) / 100
            : item.itemDiscountValue;
          itemPrice -= discountAmount;
        }
        return sum + (Math.max(0, itemPrice) * item.quantity);
      }, 0);

      // Remaining amount excludes shipping - shipping is paid upfront with down payment
      const newRemainingAmount = Math.max(0, subtotalItems - newDownPayment);

      setVendorBudgetForm({
        title: fullBudget.title,
        description: fullBudget.description || "",
        clientId: fullBudget.clientId || "",
        contactName: fullBudget.contactName || "",
        contactPhone: fullBudget.contactPhone || "",
        contactEmail: fullBudget.contactEmail || "",
        vendorId: fullBudget.vendorId,
        branchId: fullBudget.branchId || "matriz",
        validUntil: toDateInputValue(fullBudget.validUntil),
        deliveryDeadline: toDateInputValue(fullBudget.deliveryDeadline),
        deliveryType: fullBudget.deliveryType || "delivery",
        items: itemsArray,
        paymentMethodId: fullBudget.paymentInfo?.paymentMethodId || fullBudget.paymentMethodId || "",
        shippingMethodId: fullBudget.paymentInfo?.shippingMethodId || fullBudget.shippingMethodId || "",
        installments: Number(fullBudget.paymentInfo?.installments ?? fullBudget.installments ?? 1),
        downPayment: toNumber(newDownPayment),
        remainingAmount: toNumber(newRemainingAmount),
        shippingCost: toNumber(newShippingCost),
        hasDiscount: Boolean(fullBudget.hasDiscount),
        discountType: fullBudget.discountType || "percentage",
        discountPercentage: toNumber(fullBudget.discountPercentage),
        discountValue: toNumber(fullBudget.discountValue)
      });

      setIsEditMode(true);
      setEditingBudgetId(budget.id);
      setIsBudgetDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar orçamento para edição",
        variant: "destructive",
      });
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

    // Date validation: validUntil cannot be in the past
    const today = new Date().toISOString().split('T')[0];
    if (vendorBudgetForm.validUntil && vendorBudgetForm.validUntil < today) {
      toast({
        title: "Erro de Validação",
        description: "A data de 'Válido Até' não pode ser anterior a hoje.",
        variant: "destructive"
      });
      return;
    }

    // Mandatory fields validation
    if (!vendorBudgetForm.title) {
      toast({ title: "Erro", description: "O título do orçamento é obrigatório.", variant: "destructive" });
      return;
    }

    if (!vendorBudgetForm.contactName) {
      toast({ title: "Erro", description: "O nome de contato é obrigatório.", variant: "destructive" });
      return;
    }
    if (!vendorBudgetForm.paymentMethodId) {
      toast({ title: "Erro", description: "A forma de pagamento é obrigatória.", variant: "destructive" });
      return;
    }
    if (vendorBudgetForm.installments < 1) {
      toast({ title: "Erro", description: "O número de parcelas deve ser pelo menos 1.", variant: "destructive" });
      return;
    }
    if (vendorBudgetForm.deliveryType !== 'pickup' && !vendorBudgetForm.shippingMethodId) {
      toast({ title: "Erro", description: "O método de frete é obrigatório quando o tipo de entrega não é 'Retirada no Local'.", variant: "destructive" });
      return;
    }

    const itemsArray = vendorBudgetForm.items.map(item => ({
      ...item,
      quantity: Math.max(1, Math.round(toNumber(item.quantity))),
      unitPrice: toNumber(item.unitPrice),
      totalPrice: toNumber(item.totalPrice),
      itemCustomizationValue: toNumber(item.itemCustomizationValue),
      generalCustomizationValue: toNumber(item.generalCustomizationValue),
      itemDiscountPercentage: toNumber(item.itemDiscountPercentage),
      itemDiscountValue: toNumber(item.itemDiscountValue),
    }));

    // Calculate total value for the budget
    // unitPrice já inclui personalização
    const subtotal = itemsArray.reduce((sum, item) => {
      let itemPrice = item.unitPrice;

      if (item.hasItemDiscount) {
        const baseOnly = (item as any).basePriceWithMargin || itemPrice;
        const discountAmount = item.itemDiscountType === "percentage"
          ? (baseOnly * item.itemDiscountPercentage) / 100
          : item.itemDiscountValue;
        itemPrice -= discountAmount;
      }

      return sum + (Math.max(0, itemPrice) * item.quantity);
    }, 0);

    const formData = {
      ...vendorBudgetForm,
      validUntil: fromDateInputValue(vendorBudgetForm.validUntil),
      deliveryDeadline: fromDateInputValue(vendorBudgetForm.deliveryDeadline),
      items: itemsArray,
      totalValue: subtotal.toFixed(2),
      downPayment: toNumber(vendorBudgetForm.downPayment),
      remainingAmount: toNumber(vendorBudgetForm.remainingAmount),
      shippingCost: toNumber(vendorBudgetForm.shippingCost),
      discountPercentage: toNumber(vendorBudgetForm.discountPercentage),
      discountValue: toNumber(vendorBudgetForm.discountValue),
    };

    if (isEditMode) {
      updateBudgetMutation.mutate(formData);
    } else {
      createBudgetMutation.mutate(formData);
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
    const statusClasses: Record<string, string> = {
      draft: "status-badge status-pending",
      sent: "status-badge status-confirmed",
      approved: "status-badge status-production",
      rejected: "status-badge status-cancelled",
      converted: "status-badge status-completed",
      awaiting_approval: "bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium",
      admin_approved: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
      not_approved: "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium",
    };

    const statusLabels: Record<string, string> = {
      draft: "Rascunho",
      sent: "Enviado",
      approved: "Aprovado",
      rejected: "Rejeitado",
      converted: "Convertido",
      awaiting_approval: "Aguardando Autorização",
      admin_approved: "Autorizado",
      not_approved: "Não Autorizado",
    };

    return (
      <span className={statusClasses[status] || "status-badge"}>
        {statusLabels[status] || status}
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
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Meus Orçamentos</h1>
          <p className="text-sm md:text-base text-gray-600">Gerencie orçamentos criados para seus clientes</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="budget-title">Título do Orçamento *</Label>
                  <Input
                    id="budget-title"
                    value={vendorBudgetForm.title}
                    onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="budget-validUntil">Válido Até *</Label>
                  <Input
                    id="budget-validUntil"
                    type="date"
                    value={vendorBudgetForm.validUntil}
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

                      setVendorBudgetForm({ ...vendorBudgetForm, validUntil: selectedDate });
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="budget-deliveryDeadline">Prazo de Entrega *</Label>
                  <Select
                    value={vendorBudgetForm.deliveryDeadline ? (() => {
                      try {
                        const today = new Date();
                        const deliveryDate = new Date(vendorBudgetForm.deliveryDeadline);
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

                        setVendorBudgetForm({ ...vendorBudgetForm, deliveryDeadline: deliveryDate.toISOString().split('T')[0] });
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
                  <Label htmlFor="budget-delivery-type">Tipo de Entrega *</Label>
                  <Select
                    value={vendorBudgetForm.deliveryType}
                    onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, deliveryType: value })}
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
                  <Label htmlFor="budget-branch">Filial do Orçamento *</Label>
                  <Select
                    value={vendorBudgetForm.branchId || "matriz"}
                    onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, branchId: value })}
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
                <h3 className="text-lg font-medium">Produtos do Orçamento *</h3>

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

                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-800">{item.productName}</h4>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`customization-toggle-${index}`}
                                checked={item.hasItemCustomization}
                                onCheckedChange={(checked) => updateBudgetItem(index, 'hasItemCustomization', checked)}
                              />
                              <Label htmlFor={`customization-toggle-${index}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                                Personalizar
                              </Label>
                            </div>
                            <div className="h-6 w-px bg-gray-300 mx-1"></div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-blue-600"
                              onClick={() => setEditingDescriptionIndex(editingDescriptionIndex === index ? null : index)}
                              title="Editar descrição no PDF"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeProductFromBudget(index)}
                              title="Remover item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Description editor — toggleable via pencil */}
                        {editingDescriptionIndex === index ? (
                          <div className="mb-3 bg-white/80 rounded-md p-2 border border-blue-200">
                            <Label htmlFor={`description-${index}`} className="text-xs text-blue-700 font-medium flex items-center gap-1 mb-1">
                              <Edit className="h-3 w-3" /> Descrição no PDF
                            </Label>
                            <Textarea
                              id={`description-${index}`}
                              value={item.notes || ''}
                              onChange={(e) => updateBudgetItem(index, 'notes', e.target.value)}
                              rows={2}
                              className="text-sm"
                              placeholder="Descrição que aparecerá para o cliente no PDF..."
                              autoFocus
                            />
                            <p className="text-xs text-blue-500 mt-1">Clique no lápis para fechar</p>
                          </div>
                        ) : (
                          item.notes ? (
                            <div className="mb-3 px-1 min-w-0">
                              <p
                                className="text-[11px] text-gray-400 italic line-clamp-1 opacity-80 hover:line-clamp-none transition-all cursor-help"
                                title={item.notes}
                              >
                                📝 {item.notes}
                              </p>
                            </div>
                          ) : null
                        )}

                        {/* 1. Customization Section (Now First) */}
                        {item.hasItemCustomization && (
                          <div className="bg-white/50 p-2 rounded-lg border border-blue-100 mb-4 space-y-3">
                            <CustomizationSelector
                              productCategory={products.find((p: any) => p.id === item.productId)?.category}
                              quantity={item.quantity}
                              selectedCustomization={item.selectedCustomizationId}
                              onCustomizationChange={(customization) => {
                                if (customization) {
                                  updateBudgetItem(index, 'selectedCustomizationId', customization.id);
                                  updateBudgetItem(index, 'itemCustomizationValue', customization.price);
                                  updateBudgetItem(index, 'itemCustomizationDescription', customization.name);
                                } else {
                                  updateBudgetItem(index, 'selectedCustomizationId', '');
                                  updateBudgetItem(index, 'itemCustomizationValue', 0);
                                  updateBudgetItem(index, 'itemCustomizationDescription', '');
                                  updateBudgetItem(index, 'additionalCustomizationNotes', '');
                                }
                              }}
                              customizationValue={item.itemCustomizationValue || 0}
                              onCustomizationValueChange={(value) => updateBudgetItem(index, 'itemCustomizationValue', value)}
                              customizationDescription={item.itemCustomizationDescription || ''}
                              onCustomizationDescriptionChange={(description) => updateBudgetItem(index, 'itemCustomizationDescription', description)}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Valor Unitário (R$)</Label>
                                <Input
                                  value={item.itemCustomizationValue > 0 ? currencyMask(item.itemCustomizationValue.toString().replace('.', ',')) : ''}
                                  onChange={(e) => {
                                    const value = parseCurrencyValue(e.target.value);
                                    updateBudgetItem(index, 'itemCustomizationValue', value);
                                  }}
                                  placeholder="0,00"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Total da Personalização (R$)</Label>
                                <Input
                                  value={currencyMask((item.quantity * (item.itemCustomizationValue || 0)).toFixed(2).replace('.', ','))}
                                  onChange={(e) => {
                                    const totalValue = parseCurrencyValue(e.target.value);
                                    const unitValue = item.quantity > 0 ? totalValue / item.quantity : 0;
                                    updateBudgetItem(index, 'itemCustomizationValue', unitValue);
                                  }}
                                  placeholder="0,00"
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs">Observações Adicionais (Opcional)</Label>
                              <Input
                                value={item.additionalCustomizationNotes || ''}
                                onChange={(e) => updateBudgetItem(index, 'additionalCustomizationNotes', e.target.value)}
                                placeholder="Observações extras..."
                                className="h-8 text-sm"
                              />
                            </div>

                            {/* Image Upload for Product Customization */}
                            <div>
                              <Label className="text-xs">Imagem da Personalização</Label>
                              <div className="mt-1 flex items-center gap-3">
                                <label className="flex items-center justify-center px-4 h-10 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors flex-1">
                                  <div className="flex items-center gap-2">
                                    <Upload className="h-4 w-4 text-gray-500" />
                                    <span className="text-xs text-gray-500 font-medium">Anexar Arte/Imagem</span>
                                  </div>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleProductImageUpload(e, index)}
                                  />
                                </label>

                                {item.customizationPhoto && (
                                  <div className="relative h-10 w-10 flex-shrink-0">
                                    <img
                                      src={item.customizationPhoto}
                                      alt="Arte"
                                      className="h-10 w-10 object-cover rounded border"
                                    />
                                    <button
                                      onClick={() => removeProductImage(index)}
                                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm"
                                      type="button"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 py-1">
                              <Switch
                                id={`general-customization-${index}`}
                                checked={item.hasGeneralCustomization}
                                onCheckedChange={(checked) => updateBudgetItem(index, 'hasGeneralCustomization', checked)}
                              />
                              <Label htmlFor={`general-customization-${index}`} className="text-xs font-medium flex items-center gap-1 cursor-pointer">
                                <Percent className="h-3 w-3" />
                                Personalização Geral (Manual)
                              </Label>
                            </div>

                            {item.hasGeneralCustomization && (
                              <div className="bg-green-50/50 p-2 rounded border border-green-100 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Tipo/Nome</Label>
                                    <Input
                                      value={item.generalCustomizationName || ''}
                                      onChange={(e) => updateBudgetItem(index, 'generalCustomizationName', e.target.value)}
                                      placeholder="Ex: Silk, Laser..."
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Valor Unit. (R$)</Label>
                                    <Input
                                      value={item.generalCustomizationValue > 0 ? currencyMask(item.generalCustomizationValue.toString().replace('.', ',')) : ''}
                                      onChange={(e) => {
                                        const value = parseCurrencyValue(e.target.value);
                                        updateBudgetItem(index, 'generalCustomizationValue', value);
                                      }}
                                      placeholder="0,00"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. Quantity, Price and Subtotal (Now Second) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                          <div>
                            <Label className="text-sm">Quantidade *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateBudgetItem(index, 'quantity', e.target.value)}
                              className="h-10"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Preço Unitário da Peça (R$)</Label>
                            <Input
                              placeholder="R$ 0,00"
                              value={item.unitPrice > 0 ? currencyMask(item.unitPrice.toString().replace('.', ',')) : ''}
                              onChange={(e) => updateBudgetItem(index, 'unitPrice', parseCurrencyValue(e.target.value))}
                              className="h-10"
                            />
                            {(() => {
                              const basePrice = item.basePriceWithMargin || item.unitPrice;
                              return item.minimumPrice > 0 && basePrice > 0 && basePrice < item.minimumPrice ? (
                                <p className="text-[10px] text-red-600 font-bold mt-1 uppercase">Abaixo do preço mínimo!</p>
                              ) : null;
                            })()}
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Subtotal Item (R$)</Label>
                            <div className="h-10 flex items-center px-3 bg-gray-100 border rounded-md font-semibold text-gray-700">
                              R$ {(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        {/* 3. Dimensions (Now Third) */}
                        <div className="grid grid-cols-3 gap-3 mb-4 p-2 bg-gray-50/50 rounded-lg border border-gray-100">
                          <div>
                            <Label className="text-[10px] uppercase text-gray-500">Larg. (cm)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={item.productWidth}
                              onChange={(e) => updateBudgetItem(index, 'productWidth', e.target.value)}
                              placeholder="0.0"
                              className="h-8 text-xs px-2"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase text-gray-500">Alt. (cm)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={item.productHeight}
                              onChange={(e) => updateBudgetItem(index, 'productHeight', e.target.value)}
                              placeholder="0.0"
                              className="h-8 text-xs px-2"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase text-gray-500">Prof. (cm)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={item.productDepth}
                              onChange={(e) => updateBudgetItem(index, 'productDepth', e.target.value)}
                              placeholder="0.0"
                              className="h-8 text-xs px-2"
                            />
                          </div>
                        </div>

                        {/* 4. Costs Summary */}
                        <div className="pt-2 border-t border-gray-100 space-y-1">
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>Custo Unit. Total (Custo + Pers.):</span>
                            <span className="font-mono">
                              R$ {((item.costPrice || 0) + (item.itemCustomizationValue || 0) + (item.generalCustomizationValue || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-700">Total do Item no Orçamento:</span>
                            <span className="font-bold text-blue-700 text-lg">
                              R$ {calculateItemTotal(item).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Products - NEW FLOW: Product first, then producer (same as admin) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Adicionar Produtos ao Orçamento *
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Product Search and Filter */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Digite nome ou código do produto..."
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

                      {/* Product List - Only show when searching */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                        {(() => {
                          // Only show products when user types at least 2 characters
                          if (budgetProductSearch.length < 2 && budgetCategoryFilter === "all") {
                            return (
                              <div className="col-span-full text-center py-8">
                                <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">
                                  Digite o nome ou código do produto para buscar
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Mínimo 2 caracteres para iniciar a busca
                                </p>
                              </div>
                            );
                          }

                          // Filter products by search term (name, code, description)
                          const filteredProducts = products.filter((product: any) => {
                            const searchTerm = budgetProductSearch.toLowerCase();
                            const matchesSearch = !budgetProductSearch ||
                              product.name?.toLowerCase().includes(searchTerm) ||
                              product.description?.toLowerCase().includes(searchTerm) ||
                              product.id?.toLowerCase().includes(searchTerm) ||
                              product.externalCode?.toLowerCase().includes(searchTerm) ||
                              product.compositeCode?.toLowerCase().includes(searchTerm) ||
                              product.friendlyCode?.toLowerCase().includes(searchTerm);

                            const matchesCategory = budgetCategoryFilter === "all" ||
                              product.category === budgetCategoryFilter;

                            return matchesSearch && matchesCategory;
                          });

                          if (filteredProducts.length === 0) {
                            return (
                              <div className="col-span-full text-center py-8">
                                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500">
                                  Nenhum produto encontrado para "{budgetProductSearch}"
                                </p>
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
                                  Limpar busca
                                </Button>
                              </div>
                            );
                          }

                          return filteredProducts.map((product: any) => {
                            const productCode = product.friendlyCode || product.externalCode || product.compositeCode;

                            // PREÇO CONSISTENTE: Se costPrice != basePrice, significa que basePrice já é o preço de venda calculado.
                            // Se forem iguais, aplicamos a regra do patch.
                            const sale = getProductSalePrice(product, 0, pricingSettings, marginTiers);
                            const displayPrice = sale.price;

                            return (
                              <div
                                key={product.id}
                                className="p-2 border rounded hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                                onClick={() => {
                                  setSelectedProductForProducer(product);
                                  setShowProducerSelector(true);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {product.imageLink ? (
                                    <img
                                      src={product.imageLink}
                                      alt={product.name}
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                      <Package className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{product.name}</p>
                                    {product.friendlyCode ? (
                                      <p className="text-xs text-purple-600 font-mono">Cód: {product.friendlyCode}</p>
                                    ) : productCode && (
                                      <p className="text-xs text-purple-600 font-mono">Cód: {productCode}</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-green-600 font-medium">
                                        R$ {(() => {
                                          const sale = getProductSalePrice(product, 0, pricingSettings, marginTiers);
                                          return sale.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                        })()}
                                      </p>
                                      {product.category && (
                                        <span className="text-xs text-gray-400">• {product.category}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {(budgetProductSearch.length >= 2 || budgetCategoryFilter !== "all") && (
                        <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                          <span>
                            {(() => {
                              const searchTerm = budgetProductSearch.toLowerCase();
                              const filteredProducts = products.filter((product: any) => {
                                const matchesSearch = !budgetProductSearch ||
                                  product.name?.toLowerCase().includes(searchTerm) ||
                                  product.description?.toLowerCase().includes(searchTerm) ||
                                  product.id?.toLowerCase().includes(searchTerm) ||
                                  product.externalCode?.toLowerCase().includes(searchTerm) ||
                                  product.compositeCode?.toLowerCase().includes(searchTerm) ||
                                  product.friendlyCode?.toLowerCase().includes(searchTerm);

                                const matchesCategory = budgetCategoryFilter === "all" ||
                                  product.category === budgetCategoryFilter;

                                return matchesSearch && matchesCategory;
                              });
                              return `${filteredProducts.length} produto(s) encontrado(s)`;
                            })()}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBudgetProductSearch("");
                              setBudgetCategoryFilter("all");
                            }}
                          >
                            Limpar busca
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Producer Selector Dialog - appears after product selected */}
                    {showProducerSelector && selectedProductForProducer && (
                      <Dialog open={showProducerSelector} onOpenChange={setShowProducerSelector}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Selecionar Produtor</DialogTitle>
                            <DialogDescription>
                              Escolha qual produtor executará o produto: <strong>{selectedProductForProducer.name}</strong>
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => {
                                addProductToBudget(selectedProductForProducer, 'internal');
                                setShowProducerSelector(false);
                                setSelectedProductForProducer(null);
                              }}
                            >
                              Produtos Internos
                            </Button>
                            {producers?.map((producer: any) => (
                              <Button
                                key={producer.id}
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => {
                                  addProductToBudget(selectedProductForProducer, producer.id);
                                  setShowProducerSelector(false);
                                  setSelectedProductForProducer(null);
                                }}
                              >
                                {producer.name} - {producer.specialty}
                              </Button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
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
                    <Label htmlFor="payment-method">Forma de Pagamento *</Label>
                    <Select value={vendorBudgetForm.paymentMethodId || ""} onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, paymentMethodId: value })} required>
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
                    <Label htmlFor="shipping-method">Método de Frete *</Label>
                    <Select value={vendorBudgetForm.shippingMethodId || ""} onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, shippingMethodId: value })} required>
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
                          <Label htmlFor="installments">Número de Parcelas *</Label>
                          <Select value={vendorBudgetForm.installments?.toString() || "1"} onValueChange={(value) => setVendorBudgetForm({ ...vendorBudgetForm, installments: parseInt(value) })} required>
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
                        <Label htmlFor="down-payment">Valor de Entrada (R$) *</Label>
                        <Input
                          id="down-payment"
                          value={vendorBudgetForm.downPayment > 0 ? currencyMask(vendorBudgetForm.downPayment.toString().replace('.', ',')) : ''}
                          onChange={(e) => {
                            const downPayment = parseCurrencyValue(e.target.value);
                            setVendorBudgetForm({
                              ...vendorBudgetForm,
                              downPayment,
                            });
                          }}
                          placeholder="R$ 0,00"
                          required
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
                        <Label htmlFor="shipping-cost">Valor do Frete (R$) *</Label>
                        <Input
                          id="shipping-cost"
                          value={vendorBudgetForm.shippingCost > 0 ? currencyMask(vendorBudgetForm.shippingCost.toString().replace('.', ',')) : ''}
                          onChange={(e) => {
                            const shippingCost = parseCurrencyValue(e.target.value);
                            setVendorBudgetForm({
                              ...vendorBudgetForm,
                              shippingCost,
                            });
                          }}
                          placeholder="R$ 0,00"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Valor do frete será somado ao total do orçamento</p>
                      </div>
                      <div>
                        <Label>Prazo Estimado de Entrega</Label>
                        <Input
                          placeholder="Ex: 15 dias"
                          value={vendorBudgetForm.deliveryDeadline}
                          onChange={(e) => setVendorBudgetForm({ ...vendorBudgetForm, deliveryDeadline: e.target.value })}
                        />
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
                              return total + (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1);
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
                    {(() => {
                      const itemsSubtotal = vendorBudgetForm.items.reduce((total, item) => {
                        return total + (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1);
                      }, 0);
                      const minimumTotal = vendorBudgetForm.items.reduce((total, item: any) => {
                        const minBase = item.minimumPrice > 0 ? item.minimumPrice : (item.basePriceWithMargin || item.unitPrice);
                        const customUnit = item.hasItemCustomization ? (parseFloat(item.itemCustomizationValue) || 0) : 0;
                        const genUnit = item.hasGeneralCustomization ? (parseFloat(item.generalCustomizationValue) || 0) : 0;
                        const minUnitPrice = minBase + customUnit + genUnit;
                        return total + (minUnitPrice * (parseInt(item.quantity) || 1));
                      }, 0);
                      let discountAmt = 0;
                      if (vendorBudgetForm.discountType === 'percentage') {
                        discountAmt = (itemsSubtotal * (parseFloat(vendorBudgetForm.discountPercentage) || 0)) / 100;
                      } else {
                        discountAmt = parseFloat(vendorBudgetForm.discountValue) || 0;
                      }
                      const discountedTotal = itemsSubtotal - discountAmt;
                      if (discountedTotal < minimumTotal && vendorBudgetForm.items.length > 0) {
                        return (
                          <p className="text-xs text-orange-600 mt-1 font-semibold">
                            ⚠️ Desconto abaixo do preço mínimo - Requer autorização do administrador
                          </p>
                        );
                      }
                      return null;
                    })()}
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
                        return total + item.unitPrice * item.quantity;
                      }, 0);
                      return itemsSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    })()}</span>
                  </div>
                  {vendorBudgetForm.hasDiscount && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Desconto:</span>
                      <span>- R$ {(() => {
                        const itemsSubtotal = vendorBudgetForm.items.reduce((total, item) => {
                          return total + item.unitPrice * item.quantity;
                        }, 0);

                        if (vendorBudgetForm.discountType === 'percentage') {
                          return ((itemsSubtotal * vendorBudgetForm.discountPercentage) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        } else {
                          return vendorBudgetForm.discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        }
                      })()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Subtotal com Desconto:</span>
                    <span>R$ {calculateBudgetTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Valor da Entrada:</span>
                    <span>R$ {vendorBudgetForm.downPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Valor do Frete:</span>
                    <span>
                      {vendorBudgetForm.deliveryType === "pickup" ?
                        "R$ 0,00" :
                        `R$ ${(parseFloat(vendorBudgetForm.shippingCost) || calculateShippingCost()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      }
                    </span>
                  </div>
                  {calculateCreditCardInterest() > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Juros do Cartão ({selectedPaymentMethod?.installmentInterest}% x {vendorBudgetForm.installments}x):</span>
                      <span>R$ {calculateCreditCardInterest().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium text-blue-600 bg-blue-50 p-2 rounded">
                    <span>Entrada + Frete (para financeiro):</span>
                    <span>R$ {(vendorBudgetForm.downPayment + (vendorBudgetForm.deliveryType === "pickup" ? 0 : (parseFloat(vendorBudgetForm.shippingCost) || calculateShippingCost()))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <Card className="card-hover">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Rascunhos</p>
                <p className="text-xl md:text-3xl font-bold gradient-text">
                  {budgets?.filter((b: any) => b.status === 'draft').length || 0}
                </p>
              </div>
              <div className="w-8 h-8 md:w-12 md:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 md:h-6 md:w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Enviados</p>
                <p className="text-xl md:text-3xl font-bold gradient-text">
                  {budgets?.filter((b: any) => b.status === 'sent').length || 0}
                </p>
              </div>
              <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Send className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Aguardando Autorização</p>
                <p className="text-xl md:text-3xl font-bold text-orange-600">
                  {budgets?.filter((b: any) => b.status === 'awaiting_approval').length || 0}
                </p>
              </div>
              <div className="w-8 h-8 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 md:h-6 md:w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Aprovados</p>
                <p className="text-xl md:text-3xl font-bold gradient-text">
                  {budgets?.filter((b: any) => b.status === 'approved' || b.status === 'admin_approved' || b.status === 'converted').length || 0}
                </p>
              </div>
              <div className="w-8 h-8 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
              <SelectItem value="converted">Convertido</SelectItem>
              <SelectItem value="awaiting_approval">Aguardando Autorização</SelectItem>
              <SelectItem value="admin_approved">Autorizado</SelectItem>
              <SelectItem value="not_approved">Não Autorizado</SelectItem>
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

      {/* Seção de Orçamentos Aguardando Autorização do Admin */}
      {budgets?.filter((budget: any) => budget.status === 'awaiting_approval').length > 0 && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            ⏳ Aguardando Autorização do Administrador
          </h3>
          <p className="text-sm text-orange-700 mb-3">
            Estes orçamentos possuem itens com preço abaixo do mínimo e precisam de autorização do administrador antes de serem convertidos em pedido.
          </p>
          <div className="space-y-2">
            {budgets.filter((budget: any) => budget.status === 'awaiting_approval').map((budget: any) => (
              <div key={budget.id} className="bg-white p-3 rounded border border-orange-200 flex justify-between items-center">
                <div>
                  <p className="font-medium">{budget.title}</p>
                  <p className="text-sm text-gray-600">Cliente: {budget.contactName}</p>
                  <p className="text-sm text-gray-600">Total: R$ {parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewBudget(budget)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalhes
                  </Button>
                  <span className="text-xs text-orange-600 font-medium px-3 py-1.5 bg-orange-100 rounded-full flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Aguardando autorização
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção de Orçamentos Não Autorizados pelo Admin */}
      {budgets?.filter((budget: any) => budget.status === 'not_approved').length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
            <X className="h-5 w-5" />
            ❌ Orçamentos Não Autorizados
          </h3>
          <p className="text-sm text-red-700 mb-3">
            Estes orçamentos foram rejeitados pelo administrador. Edite os preços para atender ao mínimo exigido e reenvie para nova análise.
          </p>
          <div className="space-y-2">
            {budgets.filter((budget: any) => budget.status === 'not_approved').map((budget: any) => (
              <div key={budget.id} className="bg-white p-3 rounded border border-red-200 flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-medium">{budget.title}</p>
                  <p className="text-sm text-gray-600">Cliente: {budget.contactName}</p>
                  <p className="text-sm text-gray-600">Total: R$ {parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  {budget.adminRejectionReason && (
                    <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                      <span className="font-medium text-red-800">Motivo da rejeição:</span>
                      <p className="text-red-700">{budget.adminRejectionReason}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewBudget(budget)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={() => handleEditBudget(budget)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar e Reenviar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção de Orçamentos Aprovados - Aguardando Conversão */}
      {budgets?.filter((budget: any) => budget.status === 'approved' || budget.status === 'admin_approved').length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            🔔 Orçamentos Aprovados - Prontos para Conversão
          </h3>
          <div className="space-y-2">
            {budgets.filter((budget: any) => budget.status === 'approved' || budget.status === 'admin_approved').map((budget: any) => (
              <div key={budget.id} className="bg-white p-3 rounded border border-green-200 flex justify-between items-center">
                <div>
                  <p className="font-medium">{budget.title}</p>
                  <p className="text-sm text-gray-600">Cliente: {budget.contactName}</p>
                  <p className="text-sm text-green-600 font-medium">Total: R$ {parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  {budget.status === 'admin_approved' && (
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                      Autorizado pelo Admin
                    </span>
                  )}
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
                      setBudgetToConvert(budget.id);
                      setConvertDialogOpen(true);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Converter em Pedido
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
                      R$ {parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        {getStatusBadge(budget.status)}
                        {budget.clientObservations && (
                          <div className={`text-xs p-1 rounded ${budget.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {budget.clientObservations}
                          </div>
                        )}
                        {budget.status === 'not_approved' && budget.adminRejectionReason && (
                          <div className="text-xs p-1 rounded bg-red-100 text-red-700 max-w-[200px] truncate" title={budget.adminRejectionReason}>
                            Motivo: {budget.adminRejectionReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
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
                        {(budget.status === 'approved' || budget.status === 'admin_approved') && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              handleConvertClick(budget.id);
                            }}
                            data-testid={`button-convert-${budget.id}`}
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Converter
                          </Button>
                        )}
                        {budget.status === 'not_approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-900"
                            onClick={() => handleEditBudget(budget)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        )}
                        {budget.status === 'awaiting_approval' && (
                          <span className="text-xs text-orange-500 px-2 py-1 bg-orange-50 rounded-full flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Aguardando
                          </span>
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
              {/* Approval Status Alerts */}
              {budgetToView.status === 'awaiting_approval' && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-800">Aguardando Autorização do Administrador</p>
                    <p className="text-sm text-orange-700 mt-1">
                      Este orçamento possui itens com preço abaixo do mínimo permitido. A conversão em pedido está bloqueada até a autorização do administrador.
                    </p>
                  </div>
                </div>
              )}
              {budgetToView.status === 'not_approved' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <X className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-800">Orçamento Não Autorizado</p>
                    <p className="text-sm text-red-700 mt-1">
                      O administrador rejeitou este orçamento. Edite os preços para atender ao mínimo exigido e reenvie para nova análise.
                    </p>
                    {budgetToView.adminRejectionReason && (
                      <div className="mt-2 p-2 bg-red-100 rounded">
                        <span className="font-medium text-red-800 text-sm">Motivo da rejeição:</span>
                        <p className="text-red-700 text-sm mt-0.5">{budgetToView.adminRejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {budgetToView.status === 'admin_approved' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <ShoppingCart className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">Orçamento Autorizado pelo Administrador</p>
                    <p className="text-sm text-green-700 mt-1">
                      Este orçamento foi autorizado mesmo com preços abaixo do mínimo. Você pode convertê-lo em pedido.
                    </p>
                  </div>
                </div>
              )}

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
                                <p className="font-medium">{Number(item.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <div>
                          <Label className="text-xs md:text-sm font-medium">Produto</Label>
                          <p className="font-semibold text-sm md:text-base">{item.productName}</p>
                        </div>
                        <div>
                          <Label className="text-xs md:text-sm font-medium">Quantidade</Label>
                          <p className="text-sm md:text-base">{Number(item.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                          <Label className="text-xs md:text-sm font-medium">Preço Unitário</Label>
                          <p className="text-sm md:text-base">R$ {parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <Label className="text-xs md:text-sm font-medium">Subtotal</Label>
                          <p className="font-semibold text-sm md:text-base">
                            R$ {(parseFloat(item.unitPrice) * parseInt(item.quantity)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Product Size Information */}
                      {(item.productWidth || item.productHeight || item.productDepth) && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <Label className="text-sm font-medium">Dimensões (cm)</Label>
                          <div className="grid grid-cols-3 gap-2 md:gap-4 mt-2">
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
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                            <div>
                              <Label className="text-xs md:text-sm font-medium">Qtd. Personalizada</Label>
                              <p className="text-sm">{item.customizationQuantity || 0} unidades</p>
                            </div>
                            <div>
                              <Label className="text-xs md:text-sm font-medium">Valor Unit. Personalização</Label>
                              <p className="text-sm">R$ {parseFloat(item.itemCustomizationValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <Label className="text-xs md:text-sm font-medium">Total Personalização</Label>
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

                      {item.hasGeneralCustomization && (
                        <div className="mt-3 p-3 bg-green-50 rounded">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Nome da Personalização Geral</Label>
                              <p>{item.generalCustomizationName || 'N/A'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Valor Unit. Personalização Geral</Label>
                              <p>R$ {parseFloat(item.generalCustomizationValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <Label className="text-sm font-medium">Total do Item (Produto + Personalização Geral)</Label>
                            <p className="font-semibold text-lg">
                              R$ {(() => {
                                const productTotal = parseFloat(item.unitPrice) * parseInt(item.quantity);
                                const generalCustomizationTotal = (item.quantity || 0) * parseFloat(item.generalCustomizationValue || 0);
                                return (productTotal + generalCustomizationTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                              })()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                  }
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

                {(budgetToView.status === 'approved' || budgetToView.status === 'admin_approved') && (
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
                {budgetToView.status === 'not_approved' && (
                  <Button
                    variant="outline"
                    className="text-orange-600 border-orange-300"
                    onClick={() => {
                      setViewBudgetDialogOpen(false);
                      handleEditBudget(budgetToView);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar e Reenviar
                  </Button>
                )}
                {budgetToView.status === 'awaiting_approval' && (
                  <span className="text-sm text-orange-600 font-medium px-3 py-2 bg-orange-50 rounded-lg flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Conversão bloqueada - aguardando autorização
                  </span>
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
                setConvertProducerId(""); // Reset producerId as well
                setConvertDeliveryDate(""); // Reset delivery date
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmConvert}
              disabled={convertToOrderMutation.isPending || !convertClientId || !convertDeliveryDate} // Added convertDeliveryDate validation
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