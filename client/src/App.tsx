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

// Dashboard imports
import AdminDashboard from "@/pages/dashboards/admin-dashboard";
import VendorDashboard from "@/pages/dashboards/vendor-dashboard";
import ClientDashboard from "@/pages/dashboards/client-dashboard";
import ProducerDashboard from "@/pages/dashboards/producer-dashboard";
import PartnerDashboard from "@/pages/dashboards/partner-dashboard";

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

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Dashboard Routes */}
      <Route path="/admin/dashboard">
        <ProtectedRoute requiredRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/vendor/dashboard">
        <ProtectedRoute requiredRole="vendor">
          <VendorDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/client/dashboard">
        <ProtectedRoute requiredRole="client">
          <ClientDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/producer/dashboard">
        <ProtectedRoute requiredRole="producer">
          <ProducerDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/partner/dashboard">
        <ProtectedRoute requiredRole="partner">
          <PartnerDashboard />
        </ProtectedRoute>
      </Route>
      
      {/* Protected routes with MainLayout */}
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

        {/* Admin Routes */}
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


        {/* Vendor Routes */}
        <Route path="/vendor/products">
          <ProtectedRoute requiredRole="vendor">
            <MainLayout>
              <VendorProducts />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        
        <Route path="/vendor/budgets">
          <ProtectedRoute requiredRole="vendor">
            <MainLayout>
              <VendorBudgets />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        
        <Route path="/vendor/orders">
          <ProtectedRoute requiredRole="vendor">
            <MainLayout>
              <VendorOrders />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        
        <Route path="/vendor/clients">
          <ProtectedRoute requiredRole="vendor">
            <MainLayout>
              <VendorClients />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        
        <Route path="/vendor/commissions">
          <ProtectedRoute requiredRole="vendor">
            <MainLayout>
              <VendorCommissions />
            </MainLayout>
          </ProtectedRoute>
        </Route>

        {/* Client Routes */}
        <Route path="/client/orders">
          <ProtectedRoute requiredRole="client">
            <MainLayout>
              <ClientOrders />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        
        <Route path="/client/order/:id/timeline">
          <ProtectedRoute requiredRole="client">
            <MainLayout>
              <ClientOrderTimeline />
            </MainLayout>
          </ProtectedRoute>
        </Route>

        {/* Producer Routes */}
        <Route path="/producer/production-dashboard">
          <ProtectedRoute requiredRole="producer">
            <MainLayout>
              <ProductionDashboard />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        
        <Route path="/producer/orders">
          <ProtectedRoute requiredRole="producer">
            <MainLayout>
              <ProducerOrders />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        
        <Route path="/producer/order/:id">
          <ProtectedRoute requiredRole="producer">
            <MainLayout>
              <ProducerOrderDetails />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        
        <Route path="/producer/profile-settings">
          <ProtectedRoute requiredRole="producer">
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;