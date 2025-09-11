
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, ShoppingCart, Plus, MessageCircle, Hash, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const clientFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  cpfCnpj: z.string().optional(),
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  zipCode: z.string().min(8, "CEP deve ter 8 dígitos"),
  reference: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function VendorClients() {
  const vendorId = "vendor-1"; // Em produção, buscar do contexto/auth
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/vendor/clients", vendorId],
    queryFn: async () => {
      const response = await fetch(`/api/vendors/${vendorId}/clients`);
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      whatsapp: "",
      cpfCnpj: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      reference: "",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      // Combinar campos de endereço em um campo único para compatibilidade
      const address = `${data.street}, ${data.number}${data.complement ? ', ' + data.complement : ''}, ${data.neighborhood}, ${data.city}, ${data.state}, CEP: ${data.zipCode}${data.reference ? ' - Ref: ' + data.reference : ''}`;
      
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          cpfCnpj: data.cpfCnpj,
          address: address,
          vendorId: vendorId,
        }),
      });
      if (!response.ok) throw new Error("Erro ao criar cliente");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/clients", vendorId] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso!",
        description: "Cliente criado com sucesso",
      });
    },
  });

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

  const onSubmit = (data: ClientFormValues) => {
    createClientMutation.mutate(data);
  };

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
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
              <DialogDescription>
                Preencha os dados completos do cliente
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                {/* Seção de Endereço Detalhado */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Endereço Completo</h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rua/Avenida *</FormLabel>
                            <FormControl>
                              <Input placeholder="Rua das Flores" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número *</FormLabel>
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
                      name="complement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Apt 101, Bloco A" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro *</FormLabel>
                          <FormControl>
                            <Input placeholder="Centro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade *</FormLabel>
                          <FormControl>
                            <Input placeholder="São Paulo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado *</FormLabel>
                          <FormControl>
                            <Input placeholder="SP" maxLength={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="01234-567" 
                              maxLength={9}
                              {...field}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, '');
                                if (value.length > 5) {
                                  value = value.replace(/^(\d{5})(\d)/, '$1-$2');
                                }
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ponto de Referência</FormLabel>
                        <FormControl>
                          <Input placeholder="Próximo ao Shopping Center" {...field} />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients?.map((client: any) => (
          <Card key={client.id} className="card-hover">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-white">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
              </div>
              
              <div className="space-y-2 mb-4">
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
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-xs leading-tight">{client.address}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold gradient-text">{client.ordersCount || 0}</p>
                    <p className="text-xs text-gray-500">Pedidos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold gradient-text">
                      R$ {((client.totalSpent || 0) / 1000).toFixed(1)}k
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
              </div>

              <Button className="w-full gradient-bg text-white">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ver Pedidos
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
}
