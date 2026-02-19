// This file contains mock data for demonstration purposes
// In a real application, this would come from the backend API

export const mockStats = {
  ordersToday: 24,
  inProduction: 18,
  monthlyRevenue: 84500,
  activeVendors: 12,
};

export const mockOrders = [
  {
    id: "1",
    orderNumber: "#12345",
    clientName: "João Silva",
    vendorName: "Maria Santos",
    totalValue: 2450.00,
    status: "production",
    createdAt: new Date("2024-11-15"),
  },
  {
    id: "2", 
    orderNumber: "#12346",
    clientName: "Ana Costa",
    vendorName: "Carlos Lima",
    totalValue: 1890.00,
    status: "pending",
    createdAt: new Date("2024-11-14"),
  },
];

export const mockVendorInfo = {
  monthlySales: 12890,
  commissions: 1934,
  confirmedOrders: 8,
  salesLink: "https://erp.com/v/maria123",
};

export const mockFinanceOverview = {
  receivables: 45890,
  payables: 12450,
  balance: 89230,
  pendingCommissions: 8940,
};

export const mockProducerStats = {
  activeOrders: 7,
  pendingOrders: 3,
  completedOrders: 24,
};
