import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Users, FileText, DollarSign, Package, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function VendorDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  const { data: orders } = useQuery({
    queryKey: [`/api/vendors/${user.id}/orders`],
  });

  const { data: commissions } = useQuery({
    queryKey: [`/api/commissions/vendor/${user.id}`],
  });

  const quickActions = [
    { href: "/vendor/orders", icon: ShoppingCart, label: "Meus Pedidos", color: "text-blue-600", bgColor: "bg-blue-50 hover:bg-blue-100" },
    { href: "/vendor/budgets", icon: FileText, label: "Orçamentos", color: "text-green-600", bgColor: "bg-green-50 hover:bg-green-100" },
    { href: "/vendor/clients", icon: Users, label: "Meus Clientes", color: "text-purple-600", bgColor: "bg-purple-50 hover:bg-purple-100" },
    { href: "/vendor/commissions", icon: DollarSign, label: "Minhas Comissões", color: "text-orange-600", bgColor: "bg-orange-50 hover:bg-orange-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Olá, {user.name}! 👋</h1>
        <p className="text-blue-100">Bem-vindo ao seu painel de vendas</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Meus Pedidos</p>
                <p className="text-3xl font-bold text-blue-600">{orders?.length || 0}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Comissões Total</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {(commissions?.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pedidos Ativos</p>
                <p className="text-3xl font-bold text-purple-600">
                  {orders?.filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled').length || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded-full">
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Comissões Pendentes</p>
                <p className="text-3xl font-bold text-orange-600">
                  {commissions?.filter((c: any) => c.status === 'pending').length || 0}
                </p>
              </div>
              <div className="bg-orange-50 p-3 rounded-full">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}>
                  <div className={`flex flex-col items-center justify-center p-6 border-2 rounded-xl ${action.bgColor} transition-all cursor-pointer group`}>
                    <Icon className={`h-10 w-10 ${action.color} mb-3 group-hover:scale-110 transition-transform`} />
                    <span className="font-semibold text-gray-700 text-center">{action.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}