import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, RefreshCw, Package, Truck, Clock, CheckCircle, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProducerPanel() {
  const navigate = useNavigate();
  
  // Get producer ID from localStorage (set during login)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const producerId = user.id;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/producer", producerId, "stats"],
  });

  const { data: productionOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/production-orders/producer", producerId],
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Aguardando", className: "bg-yellow-100 text-yellow-800" },
      accepted: { label: "Aceito", className: "bg-blue-100 text-blue-800" },
      production: { label: "Em Produção", className: "bg-purple-100 text-purple-800" },
      quality_check: { label: "Controle Qualidade", className: "bg-indigo-100 text-indigo-800" },
      ready: { label: "Pronto", className: "bg-green-100 text-green-800" },
      preparing_shipment: { label: "Preparando Envio", className: "bg-orange-100 text-orange-800" },
      shipped: { label: "Enviado", className: "bg-cyan-100 text-cyan-800" },
      delivered: { label: "Entregue", className: "bg-emerald-100 text-emerald-800" },
      completed: { label: "Finalizado", className: "bg-green-100 text-green-800" },
      rejected: { label: "Rejeitado", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, className: "bg-gray-100 text-gray-800" };

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (statsLoading || ordersLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const activeOrders = productionOrders?.filter((order: any) => 
    !['completed', 'rejected'].includes(order.status)
  ) || [];

  const urgentOrders = productionOrders?.filter((order: any) => {
    if (!order.deadline) return false;
    const deadline = new Date(order.deadline);
    const now = new Date();
    const daysDiff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return daysDiff <= 3 && !['completed', 'rejected'].includes(order.status);
  }) || [];

  const readyToShip = productionOrders?.filter((order: any) => 
    ['ready', 'preparing_shipment'].includes(order.status)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Painel de Produção</h2>
        <Button onClick={() => navigate('/producer/dashboard')}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Ver Painel Completo
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ordens Ativas</p>
                <p className="text-2xl font-bold">{activeOrders.length}</p>
              </div>
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Urgentes</p>
                <p className="text-2xl font-bold text-red-600">{urgentOrders.length}</p>
              </div>
              <Clock className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Prontos p/ Envio</p>
                <p className="text-2xl font-bold text-green-600">{readyToShip.length}</p>
              </div>
              <Truck className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Este Mês</p>
                <p className="text-2xl font-bold">{stats?.monthlyCompleted || 0}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ordens Recentes</span>
            <Button variant="outline" onClick={() => navigate('/producer/orders')}>
              <Eye className="h-4 w-4 mr-2" />
              Ver Todas
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!productionOrders || productionOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma ordem encontrada</h3>
              <p className="text-gray-500">Aguardando novas ordens de produção.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {productionOrders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Ordem #{order.id.slice(-6)}</h4>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                      <span>Pedido: {order.order?.orderNumber || 'N/A'}</span>
                      <span>Cliente: {order.order?.clientName || 'N/A'}</span>
                      <span>
                        Prazo: {order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>
                          {order.order?.deliveryType === 'pickup' ? 'Retirada no Local' : 'Entrega em Casa'}
                        </span>
                      </div>
                      
                      {order.trackingCode && (
                        <div className="flex items-center gap-1">
                          <Truck className="h-4 w-4 text-blue-400" />
                          <span className="font-mono text-blue-600">{order.trackingCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/producer/orders/${order.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
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
