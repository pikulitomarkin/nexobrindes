import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, DollarSign, User, ShoppingCart, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Estorno {
  id: string;
  beneficiary: string;
  clientName: string;
  description: string;
  amount: string;
  dueDate: string;
  status: string;
  orderId: string | null;
  orderNumber: string | null;
  clientId: string | null;
  notes: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
}

export default function FinanceEstornos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [selectedEstorno, setSelectedEstorno] = useState<Estorno | null>(null);
  const [processData, setProcessData] = useState({
    paymentMethod: "pix",
    notes: "",
    transactionId: "",
  });
  const { toast } = useToast();

  const { data: estornos = [], isLoading, refetch } = useQuery<Estorno[]>({
    queryKey: ["/api/finance/estornos"],
  });

  const processEstornoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof processData }) => {
      const response = await fetch(`/api/finance/estornos/${id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao processar estorno");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/estornos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/payables/manual"] });
      setIsProcessDialogOpen(false);
      setSelectedEstorno(null);
      setProcessData({ paymentMethod: "pix", notes: "", transactionId: "" });
      toast({
        title: "Estorno processado",
        description: "O estorno foi processado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao processar estorno.",
        variant: "destructive",
      });
    },
  });

  const filteredEstornos = estornos.filter((estorno) => {
    const matchesSearch =
      estorno.beneficiary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estorno.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estorno.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estorno.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || estorno.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingEstornos = estornos.filter((e) => e.status === "pending");
  const processedEstornos = estornos.filter((e) => e.status === "refunded" || e.status === "paid");
  const totalPending = pendingEstornos.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  const totalProcessed = processedEstornos.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case "refunded":
      case "paid":
        return <Badge variant="outline" className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" /> Estornado</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const handleProcessEstorno = (estorno: Estorno) => {
    setSelectedEstorno(estorno);
    setProcessData({ paymentMethod: "pix", notes: "", transactionId: "" });
    setIsProcessDialogOpen(true);
  };

  const handleConfirmProcess = () => {
    if (selectedEstorno) {
      processEstornoMutation.mutate({ id: selectedEstorno.id, data: processData });
    }
  };

  if (isLoading) {
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estornos</h1>
          <p className="text-gray-600">Gerencie os estornos de pedidos cancelados</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Estornos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-yellow-600">{pendingEstornos.length}</div>
              <div className="text-lg font-semibold text-yellow-600">{formatCurrency(totalPending)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Estornos Processados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">{processedEstornos.length}</div>
              <div className="text-lg font-semibold text-green-600">{formatCurrency(totalProcessed)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total de Estornos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-gray-900">{estornos.length}</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(totalPending + totalProcessed)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Lista de Estornos
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por cliente, pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="refunded">Estornados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEstornos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Nenhum estorno encontrado
                    </td>
                  </tr>
                ) : (
                  filteredEstornos.map((estorno) => (
                    <tr key={estorno.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{estorno.clientName || estorno.beneficiary}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {estorno.orderNumber ? (
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-gray-400" />
                            <span className="text-blue-600 font-mono text-sm">{estorno.orderNumber}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{estorno.description}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600">{formatCurrency(estorno.amount)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{formatDate(estorno.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(estorno.status)}</td>
                      <td className="px-4 py-3">
                        {estorno.status === "pending" ? (
                          <Button
                            size="sm"
                            onClick={() => handleProcessEstorno(estorno)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Estornar
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-500">
                            {estorno.paidAt ? `Processado em ${formatDate(estorno.paidAt)}` : "Processado"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processar Estorno</DialogTitle>
          </DialogHeader>
          {selectedEstorno && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500 text-sm">Cliente</Label>
                    <p className="font-medium">{selectedEstorno.clientName || selectedEstorno.beneficiary}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Valor do Estorno</Label>
                    <p className="font-bold text-green-600 text-lg">{formatCurrency(selectedEstorno.amount)}</p>
                  </div>
                  {selectedEstorno.orderNumber && (
                    <div>
                      <Label className="text-gray-500 text-sm">Pedido</Label>
                      <p className="font-mono text-blue-600">{selectedEstorno.orderNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Método de Pagamento</Label>
                  <Select
                    value={processData.paymentMethod}
                    onValueChange={(value) => setProcessData({ ...processData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transfer">Transferência Bancária</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>ID da Transação (opcional)</Label>
                  <Input
                    placeholder="Ex: PIX123456789"
                    value={processData.transactionId}
                    onChange={(e) => setProcessData({ ...processData, transactionId: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Observações sobre o estorno..."
                    value={processData.notes}
                    onChange={(e) => setProcessData({ ...processData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmProcess}
              disabled={processEstornoMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {processEstornoMutation.isPending ? "Processando..." : "Confirmar Estorno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
