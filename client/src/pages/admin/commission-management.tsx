
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Settings, Edit, Save, Plus, DollarSign, Users, Calculator, Percent } from "lucide-react";
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

const settingsFormSchema = z.object({
  vendorCommissionRate: z.string().min(1, "Taxa de comissão do vendedor é obrigatória"),
  partnerCommissionRate: z.string().min(1, "Taxa de comissão do sócio é obrigatória"),
});

type CommissionFormValues = z.infer<typeof commissionFormSchema>;
type PartnerFormValues = z.infer<typeof partnerFormSchema>;
type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function CommissionManagement() {
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [editingPartner, setEditingPartner] = useState<string | null>(null);
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
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

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["/api/commission-settings"],
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

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      vendorCommissionRate: settings?.vendorCommissionRate || "10.00",
      partnerCommissionRate: settings?.partnerCommissionRate || "15.00",
    },
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

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      const response = await fetch("/api/commission-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar configurações");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commission-settings"] });
      toast({ title: "Sucesso!", description: "Configurações atualizadas" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar as configurações", variant: "destructive" });
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

  // Handlers
  const handleEditVendorCommission = (vendor: any) => {
    setEditingVendor(vendor.id);
    commissionForm.setValue('commissionRate', vendor.commissionRate);
  };

  const handleEditPartnerCommission = (partner: any) => {
    setEditingPartner(partner.id);
    commissionForm.setValue('commissionRate', partner.commissionRate);
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

  const onSettingsSubmit = (data: SettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  // Calculate totals
  const totalCommissions = commissions?.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0;
  const pendingCommissions = commissions?.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0;
  const paidCommissions = commissions?.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0;

  if (loadingCommissions || loadingVendors || loadingPartners || loadingSettings) {
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

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="vendors">Vendedores</TabsTrigger>
          <TabsTrigger value="partners">Sócios</TabsTrigger>
          <TabsTrigger value="commissions">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais de Comissão</CardTitle>
              <p className="text-sm text-gray-600">
                Configure as regras de comissão para vendedores e sócios
              </p>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={settingsForm.control}
                      name="vendorCommissionRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa de Comissão dos Vendedores (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <p className="text-xs text-gray-500">Paga na finalização do pedido</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="partnerCommissionRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa de Comissão dos Sócios (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <p className="text-xs text-gray-500">Paga no início do pedido</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Regras de Comissão:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Vendedores:</strong> Recebem comissão apenas na finalização do pedido</li>
                      <li>• <strong>Sócios:</strong> Recebem comissão no início do pedido</li>
                      <li>• <strong>Cancelamentos:</strong> Comissão do sócio é abatida no próximo pedido</li>
                      <li>• <strong>Cancelamentos:</strong> Comissão do vendedor não é abatida</li>
                    </ul>
                  </div>

                  <Button 
                    type="submit" 
                    className="gradient-bg text-white"
                    disabled={updateSettingsMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

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
              <div className="flex items-center justify-between">
                <CardTitle>Comissões dos Sócios</CardTitle>
                <Dialog open={isPartnerDialogOpen} onOpenChange={setIsPartnerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-bg text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Sócio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Sócio</DialogTitle>
                      <DialogDescription>
                        Cadastre um novo sócio no sistema
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...partnerForm}>
                      <form onSubmit={partnerForm.handleSubmit(onPartnerSubmit)} className="space-y-4">
                        <FormField
                          control={partnerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={partnerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={partnerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={partnerForm.control}
                          name="commissionRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Taxa de Comissão (%)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full gradient-bg text-white"
                          disabled={createPartnerMutation.isPending}
                        >
                          Criar Sócio
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {partners?.map((partner: any) => (
                  <div key={partner.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{partner.name}</h3>
                      <p className="text-sm text-gray-600">{partner.email}</p>
                      <p className="text-xs text-gray-500">
                        Total: R$ {partner.totalCommissions?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                      </p>
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
                    <p className="text-gray-500">Nenhum sócio cadastrado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Comissões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
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
                    {commissions?.map((commission: any) => (
                      <tr key={commission.id}>
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
                          <span className={`status-badge ${
                            commission.status === 'paid' ? 'status-confirmed' : 
                            commission.status === 'pending' ? 'status-pending' : 
                            commission.status === 'deducted' ? 'status-cancelled' :
                            'status-production'
                          }`}>
                            {commission.status === 'paid' ? 'Paga' : 
                             commission.status === 'pending' ? 'Pendente' : 
                             commission.status === 'deducted' ? 'Abatida' :
                             commission.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {commission.status === 'pending' && (
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {(!commissions || commissions.length === 0) && (
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
