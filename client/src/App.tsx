import React, { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Sidebar from "@/components/layout/sidebar";
import NotFound from "@/pages/not-found"; // Import NotFound component

// Admin pages
import AdminClients from "@/pages/admin/clients";
import AdminVendors from "@/pages/admin/vendors";
import AdminCommissionManagement from "@/pages/admin/commission-management";
import AdminProducts from "@/pages/admin/products";
import AdminProducers from "@/pages/admin/producers";
import AdminCustomizations from "@/pages/admin/customizations"; // Importação da página de customizações
import AdminDashboard from "@/pages/dashboards/admin-dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminSettings from "@/pages/admin/settings";
import AdminBudgets from "@/pages/admin/budgets"; // Assuming AdminBudgets exists
import AdminOrders from "@/pages/admin/orders"; // Assuming AdminOrders exists

// Partner pages - Same functionality as admin but with separate commissions
import PartnerClients from "@/pages/partner/clients";
import PartnerVendors from "@/pages/partner/vendors";
import PartnerCommissionManagement from "@/pages/partner/commission-management";
import PartnerProducts from "@/pages/partner/products";
import PartnerProducers from "@/pages/partner/producers";

// Vendor pages
import VendorOrders from "@/pages/vendor/orders";
import VendorClients from "@/pages/vendor/clients";
import VendorCommissions from "@/pages/vendor/commissions";
import VendorProducts from "@/pages/vendor/products";
import VendorBudgets from "@/pages/vendor/budgets";

// Client pages
import ClientOrders from "@/pages/client/orders";
import ClientProfile from "@/pages/client/profile";
import ClientDashboard from "@/pages/dashboards/client-dashboard";
import ClientOrderTimeline from "./pages/client/order-timeline";


// Producer pages
import ProducerOrders from "@/pages/producer/orders";
import ProductionDashboard from "@/pages/producer/production-dashboard";
import ProducerOrderDetails from "./pages/producer/order-details";
import ProducerProfileSettings from "./pages/producer/profile-settings";


// Finance pages
import FinanceIndex from "@/pages/finance/index";
import FinancePayments from "@/pages/finance/payments";
import FinanceReconciliation from "@/pages/finance/reconciliation";
import FinanceReceivables from "@/pages/finance/receivables";
import FinanceExpenses from "@/pages/finance/expenses";
import FinanceCommissionPayouts from "@/pages/finance/commission-payouts";
import FinancePayables from "@/pages/finance/payables";


const queryClient = new QueryClient();

function App() {
  const [location] = useLocation();
  const [activePanel, setActivePanel] = useState("admin");

  // Update active panel based on current route
  useEffect(() => {
    if (location.startsWith("/admin")) {
      setActivePanel("admin");
    } else if (location.startsWith("/partner")) {
      setActivePanel("partner");
    } else if (location.startsWith("/vendor")) {
      setActivePanel("vendor");
    } else if (location.startsWith("/client")) {
      setActivePanel("client");
    } else if (location.startsWith("/producer")) {
      setActivePanel("producer");
    } else if (location.startsWith("/finance")) {
      setActivePanel("finance");
    } else {
      setActivePanel(""); // Reset or set a default if no specific panel matches
    }
  }, [location]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <Switch>
          <Route path="/login" component={Login} />

          {/* Protected routes with sidebar */}
          <ProtectedRoute>
            <div className="flex h-screen">
              {/* Sidebar */}
              <Sidebar
                activePanel={activePanel}
                onPanelChange={setActivePanel}
              />

              {/* Main Content */}
              <div className="flex-1 overflow-auto">
                <Switch>
                  {/* Default Dashboard */}
                  <Route path="/">
                    <Dashboard />
                  </Route>

                  <Route path="/dashboard">
                    <Dashboard />
                  </Route>


                  {/* Admin Routes - Only simplified ones */}
                  <Route path="/admin/clients">
                    <AdminClients />
                  </Route>
                  <Route path="/admin/vendors">
                    <AdminVendors />
                  </Route>
                  <Route path="/admin/commission-management">
                    <AdminCommissionManagement />
                  </Route>
                  <Route path="/admin/products">
                    <AdminProducts />
                  </Route>
                  <Route path="/admin/customizations">
                    <AdminCustomizations />
                  </Route>
                  <Route path="/admin/producers">
                    <AdminProducers />
                  </Route>
                  <Route path="/admin/dashboard">
                    <AdminDashboard />
                  </Route>
                  <Route path="/admin/users">
                    <AdminUsers />
                  </Route>
                  <Route path="/admin/settings">
                    <AdminSettings />
                  </Route>
                  <Route path="/admin/budgets">
                    <AdminBudgets />
                  </Route>
                  <Route path="/admin/orders">
                    <AdminOrders />
                  </Route>


                  {/* Partner Routes - Same as admin but with separate commissions */}
                  <Route path="/partner/clients">
                    <PartnerClients />
                  </Route>
                  <Route path="/partner/vendors">
                    <PartnerVendors />
                  </Route>
                  <Route path="/partner/commission-management">
                    <PartnerCommissionManagement />
                  </Route>
                  <Route path="/partner/products">
                    <PartnerProducts />
                  </Route>
                  <Route path="/partner/producers">
                    <PartnerProducers />
                  </Route>

                  {/* Vendor Routes - Accessible by vendor users and admin */}
                  <Route path="/vendor/dashboard">
                    <Dashboard />
                  </Route>
                  <Route path="/vendor/products">
                    <VendorProducts />
                  </Route>
                  <Route path="/vendor/budgets">
                    <VendorBudgets />
                  </Route>
                  <Route path="/vendor/orders">
                    <VendorOrders />
                  </Route>
                  <Route path="/vendor/clients">
                    <VendorClients />
                  </Route>
                  <Route path="/vendor/commissions">
                    <VendorCommissions />
                  </Route>

                  {/* Client Routes - Accessible by client users and admin */}
                  <Route path="/client/dashboard">
                    <ClientDashboard />
                  </Route>
                  <Route path="/client/orders">
                    <ClientOrders />
                  </Route>
                  <Route path="/client/profile">
                    <ClientProfile />
                  </Route>
                  <Route path="/client/order/:id/timeline">
                    <ClientOrderTimeline />
                  </Route>

                  {/* Producer Routes - Accessible by producer users and admin */}
                  <Route path="/producer/production-dashboard">
                    <ProductionDashboard />
                  </Route>
                  <Route path="/producer/orders">
                    <ProducerOrders />
                  </Route>
                  <Route path="/producer/order/:id">
                    <ProducerOrderDetails />
                  </Route>
                  <Route path="/producer/profile-settings">
                    <ProducerProfileSettings />
                  </Route>

                  {/* Finance Routes - Accessible by admin and finance roles */}
                  <Route path="/finance">
                    <FinanceIndex />
                  </Route>
                  <Route path="/finance/payments">
                    <FinancePayments />
                  </Route>
                  <Route path="/finance/reconciliation">
                    <FinanceReconciliation />
                  </Route>
                  <Route path="/finance/receivables">
                    <FinanceReceivables />
                  </Route>
                  <Route path="/finance/payables">
                    <FinancePayables />
                  </Route>
                  <Route path="/finance/expenses">
                    <FinanceExpenses />
                  </Route>
                  <Route path="/finance/commission-payouts">
                    <FinanceCommissionPayouts />
                  </Route>

                  {/* 404 - Not Found */}
                  <Route component={NotFound} />
                </Switch>
              </div>
            </div>
          </ProtectedRoute>
        </Switch>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;