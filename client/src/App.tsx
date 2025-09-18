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

// Admin pages
import AdminVendors from "@/pages/admin/vendors";
import AdminClients from "@/pages/admin/clients";
import AdminOrders from "@/pages/admin/orders";
import AdminProducers from "@/pages/admin/producers";
import AdminFinance from "@/pages/admin/finance";
import AdminProducts from "@/pages/admin/products";
import AdminBudgets from "@/pages/admin/budgets";
import AdminCommissionManagement from './pages/admin/commission-management';
import AdminSettings from './pages/admin/settings';

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

          {/* Admin Routes - Only accessible by admin users */}
          <Route path="/admin/products">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminProducts />
              </MainLayout>
            </ProtectedRoute>
          </Route>
          
          <Route path="/admin/budgets">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminBudgets />
              </MainLayout>
            </ProtectedRoute>
          </Route>
          
          <Route path="/admin/orders">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminOrders />
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
          
          <Route path="/admin/clients">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminClients />
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
          
          <Route path="/admin/finance">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminFinance />
              </MainLayout>
            </ProtectedRoute>
          </Route>
          
          <Route path="/admin/settings">
            <ProtectedRoute requiredRole="admin">
              <MainLayout>
                <AdminSettings />
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