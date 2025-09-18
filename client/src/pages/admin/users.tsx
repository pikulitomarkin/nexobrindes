
import { useState } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, ShoppingCart, Handshake, Factory, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const clientFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  cpfCnpj: z.string().optional(),
  address: z.string().optional(),
  vendorId: z.string().optional(),
});

const vendorFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  phone: z.string().optional(),
  commissionRate: z.string().min(1, "Taxa de comissão é obrigatória"),
});

const partnerFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  phone: z.string().optional(),
  commissionRate: z.string().min(1, "Taxa de comissão é obrigatória"),
});

const producerFormSchema = z.object({
  name: z.string().min(2, "Nome/Empresa deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  phone: z.string().min(10, "Telefone inválido"),
  specialty: z.string().min(2, "Especialidade é obrigatória"),
  address: z.string().min(5, "Endereço é obrigatório"),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;
type VendorFormValues = z.infer<typeof vendorFormSchema>;
type PartnerFormValues = z.infer<typeof partnerFormSchema>;
type ProducerFormValues = z.infer<typeof producerFormSchema>;

export default function AdminUsers() {
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
  const [isProducerDialogOpen, setIsProducerDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  // Get all users
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Get vendors for client assignment
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  // Forms
  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      phone: "",
      whatsapp: "",
      cpfCnpj: "",
      address: "",
      vendorId: "",
    },
  });

  const vendorForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      phone: "",
      commissionRate: "10.00",
    },
  });

  const partnerForm = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      phone: "",
      commissionRate: "15.00",
    },
  });

  const producerForm = useForm<ProducerFormValues>({
    resolver: zodResolver(producerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      phone: "",
      specialty: "",
      address: "",
    },
  });

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      // First create the user
      const userResponse = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          role: "client"
        }),
      });
      if (!userResponse.ok) throw new Error("Erro ao criar usuário cliente");
      
      const user = await userResponse.json();
      
      // Then create client profile
      const clientResponse = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          cpfCnpj: data.cpfCnpj,
          address: data.address,
          vendorId: data.vendorId,
        }),
      });
      
      if (!clientResponse.ok) throw new Error("Erro ao criar perfil do cliente");
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsClientDialogOpen(false);
      clientForm.reset();
      toast({
        title: "Sucesso!",
        description: "Cliente criado com sucesso",
      });
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar vendedor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsVendorDialogOpen(false);
      vendorForm.reset();
      toast({
        title: "Sucesso!",
        description: "Vendedor criado com sucesso",
      });
    },
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (data: PartnerFormValues) => {
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar sócio");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setIsPartnerDialogOpen(false);
      partnerForm.reset();
      toast({
        title: "Sucesso!",
        description: "Sócio criado com sucesso",
      });
    },
  });

  const createProducerMutation = useMutation({
    mutationFn: async (data: ProducerFormValues) => {
      const response = await fetch("/api/producers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar produtor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/producers"] });
      setIsProducerDialogOpen(false);
      producerForm.reset();
      toast({
        title: "Sucesso!",
        description: "Produtor criado com sucesso",
      });
    },
  });

  // Filter users by role
  const clients = users?.filter((u: any) => u.role === 'client') || [];
  const vendorUsers = users?.filter((u: any) => u.role === 'vendor') || [];
  const partners = users?.filter((u: any) => u.role === 'partner') || [];
  const producers = users?.filter((u: any) => u.role === 'producer') || [];

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

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      vendor: 'Vendedor',
      client: 'Cliente', 
      producer: 'Produtor',
      partner: 'Sócio',
      finance: 'Financeiro'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleIcon = (role: string) => {
    const icons = {
      admin: Users,
      vendor: ShoppingCart,
      client: Users,
      producer: Factory,
      partner: Handshake,
      finance: Users
    };
    const Icon = icons[role as keyof typeof icons] || Users;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Usuários</h1>
        <p className="text-gray-600">Cadastre e gerencie todos os usuários do sistema</p>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clients">Clientes ({clients.length})</TabsTrigger>
          <TabsTrigger value="vendors">Vendedores ({vendorUsers.length})</TabsTrigger>
          <TabsTrigger value="partners">Sócios ({partners.length})</TabsTrigger>
          <TabsTrigger value="producers">Produtores ({producers.length})</TabsTrigger>
        </TabsList>

        {/* Clientes */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Clientes
                </CardTitle>
                <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-bg text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                      <DialogDescription>
                        Preencha os dados do cliente para criar uma nova conta
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...clientForm}>
                      <form onSubmit={clientForm.handleSubmit((data) => createClientMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={clientForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo *</FormLabel>
                              <FormControl>
                                <Input placeholder="João Silva" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={clientForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="joao@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={clientForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username *</FormLabel>
                                <FormControl>
                                  <Input placeholder="joao.silva" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={clientForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={clientForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                  <Input placeholder="(11) 99999-9999" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={clientForm.control}
                            name="whatsapp"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>WhatsApp</FormLabel>
                                <FormControl>
                                  <Input placeholder="(11) 99999-9999" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={clientForm.control}
                          name="cpfCnpj"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPF/CNPJ</FormLabel>
                              <FormControl>
                                <Input placeholder="123.456.789-00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={clientForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Endereço</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Rua das Flores, 123, Centro, São Paulo, SP"
                                  rows={3}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={clientForm.control}
                          name="vendorId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vendedor Responsável</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um vendedor" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {vendors?.map((vendor: any) => (
                                    <SelectItem key={vendor.id} value={vendor.id}>
                                      {vendor.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsClientDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            className="gradient-bg text-white"
                            disabled={createClientMutation.isPending}
                          >
                            {createClientMutation.isPending ? "Criando..." : "Criar Cliente"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map((client: any) => (
                      <tr key={client.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`status-badge ${client.isActive ? 'status-confirmed' : 'status-cancelled'}`}>
                            {client.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="ghost" size="sm" className="mr-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendedores */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Vendedores
                </CardTitle>
                <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-bg text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Vendedor
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cadastrar Novo Vendedor</DialogTitle>
                      <DialogDescription>
                        Preencha os dados do vendedor para criar uma nova conta
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...vendorForm}>
                      <form onSubmit={vendorForm.handleSubmit((data) => createVendorMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={vendorForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo *</FormLabel>
                              <FormControl>
                                <Input placeholder="Maria Santos" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={vendorForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="maria@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={vendorForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username *</FormLabel>
                                <FormControl>
                                  <Input placeholder="maria.santos" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={vendorForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={vendorForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                  <Input placeholder="(11) 99999-9999" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={vendorForm.control}
                            name="commissionRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Taxa de Comissão (%) *</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="10.00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsVendorDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            className="gradient-bg text-white"
                            disabled={createVendorMutation.isPending}
                          >
                            {createVendorMutation.isPending ? "Criando..." : "Criar Vendedor"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorUsers.map((vendor: any) => (
                      <tr key={vendor.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vendor.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vendor.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`status-badge ${vendor.isActive ? 'status-confirmed' : 'status-cancelled'}`}>
                            {vendor.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="ghost" size="sm" className="mr-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sócios */}
        <TabsContent value="partners">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Handshake className="h-5 w-5 mr-2" />
                  Sócios
                </CardTitle>
                <Dialog open={isPartnerDialogOpen} onOpenChange={setIsPartnerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-bg text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Sócio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cadastrar Novo Sócio</DialogTitle>
                      <DialogDescription>
                        Preencha os dados do sócio para criar uma nova conta
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...partnerForm}>
                      <form onSubmit={partnerForm.handleSubmit((data) => createPartnerMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={partnerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo *</FormLabel>
                              <FormControl>
                                <Input placeholder="João Sócio" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={partnerForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="joao@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={partnerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username *</FormLabel>
                                <FormControl>
                                  <Input placeholder="joao.socio" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={partnerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={partnerForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                  <Input placeholder="(11) 99999-9999" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={partnerForm.control}
                            name="commissionRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Taxa de Comissão (%) *</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="15.00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsPartnerDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            className="gradient-bg text-white"
                            disabled={createPartnerMutation.isPending}
                          >
                            {createPartnerMutation.isPending ? "Criando..." : "Criar Sócio"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {partners.map((partner: any) => (
                      <tr key={partner.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{partner.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{partner.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{partner.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`status-badge ${partner.isActive ? 'status-confirmed' : 'status-cancelled'}`}>
                            {partner.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="ghost" size="sm" className="mr-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Produtores */}
        <TabsContent value="producers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Factory className="h-5 w-5 mr-2" />
                  Produtores
                </CardTitle>
                <Dialog open={isProducerDialogOpen} onOpenChange={setIsProducerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-bg text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Produtor
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cadastrar Novo Produtor</DialogTitle>
                      <DialogDescription>
                        Preencha os dados do produtor para criar uma nova conta
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...producerForm}>
                      <form onSubmit={producerForm.handleSubmit((data) => createProducerMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={producerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome/Empresa *</FormLabel>
                              <FormControl>
                                <Input placeholder="Marcenaria Santos" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={producerForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="contato@marcenariasantos.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={producerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username *</FormLabel>
                                <FormControl>
                                  <Input placeholder="marcenaria.santos" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={producerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={producerForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone *</FormLabel>
                                <FormControl>
                                  <Input placeholder="(11) 99999-9999" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={producerForm.control}
                            name="specialty"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Especialidade *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Móveis sob medida" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={producerForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Endereço *</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Rua Industrial, 456, Distrito Industrial, São Paulo, SP"
                                  rows={3}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsProducerDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            className="gradient-bg text-white"
                            disabled={createProducerMutation.isPending}
                          >
                            {createProducerMutation.isPending ? "Criando..." : "Criar Produtor"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {producers.map((producer: any) => (
                      <tr key={producer.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{producer.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{producer.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{producer.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{producer.specialty}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`status-badge ${producer.isActive ? 'status-confirmed' : 'status-cancelled'}`}>
                            {producer.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="ghost" size="sm" className="mr-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
