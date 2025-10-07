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
import { Search, Eye, DollarSign, TrendingDown, FileText, Upload, Plus, Calendar, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinanceExpenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: "",
    description: "",
    amount: "",
    vendorId: "",
    orderId: "",
  });
  const { toast } = useToast();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["/api/finance/expenses"],
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          createdBy: "current-user-id", // TODO: Get from auth context
        }),
      });
      if (!response.ok) throw new Error("Erro ao criar despesa");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/expenses"] });
      setIsAddDialogOpen(false);
      setExpenseData({
        date: new Date().toISOString().split('T')[0],
        category: "",
        description: "",
        amount: "",
        vendorId: "",
        orderId: "",
      });
      toast({
        title: "Sucesso!",
        description: "Despesa criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a despesa",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      recorded: { label: "Registrada", variant: "secondary" as const },
      approved: { label: "Aprovada", variant: "default" as const },
      reimbursed: { label: "Reembolsada", variant: "outline" as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.recorded;
    
    return (
      <Badge variant={statusInfo.variant} className="capitalize">
        {statusInfo.label}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      operational: <DollarSign className="h-4 w-4" />,
      marketing: <TrendingDown className="h-4 w-4" />,
      travel: <Calendar className="h-4 w-4" />,
      equipment: <Receipt className="h-4 w-4" />,
      other: <FileText className="h-4 w-4" />,
    };

    return iconMap[category as keyof typeof iconMap] || iconMap.other;
  };

  const filteredExpenses = (expenses || [])?.filter((expense: any) => {
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    const matchesSearch = searchTerm === "" || 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const handleCreateExpense = () => {
    if (expenseData.category && expenseData.description && expenseData.amount) {
      createExpenseMutation.mutate({
        ...expenseData,
        amount: parseFloat(expenseData.amount).toFixed(2),
        date: new Date(expenseData.date),
      });
    }
  };

  const totalExpenses = (expenses || [])?.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0) || 0;
  const approvedExpenses = (expenses || [])?.filter((e: any) => e.status === 'approved').length || 0;
  const pendingExpenses = (expenses || [])?.filter((e: any) => e.status === 'recorded').length || 0;
  const thisMonthExpenses = (expenses || [])?.filter((e: any) => {
    const expenseDate = new Date(e.date);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  }).reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0) || 0;

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-page-title">Notas de Despesas</h1>
          <p className="text-gray-600">Controle de gastos e despesas da empresa</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-white" data-testid="button-add-expense">
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Despesa</DialogTitle>
              <DialogDescription>
                Registre uma nova despesa da empresa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expense-date">Data <span className="text-red-500">*</span></Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={expenseData.date}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
                    data-testid="input-expense-date"
                    className="text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="expense-amount">Valor <span className="text-red-500">*</span></Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={expenseData.amount}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, amount: e.target.value }))}
                    data-testid="input-expense-amount"
                    className="text-lg font-medium"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="expense-category">Categoria <span className="text-red-500">*</span></Label>
                <Select 
                  value={expenseData.category} 
                  onValueChange={(value) => setExpenseData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger data-testid="select-expense-category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operacional</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="travel">Viagem</SelectItem>
                    <SelectItem value="equipment">Equipamento</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expense-description">Descrição <span className="text-red-500">*</span></Label>
                <Textarea
                  id="expense-description"
                  placeholder="Descreva a despesa detalhadamente..."
                  value={expenseData.description}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="textarea-expense-description"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expense-vendor">Fornecedor (Opcional)</Label>
                  <Select 
                    value={expenseData.vendorId} 
                    onValueChange={(value) => setExpenseData(prev => ({ ...prev, vendorId: value }))}
                  >
                    <SelectTrigger data-testid="select-expense-vendor">
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
                  <Label htmlFor="expense-order">Pedido (Opcional)</Label>
                  <div className="space-y-2">
                    <Select 
                      value={expenseData.orderId} 
                      onValueChange={(value) => setExpenseData(prev => ({ ...prev, orderId: value }))}
                    >
                      <SelectTrigger data-testid="select-expense-order">
                        <SelectValue placeholder="Selecione o pedido" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                            <Input
                              placeholder="Buscar pedido..."
                              className="pl-6 text-xs"
                              onChange={(e) => {
                                // Filter functionality can be added here if needed
                              }}
                            />
                          </div>
                        </div>
                        {(orders || [])?.map((order: any) => (
                          <SelectItem key={order.id} value={order.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{order.orderNumber}</span>
                              <span className="text-xs text-gray-500">{order.clientName} - {order.product}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Vincule esta despesa a um pedido específico se aplicável
                    </p>
                  </div>
                </div>
              </div>

              {/* Informações adicionais */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-900 mb-2">Informações Importantes</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Todas as despesas passam por aprovação antes de serem contabilizadas</li>
                  <li>• Anexe comprovantes sempre que possível</li>
                  <li>• Despesas vinculadas a pedidos facilitam o controle de custos</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="gradient-bg text-white px-6"
                  onClick={handleCreateExpense}
                  disabled={!expenseData.category || !expenseData.description || !expenseData.amount || createExpenseMutation.isPending}
                  data-testid="button-save-expense"
                >
                  {createExpenseMutation.isPending ? "Salvando..." : "Salvar Despesa"}
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
                <p className="text-sm font-medium text-gray-600">Total de Despesas</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-total-expenses">
                  R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-sm font-medium text-gray-600">Este Mês</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-month-expenses">
                  R$ {thisMonthExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aprovadas</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-approved-expenses">
                  {approvedExpenses}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Receipt className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-pending-expenses">
                  {pendingExpenses}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-yellow-600" />
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
                  <SelectItem value="recorded">Registrada</SelectItem>
                  <SelectItem value="approved">Aprovada</SelectItem>
                  <SelectItem value="reimbursed">Reembolsada</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="operational">Operacional</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="travel">Viagem</SelectItem>
                  <SelectItem value="equipment">Equipamento</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Despesas ({filteredExpenses?.length || 0})</CardTitle>
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
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fornecedor/Pedido
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
                {filteredExpenses?.map((expense: any) => (
                  <tr key={expense.id} data-testid={`row-expense-${expense.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {getCategoryIcon(expense.category)}
                        <span className="ml-2 capitalize">{expense.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expense.vendorName || expense.orderNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(expense.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" data-testid={`button-view-${expense.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {expense.attachmentUrl && (
                          <Button variant="ghost" size="sm" data-testid={`button-attachment-${expense.id}`}>
                            <FileText className="h-4 w-4 mr-1" />
                            Anexo
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