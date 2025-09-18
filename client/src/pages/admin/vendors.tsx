
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
import { Plus, Edit, Eye, Phone, Mail, FileText, User, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const vendorFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  phone: z.string().optional(),
  address: z.string().optional(),
  commissionRate: z.string().min(1, "Taxa de comissão é obrigatória"),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

export default function AdminVendors() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [showVendorDetails, setShowVendorDetails] = useState(false);
  const [showEditVendor, setShowEditVendor] = useState(false);
  const [showVendorOrders, setShowVendorOrders] = useState(false);
  const [userCode, setUserCode] = useState("");
  const { toast } = useToast();

  const generateUserCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `VEN${timestamp}${randomStr}`;
  };

  useEffect(() => {
    if (isCreateDialogOpen) {
      setUserCode(generateUserCode());
    }
  }, [isCreateDialogOpen]);

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: vendorOrders } = useQuery({
    queryKey: ["/api/vendors", selectedVendorId, "orders"],
    queryFn: async () => {
      if (!selectedVendorId) return [];
      const response = await fetch(`/api/vendors/${selectedVendorId}/orders`);
      if (!response.ok) throw new Error('Failed to fetch vendor orders');
      return response.json();
    },
    enabled: !!selectedVendorId && showVendorOrders,
  });

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      commissionRate: "10.00",
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const vendorData = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        password: data.password,
        userCode: userCode,
        commissionRate: data.commissionRate
      };
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar vendedor");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso!",
        description: `Vendedor criado com sucesso! Código de acesso: ${userCode}`,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o vendedor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VendorFormValues) => {
    createVendorMutation.mutate(data);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Vendedores</h1>
          <p className="text-gray-600">Cadastre e gerencie vendedores do sistema</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-white">
              <Plus className="h-4 w-4 mr-2" />
              Novo Vendedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Vendedor</DialogTitle>
              <DialogDescription>
                Preencha os dados completos do vendedor
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-blue-700">Código de Acesso do Vendedor</FormLabel>
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
                        <Input placeholder="Maria Santos" {...field} />
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
                      <p className="text-xs text-gray-600">Senha que o vendedor usará para acessar o sistema</p>
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
                          <Input type="email" placeholder="maria@email.com" {...field} />
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

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua das Flores, 123, Centro, São Paulo, SP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxa de Comissão (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="10.00" {...field} />
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de Vendedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors?.map((vendor: any) => (
              <Card key={vendor.id} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                      {vendor.userCode && (
                        <div className="flex items-center mt-1">
                          <User className="h-3 w-3 text-blue-600 mr-1" />
                          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {vendor.userCode}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedVendorId(vendor.id);
                          setShowVendorOrders(true);
                        }}
                        title="Ver Pedidos"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Ver Detalhes"
                        onClick={() => {
                          setSelectedVendorId(vendor.id);
                          setShowVendorDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Editar"
                        onClick={() => {
                          setSelectedVendorId(vendor.id);
                          setShowEditVendor(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {vendor.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{vendor.email}</span>
                      </div>
                    )}
                    {vendor.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                    {vendor.address && (
                      <div className="flex items-start text-sm text-gray-600">
                        <div className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5">📍</div>
                        <span className="line-clamp-2">{vendor.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Comissão:</span>
                      <span className="font-medium">{vendor.commissionRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${vendor.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {vendor.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para mostrar pedidos do vendedor */}
      <Dialog open={showVendorOrders} onOpenChange={(open) => {
        setShowVendorOrders(open);
        if (!open) {
          setSelectedVendorId(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedidos do Vendedor</DialogTitle>
            <DialogDescription>
              {selectedVendorId && vendors?.find((v: any) => v.id === selectedVendorId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {vendorOrders && vendorOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Número
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
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
                    {vendorOrders.map((order: any) => (
                      <tr key={order.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {order.clientName}
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
                <p className="text-gray-500">Nenhum pedido encontrado para este vendedor</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalhes do vendedor */}
      <Dialog open={showVendorDetails} onOpenChange={(open) => {
        setShowVendorDetails(open);
        if (!open) {
          setSelectedVendorId(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Vendedor</DialogTitle>
          </DialogHeader>
          {selectedVendorId && (
            <div className="space-y-4">
              {(() => {
                const vendor = vendors?.find((v: any) => v.id === selectedVendorId);
                if (!vendor) return null;
                
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nome:</label>
                      <p className="text-sm text-gray-900">{vendor.name}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Código de Acesso:</label>
                      <p className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {vendor.userCode || vendor.username || 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email:</label>
                      <p className="text-sm text-gray-900">{vendor.email || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Telefone:</label>
                      <p className="text-sm text-gray-900">{vendor.phone || 'N/A'}</p>
                    </div>

                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-600">Endereço:</label>
                      <p className="text-sm text-gray-900">{vendor.address || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Taxa de Comissão:</label>
                      <p className="text-sm text-gray-900">{vendor.commissionRate}%</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status:</label>
                      <p className={`text-sm font-medium ${vendor.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {vendor.isActive ? 'Ativo' : 'Inativo'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para editar vendedor */}
      <Dialog open={showEditVendor} onOpenChange={(open) => {
        setShowEditVendor(open);
        if (!open) {
          setSelectedVendorId(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Vendedor</DialogTitle>
          </DialogHeader>
          {selectedVendorId && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Funcionalidade de edição em desenvolvimento...</p>
              <Button onClick={() => setShowEditVendor(false)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
