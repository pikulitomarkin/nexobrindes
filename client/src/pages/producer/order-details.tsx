import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Package,
  Truck,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ProducerOrderDetails() {
  const [match, params] = useRoute("/producer/order/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const id = params?.id;

  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeadlineDialogOpen, setIsDeadlineDialogOpen] = useState(false);
  const [updateNotes, setUpdateNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const { data: productionOrder, isLoading } = useQuery({
    queryKey: ["/api/production-orders", id],
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, notes, deliveryDate, trackingCode }: {
      status: string;
      notes?: string;
      deliveryDate?: string;
      trackingCode?: string;
    }) => {
      const response = await fetch(`/api/production-orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes, deliveryDate, trackingCode }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders/producer"] });
      setIsUpdateDialogOpen(false);
      setIsDeadlineDialogOpen(false);
      setUpdateNotes("");
      setDeliveryDate("");
      setTrackingCode("");
      toast({
        title: "Sucesso!",
        description: "Status atualizado com sucesso",
      });
    },
  });

  const handleStatusUpdate = (status: string) => {
    // Check if the producerValue exists and is valid before allowing status change to 'ready' or 'completed'
    if (status === 'ready' || status === 'completed') {
      const currentValue = parseFloat(productionOrder?.producerValue || '0');
      if (!productionOrder?.producerValue || currentValue <= 0) {
        toast({
          title: "Valor do serviço não definido",
          description: "Você precisa definir o valor do serviço para poder marcar o pedido como pronto ou finalizado.",
          variant: "destructive",
        });
        return;
      }
    }

    if (status === 'completed' || status === 'rejected') {
      setSelectedStatus(status);
      setIsUpdateDialogOpen(true);
    } else {
      updateStatusMutation.mutate({ status });
    }
  };

  const [trackingCode, setTrackingCode] = useState("");

  const handleStatusUpdateWithNotes = () => {
    // Check if the producerValue exists and is valid before allowing status change to 'ready' or 'completed'
    if (selectedStatus === 'ready' || selectedStatus === 'completed') {
      const currentValue = parseFloat(productionOrder?.producerValue || '0');
      if (!productionOrder?.producerValue || currentValue <= 0) {
        toast({
          title: "Valor do serviço não definido",
          description: "Você precisa definir o valor do serviço para poder marcar o pedido como pronto ou finalizado.",
          variant: "destructive",
        });
        return;
      }
    }
    updateStatusMutation.mutate({
      status: selectedStatus,
      notes: updateNotes,
      deliveryDate: deliveryDate || undefined,
      trackingCode: trackingCode || undefined
    });
  };

  const handleDeadlineUpdate = () => {
    updateStatusMutation.mutate({
      status: productionOrder?.status,
      notes: updateNotes,
      deliveryDate: deliveryDate
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Aguardando", className: "bg-yellow-100 text-yellow-800" },
      accepted: { label: "Aceito", className: "bg-blue-100 text-blue-800" },
      production: { label: "Em Produção", className: "bg-purple-100 text-purple-800" },
      quality_check: { label: "Controle Qualidade", className: "bg-indigo-100 text-indigo-800" },
      ready: { label: "Pronto", className: "bg-green-100 text-green-800" },
      shipped: { label: "Enviado", className: "bg-cyan-100 text-cyan-800" },
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

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!productionOrder) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">Ordem de produção não encontrada</p>
        <Button onClick={() => setLocation('/producer/production-dashboard')}>
          Voltar para Ordens
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation('/producer/production-dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Ordens
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Ordem #{productionOrder.id.slice(-6)}
            </h1>
            <p className="text-gray-600">
              Pedido: {productionOrder.order?.orderNumber || 'N/A'}
            </p>
          </div>
          <div className="text-right">
            {getStatusBadge(productionOrder.status)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Produto</Label>
                  <p className="text-lg font-semibold">{productionOrder.orderDetails?.product || productionOrder.order?.product || 'N/A'}</p>
                </div>
                {productionOrder.orderDetails?.totalValue && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Valor dos Seus Itens</Label>
                    <p className="text-lg font-bold text-green-600">
                      R$ {parseFloat(productionOrder.orderDetails.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              {productionOrder.order?.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Descrição</Label>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg mt-1">
                    {productionOrder.order.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Prazo Original</Label>
                  <p>{productionOrder.deadline ? new Date(productionOrder.deadline).toLocaleDateString('pt-BR') : 'Não definido'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Prazo Atualizado</Label>
                  <p className={productionOrder.deliveryDeadline ? "font-semibold text-blue-600" : ""}>
                    {productionOrder.deliveryDeadline ?
                      new Date(productionOrder.deliveryDeadline).toLocaleDateString('pt-BR') :
                      'Não definido'
                    }
                  </p>
                </div>
              </div>

              {productionOrder.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Observações</Label>
                  <p className="text-gray-700 bg-blue-50 p-3 rounded-lg mt-1">
                    {productionOrder.notes}
                  </p>
                  {productionOrder.lastNoteAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Última atualização: {new Date(productionOrder.lastNoteAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <Label className="text-sm text-gray-500">Nome</Label>
                    <p className="font-medium">{productionOrder.order?.clientName || 'N/A'}</p>
                  </div>
                </div>

                {productionOrder.order?.clientPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <Label className="text-sm text-gray-500">Telefone</Label>
                      <p className="font-medium">{productionOrder.order.clientPhone}</p>
                    </div>
                  </div>
                )}

                {productionOrder.order?.clientEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <Label className="text-sm text-gray-500">E-mail</Label>
                      <p className="font-medium">{productionOrder.order.clientEmail}</p>
                    </div>
                  </div>
                )}

                {productionOrder.order?.clientAddress && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <Label className="text-sm text-gray-500">Endereço</Label>
                      <p className="font-medium">{productionOrder.order.clientAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          {(() => {
            // Get items from orderDetails if available (filtered for this producer), otherwise use order.items
            const itemsToShow = productionOrder.orderDetails?.items || 
              (productionOrder.order?.items?.filter((item: any) => 
                item.producerId === productionOrder.producerId || 
                (item.producerId === 'internal' && productionOrder.producerId === 'internal')
              )) || [];
            
            return itemsToShow && itemsToShow.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Itens do Pedido para Produção ({itemsToShow.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {itemsToShow.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-gray-900">{item.productName || 'Produto'}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Package className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Quantidade: <strong>{item.quantity}</strong></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            Item #{index + 1}
                          </div>
                        </div>
                      </div>

                      {/* Dimensões do Produto */}
                      {(item.productWidth || item.productHeight || item.productDepth) && (
                        <div className="mb-3 p-3 bg-white rounded border">
                          <h5 className="font-medium text-gray-700 mb-2">Dimensões Especificadas:</h5>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            {item.productWidth && (
                              <div>
                                <span className="text-gray-600">Largura:</span>
                                <span className="font-medium ml-1">{item.productWidth} cm</span>
                              </div>
                            )}
                            {item.productHeight && (
                              <div>
                                <span className="text-gray-600">Altura:</span>
                                <span className="font-medium ml-1">{item.productHeight} cm</span>
                              </div>
                            )}
                            {item.productDepth && (
                              <div>
                                <span className="text-gray-600">Profundidade:</span>
                                <span className="font-medium ml-1">{item.productDepth} cm</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Personalização do Item */}
                      {item.hasItemCustomization && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <h5 className="font-medium text-blue-800 mb-2">Personalização do Item:</h5>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-medium text-gray-700">Tipo:</span>
                              <span className="ml-2 text-sm">{item.itemCustomizationDescription || 'Personalização específica'}</span>
                            </div>
                            {item.additionalCustomizationNotes && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Observações:</span>
                                <p className="ml-2 text-sm text-gray-600 mt-1">{item.additionalCustomizationNotes}</p>
                              </div>
                            )}
                            {item.customizationPhoto && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Imagem de Referência:</span>
                                <div className="mt-2">
                                  <img
                                    src={item.customizationPhoto}
                                    alt="Personalização"
                                    className="w-24 h-24 object-cover rounded border cursor-pointer hover:opacity-75"
                                    onClick={() => window.open(item.customizationPhoto, '_blank')}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Personalização Geral */}
                      {item.hasGeneralCustomization && (
                        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
                          <h5 className="font-medium text-green-800 mb-2">Personalização Geral:</h5>
                          <div className="space-y-1">
                            <div>
                              <span className="text-sm font-medium text-gray-700">Nome:</span>
                              <span className="ml-2 text-sm">{item.generalCustomizationName || 'Personalização geral'}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Aplicar em todas as {item.quantity} unidades
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Desconto do Item */}
                      {item.hasItemDiscount && (
                        <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
                          <h5 className="font-medium text-orange-800 mb-1">Desconto Aplicado:</h5>
                          <div className="text-sm text-gray-600">
                            {item.itemDiscountType === 'percentage' 
                              ? `${item.itemDiscountPercentage}% de desconto`
                              : `Desconto fixo aplicado`
                            }
                          </div>
                        </div>
                      )}

                      {/* Resumo de Produção */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Para produzir:</span>
                            <span className="font-bold text-gray-900 ml-2">{item.quantity} unidade(s)</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Produtor:</span>
                            <span className="font-medium text-blue-600 ml-2">
                              {item.producerId === 'internal' ? 'Produção Interna' : 'Você'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            );
          })()}

          {/* Descrição Geral do Pedido */}
          {productionOrder.order?.description && (
            <Card>
              <CardHeader>
                <CardTitle>Descrição do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 leading-relaxed">{productionOrder.order.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          {productionOrder.photos && productionOrder.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Fotos de Referência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {productionOrder.photos.map((photo: string, index: number) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <img
                        src={photo}
                        alt={`Referência ${index + 1}`}
                        className="w-full h-32 object-cover cursor-pointer hover:opacity-80"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Shipping Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Informações de Envio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Tipo de Entrega</Label>
                <p className="font-medium">
                  {productionOrder.order?.deliveryType === 'pickup' ? 'Retirada no Local' : 'Entrega em Casa'}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Endereço de Envio</Label>
                <p className="font-medium text-gray-900">
                  {productionOrder.order?.deliveryType === 'pickup'
                    ? 'Sede Principal - Retirada no Local'
                    : (productionOrder.order?.shippingAddress || productionOrder.order?.clientAddress || 'Endereço não informado')
                  }
                </p>
              </div>

              {productionOrder.trackingCode && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Código de Rastreamento</Label>
                  <p className="font-medium text-blue-600 bg-blue-50 p-2 rounded">
                    {productionOrder.trackingCode}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { status: 'pending', label: 'Aguardando', completed: true },
                  { status: 'accepted', label: 'Aceito', completed: ['accepted', 'production', 'ready', 'shipped', 'delivered', 'completed'].includes(productionOrder.status) },
                  { status: 'production', label: 'Em Produção', completed: ['production', 'ready', 'shipped', 'delivered', 'completed'].includes(productionOrder.status) },
                  { status: 'ready', label: 'Pronto (Produção)', completed: ['ready', 'shipped', 'delivered', 'completed'].includes(productionOrder.status) },
                  { status: 'shipped', label: 'Despachado (Logística)', completed: ['shipped', 'delivered', 'completed'].includes(productionOrder.status) },
                  { status: 'delivered', label: 'Entregue (Logística)', completed: ['delivered', 'completed'].includes(productionOrder.status) },
                  { status: 'completed', label: 'Finalizado (Logística)', completed: productionOrder.status === 'completed' }
                ].map((step, index) => (
                  <div key={step.status} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm ${step.completed ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Controle de Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {productionOrder.status === 'pending' && (
                <>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStatusUpdate('accepted')}
                    disabled={updateStatusMutation.isPending || !productionOrder.producerValue}
                    title={!productionOrder.producerValue ? "Você deve definir o valor do serviço antes de aceitar a ordem" : ""}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aceitar Ordem
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </>
              )}

              {productionOrder.status === 'accepted' && (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => handleStatusUpdate('production')}
                  disabled={!productionOrder.producerValue}
                  title={!productionOrder.producerValue ? "Você deve definir o valor do serviço antes de iniciar produção" : ""}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Iniciar Produção
                </Button>
              )}

              {productionOrder.status === 'production' && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleStatusUpdate('ready')}
                  disabled={updateStatusMutation.isPending}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Marcar Pronto
                </Button>
              )}

              {['ready', 'shipped', 'delivered', 'completed'].includes(productionOrder.status) && (
                <div className="w-full text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">
                    {productionOrder.status === 'ready' && 'Produto Pronto - Em Expedição'}
                    {productionOrder.status === 'shipped' && 'Produto Despachado'}
                    {productionOrder.status === 'delivered' && 'Produto Entregue'}
                    {productionOrder.status === 'completed' && 'Ordem Finalizada'}
                  </p>
                  <p className="text-green-600 text-sm">
                    {productionOrder.status === 'ready' && 'A logística está processando o envio'}
                    {['shipped', 'delivered', 'completed'].includes(productionOrder.status) && 'Processo concluído pela logística'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t pt-3 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsDeadlineDialogOpen(true);
                    setDeliveryDate(productionOrder.deliveryDeadline ?
                      new Date(productionOrder.deliveryDeadline).toISOString().split('T')[0] :
                      '');
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Alterar Prazo
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsUpdateDialogOpen(true);
                    setSelectedStatus(productionOrder.status);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Adicionar Observação
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedStatus === 'completed' ? 'Finalizar Ordem' :
               selectedStatus === 'rejected' ? 'Rejeitar Ordem' : 'Adicionar Observação'}
            </DialogTitle>
            <DialogDescription>
              {selectedStatus === 'completed' ? 'Adicione observações finais sobre a conclusão' :
               selectedStatus === 'rejected' ? 'Explique o motivo da rejeição' :
               'Adicione observações sobre o andamento'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Descreva o andamento, observações técnicas, etc."
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                rows={4}
              />
            </div>
            {selectedStatus === 'shipped' && (
              <div>
                <Label htmlFor="tracking-code">Código de Rastreamento</Label>
                <Input
                  id="tracking-code"
                  placeholder="Ex: BR123456789..."
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                />
              </div>
            )}

            {(selectedStatus === 'completed' || selectedStatus === 'rejected' || selectedStatus === 'shipped') && (
              <div>
                <Label htmlFor="delivery-date">Data de Entrega (Opcional)</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleStatusUpdateWithNotes}
              disabled={updateStatusMutation.isPending}
              className={selectedStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {updateStatusMutation.isPending ? "Salvando..." :
               selectedStatus === 'completed' ? 'Finalizar' :
               selectedStatus === 'rejected' ? 'Rejeitar' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Deadline Dialog */}
      <Dialog open={isDeadlineDialogOpen} onOpenChange={setIsDeadlineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Prazo de Entrega</DialogTitle>
            <DialogDescription>
              Defina um novo prazo para a entrega deste pedido
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-deadline">Nova Data de Entrega</Label>
              <Input
                id="new-deadline"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="deadline-notes">Motivo da Alteração (Opcional)</Label>
              <Textarea
                id="deadline-notes"
                placeholder="Explique o motivo da alteração do prazo..."
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsDeadlineDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDeadlineUpdate}
              disabled={updateStatusMutation.isPending || !deliveryDate}
            >
              {updateStatusMutation.isPending ? "Salvando..." : "Alterar Prazo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}