var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api/index.ts
import express3 from "express";

// server/routes.ts
import { createServer } from "http";
import multer from "multer";
import express from "express";
import path2 from "path";
import crypto from "crypto";

// server/pgClient.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accountsReceivable: () => accountsReceivable,
  bankImports: () => bankImports,
  bankTransactions: () => bankTransactions,
  branches: () => branches,
  budgetItems: () => budgetItems,
  budgetPaymentInfo: () => budgetPaymentInfo,
  budgetPhotos: () => budgetPhotos,
  budgets: () => budgets,
  clients: () => clients,
  commissionPayouts: () => commissionPayouts,
  commissionSettings: () => commissionSettings,
  commissions: () => commissions,
  customizationOptions: () => customizationOptions,
  expenseNotes: () => expenseNotes,
  insertAccountsReceivableSchema: () => insertAccountsReceivableSchema,
  insertBankImportSchema: () => insertBankImportSchema,
  insertBankTransactionSchema: () => insertBankTransactionSchema,
  insertBranchSchema: () => insertBranchSchema,
  insertBudgetItemSchema: () => insertBudgetItemSchema,
  insertBudgetPaymentInfoSchema: () => insertBudgetPaymentInfoSchema,
  insertBudgetPhotoSchema: () => insertBudgetPhotoSchema,
  insertBudgetSchema: () => insertBudgetSchema,
  insertClientSchema: () => insertClientSchema,
  insertCommissionPayoutSchema: () => insertCommissionPayoutSchema,
  insertCommissionSchema: () => insertCommissionSchema,
  insertCommissionSettingsSchema: () => insertCommissionSettingsSchema,
  insertCustomizationOptionSchema: () => insertCustomizationOptionSchema,
  insertExpenseNoteSchema: () => insertExpenseNoteSchema,
  insertLogBackupSchema: () => insertLogBackupSchema,
  insertManualPayableSchema: () => insertManualPayableSchema,
  insertManualReceivableSchema: () => insertManualReceivableSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertPartnerSchema: () => insertPartnerSchema,
  insertPaymentAllocationSchema: () => insertPaymentAllocationSchema,
  insertPaymentMethodSchema: () => insertPaymentMethodSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertPricingMarginTierSchema: () => insertPricingMarginTierSchema,
  insertPricingSettingsSchema: () => insertPricingSettingsSchema,
  insertProducerPaymentSchema: () => insertProducerPaymentSchema,
  insertProductSchema: () => insertProductSchema,
  insertProductionOrderItemSchema: () => insertProductionOrderItemSchema,
  insertProductionOrderSchema: () => insertProductionOrderSchema,
  insertQuoteRequestItemSchema: () => insertQuoteRequestItemSchema,
  insertQuoteRequestSchema: () => insertQuoteRequestSchema,
  insertShippingMethodSchema: () => insertShippingMethodSchema,
  insertSystemLogSchema: () => insertSystemLogSchema,
  insertUserSchema: () => insertUserSchema,
  insertVendorSchema: () => insertVendorSchema,
  logBackups: () => logBackups,
  manualPayables: () => manualPayables,
  manualReceivables: () => manualReceivables,
  orders: () => orders,
  partners: () => partners,
  paymentAllocations: () => paymentAllocations,
  paymentMethods: () => paymentMethods,
  payments: () => payments,
  pricingMarginTiers: () => pricingMarginTiers,
  pricingSettings: () => pricingSettings,
  producerPayments: () => producerPayments,
  productionOrderItems: () => productionOrderItems,
  productionOrders: () => productionOrders,
  products: () => products,
  quoteRequestItems: () => quoteRequestItems,
  quoteRequests: () => quoteRequests,
  shippingMethods: () => shippingMethods,
  systemLogs: () => systemLogs,
  users: () => users,
  vendors: () => vendors
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
  // 'admin', 'vendor', 'client', 'producer', 'logistics', 'finance'
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  vendorId: varchar("vendor_id"),
  // For clients: link to their assigned vendor
  isActive: boolean("is_active").default(true),
  isCommissioned: boolean("is_commissioned").default(true),
  // For vendors: if they receive commissions
  // Producer specific fields
  specialty: text("specialty"),
  // For producers: their specialty
  address: text("address"),
  // For producers: their address
  photoUrl: text("photo_url")
  // Profile photo URL
});
var clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  // Nome de contato
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  cpfCnpj: text("cpf_cnpj"),
  address: text("address"),
  // Campo legado - manter para compatibilidade
  vendorId: varchar("vendor_id").references(() => users.id),
  // Vendedor responsável
  // Novos campos comerciais
  nomeFantasia: text("nome_fantasia"),
  // Nome Fantasia
  razaoSocial: text("razao_social"),
  // Nome/Razão Social
  inscricaoEstadual: text("inscricao_estadual"),
  // Inscrição Estadual
  logradouro: text("logradouro"),
  // Logradouro/Rua
  numero: text("numero"),
  // Número
  complemento: text("complemento"),
  // Complemento
  bairro: text("bairro"),
  // Bairro
  cidade: text("cidade"),
  // Cidade
  cep: text("cep"),
  // CEP
  emailBoleto: text("email_boleto"),
  // E-Mail para Envio de Boleto
  emailNF: text("email_nf"),
  // E-Mail para Envio de NF
  nomeContato: text("nome_contato"),
  // Nome do contato
  emailContato: text("email_contato"),
  // Endereço de e-mail do contato
  // Endereço de Faturamento
  enderecoFaturamentoLogradouro: text("endereco_faturamento_logradouro"),
  enderecoFaturamentoNumero: text("endereco_faturamento_numero"),
  enderecoFaturamentoComplemento: text("endereco_faturamento_complemento"),
  enderecoFaturamentoBairro: text("endereco_faturamento_bairro"),
  enderecoFaturamentoCidade: text("endereco_faturamento_cidade"),
  enderecoFaturamentoCep: text("endereco_faturamento_cep"),
  // Endereço de Entrega
  enderecoEntregaLogradouro: text("endereco_entrega_logradouro"),
  enderecoEntregaNumero: text("endereco_entrega_numero"),
  enderecoEntregaComplemento: text("endereco_entrega_complemento"),
  enderecoEntregaBairro: text("endereco_entrega_bairro"),
  enderecoEntregaCidade: text("endereco_entrega_cidade"),
  enderecoEntregaCep: text("endereco_entrega_cep"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  clientId: varchar("client_id").references(() => clients.id),
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id),
  // Filial do pedido (escolhida no momento do pedido)
  budgetId: varchar("budget_id").references(() => budgets.id),
  product: text("product").notNull(),
  description: text("description"),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  paidValue: decimal("paid_value", { precision: 10, scale: 2 }).default("0"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).default("0"),
  // Valor a ser restituído em caso de cancelamento
  status: text("status").notNull().default("pending"),
  // 'pending', 'confirmed', 'production', 'shipped', 'partial_shipped', 'delivered', 'cancelled'
  productStatus: text("product_status").default("to_buy"),
  // 'to_buy', 'purchased', 'in_store' - Status do produto para dropshipping
  deadline: timestamp("deadline"),
  // Contact information fields
  contactName: text("contact_name").notNull(),
  // Nome de contato obrigatório
  contactPhone: text("contact_phone"),
  // Telefone de contato opcional
  contactEmail: text("contact_email"),
  // Email de contato opcional
  // Delivery information
  deliveryType: text("delivery_type").default("delivery"),
  // 'delivery' or 'pickup'
  deliveryDeadline: timestamp("delivery_deadline"),
  // Payment information
  paymentMethodId: varchar("payment_method_id").references(() => paymentMethods.id),
  shippingMethodId: varchar("shipping_method_id").references(() => shippingMethods.id),
  installments: integer("installments").default(1),
  downPayment: decimal("down_payment", { precision: 10, scale: 2 }).default("0.00"),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).default("0.00"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0.00"),
  // Discount information
  hasDiscount: boolean("has_discount").default(false),
  discountType: text("discount_type").default("percentage"),
  // 'percentage' or 'value'
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0.00"),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).default("0.00"),
  // Tracking
  trackingCode: text("tracking_code"),
  // Additional notes
  refundNotes: text("refund_notes"),
  // Observações sobre reembolso
  refundedAt: timestamp("refunded_at"),
  // Data em que o estorno foi processado
  cancellationReason: text("cancellation_reason"),
  // Motivo do cancelamento
  cancelledBy: varchar("cancelled_by").references(() => users.id),
  // ID do usuário que cancelou
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var productionOrders = pgTable("production_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  producerId: varchar("producer_id").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"),
  // 'pending', 'accepted', 'production', 'quality_check', 'ready', 'preparing_shipment', 'shipped', 'delivered', 'completed', 'rejected'
  deadline: timestamp("deadline"),
  acceptedAt: timestamp("accepted_at"),
  shippedAt: timestamp("shipped_at"),
  // Data de despacho
  deliveredAt: timestamp("delivered_at"),
  // Data de entrega confirmada
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  deliveryDeadline: timestamp("delivery_deadline"),
  hasUnreadNotes: boolean("has_unread_notes").default(false),
  lastNoteAt: timestamp("last_note_at"),
  trackingCode: text("tracking_code"),
  // Código de rastreamento
  shippingAddress: text("shipping_address"),
  // Endereço de envio
  // Campos financeiros para pagamento do produtor
  producerValue: decimal("producer_value", { precision: 10, scale: 2 }),
  // Valor que o produtor cobrará
  producerValueLocked: boolean("producer_value_locked").default(false),
  // Se true, valor não pode ser alterado
  producerPaymentStatus: text("producer_payment_status").default("pending"),
  // 'pending', 'approved', 'paid'
  producerNotes: text("producer_notes")
  // Observações do produtor sobre o valor
});
var productionOrderItems = pgTable("production_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productionOrderId: varchar("production_order_id").references(() => productionOrders.id).notNull(),
  budgetItemId: varchar("budget_item_id").references(() => budgetItems.id),
  productId: varchar("product_id").references(() => products.id).notNull(),
  productName: text("product_name").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  // Personalização do item
  hasItemCustomization: boolean("has_item_customization").default(false),
  itemCustomizationValue: decimal("item_customization_value", { precision: 10, scale: 2 }).default("0.00"),
  itemCustomizationDescription: text("item_customization_description"),
  customizationPhoto: text("customization_photo"),
  // Dimensões do produto (em cm)
  productWidth: decimal("product_width", { precision: 8, scale: 2 }),
  productHeight: decimal("product_height", { precision: 8, scale: 2 }),
  productDepth: decimal("product_depth", { precision: 8, scale: 2 }),
  // Personalização geral
  hasGeneralCustomization: boolean("has_general_customization").default(false),
  generalCustomizationName: text("general_customization_name"),
  generalCustomizationValue: decimal("general_customization_value", { precision: 10, scale: 2 }).default("0.00"),
  // Desconto do item
  hasItemDiscount: boolean("has_item_discount").default(false),
  itemDiscountType: text("item_discount_type").default("percentage"),
  itemDiscountPercentage: decimal("item_discount_percentage", { precision: 5, scale: 2 }).default("0.00"),
  itemDiscountValue: decimal("item_discount_value", { precision: 10, scale: 2 }).default("0.00")
});
var payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull(),
  // 'pix', 'credit_card', 'bank_transfer'
  status: text("status").notNull().default("pending"),
  // 'pending', 'confirmed', 'failed'
  transactionId: text("transaction_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  // Reconciliation fields
  reconciliationStatus: text("reconciliation_status").notNull().default("pending"),
  // 'pending', 'manual', 'ofx'
  bankTransactionId: varchar("bank_transaction_id")
  // FK to bankTransactions when reconciled via OFX
});
var commissions = pgTable("commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").references(() => users.id),
  partnerId: varchar("partner_id").references(() => users.id),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  type: text("type").notNull(),
  // 'vendor' or 'partner'
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  // 'pending', 'confirmed', 'paid', 'deducted', 'cancelled'
  paidAt: timestamp("paid_at"),
  deductedAt: timestamp("deducted_at"),
  orderValue: decimal("order_value", { precision: 10, scale: 2 }),
  orderNumber: text("order_number"),
  createdAt: timestamp("created_at").defaultNow()
});
var partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("15.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var commissionSettings = pgTable("commission_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorCommissionRate: decimal("vendor_commission_rate", { precision: 5, scale: 2 }).default("10.00"),
  partnerCommissionRate: decimal("partner_commission_rate", { precision: 5, scale: 2 }).default("15.00"),
  vendorPaymentTiming: text("vendor_payment_timing").default("order_completion"),
  // 'order_completion'
  partnerPaymentTiming: text("partner_payment_timing").default("order_start"),
  // 'order_start'
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow()
});
var branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  city: text("city").notNull(),
  cnpj: text("cnpj"),
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  // Campos de endereço detalhado
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cep: text("cep"),
  estado: text("estado"),
  telefone: text("telefone"),
  isHeadquarters: boolean("is_headquarters").default(false),
  // Para identificar a matriz
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id),
  salesLink: text("sales_link").unique(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("10.00"),
  isActive: boolean("is_active").default(true)
});
var products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).default("0.00"),
  // Custo do produto para cálculo de margem
  unit: text("unit").default("un"),
  isActive: boolean("is_active").default(true),
  // Produtor responsável - 'internal' para produtos internos ou ID do produtor específico
  producerId: varchar("producer_id").references(() => users.id).default("internal"),
  type: text("type").default("internal"),
  // 'internal' ou 'external'
  // Campos adicionais do JSON XBZ
  externalId: text("external_id"),
  // IdProduto
  externalCode: text("external_code"),
  // CodigoXbz
  compositeCode: text("composite_code"),
  // CodigoAmigavel
  friendlyCode: text("friendly_code"),
  // CodigoAmigavel
  siteLink: text("site_link"),
  // SiteLink
  imageLink: text("image_link"),
  // ImageLink
  mainColor: text("main_color"),
  // CorWebPrincipal
  secondaryColor: text("secondary_color"),
  // CorWebSecundaria
  weight: decimal("weight", { precision: 8, scale: 2 }),
  // Peso
  height: decimal("height", { precision: 8, scale: 2 }),
  // Altura
  width: decimal("width", { precision: 8, scale: 2 }),
  // Largura
  depth: decimal("depth", { precision: 8, scale: 2 }),
  // Profundidade
  availableQuantity: integer("available_quantity"),
  // QuantidadeDisponivel
  stockStatus: text("stock_status"),
  // StatusConfiabilidade
  ncm: text("ncm"),
  // Ncm
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetNumber: text("budget_number").notNull().unique(),
  clientId: varchar("client_id").references(() => clients.id),
  // Opcional - só obrigatório na conversão para pedido
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id),
  // Filial do orçamento
  contactName: text("contact_name").notNull(),
  // Nome de contato obrigatório
  contactPhone: text("contact_phone"),
  // Telefone de contato opcional
  contactEmail: text("contact_email"),
  // Email de contato opcional
  title: text("title").notNull(),
  description: text("description"),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  // 'draft', 'sent', 'approved', 'rejected', 'converted'
  orderStatus: text("order_status").default("pending"),
  // 'pending', 'confirmed', 'production', 'ready', 'shipped', 'delivered' - status do pedido após conversão
  paidValue: decimal("paid_value", { precision: 10, scale: 2 }).default("0.00"),
  // Valor já pago
  validUntil: timestamp("valid_until"),
  deliveryDeadline: timestamp("delivery_deadline"),
  // Campo para tipo de entrega
  deliveryType: text("delivery_type").default("delivery"),
  // 'delivery' or 'pickup'
  // Campos para personalização
  hasCustomization: boolean("has_customization").default(false),
  customizationPercentage: decimal("customization_percentage", { precision: 5, scale: 2 }).default("0.00"),
  customizationValue: decimal("customization_value", { precision: 10, scale: 2 }).default("0.00"),
  customizationDescription: text("customization_description"),
  // Campos para desconto
  hasDiscount: boolean("has_discount").default(false),
  discountType: text("discount_type").default("percentage"),
  // 'percentage' or 'value'
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0.00"),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).default("0.00"),
  // Campos de pagamento e entrega
  paymentMethodId: varchar("payment_method_id").references(() => paymentMethods.id),
  shippingMethodId: varchar("shipping_method_id").references(() => shippingMethods.id),
  installments: integer("installments").default(1),
  downPayment: decimal("down_payment", { precision: 10, scale: 2 }).default("0.00"),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).default("0.00"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0.00"),
  adminRejectionReason: text("admin_rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var budgetItems = pgTable("budget_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id").references(() => budgets.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  producerId: varchar("producer_id").references(() => users.id),
  // Produtor responsável por este item
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  // Campos para personalização do item
  hasItemCustomization: boolean("has_item_customization").default(false),
  selectedCustomizationId: varchar("selected_customization_id").references(() => customizationOptions.id),
  itemCustomizationValue: decimal("item_customization_value", { precision: 10, scale: 2 }).default("0.00"),
  itemCustomizationDescription: text("item_customization_description"),
  additionalCustomizationNotes: text("additional_customization_notes"),
  customizationPhoto: text("customization_photo"),
  // Campos para personalização geral
  hasGeneralCustomization: boolean("has_general_customization").default(false),
  generalCustomizationName: text("general_customization_name"),
  // Nome da personalização
  generalCustomizationValue: decimal("general_customization_value", { precision: 10, scale: 2 }).default("0.00"),
  // Valor por unidade
  // Campos para desconto do item
  hasItemDiscount: boolean("has_item_discount").default(false),
  itemDiscountType: text("item_discount_type").default("percentage"),
  // 'percentage' or 'value'
  itemDiscountPercentage: decimal("item_discount_percentage", { precision: 5, scale: 2 }).default("0.00"),
  itemDiscountValue: decimal("item_discount_value", { precision: 10, scale: 2 }).default("0.00"),
  // Campos para tamanho do produto (em cm)
  productWidth: decimal("product_width", { precision: 8, scale: 2 }),
  // Largura em cm
  productHeight: decimal("product_height", { precision: 8, scale: 2 }),
  // Altura em cm
  productDepth: decimal("product_depth", { precision: 8, scale: 2 }),
  // Profundidade em cm
  // Status de compra do produto (para controle de logística)
  purchaseStatus: text("purchase_status").default("pending")
  // 'pending', 'to_buy', 'purchased', 'in_store'
});
var budgetPhotos = pgTable("budget_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id").references(() => budgets.id).notNull(),
  photoUrl: text("photo_url").notNull(),
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").defaultNow()
});
var paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  // 'pix', 'credit_card', 'boleto', 'transfer'
  maxInstallments: integer("max_installments").default(1),
  installmentInterest: decimal("installment_interest", { precision: 5, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var shippingMethods = pgTable("shipping_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  // 'fixed', 'calculated', 'free'
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).default("0.00"),
  freeShippingThreshold: decimal("free_shipping_threshold", { precision: 10, scale: 2 }).default("0.00"),
  estimatedDays: integer("estimated_days").default(5),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var budgetPaymentInfo = pgTable("budget_payment_info", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id").references(() => budgets.id).notNull(),
  paymentMethodId: varchar("payment_method_id").references(() => paymentMethods.id),
  shippingMethodId: varchar("shipping_method_id").references(() => shippingMethods.id),
  installments: integer("installments").default(1),
  downPayment: decimal("down_payment", { precision: 10, scale: 2 }).default("0.00"),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).default("0.00"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0.00"),
  // Credit card interest
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).default("0.00"),
  // Taxa de juros % aplicada
  interestValue: decimal("interest_value", { precision: 10, scale: 2 }).default("0.00"),
  // Valor total de juros em R$
  createdAt: timestamp("created_at").defaultNow()
});
var accountsReceivable = pgTable("accounts_receivable", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),
  dueDate: timestamp("due_date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  receivedAmount: decimal("received_amount", { precision: 10, scale: 2 }).default("0.00"),
  minimumPayment: decimal("minimum_payment", { precision: 10, scale: 2 }).default("0.00"),
  // Entrada + frete mínimo obrigatório
  status: text("status").notNull().default("open"),
  // 'pending', 'open', 'partial', 'paid', 'overdue', 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var paymentAllocations = pgTable("payment_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").references(() => payments.id).notNull(),
  receivableId: varchar("receivable_id").references(() => accountsReceivable.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  allocatedAt: timestamp("allocated_at").defaultNow()
});
var bankImports = pgTable("bank_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  status: text("status").notNull().default("parsed"),
  // 'parsed', 'reconciled', 'error'
  summary: text("summary"),
  // JSON string with import summary
  errorMessage: text("error_message"),
  fileSize: integer("file_size"),
  transactionCount: integer("transaction_count").default(0)
});
var bankTransactions = pgTable("bank_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  importId: varchar("import_id").references(() => bankImports.id).notNull(),
  fitId: text("fit_id"),
  // Financial Institution Transaction ID
  date: timestamp("date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("debit"),
  // 'credit', 'debit'
  bankRef: text("bank_ref"),
  // Reference from bank
  status: text("status").notNull().default("unmatched"),
  // 'unmatched', 'matched'
  matchedReceivableId: varchar("matched_receivable_id").references(() => accountsReceivable.id),
  matchedPaymentId: varchar("matched_payment_id").references(() => payments.id),
  matchedOrderId: text("matched_order_id"),
  // For producer payments reconciliation
  matchedAt: timestamp("matched_at"),
  // When the transaction was matched
  notes: text("notes"),
  // Additional notes about the transaction
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Enhanced reconciliation fields
  sourceAccountId: varchar("source_account_id"),
  // Account/bank identifier for grouping
  rawFitId: text("raw_fit_id"),
  // Original FITID from OFX for deduplication
  matchedEntityType: text("matched_entity_type"),
  // 'payment', 'producer_payment', 'receivable', null
  matchedEntityId: varchar("matched_entity_id"),
  // Generic FK to matched entity
  memo: text("memo"),
  // Additional memo field from OFX
  hasValidDate: boolean("has_valid_date").default(true)
  // Whether the transaction date is valid
});
var manualReceivables = pgTable("manual_receivables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientName: text("client_name").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  receivedAmount: decimal("received_amount", { precision: 10, scale: 2 }).default("0.00"),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  // 'pending', 'partial', 'paid', 'overdue', 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var manualPayables = pgTable("manual_payables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  beneficiary: text("beneficiary").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  category: text("category").notNull().default("Outros"),
  status: text("status").notNull().default("pending"),
  // 'pending', 'paid', 'cancelled', 'refunded' (for estornos)
  paidBy: varchar("paid_by").references(() => users.id),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"),
  paymentNotes: text("payment_notes"),
  transactionId: text("transaction_id"),
  notes: text("notes"),
  attachmentUrl: text("attachment_url"),
  attachmentUrl2: text("attachment_url_2"),
  branchId: varchar("branch_id").references(() => branches.id),
  orderId: varchar("order_id"),
  clientId: varchar("client_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var expenseNotes = pgTable("expense_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  category: text("category").notNull(),
  // 'operational', 'marketing', 'travel', 'equipment', 'other'
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  vendorId: varchar("vendor_id").references(() => users.id),
  // Optional - expense related to vendor
  orderId: varchar("order_id").references(() => orders.id),
  // Optional - expense related to order
  attachmentUrl: text("attachment_url"),
  // Receipt/invoice attachment
  status: text("status").notNull().default("recorded"),
  // 'recorded', 'approved', 'reimbursed'
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  reimbursedBy: varchar("reimbursed_by").references(() => users.id),
  reimbursedAt: timestamp("reimbursed_at"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var commissionPayouts = pgTable("commission_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  // 'vendor', 'partner'
  userId: varchar("user_id").references(() => users.id).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  // 'pending', 'paid'
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var customizationOptions = pgTable("customization_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  // Ex: "Serigrafia 1 cor"
  description: text("description"),
  // Descrição adicional
  category: text("category").notNull(),
  // Categoria do produto compatível
  minQuantity: integer("min_quantity").notNull(),
  // Quantidade mínima
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  // Valor da personalização
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var producerPayments = pgTable("producer_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productionOrderId: varchar("production_order_id").references(() => productionOrders.id).notNull(),
  producerId: varchar("producer_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  // 'pending', 'approved', 'paid', 'rejected'
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidBy: varchar("paid_by").references(() => users.id),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"),
  // 'pix', 'transfer', 'check', 'cash', 'manual'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Reconciliation fields
  reconciliationStatus: text("reconciliation_status").notNull().default("pending"),
  // 'pending', 'manual', 'ofx'
  bankTransactionId: varchar("bank_transaction_id")
  // FK to bankTransactions when reconciled via OFX
});
var quoteRequests = pgTable("quote_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => users.id).notNull(),
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),
  contactName: text("contact_name").notNull(),
  whatsapp: text("whatsapp"),
  email: text("email"),
  observations: text("observations"),
  // Observações gerais do orçamento
  totalEstimatedValue: decimal("total_estimated_value", { precision: 10, scale: 2 }).default("0.00"),
  status: text("status").notNull().default("pending"),
  // 'pending', 'reviewing', 'quoted', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var quoteRequestItems = pgTable("quote_request_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteRequestId: varchar("quote_request_id").references(() => quoteRequests.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  category: text("category"),
  imageLink: text("image_link"),
  observations: text("observations"),
  // Observações específicas do produto
  createdAt: timestamp("created_at").defaultNow()
});
var systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  // Nullable para permitir logs de sistema
  userName: text("user_name").notNull(),
  // Nome do usuário para facilitar consultas
  userRole: text("user_role").notNull(),
  // Role do usuário
  vendorId: varchar("vendor_id").references(() => users.id),
  // Vendedor associado (para filtrar logs de clientes)
  action: text("action").notNull(),
  // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  entity: text("entity"),
  // orders, users, products, etc.
  entityId: varchar("entity_id"),
  // ID da entidade afetada
  description: text("description").notNull(),
  // Descrição da ação
  details: text("details"),
  // Detalhes adicionais em JSON
  level: text("level").notNull().default("info"),
  // info, warning, error, success
  ipAddress: text("ip_address"),
  // IP do usuário
  userAgent: text("user_agent"),
  // User Agent do navegador
  createdAt: timestamp("created_at").defaultNow()
});
var logBackups = pgTable("log_backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  backupDate: timestamp("backup_date").notNull(),
  logCount: integer("log_count").notNull(),
  excelData: text("excel_data").notNull(),
  // JSON string with Excel data
  status: text("status").notNull().default("pending"),
  // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id).default("system")
});
var pricingSettings = pgTable("pricing_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().default("Configura\xE7\xE3o Padr\xE3o"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("9.00"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("15.00"),
  minimumMargin: decimal("minimum_margin", { precision: 5, scale: 2 }).notNull().default("20.00"),
  cashDiscount: decimal("cash_discount", { precision: 5, scale: 2 }).notNull().default("5.00"),
  cashNoTaxDiscount: decimal("cash_no_tax_discount", { precision: 5, scale: 2 }).notNull().default("12.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var pricingMarginTiers = pgTable("pricing_margin_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingsId: varchar("settings_id").references(() => pricingSettings.id).notNull(),
  minQuantity: integer("min_quantity").notNull().default(0),
  maxQuantity: integer("max_quantity"),
  minRevenue: decimal("min_revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  maxRevenue: decimal("max_revenue", { precision: 12, scale: 2 }),
  marginRate: decimal("margin_rate", { precision: 5, scale: 2 }).notNull(),
  minimumMarginRate: decimal("minimum_margin_rate", { precision: 5, scale: 2 }).notNull().default("20.00"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({ id: true });
var insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
var insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
var insertProductionOrderSchema = createInsertSchema(productionOrders).omit({ id: true });
var insertProductionOrderItemSchema = createInsertSchema(productionOrderItems).omit({ id: true });
var insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
var insertCommissionSchema = createInsertSchema(commissions).omit({ id: true, createdAt: true });
var insertPartnerSchema = createInsertSchema(partners).omit({ id: true, createdAt: true, updatedAt: true });
var insertCommissionSettingsSchema = createInsertSchema(commissionSettings).omit({ id: true, updatedAt: true });
var insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
var insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
var insertBudgetSchema = createInsertSchema(budgets).omit({ id: true, createdAt: true, updatedAt: true });
var insertBudgetItemSchema = createInsertSchema(budgetItems).omit({ id: true });
var insertBudgetPhotoSchema = createInsertSchema(budgetPhotos).omit({ id: true, uploadedAt: true });
var insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
var insertShippingMethodSchema = createInsertSchema(shippingMethods).omit({ id: true, createdAt: true, updatedAt: true });
var insertBudgetPaymentInfoSchema = createInsertSchema(budgetPaymentInfo).omit({ id: true, createdAt: true });
var insertAccountsReceivableSchema = createInsertSchema(accountsReceivable).omit({ id: true, createdAt: true, updatedAt: true });
var insertPaymentAllocationSchema = createInsertSchema(paymentAllocations).omit({ id: true, allocatedAt: true });
var insertBankImportSchema = createInsertSchema(bankImports).omit({ id: true, uploadedAt: true });
var insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({ id: true, createdAt: true });
var insertExpenseNoteSchema = createInsertSchema(expenseNotes).omit({ id: true, createdAt: true });
var insertCommissionPayoutSchema = createInsertSchema(commissionPayouts).omit({ id: true, createdAt: true });
var insertManualReceivableSchema = createInsertSchema(manualReceivables).omit({ id: true, createdAt: true, updatedAt: true });
var insertManualPayableSchema = createInsertSchema(manualPayables).omit({ id: true, createdAt: true, updatedAt: true });
var insertCustomizationOptionSchema = createInsertSchema(customizationOptions).omit({ id: true, createdAt: true, updatedAt: true });
var insertProducerPaymentSchema = createInsertSchema(producerPayments).omit({ id: true, createdAt: true, updatedAt: true });
var insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({ id: true, createdAt: true, updatedAt: true });
var insertQuoteRequestItemSchema = createInsertSchema(quoteRequestItems).omit({ id: true, createdAt: true });
var insertBranchSchema = createInsertSchema(branches).omit({ id: true, createdAt: true, updatedAt: true });
var insertSystemLogSchema = createInsertSchema(systemLogs).omit({ id: true, createdAt: true });
var insertLogBackupSchema = createInsertSchema(logBackups).omit({ id: true, createdAt: true });
var insertPricingSettingsSchema = createInsertSchema(pricingSettings).omit({ id: true, createdAt: true, updatedAt: true });
var insertPricingMarginTierSchema = createInsertSchema(pricingMarginTiers).omit({ id: true, createdAt: true });

// server/pgClient.ts
import "dotenv/config";
var { Pool } = pkg;
var DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    "\u274C DATABASE_URL n\xE3o encontrado nas vari\xE1veis de ambiente.\nConfigure DATABASE_URL no arquivo .env antes de usar o PostgreSQL.\nExemplo: DATABASE_URL=postgresql://user:password@host/database"
  );
}
var sslConfig = DATABASE_URL.includes("supabase") || DATABASE_URL.includes("aws") ? { rejectUnauthorized: false } : false;
console.log(`\u{1F527} Configura\xE7\xE3o SSL do pool: ${sslConfig ? "HABILITADA" : "DESABILITADA"}`);
if (sslConfig) {
  console.log(`\u{1F527} SSL rejectUnauthorized: ${sslConfig.rejectUnauthorized}`);
}
var pool = new Pool({
  connectionString: DATABASE_URL,
  // Pool size configuration
  max: 10,
  // Maximum number of clients in the pool
  // Idle timeout: Close idle connections after 3 minutes
  idleTimeoutMillis: 18e4,
  // Connection timeout: How long to wait for a connection from the pool
  connectionTimeoutMillis: 1e4,
  // Maximum lifetime of a connection: Force recreation after 10 minutes
  // This prevents using stale connections
  maxUses: 7500,
  // ~10 minutes worth of queries at typical rates
  // SSL configuration for Supabase/cloud databases
  ssl: sslConfig
});
pool.on("connect", async (client2) => {
  console.log("\u2705 Nova conex\xE3o estabelecida no Pool PostgreSQL");
  try {
    await client2.query("SET statement_timeout = 30000");
  } catch (err) {
    console.error("\u26A0\uFE0F Erro ao configurar statement_timeout:", err);
  }
});
pool.on("error", (err, client2) => {
  console.error("\u274C Erro inesperado no Pool PostgreSQL:", err.message);
});
pool.on("remove", () => {
  console.log("\u{1F504} Conex\xE3o removida do Pool (idle timeout ou erro)");
});
var pg = drizzle(pool, { schema: schema_exports });
process.on("SIGTERM", async () => {
  console.log("\u{1F4F4} SIGTERM recebido, fechando Pool...");
  await pool.end();
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log("\u{1F4F4} SIGINT recebido, fechando Pool...");
  await pool.end();
  process.exit(0);
});
console.log("\u{1F50C} Pool de conex\xF5es PostgreSQL/Supabase inicializado com sucesso");

// server/storage.pg.ts
import { eq, desc, and, or, like, sql as sql2, lte, inArray } from "drizzle-orm";

// server/money.ts
import Decimal from "decimal.js";
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
function toDecimal(value) {
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value || 0);
}
function toMoneyString(value) {
  const decimal2 = toDecimal(value);
  return decimal2.toFixed(2);
}
function addMoney(a, b) {
  const sum = toDecimal(a).plus(toDecimal(b));
  return toMoneyString(sum);
}
function compareMoney(a, b) {
  return toDecimal(a).comparedTo(toDecimal(b));
}

// server/storage.pg.ts
var PgStorage = class {
  // ==================== USERS ====================
  async getUsers() {
    return await pg.select().from(users);
  }
  async getAllUsers() {
    return await pg.select().from(users);
  }
  async getUser(id) {
    const results = await pg.select().from(users).where(eq(users.id, id));
    return results[0];
  }
  async getUserByUsername(username) {
    const results = await pg.select().from(users).where(eq(users.username, username));
    return results[0];
  }
  async getUserByEmail(email) {
    const results = await pg.select().from(users).where(eq(users.email, email));
    return results[0];
  }
  async createUser(insertUser) {
    const results = await pg.insert(users).values(insertUser).returning();
    return results[0];
  }
  async updateUser(id, updates) {
    const results = await pg.update(users).set(updates).where(eq(users.id, id)).returning();
    return results[0];
  }
  async getUsersByRole(role) {
    return await pg.select().from(users).where(eq(users.role, role));
  }
  async authenticateUser(username, password) {
    const user = await this.getUserByUsername(username);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }
  // ==================== VENDORS ====================
  async getVendors() {
    return await pg.select().from(users).where(eq(users.role, "vendor"));
  }
  async getVendor(userId) {
    const results = await pg.select().from(vendors).where(eq(vendors.userId, userId));
    return results[0];
  }
  async createVendor(vendorData) {
    const newUser = await this.createUser({
      username: vendorData.username,
      password: vendorData.password || "123456",
      role: "vendor",
      name: vendorData.name,
      email: vendorData.email || null,
      phone: vendorData.phone || null,
      address: vendorData.address || null,
      specialty: vendorData.specialty || null,
      vendorId: null,
      isActive: true,
      isCommissioned: vendorData.isCommissioned !== false,
      photoUrl: vendorData.photoUrl || null
    });
    await pg.insert(vendors).values({
      userId: newUser.id,
      branchId: vendorData.branchId || null,
      salesLink: vendorData.salesLink || null,
      commissionRate: vendorData.commissionRate || "10.00",
      isActive: true
    });
    return newUser;
  }
  async updateVendorCommission(userId, commissionRate) {
    await pg.update(vendors).set({ commissionRate }).where(eq(vendors.userId, userId));
  }
  async updateVendor(userId, updates) {
    await pg.update(vendors).set(updates).where(eq(vendors.userId, userId));
  }
  // ==================== CLIENTS ====================
  async getClients() {
    return await pg.select().from(clients).where(eq(clients.isActive, true)).orderBy(desc(clients.createdAt));
  }
  async getClient(id) {
    const results = await pg.select().from(clients).where(eq(clients.id, id));
    return results[0];
  }
  async createClient(clientData) {
    const results = await pg.insert(clients).values(clientData).returning();
    return results[0];
  }
  async createClientWithUser(userData, clientData) {
    const userResults = await pg.insert(users).values({
      username: userData.username,
      password: userData.password,
      role: "client",
      name: userData.name,
      email: userData.email || null,
      phone: userData.phone || null,
      isActive: true
    }).returning();
    const user = userResults[0];
    const clientResults = await pg.insert(clients).values({
      ...clientData,
      userId: user.id,
      name: userData.name,
      email: userData.email || clientData.email || null,
      phone: userData.phone || clientData.phone || null
    }).returning();
    const client2 = clientResults[0];
    return { user, client: client2 };
  }
  async updateClient(id, clientData) {
    const results = await pg.update(clients).set({ ...clientData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(clients.id, id)).returning();
    return results[0];
  }
  async deleteClient(id) {
    const client2 = await this.getClient(id);
    if (client2 && client2.userId) {
      await pg.update(users).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, client2.userId));
    }
    await pg.update(clients).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(clients.id, id));
    return true;
  }
  async getClientByUserId(userId) {
    const results = await pg.select().from(clients).where(and(eq(clients.userId, userId), eq(clients.isActive, true)));
    return results[0];
  }
  async getClientsByVendor(vendorId) {
    const clients2 = await pg.select().from(clients).where(and(eq(clients.vendorId, vendorId), eq(clients.isActive, true)));
    const activeClients = await Promise.all(
      clients2.map(async (client2) => {
        if (client2.userId) {
          const user = await this.getUser(client2.userId);
          return user && user.isActive !== false ? client2 : null;
        }
        return client2;
      })
    );
    return activeClients.filter((client2) => client2 !== null);
  }
  // ==================== ORDERS ====================
  async getOrders() {
    const orders2 = await pg.select().from(orders).orderBy(desc(orders.createdAt));
    const enrichedOrders = await Promise.all(orders2.map(async (order) => {
      if (order.budgetId) {
        const items = await this.getBudgetItems(order.budgetId);
        return { ...order, items };
      }
      return { ...order, items: [] };
    }));
    const convertedBudgets = await pg.select().from(budgets).where(eq(budgets.status, "converted")).orderBy(desc(budgets.createdAt));
    const budgetOrders = await Promise.all(convertedBudgets.map(async (budget) => {
      const items = await this.getBudgetItems(budget.id);
      return {
        id: budget.id,
        orderNumber: budget.budgetNumber.replace("ORC-", "PED-"),
        // Convert budget number to order format
        clientId: budget.clientId,
        vendorId: budget.vendorId,
        branchId: budget.branchId,
        budgetId: budget.id,
        product: budget.title,
        description: budget.description,
        totalValue: budget.totalValue,
        paidValue: budget.paidValue || "0",
        refundAmount: "0",
        status: budget.orderStatus || "confirmed",
        // Use orderStatus from budget
        productStatus: "to_buy",
        deadline: budget.deliveryDeadline,
        contactName: budget.contactName,
        contactPhone: budget.contactPhone,
        contactEmail: budget.contactEmail,
        deliveryType: budget.deliveryType,
        deliveryDeadline: budget.deliveryDeadline,
        paymentMethodId: budget.paymentMethodId,
        shippingMethodId: budget.shippingMethodId,
        installments: budget.installments,
        downPayment: budget.downPayment,
        remainingAmount: budget.remainingAmount,
        shippingCost: budget.shippingCost,
        hasDiscount: budget.hasDiscount,
        discountType: budget.discountType,
        discountPercentage: budget.discountPercentage,
        discountValue: budget.discountValue,
        hasCustomization: budget.hasCustomization,
        customizationPercentage: budget.customizationPercentage,
        customizationValue: budget.customizationValue,
        customizationDescription: budget.customizationDescription,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
        items
      };
    }));
    const allOrders = [...enrichedOrders, ...budgetOrders];
    const uniqueOrders = allOrders.filter(
      (order, index, self) => index === self.findIndex((o) => o.id === order.id)
    );
    return uniqueOrders.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }
  async getOrder(id) {
    const results = await pg.select().from(orders).where(eq(orders.id, id));
    const order = results[0];
    if (order) {
      if (order.budgetId) {
        const items = await this.getBudgetItems(order.budgetId);
        return { ...order, items };
      }
      return { ...order, items: [] };
    }
    const budgetResults = await pg.select().from(budgets).where(eq(budgets.id, id));
    const budget = budgetResults[0];
    if (budget && budget.status === "converted") {
      const items = await this.getBudgetItems(budget.id);
      return {
        id: budget.id,
        orderNumber: budget.budgetNumber.replace("ORC-", "PED-").replace("BUD-", "PED-"),
        clientId: budget.clientId,
        vendorId: budget.vendorId,
        branchId: budget.branchId,
        budgetId: budget.id,
        product: budget.title,
        description: budget.description,
        totalValue: budget.totalValue,
        paidValue: budget.paidValue || "0",
        refundAmount: "0",
        status: budget.orderStatus || "confirmed",
        // Use orderStatus from budget
        productStatus: "to_buy",
        deadline: budget.deliveryDeadline,
        contactName: budget.contactName,
        contactPhone: budget.contactPhone,
        contactEmail: budget.contactEmail,
        deliveryType: budget.deliveryType,
        deliveryDeadline: budget.deliveryDeadline,
        paymentMethodId: budget.paymentMethodId,
        shippingMethodId: budget.shippingMethodId,
        installments: budget.installments,
        downPayment: budget.downPayment,
        remainingAmount: budget.remainingAmount,
        shippingCost: budget.shippingCost,
        hasDiscount: budget.hasDiscount,
        discountType: budget.discountType,
        discountPercentage: budget.discountPercentage,
        discountValue: budget.discountValue,
        hasCustomization: budget.hasCustomization,
        customizationPercentage: budget.customizationPercentage,
        customizationValue: budget.customizationValue,
        customizationDescription: budget.customizationDescription,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
        items
      };
    }
    return void 0;
  }
  async createOrder(orderData) {
    async function getNextOrderNumber() {
      try {
        const res = await pg.execute(sql2`SELECT nextval('order_number_seq') AS next`);
        const next = (Array.isArray(res) ? res[0]?.next : res.rows?.[0]?.next) ?? 1;
        const now = /* @__PURE__ */ new Date();
        const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
        return `PED-${yymm}-${String(next).padStart(6, "0")}`;
      } catch (e) {
        await pg.execute(sql2`CREATE SEQUENCE IF NOT EXISTS order_number_seq`);
        const res = await pg.execute(sql2`SELECT nextval('order_number_seq') AS next`);
        const next = (Array.isArray(res) ? res[0]?.next : res.rows?.[0]?.next) ?? 1;
        const now = /* @__PURE__ */ new Date();
        const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
        return `PED-${yymm}-${String(next).padStart(6, "0")}`;
      }
    }
    const processedData = { ...orderData };
    if (!processedData.orderNumber || processedData.orderNumber === null) {
      processedData.orderNumber = await getNextOrderNumber();
    }
    let virtualBudgetId = null;
    const orderItems = processedData.items;
    if (orderItems && orderItems.length > 0 && !processedData.budgetId) {
      console.log(`Creating virtual budget for direct order with ${orderItems.length} items`);
      const budgetNumber = `ORC-AUTO-${Date.now()}`;
      const budgetResults = await pg.insert(budgets).values({
        budgetNumber,
        clientId: processedData.clientId,
        vendorId: processedData.vendorId,
        title: processedData.product || "Pedido Direto",
        description: processedData.description || "",
        subtotal: processedData.totalValue || "0.00",
        totalValue: processedData.totalValue || "0.00",
        status: "converted",
        // Mark as converted since it's already an order
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3),
        // 30 days from now
        contactName: processedData.contactName || "",
        contactPhone: processedData.contactPhone || "",
        contactEmail: processedData.contactEmail || "",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      const virtualBudget = budgetResults[0];
      virtualBudgetId = virtualBudget.id;
      for (const item of orderItems) {
        const producerId = item.producerId && item.producerId !== "internal" && item.producerId !== "" ? item.producerId : null;
        await pg.insert(budgetItems).values({
          budgetId: virtualBudgetId,
          productId: item.productId,
          producerId,
          quantity: item.quantity?.toString() || "1",
          unitPrice: item.unitPrice?.toString() || "0.00",
          totalPrice: item.totalPrice?.toString() || "0.00",
          notes: item.notes || null,
          hasItemCustomization: item.hasItemCustomization || false,
          selectedCustomizationId: item.selectedCustomizationId || null,
          itemCustomizationValue: item.itemCustomizationValue?.toString() || "0.00",
          itemCustomizationDescription: item.itemCustomizationDescription || null,
          additionalCustomizationNotes: item.additionalCustomizationNotes || null,
          customizationPhoto: item.customizationPhoto || null,
          hasGeneralCustomization: item.hasGeneralCustomization || false,
          generalCustomizationName: item.generalCustomizationName || null,
          generalCustomizationValue: item.generalCustomizationValue?.toString() || "0.00",
          hasItemDiscount: item.hasItemDiscount || false,
          itemDiscountType: item.itemDiscountType || "percentage",
          itemDiscountPercentage: item.itemDiscountPercentage?.toString() || "0.00",
          itemDiscountValue: item.itemDiscountValue?.toString() || "0.00",
          productWidth: item.productWidth?.toString() || null,
          productHeight: item.productHeight?.toString() || null
        });
      }
      console.log(`Created virtual budget ${budgetNumber} with ${orderItems.length} items`);
      processedData.budgetId = virtualBudgetId;
    }
    delete processedData.items;
    const results = await pg.insert(orders).values({
      ...processedData,
      paidValue: processedData.paidValue || "0.00",
      refundAmount: processedData.refundAmount || "0.00",
      status: processedData.status || "pending",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    const order = results[0];
    await this.createAccountsReceivableForOrder(order);
    await this.calculateCommissions(order);
    return order;
  }
  async createAccountsReceivableForOrder(order) {
    const paidValue = order.paidValue || "0.00";
    const downPayment = order.downPayment || "0.00";
    const shippingCost = order.shippingCost || "0.00";
    const minimumPaymentValue = compareMoney(downPayment, "0") > 0 ? addMoney(downPayment, shippingCost) : "0.00";
    let status = "pending";
    if (compareMoney(paidValue, order.totalValue) >= 0) {
      status = "paid";
    } else if (compareMoney(paidValue, "0") > 0) {
      status = "partial";
    }
    let dueDate = /* @__PURE__ */ new Date();
    if (order.deadline) {
      dueDate = typeof order.deadline === "string" ? new Date(order.deadline) : order.deadline;
    }
    await pg.insert(accountsReceivable).values({
      orderId: order.id,
      clientId: order.clientId,
      vendorId: order.vendorId,
      dueDate,
      amount: order.totalValue,
      receivedAmount: paidValue,
      minimumPayment: minimumPaymentValue,
      status,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
  }
  async calculateCommissions(order) {
    try {
      console.log(`Calculating commissions for order ${order.orderNumber}`);
      const vendorUser = await pg.select().from(users).where(eq(users.id, order.vendorId)).then((rows) => rows[0]);
      const vendor = await pg.select().from(vendors).where(eq(vendors.userId, order.vendorId)).then((rows) => rows[0]);
      const orderValue = parseFloat(order.totalValue);
      const isVendorCommissioned = vendorUser?.isCommissioned !== false;
      if (isVendorCommissioned) {
        const vendorRate = vendor?.commissionRate || "10.00";
        const vendorCommissionAmount = orderValue * parseFloat(vendorRate) / 100;
        await pg.insert(commissions).values({
          id: `commission-${order.id}-vendor`,
          vendorId: order.vendorId,
          partnerId: null,
          orderId: order.id,
          percentage: vendorRate,
          amount: vendorCommissionAmount.toFixed(2),
          status: "pending",
          type: "vendor",
          orderValue: order.totalValue,
          orderNumber: order.orderNumber,
          paidAt: null,
          deductedAt: null,
          createdAt: /* @__PURE__ */ new Date()
        });
        console.log(`Created vendor commission: R$ ${vendorCommissionAmount.toFixed(2)} (${vendorRate}%) for order ${order.orderNumber}`);
      } else {
        console.log(`Skipping vendor commission for order ${order.orderNumber} - vendor is not commissioned`);
      }
      const allPartners = await pg.select().from(users).where(eq(users.role, "partner"));
      if (allPartners.length > 0) {
        const partnerRate = "15.00";
        const totalPartnerCommission = orderValue * parseFloat(partnerRate) / 100;
        const individualPartnerCommission = totalPartnerCommission / allPartners.length;
        for (let i = 0; i < allPartners.length; i++) {
          const partner = allPartners[i];
          const individualPercentage = (parseFloat(partnerRate) / allPartners.length).toFixed(2);
          await pg.insert(commissions).values({
            id: `commission-${order.id}-partner-${i + 1}`,
            vendorId: null,
            partnerId: partner.id,
            orderId: order.id,
            percentage: individualPercentage,
            amount: individualPartnerCommission.toFixed(2),
            status: "confirmed",
            // Partners get confirmed immediately
            type: "partner",
            orderValue: order.totalValue,
            orderNumber: order.orderNumber,
            paidAt: /* @__PURE__ */ new Date(),
            // Paid immediately
            deductedAt: null,
            createdAt: /* @__PURE__ */ new Date()
          });
        }
        console.log(`Created ${allPartners.length} partner commissions: R$ ${individualPartnerCommission.toFixed(2)} each (total: R$ ${totalPartnerCommission.toFixed(2)}) for order ${order.orderNumber}`);
      }
    } catch (error) {
      console.error("Error calculating commissions:", error);
    }
  }
  async recalculateCommissionsForOrder(order) {
    try {
      console.log(`Recalculating commissions for order ${order.orderNumber}`);
      const orderValue = parseFloat(order.totalValue);
      const existingCommissions = await pg.select().from(commissions).where(eq(commissions.orderId, order.id));
      if (existingCommissions.length === 0) {
        console.log(`No existing commissions found for order ${order.id}, creating new ones`);
        await this.calculateCommissions(order);
        return;
      }
      const vendor = await pg.select().from(vendors).where(eq(vendors.userId, order.vendorId)).then((rows) => rows[0]);
      const vendorRate = vendor?.commissionRate || "10.00";
      const vendorCommissionAmount = orderValue * parseFloat(vendorRate) / 100;
      const allPartners = await pg.select().from(users).where(eq(users.role, "partner"));
      const partnerRate = "15.00";
      const totalPartnerCommission = orderValue * parseFloat(partnerRate) / 100;
      const individualPartnerCommission = allPartners.length > 0 ? totalPartnerCommission / allPartners.length : 0;
      for (const commission of existingCommissions) {
        if (commission.type === "vendor") {
          await pg.update(commissions).set({
            orderValue: order.totalValue,
            percentage: vendorRate,
            amount: vendorCommissionAmount.toFixed(2)
          }).where(eq(commissions.id, commission.id));
          console.log(`Updated vendor commission ${commission.id}: R$ ${vendorCommissionAmount.toFixed(2)} (${vendorRate}%)`);
        } else if (commission.type === "partner") {
          const individualPercentage = allPartners.length > 0 ? (parseFloat(partnerRate) / allPartners.length).toFixed(2) : partnerRate;
          await pg.update(commissions).set({
            orderValue: order.totalValue,
            percentage: individualPercentage,
            amount: individualPartnerCommission.toFixed(2)
          }).where(eq(commissions.id, commission.id));
          console.log(`Updated partner commission ${commission.id}: R$ ${individualPartnerCommission.toFixed(2)}`);
        }
      }
      console.log(`Recalculated ${existingCommissions.length} commissions for order ${order.orderNumber}`);
    } catch (error) {
      console.error("Error recalculating commissions:", error);
    }
  }
  async updateOrder(id, updates) {
    const processedData = { ...updates };
    if (processedData.deadline && typeof processedData.deadline === "string") {
      processedData.deadline = new Date(processedData.deadline);
    }
    if (processedData.deliveryDeadline && typeof processedData.deliveryDeadline === "string") {
      processedData.deliveryDeadline = new Date(processedData.deliveryDeadline);
    }
    if (processedData.createdAt && typeof processedData.createdAt === "string") {
      processedData.createdAt = new Date(processedData.createdAt);
    }
    const orderItems = processedData.items;
    if (orderItems && orderItems.length > 0) {
      const currentOrder = await pg.select().from(orders).where(eq(orders.id, id)).then((r) => r[0]);
      if (currentOrder) {
        let budgetId = currentOrder.budgetId;
        if (!budgetId) {
          console.log(`Creating virtual budget for order ${id} during update`);
          const budgetNumber = `ORC-AUTO-${Date.now()}`;
          const budgetResults = await pg.insert(budgets).values({
            budgetNumber,
            clientId: currentOrder.clientId,
            vendorId: currentOrder.vendorId,
            title: processedData.product || currentOrder.product || "Pedido Direto",
            description: processedData.description || currentOrder.description || "",
            subtotal: processedData.totalValue || currentOrder.totalValue || "0.00",
            totalValue: processedData.totalValue || currentOrder.totalValue || "0.00",
            status: "converted",
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3),
            contactName: processedData.contactName || currentOrder.contactName || "",
            contactPhone: processedData.contactPhone || currentOrder.contactPhone || "",
            contactEmail: processedData.contactEmail || currentOrder.contactEmail || "",
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).returning();
          budgetId = budgetResults[0].id;
          processedData.budgetId = budgetId;
        }
        await pg.delete(budgetItems).where(eq(budgetItems.budgetId, budgetId));
        for (const item of orderItems) {
          const producerId = item.producerId && item.producerId !== "internal" && item.producerId !== "" ? item.producerId : null;
          await pg.insert(budgetItems).values({
            budgetId,
            productId: item.productId,
            producerId,
            quantity: item.quantity?.toString() || "1",
            unitPrice: item.unitPrice?.toString() || "0.00",
            totalPrice: item.totalPrice?.toString() || "0.00",
            notes: item.notes || null,
            hasItemCustomization: item.hasItemCustomization || false,
            selectedCustomizationId: item.selectedCustomizationId || null,
            itemCustomizationValue: item.itemCustomizationValue?.toString() || "0.00",
            itemCustomizationDescription: item.itemCustomizationDescription || null,
            additionalCustomizationNotes: item.additionalCustomizationNotes || null,
            customizationPhoto: item.customizationPhoto || null,
            hasGeneralCustomization: item.hasGeneralCustomization || false,
            generalCustomizationName: item.generalCustomizationName || null,
            generalCustomizationValue: item.generalCustomizationValue?.toString() || "0.00",
            hasItemDiscount: item.hasItemDiscount || false,
            itemDiscountType: item.itemDiscountType || "percentage",
            itemDiscountPercentage: item.itemDiscountPercentage?.toString() || "0.00",
            itemDiscountValue: item.itemDiscountValue?.toString() || "0.00",
            productWidth: item.productWidth?.toString() || null,
            productHeight: item.productHeight?.toString() || null
          });
        }
        console.log(`Updated ${orderItems.length} items for order ${id}`);
      }
    }
    delete processedData.items;
    const results = await pg.update(orders).set({ ...processedData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(orders.id, id)).returning();
    return results[0];
  }
  async updateOrderStatus(orderId, status, notes, deliveryDate, trackingCode, cancellationReason, cancelledBy) {
    const updates = { status };
    if (notes) updates.notes = notes;
    if (deliveryDate) updates.deliveryDeadline = new Date(deliveryDate);
    if (trackingCode) updates.trackingCode = trackingCode;
    if (cancellationReason) updates.cancellationReason = cancellationReason;
    if (cancelledBy) updates.cancelledBy = cancelledBy;
    const results = await pg.update(orders).set(updates).where(eq(orders.id, orderId)).returning();
    const updatedOrder = results[0];
    console.log(`Order ${orderId} status updated to: ${status}`);
    if (status === "delivered") {
      await pg.update(commissions).set({
        status: "confirmed",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(and(
        eq(commissions.orderId, orderId),
        eq(commissions.type, "vendor")
      ));
      console.log(`Vendor commission confirmed for delivered order ${orderId}`);
    }
    if (status === "cancelled") {
      await this.updateCommissionsByOrderStatus(orderId, "cancelled");
    }
    return updatedOrder;
  }
  async getOrdersByVendor(vendorId) {
    return await pg.select().from(orders).where(eq(orders.vendorId, vendorId)).orderBy(desc(orders.createdAt));
  }
  async getOrdersByClient(clientId) {
    const budgetsAsOrders = await pg.select().from(budgets).where(and(
      eq(budgets.clientId, clientId),
      eq(budgets.status, "converted")
    )).orderBy(desc(budgets.createdAt));
    return budgetsAsOrders.map((b) => ({
      id: b.id,
      orderNumber: b.budgetNumber || b.id.substring(0, 8),
      clientId: b.clientId,
      vendorId: b.vendorId,
      status: b.orderStatus || "pending",
      totalValue: b.totalValue,
      paidValue: b.paidValue || "0",
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      branchId: b.branchId,
      notes: b.description,
      deliveryDate: b.deliveryDeadline,
      shippingAddress: null,
      refundAmount: null
    }));
  }
  // ==================== PRODUCTION ORDERS ====================
  async getProductionOrders() {
    return await pg.select().from(productionOrders).orderBy(desc(productionOrders.id));
  }
  async getProductionOrdersByProducer(producerId) {
    return await pg.select().from(productionOrders).where(eq(productionOrders.producerId, producerId));
  }
  async getProductionOrder(id) {
    const results = await pg.select().from(productionOrders).where(eq(productionOrders.id, id));
    return results[0];
  }
  async getProductionOrdersByOrder(orderId) {
    return await pg.select().from(productionOrders).where(eq(productionOrders.orderId, orderId));
  }
  async createProductionOrder(productionOrder) {
    const results = await pg.insert(productionOrders).values(productionOrder).returning();
    return results[0];
  }
  async updateProductionOrderStatus(id, status, notes, deliveryDate, trackingCode) {
    const updates = { status };
    if (notes) updates.notes = notes;
    if (deliveryDate) updates.deliveryDeadline = new Date(deliveryDate);
    if (trackingCode) updates.trackingCode = trackingCode;
    const results = await pg.update(productionOrders).set(updates).where(eq(productionOrders.id, id)).returning();
    return results[0];
  }
  async updateProductionOrderValue(id, value, notes, lockValue) {
    const updates = { producerValue: value };
    if (notes) updates.producerNotes = notes;
    if (lockValue !== void 0) updates.producerValueLocked = lockValue;
    const results = await pg.update(productionOrders).set(updates).where(eq(productionOrders.id, id)).returning();
    return results[0];
  }
  async updateProductionOrder(id, updates) {
    const results = await pg.update(productionOrders).set(updates).where(eq(productionOrders.id, id)).returning();
    return results[0];
  }
  async getProductionOrderItems(productionOrderId) {
    return await pg.select().from(productionOrderItems).where(eq(productionOrderItems.productionOrderId, productionOrderId));
  }
  async createProductionOrderItem(productionOrderId, itemData) {
    const quantity = Math.round(parseFloat(String(itemData.quantity || 0)));
    const productionOrderItemData = {
      productionOrderId,
      budgetItemId: itemData.budgetItemId || null,
      productId: itemData.productId,
      productName: itemData.productName || "Produto",
      quantity,
      unitPrice: itemData.unitPrice,
      totalPrice: itemData.totalPrice,
      notes: itemData.notes || null,
      hasItemCustomization: itemData.hasItemCustomization || false,
      itemCustomizationValue: itemData.itemCustomizationValue || null,
      itemCustomizationDescription: itemData.itemCustomizationDescription || null,
      customizationPhoto: itemData.customizationPhoto || null,
      productWidth: itemData.productWidth || null,
      productHeight: itemData.productHeight || null,
      productDepth: itemData.productDepth || null,
      hasGeneralCustomization: itemData.hasGeneralCustomization || false,
      generalCustomizationName: itemData.generalCustomizationName || null,
      generalCustomizationValue: itemData.generalCustomizationValue || null,
      hasItemDiscount: itemData.hasItemDiscount || false,
      itemDiscountType: itemData.itemDiscountType || "percentage",
      itemDiscountPercentage: itemData.itemDiscountPercentage || null,
      itemDiscountValue: itemData.itemDiscountValue || null
    };
    const results = await pg.insert(productionOrderItems).values(productionOrderItemData).returning();
    console.log(`Created production order item for product ${itemData.productName} (qty: ${quantity})`);
    return results[0];
  }
  async getProductionOrdersWithItems(productionOrderIds) {
    let orders2;
    if (productionOrderIds && productionOrderIds.length > 0) {
      orders2 = await pg.select().from(productionOrders).where(sql2`${productionOrders.id} = ANY(ARRAY[${sql2.join(productionOrderIds.map((id) => sql2`${id}`), sql2`, `)}]::varchar[])`).orderBy(desc(productionOrders.id));
    } else {
      orders2 = await pg.select().from(productionOrders).orderBy(desc(productionOrders.id));
    }
    return Promise.all(orders2.map(async (order) => ({
      ...order,
      items: await this.getProductionOrderItems(order.id)
    })));
  }
  // ==================== PAYMENTS ====================
  async getPayments() {
    return await pg.select().from(payments).orderBy(desc(payments.createdAt));
  }
  async createPayment(payment) {
    const results = await pg.insert(payments).values({
      ...payment,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    const newPayment = results[0];
    if (newPayment.status === "confirmed") {
      await this.updateOrderPaidValue(newPayment.orderId);
    }
    return newPayment;
  }
  async updateOrderPaidValue(orderId) {
    const payments2 = await pg.select().from(payments).where(and(
      eq(payments.orderId, orderId),
      eq(payments.status, "confirmed")
    ));
    const totalPaid = payments2.reduce((sum, payment) => {
      return sum + parseFloat(payment.amount);
    }, 0);
    await pg.update(orders).set({ paidValue: totalPaid.toFixed(2) }).where(eq(orders.id, orderId));
    const accountsReceivable2 = await pg.select().from(accountsReceivable).where(eq(accountsReceivable.orderId, orderId));
    for (const ar of accountsReceivable2) {
      const amount = parseFloat(ar.amount);
      let status = "open";
      if (totalPaid >= amount) {
        status = "paid";
      } else if (totalPaid > 0) {
        status = "partial";
      }
      await pg.update(accountsReceivable).set({
        receivedAmount: totalPaid.toFixed(2),
        status,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(accountsReceivable.id, ar.id));
    }
  }
  async getPaymentsByOrder(orderId) {
    return await pg.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.createdAt));
  }
  // ==================== COMMISSIONS ====================
  async getCommissionsByVendor(vendorId) {
    console.log(`[PG STORAGE] Getting commissions for vendor: ${vendorId}`);
    const commissions2 = await pg.select().from(commissions).where(eq(commissions.vendorId, vendorId)).orderBy(desc(commissions.createdAt));
    console.log(`[PG STORAGE] Found ${commissions2.length} commissions for vendor ${vendorId}`);
    return commissions2;
  }
  async getCommissionsByPartner(partnerId) {
    return await pg.select().from(commissions).where(eq(commissions.partnerId, partnerId));
  }
  async getAllCommissions() {
    return await pg.select().from(commissions).orderBy(desc(commissions.createdAt));
  }
  async createCommission(commission) {
    const results = await pg.insert(commissions).values({
      ...commission,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updateCommissionStatus(id, status) {
    const updates = { status };
    if (status === "paid") {
      updates.paidAt = /* @__PURE__ */ new Date();
    }
    const results = await pg.update(commissions).set(updates).where(eq(commissions.id, id)).returning();
    return results[0];
  }
  async deleteCommission(id) {
    try {
      console.log(`Deleting commission: ${id}`);
      const result = await pg.delete(commissions).where(eq(commissions.id, id)).returning();
      if (result.length === 0) {
        console.log(`Commission not found: ${id}`);
        return false;
      }
      console.log(`Commission ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`Error deleting commission ${id}:`, error);
      return false;
    }
  }
  async deductPartnerCommission(partnerId, amount) {
  }
  async updateCommissionsByOrderStatus(orderId, status) {
    try {
      const updateData = {
        status,
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (status === "cancelled") {
        updateData.amount = "0.00";
      }
      await pg.update(commissions).set(updateData).where(eq(commissions.orderId, orderId));
      console.log(`Updated commissions for order ${orderId} to status: ${status}${status === "cancelled" ? " (amounts zeroed)" : ""}`);
    } catch (error) {
      console.error("Error updating commissions by order status:", error);
    }
  }
  async recalculateAllCommissions() {
    try {
      console.log("Starting commission recalculation for existing orders...");
      const allOrders = await pg.select().from(orders);
      console.log(`Found ${allOrders.length} orders to check`);
      const existingCommissions = await pg.select().from(commissions);
      const orderIdsWithCommissions = new Set(existingCommissions.map((c) => c.orderId));
      let recalculatedCount = 0;
      for (const order of allOrders) {
        if (!orderIdsWithCommissions.has(order.id)) {
          console.log(`Recalculating commissions for order ${order.orderNumber}`);
          await this.calculateCommissions(order);
          recalculatedCount++;
        }
      }
      console.log(`Commission recalculation completed. Processed ${recalculatedCount} orders.`);
    } catch (error) {
      console.error("Error during commission recalculation:", error);
    }
  }
  // ==================== PARTNERS ====================
  async getPartners() {
    const partners2 = await pg.select().from(partners);
    const userIds = partners2.map((p) => p.userId);
    if (userIds.length === 0) return [];
    return await pg.select().from(users).where(inArray(users.id, userIds));
  }
  async getPartner(userId) {
    const results = await pg.select().from(partners).where(eq(partners.userId, userId));
    return results[0];
  }
  async createPartner(partnerData) {
    const newUser = await this.createUser({
      username: partnerData.username,
      password: partnerData.password || "123456",
      role: "partner",
      name: partnerData.name,
      email: partnerData.email || null,
      phone: partnerData.phone || null,
      vendorId: null,
      isActive: true
    });
    await pg.insert(partners).values({
      userId: newUser.id,
      commissionRate: partnerData.commissionRate || "15.00",
      isActive: true,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
    return newUser;
  }
  async updatePartnerCommission(userId, commissionRate) {
    console.log(`Updating partner commission: ${userId} to ${commissionRate}%`);
    await pg.update(partners).set({
      commissionRate,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(partners.userId, userId));
  }
  async deletePartner(userId) {
    try {
      console.log(`Deleting partner profile for user: ${userId}`);
      const result = await pg.delete(partners).where(eq(partners.userId, userId)).returning();
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting partner profile for user ${userId}:`, error);
      return false;
    }
  }
  // ==================== COMMISSION SETTINGS ====================
  async getCommissionSettings() {
    const results = await pg.select().from(commissionSettings).where(eq(commissionSettings.isActive, true)).limit(1);
    return results[0];
  }
  async updateCommissionSettings(settings) {
    const existing = await this.getCommissionSettings();
    if (existing) {
      const results2 = await pg.update(commissionSettings).set({ ...settings, updatedAt: /* @__PURE__ */ new Date() }).where(eq(commissionSettings.id, existing.id)).returning();
      return results2[0];
    }
    const results = await pg.insert(commissionSettings).values({
      ...settings,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  // ==================== PRODUCTS ====================
  async getProducts(options) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;
    const conditions = [eq(products.isActive, true)];
    if (options?.search) {
      conditions.push(
        or(
          like(products.name, `%${options.search}%`),
          like(products.description, `%${options.search}%`),
          like(products.friendlyCode, `%${options.search}%`),
          like(products.compositeCode, `%${options.search}%`),
          like(products.externalCode, `%${options.search}%`)
        )
      );
    }
    if (options?.category) {
      conditions.push(eq(products.category, options.category));
    }
    const products2 = await pg.select().from(products).where(and(...conditions)).limit(limit).offset(offset);
    const enrichedProducts = products2.map((product) => ({
      ...product,
      producerName: "Ser\xE1 definido no or\xE7amento"
    }));
    const totalResults = await pg.select({ count: sql2`count(*)` }).from(products).where(and(...conditions));
    const total = Number(totalResults[0].count);
    const totalPages = Math.ceil(total / limit);
    return { products: enrichedProducts, total, page, totalPages };
  }
  async getProduct(id) {
    const results = await pg.select().from(products).where(eq(products.id, id));
    return results[0];
  }
  async createProduct(productData) {
    const results = await pg.insert(products).values({
      ...productData,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updateProduct(id, productData) {
    const { createdAt, updatedAt, ...cleanProductData } = productData;
    const results = await pg.update(products).set({ ...cleanProductData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(products.id, id)).returning();
    return results[0];
  }
  async deleteProduct(id) {
    await pg.update(products).set({ isActive: false }).where(eq(products.id, id));
    return true;
  }
  async importProducts(productsData) {
    let imported = 0;
    const errors = [];
    const cleanNumericField = (value) => {
      if (value === "" || value === void 0 || value === null) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num.toString();
    };
    for (const productData of productsData) {
      try {
        const cleanedProductData = {
          ...productData,
          // Clean numeric fields
          weight: cleanNumericField(productData.weight),
          height: cleanNumericField(productData.height),
          width: cleanNumericField(productData.width),
          depth: cleanNumericField(productData.depth),
          basePrice: productData.basePrice || "0.00"
        };
        await this.createProduct(cleanedProductData);
        imported++;
      } catch (error) {
        errors.push(`Error importing ${productData.name}: ${error.message}`);
      }
    }
    return { imported, errors };
  }
  async importProductsForProducer(productsData, producerId) {
    let imported = 0;
    const errors = [];
    const cleanNumericField = (value) => {
      if (value === "" || value === void 0 || value === null) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num.toString();
    };
    const isInternal = !producerId;
    const mapProductFields = (item) => {
      const costPrice = parseFloat(item.PrecoVenda || item.Preco || item.PrecoCusto || 0);
      const salePrice = parseFloat(item.salePrice || item.PrecoFinal || 0);
      const basePriceToUse = salePrice > 0 ? salePrice : costPrice > 0 ? costPrice : 0;
      return {
        name: item.Nome || item.name || item.NomeProduto || "Produto sem nome",
        description: item.Descricao || item.description || item.Descricao || "",
        category: item.WebTipo || item.category || item.Categoria || "Geral",
        basePrice: basePriceToUse > 0 ? basePriceToUse.toFixed(2) : "0.00",
        costPrice: costPrice.toFixed(2),
        // Custo original do JSON
        unit: item.unit || item.Unidade || "un",
        isActive: true,
        producerId: isInternal ? null : producerId,
        type: isInternal ? "internal" : "external",
        // Optional fields with mapping
        externalId: item.IdProduto?.toString() || item.id?.toString(),
        externalCode: item.CodigoXbz || item.code,
        compositeCode: item.CodigoComposto,
        friendlyCode: item.CodigoAmigavel,
        siteLink: item.SiteLink,
        imageLink: item.ImageLink || item.imageUrl,
        mainColor: item.CorWebPrincipal || item.mainColor,
        secondaryColor: item.CorWebSecundaria || item.secondaryColor,
        weight: cleanNumericField(item.Peso || item.weight),
        height: cleanNumericField(item.Altura || item.height),
        width: cleanNumericField(item.Largura || item.width),
        depth: cleanNumericField(item.Profundidade || item.depth),
        availableQuantity: item.QuantidadeDisponivel || item.availableQuantity,
        stockStatus: item.StatusConfiabilidade || item.stockStatus,
        ncm: item.Ncm || item.ncm
      };
    };
    const validProductsToInsert = [];
    for (const rawItem of productsData) {
      try {
        const productData = mapProductFields(rawItem);
        if (!productData.name || productData.name.trim() === "") {
          errors.push(`Produto pulado: nome vazio ou inv\xE1lido`);
          continue;
        }
        if (!productData.basePrice || parseFloat(productData.basePrice) <= 0) {
          errors.push(`Produto "${productData.name}" pulado: pre\xE7o inv\xE1lido (${productData.basePrice})`);
          continue;
        }
        validProductsToInsert.push(productData);
      } catch (error) {
        const itemName = rawItem.Nome || rawItem.name || rawItem.NomeProduto || "Produto sem nome";
        errors.push(`Erro mapeando ${itemName}: ${error.message}`);
      }
    }
    if (validProductsToInsert.length > 0) {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < validProductsToInsert.length; i += CHUNK_SIZE) {
        const chunk = validProductsToInsert.slice(i, i + CHUNK_SIZE);
        try {
          await pg.insert(products).values(chunk);
          imported += chunk.length;
          console.log(`Imported batch ${i / CHUNK_SIZE + 1} (${chunk.length} items)...`);
        } catch (error) {
          console.error(`Error importing chunk starting at ${i}:`, error.message);
          errors.push(`Erro inserindo lote a partir do item ${i + 1}: ${error.message}`);
          console.log("Tentando inserir o lote com falha item por item...");
          for (const productData of chunk) {
            try {
              await this.createProduct(productData);
              imported++;
            } catch (singleError) {
              errors.push(`Erro inserindo ${productData.name}: ${singleError.message}`);
            }
          }
        }
      }
    }
    console.log(`Import for producer ${producerId} completed: ${imported} imported, ${errors.length} errors`);
    return { imported, errors };
  }
  async searchProducts(query) {
    return await pg.select().from(products).where(
      or(
        like(products.name, `%${query}%`),
        like(products.description, `%${query}%`)
      )
    ).limit(20);
  }
  async getProductsByProducer(producerId) {
    return await pg.select().from(products).where(eq(products.producerId, producerId));
  }
  async getProductsGroupedByProducer() {
    const products2 = await pg.select().from(products).where(eq(products.isActive, true));
    const grouped = {};
    for (const product of products2) {
      const producerId = product.producerId || "internal";
      if (!grouped[producerId]) {
        grouped[producerId] = [];
      }
      grouped[producerId].push(product);
    }
    return grouped;
  }
  async recalculateProductPrices() {
    const errors = [];
    let updated = 0;
    try {
      const pricingSettings2 = await this.getPricingSettings();
      if (!pricingSettings2) {
        errors.push("Configura\xE7\xF5es de precifica\xE7\xE3o n\xE3o encontradas");
        return { updated: 0, errors };
      }
      const taxRate = parseFloat(pricingSettings2.taxRate) / 100;
      const commissionRate = parseFloat(pricingSettings2.commissionRate) / 100;
      const marginTiers = await this.getPricingMarginTiers(pricingSettings2.id);
      let defaultMarginRate;
      let defaultMinimumMarginRate;
      if (marginTiers.length > 0) {
        const sortedTiers = [...marginTiers].sort(
          (a, b) => parseFloat(a.minRevenue || "0") - parseFloat(b.minRevenue || "0")
        );
        const baseTier = sortedTiers.find((t) => parseFloat(t.minRevenue || "0") <= 0) || sortedTiers[0];
        defaultMarginRate = parseFloat(baseTier.marginRate) / 100;
        defaultMinimumMarginRate = parseFloat(baseTier.minimumMarginRate) / 100;
      } else {
        defaultMarginRate = parseFloat(pricingSettings2.minimumMargin) / 100;
        defaultMinimumMarginRate = defaultMarginRate;
      }
      const divisor = 1 - taxRate - commissionRate - defaultMarginRate;
      if (divisor <= 0) {
        errors.push("Divisor de markup inv\xE1lido (soma de taxas >= 100%). Verifique as configura\xE7\xF5es.");
        return { updated: 0, errors };
      }
      const allProducts = await pg.select().from(products).where(
        sql2`cost_price IS NOT NULL AND cost_price != '0' AND cost_price != '0.00'`
      );
      for (const product of allProducts) {
        try {
          const costPrice = parseFloat(product.costPrice);
          if (!costPrice || costPrice <= 0) continue;
          const idealPrice = Math.round(costPrice / divisor * 100) / 100;
          await pg.update(products).set({ basePrice: idealPrice.toFixed(2) }).where(eq(products.id, product.id));
          updated++;
        } catch (productError) {
          errors.push(`Produto ${product.id}: ${productError.message}`);
        }
      }
      await pg.execute(
        sql2`UPDATE products
            SET base_price = cost_price
            WHERE (base_price = '0.00' OR base_price IS NULL OR base_price = '0')
              AND cost_price IS NOT NULL
              AND cost_price != '0'
              AND cost_price != '0.00'`
      );
      return { updated, errors };
    } catch (error) {
      errors.push(`Erro geral: ${error.message}`);
      return { updated, errors };
    }
  }
  // ==================== BUDGETS ====================
  async getBudgets() {
    return await pg.select().from(budgets).orderBy(desc(budgets.createdAt));
  }
  async getBudget(id) {
    const results = await pg.select().from(budgets).where(eq(budgets.id, id));
    return results[0];
  }
  async getBudgetsByVendor(vendorId) {
    return await pg.select().from(budgets).where(eq(budgets.vendorId, vendorId)).orderBy(desc(budgets.createdAt));
  }
  async getBudgetsByClient(clientId) {
    return await pg.select().from(budgets).where(eq(budgets.clientId, clientId)).orderBy(desc(budgets.createdAt));
  }
  async createBudget(budgetData) {
    const processedData = { ...budgetData };
    if (processedData.validUntil) {
      try {
        if (typeof processedData.validUntil === "string") {
          processedData.validUntil = new Date(processedData.validUntil);
        } else if (!(processedData.validUntil instanceof Date)) {
          processedData.validUntil = new Date(processedData.validUntil);
        }
        if (isNaN(processedData.validUntil.getTime())) {
          processedData.validUntil = null;
        }
      } catch (e) {
        processedData.validUntil = null;
      }
    } else {
      processedData.validUntil = null;
    }
    if (processedData.deliveryDeadline) {
      try {
        if (typeof processedData.deliveryDeadline === "string") {
          processedData.deliveryDeadline = new Date(processedData.deliveryDeadline);
        } else if (!(processedData.deliveryDeadline instanceof Date)) {
          processedData.deliveryDeadline = new Date(processedData.deliveryDeadline);
        }
        if (isNaN(processedData.deliveryDeadline.getTime())) {
          processedData.deliveryDeadline = null;
        }
      } catch (e) {
        processedData.deliveryDeadline = null;
      }
    } else {
      processedData.deliveryDeadline = null;
    }
    async function getNextBudgetNumber() {
      const maxRetries = 10;
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          const timestamp2 = Date.now();
          const random = Math.floor(Math.random() * 1e3);
          const uniqueId = `${timestamp2}${random}`;
          const now = /* @__PURE__ */ new Date();
          const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
          const budgetNumber = `BUD-${yymm}-${uniqueId.slice(-6)}`;
          const existing = await pg.select().from(budgets).where(eq(budgets.budgetNumber, budgetNumber)).limit(1);
          if (existing.length === 0) {
            return budgetNumber;
          }
          attempt++;
          console.log(`Budget number ${budgetNumber} exists, retrying... (attempt ${attempt})`);
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (e) {
          console.error("Error generating budget number:", e);
          attempt++;
          if (attempt >= maxRetries) {
            throw e;
          }
        }
      }
      const fallbackId = `${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
      return `BUD-FALLBACK-${fallbackId.slice(-10)}`;
    }
    if (!processedData.budgetNumber || processedData.budgetNumber === null) {
      processedData.budgetNumber = await getNextBudgetNumber();
    }
    const results = await pg.insert(budgets).values({
      ...processedData,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    const newBudget = results[0];
    console.log(`\u2705 [PG CREATE BUDGET] Budget criado: ${newBudget.id} (${newBudget.budgetNumber})`);
    if (budgetData.items && Array.isArray(budgetData.items) && budgetData.items.length > 0) {
      console.log(`\u{1F4E6} [PG CREATE BUDGET] Processando ${budgetData.items.length} items recebidos`);
      const seenItems = /* @__PURE__ */ new Set();
      const uniqueItems = budgetData.items.filter((item) => {
        const itemKey = `${item.productId}-${item.producerId || "internal"}-${item.quantity}-${item.unitPrice}`;
        if (seenItems.has(itemKey)) {
          console.log(`\u26A0\uFE0F [PG CREATE BUDGET] Item duplicado removido: ${item.productName}`);
          return false;
        }
        seenItems.add(itemKey);
        return true;
      });
      console.log(`\u{1F4CA} [PG CREATE BUDGET] ${uniqueItems.length} items \xFAnicos para salvar (${budgetData.items.length - uniqueItems.length} duplicados)`);
      const itemsToInsert = uniqueItems.map((itemData) => {
        let producerId = itemData.producerId;
        if (!producerId || producerId === "internal" || producerId === "") {
          producerId = null;
        }
        return {
          budgetId: newBudget.id,
          productId: itemData.productId,
          productName: itemData.productName || "Produto",
          producerId,
          quantity: parseFloat(String(itemData.quantity || 1)),
          unitPrice: (itemData.unitPrice || 0).toString(),
          totalPrice: (itemData.totalPrice || 0).toString(),
          hasItemCustomization: itemData.hasItemCustomization || false,
          selectedCustomizationId: itemData.selectedCustomizationId || null,
          itemCustomizationValue: (itemData.itemCustomizationValue || 0).toString(),
          itemCustomizationDescription: itemData.itemCustomizationDescription || null,
          additionalCustomizationNotes: itemData.additionalCustomizationNotes || null,
          customizationPhoto: itemData.customizationPhoto || null,
          hasGeneralCustomization: itemData.hasGeneralCustomization || false,
          generalCustomizationName: itemData.generalCustomizationName || null,
          generalCustomizationValue: (itemData.generalCustomizationValue || 0).toString(),
          hasItemDiscount: itemData.hasItemDiscount || false,
          itemDiscountType: itemData.itemDiscountType || "percentage",
          itemDiscountPercentage: (itemData.itemDiscountPercentage || 0).toString(),
          itemDiscountValue: (itemData.itemDiscountValue || 0).toString(),
          productWidth: itemData.productWidth ? parseFloat(String(itemData.productWidth)) : null,
          productHeight: itemData.productHeight ? parseFloat(String(itemData.productHeight)) : null,
          productDepth: itemData.productDepth ? parseFloat(String(itemData.productDepth)) : null
        };
      });
      if (itemsToInsert.length > 0) {
        try {
          await pg.insert(budgetItems).values(itemsToInsert);
          console.log(`\u2705 [PG CREATE BUDGET] ${itemsToInsert.length} items inseridos em uma \xFAnica opera\xE7\xE3o (batch insert)`);
        } catch (batchError) {
          console.error(`\u26A0\uFE0F [PG CREATE BUDGET] Batch insert falhou, tentando inser\xE7\xE3o individual:`, batchError.message);
          let successCount = 0;
          let failureCount = 0;
          for (const itemValues of itemsToInsert) {
            let retryCount = 0;
            const maxRetries = 3;
            let itemSaved = false;
            while (!itemSaved && retryCount < maxRetries) {
              try {
                await pg.insert(budgetItems).values(itemValues);
                successCount++;
                itemSaved = true;
              } catch (itemError) {
                retryCount++;
                if (retryCount >= maxRetries) {
                  console.error(`\u274C [PG ITEM] Falha ap\xF3s ${maxRetries} tentativas:`, itemError.message);
                  failureCount++;
                  itemSaved = true;
                } else {
                  await new Promise((resolve) => setTimeout(resolve, 500 * retryCount));
                }
              }
            }
          }
          console.log(`\u{1F4CA} [PG CREATE BUDGET] Fallback: \u2705 ${successCount} salvos | \u274C ${failureCount} falhados`);
          if (failureCount > 0 && successCount === 0) {
            throw new Error(`Erro ao salvar itens do or\xE7amento: todos os ${failureCount} itens falharam`);
          }
        }
      }
    }
    if (budgetData.paymentMethodId || budgetData.shippingMethodId) {
      try {
        await pg.insert(budgetPaymentInfo).values({
          budgetId: newBudget.id,
          paymentMethodId: budgetData.paymentMethodId || null,
          shippingMethodId: budgetData.shippingMethodId || null,
          installments: budgetData.installments || 1,
          downPayment: (budgetData.downPayment || 0).toString(),
          remainingAmount: (budgetData.remainingAmount || 0).toString(),
          shippingCost: (budgetData.shippingCost || 0).toString(),
          createdAt: /* @__PURE__ */ new Date()
        });
      } catch (paymentError) {
        console.error(`[PG CREATE BUDGET] Error creating payment info:`, paymentError);
      }
    }
    console.log(`[PG CREATE BUDGET] Budget ${newBudget.id} created successfully`);
    return newBudget;
  }
  async updateBudget(id, budgetData) {
    const processedData = { ...budgetData };
    if (processedData.validUntil && typeof processedData.validUntil === "string") {
      processedData.validUntil = new Date(processedData.validUntil);
    }
    if (processedData.deliveryDeadline && typeof processedData.deliveryDeadline === "string") {
      processedData.deliveryDeadline = new Date(processedData.deliveryDeadline);
    }
    if (processedData.clientId === "" || processedData.clientId === void 0) {
      processedData.clientId = null;
    }
    const results = await pg.update(budgets).set({ ...processedData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(budgets.id, id)).returning();
    return results[0];
  }
  async deleteBudget(id) {
    await pg.delete(budgetItems).where(eq(budgetItems.budgetId, id));
    await pg.delete(budgetPhotos).where(eq(budgetPhotos.budgetId, id));
    await pg.delete(budgets).where(eq(budgets.id, id));
    return true;
  }
  async convertBudgetToOrder(budgetId, clientId, deliveryDate) {
    const budget = await this.getBudget(budgetId);
    if (!budget) throw new Error("Budget not found");
    const budgetPaymentInfo2 = await this.getBudgetPaymentInfo(budgetId);
    console.log(`[CONVERT BUDGET] Payment info for budget ${budgetId}:`, budgetPaymentInfo2);
    const client2 = await this.getClient(clientId);
    let clientName = budget.contactName;
    let clientPhone = budget.contactPhone;
    let clientEmail = budget.contactEmail;
    let clientAddress = "";
    if (client2) {
      clientName = client2.name;
      clientPhone = client2.phone || budget.contactPhone;
      clientEmail = client2.email || budget.contactEmail;
      if (client2.enderecoEntregaLogradouro) {
        clientAddress = [
          client2.enderecoEntregaLogradouro,
          client2.enderecoEntregaNumero,
          client2.enderecoEntregaComplemento,
          client2.enderecoEntregaBairro,
          client2.enderecoEntregaCidade,
          client2.enderecoEntregaCep
        ].filter(Boolean).join(", ");
      }
      console.log(`[CONVERT BUDGET] Using client data from conversion: ${clientName} (${clientId})`);
    } else {
      const user = await this.getUser(clientId);
      if (user) {
        clientName = user.name;
        clientPhone = user.phone || budget.contactPhone;
        clientEmail = user.email || budget.contactEmail;
        console.log(`[CONVERT BUDGET] Using user data from conversion: ${clientName} (${clientId})`);
      }
    }
    const deliveryDateObj = deliveryDate instanceof Date ? deliveryDate : deliveryDate ? new Date(deliveryDate) : void 0;
    const toMoneyString3 = (value) => {
      if (value === null || value === void 0 || value === "") return "0.00";
      const num = parseFloat(String(value));
      return isNaN(num) ? "0.00" : num.toFixed(2);
    };
    const orderData = {
      orderNumber: `PED-${Date.now()}`,
      clientId,
      vendorId: budget.vendorId,
      branchId: budget.branchId,
      budgetId: budget.id,
      product: budget.title,
      description: budget.description,
      totalValue: budget.totalValue,
      paidValue: "0.00",
      status: "pending",
      contactName: clientName,
      // Usar nome do cliente da conversão
      contactPhone: clientPhone,
      // Usar telefone do cliente da conversão
      contactEmail: clientEmail,
      // Usar email do cliente da conversão
      shippingAddress: clientAddress || "",
      // Usar endereço do cliente da conversão
      deliveryType: budget.deliveryType,
      deliveryDeadline: deliveryDateObj,
      deadline: deliveryDateObj,
      // Copy payment and shipping info from budget (with proper type conversion)
      paymentMethodId: budgetPaymentInfo2?.paymentMethodId || null,
      shippingMethodId: budgetPaymentInfo2?.shippingMethodId || null,
      shippingCost: toMoneyString3(budgetPaymentInfo2?.shippingCost),
      installments: budgetPaymentInfo2?.installments ? Number(budgetPaymentInfo2.installments) : 1,
      downPayment: toMoneyString3(budgetPaymentInfo2?.downPayment),
      remainingAmount: toMoneyString3(budgetPaymentInfo2?.remainingAmount || budget.totalValue),
      // Copy discount info from budget (with proper type conversion)
      hasDiscount: budget.hasDiscount || false,
      discountType: budget.discountType || "percentage",
      discountPercentage: toMoneyString3(budget.discountPercentage),
      discountValue: toMoneyString3(budget.discountValue)
    };
    console.log(`[CONVERT BUDGET] Order data with payment info:`, {
      paymentMethodId: orderData.paymentMethodId,
      shippingMethodId: orderData.shippingMethodId,
      shippingCost: orderData.shippingCost,
      installments: orderData.installments,
      downPayment: orderData.downPayment,
      remainingAmount: orderData.remainingAmount
    });
    const order = await this.createOrder(orderData);
    const budgetItems2 = await this.getBudgetItems(budgetId);
    const producerGroups = /* @__PURE__ */ new Map();
    for (const item of budgetItems2) {
      if (item.producerId) {
        if (!producerGroups.has(item.producerId)) {
          producerGroups.set(item.producerId, []);
        }
        producerGroups.get(item.producerId).push(item);
      }
    }
    for (const [producerId, items] of producerGroups.entries()) {
      const productionOrderData = {
        orderId: order.id,
        producerId,
        status: "pending",
        deadline: deliveryDateObj,
        deliveryDeadline: deliveryDateObj,
        notes: `Itens: ${items.map((i) => i.productName).join(", ")}`
      };
      const productionOrder = await this.createProductionOrder(productionOrderData);
      console.log(`Created production order for producer ${producerId} with ${items.length} items`);
      for (const budgetItem of items) {
        const quantity = Math.round(parseFloat(String(budgetItem.quantity)));
        const productionOrderItemData = {
          productionOrderId: productionOrder.id,
          budgetItemId: budgetItem.id,
          productId: budgetItem.productId,
          productName: budgetItem.productName || "Produto",
          quantity,
          unitPrice: budgetItem.unitPrice,
          totalPrice: budgetItem.totalPrice,
          notes: budgetItem.notes,
          hasItemCustomization: budgetItem.hasItemCustomization,
          itemCustomizationValue: budgetItem.itemCustomizationValue,
          itemCustomizationDescription: budgetItem.itemCustomizationDescription,
          customizationPhoto: budgetItem.customizationPhoto,
          productWidth: budgetItem.productWidth,
          productHeight: budgetItem.productHeight,
          productDepth: budgetItem.productDepth,
          hasGeneralCustomization: budgetItem.hasGeneralCustomization,
          generalCustomizationName: budgetItem.generalCustomizationName,
          generalCustomizationValue: budgetItem.generalCustomizationValue,
          hasItemDiscount: budgetItem.hasItemDiscount,
          itemDiscountType: budgetItem.itemDiscountType,
          itemDiscountPercentage: budgetItem.itemDiscountPercentage,
          itemDiscountValue: budgetItem.itemDiscountValue
        };
        await pg.insert(productionOrderItems).values(productionOrderItemData);
        console.log(`Created production order item for product ${budgetItem.productName} (qty: ${quantity})`);
      }
    }
    await this.updateBudget(budgetId, { status: "converted" });
    return order;
  }
  // ==================== BUDGET ITEMS ====================
  async getBudgetItems(budgetId) {
    const items = await pg.select({
      id: budgetItems.id,
      budgetId: budgetItems.budgetId,
      productId: budgetItems.productId,
      quantity: budgetItems.quantity,
      unitPrice: budgetItems.unitPrice,
      totalPrice: budgetItems.totalPrice,
      notes: budgetItems.notes,
      hasItemCustomization: budgetItems.hasItemCustomization,
      itemCustomizationValue: budgetItems.itemCustomizationValue,
      itemCustomizationDescription: budgetItems.itemCustomizationDescription,
      customizationPhoto: budgetItems.customizationPhoto,
      productWidth: budgetItems.productWidth,
      productHeight: budgetItems.productHeight,
      productDepth: budgetItems.productDepth,
      producerId: budgetItems.producerId,
      selectedCustomizationId: budgetItems.selectedCustomizationId,
      additionalCustomizationNotes: budgetItems.additionalCustomizationNotes,
      hasGeneralCustomization: budgetItems.hasGeneralCustomization,
      generalCustomizationName: budgetItems.generalCustomizationName,
      generalCustomizationValue: budgetItems.generalCustomizationValue,
      hasItemDiscount: budgetItems.hasItemDiscount,
      itemDiscountType: budgetItems.itemDiscountType,
      itemDiscountPercentage: budgetItems.itemDiscountPercentage,
      itemDiscountValue: budgetItems.itemDiscountValue,
      purchaseStatus: budgetItems.purchaseStatus,
      productName: products.name
    }).from(budgetItems).leftJoin(products, eq(budgetItems.productId, products.id)).where(eq(budgetItems.budgetId, budgetId));
    return items;
  }
  async createBudgetItem(budgetId, itemData) {
    const results = await pg.insert(budgetItems).values({
      ...itemData,
      budgetId
    }).returning();
    return results[0];
  }
  async updateBudgetItem(itemId, itemData) {
    const results = await pg.update(budgetItems).set(itemData).where(eq(budgetItems.id, itemId)).returning();
    return results[0];
  }
  async deleteBudgetItem(itemId) {
    await pg.delete(budgetItems).where(eq(budgetItems.id, itemId));
    return true;
  }
  async deleteBudgetItems(budgetId) {
    await pg.delete(budgetItems).where(eq(budgetItems.budgetId, budgetId));
    return true;
  }
  async updateBudgetItemPurchaseStatus(itemId, purchaseStatus) {
    const results = await pg.update(budgetItems).set({
      purchaseStatus,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(budgetItems.id, itemId)).returning();
    return results.length > 0 ? results[0] : null;
  }
  async checkAllItemsInStore(orderId) {
    const orderResults = await pg.select().from(orders).where(eq(orders.id, orderId));
    if (orderResults.length === 0 || !orderResults[0].budgetId) return false;
    const order = orderResults[0];
    const items = await pg.select().from(budgetItems).where(eq(budgetItems.budgetId, order.budgetId));
    const externalItems = items.filter((item) => item.producerId && item.producerId !== "internal");
    if (externalItems.length === 0) return true;
    return externalItems.every((item) => item.purchaseStatus === "in_store");
  }
  // ==================== BUDGET PHOTOS ====================
  async getBudgetPhotos(budgetId) {
    return await pg.select().from(budgetPhotos).where(eq(budgetPhotos.budgetId, budgetId));
  }
  async createBudgetPhoto(budgetId, photoData) {
    const results = await pg.insert(budgetPhotos).values({
      ...photoData,
      budgetId,
      uploadedAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async deleteBudgetPhoto(photoId) {
    await pg.delete(budgetPhotos).where(eq(budgetPhotos.id, photoId));
    return true;
  }
  // ==================== PAYMENT METHODS ====================
  async getPaymentMethods() {
    return await pg.select().from(paymentMethods).where(eq(paymentMethods.isActive, true));
  }
  async getAllPaymentMethods() {
    return await pg.select().from(paymentMethods);
  }
  async createPaymentMethod(data) {
    const results = await pg.insert(paymentMethods).values({
      ...data,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updatePaymentMethod(id, data) {
    const results = await pg.update(paymentMethods).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(paymentMethods.id, id)).returning();
    return results[0] || null;
  }
  async deletePaymentMethod(id) {
    await pg.update(paymentMethods).set({ isActive: false }).where(eq(paymentMethods.id, id));
    return true;
  }
  // ==================== SHIPPING METHODS ====================
  async getShippingMethods() {
    return await pg.select().from(shippingMethods).where(eq(shippingMethods.isActive, true));
  }
  async getAllShippingMethods() {
    return await pg.select().from(shippingMethods);
  }
  async createShippingMethod(data) {
    const results = await pg.insert(shippingMethods).values({
      ...data,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updateShippingMethod(id, data) {
    const results = await pg.update(shippingMethods).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(shippingMethods.id, id)).returning();
    return results[0] || null;
  }
  async deleteShippingMethod(id) {
    await pg.update(shippingMethods).set({ isActive: false }).where(eq(shippingMethods.id, id));
    return true;
  }
  // ==================== BUDGET PAYMENT INFO ====================
  async getBudgetPaymentInfo(budgetId) {
    const results = await pg.select().from(budgetPaymentInfo).where(eq(budgetPaymentInfo.budgetId, budgetId));
    return results[0];
  }
  async createBudgetPaymentInfo(data) {
    const results = await pg.insert(budgetPaymentInfo).values({
      ...data,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updateBudgetPaymentInfo(budgetId, data) {
    const existing = await this.getBudgetPaymentInfo(budgetId);
    if (existing) {
      const results = await pg.update(budgetPaymentInfo).set(data).where(eq(budgetPaymentInfo.budgetId, budgetId)).returning();
      return results[0];
    }
    return await this.createBudgetPaymentInfo({ ...data, budgetId });
  }
  // ==================== ACCOUNTS RECEIVABLE ====================
  async getAccountsReceivable() {
    const existingAR = await pg.select().from(accountsReceivable).orderBy(desc(accountsReceivable.createdAt));
    const convertedBudgets = await pg.select().from(budgets).where(eq(budgets.status, "converted"));
    const paymentInfos = await pg.select().from(budgetPaymentInfo);
    const paymentInfoMap = new Map(paymentInfos.map((pi) => [pi.budgetId, pi]));
    const budgetARs = [];
    for (const budget of convertedBudgets) {
      if (existingAR.some((ar) => ar.orderId === budget.id)) continue;
      const paymentInfo = paymentInfoMap.get(budget.id);
      const totalValue = parseFloat(budget.totalValue || "0");
      const paidValue = parseFloat(budget.paidValue || "0");
      const remainingAmount = totalValue - paidValue;
      if (remainingAmount > 0) {
        budgetARs.push({
          id: `ar-${budget.id}`,
          orderId: budget.id,
          clientId: budget.clientId,
          vendorId: budget.vendorId,
          branchId: budget.branchId,
          amount: budget.totalValue,
          receivedAmount: budget.paidValue || "0",
          status: paidValue >= totalValue ? "paid" : paidValue > 0 ? "partial" : "pending",
          dueDate: budget.deliveryDeadline,
          description: budget.title,
          createdAt: budget.createdAt,
          updatedAt: budget.updatedAt
        });
      }
    }
    return [...existingAR, ...budgetARs].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }
  async getAccountsReceivableByOrder(orderId) {
    return await pg.select().from(accountsReceivable).where(eq(accountsReceivable.orderId, orderId));
  }
  async getAccountsReceivableByClient(clientId) {
    return await pg.select().from(accountsReceivable).where(eq(accountsReceivable.clientId, clientId));
  }
  async getAccountsReceivableByVendor(vendorId) {
    return await pg.select().from(accountsReceivable).where(eq(accountsReceivable.vendorId, vendorId));
  }
  async createAccountsReceivable(data) {
    const results = await pg.insert(accountsReceivable).values({
      ...data,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updateAccountsReceivable(id, data) {
    const results = await pg.update(accountsReceivable).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(accountsReceivable.id, id)).returning();
    return results[0];
  }
  async updateAccountsReceivableForOrder(order) {
    try {
      const existingAR = await this.getAccountsReceivableByOrder(order.id);
      if (existingAR.length === 0) {
        await this.createAccountsReceivableForOrder(order);
        console.log(`Created accounts receivable for order ${order.orderNumber}`);
        return;
      }
      const ar = existingAR[0];
      const paidValue = order.paidValue || "0.00";
      const downPayment = order.downPayment || "0.00";
      const shippingCost = order.shippingCost || "0.00";
      const minimumPaymentValue = compareMoney(downPayment, "0") > 0 ? addMoney(downPayment, shippingCost) : "0.00";
      let status = "pending";
      if (compareMoney(paidValue, order.totalValue) >= 0) {
        status = "paid";
      } else if (compareMoney(paidValue, "0") > 0) {
        status = "partial";
      }
      let dueDate = /* @__PURE__ */ new Date();
      if (order.deadline) {
        dueDate = typeof order.deadline === "string" ? new Date(order.deadline) : order.deadline;
      }
      await pg.update(accountsReceivable).set({
        amount: order.totalValue,
        receivedAmount: paidValue,
        minimumPayment: minimumPaymentValue,
        status,
        dueDate,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(accountsReceivable.id, ar.id));
      console.log(`Updated accounts receivable for order ${order.orderNumber}: amount=${order.totalValue}, downPayment=${downPayment}, minimumPayment=${minimumPaymentValue}`);
    } catch (error) {
      console.error(`Error updating accounts receivable for order ${order.id}:`, error);
    }
  }
  // ==================== PAYMENT ALLOCATIONS ====================
  async getPaymentAllocationsByPayment(paymentId) {
    return await pg.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, paymentId));
  }
  async getPaymentAllocationsByReceivable(receivableId) {
    return await pg.select().from(paymentAllocations).where(eq(paymentAllocations.receivableId, receivableId));
  }
  async createPaymentAllocation(data) {
    const results = await pg.insert(paymentAllocations).values({
      ...data,
      allocatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async allocatePaymentToReceivable(paymentId, receivableId, amount) {
    return await this.createPaymentAllocation({ paymentId, receivableId, amount });
  }
  // ==================== BANK IMPORTS & TRANSACTIONS ====================
  async getBankImports() {
    return await pg.select().from(bankImports).orderBy(desc(bankImports.uploadedAt));
  }
  async getBankImport(id) {
    const results = await pg.select().from(bankImports).where(eq(bankImports.id, id));
    return results[0];
  }
  async createBankImport(data) {
    const results = await pg.insert(bankImports).values({
      ...data,
      uploadedAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updateBankImport(id, data) {
    const results = await pg.update(bankImports).set(data).where(eq(bankImports.id, id)).returning();
    return results[0];
  }
  async getBankTransactionsByImport(importId) {
    return await pg.select().from(bankTransactions).where(eq(bankTransactions.importId, importId));
  }
  async getBankTransactions() {
    try {
      const result = await pg.select().from(bankTransactions).orderBy(desc(bankTransactions.date));
      return result.map((row) => ({
        id: row.id,
        importId: row.importId,
        fitId: row.fitId || "",
        date: row.date,
        hasValidDate: row.hasValidDate || false,
        amount: row.amount,
        description: row.description || "",
        memo: row.memo || "",
        bankRef: row.bankRef || "",
        originalType: row.originalType || "",
        type: row.type || "other",
        status: row.status || "unmatched",
        matchedOrderId: row.matchedOrderId || null,
        matchedPaymentId: row.matchedPaymentId || null,
        matchedAt: row.matchedAt || null,
        notes: row.notes || "",
        matchedEntityType: row.matchedEntityType || null,
        matchedEntityId: row.matchedEntityId || null
      }));
    } catch (error) {
      console.error("Error fetching bank transactions:", error);
      return [];
    }
  }
  async getBankTransaction(id) {
    try {
      const result = await pg.select().from(bankTransactions).where(eq(bankTransactions.id, id)).limit(1);
      if (result.length === 0) {
        return void 0;
      }
      const row = result[0];
      return {
        id: row.id,
        importId: row.importId,
        fitId: row.fitId || "",
        date: row.date,
        hasValidDate: row.hasValidDate || false,
        amount: row.amount,
        description: row.description || "",
        memo: row.memo || "",
        bankRef: row.bankRef || "",
        originalType: row.originalType || "",
        type: row.type || "other",
        status: row.status || "unmatched",
        matchedOrderId: row.matchedOrderId || null,
        matchedPaymentId: row.matchedPaymentId || null,
        matchedAt: row.matchedAt || null,
        notes: row.notes || "",
        matchedEntityType: row.matchedEntityType || null,
        matchedEntityId: row.matchedEntityId || null
      };
    } catch (error) {
      console.error("Error fetching bank transaction by id:", error);
      return void 0;
    }
  }
  async getBankTransactionByFitId(fitId) {
    try {
      const result = await pg.select().from(bankTransactions).where(eq(bankTransactions.fitId, fitId)).limit(1);
      if (result.length === 0) {
        return null;
      }
      const row = result[0];
      return {
        id: row.id,
        importId: row.importId,
        fitId: row.fitId || "",
        date: row.date,
        hasValidDate: row.hasValidDate || false,
        amount: row.amount,
        description: row.description || "",
        memo: row.memo || "",
        bankRef: row.bankRef || "",
        originalType: row.originalType || "",
        type: row.type || "other",
        status: row.status || "unmatched",
        matchedOrderId: row.matchedOrderId || null,
        matchedPaymentId: row.matchedPaymentId || null,
        matchedAt: row.matchedAt || null,
        notes: row.notes || "",
        matchedEntityType: row.matchedEntityType || null,
        matchedEntityId: row.matchedEntityId || null
      };
    } catch (error) {
      console.error("Error fetching bank transaction by fitId:", error);
      return null;
    }
  }
  async createBankTransaction(data) {
    const results = await pg.insert(bankTransactions).values({
      ...data,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updateBankTransaction(id, data) {
    const results = await pg.update(bankTransactions).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(bankTransactions.id, id)).returning();
    return results[0];
  }
  async matchTransactionToReceivable(transactionId, receivableId) {
    return await this.updateBankTransaction(transactionId, {
      matchedReceivableId: receivableId,
      status: "matched",
      matchedAt: /* @__PURE__ */ new Date()
    });
  }
  // ==================== EXPENSE NOTES ====================
  async getExpenses() {
    return await this.getExpenseNotes();
  }
  async getExpenseNotes() {
    return await pg.select().from(expenseNotes).orderBy(desc(expenseNotes.date));
  }
  async getExpenseNotesByVendor(vendorId) {
    return await pg.select().from(expenseNotes).where(eq(expenseNotes.vendorId, vendorId));
  }
  async getExpenseNotesByOrder(orderId) {
    return await pg.select().from(expenseNotes).where(eq(expenseNotes.orderId, orderId));
  }
  async createExpenseNote(data) {
    const results = await pg.insert(expenseNotes).values({
      ...data,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updateExpenseNote(id, data) {
    const results = await pg.update(expenseNotes).set(data).where(eq(expenseNotes.id, id)).returning();
    return results[0];
  }
  // ==================== COMMISSION PAYOUTS ====================
  async getCommissionPayouts() {
    return await pg.select().from(commissionPayouts).orderBy(desc(commissionPayouts.createdAt));
  }
  async getCommissionPayoutsByUser(userId, type) {
    return await pg.select().from(commissionPayouts).where(and(
      eq(commissionPayouts.userId, userId),
      eq(commissionPayouts.type, type)
    ));
  }
  async createCommissionPayout(data) {
    const results = await pg.insert(commissionPayouts).values({
      ...data,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updateCommissionPayout(id, data) {
    const results = await pg.update(commissionPayouts).set(data).where(eq(commissionPayouts.id, id)).returning();
    return results[0];
  }
  // ==================== MANUAL RECEIVABLES/PAYABLES ====================
  async createManualReceivable(data) {
    const results = await pg.insert(manualReceivables).values(data).returning();
    return results[0];
  }
  async getManualReceivables() {
    return await pg.select().from(manualReceivables).orderBy(desc(manualReceivables.createdAt));
  }
  async createManualPayable(data) {
    const results = await pg.insert(manualPayables).values({
      beneficiary: data.beneficiary,
      description: data.description,
      amount: data.amount,
      dueDate: data.dueDate,
      category: data.category || "Outros",
      notes: data.notes || null,
      attachmentUrl: data.attachmentUrl || null,
      attachmentUrl2: data.attachmentUrl2 || null,
      status: data.status || "pending",
      branchId: data.branchId || null,
      orderId: data.orderId || null,
      clientId: data.clientId || null
    }).returning();
    return results[0];
  }
  async getManualPayables() {
    return await pg.select().from(manualPayables).orderBy(desc(manualPayables.createdAt));
  }
  async getManualPayable(id) {
    const results = await pg.select().from(manualPayables).where(eq(manualPayables.id, id));
    return results[0];
  }
  async updateManualPayable(id, updates) {
    const results = await pg.update(manualPayables).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(manualPayables.id, id)).returning();
    return results[0];
  }
  // ==================== CUSTOMIZATION OPTIONS ====================
  async createCustomizationOption(data) {
    console.log("Creating customization option with data:", data);
    const results = await pg.insert(customizationOptions).values({
      name: data.name,
      description: data.description || null,
      category: data.category,
      minQuantity: data.minQuantity,
      price: data.price,
      isActive: data.isActive !== void 0 ? data.isActive : true,
      createdBy: data.createdBy,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    console.log("Created customization option:", results[0]);
    return results[0];
  }
  async getCustomizationOptions() {
    return await pg.select().from(customizationOptions).where(eq(customizationOptions.isActive, true));
  }
  async getCustomizationOptionsByCategory(category, quantity) {
    return await pg.select().from(customizationOptions).where(and(
      eq(customizationOptions.category, category),
      eq(customizationOptions.isActive, true),
      lte(customizationOptions.minQuantity, quantity)
    ));
  }
  async updateCustomizationOption(id, data) {
    const results = await pg.update(customizationOptions).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(customizationOptions.id, id)).returning();
    return results[0];
  }
  async deleteCustomizationOption(id) {
    await pg.update(customizationOptions).set({ isActive: false }).where(eq(customizationOptions.id, id));
    return true;
  }
  async getCustomizationCategories() {
    const customizations = await pg.select({
      category: customizationOptions.category
    }).from(customizationOptions).where(eq(customizationOptions.isActive, true));
    const categorySet = /* @__PURE__ */ new Set();
    customizations.forEach((customization) => {
      if (customization.category && typeof customization.category === "string") {
        categorySet.add(customization.category);
      }
    });
    return Array.from(categorySet).sort();
  }
  async createCustomizationCategory(name) {
    return { name };
  }
  // ==================== PRODUCER PAYMENTS ====================
  async getProducerPayments() {
    return await pg.select().from(producerPayments).orderBy(desc(producerPayments.createdAt));
  }
  async getProducerPaymentsByProducer(producerId) {
    return await pg.select().from(producerPayments).where(eq(producerPayments.producerId, producerId));
  }
  async getProducerPaymentByProductionOrderId(productionOrderId) {
    const results = await pg.select().from(producerPayments).where(eq(producerPayments.productionOrderId, productionOrderId));
    return results[0];
  }
  async createProducerPayment(data) {
    const results = await pg.insert(producerPayments).values({
      ...data,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updateProducerPayment(id, data) {
    const results = await pg.update(producerPayments).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(producerPayments.id, id)).returning();
    return results[0];
  }
  async getProducerPayment(id) {
    const results = await pg.select().from(producerPayments).where(eq(producerPayments.id, id));
    return results[0];
  }
  // ==================== QUOTE REQUESTS ====================
  async createConsolidatedQuoteRequest(data) {
    const clientUser = await pg.select().from(users).where(eq(users.id, data.clientId)).limit(1);
    const contactName = clientUser[0]?.name || "Cliente";
    const enrichedProducts = await Promise.all(
      data.products.map(async (product) => {
        if (!product.quantity || product.quantity <= 0) {
          throw new Error(`Invalid quantity for product: ${product.productId}`);
        }
        const productDetails = await pg.select().from(products).where(eq(products.id, product.productId)).limit(1);
        if (!productDetails[0]) {
          throw new Error(`Product not found: ${product.productId}`);
        }
        const basePrice = productDetails[0].basePrice;
        const basePriceNum = parseFloat(basePrice || "0");
        if (!basePrice || isNaN(basePriceNum) || basePriceNum <= 0) {
          throw new Error(`Product ${product.productId} has invalid price: ${basePrice}`);
        }
        const lineTotal = (basePriceNum * product.quantity).toFixed(2);
        return {
          ...product,
          basePrice,
          // Keep as string from database
          unitPrice: basePrice,
          // For frontend compatibility
          lineTotal
          // Calculated total for this line
        };
      })
    );
    const totalEstimatedValue = enrichedProducts.reduce((sum, product) => {
      return sum + parseFloat(product.basePrice) * product.quantity;
    }, 0);
    const quoteRequestResults = await pg.insert(quoteRequests).values({
      clientId: data.clientId,
      vendorId: data.vendorId,
      contactName,
      whatsapp: clientUser[0]?.phone || null,
      email: clientUser[0]?.email || null,
      observations: data.observations || null,
      totalEstimatedValue: totalEstimatedValue.toFixed(2),
      status: "pending",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    const quoteRequest = quoteRequestResults[0];
    if (enrichedProducts && enrichedProducts.length > 0) {
      await pg.insert(quoteRequestItems).values(
        enrichedProducts.map((product) => ({
          quoteRequestId: quoteRequest.id,
          productId: product.productId,
          productName: product.productName,
          quantity: product.quantity,
          basePrice: product.basePrice,
          // Already a string from database
          category: product.category || null,
          imageLink: product.imageLink || null,
          observations: product.observations || null,
          createdAt: /* @__PURE__ */ new Date()
        }))
      );
    }
    return {
      ...quoteRequest,
      totalEstimatedValue: totalEstimatedValue.toFixed(2),
      // Ensure it's a string
      items: enrichedProducts
    };
  }
  async createQuoteRequest(data) {
    const results = await pg.insert(quoteRequests).values({
      ...data,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async getQuoteRequestsByVendor(vendorId) {
    const quoteRequests2 = await pg.select().from(quoteRequests).where(eq(quoteRequests.vendorId, vendorId)).orderBy(desc(quoteRequests.createdAt));
    const enriched = await Promise.all(
      quoteRequests2.map(async (qr) => {
        const items = await pg.select().from(quoteRequestItems).where(eq(quoteRequestItems.quoteRequestId, qr.id));
        return { ...qr, items };
      })
    );
    return enriched;
  }
  async getQuoteRequestsByClient(clientId) {
    const quoteRequests2 = await pg.select().from(quoteRequests).where(eq(quoteRequests.clientId, clientId)).orderBy(desc(quoteRequests.createdAt));
    const enriched = await Promise.all(
      quoteRequests2.map(async (qr) => {
        const items = await pg.select().from(quoteRequestItems).where(eq(quoteRequestItems.quoteRequestId, qr.id));
        return { ...qr, items };
      })
    );
    return enriched;
  }
  async getQuoteRequestById(id) {
    const results = await pg.select().from(quoteRequests).where(eq(quoteRequests.id, id));
    if (!results[0]) {
      return void 0;
    }
    const items = await pg.select().from(quoteRequestItems).where(eq(quoteRequestItems.quoteRequestId, results[0].id));
    return { ...results[0], items };
  }
  async updateQuoteRequestStatus(id, status) {
    const results = await pg.update(quoteRequests).set({ status }).where(eq(quoteRequests.id, id)).returning();
    return results[0];
  }
  // ==================== BRANCHES ====================
  async getBranches() {
    return await pg.select().from(branches).where(eq(branches.isActive, true));
  }
  async getBranch(id) {
    const results = await pg.select().from(branches).where(eq(branches.id, id));
    return results[0] || null;
  }
  async createBranch(branchData) {
    const results = await pg.insert(branches).values({
      ...branchData,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return results[0];
  }
  async updateBranch(id, updateData) {
    const results = await pg.update(branches).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(branches.id, id)).returning();
    return results[0] || null;
  }
  async deleteBranch(id) {
    await pg.update(branches).set({ isActive: false }).where(eq(branches.id, id));
    return true;
  }
  async deleteVendor(id) {
    await pg.delete(vendors).where(eq(vendors.userId, id));
    await pg.delete(users).where(eq(users.id, id));
    return true;
  }
  async deleteProducer(id) {
    try {
      console.log(`Deleting producer: ${id}`);
      const user = await pg.select().from(users).where(and(eq(users.id, id), eq(users.role, "producer")));
      if (user.length === 0) {
        console.log(`Producer not found or not a producer: ${id}`);
        return false;
      }
      await pg.update(products).set({ isActive: false }).where(eq(products.producerId, id));
      const result = await pg.delete(users).where(eq(users.id, id)).returning();
      console.log(`Producer ${id} deleted successfully`);
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting producer ${id}:`, error);
      return false;
    }
  }
  async deleteUser(id) {
    await pg.delete(users).where(eq(users.id, id));
    return true;
  }
  // ==================== SYSTEM LOGS ====================
  async getSystemLogs(filters) {
    const conditions = [];
    const limitCount = filters?.limit || 200;
    if (filters?.userId) {
      conditions.push(eq(systemLogs.userId, filters.userId));
    }
    if (filters?.action) {
      conditions.push(eq(systemLogs.action, filters.action));
    }
    if (filters?.level) {
      conditions.push(eq(systemLogs.level, filters.level));
    }
    if (filters?.vendorId) {
      conditions.push(
        or(
          eq(systemLogs.userId, filters.vendorId),
          eq(systemLogs.vendorId, filters.vendorId)
        )
      );
    }
    if (conditions.length > 0) {
      return await pg.select().from(systemLogs).where(and(...conditions)).orderBy(desc(systemLogs.createdAt)).limit(limitCount);
    }
    return await pg.select().from(systemLogs).orderBy(desc(systemLogs.createdAt)).limit(limitCount);
  }
  async createSystemLog(logData) {
    try {
      const results = await pg.insert(systemLogs).values({
        ...logData,
        createdAt: /* @__PURE__ */ new Date()
      }).returning();
      return results[0];
    } catch (error) {
      console.error("Error creating system log:", error);
      throw error;
    }
  }
  async logUserAction(userId, userName, userRole, action, entity, entityId, description, level, details, ipAddress, userAgent, vendorId) {
    try {
      await this.createSystemLog({
        userId,
        userName,
        userRole,
        vendorId: vendorId || null,
        action,
        entity,
        entityId,
        description,
        level: level || "info",
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      });
    } catch (error) {
      console.error("Failed to log user action (non-blocking):", error);
    }
  }
  // ==================== PRICING / FORMAÇÃO DE PREÇO ====================
  async getPricingSettings() {
    const results = await pg.select().from(pricingSettings).where(eq(pricingSettings.isActive, true)).limit(1);
    if (results[0]) return results[0];
    const seeded = await pg.insert(pricingSettings).values({
      name: "Configura\xE7\xE3o Padr\xE3o",
      taxRate: "9.00",
      commissionRate: "15.00",
      minimumMargin: "20.00",
      cashDiscount: "5.00",
      cashNoTaxDiscount: "12.00",
      isActive: true
    }).returning();
    return seeded[0];
  }
  async updatePricingSettings(id, updates) {
    const results = await pg.update(pricingSettings).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(pricingSettings.id, id)).returning();
    return results[0];
  }
  async getPricingMarginTiers(settingsId) {
    return await pg.select().from(pricingMarginTiers).where(eq(pricingMarginTiers.settingsId, settingsId)).orderBy(pricingMarginTiers.displayOrder);
  }
  async createPricingMarginTier(tierData) {
    const results = await pg.insert(pricingMarginTiers).values(tierData).returning();
    return results[0];
  }
  async updatePricingMarginTier(id, updates) {
    const results = await pg.update(pricingMarginTiers).set(updates).where(eq(pricingMarginTiers.id, id)).returning();
    return results[0];
  }
  async deletePricingMarginTier(id) {
    await pg.delete(pricingMarginTiers).where(eq(pricingMarginTiers.id, id));
  }
};
var pgStorage = new PgStorage();

// server/db.ts
import { eq as eq2, desc as desc2, sql as sql3, and as and2, or as or2, like as like2, isNull as isNull2, not as not2 } from "drizzle-orm";
var db = pgStorage;

// server/services/order-enrichment.ts
var OrderEnrichmentService = class {
  storage;
  userCache;
  clientCache;
  productCache;
  budgetPhotosCache;
  budgetItemsCache;
  constructor(storage) {
    this.storage = storage;
    this.userCache = /* @__PURE__ */ new Map();
    this.clientCache = /* @__PURE__ */ new Map();
    this.productCache = /* @__PURE__ */ new Map();
    this.budgetPhotosCache = /* @__PURE__ */ new Map();
    this.budgetItemsCache = /* @__PURE__ */ new Map();
  }
  async getUserCached(userId) {
    if (!this.userCache.has(userId)) {
      const user = await this.storage.getUser(userId);
      this.userCache.set(userId, user);
    }
    return this.userCache.get(userId);
  }
  async getClientCached(clientId) {
    if (!this.clientCache.has(clientId)) {
      const client2 = await this.storage.getClient(clientId);
      this.clientCache.set(clientId, client2);
    }
    return this.clientCache.get(clientId);
  }
  async getProductCached(productId) {
    if (!this.productCache.has(productId)) {
      const product = await this.storage.getProduct(productId);
      this.productCache.set(productId, product);
    }
    return this.productCache.get(productId);
  }
  async getBudgetPhotosCached(budgetId) {
    if (!this.budgetPhotosCache.has(budgetId)) {
      const photos = await this.storage.getBudgetPhotos(budgetId);
      const photoUrls = photos.map((photo) => photo.imageUrl || photo.photoUrl);
      this.budgetPhotosCache.set(budgetId, photoUrls);
    }
    return this.budgetPhotosCache.get(budgetId);
  }
  async getBudgetItemsCached(budgetId) {
    if (!this.budgetItemsCache.has(budgetId)) {
      const items = await this.storage.getBudgetItems(budgetId);
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          const product = await this.getProductCached(item.productId);
          return {
            ...item,
            product: {
              name: product?.name || "Produto n\xE3o encontrado",
              description: product?.description || "",
              category: product?.category || "",
              imageLink: product?.imageLink || ""
            }
          };
        })
      );
      this.budgetItemsCache.set(budgetId, enrichedItems);
    }
    return this.budgetItemsCache.get(budgetId);
  }
  async enrichOrder(order, options = {}) {
    let clientName = order.contactName;
    if (!clientName && order.clientId) {
      const clientRecord = await this.getClientCached(order.clientId);
      if (clientRecord) {
        clientName = clientRecord.name;
      } else {
        const clientByUserId = await this.storage.getClientByUserId(order.clientId);
        if (clientByUserId) {
          clientName = clientByUserId.name;
        } else {
          const clientUser = await this.getUserCached(order.clientId);
          if (clientUser) {
            clientName = clientUser.name;
          }
        }
      }
    }
    if (!clientName) {
      clientName = "Nome n\xE3o informado";
    }
    const vendor = await this.getUserCached(order.vendorId);
    let producerName = null;
    const productionOrders3 = await this.storage.getProductionOrdersByOrder(order.id);
    if (productionOrders3.length > 0 && productionOrders3[0].producerId) {
      const producer = await this.getUserCached(productionOrders3[0].producerId);
      producerName = producer?.name || null;
    }
    let budgetPhotos3 = [];
    let budgetItems2 = [];
    if (order.budgetId) {
      budgetPhotos3 = await this.getBudgetPhotosCached(order.budgetId);
      budgetItems2 = await this.getBudgetItemsCached(order.budgetId);
    }
    let hasUnreadNotes = false;
    if (options.includeUnreadNotes && productionOrders3.length > 0) {
      hasUnreadNotes = productionOrders3.some((po) => po.hasUnreadNotes);
    }
    let payments2;
    let paidValue;
    let remainingValue;
    let trackingCode;
    let estimatedDelivery;
    let budgetInfo;
    if (options.includePayments || options.includeDetailedFinancials) {
      payments2 = (await this.storage.getPaymentsByOrder(order.id)).filter((p) => p.status === "confirmed");
    }
    if (options.includeDetailedFinancials) {
      const productionOrder = productionOrders3.length > 0 ? productionOrders3[0] : null;
      if (productionOrder) {
        trackingCode = order.trackingCode || productionOrder.trackingCode || null;
        estimatedDelivery = productionOrder.deliveryDeadline || null;
      }
      if (order.budgetId) {
        const budget = await this.storage.getBudget(order.budgetId);
        const budgetDownPayment = budget?.downPayment ? parseFloat(budget.downPayment) : 0;
        budgetInfo = budget ? {
          downPayment: budgetDownPayment,
          totalValue: budget.totalValue ? parseFloat(budget.totalValue) : 0
        } : null;
        const totalPaid = payments2?.reduce((sum, p) => {
          const amount = p.amount ? parseFloat(p.amount.toString()) : 0;
          return sum + amount;
        }, 0) || 0;
        const actualPaidValue = totalPaid + budgetDownPayment;
        const totalValue = order.totalValue ? parseFloat(order.totalValue.toString()) : 0;
        const remainingBalance = totalValue - actualPaidValue;
        paidValue = actualPaidValue.toFixed(2);
        remainingValue = remainingBalance.toFixed(2);
      }
    }
    const enriched = {
      ...order,
      clientName,
      vendorName: vendor?.name || "Vendedor",
      producerName,
      budgetPhotos: budgetPhotos3,
      budgetItems: budgetItems2
    };
    if (options.includeUnreadNotes) {
      enriched.hasUnreadNotes = hasUnreadNotes;
    }
    if (options.includePayments) {
      enriched.payments = payments2;
    }
    if (options.includeDetailedFinancials) {
      enriched.paidValue = paidValue ?? null;
      enriched.remainingValue = remainingValue ?? null;
      enriched.trackingCode = trackingCode ?? null;
      enriched.estimatedDelivery = estimatedDelivery ?? null;
      enriched.budgetInfo = budgetInfo;
    }
    return enriched;
  }
  async enrichOrders(orders2, options = {}) {
    return Promise.all(orders2.map((order) => this.enrichOrder(order, options)));
  }
};

// server/logger.ts
var Logger = class {
  async log(event) {
    try {
      await pgStorage.logUserAction(
        event.userId,
        event.userName,
        event.userRole,
        event.action,
        event.entity,
        event.entityId,
        event.description,
        event.level || "info",
        event.details,
        void 0,
        void 0,
        event.vendorId
      );
    } catch (error) {
      console.error("[Logger] Failed to log event (non-blocking):", error);
    }
  }
  async logBudgetCreated(vendorId, vendorName, budgetId, clientName) {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: "vendor",
      vendorId,
      action: "CREATE",
      entity: "budget",
      entityId: budgetId,
      description: `Or\xE7amento criado para cliente ${clientName}`,
      level: "success"
    });
  }
  async logBudgetSent(vendorId, vendorName, budgetId, clientName) {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: "vendor",
      vendorId,
      action: "SEND",
      entity: "budget",
      entityId: budgetId,
      description: `Or\xE7amento enviado para cliente ${clientName}`,
      level: "info"
    });
  }
  async logBudgetUpdated(vendorId, vendorName, budgetId, changes) {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: "vendor",
      vendorId,
      action: "UPDATE",
      entity: "budget",
      entityId: budgetId,
      description: `Or\xE7amento atualizado: ${changes}`,
      level: "info"
    });
  }
  async logOrderCreated(vendorId, vendorName, orderId, clientName) {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: "vendor",
      vendorId,
      action: "CREATE",
      entity: "order",
      entityId: orderId,
      description: `Pedido criado para cliente ${clientName}`,
      level: "success"
    });
  }
  async logOrderUpdated(vendorId, vendorName, orderId, changes) {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: "vendor",
      vendorId,
      action: "UPDATE",
      entity: "order",
      entityId: orderId,
      description: `Pedido atualizado: ${changes}`,
      level: "info"
    });
  }
  async logOrderStatusChanged(vendorId, vendorName, orderId, oldStatus, newStatus) {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: "vendor",
      vendorId,
      action: "STATUS_CHANGE",
      entity: "order",
      entityId: orderId,
      description: `Status do pedido alterado de "${oldStatus}" para "${newStatus}"`,
      level: "info",
      details: { oldStatus, newStatus }
    });
  }
  async logClientCreated(vendorId, vendorName, clientId, clientName) {
    await this.log({
      userId: vendorId,
      userName: vendorName,
      userRole: "vendor",
      vendorId,
      action: "CREATE",
      entity: "client",
      entityId: clientId,
      description: `Cliente ${clientName} cadastrado`,
      level: "success"
    });
  }
  async logClientAction(clientUserId, clientName, vendorId, action, entity, entityId, description) {
    await this.log({
      userId: clientUserId,
      userName: clientName,
      userRole: "client",
      action,
      entity,
      entityId,
      description,
      level: "info",
      vendorId
    });
  }
  async logBudgetApprovedByClient(clientUserId, clientName, vendorId, budgetId) {
    await this.logClientAction(
      clientUserId,
      clientName,
      vendorId,
      "APPROVE",
      "budget",
      budgetId,
      `Cliente ${clientName} aprovou o or\xE7amento`
    );
  }
  async logBudgetRejectedByClient(clientUserId, clientName, vendorId, budgetId) {
    await this.logClientAction(
      clientUserId,
      clientName,
      vendorId,
      "REJECT",
      "budget",
      budgetId,
      `Cliente ${clientName} rejeitou o or\xE7amento`
    );
  }
  async logProductionOrderCreated(userId, userName, userRole, poId, producerName, orderId) {
    await this.log({
      userId,
      userName,
      userRole,
      action: "CREATE",
      entity: "production_order",
      entityId: poId,
      description: `Ordem de produ\xE7\xE3o enviada para ${producerName}`,
      level: "success",
      details: { orderId, producerName }
    });
  }
  async logPaymentReceived(userId, userName, userRole, orderId, amount, clientName) {
    await this.log({
      userId,
      userName,
      userRole,
      action: "PAYMENT",
      entity: "order",
      entityId: orderId,
      description: `Pagamento de R$ ${amount} recebido do cliente ${clientName}`,
      level: "success",
      details: { amount, clientName }
    });
  }
  async logAdminAction(adminId, adminName, action, entity, entityId, description) {
    await this.log({
      userId: adminId,
      userName: adminName,
      userRole: "admin",
      action,
      entity,
      entityId,
      description,
      level: "info"
    });
  }
};
var logger = new Logger();

// server/objectStorage.ts
import { Client } from "@replit/object-storage";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
var isReplit = process.env.REPL_ID !== void 0;
var client = null;
try {
  if (isReplit) {
    client = new Client();
  } else {
    console.log("Not running in Replit, Object Storage client will be mocked/bypassed.");
  }
} catch (err) {
  console.warn("Failed to initialize Replit Object Storage client. Will use fallback.", err);
}
var ObjectNotFoundError = class _ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
  }
};
var uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
var ObjectStorageService = class {
  constructor() {
  }
  async uploadBuffer(buffer, folder = "uploads", originalFilename = "") {
    try {
      const ext = originalFilename ? `.${originalFilename.split(".").pop()}` : "";
      const objectId = `${randomUUID()}${ext}`;
      const objectName = `${folder}/${objectId}`;
      console.log(`Attempting to upload: ${objectName}, size: ${buffer.length} bytes`);
      if (!client) {
        throw new Error("Replit Object Storage client not initialized");
      }
      const result = await client.uploadFromBytes(objectName, buffer);
      if (!result.ok) {
        const errorMessage = result.error?.message || result.error?.toString() || "Unknown upload error";
        console.error("Object Storage upload failed:", {
          objectName,
          error: result.error,
          errorMessage
        });
        throw new Error(`Failed to upload to Object Storage: ${errorMessage}`);
      }
      console.log(`File uploaded successfully to Object Storage: ${objectName}`);
      return `/objects/${objectName}`;
    } catch (error) {
      console.error("Object Storage upload error:", error);
      try {
        const uploadsDir2 = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadsDir2)) {
          fs.mkdirSync(uploadsDir2, { recursive: true });
        }
        const ext = originalFilename ? `.${originalFilename.split(".").pop()}` : "";
        const filename = `image-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
        const filepath = path.join(uploadsDir2, filename);
        fs.writeFileSync(filepath, buffer);
        console.log(`Fallback: File saved locally as ${filename}`);
        return `/uploads/${filename}`;
      } catch (fallbackError) {
        console.error("Fallback save also failed:", fallbackError);
        throw new Error(`Upload failed completely: ${error.message}`);
      }
    }
  }
  async getObject(objectPath) {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const objectName = objectPath.slice("/objects/".length);
    if (!client) {
      throw new ObjectNotFoundError();
    }
    try {
      const result = await client.downloadAsBytes(objectName);
      if (!result.ok) {
        const errorMessage = result.error?.message || result.error?.toString() || "Unknown download error";
        console.error("Object Storage download failed:", {
          objectName,
          error: result.error,
          errorMessage
        });
        throw new ObjectNotFoundError();
      }
      return result.value[0];
    } catch (error) {
      console.error("Error downloading object:", error);
      throw new ObjectNotFoundError();
    }
  }
  async downloadObject(objectPath, res, cacheTtlSec = 3600) {
    try {
      if (!objectPath.startsWith("/objects/")) {
        throw new ObjectNotFoundError();
      }
      const objectName = objectPath.slice("/objects/".length);
      if (!client) {
        throw new ObjectNotFoundError();
      }
      const result = await client.downloadAsBytes(objectName);
      if (!result.ok) {
        const errorMessage = result.error?.message || result.error?.toString() || "Unknown download error";
        console.error("Object Storage download failed:", {
          objectName,
          error: result.error,
          errorMessage
        });
        throw new ObjectNotFoundError();
      }
      const buffer = result.value[0];
      const ext = objectName.split(".").pop()?.toLowerCase() || "";
      const mimeTypes = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "webp": "image/webp",
        "svg": "image/svg+xml",
        "pdf": "application/pdf"
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";
      res.set({
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": `public, max-age=${cacheTtlSec}`
      });
      res.send(buffer);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (error instanceof ObjectNotFoundError) {
        throw error;
      }
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
  async deleteObject(objectPath) {
    try {
      if (!objectPath.startsWith("/objects/")) {
        return false;
      }
      if (!client) return false;
      const objectName = objectPath.slice("/objects/".length);
      const result = await client.delete(objectName);
      return result.ok;
    } catch (error) {
      console.error("Error deleting object:", error);
      return false;
    }
  }
  async objectExists(objectPath) {
    try {
      if (!objectPath.startsWith("/objects/")) {
        return false;
      }
      if (!client) return false;
      const objectName = objectPath.slice("/objects/".length);
      const result = await client.exists(objectName);
      return result.ok && result.value;
    } catch (error) {
      return false;
    }
  }
};

// server/routes.ts
import Ofx from "node-ofx-parser";
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
    // 50MB limit
  }
});
var requireAuth = async (req, res, next) => {
  console.log("Simulating authentication check...");
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      const decoded = Buffer.from(token, "base64").toString();
      const [userId] = decoded.split(":");
      if (userId) {
        const user = await db.getUser(userId);
        if (user) {
          req.user = user;
        }
      }
    } catch (e) {
    }
  }
  if (!req.user) {
    req.user = null;
  }
  next();
};
async function parseOFXBuffer(buffer) {
  const ofxContent = buffer.toString("utf-8");
  const stats = {
    totalLines: ofxContent.split("\n").length,
    accountId: void 0,
    bankId: void 0,
    accountType: void 0
  };
  console.log(`Parsing OFX content: ${ofxContent.length} characters, ${stats.totalLines} lines`);
  let ofxData;
  try {
    ofxData = Ofx.parse(ofxContent);
    console.log("OFX parsing successful, structure:", JSON.stringify(ofxData, null, 2).substring(0, 500) + "...");
  } catch (parseError) {
    console.error("OFX parsing failed:", parseError);
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Erro ao analisar arquivo OFX: ${errorMessage}`);
  }
  const transactions = [];
  const stmtTrnRsList = ofxData?.OFX?.BANKMSGSRSV1?.STMTTRNRS || ofxData?.BANKMSGSRSV1?.STMTTRNRS || ofxData?.OFX?.STMTTRNRS;
  if (!stmtTrnRsList) {
    console.warn("No STMTTRNRS found in OFX file. Available keys:", Object.keys(ofxData || {}));
    if (ofxData?.OFX) {
      console.warn("OFX keys:", Object.keys(ofxData.OFX));
      if (ofxData.OFX.BANKMSGSRSV1) {
        console.warn("BANKMSGSRSV1 keys:", Object.keys(ofxData.OFX.BANKMSGSRSV1));
      }
    }
    return { transactions, stats };
  }
  const stmtTrnRsArray = Array.isArray(stmtTrnRsList) ? stmtTrnRsList : [stmtTrnRsList];
  for (const stmtTrnRs of stmtTrnRsArray) {
    const stmtRs = stmtTrnRs?.STMTRS;
    if (!stmtRs) continue;
    if (!stats.accountId) {
      const bankAccount = stmtRs.BANKACCTFROM;
      if (bankAccount) {
        stats.accountId = bankAccount.ACCTID;
        stats.bankId = bankAccount.BANKID;
        stats.accountType = bankAccount.ACCTTYPE;
      }
    }
    const statementTransactions = stmtRs.BANKTRANLIST?.STMTTRN;
    if (!statementTransactions) {
      console.log("No transactions in this STMTRS entry, skipping");
      continue;
    }
    const txnArray = Array.isArray(statementTransactions) ? statementTransactions : [statementTransactions];
    txnArray.forEach((txn, index) => {
      const trnType = txn.TRNTYPE || "OTHER";
      const dtPostedRaw = txn.DTPOSTED || "";
      const trnAmt = txn.TRNAMT || "0";
      const memo = txn.MEMO || txn.NAME || "Transa\xE7\xE3o banc\xE1ria";
      const refNum = txn.REFNUM || txn.CHECKNUM || null;
      let fitId = txn.FITID;
      if (!fitId) {
        const hashInput = `${dtPostedRaw}|${trnAmt}|${memo}`;
        const hash = crypto.createHash("sha256").update(hashInput).digest("hex").substring(0, 16);
        fitId = `HASH_${hash}`;
        console.log(`Generated deterministic FITID for transaction: ${fitId} from ${hashInput}`);
      }
      let transactionDate = null;
      let hasValidDate = false;
      if (dtPostedRaw && dtPostedRaw.length >= 8) {
        try {
          const dateStr = String(dtPostedRaw);
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1;
          const day = parseInt(dateStr.substring(6, 8));
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            const parsedDate = new Date(year, month, day);
            if (parsedDate.getFullYear() === year && parsedDate.getMonth() === month && parsedDate.getDate() === day) {
              transactionDate = parsedDate;
              hasValidDate = true;
            }
          }
        } catch (e) {
          console.error("Error parsing date from DTPOSTED:", dtPostedRaw, e);
        }
      }
      let standardType = "other";
      const amount = parseFloat(trnAmt);
      const isDebit = amount < 0 || trnType === "PAYMENT" || trnType === "DEBIT" || trnType === "CHECK" || trnType === "XFER" || trnType === "WITHDRAWAL" || trnType === "DEP" || // Some banks use DEP for debits
      memo.toLowerCase().includes("pag") || memo.toLowerCase().includes("transf") || memo.toLowerCase().includes("saque") || memo.toLowerCase().includes("d\xE9bito");
      if (isDebit) {
        standardType = "debit";
      } else if (trnType === "CREDIT" || trnType === "DEP" || amount > 0) {
        standardType = "credit";
      }
      transactions.push({
        fitId,
        rawFitId: fitId,
        // Store original/generated FITID for deduplication
        date: transactionDate,
        hasValidDate,
        amount: trnAmt,
        description: memo,
        bankRef: refNum,
        type: standardType,
        originalType: trnType
      });
    });
  }
  console.log(`Parsed OFX successfully: ${transactions.length} transactions found`);
  return { transactions, stats };
}
async function checkBudgetNeedsApproval(budgetId, storageInstance) {
  try {
    const items = await storageInstance.getBudgetItems(budgetId);
    const budget = await storageInstance.getBudget(budgetId);
    const pricingSettings2 = await storageInstance.getPricingSettings();
    if (!pricingSettings2 || !budget) return false;
    const marginTiers = await storageInstance.getPricingMarginTiers(pricingSettings2.id);
    const budgetTotal = parseFloat(budget.totalValue || "0");
    const taxRate = parseFloat(pricingSettings2.taxRate) / 100;
    const commissionRate = parseFloat(pricingSettings2.commissionRate) / 100;
    for (const item of items) {
      const product = await storageInstance.getProduct(item.productId);
      const costPrice = product?.costPrice ? parseFloat(product.costPrice) : 0;
      if (costPrice <= 0) continue;
      let minMarginRate = null;
      if (marginTiers.length > 0) {
        const matchingTier = marginTiers.filter((t) => budgetTotal >= parseFloat(t.minRevenue || "0")).sort((a, b) => parseFloat(b.minRevenue || "0") - parseFloat(a.minRevenue || "0"))[0];
        if (matchingTier) {
          minMarginRate = parseFloat(matchingTier.minimumMarginRate) / 100;
        }
      }
      if (minMarginRate === null) {
        minMarginRate = parseFloat(pricingSettings2.minimumMargin) / 100;
      }
      const divisor = 1 - taxRate - commissionRate - minMarginRate;
      if (divisor <= 0) continue;
      const minimumPrice = Math.round(costPrice / divisor * 100) / 100;
      const unitPrice = parseFloat(item.unitPrice);
      const itemCustomization = item.hasItemCustomization ? parseFloat(item.itemCustomizationValue || "0") : 0;
      const generalCustomization = item.hasGeneralCustomization ? parseFloat(item.generalCustomizationValue || "0") : 0;
      const effectiveUnitPrice = unitPrice + itemCustomization + generalCustomization;
      if (effectiveUnitPrice < minimumPrice) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error("[checkBudgetNeedsApproval] Error:", err);
    return false;
  }
}
async function registerRoutes(app2) {
  app2.use("/uploads", express.static(path2.join(process.cwd(), "public", "uploads")));
  app2.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      await objectStorageService.downloadObject(`/objects/${req.params.objectPath}`, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });
  app2.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      console.log(`Upload request received: ${req.file.originalname}, size: ${req.file.size}, type: ${req.file.mimetype}`);
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "Arquivo muito grande. Limite de 5MB." });
      }
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Tipo de arquivo n\xE3o permitido. Use apenas imagens." });
      }
      const objectStorageService = new ObjectStorageService();
      const folder = req.body.folder || "uploads";
      const objectPath = await objectStorageService.uploadBuffer(
        req.file.buffer,
        folder,
        req.file.originalname
      );
      console.log(`File uploaded successfully: ${objectPath}`);
      res.json({ url: objectPath });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Upload error details:", {
        message: error.message,
        stack: error.stack,
        fileName: req.file?.originalname,
        fileSize: req.file?.size
      });
      const errorMessage = error.message.includes("Object Storage") ? "Erro no servi\xE7o de armazenamento. Tente novamente." : "Erro no upload do arquivo. Verifique o formato e tamanho.";
      res.status(500).json({
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.message : void 0
      });
    }
  });
  app2.patch("/api/budgets/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, observations } = req.body;
      const budget = await db.getBudget(id);
      if (!budget) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      const updatedBudget = await db.updateBudget(id, {
        status,
        clientObservations: observations || null,
        reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`Budget ${id} ${status} by client`);
      res.json(updatedBudget);
    } catch (error) {
      console.error("Error updating budget status:", error);
      res.status(500).json({ error: "Erro ao atualizar status do or\xE7amento" });
    }
  });
  app2.post("/api/budgets/:id/admin-approve", async (req, res) => {
    try {
      const { id } = req.params;
      const budget = await db.getBudget(id);
      if (!budget) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      if (budget.status !== "awaiting_approval") {
        return res.status(400).json({ error: "Or\xE7amento n\xE3o est\xE1 aguardando aprova\xE7\xE3o" });
      }
      const updatedBudget = await db.updateBudget(id, {
        status: "admin_approved",
        adminRejectionReason: null
        // Clear any previous rejection reason
      });
      console.log(`[ADMIN APPROVE] Budget ${id} approved by admin`);
      res.json(updatedBudget);
    } catch (error) {
      console.error("[ADMIN APPROVE] Error approving budget:", error);
      res.status(500).json({ error: "Erro ao aprovar or\xE7amento" });
    }
  });
  app2.post("/api/budgets/:id/admin-reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ error: "Motivo da rejei\xE7\xE3o \xE9 obrigat\xF3rio" });
      }
      const budget = await db.getBudget(id);
      if (!budget) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      if (budget.status !== "awaiting_approval") {
        return res.status(400).json({ error: "Or\xE7amento n\xE3o est\xE1 aguardando aprova\xE7\xE3o" });
      }
      const updatedBudget = await db.updateBudget(id, {
        status: "not_approved",
        adminRejectionReason: reason
      });
      console.log(`[ADMIN REJECT] Budget ${id} rejected by admin. Reason: ${reason}`);
      res.json(updatedBudget);
    } catch (error) {
      console.error("[ADMIN REJECT] Error rejecting budget:", error);
      res.status(500).json({ error: "Erro ao rejeitar or\xE7amento" });
    }
  });
  app2.get("/api/production-orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Getting production order details for: ${id}`);
      const productionOrder = await db.getProductionOrder(id);
      if (!productionOrder) {
        return res.status(404).json({ error: "Ordem de produ\xE7\xE3o n\xE3o encontrada" });
      }
      const order = await db.getOrder(productionOrder.orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido principal n\xE3o encontrado" });
      }
      const items = await db.getProductionOrderItems(productionOrder.id);
      let photos = [];
      if (order.budgetId) {
        const budgetPhotos3 = await db.getBudgetPhotos(order.budgetId);
        photos = budgetPhotos3.map((photo) => photo.imageUrl || photo.photoUrl);
      }
      let orderDetails = null;
      if (productionOrder.orderDetails) {
        try {
          orderDetails = JSON.parse(productionOrder.orderDetails);
        } catch (e) {
          console.log("Error parsing orderDetails JSON:", e);
        }
      }
      const enrichedProductionOrder = {
        ...productionOrder,
        order,
        orderDetails,
        items: items || [],
        photos: photos || []
      };
      console.log(`Production order ${id} details fetched with status: ${productionOrder.status}`);
      res.json(enrichedProductionOrder);
    } catch (error) {
      console.error("Error fetching production order details:", error);
      res.status(500).json({ error: "Erro ao buscar detalhes da ordem de produ\xE7\xE3o" });
    }
  });
  app2.get("/api/budgets/:id/review", async (req, res) => {
    try {
      const { id } = req.params;
      const budget = await db.getBudget(id);
      if (!budget) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      const items = await db.getBudgetItems(id);
      const photos = await db.getBudgetPhotos(id);
      res.json({
        ...budget,
        items,
        photos: photos.map((p) => p.photoUrl || p.imageUrl)
      });
    } catch (error) {
      console.error("Error fetching budget for review:", error);
      res.status(500).json({ error: "Erro ao buscar or\xE7amento" });
    }
  });
  app2.get("/api/budgets/vendor/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      console.log(`Fetching budgets for vendor: ${vendorId}`);
      const budgets3 = await db.getBudgetsByVendor(vendorId);
      console.log(`Found ${budgets3.length} budgets for vendor ${vendorId}`);
      const enrichedBudgets = await Promise.all(
        budgets3.map(async (budget) => {
          const items = await db.getBudgetItems(budget.id);
          return {
            ...budget,
            items
          };
        })
      );
      res.json(enrichedBudgets);
    } catch (error) {
      console.error("Error fetching budgets by vendor:", error);
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });
  app2.get("/api/debug/budget-items/:budgetId", async (req, res) => {
    try {
      const { budgetId } = req.params;
      const budget = await db.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ error: "Budget not found" });
      }
      const items = await db.getBudgetItems(budgetId);
      const producers = await db.getUsersByRole("producer");
      const debugInfo = {
        budgetId,
        budgetTitle: budget.title,
        totalItems: items.length,
        producers: producers.map((p) => ({ id: p.id, name: p.name })),
        items: items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          producerId: item.producerId || "NOT_SET",
          hasProducer: !!item.producerId && item.producerId !== "internal"
        })),
        itemsByProducer: {}
      };
      const grouped = {};
      items.forEach((item) => {
        const pid = item.producerId || "internal";
        if (!grouped[pid]) grouped[pid] = [];
        grouped[pid].push({
          productId: item.productId,
          productName: item.productName
        });
      });
      debugInfo.itemsByProducer = grouped;
      console.log(`[DEBUG ENDPOINT] Budget ${budgetId} analysis:`, debugInfo);
      res.json(debugInfo);
    } catch (error) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/settings/customization-options", requireAuth, async (req, res) => {
    try {
      const options = await db.getCustomizationOptions();
      res.json(options);
    } catch (error) {
      console.error("Error fetching customization options:", error);
      res.status(500).json({ error: "Erro ao buscar op\xE7\xF5es de personaliza\xE7\xE3o" });
    }
  });
  app2.post("/api/settings/customization-options", requireAuth, async (req, res) => {
    try {
      const { name, description, category, minQuantity, price, isActive } = req.body;
      if (!name || !category || !minQuantity || !price) {
        return res.status(400).json({ error: "Campos obrigat\xF3rios: nome, categoria, quantidade m\xEDnima e pre\xE7o" });
      }
      const newOption = await db.createCustomizationOption({
        name,
        description: description || "",
        category,
        minQuantity: parseInt(minQuantity),
        price: parseFloat(price).toFixed(2),
        isActive: isActive !== void 0 ? isActive : true,
        createdBy: req.user?.id || "6baf169c-0086-4452-b923-7541ab59ae39"
      });
      res.json(newOption);
    } catch (error) {
      console.error("Error creating customization option:", error);
      res.status(500).json({ error: "Erro ao criar op\xE7\xE3o de personaliza\xE7\xE3o" });
    }
  });
  app2.put("/api/settings/customization-options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, category, minQuantity, price, isActive } = req.body;
      if (!name || !category || !minQuantity || !price) {
        return res.status(400).json({ error: "Campos obrigat\xF3rios: nome, categoria, quantidade m\xEDnima e pre\xE7o" });
      }
      const updatedOption = await db.updateCustomizationOption(id, {
        name,
        description: description || "",
        category,
        minQuantity: parseInt(minQuantity),
        price: parseFloat(price).toFixed(2),
        isActive: isActive !== void 0 ? isActive : true
      });
      if (!updatedOption) {
        return res.status(404).json({ error: "Op\xE7\xE3o de personaliza\xE7\xE3o n\xE3o encontrada" });
      }
      res.json(updatedOption);
    } catch (error) {
      console.error("Error updating customization option:", error);
      res.status(500).json({ error: "Erro ao atualizar op\xE7\xE3o de personaliza\xE7\xE3o" });
    }
  });
  app2.delete("/api/settings/customization-options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await db.deleteCustomizationOption(id);
      if (!deleted) {
        return res.status(404).json({ error: "Op\xE7\xE3o de personaliza\xE7\xE3o n\xE3o encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customization option:", error);
      res.status(500).json({ error: "Erro ao deletar op\xE7\xE3o de personaliza\xE7\xE3o" });
    }
  });
  app2.post("/api/settings/customization-options/bulk-import", requireAuth, async (req, res) => {
    try {
      const { customizations } = req.body;
      if (!customizations || !Array.isArray(customizations)) {
        return res.status(400).json({ error: "Lista de personaliza\xE7\xF5es inv\xE1lida" });
      }
      let imported = 0;
      const errors = [];
      for (const customization of customizations) {
        try {
          if (!customization.name || !customization.category || !customization.minQuantity || customization.price === void 0) {
            errors.push(`Personaliza\xE7\xE3o "${customization.name || "sem nome"}" - campos obrigat\xF3rios faltando`);
            continue;
          }
          await db.createCustomizationOption({
            name: customization.name,
            description: customization.description || "",
            category: customization.category,
            minQuantity: parseInt(customization.minQuantity),
            price: parseFloat(customization.price).toFixed(2),
            isActive: customization.isActive !== void 0 ? customization.isActive : true,
            createdBy: req.user?.id || "6baf169c-0086-4452-b923-7541ab59ae39"
          });
          imported++;
        } catch (error) {
          errors.push(`Erro ao importar "${customization.name}": ${error.message}`);
        }
      }
      res.json({
        imported,
        total: customizations.length,
        errors: errors.slice(0, 10)
        // Limitar erros para não sobrecarregar resposta
      });
    } catch (error) {
      console.error("Error bulk importing customization options:", error);
      res.status(500).json({ error: "Erro ao importar personaliza\xE7\xF5es em lote" });
    }
  });
  app2.get("/api/customization-categories", async (req, res) => {
    try {
      const categories = await db.getCustomizationCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching customization categories:", error);
      res.status(500).json({ error: "Erro ao buscar categorias de personaliza\xE7\xE3o" });
    }
  });
  app2.post("/api/customization-categories", requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Nome da categoria \xE9 obrigat\xF3rio" });
      }
      const category = await db.createCustomizationCategory(name.trim());
      res.json(category);
    } catch (error) {
      console.error("Error creating customization category:", error);
      res.status(500).json({ error: "Erro ao criar categoria de personaliza\xE7\xE3o" });
    }
  });
  app2.get("/api/budgets/:id/pdf-data", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`=== PDF DATA REQUEST FOR BUDGET: ${id} ===`);
      const budget = await db.getBudget(id);
      if (!budget) {
        console.log(`ERROR: Budget not found: ${id}`);
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      console.log(`Found budget: ${budget.budgetNumber} - ${budget.title}`);
      const items = await db.getBudgetItems(id);
      console.log(`Found ${items.length} budget items:`, items.map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })));
      const validItems = items.filter((item) => {
        const isValid = item.productId && item.productName && item.productName.trim() !== "" && item.quantity > 0 && item.unitPrice > 0;
        if (!isValid) {
          console.log(`Filtering out invalid item for PDF:`, {
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          });
        }
        return isValid;
      });
      const uniqueValidItems = [];
      const seenItemKeys = /* @__PURE__ */ new Set();
      for (const item of validItems) {
        const itemKey = `${item.productId}-${item.producerId || "internal"}-${item.quantity}-${item.unitPrice}`;
        if (!seenItemKeys.has(itemKey)) {
          seenItemKeys.add(itemKey);
          uniqueValidItems.push(item);
        } else {
          console.log(`Removing duplicate item for PDF: ${item.productName} (${itemKey})`);
        }
      }
      console.log(`Processing ${uniqueValidItems.length} unique valid items for PDF (filtered from ${items.length} total items)`);
      const enrichedItems = await Promise.all(
        uniqueValidItems.map(async (item) => {
          const product = await db.getProduct(item.productId);
          return {
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            hasItemCustomization: item.hasItemCustomization,
            itemCustomizationPercentage: item.itemCustomizationPercentage,
            itemCustomizationDescription: item.itemCustomizationDescription,
            itemCustomizationValue: item.itemCustomizationValue,
            customizationPhoto: item.customizationPhoto,
            productWidth: item.productWidth,
            productHeight: item.productHeight,
            productDepth: item.productDepth,
            product: {
              name: product?.name || item.productName || "Produto n\xE3o encontrado",
              description: product?.description || "",
              category: product?.category || "",
              imageLink: product?.imageLink || ""
            }
          };
        })
      );
      let clientName = budget.contactName || "Cliente n\xE3o informado";
      let clientEmail = budget.contactEmail || "";
      let clientPhone = budget.contactPhone || "";
      if (budget.clientId) {
        try {
          const client2 = await db.getClient(budget.clientId);
          if (client2) {
            clientName = client2.name;
            clientEmail = client2.email || budget.contactEmail || "";
            clientPhone = client2.phone || budget.contactPhone || "";
          } else {
            const clientByUserId = await db.getClientByUserId(budget.clientId);
            if (clientByUserId) {
              clientName = clientByUserId.name;
              clientEmail = clientByUserId.email || budget.contactEmail || "";
              clientPhone = clientByUserId.phone || budget.contactPhone || "";
            }
          }
        } catch (error) {
          console.log(`Error fetching client data for PDF: ${error.message}`);
        }
      }
      console.log(`Final client data:`, { name: clientName, email: clientEmail, phone: clientPhone });
      let vendor = null;
      try {
        vendor = await db.getUser(budget.vendorId);
        console.log(`Vendor lookup - budget.vendorId: ${budget.vendorId}, found vendor:`, !!vendor);
      } catch (error) {
        console.log(`Error fetching vendor data for PDF: ${error.message}`);
      }
      const photos = await db.getBudgetPhotos(id);
      const photoUrls = photos.map((photo) => photo.imageUrl || photo.photoUrl);
      const paymentMethods2 = await db.getPaymentMethods();
      const shippingMethods2 = await db.getShippingMethods();
      const paymentInfo = await db.getBudgetPaymentInfo(id);
      let branchInfo = null;
      if (budget.branchId) {
        const branch = await db.getBranch(budget.branchId);
        if (branch) {
          branchInfo = {
            id: branch.id,
            name: branch.name,
            city: branch.city,
            cnpj: branch.cnpj || null,
            address: branch.address || null,
            email: branch.email || null,
            phone: branch.phone || null,
            isHeadquarters: branch.isHeadquarters || false
          };
          console.log(`Branch info for PDF: ${branch.name} - CNPJ: ${branch.cnpj || "N/A"} - Email: ${branch.email || "N/A"}`);
        }
      }
      const totalBudget = enrichedItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
      const pdfData = {
        budget: {
          id: budget.id,
          budgetNumber: budget.budgetNumber,
          title: budget.title,
          description: budget.description,
          clientId: budget.clientId,
          vendorId: budget.vendorId,
          branchId: budget.branchId,
          totalValue: totalBudget.toFixed(2),
          validUntil: budget.validUntil,
          deliveryDeadline: budget.deliveryDeadline,
          hasCustomization: budget.hasCustomization,
          customizationPercentage: budget.customizationPercentage,
          customizationDescription: budget.customizationDescription,
          hasDiscount: budget.hasDiscount,
          discountType: budget.discountType,
          discountPercentage: budget.discountPercentage,
          discountValue: budget.discountValue,
          createdAt: budget.createdAt,
          photos: photoUrls,
          paymentMethodId: paymentInfo?.paymentMethodId || null,
          shippingMethodId: paymentInfo?.shippingMethodId || null,
          installments: paymentInfo?.installments || 1,
          downPayment: paymentInfo?.downPayment || "0.00",
          remainingAmount: paymentInfo?.remainingAmount || "0.00",
          shippingCost: paymentInfo?.shippingCost || "0.00"
        },
        branch: branchInfo,
        items: enrichedItems,
        client: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone
        },
        vendor: {
          name: vendor?.name || "Vendedor",
          email: vendor?.email || "",
          phone: vendor?.phone || ""
        },
        paymentMethods: paymentMethods2 || [],
        shippingMethods: shippingMethods2 || []
      };
      console.log(`=== PDF DATA PREPARED ===`);
      console.log(`Budget: ${pdfData.budget.budgetNumber} - ${pdfData.budget.title}`);
      console.log(`Items: ${enrichedItems.length}`);
      console.log(`Client: ${clientName} (${clientEmail})`);
      console.log(`Vendor: ${vendor?.name || "Unknown"} (${vendor?.email || "No email"})`);
      console.log(`Total Value: R$ ${totalBudget.toFixed(2)}`);
      console.log(`=== SENDING RESPONSE ===`);
      res.json(pdfData);
    } catch (error) {
      console.error("=== ERROR IN PDF DATA ENDPOINT ===");
      console.error("Error details:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ error: "Erro ao buscar dados do or\xE7amento para PDF: " + error.message });
    }
  });
  app2.get("/api/finance/bank-transactions", async (req, res) => {
    try {
      const { status, type } = req.query;
      const all = await db.getBankTransactions();
      const normalized = (all || []).map((tx) => ({
        id: tx.id,
        importId: tx.importId || null,
        fitId: tx.fitId || null,
        date: tx.date,
        hasValidDate: !!tx.hasValidDate,
        amount: typeof tx.amount === "string" ? tx.amount : String(tx.amount),
        description: tx.description || "",
        memo: tx.memo || "",
        bankRef: tx.bankRef || "",
        originalType: tx.originalType || "",
        type: tx.type || (parseFloat(tx.amount) >= 0 ? "credit" : "debit"),
        status: tx.status || "unmatched",
        matchedOrderId: tx.matchedOrderId || null,
        matchedPaymentId: tx.matchedPaymentId || null,
        matchedAt: tx.matchedAt || null,
        notes: tx.notes || ""
      }));
      const filtered = normalized.filter((tx) => {
        const okStatus = status ? tx.status === status : true;
        const okType = type ? tx.type === type : true;
        return okStatus && okType;
      });
      console.log(`Returning ${filtered.length} bank transactions (status: ${status || "all"}, type: ${type || "all"})`);
      res.json(filtered);
    } catch (err) {
      console.error("Error fetching bank transactions:", err);
      res.status(500).json({ error: "Failed to fetch bank transactions" });
    }
  });
  app2.get("/api/finance/reconciliation", async (req, res) => {
    try {
      const [txs, orders2] = await Promise.all([
        db.getBankTransactions(),
        db.getOrders()
      ]);
      const totalTx = txs?.length || 0;
      const matched = txs?.filter((t) => t.status === "matched").length || 0;
      const unmatched = totalTx - matched;
      const pendingOrders = (orders2 || []).filter((o) => {
        const total = parseFloat(o.totalValue || "0");
        const paid = parseFloat(o.paidValue || "0");
        const remaining = total - paid;
        return o.status !== "cancelled" && remaining > 0.01;
      });
      const totalRemaining = pendingOrders.reduce((acc, o) => {
        const total = parseFloat(o.totalValue || "0");
        const paid = parseFloat(o.paidValue || "0");
        return acc + (total - paid);
      }, 0);
      console.log(`Reconciliation summary: ${totalTx} total transactions, ${matched} matched, ${unmatched} unmatched, ${pendingOrders.length} pending orders`);
      res.json({
        bank: { total: totalTx, matched, unmatched },
        orders: { pendingCount: pendingOrders.length, totalRemaining: Number(totalRemaining.toFixed(2)) },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.error("Error building reconciliation summary:", err);
      res.status(500).json({ error: "Failed to build reconciliation summary" });
    }
  });
  app2.get("/api/finance/pending-orders", async (req, res) => {
    try {
      const orders2 = await db.getOrders();
      const pendingOrders = (orders2 || []).filter((o) => {
        const total = parseFloat(o.totalValue || "0");
        const paid = parseFloat(o.paidValue || "0");
        const remaining = total - paid;
        return o.status !== "cancelled" && remaining > 0.01;
      });
      const enrichedOrders = await Promise.all(
        pendingOrders.map(async (order) => {
          let clientName = order.contactName;
          if (!clientName && order.clientId) {
            const clientRecord = await db.getClient(order.clientId);
            if (clientRecord) {
              clientName = clientRecord.name;
            } else {
              const clientByUserId = await db.getClientByUserId(order.clientId);
              if (clientByUserId) {
                clientName = clientByUserId.name;
              } else {
                const clientUser = await db.getUser(order.clientId);
                if (clientUser) {
                  clientName = clientUser.name;
                }
              }
            }
          }
          if (!clientName) {
            clientName = "Nome n\xE3o informado";
          }
          let budgetInfo = null;
          if (order.budgetId) {
            try {
              const budgetPaymentInfo2 = await db.getBudgetPaymentInfo(order.budgetId);
              if (budgetPaymentInfo2 && budgetPaymentInfo2.downPayment) {
                budgetInfo = {
                  downPayment: parseFloat(budgetPaymentInfo2.downPayment),
                  remainingAmount: parseFloat(budgetPaymentInfo2.remainingAmount || "0"),
                  installments: budgetPaymentInfo2.installments || 1
                };
              }
            } catch (error) {
              console.log("Error fetching budget info for order:", order.id, error);
            }
          }
          return {
            ...order,
            clientName,
            budgetInfo
          };
        })
      );
      console.log(`Returning ${enrichedOrders.length} pending orders for reconciliation`);
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching pending orders:", error);
      res.status(500).json({ error: "Failed to fetch pending orders" });
    }
  });
  app2.patch("/api/orders/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, userId } = req.body;
      console.log(`Cancelling order: ${id}, reason: ${reason}, by: ${userId}`);
      const order = await db.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Pedido n\xE3o encontrado" });
      }
      if (order.status === "cancelled") {
        return res.status(400).json({ error: "Pedido j\xE1 est\xE1 cancelado" });
      }
      if (order.status === "delivered" || order.status === "completed") {
        return res.status(400).json({ error: "N\xE3o \xE9 poss\xEDvel cancelar um pedido que j\xE1 foi entregue" });
      }
      const paidValue = parseFloat(order.paidValue || "0");
      await db.updateOrder(id, {
        status: "cancelled",
        paidValue: "0.00",
        refundAmount: paidValue > 0 ? paidValue.toFixed(2) : "0.00",
        cancellationReason: reason || null,
        cancelledBy: userId || req.user?.id || null,
        updatedAt: /* @__PURE__ */ new Date()
      });
      await db.updateCommissionsByOrderStatus(id, "cancelled");
      const productionOrders3 = await db.getProductionOrdersByOrder(id);
      for (const po of productionOrders3) {
        await db.updateProductionOrderStatus(po.id, "cancelled", "Pedido cancelado");
      }
      const receivables = await db.getAccountsReceivableByOrder(id);
      for (const receivable of receivables) {
        await db.updateAccountsReceivable(receivable.id, {
          receivedAmount: "0.00",
          status: "cancelled"
        });
      }
      if (paidValue > 0) {
        let clientName = order.contactName || "Cliente";
        if (order.clientId) {
          const client2 = await db.getClient(order.clientId);
          if (client2) {
            clientName = client2.name || client2.nomeFantasia || client2.razaoSocial || order.contactName || "Cliente";
          }
        }
        await db.createManualPayable({
          beneficiary: clientName,
          description: `Estorno - Pedido ${order.orderNumber} cancelado`,
          amount: paidValue.toFixed(2),
          dueDate: /* @__PURE__ */ new Date(),
          category: "Estorno",
          status: "pending",
          notes: `Reembolso autom\xE1tico gerado pelo cancelamento do pedido ${order.orderNumber}. Valor pago pelo cliente: R$ ${paidValue.toFixed(2).replace(".", ",")}`,
          orderId: id,
          clientId: order.clientId || null,
          branchId: order.branchId || null
        });
        console.log(`Refund payable created for order ${order.orderNumber}: R$ ${paidValue.toFixed(2)} to ${clientName}`);
      }
      console.log(`Order ${id} cancelled successfully - ${receivables.length} receivables also cancelled, commissions zeroed`);
      res.json({
        success: true,
        message: paidValue > 0 ? "Pedido cancelado com sucesso. Estorno registrado em Contas a Pagar." : "Pedido cancelado com sucesso",
        order: { ...order, status: "cancelled" }
      });
    } catch (error) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ error: "Erro ao cancelar pedido: " + error.message });
    }
  });
  app2.patch("/api/orders/:id/product-status", async (req, res) => {
    try {
      const { id } = req.params;
      const { productStatus } = req.body;
      console.log(`Updating product status for order ${id} to ${productStatus}`);
      const validStatuses = ["to_buy", "purchased", "in_store"];
      if (!validStatuses.includes(productStatus)) {
        return res.status(400).json({ error: "Status de produto inv\xE1lido" });
      }
      const order = await db.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Pedido n\xE3o encontrado" });
      }
      await db.updateOrder(id, {
        productStatus,
        updatedAt: /* @__PURE__ */ new Date()
      });
      console.log(`Order ${id} product status updated to ${productStatus}`);
      res.json({
        success: true,
        message: `Status do produto atualizado para ${productStatus === "to_buy" ? "Comprar Produto" : productStatus === "purchased" ? "Produto Comprado" : "Produto na Loja"}`,
        order: { ...order, productStatus }
      });
    } catch (error) {
      console.error("Error updating product status:", error);
      res.status(500).json({ error: "Erro ao atualizar status do produto: " + error.message });
    }
  });
  app2.patch("/api/vendors/:id/password", async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
      }
      const vendor = await db.getUser(id);
      if (!vendor || vendor.role !== "vendor") {
        return res.status(404).json({ error: "Vendedor n\xE3o encontrado" });
      }
      await db.updateUser(id, { password: newPassword });
      res.json({ success: true, message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Error changing vendor password:", error);
      res.status(500).json({ error: "Erro ao alterar senha: " + error.message });
    }
  });
  app2.put("/api/vendors/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      console.log(`Updating vendor ${id} with data:`, updateData);
      if (!updateData.name || updateData.name.trim().length === 0) {
        return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio" });
      }
      if (!updateData.commissionRate || isNaN(parseFloat(updateData.commissionRate))) {
        return res.status(400).json({ error: "Taxa de comiss\xE3o inv\xE1lida" });
      }
      const existingVendor = await db.getUser(id);
      if (!existingVendor) {
        return res.status(404).json({ error: "Vendedor n\xE3o encontrado" });
      }
      const userUpdates = {
        name: updateData.name.trim(),
        email: updateData.email?.trim() || null,
        phone: updateData.phone?.trim() || null,
        address: updateData.address?.trim() || null
      };
      if (updateData.password && updateData.password.trim() !== "") {
        userUpdates.password = updateData.password;
      }
      const updatedUser = await db.updateUser(id, userUpdates);
      if (!updatedUser) {
        return res.status(404).json({ error: "Erro ao atualizar dados do vendedor" });
      }
      await db.updateVendor(id, {
        branchId: updateData.branchId || null,
        commissionRate: updateData.commissionRate || "10.00",
        salesLink: updateData.salesLink || null
      });
      const vendorInfo = await db.getVendor(id);
      console.log(`Vendor ${id} updated successfully`);
      res.json({
        success: true,
        vendor: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          address: updatedUser.address,
          username: updatedUser.username,
          userCode: updatedUser.username,
          branchId: vendorInfo?.branchId || null,
          commissionRate: vendorInfo?.commissionRate || updateData.commissionRate || "10.00",
          isActive: updatedUser.isActive
        },
        message: "Vendedor atualizado com sucesso"
      });
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ error: "Erro ao atualizar vendedor: " + error.message });
    }
  });
  app2.post("/api/users", async (req, res) => {
    try {
      const { username, password, role, name, email, phone, branchId, isCommissioned } = req.body;
      if (!username || !password || !role || !name) {
        return res.status(400).json({ error: "Username, password, role and name are required" });
      }
      const existing = await db.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const newUser = await db.createUser({
        username,
        password,
        role,
        name,
        email: email || null,
        phone: phone || null,
        branchId: branchId || null,
        isCommissioned: isCommissioned !== void 0 ? isCommissioned : true,
        isActive: true
      });
      console.log(`User created successfully: ${username} with role ${role}`);
      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/users", async (req, res) => {
    try {
      const users2 = await db.getUsers();
      const clients2 = await db.getClients();
      const clientsByUserId = new Map(
        clients2.map((c) => [c.userId, c])
      );
      const seenUserIds = /* @__PURE__ */ new Set();
      const allUsers = users2.filter((u) => {
        if (u.isActive === false) {
          return false;
        }
        if (seenUserIds.has(u.id)) {
          console.log(`Skipping duplicate user: ${u.name} (${u.id})`);
          return false;
        }
        seenUserIds.add(u.id);
        return true;
      }).map((u) => {
        const clientData = clientsByUserId.get(u.id);
        if (clientData) {
          return {
            ...u,
            // Enrich with client-specific data if available
            clientId: clientData.id,
            whatsapp: clientData.whatsapp,
            cpfCnpj: clientData.cpfCnpj,
            address: clientData.address || u.address
          };
        }
        return u;
      });
      console.log(`Returning ${allUsers.length} total users (${users2.length} from users table, ${clients2.length} from clients table)`);
      console.log(`Client records:`, clients2.map((c) => ({ id: c.id, name: c.name, userId: c.userId })));
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Erro ao buscar usu\xE1rios" });
    }
  });
  app2.put("/api/users/:id/change-password", async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Senha atual e nova senha s\xE3o obrigat\xF3rias" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres" });
      }
      const user = await db.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado" });
      }
      if (user.password !== currentPassword) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }
      await db.updateUser(id, { password: newPassword });
      console.log(`Password changed for user: ${user.username}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    const { username, password, preferredRole } = req.body;
    try {
      console.log("Login attempt:", { username, preferredRole });
      const user = await db.getUserByUsername(username);
      console.log("Found user:", user ? { id: user.id, username: user.username, role: user.role } : "not found");
      if (!user || user.password !== password || !user.isActive) {
        console.log("Login failed - invalid credentials or inactive user");
        return res.status(401).json({ error: "Credenciais inv\xE1lidas" });
      }
      if (preferredRole && user.role !== preferredRole) {
        console.log(`Role mismatch: requested ${preferredRole}, user has ${user.role}`);
        return res.status(401).json({ error: "Credenciais inv\xE1lidas" });
      }
      const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString("base64");
      const { password: _, ...userWithoutPassword } = user;
      await db.logUserAction(
        user.id,
        user.name,
        user.role,
        "LOGIN",
        "auth",
        user.id,
        `Login realizado com sucesso - Role: ${user.role}`,
        "info",
        {
          username: user.username,
          role: user.role
        },
        req.ip,
        req.get("User-Agent")
      );
      console.log("Login successful for:", userWithoutPassword.username, "role:", userWithoutPassword.role);
      res.json({
        success: true,
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.post("/api/logistics/dispatch-order", async (req, res) => {
    try {
      const { productionOrderId, orderId, notes, trackingCode } = req.body;
      console.log(`Dispatching order - productionOrderId: ${productionOrderId}, orderId: ${orderId}`);
      const updatedPO = await db.updateProductionOrderStatus(
        productionOrderId,
        "shipped",
        notes,
        void 0,
        // deliveryDate
        trackingCode
      );
      if (!updatedPO) {
        return res.status(404).json({ error: "Ordem de produ\xE7\xE3o n\xE3o encontrada" });
      }
      await db.updateProductionOrder(productionOrderId, {
        shippedAt: /* @__PURE__ */ new Date()
      });
      const allProductionOrders = await db.getProductionOrdersByOrder(orderId);
      const shippedOrders = allProductionOrders.filter((po) => po.status === "shipped" || po.status === "delivered");
      const totalOrders = allProductionOrders.length;
      const shippedCount = shippedOrders.length;
      console.log(`Order ${orderId} shipping status: ${shippedCount}/${totalOrders} producers shipped`);
      let newStatus = "production";
      if (shippedCount === 0) {
        newStatus = "production";
      } else if (shippedCount === totalOrders) {
        newStatus = "shipped";
        console.log(`Order ${orderId} marked as fully shipped - all ${totalOrders} producers completed`);
      } else {
        newStatus = "partial_shipped";
        console.log(`Order ${orderId} marked as partially shipped - ${shippedCount}/${totalOrders} producers shipped`);
      }
      await db.updateOrderStatus(orderId, newStatus);
      console.log(`Order ${orderId} dispatched with tracking: ${trackingCode}, new status: ${newStatus}`);
      res.json({
        success: true,
        message: "Pedido despachado com sucesso",
        productionOrder: updatedPO,
        orderStatus: newStatus,
        shippingProgress: {
          shipped: shippedCount,
          total: totalOrders
        }
      });
    } catch (error) {
      console.error("Error dispatching order:", error);
      res.status(500).json({ error: "Erro ao despachar pedido: " + error.message });
    }
  });
  app2.post("/api/budgets", async (req, res) => {
    try {
      const budgetData = req.body;
      console.log("[CREATE BUDGET] Received budget data:", JSON.stringify(budgetData, null, 2));
      if (!budgetData.contactName) {
        return res.status(400).json({ error: "Nome de contato \xE9 obrigat\xF3rio" });
      }
      if (!budgetData.vendorId) {
        return res.status(400).json({ error: "Vendedor \xE9 obrigat\xF3rio" });
      }
      if (!budgetData.title) {
        return res.status(400).json({ error: "T\xEDtulo \xE9 obrigat\xF3rio" });
      }
      if (!budgetData.clientId || budgetData.clientId === "" || budgetData.clientId === "null") {
        budgetData.clientId = null;
      }
      if (budgetData.clientId) {
        try {
          const client2 = await db.getClient(budgetData.clientId);
          if (!client2) {
            console.log(`[CREATE BUDGET] Client ID ${budgetData.clientId} not found, setting to null`);
            budgetData.clientId = null;
          } else {
            console.log(`[CREATE BUDGET] Client validated: ${client2.name}`);
          }
        } catch (error) {
          console.log(`[CREATE BUDGET] Error validating client ID ${budgetData.clientId}, setting to null:`, error);
          budgetData.clientId = null;
        }
      }
      if (budgetData.branchId === "matriz" || !budgetData.branchId) {
        const branches2 = await db.getBranches();
        if (branches2 && branches2.length > 0) {
          budgetData.branchId = branches2[0].id;
          console.log(`[CREATE BUDGET] Replaced branchId 'matriz' with real branch ID: ${budgetData.branchId}`);
        }
      }
      let processedItems = [];
      if (budgetData.items && Array.isArray(budgetData.items)) {
        console.log(`[CREATE BUDGET] Received ${budgetData.items.length} items from frontend`);
        console.log("Validando personaliza\xE7\xF5es dos itens do or\xE7amento:", JSON.stringify(budgetData.items, null, 2));
        for (const item of budgetData.items) {
          console.log(`Item: hasItemCustomization=${item.hasItemCustomization}, selectedCustomizationId=${item.selectedCustomizationId}, quantity=${item.quantity}`);
          if (item.hasItemCustomization && item.selectedCustomizationId) {
            const customizations = await db.getCustomizationOptions();
            const customization = customizations.find((c) => c.id === item.selectedCustomizationId);
            if (customization) {
              const itemQty = typeof item.quantity === "string" ? parseInt(item.quantity) : item.quantity;
              const minQty = typeof customization.minQuantity === "string" ? parseInt(customization.minQuantity) : customization.minQuantity;
              console.log(`Valida\xE7\xE3o: itemQty=${itemQty} (${typeof item.quantity}), minQty=${minQty} (${typeof customization.minQuantity}), customization=${customization.name}`);
              if (itemQty < minQty) {
                return res.status(400).json({
                  error: `A personaliza\xE7\xE3o "${customization.name}" requer no m\xEDnimo ${minQty} unidades, mas o item "${item.productName}" tem apenas ${itemQty} unidades.`
                });
              }
            }
          }
        }
        processedItems = budgetData.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          producerId: item.producerId || "internal",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          hasItemCustomization: item.hasItemCustomization || false,
          selectedCustomizationId: item.selectedCustomizationId || null,
          itemCustomizationValue: item.itemCustomizationValue || 0,
          itemCustomizationDescription: item.itemCustomizationDescription || null,
          additionalCustomizationNotes: item.additionalCustomizationNotes || null,
          customizationPhoto: item.customizationPhoto || null,
          hasGeneralCustomization: item.hasGeneralCustomization || false,
          generalCustomizationName: item.generalCustomizationName || null,
          generalCustomizationValue: item.generalCustomizationValue || 0,
          hasItemDiscount: item.hasItemDiscount || false,
          itemDiscountType: item.itemDiscountType || "percentage",
          itemDiscountPercentage: item.itemDiscountPercentage || 0,
          itemDiscountValue: item.itemDiscountValue || 0,
          productWidth: item.productWidth || null,
          productHeight: item.productHeight || null,
          productDepth: item.productDepth || null
        }));
        console.log(`[CREATE BUDGET] Items received:`, processedItems.map((item) => ({
          productId: item.productId,
          producerId: item.producerId,
          quantity: item.quantity,
          hasGeneralCustomization: item.hasGeneralCustomization,
          generalCustomizationName: item.generalCustomizationName
        })));
      }
      delete budgetData.requiresApproval;
      const newBudget = await db.createBudget({
        ...budgetData,
        items: processedItems,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
      console.log("[CREATE BUDGET] Budget created successfully:", newBudget.id);
      try {
        const needsApproval = await checkBudgetNeedsApproval(newBudget.id, db);
        if (needsApproval) {
          console.log(`[CREATE BUDGET] Budget ${newBudget.id} has items below minimum, setting awaiting_approval`);
          await db.updateBudget(newBudget.id, { status: "awaiting_approval" });
        }
      } catch (approvalCheckError) {
        console.error(`[CREATE BUDGET] Error in server-side approval check:`, approvalCheckError);
      }
      const finalBudget = await db.getBudget(newBudget.id);
      const vendor = await db.getUser(budgetData.vendorId);
      if (vendor) {
        logger.logBudgetCreated(
          vendor.id,
          vendor.name,
          newBudget.id,
          budgetData.contactName
        ).catch(() => {
        });
      }
      res.json(finalBudget || newBudget);
    } catch (error) {
      console.error("Error creating budget:", error);
      res.status(500).json({ error: "Failed to create budget" });
    }
  });
  app2.post("/api/orders/:id/send-to-production", async (req, res) => {
    try {
      const { id } = req.params;
      const { producerId } = req.body;
      console.log(`Sending order ${id} to production. Producer filter: ${producerId || "all"}`);
      let order = await db.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Pedido n\xE3o encontrado" });
      }
      let allItems = [];
      if (order.budgetId) {
        const budgetItems2 = await db.getBudgetItems(order.budgetId);
        allItems = budgetItems2;
      } else if (order.items && Array.isArray(order.items)) {
        allItems = order.items;
      }
      console.log(`Order ${id} has ${allItems.length} total items`);
      if (!allItems || allItems.length === 0) {
        return res.status(400).json({ error: "Nenhum item encontrado no pedido" });
      }
      const itemsByProducer = /* @__PURE__ */ new Map();
      console.log(`[PRODUCTION DEBUG] Processing ${allItems.length} total items for order ${id}`);
      allItems.forEach((item, index) => {
        const itemProducerId = item.producerId || "internal";
        console.log(`[PRODUCTION DEBUG] Item ${index}: productId=${item.productId}, producerId=${itemProducerId}, productName=${item.productName || "N/A"}`);
        if (itemProducerId && itemProducerId !== "internal") {
          if (producerId) {
            if (itemProducerId === producerId) {
              if (!itemsByProducer.has(itemProducerId)) {
                itemsByProducer.set(itemProducerId, []);
              }
              itemsByProducer.get(itemProducerId).push(item);
              console.log(`[PRODUCTION DEBUG] Added item to specific producer ${itemProducerId}`);
            } else {
              console.log(`[PRODUCTION DEBUG] Skipping item - producer ${itemProducerId} doesn't match requested ${producerId}`);
            }
          } else {
            if (!itemsByProducer.has(itemProducerId)) {
              itemsByProducer.set(itemProducerId, []);
            }
            itemsByProducer.get(itemProducerId).push(item);
            console.log(`[PRODUCTION DEBUG] Added item to producer ${itemProducerId} (processing all)`);
          }
        } else {
          console.log(`[PRODUCTION DEBUG] Skipping internal item: productId=${item.productId}, producerId=${itemProducerId}`);
        }
      });
      console.log(`[PRODUCTION DEBUG] Items grouped by producer:`, Array.from(itemsByProducer.keys()));
      console.log(`[PRODUCTION DEBUG] Total producers with items: ${itemsByProducer.size}`);
      console.log(`[PRODUCTION DEBUG] Requested specific producer:`, producerId);
      console.log(`[PRODUCTION DEBUG] Processing ${itemsByProducer.size} producers`);
      if (itemsByProducer.size === 0) {
        const errorMsg = producerId ? `Nenhum item encontrado para o produtor especificado (${producerId})` : `Nenhum item de produ\xE7\xE3o externa encontrado`;
        return res.status(400).json({ error: errorMsg });
      }
      if (producerId && itemsByProducer.size !== 1) {
        console.error(`ERRO: Solicitado produtor espec\xEDfico ${producerId}, mas processando ${itemsByProducer.size} produtores`);
        return res.status(400).json({ error: "Erro interno: processamento incorreto de produtor espec\xEDfico" });
      }
      if (producerId && !itemsByProducer.has(producerId)) {
        console.error(`ERRO: Produtor espec\xEDfico ${producerId} n\xE3o encontrado nos itens agrupados`);
        return res.status(400).json({ error: `Produtor especificado n\xE3o possui itens neste pedido` });
      }
      if (producerId && !itemsByProducer.has(producerId)) {
        return res.status(400).json({ error: "Produtor especificado n\xE3o possui itens neste pedido" });
      }
      const createdOrders = [];
      const producerNames = [];
      let photos = [];
      if (order.budgetId) {
        const budgetPhotos3 = await db.getBudgetPhotos(order.budgetId);
        photos = budgetPhotos3.map((photo) => photo.imageUrl || photo.photoUrl);
      }
      for (const [currentProducerId, items] of itemsByProducer) {
        console.log(`[PRODUCTION DEBUG] Processing producer: ${currentProducerId} with ${items.length} items`);
        const producer = await db.getUser(currentProducerId);
        if (!producer) {
          console.error(`[PRODUCTION ERROR] Producer not found: ${currentProducerId}`);
          console.log(`[PRODUCTION DEBUG] Available producers:`, await db.getUsersByRole("producer"));
          continue;
        }
        console.log(`[PRODUCTION DEBUG] Found producer: ${producer.name} (ID: ${producer.id})`);
        const invalidItems = items.filter((item) => item.producerId !== currentProducerId);
        if (invalidItems.length > 0) {
          console.error(`[PRODUCTION ERROR] Found ${invalidItems.length} items not belonging to producer ${currentProducerId}:`, invalidItems);
        }
        const producerTotalValue = items.reduce(
          (sum, item) => sum + parseFloat(item.totalPrice || "0"),
          0
        );
        const producerItems = items.filter((item) => item.producerId === currentProducerId);
        const uniqueProducerItems = [];
        const seenItems = /* @__PURE__ */ new Set();
        for (const item of producerItems) {
          const itemKey = `${item.productId}-${item.producerId}-${item.quantity}-${item.unitPrice}`;
          if (!seenItems.has(itemKey)) {
            seenItems.add(itemKey);
            uniqueProducerItems.push(item);
          } else {
            console.log(`Removing duplicate production item: ${item.productName || item.productId} for producer ${currentProducerId}`);
          }
        }
        console.log(`Producer ${currentProducerId} has ${uniqueProducerItems.length} unique items (filtered from ${producerItems.length})`);
        const orderDetails = {
          orderNumber: order.orderNumber,
          product: `${order.product} - Produ\xE7\xE3o: ${producer.name}`,
          description: order.description,
          totalValue: producerTotalValue.toFixed(2),
          // Value only for this producer's items
          deadline: order.deadline,
          deliveryDeadline: order.deliveryDeadline,
          clientDetails: {
            name: order.contactName,
            phone: order.contactPhone,
            email: order.contactEmail
          },
          shippingAddress: order.deliveryType === "pickup" ? "Sede Principal - Retirada no Local" : order.shippingAddress || "Endere\xE7o n\xE3o informado",
          items: uniqueProducerItems,
          // Use unique items only
          photos,
          producerId: currentProducerId,
          // Add producer ID to identify items
          producerName: producer.name
        };
        const existingOrders = await db.getProductionOrdersByOrder(id);
        const existingForProducer = existingOrders.find((po) => po.producerId === currentProducerId);
        let productionOrder;
        if (existingForProducer) {
          console.log(`Production order already exists for producer ${currentProducerId} on order ${id} with status: ${existingForProducer.status}`);
          if (existingForProducer.status === "pending") {
            console.log(`Updating production order ${existingForProducer.id} from pending to accepted`);
            productionOrder = await db.updateProductionOrder(existingForProducer.id, {
              status: "accepted",
              orderDetails: JSON.stringify(orderDetails),
              shippingAddress: orderDetails.shippingAddress
            });
            const existingItems = await db.getProductionOrderItems(existingForProducer.id);
            const existingItemKeys = new Set(
              (existingItems || []).map((item) => {
                const customKey = item.hasItemCustomization ? `${item.itemCustomizationDescription || ""}-${item.customizationPhoto || ""}` : "";
                const generalKey = item.hasGeneralCustomization ? `${item.generalCustomizationName || ""}-${item.generalCustomizationValue || ""}` : "";
                return `${item.productId}-${item.budgetItemId || "null"}-${item.quantity}-${customKey}-${generalKey}`;
              })
            );
            const missingItems = uniqueProducerItems.filter((item) => {
              const customKey = item.hasItemCustomization ? `${item.itemCustomizationDescription || ""}-${item.customizationPhoto || ""}` : "";
              const generalKey = item.hasGeneralCustomization ? `${item.generalCustomizationName || ""}-${item.generalCustomizationValue || ""}` : "";
              const itemKey = `${item.productId}-${item.id || item.budgetItemId || "null"}-${item.quantity}-${customKey}-${generalKey}`;
              return !existingItemKeys.has(itemKey);
            });
            const itemCreationErrors = [];
            if (missingItems.length > 0) {
              console.log(`Creating ${missingItems.length} missing items for production order ${existingForProducer.id}`);
              for (const item of missingItems) {
                const itemWithBudgetId = {
                  ...item,
                  budgetItemId: item.id || item.budgetItemId || null
                };
                try {
                  await db.createProductionOrderItem(existingForProducer.id, itemWithBudgetId);
                  console.log(`\u2713 Created item: ${item.productName} (qty: ${item.quantity})`);
                } catch (error) {
                  const errorMsg = `Failed to create item ${item.productName}: ${error.message}`;
                  console.error(`\u2717 ${errorMsg}`);
                  itemCreationErrors.push(errorMsg);
                }
              }
              if (itemCreationErrors.length > 0) {
                console.error(`\u26A0\uFE0F WARNING: ${itemCreationErrors.length} items failed to create for production order ${existingForProducer.id}`);
                console.error("Failed items:", itemCreationErrors);
              }
            }
            createdOrders.push(productionOrder);
            producerNames.push(producer.name);
            console.log(`Updated production order ${productionOrder.id} for producer ${producer.name} from pending to accepted`);
          } else {
            if (producerId) {
              return res.status(400).json({
                error: `Ordem de produ\xE7\xE3o para ${producer.name} j\xE1 foi enviada anteriormente`
              });
            }
            const existingItems = await db.getProductionOrderItems(existingForProducer.id);
            const existingItemKeys = new Set(
              (existingItems || []).map((item) => {
                const customKey = item.hasItemCustomization ? `${item.itemCustomizationDescription || ""}-${item.customizationPhoto || ""}` : "";
                const generalKey = item.hasGeneralCustomization ? `${item.generalCustomizationName || ""}-${item.generalCustomizationValue || ""}` : "";
                return `${item.productId}-${item.budgetItemId || "null"}-${item.quantity}-${customKey}-${generalKey}`;
              })
            );
            const missingItems = uniqueProducerItems.filter((item) => {
              const customKey = item.hasItemCustomization ? `${item.itemCustomizationDescription || ""}-${item.customizationPhoto || ""}` : "";
              const generalKey = item.hasGeneralCustomization ? `${item.generalCustomizationName || ""}-${item.generalCustomizationValue || ""}` : "";
              const itemKey = `${item.productId}-${item.id || item.budgetItemId || "null"}-${item.quantity}-${customKey}-${generalKey}`;
              return !existingItemKeys.has(itemKey);
            });
            const itemCreationErrors = [];
            if (missingItems.length > 0) {
              console.log(`CRITICAL: Production order ${existingForProducer.id} is missing ${missingItems.length} items! Creating them now...`);
              for (const item of missingItems) {
                const itemWithBudgetId = {
                  ...item,
                  budgetItemId: item.id || item.budgetItemId || null
                };
                try {
                  await db.createProductionOrderItem(existingForProducer.id, itemWithBudgetId);
                  console.log(`\u2713 Created missing item: ${item.productName} (qty: ${item.quantity})`);
                } catch (error) {
                  const errorMsg = `Failed to create missing item ${item.productName}: ${error.message}`;
                  console.error(`\u2717 ${errorMsg}`);
                  itemCreationErrors.push(errorMsg);
                }
              }
              if (itemCreationErrors.length > 0) {
                console.error(`\u26A0\uFE0F WARNING: ${itemCreationErrors.length} items failed to create for production order ${existingForProducer.id}`);
                console.error("Failed items:", itemCreationErrors);
              }
            }
            createdOrders.push(existingForProducer);
            producerNames.push(producer.name);
          }
          continue;
        }
        productionOrder = await db.createProductionOrder({
          orderId: id,
          producerId: currentProducerId,
          status: "accepted",
          // Start as accepted since user is actively sending
          deadline: order.deadline,
          deliveryDeadline: order.deliveryDeadline,
          shippingAddress: orderDetails.shippingAddress,
          orderDetails: JSON.stringify(orderDetails),
          producerValue: "0.00",
          producerValueLocked: false
        });
        console.log(`Creating ${uniqueProducerItems.length} items for production order ${productionOrder.id}`);
        for (const item of uniqueProducerItems) {
          const itemWithBudgetId = {
            ...item,
            budgetItemId: item.id || item.budgetItemId || null
          };
          try {
            await db.createProductionOrderItem(productionOrder.id, itemWithBudgetId);
          } catch (error) {
            console.error(`Error creating production order item:`, error);
          }
        }
        createdOrders.push(productionOrder);
        producerNames.push(producer.name);
        console.log(`Created production order ${productionOrder.id} for producer ${producer.name} with ${uniqueProducerItems.length} items`);
      }
      if (createdOrders.length > 0 && order.status !== "production") {
        const allProductionOrders = await db.getProductionOrdersByOrder(id);
        const uniqueProducers = /* @__PURE__ */ new Set();
        allItems.forEach((item) => {
          if (item.producerId && item.producerId !== "internal") {
            uniqueProducers.add(item.producerId);
          }
        });
        const producersWithOrders = new Set(allProductionOrders.map((po) => po.producerId));
        if (uniqueProducers.size === producersWithOrders.size) {
          await db.updateOrder(id, { status: "production" });
        }
      }
      const message = producerId ? `Ordem de produ\xE7\xE3o criada para ${producerNames[0]}` : `Pedido enviado para produ\xE7\xE3o - ${createdOrders.length} ordem(ns) criada(s) para: ${producerNames.join(", ")}`;
      res.json({
        success: true,
        productionOrders: createdOrders,
        productionOrdersCreated: createdOrders.length,
        producerNames,
        message,
        isSpecificProducer: !!producerId
      });
    } catch (error) {
      console.error("Error sending order to production:", error);
      res.status(500).json({ error: "Erro ao enviar pedido para produ\xE7\xE3o: " + error.message });
    }
  });
  app2.get("/api/logistics/products", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 50, 1e3);
      const search = req.query.search || "";
      const category = req.query.category || "";
      const producer = req.query.producer || "";
      console.log(`Logistics products request: page=${page}, limit=${limit}, search='${search}', category='${category}', producer='${producer}'`);
      const result = await db.getProducts({
        page,
        limit,
        search,
        category,
        producer
      });
      console.log(`Logistics products result: ${result.products.length} products found, total=${result.total}`);
      const mappedProducts = result.products.map((p) => ({
        ...p,
        code: p.friendlyCode || p.externalCode || p.compositeCode || p.code || null
      }));
      res.json({
        ...result,
        products: mappedProducts
      });
    } catch (error) {
      console.error("Error fetching logistics products:", error);
      res.status(500).json({ error: "Failed to fetch logistics products: " + error.message });
    }
  });
  app2.post("/api/logistics/products", async (req, res) => {
    try {
      const productData = req.body;
      console.log("Creating logistics product:", productData);
      if (!productData.name) {
        return res.status(400).json({ error: "Nome do produto \xE9 obrigat\xF3rio" });
      }
      if (!productData.basePrice || parseFloat(productData.basePrice) <= 0) {
        return res.status(400).json({ error: "Pre\xE7o base deve ser maior que zero" });
      }
      const cleanNumericField = (value) => {
        if (value === "" || value === void 0 || value === null) return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num.toString();
      };
      const isInternal = !productData.producerId || productData.producerId === "internal";
      const newProduct = {
        ...productData,
        producerId: isInternal ? null : productData.producerId,
        type: isInternal ? "internal" : "external",
        isActive: productData.isActive !== void 0 ? productData.isActive : true,
        unit: productData.unit || "un",
        category: productData.category || "Geral",
        // Clean numeric fields
        weight: cleanNumericField(productData.weight),
        height: cleanNumericField(productData.height),
        width: cleanNumericField(productData.width),
        depth: cleanNumericField(productData.depth)
      };
      const product = await db.createProduct(newProduct);
      if (req.user && req.user.id) {
        try {
          await db.logUserAction(
            req.user.id,
            req.user.name || "Usu\xE1rio",
            req.user.role || "user",
            "CREATE",
            "products",
            product.id,
            `Produto criado: ${product.name} - Pre\xE7o: R$ ${product.basePrice}`,
            "success",
            {
              productName: product.name,
              category: product.category,
              basePrice: product.basePrice,
              producerId: product.producerId
            }
          );
        } catch (logError) {
          console.error("Error logging product creation:", logError);
        }
      }
      console.log("Logistics product created successfully:", product.id);
      res.json(product);
    } catch (error) {
      console.error("Error creating logistics product:", error);
      res.status(500).json({ error: "Erro ao criar produto: " + error.message });
    }
  });
  app2.put("/api/logistics/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      console.log(`Updating logistics product ${id}:`, updateData);
      const cleanNumericField = (value) => {
        if (value === "" || value === void 0 || value === null) return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num.toString();
      };
      const isInternal = !updateData.producerId || updateData.producerId === "internal";
      const cleanedUpdateData = {
        ...updateData,
        // Handle producerId properly
        producerId: isInternal ? null : updateData.producerId,
        type: isInternal ? "internal" : "external",
        // Clean numeric fields if they exist in the update
        weight: updateData.weight !== void 0 ? cleanNumericField(updateData.weight) : void 0,
        height: updateData.height !== void 0 ? cleanNumericField(updateData.height) : void 0,
        width: updateData.width !== void 0 ? cleanNumericField(updateData.width) : void 0,
        depth: updateData.depth !== void 0 ? cleanNumericField(updateData.depth) : void 0
      };
      Object.keys(cleanedUpdateData).forEach((key) => {
        if (cleanedUpdateData[key] === void 0) {
          delete cleanedUpdateData[key];
        }
      });
      const updatedProduct = await db.updateProduct(id, cleanedUpdateData);
      if (!updatedProduct) {
        return res.status(404).json({ error: "Produto n\xE3o encontrado" });
      }
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating logistics product:", error);
      res.status(500).json({ error: "Erro ao atualizar produto: " + error.message });
    }
  });
  app2.delete("/api/logistics/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Deleting logistics product ${id}`);
      const deleted = await db.deleteProduct(id);
      if (!deleted) {
        return res.status(404).json({ error: "Produto n\xE3o encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting logistics product:", error);
      res.status(500).json({ error: "Erro ao deletar produto: " + error.message });
    }
  });
  app2.post("/api/logistics/products/recalculate-prices", async (req, res) => {
    try {
      console.log("Recalculating product prices...");
      const result = await db.recalculateProductPrices();
      console.log(`Recalculated ${result.updated} products`);
      res.json(result);
    } catch (error) {
      console.error("Error recalculating product prices:", error);
      res.status(500).json({ error: "Erro ao recalcular pre\xE7os: " + error.message });
    }
  });
  app2.post("/api/finance/producer-payments/:id/pay", async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, notes, transactionId } = req.body;
      console.log(`Processing payment for producer payment: ${id}`, { paymentMethod, notes, transactionId });
      const updatedPayment = await db.updateProducerPayment(id, {
        status: "paid",
        paidAt: /* @__PURE__ */ new Date(),
        paymentMethod: paymentMethod || "manual",
        notes: notes || null,
        transactionId: transactionId || null,
        // Mark as manual payment to prevent OFX reconciliation
        reconciliationStatus: "manual",
        bankTransactionId: null
      });
      if (!updatedPayment) {
        return res.status(404).json({ error: "Pagamento do produtor n\xE3o encontrado" });
      }
      console.log(`Producer payment ${id} marked as paid manually (reconciliationStatus=manual)`);
      res.json({
        success: true,
        payment: updatedPayment,
        message: "Pagamento do produtor registrado com sucesso"
      });
    } catch (error) {
      console.error("Error processing producer payment:", error);
      res.status(500).json({ error: "Erro ao registrar pagamento: " + error.message });
    }
  });
  app2.post("/api/finance/producer-payments/associate-payment", async (req, res) => {
    try {
      const { transactionIds, productionOrderId } = req.body;
      console.log("Associate payment request:", { transactionIds, productionOrderId });
      if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ error: "Nenhuma transa\xE7\xE3o selecionada" });
      }
      if (!productionOrderId) {
        return res.status(400).json({ error: "ID da ordem de produ\xE7\xE3o n\xE3o informado" });
      }
      const productionOrder = await db.getProductionOrder(productionOrderId);
      if (!productionOrder) {
        return res.status(404).json({ error: "Ordem de produ\xE7\xE3o n\xE3o encontrada" });
      }
      let producerPayment = await db.getProducerPaymentByProductionOrderId(productionOrderId);
      if (!producerPayment) {
        if (!productionOrder.producerValue || parseFloat(productionOrder.producerValue) <= 0) {
          return res.status(400).json({ error: "Ordem de produ\xE7\xE3o n\xE3o possui valor definido para o produtor" });
        }
        producerPayment = await db.createProducerPayment({
          productionOrderId,
          producerId: productionOrder.producerId,
          amount: productionOrder.producerValue,
          status: "pending",
          notes: productionOrder.producerNotes || null
        });
        console.log(`Created producer payment ${producerPayment.id} for association`);
      }
      const bankTransactions2 = await Promise.all(
        transactionIds.map((id) => db.getBankTransaction(id))
      );
      const validTransactions = bankTransactions2.filter((t) => t && t.status !== "matched");
      if (validTransactions.length === 0) {
        return res.status(400).json({ error: "Nenhuma transa\xE7\xE3o v\xE1lida encontrada. As transa\xE7\xF5es podem j\xE1 ter sido conciliadas." });
      }
      const transactionTotal = validTransactions.reduce((sum, t) => {
        const amount = Math.abs(parseFloat(t.amount));
        return sum + amount;
      }, 0);
      const paymentAmount = parseFloat(producerPayment.amount);
      const difference = transactionTotal - paymentAmount;
      const hasAdjustment = Math.abs(difference) > 0.01;
      console.log(`Association: Transaction total = ${transactionTotal}, Payment amount = ${paymentAmount}, Difference = ${difference}`);
      for (const txn of validTransactions) {
        await db.updateBankTransaction(txn.id, {
          status: "matched",
          matchedOrderId: productionOrderId,
          matchedAt: /* @__PURE__ */ new Date()
        });
      }
      let producerName = "Produtor";
      if (productionOrder.producerId) {
        const producer = await db.getUser(productionOrder.producerId);
        if (producer) {
          producerName = producer.name;
        }
      }
      const updatedPayment = await db.updateProducerPayment(producerPayment.id, {
        status: "paid",
        paidAt: /* @__PURE__ */ new Date(),
        paymentMethod: "ofx",
        reconciliationStatus: "ofx_matched",
        bankTransactionId: transactionIds[0],
        // Primary transaction ID
        notes: hasAdjustment ? `Conciliado via OFX. Diferen\xE7a: R$ ${difference.toFixed(2)} (${transactionIds.length} transa\xE7\xF5es)` : `Conciliado via OFX com ${transactionIds.length} transa\xE7\xE3o(\xF5es)`
      });
      console.log(`Producer payment ${producerPayment.id} associated with ${validTransactions.length} OFX transactions`);
      res.json({
        success: true,
        payment: {
          ...updatedPayment,
          producerName,
          amount: paymentAmount.toFixed(2),
          transactionTotal: transactionTotal.toFixed(2),
          difference: difference.toFixed(2),
          hasAdjustment,
          transactionsCount: validTransactions.length
        },
        message: `Pagamento de R$ ${paymentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} conciliado com sucesso`
      });
    } catch (error) {
      console.error("Error associating producer payment:", error);
      res.status(500).json({ error: "Erro ao associar pagamento: " + error.message });
    }
  });
  app2.post("/api/finance/producer-payments/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Approving producer payment: ${id}`);
      let payment = await db.getProducerPayment(id);
      if (!payment) {
        payment = await db.getProducerPaymentByProductionOrderId(id);
      }
      if (!payment) {
        return res.status(404).json({ error: "Pagamento do produtor n\xE3o encontrado" });
      }
      if (payment.status === "paid") {
        return res.status(400).json({ error: "Este pagamento j\xE1 foi realizado" });
      }
      const updatedPayment = await db.updateProducerPayment(payment.id, {
        status: "approved",
        reconciliationStatus: "pending"
      });
      console.log(`Producer payment ${payment.id} approved for OFX reconciliation`);
      res.json({
        success: true,
        payment: updatedPayment,
        message: "Pagamento aprovado. Agora voc\xEA pode conciliar com transa\xE7\xF5es do OFX."
      });
    } catch (error) {
      console.error("Error approving producer payment:", error);
      res.status(500).json({ error: "Erro ao aprovar pagamento: " + error.message });
    }
  });
  app2.patch("/api/production-orders/:id/value", async (req, res) => {
    try {
      const { id } = req.params;
      const { value, notes } = req.body;
      if (!value || parseFloat(value) <= 0) {
        return res.status(400).json({ error: "Valor deve ser maior que zero" });
      }
      const updatedPO = await db.updateProductionOrderValue(id, value, notes, false);
      if (!updatedPO) {
        return res.status(404).json({ error: "Ordem de produ\xE7\xE3o n\xE3o encontrada" });
      }
      console.log(`Updated producer value for production order ${id} to R$ ${value} - payment will be created when marked as ready`);
      res.json(updatedPO);
    } catch (error) {
      console.error("Error updating producer value:", error);
      res.status(500).json({ error: "Erro ao atualizar valor do produtor" });
    }
  });
  app2.get("/api/finance/expenses", async (req, res) => {
    try {
      const expenses = await db.getExpenses();
      console.log(`Returning ${expenses?.length || 0} expenses for finance module`);
      res.json(expenses || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });
  app2.get("/api/admin/database/backup", requireAuth, async (req, res) => {
    try {
      console.log("Creating database backup...");
      const [
        users2,
        clients2,
        vendors2,
        partners2,
        products2,
        budgets3,
        orders2,
        productionOrders3,
        payments2,
        commissions2,
        branches2,
        paymentMethods2,
        shippingMethods2,
        customizationOptions2,
        producerPayments2,
        accountsReceivable2,
        bankTransactions2,
        expenseNotes2,
        systemLogs2
      ] = await Promise.all([
        db.getUsers(),
        db.getClients(),
        db.getVendors(),
        db.getPartners(),
        db.getProducts({ limit: 1e4 }).then((result) => result.products),
        db.getBudgets(),
        db.getOrders(),
        db.getProductionOrders(),
        db.getPayments(),
        db.getAllCommissions(),
        db.getBranches(),
        db.getAllPaymentMethods(),
        db.getAllShippingMethods(),
        db.getCustomizationOptions(),
        db.getProducerPayments(),
        db.getAccountsReceivable(),
        db.getBankTransactions(),
        db.getExpenseNotes(),
        db.getSystemLogs()
      ]);
      const allBudgetItems = [];
      for (const budget of budgets3) {
        try {
          const items = await db.getBudgetItems(budget.id);
          allBudgetItems.push(...items.map((item) => ({ ...item, budgetId: budget.id })));
        } catch (error) {
          console.log(`Error fetching items for budget ${budget.id}:`, error);
        }
      }
      const allBudgetPhotos = [];
      for (const budget of budgets3) {
        try {
          const photos = await db.getBudgetPhotos(budget.id);
          allBudgetPhotos.push(...photos.map((photo) => ({ ...photo, budgetId: budget.id })));
        } catch (error) {
          console.log(`Error fetching photos for budget ${budget.id}:`, error);
        }
      }
      const totalRecords = users2.length + clients2.length + products2.length + budgets3.length + orders2.length + allBudgetItems.length + payments2.length + commissions2.length;
      const backupData = {
        metadata: {
          exportDate: (/* @__PURE__ */ new Date()).toISOString(),
          version: "1.1",
          totalRecords,
          tables: {
            users: users2.length,
            clients: clients2.length,
            vendors: vendors2.length,
            partners: partners2.length,
            products: products2.length,
            budgets: budgets3.length,
            budgetItems: allBudgetItems.length,
            budgetPhotos: allBudgetPhotos.length,
            orders: orders2.length,
            productionOrders: productionOrders3.length,
            payments: payments2.length,
            commissions: commissions2.length,
            branches: branches2.length,
            paymentMethods: paymentMethods2.length,
            shippingMethods: shippingMethods2.length,
            customizationOptions: customizationOptions2.length,
            producerPayments: producerPayments2.length,
            accountsReceivable: accountsReceivable2.length,
            bankTransactions: bankTransactions2.length,
            expenseNotes: expenseNotes2.length,
            systemLogs: Math.min(systemLogs2.length, 1e3)
          }
        },
        data: {
          users: users2.map((u) => ({ ...u, password: "[HIDDEN]" })),
          // Hide passwords for security
          clients: clients2,
          vendors: vendors2,
          partners: partners2,
          products: products2,
          budgets: budgets3,
          budgetItems: allBudgetItems,
          budgetPhotos: allBudgetPhotos,
          orders: orders2,
          productionOrders: productionOrders3,
          payments: payments2,
          commissions: commissions2,
          branches: branches2,
          paymentMethods: paymentMethods2,
          shippingMethods: shippingMethods2,
          customizationOptions: customizationOptions2,
          producerPayments: producerPayments2,
          accountsReceivable: accountsReceivable2,
          bankTransactions: bankTransactions2,
          expenseNotes: expenseNotes2,
          systemLogs: systemLogs2.slice(0, 1e3)
          // Limit logs to prevent huge files
        }
      };
      console.log(`Database backup created successfully:`);
      console.log(`- Total records: ${totalRecords}`);
      console.log(`- Tables included: ${Object.keys(backupData.data).length}`);
      console.log(`- Export date: ${backupData.metadata.exportDate}`);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="database_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json"`);
      res.setHeader("Cache-Control", "no-cache");
      res.send(JSON.stringify(backupData, null, 2));
    } catch (error) {
      console.error("Error creating database backup:", error);
      res.status(500).json({ error: "Erro ao criar backup do banco de dados: " + error.message });
    }
  });
  app2.patch("/api/production-orders/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, deliveryDate, trackingCode } = req.body;
      console.log(`Updating production order ${id} status to: ${status}`);
      const currentPO = await db.getProductionOrder(id);
      if (!currentPO) {
        return res.status(404).json({ error: "Ordem de produ\xE7\xE3o n\xE3o encontrada" });
      }
      if (status === "ready") {
        if (!currentPO.producerValue || parseFloat(currentPO.producerValue) <= 0) {
          return res.status(400).json({
            error: "N\xE3o \xE9 poss\xEDvel marcar como pronto sem definir o valor que voc\xEA cobrar\xE1 por este pedido. Defina o valor primeiro."
          });
        }
      }
      const updatedPO = await db.updateProductionOrderStatus(id, status, notes, deliveryDate, trackingCode);
      if (!updatedPO) {
        return res.status(404).json({ error: "Ordem de produ\xE7\xE3o n\xE3o encontrada" });
      }
      if (status === "shipped" && !currentPO.shippedAt) {
        await db.updateProductionOrder(id, { shippedAt: /* @__PURE__ */ new Date() });
      }
      if (status === "delivered" && !currentPO.deliveredAt) {
        await db.updateProductionOrder(id, { deliveredAt: /* @__PURE__ */ new Date() });
      }
      console.log(`Production order ${id} status updated successfully to: ${status}`);
      if (status === "ready" && updatedPO.producerValue && parseFloat(updatedPO.producerValue) > 0) {
        const existingPayment = await db.getProducerPaymentByProductionOrderId(id);
        if (!existingPayment) {
          const payment = await db.createProducerPayment({
            productionOrderId: id,
            producerId: updatedPO.producerId,
            amount: updatedPO.producerValue,
            status: "pending",
            notes: updatedPO.producerNotes || notes || null
          });
          console.log(`[READY STATUS] Created producer payment ${payment.id} for R$ ${updatedPO.producerValue}`);
        } else {
          console.log(`[READY STATUS] Producer payment already exists for production order ${id}`);
        }
        if (updatedPO.orderId) {
          const order = await db.getOrder(updatedPO.orderId);
          if (order && order.status === "production") {
            const allProductionOrders = await db.getProductionOrdersByOrder(updatedPO.orderId);
            if (allProductionOrders.length > 0) {
              const allReady = allProductionOrders.every((po) => po.status === "ready" || po.status === "shipped" || po.status === "delivered");
              if (allReady) {
                await db.updateOrder(updatedPO.orderId, { status: "ready" });
                console.log(`[READY STATUS] Updated order ${updatedPO.orderId} status to 'ready' - all ${allProductionOrders.length} production orders are ready`);
              } else {
                const readyCount = allProductionOrders.filter((po) => po.status === "ready" || po.status === "shipped" || po.status === "delivered").length;
                console.log(`[READY STATUS] Order ${updatedPO.orderId} still in production - ${readyCount}/${allProductionOrders.length} production orders ready`);
              }
            } else {
              console.log(`[READY STATUS] Order ${updatedPO.orderId} has no production orders yet - skipping status update`);
            }
          }
        }
      }
      res.json(updatedPO);
    } catch (error) {
      console.error("Error updating production order status:", error);
      res.status(500).json({ error: "Erro ao atualizar status da ordem de produ\xE7\xE3o: " + error.message });
    }
  });
  app2.post("/api/logistics/products/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }
      let { producerId } = req.body;
      const isInternal = !producerId || producerId === "internal";
      producerId = isInternal ? null : producerId;
      if (req.file.size > 50 * 1024 * 1024) {
        return res.status(400).json({
          error: "Arquivo muito grande. O limite \xE9 de 50MB."
        });
      }
      let productsData;
      const fileExtension = req.file.originalname.split(".").pop()?.toLowerCase() || "";
      if (fileExtension === "json") {
        try {
          const fileContent = req.file.buffer.toString("utf8").replace(/^\\uFEFF/, "");
          productsData = JSON.parse(fileContent);
          if (productsData && typeof productsData === "object" && !Array.isArray(productsData)) {
            const possibleArrays = Object.values(productsData).filter((val) => Array.isArray(val));
            if (possibleArrays.length > 0) {
              productsData = possibleArrays[0];
            } else if (productsData.data && Array.isArray(productsData.data)) {
              productsData = productsData.data;
            } else if (productsData.products && Array.isArray(productsData.products)) {
              productsData = productsData.products;
            } else if (productsData.produtos && Array.isArray(productsData.produtos)) {
              productsData = productsData.produtos;
            }
          }
        } catch (parseError) {
          return res.status(400).json({
            error: "Erro ao analisar arquivo JSON. Verifique se o formato est\xE1 correto.",
            details: parseError.message
          });
        }
      } else {
        return res.status(400).json({ error: "Formato de arquivo n\xE3o suportado. Use arquivos JSON." });
      }
      if (!Array.isArray(productsData)) {
        return res.status(400).json({
          error: "O arquivo JSON deve conter um array de produtos",
          example: '[{"Nome": "Produto", "PrecoVenda": 10.50}]'
        });
      }
      if (productsData.length === 0) {
        return res.status(400).json({
          error: "O arquivo JSON est\xE1 vazio. Adicione pelo menos um produto."
        });
      }
      if (productsData.length > 1e4) {
        return res.status(400).json({
          error: "Muitos produtos no arquivo. O limite \xE9 de 10.000 produtos por importa\xE7\xE3o."
        });
      }
      console.log(`Importing ${productsData.length} products for producer ${producerId}...`);
      const result = await db.importProductsForProducer(productsData, producerId);
      console.log(`Import completed: ${result.imported} imported, ${result.errors.length} errors`);
      res.json({
        message: `${result.imported} produtos importados com sucesso para o produtor!`,
        imported: result.imported,
        total: productsData.length,
        errors: result.errors
      });
    } catch (error) {
      console.error("Logistics import error:", error);
      if (error instanceof SyntaxError) {
        return res.status(400).json({
          error: "Formato JSON inv\xE1lido. Verifique a sintaxe do arquivo.",
          details: error.message
        });
      }
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "Arquivo muito grande. O limite \xE9 de 50MB."
        });
      }
      res.status(500).json({
        error: "Erro interno do servidor ao processar importa\xE7\xE3o",
        details: error.message
      });
    }
  });
  app2.get("/api/orders/:id/shipping-details", async (req, res) => {
    try {
      const { id: orderId } = req.params;
      console.log(`Fetching shipping details for order: ${orderId}`);
      const productionOrders3 = await db.getProductionOrdersByOrder(orderId);
      console.log(`Found ${productionOrders3.length} production orders for order ${orderId}`);
      if (productionOrders3.length === 0) {
        return res.json({
          shippedCount: 0,
          totalCount: 0,
          shipmentDetails: []
        });
      }
      const shippedOrders = productionOrders3.filter((po) => po.status === "shipped" || po.status === "delivered");
      const totalCount = productionOrders3.length;
      const shippedCount = shippedOrders.length;
      console.log(`Shipping status: ${shippedCount}/${totalCount} producers have shipped`);
      const shipmentDetails = await Promise.all(
        productionOrders3.map(async (po) => {
          const producer = await db.getUser(po.producerId);
          let producerItems = [];
          if (po.orderDetails) {
            try {
              const orderDetails = JSON.parse(po.orderDetails);
              if (orderDetails.items) {
                producerItems = orderDetails.items.filter(
                  (item) => item.producerId === po.producerId
                );
              }
            } catch (e) {
              console.log(`Error parsing order details for PO ${po.id}:`, e);
            }
          }
          return {
            producerId: po.producerId,
            producerName: producer?.name || "Produtor n\xE3o encontrado",
            status: po.status,
            trackingCode: po.trackingCode,
            dispatchDate: po.status === "shipped" || po.status === "delivered" ? po.updatedAt : null,
            items: producerItems.map((item) => ({
              productName: item.productName || "Produto",
              quantity: item.quantity || 1
            }))
          };
        })
      );
      res.json({
        shippedCount,
        totalCount,
        shipmentDetails
      });
    } catch (error) {
      console.error("Error fetching shipping details:", error);
      res.status(500).json({ error: "Failed to fetch shipping details" });
    }
  });
  app2.get("/api/production-orders/producer/:producerId", async (req, res) => {
    try {
      const { producerId } = req.params;
      console.log(`Fetching production orders for producer: ${producerId}`);
      const productionOrders3 = await db.getProductionOrdersByProducer(producerId);
      console.log(`Found ${productionOrders3.length} production orders for producer ${producerId}`);
      const enrichedOrders = await Promise.all(
        productionOrders3.map(async (po) => {
          let order = await db.getOrder(po.orderId);
          if (!order) {
            console.log(`Order not found for production order: ${po.orderId}`);
            return null;
          }
          let clientName = order.contactName;
          if (!clientName && order.clientId) {
            const clientRecord = await db.getClient(order.clientId);
            if (clientRecord) {
              clientName = clientRecord.name;
            } else {
              const clientByUserId = await db.getClientByUserId(order.clientId);
              if (clientByUserId) {
                clientName = clientByUserId.name;
              } else {
                const clientUser = await db.getUser(order.clientId);
                if (clientUser) {
                  clientName = clientUser.name;
                }
              }
            }
          }
          if (!clientName) {
            clientName = "Nome n\xE3o informado";
          }
          return {
            ...po,
            orderNumber: order.orderNumber,
            product: order.product,
            clientName,
            order: {
              ...order,
              clientName,
              // Remove valores financeiros para produtores
              totalValue: void 0,
              downPayment: void 0,
              remainingAmount: void 0,
              shippingCost: void 0
            }
          };
        })
      );
      const validOrders = enrichedOrders.filter((order) => order !== null);
      console.log(`Returning ${validOrders.length} enriched production orders for producer ${producerId}`);
      res.json(validOrders);
    } catch (error) {
      console.error("Error fetching production orders for producer:", error);
      res.status(500).json({ error: "Failed to fetch production orders for producer" });
    }
  });
  app2.get("/api/finance/producer-payments/producer/:producerId", async (req, res) => {
    try {
      const { producerId } = req.params;
      console.log(`Fetching producer payments for producer: ${producerId}`);
      const producerPayments2 = await db.getProducerPaymentsByProducer(producerId);
      console.log(`Found ${producerPayments2.length} producer payments for producer ${producerId}`);
      const enrichedPayments = await Promise.all(
        producerPayments2.map(async (payment) => {
          const productionOrder = await db.getProductionOrder(payment.productionOrderId);
          let order = null;
          if (productionOrder) {
            order = await db.getOrder(productionOrder.orderId);
          }
          return {
            ...payment,
            productionOrder,
            order,
            // Add clientName, orderNumber, product from order if available
            clientName: order?.contactName || "Cliente n\xE3o encontrado",
            orderNumber: order?.orderNumber || "N/A",
            product: order?.product || "Produto n\xE3o informado"
          };
        })
      );
      console.log(`Returning ${enrichedPayments.length} enriched producer payments for producer ${producerId}`);
      res.json(enrichedPayments);
    } catch (error) {
      console.error("Error fetching producer payments for producer:", error);
      res.status(500).json({ error: "Failed to fetch producer payments for producer" });
    }
  });
  app2.get("/api/quote-requests/client/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      console.log(`Getting quote requests for client: ${clientId}`);
      const quoteRequests2 = await db.getQuoteRequestsByClient(clientId);
      console.log(`Found ${quoteRequests2.length} quote requests for client ${clientId}`);
      res.json(quoteRequests2);
    } catch (error) {
      console.error("Error fetching client quote requests:", error);
      res.status(500).json({ error: "Failed to fetch quote requests" });
    }
  });
  app2.get("/api/production-orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching production order: ${id}`);
      const productionOrder = await db.getProductionOrder(id);
      if (!productionOrder) {
        console.log(`Production order not found: ${id}`);
        return res.status(404).json({ error: "Ordem de produ\xE7\xE3o n\xE3o encontrada" });
      }
      let order = await db.getOrder(productionOrder.orderId);
      if (!order) {
        console.log(`Related order not found for production order: ${id}`);
        return res.status(404).json({ error: "Pedido relacionado n\xE3o encontrado" });
      }
      let clientName = order.contactName;
      let clientPhone = order.contactPhone;
      let clientEmail = order.contactEmail;
      let clientAddress = null;
      if (!clientName && order.clientId) {
        const clientRecord = await db.getClient(order.clientId);
        if (clientRecord) {
          clientName = clientRecord.name;
          clientPhone = clientRecord.phone || order.contactPhone;
          clientEmail = clientRecord.email || order.contactEmail;
          clientAddress = clientRecord.address;
        } else {
          const clientByUserId = await db.getClientByUserId(order.clientId);
          if (clientByUserId) {
            clientName = clientByUserId.name;
            clientPhone = clientByUserId.phone || order.contactPhone;
            clientEmail = clientByUserId.email || order.contactEmail;
            clientAddress = clientByUserId.address;
          } else {
            const clientUser = await db.getUser(order.clientId);
            if (clientUser) {
              clientName = clientUser.name;
              clientPhone = clientUser.phone || order.contactPhone;
              clientEmail = clientUser.email || order.contactEmail;
              clientAddress = clientUser.address;
            }
          }
        }
      }
      if (!clientName) {
        clientName = "Nome n\xE3o informado";
      }
      let photos = [];
      if (order.budgetId) {
        const budgetPhotos3 = await db.getBudgetPhotos(order.budgetId);
        photos = budgetPhotos3.map((photo) => photo.imageUrl || photo.photoUrl);
      }
      let orderDetails = null;
      if (productionOrder.orderDetails) {
        try {
          const parsedDetails = JSON.parse(productionOrder.orderDetails);
          if (parsedDetails.items && parsedDetails.producerId) {
            const filteredItems = parsedDetails.items.filter(
              (item) => item.producerId === parsedDetails.producerId || item.producerId === productionOrder.producerId
            );
            const uniqueItems = filteredItems.filter(
              (item, index, self) => self.findIndex(
                (i) => i.productId === item.productId && i.producerId === item.producerId && i.quantity === item.quantity && i.unitPrice === item.unitPrice
              ) === index
            );
            console.log(`Producer ${parsedDetails.producerId}: Filtered ${filteredItems.length} items down to ${uniqueItems.length} unique items`);
            parsedDetails.items = uniqueItems.map((item) => ({
              ...item,
              unitPrice: void 0,
              totalPrice: void 0,
              itemCustomizationValue: void 0,
              generalCustomizationValue: void 0,
              itemDiscountValue: void 0,
              itemDiscountPercentage: void 0,
              discountValue: void 0,
              discountPercentage: void 0
            }));
            parsedDetails.totalValue = void 0;
            parsedDetails.downPayment = void 0;
            parsedDetails.remainingAmount = void 0;
            parsedDetails.shippingCost = void 0;
            parsedDetails.discountValue = void 0;
            parsedDetails.discountPercentage = void 0;
            console.log(`Filtered items for producer ${parsedDetails.producerId}: ${parsedDetails.items.length} unique items`);
          }
          orderDetails = parsedDetails;
        } catch (e) {
          console.log(`Error parsing order details for production order ${id}:`, e);
        }
      }
      const enrichedProductionOrder = {
        ...productionOrder,
        order: {
          ...order,
          clientName,
          clientPhone,
          clientEmail,
          clientAddress,
          shippingAddress: order.deliveryType === "pickup" ? "Sede Principal - Retirada no Local" : clientAddress || "Endere\xE7o n\xE3o informado"
        },
        photos,
        orderDetails
      };
      console.log(`Returning enriched production order: ${id}`);
      res.json(enrichedProductionOrder);
    } catch (error) {
      console.error("Error fetching production order:", error);
      res.status(500).json({ error: "Erro ao buscar ordem de produ\xE7\xE3o: " + error.message });
    }
  });
  app2.get("/api/auth/verify", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      console.log("No token provided");
      return res.status(401).json({ error: "Token n\xE3o fornecido" });
    }
    try {
      console.log("Verifying token:", token.substring(0, 20) + "...");
      const decoded = Buffer.from(token, "base64").toString();
      console.log("Decoded token:", decoded);
      const tokenParts = decoded.split(":");
      if (tokenParts.length !== 3) {
        console.log("Invalid token format, parts:", tokenParts.length);
        return res.status(401).json({ error: "Formato de token inv\xE1lido" });
      }
      const [userId, username, timestamp2] = tokenParts;
      console.log("Token parts - userId:", userId, "username:", username, "timestamp:", timestamp2);
      const tokenTimestamp = parseInt(timestamp2);
      if (isNaN(tokenTimestamp)) {
        console.log("Invalid timestamp:", timestamp2);
        return res.status(401).json({ error: "Token inv\xE1lido" });
      }
      const tokenAge = Date.now() - tokenTimestamp;
      if (tokenAge > 24 * 60 * 60 * 1e3) {
        console.log("Token expired, age:", tokenAge);
        return res.status(401).json({ error: "Token expirado" });
      }
      const user = await db.getUser(userId);
      console.log("User found:", user ? `${user.id} - ${user.username}` : "not found");
      if (!user) {
        console.log("User not found for ID:", userId);
        return res.status(401).json({ error: "Usu\xE1rio n\xE3o encontrado" });
      }
      if (!user.isActive) {
        console.log("User inactive:", userId);
        return res.status(401).json({ error: "Usu\xE1rio inativo" });
      }
      if (user.username !== username) {
        console.log("Username mismatch. Token:", username, "User:", user.username);
        return res.status(401).json({ error: "Token inv\xE1lido" });
      }
      console.log("Token verification successful for user:", user.username);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(401).json({ error: "Erro na verifica\xE7\xE3o do token" });
    }
  });
  app2.get("/api/dashboard/stats", async (req, res) => {
    try {
      const orders2 = await db.getOrders();
      const users2 = await db.getUsers();
      const payments2 = await db.getPayments();
      const products2 = await db.getProducts();
      const budgets3 = await db.getBudgets();
      const today = (/* @__PURE__ */ new Date()).toDateString();
      const ordersToday = orders2.filter(
        (order) => order.createdAt && new Date(order.createdAt).toDateString() === today
      ).length;
      const inProduction = orders2.filter(
        (order) => order.status === "production"
      ).length;
      const monthlyRevenue = orders2.filter((order) => {
        if (!order.createdAt) return false;
        const orderMonth = new Date(order.createdAt).getMonth();
        const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
        return orderMonth === currentMonth && order.status !== "cancelled";
      }).reduce((total, order) => total + parseFloat(order.totalValue), 0);
      const pendingPayments = payments2.filter((payment) => payment.status === "pending").reduce((total, payment) => total + parseFloat(payment.amount), 0);
      res.json({
        ordersToday,
        inProduction,
        monthlyRevenue,
        pendingPayments,
        totalOrders: orders2.length,
        totalClients: (await db.getClients()).length,
        totalVendors: users2.filter((u) => u.role === "vendor").length,
        totalProducers: users2.filter((u) => u.role === "producer").length,
        totalProducts: products2.total,
        totalBudgets: budgets3.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });
  app2.post("/api/orders", async (req, res) => {
    try {
      const orderData = req.body;
      console.log("Received order data:", orderData);
      if (orderData.branchId === "matriz" || !orderData.branchId) {
        const branches2 = await db.getBranches();
        if (branches2 && branches2.length > 0) {
          orderData.branchId = branches2[0].id;
          console.log(`[CREATE ORDER] Replaced branchId 'matriz' with real branch ID: ${orderData.branchId}`);
        }
      }
      if (!orderData.contactName) {
        return res.status(400).json({ error: "Nome de contato \xE9 obrigat\xF3rio" });
      }
      if (!orderData.vendorId) {
        return res.status(400).json({ error: "Vendedor \xE9 obrigat\xF3rio" });
      }
      if (!orderData.product && !orderData.title) {
        return res.status(400).json({ error: "Produto/t\xEDtulo \xE9 obrigat\xF3rio" });
      }
      let orderWarnings = [];
      if (req.body.items && req.body.items.length > 0) {
        console.log("Validando personaliza\xE7\xF5es dos itens:", JSON.stringify(req.body.items, null, 2));
        for (const item of req.body.items) {
          console.log(`Item: hasItemCustomization=${item.hasItemCustomization}, selectedCustomizationId=${item.selectedCustomizationId}, quantity=${item.quantity}`);
          if (item.hasItemCustomization && item.selectedCustomizationId) {
            const customizations = await db.getCustomizationOptions();
            const customization = customizations.find((c) => c.id === item.selectedCustomizationId);
            if (customization) {
              const itemQty = typeof item.quantity === "string" ? parseInt(item.quantity) : item.quantity;
              const minQty = typeof customization.minQuantity === "string" ? parseInt(customization.minQuantity) : customization.minQuantity;
              console.log(`Valida\xE7\xE3o: itemQty=${itemQty} (${typeof item.quantity}), minQty=${minQty} (${typeof customization.minQuantity}), customization=${customization.name}`);
              if (itemQty < minQty) {
                console.log(`ALERTA: ${itemQty} < ${minQty} - Salvando pedido mesmo assim`);
                orderWarnings.push(`A personaliza\xE7\xE3o "${customization.name}" requer no m\xEDnimo ${minQty} unidades, mas o item "${item.productName}" tem ${itemQty} unidades.`);
              } else {
                console.log(`APROVADO: ${itemQty} >= ${minQty}`);
              }
            }
          }
        }
      }
      let finalClientId = null;
      if (orderData.clientId && orderData.clientId !== "") {
        const clientRecord = await db.getClient(orderData.clientId);
        if (clientRecord) {
          finalClientId = clientRecord.id;
          console.log("Using client record by id:", clientRecord.name, "clientId:", clientRecord.id);
        } else {
          const clientByUserId = await db.getClientByUserId(orderData.clientId);
          if (clientByUserId) {
            finalClientId = clientByUserId.id;
            console.log("Using client by userId:", clientByUserId.name, "clientId:", clientByUserId.id);
          }
        }
      }
      console.log("Final clientId for order:", finalClientId);
      const orderNumber = `PED-${Date.now()}`;
      let uniqueItems = [];
      if (orderData.items && orderData.items.length > 0) {
        const seenItems = /* @__PURE__ */ new Set();
        uniqueItems = orderData.items.filter((item) => {
          const itemKey = `${item.productId}-${item.producerId || "internal"}-${item.quantity}-${item.unitPrice}`;
          if (seenItems.has(itemKey)) {
            console.log(`Removing duplicate item: ${item.productName} (${itemKey})`);
            return false;
          }
          seenItems.add(itemKey);
          return true;
        });
        console.log(`Filtered ${orderData.items.length} items down to ${uniqueItems.length} unique items`);
      }
      const vendor = await db.getVendor(orderData.vendorId);
      const vendorBranchId = vendor?.branchId || null;
      const newOrder = await db.createOrder({
        orderNumber,
        clientId: finalClientId,
        // Can be null if no client selected
        vendorId: orderData.vendorId,
        branchId: vendorBranchId,
        // Associate order with vendor's branch
        budgetId: orderData.budgetId || null,
        product: orderData.product || orderData.title,
        description: orderData.description || "",
        totalValue: orderData.totalValue || "0.00",
        status: orderData.status || "confirmed",
        deadline: orderData.deadline ? new Date(orderData.deadline) : null,
        deliveryDeadline: orderData.deliveryDeadline ? new Date(orderData.deliveryDeadline) : null,
        // Contact information is required and primary
        contactName: orderData.contactName,
        contactPhone: orderData.contactPhone || "",
        contactEmail: orderData.contactEmail || "",
        deliveryType: orderData.deliveryType || "delivery",
        paymentMethodId: orderData.paymentMethodId || "",
        shippingMethodId: orderData.shippingMethodId || "",
        installments: orderData.installments || 1,
        downPayment: orderData.downPayment || 0,
        remainingAmount: orderData.remainingAmount || 0,
        shippingCost: orderData.shippingCost || 0,
        hasDiscount: orderData.hasDiscount || false,
        discountType: orderData.discountType || "percentage",
        discountPercentage: orderData.discountPercentage || 0,
        discountValue: orderData.discountValue || 0,
        items: uniqueItems
      });
      console.log("Created order with contact name:", newOrder.contactName);
      logger.logOrderCreated(
        orderData.vendorId,
        vendor?.name || "Vendedor",
        newOrder.id,
        newOrder.contactName
      ).catch(() => {
      });
      const response = {
        ...newOrder,
        warnings: orderWarnings.length > 0 ? orderWarnings : void 0
      };
      res.json(response);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order: " + error.message });
    }
  });
  app2.put("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      console.log(`Updating order ${id} with data:`, updateData);
      const originalOrder = await db.getOrder(id);
      if (!originalOrder) {
        return res.status(404).json({ error: "Pedido n\xE3o encontrado" });
      }
      const updatedOrder = await db.updateOrder(id, updateData);
      if (!updatedOrder) {
        return res.status(404).json({ error: "Erro ao atualizar pedido" });
      }
      if (updateData.status === "cancelled") {
        console.log(`Order ${id} cancelled - updating related commissions and payments`);
        await db.updateCommissionsByOrderStatus(id, "cancelled");
      }
      const originalValue = parseFloat(originalOrder.totalValue || "0");
      const newValue = parseFloat(updatedOrder.totalValue || "0");
      if (originalValue !== newValue && updateData.status !== "cancelled") {
        console.log(`Order ${id} value changed from ${originalValue} to ${newValue} - recalculating commissions`);
        await db.recalculateCommissionsForOrder(updatedOrder);
        console.log(`Commissions recalculated for order ${id}`);
      }
      console.log(`Updating accounts receivable for order ${id}`);
      await db.updateAccountsReceivableForOrder(updatedOrder);
      console.log(`Accounts receivable updated for order ${id}`);
      if (updateData.items && Array.isArray(updateData.items) && updateData.items.length > 0) {
        console.log(`Order ${id} items updated - syncing production orders`);
        const existingProductionOrders = await db.getProductionOrdersByOrder(id);
        const producerGroups = /* @__PURE__ */ new Map();
        for (const item of updateData.items) {
          const producerId = item.producerId || "internal";
          if (!producerGroups.has(producerId)) {
            producerGroups.set(producerId, []);
          }
          producerGroups.get(producerId).push(item);
        }
        const deliveryDeadline = updatedOrder.deliveryDeadline || /* @__PURE__ */ new Date();
        for (const [producerId, items] of producerGroups.entries()) {
          if (producerId === "internal") continue;
          const existingPO = existingProductionOrders.find((po) => po.producerId === producerId);
          if (existingPO) {
            const itemsDescription = items.map((i) => `${i.productName} (${i.quantity}x)`).join(", ");
            await db.updateProductionOrderStatus(
              existingPO.id,
              existingPO.status,
              `Itens atualizados: ${itemsDescription}`
            );
            console.log(`Updated production order ${existingPO.id} for producer ${producerId}`);
          } else {
            const productionOrderData = {
              orderId: id,
              producerId,
              status: "pending",
              deadline: typeof deliveryDeadline === "string" ? new Date(deliveryDeadline) : deliveryDeadline,
              deliveryDeadline: typeof deliveryDeadline === "string" ? new Date(deliveryDeadline) : deliveryDeadline,
              notes: `Itens: ${items.map((i) => `${i.productName} (${i.quantity}x)`).join(", ")}`
            };
            const newPO = await db.createProductionOrder(productionOrderData);
            console.log(`Created new production order ${newPO.id} for producer ${producerId}`);
            for (const item of items) {
              await db.createProductionOrderItem(newPO.id, {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice?.toString() || "0",
                totalPrice: item.totalPrice?.toString() || "0"
              });
            }
          }
        }
        const newProducerIds = Array.from(producerGroups.keys());
        for (const existingPO of existingProductionOrders) {
          if (!newProducerIds.includes(existingPO.producerId) && existingPO.status === "pending") {
            await db.updateProductionOrderStatus(existingPO.id, "cancelled", "Produtor removido do pedido");
            console.log(`Cancelled production order ${existingPO.id} - producer removed from order`);
          }
        }
        console.log(`Production orders synced for order ${id}`);
      }
      if (req.user?.role === "vendor") {
        logger.logOrderUpdated(
          req.user.id,
          req.user.name,
          id,
          `Status: ${updatedOrder.status}`
        ).catch(() => {
        });
      } else {
        db.logUserAction(
          req.user?.id || "system",
          req.user?.name || "Sistema",
          req.user?.role || "system",
          "UPDATE",
          "orders",
          id,
          `Pedido atualizado: ${updatedOrder.orderNumber} - Status: ${updatedOrder.status}`,
          "info",
          { orderNumber: updatedOrder.orderNumber, changes: updateData, newStatus: updatedOrder.status },
          void 0,
          void 0,
          updatedOrder.vendorId
        ).catch(() => {
        });
      }
      console.log(`Order ${id} updated successfully with cascading updates`);
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Erro ao atualizar pedido: " + error.message });
    }
  });
  app2.get("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let order = await db.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Pedido n\xE3o encontrado" });
      }
      let clientName = order.contactName;
      if (!clientName && order.clientId) {
        const clientRecord = await db.getClient(order.clientId);
        if (clientRecord) {
          clientName = clientRecord.name;
        } else {
          const clientByUserId = await db.getClientByUserId(order.clientId);
          if (clientByUserId) {
            clientName = clientByUserId.name;
          } else {
            const clientUser = await db.getUser(order.clientId);
            if (clientUser) {
              clientName = clientUser.name;
            }
          }
        }
      }
      if (!clientName) {
        clientName = "Nome n\xE3o informado";
      }
      let clientAddress = null;
      let clientPhone = order.contactPhone || null;
      let clientEmail = order.contactEmail || null;
      if (order.clientId) {
        const clientRecord = await db.getClient(order.clientId);
        if (clientRecord) {
          if (clientRecord.enderecoEntregaLogradouro) {
            clientAddress = `${clientRecord.enderecoEntregaLogradouro}, ${clientRecord.enderecoEntregaNumero || "s/n"}${clientRecord.enderecoEntregaComplemento ? ` - ${clientRecord.enderecoEntregaComplemento}` : ""}, ${clientRecord.enderecoEntregaBairro || ""}, ${clientRecord.enderecoEntregaCidade || ""}, CEP: ${clientRecord.enderecoEntregaCep || ""}`;
          } else if (clientRecord.address) {
            clientAddress = clientRecord.address;
          }
          if (!clientPhone) clientPhone = clientRecord.phone || null;
          if (!clientEmail) clientEmail = clientRecord.email || null;
        } else {
          const clientByUserId = await db.getClientByUserId(order.clientId);
          if (clientByUserId) {
            if (clientByUserId.enderecoEntregaLogradouro) {
              clientAddress = `${clientByUserId.enderecoEntregaLogradouro}, ${clientByUserId.enderecoEntregaNumero || "s/n"}${clientByUserId.enderecoEntregaComplemento ? ` - ${clientByUserId.enderecoEntregaComplemento}` : ""}, ${clientByUserId.enderecoEntregaBairro || ""}, ${clientByUserId.enderecoEntregaCidade || ""}, CEP: ${clientByUserId.enderecoEntregaCep || ""}`;
            } else if (clientByUserId.address) {
              clientAddress = clientByUserId.address;
            }
            if (!clientPhone) clientPhone = clientByUserId.phone || null;
            if (!clientEmail) clientEmail = clientByUserId.email || null;
          } else {
            const clientUser = await db.getUser(order.clientId);
            if (clientUser) {
              clientAddress = clientUser.address || null;
              if (!clientPhone) clientPhone = clientUser.phone || null;
              if (!clientEmail) clientEmail = clientUser.email || null;
            }
          }
        }
      }
      const finalShippingAddress = order.shippingAddress || clientAddress || null;
      const vendor = await db.getUser(order.vendorId);
      const producer = order.producerId ? await db.getUser(order.producerId) : null;
      let budgetPhotos3 = [];
      let budgetItems2 = [];
      if (order.budgetId) {
        const photos = await db.getBudgetPhotos(order.budgetId);
        budgetPhotos3 = photos.map((photo) => photo.imageUrl || photo.photoUrl);
        const items = await db.getBudgetItems(order.budgetId);
        budgetItems2 = await Promise.all(
          items.map(async (item) => {
            const product = await db.getProduct(item.productId);
            return {
              ...item,
              product: {
                name: product?.name || "Produto n\xE3o encontrado",
                description: product?.description || "",
                category: product?.category || "",
                imageLink: product?.imageLink || ""
              }
            };
          })
        );
      }
      let productionOrder = null;
      if (order.producerId) {
        const productionOrders3 = await db.getProductionOrdersByOrder(order.id);
        productionOrder = productionOrders3[0] || null;
      }
      const payments2 = await db.getPaymentsByOrder(order.id);
      const confirmedPayments = payments2.filter((payment) => payment.status === "confirmed");
      const totalPaid = confirmedPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      let budgetDownPayment = 0;
      let originalBudgetInfo = null;
      if (order.budgetId) {
        try {
          const budget = await db.getBudget(order.budgetId);
          const budgetPaymentInfo2 = await db.getBudgetPaymentInfo(order.budgetId);
          if (budgetPaymentInfo2 && budgetPaymentInfo2.downPayment) {
            budgetDownPayment = parseFloat(budgetPaymentInfo2.downPayment);
            originalBudgetInfo = {
              downPayment: budgetDownPayment,
              remainingAmount: parseFloat(budgetPaymentInfo2.remainingAmount || "0"),
              installments: budgetPaymentInfo2.installments || 1
            };
          }
        } catch (error) {
          console.log("Error fetching budget info for order:", order.id, error);
        }
      }
      const totalValue = parseFloat(order.totalValue);
      const actualPaidValue = Math.max(totalPaid, parseFloat(order.paidValue || "0"));
      const remainingBalance = Math.max(0, totalValue - actualPaidValue);
      console.log(`Order ${order.orderNumber}: Total=${totalValue}, BudgetDownPayment=${budgetDownPayment}, Paid=${totalPaid}, ActualPaid=${actualPaidValue}, Remaining=${remainingBalance}`);
      const enrichedOrder = {
        ...order,
        clientName,
        vendorName: vendor?.name || "Vendedor",
        producerName: producer?.name || null,
        budgetPhotos: budgetPhotos3,
        budgetItems: budgetItems2,
        trackingCode: order.trackingCode || productionOrder?.trackingCode || null,
        estimatedDelivery: productionOrder?.deliveryDeadline || null,
        payments: payments2.filter((p) => p.status === "confirmed"),
        budgetInfo: originalBudgetInfo,
        paidValue: actualPaidValue.toFixed(2),
        remainingValue: remainingBalance.toFixed(2),
        shippingAddress: finalShippingAddress,
        clientAddress,
        clientPhone,
        clientEmail
      };
      res.json(enrichedOrder);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });
  app2.get("/api/orders", async (req, res) => {
    try {
      const orders2 = await db.getOrders();
      const enrichedOrders = await Promise.all(
        orders2.map(async (order) => {
          let clientName = order.contactName;
          if (!clientName && order.clientId) {
            const clientRecord = await db.getClient(order.clientId);
            if (clientRecord) {
              clientName = clientRecord.name;
            } else {
              const clientByUserId = await db.getClientByUserId(order.clientId);
              if (clientByUserId) {
                clientName = clientByUserId.name;
              } else {
                const clientUser = await db.getUser(order.clientId);
                if (clientUser) {
                  clientName = clientUser.name;
                }
              }
            }
          }
          if (!clientName) {
            clientName = "Nome n\xE3o informado";
          }
          const vendor = await db.getUser(order.vendorId);
          const producer = order.producerId ? await db.getUser(order.producerId) : null;
          let budgetPhotos3 = [];
          let budgetItems2 = [];
          if (order.budgetId) {
            const photos = await db.getBudgetPhotos(order.budgetId);
            budgetPhotos3 = photos.map((photo) => photo.imageUrl || photo.photoUrl);
            const items = await db.getBudgetItems(order.budgetId);
            budgetItems2 = await Promise.all(
              items.map(async (item) => {
                const product = await db.getProduct(item.productId);
                return {
                  ...item,
                  product: {
                    name: product?.name || "Produto n\xE3o encontrado",
                    description: product?.description || "",
                    category: product?.category || "",
                    imageLink: product?.imageLink || ""
                  }
                };
              })
            );
          }
          let hasUnreadNotes = false;
          if (order.producerId) {
            const productionOrders3 = await db.getProductionOrdersByOrder(order.id);
            hasUnreadNotes = productionOrders3.some((po) => po.hasUnreadNotes);
          }
          return {
            ...order,
            clientName,
            // Never use fallback 'Unknown'
            vendorName: vendor?.name || "Vendedor",
            producerName: producer?.name || null,
            budgetPhotos: budgetPhotos3,
            budgetItems: budgetItems2,
            hasUnreadNotes
          };
        })
      );
      res.json(enrichedOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  app2.get("/api/tv-dashboard/sales", async (req, res) => {
    try {
      const budgets3 = await db.getBudgets();
      const convertedBudgets = budgets3.filter((b) => b.status === "converted");
      const salesData = await Promise.all(
        convertedBudgets.map(async (budget) => {
          let vendorName = "Vendedor";
          if (budget.vendorId) {
            const vendor = await db.getUser(budget.vendorId);
            vendorName = vendor?.name || vendorName;
          }
          let clientCity = "";
          let clientState = "";
          if (budget.clientId) {
            const client2 = await db.getClient(budget.clientId);
            if (client2) {
              clientCity = client2.cidade || "";
            }
          }
          let branchState = "";
          let branchCity = "";
          if (budget.branchId) {
            const branch = await db.getBranch(budget.branchId);
            if (branch) {
              branchState = branch.estado || "";
              branchCity = branch.city || "";
              if (!clientCity) clientCity = branchCity;
            }
          }
          const items = await db.getBudgetItems(budget.id);
          const budgetItems2 = await Promise.all(
            items.map(async (item) => {
              const product = await db.getProduct(item.productId);
              return {
                productId: item.productId,
                productName: product?.name || "Produto",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                imageLink: product?.imageLink || ""
              };
            })
          );
          return {
            id: budget.id,
            vendorId: budget.vendorId,
            vendorName,
            branchId: budget.branchId || null,
            clientId: budget.clientId || null,
            contactName: budget.contactName || "",
            totalValue: budget.totalValue,
            status: budget.status,
            createdAt: budget.createdAt,
            budgetItems: budgetItems2,
            clientCity,
            clientState: branchState || clientState
          };
        })
      );
      res.json(salesData);
    } catch (error) {
      console.error("Error fetching TV dashboard sales:", error);
      res.status(500).json({ error: "Failed to fetch TV dashboard sales" });
    }
  });
  app2.get("/api/orders/vendor/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const orders2 = await db.getOrdersByVendor(vendorId);
      const enrichedOrders = await Promise.all(
        orders2.map(async (order) => {
          let clientName = order.contactName;
          if (!clientName && order.clientId) {
            console.log(`Contact name missing for order ${order.orderNumber}, looking for client name with ID: ${order.clientId}`);
            const clientRecord = await db.getClient(order.clientId);
            if (clientRecord) {
              console.log(`Found client record:`, clientRecord);
              clientName = clientRecord.name;
            } else {
              const clientByUserId = await db.getClientByUserId(order.clientId);
              if (clientByUserId) {
                console.log(`Found client by userId:`, clientByUserId);
                clientName = clientByUserId.name;
              } else {
                const clientUser = await db.getUser(order.clientId);
                if (clientUser) {
                  console.log(`Found user record:`, clientUser);
                  clientName = clientUser.name;
                }
              }
            }
          }
          if (!clientName) {
            clientName = "Nome n\xE3o informado";
          }
          let budgetPhotos3 = [];
          let budgetItems2 = [];
          if (order.budgetId) {
            const photos = await db.getBudgetPhotos(order.budgetId);
            budgetPhotos3 = photos.map((photo) => photo.imageUrl || photo.photoUrl);
            const items = await db.getBudgetItems(order.budgetId);
            budgetItems2 = await Promise.all(
              items.map(async (item) => {
                const product = await db.getProduct(item.productId);
                return {
                  ...item,
                  product: {
                    name: product?.name || "Produto n\xE3o encontrado",
                    description: product?.description || "",
                    category: product?.category || "",
                    imageLink: product?.imageLink || ""
                  }
                };
              })
            );
          }
          return {
            ...order,
            clientName,
            // Never use fallback 'Unknown'
            budgetPhotos: budgetPhotos3,
            budgetItems: budgetItems2
          };
        })
      );
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
      res.status(500).json({ error: "Failed to fetch vendor orders" });
    }
  });
  app2.get("/api/orders/client/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      console.log(`Fetching orders for client: ${clientId}`);
      let orders2 = [];
      const allOrders = await db.getOrders();
      console.log(`Total orders in system: ${allOrders.length}`);
      for (const order of allOrders) {
        let shouldInclude = false;
        if (order.clientId === clientId) {
          shouldInclude = true;
        }
        if (!shouldInclude) {
          try {
            const clientRecord = await db.getClientByUserId(clientId);
            if (clientRecord && order.clientId === clientRecord.id) {
              shouldInclude = true;
            }
          } catch (e) {
          }
        }
        if (!shouldInclude) {
          try {
            const orderClientRecord = await db.getClient(order.clientId);
            if (orderClientRecord && orderClientRecord.userId === clientId) {
              shouldInclude = true;
            }
          } catch (e) {
          }
        }
        if (shouldInclude) {
          orders2.push(order);
        }
      }
      const uniqueOrders = orders2.filter(
        (order, index, self) => index === self.findIndex((o) => o.id === order.id)
      );
      console.log(`Found ${uniqueOrders.length} unique orders for client ${clientId}`);
      const enrichedOrders = await Promise.all(
        uniqueOrders.map(async (order) => {
          let clientName = order.contactName;
          if (!clientName && order.clientId) {
            const clientRecord = await db.getClient(order.clientId);
            if (clientRecord) {
              clientName = clientRecord.name;
            } else {
              const clientByUserId = await db.getClientByUserId(order.clientId);
              if (clientByUserId) {
                clientName = clientByUserId.name;
              } else {
                const clientUser = await db.getUser(order.clientId);
                if (clientUser) {
                  clientName = clientUser.name;
                }
              }
            }
          }
          if (!clientName) {
            clientName = "Nome n\xE3o informado";
          }
          let budgetPhotos3 = [];
          let budgetItems2 = [];
          if (order.budgetId) {
            const photos = await db.getBudgetPhotos(order.budgetId);
            budgetPhotos3 = photos.map((photo) => photo.imageUrl || photo.photoUrl);
            const items = await db.getBudgetItems(order.budgetId);
            budgetItems2 = await Promise.all(
              items.map(async (item) => {
                const product = await db.getProduct(item.productId);
                return {
                  ...item,
                  product: {
                    name: product?.name || "Produto n\xE3o encontrado",
                    description: product?.description || "",
                    category: product?.category || "",
                    imageLink: product?.imageLink || ""
                  }
                };
              })
            );
          }
          const payments2 = await db.getPaymentsByOrder(order.id);
          const confirmedPayments = payments2.filter((payment) => payment.status === "confirmed");
          const totalPaid = confirmedPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
          let budgetDownPayment = 0;
          let originalBudgetInfo = null;
          if (order.budgetId) {
            try {
              const budget = await db.getBudget(order.budgetId);
              const budgetPaymentInfo2 = await db.getBudgetPaymentInfo(order.budgetId);
              if (budgetPaymentInfo2 && budgetPaymentInfo2.downPayment) {
                budgetDownPayment = parseFloat(budgetPaymentInfo2.downPayment);
                originalBudgetInfo = {
                  downPayment: budgetDownPayment,
                  remainingAmount: parseFloat(budgetPaymentInfo2.remainingAmount || "0"),
                  installments: budgetPaymentInfo2.installments || 1
                };
              }
            } catch (error) {
              console.log("Error fetching budget info for order:", order.id, error);
            }
          }
          const actualPaidValue = budgetDownPayment > 0 ? budgetDownPayment : totalPaid;
          const totalValue = parseFloat(order.totalValue);
          const remainingBalance = Math.max(0, totalValue - actualPaidValue);
          console.log(`Order ${order.orderNumber}: Total=${totalValue}, BudgetDownPayment=${budgetDownPayment}, Paid=${totalPaid}, ActualPaid=${actualPaidValue}, Remaining=${remainingBalance}`);
          return {
            ...order,
            paidValue: actualPaidValue.toFixed(2),
            // Use budget down payment or payments
            remainingValue: remainingBalance.toFixed(2),
            // Add remaining balance
            vendorName: "Unknown",
            // Placeholder, needs vendor lookup
            producerName: null,
            // Placeholder, needs producer lookup
            budgetPhotos: budgetPhotos3,
            budgetItems: budgetItems2,
            payments: payments2.filter((p) => p.status === "confirmed"),
            // Include payment details
            budgetInfo: originalBudgetInfo
            // Include original budget payment info
          };
        })
      );
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching client orders:", error);
      res.status(500).json({ error: "Failed to fetch client orders" });
    }
  });
  app2.get("/api/production-orders", async (req, res) => {
    try {
      const productionOrders3 = await db.getProductionOrders();
      const enrichedOrders = await Promise.all(
        productionOrders3.map(async (po) => {
          let order = await db.getOrder(po.orderId);
          const producer = po.producerId ? await db.getUser(po.producerId) : null;
          let clientName = order?.contactName;
          let clientAddress = null;
          let clientPhone = order?.contactPhone;
          let clientEmail = order?.contactEmail;
          if (order?.clientId) {
            const clientRecord = await db.getClient(order.clientId);
            console.log(`[PROD-ORDER DEBUG] Order ${order?.orderNumber}, clientId=${order.clientId}, clientRecord found=${!!clientRecord}`);
            if (clientRecord) {
              if (!clientName) {
                clientName = clientRecord.name;
              }
              clientAddress = clientRecord.enderecoEntregaLogradouro ? `${clientRecord.enderecoEntregaLogradouro}, ${clientRecord.enderecoEntregaNumero || "s/n"}${clientRecord.enderecoEntregaComplemento ? ` - ${clientRecord.enderecoEntregaComplemento}` : ""}, ${clientRecord.enderecoEntregaBairro || ""}, ${clientRecord.enderecoEntregaCidade || ""}, CEP: ${clientRecord.enderecoEntregaCep || ""}` : clientRecord.address;
              console.log(`[PROD-ORDER DEBUG] Built address from clientRecord: ${clientAddress?.substring(0, 50)}`);
              clientPhone = clientPhone || clientRecord.phone;
              clientEmail = clientEmail || clientRecord.email;
            } else {
              const clientByUserId = await db.getClientByUserId(order.clientId);
              if (clientByUserId) {
                if (!clientName) {
                  clientName = clientByUserId.name;
                }
                clientAddress = clientByUserId.enderecoEntregaLogradouro ? `${clientByUserId.enderecoEntregaLogradouro}, ${clientByUserId.enderecoEntregaNumero || "s/n"}${clientByUserId.enderecoEntregaComplemento ? ` - ${clientByUserId.enderecoEntregaComplemento}` : ""}, ${clientByUserId.enderecoEntregaBairro || ""}, ${clientByUserId.enderecoEntregaCidade || ""}, CEP: ${clientByUserId.enderecoEntregaCep || ""}` : clientByUserId.address;
                clientPhone = clientPhone || clientByUserId.phone;
                clientEmail = clientEmail || clientByUserId.email;
              } else {
                const clientUser = await db.getUser(order.clientId);
                if (clientUser) {
                  if (!clientName) {
                    clientName = clientUser.name;
                  }
                  clientPhone = clientPhone || clientUser.phone;
                  clientEmail = clientEmail || clientUser.email;
                  clientAddress = clientUser.address;
                }
              }
            }
          }
          if (!clientName) {
            clientName = "Nome n\xE3o informado";
          }
          const savedShippingAddress = order?.shippingAddress;
          const finalShippingAddress = order?.deliveryType === "pickup" ? "Sede Principal - Retirada no Local" : savedShippingAddress || clientAddress || "Endere\xE7o n\xE3o informado";
          return {
            ...po,
            orderNumber: order?.orderNumber || `PO-${po.id}`,
            product: order?.product || "Produto n\xE3o informado",
            clientName,
            clientAddress: finalShippingAddress,
            shippingAddress: finalShippingAddress,
            deliveryType: order?.deliveryType || "delivery",
            clientPhone,
            clientEmail,
            producerName: producer?.name || null,
            order: order ? {
              ...order,
              clientName,
              clientAddress: finalShippingAddress,
              shippingAddress: finalShippingAddress,
              clientPhone,
              clientEmail,
              deliveryType: order.deliveryType || "delivery"
            } : null
          };
        })
      );
      const validOrders = enrichedOrders.filter((order) => order !== null);
      console.log(`Returning ${validOrders.length} enriched production orders`);
      res.json(validOrders);
    } catch (error) {
      console.error("Error fetching production orders:", error);
      res.status(500).json({ error: "Failed to fetch production orders" });
    }
  });
  app2.get("/api/production-orders/vendor/:vendorId/status", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const allProductionOrders = await db.getProductionOrders();
      const orders2 = await db.getOrders();
      const users2 = await db.getUsers();
      const vendorOrders = orders2.filter((o) => o.vendorId === vendorId);
      const vendorOrderIds = vendorOrders.map((o) => o.id);
      const productionStatuses = allProductionOrders.filter((po) => vendorOrderIds.includes(po.orderId)).map((po) => {
        const producer = users2.find((u) => u.id === po.producerId);
        return {
          id: po.id,
          orderId: po.orderId,
          status: po.status,
          producerValue: po.producerValue,
          deliveryDate: po.deliveryDeadline,
          notes: po.notes,
          producerName: producer?.name || null,
          lastNoteAt: po.lastNoteAt
        };
      });
      console.log(`Found ${productionStatuses.length} production statuses for vendor ${vendorId}`);
      res.json(productionStatuses);
    } catch (error) {
      console.error("Error fetching vendor production statuses:", error);
      res.status(500).json({ error: "Failed to fetch vendor production statuses" });
    }
  });
  app2.get("/api/producers", async (req, res) => {
    try {
      const users2 = await db.getUsers();
      const producers = users2.filter((user) => user.role === "producer");
      const producersWithStats = await Promise.all(
        producers.map(async (producer) => {
          const productionOrders3 = await db.getProductionOrdersByProducer(producer.id);
          const activeOrders = productionOrders3.filter(
            (po) => ["pending", "accepted", "production", "quality_check", "ready"].includes(po.status)
          ).length;
          const completedOrders = productionOrders3.filter((po) => po.status === "completed").length;
          return {
            ...producer,
            activeOrders,
            completedOrders,
            totalOrders: productionOrders3.length
          };
        })
      );
      res.json(producersWithStats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch producers" });
    }
  });
  app2.post("/api/producers", async (req, res) => {
    try {
      const { name, email, phone, specialty, address, password, username, userCode } = req.body;
      console.log("Creating producer with request data:", { name, email, phone, specialty, address, username: username || userCode, hasPassword: !!password });
      const finalUsername = userCode || username || email;
      if (!finalUsername) {
        return res.status(400).json({ error: "Username ou c\xF3digo de usu\xE1rio \xE9 obrigat\xF3rio" });
      }
      const existingUser = await db.getUserByUsername(finalUsername);
      if (existingUser) {
        console.log("Username already exists:", finalUsername);
        return res.status(400).json({ error: "C\xF3digo de usu\xE1rio j\xE1 existe" });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }
      const user = await db.createUser({
        username: finalUsername,
        password,
        role: "producer",
        name,
        email: email || null,
        phone: phone || null,
        specialty: specialty || null,
        address: address || null,
        isActive: true
      });
      if (req.user && req.user.id) {
        try {
          await db.logUserAction(
            req.user.id,
            req.user.name || "Admin",
            req.user.role || "admin",
            "CREATE",
            "partners",
            // Note: This logs as 'partners' even for producer creation, could be a bug
            user.id,
            `Produtor criado: ${user.name} - Username: ${user.username}`,
            "success",
            {
              producerName: user.name,
              username: user.username,
              email: user.email
            }
          );
        } catch (logError) {
          console.error("Error logging producer creation:", logError);
        }
      } else {
        console.log("Warning: No authenticated user for logging, skipping log");
      }
      console.log("Producer created successfully:", { id: user.id, username: user.username, name: user.name });
      res.json({
        success: true,
        user: {
          ...user,
          userCode: finalUsername
          // Include userCode in response for display
        }
      });
    } catch (error) {
      console.error("Error creating producer:", error);
      res.status(500).json({ error: "Failed to create producer: " + error.message });
    }
  });
  app2.get("/api/branches", async (req, res) => {
    try {
      const branches2 = await db.getBranches();
      res.json(branches2);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });
  app2.post("/api/branches", async (req, res) => {
    try {
      const branchData = req.body;
      console.log("Creating branch:", branchData);
      if (!branchData.name || !branchData.city) {
        return res.status(400).json({ error: "Nome e cidade s\xE3o obrigat\xF3rios" });
      }
      const newBranch = await db.createBranch(branchData);
      res.json(newBranch);
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).json({ error: "Failed to create branch" });
    }
  });
  app2.put("/api/branches/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      console.log(`Updating branch ${id}:`, updateData);
      const updatedBranch = await db.updateBranch(id, updateData);
      if (!updatedBranch) {
        return res.status(404).json({ error: "Filial n\xE3o encontrada" });
      }
      res.json(updatedBranch);
    } catch (error) {
      console.error("Error updating branch:", error);
      res.status(500).json({ error: "Failed to update branch" });
    }
  });
  app2.get("/api/branches/:id", async (req, res) => {
    try {
      const branch = await db.getBranch(req.params.id);
      if (!branch) {
        return res.status(404).json({ error: "Filial n\xE3o encontrada" });
      }
      res.json(branch);
    } catch (error) {
      console.error("Error fetching branch:", error);
      res.status(500).json({ error: "Failed to fetch branch" });
    }
  });
  app2.get("/api/vendors/:vendorId/clients", async (req, res) => {
    try {
      const { vendorId } = req.params;
      console.log(`Fetching clients for vendor: ${vendorId}`);
      const clients2 = await db.getClientsByVendor(vendorId);
      console.log(`Found ${clients2.length} clients for vendor ${vendorId}`);
      const enrichedClients = await Promise.all(
        clients2.map(async (client2) => {
          const ownerUser = client2.userId ? await db.getUser(client2.userId) : null;
          const clientOrders = await db.getOrdersByClient(client2.id);
          const totalSpent = clientOrders.reduce(
            (sum, order) => sum + parseFloat(order.totalValue || "0"),
            0
          );
          return {
            ...client2,
            userCode: ownerUser?.username || null,
            ordersCount: clientOrders.length,
            totalSpent
          };
        })
      );
      res.json(enrichedClients);
    } catch (error) {
      console.error("Error fetching vendor clients:", error);
      res.status(500).json({ error: "Failed to fetch vendor clients" });
    }
  });
  app2.get("/api/vendors", async (req, res) => {
    try {
      const users2 = await db.getUsers();
      const vendors2 = users2.filter((user) => user.role === "vendor");
      const vendorsWithInfo = await Promise.all(
        vendors2.map(async (vendor) => {
          const vendorInfo = await db.getVendor(vendor.id);
          const branch = vendorInfo?.branchId ? await db.getBranch(vendorInfo.branchId) : null;
          return {
            id: vendor.id,
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            address: vendor.address,
            username: vendor.username,
            userCode: vendor.username,
            photoUrl: vendor.photoUrl || null,
            branchId: vendorInfo?.branchId || null,
            branchName: branch?.name || null,
            commissionRate: vendorInfo?.commissionRate || "10.00",
            isCommissioned: vendor.isCommissioned !== false,
            isActive: vendorInfo?.isActive || true
          };
        })
      );
      res.json(vendorsWithInfo);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });
  app2.post("/api/vendors", async (req, res) => {
    try {
      const { name, email, password, commissionRate, userCode, phone, address, isCommissioned, photoUrl } = req.body;
      console.log("Creating vendor with data:", { name, email, userCode, phone, address, commissionRate, isCommissioned, photoUrl });
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio" });
      }
      if (!userCode || userCode.trim().length === 0) {
        return res.status(400).json({ error: "C\xF3digo de usu\xE1rio \xE9 obrigat\xF3rio" });
      }
      const existingUser = await db.getUserByUsername(userCode);
      if (existingUser) {
        return res.status(400).json({ error: "C\xF3digo de usu\xE1rio j\xE1 existe" });
      }
      const newVendor = await db.createVendor({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        username: userCode.trim(),
        password: password || "123456",
        commissionRate: commissionRate || "10.00",
        isCommissioned: isCommissioned !== false,
        photoUrl: photoUrl?.trim() || null
      });
      const vendorInfo = await db.getVendor(newVendor.id);
      res.json({
        success: true,
        user: {
          id: newVendor.id,
          name: newVendor.name,
          email: newVendor.email,
          phone: newVendor.phone,
          address: newVendor.address,
          userCode,
          commissionRate: vendorInfo?.commissionRate || commissionRate || "10.00",
          isCommissioned: newVendor.isCommissioned !== false,
          isActive: true
        }
      });
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });
  app2.put("/api/vendors/:vendorId/commission", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const { commissionRate } = req.body;
      await db.updateVendorCommission(vendorId, commissionRate);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update vendor commission" });
    }
  });
  app2.put("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const clientData = req.body;
      const updatedClient = await db.updateClient(id, clientData);
      if (!updatedClient) {
        return res.status(404).json({ error: "Cliente n\xE3o encontrado" });
      }
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });
  app2.delete("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const budgets3 = await db.getBudgets();
      const clientBudgets = budgets3.filter((budget) => budget.clientId === id);
      if (clientBudgets.length > 0) {
        return res.status(400).json({
          error: `N\xE3o \xE9 poss\xEDvel excluir este cliente pois existem ${clientBudgets.length} or\xE7amento(s) associado(s) a ele`
        });
      }
      const orders2 = await db.getOrders();
      const clientOrders = orders2.filter((order) => order.clientId === id);
      if (clientOrders.length > 0) {
        return res.status(400).json({
          error: `N\xE3o \xE9 poss\xEDvel excluir este cliente pois existem ${clientOrders.length} pedido(s) associado(s) a ele`
        });
      }
      const client2 = await db.getClient(id);
      if (client2 && client2.userId) {
        await db.updateUser(client2.userId, { isActive: false });
      }
      await db.deleteClient(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });
  app2.delete("/api/vendors/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const orders2 = await db.getOrders();
      const vendorOrders = orders2.filter((order) => order.vendorId === id);
      if (vendorOrders.length > 0) {
        return res.status(400).json({
          error: "N\xE3o \xE9 poss\xEDvel excluir este vendedor pois existem pedidos associados a ele"
        });
      }
      await db.deleteVendor(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });
  app2.delete("/api/branches/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const orders2 = await db.getOrders();
      const branchOrders = orders2.filter((order) => order.branchId === id);
      if (branchOrders.length > 0) {
        return res.status(400).json({
          error: "N\xE3o \xE9 poss\xEDvel excluir esta filial pois existem pedidos associados a ela"
        });
      }
      await db.deleteBranch(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ error: "Failed to delete branch" });
    }
  });
  app2.patch("/api/producers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, specialty, address } = req.body;
      console.log(`Updating producer ${id}:`, { name, email, phone, specialty, address });
      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: "Nome deve ter pelo menos 2 caracteres" });
      }
      const updatedUser = await db.updateUser(id, {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        specialty: specialty || null,
        address: address || null
      });
      if (!updatedUser) {
        return res.status(404).json({ error: "Produtor n\xE3o encontrado" });
      }
      console.log(`Producer ${id} updated successfully`);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating producer:", error);
      res.status(500).json({ error: "Erro ao atualizar produtor" });
    }
  });
  app2.patch("/api/producers/:id/password", async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      console.log(`Changing password for producer ${id}`);
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }
      const producer = await db.getUser(id);
      if (!producer || producer.role !== "producer") {
        return res.status(404).json({ error: "Produtor n\xE3o encontrado" });
      }
      await db.updateUser(id, { password: newPassword });
      console.log(`Password changed successfully for producer ${id}`);
      res.json({ success: true, message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Error changing producer password:", error);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });
  app2.delete("/api/producers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const productionOrders3 = await db.getProductionOrders();
      const producerOrders = productionOrders3.filter((po) => po.producerId === id);
      if (producerOrders.length > 0) {
        return res.status(400).json({
          error: "N\xE3o \xE9 poss\xEDvel excluir este produtor pois existem pedidos de produ\xE7\xE3o associados a ele"
        });
      }
      const products2 = await db.getProductsByProducer(id);
      if (products2.length > 0) {
        return res.status(400).json({
          error: "N\xE3o \xE9 poss\xEDvel excluir este produtor pois existem produtos associados a ele"
        });
      }
      const producerPayments2 = await db.getProducerPaymentsByProducer(id);
      const pendingPayments = producerPayments2.filter((payment) => payment.status === "pending" || payment.status === "approved");
      if (pendingPayments.length > 0) {
        return res.status(400).json({
          error: "N\xE3o \xE9 poss\xEDvel excluir este produtor pois existem pagamentos pendentes associados a ele"
        });
      }
      const deleted = await db.deleteProducer(id);
      if (!deleted) {
        return res.status(404).json({ error: "Produtor n\xE3o encontrado" });
      }
      if (req.user && req.user.id) {
        try {
          await db.logUserAction(
            req.user.id,
            req.user.name || "Usu\xE1rio",
            req.user.role || "user",
            "DELETE",
            "producers",
            id,
            `Produtor exclu\xEDdo`,
            "warning",
            {
              producerId: id
            }
          );
        } catch (logError) {
          console.error("Error logging producer deletion:", logError);
        }
      }
      res.json({ success: true, message: "Produtor exclu\xEDdo com sucesso" });
    } catch (error) {
      console.error("Error deleting producer:", error);
      res.status(500).json({ error: "Erro ao excluir produtor: " + error.message });
    }
  });
  app2.get("/api/logistics", async (req, res) => {
    try {
      const users2 = await db.getUsers();
      const logisticsUsers = users2.filter((user) => user.role === "logistics");
      res.json(logisticsUsers);
    } catch (error) {
      console.error("Error fetching logistics users:", error);
      res.status(500).json({ error: "Failed to fetch logistics users" });
    }
  });
  app2.post("/api/logistics", async (req, res) => {
    try {
      const { name, email, phone, password, username, userCode } = req.body;
      console.log("Creating logistics user with request data:", { name, email, phone, username: username || userCode, hasPassword: !!password });
      const finalUsername = userCode || username || email;
      if (!finalUsername) {
        return res.status(400).json({ error: "Username ou c\xF3digo de usu\xE1rio \xE9 obrigat\xF3rio" });
      }
      const existingUser = await db.getUserByUsername(finalUsername);
      if (existingUser) {
        console.log("Username already exists:", finalUsername);
        return res.status(400).json({ error: "C\xF3digo de usu\xE1rio j\xE1 existe" });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }
      const logisticsUser = await db.createUser({
        username: finalUsername,
        password,
        name,
        email: email || null,
        phone: phone || null,
        role: "logistics",
        userCode: userCode || finalUsername
      });
      console.log("Logistics user created successfully:", logisticsUser.id);
      res.json({
        ...logisticsUser,
        password
        // Return password in response so it can be shown to admin
      });
    } catch (error) {
      console.error("Error creating logistics user:", error);
      res.status(500).json({ error: "Failed to create logistics user" });
    }
  });
  app2.patch("/api/logistics/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone } = req.body;
      console.log(`Updating logistics user ${id}:`, { name, email, phone });
      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: "Nome deve ter pelo menos 2 caracteres" });
      }
      const user = await db.getUser(id);
      if (!user || user.role !== "logistics") {
        return res.status(404).json({ error: "Usu\xE1rio de log\xEDstica n\xE3o encontrado" });
      }
      const updatedUser = await db.updateUser(id, {
        name: name.trim(),
        email: email || null,
        phone: phone || null
      });
      console.log(`Logistics user ${id} updated successfully`);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating logistics user:", error);
      res.status(500).json({ error: "Erro ao atualizar usu\xE1rio" });
    }
  });
  app2.patch("/api/logistics/:id/password", async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      console.log(`Changing password for logistics user ${id}`);
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }
      const user = await db.getUser(id);
      if (!user || user.role !== "logistics") {
        return res.status(404).json({ error: "Usu\xE1rio de log\xEDstica n\xE3o encontrado" });
      }
      await db.updateUser(id, { password: newPassword });
      console.log(`Password changed successfully for logistics user ${id}`);
      res.json({ success: true, message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Error changing logistics user password:", error);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });
  app2.delete("/api/logistics/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting logistics user:", error);
      res.status(500).json({ error: "Failed to delete logistics user" });
    }
  });
  app2.post("/api/quote-requests/consolidated", async (req, res) => {
    try {
      const quoteRequestData = req.body;
      if (!quoteRequestData.clientId || !quoteRequestData.vendorId || !quoteRequestData.products || quoteRequestData.products.length === 0) {
        return res.status(400).json({ error: "Dados obrigat\xF3rios n\xE3o fornecidos" });
      }
      console.log("Creating consolidated quote request:", {
        clientId: quoteRequestData.clientId,
        vendorId: quoteRequestData.vendorId,
        contactName: quoteRequestData.contactName,
        productCount: quoteRequestData.products.length,
        totalValue: quoteRequestData.totalEstimatedValue
      });
      const newQuoteRequest = await db.createConsolidatedQuoteRequest(quoteRequestData);
      res.json(newQuoteRequest);
    } catch (error) {
      console.error("Error creating consolidated quote request:", error);
      res.status(500).json({ error: "Failed to create consolidated quote request" });
    }
  });
  app2.post("/api/quote-requests", async (req, res) => {
    try {
      const quoteRequestData = req.body;
      if (!quoteRequestData.clientId || !quoteRequestData.vendorId || !quoteRequestData.productId) {
        return res.status(400).json({ error: "Dados obrigat\xF3rios n\xE3o fornecidos" });
      }
      const newQuoteRequest = await db.createQuoteRequest(quoteRequestData);
      res.json(newQuoteRequest);
    } catch (error) {
      console.error("Error creating quote request:", error);
      res.status(500).json({ error: "Failed to create quote request" });
    }
  });
  app2.get("/api/quote-requests/vendor/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const quoteRequests2 = await db.getQuoteRequestsByVendor(vendorId);
      res.json(quoteRequests2);
    } catch (error) {
      console.error("Error fetching quote requests:", error);
      res.status(500).json({ error: "Failed to fetch quote requests" });
    }
  });
  app2.patch("/api/quote-requests/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updatedRequest = await db.updateQuoteRequestStatus(id, status);
      if (!updatedRequest) {
        return res.status(404).json({ error: "Quote request not found" });
      }
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating quote request status:", error);
      res.status(500).json({ error: "Failed to update quote request status" });
    }
  });
  app2.patch("/api/commissions/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!["pending", "confirmed", "paid", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Status inv\xE1lido" });
      }
      const updatedCommission = await db.updateCommissionStatus(id, status);
      if (!updatedCommission) {
        return res.status(404).json({ error: "Comiss\xE3o n\xE3o encontrada" });
      }
      if (req.user) {
        try {
          await db.logUserAction(
            req.user.id,
            req.user.name || "Usu\xE1rio",
            req.user.role || "user",
            "UPDATE",
            "commissions",
            id,
            `Status da comiss\xE3o alterado para ${status}`,
            "info",
            { status }
          );
        } catch (logError) {
          console.error("Error logging commission status change:", logError);
        }
      }
      res.json(updatedCommission);
    } catch (error) {
      console.error("Error updating commission status:", error);
      res.status(500).json({ error: "Erro ao atualizar status da comiss\xE3o" });
    }
  });
  app2.patch("/api/commissions/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!["pending", "confirmed", "paid", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Status inv\xE1lido" });
      }
      const updatedCommission = await db.updateCommissionStatus(id, status);
      if (!updatedCommission) {
        return res.status(404).json({ error: "Comiss\xE3o n\xE3o encontrada" });
      }
      if (req.user) {
        try {
          await db.logUserAction(
            req.user.id,
            req.user.name || "Usu\xE1rio",
            req.user.role || "user",
            "UPDATE",
            "commissions",
            id,
            `Status da comiss\xE3o alterado para ${status}`,
            "info",
            { status }
          );
        } catch (logError) {
          console.error("Error logging commission status change:", logError);
        }
      }
      res.json(updatedCommission);
    } catch (error) {
      console.error("Error updating commission status:", error);
      res.status(500).json({ error: "Erro ao atualizar status da comiss\xE3o" });
    }
  });
  app2.post("/api/quote-requests/:id/convert-to-budget", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Converting quote request ${id} to official budget`);
      const quoteRequest = await db.getQuoteRequestById(id);
      if (!quoteRequest) {
        return res.status(404).json({ error: "Solicita\xE7\xE3o de or\xE7amento n\xE3o encontrada" });
      }
      const clientRecord = await db.getClientByUserId(quoteRequest.clientId);
      if (!clientRecord) {
        return res.status(404).json({ error: "Cliente n\xE3o encontrado" });
      }
      const budgetData = {
        budgetNumber: `ORC-${Date.now()}`,
        clientId: clientRecord.id,
        // Use the client table ID, not user ID
        vendorId: quoteRequest.vendorId,
        contactName: quoteRequest.contactName,
        contactPhone: quoteRequest.whatsapp || "",
        contactEmail: quoteRequest.email || "",
        title: `Or\xE7amento - ${(quoteRequest.items || []).map((p) => p.productName).join(", ")}`,
        description: quoteRequest.observations || "",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString(),
        // 30 days from now
        deliveryDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1e3).toISOString(),
        // 45 days from now
        deliveryType: "delivery",
        status: "draft",
        paymentMethodId: "pm-1",
        // Default to PIX
        shippingMethodId: "sm-1",
        // Default to Correios PAC
        installments: 1,
        downPayment: 0,
        remainingAmount: quoteRequest.totalEstimatedValue || 0,
        shippingCost: 0,
        hasDiscount: false,
        discountType: "percentage",
        discountPercentage: 0,
        discountValue: 0,
        items: (quoteRequest.items || []).map((product) => ({
          productId: product.productId,
          productName: product.productName,
          producerId: product.producerId || "internal",
          quantity: product.quantity || 1,
          unitPrice: parseFloat(product.basePrice) || 0,
          totalPrice: (product.quantity || 1) * (parseFloat(product.basePrice) || 0),
          hasItemCustomization: false,
          selectedCustomizationId: "",
          itemCustomizationValue: 0,
          itemCustomizationDescription: "",
          additionalCustomizationNotes: product.observations || "",
          customizationPhoto: "",
          hasGeneralCustomization: false,
          generalCustomizationName: "",
          generalCustomizationValue: 0,
          hasItemDiscount: false,
          itemDiscountType: "percentage",
          itemDiscountPercentage: 0,
          itemDiscountValue: 0,
          productWidth: "",
          productHeight: "",
          productDepth: ""
        })) || [],
        totalValue: quoteRequest.totalEstimatedValue || 0
      };
      const newBudget = await db.createBudget(budgetData);
      await db.updateQuoteRequestStatus(id, "quoted");
      console.log(`Successfully converted quote request ${id} to budget ${newBudget.id}`);
      res.json({
        success: true,
        budget: newBudget,
        message: "Solicita\xE7\xE3o convertida em or\xE7amento oficial com sucesso!"
      });
    } catch (error) {
      console.error("Error converting quote request to budget:", error);
      res.status(500).json({ error: "Erro ao converter solicita\xE7\xE3o em or\xE7amento: " + error.message });
    }
  });
  app2.get("/api/vendors/:vendorId/orders", async (req, res) => {
    const { vendorId } = req.params;
    try {
      const orders2 = await db.getOrdersByVendor(vendorId);
      console.log(`Found ${orders2.length} orders for vendor ${vendorId}`);
      const enrichedOrders = await Promise.all(
        orders2.map(async (order) => {
          const client2 = await db.getUser(order.clientId);
          const producer = order.producerId ? await db.getUser(order.producerId) : null;
          let budgetPhotos3 = [];
          let budgetItems2 = [];
          if (order.budgetId) {
            const photos = await db.getBudgetPhotos(order.budgetId);
            budgetPhotos3 = photos.map((photo) => photo.imageUrl || photo.photoUrl);
            const items = await db.getBudgetItems(order.budgetId);
            budgetItems2 = await Promise.all(
              items.map(async (item) => {
                const product = await db.getProduct(item.productId);
                return {
                  ...item,
                  product: {
                    name: product?.name || "Produto n\xE3o encontrado",
                    description: product?.description || "",
                    category: product?.category || "",
                    imageLink: product?.imageLink || ""
                  }
                };
              })
            );
          }
          let hasUnreadNotes = false;
          let productionNotes = null;
          let productionDeadline = null;
          let lastNoteAt = null;
          if (order.producerId) {
            const productionOrders3 = await db.getProductionOrdersByOrder(order.id);
            if (productionOrders3.length > 0) {
              const po = productionOrders3[0];
              hasUnreadNotes = po.hasUnreadNotes || false;
              productionNotes = po.notes;
              productionDeadline = po.deliveryDeadline;
              lastNoteAt = po.lastNoteAt;
            }
          }
          return {
            ...order,
            clientName: client2?.name || "Unknown",
            producerName: producer?.name || null,
            hasUnreadNotes,
            budgetPhotos: budgetPhotos3,
            budgetItems: budgetItems2,
            items: budgetItems2,
            // CRITICAL FIX: Add items for frontend compatibility
            productionNotes,
            productionDeadline,
            lastNoteAt
          };
        })
      );
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
      res.status(500).json({ error: "Failed to fetch vendor orders" });
    }
  });
  app2.get("/api/vendor/:userId/info", async (req, res) => {
    try {
      const { userId } = req.params;
      const vendor = await db.getVendor(userId);
      const orders2 = await db.getOrdersByVendor(userId);
      const commissions2 = await db.getCommissionsByVendor(userId);
      const monthlySales = orders2.filter((order) => {
        if (!order.createdAt) return false;
        const orderMonth = new Date(order.createdAt).getMonth();
        const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
        return orderMonth === currentMonth;
      }).reduce((total, order) => total + parseFloat(order.totalValue), 0);
      const totalCommissions = commissions2.reduce((total, commission) => total + parseFloat(commission.amount), 0);
      res.json({
        vendor,
        monthlySales,
        totalCommissions,
        confirmedOrders: orders2.filter((o) => o.status !== "cancelled").length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor info" });
    }
  });
  app2.get("/api/commissions", async (req, res) => {
    try {
      const commissions2 = await db.getAllCommissions();
      const enrichedCommissions = await Promise.all(
        commissions2.map(async (commission) => {
          let vendorName = null;
          let partnerName = null;
          let orderValue = commission.orderValue;
          let orderNumber = commission.orderNumber;
          let type = "vendor";
          if (commission.vendorId) {
            const vendor = await db.getUser(commission.vendorId);
            vendorName = vendor?.name;
            type = "vendor";
          }
          if (commission.partnerId) {
            const partner = await db.getUser(commission.partnerId);
            partnerName = partner?.name;
            type = "partner";
          }
          if (commission.type) {
            type = commission.type;
          }
          if (commission.orderId && (!orderValue || !orderNumber)) {
            let order = await db.getOrder(commission.orderId);
            if (order) {
              orderValue = orderValue || order.totalValue;
              orderNumber = orderNumber || order.orderNumber;
            }
          }
          return {
            ...commission,
            type,
            vendorName,
            partnerName,
            orderValue,
            orderNumber
          };
        })
      );
      const validCommissions = enrichedCommissions.filter(
        (commission) => commission.amount && (commission.vendorName || commission.partnerName) && commission.orderNumber
      );
      res.json(validCommissions);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });
  app2.get("/api/commissions/vendor/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      console.log(`Fetching commissions for vendor: ${vendorId}`);
      const commissions2 = await db.getCommissionsByVendor(vendorId);
      console.log(`Found ${commissions2.length} commissions for vendor ${vendorId}`);
      const enrichedCommissions = await Promise.all(
        commissions2.map(async (commission) => {
          if (commission.orderId) {
            let order = await db.getOrder(commission.orderId);
            if (order) {
              return {
                ...commission,
                orderValue: commission.orderValue || order.totalValue,
                orderNumber: commission.orderNumber || order.orderNumber
              };
            }
          }
          return commission;
        })
      );
      console.log(`Returning ${enrichedCommissions.length} enriched commissions for vendor ${vendorId}`);
      res.json(enrichedCommissions);
    } catch (error) {
      console.error("Error fetching vendor commissions:", error);
      res.status(500).json({ error: "Failed to fetch vendor commissions" });
    }
  });
  app2.put("/api/commissions/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updatedCommission = await db.updateCommissionStatus(id, status);
      if (!updatedCommission) {
        return res.status(404).json({ error: "Commission not found" });
      }
      res.json(updatedCommission);
    } catch (error) {
      console.error("Error updating commission status:", error);
      res.status(500).json({ error: "Failed to update commission status" });
    }
  });
  app2.get("/api/partners", async (req, res) => {
    try {
      const users2 = await db.getUsers();
      const partners2 = users2.filter((user) => user.role === "partner");
      console.log(`Found ${partners2.length} partners in users table`);
      const partnersWithDetails = await Promise.all(partners2.map(async (partner) => {
        const partnerProfile = await db.getPartner(partner.id);
        return {
          id: partner.id,
          name: partner.name,
          email: partner.email || "",
          username: partner.username || "",
          userCode: partner.username || "",
          phone: partner.phone || "",
          commissionRate: partnerProfile?.commissionRate || "15.00",
          createdAt: partner.createdAt,
          isActive: partner.isActive || true
        };
      }));
      res.json(partnersWithDetails);
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });
  app2.post("/api/partners", async (req, res) => {
    try {
      const { name, email, phone, username, password } = req.body;
      console.log("Creating partner with request data:", { name, email, phone, username, hasPassword: !!password });
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio" });
      }
      if (!username || username.trim().length === 0) {
        return res.status(400).json({ error: "Nome de usu\xE1rio \xE9 obrigat\xF3rio" });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }
      const existingUser = await db.getUserByUsername(username.trim());
      if (existingUser) {
        console.log("Username already exists:", username);
        return res.status(400).json({ error: "Nome de usu\xE1rio j\xE1 existe" });
      }
      const newPartner = await db.createPartner({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        username: username.trim(),
        password,
        commissionRate: "15.00"
        // Default commission rate for partners
      });
      console.log("Partner created successfully:", { id: newPartner.id, username: newPartner.username, name: newPartner.name });
      const { password: _, ...partnerWithoutPassword } = newPartner;
      res.json({
        success: true,
        partner: {
          ...partnerWithoutPassword,
          userCode: newPartner.username,
          commissionRate: "15.00"
        }
      });
    } catch (error) {
      console.error("Error creating partner:", error);
      res.status(500).json({ error: "Failed to create partner: " + error.message });
    }
  });
  app2.put("/api/partners/:partnerId/commission", async (req, res) => {
    try {
      const { partnerId } = req.params;
      const { commissionRate } = req.body;
      await db.updatePartnerCommission(partnerId, commissionRate);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating partner commission:", error);
      res.status(500).json({ error: "Failed to update partner commission" });
    }
  });
  app2.delete("/api/commissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Deleting commission: ${id}`);
      const commissions2 = await db.getAllCommissions();
      const commission = commissions2.find((c) => c.id === id);
      const deleted = await db.deleteCommission(id);
      if (!deleted) {
        return res.status(404).json({ error: "Comiss\xE3o n\xE3o encontrada" });
      }
      if (req.user && req.user.id) {
        try {
          await db.logUserAction(
            req.user.id,
            req.user.name || "Usu\xE1rio",
            req.user.role || "user",
            "DELETE",
            "commissions",
            id,
            `Comiss\xE3o exclu\xEDda: R$ ${commission?.amount || "0.00"} - ${commission?.type || "Unknown"} - Pedido: ${commission?.orderNumber || "N/A"}`,
            "warning",
            {
              commissionId: id,
              amount: commission?.amount,
              type: commission?.type,
              orderNumber: commission?.orderNumber
            }
          );
        } catch (logError) {
          console.error("Error logging commission deletion:", logError);
        }
      }
      res.json({ success: true, message: "Comiss\xE3o exclu\xEDda com sucesso" });
    } catch (error) {
      console.error("Error deleting commission:", error);
      res.status(500).json({ error: "Erro ao excluir comiss\xE3o: " + error.message });
    }
  });
  app2.put("/api/partners/:partnerId/name", async (req, res) => {
    try {
      const { partnerId } = req.params;
      const { name } = req.body;
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio" });
      }
      const updatedUser = await db.updateUser(partnerId, { name: name.trim() });
      if (!updatedUser) {
        return res.status(404).json({ error: "S\xF3cio n\xE3o encontrado" });
      }
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating partner name:", error);
      res.status(500).json({ error: "Failed to update partner name" });
    }
  });
  app2.get("/api/commissions/partner/:partnerId", async (req, res) => {
    try {
      const { partnerId } = req.params;
      const commissions2 = await db.getCommissionsByPartner(partnerId);
      const enrichedCommissions = await Promise.all(
        commissions2.map(async (commission) => {
          if (commission.orderId) {
            let order = await db.getOrder(commission.orderId);
            if (order) {
              return {
                ...commission,
                orderValue: commission.orderValue || order.totalValue,
                orderNumber: commission.orderNumber || order.orderNumber
              };
            }
          }
          return commission;
        })
      );
      res.json(enrichedCommissions);
    } catch (error) {
      console.error("Error fetching partner commissions:", error);
      res.status(500).json({ error: "Failed to fetch partner commissions" });
    }
  });
  app2.get("/api/partners", async (req, res) => {
    try {
      const partners2 = await db.getPartners();
      const enrichedPartners = await Promise.all(
        partners2.map(async (partner) => {
          const commissions2 = await db.getCommissionsByPartner(partner.id);
          const totalCommissions = commissions2.reduce((sum, c) => sum + parseFloat(c.amount || "0"), 0);
          return {
            ...partner,
            totalCommissions
          };
        })
      );
      console.log(`Found ${enrichedPartners.length} partners`);
      res.json(enrichedPartners);
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });
  app2.put("/api/partners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const partnerData = req.body;
      console.log(`Updating partner ${id} with data:`, partnerData);
      if (!partnerData.name || partnerData.name.trim().length === 0) {
        return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio" });
      }
      const updatedUser = await db.updateUser(id, {
        name: partnerData.name.trim(),
        email: partnerData.email?.trim() || null,
        phone: partnerData.phone?.trim() || null,
        isActive: partnerData.isActive !== void 0 ? partnerData.isActive : true
      });
      if (!updatedUser) {
        return res.status(404).json({ error: "S\xF3cio n\xE3o encontrado" });
      }
      console.log("Partner updated successfully:", updatedUser.name);
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({
        success: true,
        partner: userWithoutPassword,
        message: "S\xF3cio atualizado com sucesso"
      });
    } catch (error) {
      console.error("Error updating partner:", error);
      res.status(500).json({ error: "Erro ao atualizar s\xF3cio: " + error.message });
    }
  });
  app2.delete("/api/partners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Attempting to delete partner: ${id}`);
      const commissions2 = await db.getCommissionsByPartner(id);
      if (commissions2.length > 0) {
        console.log(`Partner ${id} has ${commissions2.length} commissions, cannot delete`);
        return res.status(400).json({
          error: "N\xE3o \xE9 poss\xEDvel excluir este s\xF3cio pois existem comiss\xF5es associadas"
        });
      }
      try {
        await db.deletePartner(id);
        console.log(`Partner profile deleted for user: ${id}`);
      } catch (partnerError) {
        console.log(`No partner profile found for user ${id}, continuing with user deletion`);
      }
      const userDeleted = await db.deleteUser(id);
      if (!userDeleted) {
        return res.status(404).json({ error: "S\xF3cio n\xE3o encontrado" });
      }
      console.log(`Partner and user ${id} deleted successfully`);
      res.json({ success: true, message: "S\xF3cio exclu\xEDdo com sucesso" });
    } catch (error) {
      console.error("Error deleting partner:", error);
      res.status(500).json({ error: "Erro ao excluir s\xF3cio: " + error.message });
    }
  });
  app2.post("/api/admin/recalculate-commissions", requireAuth, async (req, res) => {
    try {
      console.log("Starting commission recalculation...");
      await db.recalculateAllCommissions();
      res.json({
        success: true,
        message: "Comiss\xF5es recalculadas com sucesso"
      });
    } catch (error) {
      console.error("Error recalculating commissions:", error);
      res.status(500).json({ error: "Erro ao recalcular comiss\xF5es: " + error.message });
    }
  });
  app2.get("/api/admin/logs", async (req, res) => {
    try {
      const { search, action, user, level, date, export: isExport } = req.query;
      const logs = await db.getSystemLogs({
        search,
        action: action === "all" ? void 0 : action,
        userId: user === "all" ? void 0 : user,
        level: level === "all" ? void 0 : level,
        dateFilter: date === "all" ? void 0 : date
      });
      if (isExport === "true") {
        const csvHeaders = "Data,Usu\xE1rio,A\xE7\xE3o,N\xEDvel,Descri\xE7\xE3o,Detalhes,IP,User Agent\n";
        const csvData = logs.map((log) => {
          const date2 = new Date(log.createdAt).toLocaleString("pt-BR");
          const details = (log.details || "").replace(/"/g, '""');
          const description = (log.description || "").replace(/"/g, '""');
          const userAgent = (log.userAgent || "").replace(/"/g, '""');
          return `"${date2}","${log.userName}","${log.action}","${log.level}","${description}","${details}","${log.ipAddress || ""}","${userAgent}"`;
        }).join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=logs-sistema-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
        res.send(csvHeaders + csvData);
      } else {
        res.json(logs);
      }
    } catch (error) {
      console.error("Error fetching system logs:", error);
      res.status(500).json({ error: "Failed to fetch system logs" });
    }
  });
  app2.post("/api/admin/logs/backup", async (req, res) => {
    try {
      console.log("Creating logs backup...");
      const logs = await db.getSystemLogs({
        dateFilter: "week"
      });
      if (logs.length === 0) {
        return res.json({
          success: true,
          message: "Nenhum log encontrado para backup",
          backupId: null
        });
      }
      const backupDate = /* @__PURE__ */ new Date();
      const backupId = `backup-${backupDate.getTime()}`;
      const excelData = logs.map((log) => ({
        "Data": new Date(log.createdAt).toLocaleString("pt-BR"),
        "Usu\xE1rio": log.userName,
        "A\xE7\xE3o": log.action,
        "N\xEDvel": log.level,
        "Descri\xE7\xE3o": log.description || "",
        "Detalhes": log.details || "",
        "IP": log.ipAddress || "",
        "User Agent": log.userAgent || ""
      }));
      const backup = await db.createLogBackup({
        id: backupId,
        backupDate,
        logCount: logs.length,
        excelData: JSON.stringify(excelData),
        status: "completed"
      });
      await db.cleanOldLogs(7);
      console.log(`Backup created: ${backupId} with ${logs.length} logs`);
      res.json({
        success: true,
        backup,
        message: `Backup criado com sucesso! ${logs.length} logs arquivados.`
      });
    } catch (error) {
      console.error("Error creating logs backup:", error);
      res.status(500).json({ error: "Erro ao criar backup de logs: " + error.message });
    }
  });
  app2.get("/api/admin/logs/backups", async (req, res) => {
    try {
      const backups = await db.getLogBackups();
      res.json(backups);
    } catch (error) {
      console.error("Error fetching log backups:", error);
      res.status(500).json({ error: "Failed to fetch log backups" });
    }
  });
  app2.get("/api/admin/logs/backups/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const backup = await db.getLogBackup(id);
      if (!backup) {
        return res.status(404).json({ error: "Backup n\xE3o encontrado" });
      }
      const excelData = JSON.parse(backup.excelData);
      const fileName = `logs-backup-${new Date(backup.backupDate).toISOString().split("T")[0]}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.json({
        success: true,
        data: excelData,
        fileName,
        backupInfo: {
          date: backup.backupDate,
          logCount: backup.logCount
        }
      });
    } catch (error) {
      console.error("Error downloading log backup:", error);
      res.status(500).json({ error: "Erro ao baixar backup: " + error.message });
    }
  });
  app2.delete("/api/admin/logs/backups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await db.deleteLogBackup(id);
      if (!deleted) {
        return res.status(404).json({ error: "Backup n\xE3o encontrado" });
      }
      res.json({ success: true, message: "Backup exclu\xEDdo com sucesso" });
    } catch (error) {
      console.error("Error deleting log backup:", error);
      res.status(500).json({ error: "Erro ao excluir backup: " + error.message });
    }
  });
  app2.get("/api/finance/receivables", async (req, res) => {
    try {
      const accountsReceivable2 = await db.getAccountsReceivable();
      const manualReceivables2 = await db.getManualReceivables();
      const orders2 = await db.getOrders();
      const enrichedReceivables = await Promise.all(
        accountsReceivable2.map(async (receivable) => {
          try {
            const order = await db.getOrder(receivable.orderId);
            if (!order) {
              console.log(`Order not found for receivable: ${receivable.orderId}`);
              return null;
            }
            let clientName = order.contactName;
            if (!clientName && order.clientId) {
              const clientRecord = await db.getClient(order.clientId);
              if (clientRecord) {
                clientName = clientRecord.name;
              } else {
                const clientByUserId = await db.getClientByUserId(order.clientId);
                if (clientByUserId) {
                  clientName = clientByUserId.name;
                } else {
                  const clientUser = await db.getUser(order.clientId);
                  if (clientUser) {
                    clientName = clientUser.name;
                  }
                }
              }
            }
            if (!clientName) {
              clientName = "Cliente n\xE3o informado";
            }
            const payments2 = await db.getPaymentsByOrder(order.id);
            const confirmedPayments = payments2.filter((p) => p.status === "confirmed");
            const totalPaid = confirmedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            let lastPaymentDate = null;
            if (confirmedPayments.length > 0) {
              const sortedPayments = confirmedPayments.sort(
                (a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime()
              );
              lastPaymentDate = sortedPayments[0].paidAt || sortedPayments[0].createdAt;
            }
            let budgetDownPayment = 0;
            let budgetShippingCost = 0;
            if (order.budgetId) {
              try {
                const budgetPaymentInfo2 = await db.getBudgetPaymentInfo(order.budgetId);
                if (budgetPaymentInfo2) {
                  budgetDownPayment = parseFloat(budgetPaymentInfo2.downPayment || "0");
                  budgetShippingCost = parseFloat(budgetPaymentInfo2.shippingCost || "0");
                  console.log(`[RECEIVABLES API] Order ${order.orderNumber} - Budget down payment: R$ ${budgetDownPayment}, shipping: R$ ${budgetShippingCost}`);
                }
              } catch (error) {
                console.log(`Error getting budget payment info for order ${order.id}:`, error);
              }
            }
            const calculatedMinimumPayment = budgetDownPayment + budgetShippingCost;
            const minimumPayment = calculatedMinimumPayment > 0 ? calculatedMinimumPayment.toFixed(2) : receivable.minimumPayment || "0.00";
            let orderItems = [];
            if (order.budgetId) {
              const budgetItems2 = await db.getBudgetItems(order.budgetId);
              orderItems = budgetItems2 || [];
            } else if (order.items && Array.isArray(order.items)) {
              orderItems = order.items;
            }
            return {
              id: receivable.id,
              orderId: receivable.orderId,
              orderNumber: order.orderNumber,
              clientId: receivable.clientId,
              clientName,
              vendorId: receivable.vendorId,
              dueDate: receivable.dueDate,
              amount: receivable.amount,
              // Total amount of the order
              receivedAmount: totalPaid.toFixed(2),
              // Actually paid amount
              minimumPayment,
              // Minimum required payment (entrada + frete)
              status: receivable.status,
              notes: receivable.notes,
              createdAt: receivable.createdAt,
              updatedAt: receivable.updatedAt,
              lastPaymentDate,
              shippingCost: budgetShippingCost.toFixed(2) || "0.00",
              items: orderItems,
              branchId: order.branchId
            };
          } catch (error) {
            console.error(`Error enriching receivable ${receivable.id}:`, error);
            return null;
          }
        })
      );
      const validOrderReceivables = enrichedReceivables.filter((r) => r !== null);
      const allReceivables = [
        ...validOrderReceivables,
        ...manualReceivables2
      ];
      res.json(allReceivables);
    } catch (error) {
      console.error("Error fetching receivables:", error);
      res.status(500).json({ error: "Failed to fetch receivables" });
    }
  });
  app2.get("/api/finance/pending-orders", async (req, res) => {
    try {
      console.log("Fetching pending orders for payment reconciliation...");
      const allOrders = await db.getOrders();
      const pendingOrders = allOrders.filter((order) => {
        const totalValue = parseFloat(order.totalValue);
        const paidValue = parseFloat(order.paidValue || "0");
        const remainingValue = totalValue - paidValue;
        const shouldInclude = order.status !== "cancelled" && remainingValue > 0.01 && (order.status === "confirmed" || order.status === "production" || order.status === "pending");
        if (shouldInclude) {
          console.log(`Including order ${order.orderNumber}: Total=${totalValue}, Paid=${paidValue}, Remaining=${remainingValue}, Status=${order.status}`);
        }
        return shouldInclude;
      });
      const enrichedOrders = await Promise.all(
        pendingOrders.map(async (order) => {
          let clientName = order.contactName;
          if (!clientName && order.clientId) {
            const clientRecord = await db.getClient(order.clientId);
            if (clientRecord) {
              clientName = clientRecord.name;
            } else {
              const clientByUserId = await db.getClientByUserId(order.clientId);
              if (clientByUserId) {
                clientName = clientByUserId.name;
              } else {
                const clientUser = await db.getUser(order.clientId);
                if (clientUser) {
                  clientName = clientUser.name;
                }
              }
            }
          }
          if (!clientName) {
            clientName = "Nome n\xE3o informado";
          }
          let budgetInfo = null;
          if (order.budgetId) {
            try {
              const budgetPaymentInfo2 = await db.getBudgetPaymentInfo(order.budgetId);
              if (budgetPaymentInfo2) {
                budgetInfo = {
                  downPayment: parseFloat(budgetPaymentInfo2.downPayment || "0"),
                  remainingAmount: parseFloat(budgetPaymentInfo2.remainingAmount || "0"),
                  installments: budgetPaymentInfo2.installments || 1
                };
              }
            } catch (error) {
              console.log("Error fetching budget info for order:", order.id, error);
            }
          }
          return {
            ...order,
            clientName,
            budgetInfo
          };
        })
      );
      console.log(`Returning ${enrichedOrders.length} pending orders for payment reconciliation`);
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching pending orders:", error);
      res.status(500).json({ error: "Failed to fetch pending orders for payment reconciliation" });
    }
  });
  app2.post("/api/finance/expenses", async (req, res) => {
    try {
      const { name, amount, category, date, description, status, createdBy } = req.body;
      if (!name || !amount || !category || !date) {
        return res.status(400).json({ error: "Campos obrigat\xF3rios n\xE3o fornecidos" });
      }
      let effectiveCreatedBy = createdBy || req.user?.id;
      if (!effectiveCreatedBy) {
        const adminUser = await db.getUserByUsername("admin");
        effectiveCreatedBy = adminUser?.id;
        if (!effectiveCreatedBy) {
          console.error("Cannot create expense note: admin user not found in system");
          return res.status(500).json({ error: "Usu\xE1rio admin n\xE3o encontrado no sistema" });
        }
      }
      const expense = await db.createExpenseNote({
        date: new Date(date),
        category,
        description: name + (description ? ` - ${description}` : ""),
        amount: parseFloat(amount).toFixed(2),
        vendorId: null,
        // Notas de despesa não têm vendedor associado
        orderId: null,
        // Não estão associadas a pedidos
        attachmentUrl: null,
        status: status || "recorded",
        approvedBy: null,
        approvedAt: null,
        createdBy: effectiveCreatedBy
      });
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense note:", error);
      res.status(500).json({ error: "Erro ao criar nota de despesa: " + error.message });
    }
  });
  app2.get("/api/finance/expenses", async (req, res) => {
    try {
      const expenses = await db.getExpenseNotes();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expense notes:", error);
      res.status(500).json({ error: "Failed to fetch expense notes" });
    }
  });
  app2.post("/api/finance/associate-multiple-payments", async (req, res) => {
    try {
      const { transactions, orderId, totalAmount } = req.body;
      console.log("Processing multiple payment association:", {
        transactionCount: transactions?.length,
        orderId,
        totalAmount
      });
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ error: "Nenhuma transa\xE7\xE3o fornecida" });
      }
      if (!orderId) {
        return res.status(400).json({ error: "ID do pedido n\xE3o fornecido" });
      }
      let paymentsCreated = 0;
      let errors = [];
      let actualTotalAmount = 0;
      let duplicateCount = 0;
      for (const txn of transactions) {
        try {
          const transaction = await db.getBankTransaction(txn.transactionId);
          if (!transaction) {
            errors.push(`Transa\xE7\xE3o ${txn.transactionId} n\xE3o encontrada`);
            continue;
          }
          if (transaction.status === "matched") {
            errors.push(`Transa\xE7\xE3o ${txn.transactionId} j\xE1 foi conciliada`);
            duplicateCount++;
            continue;
          }
          const amount = Math.abs(parseFloat(transaction.amount));
          const payment = await db.createPayment({
            orderId,
            amount: amount.toFixed(2),
            method: "bank_transfer",
            status: "confirmed",
            transactionId: transaction.fitId || `TXN-${Date.now()}`,
            notes: `Concilia\xE7\xE3o OFX - ${transaction.description}`,
            paidAt: new Date(transaction.date),
            // Mark as OFX reconciled to prevent manual payment
            reconciliationStatus: "ofx",
            bankTransactionId: txn.transactionId
          });
          await db.updateBankTransaction(txn.transactionId, {
            status: "matched",
            matchedOrderId: orderId,
            matchedPaymentId: payment.id,
            matchedAt: /* @__PURE__ */ new Date(),
            notes: `Conciliado com pedido ${orderId}`,
            matchedEntityType: "payment",
            matchedEntityId: payment.id
          });
          paymentsCreated++;
          actualTotalAmount += amount;
          console.log(`Created payment ${payment.id} for R$ ${amount} from transaction ${txn.transactionId}`);
        } catch (error) {
          console.error(`Error processing transaction ${txn.transactionId}:`, error);
          errors.push(`Erro ao processar transa\xE7\xE3o ${txn.transactionId}: ${error.message}`);
        }
      }
      if (paymentsCreated > 0) {
        await db.updateOrderPaidValue(orderId);
      }
      res.json({
        success: true,
        paymentsCreated,
        totalAmount: actualTotalAmount.toFixed(2),
        errors,
        duplicates: duplicateCount
      });
    } catch (error) {
      console.error("Error in multiple payment association:", error);
      res.status(500).json({ error: "Erro ao processar associa\xE7\xE3o m\xFAltipla de pagamentos: " + error.message });
    }
  });
  app2.post("/api/finance/associate-payment", async (req, res) => {
    try {
      const { transactionId, orderId, amount } = req.body;
      console.log("Processing single payment association:", { transactionId, orderId, amount });
      const transaction = await db.getBankTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "Transa\xE7\xE3o n\xE3o encontrada" });
      }
      if (transaction.status === "matched") {
        return res.status(400).json({ error: "Transa\xE7\xE3o j\xE1 foi conciliada" });
      }
      const paymentAmount = parseFloat(amount);
      const transactionAmount = Math.abs(parseFloat(transaction.amount));
      const payment = await db.createPayment({
        orderId,
        amount: paymentAmount.toFixed(2),
        method: "bank_transfer",
        status: "confirmed",
        transactionId: transaction.fitId || `TXN-${Date.now()}`,
        notes: `Concilia\xE7\xE3o OFX - ${transaction.description}`,
        paidAt: new Date(transaction.date),
        // Mark as OFX reconciled to prevent manual payment
        reconciliationStatus: "ofx",
        bankTransactionId: transactionId
      });
      await db.updateBankTransaction(transactionId, {
        status: "matched",
        matchedOrderId: orderId,
        matchedPaymentId: payment.id,
        matchedAt: /* @__PURE__ */ new Date(),
        notes: `Conciliado com pedido ${orderId}`,
        matchedEntityType: "payment",
        matchedEntityId: payment.id
      });
      await db.updateOrderPaidValue(orderId);
      const order = await db.getOrder(orderId);
      await db.logUserAction(
        req.user?.id || "system",
        req.user?.name || "Sistema",
        req.user?.role || "system",
        "CREATE",
        "payments",
        payment.id,
        `Pagamento processado via OFX: R$ ${paymentAmount.toFixed(2)} - Pedido: ${order?.orderNumber}`,
        "success",
        {
          amount: paymentAmount.toFixed(2),
          method: "bank_transfer",
          orderId,
          orderNumber: order?.orderNumber,
          transactionId: payment.transactionId
        }
      );
      console.log(`Created payment ${payment.id} for R$ ${paymentAmount}`);
      res.json({
        success: true,
        payment,
        message: "Pagamento associado com sucesso"
      });
    } catch (error) {
      console.error("Error in payment association:", error);
      res.status(500).json({ error: "Erro ao associar pagamento: " + error.message });
    }
  });
  app2.post("/api/receivables/:id/payment", async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, method, transactionId, notes } = req.body;
      console.log("Processing receivables payment:", { id, amount, method, transactionId });
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Valor deve ser maior que zero" });
      }
      const receivables = await db.getAccountsReceivable();
      const receivable = receivables.find((r) => r.id === id);
      if (!receivable) {
        return res.status(404).json({ error: "Conta a receber n\xE3o encontrada" });
      }
      let paymentRecord;
      if (receivable.orderId) {
        const order = await db.getOrder(receivable.orderId);
        if (!order) {
          return res.status(404).json({ error: "Pedido relacionado n\xE3o encontrado" });
        }
        const requested = parseFloat(amount);
        const alreadyPaid = parseFloat(order.paidValue || "0");
        const total = parseFloat(order.totalValue);
        const allowable = Math.max(0, total - alreadyPaid);
        const finalAmount = Math.min(requested, allowable);
        if (finalAmount !== requested) {
          console.log(`[RECEIVABLES PAYMENT] Clamped payment from ${requested} to ${finalAmount} for order ${order.orderNumber}`);
        }
        paymentRecord = await db.createPayment({
          orderId: receivable.orderId,
          amount: finalAmount.toFixed(2),
          method: method || "manual",
          status: "confirmed",
          transactionId: transactionId || `MANUAL-${Date.now()}`,
          notes: notes || "",
          paidAt: /* @__PURE__ */ new Date()
        });
        console.log(`[RECEIVABLE PAYMENT] Created payment for order ${order.orderNumber}: amount=${finalAmount.toFixed(2)}`);
        const currentReceived = parseFloat(receivable.receivedAmount || "0");
        const newReceivedAmount = currentReceived + finalAmount;
        const totalAmount = parseFloat(receivable.amount);
        await db.updateAccountsReceivable(receivable.id, {
          receivedAmount: newReceivedAmount.toFixed(2),
          status: newReceivedAmount >= totalAmount ? "paid" : "partial",
          updatedAt: /* @__PURE__ */ new Date()
        });
        console.log(`[RECEIVABLE PAYMENT] Updated receivedAmount from ${currentReceived} to ${newReceivedAmount.toFixed(2)} for receivable ${receivable.id}`);
      } else {
        const currentReceived = parseFloat(receivable.receivedAmount || "0");
        const newReceivedAmount = currentReceived + parseFloat(amount);
        await db.updateAccountsReceivable(id, {
          receivedAmount: newReceivedAmount.toFixed(2),
          status: newReceivedAmount >= parseFloat(receivable.amount) ? "paid" : "partial"
        });
        paymentRecord = {
          id: `payment-${Date.now()}`,
          amount: parseFloat(amount).toFixed(2),
          method: method || "manual",
          transactionId: transactionId || `MANUAL-${Date.now()}`,
          notes: notes || "",
          paidAt: /* @__PURE__ */ new Date()
        };
      }
      console.log("Payment processed successfully:", paymentRecord);
      res.json({ success: true, payment: paymentRecord });
    } catch (error) {
      console.error("Error processing receivables payment:", error);
      res.status(500).json({ error: "Erro ao processar pagamento: " + error.message });
    }
  });
  app2.post("/api/finance/payables/manual", async (req, res) => {
    try {
      const { beneficiary, description, amount, dueDate, category, notes, attachmentUrl, attachmentUrl2 } = req.body;
      if (!beneficiary || !description || !amount || !dueDate) {
        return res.status(400).json({ error: "Campos obrigat\xF3rios n\xE3o fornecidos" });
      }
      const payable = await db.createManualPayable({
        beneficiary,
        description,
        amount: parseFloat(amount).toFixed(2),
        dueDate: new Date(dueDate),
        category: category || "Outros",
        notes: notes || null,
        attachmentUrl: attachmentUrl || null,
        attachmentUrl2: attachmentUrl2 || null
      });
      console.log(`Created manual payable: ${payable.id} - ${payable.description} - R$ ${payable.amount}`);
      res.json(payable);
    } catch (error) {
      console.error("Error creating manual payable:", error);
      res.status(500).json({ error: "Erro ao criar conta a pagar: " + error.message });
    }
  });
  app2.get("/api/finance/payables/manual", async (req, res) => {
    try {
      const payables = await db.getManualPayables();
      console.log(`Returning ${payables.length} manual payables to frontend`);
      res.json(payables);
    } catch (error) {
      console.error("Error fetching manual payables:", error);
      res.status(500).json({ error: "Erro ao buscar contas a pagar manuais: " + error.message });
    }
  });
  app2.post("/api/finance/payables/manual/:id/pay", async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, notes, transactionId } = req.body;
      console.log(`Processing payment for manual payable: ${id}`, { paymentMethod, notes, transactionId });
      const updatedPayable = await db.updateManualPayable(id, {
        status: "paid",
        paidBy: req.user?.id || null,
        // Use authenticated user ID instead of hardcoded 'admin-1'
        paidAt: /* @__PURE__ */ new Date(),
        paymentMethod: paymentMethod || "manual",
        paymentNotes: notes || null,
        transactionId: transactionId || null
      });
      if (!updatedPayable) {
        return res.status(404).json({ error: "Conta a pagar n\xE3o encontrada" });
      }
      console.log(`Manual payable ${id} marked as paid successfully`);
      res.json({
        success: true,
        payable: updatedPayable,
        message: "Pagamento registrado com sucesso"
      });
    } catch (error) {
      console.error("Error processing manual payable payment:", error);
      res.status(500).json({ error: "Erro ao registrar pagamento: " + error.message });
    }
  });
  app2.get("/api/finance/estornos", async (req, res) => {
    try {
      const allPayables = await db.getManualPayables();
      const estornos = allPayables.filter((p) => p.category === "Estorno");
      const enrichedEstornos = await Promise.all(estornos.map(async (estorno) => {
        let clientName = estorno.beneficiary;
        let orderNumber = null;
        if (estorno.orderId) {
          const order = await db.getOrder(estorno.orderId);
          if (order) {
            orderNumber = order.orderNumber;
          }
        }
        if (estorno.clientId) {
          const client2 = await db.getClient(estorno.clientId);
          if (client2) {
            clientName = client2.name || client2.nomeFantasia || client2.razaoSocial || estorno.beneficiary;
          }
        }
        return {
          ...estorno,
          clientName,
          orderNumber
        };
      }));
      console.log(`Returning ${enrichedEstornos.length} estornos (refunds)`);
      res.json(enrichedEstornos);
    } catch (error) {
      console.error("Error fetching estornos:", error);
      res.status(500).json({ error: "Erro ao buscar estornos: " + error.message });
    }
  });
  app2.post("/api/finance/estornos/:id/process", async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, notes, transactionId } = req.body;
      console.log(`Processing estorno: ${id}`, { paymentMethod, notes, transactionId });
      let estorno = await db.getManualPayable(id);
      if (!estorno) {
        const order = await db.getOrder(id);
        if (order && order.status === "cancelled") {
          const payables = await db.getManualPayables();
          estorno = payables.find((p) => p.orderId === id && p.category === "Estorno");
          if (!estorno) {
            if (parseFloat(order.paidValue || "0") > 0) {
              const client2 = await db.getClient(order.clientId);
              estorno = await db.createManualPayable({
                beneficiary: client2?.name || "Cliente",
                description: `Estorno - Pedido ${order.orderNumber} cancelado`,
                amount: order.paidValue,
                dueDate: /* @__PURE__ */ new Date(),
                category: "Estorno",
                orderId: order.id,
                clientId: order.clientId,
                branchId: order.branchId,
                status: "pending"
              });
            }
          }
        }
      }
      if (!estorno) {
        return res.status(404).json({ error: "Estorno n\xE3o encontrado" });
      }
      const updatedEstorno = await db.updateManualPayable(estorno.id, {
        status: "refunded",
        paidBy: req.user?.id || null,
        paidAt: /* @__PURE__ */ new Date(),
        paymentMethod: paymentMethod || "pix",
        paymentNotes: notes || "Estorno processado",
        transactionId: transactionId || null
      });
      const orderIdToUpdate = estorno.orderId || id;
      console.log(`Attempting to update order: ${orderIdToUpdate}`);
      try {
        const orderUpdate = await db.updateOrder(orderIdToUpdate, {
          refundedAt: /* @__PURE__ */ new Date(),
          refundAmount: estorno.amount,
          refundNotes: notes || "Estorno processado via financeiro"
        });
        console.log(`Order ${orderIdToUpdate} updated successfully:`, orderUpdate ? "yes" : "no");
      } catch (orderError) {
        console.error(`Failed to update order ${orderIdToUpdate}:`, orderError);
      }
      console.log(`Estorno ${estorno.id} processed successfully`);
      res.json({
        success: true,
        estorno: updatedEstorno,
        message: "Estorno processado com sucesso"
      });
    } catch (error) {
      console.error("Error processing estorno:", error);
      res.status(500).json({ error: "Erro ao processar estorno: " + error.message });
    }
  });
  app2.post("/api/finance/receivables/manual", async (req, res) => {
    try {
      const { clientName, description, amount, dueDate, notes } = req.body;
      if (!clientName || !description || !amount || !dueDate) {
        return res.status(400).json({ error: "Campos obrigat\xF3rios n\xE3o fornecidos" });
      }
      const receivable = await db.createManualReceivable({
        clientName,
        description,
        amount: parseFloat(amount).toFixed(2),
        dueDate: new Date(dueDate),
        notes: notes || null
      });
      res.json(receivable);
    } catch (error) {
      console.error("Error creating manual receivable:", error);
      res.status(500).json({ error: "Erro ao criar conta a receber: " + error.message });
    }
  });
  app2.post("/api/finance/ofx-import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo OFX enviado" });
      }
      if (!req.file.originalname.toLowerCase().endsWith(".ofx")) {
        return res.status(400).json({ error: "Arquivo deve ter extens\xE3o .ofx" });
      }
      console.log(`Processing OFX file: ${req.file.originalname} (${req.file.size} bytes)`);
      const parseResult = await parseOFXBuffer(req.file.buffer);
      const { transactions, stats } = parseResult;
      if (transactions.length === 0) {
        return res.status(400).json({ error: "Nenhuma transa\xE7\xE3o encontrada no arquivo OFX" });
      }
      let uploadedById = req.user?.id;
      if (!uploadedById) {
        const adminUser = await db.getUserByUsername("admin");
        uploadedById = adminUser?.id;
        if (!uploadedById) {
          return res.status(500).json({ error: "Usu\xE1rio admin n\xE3o encontrado no sistema" });
        }
      }
      const importRecord = await db.createBankImport({
        filename: req.file.originalname,
        uploadedBy: uploadedById,
        status: "processing",
        fileSize: req.file.size.toString(),
        transactionCount: transactions.length
      });
      console.log(`Created import record: ${importRecord.id}`);
      let importedCount = 0;
      let skippedCount = 0;
      let errors = [];
      for (const transaction of transactions) {
        try {
          const existingTransaction = await db.getBankTransactionByFitId(transaction.fitId);
          if (existingTransaction) {
            console.log(`Transaction already exists: ${transaction.fitId}`);
            skippedCount++;
            continue;
          }
          if (!transaction.fitId) {
            console.log(`Skipping transaction without fitId:`, transaction);
            errors.push(`Transa\xE7\xE3o sem ID \xFAnico (FITID)`);
            continue;
          }
          if (!transaction.amount || transaction.amount === "0" || transaction.amount === "0.00") {
            console.log(`Skipping zero amount transaction:`, transaction);
            errors.push(`Transa\xE7\xE3o com valor zero: ${transaction.fitId}`);
            continue;
          }
          let transactionDate = transaction.date;
          if (!transactionDate || !transaction.hasValidDate) {
            transactionDate = /* @__PURE__ */ new Date();
            console.warn(`Using current date for transaction ${transaction.fitId} - original date invalid`);
          }
          const newTransaction = await db.createBankTransaction({
            importId: importRecord.id,
            fitId: transaction.fitId,
            date: transactionDate,
            hasValidDate: transaction.hasValidDate || false,
            amount: transaction.amount,
            description: transaction.description || "Transa\xE7\xE3o banc\xE1ria",
            memo: transaction.description || "",
            bankRef: transaction.bankRef || "",
            originalType: transaction.originalType || "",
            type: transaction.type || "other",
            status: "unmatched",
            notes: ""
          });
          console.log(`Created transaction: ${newTransaction.id} - ${transaction.description} - R$ ${transaction.amount}`);
          importedCount++;
        } catch (error) {
          console.error("Error saving transaction:", error);
          errors.push(`Erro ao salvar transa\xE7\xE3o ${transaction.fitId || "sem ID"}: ${error.message}`);
        }
      }
      await db.updateBankImport(importRecord.id, {
        status: "completed",
        processedTransactions: importedCount,
        skippedTransactions: skippedCount
      });
      console.log(`OFX import completed: ${importedCount} imported, ${skippedCount} skipped`);
      res.json({
        success: true,
        message: `Arquivo OFX importado com sucesso! ${importedCount} transa\xE7\xF5es importadas, ${skippedCount} duplicatas ignoradas.`,
        importId: importRecord.id,
        stats: {
          total: transactions.length,
          imported: importedCount,
          skipped: skippedCount,
          ...stats
        },
        errors: errors.length > 0 ? errors : void 0
      });
    } catch (error) {
      console.error("OFX import error:", error);
      res.status(500).json({
        error: "Erro ao importar arquivo OFX",
        details: error.message
      });
    }
  });
  app2.post("/api/finance/producer-ofx-import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo OFX enviado" });
      }
      if (!req.file.originalname.toLowerCase().endsWith(".ofx")) {
        return res.status(400).json({ error: "Arquivo deve ter extens\xE3o .ofx" });
      }
      console.log(`Processing producer payment OFX file: ${req.file.originalname} (${req.file.size} bytes)`);
      const parseResult = await parseOFXBuffer(req.file.buffer);
      const { transactions, stats } = parseResult;
      if (transactions.length === 0) {
        return res.status(400).json({ error: "Nenhuma transa\xE7\xE3o encontrada no arquivo OFX" });
      }
      const debitTransactions = transactions.filter(
        (t) => t.type === "debit" || t.originalType === "PAYMENT" || t.originalType === "DEBIT" || t.originalType === "XFER" || parseFloat(t.amount) < 0
        // Also accept negative amounts as debits
      );
      console.log(`Processing producer payment OFX file: Found ${debitTransactions.length} debit transactions out of ${transactions.length} total`);
      console.log(`Sample transactions:`, transactions.slice(0, 3).map((t) => ({
        type: t.type,
        originalType: t.originalType,
        amount: t.amount,
        description: t.description
      })));
      if (debitTransactions.length === 0) {
        return res.status(400).json({
          error: "Nenhuma transa\xE7\xE3o de d\xE9bito (pagamentos) encontrada no arquivo OFX"
        });
      }
      let uploadedById = req.user?.id;
      if (!uploadedById) {
        const adminUser = await db.getUserByUsername("admin");
        uploadedById = adminUser?.id;
        if (!uploadedById) {
          return res.status(500).json({ error: "Usu\xE1rio admin n\xE3o encontrado no sistema" });
        }
      }
      const importRecord = await db.createBankImport({
        filename: req.file.originalname,
        uploadedBy: uploadedById,
        status: "processing",
        fileSize: req.file.size.toString(),
        transactionCount: debitTransactions.length
      });
      console.log(`Created producer payment import record: ${importRecord.id}`);
      let importedCount = 0;
      let skippedCount = 0;
      let errors = [];
      for (const transaction of debitTransactions) {
        try {
          const existingTransaction = await db.getBankTransactionByFitId(transaction.fitId);
          if (existingTransaction) {
            console.log(`Transaction ${transaction.fitId} already exists, skipping`);
            skippedCount++;
            continue;
          }
          if (!transaction.fitId) {
            console.log(`Skipping debit transaction without fitId:`, transaction);
            errors.push(`Transa\xE7\xE3o de d\xE9bito sem ID \xFAnico (FITID)`);
            continue;
          }
          let transactionDate = transaction.date;
          if (!transactionDate || !transaction.hasValidDate) {
            transactionDate = /* @__PURE__ */ new Date();
            console.warn(`Using current date for debit transaction ${transaction.fitId}`);
          }
          await db.createBankTransaction({
            importId: importRecord.id,
            fitId: transaction.fitId,
            date: transactionDate,
            hasValidDate: transaction.hasValidDate || false,
            amount: transaction.amount,
            // Keep original negative value
            description: transaction.description || "Pagamento banc\xE1rio",
            memo: transaction.description || "",
            bankRef: transaction.bankRef || "",
            originalType: transaction.originalType || "",
            type: transaction.type || "debit",
            status: "unmatched",
            notes: ""
          });
          console.log(`Created debit transaction: ${transaction.fitId} - ${transaction.description} - R$ ${transaction.amount}`);
          importedCount++;
        } catch (transactionError) {
          console.error(`Error importing producer payment transaction ${transaction.fitId}:`, transactionError);
          errors.push(`Erro ao importar transa\xE7\xE3o ${transaction.fitId || "sem ID"}: ${transactionError.message}`);
        }
      }
      await db.updateBankImport(importRecord.id, {
        status: "completed",
        processedTransactions: importedCount,
        skippedTransactions: skippedCount
      });
      console.log(`Producer payment OFX import completed: ${importedCount} imported, ${skippedCount} skipped`);
      res.json({
        success: true,
        message: `Arquivo OFX de pagamentos importado com sucesso! ${importedCount} transa\xE7\xF5es de d\xE9bito importadas, ${skippedCount} duplicatas ignoradas.`,
        importId: importRecord.id,
        stats: {
          total: transactions.length,
          debits: debitTransactions.length,
          imported: importedCount,
          skipped: skippedCount,
          ...stats
        },
        errors: errors.length > 0 ? errors : void 0
      });
    } catch (error) {
      console.error("Producer payment OFX import error:", error);
      res.status(500).json({
        error: "Erro ao importar arquivo OFX de pagamentos",
        details: error.message
      });
    }
  });
  app2.get("/api/finance/overview", async (req, res) => {
    try {
      const { branchId } = req.query;
      let orders2 = await db.getOrders();
      const payments2 = await db.getPayments();
      let allCommissions = await db.getAllCommissions();
      let productionOrders3 = await db.getProductionOrders();
      const bankTransactions2 = await db.getBankTransactions();
      const expenseNotes2 = await db.getExpenseNotes();
      let producerPayments2 = await db.getProducerPayments();
      if (branchId && branchId !== "all") {
        console.log(`Filtering financial overview by branchId: ${branchId}`);
        orders2 = orders2.filter((order) => order.branchId === branchId);
        const orderIds = orders2.map((o) => o.id);
        productionOrders3 = productionOrders3.filter((po) => orderIds.includes(po.orderId));
        const productionOrderIds = productionOrders3.map((po) => po.id);
        producerPayments2 = producerPayments2.filter((pp) => productionOrderIds.includes(pp.productionOrderId));
        allCommissions = allCommissions.filter((c) => orderIds.includes(c.orderId));
      }
      console.log("Overview calculation - Data counts:", {
        orders: orders2.length,
        payments: payments2.length,
        commissions: allCommissions.length,
        productionOrders: productionOrders3.length,
        expenseNotes: expenseNotes2.length,
        producerPayments: producerPayments2.length,
        branchId: branchId || "all"
      });
      let accountsReceivable2 = await db.getAccountsReceivable();
      if (branchId && branchId !== "all") {
        const orderIds = orders2.map((o) => o.id);
        accountsReceivable2 = accountsReceivable2.filter((ar) => orderIds.includes(ar.orderId));
      }
      const orderReceivables = accountsReceivable2.filter((ar) => ar.status !== "paid" && ar.status !== "cancelled").reduce((total, ar) => {
        const amount = parseFloat(ar.amount || "0");
        const received = parseFloat(ar.receivedAmount || "0");
        const remaining = amount - received;
        return total + Math.max(0, remaining);
      }, 0);
      const manualReceivables2 = await db.getManualReceivables();
      const manualReceivablesAmount = manualReceivables2.filter((receivable) => receivable.status !== "paid" && receivable.status !== "cancelled").reduce((total, receivable) => {
        const amount = parseFloat(receivable.amount || "0");
        const received = parseFloat(receivable.receivedAmount || "0");
        return total + Math.max(0, amount - received);
      }, 0);
      const receivables = orderReceivables + manualReceivablesAmount;
      const producers = producerPayments2.filter((payment) => ["pending", "approved"].includes(payment.status)).reduce((total, payment) => total + parseFloat(payment.amount || "0"), 0);
      console.log(`Producer payments pending/approved: ${producerPayments2.filter((p) => ["pending", "approved"].includes(p.status)).length}, total: ${producers}`);
      const expenses = expenseNotes2.filter((expense) => expense.status === "approved" && !expense.reimbursedAt).reduce((total, expense) => total + parseFloat(expense.amount), 0);
      console.log(`Expenses approved not reimbursed: ${expenseNotes2.filter((e) => e.status === "approved" && !e.reimbursedAt).length}, total: ${expenses}`);
      const commissions2 = allCommissions.filter((c) => ["pending", "confirmed"].includes(c.status) && !c.paidAt).reduce((total, c) => total + parseFloat(c.amount), 0);
      console.log(`Commissions pending/confirmed: ${allCommissions.filter((c) => ["pending", "confirmed"].includes(c.status) && !c.paidAt).length}, total: ${commissions2}`);
      const refunds = orders2.filter((order) => order.status === "cancelled" && parseFloat(order.refundAmount || "0") > 0).reduce((total, order) => {
        return total + parseFloat(order.refundAmount || "0");
      }, 0);
      console.log(`Refunds for cancelled orders: ${orders2.filter((o) => o.status === "cancelled" && parseFloat(o.refundAmount || "0") > 0).length}, total: ${refunds}`);
      const manualPayables2 = await db.getManualPayables();
      console.log(`Found ${manualPayables2.length} manual payables:`, manualPayables2.map((p) => ({ id: p.id, amount: p.amount, status: p.status })));
      const manualPayablesAmount = manualPayables2.filter((payable) => payable.status === "pending").reduce((total, payable) => total + parseFloat(payable.amount || "0"), 0);
      console.log(`Manual payables total: ${manualPayablesAmount}`);
      const payables = producers + expenses + commissions2 + refunds + manualPayablesAmount;
      console.log("Payables breakdown:", {
        producers: Number(producers) || 0,
        expenses: Number(expenses) || 0,
        commissions: Number(commissions2) || 0,
        refunds: Number(refunds) || 0,
        manual: Number(manualPayablesAmount) || 0
      });
      const bankBalance = bankTransactions2.reduce((total, txn) => {
        const amount = parseFloat(txn.amount);
        return total + amount;
      }, 0);
      const pendingCommissions = allCommissions.filter((c) => ["pending", "confirmed"].includes(c.status) && !c.paidAt).reduce((total, c) => total + parseFloat(c.amount), 0);
      const currentMonth = (/* @__PURE__ */ new Date()).getMonth();
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const monthlyRevenue = orders2.filter((order) => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      }).reduce((total, order) => total + parseFloat(order.totalValue), 0);
      const monthlyExpenses = expenseNotes2.filter((expense) => {
        if (!expense.createdAt) return false;
        const expenseDate = new Date(expense.createdAt);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      }).reduce((total, expense) => total + parseFloat(expense.amount), 0);
      res.json({
        receivables,
        totalReceivables: orderReceivables + manualReceivablesAmount,
        payables,
        totalPayables: producers + expenses + commissions2 + refunds + manualPayablesAmount,
        payablesBreakdown: {
          producers: Number(producers) || 0,
          expenses: Number(expenses) || 0,
          commissions: Number(commissions2) || 0,
          refunds: Number(refunds) || 0,
          manual: Number(manualPayablesAmount) || 0
        },
        balance: bankBalance,
        pendingCommissions,
        monthlyRevenue,
        monthlyExpenses
      });
    } catch (error) {
      console.error("Error fetching financial overview:", error);
      res.status(500).json({ error: "Failed to fetch financial overview" });
    }
  });
  app2.get("/api/finance/payments", async (req, res) => {
    try {
      const payments2 = await db.getPayments();
      const orders2 = await db.getOrders();
      const enrichedPayments = await Promise.all(
        payments2.map(async (payment) => {
          const order = orders2.find((o) => o.id === payment.orderId);
          let clientName = "Cliente n\xE3o identificado";
          if (order) {
            clientName = order.contactName;
            if (!clientName && order.clientId) {
              const clientRecord = await db.getClient(order.clientId);
              if (clientRecord) {
                clientName = clientRecord.name;
              } else {
                const clientByUserId = await db.getClientByUserId(order.clientId);
                if (clientByUserId) {
                  clientName = clientByUserId.name;
                } else {
                  const clientUser = await db.getUser(order.clientId);
                  if (clientUser) {
                    clientName = clientUser.name;
                  }
                }
              }
            }
          }
          return {
            ...payment,
            orderNumber: order?.orderNumber || `#${payment.orderId?.slice(-6)}`,
            clientName,
            description: `${payment.method?.toUpperCase() || "PAGAMENTO"} - ${clientName}`,
            orderValue: order?.totalValue || "0.00"
          };
        })
      );
      enrichedPayments.sort((a, b) => {
        const dateA = new Date(a.paidAt || a.createdAt);
        const dateB = new Date(b.paidAt || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      res.json(enrichedPayments);
    } catch (error) {
      console.error("Error fetching finance payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });
  app2.get("/api/producer/:producerId/stats", async (req, res) => {
    try {
      const { producerId } = req.params;
      const productionOrders3 = await db.getProductionOrdersByProducer(producerId);
      const producerPayments2 = await db.getProducerPaymentsByProducer(producerId);
      const activeOrders = productionOrders3.filter((po) => po.status === "production" || po.status === "accepted").length;
      const pendingOrders = productionOrders3.filter((po) => po.status === "pending").length;
      const completedOrders = productionOrders3.filter((po) => po.status === "completed").length;
      const totalOrders = productionOrders3.length;
      const pendingPayments = producerPayments2.filter((p) => p.status === "pending" || p.status === "approved").reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalReceived = producerPayments2.filter((p) => p.status === "paid").reduce((sum, p) => sum + parseFloat(p.amount), 0);
      res.json({
        activeOrders,
        pendingOrders,
        completedOrders,
        totalOrders,
        pendingPayments,
        totalReceived
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch producer stats" });
    }
  });
  app2.get("/api/products", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const search = req.query.search || "";
      const category = req.query.category || "";
      const result = await db.getProducts({
        page,
        limit,
        search,
        category
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  app2.get("/api/products/by-producer", async (req, res) => {
    try {
      const result = await db.getProducts({ limit: 9999 });
      res.json(result.products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  app2.get("/api/products/producer/:producerId", async (req, res) => {
    try {
      const result = await db.getProducts({ limit: 9999 });
      res.json(result.products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  app2.get("/api/products/categories", async (req, res) => {
    try {
      const result = await db.getProducts({ limit: 9999 });
      const categories = Array.from(new Set(
        result.products.map((product) => product.category).filter(Boolean)
      )).sort();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  app2.get("/api/products/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const products2 = await db.searchProducts(q);
      res.json(products2);
    } catch (error) {
      res.status(500).json({ error: "Failed to search products" });
    }
  });
  app2.post("/api/products", async (req, res) => {
    try {
      const productData = req.body;
      const newProduct = await db.createProduct(productData);
      res.json(newProduct);
    } catch (error) {
      res.status(500).json({ error: "Failed to createproduct" });
    }
  });
  app2.get("/api/clients/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(`Fetching profile for user: ${userId}`);
      const clientRecord = await db.getClientByUserId(userId);
      let clientData;
      if (clientRecord) {
        console.log(`Found client record: ${clientRecord.id}`);
        const vendor = clientRecord.vendorId ? await db.getUser(clientRecord.vendorId) : null;
        clientData = {
          ...clientRecord,
          vendorName: vendor?.name || null
        };
      } else {
        const user = await db.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "Cliente n\xE3o encontrado" });
        }
        clientData = {
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          isActive: user.isActive,
          vendorName: null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
      }
      res.json(clientData);
    } catch (error) {
      console.error("Error fetching client profile:", error);
      res.status(500).json({ error: "Failed to fetch client profile" });
    }
  });
  app2.put("/api/clients/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      console.log(`Updating profile for user: ${userId}`, updateData);
      const updatedUser = await db.updateUser(userId, {
        email: updateData.email,
        phone: updateData.phone,
        address: updateData.address
      });
      const clientRecord = await db.getClientByUserId(userId);
      if (clientRecord) {
        await db.updateClient(clientRecord.id, {
          email: updateData.email,
          phone: updateData.phone,
          whatsapp: updateData.whatsapp,
          address: updateData.address,
          // Commercial fields
          nomeFantasia: updateData.nomeFantasia,
          razaoSocial: updateData.razaoSocial,
          inscricaoEstadual: updateData.inscricaoEstadual,
          logradouro: updateData.logradouro,
          numero: updateData.numero,
          complemento: updateData.complemento,
          bairro: updateData.bairro,
          cidade: updateData.cidade,
          cep: updateData.cep,
          emailBoleto: updateData.emailBoleto,
          emailNF: updateData.emailNF,
          nomeContato: updateData.nomeContato,
          emailContato: updateData.emailContato
        });
      }
      const updatedData = await db.getClientByUserId(userId);
      const vendor = updatedData?.vendorId ? await db.getUser(updatedData.vendorId) : null;
      res.json({
        ...updatedData,
        vendorName: vendor?.name || null
      });
    } catch (error) {
      console.error("Error updating client profile:", error);
      res.status(500).json({ error: "Failed to update client profile" });
    }
  });
  app2.put("/api/clients/password/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { currentPassword, newPassword } = req.body;
      const user = await db.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado" });
      }
      if (user.password !== currentPassword) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }
      await db.updateUser(userId, { password: newPassword });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating client password:", error);
      res.status(500).json({ error: "Failed to update password" });
    }
  });
  app2.get("/api/clients", async (req, res) => {
    try {
      const clients2 = await db.getClients();
      const enrichedClients = await Promise.all(
        clients2.map(async (client2) => {
          const vendor = client2.vendorId ? await db.getUser(client2.vendorId) : null;
          const ownerUser = client2.userId ? await db.getUser(client2.userId) : null;
          const clientOrders = await db.getOrdersByClient(client2.id);
          const totalSpent = clientOrders.reduce(
            (sum, order) => sum + parseFloat(order.totalValue || "0"),
            0
          );
          const enriched = {
            ...client2,
            userCode: ownerUser?.username || null,
            vendorName: vendor?.name || null,
            ordersCount: clientOrders.length,
            totalSpent
          };
          return enriched;
        })
      );
      res.json(enrichedClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });
  app2.get("/api/clients/:id/orders", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching orders for client: ${id}`);
      const orders2 = await db.getOrdersByClient(id);
      console.log(`Found ${orders2.length} orders for client ${id}`);
      const enrichmentService = new OrderEnrichmentService(db);
      const enrichedOrders = await enrichmentService.enrichOrders(orders2, {
        includeUnreadNotes: true
      });
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching client orders:", error);
      res.status(500).json({ error: "Failed to fetch client orders" });
    }
  });
  app2.post("/api/clients", async (req, res) => {
    try {
      const clientData = req.body;
      console.log("=== CREATING CLIENT ===");
      console.log("Request body:", JSON.stringify(clientData, null, 2));
      if (!clientData.name) {
        console.log("ERROR: Nome \xE9 obrigat\xF3rio");
        return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio" });
      }
      if (!clientData.password) {
        console.log("ERROR: Senha \xE9 obrigat\xF3ria");
        return res.status(400).json({ error: "Senha \xE9 obrigat\xF3ria" });
      }
      const username = clientData.userCode || `cli_${Date.now()}`;
      console.log(`Generated username: ${username}`);
      const existingUser = await db.getUserByUsername(username);
      if (existingUser) {
        console.log(`ERROR: Username ${username} already exists`);
        return res.status(400).json({ error: "C\xF3digo de usu\xE1rio j\xE1 existe" });
      }
      console.log("Creating user and client atomically in transaction...");
      const { user, client: client2 } = await db.createClientWithUser(
        {
          username,
          password: clientData.password,
          name: clientData.name,
          email: clientData.email || null,
          phone: clientData.phone || null
        },
        {
          whatsapp: clientData.whatsapp || null,
          cpfCnpj: clientData.cpfCnpj || null,
          address: clientData.address || null,
          vendorId: clientData.vendorId || null,
          isActive: true,
          nomeFantasia: clientData.nomeFantasia || null,
          razaoSocial: clientData.razaoSocial || null,
          inscricaoEstadual: clientData.inscricaoEstadual || null,
          logradouro: clientData.logradouro || null,
          numero: clientData.numero || null,
          complemento: clientData.complemento || null,
          bairro: clientData.bairro || null,
          cidade: clientData.cidade || null,
          cep: clientData.cep || null,
          emailBoleto: clientData.emailBoleto || null,
          emailNF: clientData.emailNF || null,
          nomeContato: clientData.nomeContato || null,
          emailContato: clientData.emailContato || null,
          enderecoFaturamentoLogradouro: clientData.enderecoFaturamentoLogradouro || null,
          enderecoFaturamentoNumero: clientData.enderecoFaturamentoNumero || null,
          enderecoFaturamentoComplemento: clientData.enderecoFaturamentoComplemento || null,
          enderecoFaturamentoBairro: clientData.enderecoFaturamentoBairro || null,
          enderecoFaturamentoCidade: clientData.enderecoFaturamentoCidade || null,
          enderecoFaturamentoCep: clientData.enderecoFaturamentoCep || null,
          enderecoEntregaLogradouro: clientData.enderecoEntregaLogradouro || null,
          enderecoEntregaNumero: clientData.enderecoEntregaNumero || null,
          enderecoEntregaComplemento: clientData.enderecoEntregaComplemento || null,
          enderecoEntregaBairro: clientData.enderecoEntregaBairro || null,
          enderecoEntregaCidade: clientData.enderecoEntregaCidade || null,
          enderecoEntregaCep: clientData.enderecoEntregaCep || null
        }
      );
      console.log(`SUCCESS: User and client created successfully: ${client2.id} - ${client2.name}`);
      const response = {
        success: true,
        client: {
          ...client2,
          userCode: username
          // Include userCode in response
        }
      };
      console.log("Sending response:", JSON.stringify(response, null, 2));
      res.json(response);
    } catch (error) {
      console.error("ERROR creating client:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: "Erro ao criar cliente: " + error.message });
    }
  });
  app2.post("/api/payments", async (req, res) => {
    try {
      const { orderId, amount, method, status, transactionId, notes, paidAt } = req.body;
      console.log("Creating payment:", { orderId, amount, method, status });
      if (!orderId) {
        return res.status(400).json({ error: "Order ID \xE9 obrigat\xF3rio" });
      }
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Valor deve ser maior que zero" });
      }
      let order = await db.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido n\xE3o encontrado" });
      }
      const payment = await db.createPayment({
        orderId,
        amount: parseFloat(amount).toFixed(2),
        method: method || "manual",
        status: status || "confirmed",
        transactionId: transactionId || `MANUAL-${Date.now()}`,
        notes: notes || "",
        paidAt: paidAt ? new Date(paidAt) : /* @__PURE__ */ new Date()
      });
      console.log("Payment created successfully:", payment.id);
      res.json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Erro ao criar pagamento: " + error.message });
    }
  });
  app2.post("/api/orders/:id/create-test-payment", async (req, res) => {
    try {
      const { amount } = req.body;
      const orderId = req.params.id;
      let order = await db.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const payment = await db.createPayment({
        orderId,
        amount: amount || "567.00",
        // Default test amount
        method: "pix",
        status: "confirmed",
        transactionId: `TEST-${Date.now()}`,
        paidAt: /* @__PURE__ */ new Date()
      });
      res.json({ success: true, payment });
    } catch (error) {
      console.error("Error creating test payment:", error);
      res.status(500).json({ error: "Failed to create test payment" });
    }
  });
  app2.post("/api/orders/:id/confirm-delivery", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Confirming delivery for order: ${id}`);
      const order = await db.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Pedido n\xE3o encontrado" });
      }
      if (order.productStatus !== "in_store") {
        console.log(`Order ${id} cannot be delivered - products not in store yet (status: ${order.productStatus})`);
        return res.status(400).json({
          error: "Os produtos ainda n\xE3o est\xE3o na loja. Complete a etapa de compra primeiro."
        });
      }
      const productionOrders3 = await db.getProductionOrdersByOrder(id);
      const hasShippedOrDelivered = productionOrders3.every(
        (po) => po.status === "shipped" || po.status === "delivered"
      );
      if (!hasShippedOrDelivered && productionOrders3.length > 0) {
        console.log(`Order ${id} cannot be delivered - not all production orders are shipped`);
        return res.status(400).json({
          error: "Alguns produtos ainda n\xE3o foram despachados. Finalize o envio primeiro."
        });
      }
      const allDelivered = productionOrders3.every((po) => po.status === "delivered");
      if (allDelivered) {
        const updatedOrder = await db.updateOrderStatus(id, "delivered");
        if (!updatedOrder) {
          return res.status(404).json({ error: "Pedido n\xE3o encontrado" });
        }
        console.log(`Order ${id} fully delivered - all producers completed`);
        res.json({
          success: true,
          message: "Entrega completa confirmada com sucesso",
          order: updatedOrder
        });
      } else {
        const updatedOrder = await db.updateOrderStatus(id, "partial_shipped");
        if (!updatedOrder) {
          return res.status(404).json({ error: "Pedido n\xE3o encontrado" });
        }
        console.log(`Order ${id} partially delivered - some producers still pending`);
        res.json({
          success: true,
          message: "Entrega parcial confirmada com sucesso",
          order: updatedOrder
        });
      }
    } catch (error) {
      console.error("Error confirming delivery:", error);
      res.status(500).json({ error: "Erro ao confirmar entrega: " + error.message });
    }
  });
  app2.delete("/api/orders/test-data", async (req, res) => {
    try {
      const orders2 = await db.getOrders();
      const testOrders = orders2.filter(
        (order) => order.orderNumber?.includes("TEST") || order.product?.toLowerCase().includes("test") || order.description?.toLowerCase().includes("test")
      );
      for (const order of testOrders) {
        const productionOrders3 = await db.getProductionOrdersByOrder(order.id);
        for (const po of productionOrders3) {
          await db.deleteProductionOrder(po.id);
        }
        await db.deleteOrder(order.id);
      }
      res.json({
        success: true,
        deletedCount: testOrders.length,
        message: `${testOrders.length} pedidos de teste foram removidos`
      });
    } catch (error) {
      console.error("Error clearing test orders:", error);
      res.status(500).json({ error: "Failed to clear test orders" });
    }
  });
  app2.get("/api/products/:id", async (req, res) => {
    try {
      const product = await db.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Produto n\xE3o encontrado" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });
  app2.put("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { createdAt, updatedAt, ...productData } = req.body;
      const updatedProduct = await db.updateProduct(id, productData);
      if (!updatedProduct) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });
  app2.delete("/api/products/:id", async (req, res) => {
    try {
      const deleted = await db.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Produto n\xE3o encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });
  app2.post("/api/products/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }
      if (req.file.size > 50 * 1024 * 1024) {
        return res.status(400).json({
          error: "Arquivo muito grande. O limite \xE9 de 50MB."
        });
      }
      let productsData;
      const fileExtension = req.file.originalname.split(".").pop()?.toLowerCase() || "";
      if (fileExtension === "json") {
        try {
          const fileContent = req.file.buffer.toString("utf8");
          productsData = JSON.parse(fileContent);
        } catch (parseError) {
          return res.status(400).json({
            error: "Erro ao analisar arquivo JSON. Verifique se o formato est\xE1 correto.",
            details: parseError.message
          });
        }
      } else {
        return res.status(400).json({ error: "Formato de arquivo n\xE3o suportado. Use arquivos JSON." });
      }
      if (!Array.isArray(productsData)) {
        return res.status(400).json({
          error: "O arquivo JSON deve conter um array de produtos",
          example: '[{"Nome": "Produto", "PrecoVenda": 10.50}]'
        });
      }
      if (productsData.length === 0) {
        return res.status(400).json({
          error: "O arquivo JSON est\xE1 vazio. Adicione pelo menos um produto."
        });
      }
      if (productsData.length > 1e4) {
        return res.status(400).json({
          error: "Muitos produtos no arquivo. O limite \xE9 de 10.000 produtos por importa\xE7\xE3o."
        });
      }
      console.log(`Importing ${productsData.length} products...`);
      const result = await db.importProducts(productsData);
      console.log(`Import completed: ${result.imported} imported, ${result.errors.length} errors`);
      res.json({
        message: `${result.imported} produtos importados com sucesso`,
        imported: result.imported,
        total: productsData.length,
        errors: result.errors
      });
    } catch (error) {
      console.error("Import error:", error);
      if (error instanceof SyntaxError) {
        return res.status(400).json({
          error: "Formato JSON inv\xE1lido. Verifique a sintaxe do arquivo.",
          details: error.message
        });
      }
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "Arquivo muito grande. O limite \xE9 de 50MB."
        });
      }
      res.status(500).json({
        error: "Erro interno do servidor ao processar importa\xE7\xE3o",
        details: error.message
      });
    }
  });
  app2.get("/api/budgets", async (req, res) => {
    try {
      const budgets3 = await db.getBudgets();
      console.log(`Found ${budgets3.length} budgets in database`);
      const enrichedBudgets = await Promise.all(
        budgets3.map(async (budget) => {
          try {
            let vendorName = "Vendedor n\xE3o encontrado";
            if (budget.vendorId) {
              const vendor = await db.getUser(budget.vendorId);
              vendorName = vendor?.name || vendorName;
            }
            let clientName = budget.contactName || "Cliente n\xE3o informado";
            if (!clientName && budget.clientId) {
              const client2 = await db.getClient(budget.clientId);
              if (client2) {
                clientName = client2.name;
              }
            }
            const items = await db.getBudgetItems(budget.id);
            const itemCount = items.length;
            const photos = await db.getBudgetPhotos(budget.id);
            const photoCount = photos.length;
            return {
              ...budget,
              id: budget.id,
              budgetNumber: budget.budgetNumber || "N/A",
              title: budget.title || "Sem t\xEDtulo",
              status: budget.status || "draft",
              totalValue: budget.totalValue || "0.00",
              vendorName,
              clientName,
              itemCount,
              photoCount,
              createdAt: budget.createdAt || /* @__PURE__ */ new Date(),
              validUntil: budget.validUntil,
              deliveryDeadline: budget.deliveryDeadline
            };
          } catch (budgetError) {
            console.error(`Error enriching budget ${budget.id}:`, budgetError);
            return {
              ...budget,
              vendorName: "Erro ao carregar",
              clientName: budget.contactName || "Cliente n\xE3o informado",
              itemCount: 0,
              photoCount: 0
            };
          }
        })
      );
      console.log(`Returning ${enrichedBudgets.length} enriched budgets`);
      res.json(enrichedBudgets);
    } catch (error) {
      console.error("Error fetching all budgets:", error);
      res.status(500).json({ error: "Failed to fetch budgets: " + error.message });
    }
  });
  app2.get("/api/budgets/awaiting-approval", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso restrito a administradores" });
      }
      const allBudgets = await db.getBudgets();
      const awaitingBudgets = allBudgets.filter((b) => b.status === "awaiting_approval").sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      const enrichedBudgets = await Promise.all(
        awaitingBudgets.map(async (budget) => {
          try {
            let vendorName = "Vendedor n\xE3o encontrado";
            if (budget.vendorId) {
              const vendor = await db.getUser(budget.vendorId);
              vendorName = vendor?.name || vendorName;
            }
            let clientName = budget.contactName || "Cliente n\xE3o informado";
            if (!clientName && budget.clientId) {
              const client2 = await db.getClient(budget.clientId);
              if (client2) {
                clientName = client2.name;
              }
            }
            const items = await db.getBudgetItems(budget.id);
            const pricingSettings2 = await db.getPricingSettings();
            const marginTiers = pricingSettings2 ? await db.getPricingMarginTiers(pricingSettings2.id) : [];
            const enrichedItems = await Promise.all(items.map(async (item) => {
              try {
                const product = await db.getProduct(item.productId);
                const costPrice = product?.costPrice ? parseFloat(product.costPrice) : 0;
                let minimumPrice = 0;
                if (costPrice > 0 && pricingSettings2) {
                  const taxRate = parseFloat(pricingSettings2.taxRate) / 100;
                  const commissionRate = parseFloat(pricingSettings2.commissionRate) / 100;
                  const budgetTotal = parseFloat(budget.totalValue || "0");
                  const matchingTier = marginTiers.filter((t) => budgetTotal >= parseFloat(t.minRevenue)).sort((a, b) => parseFloat(b.minRevenue) - parseFloat(a.minRevenue))[0];
                  if (matchingTier) {
                    const minMarginRate = parseFloat(matchingTier.minimumMarginRate) / 100;
                    const divisor = 1 - taxRate - commissionRate - minMarginRate;
                    if (divisor > 0) {
                      minimumPrice = costPrice / divisor;
                    }
                  }
                }
                return {
                  ...item,
                  productName: item.productName || product?.name || "Produto n\xE3o encontrado",
                  costPrice,
                  minimumPrice: Math.round(minimumPrice * 100) / 100
                };
              } catch {
                return { ...item, costPrice: 0, minimumPrice: 0 };
              }
            }));
            let paymentMethodName = "";
            if (budget.paymentMethodId) {
              try {
                const pms = await db.getPaymentMethods();
                const pm = pms.find((p) => p.id === budget.paymentMethodId);
                paymentMethodName = pm?.name || "";
              } catch {
              }
            }
            let shippingMethodName = "";
            if (budget.shippingMethodId) {
              try {
                const sms = await db.getShippingMethods();
                const sm = sms.find((s) => s.id === budget.shippingMethodId);
                shippingMethodName = sm?.name || "";
              } catch {
              }
            }
            return {
              ...budget,
              vendorName,
              clientName,
              paymentMethodName,
              shippingMethodName,
              itemCount: enrichedItems.length,
              items: enrichedItems
            };
          } catch (err) {
            console.error(`Error enriching awaiting budget ${budget.id}:`, err);
            return {
              ...budget,
              vendorName: "Erro ao carregar",
              clientName: budget.contactName || "Cliente n\xE3o informado",
              itemCount: 0,
              items: []
            };
          }
        })
      );
      console.log(`Found ${enrichedBudgets.length} budgets awaiting approval`);
      res.json(enrichedBudgets);
    } catch (error) {
      console.error("Error fetching budgets awaiting approval:", error);
      res.status(500).json({ error: "Erro ao buscar or\xE7amentos aguardando aprova\xE7\xE3o" });
    }
  });
  app2.get("/api/budgets/:id", async (req, res) => {
    try {
      const budget = await db.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      const items = await db.getBudgetItems(req.params.id);
      const photos = await db.getBudgetPhotos(req.params.id);
      const paymentInfo = await db.getBudgetPaymentInfo(req.params.id);
      let clientData = null;
      if (budget.clientId) {
        clientData = await db.getClient(budget.clientId);
      }
      let vendorData = null;
      if (budget.vendorId) {
        const user = await db.getUser(budget.vendorId);
        if (user) {
          vendorData = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone
          };
        }
      }
      res.json({
        ...budget,
        items,
        photos,
        paymentInfo,
        client: clientData,
        vendor: vendorData
      });
    } catch (error) {
      console.error("Error fetching budget:", error);
      res.status(500).json({ error: "Failed to fetch budget" });
    }
  });
  app2.put("/api/budgets/:id", async (req, res) => {
    try {
      const budgetData = req.body;
      const budgetId = req.params.id;
      console.log(`[UPDATE BUDGET] Processing update for budget ${budgetId}`);
      const shouldProcessItems = Object.prototype.hasOwnProperty.call(budgetData, "items") && budgetData.items !== null && budgetData.items !== void 0;
      const budgetMetadata = { ...budgetData };
      delete budgetMetadata.items;
      delete budgetMetadata.requiresApproval;
      if (budgetMetadata.branchId === "matriz") {
        budgetMetadata.branchId = null;
      }
      const updatedBudget = await db.updateBudget(budgetId, budgetMetadata);
      if (shouldProcessItems) {
        if (!Array.isArray(budgetData.items)) {
          console.error(`[UPDATE BUDGET] Invalid items format - must be array`);
          return res.status(400).json({
            error: "Items must be an array when provided"
          });
        }
        console.log(`[UPDATE BUDGET] Updating items: ${budgetData.items.length} items provided`);
        const itemsToInsert = [];
        if (budgetData.items.length > 0) {
          const seenItems = /* @__PURE__ */ new Set();
          const uniqueItems = budgetData.items.filter((item) => {
            const itemKey = `${item.productId}-${item.producerId || "internal"}-${item.quantity}-${item.unitPrice}`;
            if (seenItems.has(itemKey)) {
              console.log(`[UPDATE BUDGET] Removing duplicate: ${item.productName} (${itemKey})`);
              return false;
            }
            seenItems.add(itemKey);
            return true;
          });
          console.log(`[UPDATE BUDGET] Processing ${uniqueItems.length} unique items (filtered from ${budgetData.items.length})`);
          const existingItems = await db.getBudgetItems(budgetId);
          const existingItemIds = existingItems.map((item) => item.id);
          console.log(`[UPDATE BUDGET] Found ${existingItemIds.length} existing items to replace`);
          for (const item of uniqueItems) {
            const quantity = typeof item.quantity === "string" ? parseInt(item.quantity) : item.quantity;
            const unitPrice = typeof item.unitPrice === "string" ? parseFloat(item.unitPrice) : item.unitPrice;
            const itemCustomizationValue = typeof item.itemCustomizationValue === "string" ? parseFloat(item.itemCustomizationValue) : item.itemCustomizationValue || 0;
            const generalCustomizationValue = typeof item.generalCustomizationValue === "string" ? parseFloat(item.generalCustomizationValue) : item.generalCustomizationValue || 0;
            let totalPrice = unitPrice * quantity;
            if (item.hasItemCustomization && itemCustomizationValue > 0) {
              totalPrice += itemCustomizationValue * quantity;
            }
            if (item.hasGeneralCustomization && generalCustomizationValue > 0) {
              totalPrice += generalCustomizationValue * quantity;
            }
            const isInternal = !item.producerId || item.producerId === "internal";
            itemsToInsert.push({
              productId: item.productId,
              producerId: isInternal ? null : item.producerId,
              quantity,
              unitPrice: unitPrice.toFixed(2),
              totalPrice: totalPrice.toFixed(2),
              // Item Customization
              hasItemCustomization: item.hasItemCustomization || false,
              selectedCustomizationId: item.selectedCustomizationId || null,
              itemCustomizationValue: itemCustomizationValue.toFixed(2),
              itemCustomizationDescription: item.itemCustomizationDescription || null,
              customizationPhoto: item.customizationPhoto || null,
              // General Customization
              hasGeneralCustomization: item.hasGeneralCustomization || false,
              generalCustomizationName: item.generalCustomizationName || null,
              generalCustomizationValue: generalCustomizationValue.toFixed(2),
              // Product dimensions
              productWidth: item.productWidth || null,
              productHeight: item.productHeight || null,
              productDepth: item.productDepth || null,
              // Item discount
              hasItemDiscount: item.hasItemDiscount || false,
              itemDiscountType: item.itemDiscountType || "percentage",
              itemDiscountPercentage: item.itemDiscountPercentage ? parseFloat(item.itemDiscountPercentage) : 0,
              itemDiscountValue: item.itemDiscountValue ? parseFloat(item.itemDiscountValue) : 0
            });
          }
          console.log(`[UPDATE BUDGET] Creating ${itemsToInsert.length} new items FIRST (before deleting old ones)...`);
          const createdItemIds = [];
          for (const itemData of itemsToInsert) {
            const newItem = await db.createBudgetItem(updatedBudget.id, itemData);
            createdItemIds.push(newItem.id);
          }
          console.log(`[UPDATE BUDGET] Successfully created ${createdItemIds.length} new items`);
          console.log(`[UPDATE BUDGET] Deleting ${existingItemIds.length} old items...`);
          let deletedCount = 0;
          for (const oldItemId of existingItemIds) {
            try {
              await db.deleteBudgetItem(oldItemId);
              deletedCount++;
            } catch (deleteError) {
              console.error(`[UPDATE BUDGET] Error deleting old item ${oldItemId}:`, deleteError);
            }
          }
          console.log(`[UPDATE BUDGET] Budget items updated - ${createdItemIds.length} new items created, ${deletedCount}/${existingItemIds.length} old items deleted`);
        } else {
          console.log(`[UPDATE BUDGET] Items array empty - KEEPING existing items (not deleting)`);
          console.warn(`[UPDATE BUDGET] WARNING: Received empty items array for budget ${budgetId}, but keeping existing items to prevent data loss`);
        }
      } else {
        console.log(`[UPDATE BUDGET] Metadata-only update - keeping existing items for budget ${budgetId}`);
      }
      if (budgetData.paymentMethodId || budgetData.shippingMethodId) {
        await db.updateBudgetPaymentInfo(req.params.id, {
          paymentMethodId: budgetData.paymentMethodId || null,
          shippingMethodId: budgetData.shippingMethodId || null,
          installments: budgetData.installments || 1,
          downPayment: budgetData.downPayment?.toString() || "0.00",
          remainingAmount: budgetData.remainingAmount?.toString() || "0.00",
          shippingCost: budgetData.shippingCost?.toString() || "0.00"
        });
      }
      try {
        const currentBudget = await db.getBudget(budgetId);
        const needsApproval = await checkBudgetNeedsApproval(budgetId, db);
        let correctedStatus = currentBudget?.status;
        if (needsApproval) {
          correctedStatus = "awaiting_approval";
        } else if (currentBudget && (currentBudget.status === "not_approved" || currentBudget.status === "awaiting_approval")) {
          correctedStatus = "draft";
        }
        if (correctedStatus !== currentBudget?.status) {
          console.log(`[UPDATE BUDGET] Server-side approval check: changing status from '${currentBudget?.status}' to '${correctedStatus}'`);
          await db.updateBudget(budgetId, { status: correctedStatus });
        }
      } catch (approvalCheckError) {
        console.error(`[UPDATE BUDGET] Error in server-side approval check:`, approvalCheckError);
      }
      const finalBudget = await db.getBudget(budgetId);
      console.log(`[UPDATE BUDGET] Successfully updated budget ${req.params.id}, final status: ${finalBudget?.status}`);
      res.json(finalBudget);
    } catch (error) {
      console.error("[UPDATE BUDGET] Error updating budget:", error);
      res.status(500).json({ error: "Failed to update budget: " + (error.message || error) });
    }
  });
  app2.delete("/api/budgets/:id", async (req, res) => {
    try {
      const deleted = await db.deleteBudget(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete budget" });
    }
  });
  app2.post("/api/budgets/:id/approve", async (req, res) => {
    try {
      const budgetId = req.params.id;
      const budget = await db.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ error: "Budget not found" });
      }
      budget.status = "approved";
      budget.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await db.updateBudget(budgetId, budget);
      res.json({ success: true, budget });
    } catch (error) {
      console.error("Error approving budget:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/budgets/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { observations } = req.body;
      const updatedBudget = await db.updateBudget(id, {
        status: "rejected",
        rejectedAt: /* @__PURE__ */ new Date(),
        clientObservations: observations || null,
        hasVendorNotification: true
        // Nova notificação para o vendedor
      });
      if (!updatedBudget) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      console.log(`Budget ${id} rejected by client with observations: ${observations}`);
      res.json(updatedBudget);
    } catch (error) {
      console.error("Error rejecting budget:", error);
      res.status(500).json({ error: "Erro ao rejeitar or\xE7amento" });
    }
  });
  app2.post("/api/budgets/:id/admin-approve", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso restrito a administradores" });
      }
      const { id } = req.params;
      const budget = await db.getBudget(id);
      if (!budget) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      const updatedBudget = await db.updateBudget(id, {
        status: "admin_approved",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`Budget ${id} approved by admin`);
      res.json(updatedBudget);
    } catch (error) {
      console.error("Error admin-approving budget:", error);
      res.status(500).json({ error: "Erro ao aprovar or\xE7amento pelo admin" });
    }
  });
  app2.post("/api/budgets/:id/admin-reject", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso restrito a administradores" });
      }
      const { id } = req.params;
      const { reason } = req.body;
      const budget = await db.getBudget(id);
      if (!budget) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      const updatedBudget = await db.updateBudget(id, {
        status: "not_approved",
        adminRejectionReason: reason || null,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`Budget ${id} not approved by admin. Reason: ${reason || "N/A"}`);
      res.json(updatedBudget);
    } catch (error) {
      console.error("Error admin-rejecting budget:", error);
      res.status(500).json({ error: "Erro ao rejeitar or\xE7amento pelo admin" });
    }
  });
  app2.post("/api/budgets/:id/convert-to-order", async (req, res) => {
    try {
      const { id } = req.params;
      const { clientId, deliveryDate } = req.body;
      if (!clientId) {
        return res.status(400).json({ error: "Cliente \xE9 obrigat\xF3rio para convers\xE3o" });
      }
      if (!deliveryDate) {
        return res.status(400).json({ error: "Prazo de entrega \xE9 obrigat\xF3rio para convers\xE3o" });
      }
      console.log(`Converting budget ${id} to order with client: ${clientId} and delivery date: ${deliveryDate}`);
      const budget = await db.getBudget(id);
      if (!budget) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      const allowedStatuses = ["approved", "admin_approved"];
      if (budget.status && !allowedStatuses.includes(budget.status)) {
        return res.status(400).json({ error: `Or\xE7amento com status '${budget.status}' n\xE3o pode ser convertido. Status permitidos: aprovado, aprovado pelo admin.` });
      }
      const deliveryDateObj = new Date(deliveryDate);
      const order = await db.convertBudgetToOrder(id, clientId, deliveryDateObj);
      await db.updateBudget(id, { status: "converted" });
      const productionOrders3 = await db.getProductionOrdersByOrder(order.id);
      const productionOrdersWithItems = await db.getProductionOrdersWithItems(productionOrders3.map((po) => po.id));
      console.log(`Budget ${id} converted to order: ${order.id} with ${productionOrdersWithItems.length} production orders`);
      res.json({
        order,
        productionOrders: productionOrdersWithItems
      });
    } catch (error) {
      console.error("Error converting budget to order:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/budgets/:id/convert-to-budget", async (req, res) => {
  });
  app2.post("/api/budgets/:id/send-whatsapp", async (req, res) => {
    try {
      const budget = await db.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      let clientName = budget.contactName;
      let clientPhone = budget.contactPhone;
      if (budget.clientId) {
        const client2 = await db.getUser(budget.clientId);
        if (client2) {
          clientName = client2.name;
          clientPhone = client2.phone || budget.contactPhone;
        }
      }
      const needsApproval = await checkBudgetNeedsApproval(req.params.id, db);
      if (needsApproval && budget.status !== "admin_approved") {
        await db.updateBudget(req.params.id, {
          status: "awaiting_approval",
          updatedAt: /* @__PURE__ */ new Date()
        });
        console.log(`Budget ${req.params.id} has items below minimum price - sent to approval instead of WhatsApp`);
        return res.status(400).json({
          error: "Este or\xE7amento possui itens com pre\xE7o abaixo do m\xEDnimo. Foi enviado para aprova\xE7\xE3o do administrador.",
          status: "awaiting_approval"
        });
      }
      const updatedBudget = await db.updateBudget(req.params.id, {
        status: "sent",
        updatedAt: /* @__PURE__ */ new Date()
      });
      console.log(`Budget ${req.params.id} status updated to 'sent' for client ${budget.clientId || budget.contactName}`);
      const message = `Ol\xE1 ${clientName}! \u{1F44B}

Segue seu or\xE7amento:

\u{1F4CB} *${budget.title}*
\u{1F4B0} Valor: R$ ${parseFloat(budget.totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
\u{1F4C5} V\xE1lido at\xE9: ${budget.validUntil ? new Date(budget.validUntil).toLocaleDateString("pt-BR") : "N\xE3o especificado"}

${budget.description ? `\u{1F4DD} ${budget.description}` : ""}

Para mais detalhes, entre em contato conosco!`;
      const encodedMessage = encodeURIComponent(message);
      const phoneNumber = clientPhone?.replace(/\D/g, "") || "";
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
      res.json({
        success: true,
        whatsappUrl,
        message: "Or\xE7amento marcado como enviado e dispon\xEDvel no painel do cliente",
        budget: updatedBudget
      });
    } catch (error) {
      console.error("Error sending budget via WhatsApp:", error);
      res.status(500).json({ error: "Failed to send budget via WhatsApp" });
    }
  });
  app2.get("/api/budgets/:id/pdf-data", async (req, res) => {
    try {
      const budget = await db.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ error: "Or\xE7amento n\xE3o encontrado" });
      }
      const items = await db.getBudgetItems(req.params.id);
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          const product = await db.getProduct(item.productId);
          const quantity = item.quantity;
          const unitPrice = parseFloat(item.unitPrice);
          const customizationValue = parseFloat(item.itemCustomizationValue || "0");
          let itemTotal = unitPrice * quantity;
          if (item.hasItemCustomization && customizationValue > 0) {
            itemTotal += customizationValue;
          }
          return {
            id: item.id,
            productId: item.productId,
            quantity,
            unitPrice: unitPrice.toFixed(2),
            totalPrice: itemTotal.toFixed(2),
            hasItemCustomization: item.hasItemCustomization,
            itemCustomizationValue: item.itemCustomizationValue,
            itemCustomizationDescription: item.itemCustomizationDescription || "",
            customizationPhoto: item.customizationPhoto || "",
            product: {
              name: product?.name || "Produto n\xE3o encontrado",
              description: product?.description || "",
              category: product?.category || "",
              imageLink: product?.imageLink || ""
            }
          };
        })
      );
      const totalBudget = enrichedItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
      const client2 = await db.getUser(budget.clientId);
      const vendor = await db.getUser(budget.vendorId);
      const photos = await db.getBudgetPhotos(req.params.id);
      const photoUrls = photos.map((photo) => photo.imageUrl || photo.photoUrl);
      const paymentInfo = await db.getBudgetPaymentInfo(req.params.id);
      let branchInfo = null;
      if (budget.branchId) {
        const branch = await db.getBranch(budget.branchId);
        if (branch) {
          branchInfo = {
            id: branch.id,
            name: branch.name,
            city: branch.city,
            cnpj: branch.cnpj || null,
            address: branch.address || null,
            isHeadquarters: branch.isHeadquarters || false
          };
        }
      }
      const pdfData = {
        budget: {
          id: budget.id,
          budgetNumber: budget.budgetNumber,
          title: budget.title,
          description: budget.description,
          clientId: budget.clientId,
          vendorId: budget.vendorId,
          branchId: budget.branchId,
          totalValue: totalBudget.toFixed(2),
          validUntil: budget.validUntil,
          hasCustomization: budget.hasCustomization,
          customizationPercentage: budget.customizationPercentage,
          customizationDescription: budget.customizationDescription,
          hasDiscount: budget.hasDiscount,
          discountType: budget.discountType,
          discountPercentage: budget.discountPercentage,
          discountValue: budget.discountValue,
          createdAt: budget.createdAt,
          photos: photoUrls,
          paymentMethodId: paymentInfo?.paymentMethodId || null,
          shippingMethodId: paymentInfo?.shippingMethodId || null,
          installments: paymentInfo?.installments || 1,
          downPayment: paymentInfo?.downPayment || "0.00",
          remainingAmount: paymentInfo?.remainingAmount || "0.00",
          shippingCost: paymentInfo?.shippingCost || "0.00"
        },
        branch: branchInfo,
        items: enrichedItems,
        client: {
          name: client2?.name || "Cliente n\xE3o encontrado",
          email: client2?.email || "",
          phone: client2?.phone || ""
        },
        vendor: {
          name: vendor?.name || "Vendedor n\xE3o encontrado",
          email: vendor?.email || "",
          phone: vendor?.phone || ""
        },
        paymentMethods: await db.getPaymentMethods(),
        shippingMethods: await db.getShippingMethods()
      };
      res.json(pdfData);
    } catch (error) {
      console.error("Error fetching budget PDF data:", error);
      res.status(500).json({ error: "Failed to fetch budget PDF data" });
    }
  });
  app2.get("/api/budgets/:budgetId/items", async (req, res) => {
    try {
      const items = await db.getBudgetItems(req.params.budgetId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budget items" });
    }
  });
  app2.post("/api/budgets/:budgetId/items", async (req, res) => {
    try {
      const newItem = await db.createBudgetItem(req.params.budgetId, req.body);
      res.json(newItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to create budget item" });
    }
  });
  app2.put("/api/budget-items/:id", async (req, res) => {
    try {
      const updatedItem = await db.updateBudgetItem(req.params.id, req.body);
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to update budget item" });
    }
  });
  app2.delete("/api/budget-items/:id", async (req, res) => {
    try {
      const deleted = await db.deleteBudgetItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Item n\xE3o encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete budget item" });
    }
  });
  app2.get("/api/budgets/:budgetId/photos", async (req, res) => {
    try {
      const photos = await db.getBudgetPhotos(req.params.budgetId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budget photos" });
    }
  });
  app2.post("/api/budgets/:budgetId/photos", async (req, res) => {
    try {
      const newPhoto = await db.createBudgetPhoto(req.params.budgetId, req.body);
      res.json(newPhoto);
    } catch (error) {
      res.status(500).json({ error: "Failed to create budget photo" });
    }
  });
  app2.delete("/api/budget-photos/:id", async (req, res) => {
    try {
      const deleted = await db.deleteBudgetPhoto(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Foto n\xE3o encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete budget photo" });
    }
  });
  app2.get("/api/settings/payment-methods", async (req, res) => {
    try {
      const paymentMethods2 = await db.getAllPaymentMethods();
      res.json(paymentMethods2);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });
  app2.post("/api/settings/payment-methods", async (req, res) => {
    try {
      const paymentMethod = await db.createPaymentMethod(req.body);
      res.json(paymentMethod);
    } catch (error) {
      console.error("Error creating payment method:", error);
      res.status(500).json({ error: "Failed to create payment method" });
    }
  });
  app2.put("/api/settings/payment-methods/:id", async (req, res) => {
    try {
      const paymentMethod = await db.updatePaymentMethod(req.params.id, req.body);
      if (!paymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json(paymentMethod);
    } catch (error) {
      console.error("Error updating payment method:", error);
      res.status(500).json({ error: "Failed to update payment method" });
    }
  });
  app2.delete("/api/settings/payment-methods/:id", async (req, res) => {
    try {
      const deleted = await db.deletePaymentMethod(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ error: "Failed to delete payment method" });
    }
  });
  app2.get("/api/settings/shipping-methods", async (req, res) => {
    try {
      const shippingMethods2 = await db.getAllShippingMethods();
      res.json(shippingMethods2);
    } catch (error) {
      console.error("Error fetching shipping methods:", error);
      res.status(500).json({ error: "Failed to fetch shipping methods" });
    }
  });
  app2.post("/api/settings/shipping-methods", async (req, res) => {
    try {
      const shippingMethod = await db.createShippingMethod(req.body);
      res.json(shippingMethod);
    } catch (error) {
      console.error("Error creating shipping method:", error);
      res.status(500).json({ error: "Failed to create shipping method" });
    }
  });
  app2.put("/api/settings/shipping-methods/:id", async (req, res) => {
    try {
      const shippingMethod = await db.updateShippingMethod(req.params.id, req.body);
      if (!shippingMethod) {
        return res.status(404).json({ error: "Shipping method not found" });
      }
      res.json(shippingMethod);
    } catch (error) {
      console.error("Error updating shipping method:", error);
      res.status(500).json({ error: "Failed to update shipping method" });
    }
  });
  app2.delete("/api/settings/shipping-methods/:id", async (req, res) => {
    try {
      const deleted = await db.deleteShippingMethod(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Shipping method not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shipping method:", error);
      res.status(500).json({ error: "Failed to delete shipping method" });
    }
  });
  app2.get("/api/settings/customization-options", requireAuth, async (req, res) => {
    try {
      const customizations = await db.getCustomizationOptions();
      res.json(customizations);
    } catch (error) {
      console.error("Error fetching customization options:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.post("/api/settings/customization-options", requireAuth, async (req, res) => {
    try {
      const { name, description, category, minQuantity, price, isActive } = req.body;
      if (!name || !category || minQuantity === void 0 || price === void 0) {
        return res.status(400).json({ error: "Campos obrigat\xF3rios n\xE3o preenchidos" });
      }
      const newCustomization = await db.createCustomizationOption({
        name,
        description: description || "",
        category,
        minQuantity: parseInt(minQuantity),
        price: parseFloat(price).toFixed(2),
        isActive: isActive !== void 0 ? isActive : true,
        createdBy: req.user?.id || "admin-1"
      });
      res.json(newCustomization);
    } catch (error) {
      console.error("Error creating customization:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.put("/api/settings/customization-options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, category, minQuantity, price, isActive } = req.body;
      const updatedCustomization = await db.updateCustomizationOption(id, {
        name,
        description: description || "",
        category,
        minQuantity: parseInt(minQuantity),
        price: parseFloat(price).toFixed(2),
        isActive: isActive !== void 0 ? isActive : true
      });
      if (!updatedCustomization) {
        return res.status(404).json({ error: "Personaliza\xE7\xE3o n\xE3o encontrada" });
      }
      res.json(updatedCustomization);
    } catch (error) {
      console.error("Error updating customization:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.delete("/api/settings/customization-options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await db.deleteCustomizationOption(id);
      if (!deleted) {
        return res.status(404).json({ error: "Personaliza\xE7\xE3o n\xE3o encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customization:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.post("/api/settings/customization-options/bulk-import", requireAuth, async (req, res) => {
    try {
      const { customizations } = req.body;
      if (!Array.isArray(customizations) || customizations.length === 0) {
        return res.status(400).json({ error: "Lista de personaliza\xE7\xF5es inv\xE1lida" });
      }
      let importedCount = 0;
      const errors = [];
      for (const customization of customizations) {
        try {
          if (!customization.name || !customization.category || customization.minQuantity === void 0 || customization.price === void 0) {
            errors.push(`Linha com dados incompletos: ${customization.name || "sem nome"}`);
            continue;
          }
          await db.createCustomizationOption({
            name: customization.name,
            description: customization.description || "",
            category: customization.category,
            minQuantity: parseInt(customization.minQuantity),
            price: parseFloat(customization.price).toFixed(2),
            isActive: customization.isActive !== void 0 ? customization.isActive : true,
            createdBy: req.user?.id || "admin-1"
          });
          importedCount++;
        } catch (error) {
          console.error(`Erro ao importar personaliza\xE7\xE3o ${customization.name}:`, error);
          errors.push(`Erro ao importar: ${customization.name}`);
        }
      }
      res.json({
        success: true,
        imported: importedCount,
        errors: errors.length > 0 ? errors : void 0,
        message: `${importedCount} personaliza\xE7\xF5es importadas com sucesso${errors.length > 0 ? `. ${errors.length} com erro.` : ""}`
      });
    } catch (error) {
      console.error("Error bulk importing customizations:", error);
      res.status(500).json({ error: "Erro ao importar personaliza\xE7\xF5es" });
    }
  });
  app2.get("/api/settings/customization-options/category/:category", requireAuth, async (req, res) => {
    try {
      const { category } = req.params;
      const { minQuantity } = req.query;
      let customizations = await db.getCustomizationOptions();
      let filtered = customizations.filter(
        (c) => c.category === category && c.isActive === true
      );
      if (minQuantity) {
        const qty = parseInt(minQuantity);
        filtered = filtered.filter((c) => c.minQuantity <= qty);
      }
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching customizations by category:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  app2.get("/api/customization-options", async (req, res) => {
    try {
      const { category, quantity } = req.query;
      if (category && quantity) {
        const options = await db.getCustomizationOptionsByCategory(
          category,
          parseInt(quantity)
        );
        res.json(options);
      } else {
        const allOptions = await db.getCustomizationOptions();
        res.json(allOptions);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customization options" });
    }
  });
  app2.get("/api/finance/producer-payments", async (req, res) => {
    try {
      const payments2 = await db.getProducerPayments();
      const enrichedPayments = await Promise.all(
        payments2.map(async (payment) => {
          const producer = await db.getUser(payment.producerId);
          const productionOrder = await db.getProductionOrder(payment.productionOrderId);
          let order = null;
          if (productionOrder) {
            order = await db.getOrder(productionOrder.orderId);
          }
          return {
            ...payment,
            producerName: producer?.name || "Produtor n\xE3o encontrado",
            productionOrder,
            order,
            // Add clientName, orderNumber, product from order if available
            clientName: order?.contactName || "Cliente n\xE3o encontrado",
            orderNumber: order?.orderNumber || "N/A",
            product: order?.product || "Produto n\xE3o informado"
          };
        })
      );
      res.json(enrichedPayments);
    } catch (error) {
      console.error("Failed to fetch producer payments:", error);
      res.status(500).json({ error: "Failed to fetch producer payments" });
    }
  });
  app2.post("/api/finance/producer-payments/:id/pay", async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, notes, transactionId } = req.body;
      console.log(`Manual payment for producer payment: ${id}`, { paymentMethod, notes, transactionId });
      let payment = await db.getProducerPayment(id);
      if (!payment) {
        const productionOrder = await db.getProductionOrder(id);
        if (productionOrder && productionOrder.producerValue) {
          payment = await db.createProducerPayment({
            productionOrderId: id,
            producerId: productionOrder.producerId,
            amount: productionOrder.producerValue,
            status: "pending",
            notes: productionOrder.producerNotes || notes || null
          });
          console.log(`Created producer payment for production order ${id}`);
        } else {
          return res.status(404).json({ error: "Ordem de produ\xE7\xE3o n\xE3o encontrada ou sem valor definido" });
        }
      }
      const updatedPayment = await db.updateProducerPayment(payment.id, {
        status: "paid",
        paidBy: "admin-1",
        // Could be req.user.id in real auth
        paidAt: /* @__PURE__ */ new Date(),
        paymentMethod: paymentMethod || "manual",
        notes: notes || payment.notes,
        // Mark as manual payment to prevent OFX reconciliation
        reconciliationStatus: "manual",
        bankTransactionId: null
      });
      if (payment.productionOrderId) {
        await db.updateProductionOrder(payment.productionOrderId, {
          producerPaymentStatus: "paid"
        });
      }
      console.log(`Producer payment ${payment.id} marked as paid successfully`);
      res.json({
        success: true,
        payment: updatedPayment,
        message: "Pagamento do produtor registrado com sucesso"
      });
    } catch (error) {
      console.error("Error registering producer payment:", error);
      res.status(500).json({ error: "Erro ao registrar pagamento: " + error.message });
    }
  });
  app2.get("/api/finance/producer-payments/pending", async (req, res) => {
    try {
      console.log("Fetching pending producer payments...");
      const allPayments = await db.getProducerPayments();
      console.log(`Total producer payments found: ${allPayments.length}`);
      const pendingPayments = allPayments.filter(
        (payment) => (payment.status === "pending" || payment.status === "approved") && (payment.reconciliationStatus === "pending" || !payment.reconciliationStatus)
      );
      console.log(`Pending/approved payments (not reconciled) found: ${pendingPayments.length}`);
      const enrichedPayments = await Promise.all(
        pendingPayments.map(async (payment) => {
          const producer = await db.getUser(payment.producerId);
          const productionOrder = await db.getProductionOrder(payment.productionOrderId);
          let orderInfo = null;
          let clientName = "Cliente n\xE3o informado";
          if (productionOrder) {
            let order = await db.getOrder(productionOrder.orderId);
            if (order) {
              orderInfo = order;
              clientName = order.contactName || "Nome n\xE3o informado";
            }
          }
          const enrichedPayment = {
            ...payment,
            producerName: producer?.name || "Produtor n\xE3o encontrado",
            productionOrder,
            order: orderInfo,
            clientName,
            orderNumber: orderInfo?.orderNumber || "N/A",
            product: orderInfo?.product || "Produto n\xE3o informado"
          };
          console.log(`Enriched payment ${payment.id}: status=${payment.status}, producer=${enrichedPayment.producerName}, amount=${payment.amount}`);
          return enrichedPayment;
        })
      );
      console.log(`Returning ${enrichedPayments.length} enriched pending producer payments`);
      res.json(enrichedPayments);
    } catch (error) {
      console.error("Error fetching pending producer payments:", error);
      res.status(500).json({ error: "Failed to fetch pending producer payments" });
    }
  });
  app2.get("/api/logistics/producer-stats", async (req, res) => {
    try {
      const users2 = await db.getUsers();
      const producers = users2.filter((user) => user.role === "producer");
      const productsResult = await db.getProducts({ limit: 9999 });
      const producerStats = await Promise.all(
        producers.map(async (producer) => {
          const productionOrders3 = await db.getProductionOrdersByProducer(producer.id);
          const producerProducts = productsResult.products.filter((p) => p.producerId === producer.id);
          return {
            id: producer.id,
            name: producer.name,
            specialty: producer.specialty || "N\xE3o especificado",
            activeOrders: productionOrders3.filter(
              (po) => ["pending", "accepted", "production", "quality_check", "ready"].includes(po.status)
            ).length,
            completedOrders: productionOrders3.filter((po) => po.status === "completed").length,
            totalProducts: producerProducts.length,
            isActive: producer.isActive
          };
        })
      );
      res.json(producerStats);
    } catch (error) {
      console.error("Error fetching producer stats:", error);
      res.status(500).json({ error: "Failed to fetch producer stats" });
    }
  });
  app2.get("/api/logistics/dropshipping-orders", async (req, res) => {
    try {
      console.log("Fetching dropshipping orders for logistics...");
      const orders2 = await db.getOrders();
      const productionOrders3 = await db.getProductionOrders();
      const productionOrdersByOrder = /* @__PURE__ */ new Map();
      for (const po of productionOrders3) {
        if (!productionOrdersByOrder.has(po.orderId)) {
          productionOrdersByOrder.set(po.orderId, []);
        }
        productionOrdersByOrder.get(po.orderId).push(po);
      }
      const dropshippingOrders = orders2.filter((order) => {
        if (order.status === "cancelled") return false;
        const paidValue = parseFloat(order.paidValue || "0");
        const isPaid = paidValue > 0;
        if (!isPaid) return false;
        let hasExternalProducers = false;
        if (order.items) {
          for (const item of order.items) {
            if (item.producerId && item.producerId !== "internal") {
              hasExternalProducers = true;
              break;
            }
          }
        }
        if (!hasExternalProducers) return false;
        let uniqueProducers = /* @__PURE__ */ new Set();
        for (const item of order.items || []) {
          if (item.producerId && item.producerId !== "internal") {
            uniqueProducers.add(item.producerId);
          }
        }
        const existingPOs = productionOrdersByOrder.get(order.id) || [];
        const sentPOs = existingPOs.filter((po) => po.status !== "pending");
        const producersWithSentPOs = new Set(sentPOs.map((po) => po.producerId));
        const allProducersHaveSentPOs = uniqueProducers.size > 0 && uniqueProducers.size === producersWithSentPOs.size;
        return !allProducersHaveSentPOs;
      });
      console.log(`Found ${dropshippingOrders.length} dropshipping orders`);
      const enrichedOrders = await Promise.all(
        dropshippingOrders.map(async (order) => {
          const enrichedItems = await Promise.all(
            (order.items || []).map(async (item) => {
              if (item.producerId && item.producerId !== "internal") {
                const producer = await db.getUser(item.producerId);
                return {
                  ...item,
                  producerName: producer?.name || null
                };
              }
              return item;
            })
          );
          let clientName = order.contactName;
          let clientPhone = order.contactPhone;
          let clientEmail = order.contactEmail;
          if (order.clientId) {
            let clientRecord = await db.getClient(order.clientId);
            if (!clientRecord) {
              clientRecord = await db.getClientByUserId(order.clientId);
            }
            if (clientRecord) {
              if (!clientName) clientName = clientRecord.name;
              if (!clientPhone) clientPhone = clientRecord.telefone;
              if (!clientEmail) clientEmail = clientRecord.email;
            }
          }
          return {
            ...order,
            items: enrichedItems,
            clientName,
            clientPhone,
            clientEmail,
            productStatus: order.productStatus || "to_buy"
          };
        })
      );
      const statusPriority = {
        "to_buy": 1,
        "purchased": 2,
        "in_store": 3
      };
      enrichedOrders.sort((a, b) => {
        const priorityA = statusPriority[a.productStatus] || 1;
        const priorityB = statusPriority[b.productStatus] || 1;
        return priorityA - priorityB;
      });
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching dropshipping orders:", error);
      res.status(500).json({ error: "Failed to fetch dropshipping orders" });
    }
  });
  app2.get("/api/logistics/dropshipping-items", async (req, res) => {
    try {
      console.log("Fetching dropshipping items for logistics...");
      const { status } = req.query;
      const orders2 = await db.getOrders();
      const allItems = [];
      for (const order of orders2) {
        if (order.status === "cancelled") continue;
        const paidValue = parseFloat(order.paidValue || "0");
        if (paidValue <= 0) continue;
        if (!order.budgetId) continue;
        if (order.productStatus === "in_store") continue;
        const budgetItems2 = await db.getBudgetItems(order.budgetId);
        let clientName = order.contactName;
        let clientPhone = order.contactPhone;
        if (order.clientId) {
          let clientRecord = await db.getClient(order.clientId);
          if (!clientRecord) clientRecord = await db.getClientByUserId(order.clientId);
          if (clientRecord) {
            if (!clientName) clientName = clientRecord.name;
            if (!clientPhone) clientPhone = clientRecord.telefone || clientRecord.phone;
          }
        }
        for (const item of budgetItems2) {
          if (!item.producerId || item.producerId === "internal") continue;
          const producer = await db.getUser(item.producerId);
          const product = await db.getProduct(item.productId);
          const purchaseStatus = item.purchaseStatus || "to_buy";
          let buttonStatus = "";
          if (purchaseStatus === "pending") buttonStatus = "to_buy";
          else if (purchaseStatus === "to_buy") buttonStatus = "purchased";
          else if (purchaseStatus === "purchased") buttonStatus = "in_store";
          if (status && status !== "all" && buttonStatus !== status) continue;
          allItems.push({
            itemId: item.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            budgetId: order.budgetId,
            clientName,
            clientPhone,
            productId: item.productId,
            productName: item.productName || product?.name || "Produto",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            producerId: item.producerId,
            producerName: producer?.name || "Produtor",
            productCode: product?.friendlyCode || product?.externalCode || product?.compositeCode || product?.code || item.productCode || null,
            purchaseStatus,
            deliveryDeadline: order.deliveryDeadline || order.deadline,
            orderCreatedAt: order.createdAt,
            orderStatus: order.status,
            hasCustomization: item.hasItemCustomization || false,
            customizationDescription: item.itemCustomizationDescription,
            notes: item.notes,
            productWidth: item.productWidth,
            productHeight: item.productHeight,
            productDepth: item.productDepth
          });
        }
      }
      const statusPriority = {
        "to_buy": 1,
        "purchased": 2,
        "in_store": 3,
        "pending": 1
        // Fallback pending to same as to_buy
      };
      allItems.sort((a, b) => {
        const priorityA = statusPriority[a.purchaseStatus] || 1;
        const priorityB = statusPriority[b.purchaseStatus] || 1;
        if (priorityA !== priorityB) return priorityA - priorityB;
        if (a.deliveryDeadline && b.deliveryDeadline) return new Date(a.deliveryDeadline).getTime() - new Date(b.deliveryDeadline).getTime();
        return 0;
      });
      console.log(`Found ${allItems.length} dropshipping items`);
      res.json(allItems);
    } catch (error) {
      console.error("Error fetching dropshipping items:", error);
      res.status(500).json({ error: "Failed to fetch dropshipping items" });
    }
  });
  app2.patch("/api/budget-items/:itemId/purchase-status", async (req, res) => {
    try {
      const { itemId } = req.params;
      const { purchaseStatus } = req.body;
      if (!["pending", "to_buy", "purchased", "in_store"].includes(purchaseStatus)) {
        return res.status(400).json({ error: "Status inv\xE1lido. Use: pending, to_buy, purchased, in_store" });
      }
      const updatedItem = await db.updateBudgetItemPurchaseStatus(itemId, purchaseStatus);
      if (!updatedItem) {
        return res.status(404).json({ error: "Item n\xE3o encontrado" });
      }
      const budgets3 = await db.getBudgets();
      const budget = budgets3.find((b) => b.id === updatedItem.budgetId);
      let allItemsReady = false;
      let orderNumber = "";
      if (budget) {
        const orders2 = await db.getOrders();
        const order = orders2.find((o) => o.budgetId === budget.id);
        if (order) {
          orderNumber = order.orderNumber || "";
          const allInStore = await db.checkAllItemsInStore(order.id);
          if (allInStore && order.productStatus !== "in_store") {
            await db.updateOrder(order.id, { productStatus: "in_store" });
            allItemsReady = true;
            console.log(`Order ${order.orderNumber} automatically moved to 'in_store' - all items ready for production queue`);
          }
        }
      }
      res.json({
        success: true,
        message: `Status do item atualizado para ${purchaseStatus}`,
        item: updatedItem,
        allItemsReady,
        orderNumber
      });
    } catch (error) {
      console.error("Error updating item purchase status:", error);
      res.status(500).json({ error: "Erro ao atualizar status do item" });
    }
  });
  app2.post("/api/orders/:orderId/initialize-item-status", async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await db.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido n\xE3o encontrado" });
      }
      if (!order.budgetId) {
        return res.status(400).json({ error: "Pedido n\xE3o tem or\xE7amento associado" });
      }
      const items = await db.getBudgetItems(order.budgetId);
      let updatedCount = 0;
      for (const item of items) {
        if (item.producerId && item.producerId !== "internal" && (!item.purchaseStatus || item.purchaseStatus === "pending")) {
          await db.updateBudgetItemPurchaseStatus(item.id, "to_buy");
          updatedCount++;
        }
      }
      res.json({
        success: true,
        message: `${updatedCount} itens atualizados para 'to_buy'`,
        updatedCount
      });
    } catch (error) {
      console.error("Error initializing item status:", error);
      res.status(500).json({ error: "Erro ao inicializar status dos itens" });
    }
  });
  app2.get("/api/logistics/paid-orders", async (req, res) => {
    try {
      console.log("Fetching paid orders for logistics...");
      const orders2 = await db.getOrders();
      const productionOrders3 = await db.getProductionOrders();
      const productionOrdersByOrder = /* @__PURE__ */ new Map();
      for (const po of productionOrders3) {
        if (!productionOrdersByOrder.has(po.orderId)) {
          productionOrdersByOrder.set(po.orderId, []);
        }
        productionOrdersByOrder.get(po.orderId).push(po);
      }
      const paidOrders = orders2.filter((order) => {
        const totalValue = parseFloat(order.totalValue || "0");
        const paidValue = parseFloat(order.paidValue || "0");
        const isPaid = paidValue > 0;
        const productStatus = order.productStatus || "to_buy";
        const isProductInStore = productStatus === "in_store";
        let hasExternalProducers = false;
        let uniqueProducers = /* @__PURE__ */ new Set();
        if (order.budgetId) {
          const budgetItems2 = order.items || [];
          for (const item of budgetItems2) {
            if (item.producerId && item.producerId !== "internal") {
              hasExternalProducers = true;
              uniqueProducers.add(item.producerId);
            }
          }
        } else if (order.items) {
          for (const item of order.items) {
            if (item.producerId && item.producerId !== "internal") {
              hasExternalProducers = true;
              uniqueProducers.add(item.producerId);
            }
          }
        }
        const existingPOs = productionOrdersByOrder.get(order.id) || [];
        const sentPOs = existingPOs.filter((po) => po.status !== "pending");
        const producersWithSentPOs = new Set(sentPOs.map((po) => po.producerId));
        const notAllProducersHaveSentPOs = uniqueProducers.size > producersWithSentPOs.size;
        const isValid = isPaid && hasExternalProducers && notAllProducersHaveSentPOs && isProductInStore;
        if (isValid) {
          console.log(`Valid paid order: ${order.orderNumber} - Paid: R$ ${paidValue} / Total: R$ ${totalValue} - Producers: ${uniqueProducers.size} total, ${producersWithSentPOs.size} sent`);
        }
        return isValid;
      });
      console.log(`Found ${paidOrders.length} paid orders ready for production`);
      const enrichedOrders = await Promise.all(
        paidOrders.map(async (order) => {
          const enrichedItems = await Promise.all(
            (order.items || []).map(async (item) => {
              if (item.producerId && item.producerId !== "internal") {
                const producer = await db.getUser(item.producerId);
                return {
                  ...item,
                  producerName: producer?.name || null
                };
              }
              return item;
            })
          );
          let clientName = order.contactName;
          let clientAddress = null;
          let clientPhone = order.contactPhone;
          let clientEmail = order.contactEmail;
          if (order.clientId) {
            let clientRecord = await db.getClient(order.clientId);
            if (!clientRecord) {
              clientRecord = await db.getClientByUserId(order.clientId);
            }
            if (clientRecord) {
              if (!clientName) {
                clientName = clientRecord.name;
              }
              clientAddress = clientRecord.enderecoEntregaLogradouro ? `${clientRecord.enderecoEntregaLogradouro}, ${clientRecord.enderecoEntregaNumero || "s/n"}${clientRecord.enderecoEntregaComplemento ? ` - ${clientRecord.enderecoEntregaComplemento}` : ""}, ${clientRecord.enderecoEntregaBairro || ""}, ${clientRecord.enderecoEntregaCidade || ""}, CEP: ${clientRecord.enderecoEntregaCep || ""}` : clientRecord.address;
              clientPhone = clientPhone || clientRecord.phone;
              clientEmail = clientEmail || clientRecord.email;
            } else {
              const clientUser = await db.getUser(order.clientId);
              if (clientUser) {
                if (!clientName) {
                  clientName = clientUser.name;
                }
                clientPhone = clientPhone || clientUser.phone;
                clientEmail = clientEmail || clientUser.email;
                clientAddress = clientUser.address;
              }
            }
          }
          if (!clientName) {
            clientName = "Nome n\xE3o informado";
          }
          const finalShippingAddress = order.deliveryType === "pickup" ? "Sede Principal - Retirada no Local" : order.shippingAddress || clientAddress || "Endere\xE7o n\xE3o informado";
          return {
            ...order,
            items: enrichedItems,
            clientName,
            clientAddress: finalShippingAddress,
            clientPhone,
            clientEmail,
            shippingAddress: finalShippingAddress,
            deliveryType: order.deliveryType || "delivery"
          };
        })
      );
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching paid orders for logistics:", error);
      res.status(500).json({ error: "Failed to fetch paid orders" });
    }
  });
  app2.get("/api/logistics/production-orders", async (req, res) => {
    try {
      const productionOrders3 = await db.getProductionOrders();
      const enrichedOrders = await Promise.all(
        productionOrders3.map(async (po) => {
          let order = await db.getOrder(po.orderId);
          const producer = po.producerId ? await db.getUser(po.producerId) : null;
          let clientName = order?.contactName;
          let clientAddress = null;
          let clientPhone = order?.contactPhone;
          let clientEmail = order?.contactEmail;
          if (order?.clientId) {
            let clientRecord = await db.getClient(order.clientId);
            if (!clientRecord) {
              clientRecord = await db.getClientByUserId(order.clientId);
            }
            if (clientRecord) {
              if (!clientName) {
                clientName = clientRecord.name;
              }
              clientAddress = clientRecord.enderecoEntregaLogradouro ? `${clientRecord.enderecoEntregaLogradouro}, ${clientRecord.enderecoEntregaNumero || "s/n"}${clientRecord.enderecoEntregaComplemento ? ` - ${clientRecord.enderecoEntregaComplemento}` : ""}, ${clientRecord.enderecoEntregaBairro || ""}, ${clientRecord.enderecoEntregaCidade || ""}, CEP: ${clientRecord.enderecoEntregaCep || ""}` : clientRecord.address;
              clientPhone = clientPhone || clientRecord.phone;
              clientEmail = clientEmail || clientRecord.email;
            } else {
              const clientUser = await db.getUser(order.clientId);
              if (clientUser) {
                if (!clientName) {
                  clientName = clientUser.name;
                }
                clientPhone = clientPhone || clientUser.phone;
                clientEmail = clientEmail || clientUser.email;
                clientAddress = clientUser.address;
              }
            }
          }
          if (!clientName) {
            clientName = "Nome n\xE3o informado";
          }
          const savedShippingAddress = order?.shippingAddress;
          const finalShippingAddress = order?.deliveryType === "pickup" ? "Sede Principal - Retirada no Local" : savedShippingAddress || clientAddress || "Endere\xE7o n\xE3o informado";
          return {
            ...po,
            orderNumber: order?.orderNumber || `PO-${po.id}`,
            product: order?.product || "Produto n\xE3o informado",
            clientName,
            clientAddress: finalShippingAddress,
            shippingAddress: finalShippingAddress,
            deliveryType: order?.deliveryType || "delivery",
            clientPhone,
            clientEmail,
            producerName: producer?.name || null,
            order: order ? {
              ...order,
              clientName,
              clientAddress: finalShippingAddress,
              shippingAddress: finalShippingAddress,
              clientPhone,
              clientEmail,
              deliveryType: order.deliveryType || "delivery"
            } : null
          };
        })
      );
      const validOrders = enrichedOrders.filter((order) => order !== null);
      console.log(`Returning ${validOrders.length} enriched production orders`);
      res.json(validOrders);
    } catch (error) {
      console.error("Error fetching production orders:", error);
      res.status(500).json({ error: "Failed to fetch production orders" });
    }
  });
  app2.get("/api/expedition/orders", async (req, res) => {
    try {
      const orders2 = await db.getOrders();
      const expeditionOrders = orders2.filter(
        (order) => ["ready", "shipped"].includes(order.status)
      );
      const enrichedOrders = await Promise.all(
        expeditionOrders.map(async (order) => {
          let clientName = order.contactName || "Cliente n\xE3o identificado";
          let clientAddress = null;
          let clientPhone = order.contactPhone;
          let clientEmail = order.contactEmail;
          if (order.clientId) {
            let clientRecord = await db.getClient(order.clientId);
            if (!clientRecord) {
              clientRecord = await db.getClientByUserId(order.clientId);
            }
            if (clientRecord) {
              if (!clientName || clientName === "Cliente n\xE3o identificado") {
                clientName = clientRecord.name;
              }
              clientAddress = clientRecord.enderecoEntregaLogradouro ? `${clientRecord.enderecoEntregaLogradouro}, ${clientRecord.enderecoEntregaNumero || "s/n"}${clientRecord.enderecoEntregaComplemento ? ` - ${clientRecord.enderecoEntregaComplemento}` : ""}, ${clientRecord.enderecoEntregaBairro || ""}, ${clientRecord.enderecoEntregaCidade || ""}, CEP: ${clientRecord.enderecoEntregaCep || ""}` : clientRecord.address;
              clientPhone = clientPhone || clientRecord.phone;
              clientEmail = clientEmail || clientRecord.email;
            } else {
              const clientUser = await db.getUser(order.clientId);
              if (clientUser) {
                if (!clientName || clientName === "Cliente n\xE3o identificado") {
                  clientName = clientUser.name;
                }
                clientPhone = clientPhone || clientUser.phone;
                clientEmail = clientEmail || clientUser.email;
                clientAddress = clientUser.address;
              }
            }
          }
          const vendor = await db.getUser(order.vendorId);
          const producer = order.producerId ? await db.getUser(order.producerId) : null;
          const finalShippingAddress = order.deliveryType === "pickup" ? "Sede Principal - Retirada no Local" : order.shippingAddress || clientAddress || "Endere\xE7o n\xE3o informado";
          return {
            ...order,
            clientName,
            clientAddress: finalShippingAddress,
            clientPhone,
            clientEmail,
            vendorName: vendor?.name || "Vendedor",
            producerName: producer?.name || null,
            shippingAddress: finalShippingAddress,
            deliveryType: order.deliveryType || "delivery"
          };
        })
      );
      console.log(`Returning ${enrichedOrders.length} expedition orders`);
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching expedition orders:", error);
      res.status(500).json({ error: "Failed to fetch expedition orders" });
    }
  });
  app2.get("/api/payment-methods", async (req, res) => {
    try {
      const methods = await db.getAllPaymentMethods();
      res.json(methods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });
  app2.get("/api/shipping-methods", async (req, res) => {
    try {
      const methods = await db.getAllShippingMethods();
      res.json(methods);
    } catch (error) {
      console.error("Error fetching shipping methods:", error);
      res.status(500).json({ error: "Failed to fetch shipping methods" });
    }
  });
  app2.post("/api/budgets/:id/approve", async (req, res) => {
    try {
      const budgetId = req.params.id;
      const budget = await db.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ error: "Budget not found" });
      }
      budget.status = "approved";
      budget.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await db.updateBudget(budgetId, budget);
      res.json({ success: true, budget });
    } catch (error) {
      console.error("Error approving budget:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/vendor/:vendorId/pending-actions", async (req, res) => {
    try {
      const vendorId = req.params.vendorId;
      const budgets3 = await db.getBudgetsByVendor(vendorId);
      const pendingBudgets = budgets3.filter(
        (budget) => budget.status === "approved" || budget.status === "admin_approved" || budget.status === "not_approved"
      );
      res.json({ count: pendingBudgets.length });
    } catch (error) {
      console.error("Error fetching pending actions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/finance/payment-data", async (req, res) => {
    try {
      const paymentData = await db.getPaymentData();
      res.json(paymentData || {
        pix: "",
        bankAccount: "",
        paymentLink: "",
        instructions: ""
      });
    } catch (error) {
      console.error("Error fetching payment data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/finance/payment-data", async (req, res) => {
    try {
      const paymentData = req.body;
      await db.updatePaymentData(paymentData);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating payment data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/budgets/client/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      console.log(`Fetching budgets for client: ${clientId}`);
      let budgets3 = [];
      const allBudgets = await db.getBudgets();
      console.log(`Total budgets in system: ${allBudgets.length}`);
      for (const budget of allBudgets) {
        let shouldInclude = false;
        if (budget.clientId === clientId) {
          shouldInclude = true;
        }
        if (!shouldInclude) {
          try {
            const clientRecord = await db.getClientByUserId(clientId);
            if (clientRecord && budget.clientId === clientRecord.id) {
              shouldInclude = true;
            }
          } catch (e) {
          }
        }
        if (!shouldInclude) {
          try {
            const budgetClientRecord = await db.getClient(budget.clientId);
            if (budgetClientRecord && budgetClientRecord.userId === clientId) {
              shouldInclude = true;
            }
          } catch (e) {
          }
        }
        if (!shouldInclude && budget.contactName) {
          try {
            const user = await db.getUser(clientId);
            if (user && user.name === budget.contactName) {
              shouldInclude = true;
            }
          } catch (e) {
          }
        }
        if (shouldInclude) {
          budgets3.push(budget);
        }
      }
      const uniqueBudgets = budgets3.filter(
        (budget, index, self) => index === self.findIndex((b) => b.id === budget.id)
      );
      console.log(`Found ${uniqueBudgets.length} unique budgets for client ${clientId}`);
      const enrichedBudgets = await Promise.all(
        uniqueBudgets.map(async (budget) => {
          const vendor = await db.getUser(budget.vendorId);
          const items = await db.getBudgetItems(budget.id);
          const photos = await db.getBudgetPhotos(budget.id);
          const enrichedItems = await Promise.all(
            items.map(async (item) => {
              const product = await db.getProduct(item.productId);
              return {
                ...item,
                productName: product?.name || "Produto n\xE3o encontrado"
              };
            })
          );
          const paymentData = await db.getBudgetPaymentInfo(budget.id);
          return {
            ...budget,
            id: budget.id,
            budgetNumber: budget.budgetNumber || "N/A",
            title: budget.title || "Sem t\xEDtulo",
            status: budget.status || "draft",
            totalValue: budget.totalValue || "0.00",
            vendorName: vendor?.name || "Vendedor",
            photos,
            items: enrichedItems,
            paymentData
          };
        })
      );
      enrichedBudgets.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      res.json(enrichedBudgets);
    } catch (error) {
      console.error("Error fetching client budgets:", error);
      res.status(500).json({ error: "Failed to fetch client budgets" });
    }
  });
  app2.get("/api/admin/logs", async (req, res) => {
    try {
      const logs = await db.getSystemLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching system logs:", error);
      res.status(500).json({ error: "Failed to fetch system logs" });
    }
  });
  app2.get("/api/vendor/logs", async (req, res) => {
    try {
      const { vendorId, search, action, level, date } = req.query;
      if (!vendorId) {
        return res.status(400).json({ error: "Vendor ID is required" });
      }
      const allLogs = await db.getSystemLogs();
      const vendorClients = await db.getClientsByVendor(vendorId);
      const vendorClientIds = vendorClients.map((c) => c.userId || c.id);
      let filteredLogs = allLogs.filter((log) => {
        if (log.userId === vendorId) return true;
        if (vendorClientIds.includes(log.userId)) return true;
        if (log.details) {
          try {
            const details = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
            if (details.vendorId === vendorId) return true;
            if (details.vendor === vendorId) return true;
          } catch (e) {
          }
        }
        return false;
      });
      if (search) {
        const searchTerm = search.toLowerCase();
        filteredLogs = filteredLogs.filter(
          (log) => log.action.toLowerCase().includes(searchTerm) || log.description.toLowerCase().includes(searchTerm) || log.userName.toLowerCase().includes(searchTerm)
        );
      }
      if (action && action !== "all") {
        filteredLogs = filteredLogs.filter((log) => log.action === action);
      }
      if (level && level !== "all") {
        filteredLogs = filteredLogs.filter((log) => log.level === level);
      }
      if (date && date !== "all") {
        const now = /* @__PURE__ */ new Date();
        let startDate;
        switch (date) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
            break;
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }
        if (startDate) {
          filteredLogs = filteredLogs.filter(
            (log) => new Date(log.createdAt) >= startDate
          );
        }
      }
      filteredLogs.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      console.log(`Found ${filteredLogs.length} logs for vendor ${vendorId}`);
      res.json(filteredLogs);
    } catch (error) {
      console.error("Error fetching vendor logs:", error);
      res.status(500).json({ error: "Failed to fetch vendor logs" });
    }
  });
  app2.post("/api/admin/logs", async (req, res) => {
    try {
      const logData = req.body;
      const log = await db.createSystemLog({
        ...logData,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent")
      });
      res.json(log);
    } catch (error) {
      console.error("Error creating system log:", error);
      res.status(500).json({ error: "Failed to create system log" });
    }
  });
  app2.get("/api/pricing/settings", async (req, res) => {
    try {
      const settings = await db.getPricingSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching pricing settings:", error);
      res.status(500).json({ error: "Failed to fetch pricing settings" });
    }
  });
  app2.put("/api/pricing/settings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const settings = await db.updatePricingSettings(id, updates);
      res.json(settings);
    } catch (error) {
      console.error("Error updating pricing settings:", error);
      res.status(500).json({ error: "Failed to update pricing settings" });
    }
  });
  app2.get("/api/pricing/margin-tiers/:settingsId", async (req, res) => {
    try {
      const { settingsId } = req.params;
      const tiers = await db.getPricingMarginTiers(settingsId);
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching margin tiers:", error);
      res.status(500).json({ error: "Failed to fetch margin tiers" });
    }
  });
  app2.post("/api/pricing/margin-tiers", async (req, res) => {
    try {
      const tierData = req.body;
      if (!tierData.marginRate || tierData.marginRate === "") tierData.marginRate = "0";
      if (!tierData.minimumMarginRate || tierData.minimumMarginRate === "") tierData.minimumMarginRate = "20.00";
      if (!tierData.minRevenue || tierData.minRevenue === "") tierData.minRevenue = "0";
      if (!tierData.settingsId) {
        return res.status(400).json({ error: "settingsId \xE9 obrigat\xF3rio. Verifique se as configura\xE7\xF5es de pre\xE7o foram carregadas." });
      }
      const tier = await db.createPricingMarginTier(tierData);
      res.json(tier);
      db.recalculateProductPrices().then((result) => {
        console.log(`[PRICING] Pre\xE7os recalculados ap\xF3s nova faixa de margem: ${result.updated} produtos atualizados`);
        if (result.errors.length > 0) console.warn("[PRICING] Erros no rec\xE1lculo:", result.errors);
      }).catch((err) => console.error("[PRICING] Erro ao recalcular pre\xE7os:", err));
    } catch (error) {
      console.error("Error creating margin tier:", error);
      res.status(500).json({ error: "Failed to create margin tier" });
    }
  });
  app2.put("/api/pricing/margin-tiers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      if (updates.marginRate === "") updates.marginRate = "0";
      if (updates.minimumMarginRate === "") updates.minimumMarginRate = "20.00";
      if (updates.minRevenue === "") updates.minRevenue = "0";
      const tier = await db.updatePricingMarginTier(id, updates);
      res.json(tier);
      db.recalculateProductPrices().then((result) => {
        console.log(`[PRICING] Pre\xE7os recalculados ap\xF3s edi\xE7\xE3o de faixa: ${result.updated} produtos atualizados`);
        if (result.errors.length > 0) console.warn("[PRICING] Erros no rec\xE1lculo:", result.errors);
      }).catch((err) => console.error("[PRICING] Erro ao recalcular pre\xE7os:", err));
    } catch (error) {
      console.error("Error updating margin tier:", error);
      res.status(500).json({ error: "Failed to update margin tier" });
    }
  });
  app2.delete("/api/pricing/margin-tiers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.deletePricingMarginTier(id);
      res.json({ success: true });
      db.recalculateProductPrices().then((result) => {
        console.log(`[PRICING] Pre\xE7os recalculados ap\xF3s exclus\xE3o de faixa: ${result.updated} produtos atualizados`);
        if (result.errors.length > 0) console.warn("[PRICING] Erros no rec\xE1lculo:", result.errors);
      }).catch((err) => console.error("[PRICING] Erro ao recalcular pre\xE7os:", err));
    } catch (error) {
      console.error("Error deleting margin tier:", error);
      res.status(500).json({ error: "Failed to delete margin tier" });
    }
  });
  app2.post("/api/pricing/calculate", async (req, res) => {
    try {
      const { productCost, quantity, revenue = 0, paymentCondition = "standard" } = req.body;
      const settings = await db.getPricingSettings();
      if (!settings) {
        return res.status(400).json({ error: "No pricing settings configured" });
      }
      const tiers = await db.getPricingMarginTiers(settings.id);
      const totalCost = parseFloat(productCost);
      const revenueValue = parseFloat(revenue) || 0;
      let marginRate = 0.28;
      let minMarginRate = 0.2;
      for (const tier of tiers) {
        const minRev = parseFloat(tier.minRevenue) || 0;
        const maxRev = tier.maxRevenue ? parseFloat(tier.maxRevenue) : Number.MAX_SAFE_INTEGER;
        if (revenueValue >= minRev && revenueValue <= maxRev) {
          marginRate = parseFloat(tier.marginRate) / 100;
          minMarginRate = parseFloat(tier.minimumMarginRate) / 100;
          break;
        }
      }
      const taxRate = parseFloat(settings.taxRate) / 100;
      const commissionRate = parseFloat(settings.commissionRate) / 100;
      const divisorIdeal = 1 - (taxRate + commissionRate + marginRate);
      const divisorMinimo = 1 - (taxRate + commissionRate + minMarginRate);
      let idealPrice = totalCost / divisorIdeal;
      const minimumPrice = totalCost / divisorMinimo;
      if (paymentCondition === "cash") {
        idealPrice *= 1 - parseFloat(settings.cashDiscount) / 100;
      }
      res.json({
        totalCost: Math.round(totalCost * 100) / 100,
        marginApplied: marginRate * 100,
        minimumMarginApplied: minMarginRate * 100,
        idealPrice: Math.round(idealPrice * 100) / 100,
        minimumPrice: Math.round(minimumPrice * 100) / 100,
        totalIdeal: Math.round(idealPrice * quantity * 100) / 100,
        totalMinimum: Math.round(minimumPrice * quantity * 100) / 100,
        taxRate: taxRate * 100,
        commissionRate: commissionRate * 100
      });
    } catch (error) {
      console.error("Error calculating price:", error);
      res.status(500).json({ error: "Failed to calculate price" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "..", "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// api/index.ts
import "dotenv/config";
var app = express3();
app.use(express3.json({ limit: "50mb" }));
app.use(express3.urlencoded({ limit: "50mb", extended: true }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      console.log(logLine);
    }
  });
  next();
});
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});
var initializedApp = null;
var initializationPromise = null;
async function initializeApp() {
  if (initializedApp) {
    return initializedApp;
  }
  if (!initializationPromise) {
    initializationPromise = (async () => {
      console.log("\u{1F680} Initializing Vercel serverless function...");
      if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
        console.log("\u{1F4C1} Setting up static file serving for development");
        serveStatic(app);
      }
      console.log("\u{1F504} Registering API routes...");
      await registerRoutes(app);
      initializedApp = app;
      console.log("\u2705 App initialization complete");
      return initializedApp;
    })();
  }
  return await initializationPromise;
}
async function handler(req, res) {
  try {
    const initializationTimeout = 5e3;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Initialization timeout")), initializationTimeout);
    });
    const appInstance = await Promise.race([
      initializeApp(),
      timeoutPromise
    ]);
    return appInstance(req, res);
  } catch (error) {
    console.error("\u274C Error in Vercel handler:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = errorMessage.includes("timeout");
    res.status(500).json({
      error: "Internal server error",
      message: isTimeout ? "Server initialization timeout. Please try again." : errorMessage,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
export {
  handler as default
};
