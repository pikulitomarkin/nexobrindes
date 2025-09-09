
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
import { Card } from "@/components/ui/card";

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

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-bold gradient-text">ERP System</h1>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Role Selector */}
          <div className="p-4 border-b">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Perfil Ativo
            </label>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <a
                        className={`
                          flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                          ${isActive
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.label}
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {roleOptions.find(role => role.value === currentRole)?.label}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
