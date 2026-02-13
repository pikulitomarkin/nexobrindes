import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Eye,
  Search,
  AlertTriangle,
  Clock,
  Package,
  User,
  DollarSign,
} from "lucide-react";

export default function AdminBudgetApprovals() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [budgetToReject, setBudgetToReject] = useState<any>(null);

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["/api/budgets/awaiting-approval"],
  });

  const approveMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      return apiRequest("POST", `/api/budgets/${budgetId}/admin-approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/awaiting-approval"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({
        title: "Orçamento Autorizado",
        description: "O orçamento foi autorizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao autorizar orçamento.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ budgetId, reason }: { budgetId: string; reason: string }) => {
      return apiRequest("POST", `/api/budgets/${budgetId}/admin-reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/awaiting-approval"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      setRejectDialogOpen(false);
      setRejectReason("");
      setBudgetToReject(null);
      toast({
        title: "Orçamento Não Autorizado",
        description: "O orçamento foi devolvido ao vendedor.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao rejeitar orçamento.",
        variant: "destructive",
      });
    },
  });

  const handleRejectClick = (budget: any) => {
    setBudgetToReject(budget);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (budgetToReject) {
      rejectMutation.mutate({ budgetId: budgetToReject.id, reason: rejectReason });
    }
  };

  const filteredBudgets = (budgets as any[]).filter((budget: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      budget.budgetNumber?.toLowerCase().includes(term) ||
      budget.title?.toLowerCase().includes(term) ||
      budget.contactName?.toLowerCase().includes(term) ||
      budget.vendorName?.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Orçamentos Para Autorização
          </h1>
          <p className="text-gray-500 mt-1">
            Orçamentos com desconto abaixo do preço mínimo que precisam de autorização
          </p>
        </div>
        <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-semibold">
          {filteredBudgets.length} pendente{filteredBudgets.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por número, título, cliente ou vendedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredBudgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              Nenhum orçamento pendente
            </h3>
            <p className="text-gray-500 mt-1">
              Todos os orçamentos estão dentro dos limites de preço mínimo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBudgets.map((budget: any) => (
            <Card key={budget.id} className="border-l-4 border-l-orange-400 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-gray-500">
                        #{budget.budgetNumber}
                      </span>
                      <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Aguardando Autorização
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {budget.title}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        <span>Vendedor: {budget.vendorName || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        <span>Cliente: {budget.contactName || budget.clientName || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4" />
                        <span>Valor: {formatCurrency(budget.totalValue || budget.valor || 0)}</span>
                      </div>
                    </div>
                    {budget.items && budget.items.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                        <Package className="h-4 w-4" />
                        <span>{budget.items.length} produto{budget.items.length !== 1 ? "s" : ""}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      Criado em: {formatDate(budget.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBudget(budget);
                        setDetailsOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => approveMutation.mutate(budget.id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Autorizar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectClick(budget)}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Não Autorizar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Detalhes do Orçamento #{selectedBudget?.budgetNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedBudget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Título</label>
                  <p className="text-gray-900">{selectedBudget.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Vendedor</label>
                  <p className="text-gray-900">{selectedBudget.vendorName || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Cliente</label>
                  <p className="text-gray-900">{selectedBudget.contactName || selectedBudget.clientName || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Valor Total</label>
                  <p className="text-gray-900 font-semibold">{formatCurrency(selectedBudget.totalValue || selectedBudget.valor || 0)}</p>
                </div>
              </div>

              {selectedBudget.items && selectedBudget.items.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">
                    Itens do Orçamento
                  </label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3">Produto</th>
                          <th className="text-right p-3">Qtd</th>
                          <th className="text-right p-3">Preço Unit.</th>
                          <th className="text-right p-3">Preço Mín.</th>
                          <th className="text-right p-3">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBudget.items.map((item: any, idx: number) => {
                          const isBelowMin = item.minimumPrice > 0 && parseFloat(item.unitPrice) < parseFloat(item.minimumPrice);
                          return (
                            <tr key={idx} className={`border-t ${isBelowMin ? "bg-red-50" : ""}`}>
                              <td className="p-3">
                                {item.productName}
                                {isBelowMin && (
                                  <span className="ml-2 text-xs text-red-600 font-medium">
                                    Abaixo do mínimo
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">{item.quantity}</td>
                              <td className={`p-3 text-right ${isBelowMin ? "text-red-600 font-semibold" : ""}`}>
                                {formatCurrency(item.unitPrice)}
                              </td>
                              <td className="p-3 text-right text-gray-500">
                                {item.minimumPrice ? formatCurrency(item.minimumPrice) : "-"}
                              </td>
                              <td className="p-3 text-right">{formatCurrency(item.totalPrice)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedBudget.observations && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Observações</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedBudget.observations}</p>
                </div>
              )}

              <DialogFooter>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    approveMutation.mutate(selectedBudget.id);
                    setDetailsOpen(false);
                  }}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Autorizar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailsOpen(false);
                    handleRejectClick(selectedBudget);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Não Autorizar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Não Autorizar Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              O orçamento será devolvido ao vendedor para ajuste.
              {budgetToReject && (
                <span className="block mt-1 font-medium">
                  Orçamento: #{budgetToReject.budgetNumber} - {budgetToReject.title}
                </span>
              )}
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Motivo (opcional)
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Informe o motivo da não autorização..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
