import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, User, Phone, Mail, Trash2, RefreshCw, Truck, Edit, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const logisticsFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const logisticsEditSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
});

const passwordChangeSchema = z.object({
  newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirme a senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LogisticsFormValues = z.infer<typeof logisticsFormSchema>;
type LogisticsEditValues = z.infer<typeof logisticsEditSchema>;
type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

export default function AdminLogistics() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [userCode, setUserCode] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const generateUserCode = () => {
    const timestamp = Date.now().toString().slice(-8);
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `LOG${timestamp}${randomStr}`;
  };

  useEffect(() => {
    if (isCreateDialogOpen) {
      setUserCode(generateUserCode());
    }
  }, [isCreateDialogOpen]);

  const { data: logisticsUsers, isLoading } = useQuery({
    queryKey: ["/api/logistics"],
    queryFn: async () => {
      const response = await fetch('/api/logistics');
      if (!response.ok) throw new Error('Failed to fetch logistics users');
      return response.json();
    },
  });

  const form = useForm<LogisticsFormValues>({
    resolver: zodResolver(logisticsFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const editForm = useForm<LogisticsEditValues>({
    resolver: zodResolver(logisticsEditSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const passwordForm = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const createLogisticsMutation = useMutation({
    mutationFn: async (data: LogisticsFormValues) => {
      const logisticsData = {
        ...data,
        username: userCode,
        userCode: userCode
      };
      console.log('Creating logistics user with data:', logisticsData);
      const response = await fetch("/api/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logisticsData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating logistics user:', errorData);
        throw new Error(errorData.error || "Erro ao criar usuário de logística");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "✅ Usuário de Logística Cadastrado com Sucesso!",
        description: (
          <div className="space-y-1">
            <p><strong>Username:</strong> {userCode}</p>
            <p><strong>Senha:</strong> {data.password}</p>
            <p className="text-xs opacity-75">O usuário pode usar essas credenciais para fazer login</p>
          </div>
        ),
        duration: 10000,
      });
      console.log('Logistics user created successfully:', data);
    },
    onError: (error: any) => {
      console.error('Logistics user creation failed:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário de logística",
        variant: "destructive",
      });
    },
  });

  const deleteLogisticsMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/logistics/${userId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir usuário");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics"] });
      toast({
        title: "Sucesso!",
        description: "Usuário de logística excluído com sucesso!",
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

  const updateLogisticsMutation = useMutation({
    mutationFn: async (data: LogisticsEditValues & { id: string }) => {
      const response = await apiRequest("PATCH", `/api/logistics/${data.id}`, {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics"] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      editForm.reset();
      toast({
        title: "Sucesso!",
        description: "Usuário de logística atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const response = await apiRequest("PATCH", `/api/logistics/${id}/password`, {
        newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics"] });
      setIsPasswordDialogOpen(false);
      setEditingUser(null);
      passwordForm.reset();
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      toast({
        title: "Sucesso!",
        description: "Senha alterada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar senha",
        variant: "destructive",
      });
    },
  });

  const handleDeleteLogistics = (userId: string, userName: string) => {
    if (confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) {
      deleteLogisticsMutation.mutate(userId);
    }
  };

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    editForm.reset({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    });
    setIsEditDialogOpen(true);
  };

  const openPasswordDialog = (user: any) => {
    setEditingUser(user);
    passwordForm.reset({
      newPassword: "",
      confirmPassword: "",
    });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsPasswordDialogOpen(true);
  };

  const onSubmit = (data: LogisticsFormValues) => {
    createLogisticsMutation.mutate(data);
  };

  const onEditSubmit = (data: LogisticsEditValues) => {
    if (editingUser) {
      updateLogisticsMutation.mutate({ ...data, id: editingUser.id });
    }
  };

  const onPasswordSubmit = (data: PasswordChangeValues) => {
    if (editingUser) {
      changePasswordMutation.mutate({ id: editingUser.id, newPassword: data.newPassword });
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Logística</h1>
          <p className="text-gray-600">Cadastre usuários para acessar o painel de logística</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-white" data-testid="button-create-logistics">
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário de Logística
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Usuário de Logística</DialogTitle>
              <DialogDescription>
                Crie um novo usuário para acessar o painel de logística
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-blue-700">Código de Login</FormLabel>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-mono font-bold text-blue-800">{userCode}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserCode(generateUserCode())}
                      title="Gerar novo código"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Este código será usado para fazer login no sistema
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do usuário" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemplo.com" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 00000-0000" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Mínimo 6 caracteres" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-bg text-white"
                    disabled={createLogisticsMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createLogisticsMutation.isPending ? "Criando..." : "Criar Usuário"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {logisticsUsers?.map((user: any) => (
          <Card key={user.id} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center mr-3">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-600">Logística</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {user.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {user.email}
                  </div>
                )}
                {user.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {user.phone}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg mt-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Código de Login</p>
                    <p className="font-mono font-bold text-gray-900">{user.username || user.userCode}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      title="Editar usuário"
                      onClick={() => openEditDialog(user)}
                      className="hover:bg-blue-50 hover:border-blue-200"
                      data-testid={`button-edit-${user.id}`}
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Alterar senha"
                      onClick={() => openPasswordDialog(user)}
                      className="hover:bg-yellow-50 hover:border-yellow-200"
                      data-testid={`button-password-${user.id}`}
                    >
                      <Lock className="h-4 w-4 text-yellow-600" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Excluir usuário"
                      onClick={() => handleDeleteLogistics(user.id, user.name)}
                      disabled={deleteLogisticsMutation.isPending}
                      className="hover:bg-red-50 hover:border-red-200"
                      data-testid={`button-delete-${user.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {logisticsUsers?.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhum usuário de logística cadastrado</p>
            <p className="text-sm text-gray-400 mb-6">
              Cadastre usuários para gerenciar pedidos, produção e entregas
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gradient-bg text-white">
              Cadastrar Primeiro Usuário
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog para editar usuário */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingUser(null);
          editForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Usuário de Logística
            </DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário {editingUser?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do usuário" {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} data-testid="input-edit-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="gradient-bg text-white"
                  disabled={updateLogisticsMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateLogisticsMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog para alterar senha */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
        setIsPasswordDialogOpen(open);
        if (!open) {
          setEditingUser(null);
          passwordForm.reset();
          setShowNewPassword(false);
          setShowConfirmPassword(false);
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Alterar Senha
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha para o usuário {editingUser?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          {...field}
                          data-testid="input-new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Repita a nova senha"
                          {...field}
                          data-testid="input-confirm-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="gradient-bg text-white"
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-save-password"
                >
                  {changePasswordMutation.isPending ? "Salvando..." : "Alterar Senha"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
