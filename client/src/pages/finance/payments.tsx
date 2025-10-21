
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, Search, Filter, Download, Calendar,
  TrendingUp, CreditCard, Banknote
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

export default function FinancePayments() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25; // Aumentado para mostrar mais itens por página

  // Query para buscar pagamentos
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["/api/finance/payments"],
    queryFn: async () => {
      const response = await fetch('/api/finance/payments');
      if (!response.ok) throw new Error('Failed to fetch payments');
      return response.json();
    },
  });

  // Função para exportar para Excel
  const exportToExcel = () => {
    try {
      const exportData = filteredPayments.map(payment => ({
        'Data': new Date(payment.paidAt || payment.createdAt).toLocaleDateString('pt-BR'),
        'Pedido': payment.orderNumber,
        'Cliente': payment.clientName,
        'Valor': `R$ ${parseFloat(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'Método': getPaymentMethodLabel(payment.method),
        'Status': getStatusLabel(payment.status),
        'ID Transação': payment.transactionId || '',
        'Valor do Pedido': `R$ ${parseFloat(payment.orderValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pagamentos");
      
      // Ajustar largura das colunas
      const colWidths = [
        { wch: 12 }, // Data
        { wch: 15 }, // Pedido
        { wch: 25 }, // Cliente
        { wch: 15 }, // Valor
        { wch: 15 }, // Método
        { wch: 12 }, // Status
        { wch: 20 }, // ID Transação
        { wch: 15 }  // Valor do Pedido
      ];
      ws['!cols'] = colWidths;

      const fileName = `historico-pagamentos-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: "Exportação concluída",
        description: `Relatório exportado como ${fileName}`,
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o relatório",
        variant: "destructive",
      });
    }
  };

  // Função para obter label do método de pagamento
  const getPaymentMethodLabel = (method: string) => {
    const methodLabels: { [key: string]: string } = {
      'pix': 'PIX',
      'credit_card': 'Cartão de Crédito',
      'bank_transfer': 'Transferência',
      'boleto': 'Boleto',
      'manual': 'Manual',
      'cash': 'Dinheiro'
    };
    return methodLabels[method] || method.toUpperCase();
  };

  // Função para obter label do status
  const getStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      'confirmed': 'Confirmado',
      'pending': 'Pendente',
      'failed': 'Falhado',
      'cancelled': 'Cancelado'
    };
    return statusLabels[status] || status;
  };

  // Filtrar pagamentos
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      (payment.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (payment.orderNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (payment.transactionId?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Paginação
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

  // Calcular totais para o resumo
  const totalRecebido = payments
    .filter(p => p.status === 'confirmed')
    .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

  const totalPendente = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

  const paymentsThisMonth = payments.filter(payment => {
    const paymentDate = new Date(payment.paidAt || payment.createdAt);
    const now = new Date();
    return paymentDate.getMonth() === now.getMonth() && 
           paymentDate.getFullYear() === now.getFullYear() &&
           payment.status === 'confirmed';
  }).reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Pagamentos</h1>
          <p className="text-gray-600 text-sm">Visualização de todos os pagamentos do sistema</p>
        </div>
        <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Resumo do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Receita Total</p>
                <p className="text-lg font-semibold text-green-600">
                  R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Receita do Mês</p>
                <p className="text-lg font-semibold text-blue-600">
                  R$ {paymentsThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Pendentes</p>
                <p className="text-lg font-semibold text-orange-600">
                  R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Banknote className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total de Pagamentos</p>
                <p className="text-lg font-semibold text-purple-600">
                  {filteredPayments.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, pedido ou transação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="failed">Falhado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Métodos</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="bank_transfer">Transferência</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pagamentos Recentes</span>
            <span className="text-sm font-normal text-gray-500">
              {filteredPayments.length} pagamento{filteredPayments.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[100px]">Data</TableHead>
                  <TableHead className="w-[120px]">Pedido</TableHead>
                  <TableHead className="w-[200px]">Cliente</TableHead>
                  <TableHead className="w-[100px]">Valor</TableHead>
                  <TableHead className="w-[120px]">Método</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[150px]">ID Transação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum pagamento encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-gray-50">
                      <TableCell className="text-xs">
                        {new Date(payment.paidAt || payment.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payment.orderNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.clientName || 'Cliente não identificado'}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        R$ {parseFloat(payment.amount).toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getPaymentMethodLabel(payment.method)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={payment.status === 'confirmed' ? 'default' : 
                                  payment.status === 'pending' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600">
                        {payment.transactionId || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-700">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredPayments.length)} de {filteredPayments.length} pagamentos
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (page <= totalPages) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    }
                    return null;
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2 text-gray-400">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-8 h-8 p-0"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
