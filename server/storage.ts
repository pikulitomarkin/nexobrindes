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
  type Partner,
  type InsertPartner,
  type CommissionSettings,
  type InsertCommissionSettings,
  type Vendor,
  type InsertVendor,
  type Product,
  type InsertProduct,
  type Budget,
  type InsertBudgetItem,
  type BudgetPhoto,
  type InsertBudgetPhoto,
  type PaymentMethod,
  type InsertPaymentMethod,
  type ShippingMethod,
  type InsertShippingMethod,
  type BudgetPaymentInfo,
  type InsertBudgetPaymentInfo,
  // Financial module types
  type AccountsReceivable,
  type InsertAccountsReceivable,
  type PaymentAllocation,
  type InsertPaymentAllocation,
  type BankImport,
  type InsertBankImport,
  type BankTransaction,
  type InsertBankTransaction,
  type ExpenseNote,
  type InsertExpenseNote,
  type CommissionPayout,
  type InsertCommissionPayout,
  // Customization Option types
  type CustomizationOption,
  type InsertCustomizationOption
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
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  getOrdersByVendor(vendorId: string): Promise<Order[]>;
  getOrdersByClient(clientId: string): Promise<Order[]>;
  getClientsByVendor(vendorId: string): Promise<Client[]>;

  // Production Orders
  getProductionOrders(): Promise<ProductionOrder[]>;
  getProductionOrdersByProducer(producerId: string): Promise<ProductionOrder[]>;
  getProductionOrder(id: string): Promise<ProductionOrder | undefined>;
  getProductionOrdersByOrder(orderId: string): Promise<ProductionOrder[]>;
  createProductionOrder(productionOrder: InsertProductionOrder): Promise<ProductionOrder>;
  updateProductionOrderStatus(id: string, status: string, notes?: string, deliveryDate?: string, trackingCode?: string): Promise<ProductionOrder | undefined>;

  // Payments
  getPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByOrder(orderId: string): Promise<Payment[]>;

  // Commissions
  getCommissionsByVendor(vendorId: string): Promise<Commission[]>;
  getAllCommissions(): Promise<Commission[]>;
  createCommission(commission: InsertCommission): Promise<Commission>;
  updateCommissionStatus(id: string, status: string): Promise<Commission | undefined>;
  deductPartnerCommission(partnerId: string, amount: string): Promise<void>;

  // Partners
  getPartners(): Promise<User[]>;
  getPartner(userId: string): Promise<Partner | undefined>;
  createPartner(partnerData: any): Promise<User>;
  updatePartnerCommission(userId: string, commissionRate: string): Promise<void>;

  // Commission Settings
  getCommissionSettings(): Promise<CommissionSettings | undefined>;
  updateCommissionSettings(settings: Partial<InsertCommissionSettings>): Promise<CommissionSettings>;

  // Vendors
  getVendors(): Promise<User[]>;
  getVendor(userId: string): Promise<Vendor | undefined>;
  createVendor(vendorData: any): Promise<User>;
  updateVendorCommission(userId: string, commissionRate: string): Promise<void>;

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
  convertBudgetToOrder(budgetId: string, producerId?: string): Promise<any>;

  // Budget Items
  getBudgetItems(budgetId: string): Promise<any[]>;
  createBudgetItem(budgetId: string, itemData: any): Promise<any>;
  updateBudgetItem(itemId: string, itemData: any): Promise<any>;
  deleteBudgetItem(itemId: string): Promise<boolean>;
  deleteBudgetItems(budgetId: string): Promise<boolean>;

  // Budget Photos
  getBudgetPhotos(budgetId: string): Promise<any[]>;
  createBudgetPhoto(budgetId: string, photoData: any): Promise<any>;
  deleteBudgetPhoto(photoId: string): Promise<boolean>;

  // Payment Methods
  getPaymentMethods(): Promise<PaymentMethod[]>;
  getAllPaymentMethods(): Promise<PaymentMethod[]>;
  createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | null>;
  deletePaymentMethod(id: string): Promise<boolean>;

  // Shipping Methods
  getShippingMethods(): Promise<ShippingMethod[]>;
  getAllShippingMethods(): Promise<ShippingMethod[]>;
  createShippingMethod(data: InsertShippingMethod): Promise<ShippingMethod>;
  updateShippingMethod(id: string, data: Partial<InsertShippingMethod>): Promise<ShippingMethod | null>;
  deleteShippingMethod(id: string): Promise<boolean>;

  // Budget Payment Info
  getBudgetPaymentInfo(budgetId: string): Promise<BudgetPaymentInfo | undefined>;
  createBudgetPaymentInfo(data: InsertBudgetPaymentInfo): Promise<BudgetPaymentInfo>;
  updateBudgetPaymentInfo(budgetId: string, data: Partial<InsertBudgetPaymentInfo>): Promise<BudgetPaymentInfo>;

  // Financial module - Accounts Receivable
  getAccountsReceivable(): Promise<AccountsReceivable[]>;
  getAccountsReceivableByOrder(orderId: string): Promise<AccountsReceivable[]>;
  getAccountsReceivableByClient(clientId: string): Promise<AccountsReceivable[]>;
  getAccountsReceivableByVendor(vendorId: string): Promise<AccountsReceivable[]>;
  createAccountsReceivable(data: InsertAccountsReceivable): Promise<AccountsReceivable>;
  updateAccountsReceivable(id: string, data: Partial<InsertAccountsReceivable>): Promise<AccountsReceivable | undefined>;

  // Financial module - Payment Allocations
  getPaymentAllocationsByPayment(paymentId: string): Promise<PaymentAllocation[]>;
  getPaymentAllocationsByReceivable(receivableId: string): Promise<PaymentAllocation[]>;
  createPaymentAllocation(data: InsertPaymentAllocation): Promise<PaymentAllocation>;
  allocatePaymentToReceivable(paymentId: string, receivableId: string, amount: string): Promise<PaymentAllocation>;

  // Financial module - Bank Imports & Transactions
  getBankImports(): Promise<BankImport[]>;
  getBankImport(id: string): Promise<BankImport | undefined>;
  createBankImport(data: InsertBankImport): Promise<BankImport>;
  getBankTransactionsByImport(importId: string): Promise<BankTransaction[]>;
  getBankTransactions(): Promise<BankTransaction[]>;
  createBankTransaction(data: InsertBankTransaction): Promise<BankTransaction>;
  updateBankTransaction(id: string, data: Partial<InsertBankTransaction>): Promise<BankTransaction | undefined>;
  matchTransactionToReceivable(transactionId: string, receivableId: string): Promise<BankTransaction | undefined>;

  // Financial module - Expense Notes
  getExpenseNotes(): Promise<ExpenseNote[]>;
  getExpenseNotesByVendor(vendorId: string): Promise<ExpenseNote[]>;
  getExpenseNotesByOrder(orderId: string): Promise<ExpenseNote[]>;
  createExpenseNote(data: InsertExpenseNote): Promise<ExpenseNote>;
  updateExpenseNote(id: string, data: Partial<InsertExpenseNote>): Promise<ExpenseNote | undefined>;

  // Financial module - Commission Payouts
  getCommissionPayouts(): Promise<CommissionPayout[]>;
  getCommissionPayoutsByUser(userId: string, type: 'vendor' | 'partner'): Promise<CommissionPayout[]>;
  createCommissionPayout(data: InsertCommissionPayout): Promise<CommissionPayout>;
  updateCommissionPayout(id: string, data: Partial<InsertCommissionPayout>): Promise<CommissionPayout | undefined>;

  // Customization Options
  createCustomizationOption(data: InsertCustomizationOption): Promise<CustomizationOption>;
  getCustomizationOptions(): Promise<CustomizationOption[]>;
  getCustomizationOptionsByCategory(category: string, quantity: number): Promise<CustomizationOption[]>;
  updateCustomizationOption(id: string, data: Partial<InsertCustomizationOption>): Promise<CustomizationOption | undefined>;
  deleteCustomizationOption(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private clients: Map<string, Client>;
  private orders: Map<string, Order>;
  private productionOrders: Map<string, ProductionOrder>;
  private payments: Map<string, Payment>;
  private commissions: Map<string, Commission>;
  private vendors: Map<string, Vendor>;
  private partners: Map<string, Partner>;
  private products: Map<string, any>;
  private budgets: Map<string, any>;
  private budgetItems: any[]; // Changed from mockBudgetItems to be a class member
  private budgetPhotos: any[]; // Changed from mockBudgetPhotos to be a class member
  private commissionSettings: CommissionSettings;

  // Financial module storage
  private accountsReceivable: Map<string, AccountsReceivable>;
  private paymentAllocations: Map<string, PaymentAllocation>;
  private bankImports: Map<string, BankImport>;
  private bankTransactions: Map<string, BankTransaction>;
  private expenseNotes: Map<string, ExpenseNote>;
  private commissionPayouts: Map<string, CommissionPayout>;

  private mockData = {
    users: [] as User[],
    clients: [] as Client[],
    orders: [] as Order[],
    productionOrders: [] as ProductionOrder[],
    payments: [] as Payment[],
    commissions: [] as Commission[],
    partners: [] as Partner[],
    commissionSettings: [] as CommissionSettings[],
    vendors: [] as Vendor[],
    products: [] as Product[],
    budgets: [] as Budget[],
    budgetItems: [] as BudgetItem[],
    budgetPhotos: [] as BudgetPhoto[],
    paymentMethods: [] as PaymentMethod[],
    shippingMethods: [] as ShippingMethod[],
    budgetPaymentInfo: [] as BudgetPaymentInfo[],
    accountsReceivable: [] as AccountsReceivable[],
    paymentAllocations: [] as PaymentAllocation[],
    bankImports: [] as BankImport[],
    bankTransactions: [] as BankTransaction[],
    expenseNotes: [] as ExpenseNote[],
    commissionPayouts: [] as CommissionPayout[],
    customizationOptions: [] as CustomizationOption[],
    customizationCategories: [] as string[], // Added for storing customization categories
  };

  // Payment Methods
  private paymentMethods: PaymentMethod[] = [
    {
      id: "pm-1",
      name: "PIX",
      type: "pix",
      maxInstallments: 1,
      installmentInterest: "0.00",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "pm-2",
      name: "Cartão de Crédito",
      type: "credit_card",
      maxInstallments: 12,
      installmentInterest: "2.99",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "pm-3",
      name: "Boleto Bancário",
      type: "boleto",
      maxInstallments: 1,
      installmentInterest: "0.00",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Shipping Methods
  private shippingMethods: ShippingMethod[] = [
    {
      id: "sm-1",
      name: "Correios PAC",
      type: "calculated",
      basePrice: "0.00",
      freeShippingThreshold: "150.00",
      estimatedDays: 8,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "sm-2",
      name: "Transportadora",
      type: "fixed",
      basePrice: "25.00",
      freeShippingThreshold: "300.00",
      estimatedDays: 5,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "sm-3",
      name: "Frete Grátis",
      type: "free",
      basePrice: "0.00",
      freeShippingThreshold: "0.00",
      estimatedDays: 7,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Budget Payment Info
  private budgetPaymentInfo: BudgetPaymentInfo[] = [];

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.orders = new Map();
    this.productionOrders = new Map();
    this.payments = new Map();
    this.commissions = new Map();
    this.vendors = new Map();
    this.partners = new Map();
    this.products = new Map();
    this.budgets = new Map();
    this.budgetItems = []; // Initialize as empty array
    this.budgetPhotos = []; // Initialize as empty array

    // Initialize financial module Maps
    this.accountsReceivable = new Map();
    this.paymentAllocations = new Map();
    this.bankImports = new Map();
    this.bankTransactions = new Map();
    this.expenseNotes = new Map();
    this.commissionPayouts = new Map();

    // Initialize commission settings
    this.commissionSettings = {
      id: "settings-1",
      vendorCommissionRate: "10.00",
      partnerCommissionRate: "15.00",
      vendorPaymentTiming: "order_completion",
      partnerPaymentTiming: "order_start",
      isActive: true,
      updatedAt: new Date()
    };

    this.initializeData();
    this.createTestUsers();
  }

  // Create test users for each role
  private createTestUsers() {
    // Override existing users with test users
    this.users.clear();

    // Admin user
    const adminUser = {
      id: "admin-1",
      username: "admin",
      password: "123456", // In production, this should be hashed
      name: "Administrador do Sistema",
      email: "admin@erp.com",
      phone: null,
      vendorId: null,
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(adminUser.id, adminUser);

    // Vendor user
    const vendorUser = {
      id: "vendor-1",
      username: "vendedor1",
      password: "123456",
      name: "Maria Santos",
      email: "maria.santos@erp.com",
      phone: null,
      vendorId: "vendor-1",
      role: "vendor",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(vendorUser.id, vendorUser);

    // Client user
    const clientUser = {
      id: "client-1",
      username: "cliente1",
      password: "123456",
      name: "João Silva",
      email: "joao.silva@email.com",
      phone: null,
      vendorId: null,
      role: "client",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(clientUser.id, clientUser);

    // Producer user
    const producerUser = {
      id: "producer-1",
      username: "produtor1",
      password: "123456",
      name: "Marcenaria Santos",
      email: "contato@marcenariasantos.com",
      phone: null,
      vendorId: null,
      role: "producer",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(producerUser.id, producerUser);

    // Partner user
    const partnerUser = {
      id: "partner-1",
      username: "partner1",
      password: "partner123",
      name: "João Sócio",
      email: "joao.socio@erp.com",
      phone: null,
      vendorId: null,
      role: "partner",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(partnerUser.id, partnerUser);
  }

  private initializeData() {
    // This will be called first, then createTestUsers() will override with test users
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

    const partnerUser: User = {
      id: "partner-1",
      username: "socio1",
      password: "123",
      role: "partner",
      name: "João Sócio",
      email: "socio@erp.com",
      phone: null,
      vendorId: null,
      isActive: true
    };

    [adminUser, vendorUser, clientUser, producerUser, financeUser, partnerUser].forEach(user => {
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

    // Create partner profile
    const partner: Partner = {
      id: "partner-profile-1",
      userId: "partner-1",
      commissionRate: "15.00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.partners.set(partner.id, partner);

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
        budgetId: null,
        product: "Mesa de Jantar Personalizada",
        description: "Mesa de madeira maciça para 6 pessoas",
        totalValue: "2450.00",
        paidValue: "735.00",
        status: "production",
        deadline: new Date("2024-11-22"),
        trackingCode: null,
        createdAt: new Date("2024-11-15"),
        updatedAt: new Date("2024-11-16")
      },
      {
        id: "order-2",
        orderNumber: "#12346",
        clientId: "client-1",
        vendorId: "vendor-1",
        producerId: null,
        budgetId: null,
        product: "Estante Personalizada",
        description: "Estante de madeira com 5 prateleiras",
        totalValue: "1890.00",
        paidValue: "567.00",
        status: "pending",
        deadline: new Date("2024-11-25"),
        trackingCode: null,
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

    // Create additional payments for recent orders to show correct values
    const allOrders = Array.from(this.orders.values());

    // Find orders that need test payments and ensure all orders have some payment
    const ordersToAddPayments = allOrders.filter(o =>
      o.orderNumber?.includes("PED-") || o.orderNumber?.includes("#12346") || o.orderNumber?.includes("#12345")
    );

    ordersToAddPayments.forEach((order, index) => {
      // Create test payment for each order with better amounts
      let paymentAmount = "567.00"; // Default

      if (order.orderNumber?.includes("#12345")) {
        paymentAmount = "735.00"; // 30% of 2450
      } else if (order.orderNumber?.includes("#12346")) {
        paymentAmount = "567.00"; // 30% of 1890
      } else if (order.orderNumber?.includes("PED-")) {
        paymentAmount = "3000.00"; // Example for newer orders
      }

      const testPayment: Payment = {
        id: `payment-visible-${index + 1}`,
        orderId: order.id,
        amount: paymentAmount,
        method: "pix",
        status: "confirmed",
        transactionId: `PIX-ENTRADA-${order.orderNumber?.replace(/[#\-]/g, '')}`,
        paidAt: new Date(Date.now() - (index * 12 * 60 * 60 * 1000)), // Different dates, more recent
        createdAt: new Date(Date.now() - (index * 12 * 60 * 60 * 1000))
      };
      this.payments.set(testPayment.id, testPayment);

      // Update the order's paid value immediately
      this.updateOrderPaidValue(order.id);
    });

    // Initialize mock budgets
    mockBudgets = [
      {
        id: "budget-1",
        budgetNumber: "ORC-2024-001",
        title: "Orçamento Mesa de Jantar Personalizada",
        description: "Mesa de jantar em madeira maciça com personalização especial",
        vendorId: "vendor-1",
        clientId: "client-1",
        contactName: "Maria Silva",
        contactPhone: "(11) 99999-9999",
        contactEmail: "maria@email.com",
        status: "draft",
        validUntil: "2024-12-31",
        deliveryDeadline: "2025-01-15",
        totalValue: 2500.00,
        shippingCost: 150.00,
        hasDiscount: true,
        discountType: "percentage",
        discountPercentage: 10,
        discountValue: 0,
        paymentMethodId: "pm-1",
        shippingMethodId: "sm-1",
        installments: 3,
        downPayment: 800.00,
        remainingAmount: 1700.00,
        items: [
          {
            id: "item-1",
            productId: "product-1",
            productName: "Mesa de Jantar Premium",
            quantity: 1,
            unitPrice: 2500.00,
            totalPrice: 2500.00,
            hasItemCustomization: true,
            itemCustomizationValue: 300.00,
            itemCustomizationDescription: "Gravação personalizada no tampo",
            customizationPhoto: "/uploads/image-1757959263873-hw4asmucqgh.png",
            productWidth: "180",
            productHeight: "75",
            productDepth: "90"
          }
        ],
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
    mockBudgets.forEach(budget => this.budgets.set(budget.id, budget));

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
    mockProducts.forEach(product => this.products.set(product.id, product));

    // Create sample commission settings
    const defaultCommissionSettings: CommissionSettings = {
      id: "settings-1",
      vendorCommissionRate: "10.00",
      partnerCommissionRate: "15.00",
      vendorPaymentTiming: "order_completion",
      partnerPaymentTiming: "order_start",
      isActive: true,
      updatedAt: new Date(),
    };
    this.mockData.commissionSettings.push(defaultCommissionSettings);

    // Create sample customization options
    const sampleCustomizations: CustomizationOption[] = [
      {
        id: "custom-1",
        name: "Serigrafia 1 cor",
        description: "Personalização com serigrafia em uma cor",
        category: "Mochila",
        minQuantity: 50,
        price: "5.00",
        isActive: true,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "custom-2",
        name: "Serigrafia 1 cor",
        description: "Personalização com serigrafia em uma cor",
        category: "Mochila",
        minQuantity: 100,
        price: "4.50",
        isActive: true,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "custom-3",
        name: "Serigrafia 1 cor",
        description: "Personalização com serigrafia em uma cor",
        category: "Mochila",
        minQuantity: 200,
        price: "3.50",
        isActive: true,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "custom-4",
        name: "Bordado",
        description: "Personalização com bordado",
        category: "Mochila",
        minQuantity: 25,
        price: "8.00",
        isActive: true,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "custom-5",
        name: "Gravação a laser",
        description: "Personalização com gravação a laser",
        category: "Copo",
        minQuantity: 20,
        price: "12.00",
        isActive: true,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];
    this.mockData.customizationOptions.push(...sampleCustomizations);

    // Initialize financial integration - Create AccountsReceivable automatically based on existing orders
    this.initializeFinancialIntegration();
  }

  private initializeFinancialIntegration() {
    // Create AccountsReceivable entries for all existing orders
    const allOrders = Array.from(this.orders.values());

    allOrders.forEach(order => {
      // Create receivable entry for each order
      const totalValue = parseFloat(order.totalValue);
      const paidValue = parseFloat(order.paidValue);
      const remainingAmount = totalValue - paidValue;

      let status: 'pending' | 'partial' | 'paid' = 'pending';
      if (paidValue >= totalValue) {
        status = 'paid';
      } else if (paidValue > 0) {
        status = 'partial';
      }

      const receivable: AccountsReceivable = {
        id: `ar-${order.id}`,
        orderId: order.id,
        clientId: order.clientId,
        vendorId: order.vendorId,
        description: `Venda: ${order.product}`,
        amount: order.totalValue,
        receivedAmount: order.paidValue,
        dueDate: order.deadline,
        status: status,
        type: 'sale',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.accountsReceivable.set(receivable.id, receivable);

      // If there are payments for this order, create payment allocations
      const orderPayments = Array.from(this.payments.values()).filter(p => p.orderId === order.id);
      orderPayments.forEach(payment => {
        if (payment.status === 'confirmed') {
          const allocation: PaymentAllocation = {
            id: `allocation-${payment.id}-${receivable.id}`,
            paymentId: payment.id,
            receivableId: receivable.id,
            amount: payment.amount,
            allocatedAt: payment.paidAt || payment.createdAt
          };
          this.paymentAllocations.set(allocation.id, allocation);
        }
      });
    });

    // Create Commission Payouts based on existing commissions
    const allCommissions = Array.from(this.commissions.values());

    // Group commissions by vendor to create payout batches
    const commissionsByVendor = new Map<string, Commission[]>();
    allCommissions.forEach(commission => {
      if (!commissionsByVendor.has(commission.vendorId)) {
        commissionsByVendor.set(commission.vendorId, []);
      }
      commissionsByVendor.get(commission.vendorId)!.push(commission);
    });

    // Create commission payouts for each vendor
    commissionsByVendor.forEach((commissions, vendorId) => {
      const totalAmount = commissions.reduce((sum, comm) => sum + parseFloat(comm.amount), 0);

      if (totalAmount > 0) {
        const payout: CommissionPayout = {
          id: `payout-vendor-${vendorId}`,
          userId: vendorId,
          type: 'vendor',
          description: `Comissões acumuladas - ${commissions.length} pedidos`,
          totalAmount: totalAmount.toFixed(2),
          commissionIds: commissions.map(c => c.id),
          status: commissions.every(c => c.status === 'paid') ? 'paid' : 'pending',
          paidAt: commissions.every(c => c.status === 'paid') ? new Date() : null,
          createdAt: new Date()
        };

        this.commissionPayouts.set(payout.id, payout);
      }
    });

    // Create sample expense notes
    const sampleExpenses: ExpenseNote[] = [
      {
        id: "expense-1",
        vendorId: "vendor-1",
        orderId: "order-1",
        description: "Material para Mesa de Jantar - Madeira Premium",
        amount: "850.00",
        category: "material",
        attachmentUrl: null,
        status: "approved",
        approvedBy: "admin-1",
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "expense-2",
        vendorId: "vendor-1",
        orderId: null,
        description: "Transporte - Entrega de produtos",
        amount: "120.00",
        category: "transport",
        attachmentUrl: null,
        status: "pending",
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    sampleExpenses.forEach(expense => {
      this.mockData.expenseNotes.push(expense);
    });

    // Create sample customization options
    const sampleCustomizationOptions = [
      {
        id: "custom-1",
        name: "Serigrafia 1 cor",
        description: "Impressão serigrafica em 1 cor",
        category: "mochila",
        minQuantity: 50,
        price: "50.00",
        isActive: true,
        createdBy: "admin-1",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "custom-2",
        name: "Serigrafia 1 cor",
        description: "Impressão serigrafica em 1 cor (quantidade maior)",
        category: "mochila",
        minQuantity: 100,
        price: "45.00",
        isActive: true,
        createdBy: "admin-1",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "custom-3",
        name: "Serigrafia 1 cor",
        description: "Impressão serigrafica em 1 cor (quantidade alta)",
        category: "mochila",
        minQuantity: 200,
        price: "35.00",
        isActive: true,
        createdBy: "admin-1",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "custom-4",
        name: "Bordado",
        description: "Bordado personalizado",
        category: "mochila",
        minQuantity: 20,
        price: "80.00",
        isActive: true,
        createdBy: "admin-1",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "custom-5",
        name: "Gravação Laser",
        description: "Gravação a laser em madeira",
        category: "móveis",
        minQuantity: 1,
        price: "120.00",
        isActive: true,
        createdBy: "admin-1",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    sampleCustomizationOptions.forEach(option => {
      this.mockData.customizationOptions.push(option);
      // Also add categories to the list
      if (!this.mockData.customizationCategories.includes(option.category)) {
        this.mockData.customizationCategories.push(option.category);
      }
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.get(username) || Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      vendorId: insertUser.vendorId || null,
      email: insertUser.email || null,
      phone: insertUser.phone || null,
      address: insertUser.address || null, // Added address field
      specialty: insertUser.specialty || null, // Added specialty field
      isActive: insertUser.isActive !== undefined ? insertUser.isActive : true
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
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
      vendorId: clientData.vendorId || null,
      userId: clientData.userId || null,
      email: clientData.email || null,
      phone: clientData.phone || null,
      whatsapp: clientData.whatsapp || null,
      cpfCnpj: clientData.cpfCnpj || null,
      address: clientData.address || null,
      isActive: clientData.isActive !== undefined ? clientData.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log(`Storage: Creating client with vendorId: ${clientData.vendorId}`, client);
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

  async getClientByUserId(userId: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(client => client.userId === userId);
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
      producerId: insertOrder.producerId || null,
      budgetId: insertOrder.budgetId || null,
      description: insertOrder.description || null,
      paidValue: insertOrder.paidValue || "0.00",
      deadline: insertOrder.deadline || null,
      trackingCode: insertOrder.trackingCode || null,
      status: insertOrder.status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.set(id, order);

    // Automatically create AccountsReceivable entry for this new order
    await this.createAccountsReceivableForOrder(order);

    return order;
  }

  private async createAccountsReceivableForOrder(order: Order): Promise<void> {
    const paidValue = parseFloat(order.paidValue || "0");
    const totalValue = parseFloat(order.totalValue);

    let status: 'pending' | 'partial' | 'paid' = 'pending';
    if (paidValue >= totalValue) {
      status = 'paid';
    } else if (paidValue > 0) {
      status = 'partial';
    }

    const receivable: AccountsReceivable = {
      id: `ar-${order.id}`,
      orderId: order.id,
      clientId: order.clientId,
      vendorId: order.vendorId,
      description: `Venda: ${order.product}`,
      amount: order.totalValue,
      receivedAmount: order.paidValue || "0.00",
      dueDate: order.deadline,
      status: status,
      type: 'sale',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.accountsReceivable.set(receivable.id, receivable);
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      const updatedOrder = {
        ...order,
        ...updates,
        updatedAt: new Date(),
        trackingCode: updates.trackingCode !== undefined ? updates.trackingCode : order.trackingCode
      };
      this.orders.set(id, updatedOrder);
      return updatedOrder;
    }
    return undefined;
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
    const allOrders = Array.from(this.orders.values());
    const matchingOrders = [];

    for (const order of allOrders) {
      // Direct match
      if (order.clientId === clientId) {
        matchingOrders.push(order);
        continue;
      }

      // Check if clientId is a user ID and order.clientId is a client record
      try {
        const clientRecord = await this.getClient(order.clientId);
        if (clientRecord && clientRecord.userId === clientId) {
          matchingOrders.push(order);
          continue;
        }
      } catch (e) {
        // Continue checking
      }

      // Check if clientId is a client record ID and order.clientId is a user ID
      try {
        const userClientRecord = await this.getClientByUserId(clientId);
        if (userClientRecord && order.clientId === userClientRecord.id) {
          matchingOrders.push(order);
        }
      } catch (e) {
        // Continue checking
      }
    }

    return matchingOrders;
  }

  async getClientsByVendor(vendorId: string): Promise<Client[]> {
    console.log(`Storage: getClientsByVendor for vendorId: ${vendorId}`);
    const allClients = Array.from(this.clients.values());
    console.log(`Storage: Total clients available:`, allClients.map(c => ({ id: c.id, name: c.name, vendorId: c.vendorId })));

    const filteredClients = allClients.filter(client => client.vendorId === vendorId);
    console.log(`Storage: Filtered clients for vendor ${vendorId}:`, filteredClients.map(c => ({ id: c.id, name: c.name, vendorId: c.vendorId })));

    return filteredClients;
  }

  // Production Order methods
  async getProductionOrders(): Promise<ProductionOrder[]> {
    return Array.from(this.productionOrders.values());
  }

  async getProductionOrdersByProducer(producerId: string): Promise<ProductionOrder[]> {
    return Array.from(this.productionOrders.values()).filter(po => po.producerId === producerId);
  }

  async getProductionOrdersByOrder(orderId: string): Promise<ProductionOrder[]> {
    return Array.from(this.productionOrders.values()).filter(po => po.orderId === orderId);
  }

  async createProductionOrder(insertProductionOrder: InsertProductionOrder): Promise<ProductionOrder> {
    const id = randomUUID();
    const productionOrder: ProductionOrder = {
      ...insertProductionOrder,
      id,
      status: insertProductionOrder.status || 'pending',
      deadline: insertProductionOrder.deadline || null,
      acceptedAt: insertProductionOrder.acceptedAt || null,
      completedAt: insertProductionOrder.completedAt || null,
      notes: insertProductionOrder.notes || null,
      deliveryDeadline: insertProductionOrder.deliveryDeadline || null,
      hasUnreadNotes: insertProductionOrder.hasUnreadNotes || false,
      lastNoteAt: insertProductionOrder.lastNoteAt || null,
      trackingCode: insertProductionOrder.trackingCode || null,
      shippingAddress: insertProductionOrder.shippingAddress || null
    };
    this.productionOrders.set(id, productionOrder);
    return productionOrder;
  }

  async getProductionOrder(id: string): Promise<ProductionOrder | null> {
    return this.productionOrders.get(id) || null;
  }

  async updateProductionOrderStatus(id: string, status: string, notes?: string, deliveryDate?: string, trackingCode?: string): Promise<ProductionOrder | undefined> {
    const productionOrder = this.productionOrders.get(id);
    if (productionOrder) {
      const updatedPO = {
        ...productionOrder,
        status: status === 'unchanged' ? productionOrder.status : status,
        notes: notes || productionOrder.notes,
        hasUnreadNotes: notes ? true : productionOrder.hasUnreadNotes,
        lastNoteAt: notes ? new Date() : productionOrder.lastNoteAt,
        acceptedAt: status === 'accepted' && !productionOrder.acceptedAt ? new Date() : (typeof productionOrder.acceptedAt === 'string' ? new Date(productionOrder.acceptedAt) : productionOrder.acceptedAt),
        completedAt: (status === 'completed' || status === 'shipped' || status === 'delivered') && !productionOrder.completedAt ? new Date() : (typeof productionOrder.completedAt === 'string' ? new Date(productionOrder.completedAt) : productionOrder.completedAt),
        deadline: deliveryDate ? new Date(deliveryDate) : (typeof productionOrder.deadline === 'string' ? new Date(productionOrder.deadline) : productionOrder.deadline),
        deliveryDeadline: deliveryDate ? new Date(deliveryDate) : productionOrder.deliveryDeadline,
        trackingCode: trackingCode !== undefined ? trackingCode : productionOrder.trackingCode,
      };

      // If the order is 'shipped' or 'delivered', and the status was not already one of those, set completedAt
      if (['shipped', 'delivered'].includes(status) && !['shipped', 'delivered'].includes(productionOrder.status)) {
        updatedPO.completedAt = new Date();
      }

      this.productionOrders.set(id, updatedPO);
      return updatedPO;
    }
    return undefined;
  }

  async updateProductionOrderNotes(id: string, notes: string, hasUnreadNotes: boolean): Promise<ProductionOrder | undefined> {
    const productionOrder = this.productionOrders.get(id);
    if (productionOrder) {
      const updatedPO = {
        ...productionOrder,
        notes,
        hasUnreadNotes,
        lastNoteAt: hasUnreadNotes ? new Date() : productionOrder.lastNoteAt
      };
      this.productionOrders.set(id, updatedPO);
      return updatedPO;
    }
    return undefined;
  }

  async getProductionOrder(id: string): Promise<ProductionOrder | undefined> {
    return this.productionOrders.get(id);
  }

  async getProductionOrdersByOrder(orderId: string): Promise<ProductionOrder[]> {
    return Array.from(this.productionOrders.values()).filter(po => po.orderId === orderId);
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
      status: insertPayment.status || 'pending',
      transactionId: insertPayment.transactionId || null,
      paidAt: insertPayment.paidAt || null,
      createdAt: new Date()
    };
    this.payments.set(id, payment);

    // Se o pagamento está confirmado, atualizar o valor pago no pedido
    if (payment.status === 'confirmed') {
      await this.updateOrderPaidValue(payment.orderId);
    }

    return payment;
  }

  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(payment => payment.orderId === orderId);
  }

  async updateOrderPaidValue(orderId: string): Promise<void> {
    const payments = await this.getPaymentsByOrder(orderId);
    const totalPaid = payments
      .filter(payment => payment.status === 'confirmed')
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    await this.updateOrder(orderId, { paidValue: totalPaid.toFixed(2) });

    // Update corresponding AccountsReceivable entry
    const receivableId = `ar-${orderId}`;
    const receivable = this.accountsReceivable.get(receivableId);

    if (receivable) {
      const totalValue = parseFloat(receivable.amount);
      let status: 'pending' | 'partial' | 'paid' = 'pending';

      if (totalPaid >= totalValue) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      }

      await this.updateAccountsReceivable(receivableId, {
        receivedAmount: totalPaid.toFixed(2),
        status: status
      });
    }
  }

  // Commission methods
  async getCommissionsByVendor(vendorId: string): Promise<Commission[]> {
    return Array.from(this.commissions.values()).filter(commission => commission.vendorId === vendorId);
  }

  async getAllCommissions(): Promise<Commission[]> {
    return Array.from(this.commissions.values());
  }

  async createCommission(insertCommission: InsertCommission): Promise<Commission> {
    const id = randomUUID();
    const commission: Commission = {
      ...insertCommission,
      id,
      vendorId: insertCommission.vendorId || null,
      partnerId: insertCommission.partnerId || null,
      status: insertCommission.status || 'pending',
      paidAt: insertCommission.paidAt || null,
      deductedAt: insertCommission.deductedAt || null,
      orderValue: insertCommission.orderValue || null,
      orderNumber: insertCommission.orderNumber || null,
      createdAt: new Date()
    };
    this.commissions.set(id, commission);
    return commission;
  }

  async updateCommissionStatus(id: string, status: string): Promise<Commission | undefined> {
    const commission = this.commissions.get(id);
    if (commission) {
      const updatedCommission = {
        ...commission,
        status,
        paidAt: status === 'paid' ? new Date() : commission.paidAt,
        deductedAt: status === 'deducted' ? new Date() : commission.deductedAt
      };
      this.commissions.set(id, updatedCommission);
      return updatedCommission;
    }
    return undefined;
  }

  async deductPartnerCommission(partnerId: string, amount: string): Promise<void> {
    // Find the next pending partner commission to deduct from
    const partnerCommissions = Array.from(this.commissions.values())
      .filter(c => c.partnerId === partnerId && c.status === 'pending')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let remainingToDeduct = parseFloat(amount);

    for (const commission of partnerCommissions) {
      if (remainingToDeduct <= 0) break;

      const commissionAmount = parseFloat(commission.amount);
      if (commissionAmount <= remainingToDeduct) {
        // Deduct entire commission
        await this.updateCommissionStatus(commission.id, 'deducted');
        remainingToDeduct -= commissionAmount;
      } else {
        // Partial deduction - update amount
        const newAmount = (commissionAmount - remainingToDeduct).toFixed(2);
        const updatedCommission = {
          ...commission,
          amount: newAmount
        };
        this.commissions.set(commission.id, updatedCommission);
        remainingToDeduct = 0;
      }
    }
  }

  // Vendor methods
  async getVendor(userId: string): Promise<Vendor | undefined> {
    return Array.from(this.vendors.values()).find(vendor => vendor.userId === userId);
  }

  async createVendor(vendorData: any): Promise<User> {
    // Create user first
    const newUser: User = {
      id: randomUUID(),
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
    };

    this.users.set(newUser.id, newUser);

    // Create vendor profile
    const vendorProfile: Vendor = {
      id: randomUUID(),
      userId: newUser.id,
      salesLink: vendorData.salesLink || null,
      commissionRate: vendorData.commissionRate || "10.00",
      isActive: true
    };

    this.vendors.set(vendorProfile.id, vendorProfile);
    return newUser;
  }

  async updateVendorCommission(userId: string, commissionRate: string): Promise<void> {
    const vendor = Array.from(this.vendors.values()).find(v => v.userId === userId);
    if (vendor) {
      const updatedVendor = { ...vendor, commissionRate };
      this.vendors.set(vendor.id, updatedVendor);
    }
  }

  // Partner methods
  async getPartners(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === 'partner');
  }

  async getPartner(userId: string): Promise<Partner | undefined> {
    return Array.from(this.partners.values()).find(partner => partner.userId === userId);
  }

  async createPartner(partnerData: any): Promise<User> {
    // Create user first
    const newUser: User = {
      id: randomUUID(),
      username: partnerData.username,
      password: partnerData.password || "123456",
      role: 'partner',
      name: partnerData.name,
      email: partnerData.email || null,
      phone: partnerData.phone || null,
      vendorId: null,
      isActive: true
    };

    this.users.set(newUser.id, newUser);

    // Also create partner profile
    const partnerProfile: Partner = {
      id: randomUUID(),
      userId: newUser.id,
      commissionRate: partnerData.commissionRate || "15.00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.partners.set(partnerProfile.id, partnerProfile);
    return newUser;
  }

  async updatePartnerCommission(userId: string, commissionRate: string): Promise<void> {
    const partner = Array.from(this.partners.values()).find(p => p.userId === userId);
    if (partner) {
      const updatedPartner = { ...partner, commissionRate, updatedAt: new Date() };
      this.partners.set(partner.id, updatedPartner);
    }
  }

  // Commission Settings methods
  async getCommissionSettings(): Promise<CommissionSettings | undefined> {
    return this.commissionSettings;
  }

  async updateCommissionSettings(settings: Partial<InsertCommissionSettings>): Promise<CommissionSettings> {
    this.commissionSettings = {
      ...this.commissionSettings,
      ...settings,
      updatedAt: new Date()
    };
    return this.commissionSettings;
  }

  // Product methods
  async getProducts(options?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<{ products: any[]; total: number; page: number; totalPages: number; }> {
    let filteredProducts = Array.from(this.products.values());

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
    return this.products.get(id);
  }

  async createProduct(productData: any): Promise<any> {
    const id = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newProduct = {
      id,
      ...productData,
      basePrice: productData.basePrice.toString(), // Ensure it's a string
      isActive: productData.isActive !== undefined ? productData.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: string, productData: any): Promise<any> {
    const product = this.products.get(id);
    if (!product) {
      throw new Error('Product not found');
    }

    const updatedProduct = {
      ...product,
      ...productData,
      updatedAt: new Date().toISOString()
    };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
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
    if (!query) return Array.from(this.products.values());

    const searchLower = query.toLowerCase();
    return Array.from(this.products.values()).filter(product =>
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
    return Array.from(this.budgets.values());
  }

  async getBudget(id: string): Promise<any> {
    return this.budgets.get(id);
  }

  async getBudgetsByVendor(vendorId: string): Promise<any[]> {
    return Array.from(this.budgets.values()).filter(budget => budget.vendorId === vendorId);
  }

  async getBudgetsByClient(clientId: string): Promise<any[]> {
    return Array.from(this.budgets.values()).filter(budget => budget.clientId === clientId);
  }

  async createBudget(budgetData: any): Promise<any> {
    const id = `budget-${Date.now()}`;
    const newBudget = {
      id,
      budgetNumber: `ORC-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      ...budgetData,
      totalValue: budgetData.totalValue || '0.00',
      status: budgetData.status || 'draft',
      deliveryType: budgetData.deliveryType || 'delivery',
      hasCustomization: budgetData.hasCustomization || false,
      customizationPercentage: budgetData.customizationPercentage || '0.00',
      customizationValue: budgetData.customizationValue || '0.00',
      customizationDescription: budgetData.customizationDescription || '',
      hasDiscount: budgetData.hasDiscount || false,
      discountType: budgetData.discountType || 'percentage',
      discountPercentage: budgetData.discountPercentage || '0.00',
      discountValue: budgetData.discountValue || '0.00',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.budgets.set(id, newBudget);
    return newBudget;
  }

  async updateBudget(id: string, budgetData: any): Promise<any> {
    const budget = this.budgets.get(id);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const updatedBudget = {
      ...budget,
      ...budgetData,
      updatedAt: new Date().toISOString()
    };
    this.budgets.set(id, updatedBudget);
    return updatedBudget;
  }

  async deleteBudget(id: string): Promise<boolean> {
    // Also delete related items and photos
    this.budgetItems = this.budgetItems.filter(item => item.budgetId !== id);
    this.budgetPhotos = this.budgetPhotos.filter(photo => photo.budgetId !== id);
    return this.budgets.delete(id);
  }

  async convertBudgetToOrder(budgetId: string, producerId?: string): Promise<any> {
    const budget = await this.getBudget(budgetId);
    if (!budget) {
      throw new Error("Budget not found");
    }

    // Determine shipping address based on delivery type
    let shippingAddress = budget.shippingAddress || null;
    if (budget.deliveryType === 'pickup') {
      // If pickup, find the main company address or a default pickup location
      // For now, setting to null, but ideally this would be a specific pickup point address
      shippingAddress = null;
    }

    // Create order from budget
    const orderNumber = `PED-${Date.now()}`;
    const order = await this.createOrder({
      orderNumber,
      clientId: budget.clientId,
      vendorId: budget.vendorId,
      producerId: producerId || null,
      budgetId: budget.id,
      product: budget.title,
      description: budget.description,
      totalValue: budget.totalValue,
      status: 'confirmed', // Default status for a new order from budget
      deadline: budget.validUntil,
      shippingAddress: shippingAddress, // Include shipping address
      deliveryType: budget.deliveryType
    });

    // Update budget status
    await this.updateBudget(budgetId, { status: 'converted' });

    return order;
  }

  // Budget Items methods
  async getBudgetItems(budgetId: string): Promise<any[]> {
    return this.budgetItems.filter(item => item.budgetId === budgetId);
  }

  async createBudgetItem(budgetId: string, itemData: any): Promise<any> {
    const id = `budget-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem = {
      id,
      budgetId,
      productId: itemData.productId,
      quantity: itemData.quantity || 1,
      unitPrice: itemData.unitPrice || '0.00',
      totalPrice: itemData.totalPrice || '0.00',
      hasItemCustomization: itemData.hasItemCustomization || false,
      itemCustomizationValue: itemData.itemCustomizationValue || '0.00',
      itemCustomizationDescription: itemData.itemCustomizationDescription || '',
      customizationPhoto: itemData.customizationPhoto || '',
      productWidth: itemData.productWidth || null,
      productHeight: itemData.productHeight || null,
      productDepth: itemData.productDepth || null
    };
    this.budgetItems.push(newItem);

    // Recalculate budget total
    await this.recalculateBudgetTotal(budgetId);

    return newItem;
  }

  async updateBudgetItem(itemId: string, itemData: any): Promise<any> {
    const itemIndex = this.budgetItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Budget item not found');
    }

    const updatedItem = {
      ...this.budgetItems[itemIndex],
      ...itemData,
      customizationPhoto: itemData.customizationPhoto !== undefined ? itemData.customizationPhoto : this.budgetItems[itemIndex].customizationPhoto
    };
    this.budgetItems[itemIndex] = updatedItem;

    // Recalculate budget total
    await this.recalculateBudgetTotal(updatedItem.budgetId);

    return updatedItem;
  }

  async deleteBudgetItem(itemId: string): Promise<boolean> {
    const itemIndex = this.budgetItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return false;
    }

    const budgetId = this.budgetItems[itemIndex].budgetId;
    this.budgetItems.splice(itemIndex, 1);

    // Recalculate budget total
    await this.recalculateBudgetTotal(budgetId);

    return true;
  }

  async deleteBudgetItems(budgetId: string): Promise<boolean> {
    const initialLength = this.budgetItems.length;
    this.budgetItems = this.budgetItems.filter(item => item.budgetId !== budgetId);
    return this.budgetItems.length < initialLength;
  }

  // Budget Photos methods
  async getBudgetPhotos(budgetId: string): Promise<any[]> {
    return this.budgetPhotos.filter(photo => photo.budgetId === budgetId);
  }

  async createBudgetPhoto(budgetId: string, photoData: { imageUrl: string; description?: string }): Promise<any> {
    const newPhoto: BudgetPhoto = {
      id: `photo-${Date.now()}-${Math.random()}`,
      budgetId: budgetId,
      photoUrl: photoData.imageUrl,
      description: photoData.description || "",
      uploadedAt: new Date().toISOString()
    };
    this.budgetPhotos.push(newPhoto);
    return newPhoto;
  }

  async deleteBudgetPhoto(photoId: string): Promise<boolean> {
    const index = this.budgetPhotos.findIndex(photo => photo.id === photoId);
    if (index !== -1) {
      this.budgetPhotos.splice(index, 1);
      return true;
    }
    return false;
  }

  // Payment Methods
  async getPaymentMethods() {
    return this.paymentMethods.filter(pm => pm.isActive);
  }

  async getAllPaymentMethods() {
    return this.paymentMethods;
  }

  async createPaymentMethod(data: InsertPaymentMethod) {
    const newPaymentMethod: PaymentMethod = {
      id: `pm-${Date.now()}-${Math.random()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.paymentMethods.push(newPaymentMethod);
    return newPaymentMethod;
  }

  async updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>) {
    const index = this.paymentMethods.findIndex(pm => pm.id === id);
    if (index !== -1) {
      this.paymentMethods[index] = {
        ...this.paymentMethods[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      return this.paymentMethods[index];
    }
    return null;
  }

  async deletePaymentMethod(id: string) {
    const index = this.paymentMethods.findIndex(pm => pm.id === id);
    if (index !== -1) {
      this.paymentMethods.splice(index, 1);
      return true;
    }
    return false;
  }

  // Shipping Methods
  async getShippingMethods() {
    return this.shippingMethods.filter(sm => sm.isActive);
  }

  async getAllShippingMethods() {
    return this.shippingMethods;
  }

  async createShippingMethod(data: InsertShippingMethod) {
    const newShippingMethod: ShippingMethod = {
      id: `sm-${Date.now()}-${Math.random()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.shippingMethods.push(newShippingMethod);
    return newShippingMethod;
  }

  async updateShippingMethod(id: string, data: Partial<InsertShippingMethod>) {
    const index = this.shippingMethods.findIndex(sm => sm.id === id);
    if (index !== -1) {
      this.shippingMethods[index] = {
        ...this.shippingMethods[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      return this.shippingMethods[index];
    }
    return null;
  }

  async deleteShippingMethod(id: string) {
    const index = this.shippingMethods.findIndex(sm => sm.id === id);
    if (index !== -1) {
      this.shippingMethods.splice(index, 1);
      return true;
    }
    return false;
  }

  // Budget Payment Info
  async getBudgetPaymentInfo(budgetId: string): Promise<BudgetPaymentInfo | undefined> {
    return this.budgetPaymentInfo.find(bpi => bpi.budgetId === budgetId);
  }

  async createBudgetPaymentInfo(data: InsertBudgetPaymentInfo): Promise<BudgetPaymentInfo> {
    const newBudgetPaymentInfo: BudgetPaymentInfo = {
      id: `bpi-${Date.now()}-${Math.random()}`,
      ...data,
      createdAt: new Date().toISOString()
    };
    this.budgetPaymentInfo.push(newBudgetPaymentInfo);
    return newBudgetPaymentInfo;
  }

  async updateBudgetPaymentInfo(budgetId: string, data: Partial<InsertBudgetPaymentInfo>): Promise<BudgetPaymentInfo> {
    const index = this.budgetPaymentInfo.findIndex(bpi => bpi.budgetId === budgetId);
    if (index !== -1) {
      this.budgetPaymentInfo[index] = {
        ...this.budgetPaymentInfo[index],
        ...data
      };
      return this.budgetPaymentInfo[index];
    } else {
      // Create new if doesn't exist
      return this.createBudgetPaymentInfo({ budgetId, ...data } as InsertBudgetPaymentInfo);
    }
  }

  // Helper method to recalculate budget total
  private async recalculateBudgetTotal(budgetId: string): Promise<void> {
    const budget = await this.getBudget(budgetId);
    const items = await this.getBudgetItems(budgetId);

    if (!budget) return;

    let subtotal = items.reduce((sum, item) => {
      const basePrice = parseFloat(item.unitPrice || '0') * parseInt(item.quantity || '1');

      // Apply item customization if applicable (now as fixed value)
      if (item.hasItemCustomization) {
        const customizationValue = parseFloat(item.itemCustomizationValue || '0');
        return sum + basePrice + customizationValue;
      }

      return sum + basePrice;
    }, 0);

    // Apply discount if exists
    let finalTotal = subtotal;
    if (budget.hasDiscount) {
      if (budget.discountType === 'percentage') {
        const discountAmount = (subtotal * parseFloat(budget.discountPercentage || '0')) / 100;
        finalTotal = subtotal - discountAmount;
      } else if (budget.discountType === 'value') {
        finalTotal = subtotal - parseFloat(budget.discountValue || '0');
      }
    }

    await this.updateBudget(budgetId, {
      totalValue: Math.max(0, finalTotal).toFixed(2) // Ensure total is not negative
    });
  }

  // Added getAll method as per the changes
  getAll(table: string): any[] {
    switch(table) {
      case 'products':
        return Array.from(this.products.values());
      case 'orders':
        return Array.from(this.orders.values());
      case 'users':
        return Array.from(this.users.values());
      case 'budgets':
        return Array.from(this.budgets.values());
      case 'paymentMethods':
        return this.paymentMethods;
      case 'shippingMethods':
        return this.shippingMethods;
      default:
        return [];
    }
  }

  // Financial module methods - Accounts Receivable
  async getAccountsReceivable(): Promise<AccountsReceivable[]> {
    return Array.from(this.accountsReceivable.values());
  }

  async getAccountsReceivableByOrder(orderId: string): Promise<AccountsReceivable[]> {
    return Array.from(this.accountsReceivable.values()).filter(ar => ar.orderId === orderId);
  }

  async getAccountsReceivableByClient(clientId: string): Promise<AccountsReceivable[]> {
    return Array.from(this.accountsReceivable.values()).filter(ar => ar.clientId === clientId);
  }

  async getAccountsReceivableByVendor(vendorId: string): Promise<AccountsReceivable[]> {
    return Array.from(this.accountsReceivable.values()).filter(ar => ar.vendorId === vendorId);
  }

  async createAccountsReceivable(data: InsertAccountsReceivable): Promise<AccountsReceivable> {
    const newAR: AccountsReceivable = {
      id: randomUUID(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.accountsReceivable.set(newAR.id, newAR);
    return newAR;
  }

  async updateAccountsReceivable(id: string, data: Partial<InsertAccountsReceivable>): Promise<AccountsReceivable | undefined> {
    const existing = this.accountsReceivable.get(id);
    if (!existing) return undefined;

    const updated: AccountsReceivable = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };
    this.accountsReceivable.set(id, updated);
    return updated;
  }

  // Financial module methods - Payment Allocations
  async getPaymentAllocationsByPayment(paymentId: string): Promise<PaymentAllocation[]> {
    return Array.from(this.paymentAllocations.values()).filter(pa => pa.paymentId === paymentId);
  }

  async getPaymentAllocationsByReceivable(receivableId: string): Promise<PaymentAllocation[]> {
    return Array.from(this.paymentAllocations.values()).filter(pa => pa.receivableId === receivableId);
  }

  async createPaymentAllocation(data: InsertPaymentAllocation): Promise<PaymentAllocation> {
    const newPA: PaymentAllocation = {
      id: randomUUID(),
      ...data,
      allocatedAt: new Date()
    };
    this.paymentAllocations.set(newPA.id, newPA);
    return newPA;
  }

  async allocatePaymentToReceivable(paymentId: string, receivableId: string, amount: string): Promise<PaymentAllocation> {
    const allocation = await this.createPaymentAllocation({
      paymentId,
      receivableId,
      amount
    });

    // Update receivable amount
    const receivable = this.accountsReceivable.get(receivableId);
    if (receivable) {
      const currentReceived = parseFloat(receivable.receivedAmount);
      const allocationAmount = parseFloat(amount);
      const newReceived = currentReceived + allocationAmount;

      let status = receivable.status;
      if (newReceived >= parseFloat(receivable.amount)) {
        status = 'paid';
      } else if (newReceived > 0) {
        status = 'partial';
      }

      await this.updateAccountsReceivable(receivableId, {
        receivedAmount: newReceived.toFixed(2),
        status
      });
    }

    return allocation;
  }

  // Financial module methods - Bank Imports & Transactions
  async getBankImports(): Promise<BankImport[]> {
    return this.mockData.bankImports || [];
  }

  async getBankImport(id: string): Promise<BankImport | undefined> {
    return this.mockData.bankImports.find(imp => imp.id === id);
  }

  async createBankImport(data: InsertBankImport): Promise<BankImport> {
    const id = `import-${Date.now()}`;
    const bankImport: BankImport = {
      id,
      ...data,
      uploadedAt: new Date(),
      updatedAt: new Date()
    };
    this.mockData.bankImports.push(bankImport);
    return bankImport;
  }

  async updateBankImport(id: string, data: Partial<InsertBankImport>): Promise<BankImport | undefined> {
    const existing = this.mockData.bankImports.find(imp => imp.id === id);
    if (!existing) return undefined;

    const updated: BankImport = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };

    const index = this.mockData.bankImports.findIndex(imp => imp.id === id);
    if (index !== -1) {
      this.mockData.bankImports[index] = updated;
    }
    return updated;
  }

  async getBankTransactionsByImport(importId: string): Promise<BankTransaction[]> {
    return this.mockData.bankTransactions.filter(txn => txn.importId === importId) || [];
  }

  async getBankTransactions(): Promise<BankTransaction[]> {
    return this.mockData.bankTransactions || [];
  }

  async createBankTransaction(data: InsertBankTransaction): Promise<BankTransaction> {
    const id = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const transaction: BankTransaction = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockData.bankTransactions.push(transaction);
    return transaction;
  }

  async updateBankTransaction(id: string, data: Partial<InsertBankTransaction & { matchedOrderId?: string; matchedAt?: Date }>): Promise<BankTransaction | undefined> {
    const existing = this.mockData.bankTransactions.find(txn => txn.id === id);
    if (!existing) return undefined;

    const updated: BankTransaction = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };

    const index = this.mockData.bankTransactions.findIndex(txn => txn.id === id);
    if (index !== -1) {
      this.mockData.bankTransactions[index] = updated;
    }
    return updated;
  }

  async matchTransactionToReceivable(transactionId: string, receivableId: string): Promise<BankTransaction | undefined> {
    return await this.updateBankTransaction(transactionId, {
      status: 'matched',
      matchedReceivableId: receivableId,
      matchedAt: new Date()
    });
  }

  // Financial module methods - Expense Notes
  async getExpenseNotes(): Promise<ExpenseNote[]> {
    return this.mockData.expenseNotes || [];
  }

  async getExpenseNotesByVendor(vendorId: string): Promise<ExpenseNote[]> {
    return (this.mockData.expenseNotes || []).filter(en => en.vendorId === vendorId);
  }

  async getExpenseNotesByOrder(orderId: string): Promise<ExpenseNote[]> {
    return (this.mockData.expenseNotes || []).filter(en => en.orderId === orderId);
  }

  async createExpenseNote(data: InsertExpenseNote): Promise<ExpenseNote> {
    const id = `expense-${Date.now()}`;
    const expense: ExpenseNote = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockData.expenseNotes.push(expense);
    return expense;
  }

  async updateExpenseNote(id: string, data: Partial<InsertExpenseNote>): Promise<ExpenseNote | undefined> {
    const existing = this.mockData.expenseNotes.find(exp => exp.id === id);
    if (!existing) return undefined;

    const updated: ExpenseNote = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };

    const index = this.mockData.expenseNotes.findIndex(exp => exp.id === id);
    if (index !== -1) {
      this.mockData.expenseNotes[index] = updated;
    }
    return updated;
  }

  // Financial module methods - Commission Payouts
  async createCommissionPayout(data: InsertCommissionPayout): Promise<CommissionPayout> {
    const newPayout: CommissionPayout = {
      id: randomUUID(),
      ...data,
      createdAt: new Date(),
    };
    this.mockData.commissionPayouts.push(newPayout);
    return newPayout;
  }

  async getCommissionPayouts(): Promise<CommissionPayout[]> {
    return this.mockData.commissionPayouts;
  }

  // Customization Options
  async createCustomizationOption(data: InsertCustomizationOption): Promise<CustomizationOption> {
    const newOption: CustomizationOption = {
      id: randomUUID(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!this.mockData.customizationOptions) {
      this.mockData.customizationOptions = [];
    }

    this.mockData.customizationOptions.push(newOption);
    console.log('Created customization option:', newOption);

    // Garantir que a categoria está salva para uso futuro
    if (data.category && !this.mockData.customizationCategories) {
      this.mockData.customizationCategories = [];
    }

    if (data.category && !this.mockData.customizationCategories.includes(data.category)) {
      this.mockData.customizationCategories.push(data.category);
      console.log('Added new category to customizations:', data.category);
    }

    return newOption;
  }

  async getCustomizationOptions(): Promise<CustomizationOption[]> {
    if (!this.mockData.customizationOptions) {
      this.mockData.customizationOptions = [];
    }
    return this.mockData.customizationOptions;
  }

  async getCustomizationOptionsByCategory(category: string, quantity: number): Promise<CustomizationOption[]> {
    if (!this.mockData.customizationOptions) {
      this.mockData.customizationOptions = [];
    }
    return this.mockData.customizationOptions.filter(option =>
      option.category === category &&
      option.minQuantity <= quantity &&
      option.isActive
    );
  }

  async updateCustomizationOption(id: string, data: Partial<InsertCustomizationOption>): Promise<CustomizationOption | undefined> {
    if (!this.mockData.customizationOptions) {
      this.mockData.customizationOptions = [];
    }

    const index = this.mockData.customizationOptions.findIndex(option => option.id === id);
    if (index === -1) return undefined;

    const updated: CustomizationOption = {
      ...this.mockData.customizationOptions[index],
      ...data,
      updatedAt: new Date(),
    };
    this.mockData.customizationOptions[index] = updated;
    console.log('Updated customization option:', updated);

    // Also update categories if changed
    if (data.category && !this.mockData.customizationCategories.includes(data.category)) {
      this.mockData.customizationCategories.push(data.category);
      console.log('Added new category to customizations:', data.category);
    }

    return updated;
  }

  async deleteCustomizationOption(id: string): Promise<boolean> {
    if (!this.mockData.customizationOptions) {
      this.mockData.customizationOptions = [];
    }

    const index = this.mockData.customizationOptions.findIndex(option => option.id === id);
    if (index === -1) return false;

    this.mockData.customizationOptions.splice(index, 1);
    console.log('Deleted customization option with id:', id);
    return true;
  }
}

export const storage = new MemStorage();
</replit_final_file>