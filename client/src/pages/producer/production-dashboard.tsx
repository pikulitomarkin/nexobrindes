import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Eye, RefreshCw, CheckCircle, Clock, AlertTriangle, Calendar, Package, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ProductionDashboard() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updateNotes, setUpdateNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const { toast } = useToast();

  const producerId = "producer-1";
  const { data: productionOrders, isLoading } = useQuery({
    queryKey: ["/api/production-orders/producer", producerId],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/producer", producerId, "stats"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes, deliveryDate }: { 
      orderId: string; 
      status: string; 
      notes: string;
      deliveryDate?: string;
    }) => {
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
      setIsUpdateDialogOpen(false);
      setUpdateNotes("");
      setDeliveryDate("");
      toast({
        title: "Sucesso!",
        description: "Status atualizado com sucesso",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Aguardando", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      accepted: { label: "Aceito", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
      production: { label: "Em Produção", color: "bg-purple-100 text-purple-800", icon: RefreshCw },
      quality_check: { label: "Controle Qualidade", color: "bg-orange-100 text-orange-800", icon: Eye },
      ready: { label: "Pronto", color: "bg-green-100 text-green-800", icon: Package },
      shipped: { label: "Enviado", color: "bg-indigo-100 text-indigo-800", icon: Truck },
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

  const handleUpdateStatus = (order: any, newStatus: string) => {
    setSelectedOrder(order);
    if (newStatus === 'completed' || newStatus === 'ready') {
      setIsUpdateDialogOpen(true);
    } else {
      updateStatusMutation.mutate({ orderId: order.id, status: newStatus, notes: "" });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Não definido";
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const getDaysUntilDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredOrders = productionOrders?.filter((order: any) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "overdue") return isOverdue(order.deadline);
    return order.status === statusFilter;
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel de Produção</h1>
        <p className="text-gray-600">Controle completo da produção com status e prazos</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Produção</p>
                <p className="text-3xl font-bold text-blue-600">
                  {productionOrders?.filter((po: any) => po.status === 'production').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {productionOrders?.filter((po: any) => po.status === 'pending').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Atraso</p>
                <p className="text-3xl font-bold text-red-600">
                  {productionOrders?.filter((po: any) => isOverdue(po.deadline)).length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prontos</p>
                <p className="text-3xl font-bold text-green-600">
                  {productionOrders?.filter((po: any) => po.status === 'ready' || po.status === 'completed').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={statusFilter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            Todos
          </Button>
          <Button 
            variant={statusFilter === "pending" ? "default" : "outline"} 
            size="sm"
            onClick={() => setStatusFilter("pending")}
          >
            Pendentes
          </Button>
          <Button 
            variant={statusFilter === "production" ? "default" : "outline"} 
            size="sm"
            onClick={() => setStatusFilter("production")}
          >
            Em Produção
          </Button>
          <Button 
            variant={statusFilter === "ready" ? "default" : "outline"} 
            size="sm"
            onClick={() => setStatusFilter("ready")}
          >
            Prontos
          </Button>
          <Button 
            variant={statusFilter === "overdue" ? "destructive" : "outline"} 
            size="sm"
            onClick={() => setStatusFilter("overdue")}
          >
            Em Atraso
          </Button>
        </div>
      </div>

      {/* Production Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ordens de Produção</CardTitle>
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
                    Data Entrada
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
                {filteredOrders?.map((order: any) => {
                  const daysUntilDeadline = getDaysUntilDeadline(order.deadline);
                  const isOrderOverdue = isOverdue(order.deadline);

                  return (
                    <tr key={order.id} className={isOrderOverdue ? "bg-red-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            #{order.id.slice(-6)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Pedido: {order.orderNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.product}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {formatDate(order.deadline)}
                          </div>
                          {daysUntilDeadline !== null && (
                            <span className={`text-xs ${
                              isOrderOverdue 
                                ? "text-red-600 font-semibold" 
                                : daysUntilDeadline <= 3 
                                  ? "text-yellow-600" 
                                  : "text-gray-500"
                            }`}>
                              {isOrderOverdue 
                                ? `${Math.abs(daysUntilDeadline)} dias em atraso`
                                : daysUntilDeadline === 0
                                  ? "Vence hoje"
                                  : `${daysUntilDeadline} dias restantes`
                              }
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = `/producer/order/${order.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>

                          {order.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleUpdateStatus(order, 'accepted')}
                                disabled={updateStatusMutation.isPending}
                              >
                                Aceitar
                              </Button>
                              <Button 
                                variant="destructive" 
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
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => handleUpdateStatus(order, 'production')}
                              disabled={updateStatusMutation.isPending}
                            >
                              Iniciar Produção
                            </Button>
                          )}

                          {order.status === 'production' && (
                            <Button 
                              size="sm" 
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                              onClick={() => handleUpdateStatus(order, 'quality_check')}
                              disabled={updateStatusMutation.isPending}
                            >
                              Controle Qualidade
                            </Button>
                          )}

                          {order.status === 'quality_check' && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleUpdateStatus(order, 'ready')}
                              disabled={updateStatusMutation.isPending}
                            >
                              Marcar Pronto
                            </Button>
                          )}

                          {order.status === 'ready' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => handleUpdateStatus(order, 'shipped')}
                                disabled={updateStatusMutation.isPending}
                              >
                                Enviar
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleUpdateStatus(order, 'completed')}
                                disabled={updateStatusMutation.isPending}
                              >
                                Finalizar
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Ordem de Produção</DialogTitle>
            <DialogDescription>
              Adicione informações sobre a finalização da ordem
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
                  orderId: selectedOrder?.id, 
                  status: selectedOrder?.status === 'ready' ? 'completed' : 'ready', 
                  notes: updateNotes,
                  deliveryDate: deliveryDate
                })}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? "Finalizando..." : "Finalizar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}