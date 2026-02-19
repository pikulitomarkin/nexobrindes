import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Edit, Save, Plus, DollarSign, Users, Calculator, Percent, Filter, Trash2, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const commissionFormSchema = z.object({
  commissionRate: z.string().min(1, "Taxa de comissão é obrigatória"),
});

const partnerFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  commissionRate: z.string().min(1, "Taxa de comissão é obrigatória"),
});

const partnerNameFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

type CommissionFormValues = z.infer<typeof commissionFormSchema>;
type PartnerFormValues = z.infer<typeof partnerFormSchema>;

export default function CommissionManagement() {
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [editingPartner, setEditingPartner] = useState<string | null>(null);
  const [editingPartnerName, setEditingPartnerName] = useState<string | null>(null);
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const { toast } = useToast();

  // Queries
  const { data: commissions, isLoading: loadingCommissions } = useQuery({
    queryKey: ["/api/commissions"],
  });

  const { data: vendors, isLoading: loadingVendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: partners, isLoading: loadingPartners } = useQuery({
    queryKey: ["/api/partners"],
  });

  // Forms
  const commissionForm = useForm<CommissionFormValues>({
    resolver: zodResolver(commissionFormSchema),
    defaultValues: { commissionRate: "" },
  });

  const partnerForm = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      commissionRate: "15.00",
    },
  });

  const partnerNameForm = useForm<z.infer<typeof partnerNameFormSchema>>({
    resolver: zodResolver(partnerNameFormSchema),
    defaultValues: { name: "" },
  });

  // Mutations
  const updateVendorCommissionMutation = useMutation({
    mutationFn: async ({ vendorId, commissionRate }: { vendorId: string, commissionRate: string }) => {
      const response = await fetch(`/api/vendors/${vendorId}/commission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar comissão");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setEditingVendor(null);
      commissionForm.reset();
      toast({ title: "Sucesso!", description: "Comissão do vendedor atualizada" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar a comissão", variant: "destructive" });
    },
  });

  const updatePartnerCommissionMutation = useMutation({
    mutationFn: async ({ partnerId, commissionRate }: { partnerId: string, commissionRate: string }) => {
      const response = await fetch(`/api/partners/${partnerId}/commission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar comissão");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setEditingPartner(null);
      commissionForm.reset();
      toast({ title: "Sucesso!", description: "Comissão do sócio atualizada" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar a comissão", variant: "destructive" });
    },
  });

  const updatePartnerNameMutation = useMutation({
    mutationFn: async ({ partnerId, name }: { partnerId: string, name: string }) => {
      const response = await fetch(`/api/partners/${partnerId}/name`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar nome do sócio");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setEditingPartnerName(null);
      partnerNameForm.reset();
      toast({ title: "Sucesso!", description: "Nome do sócio atualizado" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar o nome", variant: "destructive" });
    },
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (data: PartnerFormValues) => {
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar sócio");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setIsPartnerDialogOpen(false);
      partnerForm.reset();
      toast({ title: "Sucesso!", description: "Sócio criado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível criar o sócio", variant: "destructive" });
    },
  });



  const updateCommissionStatusMutation = useMutation({
    mutationFn: async ({ commissionId, status }: { commissionId: string, status: string }) => {
      const response = await fetch(`/api/commissions/${commissionId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      toast({ title: "Sucesso!", description: "Status da comissão atualizado" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar o status", variant: "destructive" });
    },
  });

  const deleteCommissionMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      const response = await fetch(`/api/commissions/${commissionId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao excluir comissão");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      toast({ title: "Sucesso!", description: "Comissão excluída com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir a comissão", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (commissionIds: string[]) => {
      const results = await Promise.all(
        commissionIds.map(id =>
          fetch(`/api/commissions/${id}`, { method: "DELETE" })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) throw new Error(`${failed.length} exclusões falharam`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      setSelectedCommissions(new Set());
      toast({ title: "Sucesso!", description: "Comissões excluídas com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Não foi possível excluir as comissões", variant: "destructive" });
    },
  });

  const bulkMarkPaidMutation = useMutation({
    mutationFn: async (commissionIds: string[]) => {
      const results = await Promise.all(
        commissionIds.map(id =>
          fetch(`/api/commissions/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "paid" }),
          })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) throw new Error(`${failed.length} atualizações falharam`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      setSelectedCommissions(new Set());
      toast({ title: "Sucesso!", description: "Comissões marcadas como pagas" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Não foi possível atualizar as comissões", variant: "destructive" });
    },
  });

  // Handlers
  const handleEditVendorCommission = (vendor: any) => {
    setEditingVendor(vendor.id);
    commissionForm.setValue('commissionRate', vendor.commissionRate);
  };

  const handleEditPartnerCommission = (partner: any) => {
    setEditingPartner(partner.id);
    commissionForm.setValue('commissionRate', partner.commissionRate);
  };

  const handleEditPartnerName = (partner: any) => {
    setEditingPartnerName(partner.id);
    partnerNameForm.setValue('name', partner.name);
  };

  const onPartnerNameSubmit = (data: z.infer<typeof partnerNameFormSchema>) => {
    if (editingPartnerName) {
      updatePartnerNameMutation.mutate({
        partnerId: editingPartnerName,
        name: data.name,
      });
    }
  };

  const onCommissionSubmit = (data: CommissionFormValues) => {
    if (editingVendor) {
      updateVendorCommissionMutation.mutate({
        vendorId: editingVendor,
        commissionRate: data.commissionRate
      });
    } else if (editingPartner) {
      updatePartnerCommissionMutation.mutate({
        partnerId: editingPartner,
        commissionRate: data.commissionRate
      });
    }
  };

  const onPartnerSubmit = (data: PartnerFormValues) => {
    createPartnerMutation.mutate(data);
  };



  // Calculate totals - filter out invalid commissions
  const validCommissions = commissions?.filter((c: any) => 
    c.amount && 
    (c.vendorName || c.partnerName) && 
    c.orderNumber
  ) || [];

  // Apply filters
  const filteredCommissions = useMemo(() => {
    return validCommissions.filter((c: any) => {
      // Status filter
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      // Type filter
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      // Search filter
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        const matchOrder = c.orderNumber?.toLowerCase().includes(search);
        const matchName = (c.vendorName || c.partnerName)?.toLowerCase().includes(search);
        if (!matchOrder && !matchName) return false;
      }
      return true;
    });
  }, [validCommissions, statusFilter, typeFilter, searchFilter]);

  const totalCommissions = validCommissions.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0);
  const pendingCommissions = validCommissions.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0);
  const paidCommissions = validCommissions.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedCommissions.size === filteredCommissions.length) {
      setSelectedCommissions(new Set());
    } else {
      setSelectedCommissions(new Set(filteredCommissions.map((c: any) => c.id)));
    }
  };

  const toggleSelectCommission = (id: string) => {
    const newSelected = new Set(selectedCommissions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCommissions(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedCommissions.size === 0) return;
    if (confirm(`Tem certeza que deseja excluir ${selectedCommissions.size} comissão(ões)? Esta ação não pode ser desfeita.`)) {
      bulkDeleteMutation.mutate(Array.from(selectedCommissions));
    }
  };

  const handleBulkMarkPaid = () => {
    if (selectedCommissions.size === 0) return;
    const eligibleIds = Array.from(selectedCommissions).filter(id => {
      const commission = filteredCommissions.find((c: any) => c.id === id);
      return commission && commission.status === 'confirmed';
    });
    if (eligibleIds.length === 0) {
      toast({ title: "Aviso", description: "Nenhuma comissão elegível para marcar como paga. Apenas comissões com status 'Confirmada' podem ser marcadas como pagas.", variant: "destructive" });
      return;
    }
    const notEligibleCount = selectedCommissions.size - eligibleIds.length;
    const message = notEligibleCount > 0 
      ? `Marcar ${eligibleIds.length} comissão(ões) como paga(s)? (${notEligibleCount} não elegíveis serão ignoradas)`
      : `Marcar ${eligibleIds.length} comissão(ões) como paga(s)?`;
    if (confirm(message)) {
      bulkMarkPaidMutation.mutate(eligibleIds);
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSearchFilter("");
  };

  if (loadingCommissions || loadingVendors || loadingPartners) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Calculator className="h-8 w-8 gradient-text mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Comissões</h1>
              <p className="text-gray-600">Gerencie comissões de vendedores e sócios</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Comissões</p>
                <p className="text-3xl font-bold gradient-text">
                  R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600">
                  R$ {pendingCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Percent className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pagas</p>
                <p className="text-3xl font-bold text-green-600">
                  R$ {paidCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendors" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vendors">Vendedores</TabsTrigger>
          <TabsTrigger value="partners">Sócios</TabsTrigger>
          <TabsTrigger value="commissions">Histórico</TabsTrigger>
        </TabsList>



        <TabsContent value="vendors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comissões dos Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendors?.map((vendor: any) => (
                  <div key={vendor.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{vendor.name}</h3>
                      <p className="text-sm text-gray-600">{vendor.email}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {editingVendor === vendor.id ? (
                        <Form {...commissionForm}>
                          <form onSubmit={commissionForm.handleSubmit(onCommissionSubmit)} className="flex items-center space-x-2">
                            <FormField
                              control={commissionForm.control}
                              name="commissionRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="flex items-center space-x-1">
                                      <Input 
                                        type="number" 
                                        step="0.01" 
                                        className="w-20" 
                                        {...field} 
                                      />
                                      <span className="text-sm text-gray-500">%</span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" size="sm" className="gradient-bg text-white">
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingVendor(null)}
                            >
                              Cancelar
                            </Button>
                          </form>
                        </Form>
                      ) : (
                        <>
                          <span className="text-lg font-bold gradient-text">{vendor.commissionRate}%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditVendorCommission(vendor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partners" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sócios do Sistema (3 sócios - comissão dividida igualmente)</CardTitle>
              <p className="text-sm text-gray-600">
                Comissões dos sócios são confirmadas quando o cliente paga o pedido. Em caso de cancelamento, 
                o valor será descontado dos próximos pedidos.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {partners?.map((partner: any) => (
                  <div key={partner.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      {editingPartnerName === partner.id ? (
                        <Form {...partnerNameForm}>
                          <form onSubmit={partnerNameForm.handleSubmit(onPartnerNameSubmit)} className="flex items-center space-x-2">
                            <FormField
                              control={partnerNameForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input className="w-40" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" size="sm" className="gradient-bg text-white">
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPartnerName(null)}
                            >
                              Cancelar
                            </Button>
                          </form>
                        </Form>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div>
                            <h3 className="font-semibold">{partner.name}</h3>
                            <p className="text-sm text-gray-600">{partner.email}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPartnerName(partner)}
                            title="Editar nome"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      {editingPartner === partner.id ? (
                        <Form {...commissionForm}>
                          <form onSubmit={commissionForm.handleSubmit(onCommissionSubmit)} className="flex items-center space-x-2">
                            <FormField
                              control={commissionForm.control}
                              name="commissionRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="flex items-center space-x-1">
                                      <Input 
                                        type="number" 
                                        step="0.01" 
                                        className="w-20" 
                                        {...field} 
                                      />
                                      <span className="text-sm text-gray-500">%</span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" size="sm" className="gradient-bg text-white">
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPartner(null)}
                            >
                              Cancelar
                            </Button>
                          </form>
                        </Form>
                      ) : (
                        <>
                          <span className="text-lg font-bold gradient-text">{partner.commissionRate}%</span>
                          <span className="text-sm text-gray-500">(de cada pedido)</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPartnerCommission(partner)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {(!partners || partners.length === 0) && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Carregando sócios...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Histórico de Comissões</span>
                <span className="text-sm font-normal text-gray-500">
                  {filteredCommissions.length} de {validCommissions.length} comissões
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filtros:</span>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Buscar por pedido ou beneficiário..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="h-9"
                    data-testid="input-search-commissions"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] h-9" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="paid">Paga</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="deducted">Abatida</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px] h-9" data-testid="select-type-filter">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="vendor">Vendedor</SelectItem>
                    <SelectItem value="partner">Sócio</SelectItem>
                  </SelectContent>
                </Select>
                {(statusFilter !== "all" || typeFilter !== "all" || searchFilter) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Bulk Actions Bar */}
              {selectedCommissions.size > 0 && (
                <div className="flex items-center gap-4 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">
                    {selectedCommissions.size} selecionada(s)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkMarkPaid}
                      disabled={bulkMarkPaidMutation.isPending}
                      className="h-8"
                      data-testid="button-bulk-mark-paid"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Marcar como Paga
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteMutation.isPending}
                      className="h-8"
                      data-testid="button-bulk-delete"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCommissions(new Set())}
                    className="h-8 ml-auto"
                  >
                    Cancelar seleção
                  </Button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left">
                        <Checkbox
                          checked={filteredCommissions.length > 0 && selectedCommissions.size === filteredCommissions.length}
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pedido
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Beneficiário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor Pedido
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        %
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Comissão
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
                    {filteredCommissions?.map((commission: any) => (
                      <tr key={commission.id} className={selectedCommissions.has(commission.id) ? "bg-blue-50" : ""}>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <Checkbox
                            checked={selectedCommissions.has(commission.id)}
                            onCheckedChange={() => toggleSelectCommission(commission.id)}
                            data-testid={`checkbox-commission-${commission.id}`}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(commission.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {commission.orderNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            commission.type === 'vendor' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {commission.type === 'vendor' ? 'Vendedor' : 'Sócio'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {commission.vendorName || commission.partnerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          R$ {parseFloat(commission.orderValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {parseFloat(commission.percentage)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          R$ {parseFloat(commission.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            commission.status === 'paid' ? 'bg-green-100 text-green-800' : 
                            commission.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 
                            commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            commission.status === 'deducted' ? 'bg-gray-100 text-gray-800' :
                            commission.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                              }`}>
                            {commission.status === 'paid' ? 'Paga' : 
                             commission.status === 'confirmed' ? 'Confirmada (A Pagar)' : 
                             commission.status === 'pending' ? 'Pendente' : 
                             commission.status === 'deducted' ? 'Abatida' :
                             commission.status === 'cancelled' ? 'Cancelada' :
                             commission.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {commission.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCommissionStatusMutation.mutate({
                                  commissionId: commission.id,
                                  status: 'paid'
                                })}
                              >
                                Marcar como Paga
                              </Button>
                            )}
                            {commission.status === 'pending' && (
                              <span className="text-sm text-gray-500">
                                {commission.type === 'vendor' ? 'Aguardando entrega do pedido' : 'Aguardando confirmação do pedido'}
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja excluir esta comissão? Esta ação não pode ser desfeita.')) {
                                  deleteCommissionMutation.mutate(commission.id);
                                }
                              }}
                              className="ml-2"
                            >
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(!validCommissions || validCommissions.length === 0) && (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma comissão encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}