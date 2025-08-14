import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import AdminPanel from "@/components/panels/admin-panel";
import VendorPanel from "@/components/panels/vendor-panel";
import ClientPanel from "@/components/panels/client-panel";
import ProducerPanel from "@/components/panels/producer-panel";
import FinancePanel from "@/components/panels/finance-panel";

export default function Dashboard() {
  const [activePanel, setActivePanel] = useState("admin");

  const renderPanel = () => {
    switch (activePanel) {
      case "admin":
        return <AdminPanel />;
      case "vendor":
        return <VendorPanel />;
      case "client":
        return <ClientPanel />;
      case "producer":
        return <ProducerPanel />;
      case "finance":
        return <FinancePanel />;
      default:
        return <AdminPanel />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar activePanel={activePanel} onPanelChange={setActivePanel} />
      <div className="flex-1 overflow-auto">
        {renderPanel()}
      </div>
    </div>
  );
}
