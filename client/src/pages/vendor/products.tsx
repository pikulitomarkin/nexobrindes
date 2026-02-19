
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, Search, ShoppingCart, Grid, List, ChevronLeft, ChevronRight } from "lucide-react";

export default function VendorProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const itemsPerPage = viewMode === "list" ? 50 : 20;
  
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["/api/products", currentPage, searchTerm, categoryFilter, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        category: categoryFilter !== "all" ? categoryFilter : ""
      });
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["/api/products/categories"],
    queryFn: async () => {
      const response = await fetch('/api/products/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const categories = categoriesData || [];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo de Produtos</h1>
            <p className="text-gray-600">
              Explore nosso catálogo com {totalProducts.toLocaleString('pt-BR')} produtos disponíveis
            </p>
          </div>
          <div className="flex items-center space-x-2">
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
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar produtos por nome, código ou descrição..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-products"
            />
          </div>
          <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((category: string) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-gray-600 flex items-center">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalProducts)} de {totalProducts.toLocaleString('pt-BR')} produtos
          </div>
        </div>
      </div>

      {/* Products List/Grid */}
      {viewMode === "list" ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estoque
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product: any) => (
                    <tr key={product.id} className="hover:bg-gray-50" data-testid={`row-product-${product.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600" data-testid={`text-product-code-${product.id}`}>
                        {product.friendlyCode || product.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {product.imageLink && (
                            <div className="flex-shrink-0 h-12 w-12 mr-3">
                              <img
                                className="h-12 w-12 rounded object-cover"
                                src={product.imageLink}
                                alt={product.name}
                                data-testid={`img-product-${product.id}`}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 line-clamp-2" data-testid={`text-product-name-${product.id}`}>
                              {product.name}
                            </div>
                            {product.mainColor && (
                              <div className="text-xs text-gray-500" data-testid={`text-product-color-${product.id}`}>
                                Cor: {product.mainColor}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-product-category-${product.id}`}>
                        {product.category || "Não informado"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600" data-testid={`text-product-price-${product.id}`}>
                        R$ {parseFloat(product.basePrice || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-product-stock-${product.id}`}>
                        {product.availableQuantity !== undefined ? (
                          <span className={product.availableQuantity > 10 ? "text-green-600" : product.availableQuantity > 0 ? "text-yellow-600" : "text-red-600"}>
                            {product.availableQuantity}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-product-details-${product.id}`}
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowProductDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product: any) => (
            <Card key={product.id} className="card-hover" data-testid={`card-product-${product.id}`}>
              <CardContent className="p-4">
                {product.imageLink && (
                  <div className="aspect-square mb-4 overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={product.imageLink}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      data-testid={`img-product-${product.id}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="mb-2">
                  {product.friendlyCode && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-mono" data-testid={`text-product-code-${product.id}`}>
                      {product.friendlyCode}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-2 line-clamp-2" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
                {product.category && (
                  <p className="text-sm text-gray-600 mb-2" data-testid={`text-product-category-${product.id}`}>{product.category}</p>
                )}
                {product.mainColor && (
                  <p className="text-xs text-gray-500 mb-2" data-testid={`text-product-color-${product.id}`}>Cor: {product.mainColor}</p>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-green-600" data-testid={`text-product-price-${product.id}`}>
                    R$ {parseFloat(product.basePrice || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  {product.availableQuantity !== undefined && (
                    <span className="text-xs text-gray-500" data-testid={`text-product-stock-${product.id}`}>
                      Estoque: {product.availableQuantity}
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    data-testid={`button-product-details-${product.id}`}
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <div className="text-sm text-gray-700">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
                if (pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              }).filter(Boolean)}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {products.length === 0 && searchTerm && (
        <div className="text-center py-12" data-testid="text-no-products-found">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
          <p className="text-gray-500">Tente alterar os termos de busca ou filtros.</p>
        </div>
      )}

      {totalProducts === 0 && (
        <div className="text-center py-12" data-testid="text-catalog-empty">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Catálogo vazio</h3>
          <p className="text-gray-500">Nenhum produto foi encontrado no catálogo.</p>
        </div>
      )}

      {/* Product Details Dialog */}
      <Dialog open={showProductDetails} onOpenChange={setShowProductDetails}>
        <DialogContent className="max-w-2xl" data-testid="dialog-product-details">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-product-name">{selectedProduct?.name}</DialogTitle>
            <DialogDescription data-testid="text-dialog-product-code">
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
                    data-testid="img-dialog-product"
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
                        <span className="font-mono" data-testid="text-dialog-product-code-value">{selectedProduct.friendlyCode}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Categoria:</span>
                      <span data-testid="text-dialog-product-category">{selectedProduct.category || "Não informado"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Preço:</span>
                      <span className="font-semibold" data-testid="text-dialog-product-price">
                        R$ {parseFloat(selectedProduct.basePrice || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedProduct.availableQuantity !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estoque:</span>
                        <span data-testid="text-dialog-product-stock">{selectedProduct.availableQuantity} unidades</span>
                      </div>
                    )}
                    {selectedProduct.mainColor && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cor Principal:</span>
                        <span data-testid="text-dialog-product-main-color">{selectedProduct.mainColor}</span>
                      </div>
                    )}
                    {selectedProduct.secondaryColor && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cor Secundária:</span>
                        <span data-testid="text-dialog-product-secondary-color">{selectedProduct.secondaryColor}</span>
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
                          <span data-testid="text-dialog-product-weight">{selectedProduct.weight}g</span>
                        </div>
                      )}
                      {selectedProduct.height && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Altura:</span>
                          <span data-testid="text-dialog-product-height">{selectedProduct.height}cm</span>
                        </div>
                      )}
                      {selectedProduct.width && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Largura:</span>
                          <span data-testid="text-dialog-product-width">{selectedProduct.width}cm</span>
                        </div>
                      )}
                      {selectedProduct.depth && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Profundidade:</span>
                          <span data-testid="text-dialog-product-depth">{selectedProduct.depth}cm</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {selectedProduct.description && (
                <div>
                  <h4 className="font-semibold mb-2">Descrição</h4>
                  <p className="text-sm text-gray-600" data-testid="text-dialog-product-description">{selectedProduct.description}</p>
                </div>
              )}
              <div className="flex space-x-2">
                {selectedProduct.siteLink && (
                  <Button
                    variant="outline"
                    data-testid="button-product-site-link"
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
}
