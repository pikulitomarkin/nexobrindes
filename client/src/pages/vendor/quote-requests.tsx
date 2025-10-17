
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Phone, Mail, Package, Clock, CheckCircle, X, Eye, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

export default function VendorQuoteRequests() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const vendorId = user.id;
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const response = await fetch(`/api/quote-requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests/vendor", vendorId] });
      toast({
        title: "Sucesso!",
        description: "Status atualizado com sucesso",
      });
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

  const handleStatusUpdate = (requestId: string, status: string) => {
    updateStatusMutation.mutate({ requestId, status });
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
              variant={statusFilter === "reviewing" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("reviewing")}
            >
              Em Análise ({quoteRequests?.filter((r: any) => r.status === "reviewing").length || 0})
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
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl text-gray-900 mb-2">
                    {request.productName}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span>Qtd: {request.quantity}</span>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(request.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Informações do Cliente</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nome:</strong> {request.contactName}</p>
                    {request.whatsapp && (
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {request.whatsapp}
                      </p>
                    )}
                    {request.email && (
                      <p className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {request.email}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Observações</h4>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {request.observations || "Nenhuma observação adicional"}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-2">
                  {request.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(request.id, "reviewing")}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Marcar como Analisando
                    </Button>
                  )}
                  
                  {(request.status === "pending" || request.status === "reviewing") && (
                    <>
                      <Link href={`/vendor/budgets?product=${request.productId}&client=${request.clientId}&quantity=${request.quantity}&notes=${encodeURIComponent(request.observations || '')}`}>
                        <Button size="sm" className="gradient-bg text-white">
                          <FileText className="h-4 w-4 mr-1" />
                          Criar Orçamento
                        </Button>
                      </Link>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(request.id, "rejected")}
                        disabled={updateStatusMutation.isPending}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleViewDetails(request)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalhes
                </Button>
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
