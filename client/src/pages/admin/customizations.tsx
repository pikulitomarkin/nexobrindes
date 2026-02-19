
import { useState } from "react";
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
import { Plus, Search, Edit, Trash2, Palette, Upload, FileSpreadsheet, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

export default function AdminCustomizations() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomization, setEditingCustomization] = useState<any>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // Form state
  const [customizationForm, setCustomizationForm] = useState({
    name: "",
    description: "",
    category: "",
    minQuantity: "",
    price: "",
    isActive: true,
  });
  const [newCategory, setNewCategory] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Queries
  const customizationsQuery = useQuery({
    queryKey: ["/api/settings/customization-options"],
    queryFn: async () => {
      const response = await fetch('/api/settings/customization-options');
      if (!response.ok) throw new Error('Failed to fetch customization options');
      return response.json();
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["/api/customization-categories"],
    queryFn: async () => {
      const response = await fetch('/api/customization-categories');
      if (!response.ok) throw new Error('Failed to fetch customization categories');
      return response.json();
    },
  });

  // Mutations
  const createCustomizationMutation = useMutation({
    mutationFn: async (data: typeof customizationForm) => {
      const response = await fetch("/api/settings/customization-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          minQuantity: parseInt(data.minQuantity),
          price: parseFloat(data.price),
        }),
      });
      if (!response.ok) throw new Error("Erro ao criar personalização");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Personalização criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/customization-options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customization-categories"] });
      // Force refetch das categorias imediatamente
      categoriesQuery.refetch();
      resetForm();
      setIsDialogOpen(false);
    },
  });

  const updateCustomizationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof customizationForm }) => {
      const response = await fetch(`/api/settings/customization-options/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          minQuantity: parseInt(data.minQuantity),
          price: parseFloat(data.price),
        }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar personalização");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Personalização atualizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/customization-options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customization-categories"] });
      // Force refetch das categorias imediatamente
      categoriesQuery.refetch();
      resetForm();
      setEditingCustomization(null);
      setIsDialogOpen(false);
    },
  });

  const deleteCustomizationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/settings/customization-options/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Erro ao deletar personalização");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Personalização deletada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/customization-options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customization-categories"] });
    },
  });

  const importCustomizationsMutation = useMutation({
    mutationFn: async (customizations: any[]) => {
      const response = await fetch("/api/settings/customization-options/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customizations }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao importar personalizações");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Importação concluída!", 
        description: `${data.imported} personalizações importadas com sucesso!` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/customization-options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customization-categories"] });
      // Force refetch das categorias imediatamente
      categoriesQuery.refetch();
      setIsImportDialogOpen(false);
      setSelectedFile(null);
      setImportPreview([]);
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro na importação", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Helper functions
  const resetForm = () => {
    setCustomizationForm({
      name: "",
      description: "",
      category: "",
      minQuantity: "",
      price: "",
      isActive: true,
    });
    setNewCategory("");
    setIsCreatingCategory(false);
  };

  const handleEdit = (customization: any) => {
    setEditingCustomization(customization);
    setCustomizationForm({
      name: customization.name,
      description: customization.description || "",
      category: customization.category,
      minQuantity: customization.minQuantity.toString(),
      price: customization.price,
      isActive: customization.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta personalização?')) {
      deleteCustomizationMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomization) {
      updateCustomizationMutation.mutate({ id: editingCustomization.id, data: customizationForm });
    } else {
      createCustomizationMutation.mutate(customizationForm);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      processExcelFile(file);
    }
  };

  const processExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const processed = jsonData.map((row: any, index: number) => {
          const name = row['Nome'] || row['name'] || row['NOME'] || '';
          const category = row['Categoria'] || row['category'] || row['CATEGORIA'] || '';
          const minQuantity = parseInt(row['Quantidade Mínima'] || row['minQuantity'] || row['QUANTIDADE MINIMA'] || row['Qtd Mínima'] || '1');
          const price = parseFloat(row['Preço'] || row['price'] || row['PRECO'] || row['Valor'] || '0');
          const description = row['Descrição'] || row['description'] || row['DESCRICAO'] || '';
          const isActive = row['Ativo'] !== undefined ? 
            (row['Ativo'] === 'Sim' || row['Ativo'] === 'sim' || row['Ativo'] === true || row['Ativo'] === 'TRUE' || row['Ativo'] === 1) : 
            true;

          return {
            name,
            category,
            minQuantity,
            price,
            description,
            isActive,
            valid: name && category && minQuantity > 0 && price >= 0,
            row: index + 2
          };
        });

        setImportPreview(processed);

        const invalidRows = processed.filter((item: any) => !item.valid);
        if (invalidRows.length > 0) {
          toast({
            title: "Atenção",
            description: `${invalidRows.length} linha(s) com dados inválidos foram encontradas. Verifique o preview.`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Erro ao processar Excel:', error);
        toast({
          title: "Erro ao processar arquivo",
          description: "Não foi possível ler o arquivo Excel. Verifique o formato.",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = () => {
    const validCustomizations = importPreview
      .filter((item: any) => item.valid)
      .map((item: any) => ({
        name: item.name,
        category: item.category,
        minQuantity: item.minQuantity,
        price: item.price,
        description: item.description || '',
        isActive: item.isActive,
      }));

    if (validCustomizations.length === 0) {
      toast({
        title: "Nenhum dado válido",
        description: "Não há dados válidos para importar",
        variant: "destructive",
      });
      return;
    }

    importCustomizationsMutation.mutate(validCustomizations);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Nome': 'Serigrafia 1 cor',
        'Categoria': 'Camisetas',
        'Quantidade Mínima': 50,
        'Preço': 5.00,
        'Descrição': 'Personalização com serigrafia de uma cor',
        'Ativo': 'Sim'
      },
      {
        'Nome': 'Bordado Simples',
        'Categoria': 'Bonés',
        'Quantidade Mínima': 100,
        'Preço': 8.50,
        'Descrição': 'Bordado simples no boné',
        'Ativo': 'Sim'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personalizações');
    XLSX.writeFile(wb, 'modelo_personalizacoes.xlsx');
  };

  // Data processing
  const customizations = customizationsQuery.data || [];
  const categories = categoriesQuery.data || [];

  const filteredCustomizations = customizations.filter((customization: any) => {
    const matchesSearch = !searchTerm || 
      customization.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customization.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || customization.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (customizationsQuery.isLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Opções de Personalização</h1>
          <p className="text-gray-600 mt-2">
            Configure as opções de personalização por categoria e quantidade mínima
          </p>
        </div>
      </div>

      <Card className="shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold">Personalizações Disponíveis</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={downloadTemplate}
                className="bg-white text-purple-600 hover:bg-purple-50"
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Modelo
              </Button>
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-purple-600 hover:bg-purple-50" data-testid="button-import-excel">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Excel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Importar Personalizações do Excel</DialogTitle>
                    <DialogDescription>
                      Faça upload de um arquivo Excel (.xlsx ou .xls) com as personalizações. Use o modelo para garantir o formato correto.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="excel-file">Arquivo Excel</Label>
                      <Input
                        id="excel-file"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        data-testid="input-excel-file"
                      />
                    </div>
                    
                    {selectedFile && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">{selectedFile.name}</span>
                        </div>
                      </div>
                    )}

                    {importPreview.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Preview da Importação</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {importPreview.filter((item: any) => item.valid).length} de {importPreview.length} linhas válidas
                        </p>
                        <div className="max-h-96 overflow-y-auto border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Qtd Mín</TableHead>
                                <TableHead>Preço</TableHead>
                                <TableHead>Ativo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importPreview.map((item: any, index: number) => (
                                <TableRow key={index} className={!item.valid ? 'bg-red-50' : ''}>
                                  <TableCell>
                                    {item.valid ? (
                                      <Badge variant="default" className="bg-green-500">Válido</Badge>
                                    ) : (
                                      <Badge variant="destructive">Inválido</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>{item.name || '-'}</TableCell>
                                  <TableCell>{item.category || '-'}</TableCell>
                                  <TableCell>{item.minQuantity || '-'}</TableCell>
                                  <TableCell>R$ {item.price?.toFixed(2) || '0.00'}</TableCell>
                                  <TableCell>
                                    <Badge variant={item.isActive ? "default" : "secondary"}>
                                      {item.isActive ? "Sim" : "Não"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsImportDialogOpen(false);
                          setSelectedFile(null);
                          setImportPreview([]);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleImport}
                        disabled={importPreview.length === 0 || importCustomizationsMutation.isPending}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                        data-testid="button-confirm-import"
                      >
                        {importCustomizationsMutation.isPending ? "Importando..." : "Importar Personalizações"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setEditingCustomization(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-purple-600 hover:bg-purple-50" data-testid="button-new-customization">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Personalização
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingCustomization ? "Editar Personalização" : "Nova Personalização"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure uma opção de personalização que será oferecida para produtos da categoria selecionada
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Personalização</Label>
                    <Input
                      id="name"
                      value={customizationForm.name}
                      onChange={(e) => setCustomizationForm({...customizationForm, name: e.target.value})}
                      placeholder="Ex: Serigrafia 1 cor"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descrição (Opcional)</Label>
                    <Textarea
                      id="description"
                      value={customizationForm.description}
                      onChange={(e) => setCustomizationForm({...customizationForm, description: e.target.value})}
                      placeholder="Detalhes sobre a personalização..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Categoria do Produto</Label>
                    {!isCreatingCategory ? (
                      <div className="space-y-2">
                        <Select 
                          value={customizationForm.category}
                          onValueChange={(value) => {
                            if (value === "create-new") {
                              setIsCreatingCategory(true);
                              setCustomizationForm({...customizationForm, category: ""});
                            } else {
                              setCustomizationForm({...customizationForm, category: value});
                            }
                          }}
                          required={!isCreatingCategory}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category: string) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                            <SelectItem value="create-new" className="text-blue-600 font-medium">
                              + Criar nova categoria
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          placeholder="Digite o nome da nova categoria"
                          value={newCategory}
                          onChange={(e) => {
                            setNewCategory(e.target.value);
                            setCustomizationForm({...customizationForm, category: e.target.value});
                          }}
                          required
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsCreatingCategory(false);
                              setNewCategory("");
                              setCustomizationForm({...customizationForm, category: ""});
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (newCategory.trim()) {
                                setIsCreatingCategory(false);
                                // Adicionar temporariamente na lista local para aparecer imediatamente
                                const currentCategories = categoriesQuery.data || [];
                                if (!currentCategories.includes(newCategory)) {
                                  queryClient.setQueryData(["/api/customization-categories"], [...currentCategories, newCategory]);
                                }
                                toast({ 
                                  title: "Categoria criada", 
                                  description: `A categoria "${newCategory}" será criada junto com a personalização.` 
                                });
                              }
                            }}
                            disabled={!newCategory.trim()}
                          >
                            Confirmar categoria
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minQuantity">Quantidade Mínima</Label>
                      <Input
                        id="minQuantity"
                        type="number"
                        min="1"
                        value={customizationForm.minQuantity}
                        onChange={(e) => setCustomizationForm({...customizationForm, minQuantity: e.target.value})}
                        placeholder="50"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Valor (R$)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={customizationForm.price}
                        onChange={(e) => setCustomizationForm({...customizationForm, price: e.target.value})}
                        placeholder="50.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={customizationForm.isActive}
                      onCheckedChange={(checked) => setCustomizationForm({...customizationForm, isActive: checked})}
                    />
                    <Label>Personalização Ativa</Label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createCustomizationMutation.isPending || updateCustomizationMutation.isPending}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    >
                      {editingCustomization ? "Atualizar" : "Criar"} Personalização
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
                  placeholder="Buscar personalizações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
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
            </div>
          </div>

          {/* Customizations Table */}
          {filteredCustomizations.length === 0 ? (
            <div className="text-center py-12">
              <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma personalização encontrada</h3>
              <p className="text-gray-500 mb-6">Comece criando opções de personalização para seus produtos.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Personalização
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Qtd. Mínima</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomizations.map((customization: any, index: number) => (
                  <TableRow key={`${customization.id}-${index}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{customization.name}</p>
                        {customization.description && (
                          <p className="text-sm text-gray-500 line-clamp-1">
                            {customization.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customization.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{customization.minQuantity} un</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">
                        R$ {parseFloat(customization.price).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customization.isActive ? "default" : "secondary"}>
                        {customization.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(customization)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDelete(customization.id)}
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
        </CardContent>
      </Card>
    </div>
  );
}
