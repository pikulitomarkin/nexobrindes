
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ShoppingCart, Package, MessageSquare, Phone, Mail, Minus, Trash2, List, Grid3X3, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { phoneMask } from "@/utils/masks";

interface CartItem {
  productId: string;
  productName: string;
  basePrice: number;
  quantity: number;
  imageLink?: string;
  category?: string;
  observations: string; // Observação específica para cada produto
}

export default function ClientProducts() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20); // 20 produtos por página
  const { toast } = useToast();

  // Estado do formulário de solicitação
  const [quoteForm, setQuoteForm] = useState({
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
  const uniqueCategories = new Set<string>();
  products.forEach((p: any) => {
    if (p.category) uniqueCategories.add(p.category);
  });
  const categories: string[] = ['all', ...Array.from(uniqueCategories)];

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
      setCart([]);
      toast({
        title: "Sucesso!",
        description: "Solicitação de orçamento enviada com sucesso!",
      });
    },
  });

  const resetForm = () => {
    setQuoteForm({
      observations: "",
      whatsapp: "",
      email: "",
      contactName: ""
    });
  };

  // Funções do carrinho
  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        basePrice: parseFloat(product.basePrice),
        quantity: 1,
        imageLink: product.imageLink,
        category: product.category,
        observations: "" // Campo para observações específicas do produto
      };
      setCart([...cart, newItem]);
    }

    toast({
      title: "Produto adicionado",
      description: `${product.name} foi adicionado ao seu carrinho`,
    });
  };

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const updateCartItemObservations = (productId: string, observations: string) => {
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, observations }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalValue = () => {
    return cart.reduce((total, item) => total + (item.basePrice * item.quantity), 0);
  };

  const handleQuoteRequest = () => {
    if (cart.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione pelo menos um produto ao carrinho",
        variant: "destructive"
      });
      return;
    }

    setQuoteForm({
      observations: "",
      whatsapp: clientProfile?.phone || "",
      email: clientProfile?.email || "",
      contactName: clientProfile?.name || currentUser.name || ""
    });
    setIsQuoteDialogOpen(true);
  };

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cart.length === 0 || !quoteForm.contactName.trim()) {
      toast({
        title: "Erro",
        description: "Preencha pelo menos o nome de contato e adicione produtos",
        variant: "destructive"
      });
      return;
    }

    // Criar uma solicitação para cada produto no carrinho
    const promises = cart.map(item => 
      requestQuoteMutation.mutateAsync({
        clientId: currentUser.id,
        vendorId: clientProfile?.vendorId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        observations: `${item.observations ? `Observações do produto: ${item.observations}\n` : ''}${quoteForm.observations ? `Observações gerais: ${quoteForm.observations}` : ''}`,
        contactName: quoteForm.contactName,
        whatsapp: quoteForm.whatsapp,
        email: quoteForm.email,
        status: "pending"
      })
    );

    Promise.all(promises).then(() => {
      toast({
        title: "Sucesso!",
        description: `Orçamento solicitado para ${cart.length} produto(s) diferentes!`,
      });
      setCart([]);
      setIsQuoteDialogOpen(false);
      resetForm();
    }).catch((error) => {
      toast({
        title: "Erro",
        description: "Erro ao solicitar orçamento. Tente novamente.",
        variant: "destructive"
      });
    });
  };

  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;

    return matchesSearch && matchesCategory && product.isActive;
  });

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo de Produtos</h1>
            <p className="text-gray-600">Explore nossos produtos e solicite orçamentos</p>
            {clientProfile?.vendorName && (
              <p className="text-sm text-blue-600 mt-2">
                Seu vendedor: <strong>{clientProfile.vendorName}</strong>
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Total: {filteredProducts.length} produtos encontrados
            </p>
          </div>
          
          {/* Carrinho */}
          <div className="relative">
            <Button
              onClick={() => setShowCart(!showCart)}
              variant="outline"
              className="relative"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Carrinho
              {getTotalItems() > 0 && (
                <Badge className="absolute -top-2 -right-2 min-w-5 h-5 flex items-center justify-center p-1 text-xs">
                  {getTotalItems()}
                </Badge>
              )}
            </Button>
            
            {showCart && (
              <Card className="absolute right-0 top-12 w-[500px] z-50 shadow-lg max-h-[600px] overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    Carrinho de Orçamento
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowCart(false)}
                    >
                      ×
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[400px]">
                  {cart.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Carrinho vazio</p>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={item.productId} className="border rounded-lg p-3">
                          <div className="flex items-start gap-3 mb-2">
                            {item.imageLink && (
                              <img 
                                src={item.imageLink} 
                                alt={item.productName}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.productName}</p>
                              <p className="text-xs text-gray-500">
                                R$ {item.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromCart(item.productId)}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Campo de observações para cada produto */}
                          <div className="mt-2">
                            <Label className="text-xs text-gray-600">Observações do produto:</Label>
                            <Textarea
                              placeholder="Detalhes específicos deste produto..."
                              value={item.observations}
                              onChange={(e) => updateCartItemObservations(item.productId, e.target.value)}
                              className="mt-1 text-xs h-16 resize-none"
                            />
                          </div>
                        </div>
                      ))}
                      
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium">Total estimado:</span>
                          <span className="font-bold text-green-600">
                            R$ {getTotalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <Button 
                          onClick={handleQuoteRequest}
                          className="w-full gradient-bg text-white"
                          disabled={!clientProfile?.vendorId || cart.length === 0}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Solicitar Orçamento
                        </Button>
                        {!clientProfile?.vendorId && (
                          <p className="text-xs text-red-600 text-center mt-2">
                            Você precisa ter um vendedor atribuído
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Filtros e controles */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset para primeira página ao buscar
                }}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(value) => {
              setCategoryFilter(value);
              setCurrentPage(1); // Reset para primeira página ao filtrar
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category: string) => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "Todas as Categorias" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Produtos */}
      {viewMode === "list" ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço Base
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product: any) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.imageLink && (
                            <img 
                              src={product.imageLink} 
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded mr-3"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-sm text-gray-500 max-w-xs truncate">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.category || 'Não informada'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        R$ {parseFloat(product.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          onClick={() => addToCart(product)}
                          size="sm"
                          className="gradient-bg text-white"
                          disabled={!clientProfile?.vendorId}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProducts.map((product: any) => (
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
                    onClick={() => addToCart(product)}
                    className="w-full gradient-bg text-white"
                    disabled={!clientProfile?.vendorId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar ao Carrinho
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
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a {Math.min(startIndex + pageSize, filteredProducts.length)} de {filteredProducts.length} produtos
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  Anterior
                </Button>
                <span className="flex items-center px-3 text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Orçamento</DialogTitle>
            <DialogDescription>
              Você está solicitando orçamento para {cart.length} produto(s). 
              Preencha os dados de contato abaixo.
            </DialogDescription>
          </DialogHeader>
          
          {/* Resumo dos produtos */}
          <div className="max-h-60 overflow-y-auto border rounded-lg p-3 bg-gray-50">
            <h4 className="font-medium mb-2">Produtos selecionados:</h4>
            {cart.map((item) => (
              <div key={item.productId} className="border-b last:border-b-0 pb-2 mb-2 last:mb-0">
                <div className="flex justify-between items-start text-sm mb-1">
                  <span className="font-medium">{item.productName}</span>
                  <span className="font-medium">
                    {item.quantity}x - R$ {(item.basePrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {item.observations && (
                  <p className="text-xs text-gray-600 italic">"{item.observations}"</p>
                )}
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center font-bold">
                <span>Total estimado:</span>
                <span>R$ {getTotalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitQuote} className="space-y-4">
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
              <Label htmlFor="observations">Observações Gerais</Label>
              <Textarea
                id="observations"
                rows={4}
                value={quoteForm.observations}
                onChange={(e) => setQuoteForm({ ...quoteForm, observations: e.target.value })}
                placeholder="Observações que se aplicam a todos os produtos da solicitação..."
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
