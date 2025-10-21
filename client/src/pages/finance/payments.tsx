
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, CreditCard, FileText, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentsHistory() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["/api/finance/payments"],
    queryFn: async () => {
      const response = await fetch("/api/finance/payments");
      if (!response.ok) throw new Error('Failed to fetch payments');
      return response.json();
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await fetch("/api/orders");
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["/api/commissions"],
    queryFn: async () => {
      const response = await fetch("/api/commissions");
      if (!response.ok) throw new Error('Failed to fetch commissions');
      return response.json();
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ["/api/finance/expenses"],
    queryFn: async () => {
      const response = await fetch("/api/finance/expenses");
      if (!response.ok) throw new Error('Failed to fetch expenses');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calcular métricas reais
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Receita Total do mês atual
  const monthlyRevenue = orders?.filter((order: any) => {
    if (!order.createdAt || order.status === 'cancelled') return false;
    const orderDate = new Date(order.createdAt);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  }).reduce((total: number, order: any) => total + parseFloat(order.totalValue || '0'), 0) || 0;

  // Custos de Produção (pagamentos para produtores aprovados)
  const productionCosts = expenses?.filter((expense: any) => 
    expense.category === 'material' || expense.category === 'production'
  ).reduce((total: number, expense: any) => total + parseFloat(expense.amount || '0'), 0) || 0;

  // Comissões Pendentes
  const pendingCommissions = commissions?.filter((commission: any) => 
    commission.status === 'pending' || commission.status === 'confirmed'
  ).reduce((total: number, commission: any) => total + parseFloat(commission.amount || '0'), 0) || 0;

  // Despesas do Mês
  const monthlyExpenses = expenses?.filter((expense: any) => {
    if (!expense.createdAt) return false;
    const expenseDate = new Date(expense.createdAt);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  }).reduce((total: number, expense: any) => total + parseFloat(expense.amount || '0'), 0) || 0;

  // Lucro Líquido
  const netProfit = monthlyRevenue - productionCosts - pendingCommissions - monthlyExpenses;

  // Atividades recentes (últimos pagamentos e transações)
  const recentActivities = [];

  // Adicionar pagamentos recentes
  if (payments && payments.length > 0) {
    payments.slice(0, 3).forEach((payment: any) => {
      recentActivities.push({
        type: 'payment',
        description: `Pagamento recebido - ${payment.orderNumber || 'Pedido'}`,
        amount: parseFloat(payment.amount || '0'),
        time: payment.paidAt || payment.createdAt,
        positive: true
      });
    });
  }

  // Adicionar despesas recentes
  if (expenses && expenses.length > 0) {
    expenses.filter((expense: any) => expense.status === 'approved').slice(0, 2).forEach((expense: any) => {
      recentActivities.push({
        type: 'expense',
        description: expense.description || 'Nova despesa registrada',
        amount: parseFloat(expense.amount || '0'),
        time: expense.createdAt,
        positive: false
      });
    });
  }

  // Ordenar atividades por data (mais recente primeiro)
  recentActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Pagamentos</h1>
          <p className="text-gray-600 mt-2">Visualização de todos os pagamentos do sistema</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Resumo do Mês */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Resumo do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Custos de Produção</p>
              <p className="text-2xl font-bold text-red-600">
                R$ {productionCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Comissões Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600">
                R$ {pendingCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Despesas do Mês</p>
              <p className="text-2xl font-bold text-orange-600">
                R$ {monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-gray-700">Lucro Líquido</p>
              <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Atividades Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      activity.type === 'payment' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {activity.type === 'payment' ? (
                        <DollarSign className={`h-5 w-5 ${activity.positive ? 'text-green-600' : 'text-red-600'}`} />
                      ) : (
                        <FileText className="h-5 w-5 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.description}</p>
                      <p className="text-sm text-gray-500">
                        {activity.time ? new Date(activity.time).toLocaleString('pt-BR') : 'Data não disponível'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${activity.positive ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.positive ? '+' : '-'} R$ {activity.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {activity.type === 'payment' ? 'Recebimento' : 'Despesa'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Nenhuma atividade recente encontrada</p>
              <p className="text-sm text-gray-400">
                Os pagamentos e transações aparecerão aqui conforme forem processados
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista Completa de Pagamentos */}
      {payments && payments.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Todos os Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Método
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('pt-BR') : 
                         new Date(payment.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.orderNumber || `#${payment.orderId?.slice(-6)}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.clientName || 'Cliente não identificado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Badge variant="outline">
                          {payment.method?.toUpperCase() || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        R$ {parseFloat(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`${
                          payment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {payment.status === 'confirmed' ? 'Confirmado' :
                           payment.status === 'pending' ? 'Pendente' : 'Cancelado'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
