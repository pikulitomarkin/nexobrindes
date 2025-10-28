import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Truck, Home, Eye, Calendar, CreditCard, Package, User, FileText, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";

// Component to display shipping details
function ShippingDetailsCard({ orderId, status }: { orderId: string, status: string }) {
  const { data: shippingDetails, isLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}/shipping-details`],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/shipping-details`);
      if (!response.ok) throw new Error('Failed to fetch shipping details');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading || !shippingDetails) {
    return (
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-3/4"></div>
      </div>
    );
  }

  const isPartialShipped = status === 'partial_shipped';
  const isFullyShipped = status === 'shipped';

  return (
    <div className={`mt-4 p-4 border rounded-lg ${
      isPartialShipped ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <Truck className={`h-4 w-4 ${isPartialShipped ? 'text-yellow-600' : 'text-blue-600'}`} />
        <span className={`text-sm font-medium ${isPartialShipped ? 'text-yellow-800' : 'text-blue-800'}`}>
          {isPartialShipped
            ? `Envio Parcial - ${shippingDetails.shippedCount}/${shippingDetails.totalCount} produtores despacharam`
            : 'Pedido Totalmente Despachado!'
          }
        </span>
      </div>

      {/* Detalhes dos envios */}
      {shippingDetails.shipmentDetails && shippingDetails.shipmentDetails.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className={`text-md font-semibold ${isPartialShipped ? 'text-yellow-900' : 'text-blue-900'}`}>
            Status dos Envios:
          </h4>
          {shippingDetails.shipmentDetails.map((shipment: any, index: number) => (
            <div key={index} className={`bg-white p-4 rounded-lg border ${
              isPartialShipped ? 'border-yellow-200' : 'border-blue-200'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className={`font-semibold ${isPartialShipped ? 'text-yellow-900' : 'text-blue-900'}`}>
                    🏭 {shipment.producerName}
                  </div>
                  <div className={`text-sm mt-1 ${isPartialShipped ? 'text-yellow-700' : 'text-blue-700'}`}>
                    {shipment.items?.length || 0} item(s) neste envio
                  </div>
                </div>
                <div className="text-right">
                  {shipment.status === 'shipped' ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      ✓ Enviado
                    </span>
                  ) : (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                      ⏳ Aguardando
                    </span>
                  )}
                </div>
              </div>

              {shipment.status === 'shipped' && (
                <div className="mt-2 space-y-1">
                  {shipment.trackingCode && (
                    <div className="text-xs text-gray-600">
                      <strong>Código de rastreio:</strong>
                      <span className="font-mono ml-1">{shipment.trackingCode}</span>
                    </div>
                  )}
                  {shipment.dispatchDate && (
                    <div className="text-xs text-gray-600">
                      <strong>Despachado em:</strong> {new Date(shipment.dispatchDate).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              )}

              {/* Lista de itens enviados */}
              {shipment.items && shipment.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">Itens neste envio:</div>
                  <div className="space-y-1">
                    {shipment.items.map((item: any, itemIndex: number) => (
                      <div key={itemIndex} className="text-xs text-gray-600">
                        • {item.productName} (Qtd: {item.quantity})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={`text-xs mt-3 ${isPartialShipped ? 'text-yellow-600' : 'text-blue-600'}`}>
        {isPartialShipped
          ? 'Alguns itens já foram despachados. Os demais serão enviados conforme ficarem prontos.'
          : 'Todos os itens foram despachados. A entrega será confirmada pelo nosso sistema de logística.'
        }
      </div>
    </div>
  );
}

export default function ClientOrders() {
  // Get current user ID from localStorage (or auth context)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const clientId = currentUser.id;

  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders/client", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/client/${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client orders');
      return response.json();
    },
    enabled: !!clientId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const getTimelineSteps = (status: string) => {
    const steps = [
      { id: "confirmed", label: "Confirmado", icon: CheckCircle, completed: ["confirmed", "production", "ready", "shipped", "delivered", "completed"].includes(status) },
      { id: "production", label: "Em Produção", icon: Clock, completed: ["production", "ready", "shipped", "delivered", "completed"].includes(status) },
      { id: "ready", label: "Pronto", icon: Package, completed: ["ready", "shipped", "delivered", "completed"].includes(status) },
      { id: "shipped", label: "Enviado", icon: Truck, completed: ["shipped", "delivered", "completed"].includes(status) },
      { id: "delivered", label: "Entregue", icon: Home, completed: ["delivered", "completed"].includes(status) },
    ];
    return steps;
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-gray-100 text-gray-800",
      confirmed: "bg-blue-100 text-blue-800",
      production: "bg-purple-100 text-purple-800",
      ready: "bg-orange-100 text-orange-800",
      shipped: "bg-green-100 text-green-800",
      partial_shipped: "bg-yellow-100 text-yellow-800 animate-pulse",
      delivered: "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const statusLabels = {
      pending: "Aguardando",
      confirmed: "Confirmado",
      production: "Em Produção",
      ready: "Pronto para Envio",
      shipped: "Enviado",
      partial_shipped: "Enviado Parcialmente",
      delivered: "Entregue",
      completed: "Finalizado",
      cancelled: "Cancelado",
    };

    return (
      <Badge className={`${statusClasses[status as keyof typeof statusClasses]} border-0`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
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

  return (
    <div className="p-8 client-panel">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Pedidos</h1>
        <p className="text-gray-600">Acompanhe o status e detalhes dos seus pedidos</p>
      </div>

      <div className="space-y-6">
        {orders?.map((order: any) => (
          <Card key={order.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl text-gray-900 mb-2">
                    {order.orderNumber} - {order.product}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Pedido em: {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                    </span>
                    {order.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Prazo: {new Date(order.deadline).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(order.status)}
                  <div className="mt-2">
                    <Link href={`/client/order/${order.id}/timeline`}>
                      <Button size="sm" className="gradient-bg text-white">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Financial Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600">Valor Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      R$ {parseFloat(order.paidValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {parseFloat(order.paidValue || '0') > 0 ? 'Valor Pago' : 'Nenhum Pagamento'}
                    </div>
                    {parseFloat(order.paidValue || '0') > 0 && parseFloat(order.paidValue || '0') < parseFloat(order.totalValue) && (
                      <div className="text-xs text-blue-600 font-medium mt-1">
                        Entrada Paga
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      R$ {(order.remainingValue ? parseFloat(order.remainingValue) : (parseFloat(order.totalValue) - parseFloat(order.paidValue || '0'))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600">Saldo Restante</div>
                  </div>
                </div>

                {/* Payment Details */}
                {parseFloat(order.paidValue || '0') > 0 && order.payments && order.payments.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Histórico de Pagamentos:</p>
                    <div className="space-y-1">
                      {order.payments.map((payment: any, index: number) => (
                        <div key={payment.id || index} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {payment.method?.toUpperCase()} - {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('pt-BR') : 'Data não informada'}
                          </span>
                          <span className="font-medium text-green-600">
                            +R$ {parseFloat(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="relative mb-6">
                <div className="flex items-center justify-between">
                  {getTimelineSteps(order.status).map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.id} className="flex flex-col items-center relative z-10">
                        <div className={`w-10 h-10 ${step.completed ? 'gradient-bg' : 'bg-gray-300'} rounded-full flex items-center justify-center mb-2`}>
                          <Icon className={`h-5 w-5 ${step.completed ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <p className={`text-sm font-medium text-center ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {step.completed ? new Date(order.updatedAt || order.createdAt).toLocaleDateString('pt-BR') : 'Aguardando'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
                  <div
                    className="h-full gradient-bg transition-all duration-500"
                    style={{
                      width: order.status === "pending" ? "0%" :
                             order.status === "confirmed" ? "20%" :
                             order.status === "production" ? "40%" :
                             order.status === "ready" ? "60%" :
                             order.status === "shipped" ? "80%" :
                             order.status === "partial_shipped" ? "65%" :
                             ["delivered", "completed"].includes(order.status) ? "100%" : "0%"
                    }}
                  ></div>
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Descrição</p>
                  <p className="font-medium text-gray-900">{order.description || 'Descrição não informada'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Produtor</p>
                  <p className="font-medium text-gray-900">
                    {order.producerName || 'Em definição'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Vendedor</p>
                  <p className="font-medium text-gray-900">
                    {order.vendorName || 'Não informado'}
                  </p>
                </div>
              </div>

              {/* Items Summary - Show unique items count */}
              {(() => {
                const items = order.budgetItems || order.items || [];
                const uniqueItems = items.filter((item: any, index: number, self: any[]) =>
                  self.findIndex(i =>
                    i.productId === item.productId &&
                    i.producerId === item.producerId &&
                    i.quantity === item.quantity &&
                    (i.unitPrice === item.unitPrice || i.totalPrice === item.totalPrice) &&
                    i.hasItemCustomization === item.hasItemCustomization &&
                    i.selectedCustomizationId === item.selectedCustomizationId &&
                    i.hasGeneralCustomization === item.hasGeneralCustomization &&
                    i.generalCustomizationName === item.generalCustomizationName
                  ) === index
                );

                return uniqueItems.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">Itens do Pedido ({uniqueItems.length}):</p>
                    <div className="space-y-1">
                      {uniqueItems.map((item: any, index: number) => (
                        <div key={`${item.id || index}-${item.productId}`} className="flex justify-between text-sm">
                          <span className="text-blue-700">
                            {item.productName || item.product?.name || 'Produto'} - Qtd: {item.quantity}
                          </span>
                          <span className="font-medium text-blue-800">
                            R$ {parseFloat(item.totalPrice || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Payment Information */}
              {parseFloat(order.paidValue || '0') > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {parseFloat(order.paidValue || '0') >= parseFloat(order.totalValue)
                        ? 'Pagamento completo realizado'
                        : (order.budgetInfo ? 'Entrada paga conforme orçamento' : 'Entrada paga')}:
                      R$ {parseFloat(order.paidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-xs text-green-700">
                    <strong>Detalhes:</strong>
                    {order.budgetInfo && order.budgetInfo.downPayment > 0 ? (
                      <div className="ml-2">
                        <div>• Entrada do orçamento paga</div>
                        {order.budgetInfo.installments > 1 && (
                          <div>• Restante em {order.budgetInfo.installments - 1}x</div>
                        )}
                        <div>• Saldo: R$ {(parseFloat(order.totalValue) - parseFloat(order.paidValue || '0')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    ) : (
                      order.payments && order.payments.length > 0 && order.payments.map((payment: any, index: number) => (
                        <div key={payment.id || index} className="ml-2 flex justify-between">
                          <span>{payment.method?.toUpperCase()} - {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('pt-BR') : 'Data não informada'}</span>
                          <span className="font-medium">R$ {parseFloat(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tracking Information */}
              {order.status === 'shipped' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Seu pedido foi despachado!
                    </span>
                  </div>
                  {order.trackingCode && (
                    <div className="text-xs text-blue-700 mt-2">
                      <strong>Código de rastreio:</strong> {order.trackingCode}
                    </div>
                  )}
                  <div className="text-xs text-blue-600 mt-1">
                    A entrega será confirmada automaticamente pelo nosso sistema de logística.
                  </div>
                </div>
              )}

              {order.status === 'partial_shipped' && (
                <ShippingDetailsCard orderId={order.id} status={order.status} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {orders?.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-medium text-gray-600 mb-2">Nenhum pedido encontrado</p>
            <p className="text-gray-500">Seus pedidos aparecerão aqui quando forem criados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}