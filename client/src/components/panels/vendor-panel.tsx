import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ShoppingCart, Users, DollarSign, Package, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VendorPanel() {
  const { toast } = useToast();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const vendorId = user.id; // Use actual vendor ID from logged user

  const { data: vendorInfo, isLoading: vendorLoading } = useQuery({
    queryKey: ["/api/vendor", vendorId, "info"],
    queryFn: async () => {
      const response = await fetch(`/api/vendor/${vendorId}/info`);
      if (!response.ok) throw new Error('Failed to fetch vendor info');
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/vendors", vendorId, "orders"],
    queryFn: async () => {
      const response = await fetch(`/api/vendors/${vendorId}/orders`);
      if (!response.ok) throw new Error('Failed to fetch vendor orders');
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link copiado!",
        description: "O link de vendas foi copiado para a área de transferência.",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "status-badge status-pending",
      production: "status-badge status-production",
      completed: "status-badge status-completed",
      cancelled: "status-badge status-cancelled",
      confirmed: "status-badge status-confirmed",
    };

    const statusLabels = {
      pending: "Aguardando",
      production: "Em Produção",
      completed: "Concluído",
      cancelled: "Cancelado",
      confirmed: "Confirmado",
    };

    return (
      <span className={statusClasses[status as keyof typeof statusClasses] || "status-badge"}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  if (vendorLoading || ordersLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel do Vendedor</h1>
        <p className="text-gray-600">Gerencie seus links de venda e acompanhe comissões</p>
      </div>

      {/* Vendor Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Vendas do Mês</h3>
                <p className="text-2xl font-bold gradient-text">
                  R$ {(vendorInfo?.monthlySales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Total Pedidos</h3>
                <p className="text-2xl font-bold gradient-text">
                  {vendorInfo?.totalOrders || orders?.length || 0}
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Comissões</h3>
                <p className="text-2xl font-bold gradient-text">
                  R$ {(vendorInfo?.totalCommissions || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-orange-50 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Confirmados</h3>
                <p className="text-2xl font-bold gradient-text">
                  {vendorInfo?.confirmedOrders || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded-full">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Link de Vendas - Separado */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Seu Link de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Input
              value={vendorInfo?.vendor?.salesLink || `https://vendas.erp.com/v/${vendorId}`}
              readOnly
              className="flex-1"
            />
            <Button
              onClick={() => copyToClipboard(vendorInfo?.vendor?.salesLink || `https://vendas.erp.com/v/${vendorId}`)}
              className="gradient-bg text-white"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Compartilhe este link com seus clientes para que eles possam fazer pedidos diretamente
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Vendas & Orçamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/vendor/products">
              <Button className="w-full justify-start gradient-bg text-white">
                <Package className="h-4 w-4 mr-2" />
                Catálogo de Produtos
              </Button>
            </Link>
            <Link href="/vendor/budgets">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Meus Orçamentos
              </Button>
            </Link>
            <Link href="/vendor/orders">
              <Button variant="outline" className="w-full justify-start">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Pedidos ({(orders as any[])?.length || 0})
              </Button>
            </Link>
            <Link href="/vendor/commissions">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="h-4 w-4 mr-2" />
                Comissões
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Meus Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/vendor/clients">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Ver Meus Clientes
              </Button>
            </Link>
            <Link href="/vendor/commissions">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="h-4 w-4 mr-2" />
                Minhas Comissões
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* My Orders */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold text-gray-900">
              Pedidos Recentes
            </CardTitle>
            <Link href="/vendor/orders">
              <Button variant="outline" size="sm">
                Ver Todos
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(orders as any)?.slice(0, 5).map((order: any) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {(parseFloat(order.totalValue) * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}