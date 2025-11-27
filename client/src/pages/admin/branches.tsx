
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Building2, MapPin, Crown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const branchFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  cnpj: z.string().optional(),
  address: z.string().optional(),
  isHeadquarters: z.boolean().default(false),
});

type BranchFormValues = z.infer<typeof branchFormSchema>;

export default function AdminBranches() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const { toast } = useToast();

  const { data: branches, isLoading } = useQuery({
    queryKey: ["/api/branches"],
  });

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: "",
      city: "",
      cnpj: "",
      address: "",
      isHeadquarters: false,
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async (data: BranchFormValues) => {
      const response = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar filial");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso!",
        description: "Filial criada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a filial",
        variant: "destructive",
      });
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: async (data: BranchFormValues & { id: string }) => {
      const response = await fetch(`/api/branches/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar filial");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setEditingBranch(null);
      form.reset();
      toast({
        title: "Sucesso!",
        description: "Filial atualizada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar a filial",
        variant: "destructive",
      });
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (branchId: string) => {
      const response = await fetch(`/api/branches/${branchId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir filial");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({
        title: "Sucesso!",
        description: "Filial excluída com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteBranch = (branchId: string, branchName: string) => {
    if (confirm(`Tem certeza que deseja excluir a filial "${branchName}"?`)) {
      deleteBranchMutation.mutate(branchId);
    }
  };

  const onSubmit = (data: BranchFormValues) => {
    if (editingBranch) {
      updateBranchMutation.mutate({ ...data, id: editingBranch.id });
    } else {
      createBranchMutation.mutate(data);
    }
  };

  const handleEdit = (branch: any) => {
    setEditingBranch(branch);
    form.reset({
      name: branch.name,
      city: branch.city,
      cnpj: branch.cnpj || "",
      address: branch.address || "",
      isHeadquarters: branch.isHeadquarters || false,
    });
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      setIsCreateDialogOpen(false);
      setEditingBranch(null);
      form.reset();
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Filiais</h1>
          <p className="text-gray-600">Cadastre e gerencie filiais da empresa</p>
        </div>
        <Dialog open={isCreateDialogOpen || !!editingBranch} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button 
              className="gradient-bg text-white"
              onClick={() => {
                setIsCreateDialogOpen(true);
                setEditingBranch(null);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Filial
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingBranch ? "Editar Filial" : "Cadastrar Nova Filial"}
              </DialogTitle>
              <DialogDescription>
                {editingBranch ? "Altere os dados da filial" : "Preencha os dados da nova filial"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Filial *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Filial São Paulo Centro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 00.000.000/0000-00" {...field} data-testid="input-cnpj" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Rua das Flores, 123 - Centro, São Paulo/SP - CEP 01000-000" {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isHeadquarters"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Matriz</FormLabel>
                        <FormDescription className="text-sm text-gray-600">
                          Marque se esta é a matriz da empresa
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCloseDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-bg text-white"
                    disabled={createBranchMutation.isPending || updateBranchMutation.isPending}
                  >
                    {createBranchMutation.isPending || updateBranchMutation.isPending
                      ? (editingBranch ? "Atualizando..." : "Criando...")
                      : (editingBranch ? "Atualizar" : "Criar Filial")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Filiais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches?.map((branch: any) => (
              <Card key={branch.id} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        branch.isHeadquarters ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        {branch.isHeadquarters ? (
                          <Crown className="h-6 w-6 text-yellow-600" />
                        ) : (
                          <Building2 className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">{branch.name}</h3>
                        {branch.isHeadquarters && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                            <Crown className="h-3 w-3 mr-1" />
                            Matriz
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(branch)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBranch(branch.id, branch.name)}
                      title="Excluir"
                      disabled={deleteBranchMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{branch.city}</span>
                    </div>
                    {branch.cnpj && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>CNPJ: {branch.cnpj}</span>
                      </div>
                    )}
                    {branch.address && (
                      <div className="flex items-start text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="break-words">{branch.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${branch.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {branch.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Criada em:</span>
                      <span className="font-medium">
                        {new Date(branch.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(!branches || branches.length === 0) && (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma filial cadastrada</p>
              <p className="text-gray-400 text-sm">Clique em "Nova Filial" para começar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
