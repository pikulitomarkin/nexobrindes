
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileText, CheckCircle, AlertCircle, Download, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinanceReconciliation() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  const { data: reconciliation, isLoading } = useQuery({
    queryKey: ["/api/finance/reconciliation"],
  });

  const { data: bankTransactions } = useQuery({
    queryKey: ["/api/finance/bank-transactions"],
  });

  const { data: expenses } = useQuery({
    queryKey: ["/api/finance/expenses"],
  });

  const uploadOFXMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch("/api/finance/ofx-import", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Erro ao importar arquivo OFX");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-transactions"] });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      toast({
        title: "Sucesso!",
        description: "Arquivo OFX importado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível importar o arquivo OFX",
        variant: "destructive",
      });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount).toFixed(2),
          date: new Date(data.date),
          status: 'recorded',
          createdBy: 'current-user' // TODO: Get from auth context
        }),
      });
      if (!response.ok) throw new Error("Erro ao criar lançamento de gasto");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/expenses"] });
      setIsExpenseDialogOpen(false);
      setExpenseData({
        description: "",
        amount: "",
        category: "",
        date: new Date().toISOString().split('T')[0]
      });
      toast({
        title: "Sucesso!",
        description: "Lançamento de gasto criado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o lançamento de gasto",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.name.endsWith('.ofx') || file.name.endsWith('.OFX'))) {
      setSelectedFile(file);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo OFX válido",
        variant: "destructive",
      });
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadOFXMutation.mutate(selectedFile);
    }
  };

  const handleCreateExpense = () => {
    if (expenseData.description && expenseData.amount && expenseData.category) {
      createExpenseMutation.mutate(expenseData);
    }
  };

  if (isLoading) {
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Conciliação Bancária</h1>
          <p className="text-gray-600">Importação de extratos OFX e lançamentos de gastos</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg text-white">
                <Upload className="h-4 w-4 mr-2" />
                Importar OFX
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Arquivo OFX</DialogTitle>
                <DialogDescription>
                  Selecione o arquivo OFX do seu banco para importar as transações
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ofx-file">Arquivo OFX</Label>
                  <Input
                    id="ofx-file"
                    type="file"
                    accept=".ofx,.OFX"
                    onChange={handleFileChange}
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-700">{selectedFile.name}</span>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="gradient-bg text-white"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadOFXMutation.isPending}
                  >
                    {uploadOFXMutation.isPending ? "Importando..." : "Importar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Lançar Gasto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lançamento de Gasto</DialogTitle>
                <DialogDescription>
                  Registre um gasto avulso ou despesa não relacionada a pedidos
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="expense-date">Data</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={expenseData.date}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="expense-description">Descrição</Label>
                  <Input
                    id="expense-description"
                    placeholder="Descreva o gasto..."
                    value={expenseData.description}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expense-amount">Valor (R$)</Label>
                    <Input
                      id="expense-amount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={expenseData.amount}
                      onChange={(e) => setExpenseData(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expense-category">Categoria</Label>
                    <select
                      id="expense-category"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={expenseData.category}
                      onChange={(e) => setExpenseData(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      <option value="operational">Operacional</option>
                      <option value="marketing">Marketing</option>
                      <option value="travel">Viagem</option>
                      <option value="equipment">Equipamento</option>
                      <option value="supplies">Material</option>
                      <option value="services">Serviços</option>
                      <option value="other">Outros</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="gradient-bg text-white"
                    onClick={handleCreateExpense}
                    disabled={!expenseData.description || !expenseData.amount || !expenseData.category || createExpenseMutation.isPending}
                  >
                    {createExpenseMutation.isPending ? "Salvando..." : "Salvar Gasto"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transações Conciliadas</p>
                <p className="text-3xl font-bold gradient-text">
                  {reconciliation?.reconciled || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-3xl font-bold gradient-text">
                  {reconciliation?.pending || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gastos do Mês</p>
                <p className="text-3xl font-bold gradient-text">
                  R$ {(expenses?.filter((e: any) => {
                    const expenseMonth = new Date(e.date).getMonth();
                    const currentMonth = new Date().getMonth();
                    return expenseMonth === currentMonth;
                  }).reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0) || 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-3xl font-bold gradient-text">
                  R$ {(reconciliation?.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import History and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Importações OFX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bankTransactions?.slice(0, 5).map((transaction: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm text-gray-600">{transaction.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-green-600">
                      R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`status-badge ${
                      transaction.isMatched ? 'status-confirmed' : 'status-pending'
                    }`}>
                      {transaction.isMatched ? 'Conciliado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              )) || [
                { date: "15/11/2024 14:30", transactions: 12, status: "success" },
                { date: "10/11/2024 09:15", transactions: 18, status: "success" },
                { date: "05/11/2024 16:45", transactions: 8, status: "partial" },
                { date: "01/11/2024 11:20", transactions: 15, status: "success" },
              ].map((import_, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{import_.date}</p>
                    <p className="text-sm text-gray-600">{import_.transactions} transações</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`status-badge ${
                      import_.status === 'success' ? 'status-confirmed' : 
                      import_.status === 'partial' ? 'status-pending' : 
                      'status-cancelled'
                    }`}>
                      {import_.status === 'success' ? 'Sucesso' : 
                       import_.status === 'partial' ? 'Parcial' : 
                       'Falha'}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenses?.slice(0, 5).map((expense: any) => (
                <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{expense.description}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(expense.date).toLocaleDateString('pt-BR')} • {expense.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      R$ {parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`status-badge ${
                      expense.status === 'approved' ? 'status-confirmed' : 'status-pending'
                    }`}>
                      {expense.status === 'approved' ? 'Aprovado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              )) || []}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Table */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Transações Bancárias Recentes</CardTitle>
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
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bankTransactions?.slice(0, 10).map((transaction: any) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.orderNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`status-badge ${
                        transaction.isMatched ? 'status-confirmed' : 'status-pending'
                      }`}>
                        {transaction.isMatched ? 'Conciliado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                )) || [
                  { date: "15/11/2024", description: "PIX - João Silva", value: 735.00, order: "#12345", status: "reconciled" },
                  { date: "14/11/2024", description: "TED - Ana Costa", value: 567.00, order: "#12346", status: "reconciled" },
                  { date: "13/11/2024", description: "PIX - Maria Santos", value: 1890.50, order: null, status: "pending" },
                ].map((transaction, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {transaction.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.order || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`status-badge ${
                        transaction.status === 'reconciled' ? 'status-confirmed' : 'status-pending'
                      }`}>
                        {transaction.status === 'reconciled' ? 'Conciliado' : 'Pendente'}
                      </span>
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
