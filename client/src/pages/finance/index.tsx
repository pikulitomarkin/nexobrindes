
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  DollarSign, 
  TrendingDown, 
  Receipt, 
  TrendingUp, 
  Calculator, 
  CreditCard,
  ArrowRight,
  FileText,
  Users,
  Factory
} from "lucide-react";

export default function FinanceIndex() {
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
      title: "Notas de Despesas",
      description: "Upload e controle de notas de gastos",
      icon: Receipt,
      href: "/finance/expenses",
      color: "text-orange-600",
      bgColor: "bg-orange-100"
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
      title: "Pagamentos de Produtores",
      description: "Controle de pagamentos para produtores externos",
      icon: Factory,
      href: "/admin/producer-payments",
      color: "text-purple-600",
      bgColor: "bg-purple-100"
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
    }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Módulo Financeiro</h1>
        <p className="text-gray-600">Controle completo das finanças do sistema</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total a Receber</p>
                <p className="text-2xl font-bold gradient-text">R$ 15.450,00</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total a Pagar</p>
                <p className="text-2xl font-bold gradient-text">R$ 8.320,00</p>
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
                <p className="text-sm font-medium text-gray-600">Produtores a Pagar</p>
                <p className="text-2xl font-bold gradient-text">R$ 830,00</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Factory className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Despesas do Mês</p>
                <p className="text-2xl font-bold gradient-text">R$ 2.150,00</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Receipt className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo Líquido</p>
                <p className="text-2xl font-bold gradient-text text-green-600">R$ 4.980,00</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finance Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {financeModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href}>
              <Card className="card-hover cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 ${module.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${module.color}`} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900">
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

      {/* Recent Activity */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Pagamento recebido - Pedido #12345</p>
                    <p className="text-xs text-gray-500">Há 2 horas</p>
                  </div>
                </div>
                <span className="font-semibold text-green-600">R$ 1.500,00</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calculator className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Arquivo OFX importado</p>
                    <p className="text-xs text-gray-500">Há 5 horas</p>
                  </div>
                </div>
                <span className="text-sm text-gray-600">15 transações</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Nova despesa registrada</p>
                    <p className="text-xs text-gray-500">Ontem</p>
                  </div>
                </div>
                <span className="font-semibold text-red-600">R$ 350,00</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
