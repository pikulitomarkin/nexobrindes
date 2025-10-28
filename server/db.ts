// Import PostgreSQL storage adapter and export as db
import { pgStorage } from "./storage.pg";
export const db = pgStorage;
export { eq, desc, sql, and, or, like, isNull, not } from "drizzle-orm";

// Export pg query builder for direct queries if needed
export { pg as query } from "./pgClient";

// Re-export types from schema for compatibility
export type {
  User,
  Client,
  Order,
  ProductionOrder,
  Payment,
  Commission,
  Partner,
  CommissionSettings,
  Vendor,
  Product,
  Budget,
  BudgetItem,
  BudgetPhoto,
  PaymentMethod,
  ShippingMethod,
  BudgetPaymentInfo
} from "../shared/schema";

// Export schema tables from shared/schema
export {
  users,
  clients,
  orders,
  productionOrders,
  payments,
  commissions,
  partners,
  commissionSettings,
  vendors,
  products,
  budgets,
  budgetItems,
  budgetPhotos,
  paymentMethods,
  shippingMethods,
  budgetPaymentInfo
} from "../shared/schema";