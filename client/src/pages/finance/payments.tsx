
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, CreditCard, FileText, Plus, Download, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentsHistory() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["/api/finance/payments"],
    queryFn: async () => {
      const response = await fetch("/api/finance/payments", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch payments');
      return response.json();
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await fetch("/api/orders", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["/api/commissions"],
    queryFn: async () => {
      const response = await fetch("/api/commissions", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch commissions');
      return response.json();
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ["/api/finance/expenses"],
    queryFn: async () => {
      const response = await fetch("/api/finance/expenses", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch expenses');
      return response.json();
    },
  });

  const { data: producerPayments } = useQuery({
    queryKey: ["/api/finance/producer-payments"],
    queryFn: async () => {
      const response = await fetch("/api/finance/producer-payments", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch producer payments');
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

  // Receita Total do mês atual (baseado em pagamentos confirmados)
  const monthlyRevenue = payments?.filter((payment: any) => {
    if (!payment.paidAt || payment.status !== 'confirmed') return false;
    const paymentDate = new Date(payment.paidAt);
    return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
  }).reduce((total: number, payment: any) => total + parseFloat(payment.amount || '0'), 0) || 0;

  // Custos de Produção (baseado em pagamentos de produtores)
  const productionCosts = (producerPayments || [])?.filter((payment: any) => 
    payment.status === 'paid'
  ).reduce((total: number, payment: any) => total + parseFloat(payment.amount || '0'), 0) || 0;

  // Comissões Pendentes
  const pendingCommissions = commissions?.filter((commission: any) => 
    commission.status === 'pending' || commission.status === 'confirmed'
  ).reduce((total: number, commission: any) => total + parseFloat(commission.amount || '0'), 0) || 0;

  // Despesas do Mês
  const monthlyExpenses = expenses?.filter((expense: any) => {
    if (!expense.createdAt && !expense.date) return false;
    const expenseDate = new Date(expense.createdAt || expense.date);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  }).reduce((total: number, expense: any) => total + parseFloat(expense.amount || '0'), 0) || 0;

  // Lucro Líquido
  const netProfit = monthlyRevenue - productionCosts - pendingCommissions - monthlyExpenses;

  // Atividades recentes (últimos pagamentos e transações)
  const recentActivities: any[] = [];

  // Adicionar pagamentos recentes confirmados
  if (payments && payments.length > 0) {
    payments
      .filter((payment: any) => payment.status === 'confirmed')
      .sort((a: any, b: any) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime())
      .slice(0, 5)
      .forEach((payment: any) => {
        recentActivities.push({
          type: 'payment',
          description: `Recebimento - ${payment.clientName || 'Cliente'} (${payment.orderNumber || 'Pedido'})`,
          amount: parseFloat(payment.amount || '0'),
          time: payment.paidAt || payment.createdAt,
          positive: true,
          method: payment.method?.toUpperCase() || 'MANUAL'
        });
      });
  }

  // Adicionar despesas recentes aprovadas
  if (expenses && expenses.length > 0) {
    expenses
      .filter((expense: any) => expense.status === 'approved' || expense.status === 'recorded')
      .sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
      .slice(0, 3)
      .forEach((expense: any) => {
        recentActivities.push({
          type: 'expense',
          description: `Despesa - ${expense.name || expense.description || 'Nova despesa'}`,
          amount: parseFloat(expense.amount || '0'),
          time: expense.createdAt || expense.date,
          positive: false,
          category: expense.category
        });
      });
  }

  // Adicionar pagamentos de comissões recentes
  if (commissions && commissions.length > 0) {
    commissions
      .filter((commission: any) => commission.status === 'paid' && commission.paidAt)
      .sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
      .slice(0, 2)
      .forEach((commission: any) => {
        recentActivities.push({
          type: 'commission',
          description: `Comissão Paga - ${commission.vendorName || 'Vendedor'}`,
          amount: parseFloat(commission.amount || '0'),
          time: commission.paidAt,
          positive: false
        });
      });
  }

  // Adicionar pagamentos de produtores recentes
  if (producerPayments && producerPayments.length > 0) {
    producerPayments
      .filter((payment: any) => payment.status === 'paid' && payment.paidAt)
      .sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
      .slice(0, 2)
      .forEach((payment: any) => {
        recentActivities.push({
          type: 'producer_payment',
          description: `Pagamento Produtor - ${payment.producerName || 'Produtor'}`,
          amount: parseFloat(payment.amount || '0'),
          time: payment.paidAt,
          positive: false
        });
      });
  }

  // Ordenar todas as atividades por data (mais recente primeiro)
  recentActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Limitar a 10 atividades mais recentes
  const limitedActivities = recentActivities.slice(0, 10);

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
          {limitedActivities.length > 0 ? (
            <div className="space-y-4">
              {limitedActivities.map((activity, index) => {
                const getActivityIcon = () => {
                  switch (activity.type) {
                    case 'payment':
                      return <DollarSign className="h-5 w-5 text-green-600" />;
                    case 'expense':
                      return <TrendingDown className="h-5 w-5 text-red-600" />;
                    case 'commission':
                      return <TrendingUp className="h-5 w-5 text-blue-600" />;
                    case 'producer_payment':
                      return <CreditCard className="h-5 w-5 text-purple-600" />;
                    default:
                      return <FileText className="h-5 w-5 text-gray-600" />;
                  }
                };

                const getActivityBadge = () => {
                  switch (activity.type) {
                    case 'payment':
                      return { label: activity.method || 'Recebimento', variant: 'default' as const };
                    case 'expense':
                      return { label: 'Despesa', variant: 'destructive' as const };
                    case 'commission':
                      return { label: 'Comissão', variant: 'secondary' as const };
                    case 'producer_payment':
                      return { label: 'Produtor', variant: 'outline' as const };
                    default:
                      return { label: 'Transação', variant: 'outline' as const };
                  }
                };

                const badge = getActivityBadge();
                
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        activity.positive ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {getActivityIcon()}
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
                      <Badge variant={badge.variant} className="text-xs mt-1">
                        {badge.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
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
