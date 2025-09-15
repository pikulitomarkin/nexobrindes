import AdminPanel from "@/components/panels/admin-panel";
import FinancePanel from "@/components/panels/finance-panel";
import ProductionDashboard from "@/pages/producer/production-dashboard";
import { useState } from "react";

export default function Dashboard() {
  const [currentPanel, setCurrentPanel] = useState("admin");

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="w-full md:w-64 bg-gray-800 text-white p-4">
        <h2 className="text-xl font-bold mb-4">Painéis</h2>
        <ul>
          <li
            className={`cursor-pointer p-2 rounded ${
              currentPanel === "admin" ? "bg-blue-600" : ""
            }`}
            onClick={() => setCurrentPanel("admin")}
          >
            Admin
          </li>
          <li
            className={`cursor-pointer p-2 rounded ${
              currentPanel === "finance" ? "bg-blue-600" : ""
            }`}
            onClick={() => setCurrentPanel("finance")}
          >
            Financeiro
          </li>
          <li
            className={`cursor-pointer p-2 rounded ${
              currentPanel === "producer" ? "bg-blue-600" : ""
            }`}
            onClick={() => setCurrentPanel("producer")}
          >
            Produtor
          </li>
        </ul>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {currentPanel === "admin" && <AdminPanel />}
        {currentPanel === "finance" && <FinancePanel />}
        {currentPanel === "producer" && <ProductionDashboard />}
      </div>
    </div>
  );
}