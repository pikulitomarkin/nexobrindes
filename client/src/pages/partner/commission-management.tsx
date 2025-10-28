import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Calculator, DollarSign, Percent, TrendingUp, Eye, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function PartnerCommissionManagement() {
  // Get current user (partner) from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const partnerId = user.id;

  console.log('Partner Commission Management - User:', user);
  console.log('Partner Commission Management - Partner ID:', partnerId);

  // Query specific partner commissions
  const { data: partnerCommissions, isLoading: loadingCommissions } = useQuery({
    queryKey: ["/api/commissions/partner", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];

      const response = await fetch(`/api/commissions/partner/${partnerId}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch partner commissions");
      return response.json();
    },
    enabled: !!partnerId,
  });

  // Get all commissions for context (filtered view)
  const { data: allCommissions } = useQuery({
    queryKey: ["/api/commissions"],
    select: (data) => {
      // Show only partner type commissions for reference
      return data?.filter((commission: any) => commission.type === 'partner') || [];
    }
  });

  // Calculate totals for THIS partner only
  const totalPartnerCommissions = partnerCommissions?.reduce((sum: number, commission: any) => 
    sum + parseFloat(commission.amount || '0'), 0) || 0;

  const pendingPartnerCommissions = partnerCommissions?.filter((c: any) => 
    ['pending', 'confirmed'].includes(c.status)).reduce((sum: number, c: any) => 
    sum + parseFloat(c.amount || '0'), 0) || 0;

  const paidPartnerCommissions = partnerCommissions?.filter((c: any) => 
    c.status === 'paid').reduce((sum: number, c: any) => 
    sum + parseFloat(c.amount || '0'), 0) || 0;

  if (loadingCommissions) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Calculator className="h-8 w-8 gradient-text mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Minhas Comissões</h1>
              <p className="text-gray-600">Visualize suas comissões de sócio</p>
              <p className="text-sm text-blue-600 font-medium">Sócio: {user.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards - Individual Partner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Minhas Comissões Totais</p>
                <p className="text-3xl font-bold gradient-text">
                  R$ {totalPartnerCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {partnerCommissions?.length || 0} pedidos
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
                <p className="text-sm font-medium text-gray-600">A Receber</p>
                <p className="text-3xl font-bold text-yellow-600">
                  R$ {pendingPartnerCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Pendentes/Confirmadas
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Percent className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Já Recebido</p>
                <p className="text-3xl font-bold text-green-600">
                  R$ {paidPartnerCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Comissões pagas
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-commissions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-commissions">Minhas Comissões</TabsTrigger>
          <TabsTrigger value="commission-info">Informações do Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="my-commissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico das Minhas Comissões</CardTitle>
              <p className="text-sm text-gray-600">
                Todas as comissões geradas para você como sócio
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pedido
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor do Pedido
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Minha %
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Minha Comissão
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {partnerCommissions && partnerCommissions.length > 0 ? (
                      partnerCommissions.map((commission: any) => (
                        <tr key={commission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                              {new Date(commission.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{commission.orderNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            R$ {parseFloat(commission.orderValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <Badge variant="outline">
                              {commission.percentage}%
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                            R$ {parseFloat(commission.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${
                              commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                              commission.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {commission.status === 'paid' ? 'Pago' :
                               commission.status === 'confirmed' ? 'Confirmado' :
                               commission.status === 'pending' ? 'Pendente' :
                               commission.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {commission.orderId && (
                              <Link href={`/admin/orders/${commission.orderId}`}>
                                <div className="flex items-center text-blue-600 hover:text-blue-900 cursor-pointer">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver Pedido
                                </div>
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 whitespace-nowrap text-sm text-gray-500 text-center">
                          <div className="flex flex-col items-center">
                            <DollarSign className="h-12 w-12 text-gray-300 mb-3" />
                            <p className="text-lg font-medium text-gray-900 mb-1">Nenhuma comissão encontrada</p>
                            <p className="text-gray-500">Suas comissões aparecerão aqui conforme os pedidos são criados</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commission-info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Percent className="h-5 w-5 mr-2 text-blue-600" />
                  Como Funcionam as Comissões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Sistema de Comissões dos Sócios</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Taxa total dos sócios: 15% do valor do pedido</li>
                    <li>• Dividida igualmente entre 3 sócios: 5% cada</li>
                    <li>• Pago imediatamente quando o pedido é criado</li>
                    <li>• Status inicial: "Confirmado"</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">Em caso de Cancelamento</h4>
                  <p className="text-sm text-yellow-800">
                    Se um pedido for cancelado, o valor da comissão será descontado dos próximos pedidos automaticamente.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Resumo do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-2xl font-bold text-green-600">15%</p>
                    <p className="text-sm text-green-800">Taxa Total Sócios</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-2xl font-bold text-blue-600">5%</p>
                    <p className="text-sm text-blue-800">Sua Taxa Individual</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Exemplo de Cálculo</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    Pedido de R$ 1.000,00:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Total sócios: R$ 150,00 (15%)</li>
                    <li>• Sua parte: R$ 50,00 (5%)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}