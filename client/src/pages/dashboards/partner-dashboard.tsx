import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, ShoppingCart, Package, TrendingUp, Factory, LogOut, DollarSign, Calendar, Eye, ArrowUpRight, Percent } from "lucide-react";
import { Link } from "wouter";

export default function PartnerDashboard() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/verify"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");

      const response = await fetch("/api/auth/verify", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Invalid token");

      return response.json();
    },
  });

  // Get partner specific data
  const { data: partnerData, isLoading: partnerLoading } = useQuery({
    queryKey: ["/api/partners", user?.user?.id],
    queryFn: async () => {
      if (!user?.user?.id) return null;

      const response = await fetch(`/api/partners/${user.user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) return null;

      return response.json();
    },
    enabled: !!user?.user?.id,
  });


  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Query específica para as comissões deste sócio
  const { data: partnerCommissions } = useQuery({
    queryKey: ["/api/commissions"],
    select: (data) => {
      // Filtrar apenas comissões deste sócio específico
      return data?.filter((commission: any) => 
        commission.partnerId === user?.user?.id && commission.type === 'partner'
      ) || [];
    }
  });

  // Query para todos os pedidos (sócio tem acesso completo)
  const { data: allOrders } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Query para todos os vendedores (sócio pode gerenciar)
  const { data: allVendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  // Query para todos os clientes (sócio pode gerenciar)
  const { data: allClients } = useQuery({
    queryKey: ["/api/clients"],
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const quickActions = [
    { href: "/admin/orders", icon: ShoppingCart, label: "Gerenciar Pedidos", color: "text-blue-600" },
    { href: "/partner/commission-management", icon: TrendingUp, label: "Minhas Comissões", color: "text-green-600" },
    { href: "/admin/producers", icon: Factory, label: "Produtores", color: "text-purple-600" },
    { href: "/admin/clients", icon: Users, label: "Clientes", color: "text-orange-600" },
    { href: "/admin/vendors", icon: Users, label: "Vendedores", color: "text-indigo-600" },
    { href: "/finance", icon: DollarSign, label: "Financeiro", color: "text-emerald-600" },
    { href: "/admin/products", icon: Package, label: "Produtos", color: "text-cyan-600" },
    { href: "/admin/budgets", icon: BarChart3, label: "Orçamentos", color: "text-rose-600" },
    { href: "/partner/logs", icon: BarChart3, label: "Logs do Sistema", color: "text-gray-600" },
  ];

  // Cálculos específicos das comissões deste sócio
  const totalPartnerCommissions = partnerCommissions?.reduce((sum: number, commission: any) => 
    sum + parseFloat(commission.amount || '0'), 0) || 0;

  const pendingPartnerCommissions = partnerCommissions?.filter((c: any) => 
    ['pending', 'confirmed'].includes(c.status)).reduce((sum: number, c: any) => 
    sum + parseFloat(c.amount || '0'), 0) || 0;

  const paidPartnerCommissions = partnerCommissions?.filter((c: any) => 
    c.status === 'paid').reduce((sum: number, c: any) => 
    sum + parseFloat(c.amount || '0'), 0) || 0;

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

  if (userLoading || partnerLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!user || !user.user || !partnerData) {
    // Redirecionar para o login se o usuário não estiver autenticado ou não for um sócio válido
    // Em um aplicativo real, você pode querer mostrar uma mensagem de erro mais amigável ou uma página 404.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Não Autorizado</h1>
        <p className="text-gray-600 mb-6">
          Você não tem permissão para acessar esta página ou seus dados de sócio não foram encontrados.
        </p>
        <Button onClick={() => window.location.href = "/login"}>
          Voltar para o Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Idêntico ao admin */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel do Sócio</h1>
            <p className="text-gray-600">Bem-vindo, {user.user.name}</p>
            {user.user.userCode && (
              <p className="text-sm text-blue-600 font-mono">Código de Acesso: {user.user.userCode}</p>
            )}
            {partnerData && (
              <p className="text-sm text-green-600">Taxa de Comissão: {partnerData.commissionRate}%</p>
            )}
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Main Stats Cards - Com dados completos do sistema */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card data-testid="card-total-orders">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Pedidos</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{allOrders?.length || 0}</p>
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
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {allOrders?.filter((o: any) => o.status === 'production').length || 0}
                  </p>
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
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{allClients?.length || 0}</p>
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
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{allVendors?.length || 0}</p>
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

        {/* Partner Commission Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="card-total-commissions">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Comissões</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {totalPartnerCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {partnerCommissions?.length || 0} pedidos
                  </p>
                </div>
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-pending-commissions">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Comissões Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    R$ {pendingPartnerCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    A receber
                  </p>
                </div>
                <Percent className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-paid-commissions">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Comissões Pagas</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    R$ {paidPartnerCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Já recebidas
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders & Recent Commissions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card data-testid="card-recent-orders">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Últimos Pedidos</CardTitle>
              <Link href="/partner/orders">
                <Button variant="outline" size="sm" data-testid="button-view-all-orders">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Todos
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!allOrders || allOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">Nenhum pedido encontrado</p>
                  </div>
                ) : (
                  allOrders.slice(0, 5).map((order: any) => (
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

          <Card data-testid="card-recent-commissions">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Minhas Comissões Recentes</CardTitle>
              <Link href="/partner/commission-management">
                <Button variant="outline" size="sm" data-testid="button-view-all-commissions">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Todas
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!partnerCommissions || partnerCommissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Percent className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">Nenhuma comissão encontrada</p>
                  </div>
                ) : (
                  partnerCommissions.slice(0, 5).map((commission: any) => (
                    <div key={commission.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">#{commission.orderNumber || 'N/A'}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {commission.createdAt ? new Date(commission.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {commission.percentage}% sobre R$ {parseFloat(commission.orderValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-emerald-600">
                          R$ {parseFloat(commission.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge className={`${
                          commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                          commission.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {commission.status === 'paid' ? 'Pago' :
                           commission.status === 'confirmed' ? 'Confirmado' :
                           commission.status === 'pending' ? 'Pendente' :
                           commission.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
  );
}