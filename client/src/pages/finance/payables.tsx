import { CheckCircle2 } from "lucide-react";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, DollarSign, TrendingDown, AlertTriangle, Clock, Plus, CreditCard, Factory, Receipt, Users, RefreshCw, Package, User, Building2, Calendar, Upload, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";

export default function FinancePayables() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [isCreatePayableDialogOpen, setIsCreatePayableDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "",
    transactionId: "",
    notes: "",
  });

  const [newPayableData, setNewPayableData] = useState({
    type: "",
    description: "",
    beneficiary: "",
    amount: "",
    dueDate: "",
    category: "",
    status: "pending",
    notes: "",
    attachmentUrl: "",
    attachmentUrl2: ""
  });

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [refundData, setRefundData] = useState({
    amount: "",
    notes: "",
    method: "", // Added method for refund
  });
  const { toast } = useToast();

  // Fetch all payables data
  const { data: overview, isLoading } = useQuery({
    queryKey: ["/api/finance/overview"],
  });

  // Get pending producer payments
  const { data: pendingProducerPayments = [] } = useQuery({
    queryKey: ["/api/finance/producer-payments/pending"]
  });

  // Get all producer payments for payables
  const { data: producerPayments = [] } = useQuery({
    queryKey: ["/api/finance/producer-payments"]
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/finance/expenses"],
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["/api/commissions"],
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Mutation for paying producer and manual payables
  const payProducerMutation = useMutation({
    mutationFn: async ({ payableId, payableType }: { payableId: string; payableType: string }) => {
      if (payableType === 'producer') {
        // Para pagamentos de produtores, usar a API específica
        const response = await fetch(`/api/finance/producer-payments/${payableId}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod: "manual",
            notes: "Pagamento processado via painel financeiro",
            transactionId: `PAY-PRODUCER-${Date.now()}`
          }),
        });
        if (!response.ok) throw new Error("Erro ao processar pagamento do produtor");
        return response.json();
      } else {
        // Para contas a pagar manuais
        const response = await fetch(`/api/finance/payables/manual/${payableId}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod: "manual",
            notes: "Pagamento processado via painel financeiro",
            transactionId: `PAY-${Date.now()}`
          }),
        });
        if (!response.ok) throw new Error("Erro ao processar pagamento");
        return response.json();
      }
    },
    onSuccess: (data, variables) => {
      // Fechar o dialog primeiro
      setIsPayDialogOpen(false);
      setSelectedPayable(null);
      setPaymentData({
        amount: "",
        method: "",
        transactionId: "",
        notes: "",
      });
      
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/finance/payables/manual"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments/producer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

      toast({
        title: "Sucesso!",
        description: variables.payableType === 'producer' ? "Pagamento do produtor processado com sucesso" : "Pagamento processado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar o pagamento",
        variant: "destructive",
      });
    },
  });

  // Mutation for setting refund amount
  const setRefundMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/orders/${data.orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          refundAmount: data.amount,
          refundNotes: data.notes,
          refundMethod: data.method // Include refund method
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao definir valor de estorno');
      }

      return response.json();
    },
    onSuccess: () => {
      setIsRefundDialogOpen(false);
      setRefundData({
        amount: "",
        notes: "",
        method: "", // Reset method
      });
      toast({
        title: "Sucesso!",
        description: "Valor de estorno definido com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/overview"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível definir valor de estorno",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating a new payable
  const createPayableMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/finance/payables/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar conta a pagar');
      }

      return response.json();
    },
    onSuccess: () => {
      setIsCreatePayableDialogOpen(false);
      setNewPayableData({
        type: "",
        description: "",
        beneficiary: "",
        amount: "",
        dueDate: "",
        category: "",
        status: "pending",
        notes: "",
        attachmentUrl: "",
        attachmentUrl2: ""
      });
      toast({
        title: "Sucesso!",
        description: "Conta a pagar criada com sucesso",
      });
      // Invalidate all related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/finance/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/payables/manual"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a conta a pagar",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: "attachmentUrl" | "attachmentUrl2" = "attachmentUrl") => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "payables");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Falha no upload");

      const data = await response.json();
      setNewPayableData(prev => ({ ...prev, [field]: data.url }));
      toast({
        title: "Sucesso",
        description: "Nota anexada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da nota",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setCustomCategories(prev => [...prev, newCategoryName.trim()]);
      setNewPayableData(prev => ({ ...prev, category: newCategoryName.trim() }));
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
  };

  const categories = [
    "Fornecedores",
    "Serviços",
    "Produção",
    "Despesas Operacionais",
    "Outros",
    ...customCategories
  ];

  const handleCreatePayable = () => {
    if (newPayableData.description && newPayableData.beneficiary && newPayableData.amount && newPayableData.dueDate) {
      createPayableMutation.mutate({
        beneficiary: newPayableData.beneficiary,
        description: newPayableData.description,
        amount: parseFloat(newPayableData.amount).toFixed(2),
        dueDate: newPayableData.dueDate,
        category: newPayableData.category || 'Outros',
        notes: newPayableData.notes,
        attachmentUrl: newPayableData.attachmentUrl,
        attachmentUrl2: newPayableData.attachmentUrl2
      });
    }
  };

  // Fetch manual payables
  const { data: manualPayables = [] } = useQuery({
    queryKey: ["/api/finance/payables/manual"],
  });

  // Fetch branches data
  const { data: branches = [] } = useQuery({
    queryKey: ['/api/branches'],
  });

  // Combine all payables (incluindo pagos para filtro)
  const allPayables = [
    // Producer payments - todos os pagamentos (pendentes, aprovados e pagos)
    ...producerPayments
      .filter((payment: any) => ['pending', 'approved', 'paid'].includes(payment.status))
      .map((payment: any) => ({
        id: `producer-${payment.id}`,
        type: 'producer',
        dueDate: payment.deadline || payment.createdAt,
        description: `Pagamento Produtor - ${payment.product || 'Produção'}`,
        amount: payment.amount,
        status: payment.status,
        beneficiary: payment.producerName,
        orderNumber: payment.orderNumber,
        productionOrderId: payment.productionOrderId,
        category: 'Produção',
        branchId: payment.branchId || null,
        actualId: payment.id,
        paidAt: payment.paidAt
      })),

    // Expenses - approved (não reembolsados) e reembolsados (pagos)
    ...expenses
      .filter((expense: any) => expense.status === 'approved')
      .map((expense: any) => ({
        id: `expense-${expense.id}`,
        type: 'expense',
        dueDate: expense.date,
        description: expense.description,
        amount: expense.amount,
        status: expense.reimbursedAt ? 'paid' : 'approved',
        beneficiary: expense.vendorName || 'Despesa Geral',
        category: expense.category,
        orderNumber: expense.orderNumber || '-',
        branchId: expense.branchId || null,
        paidAt: expense.reimbursedAt
      })),

    // Commissions - confirmed (não pagas) e pagas
    ...commissions
      .filter((commission: any) => ['confirmed', 'paid'].includes(commission.status) || commission.paidAt)
      .map((commission: any) => ({
        id: `commission-${commission.id}`,
        type: 'commission',
        dueDate: commission.createdAt,
        description: `Comissão - Pedido ${commission.orderNumber}`,
        amount: commission.amount,
        status: commission.paidAt ? 'paid' : 'confirmed',
        beneficiary: commission.vendorName || commission.partnerName,
        category: commission.type === 'vendor' ? 'Comissão Vendedor' : 'Comissão Parceiro',
        orderNumber: commission.orderNumber,
        branchId: commission.branchId || null,
        paidAt: commission.paidAt
      })),

    // Estornos from manual payables (category = 'Estorno')
    ...manualPayables
      .filter((payable: any) => payable.category === 'Estorno')
      .map((payable: any) => ({
        id: `refund-${payable.id}`,
        type: 'refund',
        dueDate: payable.dueDate,
        description: payable.description,
        amount: payable.amount,
        status: payable.status === 'refunded' ? 'paid' : payable.status,
        beneficiary: payable.beneficiary,
        category: 'Estorno',
        orderNumber: payable.orderId ? 'ESTORNO' : 'MANUAL',
        branchId: payable.branchId || null,
        paidAt: payable.paidAt,
        actualId: payable.id
      })),

    // Manual payables (excluding estornos which are shown above)
    ...manualPayables
      .filter((payable: any) => payable.category !== 'Estorno')
      .map((payable: any) => ({
        id: `manual-${payable.id}`,
        type: 'manual',
        dueDate: payable.dueDate,
        description: payable.description,
        amount: payable.amount,
        status: payable.status,
        beneficiary: payable.beneficiary,
        category: payable.category,
        orderNumber: 'MANUAL',
        branchId: payable.branchId || null,
        paidAt: payable.paidAt,
        attachmentUrl: payable.attachmentUrl,
        attachmentUrl2: payable.attachmentUrl2
      }))
  ];

  const getStatusBadge = (status: string, type?: string) => {
    const statusMap = {
      pending: { label: "Pendente", variant: "secondary" as const },
      approved: { label: "Aprovado", variant: "outline" as const },
      confirmed: { label: "Confirmado", variant: "outline" as const },
      pending_definition: { label: "Aguardando Valor", variant: "destructive" as const },
      defined: { label: "Valor Definido", variant: "secondary" as const },
      paid: { label: "Pago", variant: "default" as const },
      refunded: { label: "Pago", variant: "default" as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;

    return (
      <Badge variant={statusInfo.variant} className="capitalize">
        {statusInfo.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const iconMap = {
      producer: <Factory className="h-4 w-4" />,
      expense: <Receipt className="h-4 w-4" />,
      commission: <Users className="h-4 w-4" />,
      refund: <RefreshCw className="h-4 w-4" />,
      manual: <CreditCard className="h-4 w-4" />,
    };

    return iconMap[type as keyof typeof iconMap] || iconMap.expense;
  };

  const filteredPayables = allPayables.filter((payable: any) => {
    const matchesStatus = statusFilter === "all" || payable.status === statusFilter;
    const matchesType = typeFilter === "all" || payable.type === typeFilter;
    
    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) {
      const payableDate = new Date(payable.dueDate || payable.createdAt);
      const from = new Date(dateRange.from);
      const to = new Date(dateRange.to);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      matchesDate = payableDate >= from && payableDate <= to;
    }

    const matchesSearch = searchTerm === "" || 
      payable.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payable.beneficiary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payable.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter === "all" || 
      payable.branchId === branchFilter ||
      (branchFilter === 'matriz' && (!payable.branchId || payable.branchId === 'matriz'));
    return matchesStatus && matchesType && matchesSearch && matchesBranch && matchesDate;
  });

  const handlePayProducer = (producerPayment: any) => {
    setSelectedPayable(producerPayment);
    setPaymentData(prev => ({ 
      ...prev, 
      amount: producerPayment.amount,
      notes: producerPayment.notes || '' 
    }));
    setIsPayDialogOpen(true);
  };

  // Mutation for paying manual payables
  const payManualPayableMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/finance/payables/manual/${data.payableId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          paymentMethod: data.method,
          transactionId: data.transactionId,
          notes: data.notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao registrar pagamento');
      }

      return response.json();
    },
    onSuccess: () => {
      setIsPayDialogOpen(false);
      setPaymentData({
        amount: "",
        method: "",
        transactionId: "",
        notes: "",
      });
      toast({
        title: "Sucesso!",
        description: "Pagamento registrado com sucesso",
      });
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/finance/payables/manual"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments/producer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível registrar o pagamento",
        variant: "destructive",
      });
    },
  });

  const handlePay = () => {
    if (selectedPayable && paymentData.amount && paymentData.method) {
      if (selectedPayable.type === 'manual') {
        // Handle manual payable payment
        const actualId = selectedPayable.id.startsWith('manual-') 
          ? selectedPayable.id.replace('manual-', '') 
          : selectedPayable.id;

        payManualPayableMutation.mutate({
          payableId: actualId,
          method: paymentData.method,
          transactionId: paymentData.transactionId,
          notes: paymentData.notes
        });
      } else if (selectedPayable.type === 'producer') {
        // Handle producer payment
        const actualId = selectedPayable.actualId || selectedPayable.id.replace('producer-', '');

        payProducerMutation.mutate({
          payableId: actualId,
          payableType: 'producer'
        });
      } else if (selectedPayable.type === 'refund') {
        // Handle refund payment
        const actualId = selectedPayable.id.replace('refund-', '');
        
        // Use the estorno processing API if it's a refund
        processEstornoMutation.mutate({ 
          id: actualId, 
          data: {
            paymentMethod: paymentData.method,
            notes: paymentData.notes,
            transactionId: paymentData.transactionId
          }
        });
      }
    }
  };

  // Add the processEstornoMutation from estornos.tsx
  const processEstornoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/finance/estornos/${id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao processar estorno");
      return response.json();
    },
    onSuccess: () => {
      setIsPayDialogOpen(false);
      setSelectedPayable(null);
      setPaymentData({ paymentMethod: "", notes: "", transactionId: "", method: "", amount: "" });
      
      queryClient.invalidateQueries({ queryKey: ["/api/finance/estornos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/payables/manual"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      toast({
        title: "Estorno processado",
        description: "O estorno foi processado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar estorno.",
        variant: "destructive",
      });
    },
  });

  const handleSetRefund = () => {
    if (selectedPayable && refundData.amount && refundData.notes) {
      setRefundMutation.mutate({
        orderId: selectedPayable.originalOrder.id,
        amount: parseFloat(refundData.amount).toFixed(2),
        notes: refundData.notes,
        method: refundData.method, // Pass refund method
      });
    }
  };



  const breakdown = overview?.payablesBreakdown || {
    producers: 0,
    expenses: 0,
    commissions: 0,
    refunds: 0,
    manual: 0
  };

  // Ensure breakdown values are numbers
  const safeBreakdown = {
    producers: Number(breakdown.producers) || 0,
    expenses: Number(breakdown.expenses) || 0,
    commissions: Number(breakdown.commissions) || 0,
    refunds: Number(breakdown.refunds) || 0,
    manual: Number(breakdown.manual) || 0
  };

  const totalPayables = safeBreakdown.producers + safeBreakdown.expenses + safeBreakdown.commissions + safeBreakdown.refunds + safeBreakdown.manual;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contas a Pagar</h1>
          <p className="text-gray-600">Controle de valores a pagar: produtores, despesas, comissões e estornos</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total a Pagar</p>
                <p className="text-xl font-bold gradient-text">
                  R$ {totalPayables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Produtores</p>
                <p className="text-xl font-bold gradient-text">
                  R$ {safeBreakdown.producers.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Factory className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Despesas</p>
                <p className="text-xl font-bold gradient-text">
                  R$ {safeBreakdown.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Comissões + Manuais</p>
                <p className="text-xl font-bold gradient-text">
                  R$ {(safeBreakdown.commissions + safeBreakdown.manual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Label className="text-xs font-medium mb-1 block">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por descrição, beneficiário ou pedido..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-auto">
                <Label className="text-xs font-medium mb-1 block">Período</Label>
                <DatePickerWithRange 
                  date={dateRange as any} 
                  setDate={(date) => setDateRange(date as any)} 
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[140px]">
                <Label className="text-xs font-medium mb-1 block">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="pending_definition">Aguardando Valor</SelectItem>
                    <SelectItem value="defined">Valor Definido</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[140px]">
                <Label className="text-xs font-medium mb-1 block">Tipo</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    <SelectItem value="producer">Produtores</SelectItem>
                    <SelectItem value="expense">Despesas</SelectItem>
                    <SelectItem value="commission">Comissões</SelectItem>
                    <SelectItem value="refund">Estornos</SelectItem>
                    <SelectItem value="manual">Manuais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[140px]">
                <Label className="text-xs font-medium mb-1 block">Filial</Label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Filiais</SelectItem>
                    <SelectItem value="matriz">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-yellow-600" />
                        Matriz
                      </div>
                    </SelectItem>
                    {branches.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                          {branch.name} - {branch.city}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="gradient-bg text-white"
                onClick={() => setIsCreatePayableDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta a Pagar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payables Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contas a Pagar ({filteredPayables.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Descrição
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Beneficiário
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayables.map((payable: any) => (
                  <tr key={payable.id}>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      {new Date(payable.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      <div className="flex items-center">
                        {getTypeIcon(payable.type)}
                        <span className="ml-1 hidden sm:inline">{payable.category || payable.type}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      <div className="max-w-[150px] truncate" title={payable.description}>
                        {payable.description}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900">
                      <div className="max-w-[120px] truncate" title={payable.beneficiary}>
                        {payable.beneficiary}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900 font-semibold">
                      R$ {parseFloat(payable.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2">
                      {getStatusBadge(payable.status, payable.type)}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <div className="flex space-x-1">
                        {payable.type === 'producer' && (payable.status === 'approved' || payable.status === 'pending') && (
                          <Button
                            onClick={() => {
                              setSelectedPayable({
                                ...payable,
                                // Use the original producer payment ID (remove prefix)
                                actualId: payable.actualId, // Use the stored actualId
                                payableType: 'producer'
                              });
                              setPaymentData({
                                amount: payable.amount,
                                method: "",
                                transactionId: "",
                                notes: "",
                              });
                              setIsPayDialogOpen(true);
                            }}
                            size="sm"
                            className="gradient-bg text-white h-7 px-2"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Pagar
                          </Button>
                        )}
                        {payable.type === 'expense' && payable.status === 'approved' && (
                          <Button
                            onClick={() => {
                              setSelectedPayable(payable);
                              setPaymentData({
                                amount: payable.amount,
                                method: "",
                                transactionId: "",
                                notes: "",
                              });
                              setIsPayDialogOpen(true);
                            }}
                            size="sm"
                            className="gradient-bg text-white h-7 px-2"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Pagar
                          </Button>
                        )}
                        {payable.type === 'commission' && payable.status === 'confirmed' && (
                          <Button
                            onClick={() => {
                              setSelectedPayable(payable);
                              setPaymentData({
                                amount: payable.amount,
                                method: "",
                                transactionId: "",
                                notes: "",
                              });
                              setIsPayDialogOpen(true);
                            }}
                            size="sm"
                            className="gradient-bg text-white h-7 px-2"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Pagar
                          </Button>
                        )}
                        {payable.type === 'manual' && payable.status === 'pending' && (
                          <Button
                            onClick={() => {
                              setSelectedPayable({
                                ...payable,
                                payableType: 'manual'
                              });
                              setPaymentData({
                                amount: payable.amount,
                                method: "",
                                transactionId: "",
                                notes: "",
                              });
                              setIsPayDialogOpen(true);
                            }}
                            size="sm"
                            className="gradient-bg text-white h-7 px-2"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Pagar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => {
                            setSelectedPayable(payable);
                            setIsPreviewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        {payable.type === 'refund' && payable.status === 'pending_definition' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              setSelectedPayable(payable);
                              setRefundData(prev => ({ ...prev, amount: payable.amount }));
                              setIsRefundDialogOpen(true);
                            }}
                          >
                            <DollarSign className="h-3 w-3" />
                            Definir
                          </Button>
                        )}
                        {payable.type === 'refund' && payable.status === 'defined' && (
                          <Button
                            onClick={() => {
                              setSelectedPayable(payable);
                              setPaymentData({
                                amount: payable.amount,
                                method: "",
                                transactionId: "",
                                notes: "",
                              });
                              setIsPayDialogOpen(true);
                            }}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-7 px-2"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Pagar
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

      {/* Pay Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPayable?.type === 'refund' ? 'Processar Estorno' : 'Registrar Pagamento Manual'}</DialogTitle>
            <DialogDescription>
              {selectedPayable?.type === 'producer' 
                ? `Registrando pagamento de R$ ${parseFloat(selectedPayable.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${selectedPayable.beneficiary || 'Produtor'}`
                : selectedPayable?.type === 'refund'
                ? `Registrando estorno de R$ ${parseFloat(selectedPayable.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${selectedPayable.beneficiary}`
                : `Registrando pagamento de ${selectedPayable?.type || 'item'}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Informações do serviço */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Informações {selectedPayable?.type === 'refund' ? 'do Estorno' : 'do Serviço'}</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>{selectedPayable?.type === 'refund' ? 'Cliente' : 'Produtor'}:</strong> {selectedPayable?.beneficiary}</div>
                  <div><strong>{selectedPayable?.type === 'refund' ? 'Motivo' : 'Produto'}:</strong> {selectedPayable?.description?.replace('Pagamento Produtor - ', '')?.replace('Estorno - ', '') || 'N/A'}</div>
                  <div><strong>Pedido:</strong> {selectedPayable?.orderNumber || 'N/A'}</div>
                  <div><strong>Categoria:</strong> {selectedPayable?.category}</div>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Valor do {selectedPayable?.type === 'refund' ? 'Estorno' : 'Pagamento'}</h4>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-700">
                    R$ {parseFloat(selectedPayable?.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-green-600">Valor {selectedPayable?.type === 'refund' ? 'a ser devolvido' : 'acordado'}</div>
                </div>
              </div>
            </div>

            {/* Campos de pagamento */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="payment-amount">Valor</Label>
                <Input
                  id="payment-amount"
                  type="text"
                  value={selectedPayable?.type === 'producer' 
                    ? `R$ ${parseFloat(selectedPayable.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                    : (paymentData.amount.startsWith('R$') ? paymentData.amount : `R$ ${parseFloat(paymentData.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value.replace('R$ ', '').replace('.', '').replace(',', '.') }))}
                  placeholder="0,00"
                  disabled={selectedPayable?.type === 'producer' || selectedPayable?.type === 'refund'}
                  className={(selectedPayable?.type === 'producer' || selectedPayable?.type === 'refund') ? 'bg-gray-100' : ''}
                />
                {(selectedPayable?.type === 'producer' || selectedPayable?.type === 'refund') && (
                  <p className="text-sm text-gray-500 mt-1">Valor definido {selectedPayable?.type === 'refund' ? 'no cancelamento' : 'na ordem de produção'}</p>
                )}
              </div>

              <div>
                <Label htmlFor="payment-method">Método de {selectedPayable?.type === 'refund' ? 'Estorno' : 'Pagamento'} <span className="text-red-500">*</span></Label>
                <Select 
                  value={paymentData.method}
                  onValueChange={(value) => setPaymentData(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transfer">Transferência Bancária</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="manual">Manual/Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="transaction-id">ID da Transação/Comprovante</Label>
              <Input
                id="transaction-id"
                placeholder="Número do comprovante, ID da transação ou referência do pagamento"
                value={paymentData.transactionId}
                onChange={(e) => setPaymentData(prev => ({ ...prev, transactionId: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="payment-notes">Observações</Label>
              <Textarea
                id="payment-notes"
                placeholder="Adicione observações relevantes..."
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Alerta de confirmação */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                <div className="text-sm text-yellow-700">
                  <strong>Confirmação:</strong> Certifique-se de que a operação foi efetivamente realizada antes de registrar. 
                  Esta ação marcará o item como concluído no sistema.
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white px-6"
                onClick={handlePay}
                disabled={!paymentData.method || payProducerMutation.isPending || payManualPayableMutation.isPending || processEstornoMutation.isPending}
              >
                {payProducerMutation.isPending || payManualPayableMutation.isPending || processEstornoMutation.isPending ? "Processando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Definir Valor de Estorno</DialogTitle>
            <DialogDescription>
              Defina o valor a ser restituído para {selectedPayable?.beneficiary}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Informações do pedido original */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Informações do Pedido</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Pedido:</strong> {selectedPayable?.orderNumber || 'N/A'}</div>
                  <div><strong>Cliente:</strong> {selectedPayable?.beneficiary}</div>
                  <div><strong>Produto:</strong> {selectedPayable?.description?.replace('Estorno - ', '') || 'N/A'}</div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2">Valores</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Valor Total:</strong> R$ {selectedPayable?.originalOrder?.totalValue ? parseFloat(selectedPayable.originalOrder.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</div>
                  <div><strong>Valor Pago:</strong> R$ {selectedPayable?.originalOrder?.paidValue ? parseFloat(selectedPayable.originalOrder.paidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</div>
                  <div><strong>Status:</strong> <Badge variant="secondary">{selectedPayable?.originalOrder?.status}</Badge></div>
                </div>
              </div>
            </div>

            {/* Campos de estorno */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="refund-amount">Valor a ser Restituído <span className="text-red-500">*</span></Label>
                <Input
                  id="refund-amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={refundData.amount}
                  onChange={(e) => setRefundData(prev => ({ ...prev, amount: e.target.value }))}
                  className="text-lg font-medium"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: R$ {selectedPayable?.originalOrder?.paidValue ? parseFloat(selectedPayable.originalOrder.paidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </p>
              </div>

              <div>
                <Label htmlFor="refund-method">Método de Estorno</Label>
                <Select 
                  value={refundData.method || ''} 
                  onValueChange={(value) => setRefundData(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                    <SelectItem value="credit_reversal">Estorno no Cartão</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit">Crédito para Compra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="refund-notes">Motivo/Observações <span className="text-red-500">*</span></Label>
              <Textarea
                id="refund-notes"
                placeholder="Descreva detalhadamente o motivo do estorno, incluindo justificativa e informações relevantes..."
                value={refundData.notes}
                onChange={(e) => setRefundData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="min-h-[100px]"
              />
            </div>

            {/* Histórico de pagamentos (se disponível) */}
            {selectedPayable?.originalOrder && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Histórico de Pagamentos</h4>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Data do Pedido:</span>
                      <span>{selectedPayable.originalOrder.createdAt ? new Date(selectedPayable.originalOrder.createdAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data de Cancelamento:</span>
                      <span>{selectedPayable.originalOrder.updatedAt ? new Date(selectedPayable.originalOrder.updatedAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Valor Elegível para Estorno:</span>
                      <span className="text-green-600">R$ {selectedPayable?.originalOrder?.paidValue ? parseFloat(selectedPayable.originalOrder.paidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta importante */}
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                <div className="text-sm text-red-700">
                  <strong>Atenção:</strong> O valor de estorno será adicionado às contas a pagar e deverá ser processado pelo departamento financeiro. 
                  Certifique-se de que todas as informações estão corretas antes de confirmar.
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="gradient-bg text-white px-6"
                onClick={handleSetRefund}
                disabled={!refundData.amount || !refundData.notes || setRefundMutation.isPending}
              >
                {setRefundMutation.isPending ? "Salvando..." : "Definir Valor de Estorno"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview/View Payable Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Conta a Pagar</DialogTitle>
          </DialogHeader>
          {selectedPayable && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Beneficiário</p>
                  <p className="text-sm font-medium">{selectedPayable.beneficiary}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Valor</p>
                  <p className="text-lg font-bold text-red-600">R$ {parseFloat(selectedPayable.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Vencimento</p>
                  <p className="text-sm font-medium">{new Date(selectedPayable.dueDate).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                  <div className="flex justify-end">{getStatusBadge(selectedPayable.status)}</div>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Descrição</p>
                  <p className="text-sm">{selectedPayable.description}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Categoria</p>
                  <Badge variant="outline">{selectedPayable.category}</Badge>
                </div>
              </div>

              {selectedPayable.attachmentUrl && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded border">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Anexo 1</p>
                        <p className="text-xs text-gray-500">Clique para visualizar ou baixar</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/objects/${selectedPayable.attachmentUrl}`} target="_blank" rel="noreferrer">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </a>
                      </Button>
                      <Button size="sm" className="gradient-bg text-white" asChild>
                        <a href={`/objects/${selectedPayable.attachmentUrl}`} download>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {selectedPayable.attachmentUrl2 && (
                <div className="border rounded-lg p-4 bg-gray-50 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded border">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Anexo 2</p>
                        <p className="text-xs text-gray-500">Clique para visualizar ou baixar</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/objects/${selectedPayable.attachmentUrl2}`} target="_blank" rel="noreferrer">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </a>
                      </Button>
                      <Button size="sm" className="gradient-bg text-white" asChild>
                        <a href={`/objects/${selectedPayable.attachmentUrl2}`} download>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {selectedPayable.notes && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Observações</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border italic">"{selectedPayable.notes}"</p>
                </div>
              )}

              {selectedPayable.paidAt && (
                <div className="pt-4 border-t">
                  <div className="bg-green-50 p-3 rounded-lg flex items-center gap-3 border border-green-100">
                    <div className="bg-green-500 rounded-full p-1">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-800">Pago em {new Date(selectedPayable.paidAt).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-green-700">Método: {selectedPayable.paymentMethod?.toUpperCase()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>Fechar</Button>
            {selectedPayable?.status === 'pending' && (
              <Button 
                className="gradient-bg text-white"
                onClick={() => {
                  setIsPreviewDialogOpen(false);
                  setPaymentData({
                    amount: selectedPayable.amount,
                    method: "",
                    transactionId: "",
                    notes: "",
                  });
                  setIsPayDialogOpen(true);
                }}
              >
                Pagar Agora
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Payable Dialog */}
      <Dialog open={isCreatePayableDialogOpen} onOpenChange={setIsCreatePayableDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Nova Conta a Pagar</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para adicionar uma nova conta a pagar manualmente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="category">Categoria</Label>
              <div className="flex gap-2">
                <Select 
                  value={newPayableData.category} 
                  onValueChange={(value) => {
                    if (value === "new") {
                      setIsAddingCategory(true);
                    } else {
                      setNewPayableData(prev => ({ ...prev, category: value }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                    <SelectItem value="new" className="text-blue-600 font-medium">+ Nova Categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="beneficiary">Beneficiário / Fornecedor</Label>
              <Input 
                id="beneficiary" 
                placeholder="Ex: Companhia de Energia" 
                value={newPayableData.beneficiary}
                onChange={(e) => setNewPayableData(prev => ({ ...prev, beneficiary: e.target.value }))}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Input 
                id="description" 
                placeholder="Ex: Conta de luz - Vencimento Dezembro" 
                value={newPayableData.description}
                onChange={(e) => setNewPayableData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input 
                id="amount" 
                type="number" 
                placeholder="0.00" 
                value={newPayableData.amount}
                onChange={(e) => setNewPayableData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="dueDate">Data de Vencimento</Label>
              <Input 
                id="dueDate" 
                type="date" 
                value={newPayableData.dueDate}
                onChange={(e) => setNewPayableData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Anexos (Nota Fiscal/Boleto)</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="w-full h-24 border-dashed border-2 flex flex-col gap-2"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*,.pdf';
                    input.onchange = (e) => handleFileUpload(e as any, "attachmentUrl");
                    input.click();
                  }}
                  disabled={isUploading}
                >
                  {newPayableData.attachmentUrl ? (
                    <>
                      <FileText className="h-8 w-8 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">Anexo 1 OK</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-xs text-gray-500">Anexar 1</span>
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-24 border-dashed border-2 flex flex-col gap-2"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*,.pdf';
                    input.onchange = (e) => handleFileUpload(e as any, "attachmentUrl2");
                    input.click();
                  }}
                  disabled={isUploading}
                >
                  {newPayableData.attachmentUrl2 ? (
                    <>
                      <FileText className="h-8 w-8 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">Anexo 2 OK</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-xs text-gray-500">Anexar 2</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea 
                id="notes" 
                placeholder="Informações adicionais..." 
                value={newPayableData.notes}
                onChange={(e) => setNewPayableData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatePayableDialogOpen(false)}>Cancelar</Button>
            <Button className="gradient-bg text-white" onClick={handleCreatePayable} disabled={createPayableMutation.isPending}>
              {createPayableMutation.isPending ? "Criando..." : "Criar Conta a Pagar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-category">Nome da Categoria</Label>
            <Input 
              id="new-category" 
              value={newCategoryName} 
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Digite o nome da categoria"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingCategory(false)}>Cancelar</Button>
            <Button className="gradient-bg text-white" onClick={handleAddCategory}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}