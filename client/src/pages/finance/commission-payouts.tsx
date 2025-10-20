import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Eye, DollarSign, TrendingUp, Users, UserCheck, Plus, Calendar, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinanceCommissionPayouts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [payoutData, setPayoutData] = useState({
    type: "vendor",
    userId: "",
    periodStart: "",
    periodEnd: "",
    amount: "",
    notes: "",
  });
  const { toast } = useToast();

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["/api/finance/commission-payouts"],
  });

  const { data: commissions } = useQuery({
    queryKey: ["/api/commissions"],
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: partners } = useQuery({
    queryKey: ["/api/partners"],
  });

  const createPayoutMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/finance/commission-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          createdBy: "current-user-id", // TODO: Get from auth context
        }),
      });
      if (!response.ok) throw new Error("Erro ao criar pagamento de comissão");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/commission-payouts"] });
      setIsCreateDialogOpen(false);
      setPayoutData({
        type: "vendor",
        userId: "",
        periodStart: "",
        periodEnd: "",
        amount: "",
        notes: "",
      });
      toast({
        title: "Sucesso!",
        description: "Pagamento de comissão criado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o pagamento de comissão",
        variant: "destructive",
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const response = await fetch(`/api/finance/commission-payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "paid",
          paidAt: new Date(),
        }),
      });
      if (!response.ok) throw new Error("Erro ao marcar como pago");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/commission-payouts"] });
      toast({
        title: "Sucesso!",
        description: "Pagamento marcado como realizado",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível marcar como pago",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendente", variant: "secondary" as const },
      paid: { label: "Pago", variant: "default" as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    
    return (
      <Badge variant={statusInfo.variant} className="capitalize">
        {statusInfo.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    return type === 'vendor' ? <UserCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />;
  };

  const getUsersList = (type: string) => {
    return type === 'vendor' ? vendors : partners;
  };

  const filteredPayouts = payouts?.filter((payout: any) => {
    const matchesStatus = statusFilter === "all" || payout.status === statusFilter;
    const matchesType = typeFilter === "all" || payout.type === typeFilter;
    const matchesSearch = searchTerm === "" || 
      payout.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const handleCreatePayout = () => {
    if (payoutData.type && payoutData.userId && payoutData.periodStart && payoutData.periodEnd && payoutData.amount) {
      createPayoutMutation.mutate({
        ...payoutData,
        amount: parseFloat(payoutData.amount).toFixed(2),
        periodStart: new Date(payoutData.periodStart),
        periodEnd: new Date(payoutData.periodEnd),
      });
    }
  };

  // Calculate summary statistics
  const totalPayouts = payouts?.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
  const paidPayouts = payouts?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
  const pendingPayouts = payouts?.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
  const vendorPayouts = payouts?.filter((p: any) => p.type === 'vendor').length || 0;
  const partnerPayouts = payouts?.filter((p: any) => p.type === 'partner').length || 0;

  if (isLoading) {
    return (
      <div className="p-8">
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
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-page-title">Pagamento de Comissões</h1>
          <p className="text-gray-600">Controle de pagamentos para vendedores e sócios</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-white" data-testid="button-create-payout">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pagamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Pagamento de Comissão</DialogTitle>
              <DialogDescription>
                Crie um pagamento de comissão para vendedor ou sócio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="payout-type">Tipo</Label>
                <Select 
                  value={payoutData.type} 
                  onValueChange={(value) => setPayoutData(prev => ({ ...prev, type: value, userId: "" }))}
                >
                  <SelectTrigger data-testid="select-payout-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendor">Vendedor</SelectItem>
                    <SelectItem value="partner">Sócio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payout-user">
                  {payoutData.type === 'vendor' ? 'Vendedor' : 'Sócio'}
                </Label>
                <Select 
                  value={payoutData.userId} 
                  onValueChange={(value) => setPayoutData(prev => ({ ...prev, userId: value }))}
                >
                  <SelectTrigger data-testid="select-payout-user">
                    <SelectValue placeholder={`Selecione o ${payoutData.type === 'vendor' ? 'vendedor' : 'sócio'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getUsersList(payoutData.type)?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="period-start">Período Início</Label>
                  <Input
                    id="period-start"
                    type="date"
                    value={payoutData.periodStart}
                    onChange={(e) => setPayoutData(prev => ({ ...prev, periodStart: e.target.value }))}
                    data-testid="input-period-start"
                  />
                </div>
                <div>
                  <Label htmlFor="period-end">Período Fim</Label>
                  <Input
                    id="period-end"
                    type="date"
                    value={payoutData.periodEnd}
                    onChange={(e) => setPayoutData(prev => ({ ...prev, periodEnd: e.target.value }))}
                    data-testid="input-period-end"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="payout-amount">Valor da Comissão</Label>
                <Input
                  id="payout-amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={payoutData.amount}
                  onChange={(e) => setPayoutData(prev => ({ ...prev, amount: e.target.value }))}
                  data-testid="input-payout-amount"
                />
              </div>

              <div>
                <Label htmlFor="payout-notes">Observações (Opcional)</Label>
                <Textarea
                  id="payout-notes"
                  placeholder="Observações sobre o pagamento..."
                  value={payoutData.notes}
                  onChange={(e) => setPayoutData(prev => ({ ...prev, notes: e.target.value }))}
                  data-testid="textarea-payout-notes"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="gradient-bg text-white"
                  onClick={handleCreatePayout}
                  disabled={!payoutData.type || !payoutData.userId || !payoutData.amount || createPayoutMutation.isPending}
                  data-testid="button-save-payout"
                >
                  {createPayoutMutation.isPending ? "Criando..." : "Criar Pagamento"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pagamentos</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-total-payouts">
                  R$ {totalPayouts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Já Pagos</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-paid-payouts">
                  R$ {paidPayouts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-pending-payouts">
                  R$ {pendingPayouts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vendedores/Sócios</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-payouts-count">
                  {vendorPayouts} / {partnerPayouts}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
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
                  placeholder="Buscar por nome ou observações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="vendor">Vendedor</SelectItem>
                  <SelectItem value="partner">Sócio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos de Comissão ({filteredPayouts?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Pagamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayouts?.map((payout: any) => (
                  <tr key={payout.id} data-testid={`row-payout-${payout.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payout.periodStart).toLocaleDateString('pt-BR')} - {new Date(payout.periodEnd).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {getTypeIcon(payout.type)}
                        <span className="ml-2 capitalize">{payout.type === 'vendor' ? 'Vendedor' : 'Sócio'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {payout.userName || payout.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {parseFloat(payout.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payout.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payout.paidAt ? new Date(payout.paidAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" data-testid={`button-view-${payout.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {payout.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => markAsPaidMutation.mutate(payout.commissionId || payout.id)}
                            disabled={markAsPaidMutation.isPending}
                            data-testid={`button-mark-paid-${payout.id}`}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Marcar como Pago
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
    </div>
  );
}