
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Upload, Search, Edit, Trash2, Package, Factory
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function AdminProducts() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [selectedProducer, setSelectedProducer] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedProducerForImport, setSelectedProducerForImport] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    category: "",
    basePrice: "",
    unit: "un",
    isActive: true,
    weight: "",
    height: "",
    width: "",
    depth: "",
    imageLink: "",
    mainColor: "",
    secondaryColor: "",
    producerId: "internal",
    type: "internal"
  });

  // Queries
  const productsQuery = useQuery({
    queryKey: ["/api/logistics/products", { 
      page: currentPage, 
      limit: pageSize,
      search: debouncedSearch || undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      producer: selectedProducer !== "all" ? selectedProducer : undefined
    }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams();

      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.category) searchParams.append('category', params.category);
      if (params.producer) searchParams.append('producer', params.producer);

      const response = await fetch(`/api/logistics/products?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const result = await response.json();

      return result;
    },
  });

  const producersQuery = useQuery({
    queryKey: ["/api/producers"],
    queryFn: async () => {
      const response = await fetch('/api/producers');
      if (!response.ok) throw new Error('Failed to fetch producers');
      return response.json();
    },
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (data: typeof productForm) => {
      const response = await fetch("/api/logistics/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar produto");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Produto criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/products"] });
      resetProductForm();
      setIsProductDialogOpen(false);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof productForm }) => {
      const response = await fetch(`/api/logistics/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar produto");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Produto atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/products"] });
      resetProductForm();
      setEditingProduct(null);
      setIsProductDialogOpen(false);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/logistics/products/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Erro ao deletar produto");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Produto deletado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/products"] });
    },
  });

  const importProductsMutation = useMutation({
    mutationFn: async ({ file, producerId }: { file: File; producerId: string }) => {
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. O limite é de 50MB.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('producerId', producerId);

      const response = await fetch('/api/logistics/products/import', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao importar produtos');
      }

      return responseData;
    },
    onSuccess: (data) => {
      const hasErrors = data.errors && data.errors.length > 0;

      toast({
        title: hasErrors ? "Importação Concluída com Avisos" : "Importação Concluída",
        description: hasErrors 
          ? `${data.imported} de ${data.total} produtos importados. ${data.errors.length} produtos tiveram problemas.`
          : `${data.imported} produtos importados com sucesso para o produtor!`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/logistics/products"] });
      setIsImportDialogOpen(false);
      setImportFile(null);
      setImportProgress(0);
      setSelectedProducerForImport("");

      if (hasErrors) {
        console.log('Import errors:', data.errors);
      }
    },
    onError: (error: any) => {
      setImportProgress(0);
      toast({
        title: "Erro na Importação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      category: "",
      basePrice: "",
      unit: "un",
      isActive: true,
      weight: "",
      height: "",
      width: "",
      depth: "",
      imageLink: "",
      mainColor: "",
      secondaryColor: "",
      producerId: "internal",
      type: "internal"
    });
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      ...product,
      producerId: product.producerId || "internal",
      type: product.type || (product.producerId === "internal" ? "internal" : "external")
    });
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este produto?')) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = {
      ...productForm,
      producerId: productForm.producerId || "internal",
      type: productForm.producerId === "internal" || !productForm.producerId ? "internal" : "external"
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createProductMutation.mutate(formData);
    }
  };

  const handleImport = () => {
    if (importFile && selectedProducerForImport) {
      setImportProgress(25);
      importProductsMutation.mutate({ file: importFile, producerId: selectedProducerForImport });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('json') && !file.name.toLowerCase().endsWith('.json')) {
        toast({
          title: "Arquivo Inválido",
          description: "Por favor, selecione um arquivo JSON (.json).",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Arquivo Muito Grande",
          description: "O arquivo deve ter no máximo 50MB.",
          variant: "destructive",
        });
        return;
      }

      if (file.size === 0) {
        toast({
          title: "Arquivo Vazio",
          description: "O arquivo JSON não pode estar vazio.",
          variant: "destructive",
        });
        return;
      }

      setImportFile(file);
      setImportProgress(10);
    }
  };

  // Data processing
  const productsData = productsQuery.data;
  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;
  const totalPages = productsData?.totalPages || 1;
  const producers = producersQuery.data || [];

  // Enrich products with producer names
  const enrichedProducts = products.map(product => {
    const producer = producers.find(p => p.id === product.producerId);
    return {
      ...product,
      producerName: product.producerId === 'internal' ? 'Interno' : (producer?.name || 'Produtor não encontrado')
    };
  });

  // Categories from products
  const categories = ['all', ...new Set(products.map((product: any) => product.category).filter(Boolean))];

  if (productsQuery.isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Produtos</h1>
          <p className="text-gray-600 mt-2">
            Gerencie produtos internos e de produtores terceirizados
          </p>
        </div>
      </div>

      <Card className="shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold">Catálogo de Produtos - Administração</CardTitle>
            <div className="flex gap-2">
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-white/20">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar JSON
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Importar Produtos para Produtor</DialogTitle>
                    <DialogDescription>
                      Faça upload de um arquivo JSON e associe ao produtor
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="producer-select">Produtor Responsável</Label>
                      <Select value={selectedProducerForImport} onValueChange={setSelectedProducerForImport}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o produtor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">
                            Produtos Internos da Empresa
                          </SelectItem>
                          {producers?.map((producer: any) => (
                            <SelectItem key={producer.id} value={producer.id}>
                              {producer.name} - {producer.specialty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="file">Arquivo JSON</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileChange}
                        className="w-full mt-1 p-2 border rounded-md"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Selecione um arquivo JSON com a estrutura de produtos
                      </p>
                    </div>
                    {importFile && (
                      <div className="space-y-2">
                        <p className="text-sm text-green-600">
                          Arquivo selecionado: {importFile.name}
                        </p>
                        {importProgress > 0 && (
                          <Progress value={importProgress} className="w-full" />
                        )}
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsImportDialogOpen(false);
                          setImportFile(null);
                          setImportProgress(0);
                          setSelectedProducerForImport("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleImport}
                        disabled={!importFile || !selectedProducerForImport || importProductsMutation.isPending}
                      >
                        {importProductsMutation.isPending ? "Importando..." : "Importar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
                setIsProductDialogOpen(open);
                if (!open) {
                  setEditingProduct(null);
                  resetProductForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-white text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      resetProductForm();
                      setProductForm(prev => ({
                        ...prev,
                        producerId: "internal",
                        type: "internal"
                      }));
                      setEditingProduct(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? "Editar Produto" : "Novo Produto"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingProduct ? "Edite as informações do produto" : "Cadastre um novo produto"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleProductSubmit} className="space-y-6">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
                        <TabsTrigger value="details">Detalhes</TabsTrigger>
                        <TabsTrigger value="appearance">Aparência</TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Nome do Produto</Label>
                            <Input
                              id="name"
                              value={productForm.name}
                              onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="category">Categoria</Label>
                            <Input
                              id="category"
                              value={productForm.category}
                              onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="description">Descrição</Label>
                          <Textarea
                            id="description"
                            value={productForm.description}
                            onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="basePrice">Preço Base (R$)</Label>
                            <Input
                              id="basePrice"
                              type="number"
                              step="0.01"
                              value={productForm.basePrice}
                              onChange={(e) => setProductForm({...productForm, basePrice: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="unit">Unidade</Label>
                            <Select 
                              value={productForm.unit}
                              onValueChange={(value) => setProductForm({...productForm, unit: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="un">Unidade</SelectItem>
                                <SelectItem value="m">Metro</SelectItem>
                                <SelectItem value="m2">Metro²</SelectItem>
                                <SelectItem value="m3">Metro³</SelectItem>
                                <SelectItem value="kg">Quilograma</SelectItem>
                                <SelectItem value="l">Litro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center space-x-2 pt-6">
                            <Switch
                              checked={productForm.isActive}
                              onCheckedChange={(checked) => setProductForm({...productForm, isActive: checked})}
                            />
                            <Label>Produto Ativo</Label>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="producerId">Produtor Responsável</Label>
                          <Select 
                            value={productForm.producerId}
                            onValueChange={(value) => setProductForm({
                              ...productForm, 
                              producerId: value,
                              type: value === "internal" ? "internal" : "external"
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o produtor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="internal">
                                <div className="flex items-center">
                                  <Package className="h-4 w-4 text-blue-500 mr-2" />
                                  Produtos Internos da Empresa
                                </div>
                              </SelectItem>
                              {producers?.map((producer: any) => (
                                <SelectItem key={producer.id} value={producer.id}>
                                  <div className="flex items-center">
                                    <Factory className="h-4 w-4 text-purple-500 mr-2" />
                                    {producer.name} - {producer.specialty}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className={`p-3 rounded-lg border ${
                          productForm.producerId === "internal" ? "bg-blue-50" : "bg-purple-50"
                        }`}>
                          <div className="flex items-center space-x-2 mb-2">
                            {productForm.producerId === "internal" ? (
                              <Package className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Factory className="h-4 w-4 text-purple-600" />
                            )}
                            <Label className={`font-medium ${
                              productForm.producerId === "internal" ? "text-blue-700" : "text-purple-700"
                            }`}>
                              Tipo de Produto
                            </Label>
                          </div>
                          <p className={`text-sm ${
                            productForm.producerId === "internal" ? "text-blue-600" : "text-purple-600"
                          }`}>
                            {productForm.producerId === "internal" 
                              ? "Este produto será cadastrado como PRODUTO INTERNO da empresa"
                              : `Este produto será associado ao produtor ${producers?.find(p => p.id === productForm.producerId)?.name || 'selecionado'}`
                            }
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="details" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="weight">Peso (kg)</Label>
                            <Input
                              id="weight"
                              type="number"
                              step="0.01"
                              value={productForm.weight}
                              onChange={(e) => setProductForm({...productForm, weight: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="height">Altura (cm)</Label>
                            <Input
                              id="height"
                              type="number"
                              step="0.1"
                              value={productForm.height}
                              onChange={(e) => setProductForm({...productForm, height: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="width">Largura (cm)</Label>
                            <Input
                              id="width"
                              type="number"
                              step="0.1"
                              value={productForm.width}
                              onChange={(e) => setProductForm({...productForm, width: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="depth">Profundidade (cm)</Label>
                            <Input
                              id="depth"
                              type="number"
                              step="0.1"
                              value={productForm.depth}
                              onChange={(e) => setProductForm({...productForm, depth: e.target.value})}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="appearance" className="space-y-4">
                        <div>
                          <Label htmlFor="imageLink">Link da Imagem</Label>
                          <Input
                            id="imageLink"
                            type="url"
                            value={productForm.imageLink}
                            onChange={(e) => setProductForm({...productForm, imageLink: e.target.value})}
                            placeholder="https://exemplo.com/imagem.jpg"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="mainColor">Cor Principal</Label>
                            <Input
                              id="mainColor"
                              value={productForm.mainColor}
                              onChange={(e) => setProductForm({...productForm, mainColor: e.target.value})}
                              placeholder="Ex: Branco, Marrom, etc."
                            />
                          </div>
                          <div>
                            <Label htmlFor="secondaryColor">Cor Secundária</Label>
                            <Input
                              id="secondaryColor"
                              value={productForm.secondaryColor}
                              onChange={(e) => setProductForm({...productForm, secondaryColor: e.target.value})}
                              placeholder="Ex: Preto, Dourado, etc."
                            />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createProductMutation.isPending || updateProductMutation.isPending}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      >
                        {editingProduct ? "Atualizar" : "Criar"} Produto
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          <div className="min-w-48">
              <Select value={selectedCategory} onValueChange={(val) => {
                setSelectedCategory(val);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'Todas as categorias' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-48">
              <Select value={selectedProducer} onValueChange={(val) => {
                setSelectedProducer(val);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os produtores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtores</SelectItem>
                  <SelectItem value="internal">Produtos Internos</SelectItem>
                  {producers?.map((producer: any) => (
                    <SelectItem key={producer.id} value={producer.id}>
                      {producer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Table */}
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
              <p className="text-gray-500 mb-6">Comece adicionando produtos internos ou importando de produtores.</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => setIsProductDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar JSON
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagem</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo/Produtor</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedProducts.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.imageLink ? (
                        <img 
                          src={product.imageLink} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{product.name}</p>
                          {product.code && (
                            <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 text-purple-600 border-purple-200 bg-purple-50">
                              {product.code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {product.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category || 'Sem categoria'}</Badge>
                    </TableCell>
                    <TableCell>
                      {product.producerId === 'internal' ? (
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-blue-500 mr-1" />
                          <Badge className="bg-blue-100 text-blue-800">Interno</Badge>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Factory className="h-4 w-4 text-purple-500 mr-1" />
                          <Badge variant="secondary">{product.producerName}</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        R$ {parseFloat(product.basePrice || '0').toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                      <p className="text-sm text-gray-500">por {product.unit}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-500">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalProducts)} de {totalProducts} produtos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-400">...</span>
                      <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-8 h-8 p-0"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
