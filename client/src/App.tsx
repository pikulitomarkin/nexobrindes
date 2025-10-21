import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import Login from "@/pages/login";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MainLayout from "@/components/layout/main-layout";
import NotFound from "@/pages/not-found";

// Dashboard imports
import AdminDashboard from "@/pages/dashboards/admin-dashboard";
import VendorDashboard from "@/pages/dashboards/vendor-dashboard";
import ClientDashboard from "@/pages/dashboards/client-dashboard";
import ProducerDashboard from "@/pages/dashboards/producer-dashboard";
import PartnerDashboard from "@/pages/dashboards/partner-dashboard";

// Admin imports
import AdminOrders from "@/pages/admin/orders";
import AdminBudgets from "@/pages/admin/budgets";
import AdminClients from "@/pages/admin/clients";
import AdminVendors from "@/pages/admin/vendors";
import AdminProducers from "@/pages/admin/producers";
import AdminProducts from "@/pages/admin/products";
import AdminSettings from "@/pages/admin/settings";
import AdminCommissionManagement from "@/pages/admin/commission-management";
import AdminCommissionSettings from "@/pages/admin/commission-settings";
import AdminPartners from "@/pages/admin/partners";
import AdminUsers from "@/pages/admin/users";
import AdminReports from "@/pages/admin/reports";
import AdminProducerPayments from "@/pages/admin/producer-payments";
import AdminFinance from "@/pages/admin/finance";
import AdminCustomizations from "@/pages/admin/customizations";

// Vendor imports
import VendorOrders from "@/pages/vendor/orders";
import VendorBudgets from "@/pages/vendor/budgets";
import VendorClients from "@/pages/vendor/clients";
import VendorProducts from "@/pages/vendor/products";
import VendorCommissions from "@/pages/vendor/commissions";
import VendorQuoteRequests from "@/pages/vendor/quote-requests";

// Client imports
import ClientOrders from "./pages/client/orders";
import ClientBudgets from "./pages/client/budgets";
import ClientProducts from "./pages/client/products";
import ClientOrderTimeline from "./pages/client/order-timeline";
import ClientProfile from "./pages/client/profile";

// Producer imports
import ProducerOrders from "@/pages/producer/orders";
import ProducerOrderDetails from "@/pages/producer/order-details";
import ProducerProductionDashboard from "@/pages/producer/production-dashboard";
import ProducerProfileSettings from "@/pages/producer/profile-settings";
import ProducerReceivables from "@/pages/producer/receivables";

// Partner imports
import PartnerClients from "@/pages/partner/clients";
import PartnerVendors from "@/pages/partner/vendors";
import PartnerProducers from "@/pages/partner/producers";
import PartnerProducts from "@/pages/partner/products";
import PartnerCommissionManagement from "@/pages/partner/commission-management";

// Finance imports
import FinanceIndex from "@/pages/finance/index";
import FinanceReceivables from "@/pages/finance/receivables";
import FinancePayables from "@/pages/finance/payables";
import FinancePayments from "@/pages/finance/payments";
import FinanceExpenses from "@/pages/finance/expenses";
import FinanceCommissionPayouts from "@/pages/finance/commission-payouts";
import FinanceReconciliation from "@/pages/finance/reconciliation";

// Logistics imports
import LogisticsDashboard from "@/pages/logistics/dashboard";
import LogisticsProducts from "@/pages/logistics/products";
import LogisticsProducers from "@/pages/logistics/producers";

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [location] = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Checking auth with token:', token?.substring(0, 20) + '...');

      if (!token) {
        console.log('No token found');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Auth response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Auth verification successful:', data.user.username, data.user.role);
        setUser(data.user);
      } else {
        console.log('Auth verification failed');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Auth verification error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          </div>
        }>
          <Switch>
            {/* Login Route */}
            <Route path="/login" component={Login} />

            {/* Protected Routes */}
            <ProtectedRoute>
              <MainLayout>
                <Switch>
                  {/* Admin Routes */}
                  <Route path="/" component={AdminDashboard} />
                  <Route path="/admin" component={AdminDashboard} />
                  <Route path="/admin/dashboard" component={AdminDashboard} />
                  <Route path="/admin/orders" component={AdminOrders} />
                  <Route path="/admin/budgets" component={AdminBudgets} />
                  <Route path="/admin/clients" component={AdminClients} />
                  <Route path="/admin/vendors" component={AdminVendors} />
                  <Route path="/admin/producers" component={AdminProducers} />
                  <Route path="/admin/products" component={AdminProducts} />
                  <Route path="/admin/settings" component={AdminSettings} />
                  <Route path="/admin/commission-management" component={AdminCommissionManagement} />
                  <Route path="/admin/commission-settings" component={AdminCommissionSettings} />
                  <Route path="/admin/partners" component={AdminPartners} />
                  <Route path="/admin/users" component={AdminUsers} />
                  <Route path="/admin/reports" component={AdminReports} />
                  <Route path="/admin/producer-payments" component={AdminProducerPayments} />
                  <Route path="/admin/finance" component={AdminFinance} />
                  <Route path="/admin/customizations" component={AdminCustomizations} />

                  {/* Vendor Routes */}
                  <Route path="/vendor/dashboard" component={VendorDashboard} />
                  <Route path="/vendor/orders" component={VendorOrders} />
                  <Route path="/vendor/budgets" component={VendorBudgets} />
                  <Route path="/vendor/clients" component={VendorClients} />
                  <Route path="/vendor/products" component={VendorProducts} />
                  <Route path="/vendor/commissions" component={VendorCommissions} />
                  <Route path="/vendor/quote-requests" component={VendorQuoteRequests} />

                  {/* Client Routes */}
                  <Route path="/client/dashboard" component={ClientDashboard} />
                  <Route path="/client/products" component={ClientProducts} />
                  <Route path="/client/budgets" component={ClientBudgets} />
                  <Route path="/client/orders" component={ClientOrders} />
                  <Route path="/client/order/:orderId/timeline" component={ClientOrderTimeline} />
                  <Route path="/client/profile" component={ClientProfile} />


                  {/* Producer Routes */}
                  <Route path="/producer/dashboard" component={ProducerDashboard} />
                  <Route path="/producer/orders" component={ProducerOrders} />
                  <Route path="/producer/order/:id" component={ProducerOrderDetails} />
                  <Route path="/producer/production-dashboard" component={ProducerProductionDashboard} />
                  <Route path="/producer/profile-settings" component={ProducerProfileSettings} />
                  <Route path="/producer/receivables" component={ProducerReceivables} />

                  {/* Partner Routes */}
                  <Route path="/partner/dashboard" component={PartnerDashboard} />
                  <Route path="/partner/clients" component={PartnerClients} />
                  <Route path="/partner/vendors" component={PartnerVendors} />
                  <Route path="/partner/producers" component={PartnerProducers} />
                  <Route path="/partner/products" component={PartnerProducts} />
                  <Route path="/partner/commission-management" component={PartnerCommissionManagement} />

                  {/* Finance Routes */}
                  <Route path="/finance" component={FinanceIndex} />
                  <Route path="/finance/receivables" component={FinanceReceivables} />
                  <Route path="/finance/payables" component={FinancePayables} />
                  <Route path="/finance/payments" component={FinancePayments} />
                  <Route path="/finance/expenses" component={FinanceExpenses} />
                  <Route path="/finance/commission-payouts" component={FinanceCommissionPayouts} />
                  <Route path="/finance/reconciliation" component={FinanceReconciliation} />

                  {/* Logistics Routes */}
                  <Route path="/logistics/dashboard" component={LogisticsDashboard} />
                  <Route path="/logistics/paid-orders" component={LogisticsDashboard} />
                  <Route path="/logistics/production-tracking" component={LogisticsDashboard} />
                  <Route path="/logistics/shipments" component={LogisticsDashboard} />
                  <Route path="/logistics/products" component={LogisticsProducts} />
                  <Route path="/logistics/producers" component={LogisticsProducers} />

                  {/* 404 Route */}
                  <Route component={NotFound} />
                </Switch>
              </MainLayout>
            </ProtectedRoute>

            {/* Catch-all for unauthenticated users */}
            <Route path="/:rest*" component={Login} />
          </Switch>
        </Suspense>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;