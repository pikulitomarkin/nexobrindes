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
import AdminClients from "@/pages/admin/clients";
import AdminCommissionManagement from './pages/admin/commission-management';

// Vendor pages
import VendorOrders from "@/pages/vendor/orders";
import VendorClients from "@/pages/vendor/clients";
import VendorCommissions from "@/pages/vendor/commissions";
import VendorProducts from "@/pages/vendor/products";
import VendorBudgets from "@/pages/vendor/budgets";

// Client pages
import ClientOrders from "@/pages/client/orders";

// Producer pages
import ProducerOrders from "@/pages/producer/orders";
import ProductionDashboard from "@/pages/producer/production-dashboard";
import ProducerOrderDetails from "./pages/producer/order-details";
import ProducerProfileSettings from "./pages/producer/profile-settings";
import ClientOrderTimeline from "./pages/client/order-timeline";

// Finance pages
import FinancePayments from "@/pages/finance/payments";
import FinanceReconciliation from "@/pages/finance/reconciliation";

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

          <Route path="/admin/commission-management">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminCommissionManagement />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          {/* Vendor Routes - Accessible by vendor users and admin */}
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
          <Route path="/client/orders">
            <ProtectedRoute>
              <MainLayout>
                <ClientOrders />
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

          {/* Finance Routes */}
          <Route path="/finance/payments">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <FinancePayments />
              </MainLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/finance/reconciliation">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <FinanceReconciliation />
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