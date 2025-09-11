
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, Search, ShoppingCart } from "lucide-react";

export default function VendorProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const filteredProducts = products?.products?.filter((product: any) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <p className="text-gray-600">Explore nosso catálogo de produtos disponíveis</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts?.map((product: any) => (
          <Card key={product.id} className="card-hover">
            <CardContent className="p-4">
              {product.imageLink && (
                <div className="aspect-square mb-4 overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={product.imageLink}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
              {product.category && (
                <p className="text-sm text-gray-600 mb-2">{product.category}</p>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl font-bold text-green-600">
                  R$ {parseFloat(product.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                {product.availableQuantity !== undefined && (
                  <span className="text-xs text-gray-500">
                    Estoque: {product.availableQuantity}
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowProductDetails(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts?.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
          <p className="text-gray-500">Tente alterar os filtros de busca.</p>
        </div>
      )}

      {/* Product Details Dialog */}
      <Dialog open={showProductDetails} onOpenChange={setShowProductDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>Detalhes do produto</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-6">
              {selectedProduct.imageLink && (
                <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={selectedProduct.imageLink}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informações Básicas</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Categoria:</span>
                      <span>{selectedProduct.category || "Não informado"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Preço Base:</span>
                      <span className="font-semibold">
                        R$ {parseFloat(selectedProduct.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedProduct.availableQuantity !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estoque:</span>
                        <span>{selectedProduct.availableQuantity} unidades</span>
                      </div>
                    )}
                  </div>
                </div>
                {(selectedProduct.weight || selectedProduct.height || selectedProduct.width || selectedProduct.depth) && (
                  <div>
                    <h4 className="font-semibold mb-2">Dimensões</h4>
                    <div className="space-y-2 text-sm">
                      {selectedProduct.weight && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Peso:</span>
                          <span>{selectedProduct.weight}g</span>
                        </div>
                      )}
                      {selectedProduct.height && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Altura:</span>
                          <span>{selectedProduct.height}cm</span>
                        </div>
                      )}
                      {selectedProduct.width && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Largura:</span>
                          <span>{selectedProduct.width}cm</span>
                        </div>
                      )}
                      {selectedProduct.depth && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Profundidade:</span>
                          <span>{selectedProduct.depth}cm</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {selectedProduct.description && (
                <div>
                  <h4 className="font-semibold mb-2">Descrição</h4>
                  <p className="text-sm text-gray-600">{selectedProduct.description}</p>
                </div>
              )}
              {selectedProduct.siteLink && (
                <div>
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedProduct.siteLink, '_blank')}
                  >
                    Ver no Site Oficial
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}</old_str>
<new_str>import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, Search, ShoppingCart } from "lucide-react";

export default function VendorProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch('/api/products?limit=100');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const products = productsData?.products || [];

  const filteredProducts = products.filter((product: any) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.friendlyCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <p className="text-gray-600">Explore nosso catálogo com {products.length} produtos disponíveis</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar produtos por nome, categoria ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product: any) => (
          <Card key={product.id} className="card-hover">
            <CardContent className="p-4">
              {product.imageLink && (
                <div className="aspect-square mb-4 overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={product.imageLink}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="mb-2">
                {product.friendlyCode && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-mono">
                    {product.friendlyCode}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
              {product.category && (
                <p className="text-sm text-gray-600 mb-2">{product.category}</p>
              )}
              {product.mainColor && (
                <p className="text-xs text-gray-500 mb-2">Cor: {product.mainColor}</p>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl font-bold text-green-600">
                  R$ {parseFloat(product.basePrice || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                {product.availableQuantity !== undefined && (
                  <span className="text-xs text-gray-500">
                    Estoque: {product.availableQuantity}
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowProductDetails(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
          <p className="text-gray-500">Tente alterar os termos de busca.</p>
        </div>
      )}

      {products.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Catálogo vazio</h3>
          <p className="text-gray-500">Nenhum produto foi encontrado no catálogo.</p>
        </div>
      )}

      {/* Product Details Dialog */}
      <Dialog open={showProductDetails} onOpenChange={setShowProductDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.friendlyCode && `Código: ${selectedProduct.friendlyCode}`}
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-6">
              {selectedProduct.imageLink && (
                <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={selectedProduct.imageLink}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informações Básicas</h4>
                  <div className="space-y-2 text-sm">
                    {selectedProduct.friendlyCode && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Código:</span>
                        <span className="font-mono">{selectedProduct.friendlyCode}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Categoria:</span>
                      <span>{selectedProduct.category || "Não informado"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Preço Base:</span>
                      <span className="font-semibold">
                        R$ {parseFloat(selectedProduct.basePrice || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedProduct.availableQuantity !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estoque:</span>
                        <span>{selectedProduct.availableQuantity} unidades</span>
                      </div>
                    )}
                    {selectedProduct.mainColor && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cor Principal:</span>
                        <span>{selectedProduct.mainColor}</span>
                      </div>
                    )}
                    {selectedProduct.secondaryColor && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cor Secundária:</span>
                        <span>{selectedProduct.secondaryColor}</span>
                      </div>
                    )}
                  </div>
                </div>
                {(selectedProduct.weight || selectedProduct.height || selectedProduct.width || selectedProduct.depth) && (
                  <div>
                    <h4 className="font-semibold mb-2">Dimensões</h4>
                    <div className="space-y-2 text-sm">
                      {selectedProduct.weight && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Peso:</span>
                          <span>{selectedProduct.weight}g</span>
                        </div>
                      )}
                      {selectedProduct.height && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Altura:</span>
                          <span>{selectedProduct.height}cm</span>
                        </div>
                      )}
                      {selectedProduct.width && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Largura:</span>
                          <span>{selectedProduct.width}cm</span>
                        </div>
                      )}
                      {selectedProduct.depth && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Profundidade:</span>
                          <span>{selectedProduct.depth}cm</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {selectedProduct.description && (
                <div>
                  <h4 className="font-semibold mb-2">Descrição</h4>
                  <p className="text-sm text-gray-600">{selectedProduct.description}</p>
                </div>
              )}
              <div className="flex space-x-2">
                {selectedProduct.siteLink && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedProduct.siteLink, '_blank')}
                  >
                    Ver no Site Oficial
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}</new_str>
