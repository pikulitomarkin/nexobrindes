import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin', 'vendor', 'client', 'producer', 'finance'
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  vendorId: varchar("vendor_id"), // For clients: link to their assigned vendor
  isActive: boolean("is_active").default(true),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  cpfCnpj: text("cpf_cnpj"),
  address: text("address"),
  vendorId: varchar("vendor_id").references(() => users.id), // Vendedor responsável
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),
  producerId: varchar("producer_id").references(() => users.id),
  product: text("product").notNull(),
  description: text("description"),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  paidValue: decimal("paid_value", { precision: 10, scale: 2 }).default('0'),
  status: text("status").notNull().default('pending'), // 'pending', 'confirmed', 'production', 'shipped', 'delivered', 'cancelled'
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productionOrders = pgTable("production_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  producerId: varchar("producer_id").references(() => users.id).notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'production', 'completed', 'rejected'
  deadline: timestamp("deadline"),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull(), // 'pix', 'credit_card', 'bank_transfer'
  status: text("status").notNull().default('pending'), // 'pending', 'confirmed', 'failed'
  transactionId: text("transaction_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commissions = pgTable("commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'confirmed', 'paid'
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  salesLink: text("sales_link").unique(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default('10.00'),
  isActive: boolean("is_active").default(true),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").default('un'),
  isActive: boolean("is_active").default(true),
  
  // Campos adicionais do JSON XBZ
  externalId: text("external_id"), // IdProduto
  externalCode: text("external_code"), // CodigoXbz
  compositeCode: text("composite_code"), // CodigoComposto
  friendlyCode: text("friendly_code"), // CodigoAmigavel
  siteLink: text("site_link"), // SiteLink
  imageLink: text("image_link"), // ImageLink
  mainColor: text("main_color"), // CorWebPrincipal
  secondaryColor: text("secondary_color"), // CorWebSecundaria
  weight: decimal("weight", { precision: 8, scale: 2 }), // Peso
  height: decimal("height", { precision: 8, scale: 2 }), // Altura
  width: decimal("width", { precision: 8, scale: 2 }), // Largura
  depth: decimal("depth", { precision: 8, scale: 2 }), // Profundidade
  availableQuantity: integer("available_quantity"), // QuantidadeDisponivel
  stockStatus: text("stock_status"), // StatusConfiabilidade
  ncm: text("ncm"), // Ncm
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetNumber: text("budget_number").notNull().unique(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('draft'), // 'draft', 'sent', 'approved', 'rejected', 'converted'
  validUntil: timestamp("valid_until"),
  
  // Campos para personalização
  hasCustomization: boolean("has_customization").default(false),
  customizationPercentage: decimal("customization_percentage", { precision: 5, scale: 2 }).default('0.00'),
  customizationValue: decimal("customization_value", { precision: 10, scale: 2 }).default('0.00'),
  customizationDescription: text("customization_description"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const budgetItems = pgTable("budget_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id").references(() => budgets.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  
  // Campos para personalização do item
  hasItemCustomization: boolean("has_item_customization").default(false),
  itemCustomizationPercentage: decimal("item_customization_percentage", { precision: 5, scale: 2 }).default('0.00'),
  itemCustomizationDescription: text("item_customization_description"),
});

// Nova tabela para armazenar fotos dos orçamentos
export const budgetPhotos = pgTable("budget_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id").references(() => budgets.id).notNull(),
  photoUrl: text("photo_url").notNull(),
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductionOrderSchema = createInsertSchema(productionOrders).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertCommissionSchema = createInsertSchema(commissions).omit({ id: true, createdAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetSchema = createInsertSchema(budgets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({ id: true });
export const insertBudgetPhotoSchema = createInsertSchema(budgetPhotos).omit({ id: true, uploadedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = z.infer<typeof insertProductionOrderSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type BudgetItem = typeof budgetItems.$inferSelect;
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type BudgetPhoto = typeof budgetPhotos.$inferSelect;
export type InsertBudgetPhoto = z.infer<typeof insertBudgetPhotoSchema>;
