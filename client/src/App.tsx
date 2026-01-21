import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState, Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import Login from "@/pages/login";
import ClientRegister from "@/pages/ClientRegister";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleBasedRedirect from "@/components/auth/RoleBasedRedirect";
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
import AdminLogistics from "@/pages/admin/logistics";
import AdminProducts from "@/pages/admin/products";
import AdminSettings from "@/pages/admin/settings";
import AdminCommissionManagement from "@/pages/admin/commission-management";
import AdminCommissionSettings from "@/pages/admin/commission-settings";
import AdminPartners from "@/pages/admin/partners";
import AdminUsers from "@/pages/admin/users";
import AdminReports from "@/pages/admin/reports";
import AdminTvDashboard from "@/pages/admin/tv-dashboard";
import AdminProducerPayments from "@/pages/admin/producer-payments";
import AdminFinance from "@/pages/admin/finance";
import AdminCustomizations from "@/pages/admin/customizations";
import AdminBranches from "@/pages/admin/branches";
import AdminLogs from "@/pages/admin/logs";

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
import LogisticsPaidOrders from "@/pages/logistics/paid-orders";
import LogisticsProducts from "@/pages/logistics/products";
import LogisticsProducers from "@/pages/logistics/producers";

// Lazy imports
const AdminFixCommissions = lazy(() => import("./pages/admin/fix-commissions"));

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
            {/* Public Routes */}
            <Route path="/login" component={Login} />
            <Route path="/clientes" component={ClientRegister} />

            {/* Protected Routes */}
            <ProtectedRoute>
              <MainLayout>
                <Switch>
                  {/* Root redirect based on role */}
                  <Route path="/" component={RoleBasedRedirect} />
                  
                  {/* Admin Routes - Protected */}
                  <Route path="/admin" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/dashboard" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/orders" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminOrders />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/budgets" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminBudgets />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/clients" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminClients />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/vendors" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminVendors />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/branches" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminBranches />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/partners" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminPartners />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/producers" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminProducers />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/logistics" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminLogistics />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/products" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminProducts />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/settings" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminSettings />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/commission-management" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminCommissionManagement />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/commission-settings" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminCommissionSettings />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/fix-commissions" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminFixCommissions />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/users" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminUsers />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/reports" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminReports />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/tv-dashboard" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminTvDashboard />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/producer-payments" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminProducerPayments />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/finance" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminFinance />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/customizations" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminCustomizations />
                    </ProtectedRoute>
                  )} />
                  <Route path="/admin/logs" component={() => (
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminLogs />
                    </ProtectedRoute>
                  )} />

                  {/* Vendor Routes */}
                  <Route path="/vendor/dashboard" component={VendorDashboard} />
                  <Route path="/vendor/orders" component={VendorOrders} />
                  <Route path="/vendor/budgets" component={VendorBudgets} />
                  <Route path="/vendor/clients" component={VendorClients} />
                  <Route path="/vendor/products" component={VendorProducts} />
                  <Route path="/vendor/commissions" component={VendorCommissions} />
                  <Route path="/vendor/quote-requests" component={VendorQuoteRequests} />
                  <Route path="/vendor/logs" component={lazy(() => import("./pages/vendor/logs"))} />

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

                  {/* Partner Routes - Protected */}
                  <Route path="/partner/dashboard" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "partner"]}>
                      <PartnerDashboard />
                    </ProtectedRoute>
                  )} />
                  <Route path="/partner/commission-management" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "partner"]}>
                      <PartnerCommissionManagement />
                    </ProtectedRoute>
                  )} />
                  <Route path="/partner/clients" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "partner"]}>
                      <AdminClients />
                    </ProtectedRoute>
                  )} />
                  <Route path="/partner/vendors" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "partner"]}>
                      <AdminVendors />
                    </ProtectedRoute>
                  )} />
                  <Route path="/partner/producers" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "partner"]}>
                      <AdminProducers />
                    </ProtectedRoute>
                  )} />
                  <Route path="/partner/products" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "partner"]}>
                      <AdminProducts />
                    </ProtectedRoute>
                  )} />

                  {/* Finance Routes - accessible by admin, finance and partner users */}
                  <Route path="/finance"
                    component={() => (
                      <ProtectedRoute requiredRoles={["admin", "finance", "partner"]}>
                        <FinanceIndex />
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="/finance/receivables"
                    component={() => (
                      <ProtectedRoute requiredRoles={["admin", "finance", "partner"]}>
                        <FinanceReceivables />
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="/finance/payables"
                    component={() => (
                      <ProtectedRoute requiredRoles={["admin", "finance", "partner"]}>
                        <FinancePayables />
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="/finance/expenses"
                    component={() => (
                      <ProtectedRoute requiredRoles={["admin", "finance", "partner"]}>
                        <FinanceExpenses />
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="/finance/payments"
                    component={() => (
                      <ProtectedRoute requiredRoles={["admin", "finance", "partner"]}>
                        <FinancePayments />
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="/finance/commission-payouts"
                    component={() => (
                      <ProtectedRoute requiredRoles={["admin", "finance", "partner"]}>
                        <FinanceCommissionPayouts />
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="/finance/reconciliation"
                    component={() => (
                      <ProtectedRoute requiredRoles={["admin", "finance", "partner"]}>
                        <FinanceReconciliation />
                      </ProtectedRoute>
                    )}
                  />

                  {/* Logistics Routes - Protected */}
                  <Route path="/logistics/dashboard" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "logistics"]}>
                      <LogisticsDashboard />
                    </ProtectedRoute>
                  )} />
                  <Route path="/logistics/paid-orders" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "logistics"]}>
                      <LogisticsPaidOrders />
                    </ProtectedRoute>
                  )} />
                  <Route path="/logistics/production-tracking" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "logistics"]}>
                      <LogisticsDashboard />
                    </ProtectedRoute>
                  )} />
                  <Route path="/logistics/shipments" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "logistics"]}>
                      <LogisticsDashboard />
                    </ProtectedRoute>
                  )} />
                  <Route path="/logistics/products" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "logistics"]}>
                      <LogisticsProducts />
                    </ProtectedRoute>
                  )} />
                  <Route path="/logistics/producers" component={() => (
                    <ProtectedRoute requiredRoles={["admin", "logistics"]}>
                      <LogisticsProducers />
                    </ProtectedRoute>
                  )} />

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