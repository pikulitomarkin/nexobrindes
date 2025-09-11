import { 
  type User, 
  type InsertUser, 
  type Client,
  type InsertClient,
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
let mockBudgetItems: any[] = [];
let mockBudgetPhotos: any[] = [];


export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
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
  getVendors(): Promise<User[]>;
  getVendor(userId: string): Promise<Vendor | undefined>;
  createVendor(vendorData: any): Promise<User>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(clientData: InsertClient): Promise<Client>;
  updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Products
  getProducts(options?: { 
    page?: number; 
    limit?: number; 
    search?: string;
    category?: string;
  }): Promise<{ products: any[]; total: number; page: number; totalPages: number; }>;
  getProduct(id: string): Promise<any>;
  createProduct(productData: any): Promise<any>;
  updateProduct(id: string, productData: any): Promise<any>;
  deleteProduct(id: string): Promise<boolean>;
  importProducts(productsData: any[]): Promise<{ imported: number; errors: any[] }>;
  searchProducts(query: string): Promise<any[]>;

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
  private clients: Map<string, Client>;
  private orders: Map<string, Order>;
  private productionOrders: Map<string, ProductionOrder>;
  private payments: Map<string, Payment>;
  private commissions: Map<string, Commission>;
  private vendors: Map<string, Vendor>;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
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
      email: "admin@erp.com",
      phone: null,
      vendorId: null,
      isActive: true
    };

    const vendorUser: User = {
      id: "vendor-1", 
      username: "maria.santos",
      password: "123",
      role: "vendor",
      name: "Maria Santos",
      email: "maria@erp.com",
      phone: null,
      vendorId: null,
      isActive: true
    };

    const clientUser: User = {
      id: "client-1",
      username: "joao.silva",
      password: "123", 
      role: "client",
      name: "João Silva",
      email: "joao@gmail.com",
      phone: null,
      vendorId: "vendor-1",
      isActive: true
    };

    const producerUser: User = {
      id: "producer-1",
      username: "marcenaria.santos",
      password: "123",
      role: "producer", 
      name: "Marcenaria Santos",
      email: "contato@marcenariasantos.com",
      phone: null,
      vendorId: null,
      isActive: true
    };

    const financeUser: User = {
      id: "finance-1",
      username: "financeiro",
      password: "123",
      role: "finance",
      name: "Departamento Financeiro", 
      email: "financeiro@erp.com",
      phone: null,
      vendorId: null,
      isActive: true
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

    // Create sample clients
    const sampleClient: Client = {
      id: "client-1",
      userId: "client-1", 
      name: "João Silva",
      email: "joao@gmail.com",
      phone: "(11) 98765-4321",
      whatsapp: "(11) 98765-4321",
      cpfCnpj: "123.456.789-00",
      address: "Rua das Flores, 123, São Paulo, SP",
      vendorId: "vendor-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.clients.set(sampleClient.id, sampleClient);

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

  // User methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  // Vendor methods
  async getVendors(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === 'vendor');
  }

  async createVendor(vendorData: any): Promise<User> {
    const newUser: User = {
      id: `vendor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'vendor',
      phone: null,
      vendorId: null,
      isActive: true,
      email: vendorData.email || null,
      ...vendorData
    };
    
    this.users.set(newUser.id, newUser);
    
    // Also create vendor profile
    const vendorProfile: Vendor = {
      id: `vendor-profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: newUser.id,
      salesLink: vendorData.salesLink || null,
      commissionRate: vendorData.commissionRate || "10.00",
      isActive: true
    };
    
    this.vendors.set(vendorProfile.id, vendorProfile);
    return newUser;
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = {
      ...clientData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (client) {
      const updatedClient = {
        ...client,
        ...clientData,
        updatedAt: new Date()
      };
      this.clients.set(id, updatedClient);
      return updatedClient;
    }
    return undefined;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clients.delete(id);
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
  async getProducts(options?: { 
    page?: number; 
    limit?: number; 
    search?: string;
    category?: string;
  }): Promise<{ products: any[]; total: number; page: number; totalPages: number; }> {
    let filteredProducts = [...mockProducts];

    // Apply search filter
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      filteredProducts = filteredProducts.filter(product =>
        (product.name?.toLowerCase() || '').includes(searchLower) ||
        (product.description?.toLowerCase() || '').includes(searchLower) ||
        (product.category?.toLowerCase() || '').includes(searchLower) ||
        (product.externalCode?.toLowerCase() || '').includes(searchLower) ||
        (product.compositeCode?.toLowerCase() || '').includes(searchLower) ||
        (product.friendlyCode?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Apply category filter
    if (options?.category) {
      filteredProducts = filteredProducts.filter(product =>
        product.category === options.category
      );
    }

    const total = filteredProducts.length;
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const totalPages = Math.ceil(total / limit);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const products = filteredProducts.slice(startIndex, endIndex);

    return { products, total, page, totalPages };
  }

  async getProduct(id: string): Promise<any> {
    return mockProducts.find(product => product.id === id);
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

  async updateProduct(id: string, productData: any): Promise<any> {
    const productIndex = mockProducts.findIndex(product => product.id === id);
    if (productIndex === -1) {
      throw new Error('Product not found');
    }

    const updatedProduct = {
      ...mockProducts[productIndex],
      ...productData,
      updatedAt: new Date().toISOString()
    };
    mockProducts[productIndex] = updatedProduct;
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const productIndex = mockProducts.findIndex(product => product.id === id);
    if (productIndex === -1) {
      return false;
    }

    mockProducts.splice(productIndex, 1);
    return true;
  }

  async importProducts(productsData: any[]): Promise<{ imported: number; errors: any[] }> {
    let imported = 0;
    const errors: any[] = [];

    for (const item of productsData) {
      try {
        // Map the JSON structure to our product schema
        const productData = {
          name: item.Nome || item.name || 'Produto Sem Nome',
          description: item.Descricao || item.description || '',
          category: item.WebTipo || item.category || 'Sem Categoria',
          basePrice: (item.PrecoVenda || item.basePrice || 0).toString(),
          unit: 'un',
          isActive: true,
          
          // Campos específicos do JSON XBZ
          externalId: item.IdProduto?.toString(),
          externalCode: item.CodigoXbz,
          compositeCode: item.CodigoComposto,
          friendlyCode: item.CodigoAmigavel,
          siteLink: item.SiteLink,
          imageLink: item.ImageLink,
          mainColor: item.CorWebPrincipal,
          secondaryColor: item.CorWebSecundaria,
          weight: item.Peso?.toString(),
          height: item.Altura?.toString(),
          width: item.Largura?.toString(),
          depth: item.Profundidade?.toString(),
          availableQuantity: item.QuantidadeDisponivel,
          stockStatus: item.StatusConfiabilidade,
          ncm: item.Ncm
        };

        await this.createProduct(productData);
        imported++;
      } catch (error) {
        errors.push({
          item: item.Nome || item.name || 'Produto sem nome',
          error: (error as Error).message
        });
      }
    }

    return { imported, errors };
  }

  async searchProducts(query: string): Promise<any[]> {
    if (!query) return mockProducts;
    
    const searchLower = query.toLowerCase();
    return mockProducts.filter(product =>
      (product.name?.toLowerCase() || '').includes(searchLower) ||
      (product.description?.toLowerCase() || '').includes(searchLower) ||
      (product.category?.toLowerCase() || '').includes(searchLower) ||
      (product.externalCode?.toLowerCase() || '').includes(searchLower) ||
      (product.compositeCode?.toLowerCase() || '').includes(searchLower) ||
      (product.friendlyCode?.toLowerCase() || '').includes(searchLower)
    );
  }

  // Budget methods
  async getBudgets(): Promise<any[]> {
    return mockBudgets;
  }

  async getBudget(id: string): Promise<any> {
    return mockBudgets.find(budget => budget.id === id);
  }

  async getBudgetsByVendor(vendorId: string): Promise<any[]> {
    return mockBudgets.filter(budget => budget.vendorId === vendorId);
  }

  async getBudgetsByClient(clientId: string): Promise<any[]> {
    return mockBudgets.filter(budget => budget.clientId === clientId);
  }

  async createBudget(budgetData: any): Promise<any> {
    const newBudget = {
      id: `budget-${Date.now()}`,
      budgetNumber: `ORC-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      ...budgetData,
      totalValue: budgetData.totalValue || '0.00',
      status: budgetData.status || 'draft',
      hasCustomization: budgetData.hasCustomization || false,
      customizationPercentage: budgetData.customizationPercentage || '0.00',
      customizationValue: budgetData.customizationValue || '0.00',
      customizationDescription: budgetData.customizationDescription || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockBudgets.push(newBudget);
    return newBudget;
  }

  async updateBudget(id: string, budgetData: any): Promise<any> {
    const budgetIndex = mockBudgets.findIndex(budget => budget.id === id);
    if (budgetIndex === -1) {
      throw new Error('Budget not found');
    }

    const updatedBudget = {
      ...mockBudgets[budgetIndex],
      ...budgetData,
      updatedAt: new Date().toISOString()
    };
    mockBudgets[budgetIndex] = updatedBudget;
    return updatedBudget;
  }

  async deleteBudget(id: string): Promise<boolean> {
    const budgetIndex = mockBudgets.findIndex(budget => budget.id === id);
    if (budgetIndex === -1) {
      return false;
    }

    // Also delete related items and photos
    mockBudgetItems = mockBudgetItems.filter(item => item.budgetId !== id);
    mockBudgetPhotos = mockBudgetPhotos.filter(photo => photo.budgetId !== id);
    mockBudgets.splice(budgetIndex, 1);
    return true;
  }

  async convertBudgetToOrder(budgetId: string): Promise<any> {
    const budget = mockBudgets.find(b => b.id === budgetId);

    if (!budget) {
      throw new Error('Budget not found');
    }

    // Mark budget as converted
    await this.updateBudget(budgetId, { status: 'converted' });

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

    mockOrders.push(newOrder);
    this.orders.set(newOrder.id, newOrder);
    return newOrder;
  }

  // Budget Items methods
  async getBudgetItems(budgetId: string): Promise<any[]> {
    return mockBudgetItems.filter(item => item.budgetId === budgetId);
  }

  async createBudgetItem(budgetId: string, itemData: any): Promise<any> {
    const newItem = {
      id: `budget-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      budgetId,
      ...itemData,
      hasItemCustomization: itemData.hasItemCustomization || false,
      itemCustomizationPercentage: itemData.itemCustomizationPercentage || '0.00',
      itemCustomizationDescription: itemData.itemCustomizationDescription || ''
    };
    mockBudgetItems.push(newItem);

    // Recalculate budget total
    await this.recalculateBudgetTotal(budgetId);
    
    return newItem;
  }

  async updateBudgetItem(itemId: string, itemData: any): Promise<any> {
    const itemIndex = mockBudgetItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Budget item not found');
    }

    const updatedItem = {
      ...mockBudgetItems[itemIndex],
      ...itemData
    };
    mockBudgetItems[itemIndex] = updatedItem;

    // Recalculate budget total
    await this.recalculateBudgetTotal(updatedItem.budgetId);
    
    return updatedItem;
  }

  async deleteBudgetItem(itemId: string): Promise<boolean> {
    const itemIndex = mockBudgetItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return false;
    }

    const budgetId = mockBudgetItems[itemIndex].budgetId;
    mockBudgetItems.splice(itemIndex, 1);

    // Recalculate budget total
    await this.recalculateBudgetTotal(budgetId);
    
    return true;
  }

  // Budget Photos methods
  async getBudgetPhotos(budgetId: string): Promise<any[]> {
    return mockBudgetPhotos.filter(photo => photo.budgetId === budgetId);
  }

  async createBudgetPhoto(budgetId: string, photoData: any): Promise<any> {
    const newPhoto = {
      id: `budget-photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      budgetId,
      ...photoData,
      uploadedAt: new Date().toISOString()
    };
    mockBudgetPhotos.push(newPhoto);
    return newPhoto;
  }

  async deleteBudgetPhoto(photoId: string): Promise<boolean> {
    const photoIndex = mockBudgetPhotos.findIndex(photo => photo.id === photoId);
    if (photoIndex === -1) {
      return false;
    }

    mockBudgetPhotos.splice(photoIndex, 1);
    return true;
  }

  // Helper method to recalculate budget total
  private async recalculateBudgetTotal(budgetId: string): Promise<void> {
    const budget = await this.getBudget(budgetId);
    const items = await this.getBudgetItems(budgetId);
    
    if (!budget) return;

    let subtotal = items.reduce((sum, item) => {
      const itemPrice = parseFloat(item.totalPrice || '0');
      
      // Apply item customization if applicable
      if (item.hasItemCustomization) {
        const customizationPercentage = parseFloat(item.itemCustomizationPercentage || '0');
        const customizationAmount = itemPrice * (customizationPercentage / 100);
        return sum + itemPrice + customizationAmount;
      }
      
      return sum + itemPrice;
    }, 0);

    // Apply global customization if applicable
    if (budget.hasCustomization) {
      const customizationPercentage = parseFloat(budget.customizationPercentage || '0');
      const customizationAmount = subtotal * (customizationPercentage / 100);
      subtotal += customizationAmount;
      
      // Update customization value
      await this.updateBudget(budgetId, {
        customizationValue: customizationAmount.toFixed(2),
        totalValue: subtotal.toFixed(2)
      });
    } else {
      await this.updateBudget(budgetId, {
        totalValue: subtotal.toFixed(2)
      });
    }
  }
}

export const storage = new MemStorage();