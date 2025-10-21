
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Eye, MessageSquare, Package, Phone, Mail, Clock, CheckCircle, X, FileText } from "lucide-react";
import { useState } from "react";

export default function ClientBudgets() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Buscar orçamentos do cliente
  const { data: budgets, isLoading: budgetsLoading, refetch: refetchBudgets } = useQuery({
    queryKey: ["/api/budgets/client", currentUser.id],
    queryFn: async () => {
      const response = await fetch(`/api/budgets/client/${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to fetch client budgets');
      return response.json();
    },
    enabled: !!currentUser.id,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the page
  });

  // Buscar solicitações de orçamento
  const { data: quoteRequests, isLoading: requestsLoading, refetch: refetchQuoteRequests } = useQuery({
    queryKey: ["/api/quote-requests/client", currentUser.id],
    queryFn: async () => {
      const response = await fetch(`/api/quote-requests/client/${currentUser.id}`);
      if (!response.ok) {
        console.error('Failed to fetch quote requests:', response.status, response.statusText);
        throw new Error('Failed to fetch quote requests');
      }
      const data = await response.json();
      console.log('Quote requests fetched:', data);
      return data;
    },
    enabled: !!currentUser.id,
    refetchInterval: 10000, // Refetch every 10 seconds (more frequent)
    refetchOnWindowFocus: true, // Refetch when user returns to the page
    retry: 3, // Retry failed requests
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

  const handleViewDetails = (budget: any) => {
    setSelectedBudget(budget);
    setShowDetailsModal(true);
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
                      <h3 className="font-semibold text-gray-900">{request.productName}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
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
                            <Button size="sm" className="gradient-bg text-white">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar Orçamento
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
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
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Orçamento</DialogTitle>
            <DialogDescription>
              Informações completas do orçamento
            </DialogDescription>
          </DialogHeader>
          {selectedBudget && (
            <div className="space-y-6">
              {/* Cabeçalho do Orçamento */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{selectedBudget.title}</h3>
                  <p className="text-sm text-gray-600">
                    Orçamento: {selectedBudget.budgetNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    Criado em: {new Date(selectedBudget.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  {getStatusBadge(selectedBudget.status, 'budget')}
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-green-600">
                      R$ {parseFloat(selectedBudget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              {selectedBudget.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Descrição</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedBudget.description}
                  </p>
                </div>
              )}

              {/* Itens do Orçamento */}
              {selectedBudget.items && selectedBudget.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Itens do Orçamento</h4>
                  <div className="space-y-3">
                    {selectedBudget.items.map((item: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="grid grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Produto</p>
                            <p className="font-semibold">{item.productName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Quantidade</p>
                            <p>{item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Preço Unitário</p>
                            <p>R$ {parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Subtotal</p>
                            <p className="font-semibold">
                              R$ {parseFloat(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        {item.hasItemCustomization && (
                          <div className="bg-blue-50 p-3 rounded mt-3">
                            <p className="text-sm font-medium text-blue-800 mb-1">Personalização Incluída</p>
                            <p className="text-sm text-blue-700">
                              {item.itemCustomizationDescription}
                            </p>
                            {parseFloat(item.itemCustomizationValue) > 0 && (
                              <p className="text-sm font-medium text-blue-800 mt-1">
                                Valor adicional: R$ {parseFloat(item.itemCustomizationValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informações de Entrega e Pagamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Informações de Entrega</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Tipo:</strong> {selectedBudget.deliveryType === 'pickup' ? 'Retirada no Local' : 'Entrega'}</p>
                    {selectedBudget.deliveryDeadline && (
                      <p><strong>Prazo:</strong> {new Date(selectedBudget.deliveryDeadline).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Vendedor</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nome:</strong> {selectedBudget.vendorName || 'Não informado'}</p>
                    {selectedBudget.contactPhone && (
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedBudget.contactPhone}
                      </p>
                    )}
                    {selectedBudget.contactEmail && (
                      <p className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedBudget.contactEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedBudget.validUntil && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Validade:</strong> Este orçamento é válido até {new Date(selectedBudget.validUntil).toLocaleDateString('pt-BR')}
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
