import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Eye, Edit, Send, Package, AlertCircle, Check, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { phoneMask, currencyMask, parseCurrencyValue } from "@/utils/masks";

export default function AdminOrders() {
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newOrder, setNewOrder] = useState({
    clientId: "",
    vendorId: "",
    product: "",
    description: "",
    totalValue: "",
    deadline: "",
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: producers } = useQuery({
    queryKey: ["/api/producers"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error("Failed to create order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShowNewOrderForm(false);
      setNewOrder({
        clientId: "",
        vendorId: "",
        product: "",
        description: "",
        totalValue: "",
        deadline: "",
      });
      toast({ title: "Sucesso", description: "Pedido criado com sucesso!" });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, ...orderData }: any) => {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error("Failed to update order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setEditingOrder(null);
      toast({ title: "Sucesso", description: "Pedido atualizado com sucesso!" });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Sucesso", description: "Pedido excluído com sucesso!" });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel order");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ 
        title: "Sucesso", 
        description: "Pedido cancelado com sucesso! Comissões e valores foram atualizados." 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro", 
        description: error.message || "Erro ao cancelar pedido. Tente novamente.",
        variant: "destructive" 
      });
    },
  });

  const acknowledgeNotesMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // First get production orders for this order
      const productionOrdersResponse = await fetch(`/api/production-orders/order/${orderId}`);
      if (!productionOrdersResponse.ok) throw new Error("Failed to fetch production orders");
      const productionOrders = await productionOrdersResponse.json();

      // Acknowledge notes for all production orders of this order
      for (const po of productionOrders) {
        if (po.hasUnreadNotes) {
          const response = await fetch(`/api/production-orders/${po.id}/acknowledge`, {
            method: "PATCH",
          });
          if (!response.ok) throw new Error("Failed to acknowledge notes");
        }
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Sucesso", description: "Observações marcadas como lidas!" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao marcar observações como lidas", variant: "destructive" });
    },
  });

  const sendToProductionMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/send-to-production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send to production");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Sucesso", description: "Pedido enviado para produção!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro", 
        description: error.message || "Erro ao enviar pedido para produção.",
        variant: "destructive" 
      });
    },
  });

  const handleCreateOrder = () => {
    createOrderMutation.mutate(newOrder);
  };

  const handleUpdateOrder = () => {
    if (editingOrder) {
      updateOrderMutation.mutate(editingOrder);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      production: "bg-purple-100 text-purple-800",
      shipped: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const statusLabels = {
      pending: "Aguardando",
      confirmed: "Confirmado",
      production: "Em Produção",
      shipped: "Enviado",
      delivered: "Entregue",
      cancelled: "Cancelado",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[status as keyof typeof statusClasses]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  // Filter orders based on search and filters
  const filteredOrders = orders?.filter((order: any) => {
    const matchesSearch = searchTerm === "" || 
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesVendor = vendorFilter === "all" || order.vendorId === vendorFilter;
    const matchesClient = clientFilter === "all" || order.clientId === clientFilter;
    
    return matchesSearch && matchesStatus && matchesVendor && matchesClient;
  });

  if (ordersLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Pedidos</h1>
            <p className="text-gray-600">Gerencie todos os pedidos do sistema</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por número, cliente ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Aguardando</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="production">Em Produção</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Vendedores</SelectItem>
                  {vendors?.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {clients?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos ({filteredOrders?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders?.map((order: any) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {order.orderNumber}
                          {order.hasUnreadNotes && (
                            <div className="relative">
                              <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.contactName || order.clientName || "Nome não informado"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.vendorName || "Vendedor não informado"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.product}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setShowOrderDetails(true);
                            }}
                            title="Ver detalhes do pedido"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingOrder(order)}
                            title="Editar pedido"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {order.hasUnreadNotes && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => acknowledgeNotesMutation.mutate(order.id)}
                              disabled={acknowledgeNotesMutation.isPending}
                              className="text-green-600 hover:text-green-800"
                              title="Marcar observações como lidas"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {order.status !== 'cancelled' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-800" title="Cancelar pedido">
                                  <X className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar cancelamento</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja cancelar este pedido? Esta ação irá:
                                    <br />• Cancelar o pedido
                                    <br />• Remover comissões relacionadas
                                    <br />• Atualizar valores do sistema
                                    <br />Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Não Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => cancelOrderMutation.mutate(order.id)}
                                    className="bg-orange-600 hover:bg-orange-700"
                                    disabled={cancelOrderMutation.isPending}
                                  >
                                    {cancelOrderMutation.isPending ? "Cancelando..." : "Cancelar Pedido"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Order Dialog */}
        {editingOrder && (
          <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Pedido #{editingOrder.orderNumber}</DialogTitle>
                <DialogDescription>Atualize os dados do pedido</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Basic Order Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-product">Produto</Label>
                    <Input
                      id="edit-product"
                      value={editingOrder.product || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, product: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={editingOrder.status || "pending"}
                      onValueChange={(value) => setEditingOrder({ ...editingOrder, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Aguardando</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="production">Em Produção</SelectItem>
                        <SelectItem value="shipped">Enviado</SelectItem>
                        <SelectItem value="delivered">Entregue</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    rows={3}
                    value={editingOrder.description || ""}
                    onChange={(e) => setEditingOrder({ ...editingOrder, description: e.target.value })}
                  />
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Informações de Contato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-contact-name">Nome de Contato *</Label>
                      <Input
                        id="edit-contact-name"
                        value={editingOrder.contactName || ""}
                        onChange={(e) => setEditingOrder({ ...editingOrder, contactName: e.target.value })}
                        placeholder="Nome do cliente"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-contact-phone">Telefone</Label>
                      <Input
                        id="edit-contact-phone"
                        value={editingOrder.contactPhone || ""}
                        onChange={(e) => setEditingOrder({ ...editingOrder, contactPhone: phoneMask(e.target.value) })}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-contact-email">Email</Label>
                      <Input
                        id="edit-contact-email"
                        type="email"
                        value={editingOrder.contactEmail || ""}
                        onChange={(e) => setEditingOrder({ ...editingOrder, contactEmail: e.target.value })}
                        placeholder="cliente@email.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Informações Financeiras</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-totalValue">Valor Total (R$)</Label>
                      <Input
                        id="edit-totalValue"
                        type="number"
                        step="0.01"
                        min="0"
                        value={parseFloat(editingOrder.totalValue || "0").toFixed(2)}
                        onChange={(e) => setEditingOrder({ ...editingOrder, totalValue: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-paidValue">Valor Pago (R$)</Label>
                      <Input
                        id="edit-paidValue"
                        type="number"
                        step="0.01"
                        min="0"
                        value={parseFloat(editingOrder.paidValue || "0").toFixed(2)}
                        onChange={(e) => setEditingOrder({ ...editingOrder, paidValue: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Informações de Entrega</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-delivery-type">Tipo de Entrega</Label>
                      <Select
                        value={editingOrder.deliveryType || "delivery"}
                        onValueChange={(value) => setEditingOrder({ ...editingOrder, deliveryType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="delivery">Entrega com Frete</SelectItem>
                          <SelectItem value="pickup">Retirada no Local</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-deadline">Prazo de Entrega</Label>
                      <Input
                        id="edit-deadline"
                        type="date"
                        value={editingOrder.deadline ? new Date(editingOrder.deadline).toISOString().split('T')[0] : ""}
                        onChange={(e) => setEditingOrder({ ...editingOrder, deadline: e.target.value ? new Date(e.target.value) : null })}
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Cost */}
                {editingOrder.deliveryType === "pickup" ? (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800">Retirada no Local</h4>
                    <p className="text-sm text-blue-700 mt-2">
                      O cliente irá retirar o pedido no local. Não há cobrança de frete.
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="edit-shipping-cost">Custo do Frete</Label>
                    <Input
                      id="edit-shipping-cost"
                      value={editingOrder.shippingCost > 0 ? currencyMask(editingOrder.shippingCost.toString()) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        if (rawValue === '' || rawValue === 'R$ ') {
                          setEditingOrder({ ...editingOrder, shippingCost: 0 });
                        } else {
                          const shippingCost = parseCurrencyValue(rawValue);
                          setEditingOrder({ ...editingOrder, shippingCost });
                        }
                      }}
                      placeholder="R$ 0,00"
                    />
                  </div>
                )}

                {/* Tracking Information */}
                {(editingOrder.status === 'shipped' || editingOrder.status === 'delivered') && (
                  <div>
                    <Label htmlFor="edit-tracking-code">Código de Rastreamento</Label>
                    <Input
                      id="edit-tracking-code"
                      value={editingOrder.trackingCode || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, trackingCode: e.target.value })}
                      placeholder="Código de rastreamento"
                    />
                  </div>
                )}

                {/* Budget Information (if order was converted from budget) */}
                {editingOrder.budgetId && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Informações do Orçamento Original</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-blue-800">Convertido do Orçamento</span>
                          <p className="text-blue-700">ID: {editingOrder.budgetId}</p>
                        </div>
                        <div>
                          <span className="font-medium text-blue-800">Tipo de Entrega</span>
                          <p className="text-blue-700">{editingOrder.deliveryType === 'pickup' ? 'Retirada no Local' : 'Entrega com Frete'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Items Display */}
                {editingOrder.items && editingOrder.items.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Itens do Pedido</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {editingOrder.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{item.productName}</span>
                            <span className="text-sm text-gray-500 ml-2">Qtd: {item.quantity}</span>
                            {item.productWidth && item.productHeight && (
                              <div className="text-xs text-gray-500">
                                Dimensões: {item.productWidth}x{item.productHeight}{item.productDepth ? `x${item.productDepth}` : ''} cm
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">R$ {parseFloat(item.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            {item.hasItemCustomization && (
                              <div className="text-xs text-blue-600">
                                Personalização: {item.itemCustomizationDescription || 'Sim'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Budget Items (if no order items but has budget items) */}
                {editingOrder.budgetItems && editingOrder.budgetItems.length > 0 && (!editingOrder.items || editingOrder.items.length === 0) && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Itens do Orçamento Original</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {editingOrder.budgetItems.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{item.product?.name || item.productName}</span>
                            <span className="text-sm text-gray-500 ml-2">Qtd: {item.quantity}</span>
                            {item.productWidth && item.productHeight && (
                              <div className="text-xs text-gray-500">
                                Dimensões: {item.productWidth}x{item.productHeight}{item.productDepth ? `x${item.productDepth}` : ''} cm
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">R$ {parseFloat(item.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            {item.hasItemCustomization && (
                              <div className="text-xs text-blue-600">
                                Personalização: {item.itemCustomizationDescription || 'Sim'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setEditingOrder(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateOrder} disabled={updateOrderMutation.isPending}>
                  {updateOrderMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Order Details Modal */}
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido</DialogTitle>
              <DialogDescription>
                Informações completas do pedido e status de produção
              </DialogDescription>
            </DialogHeader>
            <OrderDetailsContent
              orderId={selectedOrderId}
              onClose={() => setShowOrderDetails(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Order Details Component
function OrderDetailsContent({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
  });

  const { data: productionOrders, isLoading: productionLoading } = useQuery({
    queryKey: ["/api/production-orders/order", orderId],
    enabled: !!orderId,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient(); // Make sure queryClient is available here

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...order, status }),
      });
      if (!response.ok) throw new Error("Failed to update order status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Sucesso", description: "Status do pedido atualizado!" });
    },
  });

  if (orderLoading || productionLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Pedido não encontrado</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      production: "bg-purple-100 text-purple-800",
      shipped: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const statusLabels = {
      pending: "Aguardando",
      confirmed: "Confirmado",
      production: "Em Produção",
      shipped: "Enviado",
      delivered: "Entregue",
      cancelled: "Cancelado",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[status as keyof typeof statusClasses]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Order Information */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Informações do Pedido</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Número do Pedido</label>
              <p className="text-lg font-bold">{order.orderNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Cliente</label>
              <p>{order.clientName || "Nome não informado"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Vendedor</label>
              <p>{order.vendorName || "Vendedor não informado"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Produto</label>
              <p>{order.product}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Descrição</label>
              <p className="text-gray-700">{order.description}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Status e Valores</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Status Atual</label>
              <div className="flex items-center justify-between">
                {getStatusBadge(order.status)}
                <Select
                  value={order.status}
                  onValueChange={(newStatus) => updateOrderStatusMutation.mutate({ id: order.id, status: newStatus })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Alterar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Aguardando</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="production">Em Produção</SelectItem>
                    <SelectItem value="shipped">Enviado</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Valor Total</label>
              <p className="text-2xl font-bold text-green-600">
                R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Valor Pago</label>
              <p className="text-lg">
                R$ {parseFloat(order.paidValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Prazo de Entrega</label>
              <p>{order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : 'Não definido'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Data de Criação</label>
              <p>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Production Orders */}
      {productionOrders && productionOrders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Status de Produção</h3>
          <div className="space-y-4">
            {productionOrders.map((po: any) => (
              <Card key={po.id} className={po.hasUnreadNotes ? "border-red-300 bg-red-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Produtor: {po.producerName || "Produtor não informado"}</span>
                      {po.hasUnreadNotes && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600 text-sm font-medium">Nova observação</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(po.status)}
                    </div>
                  </div>

                  {po.notes && (
                    <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Observações do Produtor:</label>
                      <p className="text-gray-800 mt-1">{po.notes}</p>
                      {po.lastNoteAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Última atualização: {new Date(po.lastNoteAt).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                    <div>
                      <label className="text-gray-500">Aceito em:</label>
                      <p>{po.acceptedAt ? new Date(po.acceptedAt).toLocaleDateString('pt-BR') : 'Pendente'}</p>
                    </div>
                    <div>
                      <label className="text-gray-500">Prazo:</label>
                      <p>{po.deadline ? new Date(po.deadline).toLocaleDateString('pt-BR') : 'Não definido'}</p>
                    </div>
                    <div>
                      <label className="text-gray-500">Finalizado em:</label>
                      <p>{po.completedAt ? new Date(po.completedAt).toLocaleDateString('pt-BR') : 'Em andamento'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}