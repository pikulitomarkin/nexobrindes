import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin', 'vendor', 'client', 'producer', 'logistics', 'finance'
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  vendorId: varchar("vendor_id"), // For clients: link to their assigned vendor
  isActive: boolean("is_active").default(true),
  // Producer specific fields
  specialty: text("specialty"), // For producers: their specialty
  address: text("address"), // For producers: their address
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(), // Nome de contato
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  cpfCnpj: text("cpf_cnpj"),
  address: text("address"), // Campo legado - manter para compatibilidade
  vendorId: varchar("vendor_id").references(() => users.id), // Vendedor responsável
  // Novos campos comerciais
  nomeFantasia: text("nome_fantasia"), // Nome Fantasia
  razaoSocial: text("razao_social"), // Nome/Razão Social
  inscricaoEstadual: text("inscricao_estadual"), // Inscrição Estadual
  logradouro: text("logradouro"), // Logradouro/Rua
  numero: text("numero"), // Número
  complemento: text("complemento"), // Complemento
  bairro: text("bairro"), // Bairro
  cidade: text("cidade"), // Cidade
  cep: text("cep"), // CEP
  emailBoleto: text("email_boleto"), // E-Mail para Envio de Boleto
  emailNF: text("email_nf"), // E-Mail para Envio de NF
  nomeContato: text("nome_contato"), // Nome do contato
  emailContato: text("email_contato"), // Endereço de e-mail do contato
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  clientId: varchar("client_id").references(() => clients.id),
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id), // Filial do pedido (escolhida no momento do pedido)
  budgetId: varchar("budget_id").references(() => budgets.id),
  product: text("product").notNull(),
  description: text("description"),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  paidValue: decimal("paid_value", { precision: 10, scale: 2 }).default('0'),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).default('0'), // Valor a ser restituído em caso de cancelamento
  status: text("status").notNull().default('pending'), // 'pending', 'confirmed', 'production', 'shipped', 'partial_shipped', 'delivered', 'cancelled'
  deadline: timestamp("deadline"),
  // Contact information fields
  contactName: text("contact_name").notNull(), // Nome de contato obrigatório
  contactPhone: text("contact_phone"), // Telefone de contato opcional
  contactEmail: text("contact_email"), // Email de contato opcional
  // Delivery information
  deliveryType: text("delivery_type").default('delivery'), // 'delivery' or 'pickup'
  deliveryDeadline: timestamp("delivery_deadline"),
  // Payment information
  paymentMethodId: varchar("payment_method_id").references(() => paymentMethods.id),
  shippingMethodId: varchar("shipping_method_id").references(() => shippingMethods.id),
  installments: integer("installments").default(1),
  downPayment: decimal("down_payment", { precision: 10, scale: 2 }).default('0.00'),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).default('0.00'),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default('0.00'),
  // Discount information
  hasDiscount: boolean("has_discount").default(false),
  discountType: text("discount_type").default('percentage'), // 'percentage' or 'value'
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default('0.00'),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).default('0.00'),
  // Tracking
  trackingCode: text("tracking_code"),
  // Additional notes
  refundNotes: text("refund_notes"), // Observações sobre reembolso
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productionOrders = pgTable("production_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  producerId: varchar("producer_id").references(() => users.id).notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'production', 'quality_check', 'ready', 'preparing_shipment', 'shipped', 'delivered', 'completed', 'rejected'
  deadline: timestamp("deadline"),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  deliveryDeadline: timestamp("delivery_deadline"),
  hasUnreadNotes: boolean("has_unread_notes").default(false),
  lastNoteAt: timestamp("last_note_at"),
  trackingCode: text("tracking_code"), // Código de rastreamento
  shippingAddress: text("shipping_address"), // Endereço de envio

  // Campos financeiros para pagamento do produtor
  producerValue: decimal("producer_value", { precision: 10, scale: 2 }), // Valor que o produtor cobrará
  producerValueLocked: boolean("producer_value_locked").default(false), // Se true, valor não pode ser alterado
  producerPaymentStatus: text("producer_payment_status").default('pending'), // 'pending', 'approved', 'paid'
  producerNotes: text("producer_notes"), // Observações do produtor sobre o valor
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
  // Reconciliation fields
  reconciliationStatus: text("reconciliation_status").notNull().default('pending'), // 'pending', 'manual', 'ofx'
  bankTransactionId: varchar("bank_transaction_id"), // FK to bankTransactions when reconciled via OFX
});

export const commissions = pgTable("commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").references(() => users.id),
  partnerId: varchar("partner_id").references(() => users.id),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  type: text("type").notNull(), // 'vendor' or 'partner'
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'confirmed', 'paid', 'deducted', 'cancelled'
  paidAt: timestamp("paid_at"),
  deductedAt: timestamp("deducted_at"),
  orderValue: decimal("order_value", { precision: 10, scale: 2 }),
  orderNumber: text("order_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default('15.00'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commissionSettings = pgTable("commission_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorCommissionRate: decimal("vendor_commission_rate", { precision: 5, scale: 2 }).default('10.00'),
  partnerCommissionRate: decimal("partner_commission_rate", { precision: 5, scale: 2 }).default('15.00'),
  vendorPaymentTiming: text("vendor_payment_timing").default('order_completion'), // 'order_completion'
  partnerPaymentTiming: text("partner_payment_timing").default('order_start'), // 'order_start'
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  city: text("city").notNull(),
  isHeadquarters: boolean("is_headquarters").default(false), // Para identificar a matriz
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  // branchId removido - vendedores ficam na matriz
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

  // Produtor responsável - 'internal' para produtos internos ou ID do produtor específico
  producerId: varchar("producer_id").references(() => users.id).default('internal'),
  type: text("type").default('internal'), // 'internal' ou 'external'

  // Campos adicionais do JSON XBZ
  externalId: text("external_id"), // IdProduto
  externalCode: text("external_code"), // CodigoXbz
  compositeCode: text("composite_code"), // CodigoAmigavel
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
  clientId: varchar("client_id").references(() => clients.id), // Opcional - só obrigatório na conversão para pedido
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id), // Filial do orçamento
  contactName: text("contact_name").notNull(), // Nome de contato obrigatório
  contactPhone: text("contact_phone"), // Telefone de contato opcional
  contactEmail: text("contact_email"), // Email de contato opcional
  title: text("title").notNull(),
  description: text("description"),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('draft'), // 'draft', 'sent', 'approved', 'rejected', 'converted'
  validUntil: timestamp("valid_until"),
  deliveryDeadline: timestamp("delivery_deadline"),

  // Campo para tipo de entrega
  deliveryType: text("delivery_type").default('delivery'), // 'delivery' or 'pickup'

  // Campos para personalização
  hasCustomization: boolean("has_customization").default(false),
  customizationPercentage: decimal("customization_percentage", { precision: 5, scale: 2 }).default('0.00'),
  customizationValue: decimal("customization_value", { precision: 10, scale: 2 }).default('0.00'),
  customizationDescription: text("customization_description"),

  // Campos para desconto
  hasDiscount: boolean("has_discount").default(false),
  discountType: text("discount_type").default('percentage'), // 'percentage' or 'value'
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default('0.00'),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).default('0.00'),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const budgetItems = pgTable("budget_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id").references(() => budgets.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  producerId: varchar("producer_id").references(() => users.id), // Produtor responsável por este item
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),

  // Campos para personalização do item
  hasItemCustomization: boolean("has_item_customization").default(false),
  selectedCustomizationId: varchar("selected_customization_id").references(() => customizationOptions.id),
  itemCustomizationValue: decimal("item_customization_value", { precision: 10, scale: 2 }).default('0.00'),
  itemCustomizationDescription: text("item_customization_description"),
  additionalCustomizationNotes: text("additional_customization_notes"),
  customizationPhoto: text("customization_photo"),

  // Campos para personalização geral
  hasGeneralCustomization: boolean("has_general_customization").default(false),
  generalCustomizationName: text("general_customization_name"), // Nome da personalização
  generalCustomizationValue: decimal("general_customization_value", { precision: 10, scale: 2 }).default('0.00'), // Valor por unidade

  // Campos para desconto do item
  hasItemDiscount: boolean("has_item_discount").default(false),
  itemDiscountType: text("item_discount_type").default('percentage'), // 'percentage' or 'value'
  itemDiscountPercentage: decimal("item_discount_percentage", { precision: 5, scale: 2 }).default('0.00'),
  itemDiscountValue: decimal("item_discount_value", { precision: 10, scale: 2 }).default('0.00'),

  // Campos para tamanho do produto (em cm)
  productWidth: decimal("product_width", { precision: 8, scale: 2 }), // Largura em cm
  productHeight: decimal("product_height", { precision: 8, scale: 2 }), // Altura em cm
  productDepth: decimal("product_depth", { precision: 8, scale: 2 }), // Profundidade em cm
});

// Nova tabela para armazenar fotos dos orçamentos
export const budgetPhotos = pgTable("budget_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id").references(() => budgets.id).notNull(),
  photoUrl: text("photo_url").notNull(),
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'pix', 'credit_card', 'boleto', 'transfer'
  maxInstallments: integer("max_installments").default(1),
  installmentInterest: decimal("installment_interest", { precision: 5, scale: 2 }).default('0.00'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shippingMethods = pgTable("shipping_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'fixed', 'calculated', 'free'
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).default('0.00'),
  freeShippingThreshold: decimal("free_shipping_threshold", { precision: 10, scale: 2 }).default('0.00'),
  estimatedDays: integer("estimated_days").default(5),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const budgetPaymentInfo = pgTable("budget_payment_info", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id").references(() => budgets.id).notNull(),
  paymentMethodId: varchar("payment_method_id").references(() => paymentMethods.id),
  shippingMethodId: varchar("shipping_method_id").references(() => shippingMethods.id),
  installments: integer("installments").default(1),
  downPayment: decimal("down_payment", { precision: 10, scale: 2 }).default('0.00'),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).default('0.00'),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default('0.00'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Financial module tables
export const accountsReceivable = pgTable("accounts_receivable", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),
  dueDate: timestamp("due_date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  receivedAmount: decimal("received_amount", { precision: 10, scale: 2 }).default('0.00'),
  minimumPayment: decimal("minimum_payment", { precision: 10, scale: 2 }).default('0.00'), // Entrada + frete mínimo obrigatório
  status: text("status").notNull().default('open'), // 'pending', 'open', 'partial', 'paid', 'overdue', 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentAllocations = pgTable("payment_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").references(() => payments.id).notNull(),
  receivableId: varchar("receivable_id").references(() => accountsReceivable.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  allocatedAt: timestamp("allocated_at").defaultNow(),
});

export const bankImports = pgTable("bank_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  status: text("status").notNull().default('parsed'), // 'parsed', 'reconciled', 'error'
  summary: text("summary"), // JSON string with import summary
  errorMessage: text("error_message"),
  fileSize: integer("file_size"),
  transactionCount: integer("transaction_count").default(0),
});

export const bankTransactions = pgTable("bank_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  importId: varchar("import_id").references(() => bankImports.id).notNull(),
  fitId: text("fit_id"), // Financial Institution Transaction ID
  date: timestamp("date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default('debit'), // 'credit', 'debit'
  bankRef: text("bank_ref"), // Reference from bank
  status: text("status").notNull().default('unmatched'), // 'unmatched', 'matched'
  matchedReceivableId: varchar("matched_receivable_id").references(() => accountsReceivable.id),
  matchedPaymentId: varchar("matched_payment_id").references(() => payments.id),
  matchedOrderId: text("matched_order_id"), // For producer payments reconciliation
  matchedAt: timestamp("matched_at"), // When the transaction was matched
  notes: text("notes"), // Additional notes about the transaction
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Enhanced reconciliation fields
  sourceAccountId: varchar("source_account_id"), // Account/bank identifier for grouping
  rawFitId: text("raw_fit_id"), // Original FITID from OFX for deduplication
  matchedEntityType: text("matched_entity_type"), // 'payment', 'producer_payment', 'receivable', null
  matchedEntityId: varchar("matched_entity_id"), // Generic FK to matched entity
  memo: text("memo"), // Additional memo field from OFX
  hasValidDate: boolean("has_valid_date").default(true), // Whether the transaction date is valid
});

export const expenseNotes = pgTable("expense_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  category: text("category").notNull(), // 'operational', 'marketing', 'travel', 'equipment', 'other'
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  vendorId: varchar("vendor_id").references(() => users.id), // Optional - expense related to vendor
  orderId: varchar("order_id").references(() => orders.id), // Optional - expense related to order
  attachmentUrl: text("attachment_url"), // Receipt/invoice attachment
  status: text("status").notNull().default('recorded'), // 'recorded', 'approved', 'reimbursed'
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  reimbursedBy: varchar("reimbursed_by").references(() => users.id),
  reimbursedAt: timestamp("reimbursed_at"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commissionPayouts = pgTable("commission_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'vendor', 'partner'
  userId: varchar("user_id").references(() => users.id).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'paid'
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customizationOptions = pgTable("customization_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Ex: "Serigrafia 1 cor"
  description: text("description"), // Descrição adicional
  category: text("category").notNull(), // Categoria do produto compatível
  minQuantity: integer("min_quantity").notNull(), // Quantidade mínima
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Valor da personalização
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const producerPayments = pgTable("producer_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productionOrderId: varchar("production_order_id").references(() => productionOrders.id).notNull(),
  producerId: varchar("producer_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'approved', 'paid', 'rejected'
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidBy: varchar("paid_by").references(() => users.id),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"), // 'pix', 'transfer', 'check', 'cash', 'manual'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Reconciliation fields
  reconciliationStatus: text("reconciliation_status").notNull().default('pending'), // 'pending', 'manual', 'ofx'
  bankTransactionId: varchar("bank_transaction_id"), // FK to bankTransactions when reconciled via OFX
});

export const quoteRequests = pgTable("quote_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => users.id).notNull(),
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),
  contactName: text("contact_name").notNull(),
  whatsapp: text("whatsapp"),
  email: text("email"),
  observations: text("observations"), // Observações gerais do orçamento
  totalEstimatedValue: decimal("total_estimated_value", { precision: 10, scale: 2 }).default('0.00'),
  status: text("status").notNull().default('pending'), // 'pending', 'reviewing', 'quoted', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quoteRequestItems = pgTable("quote_request_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteRequestId: varchar("quote_request_id").references(() => quoteRequests.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  category: text("category"),
  imageLink: text("image_link"),
  observations: text("observations"), // Observações específicas do produto
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Nullable para permitir logs de sistema
  userName: text("user_name").notNull(), // Nome do usuário para facilitar consultas
  userRole: text("user_role").notNull(), // Role do usuário
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  entity: text("entity"), // orders, users, products, etc.
  entityId: varchar("entity_id"), // ID da entidade afetada
  description: text("description").notNull(), // Descrição da ação
  details: text("details"), // Detalhes adicionais em JSON
  level: text("level").notNull().default('info'), // info, warning, error, success
  ipAddress: text("ip_address"), // IP do usuário
  userAgent: text("user_agent"), // User Agent do navegador
  createdAt: timestamp("created_at").defaultNow(),
});

export const logBackups = pgTable("log_backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  backupDate: timestamp("backup_date").notNull(),
  logCount: integer("log_count").notNull(),
  excelData: text("excel_data").notNull(), // JSON string with Excel data
  status: text("status").notNull().default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id).default('system'),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductionOrderSchema = createInsertSchema(productionOrders).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertCommissionSchema = createInsertSchema(commissions).omit({ id: true, createdAt: true });
export const insertPartnerSchema = createInsertSchema(partners).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommissionSettingsSchema = createInsertSchema(commissionSettings).omit({ id: true, updatedAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetSchema = createInsertSchema(budgets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({ id: true });
export const insertBudgetPhotoSchema = createInsertSchema(budgetPhotos).omit({ id: true, uploadedAt: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShippingMethodSchema = createInsertSchema(shippingMethods).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetPaymentInfoSchema = createInsertSchema(budgetPaymentInfo).omit({ id: true, createdAt: true });

// Financial module insert schemas
export const insertAccountsReceivableSchema = createInsertSchema(accountsReceivable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentAllocationSchema = createInsertSchema(paymentAllocations).omit({ id: true, allocatedAt: true });
export const insertBankImportSchema = createInsertSchema(bankImports).omit({ id: true, uploadedAt: true });
export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({ id: true, createdAt: true });
export const insertExpenseNoteSchema = createInsertSchema(expenseNotes).omit({ id: true, createdAt: true });
export const insertCommissionPayoutSchema = createInsertSchema(commissionPayouts).omit({ id: true, createdAt: true });
export const insertCustomizationOptionSchema = createInsertSchema(customizationOptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProducerPaymentSchema = createInsertSchema(producerPayments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuoteRequestItemSchema = createInsertSchema(quoteRequestItems).omit({ id: true, createdAt: true });
export const insertBranchSchema = createInsertSchema(branches).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({ id: true, createdAt: true });
export const insertLogBackupSchema = createInsertSchema(logBackups).omit({ id: true, createdAt: true });

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
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type CommissionSettings = typeof commissionSettings.$inferSelect;
export type InsertCommissionSettings = z.infer<typeof insertCommissionSettingsSchema>;
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
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type ShippingMethod = typeof shippingMethods.$inferSelect;
export type InsertShippingMethod = z.infer<typeof insertShippingMethodSchema>;
export type BudgetPaymentInfo = typeof budgetPaymentInfo.$inferSelect;
export type InsertBudgetPaymentInfo = z.infer<typeof insertBudgetPaymentInfoSchema>;

// Financial module types
export type AccountsReceivable = typeof accountsReceivable.$inferSelect;
export type InsertAccountsReceivable = z.infer<typeof insertAccountsReceivableSchema>;
export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type InsertPaymentAllocation = z.infer<typeof insertPaymentAllocationSchema>;
export type BankImport = typeof bankImports.$inferSelect;
export type InsertBankImport = z.infer<typeof insertBankImportSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type ExpenseNote = typeof expenseNotes.$inferSelect;
export type InsertExpenseNote = z.infer<typeof insertExpenseNoteSchema>;
export type CommissionPayout = typeof commissionPayouts.$inferSelect;
export type InsertCommissionPayout = z.infer<typeof insertCommissionPayoutSchema>;
export type CustomizationOption = typeof customizationOptions.$inferSelect;
export type InsertCustomizationOption = z.infer<typeof insertCustomizationOptionSchema>;
export type ProducerPayment = typeof producerPayments.$inferSelect;
export type InsertProducerPayment = z.infer<typeof insertProducerPaymentSchema>;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;
export type QuoteRequestItem = typeof quoteRequestItems.$inferSelect;
export type InsertQuoteRequestItem = z.infer<typeof insertQuoteRequestItemSchema>;
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type LogBackup = typeof logBackups.$inferSelect;
export type InsertLogBackup = z.infer<typeof insertLogBackupSchema>;