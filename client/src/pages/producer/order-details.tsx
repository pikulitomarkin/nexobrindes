
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  User, 
  Package, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  ArrowLeft,
  Image as ImageIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ProducerOrderDetails() {
  const { id } = useParams();
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateNotes, setUpdateNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const { toast } = useToast();

  const { data: productionOrder, isLoading } = useQuery({
    queryKey: ["/api/production-orders", id],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, notes, deliveryDate }: { 
      status: string; 
      notes: string;
      deliveryDate?: string;
    }) => {
      const response = await fetch(`/api/production-orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes, deliveryDate }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders", id] });
      setIsUpdateDialogOpen(false);
      setUpdateNotes("");
      setDeliveryDate("");
      toast({
        title: "Sucesso!",
        description: "Status atualizado com sucesso",
      });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ notes, deliveryDeadline }: { 
      notes: string;
      deliveryDeadline?: string;
    }) => {
      const response = await fetch(`/api/production-orders/${id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, deliveryDeadline }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar observações");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders", id] });
      setUpdateNotes("");
      setDeliveryDate("");
      toast({
        title: "Sucesso!",
        description: "Observações atualizadas com sucesso",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Aguardando", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      accepted: { label: "Aceito", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
      production: { label: "Em Produção", color: "bg-purple-100 text-purple-800", icon: Settings },
      quality_check: { label: "Controle Qualidade", color: "bg-orange-100 text-orange-800", icon: CheckCircle },
      ready: { label: "Pronto", color: "bg-green-100 text-green-800", icon: Package },
      shipped: { label: "Enviado", color: "bg-indigo-100 text-indigo-800", icon: Package },
      completed: { label: "Concluído", color: "bg-green-100 text-green-800", icon: CheckCircle },
      rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800", icon: AlertTriangle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleStatusUpdate = (status: string) => {
    setNewStatus(status);
    if (status === 'completed' || status === 'ready') {
      setIsUpdateDialogOpen(true);
    } else {
      updateStatusMutation.mutate({ status, notes: "" });
    }
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Não definido";
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDaysUntilDeadline = (deadline: string | Date | null) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

  if (!productionOrder) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Ordem não encontrada</h2>
          <p className="text-gray-600 mt-2">A ordem de produção solicitada não foi encontrada.</p>
        </div>
      </div>
    );
  }

  const daysUntilDeadline = getDaysUntilDeadline(productionOrder.deadline);
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;

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
              Ordem #{productionOrder.id.slice(-6)}
            </h1>
            <p className="text-gray-600">
              Pedido: {productionOrder.order.orderNumber} - {productionOrder.order.clientName}
            </p>
          </div>
        </div>
        <div className="text-right">
          {getStatusBadge(productionOrder.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Cliente</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{productionOrder.order.clientName}</span>
                  </div>
                  {productionOrder.order.clientAddress && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <Label className="text-xs font-medium text-gray-600">Endereço de Entrega</Label>
                      <p className="text-sm text-gray-700 mt-1">{productionOrder.order.clientAddress}</p>
                    </div>
                  )}
                  {productionOrder.order.clientPhone && (
                    <div className="mt-2">
                      <Label className="text-xs font-medium text-gray-600">Telefone</Label>
                      <p className="text-sm text-gray-700">{productionOrder.order.clientPhone}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Produto</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{productionOrder.order.product}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Data de Entrada</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(productionOrder.order.createdAt)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Prazo Limite</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                      {formatDate(productionOrder.deadline)}
                    </span>
                    {daysUntilDeadline !== null && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        isOverdue 
                          ? "bg-red-100 text-red-800" 
                          : daysUntilDeadline <= 3 
                            ? "bg-yellow-100 text-yellow-800" 
                            : "bg-green-100 text-green-800"
                      }`}>
                        {isOverdue 
                          ? `${Math.abs(daysUntilDeadline)} dias em atraso`
                          : daysUntilDeadline === 0
                            ? "Vence hoje"
                            : `${daysUntilDeadline} dias restantes`
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {productionOrder.order.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Descrição</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-700">
                    {productionOrder.order.description}
                  </p>
                </div>
              )}

              {productionOrder.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Observações da Produção</Label>
                  <p className="mt-1 p-3 bg-blue-50 rounded-lg text-blue-700">
                    {productionOrder.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          {productionOrder.items && productionOrder.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Itens do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productionOrder.items.map((item: any) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{item.product.name}</h4>
                          {item.product.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.product.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm text-gray-600">
                              <strong>Quantidade:</strong> {item.quantity} {item.product.unit || 'un'}
                            </span>
                            {item.product.category && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {item.product.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {item.hasItemCustomization && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <h5 className="font-medium text-blue-900 mb-2">Personalização</h5>
                          {item.itemCustomizationDescription && (
                            <p className="text-sm text-blue-700 mb-2">
                              {item.itemCustomizationDescription}
                            </p>
                          )}
                          {item.customizationPhoto && (
                            <div className="mt-2">
                              <img
                                src={item.customizationPhoto}
                                alt="Personalização do produto"
                                className="max-w-xs rounded-lg border border-blue-200"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          {productionOrder.photos && productionOrder.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Imagens de Referência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {productionOrder.photos.map((photo: string, index: number) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`Referência ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = '/api/placeholder/150/150';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Atualizar Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="delivery-deadline">Prazo de Entrega</Label>
                <Input
                  id="delivery-deadline"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="production-notes">Observações</Label>
                <Textarea
                  id="production-notes"
                  placeholder="Adicione observações sobre a produção..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => updateNotesMutation.mutate({ 
                  notes: updateNotes, 
                  deliveryDeadline: deliveryDate 
                })}
                disabled={updateNotesMutation.isPending}
              >
                {updateNotesMutation.isPending ? "Salvando..." : "Salvar Informações"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações de Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {productionOrder.status === 'pending' && (
                <>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStatusUpdate('accepted')}
                    disabled={updateStatusMutation.isPending}
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
                  disabled={updateStatusMutation.isPending}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Iniciar Produção
                </Button>
              )}
              
              {productionOrder.status === 'production' && (
                <Button 
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => handleStatusUpdate('quality_check')}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Controle Qualidade
                </Button>
              )}

              {productionOrder.status === 'quality_check' && (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleStatusUpdate('ready')}
                  disabled={updateStatusMutation.isPending}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Marcar Pronto
                </Button>
              )}

              {productionOrder.status === 'ready' && (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalizar Ordem
                </Button>
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
                  { status: 'accepted', label: 'Aceito', completed: ['accepted', 'production', 'quality_check', 'ready', 'completed'].includes(productionOrder.status) },
                  { status: 'production', label: 'Em Produção', completed: ['production', 'quality_check', 'ready', 'completed'].includes(productionOrder.status) },
                  { status: 'quality_check', label: 'Controle Qualidade', completed: ['quality_check', 'ready', 'completed'].includes(productionOrder.status) },
                  { status: 'ready', label: 'Pronto', completed: ['ready', 'completed'].includes(productionOrder.status) },
                  { status: 'completed', label: 'Finalizado', completed: productionOrder.status === 'completed' }
                ].map((step, index) => (
                  <div key={step.status} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={`text-sm ${step.completed ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {newStatus === 'ready' ? 'Marcar como Pronto' : 'Finalizar Ordem'}
            </DialogTitle>
            <DialogDescription>
              Adicione informações sobre a conclusão
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deliveryDate">Data de Entrega Prevista</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações sobre a finalização, qualidade, etc."
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => updateStatusMutation.mutate({ 
                  status: newStatus, 
                  notes: updateNotes,
                  deliveryDate: deliveryDate
                })}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? "Finalizando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
