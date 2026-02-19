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
import { Separator } from "@/components/ui/separator";
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
  Truck,
  CreditCard,
  Calendar,
  MapPin,
  Phone,
  Mail,
  FileText,
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-orange-500" />
              Orçamento #{selectedBudget?.budgetNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedBudget && (() => {
            const subtotal = selectedBudget.items?.reduce((sum: number, item: any) => sum + parseFloat(item.totalPrice || 0), 0) || 0;
            const shippingCost = parseFloat(selectedBudget.shippingCost || 0);
            const downPayment = parseFloat(selectedBudget.downPayment || 0);
            const remainingAmount = parseFloat(selectedBudget.remainingAmount || 0);
            const totalValue = parseFloat(selectedBudget.totalValue || 0);
            const hasDiscount = selectedBudget.hasDiscount;
            const discountPercentage = parseFloat(selectedBudget.discountPercentage || 0);
            const discountValue = parseFloat(selectedBudget.discountValue || 0);
            const discountAmount = selectedBudget.discountType === 'percentage' ? (subtotal * discountPercentage / 100) : discountValue;

            return (
              <div className="space-y-5">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800 font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Este orçamento possui produtos com preço abaixo do mínimo permitido e necessita de autorização para prosseguir.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Título</label>
                    <p className="text-gray-900 font-semibold">{selectedBudget.title}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</label>
                    <p className="text-gray-900">{selectedBudget.vendorName || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Data</label>
                    <p className="text-gray-900">{formatDate(selectedBudget.createdAt)}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dados do Cliente
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3">
                    <div>
                      <label className="text-xs text-gray-500">Nome</label>
                      <p className="text-sm font-medium">{selectedBudget.contactName || selectedBudget.clientName || "N/A"}</p>
                    </div>
                    {selectedBudget.contactPhone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <div>
                          <label className="text-xs text-gray-500">Telefone</label>
                          <p className="text-sm">{selectedBudget.contactPhone}</p>
                        </div>
                      </div>
                    )}
                    {selectedBudget.contactEmail && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <div>
                          <label className="text-xs text-gray-500">E-mail</label>
                          <p className="text-sm">{selectedBudget.contactEmail}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Itens do Orçamento ({selectedBudget.items?.length || 0} produto{(selectedBudget.items?.length || 0) !== 1 ? "s" : ""})
                  </h4>
                  {selectedBudget.items && selectedBudget.items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left p-3 font-semibold">Produto</th>
                            <th className="text-right p-3 font-semibold">Qtd</th>
                            <th className="text-right p-3 font-semibold">Custo</th>
                            <th className="text-right p-3 font-semibold">Preço Mín.</th>
                            <th className="text-right p-3 font-semibold">Preço Unit.</th>
                            <th className="text-right p-3 font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBudget.items.map((item: any, idx: number) => {
                            const unitPrice = parseFloat(item.unitPrice);
                            const minPrice = parseFloat(item.minimumPrice || 0);
                            const costPrice = parseFloat(item.costPrice || 0);
                            const isBelowMin = minPrice > 0 && unitPrice < minPrice;
                            const diffPercent = minPrice > 0 ? ((unitPrice - minPrice) / minPrice * 100).toFixed(1) : null;
                            return (
                              <tr key={idx} className={`border-t ${isBelowMin ? "bg-red-50" : ""}`}>
                                <td className="p-3">
                                  <span className="font-medium">{item.productName}</span>
                                  {isBelowMin && (
                                    <span className="block text-xs text-red-600 font-semibold mt-0.5">
                                      {diffPercent}% abaixo do mínimo
                                    </span>
                                  )}
                                  {item.hasItemCustomization && (
                                    <span className="block text-xs text-blue-600 mt-0.5">
                                      + Personalização: {formatCurrency(item.itemCustomizationValue)}
                                    </span>
                                  )}
                                  {item.hasGeneralCustomization && (
                                    <span className="block text-xs text-blue-600 mt-0.5">
                                      + {item.generalCustomizationName}: {formatCurrency(item.generalCustomizationValue)}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right">{parseFloat(item.quantity).toLocaleString('pt-BR')}</td>
                                <td className="p-3 text-right text-gray-500">{costPrice > 0 ? formatCurrency(costPrice) : "-"}</td>
                                <td className="p-3 text-right text-gray-500 font-medium">{minPrice > 0 ? formatCurrency(minPrice) : "-"}</td>
                                <td className={`p-3 text-right font-semibold ${isBelowMin ? "text-red-600" : "text-gray-900"}`}>
                                  {formatCurrency(unitPrice)}
                                </td>
                                <td className="p-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Entrega e Frete
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tipo de Entrega:</span>
                        <span className="font-medium">{selectedBudget.deliveryType === 'pickup' ? 'Retirada' : selectedBudget.deliveryType === 'delivery' ? 'Entrega' : selectedBudget.deliveryType}</span>
                      </div>
                      {selectedBudget.shippingMethodName && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Método de Frete:</span>
                          <span className="font-medium">{selectedBudget.shippingMethodName}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Valor do Frete:</span>
                        <span className="font-medium">{formatCurrency(shippingCost)}</span>
                      </div>
                      {selectedBudget.deliveryDeadline && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Prazo de Entrega:</span>
                          <span className="font-medium">{formatDate(selectedBudget.deliveryDeadline)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Pagamento
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                      {selectedBudget.paymentMethodName && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Forma de Pagamento:</span>
                          <span className="font-medium">{selectedBudget.paymentMethodName}</span>
                        </div>
                      )}
                      {selectedBudget.installments > 1 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Parcelas:</span>
                          <span className="font-medium">{selectedBudget.installments}x</span>
                        </div>
                      )}
                      {downPayment > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Entrada:</span>
                          <span className="font-medium text-green-700">{formatCurrency(downPayment)}</span>
                        </div>
                      )}
                      {remainingAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Restante:</span>
                          <span className="font-medium">{formatCurrency(remainingAmount)}</span>
                        </div>
                      )}
                      {selectedBudget.validUntil && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Válido até:</span>
                          <span className="font-medium">{formatDate(selectedBudget.validUntil)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="bg-gray-100 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Resumo Financeiro
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal dos Produtos:</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {hasDiscount && discountAmount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Desconto ({selectedBudget.discountType === 'percentage' ? `${discountPercentage}%` : 'valor fixo'}):</span>
                        <span className="font-medium">- {formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {shippingCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Frete:</span>
                        <span className="font-medium">{formatCurrency(shippingCost)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Valor Total:</span>
                      <span className="text-green-700">{formatCurrency(totalValue)}</span>
                    </div>
                  </div>
                </div>

                {selectedBudget.description && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Observações</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1">{selectedBudget.description}</p>
                  </div>
                )}

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      approveMutation.mutate(selectedBudget.id);
                      setDetailsOpen(false);
                    }}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Autorizar Orçamento
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
            );
          })()}
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
