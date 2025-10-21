import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
    queryKey: ["/api/producer-payments/producer", producerId],
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendente", variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Aprovado", variant: "outline" as const, color: "bg-blue-100 text-blue-800" },
      paid: { label: "Pago", variant: "default" as const, color: "bg-green-100 text-green-800" },
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

  // Calculate correct totals
  const totalPending = producerPayments
    .filter((p: any) => p.status === 'pending')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0);

  const totalApproved = producerPayments
    .filter((p: any) => p.status === 'approved')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0);

  const totalReceived = producerPayments
    .filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0);

  // A Receber = Pendente + Aprovado
  const totalToReceive = totalPending + totalApproved;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">A Receber</p>
                <p className="text-2xl font-bold text-blue-900 mt-2">
                  R$ {totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-blue-600 mt-1">Pendente + Aprovado</p>
              </div>
              <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Já Recebido</p>
                <p className="text-2xl font-bold text-green-900 mt-2">
                  R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-green-600 mt-1">Pagamentos confirmados</p>
              </div>
              <div className="h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-900 mt-2">{producerPayments.filter((p: any) => p.status === 'pending').length}</p>
                <p className="text-xs text-yellow-600 mt-1">Aguardando aprovação</p>
              </div>
              <div className="h-12 w-12 bg-yellow-600 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Aprovados</p>
                <p className="text-2xl font-bold text-purple-900 mt-2">{producerPayments.filter((p: any) => p.status === 'approved').length}</p>
                <p className="text-xs text-purple-600 mt-1">Prontos para pagamento</p>
              </div>
              <div className="h-12 w-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por pedido ou produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-80"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos Status" />
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

      {/* Payments List */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Meus Pagamentos
            <Badge variant="outline" className="ml-2">
              {filteredPayments.length} {filteredPayments.length === 1 ? 'pagamento' : 'pagamentos'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum pagamento encontrado</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "all"
                  ? "Não há pagamentos que correspondam aos filtros selecionados."
                  : "Você ainda não possui pagamentos registrados."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment: any) => (
                <div key={payment.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all duration-200 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {payment.order?.orderNumber || payment.productionOrder?.orderNumber || `#${payment.id.slice(-6)}`}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {payment.productionOrder?.product || payment.order?.product || 'Serviço de produção'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-gray-500">Valor</Label>
                          <p className="font-semibold text-lg text-green-600">
                            R$ {parseFloat(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-500">Status</Label>
                          <div className="mt-1">
                            {getStatusBadge(payment.status)}
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-500">Data</Label>
                          <p className="font-medium">
                            {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {payment.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <Label className="text-sm text-gray-600">Observações</Label>
                          <p className="text-sm text-gray-800 mt-1">{payment.notes}</p>
                        </div>
                      )}

                      {payment.status === 'paid' && payment.paidAt && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              Pago em {new Date(payment.paidAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {payment.paymentMethod && (
                            <p className="text-sm text-green-700 mt-1">
                              Método: {payment.paymentMethod.toUpperCase()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPaymentForDetails(payment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={!!selectedPaymentForDetails} onOpenChange={() => setSelectedPaymentForDetails(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
            <DialogDescription>
              Informações completas sobre este pagamento
            </DialogDescription>
          </DialogHeader>
          {selectedPaymentForDetails && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Pedido</Label>
                  <p className="font-semibold">
                    {selectedPaymentForDetails.order?.orderNumber || selectedPaymentForDetails.productionOrder?.orderNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedPaymentForDetails.status)}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Valor do Pagamento</Label>
                <p className="text-2xl font-bold text-green-600">
                  R$ {parseFloat(selectedPaymentForDetails.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {selectedPaymentForDetails.productionOrder && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Produto/Serviço</Label>
                  <p className="font-medium">{selectedPaymentForDetails.productionOrder.product}</p>
                </div>
              )}

              {selectedPaymentForDetails.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Observações</Label>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedPaymentForDetails.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-500">Data de Criação</Label>
                  <p className="font-medium">
                    {selectedPaymentForDetails.createdAt ? new Date(selectedPaymentForDetails.createdAt).toLocaleString('pt-BR') : 'N/A'}
                  </p>
                </div>
                {selectedPaymentForDetails.paidAt && (
                  <div>
                    <Label className="text-gray-500">Data do Pagamento</Label>
                    <p className="font-medium text-green-600">
                      {new Date(selectedPaymentForDetails.paidAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>

              {selectedPaymentForDetails.status === 'paid' && selectedPaymentForDetails.paymentMethod && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Pagamento Confirmado</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Método: {selectedPaymentForDetails.paymentMethod.toUpperCase()}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}