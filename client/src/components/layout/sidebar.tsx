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

import Link from "next/link"; // Assuming next/link for routing
import { SidebarMenuItem, SidebarMenuButton } from "./ui/sidebar-menu"; // Assuming these are UI components

interface SidebarProps {
  activePanel: string;
  onPanelChange: (panel: string) => void;
}

// Mocking currentUser and location for demonstration purposes
const currentUser = { role: 'producer' }; 
const location = '/producer/dashboard';

// Mocking SidebarItem component
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
              Configurações
            </p>
          </div>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/admin/commission-settings">
                <Percent className="h-4 w-4" />
                <span>Configurar Comissões</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/admin/settings">
                <Settings className="h-4 w-4" />
                <span>Configurações Gerais</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </nav>
      )}

      {currentUser?.role === 'producer' && (
            <>
              <SidebarItem 
                icon={BarChart3} 
                label="Dashboard" 
                href="/producer/dashboard"
                isActive={location === "/producer/dashboard"}
              />
              <SidebarItem 
                icon={Package} 
                label="Ordens" 
                href="/producer/orders"
                isActive={location === "/producer/orders"}
              />
            </>
          )}
    </div>
  );
}