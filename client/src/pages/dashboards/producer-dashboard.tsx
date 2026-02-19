import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Factory, Package, Clock, CheckCircle, AlertCircle, LogOut } from "lucide-react";
import { Link } from "wouter";

export default function ProducerDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  const { data: productionOrders } = useQuery({
    queryKey: [`/api/production-orders/producer/${user.id}`],
  });

  const { data: stats } = useQuery({
    queryKey: [`/api/producer/${user.id}/stats`],
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-blue-100 text-blue-800",
      production: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    const statusLabels = {
      pending: "Pendente",
      accepted: "Aceito",
      production: "Em Produção",
      completed: "Concluído",
      rejected: "Rejeitado",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[status as keyof typeof statusClasses]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  const quickActions = [
    { href: "/producer/orders", icon: Factory, label: "Ordens de Produção", color: "text-blue-600" },
    { href: "/producer/production-dashboard", icon: Package, label: "Dashboard Produção", color: "text-green-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel do Produtor</h1>
            <p className="text-gray-600">Bem-vindo, {user.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ordens Ativas</p>
                  <p className="text-3xl font-bold text-blue-600">{stats?.activeOrders || 0}</p>
                </div>
                <Factory className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendentes</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats?.pendingOrders || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Em Produção</p>
                  <p className="text-3xl font-bold text-purple-600">{stats?.inProductionOrders || 0}</p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Concluídas</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.completedOrders || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.href} href={action.href}>
                      <div className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        <Icon className={`h-5 w-5 ${action.color} mr-3`} />
                        <span className="font-medium">{action.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ordens Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {!productionOrders || productionOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhuma ordem de produção disponível.</p>
              ) : (
                <div className="space-y-3">
                  {productionOrders.slice(0, 3).map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold text-sm">#{order.id.slice(-6)}</p>
                        <p className="text-xs text-gray-600">{order.product}</p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(order.status)}
                        {order.hasUnreadNotes && (
                          <div className="flex items-center mt-1">
                            <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                            <span className="text-xs text-red-600">Nova nota</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {productionOrders.length > 3 && (
                    <div className="text-center pt-2">
                      <Link href="/producer/orders">
                        <Button variant="outline" size="sm">Ver Todas</Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}