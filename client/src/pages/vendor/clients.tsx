
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
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, ShoppingCart, Plus, MessageCircle, Hash, MapPin, User, RefreshCw, FileText, Eye, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const clientFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().min(10, "Telefone inválido").optional(),
  whatsapp: z.string().optional(),
  cpfCnpj: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function VendorClients() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const vendorId = user.id;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [userCode, setUserCode] = useState("");
  const { toast } = useToast();

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
    queryKey: ["/api/vendors/clients", vendorId],
    queryFn: async () => {
      console.log(`Fetching clients for vendor: ${vendorId}`);
      const response = await fetch(`/api/vendors/${vendorId}/clients`);
      if (!response.ok) {
        console.error(`Failed to fetch clients: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch clients');
      }
      const data = await response.json();
      console.log(`Received ${data.length} clients:`, data);
      return data;
    },
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

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      whatsapp: "",
      cpfCnpj: "",
      address: "",
      password: "",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      const clientData = {
        ...data,
        userCode: userCode,
        vendorId: vendorId
      };
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });
      if (!response.ok) throw new Error("Erro ao criar cliente");
      return response.json();
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/clients", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso!",
        description: `Cliente ${newClient.name} criado com sucesso!`,
      });
      
      // Show the user code in a separate toast
      setTimeout(() => {
        toast({
          title: "Código de Acesso do Cliente:",
          description: `${userCode} - Anote este código para fornecer ao cliente`,
          duration: 10000,
        });
      }, 1000);
    },
  });

  const onSubmit = (data: ClientFormValues) => {
    createClientMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Clientes</h1>
          <p className="text-gray-600">Gerencie seus clientes e acompanhe suas compras</p>
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

                <FormField
                  control={form.control}
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="joao@email.com" {...field} />
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
                  <FormField
                    control={form.control}
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
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Completo</FormLabel>
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
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                      <div className="flex items-center mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <User className="h-4 w-4 text-blue-600 mr-2" />
                        <div>
                          <span className="text-xs text-blue-600 font-medium">Código de Acesso:</span>
                          <span className="text-sm font-mono font-bold text-blue-800 ml-2">
                            {client.userCode || client.username || 'N/A'}
                          </span>
                        </div>
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

      {clients?.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">Ainda não há clientes cadastrados</p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="gradient-bg text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeiro Cliente
            </Button>
          </CardContent>
        </Card>
      )}

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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedClientId && (
            <div className="space-y-4">
              {(() => {
                const client = clients?.find((c: any) => c.id === selectedClientId);
                if (!client) return null;
                
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nome:</label>
                      <p className="text-sm text-gray-900">{client.name}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Código de Acesso:</label>
                      <p className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {client.userCode || 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email:</label>
                      <p className="text-sm text-gray-900">{client.email || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Telefone:</label>
                      <p className="text-sm text-gray-900">{client.phone || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">WhatsApp:</label>
                      <p className="text-sm text-gray-900">{client.whatsapp || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">CPF/CNPJ:</label>
                      <p className="text-sm text-gray-900">{client.cpfCnpj || 'N/A'}</p>
                    </div>
                    
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-600">Endereço:</label>
                      <p className="text-sm text-gray-900">{client.address || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Total de Pedidos:</label>
                      <p className="text-sm text-gray-900">{client.ordersCount || 0}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Total Gasto:</label>
                      <p className="text-sm text-gray-900">R$ {(client.totalSpent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
