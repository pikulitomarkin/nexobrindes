import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { 
  Plus, Upload, FileText, Search, Edit, Trash2, Package, 
  Calculator, Eye, Users, ShoppingCart, Image, Percent,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { PDFGenerator, type BudgetPDFData } from "@/utils/pdfGenerator";

export default function AdminProducts() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("products");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [budgetProductSearch, setBudgetProductSearch] = useState("");
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState("all");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
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
    secondaryColor: ""
  });

  // Budget form state
  const [budgetForm, setBudgetForm] = useState({
    title: "",
    description: "",
    clientId: "",
    vendorId: "",
    validUntil: "",
    hasCustomization: false,
    customizationPercentage: "10.00",
    customizationDescription: "",
    items: [] as any[],
    photos: [] as string[]
  });

  // Vendor form state
  const [vendorForm, setVendorForm] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    phone: "",
    commissionRate: "10.00",
    isActive: true
  });

  // Client form state
  const [clientForm, setClientForm] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    phone: "",
    vendorId: "",
    isActive: true
  });

  // Order form state (reuse budget form structure but for direct orders)
  const [orderForm, setOrderForm] = useState({
    clientId: "",
    vendorId: "",
    description: "",
    deadline: "",
    hasCustomization: false,
    customizationPercentage: "0",
    customizationDescription: "",
    items: [] as any[]
  });

  // Queries
  const productsQuery = useQuery({
    queryKey: ["/api/products", { 
      page: currentPage, 
      limit: pageSize,
      search: searchTerm || undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined
    }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams();
      
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.category) searchParams.append('category', params.category);
      
      const response = await fetch(`/api/products?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const budgetsQuery = useQuery({
    queryKey: ["/api/budgets"],
  });

  const usersQuery = useQuery({
    queryKey: ["/api/users"],
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (data: typeof productForm) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar produto");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Produto criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      resetProductForm();
      setIsProductDialogOpen(false);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof productForm }) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar produto");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Produto atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      resetProductForm();
      setEditingProduct(null);
      setIsProductDialogOpen(false);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Erro ao deletar produto");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Produto deletado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const importProductsMutation = useMutation({
    mutationFn: async (file: File) => {
      // Check file size on client side
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. O limite é de 50MB.');
      }

      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/products/import', {
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
          : `${data.imported} produtos importados com sucesso!`,
        variant: hasErrors ? "default" : "default",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsImportDialogOpen(false);
      setImportFile(null);
      setImportProgress(0);
      
      // Log errors for debugging
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

  const createBudgetMutation = useMutation({
    mutationFn: async (data: typeof budgetForm) => {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar orçamento");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Orçamento criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      resetBudgetForm();
      setIsBudgetDialogOpen(false);
    },
  });

  const convertBudgetMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const response = await fetch(`/api/budgets/${budgetId}/convert`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Erro ao converter orçamento");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Orçamento convertido em pedido!" });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const generatePDFMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const response = await fetch(`/api/budgets/${budgetId}/pdf-data`);
      if (!response.ok) throw new Error("Erro ao buscar dados do orçamento");
      return response.json() as BudgetPDFData;
    },
    onSuccess: async (data) => {
      try {
        const pdfGenerator = new PDFGenerator();
        const pdfBlob = await pdfGenerator.generateBudgetPDF(data);
        
        // Create download link
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orcamento-${data.budget.budgetNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({ title: "Sucesso", description: "PDF gerado com sucesso!" });
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast({
          title: "Erro",
          description: "Erro ao gerar PDF. Tente novamente.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao buscar dados do orçamento.",
        variant: "destructive"
      });
    }
  });

  // Vendor mutations
  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: any) => {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorData),
      });
      if (!response.ok) throw new Error("Erro ao criar vendedor");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Vendedor criado com sucesso!" });
      setVendorForm({
        name: "",
        username: "",
        password: "",
        email: "",
        phone: "",
        commissionRate: "10.00",
        isActive: true
      });
      setIsVendorDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  // Client mutations
  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });
      if (!response.ok) throw new Error("Erro ao criar cliente");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Cliente criado com sucesso!" });
      setClientForm({
        name: "",
        username: "",
        password: "",
        email: "",
        phone: "",
        vendorId: "",
        isActive: true
      });
      setIsClientDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  // Order mutations
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error("Erro ao criar pedido");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Pedido criado com sucesso!" });
      setOrderForm({
        clientId: "",
        vendorId: "",
        description: "",
        deadline: "",
        hasCustomization: false,
        customizationPercentage: "0",
        customizationDescription: "",
        items: []
      });
      setIsOrderDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
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
      secondaryColor: ""
    });
  };

  const resetBudgetForm = () => {
    setBudgetForm({
      title: "",
      description: "",
      clientId: "",
      vendorId: "",
      validUntil: "",
      hasCustomization: false,
      customizationPercentage: "10.00",
      customizationDescription: "",
      items: [],
      photos: []
    });
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm(product);
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este produto?')) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: productForm });
    } else {
      createProductMutation.mutate(productForm);
    }
  };

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBudgetMutation.mutate(budgetForm);
  };

  const handleImport = () => {
    if (importFile) {
      setImportProgress(25);
      importProductsMutation.mutate(importFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes('json') && !file.name.toLowerCase().endsWith('.json')) {
        toast({
          title: "Arquivo Inválido",
          description: "Por favor, selecione um arquivo JSON (.json).",
          variant: "destructive",
        });
        return;
      }

      // Validate file size
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Arquivo Muito Grande",
          description: "O arquivo deve ter no máximo 50MB.",
          variant: "destructive",
        });
        return;
      }

      // Validate file not empty
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

  const addProductToBudget = (product: any) => {
    const newItem = {
      productId: product.id,
      productName: product.name,
      quantity: "1",
      unitPrice: product.basePrice,
      totalPrice: product.basePrice,
      hasItemCustomization: false,
      itemCustomizationPercentage: "0.00",
      itemCustomizationDescription: ""
    };
    setBudgetForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeProductFromBudget = (index: number) => {
    setBudgetForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateBudgetTotal = () => {
    const itemsTotal = budgetForm.items.reduce((sum, item) => {
      const itemPrice = parseFloat(item.totalPrice || '0');
      
      // Apply item customization
      if (item.hasItemCustomization) {
        const customizationPercentage = parseFloat(item.itemCustomizationPercentage || '0');
        const customizationAmount = itemPrice * (customizationPercentage / 100);
        return sum + itemPrice + customizationAmount;
      }
      
      return sum + itemPrice;
    }, 0);

    // Apply global customization
    if (budgetForm.hasCustomization) {
      const customizationPercentage = parseFloat(budgetForm.customizationPercentage || '0');
      const customizationAmount = itemsTotal * (customizationPercentage / 100);
      return itemsTotal + customizationAmount;
    }

    return itemsTotal;
  };

  // Data processing
  const productsData = productsQuery.data;
  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;
  const totalPages = productsData?.totalPages || 1;

  // Filter products for budget creation
  const filteredBudgetProducts = products.filter((product: any) => {
    const matchesSearch = !budgetProductSearch || 
      product.name.toLowerCase().includes(budgetProductSearch.toLowerCase()) ||
      product.description?.toLowerCase().includes(budgetProductSearch.toLowerCase()) ||
      product.id.toLowerCase().includes(budgetProductSearch.toLowerCase());
    
    const matchesCategory = budgetCategoryFilter === "all" || 
      product.category === budgetCategoryFilter;
    
    return matchesSearch && matchesCategory;
  });
  
  const budgets = budgetsQuery.data || [];
  const users = usersQuery.data || [];
  const clients = users.filter((u: any) => u.role === 'client');
  const vendors = users.filter((u: any) => u.role === 'vendor');
  
  // For categories, we'll get them from all products (not just current page)
  const allProductsQuery = useQuery({
    queryKey: ["/api/products/all-categories"],
    queryFn: async () => {
      const response = await fetch('/api/products?limit=9999');
      if (!response.ok) throw new Error('Failed to fetch all products');
      const data = await response.json();
      return data.products || [];
    },
  });
  
  const categories = ['all', ...new Set((allProductsQuery.data || []).map((product: any) => product.category).filter(Boolean))];

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
          <h1 className="text-3xl font-bold gradient-text">Gestão de Produtos & Orçamentos</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gerencie produtos, crie orçamentos com personalização e converta em pedidos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="budgets" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Orçamentos
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Vendedores
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Pedidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Catálogo de Produtos</h2>
            <div className="flex gap-2">
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar JSON
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Importar Produtos</DialogTitle>
                    <DialogDescription>
                      Faça upload de um arquivo JSON com os produtos
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
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
                        <div className="flex justify-between text-sm">
                          <span>Arquivo selecionado:</span>
                          <span className="font-medium">{importFile.name}</span>
                        </div>
                        <Progress value={importProgress} className="w-full" />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsImportDialogOpen(false);
                          setImportFile(null);
                          setImportProgress(0);
                        }}
                        disabled={importProductsMutation.isPending}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleImport}
                        disabled={!importFile || importProductsMutation.isPending}
                        className="flex-1"
                      >
                        {importProductsMutation.isPending ? 'Importando...' : 'Importar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-bg text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Editar Produto' : 'Criar Novo Produto'}
                    </DialogTitle>
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
                              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="category">Categoria</Label>
                            <Input
                              id="category"
                              value={productForm.category}
                              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Descrição</Label>
                          <Textarea
                            id="description"
                            rows={3}
                            value={productForm.description}
                            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="basePrice">Preço Base (R$)</Label>
                            <Input
                              id="basePrice"
                              type="number"
                              step="0.01"
                              min="0"
                              value={productForm.basePrice}
                              onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="unit">Unidade</Label>
                            <Select value={productForm.unit} onValueChange={(value) => setProductForm({ ...productForm, unit: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="un">Unidade</SelectItem>
                                <SelectItem value="kg">Quilograma</SelectItem>
                                <SelectItem value="m">Metro</SelectItem>
                                <SelectItem value="m2">Metro²</SelectItem>
                                <SelectItem value="l">Litro</SelectItem>
                                <SelectItem value="cx">Caixa</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="isActive"
                                checked={productForm.isActive}
                                onCheckedChange={(checked) => setProductForm({ ...productForm, isActive: checked })}
                              />
                              <Label htmlFor="isActive">Ativo</Label>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="details" className="space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label htmlFor="weight">Peso (g)</Label>
                            <Input
                              id="weight"
                              type="number"
                              step="0.01"
                              min="0"
                              value={productForm.weight}
                              onChange={(e) => setProductForm({ ...productForm, weight: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="height">Altura (cm)</Label>
                            <Input
                              id="height"
                              type="number"
                              step="0.01"
                              min="0"
                              value={productForm.height}
                              onChange={(e) => setProductForm({ ...productForm, height: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="width">Largura (cm)</Label>
                            <Input
                              id="width"
                              type="number"
                              step="0.01"
                              min="0"
                              value={productForm.width}
                              onChange={(e) => setProductForm({ ...productForm, width: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="depth">Profundidade (cm)</Label>
                            <Input
                              id="depth"
                              type="number"
                              step="0.01"
                              min="0"
                              value={productForm.depth}
                              onChange={(e) => setProductForm({ ...productForm, depth: e.target.value })}
                            />
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="appearance" className="space-y-4">
                        <div>
                          <Label htmlFor="imageLink">URL da Imagem</Label>
                          <Input
                            id="imageLink"
                            type="url"
                            value={productForm.imageLink}
                            onChange={(e) => setProductForm({ ...productForm, imageLink: e.target.value })}
                            placeholder="https://exemplo.com/imagem.jpg"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="mainColor">Cor Principal</Label>
                            <Input
                              id="mainColor"
                              value={productForm.mainColor}
                              onChange={(e) => setProductForm({ ...productForm, mainColor: e.target.value })}
                              placeholder="Ex: Azul, Vermelho"
                            />
                          </div>
                          <div>
                            <Label htmlFor="secondaryColor">Cor Secundária</Label>
                            <Input
                              id="secondaryColor"
                              value={productForm.secondaryColor}
                              onChange={(e) => setProductForm({ ...productForm, secondaryColor: e.target.value })}
                              placeholder="Ex: Branco, Preto"
                            />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        variant="outline" 
                        type="button" 
                        onClick={() => {
                          setIsProductDialogOpen(false);
                          setEditingProduct(null);
                          resetProductForm();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createProductMutation.isPending || updateProductMutation.isPending}
                      >
                        {(createProductMutation.isPending || updateProductMutation.isPending) 
                          ? (editingProduct ? "Salvando..." : "Criando...") 
                          : (editingProduct ? "Salvar" : "Criar")}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar produtos por nome, descrição ou categoria..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to first page when searching
                      }}
                      className="pl-10"
                      data-testid="input-product-search"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={(value) => {
                  setSelectedCategory(value);
                  setCurrentPage(1); // Reset to first page when changing category
                }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.slice(1).map((category: string) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(parseInt(value, 10));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 por página</SelectItem>
                    <SelectItem value="20">20 por página</SelectItem>
                    <SelectItem value="50">50 por página</SelectItem>
                    <SelectItem value="100">100 por página</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Produtos ({totalProducts})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Nenhum produto encontrado
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchTerm || selectedCategory !== 'all' 
                      ? 'Tente ajustar os filtros de busca.' 
                      : 'Comece adicionando seu primeiro produto ou importando de um arquivo JSON.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product: any) => (
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
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">
                              {product.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category || 'Sem categoria'}</Badge>
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
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditProduct(product)}
                              data-testid={`edit-product-${product.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDeleteProduct(product.id)}
                              data-testid={`delete-product-${product.id}`}
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
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalProducts)} de {totalProducts} produtos
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-previous-page"
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
                            data-testid={`button-page-${page}`}
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
                            data-testid={`button-page-${totalPages}`}
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
                      data-testid="button-next-page"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Orçamentos</h2>
            <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-bg text-white">
                  <Calculator className="h-4 w-4 mr-2" />
                  Novo Orçamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Novo Orçamento</DialogTitle>
                  <DialogDescription>
                    Crie um orçamento personalizado com produtos do catálogo
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBudgetSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="budget-title">Título do Orçamento</Label>
                      <Input
                        id="budget-title"
                        value={budgetForm.title}
                        onChange={(e) => setBudgetForm({ ...budgetForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="budget-validUntil">Válido Até</Label>
                      <Input
                        id="budget-validUntil"
                        type="date"
                        value={budgetForm.validUntil}
                        onChange={(e) => setBudgetForm({ ...budgetForm, validUntil: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="budget-description">Descrição</Label>
                    <Textarea
                      id="budget-description"
                      rows={2}
                      value={budgetForm.description}
                      onChange={(e) => setBudgetForm({ ...budgetForm, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="budget-client">Cliente</Label>
                      <Select value={budgetForm.clientId} onValueChange={(value) => setBudgetForm({ ...budgetForm, clientId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client: any) => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="budget-vendor">Vendedor</Label>
                      <Select value={budgetForm.vendorId} onValueChange={(value) => setBudgetForm({ ...budgetForm, vendorId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((vendor: any) => (
                            <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* Customization Options */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="budget-customization"
                        checked={budgetForm.hasCustomization}
                        onCheckedChange={(checked) => setBudgetForm({ ...budgetForm, hasCustomization: checked })}
                      />
                      <Label htmlFor="budget-customization" className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Aplicar Personalização Global
                      </Label>
                    </div>
                    
                    {budgetForm.hasCustomization && (
                      <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                        <div>
                          <Label htmlFor="budget-customization-percentage">Percentual (%)</Label>
                          <Input
                            id="budget-customization-percentage"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={budgetForm.customizationPercentage}
                            onChange={(e) => setBudgetForm({ ...budgetForm, customizationPercentage: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="budget-customization-description">Descrição da Personalização</Label>
                          <Input
                            id="budget-customization-description"
                            value={budgetForm.customizationDescription}
                            onChange={(e) => setBudgetForm({ ...budgetForm, customizationDescription: e.target.value })}
                            placeholder="Ex: Gravação personalizada, cor especial..."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Product Selection */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Produtos do Orçamento</h3>
                    
                    {/* Selected Products */}
                    {budgetForm.items.length > 0 && (
                      <div className="space-y-2">
                        {budgetForm.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-gray-500">
                                {item.quantity}x R$ {parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = 
                                R$ {parseFloat(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeProductFromBudget(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Products */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Adicionar Produtos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Budget Product Search */}
                        <div className="mb-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                placeholder="Buscar produtos..."
                                value={budgetProductSearch}
                                onChange={(e) => setBudgetProductSearch(e.target.value)}
                                className="pl-9"
                                data-testid="input-budget-product-search"
                              />
                            </div>
                            <Select value={budgetCategoryFilter} onValueChange={setBudgetCategoryFilter}>
                              <SelectTrigger data-testid="select-budget-category">
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
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>{filteredBudgetProducts.length} produtos encontrados</span>
                            {(budgetProductSearch || budgetCategoryFilter !== "all") && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setBudgetProductSearch("");
                                  setBudgetCategoryFilter("all");
                                }}
                              >
                                Limpar filtros
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                          {filteredBudgetProducts.length === 0 ? (
                            <div className="col-span-full text-center py-8">
                              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-gray-500">
                                {budgetProductSearch || budgetCategoryFilter !== "all" ? 
                                  "Nenhum produto encontrado com os filtros aplicados" : 
                                  "Nenhum produto disponível"}
                              </p>
                            </div>
                          ) : (
                            filteredBudgetProducts.map((product: any) => (
                              <div key={product.id} className="p-2 border rounded hover:bg-gray-50 cursor-pointer" 
                                   onClick={() => addProductToBudget(product)}>
                                <div className="flex items-center gap-2">
                                  {product.imageLink ? (
                                    <img src={product.imageLink} alt={product.name} className="w-8 h-8 object-cover rounded" />
                                  ) : (
                                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                      <Package className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{product.name}</p>
                                    <p className="text-xs text-gray-500">
                                      R$ {parseFloat(product.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Budget Total */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total do Orçamento:</span>
                      <span className="text-blue-600">
                        R$ {calculateBudgetTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {budgetForm.hasCustomization && (
                      <p className="text-sm text-gray-600 mt-1">
                        Inclui {budgetForm.customizationPercentage}% de personalização
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      type="button" 
                      onClick={() => {
                        setIsBudgetDialogOpen(false);
                        resetBudgetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createBudgetMutation.isPending || budgetForm.items.length === 0}
                    >
                      {createBudgetMutation.isPending ? "Criando..." : "Criar Orçamento"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Budgets List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Lista de Orçamentos ({budgets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {budgets.length === 0 ? (
                <div className="text-center py-12">
                  <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Nenhum orçamento criado
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Comece criando seu primeiro orçamento usando os produtos do catálogo.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {budgets.map((budget: any) => (
                    <Card key={budget.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{budget.title}</CardTitle>
                            <p className="text-sm text-gray-500">#{budget.budgetNumber}</p>
                          </div>
                          <Badge variant={
                            budget.status === 'approved' ? 'default' : 
                            budget.status === 'sent' ? 'secondary' : 
                            budget.status === 'converted' ? 'outline' : 'secondary'
                          }>
                            {budget.status === 'draft' ? 'Rascunho' :
                             budget.status === 'sent' ? 'Enviado' :
                             budget.status === 'approved' ? 'Aprovado' :
                             budget.status === 'converted' ? 'Convertido' : budget.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Valor Total:</span>
                            <span className="font-semibold text-green-600">
                              R$ {parseFloat(budget.totalValue || '0').toLocaleString('pt-BR', { 
                                minimumFractionDigits: 2 
                              })}
                            </span>
                          </div>
                          {budget.hasCustomization && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Personalização:</span>
                              <span className="text-sm font-medium">
                                {budget.customizationPercentage}%
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Status:</span>
                            <span className="text-sm">{budget.status}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => generatePDFMutation.mutate(budget.id)}
                            disabled={generatePDFMutation.isPending}
                            className="flex-1"
                            data-testid={`button-pdf-${budget.id}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {generatePDFMutation.isPending ? 'Gerando...' : 'PDF'}
                          </Button>
                          {budget.status === 'approved' && (
                            <Button 
                              size="sm" 
                              onClick={() => convertBudgetMutation.mutate(budget.id)}
                              disabled={convertBudgetMutation.isPending}
                              className="flex-1"
                            >
                              <ShoppingCart className="h-4 w-4 mr-1" />
                              {convertBudgetMutation.isPending ? 'Convertendo...' : 'Converter'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Gestão de Vendedores</h2>
            <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Vendedor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Cadastrar Vendedor</DialogTitle>
                  <DialogDescription>
                    Adicione um novo vendedor ao sistema
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createVendorMutation.mutate(vendorForm);
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendor-name">Nome</Label>
                      <Input
                        id="vendor-name"
                        value={vendorForm.name}
                        onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="vendor-username">Usuário</Label>
                      <Input
                        id="vendor-username"
                        value={vendorForm.username}
                        onChange={(e) => setVendorForm({ ...vendorForm, username: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="vendor-password">Senha</Label>
                    <Input
                      id="vendor-password"
                      type="password"
                      value={vendorForm.password}
                      onChange={(e) => setVendorForm({ ...vendorForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendor-email">Email</Label>
                      <Input
                        id="vendor-email"
                        type="email"
                        value={vendorForm.email}
                        onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="vendor-phone">Telefone</Label>
                      <Input
                        id="vendor-phone"
                        value={vendorForm.phone}
                        onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="vendor-commission">Taxa de Comissão (%)</Label>
                    <Input
                      id="vendor-commission"
                      type="number"
                      step="0.01"
                      value={vendorForm.commissionRate}
                      onChange={(e) => setVendorForm({ ...vendorForm, commissionRate: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createVendorMutation.isPending}>
                    {createVendorMutation.isPending ? "Criando..." : "Criar Vendedor"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendors.map((vendor: any) => (
                  <Card key={vendor.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{vendor.name}</CardTitle>
                      <Badge variant={vendor.isActive ? "default" : "secondary"}>
                        {vendor.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Email:</span>
                          <span className="text-sm">{vendor.email || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Telefone:</span>
                          <span className="text-sm">{vendor.phone || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Comissão:</span>
                          <span className="text-sm">{vendor.commissionRate || "10.00"}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Gestão de Clientes</h2>
            <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Cadastrar Cliente</DialogTitle>
                  <DialogDescription>
                    Adicione um novo cliente vinculado a um vendedor
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createClientMutation.mutate(clientForm);
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="client-name">Nome</Label>
                      <Input
                        id="client-name"
                        value={clientForm.name}
                        onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="client-username">Usuário</Label>
                      <Input
                        id="client-username"
                        value={clientForm.username}
                        onChange={(e) => setClientForm({ ...clientForm, username: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="client-password">Senha</Label>
                    <Input
                      id="client-password"
                      type="password"
                      value={clientForm.password}
                      onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="client-vendor">Vendedor Responsável</Label>
                    <Select value={clientForm.vendorId} onValueChange={(value) => setClientForm({ ...clientForm, vendorId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor: any) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="client-email">Email</Label>
                      <Input
                        id="client-email"
                        type="email"
                        value={clientForm.email}
                        onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="client-phone">Telefone</Label>
                      <Input
                        id="client-phone"
                        value={clientForm.phone}
                        onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createClientMutation.isPending}>
                    {createClientMutation.isPending ? "Criando..." : "Criar Cliente"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((client: any) => {
                  const clientVendor = vendors.find((v: any) => v.id === client.vendorId);
                  return (
                    <Card key={client.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        <Badge variant={client.isActive ? "default" : "secondary"}>
                          {client.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Email:</span>
                            <span className="text-sm">{client.email || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Telefone:</span>
                            <span className="text-sm">{client.phone || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Vendedor:</span>
                            <span className="text-sm">{clientVendor?.name || "N/A"}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Gestão de Pedidos</h2>
            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Pedido
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Novo Pedido</DialogTitle>
                  <DialogDescription>
                    Crie um pedido usando os produtos do catálogo
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createOrderMutation.mutate({
                    ...orderForm,
                    totalValue: orderForm.items.reduce((sum, item) => sum + parseFloat(item.totalPrice || '0'), 0)
                  });
                }} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="order-client">Cliente</Label>
                      <Select value={orderForm.clientId} onValueChange={(value) => setOrderForm({ ...orderForm, clientId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client: any) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="order-vendor">Vendedor</Label>
                      <Select value={orderForm.vendorId} onValueChange={(value) => setOrderForm({ ...orderForm, vendorId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((vendor: any) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="order-description">Descrição</Label>
                    <Textarea
                      id="order-description"
                      value={orderForm.description}
                      onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
                      placeholder="Descreva os detalhes do pedido..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="order-deadline">Prazo de Entrega</Label>
                    <Input
                      id="order-deadline"
                      type="datetime-local"
                      value={orderForm.deadline}
                      onChange={(e) => setOrderForm({ ...orderForm, deadline: e.target.value })}
                    />
                  </div>

                  {/* Customization Section - Same as Budget */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="order-customization"
                        checked={orderForm.hasCustomization}
                        onCheckedChange={(checked) => setOrderForm({ ...orderForm, hasCustomization: checked })}
                      />
                      <Label htmlFor="order-customization" className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Aplicar Personalização
                      </Label>
                    </div>
                    
                    {orderForm.hasCustomization && (
                      <div className="grid grid-cols-2 gap-4 bg-orange-50 p-4 rounded-lg">
                        <div>
                          <Label htmlFor="order-customization-percentage">Percentual (%)</Label>
                          <Input
                            id="order-customization-percentage"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={orderForm.customizationPercentage}
                            onChange={(e) => setOrderForm({ ...orderForm, customizationPercentage: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="order-customization-description">Descrição da Personalização</Label>
                          <Input
                            id="order-customization-description"
                            value={orderForm.customizationDescription}
                            onChange={(e) => setOrderForm({ ...orderForm, customizationDescription: e.target.value })}
                            placeholder="Ex: Gravação personalizada, cor especial..."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Product Selection - Reuse from Budget */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Produtos do Pedido</h3>
                    
                    {orderForm.items.length > 0 && (
                      <div className="space-y-2">
                        {orderForm.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-gray-500">
                                {item.quantity}x R$ {parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = 
                                R$ {parseFloat(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setOrderForm({
                                ...orderForm,
                                items: orderForm.items.filter((_, i) => i !== index)
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Adicionar Produtos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                          {products.map((product: any) => (
                            <div key={product.id} className="p-2 border rounded hover:bg-gray-50 cursor-pointer" 
                                 onClick={() => {
                                   const existingItemIndex = orderForm.items.findIndex(item => item.productId === product.id);
                                   if (existingItemIndex >= 0) {
                                     const newItems = [...orderForm.items];
                                     newItems[existingItemIndex].quantity += 1;
                                     newItems[existingItemIndex].totalPrice = (newItems[existingItemIndex].quantity * parseFloat(product.basePrice)).toString();
                                     setOrderForm({ ...orderForm, items: newItems });
                                   } else {
                                     setOrderForm({
                                       ...orderForm,
                                       items: [...orderForm.items, {
                                         productId: product.id,
                                         productName: product.name,
                                         quantity: 1,
                                         unitPrice: product.basePrice,
                                         totalPrice: product.basePrice
                                       }]
                                     });
                                   }
                                 }}>
                              <div className="flex items-center gap-2">
                                {product.imageLink ? (
                                  <img src={product.imageLink} alt={product.name} className="w-8 h-8 object-cover rounded" />
                                ) : (
                                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                    <Package className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{product.name}</p>
                                  <p className="text-xs text-gray-500">
                                    R$ {parseFloat(product.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total do Pedido:</span>
                      <span className="text-orange-600">
                        R$ {orderForm.items.reduce((sum, item) => {
                          const itemTotal = parseFloat(item.totalPrice || '0');
                          const customizationAmount = orderForm.hasCustomization ? 
                            itemTotal * (parseFloat(orderForm.customizationPercentage) / 100) : 0;
                          return sum + itemTotal + customizationAmount;
                        }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {orderForm.hasCustomization && (
                      <p className="text-sm text-gray-600 mt-1">
                        Inclui {orderForm.customizationPercentage}% de personalização
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={createOrderMutation.isPending}>
                    {createOrderMutation.isPending ? "Criando..." : "Criar Pedido"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Show orders here - need to fetch from API */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}