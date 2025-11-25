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
import { Plus, FileText, Send, Eye, Search, ShoppingCart, Calculator, Package, Percent, Trash2, CheckCircle, Edit, Clock, DollarSign, Factory } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { CustomizationSelector } from "@/components/customization-selector";
import { phoneMask, currencyMask, parseCurrencyValue } from "@/utils/masks";
// Import Badge from shadcn/ui for the logistics dashboard
import { Badge } from "@/components/ui/badge";


export default function VendorOrders() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const vendorId = user.id; // Use actual vendor ID from logged user
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [orderProductSearch, setOrderProductSearch] = useState("");
  const [orderCategoryFilter, setOrderCategoryFilter] = useState("all");

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
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

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const { url } = await response.json();

      updateOrderItem(itemIndex, 'customizationPhoto', url);

      toast({
        title: "Sucesso!",
        description: "Imagem enviada com sucesso"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar imagem",
        variant: "destructive"
      });
    }
  };

  const removeProductImage = (itemIndex: number) => {
    updateOrderItem(itemIndex, 'customizationPhoto', '');
  };

  // State for product/producer selection - NEW FLOW: Product first, then producer (same as budget)
  const [selectedProductForProducer, setSelectedProductForProducer] = useState<any>(null);
  const [showProducerSelector, setShowProducerSelector] = useState(false);

  // Order form state - isolated for vendor
  const [vendorOrderForm, setVendorOrderForm] = useState({
    title: "",
    description: "",
    clientId: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    vendorId: vendorId,
    branchId: "matriz", // Definir matriz como padrão
    deadline: "",
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

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/vendors", vendorId, "orders"],
    queryFn: async () => {
      const response = await fetch(`/api/vendors/${vendorId}/orders`);
      if (!response.ok) throw new Error('Failed to fetch vendor orders');
      return response.json();
    },
  });

  const { data: vendorCommissions } = useQuery({
    queryKey: ["/api/commissions/vendor", vendorId],
    queryFn: async () => {
      const response = await fetch(`/api/commissions/vendor/${vendorId}`);
      if (!response.ok) throw new Error('Failed to fetch vendor commissions');
      return response.json();
    },
  });

  // Buscar status de produção para pedidos em produção
  const { data: productionStatuses } = useQuery({
    queryKey: ["/api/production-orders/status", vendorId],
    queryFn: async () => {
      const response = await fetch(`/api/production-orders/vendor/${vendorId}/status`);
      if (!response.ok) return {};
      const data = await response.json();
      // Converter para um objeto para facilitar lookup
      const statusMap: { [key: string]: any } = {};
      data.forEach((po: any) => {
        if (po.orderId) {
          statusMap[po.orderId] = po;
        }
      });
      return statusMap;
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

  const { data: producers } = useQuery({
    queryKey: ["/api/producers"],
    queryFn: async () => {
      const response = await fetch('/api/producers');
      if (!response.ok) throw new Error('Failed to fetch producers');
      return response.json();
    },
  });

  const products = productsData?.products || [];
  const categorySet = new Set<string>();
  (products || []).forEach((product: any) => {
    if (product.category && typeof product.category === 'string') {
      categorySet.add(product.category);
    }
  });
  const categories: string[] = ['all', ...Array.from(categorySet)];

  // Helper variables for selected payment and shipping methods
  const selectedPaymentMethod = paymentMethods?.find((pm: any) => pm.id === vendorOrderForm.paymentMethodId);
  const selectedShippingMethod = shippingMethods?.find((sm: any) => sm.id === vendorOrderForm.shippingMethodId);

  // Calculate shipping cost based on selected method and delivery type
  const calculateShippingCost = () => {
    // If pickup, no shipping cost
    if (vendorOrderForm.deliveryType === "pickup") return 0;

    if (!selectedShippingMethod) return 0;

    const subtotal = calculateOrderTotal();

    if (selectedShippingMethod.type === "free") return 0;
    if (selectedShippingMethod.freeShippingThreshold > 0 && subtotal >= selectedShippingMethod.freeShippingThreshold) return 0;
    if (selectedShippingMethod.type === "fixed") return parseFloat(selectedShippingMethod.basePrice);

    // For calculated, return base price as placeholder (could integrate with shipping API)
    return parseFloat(selectedShippingMethod.basePrice || "0");
  };

  // Order functions
  const addProductToOrder = (product: any, producerId: string) => {
    const newItem = {
      productId: product.id,
      productName: product.name,
      producerId: producerId, // Add producerId to the item
      quantity: 1,
      unitPrice: parseFloat(product.basePrice),
      totalPrice: parseFloat(product.basePrice),
      hasItemCustomization: false,
      selectedCustomizationId: "",
      itemCustomizationValue: 0,
      itemCustomizationDescription: "",
      additionalCustomizationNotes: "",
      customizationPhoto: "",
      hasGeneralCustomization: false,
      generalCustomizationName: "",
      generalCustomizationValue: 0,
      productWidth: "",
      productHeight: "",
      productDepth: "",
      hasItemDiscount: false,
      itemDiscountType: "percentage",
      itemDiscountPercentage: 0,
      itemDiscountValue: 0
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
        // Recalculate totalPrice based on unitPrice and quantity, excluding customization for now
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
    const subtotal = vendorOrderForm.items.reduce((total, item) => {
      return total + calculateItemTotal(item);
    }, 0);

    // Apply general discount
    if (vendorOrderForm.hasDiscount) {
      if (vendorOrderForm.discountType === 'percentage') {
        const discountAmount = (subtotal * vendorOrderForm.discountPercentage) / 100;
        return Math.max(0, subtotal - discountAmount);
      } else if (vendorOrderForm.discountType === 'value') {
        return Math.max(0, subtotal - vendorOrderForm.discountValue);
      }
    }

    return subtotal;
  };

  const calculateItemTotal = (item: any) => {
    const basePrice = item.unitPrice * item.quantity;
    const customizationValue = item.hasItemCustomization ? item.quantity * (item.itemCustomizationValue || 0) : 0;
    const generalCustomizationValue = item.hasGeneralCustomization ? item.quantity * (item.generalCustomizationValue || 0) : 0;
    let subtotal = basePrice + customizationValue + generalCustomizationValue;

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
    const subtotal = calculateOrderTotal();
    const shipping = parseFloat(vendorOrderForm.shippingCost) || calculateShippingCost();
    return subtotal + shipping;
  };

  const resetOrderForm = () => {
    setVendorOrderForm({
      title: "",
      description: "",
      clientId: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      vendorId: vendorId,
      branchId: "matriz", // Manter matriz como padrão no reset
      deadline: "",
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
    setEditingOrderId(null);
    setSelectedProductForProducer(null);
    setShowProducerSelector(false);
  };

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      // Ensure we're using the userId for clientId to match the order structure
      const selectedClient = clients?.find(c => c.id === data.clientId);

      // Create proper order structure
      const orderData = {
        clientId: selectedClient?.userId || data.clientId, // Use userId for proper client linking
        vendorId: data.vendorId,
        product: data.title, // Use title as product name
        description: data.description || "",
        totalValue: calculateTotalWithShipping().toFixed(2),
        deadline: data.deadline || null,
        deliveryDeadline: data.deliveryDeadline || null,
        status: "confirmed",
        // Contact information
        contactName: data.contactName,
        contactPhone: data.contactPhone || "",
        contactEmail: data.contactEmail || "",
        // Delivery type
        deliveryType: data.deliveryType || "delivery",
        // Payment and shipping info
        paymentMethodId: data.paymentMethodId || "",
        shippingMethodId: data.shippingMethodId || "",
        installments: data.installments || 1,
        downPayment: data.downPayment || 0,
        remainingAmount: data.remainingAmount || 0,
        shippingCost: data.shippingCost || 0,
        // Discount info
        hasDiscount: data.hasDiscount || false,
        discountType: data.discountType || "percentage",
        discountPercentage: data.discountPercentage || 0,
        discountValue: data.discountValue || 0,
        // Items
        items: data.items || []
      };

      console.log("Creating order with data:", orderData);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Order creation failed:", errorText);
        throw new Error("Erro ao criar pedido: " + errorText);
      }
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

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const selectedClient = clients?.find(c => c.id === data.clientId);

      // Create proper order structure for update
      const orderData = {
        clientId: selectedClient?.userId || data.clientId,
        vendorId: data.vendorId,
        product: data.title, // Use title as product name
        description: data.description || "",
        totalValue: calculateTotalWithShipping().toFixed(2),
        deadline: data.deadline || null,
        deliveryDeadline: data.deliveryDeadline || null,
        // Contact information
        contactName: data.contactName,
        contactPhone: data.contactPhone || "",
        contactEmail: data.contactEmail || "",
        // Delivery type
        deliveryType: data.deliveryType || "delivery",
        // Payment and shipping info
        paymentMethodId: data.paymentMethodId || "",
        shippingMethodId: data.shippingMethodId || "",
        installments: data.installments || 1,
        downPayment: data.downPayment || 0,
        remainingAmount: data.remainingAmount || 0,
        shippingCost: data.shippingCost || 0,
        // Discount info
        hasDiscount: data.hasDiscount || false,
        discountType: data.discountType || "percentage",
        discountPercentage: data.discountPercentage || 0,
        discountValue: data.discountValue || 0,
        // Items
        items: data.items || []
      };

      console.log("Updating order with data:", orderData);

      const response = await fetch(`/api/orders/${editingOrderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Order update failed:", errorText);
        throw new Error("Erro ao atualizar pedido: " + errorText);
      }
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
        description: "Pedido atualizado com sucesso",
      });
    },
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



  const handleEditOrder = async (order: any) => {
    console.log('Editing order:', order);

    // Fetch full order details with items
    try {
      const response = await fetch(`/api/orders/${order.id}`);
      if (!response.ok) throw new Error('Erro ao buscar pedido');
      const fullOrder = await response.json();
      
      console.log('Order items:', fullOrder.items);

      // Pre-populate form with existing order data
      setVendorOrderForm({
        title: fullOrder.product || fullOrder.title || "",
        description: fullOrder.description || "",
        clientId: fullOrder.clientId || "",
        contactName: fullOrder.contactName || "",
        contactPhone: fullOrder.contactPhone || "",
        contactEmail: fullOrder.contactEmail || "",
        vendorId: fullOrder.vendorId,
        branchId: fullOrder.branchId || "", // Incluir branchId do pedido existente
        deadline: fullOrder.deadline || "",
        deliveryDeadline: fullOrder.deliveryDeadline || "",
        deliveryType: fullOrder.deliveryType || "delivery",
        items: fullOrder.items?.map((item: any) => {
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

        console.log(`Mapping item ${item.productName}: producerId=${producerId}`);

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
          hasGeneralCustomization: item.hasGeneralCustomization || false,
          generalCustomizationName: item.generalCustomizationName || "",
          generalCustomizationValue: parseFloat(item.generalCustomizationValue || 0),
          productWidth: item.productWidth || "",
          productHeight: item.productHeight || "",
          productDepth: item.productDepth || "",
          hasItemDiscount: item.hasItemDiscount || false,
          itemDiscountType: item.itemDiscountType || "percentage",
          itemDiscountPercentage: parseFloat(item.itemDiscountPercentage || 0),
          itemDiscountValue: parseFloat(item.itemDiscountValue || 0)
        };
      }) || [],
      paymentMethodId: fullOrder.paymentInfo?.paymentMethodId || fullOrder.paymentMethodId || "",
      shippingMethodId: fullOrder.paymentInfo?.shippingMethodId || fullOrder.shippingMethodId || "",
      installments: Number(fullOrder.paymentInfo?.installments ?? fullOrder.installments ?? 1),
      downPayment: Number(fullOrder.paymentInfo?.downPayment ?? fullOrder.downPayment ?? 0),
      remainingAmount: Number(fullOrder.paymentInfo?.remainingAmount ?? fullOrder.remainingAmount ?? 0),
      shippingCost: Number(fullOrder.paymentInfo?.shippingCost ?? fullOrder.shippingCost ?? 0),
      hasDiscount: Boolean(fullOrder.hasDiscount),
      discountType: fullOrder.discountType || "percentage",
      discountPercentage: Number(fullOrder.discountPercentage ?? 0),
      discountValue: Number(fullOrder.discountValue ?? 0)
      });

      setIsEditMode(true);
      setEditingOrderId(order.id);
      setIsOrderDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar pedido para edição",
        variant: "destructive",
      });
    }
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar produtos obrigatórios
    if (vendorOrderForm.items.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto ao pedido",
        variant: "destructive"
      });
      return;
    }

    // Garantir que sempre tenha uma filial (matriz como padrão)
    if (!vendorOrderForm.branchId) {
      setVendorOrderForm(prev => ({ ...prev, branchId: "matriz" }));
    }

    // Validar campos obrigatórios
    if (!vendorOrderForm.title) {
      toast({ title: "Erro", description: "O título do pedido é obrigatório.", variant: "destructive" });
      return;
    }
    if (!vendorOrderForm.contactName) {
      toast({ title: "Erro", description: "O nome de contato é obrigatório.", variant: "destructive" });
      return;
    }
    if (!vendorOrderForm.paymentMethodId) {
      toast({ title: "Erro", description: "A forma de pagamento é obrigatória.", variant: "destructive" });
      return;
    }
    if (vendorOrderForm.installments < 1) {
      toast({ title: "Erro", description: "O número de parcelas deve ser pelo menos 1.", variant: "destructive" });
      return;
    }
    if (vendorOrderForm.deliveryType !== 'pickup' && !vendorOrderForm.shippingMethodId) {
      toast({ title: "Erro", description: "O método de frete é obrigatório quando o tipo de entrega não é 'Retirada no Local'.", variant: "destructive" });
      return;
    }

    // Validar datas obrigatórias
    if (!vendorOrderForm.deadline) {
      toast({
        title: "Erro",
        description: "O prazo de produção é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!vendorOrderForm.deliveryDeadline) {
      toast({
        title: "Erro",
        description: "O prazo de entrega é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Validar datas não podem ser no passado
    const today = new Date().toISOString().split('T')[0];
    if (vendorOrderForm.deadline < today) {
      toast({
        title: "Erro",
        description: "O prazo de produção não pode ser anterior a hoje",
        variant: "destructive"
      });
      return;
    }

    if (isEditMode) {
      updateOrderMutation.mutate(vendorOrderForm);
    } else {
      createOrderMutation.mutate(vendorOrderForm);
    }
  };

  const getStatusBadge = (status: string, productionStatus?: any) => {
    // Se houver status de produção, usar ele como prioridade
    if (productionStatus && status === 'production') {
      const productionStatusClasses = {
        pending: "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium",
        accepted: "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium",
        production: "bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium",
        ready: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
        shipped: "bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full text-xs font-medium",
        completed: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
        rejected: "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium",
      };

      const productionStatusLabels = {
        pending: "Aguardando Produtor",
        accepted: "Aceito pelo Produtor",
        production: "Em Produção",
        ready: "Pronto para Envio",
        shipped: "Enviado",
        completed: "Finalizado",
        rejected: "Rejeitado",
      };

      return (
        <span className={productionStatusClasses[productionStatus.status as keyof typeof productionStatusClasses] || "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"}>
          {productionStatusLabels[productionStatus.status as keyof typeof productionStatusLabels] || productionStatus.status}
        </span>
      );
    }

    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium",
      confirmed: "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium",
      production: "bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium",
      delayed: "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium",
      ready: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
      shipped: "bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full text-xs font-medium",
      delivered: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
      cancelled: "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium",
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
      <span className={statusClasses[status as keyof typeof statusClasses] || "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  // Filter orders based on search term, status, and period
  const filteredOrders = orders?.filter((order: any) => {
    const matchesSearch = searchTerm === "" ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.contactName?.toLowerCase().includes(searchTerm.toLowerCase()); // Added contactName search

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
        <Dialog open={isOrderDialogOpen} onOpenChange={(open) => {
          setIsOrderDialogOpen(open);
          if (open && !isEditMode) {
            // Reset form when opening for new order
            resetOrderForm();
            setOrderProductSearch("");
            setOrderCategoryFilter("all");
          }
        }}>
          <DialogTrigger asChild>
            <Button
              className="gradient-bg text-white"
              onClick={() => {
                // Ensure we're in create mode when clicking new order
                setIsEditMode(false);
                setEditingOrderId(null);
                resetOrderForm();
                setOrderProductSearch("");
                setOrderCategoryFilter("all");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Editar Pedido" : "Criar Novo Pedido"}</DialogTitle>
              <DialogDescription>
                {isEditMode ? "Modifique os dados do pedido existente" : "Crie um pedido personalizado com produtos do catálogo"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleOrderSubmit} className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="order-title">Título do Pedido *</Label>
                  <Input
                    id="order-title"
                    value={vendorOrderForm.title}
                    onChange={(e) => setVendorOrderForm({ ...vendorOrderForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="order-deadline">Prazo de Produção *</Label>
                  <Input
                    id="order-deadline"
                    type="date"
                    value={vendorOrderForm.deadline}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      const today = new Date().toISOString().split('T')[0];
                      
                      if (selectedDate < today) {
                        toast({
                          title: "Data Inválida",
                          description: "O prazo de produção não pode ser anterior à data de hoje.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      setVendorOrderForm({ ...vendorOrderForm, deadline: selectedDate });
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="order-deliveryDeadline">Prazo de Entrega *</Label>
                  <Select
                    value={vendorOrderForm.deliveryDeadline ? (() => {
                      try {
                        const today = new Date();
                        const deliveryDate = new Date(vendorOrderForm.deliveryDeadline);
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
                        
                        setVendorOrderForm({ ...vendorOrderForm, deliveryDeadline: deliveryDate.toISOString().split('T')[0] });
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
                  <Label htmlFor="order-delivery-type">Tipo de Entrega *</Label>
                  <Select
                    value={vendorOrderForm.deliveryType}
                    onValueChange={(value) => setVendorOrderForm({ ...vendorOrderForm, deliveryType: value })}
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
                  <Label htmlFor="order-branch">Filial do Pedido *</Label>
                  <Select
                    value={vendorOrderForm.branchId || "matriz"}
                    onValueChange={(value) => setVendorOrderForm({ ...vendorOrderForm, branchId: value })}
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
                <Label htmlFor="order-description">Descrição</Label>
                <Textarea
                  id="order-description"
                  rows={2}
                  value={vendorOrderForm.description}
                  onChange={(e) => setVendorOrderForm({ ...vendorOrderForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="order-contact-name">Nome de Contato *</Label>
                  <Input
                    id="order-contact-name"
                    value={vendorOrderForm.contactName}
                    onChange={(e) => setVendorOrderForm({ ...vendorOrderForm, contactName: e.target.value })}
                    required
                    placeholder="Nome do cliente/contato"
                  />
                </div>
                <div>
                  <Label htmlFor="order-contact-phone">Telefone</Label>
                  <Input
                    id="order-contact-phone"
                    value={vendorOrderForm.contactPhone}
                    onChange={(e) => setVendorOrderForm({ ...vendorOrderForm, contactPhone: phoneMask(e.target.value) })}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label htmlFor="order-contact-email">Email</Label>
                  <Input
                    id="order-contact-email"
                    type="email"
                    value={vendorOrderForm.contactEmail}
                    onChange={(e) => setVendorOrderForm({ ...vendorOrderForm, contactEmail: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="order-client">Cliente Cadastrado (Opcional)</Label>
                <Select
                  value={vendorOrderForm.clientId || "none"}
                  onValueChange={(value) => setVendorOrderForm({ ...vendorOrderForm, clientId: value === "none" ? "" : value })}
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
                <h3 className="text-lg font-medium">Produtos do Pedido</h3>

                {/* Selected Products */}
                {vendorOrderForm.items.length > 0 && (
                  <div className="space-y-4">
                    {vendorOrderForm.items.map((item, index) => (
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
                              onChange={(e) => updateOrderItem(index, 'productWidth', e.target.value)}
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
                              onChange={(e) => updateOrderItem(index, 'productHeight', e.target.value)}
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
                              onChange={(e) => updateOrderItem(index, 'productDepth', e.target.value)}
                              placeholder="Ex: 60.0"
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
                          <div className="bg-blue-50 p-3 rounded mb-3 space-y-3">
                            <CustomizationSelector
                              productCategory={products.find((p: any) => p.id === item.productId)?.category}
                              quantity={item.quantity}
                              selectedCustomization={item.selectedCustomizationId}
                              onCustomizationChange={(customization) => {
                                if (customization) {
                                  updateOrderItem(index, 'selectedCustomizationId', customization.id);
                                  updateOrderItem(index, 'itemCustomizationValue', customization.price);
                                  updateOrderItem(index, 'itemCustomizationDescription', customization.name);
                                } else {
                                  // Limpar todos os dados de personalização
                                  updateOrderItem(index, 'selectedCustomizationId', '');
                                  updateOrderItem(index, 'itemCustomizationValue', 0);
                                  updateOrderItem(index, 'itemCustomizationDescription', '');
                                  updateOrderItem(index, 'additionalCustomizationNotes', '');
                                }
                              }}
                              customizationValue={item.itemCustomizationValue || 0}
                              onCustomizationValueChange={(value) => updateOrderItem(index, 'itemCustomizationValue', value)}
                              customizationDescription={item.itemCustomizationDescription || ''}
                              onCustomizationDescriptionChange={(description) => updateOrderItem(index, 'itemCustomizationDescription', description)}
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
                                onChange={(e) => updateOrderItem(index, 'additionalCustomizationNotes', e.target.value)}
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

                            <Separator className="my-4" />

                            <div className="flex items-center space-x-2 mb-3">
                              <Switch
                                id={`general-customization-${index}`}
                                checked={item.hasGeneralCustomization}
                                onCheckedChange={(checked) => updateOrderItem(index, 'hasGeneralCustomization', checked)}
                              />
                              <Label htmlFor={`general-customization-${index}`} className="flex items-center gap-2">
                                <Percent className="h-4 w-4" />
                                Personalização Geral
                              </Label>
                            </div>

                            {item.hasGeneralCustomization && (
                              <div className="bg-green-50 p-3 rounded mb-3 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor={`general-customization-name-${index}`}>Nome da Personalização</Label>
                                    <Input
                                      id={`general-customization-name-${index}`}
                                      value={item.generalCustomizationName || ''}
                                      onChange={(e) => updateOrderItem(index, 'generalCustomizationName', e.target.value)}
                                      placeholder="Ex: Bordado, Gravação, etc."
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`general-customization-value-${index}`}>Valor Unitário (R$)</Label>
                                    <Input
                                      id={`general-customization-value-${index}`}
                                      value={item.generalCustomizationValue > 0 ? currencyMask(item.generalCustomizationValue.toString().replace('.', ',')) : ''}
                                      onChange={(e) => {
                                        const value = parseCurrencyValue(e.target.value);
                                        updateOrderItem(index, 'generalCustomizationValue', value);
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
                            id={`item-discount-${index}`}
                            checked={item.hasItemDiscount}
                            onCheckedChange={(checked) => updateOrderItem(index, 'hasItemDiscount', checked)}
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
                                <Select value={item.itemDiscountType || 'percentage'} onValueChange={(value) => updateOrderItem(index, 'itemDiscountType', value)}>
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
                                    onChange={(e) => updateOrderItem(index, 'itemDiscountPercentage', parseFloat(e.target.value) || 0)}
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
                                    onChange={(e) => updateOrderItem(index, 'itemDiscountValue', parseFloat(e.target.value) || 0)}
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
                                        return ((basePrice * (item.itemDiscountPercentage || 0)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
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
                      <Package className="h-5 w-5" />
                      Adicionar Produtos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Product Search and Category Filter - Same as Budget */}
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
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
                            {categories.map((category: string) => (
                              <SelectItem key={category} value={category}>
                                {category === "all" ? "Todas as Categorias" : category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Product List - ALL PRODUCTS (same as budget) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                        {(() => {
                          const filteredProducts = products.filter((product: any) => {
                            const matchesSearch = !orderProductSearch ||
                              product.name.toLowerCase().includes(orderProductSearch.toLowerCase()) ||
                              product.description?.toLowerCase().includes(orderProductSearch.toLowerCase()) ||
                              product.id.toLowerCase().includes(orderProductSearch.toLowerCase());

                            const matchesCategory = orderCategoryFilter === "all" ||
                              product.category === orderCategoryFilter;

                            return matchesSearch && matchesCategory;
                          });

                          if (filteredProducts.length === 0) {
                            return (
                              <div className="col-span-full text-center py-8">
                                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500">
                                  Nenhum produto encontrado com os filtros aplicados
                                </p>
                                {(orderProductSearch || orderCategoryFilter !== "all") && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setOrderProductSearch("");
                                      setOrderCategoryFilter("all");
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
                            const filteredProducts = products.filter((product: any) => {
                              const matchesSearch = !orderProductSearch ||
                                product.name.toLowerCase().includes(orderProductSearch.toLowerCase()) ||
                                product.description?.toLowerCase().includes(orderProductSearch.toLowerCase()) ||
                                product.id.toLowerCase().includes(orderProductSearch.toLowerCase());

                              const matchesCategory = orderCategoryFilter === "all" ||
                                product.category === orderCategoryFilter;

                              return matchesSearch && matchesCategory;
                            });
                            return `${filteredProducts.length} produtos encontrados`;
                          })()}
                        </span>
                        {(orderProductSearch || orderCategoryFilter !== "all") && (
                          <Button
                            type="button"
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
                                addProductToOrder(selectedProductForProducer, 'internal');
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
                                  addProductToOrder(selectedProductForProducer, producer.id);
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
                    <Select value={vendorOrderForm.paymentMethodId || ""} onValueChange={(value) => setVendorOrderForm({ ...vendorOrderForm, paymentMethodId: value })} required>
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
                    <Select value={vendorOrderForm.shippingMethodId || ""} onValueChange={(value) => setVendorOrderForm({ ...vendorOrderForm, shippingMethodId: value })} required>
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
                          <Select value={vendorOrderForm.installments?.toString() || "1"} onValueChange={(value) => setVendorOrderForm({ ...vendorOrderForm, installments: parseInt(value) })} required>
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
                          value={vendorOrderForm.downPayment > 0 ? currencyMask(vendorOrderForm.downPayment.toString().replace('.', ',')) : ''}
                          onChange={(e) => {
                            const downPayment = parseCurrencyValue(e.target.value);
                            const total = calculateTotalWithShipping();
                            setVendorOrderForm({
                              ...vendorOrderForm,
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
                            <span>R$ {calculateOrderTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          {vendorOrderForm.deliveryType !== "pickup" && vendorOrderForm.shippingCost > 0 && (
                            <div className="flex justify-between">
                              <span>Frete:</span>
                              <span>R$ {vendorOrderForm.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium text-green-700 pt-1 border-t">
                            <span>Entrada para Iniciar:</span>
                            <span>R$ {(vendorOrderForm.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          {vendorOrderForm.downPayment > 0 && vendorOrderForm.deliveryType !== "pickup" && vendorOrderForm.shippingCost > 0 && (
                            <p className="text-blue-600 font-medium text-sm">
                              * Valor inclui frete de R$ {vendorOrderForm.shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="remaining-amount">Valor Restante (R$)</Label>
                        <Input
                          id="remaining-amount"
                          value={`R$ ${(vendorOrderForm.remainingAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
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
                {vendorOrderForm.deliveryType === "pickup" ? (
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
                          value={vendorOrderForm.shippingCost > 0 ? currencyMask(vendorOrderForm.shippingCost.toString().replace('.', ',')) : ''}
                          onChange={(e) => {
                            const shippingCost = parseCurrencyValue(e.target.value);
                            const total = calculateOrderTotal() + shippingCost;
                            setVendorOrderForm({
                              ...vendorOrderForm,
                              shippingCost,
                              remainingAmount: Math.max(0, total - (vendorOrderForm.downPayment || 0))
                            });
                          }}
                          placeholder="R$ 0,00"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Valor do frete será somado ao total do pedido</p>
                      </div>
                      <div>
                        <Label>Prazo Estimado</Label>
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
                    checked={vendorOrderForm.hasDiscount}
                    onCheckedChange={(checked) => setVendorOrderForm({ ...vendorOrderForm, hasDiscount: checked })}
                  />
                  <Label htmlFor="has-discount" className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Aplicar Desconto
                  </Label>
                </div>

                {vendorOrderForm.hasDiscount && (
                  <div className="bg-orange-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="discount-type">Tipo de Desconto</Label>
                        <Select value={vendorOrderForm.discountType} onValueChange={(value) => setVendorOrderForm({ ...vendorOrderForm, discountType: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                            <SelectItem value="value">Valor Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {vendorOrderForm.discountType === 'percentage' ? (
                        <div>
                          <Label htmlFor="discount-percentage">Desconto (%)</Label>
                          <Input
                            id="discount-percentage"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={vendorOrderForm.discountPercentage}
                            onChange={(e) => setVendorOrderForm({ ...vendorOrderForm, discountPercentage: parseFloat(e.target.value) || 0 })}
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
                            value={vendorOrderForm.discountValue}
                            onChange={(e) => setVendorOrderForm({ ...vendorOrderForm, discountValue: parseFloat(e.target.value) || 0 })}
                            placeholder="Ex: 150.00"
                          />
                        </div>
                      )}

                      <div>
                        <Label>Valor do Desconto</Label>
                        <p className="text-lg font-semibold text-orange-600 mt-2">
                          R$ {(() => {
                            const itemsSubtotal = vendorOrderForm.items.reduce((total, item) => {
                              const basePrice = item.unitPrice * item.quantity;
                              const customizationValue = item.hasItemCustomization ? item.quantity * (item.itemCustomizationValue || 0) : 0;
                              return total + basePrice + customizationValue;
                            }, 0);

                            if (vendorOrderForm.discountType === 'percentage') {
                              return ((itemsSubtotal * vendorOrderForm.discountPercentage) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            } else {
                              return vendorOrderForm.discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Total */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal dos Produtos:</span>
                    <span>R$ {(() => {
                      const itemsSubtotal = vendorOrderForm.items.reduce((total, item) => {
                        const basePrice = item.unitPrice * item.quantity;
                        const customizationValue = item.hasItemCustomization ? item.quantity * (item.itemCustomizationValue || 0) : 0;
                        return total + basePrice + customizationValue;
                      }, 0);
                      return itemsSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    })()}</span>
                  </div>
                  {vendorOrderForm.hasDiscount && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Desconto:</span>
                      <span>- R$ {(() => {
                        const itemsSubtotal = vendorOrderForm.items.reduce((total, item) => {
                          const basePrice = item.unitPrice * item.quantity;
                          const customizationValue = item.hasItemCustomization ? item.quantity * (item.itemCustomizationValue || 0) : 0;
                          return total + basePrice + customizationValue;
                        }, 0);

                        if (vendorOrderForm.discountType === 'percentage') {
                          return ((itemsSubtotal * vendorOrderForm.discountPercentage) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        } else {
                          return vendorOrderForm.discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        }
                      })()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Subtotal com Desconto:</span>
                    <span>R$ {calculateOrderTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Valor da Entrada:</span>
                    <span>R$ {vendorOrderForm.downPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Valor do Frete:</span>
                    <span>
                      {vendorOrderForm.deliveryType === "pickup" ?
                        "R$ 0,00" :
                        `R$ ${(parseFloat(vendorOrderForm.shippingCost) || calculateShippingCost()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-blue-600 bg-blue-50 p-2 rounded">
                    <span>Entrada + Frete (para financeiro):</span>
                    <span>R$ {(vendorOrderForm.downPayment + (vendorOrderForm.deliveryType === "pickup" ? 0 : (parseFloat(vendorOrderForm.shippingCost) || calculateShippingCost()))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total do Pedido:</span>
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
                    setIsOrderDialogOpen(false);
                    resetOrderForm();
                    setOrderProductSearch("");
                    setOrderCategoryFilter("all");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={(isEditMode ? updateOrderMutation.isPending : createOrderMutation.isPending) || vendorOrderForm.items.length === 0}
                >
                  {isEditMode
                    ? (updateOrderMutation.isPending ? "Atualizando..." : "Atualizar Pedido")
                    : (createOrderMutation.isPending ? "Criando..." : "Criar Pedido")
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
                <p className="text-sm font-medium text-gray-600">Comissões</p>
                <p className="text-lg font-bold text-green-600">
                  R$ {vendorCommissions?.filter((c: any) => c.status === 'confirmed').reduce((total: number, c: any) => total + parseFloat(c.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
                <p className="text-xs text-gray-500">A Receber</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
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
                  R$ {orders?.filter((o: any) => o.status !== 'cancelled').reduce((total: number, o: any) => total + parseFloat(o.totalValue), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
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
                      {order.contactName || order.clientName || 'Nome não informado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status, productionStatuses?.[order.id])}
                          {order.hasUnreadNotes && (
                            <div className="relative">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full"></div>
                            </div>
                          )}
                        </div>

                        {/* Mostrar informações adicionais do produtor se em produção */}
                        {order.status === 'production' && productionStatuses?.[order.id] && (
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Produtor: {productionStatuses[order.id].producerName}</div>
                            {productionStatuses[order.id].deliveryDate && (
                              <div>Entrega: {new Date(productionStatuses[order.id].deliveryDate).toLocaleDateString('pt-BR')}</div>
                            )}
                          </div>
                        )}

                        {/* Barra de progresso simples sem animação */}
                        {(order.status === 'production' || order.status === 'delayed' || order.status === 'ready' || order.status === 'shipped' || order.status === 'delivered') && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                order.status === 'delayed' ? 'bg-red-500' :
                                order.status === 'ready' ? 'bg-yellow-500' :
                                order.status === 'shipped' ? 'bg-blue-500' :
                                order.status === 'delivered' ? 'bg-green-500' : 'bg-purple-500'
                              }`}
                              style={{
                                width: productionStatuses?.[order.id] ? (() => {
                                  const pStatus = productionStatuses[order.id].status;
                                  if (pStatus === 'pending' || pStatus === 'accepted') return '15%';
                                  if (pStatus === 'production') return '40%';
                                  if (pStatus === 'ready') return '70%';
                                  if (pStatus === 'shipped') return '85%';
                                  if (pStatus === 'completed') return '100%';
                                  return '25%';
                                })() : (
                                  order.status === 'production' ? '25%' :
                                  order.status === 'delayed' ? '25%' :
                                  order.status === 'ready' ? '50%' :
                                  order.status === 'shipped' ? '75%' : '100%'
                                )
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
                      <div className="flex space-x-0.5">
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
                        {order.status !== 'production' && order.status !== 'shipped' && order.status !== 'delivered' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-900"
                            onClick={() => handleEditOrder(order)}
                            data-testid={`button-edit-${order.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        )}
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
                        {(order.status === 'confirmed' || order.status === 'pending') && parseFloat(order.paidValue || '0') === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-900"
                            disabled
                            data-testid={`button-waiting-payment-${order.id}`}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Aguardando Pagamento
                          </Button>
                        )}
                        {(order.status === 'confirmed' || order.status === 'pending') && parseFloat(order.paidValue || '0') > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-900"
                            disabled
                            data-testid={`button-paid-logistics-${order.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Pago - Aguardando Logística
                          </Button>
                        )}
                        {order.status === 'production' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 hover:text-purple-900"
                            disabled
                            data-testid={`button-in-production-${order.id}`}
                          >
                            <Factory className="h-4 w-4 mr-1" />
                            Em Produção
                          </Button>
                        )}
                        {order.status === 'ready' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-900"
                            disabled
                            data-testid={`button-ready-logistics-${order.id}`}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Pronto - Aguardando Logística
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



      {/* Order Details Modal */}
      <Dialog open={showOrderDetailsModal} onOpenChange={setShowOrderDetailsModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              Informações completas do pedido
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Informações do Pedido</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Número do Pedido</label>
                      <p className="text-lg font-bold">{selectedOrder.orderNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cliente</label>
                      <p>{selectedOrder.contactName || selectedOrder.clientName || "Não informado"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Descrição</label>
                      <p className="text-gray-700">{selectedOrder.description}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Status e Valores</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status Atual</label>
                      <div className="mt-1">
                        {getStatusBadge(selectedOrder.status, productionStatuses?.[selectedOrder.id])}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Valor Total</label>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {parseFloat(selectedOrder.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Valor Pago</label>
                      <p className="text-lg">
                        R$ {parseFloat(selectedOrder.paidValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Prazo de Entrega</label>
                      <p>{selectedOrder.deadline ? new Date(selectedOrder.deadline).toLocaleDateString('pt-BR') : 'Não definido'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                      <p>{new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Informações de Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nome de Contato</label>
                    <p className="font-medium">{selectedOrder.contactName || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefone</label>
                    <p>{selectedOrder.contactPhone || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p>{selectedOrder.contactEmail || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              {/* Itens do Pedido */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Itens do Pedido ({selectedOrder.items.length})</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item: any, index: number) => {
                      const isExternal = item.producerId && item.producerId !== 'internal';
                      return (
                        <div key={index} className={`p-4 rounded-lg border ${isExternal ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{item.productName}</span>
                                {isExternal && (
                                  <Badge variant="outline" className="text-orange-700 border-orange-300">
                                    Produção Externa
                                  </Badge>
                                )}
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
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Budget Items */}
              {selectedOrder?.budgetItems && selectedOrder.budgetItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Produtos do Orçamento</h3>
                  <div className="space-y-4">
                    {selectedOrder.budgetItems.map((item: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start gap-4">
                          {item.product?.imageLink && (
                            <img
                              src={item.product.imageLink}
                              alt={item.product.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {item.product?.name || 'Produto'}
                            </h4>
                            {item.product?.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {item.product.description}
                              </p>
                            )}
                            <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                              <div>
                                <span className="text-gray-500">Quantidade:</span>
                                <span className="ml-1 font-medium">{item.quantity}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Preço Unit.:</span>
                                <span className="ml-1 font-medium">
                                  R$ {parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Total:</span>
                                <span className="ml-1 font-medium text-green-600">
                                  R$ {parseFloat(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                            {/* Product dimensions */}
                            {(item.productWidth || item.productHeight || item.productDepth) && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-500">Dimensões: </span>
                                <span className="font-medium">
                                  {[
                                    item.productWidth && `L: ${item.productWidth}cm`,
                                    item.productHeight && `A: ${item.productHeight}cm`,
                                    item.productDepth && `P: ${item.productDepth}cm`
                                  ].filter(Boolean).join(' × ')}
                                </span>
                              </div>
                            )}
                            {/* Customization info */}
                            {item.hasItemCustomization && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                <div className="font-medium text-blue-800">Personalização:</div>
                                {item.itemCustomizationDescription && (
                                  <div className="text-blue-700">{item.itemCustomizationDescription}</div>
                                )}
                                {parseFloat(item.itemCustomizationValue || '0') > 0 && (
                                  <div className="text-blue-700">
                                    Valor: R$ {parseFloat(item.itemCustomizationValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Photos */}
              {selectedOrder?.budgetPhotos && selectedOrder.budgetPhotos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Fotos de Personalização</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedOrder.budgetPhotos.map((photo: string, index: number) => (
                      <div key={index} className="relative">
                        <img
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Production Status */}
              {selectedOrder.status === 'production' && productionStatuses?.[selectedOrder.id] && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Status de Produção</h3>
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">Produtor: {productionStatuses[selectedOrder.id]?.producerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge('', productionStatuses[selectedOrder.id])}
                        </div>
                      </div>

                      {productionStatuses[selectedOrder.id]?.notes && (
                        <div className="mt-3 p-3 bg-white border border-purple-200 rounded-lg">
                          <label className="text-sm font-medium text-purple-700">Observações da Produção:</label>
                          <p className="text-gray-800 mt-1">{productionStatuses[selectedOrder.id].notes}</p>
                          {productionStatuses[selectedOrder.id]?.lastNoteAt && (
                            <p className="text-xs text-purple-600 mt-2">
                              Última atualização: {new Date(productionStatuses[selectedOrder.id].lastNoteAt).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <label className="text-purple-600">Prazo de Entrega:</label>
                          <p>{productionStatuses[selectedOrder.id]?.deliveryDate ?
                            new Date(productionStatuses[selectedOrder.id].deliveryDate).toLocaleDateString('pt-BR') :
                            'Não definido'}</p>
                        </div>
                        <div>
                          <label className="text-purple-600">Status:</label>
                          <p className="font-medium">{productionStatuses[selectedOrder.id]?.status === 'production' ? 'Em Produção' :
                            productionStatuses[selectedOrder.id]?.status === 'ready' ? 'Pronto' :
                            productionStatuses[selectedOrder.id]?.status === 'shipped' ? 'Enviado' :
                            productionStatuses[selectedOrder.id]?.status}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}