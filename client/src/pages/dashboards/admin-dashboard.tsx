import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, ShoppingCart, Package, TrendingUp, Factory, LogOut, DollarSign, Calendar, Eye, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const quickActions = [
    { href: "/admin/orders", icon: ShoppingCart, label: "Gerenciar Pedidos", color: "text-blue-600" },
    { href: "/admin/commission-management", icon: TrendingUp, label: "Comissões", color: "text-green-600" },
    { href: "/admin/producers", icon: Factory, label: "Produtores", color: "text-purple-600" },
    { href: "/admin/clients", icon: Users, label: "Clientes", color: "text-orange-600" },
    { href: "/admin/vendors", icon: Users, label: "Vendedores", color: "text-indigo-600" },
    { href: "/admin/finance", icon: DollarSign, label: "Financeiro", color: "text-emerald-600" },
  ];

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
      <Badge className={statusClasses[status as keyof typeof statusClasses] || "bg-gray-100 text-gray-800"}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
            <p className="text-gray-600">Bem-vindo, {user.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Main Stats Cards */}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        </div>

        {/* Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card data-testid="card-recent-orders">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Últimos Pedidos</CardTitle>
              <Link href="/admin/orders">
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
      </div>
    </div>
  );
}