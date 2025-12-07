import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Send, Eye, Search, Truck, Clock, CheckCircle, AlertTriangle, ShoppingCart, DollarSign, Factory, Filter, Calendar, Zap, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "react-router-dom"; // Import useLocation
import { DateRange } from "react-day-picker";

// Isolated component for individual producer buttons
function SendToProducerButton({ orderId, producerId, label, uniqueKey }: {
  orderId: string;
  producerId: string;
  label: string;
  uniqueKey: string;
}) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const { mutate } = useMutation({
    // REMOVIDO: mutationKey - cada botão tem sua própria instância independente
    mutationFn: async () => {
      console.log(`Sending order ${orderId} to producer ${producerId} (${label})`);

      const response = await fetch(`/api/orders/${orderId}/send-to-production`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ producerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar para produção');
      }

      return response.json();
    },
    onMutate: () => {
      setPending(true);
    },
    onSuccess: (data) => {
      setPending(false);
      toast({
        title: "Sucesso!",
        description: data.message || `Ordem de produção criada para ${label}`,
      });
      // Atualiza os dois painéis relevantes
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/paid-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/production-orders"] });
    },
    onError: (error: any) => {
      setPending(false);
      console.error(`Error sending to producer ${producerId}:`, error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar para produção",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-6 px-2 text-xs"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!pending) mutate();
      }}
      disabled={pending}
      title={`Enviar APENAS para ${label}`}
      data-testid={`button-send-producer-${uniqueKey}`}
    >
      {pending ? 'Enviando...' : `📤 ${label}`}
    </Button>
  );
}


export default function LogisticsDashboard() {
  const location = window.location.pathname; // Get current location
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSendToProductionModal, setShowSendToProductionModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState("all"); // all, urgent, warning, normal, overdue
  const [sortBy, setSortBy] = useState("priority"); // priority, date, status

  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [dispatchTrackingCode, setDispatchTrackingCode] = useState("");
  const { toast } = useToast();

  // Buscar pedidos pagos que precisam ser enviados para produção
  const { data: paidOrders, isLoading: isLoadingPaidOrders } = useQuery({
    queryKey: ["/api/logistics/paid-orders"],
    queryFn: async () => {
      const response = await fetch("/api/logistics/paid-orders");
      if (!response.ok) throw new Error('Failed to fetch paid orders');
      return response.json();
    },
  });

  // Buscar pedidos em produção para acompanhamento (já separados por produtor)
  const { data: productionOrders, isLoading: isLoadingProductionOrders } = useQuery({
    queryKey: ["/api/logistics/production-orders"],
    queryFn: async () => {
      const response = await fetch("/api/production-orders");
      if (!response.ok) throw new Error('Failed to fetch production orders');
      return response.json();
    },
  });

  // Mutation para confirmar a entrega pelo cliente (agora feita pela logística)
  const confirmDeliveryMutation = useMutation({
    mutationFn: async ({ productionOrderId, orderId }: {
      productionOrderId: string;
      orderId: string;
    }) => {
      // First, update the production order status to delivered
      const poResponse = await fetch(`/api/production-orders/${productionOrderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered", notes: "Entrega confirmada pela logística" })
      });
      if (!poResponse.ok) {
        const errorData = await poResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao atualizar ordem de produção");
      }

      // Then confirm delivery on the main order (this will check if all POs are delivered)
      const response = await fetch(`/api/orders/${orderId}/confirm-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error("Erro ao confirmar entrega");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      toast({
        title: "Sucesso!",
        description: "Entrega confirmada para o cliente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao confirmar entrega",
        variant: "destructive",
      });
    },
  });


  // Enviar pedido para produtor específico ou todos
  const sendAllToProductionMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      console.log(`Sending order ${orderId} to ALL producers`);

      const response = await fetch(`/api/orders/${orderId}/send-to-production`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({}), // No producerId = send to all
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao enviar para produção");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso!",
        description: data.message || "Pedido enviado para produção",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/paid-orders"] });
    },
    onError: (error: any) => {
      console.error('Error sending to production:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar para produção",
        variant: "destructive",
      });
    },
  });

  // Finalizar envio (marcar como despachado)
  const dispatchOrderMutation = useMutation({
    mutationFn: async ({ productionOrderId, orderId, notes, trackingCode }: {
      productionOrderId: string;
      orderId: string;
      notes: string;
      trackingCode: string;
    }) => {
      const response = await fetch("/api/logistics/dispatch-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionOrderId,
          orderId,
          notes,
          trackingCode
        })
      });
      if (!response.ok) throw new Error("Erro ao despachar pedido");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/production-orders"] });
      toast({
        title: "Sucesso!",
        description: "Pedido despachado para o cliente",
      });
    },
  });

  const handleSendToProduction = (order: any) => {
    setSelectedOrder(order);
    setShowSendToProductionModal(true);
  };

  const confirmSendToProduction = () => {
    if (selectedOrder) {
      sendAllToProductionMutation.mutate({ orderId: selectedOrder.id });
    }
  };

  const handleDispatchOrder = (order: any) => {
    // order can be either a production order from the production tracking table
    // or a regular order from the paid orders table

    let targetOrder = null;
    let clientName = order.clientName || 'Cliente';

    if (order.orderId) {
      // This is a production order from the tracking table
      targetOrder = order;
      clientName = order.clientName || order.order?.clientName || 'Cliente';
    } else {
      // This is a regular order, find the production order
      const productionOrder = productionOrders?.find((po: any) => po.orderId === order.id);

      if (!productionOrder) {
        toast({
          title: "Erro",
          description: "Ordem de produção não encontrada para este pedido",
          variant: "destructive"
        });
        return;
      }
      targetOrder = order;
    }

    setSelectedOrder(targetOrder);
    setDispatchNotes(`Produto despachado para ${clientName}`);
    setDispatchTrackingCode("");
    setShowDispatchModal(true);
  };

  const handleConfirmDelivery = (order: any) => {
    // order is a production order, so order.id is the production order ID
    // and order.orderId is the main order ID
    const productionOrderId = order.id;
    const orderId = order.orderId;
    
    if (!productionOrderId || !orderId) {
      toast({
        title: "Erro",
        description: "IDs do pedido não encontrados",
        variant: "destructive",
      });
      return;
    }
    
    confirmDeliveryMutation.mutate({ productionOrderId, orderId });
  };

  const confirmDispatch = () => {
    if (!selectedOrder) return;

    // selectedOrder can be either a production order or a regular order
    // If it's a production order, use it directly, otherwise find the production order
    let productionOrder = null;
    let orderId = null;

    if (selectedOrder.orderId) {
      // selectedOrder is a production order
      productionOrder = selectedOrder;
      orderId = selectedOrder.orderId;
    } else {
      // selectedOrder is a regular order, find the production order
      productionOrder = productionOrders?.find((po: any) => po.orderId === selectedOrder.id);
      orderId = selectedOrder.id;
    }

    if (!productionOrder) {
      toast({
        title: "Erro",
        description: "Ordem de produção não encontrada",
        variant: "destructive"
      });
      return;
    }

    dispatchOrderMutation.mutate({
      productionOrderId: productionOrder.id,
      orderId: orderId,
      notes: dispatchNotes,
      trackingCode: dispatchTrackingCode
    });

    setShowDispatchModal(false);
    setDispatchNotes("");
    setDispatchTrackingCode("");
    setSelectedOrder(null);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      paid: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
      confirmed: "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium",
      production: "bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium",
      pending: "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium",
      accepted: "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium",
      ready: "bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium animate-pulse",
      shipped: "bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full text-xs font-medium",
      delivered: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
      cancelled: "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium",
    };

    const statusLabels = {
      paid: "Pago - Aguardando Envio para Produção",
      confirmed: "Confirmado - Pago",
      pending: "Pendente",
      accepted: "Aceito",
      cancelled: "Cancelado",
      production: "Em Produção",
      ready: "🚚 PRONTO PARA EXPEDIÇÃO",
      shipped: "Despachado para Cliente",
      delivered: "Entregue ao Cliente",
    };

    return (
      <span className={statusClasses[status as keyof typeof statusClasses] || "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority: any) => {
    const priorityClasses = {
      overdue: "bg-red-100 text-red-800 border-red-300",
      urgent: "bg-orange-100 text-orange-800 border-orange-300",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
      normal: "bg-gray-100 text-gray-700 border-gray-300"
    };

    const priorityIcons = {
      overdue: <AlertTriangle className="h-3 w-3" />,
      urgent: <Zap className="h-3 w-3" />,
      warning: <Clock className="h-3 w-3" />,
      normal: <CheckCircle className="h-3 w-3" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${priorityClasses[priority.level]}`}>
        {priorityIcons[priority.level]}
        {priority.label}
      </span>
    );
  };

  // Expandir pedidos pagos por produtor - cada produtor vira uma linha separada
  // FILTRA produtores que já têm production order ENVIADA (status !== pending)
  const expandPaidOrdersByProducer = (orders: any[], existingProductionOrders: any[]) => {
    const expandedOrders: any[] = [];

    // Criar mapa de produtores que já receberam production orders ENVIADAS (não-pending)
    const producersWithSentOrders = new Set();
    existingProductionOrders?.forEach((po: any) => {
      // Só considerar "enviado" se status não for "pending"
      if (po.status !== 'pending') {
        producersWithSentOrders.add(`${po.orderId}-${po.producerId}`);
      }
    });

    orders?.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        // Agrupar itens por produtor
        const itemsByProducer = new Map();
        order.items.forEach((item: any) => {
          if (item.producerId && item.producerId !== 'internal') {
            if (!itemsByProducer.has(item.producerId)) {
              itemsByProducer.set(item.producerId, {
                producerId: item.producerId,
                producerName: item.producerName || `Produtor ${item.producerId.slice(-6)}`,
                items: []
              });
            }
            itemsByProducer.get(item.producerId).items.push(item);
          }
        });

        // Filtrar produtores que ainda NÃO receberam production order ENVIADA
        const pendingProducers = Array.from(itemsByProducer.values()).filter((producerGroup: any) => {
          const key = `${order.id}-${producerGroup.producerId}`;
          return !producersWithSentOrders.has(key);
        });

        // Se há produtores pendentes, criar uma entrada para cada um
        if (pendingProducers.length > 0) {
          pendingProducers.forEach((producerGroup: any, index: number) => {
            const producerValue = producerGroup.items.reduce((sum: number, item: any) =>
              sum + parseFloat(item.totalPrice || '0'), 0
            );

            expandedOrders.push({
              ...order,
              // Identificadores únicos para este produtor
              uniqueKey: `${order.id}-${producerGroup.producerId}`,
              isGrouped: pendingProducers.length > 1, // Indica se faz parte de um grupo
              groupIndex: index, // Posição no grupo (0, 1, 2...)
              groupTotal: pendingProducers.length, // Total de produtores PENDENTES no pedido
              // Dados específicos do produtor
              currentProducerId: producerGroup.producerId,
              currentProducerName: producerGroup.producerName,
              producerItems: producerGroup.items,
              producerValue: producerValue.toFixed(2),
              // Listar TODOS os produtos deste produtor
              product: producerGroup.items.map((item: any) => item.productName).join(', ')
            });
          });
        }
        // Se todos os produtores já receberam, não adiciona nada (pedido não aparece)
      }
    });

    return expandedOrders;
  };

  // Função para calcular prioridade baseada no prazo
  const calculatePriority = (order: any) => {
    const deadline = order.deadline || order.deliveryDeadline;
    if (!deadline) return { level: 'normal', daysRemaining: null, label: 'Sem prazo' };

    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { level: 'overdue', daysRemaining, label: `Atrasado ${Math.abs(daysRemaining)} dias` };
    } else if (daysRemaining <= 1) {
      return { level: 'urgent', daysRemaining, label: daysRemaining === 0 ? 'Vence hoje' : 'Vence amanhã' };
    } else if (daysRemaining <= 3) {
      return { level: 'warning', daysRemaining, label: `${daysRemaining} dias restantes` };
    } else {
      return { level: 'normal', daysRemaining, label: `${daysRemaining} dias restantes` };
    }
  };

  // Aplicar a expansão por produtor nos pedidos pagos
  // Passa productionOrders para filtrar produtores que já receberam
  const expandedPaidOrders = expandPaidOrdersByProducer(paidOrders || [], productionOrders || []);

  // Filtrar pedidos pagos expandidos com filtros avançados
  const filteredPaidOrders = useMemo(() => {
    return expandedPaidOrders?.filter((order: any) => {
      // Search filter
      const matchesSearch = searchTerm === "" ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.currentProducerName?.toLowerCase().includes(searchTerm.toLowerCase());

      // Date range filter
      let matchesDateRange = true;
      if (dateRange?.from || dateRange?.to) {
        const orderDate = new Date(order.lastPaymentDate || order.createdAt);
        if (dateRange.from && orderDate < dateRange.from) matchesDateRange = false;
        if (dateRange.to && orderDate > dateRange.to) matchesDateRange = false;
      }

      // Status filter (multiple selection)
      const matchesSelectedStatuses = selectedStatuses.length === 0 || selectedStatuses.includes(order.status);

      // Priority filter
      let matchesPriority = true;
      if (priorityFilter !== "all") {
        const priority = calculatePriority(order);
        matchesPriority = priority.level === priorityFilter;
      }

      return matchesSearch && matchesDateRange && matchesSelectedStatuses && matchesPriority;
    }).sort((a: any, b: any) => {
      if (sortBy === "priority") {
        const priorityOrder = { overdue: 0, urgent: 1, warning: 2, normal: 3 };
        const aPriority = calculatePriority(a);
        const bPriority = calculatePriority(b);
        return priorityOrder[aPriority.level] - priorityOrder[bPriority.level];
      } else if (sortBy === "date") {
        const aDate = new Date(a.lastPaymentDate || a.createdAt);
        const bDate = new Date(b.lastPaymentDate || b.createdAt);
        return bDate.getTime() - aDate.getTime(); // Most recent first
      }
      return 0;
    });
  }, [expandedPaidOrders, searchTerm, dateRange, selectedStatuses, priorityFilter, sortBy]);

  // Expandir pedidos em produção por produtor, similar aos pedidos pagos
  const expandProductionOrdersByProducer = (orders: any[]) => {
    // Como os pedidos em produção já são separados por produtor, apenas adicionar info de agrupamento
    const expandedOrders: any[] = [];

    // Agrupar por orderId para identificar pedidos multi-produtor
    const orderGroups = new Map();
    orders?.forEach((productionOrder: any) => {
      const orderId = productionOrder.orderId;
      if (!orderGroups.has(orderId)) {
        orderGroups.set(orderId, []);
      }
      orderGroups.get(orderId).push(productionOrder);
    });

    // Processar cada grupo
    orderGroups.forEach((group: any[], orderId: string) => {
      const isMultiProducer = group.length > 1;

      group.forEach((productionOrder: any, index: number) => {
        expandedOrders.push({
          ...productionOrder,
          uniqueKey: `${productionOrder.id}`,
          isGrouped: isMultiProducer,
          groupIndex: index,
          groupTotal: group.length,
          originalOrderId: orderId
        });
      });
    });

    return expandedOrders;
  };

  const expandedProductionOrders = expandProductionOrdersByProducer(productionOrders || []);

  // Filtrar pedidos em produção expandidos com filtros avançados
  const filteredProductionOrders = useMemo(() => {
    return expandedProductionOrders?.filter((order: any) => {
      // Search filter
      const matchesSearch = searchTerm === "" ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.producerName?.toLowerCase().includes(searchTerm.toLowerCase());

      // Date range filter
      let matchesDateRange = true;
      if (dateRange?.from || dateRange?.to) {
        const orderDate = new Date(order.createdAt);
        if (dateRange.from && orderDate < dateRange.from) matchesDateRange = false;
        if (dateRange.to && orderDate > dateRange.to) matchesDateRange = false;
      }

      // Status filter (multiple selection)
      const matchesSelectedStatuses = selectedStatuses.length === 0 || selectedStatuses.includes(order.status);
      const matchesLegacyStatus = statusFilter === "all" || order.status === statusFilter;

      // Priority filter
      let matchesPriority = true;
      if (priorityFilter !== "all") {
        const priority = calculatePriority(order);
        matchesPriority = priority.level === priorityFilter;
      }

      return matchesSearch && matchesDateRange && (matchesSelectedStatuses || matchesLegacyStatus) && matchesPriority;
    }).sort((a: any, b: any) => {
      if (sortBy === "priority") {
        const priorityOrder = { overdue: 0, urgent: 1, warning: 2, normal: 3 };
        const aPriority = calculatePriority(a);
        const bPriority = calculatePriority(b);
        return priorityOrder[aPriority.level] - priorityOrder[bPriority.level];
      } else if (sortBy === "date") {
        const aDate = new Date(a.createdAt);
        const bDate = new Date(b.createdAt);
        return bDate.getTime() - aDate.getTime(); // Most recent first
      }
      return 0;
    });
  }, [expandedProductionOrders, searchTerm, dateRange, selectedStatuses, statusFilter, priorityFilter, sortBy]);

  if (isLoadingPaidOrders || isLoadingProductionOrders) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Ajustar contadores para a nova estrutura
  const paidOrdersCount = expandedPaidOrders?.filter(o => o.currentProducerId).length || 0; // Conta apenas linhas com produtores
  const uniquePaidOrdersCount = paidOrders?.length || 0; // Pedidos únicos pagos
  const inProductionCount = expandedProductionOrders?.filter((o: any) => o.status === 'production')?.length || 0;
  const readyToShipCount = expandedProductionOrders?.filter((o: any) => o.status === 'ready')?.length || 0;

  // Determinar qual seção mostrar baseado na rota
  const getCurrentSection = () => {
    if (location.includes('/logistics/paid-orders')) return 'paid-orders';
    if (location.includes('/logistics/production-tracking')) return 'production-tracking';
    if (location.includes('/logistics/shipments')) return 'shipments';
    if (location.includes('/logistics/paid-orders')) return 'paid-orders'; // Added for clarity, though covered above
    if (location.includes('/logistics/production-tracking')) return 'production-tracking'; // Added for clarity
    if (location.includes('/logistics/shipments')) return 'shipments'; // Added for clarity
    return 'dashboard'; // rota padrão
  };

  const currentSection = getCurrentSection();

  // Função para renderizar o título e descrição baseado na seção
  const getSectionInfo = () => {
    switch (currentSection) {
      case 'paid-orders':
        return {
          title: 'Pedidos Pagos - Aguardando Envio',
          description: 'Pedidos que receberam pagamento e estão prontos para serem enviados à produção'
        };
      case 'production-tracking':
        return {
          title: 'Acompanhamento de Produção',
          description: 'Monitore o status dos pedidos que estão sendo produzidos'
        };
      case 'shipments':
        return {
          title: 'Despachos e Expedição',
          description: 'Gerencie os pedidos prontos para despacho e expedição'
        };
      default:
        return {
          title: 'Painel de Logística',
          description: 'Gerencie pedidos pagos, envios para produção e despachos'
        };
    }
  };

  const sectionInfo = getSectionInfo();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{sectionInfo.title}</h1>
        <p className="text-gray-600">{sectionInfo.description}</p>
      </div>

      {/* Stats Cards - Rendered only for the main dashboard or when relevant */}
      {(currentSection === 'dashboard' || currentSection === 'paid-orders' || currentSection === 'production-tracking' || currentSection === 'shipments') && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {currentSection === 'dashboard' || currentSection === 'paid-orders' ? (
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Pagos - Aguardando Envio</p>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-900">{uniquePaidOrdersCount}</p>
                      <p className="text-xs text-green-600">Pedidos únicos</p>
                    </div>
                    <div className="text-center border-l border-green-300 pl-2">
                      <p className="text-xl font-bold text-green-700">{paidOrdersCount}</p>
                      <p className="text-xs text-green-600">Linhas produção</p>
                    </div>
                  </div>
                  <div className="h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {currentSection === 'dashboard' || currentSection === 'production-tracking' ? (
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Em Produção</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">{inProductionCount}</p>
                    <p className="text-xs text-purple-600 mt-1">Sendo produzidos</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-600 rounded-xl flex items-center justify-center">
                    <Factory className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {currentSection === 'dashboard' || currentSection === 'shipments' || currentSection === 'production-tracking' ? (
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Prontos para Expedição</p>
                    <p className="text-3xl font-bold text-orange-900 mt-2">{readyToShipCount}</p>
                    <p className="text-xs text-orange-600 mt-1">Produção finalizada - pronto para despachar</p>
                  </div>
                  <div className="h-12 w-12 bg-orange-600 rounded-xl flex items-center justify-center">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {(currentSection === 'dashboard' || currentSection === 'paid-orders' || currentSection === 'production-tracking' || currentSection === 'shipments') && (
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total em Acompanhamento</p>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-900">
                        {(paidOrders?.length || 0) + (Array.from(new Set(productionOrders?.map(o => o.orderId))).length || 0)}
                      </p>
                      <p className="text-xs text-blue-600">Pedidos únicos</p>
                    </div>
                    <div className="text-center border-l border-blue-300 pl-2">
                      <p className="text-xl font-bold text-blue-700">
                        {paidOrdersCount + (productionOrders?.length || 0)}
                      </p>
                      <p className="text-xs text-blue-600">Total linhas</p>
                    </div>
                  </div>
                  <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Advanced Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {/* Basic Search Row */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por número, cliente, produto ou produtor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={showAdvancedFilters ? "default" : "outline"}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="whitespace-nowrap"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros Avançados
              </Button>
              {(dateRange || selectedStatuses.length > 0 || priorityFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setDateRange(undefined);
                    setSelectedStatuses([]);
                    setPriorityFilter("all");
                    setSortBy("priority");
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Período</Label>
                  <DatePickerWithRange
                    date={dateRange}
                    onDateChange={setDateRange}
                    className="w-full"
                  />
                </div>

                {/* Priority Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Prioridade</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as prioridades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as prioridades</SelectItem>
                      <SelectItem value="overdue">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          Atrasados
                        </div>
                      </SelectItem>
                      <SelectItem value="urgent">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-orange-600" />
                          Urgente (≤ 1 dia)
                        </div>
                      </SelectItem>
                      <SelectItem value="warning">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          Atenção (2-3 dias)
                        </div>
                      </SelectItem>
                      <SelectItem value="normal">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-gray-600" />
                          Normal ({'>'}3 dias)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ordenar por</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">Prioridade</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Legacy Status Filter (for backward compatibility) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status Rápido</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="accepted">Aceito</SelectItem>
                      <SelectItem value="production">Em Produção</SelectItem>
                      <SelectItem value="ready">Pronto para Despacho</SelectItem>
                      <SelectItem value="shipped">Despachado</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Multiple Status Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status Detalhado (múltipla seleção)</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'paid', label: 'Pago', color: 'bg-green-100 text-green-700' },
                    { value: 'confirmed', label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
                    { value: 'production', label: 'Em Produção', color: 'bg-purple-100 text-purple-700' },
                    { value: 'pending', label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
                    { value: 'accepted', label: 'Aceito', color: 'bg-blue-100 text-blue-700' },
                    { value: 'ready', label: 'Pronto', color: 'bg-orange-100 text-orange-700' },
                    { value: 'shipped', label: 'Despachado', color: 'bg-cyan-100 text-cyan-700' },
                    { value: 'delivered', label: 'Entregue', color: 'bg-green-100 text-green-700' }
                  ].map((status) => {
                    const isSelected = selectedStatuses.includes(status.value);
                    return (
                      <div key={status.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status.value}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStatuses([...selectedStatuses, status.value]);
                            } else {
                              setSelectedStatuses(selectedStatuses.filter(s => s !== status.value));
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`status-${status.value}`}
                          className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${
                            isSelected ? status.color : 'text-gray-600'
                          }`}
                        >
                          {status.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Filters Summary */}
              {(dateRange || selectedStatuses.length > 0 || priorityFilter !== "all") && (
                <div className="border-t pt-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-gray-600">Filtros ativos:</span>
                    {dateRange && (
                      <Badge variant="secondary">
                        <Calendar className="h-3 w-3 mr-1" />
                        {dateRange.from?.toLocaleDateString('pt-BR')} - {dateRange.to?.toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                    {selectedStatuses.length > 0 && (
                      <Badge variant="secondary">
                        Status: {selectedStatuses.length} selecionados
                      </Badge>
                    )}
                    {priorityFilter !== "all" && (
                      <Badge variant="secondary">
                        Prioridade: {priorityFilter}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pedidos Pagos - Aguardando Envio para Produção */}
      {(currentSection === 'dashboard' || currentSection === 'paid-orders') && (
        <Card className="mb-6">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-800 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pedidos Pagos - Aguardando Envio para Produção ({paidOrdersCount})
            </CardTitle>
            <p className="text-sm text-green-700 mt-2">
              Pedidos que receberam pagamento e estão prontos para serem enviados à produção
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Entrega</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Pagamento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPaidOrders?.map((order: any) => {
                    // Determinar estilos de agrupamento
                    const isFirstInGroup = order.isGrouped && order.groupIndex === 0;
                    const isLastInGroup = order.isGrouped && order.groupIndex === order.groupTotal - 1;
                    const isMiddleInGroup = order.isGrouped && order.groupIndex > 0 && order.groupIndex < order.groupTotal - 1;

                    let groupClasses = "hover:bg-gray-50";
                    if (isFirstInGroup) {
                      groupClasses += " border-t-4 border-blue-500 bg-blue-50";
                    } else if (isMiddleInGroup) {
                      groupClasses += " border-l-4 border-blue-300 bg-blue-25";
                    } else if (isLastInGroup) {
                      groupClasses += " border-l-4 border-blue-300 bg-blue-25 border-b-2 border-blue-200";
                    }

                    // Extrair produtores únicos para este pedido
                    const uniqueProducers = order.producerItems ?
                      Array.from(new Map(order.producerItems.map((item: any) => [item.producerId, { id: item.producerId, name: item.producerName }])).values()) :
                      [];

                    return (
                      <tr key={order.uniqueKey} className={groupClasses}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {order.isGrouped && (
                              <div className="mr-2 text-xs text-blue-600 font-mono bg-blue-100 px-1 rounded">
                                {order.groupIndex + 1}/{order.groupTotal}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{order.orderNumber}</div>
                              <div className="text-sm text-gray-500">#{order.id.slice(-6)}</div>
                              {order.isGrouped && order.groupIndex === 0 && (
                                <div className="text-xs text-blue-600 font-medium mt-1">
                                  📦 Pedido Multi-Produtor
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.clientName}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{order.product}</div>
                          {order.currentProducerName && (
                            <div className="text-xs text-purple-600 font-medium mt-1">
                              🏭 {order.currentProducerName}
                            </div>
                          )}
                          {order.producerItems && order.producerItems.length > 1 && (
                            <div className="text-xs text-gray-500">
                              {order.producerItems.length} itens deste produtor
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {getPriorityBadge(calculatePriority(order))}
                            {(order.deadline || order.deliveryDeadline) && (
                              <div className="text-xs text-gray-600">
                                Prazo: {new Date(order.deadline || order.deliveryDeadline).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.deliveryType === 'pickup' ? 'Retirada' : 'Entrega'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(order.lastPaymentDate || order.paidAt || order.createdAt) ? 
                            new Date(order.lastPaymentDate || order.paidAt || order.createdAt).toLocaleDateString('pt-BR') : 
                            'N/A'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2 flex-wrap gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Criar um objeto de pedido específico para este produtor
                                const producerSpecificOrder = {
                                  ...order,
                                  // Filtrar apenas os itens deste produtor
                                  items: order.currentProducerId ? order.producerItems : order.items,
                                  // Marcar como visualização específica do produtor
                                  viewingProducer: order.currentProducerId,
                                  viewingProducerName: order.currentProducerName
                                };
                                setSelectedOrder(producerSpecificOrder);
                                setShowOrderDetailsModal(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver {order.currentProducerName ? 'Produtor' : 'Pedido'}
                            </Button>

                            {/* Botão específico para enviar apenas para este produtor */}
                            {order.currentProducerId ? (
                              <SendToProducerButton
                                key={`send-${order.uniqueKey}-${order.currentProducerId}`}
                                orderId={order.id}
                                producerId={order.currentProducerId}
                                label={order.currentProducerName}
                                uniqueKey={`${order.uniqueKey}-${order.currentProducerId}`}
                              />
                            ) : (
                              <span className="text-xs text-gray-500 italic">
                                Sem produtores externos
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pedidos em Produção */}
      {(currentSection === 'dashboard' || currentSection === 'production-tracking') && (
        <Card>
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-purple-800 flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Pedidos em Produção - Acompanhamento ({productionOrders?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produtor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProductionOrders?.map((order: any) => {
                    // Determinar estilos de agrupamento
                    const isFirstInGroup = order.isGrouped && order.groupIndex === 0;
                    const isLastInGroup = order.isGrouped && order.groupIndex === order.groupTotal - 1;
                    const isMiddleInGroup = order.isGrouped && order.groupIndex > 0 && order.groupIndex < order.groupTotal - 1;

                    let groupClasses = "hover:bg-gray-50";
                    if (isFirstInGroup) {
                      groupClasses += " border-t-4 border-purple-500 bg-purple-50";
                    } else if (isMiddleInGroup) {
                      groupClasses += " border-l-4 border-purple-300 bg-purple-25";
                    } else if (isLastInGroup) {
                      groupClasses += " border-l-4 border-purple-300 bg-purple-25 border-b-2 border-purple-200";
                    }

                    return (
                      <tr key={order.uniqueKey} className={groupClasses}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {order.isGrouped && (
                              <div className="mr-2 text-xs text-purple-600 font-mono bg-purple-100 px-1 rounded">
                                {order.groupIndex + 1}/{order.groupTotal}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{order.orderNumber}</div>
                              <div className="text-sm text-gray-500">#{order.id.slice(-6)}</div>
                              {order.isGrouped && order.groupIndex === 0 && (
                                <div className="text-xs text-purple-600 font-medium mt-1">
                                  🏭 Produção Multi-Produtor
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.clientName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-purple-700">
                            {order.producerName || 'N/A'}
                          </div>
                          {order.isGrouped && (
                            <div className="text-xs text-gray-500">
                              Grupo de {order.groupTotal} produtores
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {getPriorityBadge(calculatePriority(order))}
                            {(order.deadline || order.deliveryDeadline) && (
                              <div className="text-xs text-gray-600">
                                Prazo: {new Date(order.deadline || order.deliveryDeadline).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(order.deadline || order.deliveryDeadline) ? 
                            new Date(order.deadline || order.deliveryDeadline).toLocaleDateString('pt-BR') : 
                            'N/A'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              key={`view-btn-${order.uniqueKey}`}
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Criar um objeto específico para este produtor com endereço garantido
                                const producerSpecificOrder = {
                                  ...order,
                                  viewingProducer: order.producerId,
                                  viewingProducerName: order.producerName,
                                  shippingAddress: order.shippingAddress || order.clientAddress || order.order?.shippingAddress || order.order?.clientAddress,
                                  deliveryType: order.deliveryType || order.order?.deliveryType || 'delivery'
                                };
                                setSelectedOrder(producerSpecificOrder);
                                setShowOrderDetailsModal(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Produtor
                            </Button>
                            {order.status === 'ready' && (
                              <Button
                                key={`dispatch-btn-${order.uniqueKey}`}
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  // Verificar se já não está processando
                                  if (dispatchOrderMutation.isPending) {
                                    console.log('Dispatch mutation já em andamento, ignorando clique');
                                    return;
                                  }

                                  console.log(`Despachando ordem de produção ${order.id} do produtor ${order.producerName}`);
                                  handleDispatchOrder(order);
                                }}
                                disabled={dispatchOrderMutation.isPending}
                                title={`Despachar produção de ${order.producerName} para o cliente`}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                {dispatchOrderMutation.isPending ? 'Despachando...' : 'Despachar'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pedidos em Expedição */}
      {(currentSection === 'dashboard' || currentSection === 'shipments') && (
        <Card>
          <CardHeader className="bg-cyan-50">
            <CardTitle className="text-cyan-800 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Pedidos Despachados ({productionOrders?.filter(o => o.status === 'shipped').length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código Rastreio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Despacho</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const shippedOrders = expandedProductionOrders?.filter((o: any) => o.status === 'shipped') || [];
                    return shippedOrders.map((order: any) => {
                      // Determinar estilos de agrupamento
                      const isFirstInGroup = order.isGrouped && order.groupIndex === 0;
                      const isLastInGroup = order.isGrouped && order.groupIndex === order.groupTotal - 1;
                      const isMiddleInGroup = order.isGrouped && order.groupIndex > 0 && order.groupIndex < order.groupTotal - 1;

                      let groupClasses = "hover:bg-gray-50";
                      if (isFirstInGroup) {
                        groupClasses += " border-t-4 border-cyan-500 bg-cyan-50";
                      } else if (isMiddleInGroup) {
                        groupClasses += " border-l-4 border-cyan-300 bg-cyan-25";
                      } else if (isLastInGroup) {
                        groupClasses += " border-l-4 border-cyan-300 bg-cyan-25 border-b-2 border-cyan-200";
                      }

                      return (
                        <tr key={order.uniqueKey} className={groupClasses}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {order.isGrouped && (
                                <div className="mr-2 text-xs text-cyan-600 font-mono bg-cyan-100 px-1 rounded">
                                  {order.groupIndex + 1}/{order.groupTotal}
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900">{order.orderNumber}</div>
                                <div className="text-sm text-gray-500">#{order.id.slice(-6)}</div>
                                {order.isGrouped && order.groupIndex === 0 && (
                                  <div className="text-xs text-cyan-600 font-medium mt-1">
                                    📦 Despacho Multi-Produtor
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{order.clientName}</div>
                            {order.producerName && (
                              <div className="text-xs text-cyan-600 font-medium">
                                🏭 {order.producerName}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{order.trackingCode || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.dispatchDate ? new Date(order.dispatchDate).toLocaleDateString('pt-BR') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button
                                key={`view-shipped-btn-${order.uniqueKey}`}
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Criar um objeto específico para este produtor com endereço garantido
                                  const producerSpecificOrder = {
                                    ...order,
                                    viewingProducer: order.producerId,
                                    viewingProducerName: order.producerName,
                                    shippingAddress: order.shippingAddress || order.clientAddress || order.order?.shippingAddress || order.order?.clientAddress,
                                    deliveryType: order.deliveryType || order.order?.deliveryType || 'delivery'
                                  };
                                  setSelectedOrder(producerSpecificOrder);
                                  setShowOrderDetailsModal(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Despacho
                              </Button>
                              <Button
                                key={`confirm-delivery-btn-${order.uniqueKey}`}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  // Verificar se já não está processando
                                  if (confirmDeliveryMutation.isPending) {
                                    console.log('Confirm delivery mutation já em andamento, ignorando clique');
                                    return;
                                  }

                                  console.log(`Confirmando entrega para ordem ${order.id} do produtor ${order.producerName}`);
                                  handleConfirmDelivery(order);
                                }}
                                disabled={confirmDeliveryMutation.isPending}
                                title="Confirmar que o cliente recebeu o pedido"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {confirmDeliveryMutation.isPending ? 'Confirmando...' : 'Confirmar Entrega'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pedidos Entregues */}
      {(currentSection === 'dashboard' || currentSection === 'shipments') && (
        <Card>
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Pedidos Entregues ({productionOrders?.filter(o => o.status === 'delivered').length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código Rastreio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Entrega</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const deliveredOrders = expandedProductionOrders?.filter((o: any) => o.status === 'delivered') || [];
                    return deliveredOrders.map((order: any) => {
                      // Determinar estilos de agrupamento
                      const isFirstInGroup = order.isGrouped && order.groupIndex === 0;
                      const isLastInGroup = order.isGrouped && order.groupIndex === order.groupTotal - 1;
                      const isMiddleInGroup = order.isGrouped && order.groupIndex > 0 && order.groupIndex < order.groupTotal - 1;

                      let groupClasses = "hover:bg-gray-50";
                      if (isFirstInGroup) {
                        groupClasses += " border-t-4 border-green-500 bg-green-50";
                      } else if (isMiddleInGroup) {
                        groupClasses += " border-l-4 border-green-300 bg-green-25";
                      } else if (isLastInGroup) {
                        groupClasses += " border-l-4 border-green-300 bg-green-25 border-b-2 border-green-200";
                      }

                      return (
                        <tr key={order.uniqueKey} className={groupClasses}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {order.isGrouped && (
                                <div className="mr-2 text-xs text-green-600 font-mono bg-green-100 px-1 rounded">
                                  {order.groupIndex + 1}/{order.groupTotal}
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900">{order.orderNumber}</div>
                                <div className="text-sm text-gray-500">#{order.id.slice(-6)}</div>
                                {order.isGrouped && order.groupIndex === 0 && (
                                  <div className="text-xs text-green-600 font-medium mt-1">
                                    ✅ Entrega Multi-Produtor
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{order.clientName}</div>
                            {order.producerName && (
                              <div className="text-xs text-green-600 font-medium">
                                🏭 {order.producerName}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{order.trackingCode || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.completedAt ? new Date(order.completedAt).toLocaleDateString('pt-BR') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button
                                key={`view-delivered-btn-${order.uniqueKey}`}
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Criar um objeto específico para este produtor com endereço garantido
                                  const producerSpecificOrder = {
                                    ...order,
                                    viewingProducer: order.producerId,
                                    viewingProducerName: order.producerName,
                                    shippingAddress: order.shippingAddress || order.clientAddress || order.order?.shippingAddress || order.order?.clientAddress,
                                    deliveryType: order.deliveryType || order.order?.deliveryType || 'delivery'
                                  };
                                  setSelectedOrder(producerSpecificOrder);
                                  setShowOrderDetailsModal(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Entrega
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Modal - Enviar para Produção */}
      <Dialog open={showSendToProductionModal} onOpenChange={setShowSendToProductionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Envio para Produção</DialogTitle>
            <DialogDescription>
              Este pedido será enviado automaticamente para todos os produtores responsáveis pelos itens do pedido.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Informações do Pedido</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700">Pedido:</span>
                    <p className="font-medium">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Cliente:</span>
                    <p className="font-medium">{selectedOrder.clientName}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Valor:</span>
                    <p className="font-medium text-green-600">
                      Confidencial
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700">Produto:</span>
                    <p className="font-medium">{selectedOrder.product}</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>✓ Processamento Automático:</strong> O sistema criará ordens de produção separadas para cada produtor envolvido nos itens deste pedido.
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowSendToProductionModal(false);
                setSelectedOrder(null);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmSendToProduction}
              disabled={sendAllToProductionMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {sendAllToProductionMutation.isPending ? 'Processando...' : 'Confirmar Envio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal - Detalhes do Pedido */}
      <Dialog open={showOrderDetailsModal} onOpenChange={setShowOrderDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.viewingProducer ?
                `Detalhes do Pedido - ${selectedOrder.viewingProducerName}` :
                'Detalhes do Pedido'
              }
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.viewingProducer ?
                `Informações específicas para o produtor ${selectedOrder.viewingProducerName}` :
                'Informações completas do pedido e itens para produção'
              }
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Indicador de visualização específica do produtor */}
              {selectedOrder.viewingProducer && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-purple-800">
                        Visualização Específica do Produtor
                      </h4>
                      <p className="text-sm text-purple-600">
                        Mostrando apenas os itens e informações relevantes para <strong>{selectedOrder.viewingProducerName}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Informações do Pedido</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Número do Pedido</label>
                      <p className="text-lg font-bold">{selectedOrder.orderNumber || selectedOrder.order?.orderNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cliente</label>
                      <p>{selectedOrder.clientName || selectedOrder.order?.clientName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contato</label>
                      <p className="text-sm text-gray-600">
                        {(selectedOrder.contactPhone || selectedOrder.order?.contactPhone) && (
                          <span>Tel: {selectedOrder.contactPhone || selectedOrder.order?.contactPhone}<br /></span>
                        )}
                        {(selectedOrder.contactEmail || selectedOrder.order?.contactEmail) && (
                          <span>Email: {selectedOrder.contactEmail || selectedOrder.order?.contactEmail}</span>
                        )}
                      </p>
                    </div>
                    {(selectedOrder.deliveryType || selectedOrder.order?.deliveryType) === 'delivery' && (
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-500">Endereço de Entrega</label>
                        <p className="text-gray-700 bg-gray-50 p-2 rounded">
                          {selectedOrder.shippingAddress || selectedOrder.clientAddress || selectedOrder.order?.shippingAddress || selectedOrder.order?.clientAddress || 'Endereço não informado'}
                        </p>
                      </div>
                    )}
                    {(selectedOrder.deadline || selectedOrder.order?.deadline) && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Prazo</label>
                        <p>{new Date(selectedOrder.deadline || selectedOrder.order?.deadline).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Status e Valores</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status Atual</label>
                      <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tipo de Entrega</label>
                      <p className="font-medium">
                        {(selectedOrder.deliveryType || selectedOrder.order?.deliveryType) === 'pickup' ? 'Retirada no Local' : 'Entrega em Casa'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contato do Cliente</label>
                      <p className="font-medium">{selectedOrder.contactPhone || selectedOrder.order?.contactPhone || 'Não informado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                      <p>{new Date(selectedOrder.createdAt || selectedOrder.order?.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Itens do Pedido */}
              {(() => {
                // Definir quais itens mostrar baseado na estrutura do pedido
                let itemsToShow = selectedOrder.items || selectedOrder.order?.items || [];

                // Se estamos visualizando um produtor específico, filtrar apenas seus itens
                if (selectedOrder.viewingProducer) {
                  itemsToShow = itemsToShow.filter((item: any) =>
                    item.producerId === selectedOrder.viewingProducer
                  );
                }

                // Remove duplicatas baseado em productId, producerId, quantity, unitPrice e personalizações
                const uniqueItems: any[] = [];
                const seenItems = new Set();
                itemsToShow.forEach((item: any) => {
                  const itemKey = `${item.productId}-${item.producerId}-${item.quantity}-${item.totalPrice}-${item.hasItemCustomization}-${item.selectedCustomizationId}-${item.hasGeneralCustomization}-${item.generalCustomizationName}`;
                  if (!seenItems.has(itemKey)) {
                    seenItems.add(itemKey);
                    uniqueItems.push(item);
                  }
                });
                itemsToShow = uniqueItems;

                return itemsToShow && itemsToShow.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      {selectedOrder.viewingProducer ? (
                        <>
                          <Package className="h-5 w-5 text-purple-600" />
                          Itens para {selectedOrder.viewingProducerName} ({itemsToShow.length})
                        </>
                      ) : (
                        <>
                          <Package className="h-5 w-5 text-gray-600" />
                          Itens para Produção ({itemsToShow.length})
                        </>
                      )}
                    </h3>
                    <div className="space-y-3">
                      {itemsToShow.map((item: any, index: number) => {
                        const isExternal = item.producerId && item.producerId !== 'internal';
                        const isCurrentProducer = selectedOrder.viewingProducer &&
                          item.producerId === selectedOrder.viewingProducer;

                        // Cores diferentes para destacar o produtor atual
                        let borderColor = 'border-gray-200';
                        let bgColor = 'bg-gray-50';

                        if (isCurrentProducer) {
                          borderColor = 'border-purple-300';
                          bgColor = 'bg-purple-50';
                        } else if (isExternal) {
                          borderColor = 'border-orange-200';
                          bgColor = 'bg-orange-50';
                        }

                        return (
                          <div key={`${item.id || index}-${item.productName || 'item'}`}
                               className={`p-4 rounded-lg border ${bgColor} ${borderColor}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Package className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">{item.productName}</span>
                                    {isCurrentProducer && (
                                      <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                                        🎯 Produtor Atual
                                      </Badge>
                                    )}
                                    {isExternal && !isCurrentProducer && (
                                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                                        Produção Externa
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500">Quantidade:</span>
                                      <p className="font-medium">{item.quantity}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Especificações:</span>
                                      <p className="font-medium">
                                        {item.productWidth && item.productHeight && item.productDepth ?
                                          `${item.productWidth}×${item.productHeight}×${item.productDepth}cm` :
                                          'Não informado'
                                        }
                                      </p>
                                    </div>

                                    {/* Produtor do Item */}
                                    <div className="col-span-2">
                                      <span className="text-gray-500">Produtor:</span>
                                      <p className={`font-medium ${
                                        isCurrentProducer ? 'text-purple-700' :
                                        isExternal ? 'text-orange-700' : 'text-gray-700'
                                      }`}>
                                        {isExternal ? (item.producerName || `Produtor ${item.producerId?.slice(-6)}`) : 'Produção Interna'}
                                        {isCurrentProducer && ' (ATUAL)'}
                                      </p>
                                    </div>

                                    {/* Personalização do Item */}
                                    {item.hasItemCustomization && (
                                      <div className="col-span-2 bg-blue-50 p-2 rounded">
                                        <span className="text-blue-700 font-medium">Personalização do Item:</span>
                                        <p className="text-blue-600">{item.itemCustomizationDescription || 'Personalização especial'}</p>
                                        {item.additionalCustomizationNotes && (
                                          <p className="text-sm text-blue-500 mt-1">Obs: {item.additionalCustomizationNotes}</p>
                                        )}
                                        {item.customizationPhoto && (
                                          <div className="mt-2">
                                            <img
                                              src={item.customizationPhoto}
                                              alt="Personalização"
                                              className="w-16 h-16 object-cover rounded border"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Personalização Geral */}
                                    {item.hasGeneralCustomization && (
                                      <div className="col-span-2 bg-green-50 p-2 rounded">
                                        <span className="text-green-700 font-medium">Personalização Geral:</span>
                                        <p className="text-green-600">{item.generalCustomizationName || 'Personalização geral'}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-500">
                                    Valor: Confidencial
                                  </p>
                                </div>
                              </div>
                            </div>
                        );
                      })}
                    </div>

                    {/* Resumo de valor para o produtor específico */}
                  </div>
                );
              })()}

              {/* Fotos anexadas */}
              {(() => {
                const photos = selectedOrder.budgetPhotos || selectedOrder.photos || selectedOrder.order?.budgetPhotos || selectedOrder.order?.photos || [];
                return photos && photos.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Fotos de Referência ({photos.length})</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {photos.map((photoUrl: string, index: number) => (
                        <div key={`photo-${index}-${photoUrl.slice(-10)}`} className="relative group">
                          <img
                            src={photoUrl}
                            alt={`Referência ${index + 1}`}
                            className="w-full h-24 object-cover rounded border hover:opacity-75 transition-opacity cursor-pointer"
                            onClick={() => window.open(photoUrl, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded flex items-center justify-center">
                            <span className="text-white text-xs opacity-0 group-hover:opacity-100">Ampliar</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal - Despachar Pedido */}
      <Dialog open={showDispatchModal} onOpenChange={setShowDispatchModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Despachar Pedido</DialogTitle>
            <DialogDescription>
              Finalize o despacho do pedido para o cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dispatch-notes">Observações do Despacho</Label>
              <Textarea
                id="dispatch-notes"
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Observações sobre o despacho..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="tracking-code">Código de Rastreamento (Opcional)</Label>
              <Input
                id="tracking-code"
                value={dispatchTrackingCode}
                onChange={(e) => setDispatchTrackingCode(e.target.value)}
                placeholder="Ex: BR123456789..."
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDispatchModal(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDispatch}
              disabled={dispatchOrderMutation.isPending || !dispatchNotes.trim()}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {dispatchOrderMutation.isPending ? 'Despachando...' : 'Confirmar Despacho'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}