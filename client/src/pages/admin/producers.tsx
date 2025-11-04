
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
import { Plus, Factory, MapPin, Phone, User, RefreshCw, Package2, Truck, Package, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const producerFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  specialty: z.string().min(2, "Especialidade é obrigatória"),
  address: z.string().min(5, "Endereço é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type ProducerFormValues = z.infer<typeof producerFormSchema>;

export default function AdminProducers() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [userCode, setUserCode] = useState("");
  const [selectedProducerId, setSelectedProducerId] = useState<string | null>(null);
  const [showProducerProducts, setShowProducerProducts] = useState(false);
  const [showProducerOrders, setShowProducerOrders] = useState(false);
  const { toast } = useToast();

  const generateUserCode = () => {
    const timestamp = Date.now().toString().slice(-8);
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PRO${timestamp}${randomStr}`;
  };

  useEffect(() => {
    if (isCreateDialogOpen) {
      setUserCode(generateUserCode());
    }
  }, [isCreateDialogOpen]);

  // Use the same endpoints as logistics
  const { data: producers, isLoading } = useQuery({
    queryKey: ["/api/producers"],
    queryFn: async () => {
      const response = await fetch('/api/producers');
      if (!response.ok) throw new Error('Failed to fetch producers');
      return response.json();
    },
  });

  // Query para buscar estatísticas de produtos por produtor
  const { data: productStats } = useQuery({
    queryKey: ["/api/logistics/producer-stats"],
    queryFn: async () => {
      const response = await fetch('/api/logistics/producer-stats');
      if (!response.ok) throw new Error('Failed to fetch producer stats');
      return response.json();
    },
  });

  // Query para buscar produtos do produtor selecionado
  const { data: producerProducts } = useQuery({
    queryKey: ["/api/products/producer", selectedProducerId],
    queryFn: async () => {
      if (!selectedProducerId) return [];
      const response = await fetch(`/api/products/producer/${selectedProducerId}`);
      if (!response.ok) throw new Error('Failed to fetch producer products');
      return response.json();
    },
    enabled: !!selectedProducerId && showProducerProducts,
  });

  // Query para buscar pedidos do produtor selecionado
  const { data: producerOrders } = useQuery({
    queryKey: ["/api/production-orders/producer", selectedProducerId],
    queryFn: async () => {
      if (!selectedProducerId) return [];
      const response = await fetch(`/api/production-orders/producer/${selectedProducerId}`);
      if (!response.ok) throw new Error('Failed to fetch producer orders');
      return response.json();
    },
    enabled: !!selectedProducerId && showProducerOrders,
  });

  const form = useForm<ProducerFormValues>({
    resolver: zodResolver(producerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      specialty: "",
      address: "",
      password: "",
    },
  });

  const createProducerMutation = useMutation({
    mutationFn: async (data: ProducerFormValues) => {
      const producerData = {
        ...data,
        username: userCode, // Usar o userCode gerado como username
        userCode: userCode
      };
      console.log('Creating producer with data:', producerData);
      const response = await fetch("/api/producers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(producerData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating producer:', errorData);
        throw new Error(errorData.error || "Erro ao criar produtor");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/producers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/producer-stats"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "✅ Produtor Cadastrado com Sucesso!",
        description: (
          <div className="space-y-1">
            <p><strong>Username:</strong> {userCode}</p>
            <p><strong>Senha:</strong> {data.password}</p>
            <p className="text-xs opacity-75">O produtor pode usar essas credenciais para fazer login</p>
          </div>
        ),
        duration: 10000, // Mostrar por mais tempo para copiar as credenciais
      });
      console.log('Producer created successfully:', data);
    },
    onError: (error: any) => {
      console.error('Producer creation failed:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar produtor",
        variant: "destructive",
      });
    },
  });

  const deleteProducerMutation = useMutation({
    mutationFn: async (producerId: string) => {
      const response = await fetch(`/api/producers/${producerId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir produtor");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/producers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logistics/producer-stats"] });
      toast({
        title: "Sucesso!",
        description: "Produtor excluído com sucesso!",
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

  const handleDeleteProducer = (producerId: string, producerName: string) => {
    const confirmMessage = `Tem certeza que deseja excluir o produtor "${producerName}"?\n\nEsta ação não pode ser desfeita e irá:\n- Desativar todos os produtos associados\n- Remover o acesso do produtor ao sistema\n\nSomente produtores sem pedidos de produção ou pagamentos pendentes podem ser excluídos.`;
    
    if (confirm(confirmMessage)) {
      deleteProducerMutation.mutate(producerId);
    }
  };

  const onSubmit = (data: ProducerFormValues) => {
    createProducerMutation.mutate(data);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Produtores Terceirizados</h1>
          <p className="text-gray-600">Gerencie sua rede de produtores e associe produtos</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-white">
              <Plus className="h-4 w-4 mr-2" />
              Novo Produtor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Produtor</DialogTitle>
              <DialogDescription>
                Adicione um novo produtor à sua rede de terceirizados
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-blue-700">Código de Login do Produtor</FormLabel>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-mono font-bold text-blue-800 bg-white px-2 py-1 rounded border">{userCode}</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        <strong>Username para login:</strong> {userCode}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUserCode(generateUserCode())}
                      className="border-blue-300 text-blue-600 hover:bg-blue-100"
                      title="Gerar novo código"
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
                      <FormLabel>Nome/Empresa *</FormLabel>
                      <FormControl>
                        <Input placeholder="Marcenaria Santos" {...field} />
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
                      <p className="text-xs text-gray-600">Senha que o produtor usará para acessar o sistema</p>
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
                        <Input placeholder="contato@marcenariasantos.com" {...field} />
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

                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Móveis sob medida" {...field} />
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
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua Industrial, 456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {producers?.map((producer: any) => {
          const stats = productStats?.find((stat: any) => stat.producerId === producer.id);

          return (
            <Card key={producer.id} className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center mr-3">
                      <Factory className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{producer.name}</h3>
                      <p className="text-sm text-gray-600">{producer.specialty}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {producer.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {producer.address}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold gradient-text">{stats?.totalProducts || 0}</p>
                    <p className="text-xs text-gray-500">Produtos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold gradient-text">{producer.activeOrders || 0}</p>
                    <p className="text-xs text-gray-500">Ativas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold gradient-text">{producer.completedOrders || 0}</p>
                    <p className="text-xs text-gray-500">Concluídas</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg mt-4 border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Código de Login</p>
                      <p className="font-mono font-bold text-gray-900">{producer.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="Ver produtos do produtor"
                        onClick={() => {
                          setSelectedProducerId(producer.id);
                          setShowProducerProducts(true);
                        }}
                      >
                        <Package2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="Ver pedidos em produção"
                        onClick={() => {
                          setSelectedProducerId(producer.id);
                          setShowProducerOrders(true);
                        }}
                      >
                        <Truck className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="Excluir produtor"
                        onClick={() => handleDeleteProducer(producer.id, producer.name)}
                        disabled={deleteProducerMutation.isPending}
                        className="hover:bg-red-50 hover:border-red-200"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Indicador de produtos ativos */}
                {stats && stats.totalProducts > 0 && (
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Catálogo:</span>
                    <div className="flex items-center text-green-600">
                      <Package2 className="h-4 w-4 mr-1" />
                      <span className="font-medium">{stats.activeProducts} ativos de {stats.totalProducts}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {producers?.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Factory className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhum produtor cadastrado</p>
            <p className="text-sm text-gray-400 mb-6">
              Cadastre produtores terceirizados para poder importar seus catálogos de produtos
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gradient-bg text-white">
              Cadastrar Primeiro Produtor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog para mostrar produtos do produtor */}
      <Dialog open={showProducerProducts} onOpenChange={(open) => {
        setShowProducerProducts(open);
        if (!open) {
          setSelectedProducerId(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Produtos do Produtor</DialogTitle>
            <DialogDescription>
              {selectedProducerId && producers?.find((p: any) => p.id === selectedProducerId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {producerProducts && producerProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {producerProducts.map((product: any) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                        </div>
                        <Package className="h-6 w-6 text-gray-400 flex-shrink-0 ml-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Preço:</span>
                          <p className="font-medium text-green-600">
                            R$ {parseFloat(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Categoria:</span>
                          <p className="font-medium">{product.category || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Dimensões:</span>
                          <p className="font-medium text-xs">
                            {product.width && product.height && product.depth 
                              ? `${product.width}×${product.height}×${product.depth}cm`
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <p className={`font-medium text-xs ${product.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {product.isActive ? 'Ativo' : 'Inativo'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum produto encontrado para este produtor</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para mostrar pedidos do produtor */}
      <Dialog open={showProducerOrders} onOpenChange={(open) => {
        setShowProducerOrders(open);
        if (!open) {
          setSelectedProducerId(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedidos em Produção</DialogTitle>
            <DialogDescription>
              {selectedProducerId && producers?.find((p: any) => p.id === selectedProducerId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {producerOrders && producerOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pedido
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prazo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {producerOrders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                          <div className="text-xs text-gray-500">#{order.id.slice(-6)}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.clientName}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {order.product}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === 'ready' ? 'bg-green-100 text-green-800' :
                            order.status === 'production' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status === 'ready' ? 'Pronto' :
                             order.status === 'production' ? 'Em Produção' :
                             order.status === 'accepted' ? 'Aceito' :
                             order.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          R$ {parseFloat(order.producerValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum pedido encontrado para este produtor</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
