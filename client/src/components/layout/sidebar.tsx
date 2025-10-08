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
} from "lucide-react";

import { useLocation } from "wouter";

// Assuming Link and SidebarMenu related components are imported from a UI library
// For demonstration, let's assume they are available or mock them if necessary.
// Example: import { Link } from 'your-link-component-library';
// Example: import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroupLabel, SidebarGroupContent } from 'your-sidebar-library';

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

// SidebarItem component
const SidebarItem = ({ icon: Icon, label, href, isActive }: any) => (
  <a
    href={href}
    className={`sidebar-item w-full flex items-center px-6 py-3 text-left text-white ${isActive ? "active" : ""}`}
  >
    <Icon className="mr-3 h-5 w-5" />
    <span>{label}</span>
  </a>
);

export default function Sidebar({ activePanel, onPanelChange }: SidebarProps) {
  const [location] = useLocation();
  const menuItems = [
    { id: "admin", label: "Admin Geral", icon: LayoutDashboard },
    { id: "vendor", label: "Vendedor", icon: ShoppingCart },
    { id: "client", label: "Painel de Clientes", icon: Users },
    { id: "producer", label: "Produtor Externo", icon: Factory },
    { id: "finance", label: "Módulo Financeiro", icon: DollarSign },
  ];

  // Assuming userRole is available, for example, from context or props
  const userRole = "admin"; // Placeholder for actual user role
  const user = { role: userRole }; // Mocking user object for role check
  const pathname = location; // Mocking pathname for active link highlighting

  return (
    <div className="w-64 gradient-bg text-white shadow-xl">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Nexo Brindes</h1>
        <p className="text-blue-100 text-sm">Vendas & Produção</p>
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
                icon={LayoutDashboard} 
                label="Dashboard" 
                href="/admin-dashboard" 
                isActive={pathname === '/admin-dashboard'}
              />
              <SidebarItem 
                icon={Users} 
                label="Usuários" 
                href="/admin/users" 
                isActive={pathname === '/admin/users'}
              />
              <SidebarItem 
                icon={Store} 
                label="Vendedores" 
                href="/admin/vendors" 
                isActive={pathname === '/admin/vendors'}
              />
              <SidebarItem 
                icon={UserCheck} 
                label="Clientes" 
                href="/admin/clients" 
                isActive={pathname === '/admin/clients'}
              />
              <SidebarItem 
                icon={Hammer} 
                label="Produtores" 
                href="/admin/producers" 
                isActive={pathname === '/admin/producers'}
              />
              <SidebarItem 
                icon={UserCheck} 
                label="Sócios" 
                href="/admin/partners" 
                isActive={pathname === '/admin/partners'}
              />
              <SidebarItem 
                icon={Package} 
                label="Produtos" 
                href="/admin/products" 
                isActive={pathname === '/admin/products'}
              />
              <SidebarItem 
                icon={Palette} 
                label="Personalizações" 
                href="/admin/customizations" 
                isActive={pathname === '/admin/customizations'}
              />
              <SidebarItem 
                icon={Calculator} 
                label="Orçamentos" 
                href="/admin/budgets" 
                isActive={pathname === '/admin/budgets'}
              />
              <SidebarItem 
                icon={ShoppingCart} 
                label="Pedidos" 
                href="/admin/orders" 
                isActive={pathname === '/admin/orders'}
              />
              <SidebarItem 
                icon={Percent} 
                label="Comissões" 
                href="/admin/commission-management" 
                isActive={pathname === '/admin/commission-management'}
              />
              <SidebarItem 
                icon={CreditCard} 
                label="Financeiro" 
                href="/finance" 
                isActive={pathname === '/finance'}
              />
              <SidebarItem 
                icon={Settings} 
                label="Configurações de Comissão" 
                href="/admin/commission-settings"
                isActive={location === "/admin/commission-settings"}
              />
              <SidebarItem 
                icon={DollarSign} 
                label="Pagamentos Produtores" 
                href="/admin/producer-payments"
                isActive={location === "/admin/producer-payments"}
              />
            </>
          )}

      {/* Vendor Panel Specific Links */}
      {activePanel === "vendor" && (
        <nav className="mt-8">
          <div className="px-6 mb-4">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Vendas
            </p>
          </div>
          <SidebarItem 
            icon={ShoppingCart} 
            label="Pedidos" 
            href="/vendor/orders"
            isActive={location === "/vendor/orders"}
          />
          <SidebarItem 
            icon={Users} 
            label="Clientes" 
            href="/vendor/clients"
            isActive={location === "/vendor/clients"}
          />
          <SidebarItem 
            icon={Package} 
            label="Produtos" 
            href="/vendor/products"
            isActive={location === "/vendor/products"}
          />
          <SidebarItem 
            icon={FileText} 
            label="Orçamentos" 
            href="/vendor/budgets"
            isActive={location === "/vendor/budgets"}
          />

          <div className="px-6 mb-4 mt-6">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Financeiro
            </p>
          </div>
          <SidebarItem 
            icon={DollarSign} 
            label="Comissões" 
            href="/vendor/commissions"
            isActive={location === "/vendor/commissions"}
          />
        </nav>
      )}

      {activePanel === "client" && (
        <nav className="mt-8">
          <div className="px-6 mb-4">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Dashboard
            </p>
          </div>
          <SidebarItem 
            icon={BarChart3} 
            label="Dashboard" 
            href="/client/dashboard"
            isActive={location === "/client/dashboard"}
          />

          <div className="px-6 mb-4 mt-6">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Pedidos
            </p>
          </div>
          <SidebarItem 
            icon={ShoppingCart} 
            label="Meus Pedidos" 
            href="/client/orders"
            isActive={location === "/client/orders"}
          />

          <div className="px-6 mb-4 mt-6">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Minha Conta
            </p>
          </div>
          <SidebarItem 
            icon={User} 
            label="Meu Perfil" 
            href="/client/profile"
            isActive={location === "/client/profile"}
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
            icon={BarChart3} 
            label="Painel de Produção" 
            href="/producer/production-dashboard"
            isActive={location === "/producer/production-dashboard"}
          />
          <SidebarItem 
            icon={CreditCard} 
            label="Contas a Receber" 
            href="/producer/receivables"
            isActive={location === "/producer/receivables"}
          />
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
            icon={DollarSign} 
            label="Contas a Receber" 
            href="/finance/receivables"
            isActive={location === "/finance/receivables"}
          />
          <SidebarItem 
            icon={TrendingDown} 
            label="Contas a Pagar" 
            href="/finance/payables"
            isActive={location === "/finance/payables"}
          />
          <SidebarItem 
            icon={Receipt} 
            label="Notas de Despesas" 
            href="/finance/expenses"
            isActive={location === "/finance/expenses"}
          />
          <SidebarItem 
            icon={TrendingUp} 
            label="Pagamentos de Comissão" 
            href="/finance/commission-payouts"
            isActive={location === "/finance/commission-payouts"}
          />
          <SidebarItem 
            icon={Calculator} 
            label="Conciliação Bancária" 
            href="/finance/reconciliation"
            isActive={location === "/finance/reconciliation"}
          />
          <SidebarItem 
            icon={CreditCard} 
            label="Histórico de Pagamentos" 
            href="/finance/payments"
            isActive={location === "/finance/payments"}
          />
        </nav>
      )}
    </div>
  );
}