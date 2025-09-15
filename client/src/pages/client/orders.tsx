import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Truck, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export default function ClientOrders() {
  const clientId = "client-1";
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders/client", clientId],
  });

  const getTimelineSteps = (status: string) => {
    const steps = [
      { id: "confirmed", label: "Pedido Confirmado", icon: CheckCircle, completed: true },
      { id: "production", label: "Em Produção", icon: Clock, completed: status !== "pending" },
      { id: "shipping", label: "Envio", icon: Truck, completed: ["shipped", "delivered"].includes(status) },
      { id: "delivered", label: "Entregue", icon: Home, completed: status === "delivered" },
    ];
    return steps;
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Pedidos</h1>
        <p className="text-gray-600">Acompanhe o status dos seus pedidos</p>
      </div>

      <div className="space-y-6">
        {orders?.map((order: any) => (
          <Card key={order.id} className="card-hover">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{order.orderNumber} - {order.product}</span>
                <span className="text-lg font-bold gradient-text">
                  R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Timeline */}
              <div className="relative mb-6">
                <div className="flex items-center justify-between">
                  {getTimelineSteps(order.status).map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.id} className="flex flex-col items-center relative z-10">
                        <div className={`w-8 h-8 ${step.completed ? 'gradient-bg' : 'bg-gray-300'} rounded-full flex items-center justify-center mb-2`}>
                          <Icon className={`h-4 w-4 ${step.completed ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <p className={`text-sm font-medium ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {step.completed ? new Date(order.createdAt).toLocaleDateString('pt-BR') : 'Previsto'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Line */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200">
                  <div
                    className="h-full gradient-bg transition-all duration-500"
                    style={{
                      width: order.status === "pending" ? "25%" :
                             order.status === "production" ? "50%" :
                             order.status === "shipped" ? "75%" : "100%"
                    }}
                  ></div>
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Descrição</p>
                  <p className="font-medium text-gray-900">{order.description || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Prazo de Entrega</p>
                  <p className="font-medium text-gray-900">
                    {order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : 'A definir'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Produtor</p>
                  <p className="font-medium text-gray-900">
                    {order.producerName || 'Em definição'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  className="gradient-bg text-white"
                  onClick={() => window.location.href = `/client/order/${order.id}/timeline`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Status
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {orders?.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Nenhum pedido encontrado.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}