import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Package, Truck, CheckCircle, User, CreditCard, FileText, Phone, Mail, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function ClientOrderTimeline() {
  const [, params] = useRoute("/client/order/:id/timeline");

  const { data: orderData, isLoading } = useQuery({
    queryKey: [`/api/orders/${params?.id}/timeline`],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${params?.id}/timeline`);
      if (!response.ok) throw new Error('Failed to fetch order timeline');
      return response.json();
    },
    enabled: !!params?.id,
  });

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      production: "bg-purple-100 text-purple-800",
      ready: "bg-orange-100 text-orange-800",
      shipped: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const statusLabels = {
      pending: "Aguardando",
      confirmed: "Confirmado",
      production: "Em Produção",
      ready: "Pronto para Envio",
      shipped: "Enviado",
      delivered: "Entregue",
      cancelled: "Cancelado",
    };

    return (
      <Badge className={`${statusClasses[status as keyof typeof statusClasses]} border-0`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-medium text-gray-600">Pedido não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { order, timeline } = orderData;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link href="/client/orders">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Pedidos
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Pedido #{order.orderNumber}
            </h1>
            <p className="text-gray-600">{order.product}</p>
          </div>
          <div className="text-right">
            {getStatusBadge(order.status)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="lg:col-span-2">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Data do Pedido</p>
                    <p className="font-medium flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {order.deadline && (
                    <div>
                      <p className="text-sm text-gray-600">Prazo de Entrega</p>
                      <p className="font-medium flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(order.deadline).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {order.vendorName && (
                    <div>
                      <p className="text-sm text-gray-600">Vendedor</p>
                      <p className="font-medium">{order.vendorName}</p>
                    </div>
                  )}
                  {order.producerName && (
                    <div>
                      <p className="text-sm text-gray-600">Produtor</p>
                      <p className="font-medium">{order.producerName}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Valor Total</p>
                    <p className="font-bold text-2xl text-green-600">
                      R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valor Pago</p>
                    <p className="font-semibold text-lg text-blue-600">
                      R$ {parseFloat(order.paidValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Saldo Restante</p>
                    <p className="font-semibold text-lg text-orange-600">
                      R$ {(parseFloat(order.totalValue) - parseFloat(order.paidValue || '0')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {order.description && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600 mb-2">Descrição do Pedido</p>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{order.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Acompanhamento do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {timeline.map((step: any, index: number) => (
                  <div key={step.id} className="flex items-start">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      step.completed ? 'gradient-bg text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {step.icon === 'check-circle' && <CheckCircle className="h-5 w-5" />}
                      {step.icon === 'clock' && <Clock className="h-5 w-5" />}
                      {step.icon === 'package' && <Package className="h-5 w-5" />}
                      {step.icon === 'truck' && <Truck className="h-5 w-5" />}
                      {step.icon === 'file-plus' && <FileText className="h-5 w-5" />}
                      {step.icon === 'settings' && <Package className="h-5 w-5" />}
                      {step.icon === 'check-circle-2' && <CheckCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 pb-8 border-l-2 border-gray-200 pl-6 ml-5 relative">
                      <div className="absolute -left-2 top-0 w-4 h-4 bg-white border-2 border-gray-300 rounded-full"></div>
                      <h4 className={`font-bold text-lg mb-2 ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                        {step.title}
                      </h4>
                      <p className={`text-sm mb-3 ${step.completed ? 'text-gray-700' : 'text-gray-400'}`}>
                        {step.description}
                      </p>
                      {step.date && (
                        <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full inline-flex">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(step.date).toLocaleDateString('pt-BR', { 
                            weekday: 'long',
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Information */}
        <div>
          {/* Financial Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Valor Total:</span>
                <span className="font-bold text-xl text-green-600">
                  R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Valor Pago:</span>
                <span className="font-semibold text-blue-600">
                  R$ {parseFloat(order.paidValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-gray-600 font-medium">Saldo:</span>
                <span className="font-bold text-xl text-orange-600">
                  R$ {(parseFloat(order.totalValue) - parseFloat(order.paidValue || '0')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {parseFloat(order.paidValue || '0') > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center text-sm text-green-800">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Pagamento parcial realizado</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                Ligar para Vendedor
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Enviar Email
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <Package className="h-4 w-4 mr-2" />
                Rastrear Entrega
              </Button>
            </CardContent>
          </Card>

          {/* Additional Information */}
          {(order.vendorName || order.producerName) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Equipe Responsável
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.vendorName && (
                  <div>
                    <p className="text-sm text-gray-600">Vendedor Responsável</p>
                    <p className="font-medium text-gray-900">{order.vendorName}</p>
                  </div>
                )}
                {order.producerName && (
                  <div>
                    <p className="text-sm text-gray-600">Produtor</p>
                    <p className="font-medium text-gray-900">{order.producerName}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}