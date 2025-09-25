import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, ShoppingCart, Package, TrendingUp, Factory, Eye, Edit, DollarSign, Calendar, ArrowUpRight, LogOut, Target, Award, Clock, Star, Briefcase } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: commissions } = useQuery({
    queryKey: [`/api/commissions/partner/${user.id}`],
    enabled: user.role === 'partner',
  });

  const { data: vendorCommissions } = useQuery({
    queryKey: [`/api/commissions/vendor/${user.id}`],
    enabled: user.role === 'vendor',
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      production: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
      delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };

    const statusLabels = {
      pending: "Aguardando",
      confirmed: "Confirmado",
      production: "Em Produção",
      shipped: "Enviado",
      delivered: "Entregue",
      cancelled: "Cancelado",
    };

    return (
      <Badge className={statusClasses[status as keyof typeof statusClasses] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  // Calculate commission data for partners
  const totalCommissions = commissions?.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0) || 0;
  const pendingCommissions = commissions?.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0) || 0;
  const paidCommissions = commissions?.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0) || 0;

  const getQuickActions = () => {
    if (user.role === "admin") {
      return [
        { href: "/admin/orders", icon: ShoppingCart, label: "Gerenciar Pedidos", color: "text-blue-600" },
        { href: "/admin/commission-management", icon: TrendingUp, label: "Comissões", color: "text-green-600" },
        { href: "/admin/producers", icon: Factory, label: "Produtores", color: "text-purple-600" },
        { href: "/admin/clients", icon: Users, label: "Clientes", color: "text-orange-600" },
        { href: "/admin/vendors", icon: Users, label: "Vendedores", color: "text-indigo-600" },
        { href: "/admin/products", icon: Package, label: "Produtos", color: "text-emerald-600" },
      ];
    } else if (user.role === "partner") {
      return [
        { href: "/partner/products", icon: Package, label: "Produtos", color: "text-blue-600" },
        { href: "/partner/commission-management", icon: TrendingUp, label: "Comissões", color: "text-green-600" },
        { href: "/partner/producers", icon: Factory, label: "Produtores", color: "text-purple-600" },
        { href: "/partner/clients", icon: Users, label: "Clientes", color: "text-orange-600" },
        { href: "/partner/vendors", icon: Users, label: "Vendedores", color: "text-indigo-600" },
      ];
    } else if (user.role === "finance") {
      return [
        { href: "/finance/receivables", icon: DollarSign, label: "Contas a Receber", color: "text-blue-600" },
        { href: "/finance/expenses", icon: TrendingDown, label: "Notas de Despesas", color: "text-red-600" },
        { href: "/finance/commission-payouts", icon: TrendingUp, label: "Pagamentos de Comissão", color: "text-green-600" },
        { href: "/finance/reconciliation", icon: BarChart3, label: "Conciliação Bancária", color: "text-purple-600" },
        { href: "/finance/payments", icon: Package, label: "Pagamentos", color: "text-orange-600" },
      ];
    }
    return [];
  };

  const quickActions = getQuickActions();

  // Show comprehensive dashboard for admin, partner, and finance
  if (user.role === "admin" || user.role === "partner" || user.role === "finance") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.role === "admin" ? "Nexo Brindes - Painel Administrativo" : 
                 user.role === "partner" ? "Nexo Brindes - Painel do Sócio" :
                 user.role === "finance" ? "Nexo Brindes - Painel Financeiro" : "Nexo Brindes"}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Bem-vindo, {user.name}</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Main Business Stats Cards - All 5 required metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card data-testid="card-total-orders">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Pedidos</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats?.totalOrders || 0}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-orders-production">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Em Produção</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats?.inProduction || 0}</p>
                  </div>
                  <Factory className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-clients">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clientes</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats?.totalClients || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-vendors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vendedores</p>
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats?.totalVendors || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-producers">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Produtores</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.totalProducers || 0}</p>
                  </div>
                  <Factory className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-orders-today">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pedidos Hoje</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.ordersToday || 0}</p>
                  </div>
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-monthly-revenue">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receita Mensal</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      R$ {stats?.monthlyRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                  </div>
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-pending-payments">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pagamentos Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      R$ {stats?.pendingPayments?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            {user.role === "partner" && (
              <Card data-testid="card-partner-commissions">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Comissões Total</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Orders & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card data-testid="card-recent-orders">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Últimos Pedidos</CardTitle>
                <Link href={user.role === "admin" ? "/admin/orders" : "/"}>
                  <Button variant="outline" size="sm" data-testid="button-view-all-orders">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Todos
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!orders || orders.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">Nenhum pedido encontrado</p>
                    </div>
                  ) : (
                    orders.slice(0, 5).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{order.clientName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Vendedor: {order.vendorName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-quick-actions">
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link key={action.href} href={action.href}>
                        <div className="flex items-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" data-testid={`link-${action.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          <Icon className={`h-5 w-5 ${action.color} mr-3`} />
                          <span className="font-medium text-sm">{action.label}</span>
                          <ArrowUpRight className="h-4 w-4 ml-auto text-gray-400" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Partner Commission History (only for partners) */}
          {user.role === "partner" && commissions && commissions.length > 0 && (
            <Card data-testid="card-commission-history">
              <CardHeader>
                <CardTitle>Histórico de Comissões Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commissions.slice(0, 5).map((commission: any) => (
                    <div key={commission.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div>
                        <p className="font-semibold text-sm">Pedido #{commission.orderId?.slice(-6) || 'N/A'}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {commission.createdAt ? new Date(commission.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-green-600 dark:text-green-400">
                          R$ {parseFloat(commission.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge className={`${
                          commission.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 
                          commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : 
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                        }`}>
                          {commission.status === 'paid' ? 'Paga' : 
                           commission.status === 'pending' ? 'Pendente' : 'Outro'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Show comprehensive dashboard for vendors
  if (user.role === "vendor") {
    // Filter orders for this vendor
    const vendorOrders = orders?.filter((order: any) => order.vendorId === user.id) || [];
    const pendingOrders = vendorOrders.filter((order: any) => order.status === 'pending' || order.status === 'confirmed');
    
    // Calculate vendor-specific stats
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyOrders = vendorOrders.filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    
    const monthlyRevenue = monthlyOrders.reduce((sum: number, order: any) => sum + parseFloat(order.totalValue || 0), 0);
    const totalCommissions = vendorCommissions?.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0) || 0;
    const pendingCommissions = vendorCommissions?.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0) || 0;

    // Quick actions for vendors
    const vendorQuickActions = [
      { href: "/vendor/orders", icon: ShoppingCart, label: "Meus Pedidos", color: "text-amber-600" },
      { href: "/vendor/clients", icon: Users, label: "Clientes", color: "text-cyan-600" },
      { href: "/vendor/products", icon: Package, label: "Produtos", color: "text-violet-600" },
      { href: "/vendor/commissions", icon: Award, label: "Comissões", color: "text-emerald-600" },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className="h-7 w-7 text-amber-600" />
                Painel do Vendedor
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Bem-vindo, {user.name}</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Main Vendor Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card data-testid="card-vendor-total-orders" className="border-l-4 border-l-amber-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Meus Pedidos</p>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{vendorOrders.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total de pedidos</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-vendor-pending-orders" className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pedidos Pendentes</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{pendingOrders.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Aguardando ação</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-vendor-monthly-sales" className="border-l-4 border-l-cyan-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vendas do Mês</p>
                    <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                      R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{monthlyOrders.length} pedidos</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-vendor-commissions" className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Comissões a Receber</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      R$ {pendingCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pendentes</p>
                  </div>
                  <Award className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-vendor-performance" className="border-l-4 border-l-violet-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Meta/Performance</p>
                    <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                      {monthlyOrders.length >= 10 ? '100%' : `${Math.round((monthlyOrders.length / 10) * 100)}%`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Meta: 10 pedidos/mês</p>
                  </div>
                  <Target className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card data-testid="card-vendor-recent-orders" className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-t-lg">
                <CardTitle className="text-amber-800 dark:text-amber-300">Meus Últimos Pedidos</CardTitle>
                <Link href="/vendor/orders">
                  <Button variant="outline" size="sm" data-testid="button-view-vendor-orders" className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-400">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Todos
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {vendorOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">Nenhum pedido encontrado</p>
                    </div>
                  ) : (
                    vendorOrders.slice(0, 5).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-amber-50 dark:hover:bg-gray-800 transition-colors border-l-4 border-l-amber-300">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{order.clientName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-vendor-quick-actions" className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-t-lg">
                <CardTitle className="text-violet-800 dark:text-violet-300">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {vendorQuickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link key={action.href} href={action.href}>
                        <div className="flex items-center p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer shadow-sm hover:shadow-md" data-testid={`link-vendor-${action.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          <Icon className={`h-5 w-5 ${action.color} mr-3`} />
                          <span className="font-medium text-sm">{action.label}</span>
                          <ArrowUpRight className="h-4 w-4 ml-auto text-gray-400" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Commission Summary */}
          {vendorCommissions && vendorCommissions.length > 0 && (
            <Card data-testid="card-vendor-commission-summary" className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-gray-800 dark:to-gray-700 rounded-t-lg">
                <CardTitle className="text-emerald-800 dark:text-emerald-300">Resumo de Comissões</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-emerald-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Acumulado</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendente</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      R$ {pendingCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Comissões Este Mês</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {vendorCommissions.filter((c: any) => {
                        const commissionDate = new Date(c.createdAt);
                        return commissionDate.getMonth() === currentMonth && commissionDate.getFullYear() === currentYear;
                      }).length}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {vendorCommissions.slice(0, 3).map((commission: any) => (
                    <div key={commission.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-emerald-50 dark:hover:bg-gray-800 transition-colors">
                      <div>
                        <p className="font-semibold text-sm">Pedido #{commission.orderId?.slice(-6) || 'N/A'}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {commission.createdAt ? new Date(commission.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                          R$ {parseFloat(commission.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge className={`${
                          commission.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 
                          commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : 
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                        }`}>
                          {commission.status === 'paid' ? 'Paga' : 
                           commission.status === 'pending' ? 'Pendente' : 'Outro'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // For other roles, show simple dashboard
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Bem-vindo, {user.name}</p>
      </div>

      {/* Stats Cards based on role */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pedidos</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{orders?.length || 0}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}