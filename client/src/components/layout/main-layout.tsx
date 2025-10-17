import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Users,
  ShoppingCart,
  Package,
  Factory,
  CreditCard,
  FileText,
  DollarSign,
  Menu,
  X,
  Home,
  Settings, // Added Settings icon import
  LogOut,
  ClipboardList, // Import ClipboardList if it was intended to be used elsewhere
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [currentRole, setCurrentRole] = useState(user.role || "admin");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast({
      title: "Logout realizado com sucesso",
      description: "Você foi desconectado do sistema.",
    });
    setLocation("/login");
  };

  const roleOptions = [
    { value: "admin", label: "Administrador" },
    { value: "vendor", label: "Vendedor" },
    { value: "client", label: "Cliente" },
    { value: "producer", label: "Produtor" },
    { value: "finance", label: "Financeiro" },
    { value: "logistics", label: "Logística" },
  ];

  const getMenuItems = () => {
    switch (currentRole) {
      case "admin":
        return [
          { href: "/", icon: Home, label: "Dashboard" },
          { href: "/admin/products", icon: Package, label: "Produtos" },
          { href: "/admin/producers", icon: Factory, label: "Produtores" },
          { href: "/admin/clients", icon: Users, label: "Clientes" },
          { href: "/admin/vendors", icon: ShoppingCart, label: "Vendedores" },
          { href: "/admin/customizations", icon: Settings, label: "Personalizações" },
          { href: "/admin/commission-management", icon: DollarSign, label: "Gestão de Comissões" },
          { href: "/admin/reports", icon: FileText, label: "Relatórios" },
          { href: "/finance", icon: DollarSign, label: "Módulo Financeiro" },
        ];
      case "partner":
        return [
          { href: "/", icon: Home, label: "Dashboard" },
          { href: "/partner/products", icon: Package, label: "Produtos" },
          { href: "/partner/producers", icon: Factory, label: "Produtores" },
          { href: "/partner/clients", icon: Users, label: "Clientes" },
          { href: "/partner/vendors", icon: ShoppingCart, label: "Vendedores" },
          { href: "/partner/commission-management", icon: DollarSign, label: "Gestão de Comissões" },
        ];
      case "vendor":
        return [
          { href: "/", icon: Home, label: "Dashboard" },
          { href: "/vendor/products", icon: Package, label: "Catálogo" },
          { href: "/vendor/quote-requests", icon: MessageCircle, label: "Solicitações" },
          { href: "/vendor/budgets", icon: FileText, label: "Orçamentos" },
          { href: "/vendor/orders", icon: ShoppingCart, label: "Pedidos" },
          { href: "/vendor/clients", icon: Users, label: "Clientes" },
          { href: "/vendor/commissions", icon: DollarSign, label: "Comissões" },
        ];
      case "client":
        return [
          { href: "/", icon: Home, label: "Dashboard" },
          { href: "/client/products", icon: Package, label: "Produtos" },
          { href: "/client/orders", icon: ShoppingCart, label: "Meus Pedidos" },
        ];
      case "producer":
        return [
          { href: "/producer/production-dashboard", icon: Home, label: "Painel de Produção" },
          { href: "/producer/receivables", icon: CreditCard, label: "Contas a Receber" },
        ];
      case "finance":
        return [
          { href: "/", icon: Home, label: "Dashboard" },
          { href: "/finance/receivables", icon: DollarSign, label: "Contas a Receber" },
          { href: "/finance/expenses", icon: FileText, label: "Notas de Despesas" },
          { href: "/finance/commission-payouts", icon: Users, label: "Pagamentos de Comissão" },
          { href: "/finance/reconciliation", icon: CreditCard, label: "Conciliação Bancária" },
          { href: "/finance/payments", icon: Package, label: "Pagamentos" },
        ];
      case "logistics":
        return [
          { href: "/logistics/dashboard", icon: Home, label: "Dashboard" },
          { href: "/logistics/paid-orders", icon: DollarSign, label: "Pedidos Pagos" },
          { href: "/logistics/production-tracking", icon: Factory, label: "Acompanhar Produção" },
          { href: "/logistics/shipments", icon: Package, label: "Despachos" },
          { href: "/logistics/products", icon: Package, label: "Produtos" },
          { href: "/logistics/producers", icon: Factory, label: "Produtores" },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  // Define role labels
  const roleLabels = {
    admin: "Administrador",
    vendor: "Vendedor",
    client: "Cliente",
    producer: "Produtor",
    partner: "Sócio",
    finance: "Financeiro",
    logistics: "Logística"
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with gradient */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-br from-blue-600 via-blue-700 to-teal-500 shadow-2xl transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <h1 className="text-2xl font-bold text-white">Nexo Brindes</h1>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-white/20"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-white/20">
            <div className="text-sm font-medium text-white/90">
              {user.name || "Usuário"}
            </div>
            <div className="text-xs text-white/70">
              {roleLabels[currentRole as keyof typeof roleLabels] || "Usuário"}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;

                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <div
                        className={`
                          flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                          ${isActive
                            ? 'bg-white text-blue-600 shadow-lg transform scale-105'
                            : 'text-white/90 hover:bg-white/10 hover:text-white hover:transform hover:scale-105'
                          }
                        `}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {item.label}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-white/20">
            <div className="text-xs text-white/70 text-center">
              {roleOptions.find(role => role.value === currentRole)?.label}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {roleOptions.find(role => role.value === currentRole)?.label}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:border-red-300"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}