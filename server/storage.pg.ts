import { eq, desc, and, or, like, sql, isNull, not, gte, lte, inArray } from "drizzle-orm";
import { pg } from "./pgClient";
import * as schema from "../shared/schema";
import type {
  User,
  InsertUser,
  Client,
  InsertClient,
  Order,
  InsertOrder,
  ProductionOrder,
  InsertProductionOrder,
  Payment,
  InsertPayment,
  Commission,
  InsertCommission,
  Partner,
  InsertPartner,
  CommissionSettings,
  InsertCommissionSettings,
  Vendor,
  InsertVendor,
  Product,
  InsertProduct,
  Budget,
  InsertBudget,
  BudgetItem,
  InsertBudgetItem,
  BudgetPhoto,
  InsertBudgetPhoto,
  PaymentMethod,
  InsertPaymentMethod,
  ShippingMethod,
  InsertShippingMethod,
  BudgetPaymentInfo,
  InsertBudgetPaymentInfo,
  AccountsReceivable,
  InsertAccountsReceivable,
  PaymentAllocation,
  InsertPaymentAllocation,
  BankImport,
  InsertBankImport,
  BankTransaction,
  InsertBankTransaction,
  ExpenseNote,
  InsertExpenseNote,
  CommissionPayout,
  InsertCommissionPayout,
  CustomizationOption,
  InsertCustomizationOption,
  ProducerPayment,
  InsertProducerPayment,
  Branch,
  InsertBranch,
  SystemLog,
  InsertSystemLog,
  QuoteRequest,
  InsertQuoteRequest,
} from "../shared/schema";
import { addMoney, subtractMoney, percentageOf, compareMoney, toMoneyString, sumMoney } from "./money";
import type { IStorage } from "./storage";

/**
 * PostgreSQL Storage Adapter
 * Implements IStorage interface using Drizzle ORM + Neon PostgreSQL
 */
export class PgStorage implements IStorage {
  
  // ==================== USERS ====================
  
  async getUsers(): Promise<User[]> {
    return await pg.select().from(schema.users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const results = await pg.select().from(schema.users).where(eq(schema.users.id, id));
    return results[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await pg.select().from(schema.users).where(eq(schema.users.username, username));
    return results[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await pg.select().from(schema.users).where(eq(schema.users.email, email));
    return results[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const results = await pg.insert(schema.users).values(insertUser).returning();
    return results[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const results = await pg.update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, id))
      .returning();
    return results[0];
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await pg.select().from(schema.users).where(eq(schema.users.role, role));
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  // ==================== VENDORS ====================
  
  async getVendors(): Promise<User[]> {
    return await pg.select().from(schema.users).where(eq(schema.users.role, 'vendor'));
  }

  async getVendor(userId: string): Promise<Vendor | undefined> {
    const results = await pg.select().from(schema.vendors).where(eq(schema.vendors.userId, userId));
    return results[0];
  }

  async createVendor(vendorData: any): Promise<User> {
    // Create user first
    const newUser = await this.createUser({
      username: vendorData.username,
      password: vendorData.password || "123456",
      role: 'vendor',
      name: vendorData.name,
      email: vendorData.email || null,
      phone: vendorData.phone || null,
      address: vendorData.address || null,
      specialty: vendorData.specialty || null,
      vendorId: null,
      isActive: true
    });

    // Create vendor profile
    await pg.insert(schema.vendors).values({
      userId: newUser.id,
      salesLink: vendorData.salesLink || null,
      commissionRate: vendorData.commissionRate || "10.00",
      isActive: true
    });

    return newUser;
  }

  async updateVendorCommission(userId: string, commissionRate: string): Promise<void> {
    await pg.update(schema.vendors)
      .set({ commissionRate })
      .where(eq(schema.vendors.userId, userId));
  }

  // ==================== CLIENTS ====================
  
  async getClients(): Promise<Client[]> {
    return await pg.select().from(schema.clients).orderBy(desc(schema.clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const results = await pg.select().from(schema.clients).where(eq(schema.clients.id, id));
    return results[0];
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const results = await pg.insert(schema.clients).values(clientData).returning();
    return results[0];
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const results = await pg.update(schema.clients)
      .set({ ...clientData, updatedAt: new Date() })
      .where(eq(schema.clients.id, id))
      .returning();
    return results[0];
  }

  async deleteClient(id: string): Promise<boolean> {
    await pg.delete(schema.clients).where(eq(schema.clients.id, id));
    return true;
  }

  async getClientByUserId(userId: string): Promise<Client | undefined> {
    const results = await pg.select().from(schema.clients).where(eq(schema.clients.userId, userId));
    return results[0];
  }

  async getClientsByVendor(vendorId: string): Promise<Client[]> {
    return await pg.select().from(schema.clients).where(eq(schema.clients.vendorId, vendorId));
  }

  // ==================== ORDERS ====================
  
  async getOrders(): Promise<Order[]> {
    const orders = await pg.select().from(schema.orders).orderBy(desc(schema.orders.createdAt));
    
    // Enrich with budget items if budgetId exists
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      if (order.budgetId) {
        const items = await this.getBudgetItems(order.budgetId);
        return { ...order, items } as any;
      }
      return { ...order, items: [] } as any;
    }));

    return enrichedOrders;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const results = await pg.select().from(schema.orders).where(eq(schema.orders.id, id));
    const order = results[0];
    
    if (!order) return undefined;

    // Enrich with budget items
    if (order.budgetId) {
      const items = await this.getBudgetItems(order.budgetId);
      return { ...order, items } as any;
    }
    
    return { ...order, items: [] } as any;
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    // Generate unique order number using database sequence
    async function getNextOrderNumber(): Promise<string> {
      try {
        // Try to get next value from sequence
        const res: any = await pg.execute(sql`SELECT nextval('order_number_seq') AS next`);
        const next = (Array.isArray(res) ? res[0]?.next : (res.rows?.[0]?.next)) ?? 1;

        // Format: PED-YYMM-000001
        const now = new Date();
        const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
        return `PED-${yymm}-${String(next).padStart(6, '0')}`;
      } catch (e) {
        // If sequence doesn't exist, create it and try again
        await pg.execute(sql`CREATE SEQUENCE IF NOT EXISTS order_number_seq`);
        const res: any = await pg.execute(sql`SELECT nextval('order_number_seq') AS next`);
        const next = (Array.isArray(res) ? res[0]?.next : (res.rows?.[0]?.next)) ?? 1;
        const now = new Date();
        const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
        return `PED-${yymm}-${String(next).padStart(6, '0')}`;
      }
    }

    // Process order data and generate order number if not provided
    const processedData: any = { ...orderData };
    if (!processedData.orderNumber || processedData.orderNumber === null) {
      processedData.orderNumber = await getNextOrderNumber();
    }

    const results = await pg.insert(schema.orders).values({
      ...processedData,
      paidValue: processedData.paidValue || "0.00",
      refundAmount: processedData.refundAmount || "0.00",
      status: processedData.status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    const order = results[0];

    // Create accounts receivable for this order
    await this.createAccountsReceivableForOrder(order);

    // Create commissions
    await this.calculateCommissions(order);

    return order;
  }

  private async createAccountsReceivableForOrder(order: Order): Promise<void> {
    const paidValue = order.paidValue || "0.00";
    const downPayment = order.downPayment || "0.00";
    const shippingCost = order.shippingCost || "0.00";

    const minimumPaymentValue = compareMoney(downPayment, "0") > 0 
      ? addMoney(downPayment, shippingCost) 
      : "0.00";

    let status: 'pending' | 'open' | 'partial' | 'paid' | 'overdue' = 'pending';
    if (compareMoney(paidValue, order.totalValue) >= 0) {
      status = 'paid';
    } else if (compareMoney(paidValue, "0") > 0) {
      status = 'partial';
    }

    // Ensure deadline is a Date object
    let dueDate = new Date();
    if (order.deadline) {
      dueDate = typeof order.deadline === 'string' ? new Date(order.deadline) : order.deadline;
    }

    await pg.insert(schema.accountsReceivable).values({
      orderId: order.id,
      clientId: order.clientId!,
      vendorId: order.vendorId,
      dueDate: dueDate,
      amount: order.totalValue,
      receivedAmount: paidValue,
      minimumPayment: minimumPaymentValue,
      status: status,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private async calculateCommissions(order: Order): Promise<void> {
    // Get vendor commission settings
    const vendor = await this.getVendor(order.vendorId);
    const commissionSettings = await this.getCommissionSettings();

    const vendorRate = vendor?.commissionRate || commissionSettings?.vendorCommissionRate || '10.00';
    const vendorCommissionAmount = percentageOf(order.totalValue, vendorRate);

    // Create vendor commission
    await pg.insert(schema.commissions).values({
      vendorId: order.vendorId,
      partnerId: null,
      orderId: order.id,
      percentage: vendorRate,
      amount: vendorCommissionAmount,
      status: 'pending',
      type: 'vendor',
      orderValue: order.totalValue,
      orderNumber: order.orderNumber,
      createdAt: new Date()
    });
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const results = await pg.update(schema.orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.orders.id, id))
      .returning();
    return results[0];
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    return await this.updateOrder(id, { status });
  }

  async getOrdersByVendor(vendorId: string): Promise<Order[]> {
    return await pg.select().from(schema.orders)
      .where(eq(schema.orders.vendorId, vendorId))
      .orderBy(desc(schema.orders.createdAt));
  }

  async getOrdersByClient(clientId: string): Promise<Order[]> {
    return await pg.select().from(schema.orders)
      .where(eq(schema.orders.clientId, clientId))
      .orderBy(desc(schema.orders.createdAt));
  }

  // ==================== PRODUCTION ORDERS ====================
  
  async getProductionOrders(): Promise<ProductionOrder[]> {
    return await pg.select().from(schema.productionOrders).orderBy(desc(schema.productionOrders.id));
  }

  async getProductionOrdersByProducer(producerId: string): Promise<ProductionOrder[]> {
    return await pg.select().from(schema.productionOrders)
      .where(eq(schema.productionOrders.producerId, producerId));
  }

  async getProductionOrder(id: string): Promise<ProductionOrder | undefined> {
    const results = await pg.select().from(schema.productionOrders).where(eq(schema.productionOrders.id, id));
    return results[0];
  }

  async getProductionOrdersByOrder(orderId: string): Promise<ProductionOrder[]> {
    return await pg.select().from(schema.productionOrders)
      .where(eq(schema.productionOrders.orderId, orderId));
  }

  async createProductionOrder(productionOrder: InsertProductionOrder): Promise<ProductionOrder> {
    const results = await pg.insert(schema.productionOrders).values(productionOrder).returning();
    return results[0];
  }

  async updateProductionOrderStatus(
    id: string,
    status: string,
    notes?: string,
    deliveryDate?: string,
    trackingCode?: string
  ): Promise<ProductionOrder | undefined> {
    const updates: any = { status };
    if (notes) updates.notes = notes;
    if (deliveryDate) updates.deliveryDeadline = new Date(deliveryDate);
    if (trackingCode) updates.trackingCode = trackingCode;

    const results = await pg.update(schema.productionOrders)
      .set(updates)
      .where(eq(schema.productionOrders.id, id))
      .returning();
    return results[0];
  }

  async updateProductionOrderValue(
    id: string,
    value: string,
    notes?: string,
    lockValue?: boolean
  ): Promise<ProductionOrder | undefined> {
    const updates: any = { producerValue: value };
    if (notes) updates.producerNotes = notes;
    if (lockValue !== undefined) updates.producerValueLocked = lockValue;

    const results = await pg.update(schema.productionOrders)
      .set(updates)
      .where(eq(schema.productionOrders.id, id))
      .returning();
    return results[0];
  }

  async updateProductionOrder(id: string, updates: Partial<ProductionOrder>): Promise<ProductionOrder | undefined> {
    const results = await pg.update(schema.productionOrders)
      .set(updates)
      .where(eq(schema.productionOrders.id, id))
      .returning();
    return results[0];
  }

  // ==================== PAYMENTS ====================
  
  async getPayments(): Promise<Payment[]> {
    return await pg.select({
      id: schema.payments.id,
      orderId: schema.payments.orderId,
      amount: schema.payments.amount,
      method: schema.payments.method,
      status: schema.payments.status,
      transactionId: schema.payments.transactionId,
      paidAt: schema.payments.paidAt,
      createdAt: schema.payments.createdAt,
      reconciliationStatus: schema.payments.reconciliationStatus,
      bankTransactionId: schema.payments.bankTransactionId
    }).from(schema.payments).orderBy(desc(schema.payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    // Defaults seguros: ao receber um pagamento, ele já está confirmado
    const payload = {
      ...payment,
      status: payment.status ?? 'confirmed',   // <- confirmado ao receber
      paidAt: payment.paidAt ?? new Date(),    // <- marca data de pagamento
      createdAt: new Date()
    };

    const results = await pg.insert(schema.payments).values(payload).returning();
    const newPayment = results[0];

    // Atualiza o valor pago do pedido
    await this.updateOrderPaidValue(newPayment.orderId);

    return newPayment;
  }

  async updateOrderPaidValue(orderId: string): Promise<void> {
    // Get all confirmed payments for this order
    const payments = await pg.select().from(schema.payments)
      .where(and(
        eq(schema.payments.orderId, orderId),
        eq(schema.payments.status, 'confirmed')
      ));

    // Calculate total paid
    const totalPaid = payments.reduce((sum, payment) => {
      return sum + parseFloat(payment.amount);
    }, 0);

    // Update order with new paid value
    await pg.update(schema.orders)
      .set({ paidValue: totalPaid.toFixed(2) })
      .where(eq(schema.orders.id, orderId));

    // Update accounts receivable status
    const accountsReceivable = await pg.select().from(schema.accountsReceivable)
      .where(eq(schema.accountsReceivable.orderId, orderId));

    for (const ar of accountsReceivable) {
      const amount = parseFloat(ar.amount);
      let status: 'pending' | 'open' | 'partial' | 'paid' | 'overdue' = 'open';
      
      if (totalPaid >= amount) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      }

      await pg.update(schema.accountsReceivable)
        .set({ 
          receivedAmount: totalPaid.toFixed(2),
          status: status,
          updatedAt: new Date()
        })
        .where(eq(schema.accountsReceivable.id, ar.id));
    }
  }

  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    return await pg.select().from(schema.payments)
      .where(eq(schema.payments.orderId, orderId))
      .orderBy(desc(schema.payments.createdAt));
  }

  // ==================== COMMISSIONS ====================
  
  async getCommissionsByVendor(vendorId: string): Promise<Commission[]> {
    return await pg.select().from(schema.commissions)
      .where(eq(schema.commissions.vendorId, vendorId));
  }

  async getCommissionsByPartner(partnerId: string): Promise<Commission[]> {
    return await pg.select().from(schema.commissions)
      .where(eq(schema.commissions.partnerId, partnerId));
  }

  async getAllCommissions(): Promise<Commission[]> {
    return await pg.select().from(schema.commissions).orderBy(desc(schema.commissions.createdAt));
  }

  async createCommission(commission: InsertCommission): Promise<Commission> {
    const results = await pg.insert(schema.commissions).values({
      ...commission,
      createdAt: new Date()
    }).returning();
    return results[0];
  }

  async updateCommissionStatus(id: string, status: string): Promise<Commission | undefined> {
    const updates: any = { status };
    if (status === 'paid') {
      updates.paidAt = new Date();
    }

    const results = await pg.update(schema.commissions)
      .set(updates)
      .where(eq(schema.commissions.id, id))
      .returning();
    return results[0];
  }

  async deductPartnerCommission(partnerId: string, amount: string): Promise<void> {
    // Implementation for partner commission deduction
    // This would update commission records for the partner
  }

  async updateCommissionsByOrderStatus(orderId: string, orderStatus: string): Promise<void> {
    // Update commissions based on order status changes
  }

  // ==================== PARTNERS ====================
  
  async getPartners(): Promise<User[]> {
    const partners = await pg.select().from(schema.partners);
    const userIds = partners.map(p => p.userId);
    
    if (userIds.length === 0) return [];
    
    return await pg.select().from(schema.users).where(inArray(schema.users.id, userIds));
  }

  async getPartner(userId: string): Promise<Partner | undefined> {
    const results = await pg.select().from(schema.partners).where(eq(schema.partners.userId, userId));
    return results[0];
  }

  async createPartner(partnerData: any): Promise<User> {
    // Create user first
    const newUser = await this.createUser({
      username: partnerData.username,
      password: partnerData.password || "123456",
      role: 'partner',
      name: partnerData.name,
      email: partnerData.email || null,
      phone: partnerData.phone || null,
      vendorId: null,
      isActive: true
    });

    // Create partner profile
    await pg.insert(schema.partners).values({
      userId: newUser.id,
      commissionRate: partnerData.commissionRate || "15.00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return newUser;
  }

  async updatePartnerCommission(userId: string, commissionRate: string): Promise<void> {
    await pg.update(schema.partners)
      .set({ commissionRate, updatedAt: new Date() })
      .where(eq(schema.partners.userId, userId));
  }

  // ==================== COMMISSION SETTINGS ====================
  
  async getCommissionSettings(): Promise<CommissionSettings | undefined> {
    const results = await pg.select().from(schema.commissionSettings)
      .where(eq(schema.commissionSettings.isActive, true))
      .limit(1);
    return results[0];
  }

  async updateCommissionSettings(settings: Partial<InsertCommissionSettings>): Promise<CommissionSettings> {
    // First try to update existing
    const existing = await this.getCommissionSettings();
    
    if (existing) {
      const results = await pg.update(schema.commissionSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(schema.commissionSettings.id, existing.id))
        .returning();
      return results[0];
    }

    // Create new if doesn't exist
    const results = await pg.insert(schema.commissionSettings).values({
      ...settings,
      updatedAt: new Date()
    } as InsertCommissionSettings).returning();
    return results[0];
  }

  // ==================== PRODUCTS ====================
  
  async getProducts(options?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    producer?: string;
  }): Promise<{ products: Product[]; total: number; page: number; totalPages: number; }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(schema.products.isActive, true)];

    if (options?.search) {
      conditions.push(
        or(
          like(schema.products.name, `%${options.search}%`),
          like(schema.products.description, `%${options.search}%`)
        ) as any
      );
    }

    if (options?.category) {
      conditions.push(eq(schema.products.category, options.category));
    }

    if (options?.producer) {
      conditions.push(eq(schema.products.producerId, options.producer));
    }

    const products = await pg.select().from(schema.products)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);
      
    const totalResults = await pg.select({ count: sql<number>`count(*)` }).from(schema.products);
    const total = Number(totalResults[0].count);
    const totalPages = Math.ceil(total / limit);

    return { products, total, page, totalPages };
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const results = await pg.select().from(schema.products).where(eq(schema.products.id, id));
    return results[0];
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const results = await pg.insert(schema.products).values({
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return results[0];
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const results = await pg.update(schema.products)
      .set({ ...productData, updatedAt: new Date() })
      .where(eq(schema.products.id, id))
      .returning();
    return results[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    await pg.update(schema.products)
      .set({ isActive: false })
      .where(eq(schema.products.id, id));
    return true;
  }

  async importProducts(productsData: any[]): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    // Clean numeric fields helper
    const cleanNumericField = (value: any) => {
      if (value === "" || value === undefined || value === null) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num.toString();
    };

    for (const productData of productsData) {
      try {
        // Clean the product data before creating
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
      } catch (error: any) {
        errors.push(`Error importing ${productData.name}: ${error.message}`);
      }
    }

    return { imported, errors };
  }

  async importProductsForProducer(productsData: any[], producerId: string): Promise<{ imported: number; errors: string[] }> {
    const productsWithProducer = productsData.map(p => ({ ...p, producerId, type: 'external' }));
    return await this.importProducts(productsWithProducer);
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await pg.select().from(schema.products)
      .where(
        or(
          like(schema.products.name, `%${query}%`),
          like(schema.products.description, `%${query}%`)
        ) as any
      )
      .limit(20);
  }

  async getProductsByProducer(producerId: string): Promise<Product[]> {
    return await pg.select().from(schema.products)
      .where(eq(schema.products.producerId, producerId));
  }

  async getProductsGroupedByProducer(): Promise<{ [key: string]: Product[] }> {
    const products = await pg.select().from(schema.products)
      .where(eq(schema.products.isActive, true));
    
    const grouped: { [key: string]: Product[] } = {};
    for (const product of products) {
      const producerId = product.producerId || 'internal';
      if (!grouped[producerId]) {
        grouped[producerId] = [];
      }
      grouped[producerId].push(product);
    }

    return grouped;
  }

  // ==================== BUDGETS ====================
  
  async getBudgets(): Promise<Budget[]> {
    return await pg.select().from(schema.budgets).orderBy(desc(schema.budgets.createdAt));
  }

  async getBudget(id: string): Promise<Budget | undefined> {
    const results = await pg.select().from(schema.budgets).where(eq(schema.budgets.id, id));
    return results[0];
  }

  async getBudgetsByVendor(vendorId: string): Promise<Budget[]> {
    return await pg.select().from(schema.budgets)
      .where(eq(schema.budgets.vendorId, vendorId))
      .orderBy(desc(schema.budgets.createdAt));
  }

  async getBudgetsByClient(clientId: string): Promise<Budget[]> {
    return await pg.select().from(schema.budgets)
      .where(eq(schema.budgets.clientId, clientId))
      .orderBy(desc(schema.budgets.createdAt));
  }

  async createBudget(budgetData: InsertBudget): Promise<Budget> {
    // Convert string dates to Date objects if they exist
    const processedData: any = { ...budgetData };
    
    if (processedData.validUntil && typeof processedData.validUntil === 'string') {
      processedData.validUntil = new Date(processedData.validUntil);
    }
    
    if (processedData.deliveryDeadline && typeof processedData.deliveryDeadline === 'string') {
      processedData.deliveryDeadline = new Date(processedData.deliveryDeadline);
    }

    // Generate unique budget number using database sequence
    async function getNextBudgetNumber(): Promise<string> {
      try {
        // Try to get next value from sequence
        const res: any = await pg.execute(sql`SELECT nextval('budget_number_seq') AS next`);
        const next = (Array.isArray(res) ? res[0]?.next : (res.rows?.[0]?.next)) ?? 1;

        // Format: BUD-YYMM-000001
        const now = new Date();
        const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
        return `BUD-${yymm}-${String(next).padStart(6, '0')}`;
      } catch (e) {
        // If sequence doesn't exist, create it and try again
        await pg.execute(sql`CREATE SEQUENCE IF NOT EXISTS budget_number_seq`);
        const res: any = await pg.execute(sql`SELECT nextval('budget_number_seq') AS next`);
        const next = (Array.isArray(res) ? res[0]?.next : (res.rows?.[0]?.next)) ?? 1;
        const now = new Date();
        const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
        return `BUD-${yymm}-${String(next).padStart(6, '0')}`;
      }
    }

    // Generate budget number if not provided or is null
    if (!processedData.budgetNumber || processedData.budgetNumber === null) {
      processedData.budgetNumber = await getNextBudgetNumber();
    }

    const results = await pg.insert(schema.budgets).values({
      ...processedData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return results[0];
  }

  async updateBudget(id: string, budgetData: Partial<InsertBudget>): Promise<Budget | undefined> {
    // Convert string dates to Date objects if they exist
    const processedData = { ...budgetData };
    
    if (processedData.validUntil && typeof processedData.validUntil === 'string') {
      processedData.validUntil = new Date(processedData.validUntil);
    }
    
    if (processedData.deliveryDeadline && typeof processedData.deliveryDeadline === 'string') {
      processedData.deliveryDeadline = new Date(processedData.deliveryDeadline);
    }

    const results = await pg.update(schema.budgets)
      .set({ ...processedData, updatedAt: new Date() })
      .where(eq(schema.budgets.id, id))
      .returning();
    return results[0];
  }

  async deleteBudget(id: string): Promise<boolean> {
    // Delete budget items first
    await pg.delete(schema.budgetItems).where(eq(schema.budgetItems.budgetId, id));
    // Delete budget photos
    await pg.delete(schema.budgetPhotos).where(eq(schema.budgetPhotos.budgetId, id));
    // Delete budget
    await pg.delete(schema.budgets).where(eq(schema.budgets.id, id));
    return true;
  }

  async convertBudgetToOrder(budgetId: string, producerId?: string): Promise<Order> {
    const budget = await this.getBudget(budgetId);
    if (!budget) throw new Error('Budget not found');

    // Create order from budget
    const orderData: InsertOrder = {
      orderNumber: `PED-${Date.now()}`,
      clientId: budget.clientId!,
      vendorId: budget.vendorId,
      branchId: budget.branchId,
      budgetId: budget.id,
      product: budget.title,
      description: budget.description,
      totalValue: budget.totalValue,
      paidValue: "0.00",
      status: 'pending',
      contactName: budget.contactName,
      contactPhone: budget.contactPhone,
      contactEmail: budget.contactEmail,
      deliveryType: budget.deliveryType
    } as InsertOrder;

    const order = await this.createOrder(orderData);

    // Update budget status
    await this.updateBudget(budgetId, { status: 'converted' });

    return order;
  }

  // ==================== BUDGET ITEMS ====================
  
  async getBudgetItems(budgetId: string): Promise<BudgetItem[]> {
    return await pg.select().from(schema.budgetItems)
      .where(eq(schema.budgetItems.budgetId, budgetId));
  }

  async createBudgetItem(budgetId: string, itemData: InsertBudgetItem): Promise<BudgetItem> {
    const results = await pg.insert(schema.budgetItems).values({
      ...itemData,
      budgetId
    }).returning();
    return results[0];
  }

  async updateBudgetItem(itemId: string, itemData: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined> {
    const results = await pg.update(schema.budgetItems)
      .set(itemData)
      .where(eq(schema.budgetItems.id, itemId))
      .returning();
    return results[0];
  }

  async deleteBudgetItem(itemId: string): Promise<boolean> {
    await pg.delete(schema.budgetItems).where(eq(schema.budgetItems.id, itemId));
    return true;
  }

  async deleteBudgetItems(budgetId: string): Promise<boolean> {
    await pg.delete(schema.budgetItems).where(eq(schema.budgetItems.budgetId, budgetId));
    return true;
  }

  // ==================== BUDGET PHOTOS ====================
  
  async getBudgetPhotos(budgetId: string): Promise<BudgetPhoto[]> {
    return await pg.select().from(schema.budgetPhotos)
      .where(eq(schema.budgetPhotos.budgetId, budgetId));
  }

  async createBudgetPhoto(budgetId: string, photoData: InsertBudgetPhoto): Promise<BudgetPhoto> {
    const results = await pg.insert(schema.budgetPhotos).values({
      ...photoData,
      budgetId,
      uploadedAt: new Date()
    }).returning();
    return results[0];
  }

  async deleteBudgetPhoto(photoId: string): Promise<boolean> {
    await pg.delete(schema.budgetPhotos).where(eq(schema.budgetPhotos.id, photoId));
    return true;
  }

  // ==================== PAYMENT METHODS ====================
  
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return await pg.select().from(schema.paymentMethods)
      .where(eq(schema.paymentMethods.isActive, true));
  }

  async getAllPaymentMethods(): Promise<PaymentMethod[]> {
    return await pg.select().from(schema.paymentMethods);
  }

  async createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
    const results = await pg.insert(schema.paymentMethods).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return results[0];
  }

  async updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | null> {
    const results = await pg.update(schema.paymentMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.paymentMethods.id, id))
      .returning();
    return results[0] || null;
  }

  async deletePaymentMethod(id: string): Promise<boolean> {
    await pg.update(schema.paymentMethods)
      .set({ isActive: false })
      .where(eq(schema.paymentMethods.id, id));
    return true;
  }

  // ==================== SHIPPING METHODS ====================
  
  async getShippingMethods(): Promise<ShippingMethod[]> {
    return await pg.select().from(schema.shippingMethods)
      .where(eq(schema.shippingMethods.isActive, true));
  }

  async getAllShippingMethods(): Promise<ShippingMethod[]> {
    return await pg.select().from(schema.shippingMethods);
  }

  async createShippingMethod(data: InsertShippingMethod): Promise<ShippingMethod> {
    const results = await pg.insert(schema.shippingMethods).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return results[0];
  }

  async updateShippingMethod(id: string, data: Partial<InsertShippingMethod>): Promise<ShippingMethod | null> {
    const results = await pg.update(schema.shippingMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.shippingMethods.id, id))
      .returning();
    return results[0] || null;
  }

  async deleteShippingMethod(id: string): Promise<boolean> {
    await pg.update(schema.shippingMethods)
      .set({ isActive: false })
      .where(eq(schema.shippingMethods.id, id));
    return true;
  }

  // ==================== BUDGET PAYMENT INFO ====================
  
  async getBudgetPaymentInfo(budgetId: string): Promise<BudgetPaymentInfo | undefined> {
    const results = await pg.select().from(schema.budgetPaymentInfo)
      .where(eq(schema.budgetPaymentInfo.budgetId, budgetId));
    return results[0];
  }

  async createBudgetPaymentInfo(data: InsertBudgetPaymentInfo): Promise<BudgetPaymentInfo> {
    const results = await pg.insert(schema.budgetPaymentInfo).values({
      ...data,
      createdAt: new Date()
    }).returning();
    return results[0];
  }

  async updateBudgetPaymentInfo(budgetId: string, data: Partial<InsertBudgetPaymentInfo>): Promise<BudgetPaymentInfo> {
    const existing = await this.getBudgetPaymentInfo(budgetId);
    
    if (existing) {
      const results = await pg.update(schema.budgetPaymentInfo)
        .set(data)
        .where(eq(schema.budgetPaymentInfo.budgetId, budgetId))
        .returning();
      return results[0];
    }

    return await this.createBudgetPaymentInfo({ ...data, budgetId } as InsertBudgetPaymentInfo);
  }

  // ==================== ACCOUNTS RECEIVABLE ====================
  
  async getAccountsReceivable(): Promise<AccountsReceivable[]> {
    return await pg.select().from(schema.accountsReceivable)
      .orderBy(desc(schema.accountsReceivable.createdAt));
  }

  async getAccountsReceivableByOrder(orderId: string): Promise<AccountsReceivable[]> {
    return await pg.select().from(schema.accountsReceivable)
      .where(eq(schema.accountsReceivable.orderId, orderId));
  }

  async getAccountsReceivableByClient(clientId: string): Promise<AccountsReceivable[]> {
    return await pg.select().from(schema.accountsReceivable)
      .where(eq(schema.accountsReceivable.clientId, clientId));
  }

  async getAccountsReceivableByVendor(vendorId: string): Promise<AccountsReceivable[]> {
    return await pg.select().from(schema.accountsReceivable)
      .where(eq(schema.accountsReceivable.vendorId, vendorId));
  }

  async createAccountsReceivable(data: InsertAccountsReceivable): Promise<AccountsReceivable> {
    const results = await pg.insert(schema.accountsReceivable).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return results[0];
  }

  async updateAccountsReceivable(id: string, data: Partial<InsertAccountsReceivable>): Promise<AccountsReceivable | undefined> {
    const results = await pg.update(schema.accountsReceivable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.accountsReceivable.id, id))
      .returning();
    return results[0];
  }

  // ==================== PAYMENT ALLOCATIONS ====================
  
  async getPaymentAllocationsByPayment(paymentId: string): Promise<PaymentAllocation[]> {
    return await pg.select().from(schema.paymentAllocations)
      .where(eq(schema.paymentAllocations.paymentId, paymentId));
  }

  async getPaymentAllocationsByReceivable(receivableId: string): Promise<PaymentAllocation[]> {
    return await pg.select().from(schema.paymentAllocations)
      .where(eq(schema.paymentAllocations.receivableId, receivableId));
  }

  async createPaymentAllocation(data: InsertPaymentAllocation): Promise<PaymentAllocation> {
    const results = await pg.insert(schema.paymentAllocations).values({
      ...data,
      allocatedAt: new Date()
    }).returning();
    return results[0];
  }

  async allocatePaymentToReceivable(paymentId: string, receivableId: string, amount: string): Promise<PaymentAllocation> {
    return await this.createPaymentAllocation({ paymentId, receivableId, amount });
  }

  // ==================== BANK IMPORTS & TRANSACTIONS ====================
  
  async getBankImports(): Promise<BankImport[]> {
    return await pg.select().from(schema.bankImports)
      .orderBy(desc(schema.bankImports.uploadedAt));
  }

  async getBankImport(id: string): Promise<BankImport | undefined> {
    const results = await pg.select().from(schema.bankImports)
      .where(eq(schema.bankImports.id, id));
    return results[0];
  }

  async createBankImport(data: InsertBankImport): Promise<BankImport> {
    const results = await pg.insert(schema.bankImports).values({
      ...data,
      uploadedAt: new Date()
    }).returning();
    return results[0];
  }

  async updateBankImport(id: string, data: Partial<InsertBankImport>): Promise<BankImport | undefined> {
    const results = await pg.update(schema.bankImports)
      .set(data)
      .where(eq(schema.bankImports.id, id))
      .returning();
    return results[0];
  }

  async getBankTransactionsByImport(importId: string): Promise<BankTransaction[]> {
    return await pg.select().from(schema.bankTransactions)
      .where(eq(schema.bankTransactions.importId, importId));
  }

  async getBankTransactions(): Promise<BankTransaction[]> {
    return await pg.select().from(schema.bankTransactions)
      .orderBy(desc(schema.bankTransactions.date));
  }

  async getBankTransaction(id: string): Promise<BankTransaction | undefined> {
    const results = await pg.select().from(schema.bankTransactions)
      .where(eq(schema.bankTransactions.id, id));
    return results[0];
  }

  async getBankTransactionByFitId(fitId: string): Promise<BankTransaction | undefined> {
    const results = await pg.select().from(schema.bankTransactions)
      .where(eq(schema.bankTransactions.fitId, fitId));
    return results[0];
  }

  async createBankTransaction(data: InsertBankTransaction): Promise<BankTransaction> {
    const results = await pg.insert(schema.bankTransactions).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return results[0];
  }

  async updateBankTransaction(id: string, data: Partial<InsertBankTransaction>): Promise<BankTransaction | undefined> {
    const results = await pg.update(schema.bankTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.bankTransactions.id, id))
      .returning();
    return results[0];
  }

  async matchTransactionToReceivable(transactionId: string, receivableId: string): Promise<BankTransaction | undefined> {
    return await this.updateBankTransaction(transactionId, {
      matchedReceivableId: receivableId,
      status: 'matched',
      matchedAt: new Date()
    });
  }

  // ==================== EXPENSE NOTES ====================
  
  async getExpenseNotes(): Promise<ExpenseNote[]> {
    return await pg.select().from(schema.expenseNotes)
      .orderBy(desc(schema.expenseNotes.date));
  }

  async getExpenseNotesByVendor(vendorId: string): Promise<ExpenseNote[]> {
    return await pg.select().from(schema.expenseNotes)
      .where(eq(schema.expenseNotes.vendorId, vendorId));
  }

  async getExpenseNotesByOrder(orderId: string): Promise<ExpenseNote[]> {
    return await pg.select().from(schema.expenseNotes)
      .where(eq(schema.expenseNotes.orderId, orderId));
  }

  async createExpenseNote(data: InsertExpenseNote): Promise<ExpenseNote> {
    const results = await pg.insert(schema.expenseNotes).values({
      ...data,
      createdAt: new Date()
    }).returning();
    return results[0];
  }

  async updateExpenseNote(id: string, data: Partial<InsertExpenseNote>): Promise<ExpenseNote | undefined> {
    const results = await pg.update(schema.expenseNotes)
      .set(data)
      .where(eq(schema.expenseNotes.id, id))
      .returning();
    return results[0];
  }

  // ==================== COMMISSION PAYOUTS ====================
  
  async getCommissionPayouts(): Promise<CommissionPayout[]> {
    return await pg.select().from(schema.commissionPayouts)
      .orderBy(desc(schema.commissionPayouts.createdAt));
  }

  async getCommissionPayoutsByUser(userId: string, type: 'vendor' | 'partner'): Promise<CommissionPayout[]> {
    return await pg.select().from(schema.commissionPayouts)
      .where(and(
        eq(schema.commissionPayouts.userId, userId),
        eq(schema.commissionPayouts.type, type)
      ));
  }

  async createCommissionPayout(data: InsertCommissionPayout): Promise<CommissionPayout> {
    const results = await pg.insert(schema.commissionPayouts).values({
      ...data,
      createdAt: new Date()
    }).returning();
    return results[0];
  }

  async updateCommissionPayout(id: string, data: Partial<InsertCommissionPayout>): Promise<CommissionPayout | undefined> {
    const results = await pg.update(schema.commissionPayouts)
      .set(data)
      .where(eq(schema.commissionPayouts.id, id))
      .returning();
    return results[0];
  }

  // ==================== MANUAL RECEIVABLES/PAYABLES ====================
  
  async createManualReceivable(data: any): Promise<any> {
    // Implementation depends on schema - placeholder
    return data;
  }

  async getManualReceivables(): Promise<any[]> {
    return [];
  }

  async createManualPayable(data: any): Promise<any> {
    return data;
  }

  async getManualPayables(): Promise<any[]> {
    return [];
  }

  async updateManualPayable(id: string, updates: any): Promise<any> {
    return updates;
  }

  // ==================== CUSTOMIZATION OPTIONS ====================
  
  async createCustomizationOption(data: InsertCustomizationOption): Promise<CustomizationOption> {
    const results = await pg.insert(schema.customizationOptions).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return results[0];
  }

  async getCustomizationOptions(): Promise<CustomizationOption[]> {
    return await pg.select().from(schema.customizationOptions)
      .where(eq(schema.customizationOptions.isActive, true));
  }

  async getCustomizationOptionsByCategory(category: string, quantity: number): Promise<CustomizationOption[]> {
    return await pg.select().from(schema.customizationOptions)
      .where(and(
        eq(schema.customizationOptions.category, category),
        eq(schema.customizationOptions.isActive, true),
        lte(schema.customizationOptions.minQuantity, quantity)
      ));
  }

  async updateCustomizationOption(id: string, data: Partial<InsertCustomizationOption>): Promise<CustomizationOption | undefined> {
    const results = await pg.update(schema.customizationOptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.customizationOptions.id, id))
      .returning();
    return results[0];
  }

  async deleteCustomizationOption(id: string): Promise<boolean> {
    await pg.update(schema.customizationOptions)
      .set({ isActive: false })
      .where(eq(schema.customizationOptions.id, id));
    return true;
  }

  // ==================== PRODUCER PAYMENTS ====================
  
  async getProducerPayments(): Promise<ProducerPayment[]> {
    return await pg.select().from(schema.producerPayments)
      .orderBy(desc(schema.producerPayments.createdAt));
  }

  async getProducerPaymentsByProducer(producerId: string): Promise<ProducerPayment[]> {
    return await pg.select().from(schema.producerPayments)
      .where(eq(schema.producerPayments.producerId, producerId));
  }

  async getProducerPaymentByProductionOrderId(productionOrderId: string): Promise<ProducerPayment | undefined> {
    const results = await pg.select().from(schema.producerPayments)
      .where(eq(schema.producerPayments.productionOrderId, productionOrderId));
    return results[0];
  }

  async createProducerPayment(data: InsertProducerPayment): Promise<ProducerPayment> {
    const results = await pg.insert(schema.producerPayments).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return results[0];
  }

  async updateProducerPayment(id: string, data: Partial<InsertProducerPayment>): Promise<ProducerPayment | undefined> {
    const results = await pg.update(schema.producerPayments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.producerPayments.id, id))
      .returning();
    return results[0];
  }

  async getProducerPayment(id: string): Promise<ProducerPayment | undefined> {
    const results = await pg.select().from(schema.producerPayments)
      .where(eq(schema.producerPayments.id, id));
    return results[0];
  }

  // ==================== QUOTE REQUESTS ====================
  
  async createConsolidatedQuoteRequest(data: any): Promise<any> {
    return data;
  }

  async createQuoteRequest(data: any): Promise<any> {
    const results = await pg.insert(schema.quoteRequests).values({
      ...data,
      createdAt: new Date()
    }).returning();
    return results[0];
  }

  async getQuoteRequestsByVendor(vendorId: string): Promise<any[]> {
    return await pg.select().from(schema.quoteRequests)
      .where(eq(schema.quoteRequests.vendorId, vendorId));
  }

  async getQuoteRequestsByClient(clientId: string): Promise<any[]> {
    return await pg.select().from(schema.quoteRequests)
      .where(eq(schema.quoteRequests.clientId, clientId));
  }

  async getQuoteRequestById(id: string): Promise<any> {
    const results = await pg.select().from(schema.quoteRequests)
      .where(eq(schema.quoteRequests.id, id));
    return results[0];
  }

  async updateQuoteRequestStatus(id: string, status: string): Promise<any> {
    const results = await pg.update(schema.quoteRequests)
      .set({ status })
      .where(eq(schema.quoteRequests.id, id))
      .returning();
    return results[0];
  }

  // ==================== BRANCHES ====================
  
  async getBranches(): Promise<Branch[]> {
    return await pg.select().from(schema.branches)
      .where(eq(schema.branches.isActive, true));
  }

  async getBranch(id: string): Promise<Branch | null> {
    const results = await pg.select().from(schema.branches)
      .where(eq(schema.branches.id, id));
    return results[0] || null;
  }

  async createBranch(branchData: InsertBranch): Promise<Branch> {
    const results = await pg.insert(schema.branches).values({
      ...branchData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return results[0];
  }

  async updateBranch(id: string, updateData: Partial<Branch>): Promise<Branch | null> {
    const results = await pg.update(schema.branches)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(schema.branches.id, id))
      .returning();
    return results[0] || null;
  }

  async deleteBranch(id: string): Promise<boolean> {
    await pg.update(schema.branches)
      .set({ isActive: false })
      .where(eq(schema.branches.id, id));
    return true;
  }

  // ==================== EXPENSES ====================
  
  async getExpenses(): Promise<any[]> {
    // TODO: Implement expenses table and functionality
    return [];
  }

  async deleteVendor(id: string): Promise<boolean> {
    // Primeiro deletar registro da tabela vendors
    await pg.delete(schema.vendors).where(eq(schema.vendors.userId, id));
    // Depois deletar usuário
    await pg.delete(schema.users).where(eq(schema.users.id, id));
    return true;
  }

  async deleteProducer(id: string): Promise<boolean> {
    // Deletar produtor (usuário com role producer)
    await pg.delete(schema.users).where(eq(schema.users.id, id));
    return true;
  }

  // ==================== SYSTEM LOGS ====================
  
  async getSystemLogs(filters?: {
    search?: string;
    action?: string;
    userId?: string;
    level?: string;
    dateFilter?: string;
  }): Promise<SystemLog[]> {
    const conditions = [];

    if (filters?.userId) {
      conditions.push(eq(schema.systemLogs.userId, filters.userId));
    }

    if (filters?.action) {
      conditions.push(eq(schema.systemLogs.action, filters.action));
    }

    if (filters?.level) {
      conditions.push(eq(schema.systemLogs.level, filters.level));
    }

    if (conditions.length > 0) {
      return await pg.select().from(schema.systemLogs)
        .where(and(...conditions))
        .orderBy(desc(schema.systemLogs.createdAt))
        .limit(100);
    }

    return await pg.select().from(schema.systemLogs)
      .orderBy(desc(schema.systemLogs.createdAt))
      .limit(100);
  }

  async createSystemLog(logData: InsertSystemLog): Promise<SystemLog> {
    const results = await pg.insert(schema.systemLogs).values({
      ...logData,
      createdAt: new Date()
    } as any).returning();
    return results[0];
  }

  async logUserAction(
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    entity: string,
    entityId: string,
    description: string,
    level?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createSystemLog({
      userId,
      userName,
      userRole,
      action,
      entity,
      entityId,
      description,
      level: level || 'info',
      details: details ? JSON.stringify(details) : null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    });
  }
}

// Export singleton instance
export const pgStorage = new PgStorage();
