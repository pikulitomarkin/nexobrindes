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

  async getAllUsers(): Promise<User[]> {
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
      isActive: true,
      isCommissioned: vendorData.isCommissioned !== false,
      photoUrl: vendorData.photoUrl || null
    });

    // Create vendor profile
    await pg.insert(schema.vendors).values({
      userId: newUser.id,
      branchId: vendorData.branchId || null,
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

  async updateVendor(userId: string, updates: { branchId?: string | null; commissionRate?: string; salesLink?: string | null }): Promise<void> {
    await pg.update(schema.vendors)
      .set(updates)
      .where(eq(schema.vendors.userId, userId));
  }

  // ==================== CLIENTS ====================

  async getClients(): Promise<Client[]> {
    return await pg.select().from(schema.clients)
      .where(eq(schema.clients.isActive, true))
      .orderBy(desc(schema.clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const results = await pg.select().from(schema.clients).where(eq(schema.clients.id, id));
    return results[0];
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const results = await pg.insert(schema.clients).values(clientData).returning();
    return results[0];
  }

  async createClientWithUser(userData: {
    username: string;
    password: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  }, clientData: Omit<InsertClient, 'userId'>): Promise<{ user: User; client: Client }> {
    // Create user first
    const userResults = await pg.insert(schema.users).values({
      username: userData.username,
      password: userData.password,
      role: "client",
      name: userData.name,
      email: userData.email || null,
      phone: userData.phone || null,
      isActive: true
    }).returning();
    const user = userResults[0];

    // Create client profile linked to user
    const clientResults = await pg.insert(schema.clients).values({
      ...clientData,
      userId: user.id,
      name: userData.name,
      email: userData.email || clientData.email || null,
      phone: userData.phone || clientData.phone || null
    }).returning();
    const client = clientResults[0];

    return { user, client };
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const results = await pg.update(schema.clients)
      .set({ ...clientData, updatedAt: new Date() })
      .where(eq(schema.clients.id, id))
      .returning();
    return results[0];
  }

  async deleteClient(id: string): Promise<boolean> {
    // Mark client as inactive instead of deleting
    const client = await this.getClient(id);
    if (client && client.userId) {
      // Also mark the associated user as inactive
      await pg.update(schema.users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.users.id, client.userId));
    }
    // Mark client as inactive
    await pg.update(schema.clients)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.clients.id, id));
    return true;
  }

  async getClientByUserId(userId: string): Promise<Client | undefined> {
    const results = await pg.select().from(schema.clients)
      .where(and(eq(schema.clients.userId, userId), eq(schema.clients.isActive, true)));
    return results[0];
  }

  async getClientsByVendor(vendorId: string): Promise<Client[]> {
    const clients = await pg.select().from(schema.clients)
      .where(and(eq(schema.clients.vendorId, vendorId), eq(schema.clients.isActive, true)));
    
    // Filter out deleted clients (clients whose user was deleted)
    const activeClients = await Promise.all(
      clients.map(async (client) => {
        if (client.userId) {
          const user = await this.getUser(client.userId);
          return user && user.isActive !== false ? client : null;
        }
        return client; // Keep clients without userId (legacy records)
      })
    );
    
    return activeClients.filter((client): client is Client => client !== null);
  }

  // ==================== ORDERS ====================

  async getOrders(): Promise<Order[]> {
    // First get orders from orders table
    const orders = await pg.select().from(schema.orders).orderBy(desc(schema.orders.createdAt));

    // Enrich with budget items if budgetId exists
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      if (order.budgetId) {
        const items = await this.getBudgetItems(order.budgetId);
        return { ...order, items } as any;
      }
      return { ...order, items: [] } as any;
    }));

    // Also get converted budgets and map them to Order format
    const convertedBudgets = await pg.select().from(schema.budgets)
      .where(eq(schema.budgets.status, 'converted'))
      .orderBy(desc(schema.budgets.createdAt));

    const budgetOrders = await Promise.all(convertedBudgets.map(async (budget) => {
      const items = await this.getBudgetItems(budget.id);
      
      // Map budget fields to order format
      return {
        id: budget.id,
        orderNumber: budget.budgetNumber.replace('ORC-', 'PED-'), // Convert budget number to order format
        clientId: budget.clientId,
        vendorId: budget.vendorId,
        branchId: budget.branchId,
        budgetId: budget.id,
        product: budget.title,
        description: budget.description,
        totalValue: budget.totalValue,
        paidValue: budget.paidValue || '0',
        refundAmount: '0',
        status: budget.orderStatus || 'confirmed', // Use orderStatus from budget
        productStatus: 'to_buy',
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
        items,
      } as any;
    }));

    // Combine both sources, removing duplicates by id
    const allOrders = [...enrichedOrders, ...budgetOrders];
    const uniqueOrders = allOrders.filter((order, index, self) =>
      index === self.findIndex((o) => o.id === order.id)
    );

    return uniqueOrders.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }

  async getOrder(id: string): Promise<Order | undefined> {
    // First try to find in orders table
    const results = await pg.select().from(schema.orders).where(eq(schema.orders.id, id));
    const order = results[0];

    if (order) {
      // Enrich with budget items
      if (order.budgetId) {
        const items = await this.getBudgetItems(order.budgetId);
        return { ...order, items } as any;
      }
      return { ...order, items: [] } as any;
    }

    // If not found, try to find in converted budgets
    const budgetResults = await pg.select().from(schema.budgets)
      .where(eq(schema.budgets.id, id));
    const budget = budgetResults[0];

    if (budget && budget.status === 'converted') {
      const items = await this.getBudgetItems(budget.id);
      
      // Map budget fields to order format
      return {
        id: budget.id,
        orderNumber: budget.budgetNumber.replace('ORC-', 'PED-').replace('BUD-', 'PED-'),
        clientId: budget.clientId,
        vendorId: budget.vendorId,
        branchId: budget.branchId,
        budgetId: budget.id,
        product: budget.title,
        description: budget.description,
        totalValue: budget.totalValue,
        paidValue: budget.paidValue || '0',
        refundAmount: '0',
        status: budget.orderStatus || 'confirmed', // Use orderStatus from budget
        productStatus: 'to_buy',
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
        items,
      } as any;
    }

    return undefined;
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

    // If items are provided but no budgetId, create a virtual budget to store the items
    let virtualBudgetId: string | null = null;
    const orderItems = (processedData as any).items;
    
    if (orderItems && orderItems.length > 0 && !processedData.budgetId) {
      console.log(`Creating virtual budget for direct order with ${orderItems.length} items`);
      
      // Create a virtual budget
      const budgetNumber = `ORC-AUTO-${Date.now()}`;
      const budgetResults = await pg.insert(schema.budgets).values({
        budgetNumber,
        clientId: processedData.clientId,
        vendorId: processedData.vendorId,
        title: processedData.product || 'Pedido Direto',
        description: processedData.description || '',
        subtotal: processedData.totalValue || '0.00',
        totalValue: processedData.totalValue || '0.00',
        status: 'converted', // Mark as converted since it's already an order
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        contactName: processedData.contactName || '',
        contactPhone: processedData.contactPhone || '',
        contactEmail: processedData.contactEmail || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      const virtualBudget = budgetResults[0];
      virtualBudgetId = virtualBudget.id;
      
      // Insert budget items
      for (const item of orderItems) {
        // Handle "internal" producer - save as NULL (means internal production)
        const producerId = item.producerId && item.producerId !== 'internal' && item.producerId !== '' 
          ? item.producerId 
          : null;
        
        await pg.insert(schema.budgetItems).values({
          budgetId: virtualBudgetId,
          productId: item.productId,
          producerId: producerId,
          quantity: item.quantity?.toString() || '1',
          unitPrice: item.unitPrice?.toString() || '0.00',
          totalPrice: item.totalPrice?.toString() || '0.00',
          notes: item.notes || null,
          hasItemCustomization: item.hasItemCustomization || false,
          selectedCustomizationId: item.selectedCustomizationId || null,
          itemCustomizationValue: item.itemCustomizationValue?.toString() || '0.00',
          itemCustomizationDescription: item.itemCustomizationDescription || null,
          additionalCustomizationNotes: item.additionalCustomizationNotes || null,
          customizationPhoto: item.customizationPhoto || null,
          hasGeneralCustomization: item.hasGeneralCustomization || false,
          generalCustomizationName: item.generalCustomizationName || null,
          generalCustomizationValue: item.generalCustomizationValue?.toString() || '0.00',
          hasItemDiscount: item.hasItemDiscount || false,
          itemDiscountType: item.itemDiscountType || 'percentage',
          itemDiscountPercentage: item.itemDiscountPercentage?.toString() || '0.00',
          itemDiscountValue: item.itemDiscountValue?.toString() || '0.00',
          productWidth: item.productWidth?.toString() || null,
          productHeight: item.productHeight?.toString() || null
        });
      }
      
      console.log(`Created virtual budget ${budgetNumber} with ${orderItems.length} items`);
      processedData.budgetId = virtualBudgetId;
    }

    // Remove items from processedData before inserting into orders table
    delete processedData.items;

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

  async calculateCommissions(order: Order): Promise<void> {
    try {
      console.log(`Calculating commissions for order ${order.orderNumber}`);

      // Get vendor user to check if commissioned
      const vendorUser = await pg
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, order.vendorId))
        .then(rows => rows[0]);

      // Get vendor commission rate
      const vendor = await pg
        .select()
        .from(schema.vendors)
        .where(eq(schema.vendors.userId, order.vendorId))
        .then(rows => rows[0]);

      const orderValue = parseFloat(order.totalValue);

      // Only create vendor commission if vendor is commissioned
      const isVendorCommissioned = vendorUser?.isCommissioned !== false;

      if (isVendorCommissioned) {
        const vendorRate = vendor?.commissionRate || '10.00';
        const vendorCommissionAmount = (orderValue * parseFloat(vendorRate)) / 100;

        // Create vendor commission
        await pg.insert(schema.commissions).values({
          id: `commission-${order.id}-vendor`,
          vendorId: order.vendorId,
          partnerId: null,
          orderId: order.id,
          percentage: vendorRate,
          amount: vendorCommissionAmount.toFixed(2),
          status: 'pending',
          type: 'vendor',
          orderValue: order.totalValue,
          orderNumber: order.orderNumber,
          paidAt: null,
          deductedAt: null,
          createdAt: new Date()
        });

        console.log(`Created vendor commission: R$ ${vendorCommissionAmount.toFixed(2)} (${vendorRate}%) for order ${order.orderNumber}`);
      } else {
        console.log(`Skipping vendor commission for order ${order.orderNumber} - vendor is not commissioned`);
      }

      // Get all partners for partner commissions
      const allPartners = await pg
        .select()
        .from(schema.users)
        .where(eq(schema.users.role, 'partner'));

      if (allPartners.length > 0) {
        // Create partner commissions - divide equally among all partners
        const partnerRate = '15.00'; // Default partner commission rate
        const totalPartnerCommission = (orderValue * parseFloat(partnerRate)) / 100;
        const individualPartnerCommission = totalPartnerCommission / allPartners.length;

        for (let i = 0; i < allPartners.length; i++) {
          const partner = allPartners[i];
          const individualPercentage = (parseFloat(partnerRate) / allPartners.length).toFixed(2);

          await pg.insert(schema.commissions).values({
            id: `commission-${order.id}-partner-${i + 1}`,
            vendorId: null,
            partnerId: partner.id,
            orderId: order.id,
            percentage: individualPercentage,
            amount: individualPartnerCommission.toFixed(2),
            status: 'confirmed', // Partners get confirmed immediately
            type: 'partner',
            orderValue: order.totalValue,
            orderNumber: order.orderNumber,
            paidAt: new Date(), // Paid immediately
            deductedAt: null,
            createdAt: new Date()
          });
        }

        console.log(`Created ${allPartners.length} partner commissions: R$ ${individualPartnerCommission.toFixed(2)} each (total: R$ ${totalPartnerCommission.toFixed(2)}) for order ${order.orderNumber}`);
      }

    } catch (error) {
      console.error('Error calculating commissions:', error);
    }
  }

  async recalculateCommissionsForOrder(order: Order): Promise<void> {
    try {
      console.log(`Recalculating commissions for order ${order.orderNumber}`);
      
      const orderValue = parseFloat(order.totalValue);
      
      // Get existing commissions for this order
      const existingCommissions = await pg
        .select()
        .from(schema.commissions)
        .where(eq(schema.commissions.orderId, order.id));
      
      if (existingCommissions.length === 0) {
        console.log(`No existing commissions found for order ${order.id}, creating new ones`);
        await this.calculateCommissions(order);
        return;
      }
      
      // Get vendor commission rate
      const vendor = await pg
        .select()
        .from(schema.vendors)
        .where(eq(schema.vendors.userId, order.vendorId))
        .then(rows => rows[0]);
      
      const vendorRate = vendor?.commissionRate || '10.00';
      const vendorCommissionAmount = (orderValue * parseFloat(vendorRate)) / 100;
      
      // Get all partners for partner commissions
      const allPartners = await pg
        .select()
        .from(schema.users)
        .where(eq(schema.users.role, 'partner'));
      
      const partnerRate = '15.00';
      const totalPartnerCommission = (orderValue * parseFloat(partnerRate)) / 100;
      const individualPartnerCommission = allPartners.length > 0 
        ? totalPartnerCommission / allPartners.length 
        : 0;
      
      // Update each existing commission
      for (const commission of existingCommissions) {
        if (commission.type === 'vendor') {
          await pg.update(schema.commissions)
            .set({
              orderValue: order.totalValue,
              percentage: vendorRate,
              amount: vendorCommissionAmount.toFixed(2)
            })
            .where(eq(schema.commissions.id, commission.id));
          
          console.log(`Updated vendor commission ${commission.id}: R$ ${vendorCommissionAmount.toFixed(2)} (${vendorRate}%)`);
        } else if (commission.type === 'partner') {
          const individualPercentage = allPartners.length > 0 
            ? (parseFloat(partnerRate) / allPartners.length).toFixed(2) 
            : partnerRate;
          
          await pg.update(schema.commissions)
            .set({
              orderValue: order.totalValue,
              percentage: individualPercentage,
              amount: individualPartnerCommission.toFixed(2)
            })
            .where(eq(schema.commissions.id, commission.id));
          
          console.log(`Updated partner commission ${commission.id}: R$ ${individualPartnerCommission.toFixed(2)}`);
        }
      }
      
      console.log(`Recalculated ${existingCommissions.length} commissions for order ${order.orderNumber}`);
    } catch (error) {
      console.error('Error recalculating commissions:', error);
    }
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    // Convert string dates to Date objects if they exist
    const processedData: any = { ...updates };
    
    if (processedData.deadline && typeof processedData.deadline === 'string') {
      processedData.deadline = new Date(processedData.deadline);
    }
    
    if (processedData.deliveryDeadline && typeof processedData.deliveryDeadline === 'string') {
      processedData.deliveryDeadline = new Date(processedData.deliveryDeadline);
    }
    
    if (processedData.createdAt && typeof processedData.createdAt === 'string') {
      processedData.createdAt = new Date(processedData.createdAt);
    }

    // Handle items update if provided
    const orderItems = processedData.items;
    if (orderItems && orderItems.length > 0) {
      // Get the current order to check for budgetId
      const currentOrder = await pg.select().from(schema.orders).where(eq(schema.orders.id, id)).then(r => r[0]);
      
      if (currentOrder) {
        let budgetId = currentOrder.budgetId;
        
        // If no budget exists, create a virtual one
        if (!budgetId) {
          console.log(`Creating virtual budget for order ${id} during update`);
          const budgetNumber = `ORC-AUTO-${Date.now()}`;
          const budgetResults = await pg.insert(schema.budgets).values({
            budgetNumber,
            clientId: currentOrder.clientId,
            vendorId: currentOrder.vendorId,
            title: processedData.product || currentOrder.product || 'Pedido Direto',
            description: processedData.description || currentOrder.description || '',
            subtotal: processedData.totalValue || currentOrder.totalValue || '0.00',
            totalValue: processedData.totalValue || currentOrder.totalValue || '0.00',
            status: 'converted',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            contactName: processedData.contactName || currentOrder.contactName || '',
            contactPhone: processedData.contactPhone || currentOrder.contactPhone || '',
            contactEmail: processedData.contactEmail || currentOrder.contactEmail || '',
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();
          
          budgetId = budgetResults[0].id;
          processedData.budgetId = budgetId;
        }
        
        // Delete existing items and insert new ones
        await pg.delete(schema.budgetItems).where(eq(schema.budgetItems.budgetId, budgetId));
        
        for (const item of orderItems) {
          // Handle "internal" producer - save as NULL (means internal production)
          const producerId = item.producerId && item.producerId !== 'internal' && item.producerId !== '' 
            ? item.producerId 
            : null;
          
          await pg.insert(schema.budgetItems).values({
            budgetId: budgetId,
            productId: item.productId,
            producerId: producerId,
            quantity: item.quantity?.toString() || '1',
            unitPrice: item.unitPrice?.toString() || '0.00',
            totalPrice: item.totalPrice?.toString() || '0.00',
            notes: item.notes || null,
            hasItemCustomization: item.hasItemCustomization || false,
            selectedCustomizationId: item.selectedCustomizationId || null,
            itemCustomizationValue: item.itemCustomizationValue?.toString() || '0.00',
            itemCustomizationDescription: item.itemCustomizationDescription || null,
            additionalCustomizationNotes: item.additionalCustomizationNotes || null,
            customizationPhoto: item.customizationPhoto || null,
            hasGeneralCustomization: item.hasGeneralCustomization || false,
            generalCustomizationName: item.generalCustomizationName || null,
            generalCustomizationValue: item.generalCustomizationValue?.toString() || '0.00',
            hasItemDiscount: item.hasItemDiscount || false,
            itemDiscountType: item.itemDiscountType || 'percentage',
            itemDiscountPercentage: item.itemDiscountPercentage?.toString() || '0.00',
            itemDiscountValue: item.itemDiscountValue?.toString() || '0.00',
            productWidth: item.productWidth?.toString() || null,
            productHeight: item.productHeight?.toString() || null
          });
        }
        
        console.log(`Updated ${orderItems.length} items for order ${id}`);
      }
    }
    
    // Remove items from processedData before updating orders table
    delete processedData.items;

    const results = await pg.update(schema.orders)
      .set({ ...processedData, updatedAt: new Date() })
      .where(eq(schema.orders.id, id))
      .returning();
    return results[0];
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    notes?: string,
    deliveryDate?: string,
    trackingCode?: string,
    cancellationReason?: string,
    cancelledBy?: string
  ): Promise<Order | undefined> {
    const updates: any = { status };
    if (notes) updates.notes = notes;
    if (deliveryDate) updates.deliveryDeadline = new Date(deliveryDate);
    if (trackingCode) updates.trackingCode = trackingCode;
    if (cancellationReason) updates.cancellationReason = cancellationReason;
    if (cancelledBy) updates.cancelledBy = cancelledBy;

    const results = await pg.update(schema.orders)
      .set(updates)
      .where(eq(schema.orders.id, orderId))
      .returning();
    const updatedOrder = results[0];

    console.log(`Order ${orderId} status updated to: ${status}`);

    // Update vendor commission status when order is delivered
    if (status === 'delivered') {
      await pg
        .update(schema.commissions)
        .set({
          status: 'confirmed',
          updatedAt: new Date()
        })
        .where(and(
          eq(schema.commissions.orderId, orderId),
          eq(schema.commissions.type, 'vendor')
        ));

      console.log(`Vendor commission confirmed for delivered order ${orderId}`);
    }

    // Cancel commissions if order is cancelled
    if (status === 'cancelled') {
      await this.updateCommissionsByOrderStatus(orderId, 'cancelled');
    }
    return updatedOrder;
  }

  async getOrdersByVendor(vendorId: string): Promise<Order[]> {
    return await pg.select().from(schema.orders)
      .where(eq(schema.orders.vendorId, vendorId))
      .orderBy(desc(schema.orders.createdAt));
  }

  async getOrdersByClient(clientId: string): Promise<Order[]> {
    // Buscar budgets convertidos (que são os pedidos reais) pelo clientId
    const budgetsAsOrders = await pg.select().from(schema.budgets)
      .where(and(
        eq(schema.budgets.clientId, clientId),
        eq(schema.budgets.status, 'converted')
      ))
      .orderBy(desc(schema.budgets.createdAt));
    
    // Mapear budgets para o formato Order
    return budgetsAsOrders.map((b: any) => ({
      id: b.id,
      orderNumber: b.budgetNumber || b.id.substring(0, 8),
      clientId: b.clientId,
      vendorId: b.vendorId,
      status: b.orderStatus || 'pending',
      totalValue: b.totalValue,
      paidValue: b.paidValue || '0',
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      branchId: b.branchId,
      notes: b.description,
      deliveryDate: b.deliveryDeadline,
      shippingAddress: null,
      refundAmount: null,
    })) as Order[];
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

  async getProductionOrderItems(productionOrderId: string): Promise<ProductionOrderItem[]> {
    return await pg.select().from(schema.productionOrderItems)
      .where(eq(schema.productionOrderItems.productionOrderId, productionOrderId));
  }

  async createProductionOrderItem(productionOrderId: string, itemData: any): Promise<ProductionOrderItem> {
    // Convert quantity to integer (budget items store as numeric)
    const quantity = Math.round(parseFloat(String(itemData.quantity || 0)));
    
    const productionOrderItemData: InsertProductionOrderItem = {
      productionOrderId: productionOrderId,
      budgetItemId: itemData.budgetItemId || null,
      productId: itemData.productId,
      productName: itemData.productName || 'Produto',
      quantity: quantity,
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
      itemDiscountType: itemData.itemDiscountType || 'percentage',
      itemDiscountPercentage: itemData.itemDiscountPercentage || null,
      itemDiscountValue: itemData.itemDiscountValue || null,
    };

    const results = await pg.insert(schema.productionOrderItems).values(productionOrderItemData).returning();
    console.log(`Created production order item for product ${itemData.productName} (qty: ${quantity})`);
    return results[0];
  }

  async getProductionOrdersWithItems(productionOrderIds?: string[]): Promise<(ProductionOrder & { items: ProductionOrderItem[] })[]> {
    let orders;
    if (productionOrderIds && productionOrderIds.length > 0) {
      orders = await pg.select().from(schema.productionOrders)
        .where(sql`${schema.productionOrders.id} = ANY(ARRAY[${sql.join(productionOrderIds.map(id => sql`${id}`), sql`, `)}]::varchar[])`)
        .orderBy(desc(schema.productionOrders.id));
    } else {
      orders = await pg.select().from(schema.productionOrders)
        .orderBy(desc(schema.productionOrders.id));
    }
    
    return Promise.all(orders.map(async (order) => ({
      ...order,
      items: await this.getProductionOrderItems(order.id)
    })));
  }

  // ==================== PAYMENTS ====================

  async getPayments(): Promise<Payment[]> {
    return await pg.select().from(schema.payments).orderBy(desc(schema.payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const results = await pg.insert(schema.payments).values({
      ...payment,
      createdAt: new Date()
    }).returning();

    const newPayment = results[0];

    // Update order paidValue if status is confirmed
    if (newPayment.status === 'confirmed') {
      await this.updateOrderPaidValue(newPayment.orderId);
    }

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
    console.log(`[PG STORAGE] Getting commissions for vendor: ${vendorId}`);
    const commissions = await pg.select().from(schema.commissions)
      .where(eq(schema.commissions.vendorId, vendorId))
      .orderBy(desc(schema.commissions.createdAt));
    console.log(`[PG STORAGE] Found ${commissions.length} commissions for vendor ${vendorId}`);
    return commissions;
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

  async deleteCommission(id: string): Promise<boolean> {
    try {
      console.log(`Deleting commission: ${id}`);

      const result = await pg.delete(schema.commissions)
        .where(eq(schema.commissions.id, id))
        .returning();

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

  async deductPartnerCommission(partnerId: string, amount: string): Promise<void> {
    // Implementation for partner commission deduction
    // This would update commission records for the partner
  }

  async updateCommissionsByOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      // When cancelling, also set the amount to 0 so it doesn't count in totals
      const updateData: any = {
        status: status,
        updatedAt: new Date()
      };
      
      if (status === 'cancelled') {
        updateData.amount = '0.00';
      }

      await pg
        .update(schema.commissions)
        .set(updateData)
        .where(eq(schema.commissions.orderId, orderId));

      console.log(`Updated commissions for order ${orderId} to status: ${status}${status === 'cancelled' ? ' (amounts zeroed)' : ''}`);
    } catch (error) {
      console.error('Error updating commissions by order status:', error);
    }
  }

  async recalculateAllCommissions(): Promise<void> {
    try {
      console.log('Starting commission recalculation for existing orders...');

      // Get all orders
      const allOrders = await pg.select().from(schema.orders);
      console.log(`Found ${allOrders.length} orders to check`);

      // Get existing commissions
      const existingCommissions = await pg.select().from(schema.commissions);
      const orderIdsWithCommissions = new Set(existingCommissions.map(c => c.orderId));

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
      console.error('Error during commission recalculation:', error);
    }
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
    console.log(`Updating partner commission: ${userId} to ${commissionRate}%`);

    await pg.update(schema.partners)
      .set({
        commissionRate: commissionRate,
        updatedAt: new Date()
      })
      .where(eq(schema.partners.userId, userId));
  }

  async deletePartner(userId: string): Promise<boolean> {
    try {
      console.log(`Deleting partner profile for user: ${userId}`);

      const result = await pg.delete(schema.partners)
        .where(eq(schema.partners.userId, userId))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting partner profile for user ${userId}:`, error);
      return false;
    }
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
    producer?: string; // Deprecated - não filtra mais por produtor. Produtor agora é escolhido por item no orçamento
  }): Promise<{ products: Product[]; total: number; page: number; totalPages: number; }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(schema.products.isActive, true)];

    if (options?.search) {
      conditions.push(
        or(
          like(schema.products.name, `%${options.search}%`),
          like(schema.products.description, `%${options.search}%`),
          like(schema.products.friendlyCode, `%${options.search}%`),
          like(schema.products.compositeCode, `%${options.search}%`),
          like(schema.products.externalCode, `%${options.search}%`)
        ) as any
      );
    }

    if (options?.category) {
      conditions.push(eq(schema.products.category, options.category));
    }

    // MUDANÇA: Remover filtro de produtor - produtos são agora globais
    // Produtor é escolhido no nível do item do orçamento (budgetItems.producerId)

    const products = await pg.select().from(schema.products)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    // Enrich products info
    const enrichedProducts = products.map(product => ({
      ...product,
      producerName: 'Será definido no orçamento'
    }));

    const totalResults = await pg.select({ count: sql<number>`count(*)` }).from(schema.products)
      .where(and(...conditions));
    const total = Number(totalResults[0].count);
    const totalPages = Math.ceil(total / limit);

    return { products: enrichedProducts, total, page, totalPages };
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
    // Remove campos de timestamp se eles existirem no productData para evitar conflitos
    const { createdAt, updatedAt, ...cleanProductData } = productData as any;

    const results = await pg.update(schema.products)
      .set({ ...cleanProductData, updatedAt: new Date() })
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

  async importProductsForProducer(productsData: any[], producerId: string | null): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    // Clean numeric fields helper
    const cleanNumericField = (value: any) => {
      if (value === "" || value === undefined || value === null) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num.toString();
    };

    // Handle internal products - null producerId means internal
    const isInternal = !producerId;
    
    // Map common field names from different JSON formats
    const mapProductFields = (item: any) => {
      // PrecoVenda do JSON é o CUSTO do produto
      // O preço de venda será calculado dinamicamente na exibição usando as configurações do painel
      const costPrice = parseFloat(item.PrecoVenda || item.Preco || item.PrecoCusto || 0);
      
      // Armazenar custo como basePrice também para compatibilidade
      // O preço de venda real será calculado na exibição
      return {
        name: item.Nome || item.name || item.NomeProduto || 'Produto sem nome',
        description: item.Descricao || item.description || item.Descricao || '',
        category: item.WebTipo || item.category || item.Categoria || 'Geral',
        basePrice: costPrice.toFixed(2), // Armazena o custo aqui também
        costPrice: costPrice.toFixed(2), // Custo original do JSON (PrecoVenda)
        unit: item.unit || item.Unidade || 'un',
        isActive: true,
        producerId: isInternal ? null : producerId,
        type: isInternal ? 'internal' : 'external',

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

    for (const rawItem of productsData) {
      try {
        const productData = mapProductFields(rawItem);

        // Validate required fields
        if (!productData.name || productData.name.trim() === '') {
          errors.push(`Produto pulado: nome vazio ou inválido`);
          continue;
        }

        if (!productData.basePrice || parseFloat(productData.basePrice) <= 0) {
          errors.push(`Produto "${productData.name}" pulado: preço inválido (${productData.basePrice})`);
          continue;
        }

        await this.createProduct(productData);
        imported++;
      } catch (error: any) {
        const itemName = rawItem.Nome || rawItem.name || rawItem.NomeProduto || 'Produto sem nome';
        errors.push(`Erro ao importar "${itemName}": ${error.message}`);
      }
    }

    console.log(`Import for producer ${producerId} completed: ${imported} imported, ${errors.length} errors`);
    return { imported, errors };
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

  async recalculateProductPrices(): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Usar SQL direto para melhor performance com muitos produtos
      // Atualiza cost_price = base_price onde cost_price está vazio
      const result = await pg.execute(
        sql`UPDATE products 
            SET cost_price = base_price
            WHERE (cost_price = '0.00' OR cost_price IS NULL OR cost_price = '0') 
            AND base_price IS NOT NULL 
            AND base_price != '0' 
            AND base_price != '0.00'`
      );
      
      const updated = result.rowCount || 0;
      return { updated, errors };
    } catch (error: any) {
      errors.push(`Erro geral: ${error.message}`);
      return { updated: 0, errors };
    }
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

  async createBudget(budgetData: any): Promise<Budget> {
    // Convert string dates to Date objects if they exist
    const processedData: any = { ...budgetData };

    // Handle validUntil - ensure it's a proper Date object or null
    if (processedData.validUntil) {
      try {
        if (typeof processedData.validUntil === 'string') {
          processedData.validUntil = new Date(processedData.validUntil);
        } else if (!(processedData.validUntil instanceof Date)) {
          processedData.validUntil = new Date(processedData.validUntil);
        }
        // Validate the date
        if (isNaN(processedData.validUntil.getTime())) {
          processedData.validUntil = null;
        }
      } catch (e) {
        processedData.validUntil = null;
      }
    } else {
      processedData.validUntil = null;
    }

    // Handle deliveryDeadline - ensure it's a proper Date object or null  
    if (processedData.deliveryDeadline) {
      try {
        if (typeof processedData.deliveryDeadline === 'string') {
          processedData.deliveryDeadline = new Date(processedData.deliveryDeadline);
        } else if (!(processedData.deliveryDeadline instanceof Date)) {
          processedData.deliveryDeadline = new Date(processedData.deliveryDeadline);
        }
        // Validate the date
        if (isNaN(processedData.deliveryDeadline.getTime())) {
          processedData.deliveryDeadline = null;
        }
      } catch (e) {
        processedData.deliveryDeadline = null;
      }
    } else {
      processedData.deliveryDeadline = null;
    }

    // Note: Client ID validation is now handled in the routes layer to provide better error messages

    // Generate unique budget number with retry mechanism
    async function getNextBudgetNumber(): Promise<string> {
      const maxRetries = 10;
      let attempt = 0;
      
      while (attempt < maxRetries) {
        try {
          // Generate a unique number with timestamp to avoid collisions
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000);
          const uniqueId = `${timestamp}${random}`;
          
          // Format: BUD-YYMM-UNIQUEID
          const now = new Date();
          const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
          const budgetNumber = `BUD-${yymm}-${uniqueId.slice(-6)}`;
          
          // Check if this number already exists
          const existing = await pg.select().from(schema.budgets)
            .where(eq(schema.budgets.budgetNumber, budgetNumber))
            .limit(1);
            
          if (existing.length === 0) {
            return budgetNumber;
          }
          
          attempt++;
          console.log(`Budget number ${budgetNumber} exists, retrying... (attempt ${attempt})`);
          
          // Add a small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (e) {
          console.error('Error generating budget number:', e);
          attempt++;
          if (attempt >= maxRetries) {
            throw e;
          }
        }
      }
      
      // Fallback: use timestamp + random as backup
      const fallbackId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      return `BUD-FALLBACK-${fallbackId.slice(-10)}`;
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

    const newBudget = results[0];
    console.log(`✅ [PG CREATE BUDGET] Budget criado: ${newBudget.id} (${newBudget.budgetNumber})`);

    // Create budget items if provided
    if (budgetData.items && Array.isArray(budgetData.items) && budgetData.items.length > 0) {
      console.log(`📦 [PG CREATE BUDGET] Processando ${budgetData.items.length} items recebidos`);

      // Remove duplicates based on productId, producerId, quantity, and unitPrice
      const seenItems = new Set();
      const uniqueItems = budgetData.items.filter(item => {
        const itemKey = `${item.productId}-${item.producerId || 'internal'}-${item.quantity}-${item.unitPrice}`;
        if (seenItems.has(itemKey)) {
          console.log(`⚠️ [PG CREATE BUDGET] Item duplicado removido: ${item.productName}`);
          return false;
        }
        seenItems.add(itemKey);
        return true;
      });

      console.log(`📊 [PG CREATE BUDGET] ${uniqueItems.length} items únicos para salvar (${budgetData.items.length - uniqueItems.length} duplicados)`);

      // BATCH INSERT - Insert all items in a single database call for better performance
      // Note: producerId='internal' should be converted to null since it's not a real user ID
      const itemsToInsert = uniqueItems.map((itemData: any) => {
        // Convert 'internal' to null for FK compliance
        let producerId = itemData.producerId;
        if (!producerId || producerId === 'internal' || producerId === '') {
          producerId = null;
        }
        
        return {
          budgetId: newBudget.id,
          productId: itemData.productId,
          productName: itemData.productName || 'Produto',
          producerId: producerId,
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
          itemDiscountType: itemData.itemDiscountType || 'percentage',
          itemDiscountPercentage: (itemData.itemDiscountPercentage || 0).toString(),
          itemDiscountValue: (itemData.itemDiscountValue || 0).toString(),
          productWidth: itemData.productWidth ? parseFloat(String(itemData.productWidth)) : null,
          productHeight: itemData.productHeight ? parseFloat(String(itemData.productHeight)) : null,
          productDepth: itemData.productDepth ? parseFloat(String(itemData.productDepth)) : null
        };
      });

      // Insert all items in a single batch operation with fallback to individual inserts
      if (itemsToInsert.length > 0) {
        try {
          await pg.insert(schema.budgetItems).values(itemsToInsert);
          console.log(`✅ [PG CREATE BUDGET] ${itemsToInsert.length} items inseridos em uma única operação (batch insert)`);
        } catch (batchError: any) {
          console.error(`⚠️ [PG CREATE BUDGET] Batch insert falhou, tentando inserção individual:`, batchError.message);
          
          // Fallback: insert items one by one with retry logic
          let successCount = 0;
          let failureCount = 0;
          
          for (const itemValues of itemsToInsert) {
            let retryCount = 0;
            const maxRetries = 3;
            let itemSaved = false;
            
            while (!itemSaved && retryCount < maxRetries) {
              try {
                await pg.insert(schema.budgetItems).values(itemValues);
                successCount++;
                itemSaved = true;
              } catch (itemError: any) {
                retryCount++;
                if (retryCount >= maxRetries) {
                  console.error(`❌ [PG ITEM] Falha após ${maxRetries} tentativas:`, itemError.message);
                  failureCount++;
                  itemSaved = true; // Break loop
                } else {
                  await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
                }
              }
            }
          }
          
          console.log(`📊 [PG CREATE BUDGET] Fallback: ✅ ${successCount} salvos | ❌ ${failureCount} falhados`);
          
          if (failureCount > 0 && successCount === 0) {
            throw new Error(`Erro ao salvar itens do orçamento: todos os ${failureCount} itens falharam`);
          }
        }
      }
    }

    // Create budget payment info if provided
    if (budgetData.paymentMethodId || budgetData.shippingMethodId) {
      try {
        await pg.insert(schema.budgetPaymentInfo).values({
          budgetId: newBudget.id,
          paymentMethodId: budgetData.paymentMethodId || null,
          shippingMethodId: budgetData.shippingMethodId || null,
          installments: budgetData.installments || 1,
          downPayment: (budgetData.downPayment || 0).toString(),
          remainingAmount: (budgetData.remainingAmount || 0).toString(),
          shippingCost: (budgetData.shippingCost || 0).toString(),
          createdAt: new Date()
        });
      } catch (paymentError) {
        console.error(`[PG CREATE BUDGET] Error creating payment info:`, paymentError);
      }
    }

    console.log(`[PG CREATE BUDGET] Budget ${newBudget.id} created successfully`);
    return newBudget;
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

    // Convert empty clientId to null to avoid foreign key constraint violation
    if (processedData.clientId === '' || processedData.clientId === undefined) {
      processedData.clientId = null;
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

  async convertBudgetToOrder(budgetId: string, clientId: string, deliveryDate?: Date | string): Promise<Order> {
    const budget = await this.getBudget(budgetId);
    if (!budget) throw new Error('Budget not found');

    // Get budget payment info (contains shipping and payment data)
    const budgetPaymentInfo = await this.getBudgetPaymentInfo(budgetId);
    console.log(`[CONVERT BUDGET] Payment info for budget ${budgetId}:`, budgetPaymentInfo);

    // IMPORTANTE: Buscar dados do cliente selecionado na conversão (não usar dados do orçamento)
    const client = await this.getClient(clientId);
    let clientName = budget.contactName; // Fallback para nome do orçamento
    let clientPhone = budget.contactPhone;
    let clientEmail = budget.contactEmail;
    let clientAddress = '';

    if (client) {
      clientName = client.name;
      clientPhone = client.phone || budget.contactPhone;
      clientEmail = client.email || budget.contactEmail;
      // Montar endereço completo do cliente
      if (client.enderecoEntregaLogradouro) {
        clientAddress = [
          client.enderecoEntregaLogradouro,
          client.enderecoEntregaNumero,
          client.enderecoEntregaComplemento,
          client.enderecoEntregaBairro,
          client.enderecoEntregaCidade,
          client.enderecoEntregaCep
        ].filter(Boolean).join(', ');
      }
      console.log(`[CONVERT BUDGET] Using client data from conversion: ${clientName} (${clientId})`);
    } else {
      // Tentar buscar usuário se não for registro de cliente
      const user = await this.getUser(clientId);
      if (user) {
        clientName = user.name;
        clientPhone = user.phone || budget.contactPhone;
        clientEmail = user.email || budget.contactEmail;
        console.log(`[CONVERT BUDGET] Using user data from conversion: ${clientName} (${clientId})`);
      }
    }

    // Normalize deliveryDate to Date object
    const deliveryDateObj = deliveryDate instanceof Date ? deliveryDate : (deliveryDate ? new Date(deliveryDate) : undefined);

    // Helper function to ensure money fields are properly formatted
    const toMoneyString = (value: any): string => {
      if (value === null || value === undefined || value === '') return "0.00";
      const num = parseFloat(String(value));
      return isNaN(num) ? "0.00" : num.toFixed(2);
    };

    // Create order from budget with payment and shipping info
    // USAR DADOS DO CLIENTE DA CONVERSÃO, não do orçamento original
    const orderData: InsertOrder = {
      orderNumber: `PED-${Date.now()}`,
      clientId: clientId,
      vendorId: budget.vendorId,
      branchId: budget.branchId,
      budgetId: budget.id,
      product: budget.title,
      description: budget.description,
      totalValue: budget.totalValue,
      paidValue: "0.00",
      status: 'pending',
      contactName: clientName, // Usar nome do cliente da conversão
      contactPhone: clientPhone, // Usar telefone do cliente da conversão
      contactEmail: clientEmail, // Usar email do cliente da conversão
      shippingAddress: clientAddress || '', // Usar endereço do cliente da conversão
      deliveryType: budget.deliveryType,
      deliveryDeadline: deliveryDateObj,
      deadline: deliveryDateObj,
      // Copy payment and shipping info from budget (with proper type conversion)
      paymentMethodId: budgetPaymentInfo?.paymentMethodId || null,
      shippingMethodId: budgetPaymentInfo?.shippingMethodId || null,
      shippingCost: toMoneyString(budgetPaymentInfo?.shippingCost),
      installments: budgetPaymentInfo?.installments ? Number(budgetPaymentInfo.installments) : 1,
      downPayment: toMoneyString(budgetPaymentInfo?.downPayment),
      remainingAmount: toMoneyString(budgetPaymentInfo?.remainingAmount || budget.totalValue),
      // Copy discount info from budget (with proper type conversion)
      hasDiscount: budget.hasDiscount || false,
      discountType: budget.discountType || 'percentage',
      discountPercentage: toMoneyString(budget.discountPercentage),
      discountValue: toMoneyString(budget.discountValue)
    } as InsertOrder;
    
    console.log(`[CONVERT BUDGET] Order data with payment info:`, {
      paymentMethodId: orderData.paymentMethodId,
      shippingMethodId: orderData.shippingMethodId,
      shippingCost: orderData.shippingCost,
      installments: orderData.installments,
      downPayment: orderData.downPayment,
      remainingAmount: orderData.remainingAmount
    });

    const order = await this.createOrder(orderData);

    // Get budget items to create production orders
    const budgetItems = await this.getBudgetItems(budgetId);
    
    // Group items by producer and create production orders
    const producerGroups = new Map<string, typeof budgetItems>();
    
    for (const item of budgetItems) {
      if (item.producerId) {
        if (!producerGroups.has(item.producerId)) {
          producerGroups.set(item.producerId, []);
        }
        producerGroups.get(item.producerId)!.push(item);
      }
    }

    // Create one production order per producer with detailed items
    for (const [producerId, items] of producerGroups.entries()) {
      const productionOrderData: InsertProductionOrder = {
        orderId: order.id,
        producerId: producerId,
        status: 'pending' as const,
        deadline: deliveryDateObj,
        deliveryDeadline: deliveryDateObj,
        notes: `Itens: ${items.map(i => i.productName).join(', ')}`,
      };

      const productionOrder = await this.createProductionOrder(productionOrderData);
      console.log(`Created production order for producer ${producerId} with ${items.length} items`);

      // Create production order items with full details
      for (const budgetItem of items) {
        // Ensure quantity is an integer - budget_items stores as numeric(10,3) so we need to round
        const quantity = Math.round(parseFloat(String(budgetItem.quantity)));

        const productionOrderItemData: InsertProductionOrderItem = {
          productionOrderId: productionOrder.id,
          budgetItemId: budgetItem.id,
          productId: budgetItem.productId,
          productName: budgetItem.productName || 'Produto',
          quantity: quantity,
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
          itemDiscountValue: budgetItem.itemDiscountValue,
        };

        await pg.insert(schema.productionOrderItems).values(productionOrderItemData);
        console.log(`Created production order item for product ${budgetItem.productName} (qty: ${quantity})`);
      }
    }

    // Update budget status
    await this.updateBudget(budgetId, { status: 'converted' });

    return order;
  }

  // ==================== BUDGET ITEMS ====================

  async getBudgetItems(budgetId: string): Promise<BudgetItem[]> {
    const items = await pg.select({
      id: schema.budgetItems.id,
      budgetId: schema.budgetItems.budgetId,
      productId: schema.budgetItems.productId,
      quantity: schema.budgetItems.quantity,
      unitPrice: schema.budgetItems.unitPrice,
      totalPrice: schema.budgetItems.totalPrice,
      notes: schema.budgetItems.notes,
      hasItemCustomization: schema.budgetItems.hasItemCustomization,
      itemCustomizationValue: schema.budgetItems.itemCustomizationValue,
      itemCustomizationDescription: schema.budgetItems.itemCustomizationDescription,
      customizationPhoto: schema.budgetItems.customizationPhoto,
      productWidth: schema.budgetItems.productWidth,
      productHeight: schema.budgetItems.productHeight,
      productDepth: schema.budgetItems.productDepth,
      producerId: schema.budgetItems.producerId,
      selectedCustomizationId: schema.budgetItems.selectedCustomizationId,
      additionalCustomizationNotes: schema.budgetItems.additionalCustomizationNotes,
      hasGeneralCustomization: schema.budgetItems.hasGeneralCustomization,
      generalCustomizationName: schema.budgetItems.generalCustomizationName,
      generalCustomizationValue: schema.budgetItems.generalCustomizationValue,
      hasItemDiscount: schema.budgetItems.hasItemDiscount,
      itemDiscountType: schema.budgetItems.itemDiscountType,
      itemDiscountPercentage: schema.budgetItems.itemDiscountPercentage,
      itemDiscountValue: schema.budgetItems.itemDiscountValue,
      purchaseStatus: schema.budgetItems.purchaseStatus,
      productName: schema.products.name,
    })
      .from(schema.budgetItems)
      .leftJoin(schema.products, eq(schema.budgetItems.productId, schema.products.id))
      .where(eq(schema.budgetItems.budgetId, budgetId));
    
    return items as BudgetItem[];
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

  async updateBudgetItemPurchaseStatus(itemId: string, purchaseStatus: string): Promise<any> {
    const results = await pg.update(schema.budgetItems)
      .set({ 
        purchaseStatus,
        updatedAt: new Date()
      })
      .where(eq(schema.budgetItems.id, itemId))
      .returning();
    
    return results.length > 0 ? results[0] : null;
  }

  async checkAllItemsInStore(orderId: string): Promise<boolean> {
    const orderResults = await pg.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    if (orderResults.length === 0 || !orderResults[0].budgetId) return false;
    
    const order = orderResults[0];
    
    const items = await pg.select().from(schema.budgetItems)
      .where(eq(schema.budgetItems.budgetId, order.budgetId));
    
    const externalItems = items.filter(item => item.producerId && item.producerId !== 'internal');
    
    if (externalItems.length === 0) return true;
    
    return externalItems.every(item => item.purchaseStatus === 'in_store');
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
    // Get existing accounts receivable from database
    const existingAR = await pg.select().from(schema.accountsReceivable)
      .orderBy(desc(schema.accountsReceivable.createdAt));

    // Also generate accounts receivable from converted budgets that don't have AR entries
    const convertedBudgets = await pg.select().from(schema.budgets)
      .where(eq(schema.budgets.status, 'converted'));
    
    // Get payment info for budgets
    const paymentInfos = await pg.select().from(schema.budgetPaymentInfo);
    const paymentInfoMap = new Map(paymentInfos.map(pi => [pi.budgetId, pi]));

    // Create virtual AR entries for converted budgets
    const budgetARs: AccountsReceivable[] = [];
    for (const budget of convertedBudgets) {
      // Skip if already has AR entry
      if (existingAR.some(ar => ar.orderId === budget.id)) continue;
      
      const paymentInfo = paymentInfoMap.get(budget.id);
      const totalValue = parseFloat(budget.totalValue || '0');
      const paidValue = parseFloat(budget.paidValue || '0');
      const remainingAmount = totalValue - paidValue;
      
      if (remainingAmount > 0) {
        budgetARs.push({
          id: `ar-${budget.id}`,
          orderId: budget.id,
          clientId: budget.clientId,
          vendorId: budget.vendorId,
          branchId: budget.branchId,
          amount: budget.totalValue,
          receivedAmount: budget.paidValue || '0',
          status: paidValue >= totalValue ? 'paid' : (paidValue > 0 ? 'partial' : 'pending'),
          dueDate: budget.deliveryDeadline,
          description: budget.title,
          createdAt: budget.createdAt,
          updatedAt: budget.updatedAt,
        } as any);
      }
    }

    return [...existingAR, ...budgetARs].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
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

  async updateAccountsReceivableForOrder(order: Order): Promise<void> {
    try {
      const existingAR = await this.getAccountsReceivableByOrder(order.id);
      
      if (existingAR.length === 0) {
        // Create new accounts receivable if none exists
        await this.createAccountsReceivableForOrder(order);
        console.log(`Created accounts receivable for order ${order.orderNumber}`);
        return;
      }

      // Update existing accounts receivable
      const ar = existingAR[0];
      
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

      await pg.update(schema.accountsReceivable)
        .set({
          amount: order.totalValue,
          receivedAmount: paidValue,
          minimumPayment: minimumPaymentValue,
          status: status,
          dueDate: dueDate,
          updatedAt: new Date()
        })
        .where(eq(schema.accountsReceivable.id, ar.id));

      console.log(`Updated accounts receivable for order ${order.orderNumber}: amount=${order.totalValue}, downPayment=${downPayment}, minimumPayment=${minimumPaymentValue}`);
    } catch (error) {
      console.error(`Error updating accounts receivable for order ${order.id}:`, error);
    }
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
    try {
      const result = await pg.select().from(schema.bankTransactions).orderBy(desc(schema.bankTransactions.date));

      return result.map(row => ({
        id: row.id,
        importId: row.importId,
        fitId: row.fitId || '',
        date: row.date,
        hasValidDate: row.hasValidDate || false,
        amount: row.amount,
        description: row.description || '',
        memo: row.memo || '',
        bankRef: row.bankRef || '',
        originalType: row.originalType || '',
        type: row.type || 'other',
        status: row.status || 'unmatched',
        matchedOrderId: row.matchedOrderId || null,
        matchedPaymentId: row.matchedPaymentId || null,
        matchedAt: row.matchedAt || null,
        notes: row.notes || '',
        matchedEntityType: row.matchedEntityType || null,
        matchedEntityId: row.matchedEntityId || null
      }));
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
      return [];
    }
  }

  async getBankTransaction(id: string): Promise<BankTransaction | undefined> {
    try {
      const result = await pg.select().from(schema.bankTransactions)
        .where(eq(schema.bankTransactions.id, id))
        .limit(1);

      if (result.length === 0) {
        return undefined;
      }

      const row = result[0];
      return {
        id: row.id,
        importId: row.importId,
        fitId: row.fitId || '',
        date: row.date,
        hasValidDate: row.hasValidDate || false,
        amount: row.amount,
        description: row.description || '',
        memo: row.memo || '',
        bankRef: row.bankRef || '',
        originalType: row.originalType || '',
        type: row.type || 'other',
        status: row.status || 'unmatched',
        matchedOrderId: row.matchedOrderId || null,
        matchedPaymentId: row.matchedPaymentId || null,
        matchedAt: row.matchedAt || null,
        notes: row.notes || '',
        matchedEntityType: row.matchedEntityType || null,
        matchedEntityId: row.matchedEntityId || null
      };
    } catch (error) {
      console.error('Error fetching bank transaction by id:', error);
      return undefined;
    }
  }

  async getBankTransactionByFitId(fitId: string): Promise<BankTransaction | null> {
    try {
      const result = await pg.select().from(schema.bankTransactions).where(eq(schema.bankTransactions.fitId, fitId)).limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        id: row.id,
        importId: row.importId,
        fitId: row.fitId || '',
        date: row.date,
        hasValidDate: row.hasValidDate || false,
        amount: row.amount,
        description: row.description || '',
        memo: row.memo || '',
        bankRef: row.bankRef || '',
        originalType: row.originalType || '',
        type: row.type || 'other',
        status: row.status || 'unmatched',
        matchedOrderId: row.matchedOrderId || null,
        matchedPaymentId: row.matchedPaymentId || null,
        matchedAt: row.matchedAt || null,
        notes: row.notes || '',
        matchedEntityType: row.matchedEntityType || null,
        matchedEntityId: row.matchedEntityId || null
      };
    } catch (error) {
      console.error('Error fetching bank transaction by fitId:', error);
      return null;
    }
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

  async getExpenses(): Promise<ExpenseNote[]> {
    return await this.getExpenseNotes();
  }

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

  async createManualReceivable(data: InsertManualReceivable): Promise<ManualReceivable> {
    const results = await pg.insert(schema.manualReceivables).values(data).returning();
    return results[0];
  }

  async getManualReceivables(): Promise<ManualReceivable[]> {
    return await pg.select().from(schema.manualReceivables)
      .orderBy(desc(schema.manualReceivables.createdAt));
  }

  async createManualPayable(data: InsertManualPayable): Promise<ManualPayable> {
    const results = await pg.insert(schema.manualPayables).values({
      beneficiary: data.beneficiary,
      description: data.description,
      amount: data.amount,
      dueDate: data.dueDate,
      category: data.category || 'Outros',
      notes: data.notes || null,
      attachmentUrl: data.attachmentUrl || null,
      attachmentUrl2: (data as any).attachmentUrl2 || null,
      status: data.status || 'pending',
      branchId: (data as any).branchId || null,
      orderId: (data as any).orderId || null,
      clientId: (data as any).clientId || null,
    }).returning();
    return results[0];
  }

  async getManualPayables(): Promise<ManualPayable[]> {
    return await pg.select().from(schema.manualPayables)
      .orderBy(desc(schema.manualPayables.createdAt));
  }

  async getManualPayable(id: string): Promise<ManualPayable | undefined> {
    const results = await pg.select().from(schema.manualPayables)
      .where(eq(schema.manualPayables.id, id));
    return results[0];
  }

  async updateManualPayable(id: string, updates: Partial<InsertManualPayable>): Promise<ManualPayable | undefined> {
    const results = await pg.update(schema.manualPayables)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.manualPayables.id, id))
      .returning();
    return results[0];
  }

  // ==================== CUSTOMIZATION OPTIONS ====================

  async createCustomizationOption(data: InsertCustomizationOption): Promise<CustomizationOption> {
    console.log('Creating customization option with data:', data);

    const results = await pg.insert(schema.customizationOptions).values({
      name: data.name,
      description: data.description || null,
      category: data.category,
      minQuantity: data.minQuantity,
      price: data.price,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('Created customization option:', results[0]);
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

  async getCustomizationCategories(): Promise<string[]> {
    const customizations = await pg.select({
      category: schema.customizationOptions.category
    }).from(schema.customizationOptions)
      .where(eq(schema.customizationOptions.isActive, true));

    const categorySet = new Set<string>();
    customizations.forEach(customization => {
      if (customization.category && typeof customization.category === 'string') {
        categorySet.add(customization.category);
      }
    });

    return Array.from(categorySet).sort();
  }

  async createCustomizationCategory(name: string): Promise<{ name: string }> {
    // Por enquanto, retornar a categoria diretamente
    // Em implementações futuras, poderia ser salva em uma tabela separada
    return { name };
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
    // Get client info for contact name
    const clientUser = await pg.select().from(schema.users)
      .where(eq(schema.users.id, data.clientId))
      .limit(1);
    
    const contactName = clientUser[0]?.name || 'Cliente';
    
    // Fetch product details including basePrice
    const enrichedProducts = await Promise.all(
      data.products.map(async (product: any) => {
        if (!product.quantity || product.quantity <= 0) {
          throw new Error(`Invalid quantity for product: ${product.productId}`);
        }
        
        const productDetails = await pg.select().from(schema.products)
          .where(eq(schema.products.id, product.productId))
          .limit(1);
        
        if (!productDetails[0]) {
          throw new Error(`Product not found: ${product.productId}`);
        }
        
        const basePrice = productDetails[0].basePrice;
        const basePriceNum = parseFloat(basePrice || '0');
        
        if (!basePrice || isNaN(basePriceNum) || basePriceNum <= 0) {
          throw new Error(`Product ${product.productId} has invalid price: ${basePrice}`);
        }
        
        const lineTotal = (basePriceNum * product.quantity).toFixed(2);
        
        return {
          ...product,
          basePrice: basePrice,  // Keep as string from database
          unitPrice: basePrice,   // For frontend compatibility
          lineTotal: lineTotal    // Calculated total for this line
        };
      })
    );

    // Calculate total estimated value
    const totalEstimatedValue = enrichedProducts.reduce((sum: number, product: any) => {
      return sum + (parseFloat(product.basePrice) * product.quantity);
    }, 0);

    // Create main quote request
    const quoteRequestResults = await pg.insert(schema.quoteRequests).values({
      clientId: data.clientId,
      vendorId: data.vendorId,
      contactName: contactName,
      whatsapp: clientUser[0]?.phone || null,
      email: clientUser[0]?.email || null,
      observations: data.observations || null,
      totalEstimatedValue: totalEstimatedValue.toFixed(2),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    const quoteRequest = quoteRequestResults[0];

    // Create quote request items
    if (enrichedProducts && enrichedProducts.length > 0) {
      await pg.insert(schema.quoteRequestItems).values(
        enrichedProducts.map((product: any) => ({
          quoteRequestId: quoteRequest.id,
          productId: product.productId,
          productName: product.productName,
          quantity: product.quantity,
          basePrice: product.basePrice,  // Already a string from database
          category: product.category || null,
          imageLink: product.imageLink || null,
          observations: product.observations || null,
          createdAt: new Date()
        }))
      );
    }

    return {
      ...quoteRequest,
      totalEstimatedValue: totalEstimatedValue.toFixed(2),  // Ensure it's a string
      items: enrichedProducts
    };
  }

  async createQuoteRequest(data: any): Promise<any> {
    const results = await pg.insert(schema.quoteRequests).values({
      ...data,
      createdAt: new Date()
    }).returning();
    return results[0];
  }

  async getQuoteRequestsByVendor(vendorId: string): Promise<any[]> {
    const quoteRequests = await pg.select().from(schema.quoteRequests)
      .where(eq(schema.quoteRequests.vendorId, vendorId))
      .orderBy(desc(schema.quoteRequests.createdAt));
    
    // Enrich with items
    const enriched = await Promise.all(
      quoteRequests.map(async (qr) => {
        const items = await pg.select().from(schema.quoteRequestItems)
          .where(eq(schema.quoteRequestItems.quoteRequestId, qr.id));
        return { ...qr, items };
      })
    );
    
    return enriched;
  }

  async getQuoteRequestsByClient(clientId: string): Promise<any[]> {
    const quoteRequests = await pg.select().from(schema.quoteRequests)
      .where(eq(schema.quoteRequests.clientId, clientId))
      .orderBy(desc(schema.quoteRequests.createdAt));
    
    // Enrich with items
    const enriched = await Promise.all(
      quoteRequests.map(async (qr) => {
        const items = await pg.select().from(schema.quoteRequestItems)
          .where(eq(schema.quoteRequestItems.quoteRequestId, qr.id));
        return { ...qr, items };
      })
    );
    
    return enriched;
  }

  async getQuoteRequestById(id: string): Promise<any> {
    const results = await pg.select().from(schema.quoteRequests)
      .where(eq(schema.quoteRequests.id, id));
    
    if (!results[0]) {
      return undefined;
    }
    
    // Enrich with items
    const items = await pg.select().from(schema.quoteRequestItems)
      .where(eq(schema.quoteRequestItems.quoteRequestId, results[0].id));
    
    return { ...results[0], items };
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

  async deleteVendor(id: string): Promise<boolean> {
    // Primeiro deletar registro da tabela vendors
    await pg.delete(schema.vendors).where(eq(schema.vendors.userId, id));
    // Depois deletar usuário
    await pg.delete(schema.users).where(eq(schema.users.id, id));
    return true;
  }

  async deleteProducer(id: string): Promise<boolean> {
    try {
      console.log(`Deleting producer: ${id}`);

      // Verificar se o usuário existe e é um produtor
      const user = await pg.select().from(schema.users)
        .where(and(eq(schema.users.id, id), eq(schema.users.role, 'producer')));

      if (user.length === 0) {
        console.log(`Producer not found or not a producer: ${id}`);
        return false;
      }

      // Desativar produtos do produtor em vez de deletá-los (para manter histórico)
      await pg.update(schema.products)
        .set({ isActive: false })
        .where(eq(schema.products.producerId, id));

      // Deletar o usuário produtor
      const result = await pg.delete(schema.users).where(eq(schema.users.id, id)).returning();

      console.log(`Producer ${id} deleted successfully`);
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting producer ${id}:`, error);
      return false;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    // Deletar usuário genérico
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
    vendorId?: string;
    limit?: number;
  }): Promise<SystemLog[]> {
    const conditions = [];
    const limitCount = filters?.limit || 200;

    if (filters?.userId) {
      conditions.push(eq(schema.systemLogs.userId, filters.userId));
    }

    if (filters?.action) {
      conditions.push(eq(schema.systemLogs.action, filters.action));
    }

    if (filters?.level) {
      conditions.push(eq(schema.systemLogs.level, filters.level));
    }

    // Filtro por vendedor: mostra logs do vendedor + logs de seus clientes
    if (filters?.vendorId) {
      conditions.push(
        or(
          eq(schema.systemLogs.userId, filters.vendorId),
          eq(schema.systemLogs.vendorId, filters.vendorId)
        )!
      );
    }

    if (conditions.length > 0) {
      return await pg.select().from(schema.systemLogs)
        .where(and(...conditions))
        .orderBy(desc(schema.systemLogs.createdAt))
        .limit(limitCount);
    }

    return await pg.select().from(schema.systemLogs)
      .orderBy(desc(schema.systemLogs.createdAt))
      .limit(limitCount);
  }

  async createSystemLog(logData: InsertSystemLog): Promise<SystemLog> {
    try {
      const results = await pg.insert(schema.systemLogs).values({
        ...logData,
        createdAt: new Date()
      } as any).returning();
      return results[0];
    } catch (error) {
      console.error('Error creating system log:', error);
      throw error;
    }
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
    userAgent?: string,
    vendorId?: string
  ): Promise<void> {
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
        level: level || 'info',
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      });
    } catch (error) {
      // Log errors silently - don't break the main operation
      console.error('Failed to log user action (non-blocking):', error);
    }
  }

  // ==================== PRICING / FORMAÇÃO DE PREÇO ====================

  async getPricingSettings(): Promise<any> {
    const results = await pg.select().from(schema.pricingSettings)
      .where(eq(schema.pricingSettings.isActive, true))
      .limit(1);
    return results[0] || null;
  }

  async updatePricingSettings(id: string, updates: any): Promise<any> {
    const results = await pg.update(schema.pricingSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.pricingSettings.id, id))
      .returning();
    return results[0];
  }

  async getPricingMarginTiers(settingsId: string): Promise<any[]> {
    return await pg.select().from(schema.pricingMarginTiers)
      .where(eq(schema.pricingMarginTiers.settingsId, settingsId))
      .orderBy(schema.pricingMarginTiers.displayOrder);
  }

  async createPricingMarginTier(tierData: any): Promise<any> {
    const results = await pg.insert(schema.pricingMarginTiers)
      .values(tierData)
      .returning();
    return results[0];
  }

  async updatePricingMarginTier(id: string, updates: any): Promise<any> {
    const results = await pg.update(schema.pricingMarginTiers)
      .set(updates)
      .where(eq(schema.pricingMarginTiers.id, id))
      .returning();
    return results[0];
  }

  async deletePricingMarginTier(id: string): Promise<void> {
    await pg.delete(schema.pricingMarginTiers)
      .where(eq(schema.pricingMarginTiers.id, id));
  }
}

// Export singleton instance
export const pgStorage = new PgStorage();