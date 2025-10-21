
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, FileText, Users, DollarSign, TrendingUp, Package, Eye, Plus } from "lucide-react";
import { Link } from "wouter";

export default function VendorDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const vendorId = user.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/vendors", vendorId, "orders"],
    queryFn: async () => {
      const response = await fetch(`/api/vendors/${vendorId}/orders`);
      if (!response.ok) throw new Error('Failed to fetch vendor orders');
      return response.json();
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["/api/commissions/vendor", vendorId],
    queryFn: async () => {
      const response = await fetch(`/api/commissions/vendor/${vendorId}`);
      if (!response.ok) throw new Error('Failed to fetch vendor commissions');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const recentOrders = orders?.slice(0, 5) || [];
  const totalCommissions = commissions?.filter((c: any) => c.status === 'confirmed').reduce((total: number, c: any) => total + parseFloat(c.amount || 0), 0) || 0;
  const pendingCommissions = commissions?.filter((c: any) => c.status === 'pending').reduce((total: number, c: any) => total + parseFloat(c.amount || 0), 0) || 0;

  const quickActions = [
    {
      title: "Meus Pedidos",
      description: "Visualizar e gerenciar pedidos",
      icon: ShoppingCart,
      href: "/vendor/orders",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Orçamentos",
      description: "Criar e gerenciar orçamentos",
      icon: FileText,
      href: "/vendor/budgets",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "Meus Clientes",
      description: "Gerenciar carteira de clientes",
      icon: Users,
      href: "/vendor/clients",
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      title: "Minhas Comissões",
      description: "Acompanhar comissões e ganhos",
      icon: DollarSign,
      href: "/vendor/commissions",
      color: "bg-orange-500 hover:bg-orange-600",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">
            Olá, {user.name || user.username}!
          </h1>
          <p className="text-blue-100 text-lg">
            Bem-vindo ao seu painel de vendas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Meus Pedidos</p>
                <p className="text-3xl font-bold text-blue-600">
                  {orders?.length || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total criados</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Comissões Total</p>
                <p className="text-3xl font-bold text-green-600">
                  R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">Confirmadas</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pedidos Ativos</p>
                <p className="text-3xl font-bold text-purple-600">
                  {orders?.filter((o: any) => !['delivered', 'cancelled'].includes(o.status)).length || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Em andamento</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Comissões Pendentes</p>
                <p className="text-3xl font-bold text-orange-600">
                  R$ {pendingCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">A receber</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="hover:shadow-xl transition-all duration-200 cursor-pointer group border-0 shadow-md">
                  <CardContent className="p-6 text-center">
                    <div className={`h-16 w-16 ${action.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Orders */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-900">
              Pedidos Recentes
            </CardTitle>
            <Link href="/vendor/orders">
              <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300">
                <Eye className="h-4 w-4 mr-2" />
                Ver Todos
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{order.orderNumber}</h4>
                        <p className="text-sm text-gray-600">{order.contactName || order.clientName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'production' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status === 'delivered' ? 'Entregue' :
                       order.status === 'production' ? 'Em Produção' :
                       order.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Nenhum pedido encontrado</p>
              <Link href="/vendor/orders">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Pedido
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
