// Import storage and export as db for compatibility with existing imports
import { storage } from "./storage";
export const db = storage;
export { eq, desc, sql } from "drizzle-orm";

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