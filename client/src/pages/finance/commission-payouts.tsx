import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Eye, DollarSign, TrendingUp, Users, UserCheck, CreditCard, Calendar, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinanceCommissionPayouts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [selectedCommission, setSelectedCommission] = useState<any>(null);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const [isBulkPayDialogOpen, setIsBulkPayDialogOpen] = useState(false);
  const { toast } = useToast();

  // Buscar todas as comissões do sistema
  const { data: commissions, isLoading } = useQuery({
    queryKey: ["/api/commissions"],
  });

  // Buscar dados de vendedores e sócios
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
  });

  const { data: partners } = useQuery({
    queryKey: ["/api/partners"],
  });

  // Mutation para marcar comissão como paga
  const markAsPaidMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      const response = await fetch(`/api/commissions/${commissionId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!response.ok) throw new Error("Erro ao marcar como pago");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      setIsPayDialogOpen(false);
      toast({
        title: "Sucesso!",
        description: "Comissão marcada como paga",
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

  // Mutation para pagamento em lote
  const bulkMarkAsPaidMutation = useMutation({
    mutationFn: async (commissionIds: string[]) => {
      const promises = commissionIds.map(id => 
        fetch(`/api/commissions/${id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "paid" }),
        })
      );
      
      const responses = await Promise.all(promises);
      const failedIds = [];
      
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          failedIds.push(commissionIds[i]);
        }
      }
      
      if (failedIds.length > 0) {
        throw new Error(`Falha ao processar ${failedIds.length} pagamento(s)`);
      }
      
      return { success: true, processed: commissionIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      setIsBulkPayDialogOpen(false);
      setSelectedCommissions(new Set());
      toast({
        title: "Sucesso!",
        description: `${data.processed} comissões marcadas como pagas`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
      confirmed: { label: "Confirmada", className: "bg-blue-100 text-blue-800" },
      paid: { label: "Paga", className: "bg-green-100 text-green-800" },
      cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800" },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;

    return (
      <Badge className={`capitalize ${statusInfo.className}`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    return type === 'vendor' ? <UserCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />;
  };

  const getUserName = (commission: any) => {
    if (commission.vendorName) return commission.vendorName;
    if (commission.partnerName) return commission.partnerName;
    if (commission.type === 'vendor') {
      const vendor = vendors?.find((v: any) => v.id === commission.vendorId);
      return vendor?.name || 'Vendedor não encontrado';
    }
    if (commission.type === 'partner') {
      const partner = partners?.find((p: any) => p.id === commission.partnerId);
      return partner?.name || 'Sócio não encontrado';
    }
    return 'Usuário não identificado';
  };

  const filteredCommissions = commissions?.filter((commission: any) => {
    const matchesStatus = statusFilter === "all" || commission.status === statusFilter;
    const matchesType = typeFilter === "all" || commission.type === typeFilter;
    const userName = getUserName(commission);
    const matchesSearch = searchTerm === "" ||
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter === "all" || 
      commission.branchId === branchFilter ||
      (branchFilter === 'matriz' && (!commission.branchId || commission.branchId === 'matriz'));
    return matchesStatus && matchesType && matchesSearch && matchesBranch;
  });

  const handleMarkAsPaid = (commission: any) => {
    setSelectedCommission(commission);
    setIsPayDialogOpen(true);
  };

  const confirmPayment = () => {
    if (selectedCommission) {
      markAsPaidMutation.mutate(selectedCommission.id);
    }
  };

  // Funções para seleção múltipla
  const handleSelectCommission = (commissionId: string, checked: boolean) => {
    const newSelected = new Set(selectedCommissions);
    if (checked) {
      newSelected.add(commissionId);
    } else {
      newSelected.delete(commissionId);
    }
    setSelectedCommissions(newSelected);
  };

  const handleSelectAll = (commissions: any[], checked: boolean) => {
    if (checked) {
      const eligibleIds = commissions
        .filter(c => ['pending', 'confirmed'].includes(c.status))
        .map(c => c.id);
      setSelectedCommissions(new Set(eligibleIds));
    } else {
      setSelectedCommissions(new Set());
    }
  };

  const handleBulkPayment = () => {
    if (selectedCommissions.size > 0) {
      setIsBulkPayDialogOpen(true);
    }
  };

  const confirmBulkPayment = () => {
    const commissionIds = Array.from(selectedCommissions);
    bulkMarkAsPaidMutation.mutate(commissionIds);
  };

  // Calcular estatísticas
  const vendorCommissions = commissions?.filter((c: any) => c.type === 'vendor') || [];
  const partnerCommissions = commissions?.filter((c: any) => c.type === 'partner') || [];

  const totalCommissions = commissions?.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0;
  const paidCommissions = commissions?.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0;
  const pendingCommissions = commissions?.filter((c: any) => ['pending', 'confirmed'].includes(c.status)).reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0) || 0;

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pagamento de Comissões</h1>
          <p className="text-gray-600">Controle de todas as comissões do sistema</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Comissões</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-sm font-medium text-gray-600">Já Pagas</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {paidCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-sm font-medium text-gray-600">A Pagar</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {pendingCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-2xl font-bold gradient-text">
                  {vendorCommissions.length} / {partnerCommissions.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome ou número do pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="paid">Paga</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="vendor">Vendedor</SelectItem>
                  <SelectItem value="partner">Sócio</SelectItem>
                </SelectContent>
              </Select>

              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Filiais</SelectItem>
                  <SelectItem value="matriz">Matriz</SelectItem>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} - {branch.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Bulk Actions */}
          {selectedCommissions.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-blue-600" />
                <span className="text-blue-700 font-medium">
                  {selectedCommissions.size} comissão(ões) selecionada(s)
                </span>
              </div>
              <Button
                onClick={handleBulkPayment}
                className="gradient-bg text-white"
                disabled={bulkMarkAsPaidMutation.isPending}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {bulkMarkAsPaidMutation.isPending ? "Processando..." : "Pagar Selecionadas"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commissions by Type */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todas ({filteredCommissions?.length || 0})</TabsTrigger>
          <TabsTrigger value="vendor">Vendedores ({vendorCommissions.length})</TabsTrigger>
          <TabsTrigger value="partner">Sócios ({partnerCommissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CommissionsTable
            commissions={filteredCommissions}
            getUserName={getUserName}
            getStatusBadge={getStatusBadge}
            getTypeIcon={getTypeIcon}
            onMarkAsPaid={handleMarkAsPaid}
            selectedCommissions={selectedCommissions}
            onSelectCommission={handleSelectCommission}
            onSelectAll={handleSelectAll}
          />
        </TabsContent>

        <TabsContent value="vendor">
          <CommissionsTable
            commissions={filteredCommissions?.filter((c: any) => c.type === 'vendor')}
            getUserName={getUserName}
            getStatusBadge={getStatusBadge}
            getTypeIcon={getTypeIcon}
            onMarkAsPaid={handleMarkAsPaid}
            selectedCommissions={selectedCommissions}
            onSelectCommission={handleSelectCommission}
            onSelectAll={handleSelectAll}
          />
        </TabsContent>

        <TabsContent value="partner">
          <CommissionsTable
            commissions={filteredCommissions?.filter((c: any) => c.type === 'partner')}
            getUserName={getUserName}
            getStatusBadge={getStatusBadge}
            getTypeIcon={getTypeIcon}
            onMarkAsPaid={handleMarkAsPaid}
            selectedCommissions={selectedCommissions}
            onSelectCommission={handleSelectCommission}
            onSelectAll={handleSelectAll}
          />
        </TabsContent>
      </Tabs>

      {/* Payment Confirmation Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja marcar esta comissão como paga?
            </DialogDescription>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p><strong>Tipo:</strong> {selectedCommission.type === 'vendor' ? 'Vendedor' : 'Sócio'}</p>
                <p><strong>Nome:</strong> {getUserName(selectedCommission)}</p>
                <p><strong>Valor:</strong> R$ {parseFloat(selectedCommission.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p><strong>Pedido:</strong> {selectedCommission.orderNumber || 'N/A'}</p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="gradient-bg text-white"
                  onClick={confirmPayment}
                  disabled={markAsPaidMutation.isPending}
                >
                  {markAsPaidMutation.isPending ? "Processando..." : "Confirmar Pagamento"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Confirmation Dialog */}
      <Dialog open={isBulkPayDialogOpen} onOpenChange={setIsBulkPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento em Lote</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja marcar {selectedCommissions.size} comissões como pagas?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-yellow-600 mt-1">⚠️</div>
                <div>
                  <p className="text-yellow-800 font-medium">Atenção</p>
                  <p className="text-yellow-700 text-sm">
                    Esta ação marcará {selectedCommissions.size} comissões como pagas e não poderá ser desfeita.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <p><strong>Total de comissões:</strong> {selectedCommissions.size}</p>
              <p><strong>Valor total:</strong> R$ {
                commissions?.filter((c: any) => selectedCommissions.has(c.id))
                  .reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'
              }</p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsBulkPayDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="gradient-bg text-white"
                onClick={confirmBulkPayment}
                disabled={bulkMarkAsPaidMutation.isPending}
              >
                {bulkMarkAsPaidMutation.isPending ? "Processando..." : "Confirmar Pagamentos"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de tabela reutilizável
function CommissionsTable({
  commissions,
  getUserName,
  getStatusBadge,
  getTypeIcon,
  onMarkAsPaid,
  selectedCommissions,
  onSelectCommission,
  onSelectAll
}: {
  commissions: any[];
  getUserName: (commission: any) => string;
  getStatusBadge: (status: string) => JSX.Element;
  getTypeIcon: (type: string) => JSX.Element;
  onMarkAsPaid: (commission: any) => void;
  selectedCommissions: Set<string>;
  onSelectCommission: (id: string, checked: boolean) => void;
  onSelectAll: (commissions: any[], checked: boolean) => void;
}) {
  const eligibleCommissions = commissions?.filter(c => ['pending', 'confirmed'].includes(c.status)) || [];
  const allEligibleSelected = eligibleCommissions.length > 0 && 
    eligibleCommissions.every(c => selectedCommissions.has(c.id));

  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={allEligibleSelected}
                      onCheckedChange={(checked) => onSelectAll(eligibleCommissions, !!checked)}
                      disabled={eligibleCommissions.length === 0}
                    />
                    <span>Selecionar</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DataCriação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commissions?.map((commission: any) => {
                const isEligible = ['pending', 'confirmed'].includes(commission.status);
                return (
                  <tr key={commission.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Checkbox
                        checked={selectedCommissions.has(commission.id)}
                        onCheckedChange={(checked) => onSelectCommission(commission.id, !!checked)}
                        disabled={!isEligible}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {getTypeIcon(commission.type)}
                        <span className="ml-2 capitalize">
                          {commission.type === 'vendor' ? 'Vendedor' : 'Sócio'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {getUserName(commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {commission.orderNumber || commission.orderId?.slice(-6) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {commission.percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {parseFloat(commission.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(commission.status)}
                      {commission.type === 'vendor' && commission.status !== 'paid' && (
                        <span className="text-sm text-gray-500">
                          Aguardando entrega do pedido
                        </span>
                      )}
                      {commission.type !== 'vendor' && commission.status !== 'paid' && (
                        <span className="text-sm text-gray-500">
                          Aguardando confirmação do pedido
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {commission.createdAt ? new Date(commission.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {['pending', 'confirmed'].includes(commission.status) && commission.type === 'vendor' && (
                           <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMarkAsPaid(commission)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                         {['pending', 'confirmed'].includes(commission.status) && commission.type !== 'vendor' && (
                           <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMarkAsPaid(commission)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!commissions || commissions.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              Nenhuma comissão encontrada
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}