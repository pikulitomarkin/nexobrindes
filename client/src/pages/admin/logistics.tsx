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
import { Plus, User, Phone, Mail, Trash2, RefreshCw, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const logisticsFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type LogisticsFormValues = z.infer<typeof logisticsFormSchema>;

export default function AdminLogistics() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [userCode, setUserCode] = useState("");
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

  const handleDeleteLogistics = (userId: string, userName: string) => {
    if (confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) {
      deleteLogisticsMutation.mutate(userId);
    }
  };

  const onSubmit = (data: LogisticsFormValues) => {
    createLogisticsMutation.mutate(data);
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
                  <Button
                    variant="outline"
                    size="sm"
                    title="Excluir usuário"
                    onClick={() => handleDeleteLogistics(user.id, user.name)}
                    disabled={deleteLogisticsMutation.isPending}
                    data-testid={`button-delete-${user.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
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
    </div>
  );
}
