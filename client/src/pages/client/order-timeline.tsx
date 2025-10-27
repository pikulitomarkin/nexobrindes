import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Package, Truck, CheckCircle, User, CreditCard, FileText, Phone, Mail, MapPin, Home } from "lucide-react";
import { Link } from "wouter";

export default function ClientOrderTimeline() {
  const [, params] = useRoute("/client/order/:id/timeline");
  const queryClient = useQueryClient();

  const { data: orderData, isLoading } = useQuery({
    queryKey: [`/api/orders/${params?.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${params?.id}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      return response.json();
    },
    enabled: !!params?.id,
    refetchInterval: 30000, // Refetch every 30 seconds to get updates
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/orders/${params?.id}/confirm-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to confirm delivery');
      return response.json();
    },
    onSuccess: () => {
      // Refresh the order data
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${params?.id}`] });
    }
  });

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      production: "bg-purple-100 text-purple-800",
      ready: "bg-orange-100 text-orange-800",
      preparing_shipment: "bg-yellow-200 text-yellow-800",
      shipped: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      completed: "bg-gray-100 text-gray-800",
    };

    const statusLabels = {
      pending: "Aguardando",
      confirmed: "Confirmado",
      production: "Em Produção",
      ready: "Pronto",
      preparing_shipment: "Preparando Envio",
      shipped: "Enviado",
      delivered: "Entregue",
      cancelled: "Cancelado",
      completed: "Finalizado",
    };

    return (
      <Badge className={`${statusClasses[status as keyof typeof statusClasses]} border-0`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </Badge>
    );
  };

  const getTimelineSteps = (order: any) => {
    const steps = [
      {
        id: 'created',
        status: 'created',
        title: 'Pedido Criado',
        description: 'Pedido foi criado e está aguardando confirmação',
        date: order.createdAt,
        completed: true,
        icon: 'file-plus'
      },
      {
        id: 'confirmed',
        status: 'confirmed',
        title: 'Pedido Confirmado',
        description: 'Pedido foi confirmado e enviado para produção',
        date: ['confirmed', 'production', 'ready', 'shipped', 'delivered', 'completed'].includes(order.status) ? order.updatedAt : null,
        completed: ['confirmed', 'production', 'ready', 'shipped', 'delivered', 'completed'].includes(order.status),
        icon: 'check-circle'
      },
      {
        id: 'production',
        status: 'production',
        title: 'Em Produção',
        description: order.productionOrder?.notes || 'Pedido em processo de produção',
        date: order.productionOrder?.acceptedAt || (['production', 'ready', 'shipped', 'delivered', 'completed'].includes(order.status) ? order.updatedAt : null),
        completed: ['production', 'ready', 'shipped', 'delivered', 'completed'].includes(order.status),
        icon: 'settings'
      },
      {
        id: 'ready',
        status: 'ready',
        title: 'Pronto para Envio',
        description: 'Produto finalizado e pronto para envio',
        date: ['ready', 'shipped', 'delivered', 'completed'].includes(order.status) ? order.updatedAt : null,
        completed: ['ready', 'shipped', 'delivered', 'completed'].includes(order.status),
        icon: 'package'
      },
      {
        id: 'shipped',
        status: 'shipped',
        title: 'Enviado',
        description: order.trackingCode ? `Código de rastreamento: ${order.trackingCode}` : (order.productionOrder?.trackingCode ? `Código de rastreamento: ${order.productionOrder.trackingCode}` : 'Produto foi enviado para o cliente'),
        date: ['shipped', 'delivered', 'completed'].includes(order.status) ? order.updatedAt : null,
        completed: ['shipped', 'delivered', 'completed'].includes(order.status),
        icon: 'truck'
      },
      {
        id: 'completed',
        status: 'completed',
        title: 'Entregue',
        description: 'Pedido foi entregue com sucesso',
        date: ['delivered', 'completed'].includes(order.status) ? order.updatedAt : null,
        completed: ['delivered', 'completed'].includes(order.status),
        icon: 'check-circle-2'
      }
    ];

    return steps;
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

  const order = orderData;
  const timeline = getTimelineSteps(order);

  return (
    <div className="p-8 max-w-6xl mx-auto client-panel">
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
          {/* Delivery Status Information */}
          {order.status === 'shipped' && (
            <Card className="mb-8 border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Truck className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">Pedido Enviado!</h3>
                      <p className="text-blue-700">
                        Seu pedido foi despachado e está a caminho. A confirmação de entrega será feita pela nossa equipe de logística quando você receber o produto.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informações do Pedido
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Número do Pedido</label>
                      <p className="text-lg font-bold">{order.orderNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div className="mt-1">{getStatusBadge(order.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Valor Total</label>
                      <p className="text-lg font-bold text-green-600">
                        R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                      <p className="text-sm text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Informações de Pagamento
                  </h3>
                  <div className="space-y-3">
                    {/* Entrada paga */}
                    {parseFloat(order.downPayment || '0') > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Entrada Paga</label>
                        <p className="text-lg font-bold text-green-600">
                          R$ {parseFloat(order.downPayment || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}

                    {/* Total pago */}
                    {parseFloat(order.paidValue || '0') > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Total Pago</label>
                        <p className="text-lg font-bold text-green-600">
                          R$ {parseFloat(order.paidValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}

                    {/* Saldo restante */}
                    {parseFloat(order.remainingBalance || '0') > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Saldo Restante</label>
                        <p className="text-lg font-bold text-orange-600">
                          R$ {parseFloat(order.remainingBalance || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}

                    {/* Status de pagamento */}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status de Pagamento</label>
                      <p className={`text-sm font-medium ${
                        parseFloat(order.paidValue || '0') >= parseFloat(order.totalValue)
                          ? 'text-green-600'
                          : parseFloat(order.paidValue || '0') > 0
                            ? 'text-orange-600'
                            : 'text-red-600'
                      }`}>
                        {parseFloat(order.paidValue || '0') >= parseFloat(order.totalValue)
                          ? 'Pago Integralmente'
                          : parseFloat(order.paidValue || '0') > 0
                            ? 'Pagamento Parcial'
                            : 'Aguardando Pagamento'
                        }
                      </p>
                    </div>
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
                {timeline.map((step: any, index: number) => {
                  const isCurrentStatus = order.status === step.id;
                  const isCompleted = step.completed;
                  const isShipped = step.id === "shipping";
                  const isDelivered = step.id === "delivered";
                  const isPreparingShipment = step.id === "preparing_shipment";

                  return (
                    <div key={step.id} className="flex items-start">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                        isCompleted ? 'gradient-bg text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {step.icon === 'check-circle' && <CheckCircle className="h-5 w-5" />}
                        {step.icon === 'clock' && <Clock className="h-5 w-5" />}
                        {step.icon === 'package' && <Package className="h-5 w-5" />}
                        {step.icon === 'truck' && <Truck className="h-5 w-5" />}
                        {step.icon === 'file-plus' && <FileText className="h-5 w-5" />}
                        {step.icon === 'settings' && <Package className="h-5 w-5" />}
                        {step.icon === 'check-circle-2' && <CheckCircle className="h-5 w-5" />}
                        {step.icon === 'home' && <Home className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 pb-8 border-l-2 border-gray-200 pl-6 ml-5 relative">
                        <div className={`absolute -left-2 top-0 w-4 h-4 ${isCompleted ? 'bg-blue-500' : 'bg-white border-2 border-gray-300'} rounded-full`}></div>
                        <h4 className={`font-bold text-lg mb-2 ${isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                          {step.title}
                        </h4>
                        <p className={`text-sm mb-3 ${isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
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
                        {step.trackingCode && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600">Código de Rastreamento:</p>
                            <p className="font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              <a href={`https://rastreamento.correios.com.br/${step.trackingCode}`} target="_blank" rel="noopener noreferrer">
                                {step.trackingCode}
                              </a>
                            </p>
                          </div>
                        )}
                        {step.estimatedDelivery && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600">Data Prevista de Entrega:</p>
                            <p className="font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                              {new Date(step.estimatedDelivery).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                <span className="text-gray-600">
                  {parseFloat(order.paidValue || '0') >= parseFloat(order.totalValue)
                    ? 'Pagamento Completo:'
                    : parseFloat(order.paidValue || '0') > 0
                      ? 'Entrada Paga:'
                      : 'Valor Pago:'}
                </span>
                <span className="font-semibold text-blue-600">
                  R$ {parseFloat(order.paidValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-gray-600 font-medium">Saldo Restante:</span>
                <span className="font-bold text-xl text-orange-600">
                  R$ {(order.remainingValue ? parseFloat(order.remainingValue) : (parseFloat(order.totalValue) - parseFloat(order.paidValue || '0'))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {parseFloat(order.paidValue || '0') > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center text-sm text-green-800 mb-2">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="font-medium">
                      {parseFloat(order.paidValue || '0') >= parseFloat(order.totalValue)
                        ? 'Pagamento completo realizado'
                        : (order.budgetInfo ? 'Entrada paga conforme orçamento' : 'Entrada paga - Saldo pendente')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-green-800 mb-1">Detalhes do pagamento:</div>
                    {order.budgetInfo && order.budgetInfo.downPayment > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs text-green-700 flex justify-between bg-white p-1 rounded">
                          <span>Entrada Orçamento - {new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                          <span className="font-medium">R$ {parseFloat(order.budgetInfo.downPayment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {order.budgetInfo.installments > 1 && (
                          <div className="text-xs text-blue-700 bg-blue-50 p-1 rounded">
                            Restante em {order.budgetInfo.installments - 1} parcelas
                          </div>
                        )}
                      </div>
                    ) : (
                      order.payments && order.payments.length > 0 && order.payments.map((payment: any, index: number) => (
                        <div key={payment.id || index} className="text-xs text-green-700 flex justify-between bg-white p-1 rounded">
                          <span>
                            {payment.method?.toUpperCase()} - {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('pt-BR') : 'Data não informada'}
                          </span>
                          <span className="font-medium">
                            R$ {parseFloat(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                    )}
                    <div className="text-xs text-green-800 font-medium pt-1 border-t border-green-200">
                      Total pago: R$ {parseFloat(order.paidValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}
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