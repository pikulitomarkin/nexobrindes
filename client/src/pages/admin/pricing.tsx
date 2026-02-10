import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Calculator, Settings, Percent, Layers, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PricingSettings {
  id: string;
  name: string;
  taxRate: string;
  commissionRate: string;
  minimumMargin: string;
  cashDiscount: string;
  isActive: boolean;
}

interface MarginTier {
  id: string;
  settingsId: string;
  minQuantity: number;
  maxQuantity: number | null;
  minRevenue: string;
  maxRevenue: string | null;
  marginRate: string;
  minimumMarginRate: string;
  displayOrder: number;
}

interface CalculationResult {
  totalCost: number;
  marginApplied: number;
  minimumMarginApplied: number;
  idealPrice: number;
  minimumPrice: number;
  totalIdeal: number;
  totalMinimum: number;
  taxRate: number;
  commissionRate: number;
}

export default function AdminPricing() {
  const { toast } = useToast();
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<MarginTier | null>(null);
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);

  const [settingsForm, setSettingsForm] = useState({
    taxRate: "",
    commissionRate: "",
    cashDiscount: "",
  });

  const [tierForm, setTierForm] = useState({
    minRevenue: "",
    maxRevenue: "",
    marginRate: "",
    minimumMarginRate: "",
    displayOrder: 1,
  });

  const [calcForm, setCalcForm] = useState({
    productCost: "",
    quantity: "",
    revenue: "",
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<PricingSettings>({
    queryKey: ["/api/pricing/settings"],
    queryFn: async () => {
      const response = await fetch("/api/pricing/settings");
      if (!response.ok) throw new Error("Erro ao carregar configurações");
      return response.json();
    },
  });

  const { data: marginTiers, isLoading: tiersLoading } = useQuery<MarginTier[]>({
    queryKey: ["/api/pricing/margin-tiers", settings?.id],
    queryFn: async () => {
      if (!settings?.id) return [];
      const response = await fetch(`/api/pricing/margin-tiers/${settings.id}`);
      if (!response.ok) throw new Error("Erro ao carregar faixas de margem");
      return response.json();
    },
    enabled: !!settings?.id,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/pricing/settings/${settings?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao salvar configurações");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing/settings"] });
      toast({ title: "Sucesso!", description: "Configurações salvas com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar configurações", variant: "destructive" });
    },
  });

  const createTierMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/pricing/margin-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, settingsId: settings?.id }),
      });
      if (!response.ok) throw new Error("Erro ao criar faixa");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing/margin-tiers", settings?.id] });
      setTierDialogOpen(false);
      resetTierForm();
      toast({ title: "Sucesso!", description: "Faixa de margem criada" });
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/pricing/margin-tiers/${editingTier?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar faixa");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing/margin-tiers", settings?.id] });
      setTierDialogOpen(false);
      resetTierForm();
      toast({ title: "Sucesso!", description: "Faixa de margem atualizada" });
    },
  });

  const deleteTierMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/pricing/margin-tiers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao excluir faixa");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing/margin-tiers", settings?.id] });
      toast({ title: "Sucesso!", description: "Faixa de margem excluída" });
    },
  });

  const calculatePriceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/pricing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao calcular preço");
      return response.json();
    },
    onSuccess: (data) => {
      setCalcResult(data);
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao calcular preço", variant: "destructive" });
    },
  });

  const resetTierForm = () => {
    setTierForm({ minRevenue: "", maxRevenue: "", marginRate: "", minimumMarginRate: "", displayOrder: 1 });
    setEditingTier(null);
  };

  const handleEditTier = (tier: MarginTier) => {
    setEditingTier(tier);
    setTierForm({
      minRevenue: tier.minRevenue?.toString() || "0",
      maxRevenue: tier.maxRevenue?.toString() || "",
      marginRate: tier.marginRate,
      minimumMarginRate: tier.minimumMarginRate || "20.00",
      displayOrder: tier.displayOrder,
    });
    setTierDialogOpen(true);
  };

  const handleSaveTier = () => {
    const data = {
      minRevenue: tierForm.minRevenue || "0",
      maxRevenue: tierForm.maxRevenue || null,
      marginRate: tierForm.marginRate,
      minimumMarginRate: tierForm.minimumMarginRate,
      displayOrder: tierForm.displayOrder,
      minQuantity: 0,
      maxQuantity: null,
    };

    if (editingTier) {
      updateTierMutation.mutate(data);
    } else {
      createTierMutation.mutate(data);
    }
  };

  const handleCalculate = () => {
    if (!calcForm.productCost) {
      toast({ title: "Atenção", description: "Informe o custo do produto", variant: "destructive" });
      return;
    }

    calculatePriceMutation.mutate({
      productCost: parseFloat(calcForm.productCost),
      quantity: parseInt(calcForm.quantity) || 1,
      revenue: parseFloat(calcForm.revenue) || 0,
    });
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      taxRate: settingsForm.taxRate || settings?.taxRate,
      commissionRate: settingsForm.commissionRate || settings?.commissionRate,
      cashDiscount: settingsForm.cashDiscount || settings?.cashDiscount,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  if (settingsLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Formação de Preço</h1>
          <p className="text-muted-foreground">
            Configure as regras de precificação e margem de lucro
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>
              Taxas fixas aplicadas em todos os cálculos de preço
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Taxa de Imposto (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  placeholder={settings?.taxRate || "9.00"}
                  value={settingsForm.taxRate}
                  onChange={(e) => setSettingsForm({ ...settingsForm, taxRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Comissão Vendedor (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  step="0.01"
                  placeholder={settings?.commissionRate || "15.00"}
                  value={settingsForm.commissionRate}
                  onChange={(e) => setSettingsForm({ ...settingsForm, commissionRate: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="cashDiscount">Desconto À Vista (%)</Label>
              <Input
                id="cashDiscount"
                type="number"
                step="0.01"
                placeholder={settings?.cashDiscount || "5.00"}
                value={settingsForm.cashDiscount}
                onChange={(e) => setSettingsForm({ ...settingsForm, cashDiscount: e.target.value })}
              />
            </div>

            <Button onClick={handleSaveSettings} className="w-full" disabled={updateSettingsMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Valores Atuais:</p>
              <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                <span>Imposto: {settings?.taxRate}%</span>
                <span>Comissão: {settings?.commissionRate}%</span>
                <span>Desc. À Vista: {settings?.cashDiscount}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Simulador de Preço
            </CardTitle>
            <CardDescription>
              Calcule o preço de venda ideal baseado nas regras configuradas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productCost">Custo do Produto (R$)</Label>
                <Input
                  id="productCost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={calcForm.productCost}
                  onChange={(e) => setCalcForm({ ...calcForm, productCost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="1"
                  value={calcForm.quantity}
                  onChange={(e) => setCalcForm({ ...calcForm, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue">Faturamento (R$)</Label>
                <Input
                  id="revenue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={calcForm.revenue}
                  onChange={(e) => setCalcForm({ ...calcForm, revenue: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={handleCalculate} className="w-full" disabled={calculatePriceMutation.isPending}>
              <Calculator className="w-4 h-4 mr-2" />
              {calculatePriceMutation.isPending ? "Calculando..." : "Calcular Preço"}
            </Button>

            {calcResult && (
              <div className="space-y-3 mt-4">
                <Separator />
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    Resultado do Cálculo
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Custo Total:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calcResult.totalCost)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Margem Aplicada:</span>
                      <span className="ml-2 font-medium">{calcResult.marginApplied}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Margem Mínima:</span>
                      <span className="ml-2 font-medium">{calcResult.minimumMarginApplied}%</span>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-muted-foreground">Preço Ideal (unitário)</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(calcResult.idealPrice)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total: {formatCurrency(calcResult.totalIdeal)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-muted-foreground">Preço Mínimo (unitário)</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(calcResult.minimumPrice)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total: {formatCurrency(calcResult.totalMinimum)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Faixas de Margem por Faturamento
              </CardTitle>
              <CardDescription>
                Defina margens diferentes baseadas no valor total do orçamento (faturamento)
              </CardDescription>
            </div>
            <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetTierForm(); setTierDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Faixa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTier ? "Editar Faixa" : "Nova Faixa de Margem"}</DialogTitle>
                  <DialogDescription>
                    Configure a margem para uma faixa de faturamento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minRevenue">Faturamento Mínimo (R$)</Label>
                      <Input
                        id="minRevenue"
                        type="number"
                        step="0.01"
                        value={tierForm.minRevenue}
                        onChange={(e) => setTierForm({ ...tierForm, minRevenue: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxRevenue">Faturamento Máximo (R$)</Label>
                      <Input
                        id="maxRevenue"
                        type="number"
                        step="0.01"
                        placeholder="Ilimitado"
                        value={tierForm.maxRevenue}
                        onChange={(e) => setTierForm({ ...tierForm, maxRevenue: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="marginRate">Margem de Lucro (%)</Label>
                      <Input
                        id="marginRate"
                        type="number"
                        step="0.01"
                        value={tierForm.marginRate}
                        onChange={(e) => setTierForm({ ...tierForm, marginRate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimumMarginRate">Margem Mínima (%)</Label>
                      <Input
                        id="minimumMarginRate"
                        type="number"
                        step="0.01"
                        value={tierForm.minimumMarginRate}
                        onChange={(e) => setTierForm({ ...tierForm, minimumMarginRate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayOrder">Ordem</Label>
                    <Input
                      id="displayOrder"
                      type="number"
                      value={tierForm.displayOrder}
                      onChange={(e) => setTierForm({ ...tierForm, displayOrder: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTierDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveTier} disabled={createTierMutation.isPending || updateTierMutation.isPending}>
                    {editingTier ? "Salvar" : "Criar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {tiersLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span>Carregando faixas...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faixa de Faturamento (R$)</TableHead>
                  <TableHead>Margem de Lucro</TableHead>
                  <TableHead>Margem Mínima</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marginTiers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma faixa de margem configurada
                    </TableCell>
                  </TableRow>
                ) : (
                  marginTiers?.map((tier) => (
                    <TableRow key={tier.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          R$ {parseFloat(tier.minRevenue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 0 })} - {tier.maxRevenue ? `R$ ${parseFloat(tier.maxRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : "∞"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          <Percent className="w-3 h-3 mr-1" />
                          {tier.marginRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          <Percent className="w-3 h-3 mr-1" />
                          {tier.minimumMarginRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>{tier.displayOrder}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditTier(tier)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-600"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir esta faixa?")) {
                              deleteTierMutation.mutate(tier.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              <Calculator className="w-4 h-4 inline mr-1" />
              Fórmula de Cálculo (Markup Divisor)
            </p>
            <code className="block bg-white dark:bg-gray-800 p-2 rounded text-xs">
              Preço de Venda = Custo do Produto / (1 - Imposto% - Comissão% - Margem%)
            </code>
            <p className="text-muted-foreground mt-2">
              Exemplo: Custo R$ 10 / (1 - 0.11 - 0.04 - 0.28) = R$ 17,54
            </p>
            <p className="text-muted-foreground mt-1">
              A margem é selecionada automaticamente pela faixa de faturamento do orçamento
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
