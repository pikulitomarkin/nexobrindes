
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
import { Search, Eye, DollarSign, TrendingDown, FileText, Upload, Plus, Calendar, Receipt, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinanceExpenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expenseData, setExpenseData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: "",
    amount: "",
    category: "",
    description: ""
  });
  const { toast } = useToast();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["/api/finance/expenses"],
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          amount: parseFloat(data.amount).toFixed(2),
          category: data.category,
          date: data.date,
          description: data.description || '',
          status: 'recorded',
          createdBy: 'admin-1'
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
        name: "",
        amount: "",
        category: "",
        description: ""
      });
      setSelectedFile(null);
      toast({
        title: "Sucesso!",
        description: "Nota de despesa criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a nota de despesa",
        variant: "destructive",
      });
    },
  });

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      operational: <DollarSign className="h-4 w-4" />,
      marketing: <TrendingDown className="h-4 w-4" />,
      travel: <Calendar className="h-4 w-4" />,
      equipment: <Receipt className="h-4 w-4" />,
      material: <Receipt className="h-4 w-4" />,
      transport: <Calendar className="h-4 w-4" />,
      other: <FileText className="h-4 w-4" />,
    };

    return iconMap[category as keyof typeof iconMap] || iconMap.other;
  };

  const getCategoryLabel = (category: string) => {
    const labelMap = {
      operational: "Operacional",
      marketing: "Marketing",
      travel: "Viagem",
      equipment: "Equipamento",
      material: "Material",
      transport: "Transporte",
      other: "Outros"
    };
    return labelMap[category as keyof typeof labelMap] || category;
  };

  const filteredExpenses = (expenses || [])?.filter((expense: any) => {
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateExpense = () => {
    if (expenseData.name && expenseData.amount && expenseData.category) {
      createExpenseMutation.mutate({
        ...expenseData,
        amount: parseFloat(expenseData.amount).toFixed(2),
        date: new Date(expenseData.date),
      });
    }
  };

  const [viewExpenseDialogOpen, setViewExpenseDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);

  const handleViewExpense = (expense: any) => {
    setSelectedExpense(expense);
    setViewExpenseDialogOpen(true);
  };

  const totalExpenses = (expenses || [])?.reduce((sum: number, e: any) => sum + parseFloat(e.amount || '0'), 0) || 0;
  const approvedExpenses = (expenses || [])?.filter((e: any) => e.status === 'approved').length || 0;
  const pendingExpenses = (expenses || [])?.filter((e: any) => e.status === 'pending').length || 0;
  const thisMonthExpenses = (expenses || [])?.filter((e: any) => {
    if (!e.createdAt && !e.date) return false;
    const expenseDate = new Date(e.createdAt || e.date);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  }).reduce((sum: number, e: any) => sum + parseFloat(e.amount || '0'), 0) || 0;

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notas de Despesas</h1>
          <p className="text-gray-600">Controle de gastos e despesas da empresa</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Nota de Despesa</DialogTitle>
              <DialogDescription>
                Registre uma nova despesa para controle interno
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expense-date">Data <span className="text-red-500">*</span></Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={expenseData.date}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
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
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="expense-category">Categoria <span className="text-red-500">*</span></Label>
                <Select 
                  value={expenseData.category} 
                  onValueChange={(value) => setExpenseData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operacional</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="travel">Viagem</SelectItem>
                    <SelectItem value="equipment">Equipamento</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="transport">Transporte</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expense-name">Nome da Despesa <span className="text-red-500">*</span></Label>
                <Input
                  id="expense-name"
                  placeholder="Nome da despesa..."
                  value={expenseData.name}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="expense-description">Descrição (Opcional)</Label>
                <Textarea
                  id="expense-description"
                  placeholder="Descrição adicional..."
                  value={expenseData.description}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="expense-attachment">Comprovante (Opcional)</Label>
                <Input
                  id="expense-attachment"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  accept="image/*,.pdf"
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-900 mb-2">Informações Importantes</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Esta nota é apenas para controle interno e não afeta cálculos do sistema.</li>
                  <li>• Anexe o comprovante de despesa quando disponível.</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="gradient-bg text-white px-6"
                  onClick={handleCreateExpense}
                  disabled={!expenseData.category || !expenseData.name || !expenseData.amount || createExpenseMutation.isPending}
                >
                  {createExpenseMutation.isPending ? "Salvando..." : "Salvar Despesa"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Visualização da Despesa */}
        <Dialog open={viewExpenseDialogOpen} onOpenChange={setViewExpenseDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Despesa</DialogTitle>
              <DialogDescription>
                Informações completas da nota de despesa
              </DialogDescription>
            </DialogHeader>
            {selectedExpense && (
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Data</Label>
                    <p className="text-sm font-semibold">
                      {selectedExpense.date ? new Date(selectedExpense.date).toLocaleDateString('pt-BR') : 
                       selectedExpense.createdAt ? new Date(selectedExpense.createdAt).toLocaleDateString('pt-BR') : 
                       'Data não informada'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Valor</Label>
                    <p className="text-lg font-bold text-red-600">
                      R$ {parseFloat(selectedExpense.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Categoria</Label>
                    <div className="flex items-center mt-1">
                      {getCategoryIcon(selectedExpense.category)}
                      <span className="ml-2 font-medium">{getCategoryLabel(selectedExpense.category)}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <div className="mt-1">
                      <Badge variant={selectedExpense.status === 'approved' ? 'default' : 'secondary'}>
                        {selectedExpense.status === 'approved' ? 'Aprovada' : 
                         selectedExpense.status === 'recorded' ? 'Registrada' : 
                         selectedExpense.status === 'pending' ? 'Pendente' : selectedExpense.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Nome da Despesa */}
                <div>
                  <Label className="text-sm font-medium text-gray-600">Nome da Despesa</Label>
                  <p className="mt-1 font-semibold">
                    {selectedExpense.name || selectedExpense.description || 'Não informado'}
                  </p>
                </div>

                {/* Descrição (se houver) */}
                {selectedExpense.description && selectedExpense.name && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Descrição Adicional</Label>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedExpense.description.replace(selectedExpense.name, '').replace(' - ', '').trim() || 'Nenhuma descrição adicional'}
                    </p>
                  </div>
                )}

                {/* Comprovante/Anexo */}
                <div>
                  <Label className="text-sm font-medium text-gray-600">Comprovante</Label>
                  {selectedExpense.attachmentUrl ? (
                    <div className="mt-2 p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="text-sm font-medium">Anexo disponível</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(selectedExpense.attachmentUrl, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Anexo
                        </Button>
                      </div>
                      {/* Preview do anexo se for imagem */}
                      {selectedExpense.attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                        <div className="mt-3">
                          <img 
                            src={selectedExpense.attachmentUrl} 
                            alt="Comprovante da despesa"
                            className="max-w-full h-auto max-h-64 object-contain rounded border"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">Nenhum comprovante anexado</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Informações de Criação */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Criado em</Label>
                      <p>{selectedExpense.createdAt ? new Date(selectedExpense.createdAt).toLocaleString('pt-BR') : 'Não informado'}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Criado por</Label>
                      <p>{selectedExpense.createdBy || 'Sistema'}</p>
                    </div>
                  </div>

                  {selectedExpense.approvedBy && (
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-2">
                      <div>
                        <Label className="text-xs font-medium text-gray-500">Aprovado em</Label>
                        <p>{selectedExpense.approvedAt ? new Date(selectedExpense.approvedAt).toLocaleString('pt-BR') : 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-500">Aprovado por</Label>
                        <p>{selectedExpense.approvedBy}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setViewExpenseDialogOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
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
                <p className="text-2xl font-bold gradient-text">
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
                <p className="text-2xl font-bold gradient-text">
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
                <p className="text-2xl font-bold gradient-text">
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
                <p className="text-2xl font-bold gradient-text">
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
                  placeholder="Buscar por nome ou descrição..."
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
                  <SelectItem value="approved">Aprovada</SelectItem>
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
                    Nome da Despesa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses?.map((expense: any) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.date ? new Date(expense.date).toLocaleDateString('pt-BR') : 
                       expense.createdAt ? new Date(expense.createdAt).toLocaleDateString('pt-BR') : 
                       'Data não informada'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {getCategoryIcon(expense.category)}
                        <span className="ml-2">{getCategoryLabel(expense.category)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{expense.name || expense.description}</div>
                        {expense.description && expense.name && (
                          <div className="text-gray-500 text-xs">{expense.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {parseFloat(expense.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewExpense(expense)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {expense.attachmentUrl && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.open(expense.attachmentUrl, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Anexo
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!filteredExpenses || filteredExpenses.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Nenhuma despesa encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
