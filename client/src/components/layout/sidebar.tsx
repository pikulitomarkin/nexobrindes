import { 
  BarChart3, 
  Bus, 
  User, 
  Factory, 
  TrendingUp 
} from "lucide-react";

interface SidebarProps {
  activePanel: string;
  onPanelChange: (panel: string) => void;
}

export default function Sidebar({ activePanel, onPanelChange }: SidebarProps) {
  const menuItems = [
    { id: "admin", label: "Admin Geral", icon: BarChart3 },
    { id: "vendor", label: "Vendedor", icon: Bus },
    { id: "client", label: "Cliente", icon: User },
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
    </div>
  );
}