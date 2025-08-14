import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw } from "lucide-react";

export default function ProducerPanel() {
  const producerId = "producer-1"; // Mock current producer ID

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/producer", producerId, "stats"],
  });

  const { data: productionOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/production-orders/producer", producerId],
  });

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "status-badge status-pending",
      production: "status-badge status-production",
      completed: "status-badge status-completed",
      cancelled: "status-badge status-cancelled",
      accepted: "status-badge status-confirmed",
    };

    const statusLabels = {
      pending: "Aguardando",
      production: "Em Produção",
      completed: "Concluído",
      cancelled: "Cancelado", 
      accepted: "Aceito",
    };

    return (
      <span className={statusClasses[status as keyof typeof statusClasses] || "status-badge"}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  if (statsLoading || ordersLoading) {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel do Produtor</h1>
        <p className="text-gray-600">Gerencie suas ordens de produção</p>
      </div>

      {/* Producer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ordens Ativas</h3>
            <p className="text-3xl font-bold gradient-text">{stats?.activeOrders || 0}</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pendentes</h3>
            <p className="text-3xl font-bold gradient-text">{stats?.pendingOrders || 0}</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Concluídas</h3>
            <p className="text-3xl font-bold gradient-text">{stats?.completedOrders || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Production Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Ordens de Produção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ordem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prazo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productionOrders?.map((order: any) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #OP-{order.id.slice(-3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.product}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : 'A definir'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button 
                        size="sm" 
                        className="gradient-bg text-white mr-2"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Atualizar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
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
