// Direct PostgreSQL connection using Neon serverless with WebSocket support
// This eliminates unnecessary middleware and uses the properly configured connection pool
import { pg, pool } from './pgClient.js';
import { pgStorage } from './storage.pg.js';
import * as schema from '../shared/schema.js';

// Export pgStorage as 'db' for compatibility with routes.ts (has methods like getUserByUsername)
export const db = pgStorage;

// Export the raw Drizzle instance for direct queries
export const query = pg;

// Export database utilities
export { eq, desc, sql, and, or, like, isNull, not } from "drizzle-orm";

// Export pool for direct access if needed
export { pool };

// Export schema for use in queries
export { schema };

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
} from '../shared/schema.js';

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
} from '../shared/schema.js';
