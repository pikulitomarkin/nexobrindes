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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Eye, Phone, Mail, MessageCircle, FileText, Building, MapPin, Hash, RefreshCw, User, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const clientFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().min(10, "Telefone inválido").optional(),
  whatsapp: z.string().optional(),
  cpfCnpj: z.string().optional(),
  address: z.string().optional(), // Campo legado
  vendorId: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  // Novos campos comerciais
  nomeFantasia: z.string().optional(),
  razaoSocial: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  cep: z.string().optional(),
  emailBoleto: z.string().email("Email inválido").optional().or(z.literal("")),
  emailNF: z.string().email("Email inválido").optional().or(z.literal("")),
  nomeContato: z.string().optional(),
  emailContato: z.string().email("Email inválido").optional().or(z.literal("")),
  // Endereço de Faturamento
  enderecoFaturamentoLogradouro: z.string().optional(),
  enderecoFaturamentoNumero: z.string().optional(),
  enderecoFaturamentoComplemento: z.string().optional(),
  enderecoFaturamentoBairro: z.string().optional(),
  enderecoFaturamentoCidade: z.string().optional(),
  enderecoFaturamentoCep: z.string().optional(),
  // Endereço de Entrega
  enderecoEntregaLogradouro: z.string().optional(),
  enderecoEntregaNumero: z.string().optional(),
  enderecoEntregaComplemento: z.string().optional(),
  enderecoEntregaBairro: z.string().optional(),
  enderecoEntregaCidade: z.string().optional(),
  enderecoEntregaCep: z.string().optional(),
});

// Schema for editing client - password is optional
const clientEditFormSchema = clientFormSchema.extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;
type ClientEditFormValues = z.infer<typeof clientEditFormSchema>;

export default function AdminClients() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [userCode, setUserCode] = useState("");
  const [useSameAddressForBilling, setUseSameAddressForBilling] = useState(false);
  const [useSameAddressForDelivery, setUseSameAddressForDelivery] = useState(false);
  const { toast } = useToast();

  const copyMainAddressToBilling = () => {
    form.setValue("enderecoFaturamentoLogradouro", form.getValues("logradouro"));
    form.setValue("enderecoFaturamentoNumero", form.getValues("numero"));
    form.setValue("enderecoFaturamentoComplemento", form.getValues("complemento"));
    form.setValue("enderecoFaturamentoBairro", form.getValues("bairro"));
    form.setValue("enderecoFaturamentoCidade", form.getValues("cidade"));
    form.setValue("enderecoFaturamentoCep", form.getValues("cep"));
  };

  const copyMainAddressToDelivery = () => {
    form.setValue("enderecoEntregaLogradouro", form.getValues("logradouro"));
    form.setValue("enderecoEntregaNumero", form.getValues("numero"));
    form.setValue("enderecoEntregaComplemento", form.getValues("complemento"));
    form.setValue("enderecoEntregaBairro", form.getValues("bairro"));
    form.setValue("enderecoEntregaCidade", form.getValues("cidade"));
    form.setValue("enderecoEntregaCep", form.getValues("cep"));
  };

  const generateUserCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CLI${timestamp}${randomStr}`;
  };

  useEffect(() => {
    if (isCreateDialogOpen) {
      setUserCode(generateUserCode());
    }
  }, [isCreateDialogOpen]);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/clients"],
    refetchOnMount: 'always', // Always refetch to prevent stale cache after page refresh
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: clientOrders } = useQuery({
    queryKey: ["/api/clients", selectedClientId, "orders"],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const response = await fetch(`/api/clients/${selectedClientId}/orders`);
      if (!response.ok) throw new Error('Failed to fetch client orders');
      return response.json();
    },
    enabled: !!selectedClientId && showOrders,
  });

  const form = useForm<ClientEditFormValues>({
    resolver: zodResolver(clientEditFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      whatsapp: "",
      cpfCnpj: "",
      address: "",
      vendorId: "",
      password: "",
      // Novos campos comerciais
      nomeFantasia: "",
      razaoSocial: "",
      inscricaoEstadual: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      cep: "",
      emailBoleto: "",
      emailNF: "",
      nomeContato: "",
      emailContato: "",
      // Endereço de Faturamento
      enderecoFaturamentoLogradouro: "",
      enderecoFaturamentoNumero: "",
      enderecoFaturamentoComplemento: "",
      enderecoFaturamentoBairro: "",
      enderecoFaturamentoCidade: "",
      enderecoFaturamentoCep: "",
      // Endereço de Entrega
      enderecoEntregaLogradouro: "",
      enderecoEntregaNumero: "",
      enderecoEntregaComplemento: "",
      enderecoEntregaBairro: "",
      enderecoEntregaCidade: "",
      enderecoEntregaCep: "",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      const finalCode = userCode || generateUserCode();
      const clientData = {
        ...data,
        userCode: finalCode
      };
      console.log("Sending client data with userCode:", clientData);
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });
      if (!response.ok) throw new Error("Erro ao criar cliente");
      return response.json();
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso!",
        description: `Cliente criado com sucesso! Código de acesso: ${userCode}`,
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir cliente");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso!",
        description: "Cliente excluído com sucesso!",
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

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientFormValues> }) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar cliente");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setShowEditClient(false);
      setSelectedClientId(null);
      form.reset();
      toast({
        title: "Sucesso!",
        description: "Cliente atualizado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClient = (clientId: string, clientName: string) => {
    if (confirm(`Tem certeza que deseja excluir o cliente "${clientName}"?`)) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const onSubmit = (data: ClientEditFormValues) => {
    if (selectedClientId && showEditClient) {
      // Edição de cliente existente
      // Remove password se estiver vazio e normalize FK fields
      const updateData = { ...data };
      if (!updateData.password || updateData.password.trim() === "") {
        delete updateData.password;
      }
      // Normalize empty vendorId to null to avoid FK constraint violation
      if (!updateData.vendorId || updateData.vendorId.trim() === "") {
        updateData.vendorId = null as any;
      }
      updateClientMutation.mutate({ id: selectedClientId, data: updateData });
    } else {
      // Criação de novo cliente - validate password is provided
      if (!data.password || data.password.trim() === "") {
        toast({
          title: "Erro",
          description: "Senha é obrigatória para criar novo cliente",
          variant: "destructive",
        });
        return;
      }
      createClientMutation.mutate(data as ClientFormValues);
    }
  };

  const handleEditClient = (client: any) => {
    setSelectedClientId(client.id);
    // Popular o formulário com os dados do cliente
    form.reset({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      whatsapp: client.whatsapp || "",
      cpfCnpj: client.cpfCnpj || "",
      address: client.address || "",
      vendorId: client.vendorId || "",
      password: "", // Não preencher senha por segurança
      nomeFantasia: client.nomeFantasia || "",
      razaoSocial: client.razaoSocial || "",
      inscricaoEstadual: client.inscricaoEstadual || "",
      logradouro: client.logradouro || "",
      numero: client.numero || "",
      complemento: client.complemento || "",
      bairro: client.bairro || "",
      cidade: client.cidade || "",
      cep: client.cep || "",
      emailBoleto: client.emailBoleto || "",
      emailNF: client.emailNF || "",
      nomeContato: client.nomeContato || "",
      emailContato: client.emailContato || "",
      enderecoFaturamentoLogradouro: client.enderecoFaturamentoLogradouro || "",
      enderecoFaturamentoNumero: client.enderecoFaturamentoNumero || "",
      enderecoFaturamentoComplemento: client.enderecoFaturamentoComplemento || "",
      enderecoFaturamentoBairro: client.enderecoFaturamentoBairro || "",
      enderecoFaturamentoCidade: client.enderecoFaturamentoCidade || "",
      enderecoFaturamentoCep: client.enderecoFaturamentoCep || "",
      enderecoEntregaLogradouro: client.enderecoEntregaLogradouro || "",
      enderecoEntregaNumero: client.enderecoEntregaNumero || "",
      enderecoEntregaComplemento: client.enderecoEntregaComplemento || "",
      enderecoEntregaBairro: client.enderecoEntregaBairro || "",
      enderecoEntregaCidade: client.enderecoEntregaCidade || "",
      enderecoEntregaCep: client.enderecoEntregaCep || "",
    });
    setShowEditClient(true);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Clientes</h1>
          <p className="text-gray-600">Cadastre e gerencie clientes do sistema</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                Preencha os dados completos do cliente
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-blue-700">Código de Acesso do Cliente</FormLabel>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-mono font-bold text-blue-800">{userCode}</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">Este código será usado para login no sistema</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUserCode(generateUserCode())}
                      className="border-blue-300 text-blue-600 hover:bg-blue-100"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Informações Básicas */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Contato *</FormLabel>
                        <FormControl>
                          <Input placeholder="João Silva" {...field} />
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
                        <FormLabel>Senha de Acesso *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Digite uma senha" {...field} />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-gray-600">Senha que o cliente usará para acessar o sistema</p>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nomeFantasia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Fantasia</FormLabel>
                          <FormControl>
                            <Input placeholder="Empresa Ltda" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="razaoSocial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome/Razão Social</FormLabel>
                          <FormControl>
                            <Input placeholder="Empresa Comercial Ltda" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cpfCnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF/CNPJ</FormLabel>
                          <FormControl>
                            <Input placeholder="123.456.789-00 ou 00.000.000/0001-00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inscricaoEstadual"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inscrição Estadual</FormLabel>
                          <FormControl>
                            <Input placeholder="123.456.789.012 (se for Indústria ou Comércio)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Endereço Principal */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Endereço Principal</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="logradouro"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Logradouro/Rua</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua das Flores" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="numero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="complemento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Apto 45, Bloco B" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bairro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Centro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="São Paulo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input placeholder="01234-567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Endereço de Faturamento */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Endereço de Faturamento</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="enderecoFaturamentoLogradouro"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Logradouro/Rua</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua das Flores" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="enderecoFaturamentoNumero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="enderecoFaturamentoComplemento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Apto 45, Bloco B" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="enderecoFaturamentoBairro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Centro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="enderecoFaturamentoCidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="São Paulo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="enderecoFaturamentoCep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input placeholder="01234-567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Endereço de Entrega */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Endereço de Entrega</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="enderecoEntregaLogradouro"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Logradouro/Rua</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua das Flores" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="enderecoEntregaNumero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="enderecoEntregaComplemento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Apto 45, Bloco B" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="enderecoEntregaBairro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Centro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="enderecoEntregaCidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="São Paulo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="enderecoEntregaCep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input placeholder="01234-567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Contato */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contato</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nomeContato"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Contato</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da pessoa de contato" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emailContato"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail do Contato</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contato@empresa.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* E-mails Comerciais */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">E-mails Comerciais</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emailBoleto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail para Envio de Boleto</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="financeiro@empresa.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emailNF"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail para Envio de NF</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="nf@empresa.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail Principal</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contato@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
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
                    onClick={() => setIsCreateDialogOpen(false)}
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients?.map((client: any) => (
              <Card key={client.id} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                      <div className="flex items-center mt-1">
                        <User className="h-3 w-3 text-blue-600 mr-1" />
                        <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {(() => {
                            const code = (client as any).userCode ?? 
                                        (client as any).code ?? 
                                        (client as any).loginCode ?? 
                                        (client as any).accessCode ?? 
                                        null;
                            return code ?? 'N/A';
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setShowOrders(true);
                        }}
                        title="Ver Pedidos"
                        className="hover:bg-blue-50 hover:text-blue-600"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Ver Detalhes"
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setShowClientDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Editar"
                        onClick={() => handleEditClient(client)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Excluir"
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        disabled={deleteClientMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {client.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.whatsapp && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{client.whatsapp}</span>
                      </div>
                    )}
                    {client.cpfCnpj && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Hash className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{client.cpfCnpj}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-xs leading-tight">{client.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pedidos:</span>
                      <span className="font-medium">{client.ordersCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Total gasto:</span>
                      <span className="font-medium">R$ {(client.totalSpent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para mostrar pedidos do cliente */}
      <Dialog open={showOrders} onOpenChange={(open) => {
        setShowOrders(open);
        if (!open) {
          setSelectedClientId(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedidos do Cliente</DialogTitle>
            <DialogDescription>
              {selectedClientId && clients?.find((c: any) => c.id === selectedClientId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {clientOrders && clientOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Número
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clientOrders.map((order: any) => (
                      <tr key={order.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {order.product}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'production' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status === 'delivered' ? 'Entregue' :
                             order.status === 'production' ? 'Em Produção' :
                             order.status === 'pending' ? 'Pendente' :
                             order.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum pedido encontrado para este cliente</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalhes do cliente */}
      <Dialog open={showClientDetails} onOpenChange={(open) => {
        setShowClientDetails(open);
        if (!open) {
          setSelectedClientId(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedClientId && (
            <div className="space-y-4">
              {(() => {
                const client = clients?.find((c: any) => c.id === selectedClientId);
                if (!client) return null;

                return (
                  <div className="space-y-6">
                    {/* Informações Básicas */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Informações Básicas</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Nome do Contato:</label>
                          <p className="text-sm text-gray-900">{client.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Código de Acesso:</label>
                          <p className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {(() => {
                              const code = client.userCode ?? 
                                          client.code ?? 
                                          client.loginCode ?? 
                                          client.accessCode ?? 
                                          null;
                              return code ?? 'N/A';
                            })()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Nome Fantasia:</label>
                          <p className="text-sm text-gray-900">{client.nome_fantasia || client.nomeFantasia || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Razão Social:</label>
                          <p className="text-sm text-gray-900">{client.razao_social || client.razaoSocial || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">CPF/CNPJ:</label>
                          <p className="text-sm text-gray-900">{client.cpfCnpj || client.cpf_cnpj || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Inscrição Estadual:</label>
                          <p className="text-sm text-gray-900">{client.inscricao_estadual || client.inscricaoEstadual || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Endereço Principal */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Endereço Principal</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Logradouro:</label>
                          <p className="text-sm text-gray-900">{client.logradouro || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Número:</label>
                          <p className="text-sm text-gray-900">{client.numero || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Complemento:</label>
                          <p className="text-sm text-gray-900">{client.complemento || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Bairro:</label>
                          <p className="text-sm text-gray-900">{client.bairro || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Cidade:</label>
                          <p className="text-sm text-gray-900">{client.cidade || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">CEP:</label>
                          <p className="text-sm text-gray-900">{client.cep || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Endereço de Faturamento */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Endereço de Faturamento</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Logradouro:</label>
                          <p className="text-sm text-gray-900">{client.enderecoFaturamentoLogradouro || client.endereco_faturamento_logradouro || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Número:</label>
                          <p className="text-sm text-gray-900">{client.enderecoFaturamentoNumero || client.endereco_faturamento_numero || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Complemento:</label>
                          <p className="text-sm text-gray-900">{client.enderecoFaturamentoComplemento || client.endereco_faturamento_complemento || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Bairro:</label>
                          <p className="text-sm text-gray-900">{client.enderecoFaturamentoBairro || client.endereco_faturamento_bairro || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Cidade:</label>
                          <p className="text-sm text-gray-900">{client.enderecoFaturamentoCidade || client.endereco_faturamento_cidade || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">CEP:</label>
                          <p className="text-sm text-gray-900">{client.enderecoFaturamentoCep || client.endereco_faturamento_cep || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Endereço de Entrega */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Endereço de Entrega</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Logradouro:</label>
                          <p className="text-sm text-gray-900">{client.enderecoEntregaLogradouro || client.endereco_entrega_logradouro || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Número:</label>
                          <p className="text-sm text-gray-900">{client.enderecoEntregaNumero || client.endereco_entrega_numero || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Complemento:</label>
                          <p className="text-sm text-gray-900">{client.enderecoEntregaComplemento || client.endereco_entrega_complemento || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Bairro:</label>
                          <p className="text-sm text-gray-900">{client.enderecoEntregaBairro || client.endereco_entrega_bairro || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Cidade:</label>
                          <p className="text-sm text-gray-900">{client.enderecoEntregaCidade || client.endereco_entrega_cidade || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">CEP:</label>
                          <p className="text-sm text-gray-900">{client.enderecoEntregaCep || client.endereco_entrega_cep || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Contato */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Contato</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Telefone:</label>
                          <p className="text-sm text-gray-900">{client.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">WhatsApp:</label>
                          <p className="text-sm text-gray-900">{client.whatsapp || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Nome do Contato:</label>
                          <p className="text-sm text-gray-900">{client.nome_contato || client.nomeContato || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">E-mail do Contato:</label>
                          <p className="text-sm text-gray-900">{client.email_contato || client.emailContato || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* E-mails Comerciais */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">E-mails Comerciais</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">E-mail Principal:</label>
                          <p className="text-sm text-gray-900">{client.email || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">E-mail para Boleto:</label>
                          <p className="text-sm text-gray-900">{client.email_boleto || client.emailBoleto || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">E-mail para NF:</label>
                          <p className="text-sm text-gray-900">{client.email_nf || client.emailNF || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Estatísticas */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Estatísticas</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Total de Pedidos:</label>
                          <p className="text-sm text-gray-900">{client.ordersCount || 0}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Total Gasto:</label>
                          <p className="text-sm text-gray-900">R$ {(client.totalSpent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para editar cliente */}
      <Dialog open={showEditClient} onOpenChange={(open) => {
        setShowEditClient(open);
        if (!open) {
          setSelectedClientId(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-gray-700">Código de Acesso do Cliente</FormLabel>
                    <div className="flex items-center space-x-2 mt-1">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-mono font-bold text-blue-800">
                        {(() => {
                          const client = clients?.find((c: any) => c.id === selectedClientId);
                          if (!client) return 'N/A';
                          const code = client.userCode ?? 
                                      client.code ?? 
                                      client.loginCode ?? 
                                      client.accessCode ?? 
                                      null;
                          return code ?? 'N/A';
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Este código não pode ser alterado</p>
                  </div>
                </div>
              </div>

              {/* Informações Básicas */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Contato *</FormLabel>
                      <FormControl>
                        <Input placeholder="João Silva" {...field} />
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
                      <FormLabel>Senha de Acesso</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Digite uma nova senha" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-600">Deixe em branco para manter a senha atual</p>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nomeFantasia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia</FormLabel>
                        <FormControl>
                          <Input placeholder="Empresa Ltda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="razaoSocial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome/Razão Social</FormLabel>
                        <FormControl>
                          <Input placeholder="Empresa Comercial Ltda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cpfCnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF/CNPJ</FormLabel>
                        <FormControl>
                          <Input placeholder="123.456.789-00 ou 00.000.000/0001-00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inscricaoEstadual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Estadual</FormLabel>
                        <FormControl>
                          <Input placeholder="123.456.789.012 (se for Indústria ou Comércio)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Endereço Principal */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Endereço Principal</h3>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="logradouro"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Logradouro/Rua</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua das Flores" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input placeholder="Apto 45, Bloco B" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input placeholder="Centro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input placeholder="01234-567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Endereço de Faturamento */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Endereço de Faturamento</h3>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="enderecoFaturamentoLogradouro"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Logradouro/Rua</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua das Flores" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enderecoFaturamentoNumero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="enderecoFaturamentoComplemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input placeholder="Apto 45, Bloco B" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enderecoFaturamentoBairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input placeholder="Centro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="enderecoFaturamentoCidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enderecoFaturamentoCep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input placeholder="01234-567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Endereço de Entrega */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Endereço de Entrega</h3>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="enderecoEntregaLogradouro"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Logradouro/Rua</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua das Flores" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enderecoEntregaNumero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="enderecoEntregaComplemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input placeholder="Apto 45, Bloco B" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enderecoEntregaBairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input placeholder="Centro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="enderecoEntregaCidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enderecoEntregaCep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input placeholder="01234-567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Contato */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Contato</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nomeContato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Contato</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da pessoa de contato" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emailContato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail do Contato</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contato@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* E-mails Comerciais */}
              <div className="space-y-4 border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900">E-mails Comerciais</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emailBoleto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail para Envio de Boleto</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="financeiro@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emailNF"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail para Envio de NF</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="nf@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail Principal</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contato@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
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
                  onClick={() => {
                    setShowEditClient(false);
                    setSelectedClientId(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="gradient-bg text-white"
                  disabled={updateClientMutation.isPending}
                >
                  {updateClientMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}