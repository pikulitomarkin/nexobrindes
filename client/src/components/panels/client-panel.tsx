import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Truck, Home } from "lucide-react";

export default function ClientPanel() {
  const clientId = "client-1"; // Mock current client ID

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders/client", clientId],
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-xl mb-8"></div>
          <div className="h-48 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const currentOrder = orders?.[0]; // Get the first order for timeline demo

  const getTimelineSteps = (status: string) => {
    const steps = [
      { id: "confirmed", label: "Pedido Confirmado", icon: CheckCircle, completed: true },
      { id: "production", label: "Em Produção", icon: Clock, completed: status !== "pending" },
      { id: "shipping", label: "Envio", icon: Truck, completed: ["shipped", "delivered"].includes(status) },
      { id: "delivered", label: "Entregue", icon: Home, completed: status === "delivered" },
    ];

    return steps;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Pedidos</h1>
        <p className="text-gray-600">Acompanhe o status dos seus pedidos</p>
      </div>

      {currentOrder && (
        <>
          {/* Order Timeline */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {currentOrder.orderNumber} - Status Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  {getTimelineSteps(currentOrder.status).map((step, index) => {
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
                          {step.completed ? new Date(currentOrder.createdAt).toLocaleDateString('pt-BR') : 'Previsto'}
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
                      width: currentOrder.status === "pending" ? "25%" : 
                             currentOrder.status === "production" ? "50%" : 
                             currentOrder.status === "shipped" ? "75%" : "100%" 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Detalhes do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Produto</p>
                  <p className="font-medium text-gray-900">{currentOrder.product}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                  <p className="font-medium text-gray-900">
                    R$ {parseFloat(currentOrder.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Prazo de Entrega</p>
                  <p className="font-medium text-gray-900">
                    {currentOrder.deadline ? new Date(currentOrder.deadline).toLocaleDateString('pt-BR') : 'A definir'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Produtor Responsável</p>
                  <p className="font-medium text-gray-900">
                    {currentOrder.producerName || 'Em definição'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!currentOrder && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Nenhum pedido encontrado.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
