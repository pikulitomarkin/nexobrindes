
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Calendar, DollarSign, Eye, Phone, Mail, Package, User, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function ClientBudgets() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const clientId = currentUser.id;
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [viewBudgetDialogOpen, setViewBudgetDialogOpen] = useState(false);

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["/api/budgets/client", clientId],
    queryFn: async () => {
      const response = await fetch(`/api/budgets/client/${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client budgets');
      return response.json();
    },
    enabled: !!clientId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      sent: "bg-blue-100 text-blue-800", 
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      converted: "bg-purple-100 text-purple-800",
    };

    const statusLabels = {
      pending: "Aguardando",
      sent: "Enviado",
      approved: "Aprovado",
      rejected: "Rejeitado", 
      converted: "Convertido em Pedido",
    };

    return (
      <Badge className={`${statusClasses[status as keyof typeof statusClasses]} border-0`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'sent': return <CheckCircle className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      case 'converted': return <Package className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleViewBudget = (budget: any) => {
    setSelectedBudget(budget);
    setViewBudgetDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Orçamentos</h1>
        <p className="text-gray-600">Acompanhe suas solicitações de orçamento e respostas dos vendedores</p>
      </div>

      <div className="space-y-6">
        {budgets?.map((budget: any) => (
          <Card key={budget.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-xl text-gray-900 mb-2 flex items-center gap-2">
                    {getStatusIcon(budget.status)}
                    {budget.title || `Orçamento #${budget.id.slice(0, 8)}`}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Solicitado em: {budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Vendedor: {budget.vendorName || 'Não atribuído'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(budget.status)}
                  <div className="mt-2">
                    <Button size="sm" onClick={() => handleViewBudget(budget)} className="gradient-bg text-white">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Descrição</p>
                  <p className="font-medium text-gray-900">{budget.description || 'Sem descrição'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                  <p className="font-medium text-green-600 text-lg">
                    {budget.totalValue ? `R$ ${parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Aguardando orçamento'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Válido até</p>
                  <p className="font-medium text-gray-900">
                    {budget.validUntil ? new Date(budget.validUntil).toLocaleDateString('pt-BR') : 'Não especificado'}
                  </p>
                </div>
              </div>

              {/* Items Preview */}
              {budget.items && budget.items.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Itens do Orçamento:</p>
                  <div className="space-y-2">
                    {budget.items.slice(0, 3).map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium">{item.productName || 'Produto'}</span>
                        <div className="text-right">
                          <span className="text-gray-600">Qtd: {item.quantity}</span>
                          {item.unitPrice && (
                            <span className="ml-2 text-green-600 font-medium">
                              R$ {parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {budget.items.length > 3 && (
                      <div className="text-sm text-gray-500 text-center py-1">
                        + {budget.items.length - 3} item(s) adicional(is)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Information */}
              {budget.status === 'sent' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center text-sm text-blue-800">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="font-medium">Orçamento enviado pelo vendedor</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">Aguardando sua aprovação</p>
                </div>
              )}

              {budget.status === 'converted' && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center text-sm text-purple-800">
                    <Package className="h-4 w-4 mr-2" />
                    <span className="font-medium">Orçamento convertido em pedido</span>
                  </div>
                  <p className="text-xs text-purple-700 mt-1">Você pode acompanhar o andamento na aba "Meus Pedidos"</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {budgets?.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-medium text-gray-600 mb-2">Nenhum orçamento encontrado</p>
            <p className="text-gray-500">Suas solicitações de orçamento aparecerão aqui.</p>
          </CardContent>
        </Card>
      )}

      {/* Budget Details Dialog */}
      <Dialog open={viewBudgetDialogOpen} onOpenChange={setViewBudgetDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedBudget?.title || `Orçamento #${selectedBudget?.id?.slice(0, 8)}`}
            </DialogTitle>
            <DialogDescription>
              Detalhes completos do orçamento solicitado
            </DialogDescription>
          </DialogHeader>

          {selectedBudget && (
            <div className="space-y-6">
              {/* Budget Status and Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedBudget.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedBudget.createdAt).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vendedor Responsável</label>
                    <p className="text-sm text-gray-900">{selectedBudget.vendorName || 'Não atribuído'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Valor Total</label>
                    <p className="text-lg font-bold text-green-600">
                      {selectedBudget.totalValue 
                        ? `R$ ${parseFloat(selectedBudget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'Aguardando orçamento'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Válido até</label>
                    <p className="text-sm text-gray-900">
                      {selectedBudget.validUntil 
                        ? new Date(selectedBudget.validUntil).toLocaleDateString('pt-BR')
                        : 'Não especificado'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Prazo de Entrega</label>
                    <p className="text-sm text-gray-900">
                      {selectedBudget.deliveryDeadline 
                        ? new Date(selectedBudget.deliveryDeadline).toLocaleDateString('pt-BR')
                        : 'A definir'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedBudget.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Descrição</label>
                  <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedBudget.description}</p>
                </div>
              )}

              {/* Items */}
              {selectedBudget.items && selectedBudget.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Itens do Orçamento</h3>
                  <div className="space-y-3">
                    {selectedBudget.items.map((item: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-2">{item.productName}</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Quantidade:</span>
                                  <span className="ml-1 font-medium">{item.quantity}</span>
                                </div>
                                {item.unitPrice && (
                                  <div>
                                    <span className="text-gray-500">Preço Unit.:</span>
                                    <span className="ml-1 font-medium text-green-600">
                                      R$ {parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                )}
                                {item.totalPrice && (
                                  <div>
                                    <span className="text-gray-500">Total:</span>
                                    <span className="ml-1 font-medium text-green-600">
                                      R$ {parseFloat(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                )}
                                {item.producerName && (
                                  <div>
                                    <span className="text-gray-500">Produtor:</span>
                                    <span className="ml-1 font-medium">{item.producerName}</span>
                                  </div>
                                )}
                              </div>
                              {item.customizationNotes && (
                                <div className="mt-2">
                                  <span className="text-sm text-gray-500">Personalização:</span>
                                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-1">{item.customizationNotes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Actions */}
              {selectedBudget.vendorName && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Phone className="h-4 w-4 mr-2" />
                    Ligar para Vendedor
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Email
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
