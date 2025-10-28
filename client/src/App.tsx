
import React from "react";
import { Router, Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Import all pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

// Admin pages
import AdminDashboard from "@/pages/dashboards/admin-dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminProducers from "@/pages/admin/producers";
import AdminClients from "@/pages/admin/clients";
import AdminVendors from "@/pages/admin/vendors";
import AdminPartners from "@/pages/admin/partners";
import AdminBranches from "@/pages/admin/branches";
import AdminOrders from "@/pages/admin/orders";
import AdminBudgets from "@/pages/admin/budgets";
import AdminCommissionManagement from "@/pages/admin/commission-management";
import AdminReports from "@/pages/admin/reports";
import AdminLogs from "@/pages/admin/logs";
import AdminUsers from "@/pages/admin/users";
import AdminCustomizations from "@/pages/admin/customizations";
import AdminCommissionSettings from "@/pages/admin/commission-settings";
import AdminProducerPayments from "@/pages/admin/producer-payments";

// Partner pages
import PartnerDashboard from "@/pages/dashboards/partner-dashboard";
import MyCommissions from "@/pages/partner/my-commissions";

// Vendor pages
import VendorDashboard from "@/pages/dashboards/vendor-dashboard";
import VendorProducts from "@/pages/vendor/products";
import VendorClients from "@/pages/vendor/clients";
import VendorBudgets from "@/pages/vendor/budgets";
import VendorOrders from "@/pages/vendor/orders";
import VendorCommissions from "@/pages/vendor/commissions";
import VendorQuoteRequests from "@/pages/vendor/quote-requests";

// Client pages
import ClientDashboard from "@/pages/dashboards/client-dashboard";
import ClientProducts from "@/pages/client/products";
import ClientOrders from "@/pages/client/orders";
import ClientBudgets from "@/pages/client/budgets";
import ClientProfile from "@/pages/client/profile";
import ClientOrderTimeline from "@/pages/client/order-timeline";

// Producer pages
import ProducerDashboard from "@/pages/dashboards/producer-dashboard";
import ProducerProductionDashboard from "@/pages/producer/production-dashboard";
import ProducerOrders from "@/pages/producer/orders";
import ProducerOrderDetails from "@/pages/producer/order-details";
import ProducerReceivables from "@/pages/producer/receivables";
import ProducerProfileSettings from "@/pages/producer/profile-settings";

// Finance pages
import FinanceIndex from "@/pages/finance/index";
import FinanceReceivables from "@/pages/finance/receivables";
import FinancePayables from "@/pages/finance/payables";
import FinanceExpenses from "@/pages/finance/expenses";
import FinanceCommissionPayouts from "@/pages/finance/commission-payouts";
import FinanceReconciliation from "@/pages/finance/reconciliation";
import FinancePayments from "@/pages/finance/payments";

// Logistics pages
import LogisticsDashboard from "@/pages/logistics/dashboard";
import LogisticsProducts from "@/pages/logistics/products";
import LogisticsProducers from "@/pages/logistics/producers";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Switch>
          <Route path="/login" component={Login} />
          
          {/* Admin routes */}
          <ProtectedRoute path="/" allowedRoles={["admin", "partner"]}>
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/products" allowedRoles={["admin", "partner"]}>
            <MainLayout>
              <AdminProducts />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/producers" allowedRoles={["admin", "partner"]}>
            <MainLayout>
              <AdminProducers />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/clients" allowedRoles={["admin", "partner"]}>
            <MainLayout>
              <AdminClients />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/vendors" allowedRoles={["admin", "partner"]}>
            <MainLayout>
              <AdminVendors />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/partners" allowedRoles={["admin"]}>
            <MainLayout>
              <AdminPartners />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/branches" allowedRoles={["admin", "partner"]}>
            <MainLayout>
              <AdminBranches />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/orders" allowedRoles={["admin", "partner"]}>
            <MainLayout>
              <AdminOrders />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/budgets" allowedRoles={["admin", "partner"]}>
            <MainLayout>
              <AdminBudgets />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/commission-management" allowedRoles={["admin", "partner"]}>
            <MainLayout>
              <AdminCommissionManagement />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/reports" allowedRoles={["admin", "partner"]}>
            <MainLayout>
              <AdminReports />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/logs" allowedRoles={["admin"]}>
            <MainLayout>
              <AdminLogs />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/users" allowedRoles={["admin"]}>
            <MainLayout>
              <AdminUsers />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/customizations" allowedRoles={["admin"]}>
            <MainLayout>
              <AdminCustomizations />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/commission-settings" allowedRoles={["admin"]}>
            <MainLayout>
              <AdminCommissionSettings />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/admin/producer-payments" allowedRoles={["admin"]}>
            <MainLayout>
              <AdminProducerPayments />
            </MainLayout>
          </ProtectedRoute>

          {/* Partner specific routes */}
          <ProtectedRoute path="/partner/my-commissions" allowedRoles={["partner"]}>
            <MainLayout>
              <MyCommissions />
            </MainLayout>
          </ProtectedRoute>

          {/* Partner dashboard for standalone access */}
          <ProtectedRoute path="/partner/dashboard" allowedRoles={["partner"]}>
            <PartnerDashboard />
          </ProtectedRoute>

          {/* Vendor routes */}
          <ProtectedRoute path="/vendor-dashboard" allowedRoles={["vendor"]}>
            <VendorDashboard />
          </ProtectedRoute>

          <ProtectedRoute path="/vendor/products" allowedRoles={["vendor"]}>
            <MainLayout>
              <VendorProducts />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/vendor/clients" allowedRoles={["vendor"]}>
            <MainLayout>
              <VendorClients />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/vendor/budgets" allowedRoles={["vendor"]}>
            <MainLayout>
              <VendorBudgets />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/vendor/orders" allowedRoles={["vendor"]}>
            <MainLayout>
              <VendorOrders />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/vendor/commissions" allowedRoles={["vendor"]}>
            <MainLayout>
              <VendorCommissions />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/vendor/quote-requests" allowedRoles={["vendor"]}>
            <MainLayout>
              <VendorQuoteRequests />
            </MainLayout>
          </ProtectedRoute>

          {/* Client routes */}
          <ProtectedRoute path="/client/dashboard" allowedRoles={["client"]}>
            <ClientDashboard />
          </ProtectedRoute>

          <ProtectedRoute path="/client/products" allowedRoles={["client"]}>
            <MainLayout>
              <ClientProducts />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/client/orders" allowedRoles={["client"]}>
            <MainLayout>
              <ClientOrders />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/client/budgets" allowedRoles={["client"]}>
            <MainLayout>
              <ClientBudgets />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/client/profile" allowedRoles={["client"]}>
            <MainLayout>
              <ClientProfile />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/client/orders/:id/timeline" allowedRoles={["client"]}>
            <MainLayout>
              <ClientOrderTimeline />
            </MainLayout>
          </ProtectedRoute>

          {/* Producer routes */}
          <ProtectedRoute path="/producer-dashboard" allowedRoles={["producer"]}>
            <ProducerDashboard />
          </ProtectedRoute>

          <ProtectedRoute path="/producer/production-dashboard" allowedRoles={["producer"]}>
            <ProducerProductionDashboard />
          </ProtectedRoute>

          <ProtectedRoute path="/producer/orders" allowedRoles={["producer"]}>
            <MainLayout>
              <ProducerOrders />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/producer/orders/:id" allowedRoles={["producer"]}>
            <MainLayout>
              <ProducerOrderDetails />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/producer/receivables" allowedRoles={["producer"]}>
            <MainLayout>
              <ProducerReceivables />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/producer/profile" allowedRoles={["producer"]}>
            <MainLayout>
              <ProducerProfileSettings />
            </MainLayout>
          </ProtectedRoute>

          {/* Finance routes */}
          <ProtectedRoute path="/finance" allowedRoles={["admin", "partner", "finance"]}>
            <MainLayout>
              <FinanceIndex />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/finance/receivables" allowedRoles={["admin", "partner", "finance"]}>
            <MainLayout>
              <FinanceReceivables />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/finance/payables" allowedRoles={["admin", "partner", "finance"]}>
            <MainLayout>
              <FinancePayables />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/finance/expenses" allowedRoles={["admin", "partner", "finance"]}>
            <MainLayout>
              <FinanceExpenses />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/finance/commission-payouts" allowedRoles={["admin", "partner", "finance"]}>
            <MainLayout>
              <FinanceCommissionPayouts />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/finance/reconciliation" allowedRoles={["admin", "partner", "finance"]}>
            <MainLayout>
              <FinanceReconciliation />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/finance/payments" allowedRoles={["admin", "partner", "finance"]}>
            <MainLayout>
              <FinancePayments />
            </MainLayout>
          </ProtectedRoute>

          {/* Logistics routes */}
          <ProtectedRoute path="/logistics/dashboard" allowedRoles={["admin", "logistics"]}>
            <MainLayout>
              <LogisticsDashboard />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/logistics/products" allowedRoles={["admin", "logistics"]}>
            <MainLayout>
              <LogisticsProducts />
            </MainLayout>
          </ProtectedRoute>

          <ProtectedRoute path="/logistics/producers" allowedRoles={["admin", "logistics"]}>
            <MainLayout>
              <LogisticsProducers />
            </MainLayout>
          </ProtectedRoute>

          {/* 404 */}
          <Route component={NotFound} />
        </Switch>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
