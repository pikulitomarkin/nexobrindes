
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Percent, TrendingUp, Eye } from "lucide-react";

export default function MyCommissions() {
  const { data: user } = useQuery({
    queryKey: ["/api/auth/verify"],
  });

  // Query específica para as comissões deste sócio
  const { data: partnerCommissions, isLoading } = useQuery({
    queryKey: ["/api/commissions"],
    select: (data) => {
      // Filtrar apenas comissões deste sócio específico
      return data?.filter((commission: any) => 
        commission.partnerId === user?.user?.id && commission.type === 'partner'
      ) || [];
    }
  });

  // Cálculos das comissões
  const totalPartnerCommissions = partnerCommissions?.reduce((sum: number, commission: any) => 
    sum + parseFloat(commission.amount || '0'), 0) || 0;

  const pendingPartnerCommissions = partnerCommissions?.filter((c: any) => 
    ['pending', 'confirmed'].includes(c.status)).reduce((sum: number, c: any) => 
    sum + parseFloat(c.amount || '0'), 0) || 0;

  const paidPartnerCommissions = partnerCommissions?.filter((c: any) => 
    c.status === 'paid').reduce((sum: number, c: any) => 
    sum + parseFloat(c.amount || '0'), 0) || 0;

  if (isLoading) {
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
            <DollarSign className="h-8 w-8 gradient-text mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Minhas Comissões</h1>
              <p className="text-gray-600">Acompanhe suas comissões de sócio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Resumo das Comissões */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Comissões</p>
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
                <p className="text-sm font-medium text-gray-600">Comissões Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600">
                  R$ {pendingPartnerCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  A receber
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
                <p className="text-sm font-medium text-gray-600">Comissões Pagas</p>
                <p className="text-3xl font-bold text-green-600">
                  R$ {paidPartnerCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Já recebidas
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Comissões */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Completo de Comissões</CardTitle>
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
                    Valor Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {partnerCommissions && partnerCommissions.length > 0 ? (
                  partnerCommissions.map((commission: any) => (
                    <tr key={commission.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {commission.createdAt ? new Date(commission.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{commission.orderNumber || commission.orderId?.slice(-6) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        R$ {parseFloat(commission.orderValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {commission.percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Nenhuma comissão encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
