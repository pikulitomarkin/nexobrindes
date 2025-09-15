
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Settings, 
  Package, 
  Truck, 
  CheckCircle2,
  FilePlus,
  ArrowLeft,
  User,
  Phone,
  MapPin
} from "lucide-react";

export default function ClientOrderTimeline() {
  const { id } = useParams();

  const { data: orderData, isLoading } = useQuery({
    queryKey: ["/api/orders", id, "timeline"],
  });

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      'file-plus': FilePlus,
      'check-circle': CheckCircle,
      'settings': Settings,
      'package': Package,
      'truck': Truck,
      'check-circle-2': CheckCircle2
    };
    return icons[iconName] || Clock;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  if (!orderData) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Pedido não encontrado</h2>
          <p className="text-gray-600 mt-2">O pedido solicitado não foi encontrado.</p>
        </div>
      </div>
    );
  }

  const { order, timeline } = orderData;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {order.orderNumber}
            </h1>
            <p className="text-gray-600">Acompanhe o status do seu pedido</p>
          </div>
        </div>
        <Badge className="bg-blue-100 text-blue-800">
          {order.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Progresso do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                <div className="space-y-8">
                  {timeline.map((step: any, index: number) => {
                    const Icon = getIcon(step.icon);
                    return (
                      <div key={step.id} className="relative flex items-start gap-4">
                        {/* Icon */}
                        <div className={`
                          relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2
                          ${step.completed 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-400'
                          }
                        `}>
                          <Icon className="h-6 w-6" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-8">
                          <div className="flex items-center justify-between">
                            <h3 className={`text-lg font-semibold ${
                              step.completed ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {step.title}
                            </h3>
                            {step.date && (
                              <span className="text-sm text-gray-500">
                                {formatDate(step.date)}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${
                            step.completed ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                            {step.description}
                          </p>
                          
                          {/* Show current status indicator */}
                          {step.completed && index === timeline.findIndex((s: any) => s.completed) && (
                            <div className="mt-2">
                              <Badge className="bg-blue-100 text-blue-800">
                                Status Atual
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Info Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Produto</h4>
                <p className="text-gray-700">{order.product}</p>
                {order.description && (
                  <p className="text-sm text-gray-600 mt-1">{order.description}</p>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Valor Total</h4>
                <p className="text-2xl font-bold text-green-600">
                  R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {parseFloat(order.paidValue || '0') > 0 && (
                  <p className="text-sm text-gray-600">
                    Pago: R$ {parseFloat(order.paidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Prazo</h4>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">
                    {order.deadline 
                      ? new Date(order.deadline).toLocaleDateString('pt-BR')
                      : 'A definir'
                    }
                  </span>
                </div>
              </div>

              {order.productionOrder && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Produção</h4>
                  <div className="space-y-2">
                    {order.productionOrder.acceptedAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-gray-600">
                          Aceito em: {formatDate(order.productionOrder.acceptedAt)}
                        </span>
                      </div>
                    )}
                    {order.productionOrder.notes && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{order.productionOrder.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Dúvidas sobre seu pedido? Entre em contato:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">(11) 99999-9999</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">suporte@empresa.com</span>
                </div>
              </div>
              <Button className="w-full gradient-bg text-white mt-4">
                <Phone className="h-4 w-4 mr-2" />
                Entrar em Contato
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
