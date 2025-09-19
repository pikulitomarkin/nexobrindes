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
    { id: "finance", label: "Financeiro", icon: TrendingUp },
  ];

  // Assuming userRole is available, for example, from context or props
  const userRole = "admin"; // Placeholder for actual user role

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
      {userRole === 'admin' && (
          <>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/products">
                      <Package className="h-4 w-4" />
                      <span>Produtos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/users?tab=producers">
                      <Factory className="h-4 w-4" />
                      <span>Produtores</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/orders">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Pedidos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/budgets">
                      <FileText className="h-4 w-4" />
                      <span>Orçamentos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/users">
                      <Users className="h-4 w-4" />
                      <span>Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/clients">
                      <Users className="h-4 w-4" />
                      <span>Clientes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/vendors">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Vendedores</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/producers">
                      <Factory className="h-4 w-4" />
                      <span>Produtores</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/finance">
                      <DollarSign className="h-4 w-4" />
                      <span>Financeiro</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/commission-management">
                      <TrendingUp className="h-4 w-4" />
                      <span>Comissões</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/settings">
                      <Settings className="h-4 w-4" />
                      <span>Configurações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
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