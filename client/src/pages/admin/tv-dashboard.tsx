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
  ArrowUpRight, ArrowDownRight, Clock, LogOut, MapPin
} from "lucide-react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

// Coordenadas das principais cidades brasileiras
const BRAZIL_CITIES_COORDS: { [key: string]: [number, number] } = {
  // Capitais
  "são paulo": [-46.6333, -23.5505],
  "rio de janeiro": [-43.1729, -22.9068],
  "brasília": [-47.9292, -15.7801],
  "salvador": [-38.5108, -12.9714],
  "fortaleza": [-38.5434, -3.7172],
  "belo horizonte": [-43.9378, -19.9167],
  "manaus": [-60.0217, -3.1190],
  "curitiba": [-49.2654, -25.4284],
  "recife": [-34.8811, -8.0476],
  "porto alegre": [-51.2177, -30.0346],
  "belém": [-48.5039, -1.4558],
  "goiânia": [-49.2539, -16.6869],
  "guarulhos": [-46.5322, -23.4538],
  "campinas": [-47.0626, -22.9099],
  "são luís": [-44.2825, -2.5297],
  "maceió": [-35.7353, -9.6658],
  "natal": [-35.2094, -5.7945],
  "teresina": [-42.8016, -5.0920],
  "campo grande": [-54.6162, -20.4697],
  "joão pessoa": [-34.8631, -7.1195],
  "cuiabá": [-56.0978, -15.6010],
  "aracaju": [-37.0731, -10.9472],
  "florianópolis": [-48.5482, -27.5954],
  "vitória": [-40.2976, -20.2976],
  "macapá": [-51.0694, 0.0349],
  "porto velho": [-63.9004, -8.7612],
  "boa vista": [-60.6758, 2.8235],
  "rio branco": [-67.8076, -9.9754],
  "palmas": [-48.3558, -10.1689],
  // Outras cidades importantes
  "santo andré": [-46.5322, -23.6639],
  "osasco": [-46.7916, -23.5329],
  "ribeirão preto": [-47.8103, -21.1775],
  "sorocaba": [-47.4584, -23.5015],
  "uberlândia": [-48.2772, -18.9186],
  "contagem": [-44.0539, -19.9318],
  "niterói": [-43.1049, -22.8833],
  "londrina": [-51.1628, -23.3045],
  "joinville": [-48.8456, -26.3045],
  "juiz de fora": [-43.3503, -21.7642],
  "blumenau": [-49.0661, -26.9194],
  "caxias do sul": [-51.1798, -29.1634],
  "pelotas": [-52.3422, -31.7654],
  "canoas": [-51.1808, -29.9178],
  "maringá": [-51.9389, -23.4205],
  "ponta grossa": [-50.1619, -25.0950],
  "cascavel": [-53.4631, -24.9578],
  "santos": [-46.3289, -23.9608],
  "são josé dos campos": [-45.8872, -23.2237],
  "jundiaí": [-46.8844, -23.1857],
  "piracicaba": [-47.6476, -22.7338],
  "bauru": [-49.0606, -22.3246],
  "limeira": [-47.4017, -22.5649],
  "americana": [-47.3308, -22.7393],
  "são bernardo do campo": [-46.5503, -23.6914],
  "diadema": [-46.6228, -23.6816],
  "mauá": [-46.4614, -23.6678],
  "carapicuíba": [-46.8403, -23.5225],
  "franca": [-47.4008, -20.5386],
  "são josé do rio preto": [-49.3794, -20.8197],
  "praia grande": [-46.4122, -24.0058],
  "sertãozinho": [-47.9906, -21.1375],
  "jaboticabal": [-48.3222, -21.2544],
  "araraquara": [-48.1756, -21.7845],
  "sumaré": [-47.2669, -22.8211],
  "indaiatuba": [-47.2178, -23.0903],
  "itapecerica da serra": [-46.8492, -23.7169],
  "botucatu": [-48.4450, -22.8861],
  "marília": [-49.9461, -22.2139],
  "presidente prudente": [-51.3889, -22.1207],
  "assis": [-50.4117, -22.6617],
  "ourinhos": [-49.8708, -22.9786],
  "jaú": [-48.5578, -22.2958],
  "lins": [-49.7425, -21.6786],
  "são carlos": [-47.8908, -22.0175],
  "rio claro": [-47.5611, -22.4108],
  "novo hamburgo": [-51.1306, -29.6783],
  "são leopoldo": [-51.1478, -29.7604],
  "gravataí": [-50.9919, -29.9428],
  "viamão": [-51.0833, -30.0833],
  "alvorada": [-51.0833, -29.9833],
  "cachoeirinha": [-51.1000, -29.9500],
  "esteio": [-51.1833, -29.8500],
  "sapucaia do sul": [-51.1500, -29.8333],
};

const BRAZIL_GEO_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

// Coordenadas centrais dos estados brasileiros para labels
const STATE_CENTERS: { [key: string]: [number, number] } = {
  "AC": [-70.5, -9.0], "AL": [-36.6, -9.5], "AP": [-51.0, 1.5], "AM": [-64.0, -4.0],
  "BA": [-41.5, -12.5], "CE": [-39.5, -5.2], "DF": [-47.9, -15.8], "ES": [-40.5, -19.5],
  "GO": [-49.5, -16.0], "MA": [-45.0, -5.0], "MT": [-55.5, -13.0], "MS": [-55.0, -21.0],
  "MG": [-44.5, -18.5], "PA": [-53.0, -4.0], "PB": [-36.8, -7.1], "PR": [-51.5, -24.5],
  "PE": [-37.5, -8.3], "PI": [-42.8, -7.5], "RJ": [-43.0, -22.5], "RN": [-36.5, -5.8],
  "RS": [-53.5, -29.5], "RO": [-63.0, -10.5], "RR": [-61.0, 2.5], "SC": [-49.5, -27.5],
  "SP": [-48.5, -22.5], "SE": [-37.4, -10.9], "TO": [-48.5, -10.0]
};

// Cores para gráficos gerais
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C', '#A855F7', '#EC4899'];

// Cores vibrantes e distintas para marcadores das filiais no mapa
const BRANCH_COLORS = ['#06D6A0', '#118AB2', '#EF476F', '#3A86FF', '#8338EC', '#FF006E', '#FB5607', '#38B000', '#073B4C', '#9D4EDD'];

const REPORT_ROTATION_INTERVAL = 15000;

type ReportType = 
  | 'sales_overview'
  | 'top_vendors' 
  | 'top_products'
  | 'monthly_revenue'
  | 'orders_by_status'
  | 'top_clients'
  | 'daily_sales'
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
  { id: 'daily_sales', title: 'Vendas Diárias (Últimos 15 dias)', icon: <Activity className="h-8 w-8" />, color: 'from-indigo-500 to-indigo-700' },
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

  const confirmedOrders = orders.filter((o: any) => 
    (o.status === 'converted' || (o.status !== 'budget' && o.status !== 'cancelled'))
  );
  const thisMonthOrders = confirmedOrders.filter((o: any) => {
    const orderDate = new Date(o.createdAt);
    const now = new Date();
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
  });

  const totalSales = confirmedOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0);
  const avgTicket = confirmedOrders.length > 0 ? totalSales / confirmedOrders.length : 0;

  // Cálculos Temporais
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Início da semana (domingo)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const yearOrders = confirmedOrders.filter((o: any) => new Date(o.createdAt).getFullYear() === currentYear);
  const monthOrders = confirmedOrders.filter((o: any) => {
    const d = new Date(o.createdAt);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const weekOrders = confirmedOrders.filter((o: any) => new Date(o.createdAt) >= startOfWeek);

  const yearSales = yearOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0);
  const monthSales = monthOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0);
  const weekSales = weekOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0);

  const yearAvgTicket = yearOrders.length > 0 ? yearSales / yearOrders.length : 0;
  const monthAvgTicket = monthOrders.length > 0 ? monthSales / monthOrders.length : 0;
  const weekAvgTicket = weekOrders.length > 0 ? weekSales / weekOrders.length : 0;

  const getTopVendors = (ordersList: any[]) => {
    return vendors
      .map((vendor: any) => {
        const vendorOrders = ordersList.filter((o: any) => String(o.vendorId) === String(vendor.id));
        return {
          name: vendor.name?.split(' ').slice(0, 2).join(' ') || 'N/A',
          fullName: vendor.name || 'N/A',
          pedidos: vendorOrders.length,
          valor: vendorOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0),
          photoUrl: vendor.photoUrl || null,
        };
      })
      .sort((a: any, b: any) => b.pedidos - a.pedidos)
      .slice(0, 6);
  };

  const topVendorsYear = getTopVendors(yearOrders);
  const topVendorsMonth = getTopVendors(monthOrders);
  const topVendorsWeek = getTopVendors(weekOrders);

  const productSalesMap: { [key: string]: { name: string; quantidade: number; valor: number; imageUrl: string } } = {};
  confirmedOrders.forEach((order: any) => {
    // Primeiro tenta pegar de budgetItems (tem a imagem do produto)
    const itemsToUse = order.budgetItems && Array.isArray(order.budgetItems) && order.budgetItems.length > 0 
      ? order.budgetItems 
      : (order.items && Array.isArray(order.items) ? order.items : []);
    
    itemsToUse.forEach((item: any) => {
      const productName = item.productName || item.product?.name || 'Produto';
      const qty = parseInt(String(item.quantity || 1), 10) || 1;
      const price = parseFloat(String(item.unitPrice || 0)) || 0;
      // Buscar imagem: budgetItem.product.imageLink > item.imageLink > item.imageUrl
      const imageUrl = item.product?.imageLink || item.imageLink || item.imageUrl || '';
      
      if (!productSalesMap[productName]) {
        productSalesMap[productName] = { 
          name: productName, 
          quantidade: 0, 
          valor: 0,
          imageUrl: imageUrl
        };
      }
      // Se ainda não tem imagem e encontramos uma, atualiza
      if (!productSalesMap[productName].imageUrl && imageUrl) {
        productSalesMap[productName].imageUrl = imageUrl;
      }
      productSalesMap[productName].quantidade += qty;
      productSalesMap[productName].valor += price * qty;
    });
  });
  const topProductsData = Object.values(productSalesMap)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 10);

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
    if (status !== 'cancelled') {
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
  });
  const statusLabels: { [key: string]: string } = {
    budget: 'Orçamento',
    pending: 'Pendente',
    confirmed: 'Confirmado',
    production: 'Em Produção',
    in_production: 'Em Produção',
    ready: 'Pronto',
    delivered: 'Entregue',
    shipped: 'Despachado',
    delayed: 'Atrasado',
    pending_acceptance: 'Aguardando Aceite',
  };
  const ordersByStatusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
  }));

  const topClientsData = clients
    .map((client: any) => {
      const clientOrders = confirmedOrders.filter((o: any) => String(o.clientId) === String(client.id));
      return {
        name: client.name?.split(' ').slice(0, 2).join(' ') || 'N/A',
        pedidos: clientOrders.length,
        valor: clientOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0),
      };
    })
    .sort((a: any, b: any) => b.valor - a.valor)
    .slice(0, 8);

  const dailySalesData: { [key: string]: number } = {};
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setHours(0, 0, 0, 0);
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  
  // Inicializar todos os últimos 15 dias com zero
  for (let i = 0; i <= 15; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dailySalesData[key] = 0;
  }

  confirmedOrders.forEach((order: any) => {
    const date = new Date(order.createdAt);
    if (date >= fifteenDaysAgo) {
      const dayKey = date.toISOString().split('T')[0];
      // Só somar se a chave existir (garante que estamos dentro dos 30 dias inicializados)
      if (dayKey in dailySalesData) {
        dailySalesData[dayKey] += parseFloat(order.totalValue || '0');
      } else {
        // Caso a data seja de hoje mas não tenha sido pega no loop inicial (timezone)
        dailySalesData[dayKey] = (dailySalesData[dayKey] || 0) + parseFloat(order.totalValue || '0');
      }
    }
  });
  const sortedDays = Object.keys(dailySalesData).sort();
  const dailyChartData = sortedDays.map(key => ({
    dia: new Date(key + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    valor: dailySalesData[key],
  }));

  const productionStatusCounts: { [key: string]: number } = {};
  // Usar os pedidos (orders) para status de produção
  orders.forEach((order: any) => {
    const status = order.status || 'pending';
    if (status !== 'cancelled') {
      productionStatusCounts[status] = (productionStatusCounts[status] || 0) + 1;
    }
  });
  const productionStatusLabels: { [key: string]: string } = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    in_production: 'Em Produção',
    production: 'Em Produção',
    completed: 'Concluído',
    delivered: 'Entregue',
    accepted: 'Aceito',
    shipped: 'Despachado',
    partial_shipped: 'Parcialmente Enviado',
    ready: 'Pronto',
    delayed: 'Atrasado',
    pending_acceptance: 'Aguardando Aceite',
    logistics: 'Na Logística',
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

  // Função para encontrar coordenadas de uma cidade
  const getCityCoords = (city: string): [number, number] | null => {
    if (!city) return null;
    const normalizedCity = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const [cityName, coords] of Object.entries(BRAZIL_CITIES_COORDS)) {
      const normalizedCityName = cityName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalizedCity.includes(normalizedCityName) || normalizedCityName.includes(normalizedCity)) {
        return coords;
      }
    }
    return null;
  };

  // Pedidos sem filial atribuída são da Matriz (Novo Hamburgo - RS)
  const matrizOrders = confirmedOrders.filter((o: any) => !o.branchId);
  const matrizData = matrizOrders.length > 0 ? [{
    id: 'matriz-principal',
    name: 'Matriz',
    city: 'Novo Hamburgo - RS',
    valor: matrizOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0),
    pedidos: matrizOrders.length,
    coordinates: [-51.1306, -29.6783] as [number, number], // Novo Hamburgo, RS
    isHeadquarters: true,
  }] : [];

  const branchPerformanceData = [
    ...matrizData,
    ...branches.map((branch: any) => {
      const branchOrders = confirmedOrders.filter((o: any) => o.branchId === branch.id);
      const coords = getCityCoords(branch.city || branch.name || '');
      return {
        id: branch.id,
        name: branch.name || 'Filial',
        city: branch.city || '',
        valor: branchOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalValue || '0'), 0),
        pedidos: branchOrders.length,
        coordinates: coords,
        isHeadquarters: branch.isHeadquarters || false,
      };
    }).filter((b: any) => b.coordinates !== null)
  ];

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ANUAL */}
            <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-0 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-blue-100 text-xl font-medium">Anual ({currentYear})</p>
                  <Award className="h-10 w-10 text-blue-200 opacity-80" />
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-4xl font-black">R$ {yearSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-blue-200 text-sm mt-1 uppercase tracking-wider">Total de Vendas</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-400/30">
                    <div>
                      <p className="text-2xl font-bold">{yearOrders.length}</p>
                      <p className="text-blue-200 text-xs uppercase">Pedidos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">R$ {yearAvgTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      <p className="text-blue-200 text-xs uppercase">Ticket Médio</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* MENSAL */}
            <Card className="bg-gradient-to-br from-green-600 to-green-800 text-white border-0 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-green-100 text-xl font-medium">Mensal ({now.toLocaleDateString('pt-BR', { month: 'long' })})</p>
                  <TrendingUp className="h-10 w-10 text-green-200 opacity-80" />
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-4xl font-black">R$ {monthSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-green-200 text-sm mt-1 uppercase tracking-wider">Total de Vendas</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-green-400/30">
                    <div>
                      <p className="text-2xl font-bold">{monthOrders.length}</p>
                      <p className="text-green-200 text-xs uppercase">Pedidos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">R$ {monthAvgTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      <p className="text-green-200 text-xs uppercase">Ticket Médio</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SEMANAL */}
            <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-0 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-purple-100 text-xl font-medium">Semanal</p>
                  <Activity className="h-10 w-10 text-purple-200 opacity-80" />
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-4xl font-black">R$ {weekSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-purple-200 text-sm mt-1 uppercase tracking-wider">Total de Vendas</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-purple-400/30">
                    <div>
                      <p className="text-2xl font-bold">{weekOrders.length}</p>
                      <p className="text-purple-200 text-xs uppercase">Pedidos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">R$ {weekAvgTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      <p className="text-purple-200 text-xs uppercase">Ticket Médio</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'top_vendors':
        return (
          <div className="h-[520px] flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
              {/* Vendedores Semanal */}
              <div className="flex flex-col bg-slate-900/40 rounded-2xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <Activity className="h-5 w-5 text-purple-400" />
                  <h3 className="text-purple-100 font-bold uppercase tracking-wider text-sm">Top Vendedores (Semanal)</h3>
                </div>
                <div className="space-y-3 flex-1 overflow-hidden">
                  {topVendorsWeek.map((vendor, index) => (
                    <div key={vendor.name + 'week'} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {index + 1}º
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 overflow-hidden shrink-0 bg-slate-700 flex items-center justify-center">
                        {vendor.photoUrl ? (
                          <img src={vendor.photoUrl} alt={vendor.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{vendor.name}</p>
                        <p className="text-slate-400 text-[10px] uppercase">{vendor.pedidos} pedidos</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-purple-300 font-bold text-sm">R$ {vendor.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vendedores Mensal */}
              <div className="flex flex-col bg-slate-900/40 rounded-2xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  <h3 className="text-green-100 font-bold uppercase tracking-wider text-sm">Top Vendedores (Mensal)</h3>
                </div>
                <div className="space-y-3 flex-1 overflow-hidden">
                  {topVendorsMonth.map((vendor, index) => (
                    <div key={vendor.name + 'month'} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {index + 1}º
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-green-500/30 overflow-hidden shrink-0 bg-slate-700 flex items-center justify-center">
                        {vendor.photoUrl ? (
                          <img src={vendor.photoUrl} alt={vendor.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{vendor.name}</p>
                        <p className="text-slate-400 text-[10px] uppercase">{vendor.pedidos} pedidos</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-green-300 font-bold text-sm">R$ {vendor.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vendedores Anual */}
              <div className="flex flex-col bg-slate-900/40 rounded-2xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <Award className="h-5 w-5 text-blue-400" />
                  <h3 className="text-blue-100 font-bold uppercase tracking-wider text-sm">Top Vendedores (Anual)</h3>
                </div>
                <div className="space-y-3 flex-1 overflow-hidden">
                  {topVendorsYear.map((vendor, index) => (
                    <div key={vendor.name + 'year'} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {index + 1}º
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 overflow-hidden shrink-0 bg-slate-700 flex items-center justify-center">
                        {vendor.photoUrl ? (
                          <img src={vendor.photoUrl} alt={vendor.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{vendor.name}</p>
                        <p className="text-slate-400 text-[10px] uppercase">{vendor.pedidos} pedidos</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-blue-300 font-bold text-sm">R$ {vendor.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'top_products':
        return (
          <div className="h-[520px] flex flex-col">
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4">
              {topProductsData.map((product, index) => (
                <div 
                  key={product.name} 
                  className="relative bg-gradient-to-br rounded-xl p-4 flex flex-col items-center justify-between shadow-lg transform hover:scale-105 transition-transform"
                  style={{ 
                    background: `linear-gradient(135deg, ${COLORS[index % COLORS.length]}22, ${COLORS[index % COLORS.length]}44)`,
                    border: `2px solid ${COLORS[index % COLORS.length]}`
                  }}
                >
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}º
                  </div>
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-20 h-20 object-contain rounded-lg bg-white/10 mb-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center mb-2">
                      <Package className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <p className="text-white text-xs text-center font-medium line-clamp-2 mb-2" title={product.name}>
                    {product.name.length > 30 ? product.name.substring(0, 30) + '...' : product.name}
                  </p>
                  <div className="text-center">
                    <p className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                      {product.quantidade}
                    </p>
                    <p className="text-gray-400 text-xs">unidades</p>
                  </div>
                </div>
              ))}
            </div>
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
          <div className="h-[520px] flex flex-col">
            <div className="flex-1 grid grid-cols-4 gap-6 p-4">
              {topClientsData.map((client, index) => (
                <div 
                  key={client.name + index} 
                  className="relative bg-gradient-to-br rounded-xl p-6 flex flex-col items-center justify-between shadow-lg transform hover:scale-105 transition-transform"
                  style={{ 
                    background: `linear-gradient(135deg, ${COLORS[index % COLORS.length]}22, ${COLORS[index % COLORS.length]}44)`,
                    border: `2px solid ${COLORS[index % COLORS.length]}`
                  }}
                >
                  <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}º
                  </div>
                  
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-3 border-4 border-white/20">
                    <ShoppingCart className="w-10 h-10 text-white opacity-80" />
                  </div>

                  <div className="text-center w-full">
                    <h3 className="text-xl font-bold text-white truncate mb-1">{client.name}</h3>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-sm py-1 px-3">
                          {client.pedidos} pedidos
                        </Badge>
                      </div>
                      <p className="text-2xl font-black text-white mt-1">
                        R$ {client.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

      case 'branch_performance':
        const maxPedidos = Math.max(...branchPerformanceData.map((b: any) => b.pedidos), 1);
        
        // Detectar estados que têm filiais baseado nas cidades cadastradas
        const statesWithBranches = new Set<string>();
        branches.forEach((branch: any) => {
          const city = (branch.city || '').toLowerCase();
          // Mapear cidade para estado
          if (city.includes('são paulo') || city.includes('campinas') || city.includes('santos') || city.includes('ribeirão') || city.includes('sorocaba')) statesWithBranches.add('SP');
          if (city.includes('rio de janeiro') || city.includes('niterói')) statesWithBranches.add('RJ');
          if (city.includes('belo horizonte') || city.includes('uberlândia') || city.includes('contagem')) statesWithBranches.add('MG');
          if (city.includes('curitiba') || city.includes('londrina') || city.includes('maringá')) statesWithBranches.add('PR');
          if (city.includes('porto alegre') || city.includes('caxias') || city.includes('novo hamburgo') || city.includes('são leopoldo') || city.includes('gravataí')) statesWithBranches.add('RS');
          if (city.includes('salvador')) statesWithBranches.add('BA');
          if (city.includes('recife')) statesWithBranches.add('PE');
          if (city.includes('fortaleza')) statesWithBranches.add('CE');
          if (city.includes('brasília')) statesWithBranches.add('DF');
          if (city.includes('goiânia')) statesWithBranches.add('GO');
          if (city.includes('manaus')) statesWithBranches.add('AM');
          if (city.includes('belém')) statesWithBranches.add('PA');
          if (city.includes('florianópolis') || city.includes('joinville') || city.includes('blumenau')) statesWithBranches.add('SC');
          if (city.includes('vitória')) statesWithBranches.add('ES');
          if (city.includes('natal')) statesWithBranches.add('RN');
          if (city.includes('maceió')) statesWithBranches.add('AL');
          if (city.includes('joão pessoa')) statesWithBranches.add('PB');
          if (city.includes('aracaju')) statesWithBranches.add('SE');
          if (city.includes('teresina')) statesWithBranches.add('PI');
          if (city.includes('são luís')) statesWithBranches.add('MA');
          if (city.includes('cuiabá')) statesWithBranches.add('MT');
          if (city.includes('campo grande')) statesWithBranches.add('MS');
          if (city.includes('palmas')) statesWithBranches.add('TO');
          if (city.includes('macapá')) statesWithBranches.add('AP');
          if (city.includes('boa vista')) statesWithBranches.add('RR');
          if (city.includes('porto velho')) statesWithBranches.add('RO');
          if (city.includes('rio branco')) statesWithBranches.add('AC');
          // Adicionar por state se disponível
          if (branch.state) statesWithBranches.add(branch.state.toUpperCase());
        });

        // Escala gradiente harmoniosa para estados com filiais (tons de azul/verde vibrantes)
        const activeGradient: { [key: string]: string } = {
          "AC": "#00D4AA", "AL": "#00B4D8", "AP": "#0096C7", "AM": "#48CAE4",
          "BA": "#00C49A", "CE": "#00B4D8", "DF": "#2EC4B6", "ES": "#3DD5F3",
          "GO": "#00D4AA", "MA": "#48CAE4", "MT": "#00C49A", "MS": "#00B4D8",
          "MG": "#2EC4B6", "PA": "#0096C7", "PB": "#48CAE4", "PR": "#00D4AA",
          "PE": "#00B4D8", "PI": "#3DD5F3", "RJ": "#FFD166", "RN": "#48CAE4",
          "RS": "#00C49A", "RO": "#0096C7", "RR": "#48CAE4", "SC": "#2EC4B6",
          "SP": "#EF476F", "SE": "#00B4D8", "TO": "#00D4AA"
        };

        // Cor opaca para estados sem filiais
        const inactiveColor = "#2D3748";
        
        return (
          <div className="h-[520px] flex gap-4">
            {/* Mapa do Brasil */}
            <div className="flex-1 relative">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  scale: 850,
                  center: [-52, -15]
                }}
                style={{ width: "100%", height: "100%" }}
              >
                <Geographies geography={BRAZIL_GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const stateName = geo.properties.sigla || geo.properties.name?.substring(0, 2).toUpperCase();
                      const hasBranch = statesWithBranches.has(stateName);
                      const color = hasBranch ? (activeGradient[stateName] || "#00D4AA") : inactiveColor;
                      const opacity = hasBranch ? 0.9 : 0.4;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={color}
                          stroke={hasBranch ? "#FFFFFF" : "#4A5568"}
                          strokeWidth={hasBranch ? 1.5 : 0.5}
                          style={{
                            default: { outline: "none", fillOpacity: opacity },
                            hover: { fill: color, fillOpacity: hasBranch ? 1 : 0.5, outline: "none" },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
                {/* Labels dos estados */}
                {Object.entries(STATE_CENTERS).map(([state, coords]) => (
                  <Marker key={`label-${state}`} coordinates={coords}>
                    <text
                      textAnchor="middle"
                      style={{
                        fontFamily: "system-ui",
                        fill: "#1F2937",
                        fontSize: "11px",
                        fontWeight: "bold",
                        textShadow: "1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white"
                      }}
                    >
                      {state}
                    </text>
                  </Marker>
                ))}
                {/* Marcadores das filiais */}
                {branchPerformanceData.map((branch: any, index: number) => {
                  if (!branch.coordinates) return null;
                  const size = Math.max(15, (branch.pedidos / maxPedidos) * 45);
                  return (
                    <Marker key={branch.id} coordinates={branch.coordinates}>
                      <g>
                        <circle
                          r={size}
                          fill={branch.isHeadquarters ? "#F59E0B" : BRANCH_COLORS[index % BRANCH_COLORS.length]}
                          fillOpacity={0.8}
                          stroke="#fff"
                          strokeWidth={2}
                          style={{ cursor: "pointer" }}
                        />
                        <text
                          textAnchor="middle"
                          y={size + 14}
                          style={{
                            fontFamily: "system-ui",
                            fill: "#F9FAFB",
                            fontSize: "10px",
                            fontWeight: "bold",
                          }}
                        >
                          {branch.pedidos}
                        </text>
                      </g>
                    </Marker>
                  );
                })}
              </ComposableMap>
            </div>
            {/* Lista de filiais */}
            <div className="w-72 bg-gray-800/50 rounded-xl p-4 overflow-y-auto">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Filiais
              </h3>
              <div className="space-y-3">
                {branchPerformanceData.sort((a: any, b: any) => b.pedidos - a.pedidos).map((branch: any, index: number) => (
                  <div 
                    key={branch.id}
                    className="bg-gray-700/50 rounded-lg p-3 border-l-4"
                    style={{ borderColor: branch.isHeadquarters ? "#F59E0B" : BRANCH_COLORS[index % BRANCH_COLORS.length] }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">
                          {branch.name}
                          {branch.isHeadquarters && <span className="ml-1 text-yellow-500">★</span>}
                        </p>
                        <p className="text-gray-400 text-xs">{branch.city}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: branch.isHeadquarters ? "#F59E0B" : BRANCH_COLORS[index % BRANCH_COLORS.length] }}>
                          {branch.pedidos}
                        </p>
                        <p className="text-gray-400 text-xs">pedidos</p>
                      </div>
                    </div>
                    <p className="text-gray-300 text-xs mt-1">
                      R$ {branch.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
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
