import { Switch, Route } from "wouter";
import { lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "@/components/layout/main-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

// Admin pages - Only the simplified ones
import AdminClients from "./pages/admin/clients";
import AdminVendors from "./pages/admin/vendors";
import AdminCommissionManagement from './pages/admin/commission-management';
import AdminProducts from "@/pages/admin/products";
import AdminProducers from "@/pages/admin/producers";
import AdminCustomizations from "@/pages/admin/customizations"; // Importação da página de customizações
import AdminCommissionSettings from "./pages/admin/commission-settings";
import AdminProducerPayments from "./pages/admin/producer-payments";

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

// Producer pages
import ProducerOrders from "@/pages/producer/orders";
import ProductionDashboard from "@/pages/producer/production-dashboard";
import ProducerOrderDetails from "./pages/producer/order-details";
import ProducerProfileSettings from "@/pages/producer/profile-settings";
import ProducerReceivables from "@/pages/producer/receivables";
import ClientOrderTimeline from "./pages/client/order-timeline";

// Finance pages
import FinanceIndex from "@/pages/finance/index";
import FinancePayments from "@/pages/finance/payments";
import FinanceReconciliation from "@/pages/finance/reconciliation";
import FinanceReceivables from "@/pages/finance/receivables";
import FinanceExpenses from "@/pages/finance/expenses";
import FinanceCommissionPayouts from "@/pages/finance/commission-payouts";
import FinancePayables from "@/pages/finance/payables";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/login" component={Login} />

          {/* Default routes */}
          <Route path="/">
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/dashboard">
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          {/* Admin Routes - Only simplified ones */}
          <Route path="/admin/clients">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminClients />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/vendors">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminVendors />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/commission-management">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminCommissionManagement />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/products">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminProducts />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/customizations">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminCustomizations />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/producers">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminProducers />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/commission-settings">
            <ProtectedRoute requiredRoles={["admin"]}>
              <MainLayout>
                <AdminCommissionSettings />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/admin/producer-payments">
            <ProtectedRoute requiredRoles={["admin"]}>
              <MainLayout>
                <AdminProducerPayments />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          {/* Partner Routes - Same as admin but with separate commissions */}
          <Route path="/partner/clients">
            <ProtectedRoute requiredRole="partner">
              <MainLayout>
                <PartnerClients />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/partner/vendors">
            <ProtectedRoute requiredRole="partner">
              <MainLayout>
                <PartnerVendors />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/partner/commission-management">
            <ProtectedRoute requiredRole="partner">
              <MainLayout>
                <PartnerCommissionManagement />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/partner/products">
            <ProtectedRoute requiredRole="partner">
              <MainLayout>
                <PartnerProducts />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/partner/producers">
            <ProtectedRoute requiredRole="partner">
              <MainLayout>
                <PartnerProducers />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          {/* Vendor Routes - Accessible by vendor users and admin */}
          <Route path="/vendor/dashboard">
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/vendor/products">
            <ProtectedRoute>
              <MainLayout>
                <VendorProducts />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/vendor/budgets">
            <ProtectedRoute>
              <MainLayout>
                <VendorBudgets />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/vendor/orders">
            <ProtectedRoute>
              <MainLayout>
                <VendorOrders />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/vendor/clients">
            <ProtectedRoute>
              <MainLayout>
                <VendorClients />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/vendor/commissions">
            <ProtectedRoute>
              <MainLayout>
                <VendorCommissions />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          {/* Client Routes - Accessible by client users and admin */}
          <Route path="/client/dashboard">
            <ProtectedRoute>
              <MainLayout>
                <ClientDashboard />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/client/orders">
            <ProtectedRoute>
              <MainLayout>
                <ClientOrders />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/client/profile">
            <ProtectedRoute>
              <MainLayout>
                <ClientProfile />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/client/order/:id/timeline">
            <ProtectedRoute>
              <MainLayout>
                <ClientOrderTimeline />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          {/* Producer Routes - Accessible by producer users and admin */}
          <Route path="/producer/production-dashboard">
            <ProtectedRoute>
              <MainLayout>
                <ProductionDashboard />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/producer/orders">
            <ProtectedRoute>
              <MainLayout>
                <ProducerOrders />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/producer/order/:id">
            <ProtectedRoute>
              <MainLayout>
                <ProducerOrderDetails />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/producer/profile-settings">
            <ProtectedRoute>
              <MainLayout>
                <ProducerProfileSettings />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/producer/accounts-to-receive">
            <ProtectedRoute>
              <MainLayout>
                <ProducerReceivables />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          {/* Finance Routes - Accessible by admin and finance roles */}
          <Route path="/finance">
            <ProtectedRoute requiredRoles={["admin", "finance"]}>
              <MainLayout>
                <FinanceIndex />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/finance/payments">
            <ProtectedRoute requiredRoles={["admin", "finance"]}>
              <MainLayout>
                <FinancePayments />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/finance/reconciliation">
            <ProtectedRoute requiredRoles={["admin", "finance"]}>
              <MainLayout>
                <FinanceReconciliation />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/finance/receivables">
            <ProtectedRoute requiredRoles={["admin", "finance"]}>
              <MainLayout>
                <FinanceReceivables />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/finance/payables">
            <ProtectedRoute requiredRoles={["admin", "finance"]}>
              <MainLayout>
                <FinancePayables />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/finance/expenses">
            <ProtectedRoute requiredRoles={["admin", "finance"]}>
              <MainLayout>
                <FinanceExpenses />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/finance/commission-payouts">
            <ProtectedRoute requiredRoles={["admin", "finance"]}>
              <MainLayout>
                <FinanceCommissionPayouts />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route component={NotFound} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;