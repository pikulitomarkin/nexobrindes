
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, DollarSign, Clock, CheckCircle, Package, Calendar, User, Phone, Mail, MapPin } from "lucide-react";

export default function ProducerReceivables() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = useState<any>(null);

  // Get producer ID from localStorage (set during login)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const producerId = user.id;

  const { data: producerPayments = [], isLoading } = useQuery({
    queryKey: ["/api/finance/producer-payments/producer", producerId],
    enabled: !!producerId,
  });

  console.log('Producer Receivables - Producer ID:', producerId);
  console.log('Producer Receivables - Payments Data:', producerPayments);

  // Invalidate queries when component mounts to get fresh data
  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/finance/producer-payments/producer", producerId] });
  }, [producerId]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendente", variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Aprovado", variant: "outline" as const, color: "bg-blue-100 text-blue-800" },
      paid: { label: "Pago ✓", variant: "default" as const, color: "bg-green-100 text-green-800" },
      rejected: { label: "Rejeitado", variant: "destructive" as const, color: "bg-red-100 text-red-800" },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;

    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const filteredPayments = producerPayments.filter((payment: any) => {
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      payment.order?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.productionOrder?.product?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate totals correctly using available payment data
  const totalPending = producerPayments
    .filter((p: any) => ['pending', 'approved', 'draft'].includes(p.status))
    .reduce((sum: number, p: any) => {
      const amount = parseFloat(p.amount || '0');
      console.log(`Payment ${p.id}: status=${p.status}, amount=${amount}`);
      return sum + amount;
    }, 0);

  const totalReceived = producerPayments
    .filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => {
      const amount = parseFloat(p.amount || '0');
      console.log(`Paid payment ${p.id}: amount=${amount}`);
      return sum + amount;
    }, 0);

  const pendingCount = producerPayments.filter((p: any) => ['pending', 'draft'].includes(p.status)).length;
  const approvedCount = producerPayments.filter((p: any) => p.status === 'approved').length;
  const totalSum = totalPending + totalReceived;

  console.log('Producer Receivables Summary:', {
    totalPayments: producerPayments?.length || 0,
    totalPending,
    totalReceived,
    totalSum,
    pendingCount,
    approvedCount
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contas a Receber</h1>
        <p className="text-gray-600">Controle dos seus pagamentos de serviços de produção</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">A Receber</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Já Recebido</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-3xl font-bold gradient-text">
                  {pendingCount}
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
                <p className="text-sm font-medium text-gray-600">Aprovados</p>
                <p className="text-3xl font-bold gradient-text">
                  {approvedCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Geral</p>
                <p className="text-2xl font-bold text-blue-900">
                  R$ {totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-blue-600 mt-1">A receber + Recebido</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por pedido ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Pagamentos ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum pagamento encontrado</h3>
              <p className="text-gray-500">Não há pagamentos que correspondam aos filtros selecionados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment: any) => (
                <div key={payment.id} className="border rounded-lg p-6 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Pedido: {payment.order?.orderNumber || 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Produto: {payment.order?.product || payment.productionOrder?.product || 'N/A'}
                      </p>
                      {payment.order && (
                        <p className="text-xs text-gray-500">
                          Cliente: {payment.order.clientName || 'N/A'}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600 mb-1">
                        R$ {parseFloat(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Data de Criação</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <p className="text-sm">
                          {new Date(payment.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {payment.approvedAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Aprovado em</p>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="h-4 w-4 text-blue-400" />
                          <p className="text-sm">
                            {new Date(payment.approvedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    )}

                    {payment.paidAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Pago em</p>
                        <div className="flex items-center gap-2 mt-1">
                          <DollarSign className="h-4 w-4 text-green-400" />
                          <p className="text-sm">
                            {new Date(payment.paidAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {payment.paymentMethod && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500">Método de Pagamento</p>
                      <p className="text-sm mt-1 capitalize">{payment.paymentMethod}</p>
                    </div>
                  )}

                  {payment.notes && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500">Observações</p>
                      <div className="mt-1 p-3 bg-gray-50 border rounded">
                        <p className="text-sm">{payment.notes}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPaymentForDetails(payment)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Pedido */}
      <Dialog open={!!selectedPaymentForDetails} onOpenChange={() => setSelectedPaymentForDetails(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              Informações completas sobre o pedido e pagamentos
            </DialogDescription>
          </DialogHeader>
          
          {selectedPaymentForDetails && (
            <div className="space-y-6">
              {/* Informações Básicas do Pedido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Informações do Pedido</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Número do Pedido</label>
                      <p className="text-lg font-bold">
                        {selectedPaymentForDetails.order?.orderNumber || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Produto</label>
                      <p className="font-medium">
                        {selectedPaymentForDetails.productionOrder?.product || selectedPaymentForDetails.order?.product || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Descrição</label>
                      <p className="text-gray-700">
                        {selectedPaymentForDetails.order?.description || 'Sem descrição'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status do Pagamento</label>
                      <div className="mt-1">
                        {getStatusBadge(selectedPaymentForDetails.status)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Valores e Datas</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Meu Serviço</label>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {parseFloat(selectedPaymentForDetails.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <p className="text-sm">
                          {new Date(selectedPaymentForDetails.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {selectedPaymentForDetails.approvedAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Aprovado em</label>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="h-4 w-4 text-blue-400" />
                          <p className="text-sm">
                            {new Date(selectedPaymentForDetails.approvedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedPaymentForDetails.paidAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Pago em</label>
                        <div className="flex items-center gap-2 mt-1">
                          <DollarSign className="h-4 w-4 text-green-400" />
                          <p className="text-sm">
                            {new Date(selectedPaymentForDetails.paidAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informações do Cliente */}
              {selectedPaymentForDetails.order && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Informações do Cliente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <Label className="text-sm text-gray-500">Nome</Label>
                        <p className="font-medium">
                          {selectedPaymentForDetails.order.clientName || 'N/A'}
                        </p>
                      </div>
                    </div>
                    {selectedPaymentForDetails.order.clientPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div>
                          <Label className="text-sm text-gray-500">Telefone</Label>
                          <p className="font-medium">{selectedPaymentForDetails.order.clientPhone}</p>
                        </div>
                      </div>
                    )}
                    {selectedPaymentForDetails.order.clientEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <Label className="text-sm text-gray-500">E-mail</Label>
                          <p className="font-medium">{selectedPaymentForDetails.order.clientEmail}</p>
                        </div>
                      </div>
                    )}
                    {selectedPaymentForDetails.order.shippingAddress && (
                      <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <Label className="text-sm text-gray-500">Endereço de Entrega</Label>
                          <p className="font-medium">{selectedPaymentForDetails.order.shippingAddress}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Método de Pagamento */}
              {selectedPaymentForDetails.paymentMethod && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Informações de Pagamento</h3>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <Label className="text-sm text-gray-600">Método de Pagamento</Label>
                      <p className="font-medium text-blue-800 capitalize">
                        {selectedPaymentForDetails.paymentMethod}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Observações */}
              {selectedPaymentForDetails.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Observações</h3>
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-gray-800">{selectedPaymentForDetails.notes}</p>
                  </div>
                </div>
              )}

              {/* Status e Progresso */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Progresso do Pagamento</h3>
                <div className="space-y-3">
                  {[
                    { status: 'pending', label: 'Pendente', completed: true },
                    { status: 'approved', label: 'Aprovado', completed: selectedPaymentForDetails.status === 'approved' || selectedPaymentForDetails.status === 'paid' },
                    { status: 'paid', label: 'Pago', completed: selectedPaymentForDetails.status === 'paid' }
                  ].map((step, index) => (
                    <div key={step.status} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className={`text-sm ${step.completed ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedPaymentForDetails(null)}
                >
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
