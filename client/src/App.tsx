import { Switch, Route } from "wouter";
import { lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

// Admin pages
import AdminVendors from "@/pages/admin/vendors";
import AdminClients from "@/pages/admin/clients";
import AdminOrders from "@/pages/admin/orders";
import AdminProducers from "@/pages/admin/producers";
import AdminFinance from "@/pages/admin/finance";
import AdminProducts from "@/pages/admin/products";
import AdminBudgets from "@/pages/admin/budgets";

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

// Finance pages
import FinancePayments from "@/pages/finance/payments";
import FinanceReconciliation from "@/pages/finance/reconciliation";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />

        {/* Admin Routes */}
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/budgets" component={AdminBudgets} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/vendors" component={AdminVendors} />
        <Route path="/admin/clients" component={AdminClients} />
        <Route path="/admin/producers" component={AdminProducers} />
        <Route path="/admin/finance" component={AdminFinance} />


        {/* Vendor Routes */}
        <Route path="/vendor/products" component={VendorProducts} />
        <Route path="/vendor/budgets" component={VendorBudgets} />
        <Route path="/vendor/orders" component={VendorOrders} />
        <Route path="/vendor/clients" component={VendorClients} />
        <Route path="/vendor/commissions" component={VendorCommissions} />

        {/* Client Routes */}
        <Route path="/client/orders" component={ClientOrders} />

        {/* Producer Routes */}
        <Route path="/producer/orders" component={ProducerOrders} />

        {/* Finance Routes */}
        <Route path="/finance/payments" component={FinancePayments} />
        <Route path="/finance/reconciliation" component={FinanceReconciliation} />

        <Route component={NotFound} />
      </Switch>
    </MainLayout>
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