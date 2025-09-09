
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
import { Settings, Edit, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const commissionFormSchema = z.object({
  commissionRate: z.string().min(1, "Taxa de comissão é obrigatória"),
});

type CommissionFormValues = z.infer<typeof commissionFormSchema>;

export default function CommissionSettings() {
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const form = useForm<CommissionFormValues>({
    resolver: zodResolver(commissionFormSchema),
    defaultValues: {
      commissionRate: "",
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ vendorId, commissionRate }: { vendorId: string, commissionRate: string }) => {
      const response = await fetch(`/api/vendors/${vendorId}/commission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar comissão");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setEditingVendor(null);
      form.reset();
      toast({
        title: "Sucesso!",
        description: "Comissão atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a comissão",
        variant: "destructive",
      });
    },
  });

  const handleEditCommission = (vendor: any) => {
    setEditingVendor(vendor.id);
    form.setValue('commissionRate', vendor.commissionRate);
  };

  const onSubmit = (data: CommissionFormValues) => {
    if (editingVendor) {
      updateCommissionMutation.mutate({
        vendorId: editingVendor,
        commissionRate: data.commissionRate
      });
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
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Settings className="h-8 w-8 gradient-text mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuração de Comissões</h1>
            <p className="text-gray-600">Configure as taxas de comissão individuais para cada vendedor</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {vendors?.map((vendor: any) => (
          <Card key={vendor.id} className="card-hover">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                  <p className="text-sm text-gray-600">{vendor.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`status-badge ${vendor.isActive ? 'status-confirmed' : 'status-cancelled'}`}>
                    {vendor.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Taxa de Comissão</label>
                    {editingVendor === vendor.id ? (
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center space-x-2 mt-1">
                          <FormField
                            control={form.control}
                            name="commissionRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="flex items-center space-x-1">
                                    <Input 
                                      type="number" 
                                      step="0.01" 
                                      className="w-20" 
                                      {...field} 
                                    />
                                    <span className="text-sm text-gray-500">%</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="gradient-bg text-white"
                            disabled={updateCommissionMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingVendor(null)}
                          >
                            Cancelar
                          </Button>
                        </form>
                      </Form>
                    ) : (
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-2xl font-bold gradient-text">{vendor.commissionRate}%</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCommission(vendor)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Username</p>
                  <p className="font-medium">{vendor.username}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {vendors?.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum vendedor encontrado</h3>
            <p className="text-gray-600">Cadastre vendedores para configurar suas comissões</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
