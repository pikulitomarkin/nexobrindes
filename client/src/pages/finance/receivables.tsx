import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, DollarSign, TrendingUp, Clock, AlertCircle, Plus, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function FinanceReceivables() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const { toast } = useToast();

  const { data: receivables, isLoading } = useQuery({
    queryKey: ["/api/finance/receivables"],
  });

  const { data: payments } = useQuery({
    queryKey: ["/api/payments"],
  });

  const allocatePaymentMutation = useMutation({
    mutationFn: async ({ receivableId, paymentId, amount }: any) => {
      const response = await fetch(`/api/finance/receivables/${receivableId}/allocate-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, amount }),
      });
      if (!response.ok) throw new Error("Erro ao alocar pagamento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/receivables"] });
      setIsPaymentDialogOpen(false);
      setSelectedReceivable(null);
      setPaymentAmount("");
      toast({
        title: "Sucesso!",
        description: "Pagamento alocado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível alocar o pagamento",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      open: { label: "Em Aberto", variant: "secondary" as const },
      partial: { label: "Parcial", variant: "outline" as const },
      paid: { label: "Pago", variant: "default" as const },
      overdue: { label: "Vencido", variant: "destructive" as const },
      cancelled: { label: "Cancelado", variant: "secondary" as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.open;
    
    return (
      <Badge variant={statusInfo.variant} className="capitalize">
        {statusInfo.label}
      </Badge>
    );
  };

  const filteredReceivables = receivables?.filter((receivable: any) => {
    const matchesStatus = statusFilter === "all" || receivable.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      receivable.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receivable.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleAllocatePayment = () => {
    if (selectedReceivable && paymentAmount) {
      // For demo, using first available payment
      const payment = payments?.[0];
      if (payment) {
        allocatePaymentMutation.mutate({
          receivableId: selectedReceivable.id,
          paymentId: payment.id,
          amount: paymentAmount
        });
      }
    }
  };

  const totalReceivables = receivables?.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0) || 0;
  const totalReceived = receivables?.reduce((sum: number, r: any) => sum + parseFloat(r.receivedAmount), 0) || 0;
  const overdue = receivables?.filter((r: any) => r.status === 'overdue').length || 0;

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-page-title">Contas a Receber</h1>
        <p className="text-gray-600">Controle de valores a receber dos clientes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total a Receber</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-total-receivables">
                  R$ {totalReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-2xl font-bold gradient-text" data-testid="text-total-received">
                  R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Aberto</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-open-amount">
                  R$ {(totalReceivables - totalReceived).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-sm font-medium text-gray-600">Vencidos</p>
                <p className="text-2xl font-bold gradient-text" data-testid="text-overdue-count">
                  {overdue}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
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
                  placeholder="Buscar por pedido ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="open">Em Aberto</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receivables Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber ({filteredReceivables?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recebido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
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
                {filteredReceivables?.map((receivable: any) => (
                  <tr key={receivable.id} data-testid={`row-receivable-${receivable.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(receivable.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {receivable.orderId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receivable.clientName || receivable.clientId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {parseFloat(receivable.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {parseFloat(receivable.receivedAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      R$ {(parseFloat(receivable.amount) - parseFloat(receivable.receivedAmount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(receivable.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" data-testid={`button-view-${receivable.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {receivable.status !== 'paid' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedReceivable(receivable);
                              setIsPaymentDialogOpen(true);
                            }}
                            data-testid={`button-allocate-${receivable.id}`}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Alocar
                          </Button>
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

      {/* Payment Allocation Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alocar Pagamento</DialogTitle>
            <DialogDescription>
              Aloque um pagamento para esta conta a receber
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReceivable && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">Pedido: {selectedReceivable.orderId}</p>
                <p className="text-sm text-gray-600">
                  Saldo: R$ {(parseFloat(selectedReceivable.amount) - parseFloat(selectedReceivable.receivedAmount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="payment-amount">Valor do Pagamento</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                data-testid="input-payment-amount"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="gradient-bg text-white"
                onClick={handleAllocatePayment}
                disabled={!paymentAmount || allocatePaymentMutation.isPending}
                data-testid="button-confirm-allocation"
              >
                {allocatePaymentMutation.isPending ? "Alocando..." : "Alocar Pagamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}