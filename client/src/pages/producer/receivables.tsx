
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, DollarSign, Clock, CheckCircle, Package, Calendar } from "lucide-react";

export default function ProducerReceivables() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const totalPending = producerPayments
    .filter((p: any) => p.status === 'pending' || p.status === 'approved')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

  const totalReceived = producerPayments
    .filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

  const pendingCount = producerPayments.filter((p: any) => p.status === 'pending').length;
  const approvedCount = producerPayments.filter((p: any) => p.status === 'approved').length;

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                        Produto: {payment.productionOrder?.product || payment.order?.product || 'N/A'}
                      </p>
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
                    <Button variant="outline" size="sm">
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
    </div>
  );
}
