
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ShoppingCart, Package, MessageSquare, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { phoneMask } from "@/utils/masks";

export default function ClientProducts() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const { toast } = useToast();

  // Estado do formulário de solicitação
  const [quoteForm, setQuoteForm] = useState({
    quantity: 1,
    observations: "",
    whatsapp: "",
    email: "",
    contactName: ""
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["/api/products", { limit: 9999 }],
    queryFn: async () => {
      const response = await fetch('/api/products?limit=9999');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const { data: clientProfile } = useQuery({
    queryKey: ["/api/clients/profile", currentUser.id],
    queryFn: async () => {
      const response = await fetch(`/api/clients/profile/${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to fetch client profile');
      return response.json();
    },
  });

  const products = productsData?.products || [];
  const categories = ['all', ...new Set(products.map((p: any) => p.category).filter(Boolean))];

  const requestQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao solicitar orçamento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      setIsQuoteDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Solicitação de orçamento enviada com sucesso!",
      });
    },
  });

  const resetForm = () => {
    setQuoteForm({
      quantity: 1,
      observations: "",
      whatsapp: "",
      email: "",
      contactName: ""
    });
    setSelectedProduct(null);
  };

  const handleQuoteRequest = (product: any) => {
    setSelectedProduct(product);
    setQuoteForm({
      quantity: 1,
      observations: "",
      whatsapp: clientProfile?.phone || "",
      email: clientProfile?.email || "",
      contactName: clientProfile?.name || currentUser.name || ""
    });
    setIsQuoteDialogOpen(true);
  };

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct || !quoteForm.contactName.trim()) {
      toast({
        title: "Erro",
        description: "Preencha pelo menos o nome de contato",
        variant: "destructive"
      });
      return;
    }

    requestQuoteMutation.mutate({
      clientId: currentUser.id,
      vendorId: clientProfile?.vendorId,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: quoteForm.quantity,
      observations: quoteForm.observations,
      contactName: quoteForm.contactName,
      whatsapp: quoteForm.whatsapp,
      email: quoteForm.email,
      status: "pending"
    });
  };

  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;

    return matchesSearch && matchesCategory && product.isActive;
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo de Produtos</h1>
        <p className="text-gray-600">Explore nossos produtos e solicite orçamentos</p>
        {clientProfile?.vendorName && (
          <p className="text-sm text-blue-600 mt-2">
            Seu vendedor: <strong>{clientProfile.vendorName}</strong>
          </p>
        )}
      </div>

      {/* Filtros */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "Todas as Categorias" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product: any) => (
          <Card key={product.id} className="card-hover">
            <CardHeader>
              {product.imageLink && (
                <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                  <img
                    src={product.imageLink}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <CardTitle className="text-lg">{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {product.description && (
                  <p className="text-sm text-gray-600 line-clamp-3">{product.description}</p>
                )}
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-500">Categoria:</span>
                    <p className="font-medium">{product.category || 'Não informada'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">Preço base:</span>
                    <p className="text-lg font-bold text-green-600">
                      R$ {parseFloat(product.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleQuoteRequest(product)}
                  className="w-full gradient-bg text-white"
                  disabled={!clientProfile?.vendorId}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Solicitar Orçamento
                </Button>
                
                {!clientProfile?.vendorId && (
                  <p className="text-xs text-red-600 text-center">
                    Você precisa ter um vendedor atribuído para solicitar orçamentos
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-medium text-gray-600 mb-2">Nenhum produto encontrado</p>
            <p className="text-gray-500">Tente ajustar os filtros de busca.</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Solicitação de Orçamento */}
      <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Solicitar Orçamento</DialogTitle>
            <DialogDescription>
              Preencha os dados para solicitar um orçamento para: <strong>{selectedProduct?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitQuote} className="space-y-4">
            <div>
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quoteForm.quantity}
                onChange={(e) => setQuoteForm({ ...quoteForm, quantity: parseInt(e.target.value) || 1 })}
                required
              />
            </div>

            <div>
              <Label htmlFor="contactName">Nome de Contato *</Label>
              <Input
                id="contactName"
                value={quoteForm.contactName}
                onChange={(e) => setQuoteForm({ ...quoteForm, contactName: e.target.value })}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={quoteForm.whatsapp}
                  onChange={(e) => setQuoteForm({ ...quoteForm, whatsapp: phoneMask(e.target.value) })}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={quoteForm.email}
                  onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                rows={4}
                value={quoteForm.observations}
                onChange={(e) => setQuoteForm({ ...quoteForm, observations: e.target.value })}
                placeholder="Descreva detalhes sobre personalização, cores, tamanhos, prazo de entrega, etc..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuoteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="gradient-bg text-white"
                disabled={requestQuoteMutation.isPending}
              >
                {requestQuoteMutation.isPending ? "Enviando..." : "Solicitar Orçamento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
