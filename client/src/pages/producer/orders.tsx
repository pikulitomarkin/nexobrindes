import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, RefreshCw, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ProducerOrders() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeadlineDialogOpen, setIsDeadlineDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [updateNotes, setUpdateNotes] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const { toast } = useToast();

  const producerId = "producer-1";
  const { data: productionOrders, isLoading } = useQuery({
    queryKey: ["/api/production-orders/producer", producerId],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes, deliveryDate }: { orderId: string; status: string; notes: string; deliveryDate?: string }) => {
      const response = await fetch(`/api/production-orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes, deliveryDate }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders/producer", producerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); // Refresh main orders list
      setIsUpdateDialogOpen(false);
      setIsDeadlineDialogOpen(false);
      setUpdateNotes("");
      setNewDeadline("");
      toast({
        title: "Sucesso!",
        description: "Status atualizado com sucesso",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "status-badge status-pending",
      accepted: "status-badge status-confirmed",
      production: "status-badge status-production",
      completed: "status-badge status-completed",
      rejected: "status-badge status-cancelled",
    };

    const statusLabels = {
      pending: "Aguardando",
      accepted: "Aceito",
      production: "Em Produção",
      completed: "Concluído",
      rejected: "Rejeitado",
    };

    return (
      <span className={statusClasses[status as keyof typeof statusClasses] || "status-badge"}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  const handleUpdateStatus = (order: any, newStatus: string) => {
    setSelectedOrder(order);
    if (newStatus === 'completed') {
      setIsUpdateDialogOpen(true);
    } else {
      updateStatusMutation.mutate({ orderId: order.id, status: newStatus, notes: "" });
    }
  };

  const handleUpdateDeadline = (order: any) => {
    setSelectedOrder(order);
    setNewDeadline(order.deadline ? new Date(order.deadline).toISOString().split('T')[0] : "");
    setIsDeadlineDialogOpen(true);
  };

  const handleAddNotes = (order: any) => {
    setSelectedOrder(order);
    setUpdateNotes("");
    setIsUpdateDialogOpen(true);
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setIsDetailsDialogOpen(true);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ordens de Produção</h1>
        <p className="text-gray-600">Gerencie suas ordens de produção</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-3xl font-bold gradient-text">
                  {productionOrders?.filter((po: any) => po.status === 'pending').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Produção</p>
                <p className="text-3xl font-bold gradient-text">
                  {productionOrders?.filter((po: any) => po.status === 'production' || po.status === 'accepted').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídas</p>
                <p className="text-3xl font-bold gradient-text">
                  {productionOrders?.filter((po: any) => po.status === 'completed').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordens de Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productionOrders?.map((order: any) => (
              <Card key={order.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">#{order.id.slice(-6)} - {order.product}</h3>
                      <p className="text-sm text-gray-600">Pedido: {order.orderNumber}</p>
                      <p className="text-sm text-gray-600">Prazo: {order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : 'A definir'}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{order.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(order)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleUpdateDeadline(order)}>
                      Alterar Prazo
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleAddNotes(order)}>
                      Adicionar Observação
                    </Button>
                    
                    {order.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          className="gradient-bg text-white"
                          onClick={() => handleUpdateStatus(order, 'accepted')}
                          disabled={updateStatusMutation.isPending}
                        >
                          Aceitar Ordem
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus(order, 'rejected')}
                          disabled={updateStatusMutation.isPending}
                        >
                          Rejeitar
                        </Button>
                      </>
                    )}
                    
                    {order.status === 'accepted' && (
                      <Button 
                        size="sm" 
                        className="gradient-bg text-white"
                        onClick={() => handleUpdateStatus(order, 'production')}
                        disabled={updateStatusMutation.isPending}
                      >
                        Iniciar Produção
                      </Button>
                    )}
                    
                    {order.status === 'production' && (
                      <Button 
                        size="sm" 
                        className="gradient-bg text-white"
                        onClick={() => handleUpdateStatus(order, 'completed')}
                        disabled={updateStatusMutation.isPending}
                      >
                        Marcar como Concluído
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.status === 'completed' ? 'Finalizar Ordem de Produção' : 'Adicionar Observação'}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.status === 'completed' ? 
                'Adicione observações sobre a conclusão da ordem' : 
                'Adicione uma observação sobre o andamento da produção'
              }
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
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="gradient-bg text-white"
                onClick={() => {
                  if (selectedOrder?.status === 'completed') {
                    updateStatusMutation.mutate({ 
                      orderId: selectedOrder.id, 
                      status: 'completed', 
                      notes: updateNotes 
                    });
                  } else {
                    updateStatusMutation.mutate({ 
                      orderId: selectedOrder.id, 
                      status: selectedOrder.status, 
                      notes: updateNotes 
                    });
                  }
                }}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? "Salvando..." : "Salvar Observação"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deadline Dialog */}
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
              <Label htmlFor="deadline">Nova Data de Entrega</Label>
              <Input
                id="deadline"
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="deadline-notes">Motivo da Alteração (Opcional)</Label>
              <Textarea
                id="deadline-notes"
                placeholder="Explique o motivo da alteração do prazo..."
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDeadlineDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="gradient-bg text-white"
                onClick={() => updateStatusMutation.mutate({ 
                  orderId: selectedOrder.id, 
                  status: selectedOrder.status, 
                  notes: updateNotes,
                  deliveryDate: newDeadline
                })}
                disabled={updateStatusMutation.isPending || !newDeadline}
              >
                {updateStatusMutation.isPending ? "Salvando..." : "Alterar Prazo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Ordem de Produção</DialogTitle>
            <DialogDescription>
              Informações completas da ordem de produção
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">ID da Ordem</label>
                  <p className="font-semibold">#{selectedOrder.id.slice(-6)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Produto</label>
                  <p>{selectedOrder.product}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Número do Pedido</label>
                  <p>{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Prazo de Entrega</label>
                  <p>{selectedOrder.deadline ? new Date(selectedOrder.deadline).toLocaleDateString('pt-BR') : 'A definir'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Valor</label>
                  <p className="font-semibold text-green-600">
                    R$ {parseFloat(selectedOrder.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {selectedOrder.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Descrição</label>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg mt-1">{selectedOrder.description}</p>
                </div>
              )}

              {selectedOrder.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Observações</label>
                  <p className="text-gray-700 bg-blue-50 p-3 rounded-lg mt-1">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Aceito em</label>
                  <p className="text-sm">{selectedOrder.acceptedAt ? new Date(selectedOrder.acceptedAt).toLocaleDateString('pt-BR') : 'Pendente'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Iniciado em</label>
                  <p className="text-sm">{selectedOrder.startedAt ? new Date(selectedOrder.startedAt).toLocaleDateString('pt-BR') : 'Não iniciado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Concluído em</label>
                  <p className="text-sm">{selectedOrder.completedAt ? new Date(selectedOrder.completedAt).toLocaleDateString('pt-BR') : 'Em andamento'}</p>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  {selectedOrder.status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        className="gradient-bg text-white"
                        onClick={() => {
                          updateStatusMutation.mutate({ 
                            orderId: selectedOrder.id, 
                            status: 'accepted', 
                            notes: ""
                          });
                          setIsDetailsDialogOpen(false);
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        Aceitar Ordem
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          updateStatusMutation.mutate({ 
                            orderId: selectedOrder.id, 
                            status: 'rejected', 
                            notes: ""
                          });
                          setIsDetailsDialogOpen(false);
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        Rejeitar
                      </Button>
                    </>
                  )}
                  
                  {selectedOrder.status === 'accepted' && (
                    <Button 
                      size="sm" 
                      className="gradient-bg text-white"
                      onClick={() => {
                        updateStatusMutation.mutate({ 
                          orderId: selectedOrder.id, 
                          status: 'production', 
                          notes: ""
                        });
                        setIsDetailsDialogOpen(false);
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      Iniciar Produção
                    </Button>
                  )}
                  
                  {selectedOrder.status === 'production' && (
                    <Button 
                      size="sm" 
                      className="gradient-bg text-white"
                      onClick={() => {
                        setIsDetailsDialogOpen(false);
                        handleUpdateStatus(selectedOrder, 'completed');
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      Marcar como Concluído
                    </Button>
                  )}
                </div>
                
                <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}