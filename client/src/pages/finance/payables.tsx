
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
import { Search, Eye, DollarSign, TrendingDown, AlertTriangle, Clock, Plus, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinancePayables() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [payableData, setPayableData] = useState({
    dueDate: "",
    description: "",
    amount: "",
    category: "",
    vendorId: "",
    notes: "",
  });
  const { toast } = useToast();

  // Mock data - replace with actual API call
  const mockPayables = [
    {
      id: "pay-1",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      description: "Material para produção - Madeira Premium",
      amount: "2500.00",
      paidAmount: "0.00",
      status: "pending",
      category: "material",
      vendorName: "Madeireira Santos",
      createdAt: new Date()
    },
    {
      id: "pay-2",
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      description: "Serviços de transporte",
      amount: "450.00",
      paidAmount: "450.00",
      status: "paid",
      category: "services",
      vendorName: "Transportes Rápidos",
      createdAt: new Date()
    },
    {
      id: "pay-3",
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      description: "Energia elétrica",
      amount: "320.00",
      paidAmount: "0.00",
      status: "overdue",
      category: "utilities",
      vendorName: "Companhia Elétrica",
      createdAt: new Date()
    }
  ];

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const createPayableMutation = useMutation({
    mutationFn: async (data: any) => {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: Date.now(), ...data };
    },
    onSuccess: () => {
      setIsAddDialogOpen(false);
      setPayableData({
        dueDate: "",
        description: "",
        amount: "",
        category: "",
        vendorId: "",
        notes: "",
      });
      toast({
        title: "Sucesso!",
        description: "Conta a pagar criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a conta a pagar",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendente", variant: "secondary" as const },
      partial: { label: "Parcial", variant: "outline" as const },
      paid: { label: "Pago", variant: "default" as const },
      overdue: { label: "Vencido", variant: "destructive" as const },
      cancelled: { label: "Cancelado", variant: "secondary" as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    
    return (
      <Badge variant={statusInfo.variant} className="capitalize">
        {statusInfo.label}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      material: <DollarSign className="h-4 w-4" />,
      services: <CreditCard className="h-4 w-4" />,
      utilities: <AlertTriangle className="h-4 w-4" />,
      rent: <Clock className="h-4 w-4" />,
      other: <TrendingDown className="h-4 w-4" />,
    };

    return iconMap[category as keyof typeof iconMap] || iconMap.other;
  };

  const filteredPayables = mockPayables.filter((payable: any) => {
    const matchesStatus = statusFilter === "all" || payable.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || payable.category === categoryFilter;
    const matchesSearch = searchTerm === "" || 
      payable.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payable.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const handleCreatePayable = () => {
    if (payableData.description && payableData.amount && payableData.dueDate) {
      createPayableMutation.mutate({
        ...payableData,
        amount: parseFloat(payableData.amount).toFixed(2),
        dueDate: new Date(payableData.dueDate),
        status: 'pending',
        paidAmount: '0.00'
      });
    }
  };

  const totalPayables = mockPayables.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalPaid = mockPayables.reduce((sum, p) => sum + parseFloat(p.paidAmount), 0);
  const overdueCount = mockPayables.filter(p => p.status === 'overdue').length;
  const pendingCount = mockPayables.filter(p => p.status === 'pending').length;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contas a Pagar</h1>
          <p className="text-gray-600">Controle de valores a pagar para fornecedores</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta a Pagar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Conta a Pagar</DialogTitle>
              <DialogDescription>
                Registre uma nova conta a pagar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payable-due-date">Data Vencimento</Label>
                  <Input
                    id="payable-due-date"
                    type="date"
                    value={payableData.dueDate}
                    onChange={(e) => setPayableData(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="payable-amount">Valor</Label>
                  <Input
                    id="payable-amount"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={payableData.amount}
                    onChange={(e) => setPayableData(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="payable-description">Descrição</Label>
                <Textarea
                  id="payable-description"
                  placeholder="Descreva a conta a pagar..."
                  value={payableData.description}
                  onChange={(e) => setPayableData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="payable-category">Categoria</Label>
                <Select 
                  value={payableData.category} 
                  onValueChange={(value) => setPayableData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="services">Serviços</SelectItem>
                    <SelectItem value="utilities">Utilidades</SelectItem>
                    <SelectItem value="rent">Aluguel</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payable-vendor">Fornecedor (Opcional)</Label>
                <Select 
                  value={payableData.vendorId} 
                  onValueChange={(value) => setPayableData(prev => ({ ...prev, vendorId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(vendors || [])?.map((vendor: any) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payable-notes">Observações</Label>
                <Textarea
                  id="payable-notes"
                  placeholder="Observações adicionais..."
                  value={payableData.notes}
                  onChange={(e) => setPayableData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="gradient-bg text-white"
                  onClick={handleCreatePayable}
                  disabled={!payableData.description || !payableData.amount || !payableData.dueDate || createPayableMutation.isPending}
                >
                  {createPayableMutation.isPending ? "Salvando..." : "Salvar"}
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
                <p className="text-sm font-medium text-gray-600">Total a Pagar</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {totalPayables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Já Pago</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold gradient-text">
                  {pendingCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vencidos</p>
                <p className="text-2xl font-bold gradient-text">
                  {overdueCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
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
                  placeholder="Buscar por descrição ou fornecedor..."
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
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="services">Serviços</SelectItem>
                  <SelectItem value="utilities">Utilidades</SelectItem>
                  <SelectItem value="rent">Aluguel</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payables Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contas a Pagar ({filteredPayables.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
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
                {filteredPayables.map((payable: any) => (
                  <tr key={payable.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payable.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {getCategoryIcon(payable.category)}
                        <span className="ml-2 capitalize">{payable.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {payable.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payable.vendorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {parseFloat(payable.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {parseFloat(payable.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {(parseFloat(payable.amount) - parseFloat(payable.paidAmount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payable.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {payable.status !== 'paid' && (
                          <Button variant="ghost" size="sm">
                            <CreditCard className="h-4 w-4 mr-1" />
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
    </div>
  );
}
