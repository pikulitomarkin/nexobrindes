
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Clock, CheckCircle, Package, LogOut, Eye, User, CreditCard, Calendar, Phone, Mail, Filter } from "lucide-react";
import { Link } from "wouter";

export default function ClientDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  const { data: orders, isLoading } = useQuery({
    queryKey: [`/api/orders/client/${user.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/orders/client/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
  });

  const { data: clientProfile } = useQuery({
    queryKey: ["/api/clients/profile", user.id],
    queryFn: async () => {
      const response = await fetch(`/api/clients/profile/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch client profile');
      return response.json();
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      production: "bg-purple-100 text-purple-800",
      ready: "bg-orange-100 text-orange-800",
      shipped: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const statusLabels = {
      pending: "Aguardando",
      confirmed: "Confirmado",
      production: "Em Produção",
      ready: "Pronto",
      shipped: "Enviado",
      delivered: "Entregue",
      cancelled: "Cancelado",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClasses[status as keyof typeof statusClasses]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  // Filter orders based on date filter
  const getFilteredOrders = () => {
    if (!orders) return [];
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return orders.filter((order: any) => {
      if (!order.createdAt) return true;
      
      const orderDate = new Date(order.createdAt);
      
      switch (dateFilter) {
        case "thisMonth":
          return orderDate >= startOfMonth;
        case "thisYear":
          return orderDate >= startOfYear;
        case "last30Days":
          return orderDate >= thirtyDaysAgo;
        case "custom":
          if (customStartDate && customEndDate) {
            return orderDate >= new Date(customStartDate) && orderDate <= new Date(customEndDate);
          }
          return true;
        default:
          return true;
      }
    });
  };

  const filteredOrders = getFilteredOrders();

  const calculateTotalSpent = () => {
    return filteredOrders.reduce((sum: number, order: any) => sum + parseFloat(order.totalValue || '0'), 0);
  };

  const calculateTotalPaid = () => {
    return filteredOrders.reduce((sum: number, order: any) => sum + parseFloat(order.paidValue || '0'), 0);
  };

  const calculatePendingPayment = () => {
    return calculateTotalSpent() - calculateTotalPaid();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse p-8">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Painel do Cliente</h1>
            <p className="text-gray-600 mt-1">Bem-vindo, {clientProfile?.name || user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/client/profile">
              <Button variant="outline" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Meu Perfil
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Date Filter Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pedidos</SelectItem>
                  <SelectItem value="thisMonth">Este mês</SelectItem>
                  <SelectItem value="thisYear">Este ano</SelectItem>
                  <SelectItem value="last30Days">Últimos 30 dias</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
              
              {dateFilter === "custom" && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">De:</span>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Até:</span>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/client/orders">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Meus Pedidos</p>
                    <p className="text-2xl font-bold text-blue-600">{filteredOrders?.length || 0}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/client/profile">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Meu Perfil</p>
                    <p className="text-lg font-medium text-gray-900">Gerenciar</p>
                  </div>
                  <User className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Suporte</p>
                  <p className="text-lg font-medium text-gray-900">Contato</p>
                </div>
                <Phone className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Gasto</p>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {calculateTotalSpent().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pago</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {calculateTotalPaid().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">A Pagar</p>
                  <p className="text-2xl font-bold text-orange-600">
                    R$ {calculatePendingPayment().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {filteredOrders?.filter((o: any) => ['confirmed', 'production', 'ready', 'shipped'].includes(o.status)).length || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Meus Pedidos Recentes</CardTitle>
              <Link href="/client/orders">
                <Button variant="outline" size="sm">
                  Ver Todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!filteredOrders || filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl font-medium text-gray-600 mb-2">Nenhum pedido encontrado</p>
                <p className="text-gray-500">Seus pedidos aparecerão aqui quando forem criados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Package className="h-10 w-10 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.product}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                          </span>
                          {order.deadline && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Entrega: {new Date(order.deadline).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusBadge(order.status)}
                        <Link href={`/client/order/${order.id}/timeline`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalhes
                          </Button>
                        </Link>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div className="font-medium text-lg text-green-600">
                          R$ {parseFloat(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        {parseFloat(order.paidValue || '0') > 0 && (
                          <div className="text-xs text-gray-500">
                            Pago: R$ {parseFloat(order.paidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        {clientProfile?.vendorName && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Seu Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{clientProfile.vendorName}</p>
                  <p className="text-sm text-gray-600">Vendedor responsável pela sua conta</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    Ligar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
