import { 
  type User, 
  type InsertUser, 
  type Order, 
  type InsertOrder,
  type ProductionOrder,
  type InsertProductionOrder,
  type Payment,
  type InsertPayment,
  type Commission,
  type InsertCommission,
  type Vendor,
  type InsertVendor
} from "@shared/schema";
import { randomUUID } from "crypto";

// Mock data for orders, budgets, and products (to be replaced with actual storage operations)
let mockOrders: Order[] = [];
let mockBudgets: any[] = [];
let mockProducts: any[] = [];


export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  getOrdersByVendor(vendorId: string): Promise<Order[]>;
  getOrdersByClient(clientId: string): Promise<Order[]>;

  // Production Orders
  getProductionOrders(): Promise<ProductionOrder[]>;
  getProductionOrdersByProducer(producerId: string): Promise<ProductionOrder[]>;
  createProductionOrder(productionOrder: InsertProductionOrder): Promise<ProductionOrder>;
  updateProductionOrderStatus(id: string, status: string): Promise<ProductionOrder | undefined>;

  // Payments
  getPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByOrder(orderId: string): Promise<Payment[]>;

  // Commissions
  getCommissionsByVendor(vendorId: string): Promise<Commission[]>;
  createCommission(commission: InsertCommission): Promise<Commission>;

  // Vendors
  getVendor(userId: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;

  // Products
  getProducts(): Promise<any[]>;
  getProduct(id: string): Promise<any>;
  createProduct(productData: any): Promise<any>;
  updateProduct(id: string, productData: any): Promise<any>;
  deleteProduct(id: string): Promise<boolean>;
  importProducts(productsData: any[]): Promise<{ imported: number; errors: any[] }>;

  // Budgets
  getBudgets(): Promise<any[]>;
  getBudget(id: string): Promise<any>;
  getBudgetsByVendor(vendorId: string): Promise<any[]>;
  getBudgetsByClient(clientId: string): Promise<any[]>;
  createBudget(budgetData: any): Promise<any>;
  updateBudget(id: string, budgetData: any): Promise<any>;
  deleteBudget(id: string): Promise<boolean>;
  convertBudgetToOrder(budgetId: string): Promise<any>;
  
  // Budget Items
  getBudgetItems(budgetId: string): Promise<any[]>;
  createBudgetItem(budgetId: string, itemData: any): Promise<any>;
  updateBudgetItem(itemId: string, itemData: any): Promise<any>;
  deleteBudgetItem(itemId: string): Promise<boolean>;
  
  // Budget Photos
  getBudgetPhotos(budgetId: string): Promise<any[]>;
  createBudgetPhoto(budgetId: string, photoData: any): Promise<any>;
  deleteBudgetPhoto(photoId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private orders: Map<string, Order>;
  private productionOrders: Map<string, ProductionOrder>;
  private payments: Map<string, Payment>;
  private commissions: Map<string, Commission>;
  private vendors: Map<string, Vendor>;

  constructor() {
    this.users = new Map();
    this.orders = new Map();
    this.productionOrders = new Map();
    this.payments = new Map();
    this.commissions = new Map();
    this.vendors = new Map();
    this.initializeData();
  }

  private initializeData() {
    // Create sample users
    const adminUser: User = {
      id: "admin-1",
      username: "admin",
      password: "123",
      role: "admin",
      name: "Administrador",
      email: "admin@erp.com"
    };

    const vendorUser: User = {
      id: "vendor-1", 
      username: "maria.santos",
      password: "123",
      role: "vendor",
      name: "Maria Santos",
      email: "maria@erp.com"
    };

    const clientUser: User = {
      id: "client-1",
      username: "joao.silva",
      password: "123", 
      role: "client",
      name: "João Silva",
      email: "joao@gmail.com"
    };

    const producerUser: User = {
      id: "producer-1",
      username: "marcenaria.santos",
      password: "123",
      role: "producer", 
      name: "Marcenaria Santos",
      email: "contato@marcenariasantos.com"
    };

    const financeUser: User = {
      id: "finance-1",
      username: "financeiro",
      password: "123",
      role: "finance",
      name: "Departamento Financeiro", 
      email: "financeiro@erp.com"
    };

    [adminUser, vendorUser, clientUser, producerUser, financeUser].forEach(user => {
      this.users.set(user.id, user);
    });

    // Create vendor profile
    const vendor: Vendor = {
      id: "vendor-profile-1",
      userId: "vendor-1",
      salesLink: "https://erp.com/v/maria123",
      commissionRate: "10.00",
      isActive: true
    };
    this.vendors.set(vendor.id, vendor);

    // Create sample orders
    mockOrders = [
      {
        id: "order-1",
        orderNumber: "#12345",
        clientId: "client-1",
        vendorId: "vendor-1", 
        producerId: "producer-1",
        product: "Mesa de Jantar Personalizada",
        description: "Mesa de madeira maciça para 6 pessoas",
        totalValue: "2450.00",
        paidValue: "735.00",
        status: "production",
        deadline: new Date("2024-11-22"),
        createdAt: new Date("2024-11-15"),
        updatedAt: new Date("2024-11-16")
      },
      {
        id: "order-2", 
        orderNumber: "#12346",
        clientId: "client-1",
        vendorId: "vendor-1",
        producerId: null,
        product: "Estante Personalizada",
        description: "Estante de madeira com 5 prateleiras",
        totalValue: "1890.00", 
        paidValue: "567.00",
        status: "pending",
        deadline: new Date("2024-11-25"),
        createdAt: new Date("2024-11-14"),
        updatedAt: new Date("2024-11-14")
      }
    ];

    mockOrders.forEach(order => {
      this.orders.set(order.id, order);
    });

    // Create production order
    const productionOrder: ProductionOrder = {
      id: "po-1",
      orderId: "order-1",
      producerId: "producer-1",
      status: "production",
      deadline: new Date("2024-11-20"),
      acceptedAt: new Date("2024-11-16"),
      completedAt: null,
      notes: "Produção iniciada conforme especificações"
    };
    this.productionOrders.set(productionOrder.id, productionOrder);

    // Create sample payment
    const payment: Payment = {
      id: "payment-1",
      orderId: "order-1", 
      amount: "735.00",
      method: "pix",
      status: "confirmed",
      transactionId: "PIX123456789",
      paidAt: new Date("2024-11-15"),
      createdAt: new Date("2024-11-15")
    };
    this.payments.set(payment.id, payment);

    // Create commission
    const commission: Commission = {
      id: "commission-1",
      vendorId: "vendor-1",
      orderId: "order-1", 
      percentage: "10.00",
      amount: "245.00",
      status: "pending",
      paidAt: null,
      createdAt: new Date("2024-11-15")
    };
    this.commissions.set(commission.id, commission);

    // Initialize mock budgets
    mockBudgets = [
      {
        id: 'budget-1',
        budgetNumber: 'ORC-001',
        clientId: 'client-1',
        vendorId: 'vendor-1',
        title: 'Móveis para Sala de Jantar',
        description: 'Conjunto completo para sala de jantar',
        totalValue: '8500.00',
        status: 'sent',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'budget-2',
        budgetNumber: 'ORC-002',
        clientId: 'client-2',
        vendorId: 'vendor-1',
        title: 'Estante Personalizada',
        description: 'Estante sob medida para escritório',
        totalValue: '3200.00',
        status: 'approved',
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Initialize mock products
    mockProducts = [
      {
        id: 'product-1',
        name: 'Mesa de Jantar Clássica',
        description: 'Mesa de madeira maciça com acabamento premium',
        category: 'Móveis',
        basePrice: '2500.00',
        unit: 'un',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'product-2',
        name: 'Cadeira Estofada',
        description: 'Cadeira com estofado em couro sintético',
        category: 'Móveis',
        basePrice: '450.00',
        unit: 'un',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'product-3',
        name: 'Estante Modular',
        description: 'Estante com módulos personalizáveis',
        category: 'Móveis',
        basePrice: '1200.00',
        unit: 'm',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  // Order methods
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = { 
      ...insertOrder, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      const updatedOrder = { ...order, status, updatedAt: new Date() };
      this.orders.set(id, updatedOrder);
      return updatedOrder;
    }
    return undefined;
  }

  async getOrdersByVendor(vendorId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.vendorId === vendorId);
  }

  async getOrdersByClient(clientId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.clientId === clientId);
  }

  // Production Order methods
  async getProductionOrders(): Promise<ProductionOrder[]> {
    return Array.from(this.productionOrders.values());
  }

  async getProductionOrdersByProducer(producerId: string): Promise<ProductionOrder[]> {
    return Array.from(this.productionOrders.values()).filter(po => po.producerId === producerId);
  }

  async createProductionOrder(insertProductionOrder: InsertProductionOrder): Promise<ProductionOrder> {
    const id = randomUUID();
    const productionOrder: ProductionOrder = { ...insertProductionOrder, id };
    this.productionOrders.set(id, productionOrder);
    return productionOrder;
  }

  async updateProductionOrderStatus(id: string, status: string): Promise<ProductionOrder | undefined> {
    const productionOrder = this.productionOrders.get(id);
    if (productionOrder) {
      const updatedPO = { ...productionOrder, status };
      this.productionOrders.set(id, updatedPO);
      return updatedPO;
    }
    return undefined;
  }

  // Payment methods
  async getPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = { 
      ...insertPayment, 
      id,
      createdAt: new Date()
    };
    this.payments.set(id, payment);
    return payment;
  }

  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(payment => payment.orderId === orderId);
  }

  // Commission methods
  async getCommissionsByVendor(vendorId: string): Promise<Commission[]> {
    return Array.from(this.commissions.values()).filter(commission => commission.vendorId === vendorId);
  }

  async createCommission(insertCommission: InsertCommission): Promise<Commission> {
    const id = randomUUID();
    const commission: Commission = { 
      ...insertCommission, 
      id,
      createdAt: new Date()
    };
    this.commissions.set(id, commission);
    return commission;
  }

  // Vendor methods
  async getVendor(userId: string): Promise<Vendor | undefined> {
    return Array.from(this.vendors.values()).find(vendor => vendor.userId === userId);
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const id = randomUUID();
    const vendor: Vendor = { ...insertVendor, id };
    this.vendors.set(id, vendor);
    return vendor;
  }

  async updateVendorCommission(userId: string, commissionRate: string): Promise<void> {
    const vendor = Array.from(this.vendors.values()).find(v => v.userId === userId);
    if (vendor) {
      const updatedVendor = { ...vendor, commissionRate };
      this.vendors.set(vendor.id, updatedVendor);
    }
  }

  // Product methods
  async getProducts(): Promise<any[]> {
    return mockProducts;
  }

  async createProduct(productData: any): Promise<any> {
    const newProduct = {
      id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...productData,
      basePrice: productData.basePrice.toString(), // Ensure it's a string
      isActive: productData.isActive !== undefined ? productData.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockProducts.push(newProduct); // Add to mockProducts
    return newProduct;
  }

  // Budget methods
  async getBudgets(): Promise<any[]> {
    return mockBudgets;
  }

  async getBudgetsByVendor(vendorId: string): Promise<any[]> {
    return mockBudgets.filter(budget => budget.vendorId === vendorId);
  }

  async createBudget(budgetData: any): Promise<any> {
    const newBudget = {
      id: `budget-${Date.now()}`,
      budgetNumber: `ORC-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      ...budgetData,
      totalValue: '0.00',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockBudgets.push(newBudget); // Add to mockBudgets
    return newBudget;
  }

  async convertBudgetToOrder(budgetId: string): Promise<any> {
    const budget = mockBudgets.find(b => b.id === budgetId);

    if (!budget) {
      throw new Error('Budget not found');
    }

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      orderNumber: `#${Math.floor(Math.random() * 100000)}`,
      clientId: budget.clientId,
      vendorId: budget.vendorId,
      product: budget.title,
      description: budget.description,
      totalValue: budget.totalValue,
      paidValue: '0',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockOrders.push(newOrder); // Add to mockOrders
    this.orders.set(newOrder.id, newOrder); // Also update the map
    return newOrder;
  }
}

export const storage = new MemStorage();