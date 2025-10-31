
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, Plus, Edit, Trash2, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Partner {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
  createdAt: string;
  isActive: boolean;
}

export default function AdminPartners() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerForm, setPartnerForm] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (partnerData: typeof partnerForm) => {
      console.log('=== CREATING PARTNER ===');
      console.log('Sending partner data:', partnerData);
      
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(partnerData),
      });
      
      console.log('Response status:', response.status);
      
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create partner");
      }
      
      return responseData;
    },
    onSuccess: (data) => {
      console.log('Partner created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Sócio criado com sucesso!",
      });
    },
    onError: (error: Error) => {
      console.error('Error creating partner:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar sócio",
        variant: "destructive",
      });
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Partner> & { id: string }) => {
      const response = await fetch(`/api/partners/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update partner");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setIsDialogOpen(false);
      setEditingPartner(null);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Sócio atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar sócio",
        variant: "destructive",
      });
    },
  });

  const deletePartnerMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/partners/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to delete partner");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      toast({
        title: "Sucesso",
        description: "Sócio removido com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover sócio",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setPartnerForm({
      name: "",
      email: "",
      phone: "",
      username: "",
      password: ""
    });
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setPartnerForm({
      name: partner.name,
      email: partner.email,
      phone: partner.phone || "",
      username: partner.username,
      password: ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted with data:', partnerForm);
    
    // Validate required fields
    if (!partnerForm.name || partnerForm.name.trim().length === 0) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!partnerForm.username || partnerForm.username.trim().length === 0) {
      toast({
        title: "Erro",
        description: "Nome de usuário é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!editingPartner && (!partnerForm.password || partnerForm.password.length < 6)) {
      toast({
        title: "Erro",
        description: "Senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    console.log('Submitting partner form:', partnerForm);

    if (editingPartner) {
      updatePartnerMutation.mutate({
        id: editingPartner.id,
        ...partnerForm
      });
    } else {
      createPartnerMutation.mutate(partnerForm);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gerenciar Sócios
          </h1>
          <p className="text-gray-600">
            Gerencie os sócios da empresa
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="gradient-bg text-white"
              onClick={() => {
                setEditingPartner(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Sócio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingPartner ? "Editar Sócio" : "Novo Sócio"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={partnerForm.email}
                  onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={partnerForm.phone}
                  onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="username">Código de Acesso *</Label>
                <Input
                  id="username"
                  value={partnerForm.username}
                  onChange={(e) => setPartnerForm({ ...partnerForm, username: e.target.value })}
                  placeholder="Será gerado automaticamente se não informado"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se não informado, será gerado automaticamente (ex: SOC123456)
                </p>
              </div>
              <div>
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={partnerForm.password}
                  onChange={(e) => setPartnerForm({ ...partnerForm, password: e.target.value })}
                  placeholder="Senha para acesso"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="gradient-bg text-white"
                  disabled={createPartnerMutation.isPending || updatePartnerMutation.isPending}
                >
                  {editingPartner ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Sócios ({partners?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {partners?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Nenhum sócio cadastrado
                    </td>
                  </tr>
                ) : (
                  partners?.map((partner) => (
                    <tr key={partner.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {partner.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {partner.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {partner.phone || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{partner.username || partner.userCode || "N/A"}</div>
                          {(partner.userCode || partner.username) && (
                            <div className="text-xs text-blue-600 font-mono">#{partner.userCode || partner.username}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={partner.isActive ? "default" : "secondary"}>
                          {partner.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(partner)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o sócio "{partner.name}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deletePartnerMutation.mutate(partner.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
