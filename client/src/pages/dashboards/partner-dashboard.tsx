import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Users, Package, LogOut } from "lucide-react";
import { Link } from "wouter";

export default function PartnerDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  const { data: commissions } = useQuery({
    queryKey: [`/api/commissions/partner/${user.id}`],
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const totalCommissions = commissions?.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0) || 0;
  const pendingCommissions = commissions?.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0) || 0;
  const paidCommissions = commissions?.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel do Sócio</h1>
            <p className="text-gray-600">Bem-vindo, {user.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comissões Total</p>
                  <p className="text-3xl font-bold text-green-600">
                    R$ {totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendentes</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    R$ {pendingCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pagas</p>
                  <p className="text-3xl font-bold text-blue-600">
                    R$ {paidCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Transações</p>
                  <p className="text-3xl font-bold text-purple-600">{commissions?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Comissões Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!commissions || commissions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma comissão disponível ainda.</p>
            ) : (
              <div className="space-y-4">
                {commissions.slice(0, 5).map((commission: any) => (
                  <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Pedido #{commission.orderId?.slice(-6) || 'N/A'}</p>
                      <p className="text-sm text-gray-600">
                        {commission.createdAt ? new Date(commission.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        R$ {parseFloat(commission.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        commission.status === 'paid' ? 'bg-green-100 text-green-800' : 
                        commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {commission.status === 'paid' ? 'Paga' : 
                         commission.status === 'pending' ? 'Pendente' : 'Outro'}
                      </span>
                    </div>
                  </div>
                ))}
                {commissions.length > 5 && (
                  <div className="text-center pt-4">
                    <Button variant="outline">Ver Histórico Completo</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}