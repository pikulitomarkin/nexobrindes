import {
  BarChart3,
  Bus,
  User,
  Factory,
  TrendingUp,
  TrendingDown,
  Package,
  LayoutDashboard,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  DollarSign,
  UserCheck,
  ClipboardList,
  CreditCard,
  Receipt,
  Calculator,
  Percent,
  Store,
  Hammer,
  Palette,
  Building2,
} from "lucide-react";

import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import cn from "clsx"; // Assuming clsx is available for conditional class merging
import { Logo } from "@/components/ui/logo";


// Mocking Link, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroupLabel, SidebarGroupContent for demonstration
const Link = ({ href, children }: any) => <a href={href}>{children}</a>;
const SidebarMenu = ({ children }: any) => <nav>{children}</nav>;
const SidebarMenuItem = ({ children }: any) => <li>{children}</li>;
const SidebarMenuButton = ({ asChild, children }: any) => <>{children}</>;
const SidebarGroupLabel = ({ children }: any) => <h3 className="text-sm font-semibold text-gray-400 uppercase px-6 mt-6 mb-2">{children}</h3>;
const SidebarGroupContent = ({ children }: any) => <div>{children}</div>;


interface SidebarProps {
  activePanel: string;
  onPanelChange: (panel: string) => void;
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  isActive?: boolean;
  onClick: () => void;
  badge?: number;
}

// SidebarItem component
function SidebarItem({ icon, label, path, isActive, onClick, badge }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors relative ${
        isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && badge > 0 && (
        <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({ activePanel, onPanelChange }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mock user data for now
  useEffect(() => {
    // In a real app, you would fetch user data here
    setUser({ id: 1, role: 'admin' }); // Example: 'admin', 'vendor', 'client', etc.
    setLoading(false);
  }, []);

  // Buscar notifications para vendedor
  const { data: pendingActions } = useQuery({
    queryKey: ["/api/vendor/pending-actions", user?.id],
    queryFn: async () => {
      if (!user?.id || user.role !== 'vendor') return 0;
      const response = await fetch(`/api/vendor/${user.id}/pending-actions`);
      if (!response.ok) return 0;
      const data = await response.json();
      return data.count || 0;
    },
    enabled: !!user?.id && user?.role === 'vendor',
    refetchInterval: 10000, // Atualiza a cada 10 segundos
  });

  const menuItems = [
    { id: "admin", label: "Admin Geral", icon: LayoutDashboard },
    { id: "vendor", label: "Vendedor", icon: ShoppingCart },
    { id: "logistics", label: "Logística", icon: Package },
    { id: "client", label: "Painel de Clientes", icon: Users },
    { id: "producer", label: "Produtor Externo", icon: Factory },
    { id: "finance", label: "Módulo Financeiro", icon: DollarSign },
  ];

  const pathname = location[0]; // useLocation returns a tuple: [path, setPath]

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-64 gradient-bg text-white shadow-xl">
      <div className="p-6 bg-white">
        <Logo size="md" variant="full" />
      </div>

      <nav className="mt-8">
        <div className="px-6 mb-4">
          <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
            Painéis
          </p>
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onPanelChange(item.id)}
              className={`sidebar-item w-full flex items-center px-6 py-3 text-left text-white ${
                activePanel === item.id ? "active" : ""
              }`}
            >
              <Icon className="mr-3 h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Admin Panel Specific Links */}
      {user?.role === 'admin' && (
            <>
              <SidebarItem
                icon={<LayoutDashboard className="h-5 w-5" />}
                label="Dashboard"
                path="/admin-dashboard"
                isActive={pathname === '/admin-dashboard'}
                onClick={() => navigate('/admin-dashboard')}
              />
              <SidebarItem
                icon={<Users className="h-5 w-5" />}
                label="Usuários"
                path="/admin/users"
                isActive={pathname === '/admin/users'}
                onClick={() => navigate('/admin/users')}
              />
              <SidebarItem
                icon={<Store className="h-5 w-5" />}
                label="Vendedores"
                path="/admin/vendors"
                isActive={pathname === '/admin/vendors'}
                onClick={() => navigate('/admin/vendors')}
              />
              <SidebarItem
                icon={<Building2 className="h-5 w-5" />}
                label="Filiais"
                path="/admin/branches"
                isActive={pathname === '/admin/branches'}
                onClick={() => navigate('/admin/branches')}
              />
              <SidebarItem
                icon={<UserCheck className="h-5 w-5" />}
                label="Clientes"
                path="/admin/clients"
                isActive={pathname === '/admin/clients'}
                onClick={() => navigate('/admin/clients')}
              />
              <SidebarItem
                icon={<Hammer className="h-5 w-5" />}
                label="Produtores"
                path="/admin/producers"
                isActive={pathname === '/admin/producers'}
                onClick={() => navigate('/admin/producers')}
              />
              <SidebarItem
                icon={<UserCheck className="h-5 w-5" />}
                label="Sócios"
                path="/admin/partners"
                isActive={pathname === '/admin/partners'}
                onClick={() => navigate('/admin/partners')}
              />
              <SidebarItem
                icon={<Package className="h-5 w-5" />}
                label="Produtos"
                path="/admin/products"
                isActive={pathname === '/admin/products'}
                onClick={() => navigate('/admin/products')}
              />
              <SidebarItem
                icon={<Palette className="h-5 w-5" />}
                label="Personalizações"
                path="/admin/customizations"
                isActive={pathname === '/admin/customizations'}
                onClick={() => navigate('/admin/customizations')}
              />
              <SidebarItem
                icon={<Calculator className="h-5 w-5" />}
                label="Orçamentos"
                path="/admin/budgets"
                isActive={pathname === '/admin/budgets'}
                onClick={() => navigate('/admin/budgets')}
              />
              <SidebarItem
                icon={<ShoppingCart className="h-5 w-5" />}
                label="Pedidos"
                path="/admin/orders"
                isActive={pathname === '/admin/orders'}
                onClick={() => navigate('/admin/orders')}
              />
              <SidebarItem
                icon={<Percent className="h-5 w-5" />}
                label="Comissões"
                path="/admin/commission-management"
                isActive={pathname === '/admin/commission-management'}
                onClick={() => navigate('/admin/commission-management')}
              />
              <SidebarItem
                icon={<CreditCard className="h-5 w-5" />}
                label="Financeiro"
                path="/finance"
                isActive={pathname === '/finance'}
                onClick={() => navigate('/finance')}
              />
              <SidebarItem
                icon={<Settings className="h-5 w-5" />}
                label="Configurações de Comissão"
                path="/admin/commission-settings"
                isActive={pathname === "/admin/commission-settings"}
                onClick={() => navigate("/admin/commission-settings")}
              />
              <SidebarItem
                icon={<DollarSign className="h-5 w-5" />}
                label="Pagamentos Produtores"
                path="/admin/producer-payments"
                isActive={pathname === "/admin/producer-payments"}
                onClick={() => navigate("/admin/producer-payments")}
              />
            </>
          )}

      {/* Vendor Panel Specific Links */}
      {user?.role === 'vendor' && (
        <>
          <SidebarItem
            icon={<Home className="h-4 w-4" />}
            label="Dashboard"
            path="/vendor-dashboard"
            isActive={pathname === "/vendor-dashboard"}
            onClick={() => navigate("/vendor-dashboard")}
          />
          <SidebarItem
            icon={<Users className="h-4 w-4" />}
            label="Clientes"
            path="/vendor/clients"
            isActive={pathname === "/vendor/clients"}
            onClick={() => navigate("/vendor/clients")}
          />
          <SidebarItem
            icon={<Package className="h-4 w-4" />}
            label="Produtos"
            path="/vendor/products"
            isActive={pathname === "/vendor/products"}
            onClick={() => navigate("/vendor/products")}
          />
          <SidebarItem
            icon={<FileText className="h-4 w-4" />}
            label="Orçamentos"
            path="/vendor/budgets"
            isActive={pathname === "/vendor/budgets"}
            onClick={() => navigate("/vendor/budgets")}
            badge={pendingActions && pendingActions > 0 ? pendingActions : undefined}
          />
          <SidebarItem
            icon={<ShoppingCart className="h-4 w-4" />}
            label="Pedidos"
            path="/vendor/orders"
            isActive={pathname === "/vendor/orders"}
            onClick={() => navigate("/vendor/orders")}
          />
          <SidebarItem
            icon={<Calculator className="h-4 w-4" />}
            label="Comissões"
            path="/vendor/commissions"
            isActive={pathname === "/vendor/commissions"}
            onClick={() => navigate("/vendor/commissions")}
          />
          <SidebarItem
            icon={<FileText className="h-4 w-4" />}
            label="Solicitações de Cotação"
            path="/vendor/quote-requests"
            isActive={pathname === "/vendor/quote-requests"}
            onClick={() => navigate("/vendor/quote-requests")}
          />
        </>
      )}

      {activePanel === "client" && (
        <nav className="mt-8">
          <div className="px-6 mb-4">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Dashboard
            </p>
          </div>
          <SidebarItem
            icon={<BarChart3 className="h-5 w-5" />}
            label="Dashboard"
            path="/client/dashboard"
            isActive={pathname === "/client/dashboard"}
            onClick={() => navigate("/client/dashboard")}
          />

          <div className="px-6 mb-4 mt-6">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Pedidos
            </p>
          </div>
          <SidebarItem
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Meus Pedidos"
            path="/client/orders"
            isActive={pathname === "/client/orders"}
            onClick={() => navigate("/client/orders")}
          />

          <div className="px-6 mb-4 mt-6">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Minha Conta
            </p>
          </div>
          <SidebarItem
            icon={<User className="h-5 w-5" />}
            label="Meu Perfil"
            path="/client/profile"
            isActive={pathname === "/client/profile"}
            onClick={() => navigate("/client/profile")}
          />
        </nav>
      )}

      {activePanel === "producer" && (
        <nav className="mt-8">
          <div className="px-6 mb-4">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Produção
            </p>
          </div>
          <SidebarItem
            icon={<Factory className="h-5 w-5" />}
            label="Painel de Produção"
            path="/producer/production-dashboard"
            isActive={pathname === "/producer/production-dashboard"}
            onClick={() => navigate("/producer/production-dashboard")}
          />
          <SidebarItem
            icon={<CreditCard className="h-5 w-5" />}
            label="Contas a Receber"
            path="/producer/receivables"
            isActive={pathname === "/producer/receivables"}
            onClick={() => navigate("/producer/receivables")}
          />
        </nav>
      )}

      {activePanel === "logistics" && (
        <nav className="mt-8">
          <div className="px-6 mb-4">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Logística
            </p>
          </div>
          <SidebarItem
            icon={<LayoutDashboard className="h-5 w-5" />}
            label="Dashboard"
            path="/logistics/dashboard"
            isActive={pathname === "/logistics/dashboard"}
            onClick={() => navigate("/logistics/dashboard")}
          />
          <SidebarItem
            icon={<Package className="h-5 w-5" />}
            label="Pedidos Pagos"
            path="/logistics/paid-orders"
            isActive={pathname === "/logistics/paid-orders"}
            onClick={() => navigate("/logistics/paid-orders")}
          />
          <SidebarItem
            icon={<Factory className="h-5 w-5" />}
            label="Acompanhar Produção"
            path="/logistics/production-tracking"
            isActive={pathname === "/logistics/production-tracking"}
            onClick={() => navigate("/logistics/production-tracking")}
          />
          <SidebarItem
            icon={<Bus className="h-5 w-5" />}
            label="Despachos"
            path="/logistics/shipments"
            isActive={pathname === "/logistics/shipments"}
            onClick={() => navigate("/logistics/shipments")}
          />

          <div className="px-6 mt-6 mb-4">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Gestão
            </p>
          </div>
          <SidebarItem
            icon={<Package className="h-5 w-5" />}
            label="Produtos"
            path="/logistics/products"
            isActive={pathname === "/logistics/products"}
            onClick={() => navigate("/logistics/products")}
          />
          <SidebarItem
            icon={<Factory className="h-5 w-5" />}
            label="Produtores"
            path="/logistics/producers"
            isActive={pathname === "/logistics/producers"}
            onClick={() => navigate("/logistics/producers")}
          />
          {/* Duplicate entries removed */}
        </nav>
      )}

      {activePanel === "finance" && (
        <nav className="mt-8">
          <div className="px-6 mb-4">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Controle Financeiro
            </p>
          </div>
          <SidebarItem
            icon={<DollarSign className="h-5 w-5" />}
            label="Contas a Receber"
            path="/finance/receivables"
            isActive={pathname === "/finance/receivables"}
            onClick={() => navigate("/finance/receivables")}
          />
          <SidebarItem
            icon={<TrendingDown className="h-5 w-5" />}
            label="Contas a Pagar"
            path="/finance/payables"
            isActive={pathname === "/finance/payables"}
            onClick={() => navigate("/finance/payables")}
          />
          <SidebarItem
            icon={<Receipt className="h-5 w-5" />}
            label="Notas de Despesas"
            path="/finance/expenses"
            isActive={pathname === "/finance/expenses"}
            onClick={() => navigate("/finance/expenses")}
          />
          <SidebarItem
            icon={<TrendingUp className="h-5 w-5" />}
            label="Pagamentos de Comissão"
            path="/finance/commission-payouts"
            isActive={pathname === "/finance/commission-payouts"}
            onClick={() => navigate("/finance/commission-payouts")}
          />
          <SidebarItem
            icon={<Calculator className="h-5 w-5" />}
            label="Conciliação Bancária"
            path="/finance/reconciliation"
            isActive={pathname === "/finance/reconciliation"}
            onClick={() => navigate("/finance/reconciliation")}
          />
          <SidebarItem
            icon={<CreditCard className="h-5 w-5" />}
            label="Histórico de Pagamentos"
            path="/finance/payments"
            isActive={pathname === "/finance/payments"}
            onClick={() => navigate("/finance/payments")}
          />
        </nav>
      )}

      {/* Finance User Specific Menu */}
      {user?.role === 'finance' && (
        <nav className="mt-8">
          <div className="px-6 mb-4">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Módulo Financeiro
            </p>
          </div>
          <SidebarItem
            icon={<DollarSign className="h-5 w-5" />}
            label="Dashboard Financeiro"
            path="/finance"
            isActive={pathname === "/finance"}
            onClick={() => navigate("/finance")}
          />
          <SidebarItem
            icon={<DollarSign className="h-5 w-5" />}
            label="Contas a Receber"
            path="/finance/receivables"
            isActive={pathname === "/finance/receivables"}
            onClick={() => navigate("/finance/receivables")}
          />
          <SidebarItem
            icon={<TrendingDown className="h-5 w-5" />}
            label="Contas a Pagar"
            path="/finance/payables"
            isActive={pathname === "/finance/payables"}
            onClick={() => navigate("/finance/payables")}
          />
          <SidebarItem
            icon={<Receipt className="h-5 w-5" />}
            label="Notas de Despesas"
            path="/finance/expenses"
            isActive={pathname === "/finance/expenses"}
            onClick={() => navigate("/finance/expenses")}
          />
          <SidebarItem
            icon={<TrendingUp className="h-5 w-5" />}
            label="Pagamentos de Comissão"
            path="/finance/commission-payouts"
            isActive={pathname === "/finance/commission-payouts"}
            onClick={() => navigate("/finance/commission-payouts")}
          />
          <SidebarItem
            icon={<Calculator className="h-5 w-5" />}
            label="Conciliação Bancária"
            path="/finance/reconciliation"
            isActive={pathname === "/finance/reconciliation"}
            onClick={() => navigate("/finance/reconciliation")}
          />
          <SidebarItem
            icon={<CreditCard className="h-5 w-5" />}
            label="Histórico de Pagamentos"
            path="/finance/payments"
            isActive={pathname === "/finance/payments"}
            onClick={() => navigate("/finance/payments")}
          />
        </nav>
      )}
    </div>
  );
}