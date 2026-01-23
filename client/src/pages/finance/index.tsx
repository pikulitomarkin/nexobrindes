import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Clock, Building2, Calculator, Users, Factory, CreditCard, RefreshCw, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function FinanceIndex() {
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

  const financeModules = [
    {
      title: "Contas a Receber",
      description: "Controle de valores a receber de clientes",
      icon: DollarSign,
      href: "/finance/receivables",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Contas a Pagar",
      description: "Controle de valores a pagar para fornecedores",
      icon: TrendingDown,
      href: "/finance/payables",
      color: "text-red-600",
      bgColor: "bg-red-100"
    },
    {
      title: "Pagamentos de Comissão",
      description: "Gestão de pagamentos para vendedores e sócios",
      icon: Users,
      href: "/finance/commission-payouts",
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Pagamentos aos Produtores",
      description: "Gestão e conciliação de pagamentos aos produtores",
      icon: Factory,
      href: "/admin/producer-payments",
      color: "text-teal-600",
      bgColor: "bg-teal-100"
    },
    {
      title: "Conciliação Bancária",
      description: "Upload de arquivos OFX e conciliação",
      icon: Calculator,
      href: "/finance/reconciliation",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100"
    },
    {
      title: "Histórico de Pagamentos",
      description: "Visualização de todos os pagamentos do sistema",
      icon: CreditCard,
      href: "/finance/payments",
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Estornos",
      description: "Gestão de estornos de pedidos cancelados",
      icon: RefreshCw,
      href: "/finance/estornos",
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <SelectTrigger className="w-[250px]">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {financeModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href}>
              <Card className="card-hover cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 ${module.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${module.color}`} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900 mt-4">
                    {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">
                    {module.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Resumo do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Receita Total</span>
              <span className="font-semibold">
                R$ {(overview?.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Custos de Produção</span>
              <span className="font-semibold">
                R$ {(overview?.payables || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Comissões Pendentes</span>
              <span className="font-semibold">
                R$ {(overview?.pendingCommissions || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Despesas do Mês</span>
              <span className="font-semibold">
                R$ {(overview?.monthlyExpenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Lucro Líquido</span>
                <span className="gradient-text">
                  R$ {((overview?.monthlyRevenue || 0) - (overview?.payables || 0) - (overview?.monthlyExpenses || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
