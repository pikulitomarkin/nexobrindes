
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, CreditCard, Truck, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function AdminSettings() {
  const { toast } = useToast();
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false);
  const [shippingMethodDialogOpen, setShippingMethodDialogOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<any>(null);
  const [editingShippingMethod, setEditingShippingMethod] = useState<any>(null);

  // Payment method form
  const [paymentMethodForm, setPaymentMethodForm] = useState({
    name: "",
    type: "pix", // pix, credit_card, boleto, transfer
    maxInstallments: 1,
    installmentInterest: 0,
    isActive: true
  });

  // Shipping method form
  const [shippingMethodForm, setShippingMethodForm] = useState({
    name: "",
    type: "fixed", // fixed, calculated, free
    basePrice: 0,
    freeShippingThreshold: 0,
    estimatedDays: 5,
    isActive: true
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["/api/settings/payment-methods"],
    queryFn: async () => {
      const response = await fetch('/api/settings/payment-methods');
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      return response.json();
    },
  });

  const { data: shippingMethods } = useQuery({
    queryKey: ["/api/settings/shipping-methods"],
    queryFn: async () => {
      const response = await fetch('/api/settings/shipping-methods');
      if (!response.ok) throw new Error('Failed to fetch shipping methods');
      return response.json();
    },
  });

  const createPaymentMethodMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/settings/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar forma de pagamento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment-methods"] });
      setPaymentMethodDialogOpen(false);
      resetPaymentMethodForm();
      toast({
        title: "Sucesso!",
        description: "Forma de pagamento criada com sucesso",
      });
    },
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/settings/payment-methods/${editingPaymentMethod.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar forma de pagamento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment-methods"] });
      setPaymentMethodDialogOpen(false);
      resetPaymentMethodForm();
      toast({
        title: "Sucesso!",
        description: "Forma de pagamento atualizada com sucesso",
      });
    },
  });

  const createShippingMethodMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/settings/shipping-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar método de frete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/shipping-methods"] });
      setShippingMethodDialogOpen(false);
      resetShippingMethodForm();
      toast({
        title: "Sucesso!",
        description: "Método de frete criado com sucesso",
      });
    },
  });

  const updateShippingMethodMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/settings/shipping-methods/${editingShippingMethod.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar método de frete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/shipping-methods"] });
      setShippingMethodDialogOpen(false);
      resetShippingMethodForm();
      toast({
        title: "Sucesso!",
        description: "Método de frete atualizado com sucesso",
      });
    },
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/settings/payment-methods/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao excluir forma de pagamento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment-methods"] });
      toast({
        title: "Sucesso!",
        description: "Forma de pagamento excluída com sucesso",
      });
    },
  });

  const deleteShippingMethodMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/settings/shipping-methods/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao excluir método de frete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/shipping-methods"] });
      toast({
        title: "Sucesso!",
        description: "Método de frete excluído com sucesso",
      });
    },
  });

  const resetPaymentMethodForm = () => {
    setPaymentMethodForm({
      name: "",
      type: "pix",
      maxInstallments: 1,
      installmentInterest: 0,
      isActive: true
    });
    setEditingPaymentMethod(null);
  };

  const resetShippingMethodForm = () => {
    setShippingMethodForm({
      name: "",
      type: "fixed",
      basePrice: 0,
      freeShippingThreshold: 0,
      estimatedDays: 5,
      isActive: true
    });
    setEditingShippingMethod(null);
  };

  const handleEditPaymentMethod = (method: any) => {
    setPaymentMethodForm({
      name: method.name,
      type: method.type,
      maxInstallments: method.maxInstallments || 1,
      installmentInterest: method.installmentInterest || 0,
      isActive: method.isActive
    });
    setEditingPaymentMethod(method);
    setPaymentMethodDialogOpen(true);
  };

  const handleEditShippingMethod = (method: any) => {
    setShippingMethodForm({
      name: method.name,
      type: method.type,
      basePrice: method.basePrice || 0,
      freeShippingThreshold: method.freeShippingThreshold || 0,
      estimatedDays: method.estimatedDays || 5,
      isActive: method.isActive
    });
    setEditingShippingMethod(method);
    setShippingMethodDialogOpen(true);
  };

  const handlePaymentMethodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPaymentMethod) {
      updatePaymentMethodMutation.mutate(paymentMethodForm);
    } else {
      createPaymentMethodMutation.mutate(paymentMethodForm);
    }
  };

  const handleShippingMethodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingShippingMethod) {
      updateShippingMethodMutation.mutate(shippingMethodForm);
    } else {
      createShippingMethodMutation.mutate(shippingMethodForm);
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels = {
      pix: "PIX",
      credit_card: "Cartão de Crédito",
      boleto: "Boleto",
      transfer: "Transferência Bancária"
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getShippingTypeLabel = (type: string) => {
    const labels = {
      fixed: "Valor Fixo",
      calculated: "Calculado",
      free: "Grátis"
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações Gerais</h1>
        <p className="text-gray-600">Configure formas de pagamento e métodos de frete do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Formas de Pagamento
              </CardTitle>
              <Dialog open={paymentMethodDialogOpen} onOpenChange={(open) => {
                setPaymentMethodDialogOpen(open);
                if (!open) resetPaymentMethodForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="gradient-bg text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Forma
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingPaymentMethod ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
                    </DialogTitle>
                    <DialogDescription>
                      Configure as formas de pagamento disponíveis no sistema
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePaymentMethodSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="payment-name">Nome</Label>
                      <Input
                        id="payment-name"
                        value={paymentMethodForm.name}
                        onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, name: e.target.value })}
                        placeholder="Ex: PIX, Cartão de Crédito"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment-type">Tipo</Label>
                      <Select value={paymentMethodForm.type} onValueChange={(value) => setPaymentMethodForm({ ...paymentMethodForm, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="transfer">Transferência Bancária</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {paymentMethodForm.type === "credit_card" && (
                      <>
                        <div>
                          <Label htmlFor="max-installments">Máximo de Parcelas</Label>
                          <Input
                            id="max-installments"
                            type="number"
                            min="1"
                            max="12"
                            value={paymentMethodForm.maxInstallments}
                            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, maxInstallments: parseInt(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="installment-interest">Taxa de Juros (%)</Label>
                          <Input
                            id="installment-interest"
                            type="number"
                            step="0.01"
                            min="0"
                            value={paymentMethodForm.installmentInterest}
                            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, installmentInterest: parseFloat(e.target.value) })}
                          />
                        </div>
                      </>
                    )}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="payment-active"
                        checked={paymentMethodForm.isActive}
                        onCheckedChange={(checked) => setPaymentMethodForm({ ...paymentMethodForm, isActive: checked })}
                      />
                      <Label htmlFor="payment-active">Ativo</Label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setPaymentMethodDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createPaymentMethodMutation.isPending || updatePaymentMethodMutation.isPending}>
                        {editingPaymentMethod ? "Atualizar" : "Criar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMethods?.map((method: any) => (
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{method.name}</p>
                    <p className="text-sm text-gray-500">{getPaymentTypeLabel(method.type)}</p>
                    {method.type === "credit_card" && (
                      <p className="text-xs text-gray-400">
                        Até {method.maxInstallments}x • {method.installmentInterest}% juros
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${method.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {method.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleEditPaymentMethod(method)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deletePaymentMethodMutation.mutate(method.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {!paymentMethods?.length && (
                <p className="text-center text-gray-500 py-8">Nenhuma forma de pagamento cadastrada</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Methods */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Métodos de Frete
              </CardTitle>
              <Dialog open={shippingMethodDialogOpen} onOpenChange={(open) => {
                setShippingMethodDialogOpen(open);
                if (!open) resetShippingMethodForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="gradient-bg text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Método
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingShippingMethod ? "Editar Método de Frete" : "Novo Método de Frete"}
                    </DialogTitle>
                    <DialogDescription>
                      Configure os métodos de frete disponíveis no sistema
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleShippingMethodSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="shipping-name">Nome</Label>
                      <Input
                        id="shipping-name"
                        value={shippingMethodForm.name}
                        onChange={(e) => setShippingMethodForm({ ...shippingMethodForm, name: e.target.value })}
                        placeholder="Ex: Correios PAC, Transportadora"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipping-type">Tipo</Label>
                      <Select value={shippingMethodForm.type} onValueChange={(value) => setShippingMethodForm({ ...shippingMethodForm, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Valor Fixo</SelectItem>
                          <SelectItem value="calculated">Calculado por CEP</SelectItem>
                          <SelectItem value="free">Frete Grátis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {shippingMethodForm.type === "fixed" && (
                      <div>
                        <Label htmlFor="base-price">Valor (R$)</Label>
                        <Input
                          id="base-price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={shippingMethodForm.basePrice}
                          onChange={(e) => setShippingMethodForm({ ...shippingMethodForm, basePrice: parseFloat(e.target.value) })}
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="free-threshold">Frete Grátis Acima de (R$)</Label>
                      <Input
                        id="free-threshold"
                        type="number"
                        step="0.01"
                        min="0"
                        value={shippingMethodForm.freeShippingThreshold}
                        onChange={(e) => setShippingMethodForm({ ...shippingMethodForm, freeShippingThreshold: parseFloat(e.target.value) })}
                        placeholder="0 = sem frete grátis"
                      />
                    </div>
                    <div>
                      <Label htmlFor="estimated-days">Prazo Estimado (dias)</Label>
                      <Input
                        id="estimated-days"
                        type="number"
                        min="1"
                        value={shippingMethodForm.estimatedDays}
                        onChange={(e) => setShippingMethodForm({ ...shippingMethodForm, estimatedDays: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="shipping-active"
                        checked={shippingMethodForm.isActive}
                        onCheckedChange={(checked) => setShippingMethodForm({ ...shippingMethodForm, isActive: checked })}
                      />
                      <Label htmlFor="shipping-active">Ativo</Label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setShippingMethodDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createShippingMethodMutation.isPending || updateShippingMethodMutation.isPending}>
                        {editingShippingMethod ? "Atualizar" : "Criar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shippingMethods?.map((method: any) => (
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{method.name}</p>
                    <p className="text-sm text-gray-500">{getShippingTypeLabel(method.type)}</p>
                    <div className="text-xs text-gray-400">
                      {method.type === "fixed" && `R$ ${method.basePrice?.toFixed(2)} • `}
                      {method.freeShippingThreshold > 0 && `Grátis acima de R$ ${method.freeShippingThreshold?.toFixed(2)} • `}
                      {method.estimatedDays} dias
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${method.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {method.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleEditShippingMethod(method)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteShippingMethodMutation.mutate(method.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {!shippingMethods?.length && (
                <p className="text-center text-gray-500 py-8">Nenhum método de frete cadastrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
