import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Clock, User, Package, Phone, Mail, CheckCircle, X, Eye, FileText, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

// Isolated component for convert to budget button
function ConvertToBudgetButton({ requestId, uniqueKey }: {
  requestId: string;
  uniqueKey: string;
}) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const { mutate } = useMutation({
    // REMOVIDO: mutationKey - cada botão tem sua própria instância independente
    mutationFn: async () => {
      console.log(`Converting quote request ${requestId} to budget`);

      const response = await fetch(`/api/quote-requests/${requestId}/convert-to-budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erro ao converter em orçamento");
      return response.json();
    },
    onMutate: () => {
      setPending(true);
    },
    onSuccess: (data) => {
      setPending(false);
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const vendorId = currentUser.id;
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests/vendor", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets/vendor", vendorId] });
      toast({
        title: "Sucesso!",
        description: "Solicitação convertida em orçamento oficial! Agora você pode editá-lo na aba de Orçamentos.",
      });
    },
    onError: (error: any) => {
      setPending(false);
      console.error(`Error converting to budget ${requestId}:`, error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao converter em orçamento",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      size="sm"
      className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!pending) mutate();
      }}
      disabled={pending}
      title="Converter em orçamento oficial"
      data-testid={`button-convert-${uniqueKey}`}
    >
      <FileText className="h-4 w-4 mr-1" />
      {pending ? 'Convertendo...' : 'Converter em Orçamento'}
    </Button>
  );
}

// Isolated component for reject button
function RejectRequestButton({ requestId, uniqueKey }: {
  requestId: string;
  uniqueKey: string;
}) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const { mutate } = useMutation({
    // REMOVIDO: mutationKey - cada botão tem sua própria instância independente
    mutationFn: async () => {
      console.log(`Rejecting quote request ${requestId}`);

      const response = await fetch(`/api/quote-requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!response.ok) throw new Error("Erro ao rejeitar solicitação");
      return response.json();
    },
    onMutate: () => {
      setPending(true);
    },
    onSuccess: () => {
      setPending(false);
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const vendorId = currentUser.id;
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests/vendor", vendorId] });
      toast({
        title: "Sucesso!",
        description: "Solicitação rejeitada com sucesso",
      });
    },
    onError: (error: any) => {
      setPending(false);
      console.error(`Error rejecting request ${requestId}:`, error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao rejeitar solicitação",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-red-600 border-red-300 hover:bg-red-50"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!pending) mutate();
      }}
      disabled={pending}
      title="Rejeitar esta solicitação"
      data-testid={`button-reject-${uniqueKey}`}
    >
      <X className="h-4 w-4 mr-1" />
      {pending ? 'Rejeitando...' : 'Rejeitar'}
    </Button>
  );
}

export default function VendorQuoteRequests() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUser = user; // Renamed for clarity, assuming 'user' from localStorage is the current vendor
  const vendorId = currentUser.id;
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { data: quoteRequests, isLoading } = useQuery({
    queryKey: ["/api/quote-requests/vendor", vendorId],
    queryFn: async () => {
      const response = await fetch(`/api/quote-requests/vendor/${vendorId}`);
      if (!response.ok) throw new Error('Failed to fetch quote requests');
      return response.json();
    },
  });

  

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      reviewing: "bg-blue-100 text-blue-800", 
      quoted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    const statusLabels = {
      pending: "Pendente",
      reviewing: "Em Análise",
      quoted: "Orçado",
      rejected: "Rejeitado",
    };

    return (
      <Badge className={`${statusClasses[status as keyof typeof statusClasses]} border-0`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const filteredRequests = quoteRequests?.filter((request: any) => {
    if (statusFilter === "all") return true;
    return request.status === statusFilter;
  }) || [];

  if (isLoading) {
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Solicitações de Orçamento</h1>
          <p className="text-gray-600">Gerencie as solicitações de orçamento dos seus clientes</p>
        </div>
      </div>

      {/* Filtros por Status */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              Todas ({quoteRequests?.length || 0})
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
            >
              Pendentes ({quoteRequests?.filter((r: any) => r.status === "pending").length || 0})
            </Button>
            
            <Button
              variant={statusFilter === "quoted" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("quoted")}
            >
              Orçados ({quoteRequests?.filter((r: any) => r.status === "quoted").length || 0})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Solicitações */}
      <div className="space-y-6">
        {filteredRequests.map((request: any) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {request.productCount > 1 ? (
                      <span className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                        Orçamento com {request.productCount} produtos
                      </span>
                    ) : (
                      request.productName
                    )}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {request.contactName || request.clientName || 'Cliente não identificado'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {request.productCount > 1 ? `${request.productCount} produtos` : `Qtd: ${request.quantity}`}
                    </span>
                    {request.totalEstimatedValue > 0 && (
                      <span className="flex items-center gap-1 font-medium text-green-600">
                        Valor estimado: R$ {parseFloat(request.totalEstimatedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  
                  {/* Contact Information */}
                  <div className="flex items-center gap-4 text-sm text-blue-600 mb-2">
                    {request.whatsapp && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {request.whatsapp}
                      </span>
                    )}
                    {request.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {request.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(request.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Lista de produtos (se for orçamento consolidado) */}
              {request.products && request.products.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">Produtos solicitados:</p>
                  <div className="space-y-2">
                    {request.products.map((product: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {product.imageLink && (
                            <img src={product.imageLink} alt={product.productName} className="w-8 h-8 object-cover rounded" />
                          )}
                          <div>
                            <span className="font-medium">{product.productName}</span>
                            {product.category && (
                              <span className="text-gray-500 ml-2">({product.category})</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div>Qtd: {product.quantity}</div>
                          <div className="text-gray-500">R$ {parseFloat(product.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {request.observations && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Observações gerais:</strong> {request.observations}
                  </p>
                </div>
              )}

              {/* Observações específicas dos produtos */}
              {request.products && request.products.some((p: any) => p.observations) && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-800 mb-2">Observações específicas dos produtos:</p>
                  <div className="space-y-1">
                    {request.products.filter((p: any) => p.observations).map((product: any, index: number) => (
                      <div key={index} className="text-sm">
                        <strong>{product.productName}:</strong> {product.observations}
                      </div>
                    ))}
                  </div>
                </div>
              )}


              <div className="flex justify-end items-center pt-4 border-t">

                <div className="flex space-x-2">
                  {request.status === 'pending' && (
                    <>
                      <ConvertToBudgetButton
                        key={`convert-${request.id}`}
                        requestId={request.id}
                        uniqueKey={`${request.id}-convert`}
                      />
                      <RejectRequestButton
                        key={`reject-${request.id}`}
                        requestId={request.id}
                        uniqueKey={`${request.id}-reject`}
                      />
                    </>
                  )}

                  {request.status === 'quoted' && (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">Orçamento enviado</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-medium text-gray-600 mb-2">
              {statusFilter === "all" ? 
                "Nenhuma solicitação de orçamento encontrada" :
                `Nenhuma solicitação ${statusFilter === "pending" ? "pendente" : 
                 statusFilter === "reviewing" ? "em análise" : 
                 statusFilter === "quoted" ? "orçada" : "rejeitada"} encontrada`}
            </p>
            <p className="text-gray-500">
              {statusFilter === "all" ? 
                "As solicitações dos seus clientes aparecerão aqui." :
                "Tente selecionar um filtro diferente."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Informações completas da solicitação de orçamento
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Produto</h4>
                  <p className="text-lg">{selectedRequest.productName}</p>
                  <p className="text-sm text-gray-600">Quantidade: {selectedRequest.quantity}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Status</h4>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Informações de Contato</h4>
                <div className="space-y-2">
                  <p><strong>Nome:</strong> {selectedRequest.contactName}</p>
                  {selectedRequest.whatsapp && (
                    <p><strong>WhatsApp:</strong> {selectedRequest.whatsapp}</p>
                  )}
                  {selectedRequest.email && (
                    <p><strong>Email:</strong> {selectedRequest.email}</p>
                  )}
                </div>
              </div>

              {selectedRequest.observations && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Observações</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-700">{selectedRequest.observations}</p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Data da Solicitação</h4>
                <p className="text-gray-600">
                  {new Date(selectedRequest.createdAt).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}