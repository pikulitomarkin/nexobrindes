
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { 
  FileText, TrendingUp, DollarSign, Users, Factory, Calendar, 
  Filter, Download, Eye, ArrowUpRight, ArrowDownRight, 
  CreditCard, Receipt, Banknote, UserCheck, Clock, CheckCircle2
} from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AdminReports() {
  const [dateFilter, setDateFilter] = useState('30');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Queries para buscar dados reais do sistema
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await fetch("/api/orders");
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
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

  // Filtrar dados baseado nos filtros selecionados
  const filterDateRange = (date: string) => {
    if (dateFilter === 'all') return true;
    const itemDate = new Date(date);
    const now = new Date();
    const daysAgo = parseInt(dateFilter);
    const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    return itemDate >= cutoffDate;
  };

  const filteredOrders = orders.filter((order: any) => 
    filterDateRange(order.createdAt) &&
    (statusFilter === 'all' || order.status === statusFilter) &&
    (vendorFilter === 'all' || order.vendorId === vendorFilter)
  );

  // CONTAS A RECEBER
  const contasAReceber = receivables.filter((r: any) => 
    r.status !== 'paid' && filterDateRange(r.createdAt)
  );
  const totalContasAReceber = contasAReceber.reduce((sum: number, r: any) => 
    sum + (parseFloat(r.amount) - parseFloat(r.receivedAmount)), 0
  );

  // CONTAS A PAGAR
  const contasAPagar = producerPayments.filter((p: any) => 
    p.status === 'pending' && filterDateRange(p.createdAt)
  );
  const totalContasAPagar = contasAPagar.reduce((sum: number, p: any) => 
    sum + parseFloat(p.amount), 0
  );

  // CONTAS PAGAS
  const contasPagas = receivables.filter((r: any) => 
    r.status === 'paid' && filterDateRange(r.updatedAt)
  );
  const totalContasPagas = contasPagas.reduce((sum: number, r: any) => 
    sum + parseFloat(r.amount), 0
  );

  // COMISSÕES A PAGAR
  const comissoesAPagar = commissions.filter((c: any) => 
    ['pending', 'confirmed'].includes(c.status) && filterDateRange(c.createdAt)
  );
  const totalComissoesAPagar = comissoesAPagar.reduce((sum: number, c: any) => 
    sum + parseFloat(c.amount), 0
  );

  // COMISSÕES PAGAS
  const comissoesPagas = commissions.filter((c: any) => 
    c.status === 'paid' && filterDateRange(c.updatedAt)
  );
  const totalComissoesPagas = comissoesPagas.reduce((sum: number, c: any) => 
    sum + parseFloat(c.amount), 0
  );

  // PRODUTORES A PAGAR
  const produtoresAPagar = producerPayments.filter((p: any) => 
    ['pending', 'approved'].includes(p.status) && filterDateRange(p.createdAt)
  );
  const totalProdutoresAPagar = produtoresAPagar.reduce((sum: number, p: any) => 
    sum + parseFloat(p.amount), 0
  );

  // PRODUTORES PAGOS
  const produtoresPagos = producerPayments.filter((p: any) => 
    p.status === 'paid' && filterDateRange(p.updatedAt)
  );
  const totalProdutoresPagos = produtoresPagos.reduce((sum: number, p: any) => 
    sum + parseFloat(p.amount), 0
  );

  // EVOLUÇÃO DE PEDIDOS POR MÊS
  const pedidosPorMes = filteredOrders.reduce((acc: any, order: any) => {
    const month = new Date(order.createdAt).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' });
    if (!acc[month]) {
      acc[month] = { mes: month, pedidos: 0, valor: 0 };
    }
    acc[month].pedidos += 1;
    acc[month].valor += parseFloat(order.totalValue);
    return acc;
  }, {});

  const evolucaoPedidos = Object.values(pedidosPorMes).sort((a: any, b: any) => 
    new Date(a.mes).getTime() - new Date(b.mes).getTime()
  );

  // PEDIDOS POR STATUS
  const pedidosPorStatus = filteredOrders.reduce((acc: any, order: any) => {
    if (!acc[order.status]) {
      acc[order.status] = { status: order.status, quantidade: 0, valor: 0 };
    }
    acc[order.status].quantidade += 1;
    acc[order.status].valor += parseFloat(order.totalValue);
    return acc;
  }, {});

  const statusData = Object.values(pedidosPorStatus);

  // PEDIDOS POR VENDEDOR
  const pedidosPorVendedor = filteredOrders.reduce((acc: any, order: any) => {
    const vendorName = vendors.find((v: any) => v.id === order.vendorId)?.name || 'Sem Vendedor';
    if (!acc[vendorName]) {
      acc[vendorName] = { vendedor: vendorName, pedidos: 0, valor: 0 };
    }
    acc[vendorName].pedidos += 1;
    acc[vendorName].valor += parseFloat(order.totalValue);
    return acc;
  }, {});

  const vendedorData = Object.values(pedidosPorVendedor);

  // MÉTRICAS GERAIS
  const totalPedidos = filteredOrders.length;
  const valorTotalPedidos = filteredOrders.reduce((sum: number, order: any) => 
    sum + parseFloat(order.totalValue), 0
  );
  const ticketMedio = totalPedidos > 0 ? valorTotalPedidos / totalPedidos : 0;

  const handleExport = (reportType: string) => {
    // Implementar exportação de relatórios
    console.log(`Exportando relatório: ${reportType}`);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-2">Análises e métricas detalhadas do sistema</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
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
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas a Receber</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalContasAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {contasAReceber.length} contas pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas a Pagar</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {totalContasAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {contasAPagar.length} pagamentos pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Pendentes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {totalComissoesAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {comissoesAPagar.length} comissões a pagar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos do Período</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPedidos}</div>
            <p className="text-xs text-muted-foreground">
              Ticket médio: R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="financeiro" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
        </TabsList>

        {/* Aba Financeiro */}
        <TabsContent value="financeiro" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contas a Receber */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Contas a Receber</CardTitle>
                <Button size="sm" variant="outline" onClick={() => handleExport('receivables')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contasAReceber.slice(0, 5).map((conta: any) => (
                    <div key={conta.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{conta.description}</p>
                        <p className="text-sm text-gray-500">
                          Vencimento: {new Date(conta.dueDate).toLocaleDateString('pt-BR')}
                        </p>
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
                  {contasAReceber.length > 5 && (
                    <p className="text-sm text-center text-gray-500">
                      + {contasAReceber.length - 5} contas a mais
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contas a Pagar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Contas a Pagar</CardTitle>
                <Button size="sm" variant="outline" onClick={() => handleExport('payables')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contasAPagar.slice(0, 5).map((conta: any) => (
                    <div key={conta.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Pagamento Produtor</p>
                        <p className="text-sm text-gray-500">
                          Pedido: {conta.orderNumber}
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
                  {contasAPagar.length > 5 && (
                    <p className="text-sm text-center text-gray-500">
                      + {contasAPagar.length - 5} contas a mais
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Fluxo de Caixa */}
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa - Entradas vs Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={evolucaoPedidos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [
                      `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      'Valor'
                    ]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stackId="1" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    name="Receita"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Vendas */}
        <TabsContent value="vendas" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolução de Pedidos */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={evolucaoPedidos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="pedidos" 
                      stroke="#8884d8" 
                      name="Quantidade"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pedidos por Status */}
            <Card>
              <CardHeader>
                <CardTitle>Pedidos por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, quantidade }) => `${status}: ${quantidade}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="quantidade"
                    >
                      {statusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Ranking de Vendedores */}
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendedorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vendedor" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'valor' ? 
                        `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
                        value,
                      name === 'valor' ? 'Faturamento' : 'Pedidos'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="pedidos" fill="#8884d8" name="Pedidos" />
                  <Bar dataKey="valor" fill="#82ca9d" name="Faturamento" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Produção */}
        <TabsContent value="producao" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produtores - Valores a Pagar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Produtores a Pagar</CardTitle>
                <Button size="sm" variant="outline" onClick={() => handleExport('producers-payable')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {produtoresAPagar.slice(0, 5).map((pagamento: any) => (
                    <div key={pagamento.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pagamento.producerName}</p>
                        <p className="text-sm text-gray-500">
                          Pedido: {pagamento.orderNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">
                          R$ {parseFloat(pagamento.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant={pagamento.status === 'pending' ? 'destructive' : 'secondary'}>
                          {pagamento.status === 'pending' ? 'Pendente' : 'Aprovado'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Produtores - Valores Pagos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Produtores Pagos</CardTitle>
                <Button size="sm" variant="outline" onClick={() => handleExport('producers-paid')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {produtoresPagos.slice(0, 5).map((pagamento: any) => (
                    <div key={pagamento.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pagamento.producerName}</p>
                        <p className="text-sm text-gray-500">
                          Pedido: {pagamento.orderNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          R$ {parseFloat(pagamento.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Pago
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba Comissões */}
        <TabsContent value="comissoes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Comissões a Pagar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Comissões a Pagar</CardTitle>
                <Button size="sm" variant="outline" onClick={() => handleExport('commissions-payable')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comissoesAPagar.slice(0, 5).map((comissao: any) => (
                    <div key={comissao.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {comissao.vendorName || comissao.partnerName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Pedido: {comissao.orderNumber} ({comissao.percentage}%)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-orange-600">
                          R$ {parseFloat(comissao.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant={comissao.status === 'confirmed' ? 'default' : 'secondary'}>
                          {comissao.status === 'pending' ? 'Pendente' : 'Confirmado'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Comissões Pagas */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Comissões Pagas</CardTitle>
                <Button size="sm" variant="outline" onClick={() => handleExport('commissions-paid')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comissoesPagas.slice(0, 5).map((comissao: any) => (
                    <div key={comissao.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {comissao.vendorName || comissao.partnerName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Pedido: {comissao.orderNumber} ({comissao.percentage}%)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          R$ {parseFloat(comissao.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Pago
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Comissões por Período */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução das Comissões</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={evolucaoPedidos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [
                      `R$ ${(value * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      'Comissões (10%)'
                    ]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey={(data: any) => data.valor * 0.1} 
                    stackId="1" 
                    stroke="#ff7300" 
                    fill="#ff7300" 
                    name="Comissões"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
