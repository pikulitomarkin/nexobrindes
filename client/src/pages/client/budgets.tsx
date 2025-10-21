import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Eye, MessageSquare, Package, Phone, Mail, Clock, CheckCircle, X, FileText, Check } from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ClientBudgets() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const clientId = currentUser.id; // Use clientId for queryKey
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [viewBudgetDialogOpen, setViewBudgetDialogOpen] = useState(false); // State to control budget details modal
  const [clientObservations, setClientObservations] = useState('');
  const { toast } = useToast();

  const approveBudgetMutation = useMutation({
    mutationFn: async ({ budgetId, status, observations }: { budgetId: string, status: string, observations: string }) => {
      const response = await fetch(`/api/budgets/${budgetId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, observations }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar orçamento');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/client", clientId] });
      setViewBudgetDialogOpen(false);
      setClientObservations('');
      setBudgetToView(null);
      toast({
        title: "Sucesso!",
        description: variables.status === 'approved' ? 
          "Orçamento aprovado com sucesso!" : 
          "Orçamento rejeitado.",
        variant: variables.status === 'approved' ? "default" : "destructive"
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o orçamento",
        variant: "destructive"
      });
    }
  });

  // Handlers
  const handleViewDetails = (budget: any) => {
    setSelectedBudget(budget);
    setViewBudgetDialogOpen(true); // Use the state for the dialog
  };

  // Buscar orçamentos do cliente
  const { data: budgets, isLoading: budgetsLoading, refetch: refetchBudgets } = useQuery({
    queryKey: ["/api/budgets/client", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/budgets/client/${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client budgets');
      return response.json();
    },
    enabled: !!clientId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Buscar solicitações de orçamento
  const { data: quoteRequests, isLoading: requestsLoading, refetch: refetchQuoteRequests } = useQuery({
    queryKey: ["/api/quote-requests/client", clientId],
    queryFn: async () => {
      try {
        console.log(`Fetching quote requests for client: ${clientId}`);
        const response = await fetch(`/api/quote-requests/client/${clientId}`);
        if (!response.ok) {
          console.error('Failed to fetch quote requests:', response.status, response.statusText);
          if (response.status === 404) {
            return [];
          }
          throw new Error(`Failed to fetch quote requests: ${response.status}`);
        }
        const data = await response.json();
        console.log('Quote requests fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching quote requests:', error);
        return []; // Retornar array vazio em caso de erro
      }
    },
    enabled: !!clientId,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    retry: 1, // Reduzir retry para evitar spam
  });

  const getStatusBadge = (status: string, type: 'budget' | 'request') => {
    if (type === 'request') {
      const requestStatusClasses = {
        pending: "bg-yellow-100 text-yellow-800",
        reviewing: "bg-blue-100 text-blue-800",
        quoted: "bg-green-100 text-green-800",
        rejected: "bg-red-100 text-red-800",
      };

      const requestStatusLabels = {
        pending: "Pendente",
        reviewing: "Em Análise",
        quoted: "Orçado",
        rejected: "Rejeitado",
      };

      return (
        <Badge className={`${requestStatusClasses[status as keyof typeof requestStatusClasses] || "bg-gray-100 text-gray-800"} border-0`}>
          {requestStatusLabels[status as keyof typeof requestStatusLabels] || status}
        </Badge>
      );
    }

    const budgetStatusClasses = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      converted: "bg-purple-100 text-purple-800",
    };

    const budgetStatusLabels = {
      draft: "Rascunho",
      sent: "Enviado para Análise",
      approved: "Aprovado",
      rejected: "Rejeitado",
      converted: "Convertido em Pedido",
    };

    return (
      <Badge className={`${budgetStatusClasses[status as keyof typeof budgetStatusClasses] || "bg-gray-100 text-gray-800"} border-0`}>
        {budgetStatusLabels[status as keyof typeof budgetStatusLabels] || status}
      </Badge>
    );
  };

  if (budgetsLoading || requestsLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
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
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Meus Orçamentos</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchBudgets();
              refetchQuoteRequests();
            }}
            disabled={budgetsLoading || requestsLoading}
          >
            {budgetsLoading || requestsLoading ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
        <p className="text-gray-600">Acompanhe suas solicitações de orçamento e propostas recebidas</p>
      </div>

      {/* Solicitações de Orçamento Enviadas */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Solicitações Enviadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Carregando solicitações...</p>
            </div>
          ) : quoteRequests && quoteRequests.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Encontradas {quoteRequests.length} solicitações de orçamento
              </p>
              {quoteRequests.map((request: any) => (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {request.productSummary || request.productName || 'Solicitação de Orçamento'}
                      </h3>
                      {request.totalProducts > 1 && (
                        <p className="text-sm text-blue-600 mt-1">
                          {request.totalProducts} produtos solicitados
                        </p>
                      )}
                      {request.totalEstimatedValue > 0 && (
                        <p className="text-sm text-green-600 font-medium mt-1">
                          Valor estimado: R$ {parseFloat(request.totalEstimatedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span>Qtd: {request.quantity}</span>
                      </div>
                    </div>
                    {getStatusBadge(request.status, 'request')}
                  </div>

                  {request.observations && (
                    <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                      <strong>Observações:</strong> {request.observations}
                    </p>
                  )}

                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Vendedor: {request.vendorName || 'Não informado'}</span>
                    {request.status === 'quoted' && (
                      <span className="text-green-600 font-medium">
                        ✓ Orçamento enviado pelo vendedor
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma solicitação de orçamento enviada</p>
              <p className="text-sm text-gray-400 mt-2">
                Vá para o catálogo de produtos para solicitar orçamentos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orçamentos Recebidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Orçamentos Recebidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {budgets && budgets.length > 0 ? (
            <div className="space-y-6">
              {budgets.map((budget: any) => (
                <Card key={budget.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl text-gray-900 mb-2">
                          {budget.title}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Criado em: {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          {budget.validUntil && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Válido até: {new Date(budget.validUntil).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(budget.status, 'budget')}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                        <p className="text-2xl font-bold text-green-600">
                          R$ {parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Vendedor</p>
                        <p className="font-medium text-gray-900">
                          {budget.vendorName || 'Não informado'}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Prazo de Entrega</p>
                        <p className="font-medium text-gray-900">
                          {budget.deliveryDeadline ?
                            new Date(budget.deliveryDeadline).toLocaleDateString('pt-BR') :
                            'A definir'
                          }
                        </p>
                      </div>
                    </div>

                    {budget.description && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Descrição</p>
                        <p className="text-gray-900">{budget.description}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="flex space-x-2">
                        {budget.status === 'sent' && (
                          <>
                            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white" onClick={() => handleViewDetails(budget)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Detalhes
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleViewDetails(budget)}>
                              <X className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </>
                        )}

                        {budget.status === 'approved' && (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">Orçamento aprovado</span>
                          </div>
                        )}

                        {budget.status === 'converted' && (
                          <div className="flex items-center text-purple-600">
                            <Package className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">Convertido em pedido</span>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(budget)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum orçamento recebido</p>
              <p className="text-sm text-gray-400 mt-2">
                Os orçamentos enviados pelo seu vendedor aparecerão aqui
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Orçamento */}
      <Dialog open={viewBudgetDialogOpen} onOpenChange={setViewBudgetDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Orçamento - {selectedBudget?.title}</DialogTitle>
            <DialogDescription>
              Revise os detalhes do orçamento e aprove ou rejeite
            </DialogDescription>
          </DialogHeader>
          {selectedBudget && (
            <div className="space-y-6">
              {/* Budget Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Título</Label>
                  <p className="font-medium">{selectedBudget.title}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <span className={`status-badge ${
                    selectedBudget.status === 'sent' ? 'status-confirmed' : 
                    selectedBudget.status === 'approved' ? 'status-production' : 
                    selectedBudget.status === 'rejected' ? 'status-cancelled' : 
                    'status-pending'
                  }`}>
                    {selectedBudget.status === 'sent' ? 'Enviado' : 
                     selectedBudget.status === 'approved' ? 'Aprovado' : 
                     selectedBudget.status === 'rejected' ? 'Rejeitado' : 
                     selectedBudget.status}
                  </span>
                </div>
                <div>
                  <Label>Válido Até</Label>
                  <p>{selectedBudget.validUntil ? new Date(selectedBudget.validUntil).toLocaleDateString('pt-BR') : 'Não definido'}</p>
                </div>
                <div>
                  <Label>Prazo de Entrega</Label>
                  <p>{selectedBudget.deliveryDeadline ? new Date(selectedBudget.deliveryDeadline).toLocaleDateString('pt-BR') : 'Não definido'}</p>
                </div>
              </div>

              {/* Budget Items */}
              {selectedBudget.items && selectedBudget.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Produtos</h3>
                  <div className="space-y-3">
                    {selectedBudget.items.map((item: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{item.productName}</h4>
                            <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                            <p className="text-sm text-gray-600">
                              Preço unitário: R$ {parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            {item.hasItemCustomization && (
                              <p className="text-sm text-blue-600">
                                Personalização: {item.itemCustomizationDescription} 
                                (+R$ {parseFloat(item.itemCustomizationValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              R$ {parseFloat(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Photos */}
              {selectedBudget.photos && selectedBudget.photos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Fotos</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedBudget.photos.map((photo: string, index: number) => (
                      <img 
                        key={index}
                        src={photo} 
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="gradient-text">
                    R$ {parseFloat(selectedBudget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Approval Actions - Only show if budget status is 'sent' */}
              {selectedBudget.status === 'sent' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold">Aprovação do Orçamento</h3>
                  <div>
                    <Label htmlFor="client-observations">Observações (opcional)</Label>
                    <Textarea
                      id="client-observations"
                      placeholder="Deixe suas observações sobre o orçamento..."
                      value={clientObservations}
                      onChange={(e) => setClientObservations(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => approveBudgetMutation.mutate({ 
                        budgetId: selectedBudget.id, 
                        status: 'approved',
                        observations: clientObservations 
                      })}
                      disabled={approveBudgetMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Aprovar Orçamento
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => approveBudgetMutation.mutate({ 
                        budgetId: selectedBudget.id, 
                        status: 'rejected',
                        observations: clientObservations 
                      })}
                      disabled={approveBudgetMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Rejeitar Orçamento
                    </Button>
                  </div>
                </div>
              )}

              {/* Show client observations if budget was reviewed */}
              {selectedBudget.clientObservations && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Label className="font-medium">Observações do Cliente:</Label>
                  <p className="mt-1">{selectedBudget.clientObservations}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}