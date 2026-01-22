import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, DollarSign, Users, Factory, 
  ShoppingCart, Package, Award, Target, Activity,
  Play, Pause, Maximize, Minimize, RefreshCw, Monitor,
  ArrowUpRight, ArrowDownRight, Clock, LogOut
} from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C', '#A855F7', '#EC4899'];

const REPORT_ROTATION_INTERVAL = 15000;

type ReportType = 
  | 'sales_overview'
  | 'top_vendors' 
  | 'top_products'
  | 'monthly_revenue'
  | 'orders_by_status'
  | 'top_clients'
  | 'daily_sales'
  | 'production_status'
  | 'financial_summary'
  | 'branch_performance';

interface ReportConfig {
  id: ReportType;
  title: string;
  icon: React.ReactNode;
  color: string;
}

const REPORT_CONFIGS: ReportConfig[] = [
  { id: 'sales_overview', title: 'Visão Geral de Vendas', icon: <TrendingUp className="h-8 w-8" />, color: 'from-blue-500 to-blue-700' },
  { id: 'top_vendors', title: 'Top Vendedores', icon: <Users className="h-8 w-8" />, color: 'from-green-500 to-green-700' },
  { id: 'top_products', title: 'Produtos Mais Vendidos', icon: <Package className="h-8 w-8" />, color: 'from-purple-500 to-purple-700' },
  { id: 'monthly_revenue', title: 'Faturamento Mensal', icon: <DollarSign className="h-8 w-8" />, color: 'from-yellow-500 to-orange-600' },
  { id: 'orders_by_status', title: 'Pedidos por Status', icon: <ShoppingCart className="h-8 w-8" />, color: 'from-pink-500 to-pink-700' },
  { id: 'top_clients', title: 'Principais Clientes', icon: <Award className="h-8 w-8" />, color: 'from-cyan-500 to-cyan-700' },
  { id: 'daily_sales', title: 'Vendas Diárias (Últimos 30 dias)', icon: <Activity className="h-8 w-8" />, color: 'from-indigo-500 to-indigo-700' },
  { id: 'production_status', title: 'Status da Produção', icon: <Factory className="h-8 w-8" />, color: 'from-amber-500 to-amber-700' },
  { id: 'financial_summary', title: 'Resumo Financeiro', icon: <Target className="h-8 w-8" />, color: 'from-red-500 to-red-700' },
  { id: 'branch_performance', title: 'Desempenho por Filial', icon: <Monitor className="h-8 w-8" />, color: 'from-teal-500 to-teal-700' },
];

export default function TvDashboard() {
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await fetch("/api/orders");
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await fetch("/api/vendors");
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients");
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const response = await fetch("/api/branches");
      if (!response.ok) throw new Error("Failed to fetch branches");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: productionOrders = [] } = useQuery({
    queryKey: ["/api/production-orders"],
    queryFn: async () => {
      const response = await fetch("/api/production-orders");
      if (!response.ok) throw new Error("Failed to fetch production orders");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["/api/finance/receivables"],
    queryFn: async () => {
      const response = await fetch("/api/finance/receivables");
      if (!response.ok) throw new Error("Failed to fetch receivables");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const nextReport = useCallback(() => {
    setCurrentReportIndex((prev) => (prev + 1) % REPORT_CONFIGS.length);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      nextReport();
    }, REPORT_ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [isPlaying, nextReport]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const confirmedOrders = orders.filter((o: any) => o.status !== 'budget' && o.status !== 'cancelled');
  const thisMonthOrders = confirmedOrders.filter((o: any) => {
    const orderDate = new Date(o.createdAt);
    const now = new Date();
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
  });

  const totalSales = confirmedOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0);
  const monthSales = thisMonthOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0);
  const avgTicket = confirmedOrders.length > 0 ? totalSales / confirmedOrders.length : 0;

  const topVendorsData = vendors
    .map((vendor: any) => {
      const vendorOrders = confirmedOrders.filter((o: any) => o.vendorId === vendor.id);
      return {
        name: vendor.name?.split(' ').slice(0, 2).join(' ') || 'N/A',
        vendas: vendorOrders.length,
        valor: vendorOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0),
      };
    })
    .sort((a: any, b: any) => b.valor - a.valor)
    .slice(0, 8);

  const productSalesMap: { [key: string]: { name: string; quantidade: number; valor: number } } = {};
  confirmedOrders.forEach((order: any) => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const productName = item.productName || 'Produto';
        if (!productSalesMap[productName]) {
          productSalesMap[productName] = { name: productName, quantidade: 0, valor: 0 };
        }
        productSalesMap[productName].quantidade += item.quantity || 1;
        productSalesMap[productName].valor += (item.unitPrice || 0) * (item.quantity || 1);
      });
    }
  });
  const topProductsData = Object.values(productSalesMap)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  const monthlyRevenueData: { [key: string]: number } = {};
  confirmedOrders.forEach((order: any) => {
    const date = new Date(order.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyRevenueData[monthKey] = (monthlyRevenueData[monthKey] || 0) + parseFloat(order.totalValue || '0');
  });
  const sortedMonths = Object.keys(monthlyRevenueData).sort().slice(-12);
  const monthlyChartData = sortedMonths.map(key => ({
    mes: new Date(key + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    valor: monthlyRevenueData[key],
  }));

  const statusCounts: { [key: string]: number } = {};
  orders.forEach((order: any) => {
    const status = order.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const statusLabels: { [key: string]: string } = {
    budget: 'Orçamento',
    pending: 'Pendente',
    confirmed: 'Confirmado',
    in_production: 'Em Produção',
    ready: 'Pronto',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
  };
  const ordersByStatusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
  }));

  const topClientsData = clients
    .map((client: any) => {
      const clientOrders = confirmedOrders.filter((o: any) => o.clientId === client.id);
      return {
        name: client.name?.split(' ').slice(0, 2).join(' ') || 'N/A',
        pedidos: clientOrders.length,
        valor: clientOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0),
      };
    })
    .sort((a: any, b: any) => b.valor - a.valor)
    .slice(0, 8);

  const dailySalesData: { [key: string]: number } = {};
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  confirmedOrders.forEach((order: any) => {
    const date = new Date(order.createdAt);
    if (date >= thirtyDaysAgo) {
      const dayKey = date.toISOString().split('T')[0];
      dailySalesData[dayKey] = (dailySalesData[dayKey] || 0) + parseFloat(order.totalValue || '0');
    }
  });
  const sortedDays = Object.keys(dailySalesData).sort();
  const dailyChartData = sortedDays.map(key => ({
    dia: new Date(key).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    valor: dailySalesData[key],
  }));

  const productionStatusCounts: { [key: string]: number } = {};
  productionOrders.forEach((po: any) => {
    const status = po.status || 'pending';
    productionStatusCounts[status] = (productionStatusCounts[status] || 0) + 1;
  });
  const productionStatusLabels: { [key: string]: string } = {
    pending: 'Pendente',
    in_production: 'Em Produção',
    production: 'Em Produção',
    completed: 'Concluído',
    delivered: 'Entregue',
    accepted: 'Aceito',
    shipped: 'Enviado',
    ready: 'Pronto',
    cancelled: 'Cancelado',
  };
  const productionStatusData = Object.entries(productionStatusCounts).map(([status, count]) => ({
    name: productionStatusLabels[status] || status,
    value: count,
  }));

  // Total a Receber: soma do saldo restante (amount - receivedAmount) para status pending e partial
  const totalReceivables = receivables
    .filter((r: any) => r.status !== 'paid' && r.status !== 'cancelled')
    .reduce((sum: number, r: any) => {
      const amount = parseFloat(r.amount || '0');
      const received = parseFloat(r.receivedAmount || '0');
      return sum + Math.max(0, amount - received);
    }, 0);
  // Total Recebido: soma do receivedAmount de todos os recebíveis
  const paidReceivables = receivables
    .reduce((sum: number, r: any) => sum + parseFloat(r.receivedAmount || '0'), 0);

  const branchPerformanceData = [
    { name: 'Matriz', valor: confirmedOrders.filter((o: any) => !o.branchId || o.branchId === 'matriz').reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0) },
    ...branches.map((branch: any) => ({
      name: branch.name?.split(' ').slice(0, 2).join(' ') || 'Filial',
      valor: confirmedOrders.filter((o: any) => o.branchId === branch.id).reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0),
    })),
  ].filter(b => b.valor > 0);

  const currentReport = REPORT_CONFIGS[currentReportIndex];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const renderReport = () => {
    switch (currentReport.id) {
      case 'sales_overview':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-lg">Total de Vendas</p>
                    <p className="text-4xl font-bold mt-2">R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <TrendingUp className="h-16 w-16 text-blue-200 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500 to-green-700 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-lg">Vendas Este Mês</p>
                    <p className="text-4xl font-bold mt-2">R$ {monthSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <DollarSign className="h-16 w-16 text-green-200 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-lg">Total de Pedidos</p>
                    <p className="text-4xl font-bold mt-2">{confirmedOrders.length}</p>
                  </div>
                  <ShoppingCart className="h-16 w-16 text-purple-200 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500 to-orange-700 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-lg">Ticket Médio</p>
                    <p className="text-4xl font-bold mt-2">R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <Target className="h-16 w-16 text-orange-200 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'top_vendors':
        return (
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topVendorsData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} stroke="#9CA3AF" />
                <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={90} />
                <Tooltip 
                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Bar dataKey="valor" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'top_products':
        return (
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} stroke="#9CA3AF" />
                <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={110} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'valor') return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor'];
                    return [value, 'Quantidade'];
                  }}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Bar dataKey="valor" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'monthly_revenue':
        return (
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" stroke="#9CA3AF" />
                <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} stroke="#9CA3AF" />
                <Tooltip 
                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento']}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Area type="monotone" dataKey="valor" stroke="#F59E0B" fill="url(#colorRevenue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case 'orders_by_status':
        return (
          <div className="h-[500px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ordersByStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={180}
                  innerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#9CA3AF' }}
                >
                  {ordersByStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [value, 'Pedidos']}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      case 'top_clients':
        return (
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClientsData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} stroke="#9CA3AF" />
                <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={90} />
                <Tooltip 
                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Bar dataKey="valor" fill="#06B6D4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'daily_sales':
        return (
          <div className="h-[500px]">
            {dailyChartData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Activity className="h-24 w-24 mx-auto text-gray-400 mb-4" />
                  <p className="text-2xl text-gray-400">Nenhuma venda nos últimos 30 dias</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="dia" stroke="#9CA3AF" angle={-45} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(1)}k`} stroke="#9CA3AF" />
                  <Tooltip 
                    formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Vendas']}
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#F9FAFB' }}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" dot={{ r: 6, fill: '#6366F1' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      case 'production_status':
        return (
          <div className="h-[500px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productionStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={180}
                  innerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#9CA3AF' }}
                >
                  {productionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [value, 'Ordens']}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      case 'financial_summary':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-green-500 to-green-700 text-white border-0">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-xl">Recebido</p>
                    <p className="text-5xl font-bold mt-3">R$ {paidReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <div className="flex items-center mt-2 text-green-200">
                      <ArrowUpRight className="h-5 w-5 mr-1" />
                      <span>Pagamentos recebidos</span>
                    </div>
                  </div>
                  <DollarSign className="h-20 w-20 text-green-200 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white border-0">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-xl">A Receber</p>
                    <p className="text-5xl font-bold mt-3">R$ {totalReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <div className="flex items-center mt-2 text-yellow-200">
                      <Clock className="h-5 w-5 mr-1" />
                      <span>Pendente de recebimento</span>
                    </div>
                  </div>
                  <Target className="h-20 w-20 text-yellow-200 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-0">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xl">Faturamento Mês</p>
                    <p className="text-5xl font-bold mt-3">R$ {monthSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <div className="flex items-center mt-2 text-blue-200">
                      <TrendingUp className="h-5 w-5 mr-1" />
                      <span>{thisMonthOrders.length} pedidos este mês</span>
                    </div>
                  </div>
                  <Activity className="h-20 w-20 text-blue-200 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'branch_performance':
        return (
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} stroke="#9CA3AF" />
                <Tooltip 
                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento']}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Bar dataKey="valor" fill="#14B8A6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      default:
        return <div>Relatório não encontrado</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 text-white p-6 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${currentReport.color}`}>
            {currentReport.icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{currentReport.title}</h1>
            <p className="text-gray-400">
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')} - Próxima rotação em {Math.ceil(REPORT_ROTATION_INTERVAL / 1000)}s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-2 border-gray-600 text-gray-300">
            {currentReportIndex + 1} / {REPORT_CONFIGS.length}
          </Badge>
          
          <Button
            variant="outline"
            size="lg"
            onClick={handleLogout}
            className="border-red-600 text-red-400 hover:bg-red-900/20 hover:text-red-300"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sair
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              refetchOrders();
              setLastUpdate(new Date());
            }}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsPlaying(!isPlaying)}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            {isPlaying ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
            {isPlaying ? 'Pausar' : 'Iniciar'}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={nextReport}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <Activity className="h-5 w-5 mr-2" />
            Próximo
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={toggleFullscreen}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {REPORT_CONFIGS.map((report, index) => (
          <Button
            key={report.id}
            variant={currentReportIndex === index ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCurrentReportIndex(index);
              setLastUpdate(new Date());
            }}
            className={currentReportIndex === index 
              ? `bg-gradient-to-r ${report.color} border-0 whitespace-nowrap` 
              : 'border-gray-600 text-gray-300 hover:bg-gray-800 whitespace-nowrap'
            }
          >
            {report.title}
          </Button>
        ))}
      </div>

      <Card className="bg-gray-800 border-gray-700 flex-1 overflow-auto">
        <CardContent className="p-6 h-full">
          {renderReport()}
        </CardContent>
      </Card>

      <div className="fixed bottom-4 left-4 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className="text-sm text-gray-400">
          {isPlaying ? 'Rotação automática ativa' : 'Rotação pausada'}
        </span>
      </div>
    </div>
  );
}
