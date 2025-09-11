import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ShoppingCart, Users, DollarSign, Package, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VendorPanel() {
  const { toast } = useToast();
  const vendorId = "vendor-1"; // Mock current vendor ID

  const { data: vendorInfo, isLoading: vendorLoading } = useQuery({
    queryKey: ["/api/vendor", vendorId],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders/vendor", vendorId],
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Vendas do Mês</h3>
            <p className="text-3xl font-bold gradient-text">
              R$ {((vendorInfo as any)?.monthlySales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-green-600 mt-1">+15% vs mês anterior</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Comissões</h3>
            <p className="text-3xl font-bold gradient-text">
              R$ {((vendorInfo as any)?.totalCommissions || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              {(vendorInfo as any)?.confirmedOrders || 0} pedidos confirmados
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Link de Vendas</h3>
            <div className="flex items-center space-x-2">
              <Input
                value={(vendorInfo as any)?.vendor?.salesLink || "https://vendas.erp.com/v1"}
                readOnly
                className="flex-1 text-sm"
              />
              <Button
                onClick={() => copyToClipboard((vendorInfo as any)?.vendor?.salesLink || "https://vendas.erp.com/v1")}
                className="gradient-bg text-white"
                size="sm"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
                Pedidos ({vendorInfo?.confirmedOrders || 0})
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