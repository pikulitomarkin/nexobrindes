import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Factory, MapPin, Phone, User, RefreshCw, Package, Truck, Eye } from "lucide-react";
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

export default function LogisticsProducers() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isShipmentsModalOpen, setIsShipmentsModalOpen] = useState(false);
  const [selectedProducerId, setSelectedProducerId] = useState<string | null>(null);
  const [userCode, setUserCode] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    address: "",
    password: "",
    username: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateUserCode = () => {
    const timestamp = Date.now().toString().slice(-8);
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PRO${timestamp}${randomStr}`;
  };

  useEffect(() => {
    if (isCreateModalOpen) {
      setUserCode(generateUserCode());
    }
  }, [isCreateModalOpen]);

  const { data: producers, isLoading } = useQuery({
    queryKey: ["/api/producers"],
    queryFn: async () => {
      const response = await fetch('/api/producers');
      if (!response.ok) throw new Error('Failed to fetch producers');
      return response.json();
    },
  });

  // Get producer statistics
  const { data: producerStats } = useQuery({
    queryKey: ["/api/logistics/producer-stats"],
    queryFn: async () => {
      const response = await fetch("/api/logistics/producer-stats");
      if (!response.ok) throw new Error('Failed to fetch producer stats');
      return response.json();
    },
  });

  // Get producer orders when modal is open
  const { data: producerOrders } = useQuery({
    queryKey: ["/api/production-orders/producer", selectedProducerId],
    queryFn: async () => {
      if (!selectedProducerId) return [];
      const response = await fetch(`/api/production-orders/producer/${selectedProducerId}`);
      if (!response.ok) throw new Error('Failed to fetch producer orders');
      return response.json();
    },
    enabled: !!selectedProducerId && isOrdersModalOpen,
  });

  // Get producer shipments when modal is open
  const { data: producerShipments } = useQuery({
    queryKey: ["/api/production-orders/producer/shipments", selectedProducerId],
    queryFn: async () => {
      if (!selectedProducerId) return [];
      const response = await fetch(`/api/production-orders/producer/${selectedProducerId}`);
      if (!response.ok) throw new Error('Failed to fetch producer shipments');
      const orders = await response.json();
      // Filtrar apenas pedidos que foram enviados ou estão prontos
      return orders.filter((order: any) => 
        ['ready', 'shipped', 'delivered', 'completed'].includes(order.status)
      );
    },
    enabled: !!selectedProducerId && isShipmentsModalOpen,
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
      setIsCreateModalOpen(false);
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

  const onSubmit = (data: ProducerFormValues) => {
    createProducerMutation.mutate(data);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      specialty: "",
      address: "",
      password: "",
      username: ""
    });
  };

  const handleViewProducerOrders = (producerId: string) => {
    setSelectedProducerId(producerId);
    setIsOrdersModalOpen(true);
  };

  const handleViewProducerShipments = (producerId: string) => {
    setSelectedProducerId(producerId);
    setIsShipmentsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium",
      accepted: "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium",
      production: "bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium",
      ready: "bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium animate-pulse",
      shipped: "bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full text-xs font-medium",
      delivered: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
      completed: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
    };

    const statusLabels = {
      pending: "Pendente",
      accepted: "Aceito",
      production: "Em Produção",
      ready: "Pronto para Expedição",
      shipped: "Despachado",
      delivered: "Entregue",
      completed: "Concluído",
    };

    return (
      <span className={statusClasses[status as keyof typeof statusClasses] || "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
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
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
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
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-orange-600 to-red-600 text-white"
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
          const stats = producerStats?.find((stat: any) => stat.producerId === producer.id);

          return (
            <Card key={producer.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center mr-3">
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
                    <p className="text-2xl font-bold text-orange-600">{stats?.totalProducts || 0}</p>
                    <p className="text-xs text-gray-500">Produtos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{producer.activeOrders || 0}</p>
                    <p className="text-xs text-gray-500">Ativas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{producer.completedOrders || 0}</p>
                    <p className="text-xs text-gray-500">Concluídas</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg mt-4 border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Código de Login</p>
                      <p className="font-mono font-bold text-gray-900">{producer.userCode}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-600 hover:text-blue-600"
                        onClick={() => handleViewProducerOrders(producer.id)}
                        title="Ver pedidos do produtor"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-600 hover:text-green-600"
                        onClick={() => handleViewProducerShipments(producer.id)}
                        title="Ver expedições do produtor"
                      >
                        <Truck className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Indicador de produtos ativos */}
                {stats && stats.totalProducts > 0 && (
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Catálogo:</span>
                    <div className="flex items-center text-green-600">
                      <Package className="h-4 w-4 mr-1" />
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
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              Cadastrar Primeiro Produtor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal - Pedidos do Produtor */}
      <Dialog open={isOrdersModalOpen} onOpenChange={setIsOrdersModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pedidos do Produtor - {producers?.find(p => p.id === selectedProducerId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!producerOrders || producerOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum pedido encontrado</h3>
                <p className="text-gray-500">Este produtor não possui pedidos ativos.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {producerOrders.map((order: any) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{order.orderNumber}</h4>
                        <p className="text-gray-600">{order.product}</p>
                        <p className="text-sm text-gray-500">Cliente: {order.clientName}</p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(order.status)}
                        <p className="text-sm text-gray-500 mt-1">
                          Prazo: {order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded border">
                        <p className="text-sm text-gray-700">{order.notes}</p>
                      </div>
                    )}

                    <div className="mt-3 flex justify-between text-sm text-gray-600">
                      <span>Aceito em: {order.acceptedAt ? new Date(order.acceptedAt).toLocaleDateString('pt-BR') : 'Não aceito'}</span>
                      {order.producerValue && (
                        <span className="font-medium text-green-600">
                          Valor: R$ {parseFloat(order.producerValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal - Expedições do Produtor */}
      <Dialog open={isShipmentsModalOpen} onOpenChange={setIsShipmentsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Expedições do Produtor - {producers?.find(p => p.id === selectedProducerId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!producerShipments || producerShipments.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma expedição encontrada</h3>
                <p className="text-gray-500">Este produtor não possui expedições prontas ou enviadas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {producerShipments.map((order: any) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{order.orderNumber}</h4>
                        <p className="text-gray-600">{order.product}</p>
                        <p className="text-sm text-gray-500">Cliente: {order.clientName}</p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(order.status)}
                        <p className="text-sm text-gray-500 mt-1">
                          {order.trackingCode && (
                            <span>Rastreamento: {order.trackingCode}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Endereço:</span>
                        <p className="font-medium">{order.clientAddress || 'Endereço não informado'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Contato:</span>
                        <p className="font-medium">{order.clientPhone || 'Telefone não informado'}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-between text-sm text-gray-600">
                      <span>
                        {order.status === 'ready' && 'Pronto desde: '}
                        {order.status === 'shipped' && 'Enviado em: '}
                        {order.status === 'delivered' && 'Entregue em: '}
                        {order.status === 'completed' && 'Concluído em: '}
                        {order.completedAt ? new Date(order.completedAt).toLocaleDateString('pt-BR') : 'N/A'}
                      </span>
                      {order.deliveryDeadline && (
                        <span>
                          Prazo de entrega: {new Date(order.deliveryDeadline).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}