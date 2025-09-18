import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Users, FileText, DollarSign, Package, LogOut } from "lucide-react";
import { Link } from "wouter";

export default function VendorDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  const { data: orders } = useQuery({
    queryKey: [`/api/vendors/${user.id}/orders`],
  });

  const { data: commissions } = useQuery({
    queryKey: [`/api/commissions/vendor/${user.id}`],
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const quickActions = [
    { href: "/vendor/orders", icon: ShoppingCart, label: "Meus Pedidos", color: "text-blue-600" },
    { href: "/vendor/budgets", icon: FileText, label: "Orçamentos", color: "text-green-600" },
    { href: "/vendor/clients", icon: Users, label: "Meus Clientes", color: "text-purple-600" },
    { href: "/vendor/commissions", icon: DollarSign, label: "Minhas Comissões", color: "text-orange-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel do Vendedor</h1>
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
                  <p className="text-sm font-medium text-gray-600">Meus Pedidos</p>
                  <p className="text-3xl font-bold text-blue-600">{orders?.length || 0}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comissões Total</p>
                  <p className="text-3xl font-bold text-green-600">
                    R$ {(commissions?.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pedidos Ativos</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {orders?.filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled').length || 0}
                  </p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comissões Pendentes</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {commissions?.filter((c: any) => c.status === 'pending').length || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <div className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <Icon className={`h-6 w-6 ${action.color} mr-3`} />
                      <span className="font-medium">{action.label}</span>
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