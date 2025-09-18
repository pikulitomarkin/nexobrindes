import { 
  BarChart3, 
  Bus, 
  User, 
  Factory, 
  TrendingUp,
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
} from "lucide-react";

import { useLocation } from "wouter";

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
    { id: "client", label: "Cliente", icon: Users },
    { id: "producer", label: "Produtor Externo", icon: Factory },
    { id: "finance", label: "Financeiro", icon: TrendingUp },
  ];

  return (
    <div className="w-64 gradient-bg text-white shadow-xl">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">ERP Sistema</h1>
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
      {activePanel === "admin" && (
        <nav className="mt-8">
          <div className="px-6 mb-4">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Gestão
            </p>
          </div>
          <SidebarItem 
            icon={ShoppingCart} 
            label="Pedidos" 
            href="/admin/orders"
            isActive={location === "/admin/orders"}
          />
          <SidebarItem 
            icon={Users} 
            label="Clientes" 
            href="/admin/clients"
            isActive={location === "/admin/clients"}
          />
          <SidebarItem 
            icon={Package} 
            label="Produtos" 
            href="/admin/products"
            isActive={location === "/admin/products"}
          />
          <SidebarItem 
            icon={FileText} 
            label="Orçamentos" 
            href="/admin/budgets"
            isActive={location === "/admin/budgets"}
          />
          <SidebarItem 
            icon={Factory} 
            label="Produtores" 
            href="/admin/producers"
            isActive={location === "/admin/producers"}
          />
          <SidebarItem 
            icon={UserCheck} 
            label="Vendedores" 
            href="/admin/vendors"
            isActive={location === "/admin/vendors"}
          />
          
          <div className="px-6 mb-4 mt-6">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Comissões
            </p>
          </div>
          <SidebarItem 
            icon={Calculator} 
            label="Gerenciar Comissões" 
            href="/admin/commission-management"
            isActive={location === "/admin/commission-management"}
          />
          
          <div className="px-6 mb-4 mt-6">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">
              Configurações
            </p>
          </div>
          <SidebarItem 
            icon={Settings} 
            label="Configurações Gerais" 
            href="/admin/settings"
            isActive={location === "/admin/settings"}
          />
          <SidebarItem 
            icon={TrendingUp} 
            label="Financeiro" 
            href="/admin/finance"
            isActive={location === "/admin/finance"}
          />
        </nav>
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
            icon={Package} 
            label="Ordens" 
            href="/producer/orders"
            isActive={location === "/producer/orders"}
          />
        </nav>
      )}
    </div>
  );
}