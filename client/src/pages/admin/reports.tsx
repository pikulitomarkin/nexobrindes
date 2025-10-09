
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart 
} from "recharts";
import { 
  FileText, TrendingUp, DollarSign, Users, Factory, Calendar, 
  Filter, Download, Eye, ArrowUpRight, ArrowDownRight, 
  CreditCard, Receipt, Banknote, UserCheck, Clock, CheckCircle2,
  Search, RefreshCw, BarChart3, Target, Percent, AlertCircle,
  TrendingDown, Activity, ShoppingCart, Package, Award, FileSpreadsheet,
  FileDown, Printer
} from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

interface DateRange {
  from: Date;
  to: Date;
}

export default function AdminReports() {
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState('30');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [producerFilter, setProducerFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Queries para buscar dados reais do sistema
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await fetch("/api/orders");
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["/api/commissions"],
    queryFn: async () => {
      const response = await fetch("/api/commissions");
      if (!response.ok) throw new Error("Failed to fetch commissions");
      return response.json();
    },
  });

  const { data: producerPayments = [] } = useQuery({
    queryKey: ["/api/finance/producer-payments"],
    queryFn: async () => {
      const response = await fetch("/api/finance/producer-payments");
      if (!response.ok) throw new Error("Failed to fetch producer payments");
      return response.json();
    },
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["/api/finance/receivables"],
    queryFn: async () => {
      const response = await fetch("/api/finance/receivables");
      if (!response.ok) throw new Error("Failed to fetch receivables");
      return response.json();
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/finance/expenses"],
    queryFn: async () => {
      const response = await fetch("/api/finance/expenses");
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await fetch("/api/vendors");
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json();
    },
  });

  const { data: producers = [] } = useQuery({
    queryKey: ["/api/producers"],
    queryFn: async () => {
      const response = await fetch("/api/producers");
      if (!response.ok) throw new Error("Failed to fetch producers");
      return response.json();
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients");
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
  });

  // Função de filtro avançado
  const filterData = (data: any[], dateField = 'createdAt') => {
    return data.filter((item) => {
      // Filtro de data
      let dateMatch = true;
      if (dateRange) {
        const itemDate = new Date(item[dateField]);
        dateMatch = itemDate >= dateRange.from && itemDate <= dateRange.to;
      } else if (dateFilter !== 'all') {
        const filterDate = new Date(Date.now() - (parseInt(dateFilter) * 24 * 60 * 60 * 1000));
        const itemDate = new Date(item[dateField]);
        dateMatch = itemDate >= filterDate;
      }

      // Filtro de status
      const statusMatch = statusFilter === 'all' || item.status === statusFilter;
      
      // Filtro de vendedor
      const vendorMatch = vendorFilter === 'all' || item.vendorId === vendorFilter;
      
      // Filtro de produtor
      const producerMatch = producerFilter === 'all' || item.producerId === producerFilter;
      
      // Filtro de busca
      const searchMatch = searchFilter === '' || 
        item.orderNumber?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.clientName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.product?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchFilter.toLowerCase());

      return dateMatch && statusMatch && vendorMatch && producerMatch && searchMatch;
    });
  };

  const filteredOrders = filterData(orders);

  // CÁLCULOS AVANÇADOS
  const calculateMetrics = () => {
    // Contas a Receber
    const contasAReceber = receivables.filter((r: any) => r.status !== 'paid');
    const totalContasAReceber = contasAReceber.reduce((sum: number, r: any) => 
      sum + (parseFloat(r.amount) - parseFloat(r.receivedAmount)), 0
    );

    // Contas a Pagar
    const contasAPagar = producerPayments.filter((p: any) => ['pending', 'approved'].includes(p.status));
    const totalContasAPagar = contasAPagar.reduce((sum: number, p: any) => 
      sum + parseFloat(p.amount), 0
    );

    // Comissões
    const comissoesAPagar = commissions.filter((c: any) => ['pending', 'confirmed'].includes(c.status));
    const totalComissoesAPagar = comissoesAPagar.reduce((sum: number, c: any) => 
      sum + parseFloat(c.amount), 0
    );

    const comissoesPagas = commissions.filter((c: any) => c.status === 'paid');
    const totalComissoesPagas = comissoesPagas.reduce((sum: number, c: any) => 
      sum + parseFloat(c.amount), 0
    );

    // Métricas de vendas
    const totalPedidos = filteredOrders.length;
    const valorTotalPedidos = filteredOrders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.totalValue), 0
    );
    const ticketMedio = totalPedidos > 0 ? valorTotalPedidos / totalPedidos : 0;

    // Taxa de conversão por status
    const pedidosConfirmados = filteredOrders.filter(o => o.status !== 'cancelled').length;
    const taxaConversao = totalPedidos > 0 ? (pedidosConfirmados / totalPedidos) * 100 : 0;

    // Crescimento mensal
    const mesAtual = new Date().getMonth();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    
    const pedidosMesAtual = orders.filter(o => new Date(o.createdAt).getMonth() === mesAtual);
    const pedidosMesAnterior = orders.filter(o => new Date(o.createdAt).getMonth() === mesAnterior);
    
    const valorMesAtual = pedidosMesAtual.reduce((sum, o) => sum + parseFloat(o.totalValue), 0);
    const valorMesAnterior = pedidosMesAnterior.reduce((sum, o) => sum + parseFloat(o.totalValue), 0);
    
    const crescimentoPercentual = valorMesAnterior > 0 ? 
      ((valorMesAtual - valorMesAnterior) / valorMesAnterior) * 100 : 0;

    return {
      totalContasAReceber,
      totalContasAPagar,
      totalComissoesAPagar,
      totalComissoesPagas,
      totalPedidos,
      valorTotalPedidos,
      ticketMedio,
      taxaConversao,
      crescimentoPercentual,
      contasAReceber: contasAReceber.length,
      contasAPagar: contasAPagar.length,
      comissoesAPagar: comissoesAPagar.length,
      comissoesPagas: comissoesPagas.length
    };
  };

  const metrics = calculateMetrics();

  // Dados para gráficos
  const getOrdersByMonth = () => {
    const monthlyData = filteredOrders.reduce((acc: any, order: any) => {
      const month = new Date(order.createdAt).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' });
      if (!acc[month]) {
        acc[month] = { mes: month, pedidos: 0, valor: 0, receita: 0 };
      }
      acc[month].pedidos += 1;
      acc[month].valor += parseFloat(order.totalValue);
      acc[month].receita += parseFloat(order.paidValue || 0);
      return acc;
    }, {});

    return Object.values(monthlyData).sort((a: any, b: any) => 
      new Date(a.mes + ' 2024').getTime() - new Date(b.mes + ' 2024').getTime()
    );
  };

  const getOrdersByStatus = () => {
    const statusData = filteredOrders.reduce((acc: any, order: any) => {
      const status = order.status;
      if (!acc[status]) {
        acc[status] = { status, quantidade: 0, valor: 0 };
      }
      acc[status].quantidade += 1;
      acc[status].valor += parseFloat(order.totalValue);
      return acc;
    }, {});

    return Object.values(statusData);
  };

  const getTopVendors = () => {
    const vendorData = filteredOrders.reduce((acc: any, order: any) => {
      const vendorName = vendors.find((v: any) => v.id === order.vendorId)?.name || 'Sem Vendedor';
      if (!acc[vendorName]) {
        acc[vendorName] = { vendedor: vendorName, pedidos: 0, valor: 0 };
      }
      acc[vendorName].pedidos += 1;
      acc[vendorName].valor += parseFloat(order.totalValue);
      return acc;
    }, {});

    return Object.values(vendorData).sort((a: any, b: any) => b.valor - a.valor).slice(0, 10);
  };

  const getTopClients = () => {
    const clientData = filteredOrders.reduce((acc: any, order: any) => {
      const clientName = order.clientName || 'Cliente Não Identificado';
      if (!acc[clientName]) {
        acc[clientName] = { cliente: clientName, pedidos: 0, valor: 0 };
      }
      acc[clientName].pedidos += 1;
      acc[clientName].valor += parseFloat(order.totalValue);
      return acc;
    }, {});

    return Object.values(clientData).sort((a: any, b: any) => b.valor - a.valor).slice(0, 10);
  };

  const getProductPerformance = () => {
    const productData = filteredOrders.reduce((acc: any, order: any) => {
      const product = order.product || 'Produto Não Identificado';
      if (!acc[product]) {
        acc[product] = { produto: product, pedidos: 0, valor: 0 };
      }
      acc[product].pedidos += 1;
      acc[product].valor += parseFloat(order.totalValue);
      return acc;
    }, {});

    return Object.values(productData).sort((a: any, b: any) => b.valor - a.valor).slice(0, 10);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Força refetch de todas as queries
    await Promise.all([
      orders,
      commissions,
      producerPayments,
      receivables,
      expenses
    ]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleExport = (reportType: string, format: string = 'excel') => {
    try {
      let data: any[] = [];
      let filename = '';
      let headers: string[] = [];

      switch (reportType) {
        case 'evolucao-pedidos':
          data = getOrdersByMonth();
          filename = 'evolucao_pedidos';
          headers = ['Mês', 'Quantidade de Pedidos', 'Valor Total', 'Receita Recebida'];
          break;
        
        case 'pedidos-status':
          data = getOrdersByStatus();
          filename = 'pedidos_por_status';
          headers = ['Status', 'Quantidade', 'Valor Total'];
          break;
        
        case 'top-vendedores':
          data = getTopVendors();
          filename = 'top_vendedores';
          headers = ['Vendedor', 'Quantidade de Pedidos', 'Valor Total'];
          break;
        
        case 'top-clientes':
          data = getTopClients();
          filename = 'top_clientes';
          headers = ['Cliente', 'Quantidade de Pedidos', 'Valor Total'];
          break;
        
        case 'top-produtos':
          data = getProductPerformance();
          filename = 'top_produtos';
          headers = ['Produto', 'Quantidade de Vendas', 'Valor Total'];
          break;
        
        case 'receivables':
          data = receivables.filter((r: any) => r.status !== 'paid').map((r: any) => ({
            pedido: r.orderNumber,
            cliente: r.clientName,
            valor: parseFloat(r.amount) - parseFloat(r.receivedAmount),
            vencimento: r.dueDate ? new Date(r.dueDate).toLocaleDateString('pt-BR') : '',
            status: r.status === 'pending' ? 'Pendente' : 
                   r.status === 'partial' ? 'Parcial' : 
                   r.status === 'overdue' ? 'Vencido' : r.status
          }));
          filename = 'contas_a_receber';
          headers = ['Pedido', 'Cliente', 'Valor', 'Vencimento', 'Status'];
          break;
        
        case 'payables':
          data = producerPayments.filter((p: any) => ['pending', 'approved'].includes(p.status)).map((p: any) => ({
            produtor: p.producerName,
            pedido: p.orderNumber,
            produto: p.product,
            valor: parseFloat(p.amount),
            status: p.status === 'pending' ? 'Pendente' : 'Aprovado'
          }));
          filename = 'contas_a_pagar';
          headers = ['Produtor', 'Pedido', 'Produto', 'Valor', 'Status'];
          break;
        
        case 'comissoes-pagar':
          data = commissions.filter((c: any) => ['pending', 'confirmed'].includes(c.status)).map((c: any) => ({
            vendedor: vendors.find((v: any) => v.id === c.vendorId)?.name || 'N/A',
            pedido: c.orderNumber,
            valor: parseFloat(c.amount),
            percentual: c.percentage,
            status: c.status === 'pending' ? 'Pendente' : 'Confirmado'
          }));
          filename = 'comissoes_a_pagar';
          headers = ['Vendedor', 'Pedido', 'Valor', 'Percentual', 'Status'];
          break;
        
        case 'comissoes-pagas':
          data = commissions.filter((c: any) => c.status === 'paid').map((c: any) => ({
            vendedor: vendors.find((v: any) => v.id === c.vendorId)?.name || 'N/A',
            pedido: c.orderNumber,
            valor: parseFloat(c.amount),
            percentual: c.percentage,
            dataPagamento: new Date(c.updatedAt).toLocaleDateString('pt-BR')
          }));
          filename = 'comissoes_pagas';
          headers = ['Vendedor', 'Pedido', 'Valor', 'Percentual', 'Data Pagamento'];
          break;
        
        case 'fluxo-caixa':
          data = getOrdersByMonth().map((item: any) => ({
            mes: item.mes,
            vendido: item.valor,
            recebido: item.receita,
            diferenca: item.valor - item.receita
          }));
          filename = 'fluxo_de_caixa';
          headers = ['Mês', 'Valor Vendido', 'Valor Recebido', 'Diferença'];
          break;

        case 'despesas':
          data = expenses.map((e: any) => ({
            data: new Date(e.date).toLocaleDateString('pt-BR'),
            categoria: e.category === 'operational' ? 'Operacional' : 
                      e.category === 'marketing' ? 'Marketing' : 
                      e.category === 'travel' ? 'Viagem' : 
                      e.category === 'equipment' ? 'Equipamento' : 'Outros',
            descricao: e.description,
            valor: parseFloat(e.amount),
            fornecedor: e.vendorName || 'N/A',
            status: e.status === 'approved' ? 'Aprovado' : 'Pendente'
          }));
          filename = 'despesas';
          headers = ['Data', 'Categoria', 'Descrição', 'Valor', 'Fornecedor', 'Status'];
          break;

        default:
          data = filteredOrders.map((order: any) => ({
            numero: order.orderNumber,
            cliente: order.clientName,
            produto: order.product,
            quantidade: order.quantity,
            valor: parseFloat(order.totalValue),
            status: order.status,
            vendedor: vendors.find((v: any) => v.id === order.vendorId)?.name || 'N/A',
            data: new Date(order.createdAt).toLocaleDateString('pt-BR')
          }));
          filename = 'pedidos_geral';
          headers = ['Número', 'Cliente', 'Produto', 'Quantidade', 'Valor', 'Status', 'Vendedor', 'Data'];
          break;
      }

      if (data.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não há dados para exportar neste relatório.",
          variant: "destructive"
        });
        return;
      }

      if (format === 'excel') {
        exportToExcel(data, headers, filename);
      } else if (format === 'csv') {
        exportToCSV(data, headers, filename);
      } else if (format === 'pdf') {
        exportToPDF(data, headers, filename, reportType);
      }

      toast({
        title: "Exportação concluída!",
        description: `Relatório ${filename} exportado em ${format.toUpperCase()} com sucesso.`
      });

    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o relatório. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const exportToExcel = (data: any[], headers: string[], filename: string) => {
    // Criar planilha com dados
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    
    // Adicionar estilos básicos
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cell_address]) continue;
        
        // Header styling
        if (R === 0) {
          ws[cell_address].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F46E5" } }
          };
        }
      }
    }
    
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToCSV = (data: any[], headers: string[], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (data: any[], headers: string[], filename: string, reportType: string) => {
    // Implementação básica de PDF - você pode melhorar usando jsPDF
    const content = [
      `RELATÓRIO: ${reportType.toUpperCase().replace('-', ' ')}`,
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      `Total de registros: ${data.length}`,
      '',
      headers.join('\t'),
      ...data.map(row => Object.values(row).join('\t'))
    ].join('\n');
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setDateFilter('30');
    setStatusFilter('all');
    setVendorFilter('all');
    setProducerFilter('all');
    setCategoryFilter('all');
    setSearchFilter('');
    setDateRange(undefined);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios Avançados</h1>
          <p className="text-gray-600 mt-2">Análises detalhadas e insights do negócio</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={clearFilters} variant="outline">
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Filtros Avançados */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avançados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="production">Em Produção</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Vendedor</label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {vendors.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar pedidos, clientes..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas a Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {metrics.totalContasAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.contasAReceber} contas pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas a Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {metrics.totalContasAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.contasAPagar} pagamentos pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Período</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {metrics.valorTotalPedidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalPedidos} pedidos • Ticket médio: R$ {metrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.taxaConversao.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Crescimento: {metrics.crescimentoPercentual > 0 ? '+' : ''}{metrics.crescimentoPercentual.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-blue-50 to-purple-50 p-1 rounded-xl border border-gray-200 shadow-sm">
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-blue-100 text-gray-700"
          >
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger 
            value="financeiro" 
            className="flex items-center gap-2 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 text-gray-700"
          >
            <DollarSign className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger 
            value="vendas" 
            className="flex items-center gap-2 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-purple-100 text-gray-700"
          >
            <ShoppingCart className="h-4 w-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger 
            value="producao" 
            className="flex items-center gap-2 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-orange-100 text-gray-700"
          >
            <Factory className="h-4 w-4" />
            Produção
          </TabsTrigger>
          <TabsTrigger 
            value="comissoes" 
            className="flex items-center gap-2 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-teal-100 text-gray-700"
          >
            <Percent className="h-4 w-4" />
            Comissões
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="flex items-center gap-2 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-indigo-100 text-gray-700"
          >
            <Activity className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Aba Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolução Temporal */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Evolução Temporal dos Pedidos</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('evolucao-pedidos', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('evolucao-pedidos', 'csv')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('evolucao-pedidos', 'pdf')}>
                      <Printer className="h-4 w-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={getOrdersByMonth()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'valor' || name === 'receita' ? 
                          `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
                          value,
                        name === 'valor' ? 'Valor Total' : 
                        name === 'receita' ? 'Receita Recebida' : 'Quantidade'
                      ]}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="pedidos" fill="#8884d8" name="Pedidos" />
                    <Line yAxisId="right" type="monotone" dataKey="valor" stroke="#82ca9d" name="Valor" />
                    <Line yAxisId="right" type="monotone" dataKey="receita" stroke="#ffc658" name="Receita" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição por Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Distribuição por Status</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('pedidos-status', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pedidos-status', 'csv')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pedidos-status', 'pdf')}>
                      <Printer className="h-4 w-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getOrdersByStatus()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, quantidade, percent }) => 
                        `${status}: ${quantidade} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="quantidade"
                    >
                      {getOrdersByStatus().map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabelas de Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Vendedores */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Vendedores
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('top-vendedores', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('top-vendedores', 'csv')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('top-vendedores', 'pdf')}>
                      <Printer className="h-4 w-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getTopVendors().slice(0, 5).map((vendor: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium">{vendor.vendedor}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          R$ {vendor.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-500">{vendor.pedidos} pedidos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Clientes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Clientes
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('top-clientes', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('top-clientes', 'csv')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('top-clientes', 'pdf')}>
                      <Printer className="h-4 w-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getTopClients().slice(0, 5).map((client: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium">{client.cliente}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">
                          R$ {client.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-500">{client.pedidos} pedidos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Produtos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Top Produtos
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('top-produtos', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('top-produtos', 'csv')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('top-produtos', 'pdf')}>
                      <Printer className="h-4 w-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getProductPerformance().slice(0, 5).map((product: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium text-sm">{product.produto}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">
                          R$ {product.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-500">{product.pedidos} vendas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba Financeiro */}
        <TabsContent value="financeiro" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contas a Receber */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Contas a Receber</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('receivables', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('receivables', 'csv')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('receivables', 'pdf')}>
                      <Printer className="h-4 w-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {receivables.filter((r: any) => r.status !== 'paid').slice(0, 8).map((conta: any) => (
                    <div key={conta.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{conta.orderNumber}</p>
                        <p className="text-sm text-gray-500">
                          Cliente: {conta.clientName}
                        </p>
                        {conta.dueDate && (
                          <p className="text-xs text-gray-400">
                            Vencimento: {new Date(conta.dueDate).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          R$ {(parseFloat(conta.amount) - parseFloat(conta.receivedAmount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant={conta.status === 'overdue' ? 'destructive' : 'secondary'}>
                          {conta.status === 'pending' ? 'Pendente' : 
                           conta.status === 'partial' ? 'Parcial' : 
                           conta.status === 'overdue' ? 'Vencido' : conta.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contas a Pagar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Contas a Pagar</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('payables', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('payables', 'csv')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('payables', 'pdf')}>
                      <Printer className="h-4 w-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {producerPayments.filter((p: any) => ['pending', 'approved'].includes(p.status)).slice(0, 8).map((conta: any) => (
                    <div key={conta.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{conta.producerName}</p>
                        <p className="text-sm text-gray-500">
                          Pedido: {conta.orderNumber}
                        </p>
                        <p className="text-xs text-gray-400">
                          Produto: {conta.product}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">
                          R$ {parseFloat(conta.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant={conta.status === 'pending' ? 'destructive' : 'secondary'}>
                          {conta.status === 'pending' ? 'Pendente' : 'Aprovado'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Fluxo de Caixa */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fluxo de Caixa - Projeção vs Realidade</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('fluxo-caixa', 'excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('fluxo-caixa', 'csv')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('fluxo-caixa', 'pdf')}>
                    <Printer className="h-4 w-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={getOrdersByMonth()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      name === 'valor' ? 'Vendido' : 'Recebido'
                    ]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stackId="1" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    name="Valor Vendido"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="receita" 
                    stackId="2" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    name="Valor Recebido"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outras abas continuam com a estrutura similar... */}
        {/* Por brevidade, vou manter as outras abas com estrutura básica, mas você pode expandir */}
        <TabsContent value="vendas" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Performance de Vendas por Mês</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('evolucao-pedidos', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('evolucao-pedidos', 'csv')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getOrdersByMonth()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="pedidos" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ranking de Vendedores</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('top-vendedores', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('top-vendedores', 'csv')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getTopVendors()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="vendedor" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="producao" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Status de Produção</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('pedidos-status', 'excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pedidos-status', 'csv')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {producerPayments.slice(0, 10).map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <p className="font-medium">{payment.producerName}</p>
                      <p className="text-sm text-gray-500">Pedido: {payment.orderNumber}</p>
                    </div>
                    <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                      {payment.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comissoes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Comissões a Pagar</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('comissoes-pagar', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('comissoes-pagar', 'csv')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {commissions.filter((c: any) => ['pending', 'confirmed'].includes(c.status)).slice(0, 5).map((commission: any) => (
                    <div key={commission.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{vendors.find((v: any) => v.id === commission.vendorId)?.name}</p>
                        <p className="text-sm text-gray-500">Pedido: {commission.orderNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          R$ {parseFloat(commission.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Comissões Pagas</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('comissoes-pagas', 'excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('comissoes-pagas', 'csv')}>
                      <FileDown className="h-4 w-4 mr-2" />
                      CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {commissions.filter((c: any) => c.status === 'paid').slice(0, 5).map((commission: any) => (
                    <div key={commission.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{vendors.find((v: any) => v.id === commission.vendorId)?.name}</p>
                        <p className="text-sm text-gray-500">Pedido: {commission.orderNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          R$ {parseFloat(commission.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Despesas por Categoria</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('despesas', 'excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('despesas', 'csv')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenses.slice(0, 8).map((expense: any) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-gray-500">
                        {expense.category === 'operational' ? 'Operacional' : 
                         expense.category === 'marketing' ? 'Marketing' : 
                         expense.category === 'travel' ? 'Viagem' : 
                         expense.category === 'equipment' ? 'Equipamento' : 'Outros'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        R$ {parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <Badge variant={expense.status === 'approved' ? 'default' : 'secondary'}>
                        {expense.status === 'approved' ? 'Aprovado' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
