
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
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState("admin");
  const [location] = useLocation();

  const roleOptions = [
    { value: "admin", label: "Administrador" },
    { value: "vendor", label: "Vendedor" },
    { value: "client", label: "Cliente" },
    { value: "producer", label: "Produtor" },
    { value: "finance", label: "Financeiro" },
  ];

  const getMenuItems = () => {
    switch (currentRole) {
      case "admin":
        return [
          { href: "/", icon: Home, label: "Dashboard" },
          { href: "/admin/products", icon: Package, label: "Produtos" },
          { href: "/admin/budgets", icon: FileText, label: "Orçamentos" },
          { href: "/admin/orders", icon: ShoppingCart, label: "Pedidos" },
          { href: "/admin/vendors", icon: Users, label: "Vendedores" },
          { href: "/admin/clients", icon: Users, label: "Clientes" },
          { href: "/admin/producers", icon: Factory, label: "Produtores" },
          { href: "/admin/finance", icon: CreditCard, label: "Financeiro" },
        ];
      case "vendor":
        return [
          { href: "/", icon: Home, label: "Dashboard" },
          { href: "/vendor/products", icon: Package, label: "Catálogo" },
          { href: "/vendor/budgets", icon: FileText, label: "Orçamentos" },
          { href: "/vendor/orders", icon: ShoppingCart, label: "Pedidos" },
          { href: "/vendor/clients", icon: Users, label: "Clientes" },
          { href: "/vendor/commissions", icon: DollarSign, label: "Comissões" },
        ];
      case "client":
        return [
          { href: "/", icon: Home, label: "Dashboard" },
          { href: "/client/orders", icon: ShoppingCart, label: "Meus Pedidos" },
        ];
      case "producer":
        return [
          { href: "/", icon: Home, label: "Dashboard" },
          { href: "/producer/orders", icon: ShoppingCart, label: "Ordens de Produção" },
        ];
      case "finance":
        return [
          { href: "/", icon: Home, label: "Dashboard" },
          { href: "/finance/payments", icon: CreditCard, label: "Pagamentos" },
          { href: "/finance/reconciliation", icon: FileText, label: "Conciliação" },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

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
            <h1 className="text-2xl font-bold text-white">ERP System</h1>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-white/20"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Role Selector */}
          <div className="p-6 border-b border-white/20">
            <label className="text-sm font-medium text-white/90 mb-3 block">
              Perfil Ativo
            </label>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value} className="text-gray-900">
                  {role.label}
                </option>
              ))}
            </select>
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
