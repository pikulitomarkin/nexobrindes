import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Clock, Building2 } from "lucide-react";

export default function AdminFinance() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const response = await fetch('/api/branches');
      if (!response.ok) throw new Error('Failed to fetch branches');
      return response.json();
    },
  });

  const { data: overview, isLoading } = useQuery({
    queryKey: ["/api/finance/overview", selectedBranchId],
    queryFn: async () => {
      const url = selectedBranchId && selectedBranchId !== "all"
        ? `/api/finance/overview?branchId=${selectedBranchId}`
        : `/api/finance/overview`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch overview');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Visão Financeira</h1>
          <p className="text-gray-600">Controle financeiro completo do sistema</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-500" />
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
            >
              <SelectTrigger className="w-[250px]" data-testid="select-branch-filter">
                <SelectValue placeholder="Filtrar por filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Filiais</SelectItem>
                {branches?.map((branch: any) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} - {branch.city}
                    {branch.isHeadquarters && " (Matriz)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedBranchId && selectedBranchId !== "all" && (
            <p className="text-xs text-gray-500">
              Filtrando pedidos, comissões e recebíveis da filial selecionada
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contas a Receber</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {(overview?.receivables || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contas a Pagar</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {(overview?.payables || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo em Conta</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {(overview?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Comissões Pendentes</p>
                <p className="text-2xl font-bold gradient-text">
                  R$ {(overview?.pendingCommissions || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start gradient-bg text-white">
              Importar Arquivo OFX
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Processar Comissões
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Gerar Relatório Mensal
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Conciliar Pagamentos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Receita Total</span>
                <span className="font-semibold">R$ 84.500,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Custos de Produção</span>
                <span className="font-semibold">R$ 52.300,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Comissões Pagas</span>
                <span className="font-semibold">R$ 8.450,00</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Lucro Líquido</span>
                  <span className="gradient-text">R$ 23.750,00</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
