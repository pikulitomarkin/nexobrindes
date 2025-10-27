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
  type InsertCustomizationOption,
  // Producer Payment types
  type ProducerPayment,
  type InsertProducerPayment,
  // Branch types
  type Branch,
  type InsertBranch,
  // System Log types
  type SystemLog,
  type InsertSystemLog,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm"; // Assuming drizzle-orm is used for DB operations
import { db } from "./db"; // Assuming db connection is set up here

// Helper function to generate IDs (replace with a more robust solution if needed)
function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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
  updateProductionOrderValue(id: string, value: string, notes?: string, lockValue?: boolean): Promise<ProductionOrder | undefined>;
  updateProductionOrder(id: string, updates: Partial<ProductionOrder>): Promise<ProductionOrder | undefined>;

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
  updateCommissionsByOrderStatus(orderId: string, orderStatus: string): Promise<void>;

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
    producer?: string; // Added producer filter
  }): Promise<{ products: any[]; total: number; page: number; totalPages: number; }>;
  getProduct(id: string): Promise<any>;
  createProduct(productData: any): Promise<any>;
  updateProduct(id: string, productData: any): Promise<any>;
  deleteProduct(id: string): Promise<boolean>;
  importProducts(productsData: any[]): Promise<{ imported: number; errors: string[] }>;
  importProductsForProducer(productsData: any[], producerId: string): Promise<{ imported: number; errors: string[] }>;
  searchProducts(query: string): Promise<any[]>;
  getProductsByProducer(producerId: string): Promise<any[]>;
  getProductsGroupedByProducer(): Promise<{ [key: string]: any[] }>;

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
  createAccountsReceivable(data: any): Promise<any>;
  updateAccountsReceivable(id: string, data: any): Promise<any>;

  // Financial module - Payment Allocations
  getPaymentAllocationsByPayment(paymentId: string): Promise<PaymentAllocation[]>;
  getPaymentAllocationsByReceivable(receivableId: string): Promise<PaymentAllocation[]>;
  createPaymentAllocation(data: InsertPaymentAllocation): Promise<PaymentAllocation>;
  allocatePaymentToReceivable(paymentId: string, receivableId: string, amount: string): Promise<PaymentAllocation>;

  // Financial module - Bank Imports & Transactions
  getBankImports(): Promise<BankImport[]>;
  getBankImport(id: string): Promise<BankImport | undefined>;
  createBankImport(data: InsertBankImport): Promise<BankImport>;
  updateBankImport(id: string, data: Partial<InsertBankImport>): Promise<BankImport | undefined>;
  getBankTransactionsByImport(importId: string): Promise<BankTransaction[]>;
  getBankTransactions(): Promise<BankTransaction[]>;
  getBankTransaction(id: string): Promise<BankTransaction | undefined>;
  getBankTransactionByFitId(fitId: string): Promise<BankTransaction | undefined>;
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

  // Manual Receivables
  createManualReceivable(data: any): Promise<any>;
  getManualReceivables(): Promise<any[]>;

  // Manual Payables
  createManualPayable(data: any): Promise<any>;
  getManualPayables(): Promise<any[]>;
  updateManualPayable(id: string, updates: any): Promise<any>;

  // Customization Options
  createCustomizationOption(data: InsertCustomizationOption): Promise<CustomizationOption>;
  getCustomizationOptions(): Promise<CustomizationOption[]>;
  getCustomizationOptionsByCategory(category: string, quantity: number): Promise<CustomizationOption[]>;
  updateCustomizationOption(id: string, data: Partial<InsertCustomizationOption>): Promise<CustomizationOption | undefined>;
  deleteCustomizationOption(id: string): Promise<boolean>;

  // Producer Payments
  getProducerPayments(): Promise<ProducerPayment[]>;
  getProducerPaymentsByProducer(producerId: string): Promise<ProducerPayment[]>;
  getProducerPaymentByProductionOrderId(productionOrderId: string): Promise<ProducerPayment | undefined>;
  createProducerPayment(data: InsertProducerPayment): Promise<ProducerPayment>;
  updateProducerPayment(id: string, data: Partial<InsertProducerPayment>): Promise<ProducerPayment | undefined>;
  getProducerPayment(id: string): Promise<ProducerPayment | undefined>;

  // Quote Requests
  createConsolidatedQuoteRequest(data: any): Promise<any>; // New method for consolidated requests
  createQuoteRequest(data: any): Promise<any>;
  getQuoteRequestsByVendor(vendorId: string): Promise<any[]>;
  getQuoteRequestsByClient(clientId: string): Promise<any[]>;
  getQuoteRequestById(id: string): Promise<any>; // New method to get a quote request by its ID
  updateQuoteRequestStatus(id: string, status: string): Promise<any>;

  // Branches
  getBranches(): Promise<Branch[]>;
  getBranch(id: string): Promise<Branch | null>;
  createBranch(branchData: InsertBranch): Promise<Branch>;
  updateBranch(id: string, updateData: Partial<Branch>): Promise<Branch | null>;
  deleteBranch(id: string): Promise<boolean>;

  // System Logs
  getSystemLogs(filters?: {
    search?: string;
    action?: string;
    userId?: string;
    level?: string;
    dateFilter?: string;
  }): Promise<SystemLog[]>;
  createSystemLog(logData: InsertSystemLog): Promise<SystemLog>;
  logUserAction(
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
  ): Promise<void>;
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
  private budgetItems: Map<string, any>; // Changed to Map
  private budgetPhotos: Map<string, any>; // Changed to Map
  private producerPayments: Map<string, ProducerPayment>; // Added for producer payments
  private quoteRequests: any[] = []; // Added for quote requests
  private branches: Map<string, Branch>; // Add map for branches

  // Financial module storage
  private accountsReceivable: Map<string, AccountsReceivable>;
  private paymentAllocations: Map<string, PaymentAllocation>;
  private bankImports: Map<string, BankImport>;
  private bankTransactions: Map<string, BankTransaction>;
  private expenseNotes: Map<string, ExpenseNote>;
  private commissionPayouts: Map<string, CommissionPayout>;

  // Mock data, including manual receivables, payables, and system logs
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
    financialNotes: [] as any[], // Added for financial notes
    manualReceivables: [] as any[], // Added for manual receivables
    manualPayables: [] as any[], // Added for manual payables
    systemLogs: [] as SystemLog[], // Added for system logs
    branches: [] as Branch[], // Added for branches
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
      installmentInterest: "0.00",
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
    this.budgetItems = new Map(); // Initialize as Map
    this.budgetPhotos = new Map(); // Initialize as Map
    this.producerPayments = new Map(); // Initialize producerPayments Map
    this.branches = new Map(); // Initialize branches Map

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

  // Helper to load all mock data
  private async loadData(): Promise<any> {
    // Ensure all necessary arrays/maps are initialized before returning
    if (!this.mockData.users) this.mockData.users = [];
    if (!this.mockData.clients) this.mockData.clients = [];
    if (!this.mockData.orders) this.mockData.orders = [];
    if (!this.mockData.productionOrders) this.mockData.productionOrders = [];
    if (!this.mockData.payments) this.mockData.payments = [];
    if (!this.mockData.commissions) this.mockData.commissions = [];
    if (!this.mockData.partners) this.mockData.partners = [];
    if (!this.mockData.commissionSettings) this.mockData.commissionSettings = [];
    if (!this.mockData.vendors) this.mockData.vendors = [];
    if (!this.mockData.products) this.mockData.products = [];
    if (!this.mockData.budgets) this.mockData.budgets = [];
    if (!this.mockData.budgetItems) this.mockData.budgetItems = [];
    if (!this.mockData.budgetPhotos) this.mockData.budgetPhotos = [];
    if (!this.mockData.paymentMethods) this.mockData.paymentMethods = [];
    if (!this.mockData.shippingMethods) this.mockData.shippingMethods = [];
    if (!this.mockData.budgetPaymentInfo) this.mockData.budgetPaymentInfo = [];
    if (!this.mockData.accountsReceivable) this.mockData.accountsReceivable = [];
    if (!this.mockData.paymentAllocations) this.mockData.paymentAllocations = [];
    if (!this.mockData.bankImports) this.mockData.bankImports = [];
    if (!this.mockData.bankTransactions) this.mockData.bankTransactions = [];
    if (!this.mockData.expenseNotes) this.mockData.expenseNotes = [];
    if (!this.mockData.commissionPayouts) this.mockData.commissionPayouts = [];
    if (!this.mockData.customizationOptions) this.mockData.customizationOptions = [];
    if (!this.mockData.customizationCategories) this.mockData.customizationCategories = [];
    if (!this.mockData.financialNotes) this.mockData.financialNotes = [];
    if (!this.mockData.manualReceivables) this.mockData.manualReceivables = [];
    if (!this.mockData.manualPayables) this.mockData.manualPayables = [];
    if (!this.mockData.systemLogs) this.mockData.systemLogs = [];
    if (!this.mockData.branches) this.mockData.branches = [];

    return Promise.resolve(this.mockData);
  }

  // Helper to save all mock data
  private async saveData(data: any): Promise<void> {
    this.mockData = data;
    return Promise.resolve();
  }

  // Create test users for each role
  private createTestUsers() {
    // Override existing users with test users
    this.users.clear();
    this.clients.clear(); // Limpar clientes existentes também

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

    // Create 3 partners - they can edit their names later
    const partner1User = {
      id: "partner-1",
      username: "socio1",
      password: "123456",
      name: "Sócio 1",
      email: "socio1@erp.com",
      phone: null,
      vendorId: null,
      role: "partner",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(partner1User.id, partner1User);

    const partner2User = {
      id: "partner-2",
      username: "socio2",
      password: "123456",
      name: "Sócio 2",
      email: "socio2@erp.com",
      phone: null,
      vendorId: null,
      role: "partner",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(partner2User.id, partner2User);

    const partner3User = {
      id: "partner-3",
      username: "socio3",
      password: "123456",
      name: "Sócio 3",
      email: "socio3@erp.com",
      phone: null,
      vendorId: null,
      role: "partner",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(partner3User.id, partner3User);

    // Logistics user
    const logisticsUser = {
      id: "logistics-1",
      username: "logistica1",
      password: "123456",
      name: "Maria Transportes",
      email: "maria@logistica.com",
      phone: "(11) 98765-1111",
      vendorId: null,
      role: "logistics",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(logisticsUser.id, logisticsUser);

    // Finance user
    const financeUser = {
      id: "finance-1",
      username: "financeiro1",
      password: "123456",
      name: "Departamento Financeiro",
      email: "financeiro@erp.com",
      phone: "(11) 98765-2222",
      vendorId: null,
      role: "finance",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(financeUser.id, financeUser);

    console.log("Criando clientes pré-cadastrados...");

    // Recriar clientes pré-cadastrados com userCode
    const preClient1: Client & { userCode?: string } = {
      id: "client-1",
      userId: "client-1", // Vinculado ao user client-1
      name: "João Silva",
      email: "joao@gmail.com",
      phone: "(11) 98765-4321",
      whatsapp: null,
      cpfCnpj: "123.456.789-00",
      address: "Rua das Flores, 123 - São Paulo, SP",
      vendorId: "vendor-1",
      userCode: "CLI001",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const preClient2: Client & { userCode?: string } = {
      id: "client-2",
      userId: null, // Cliente sem conta de usuário
      name: "Maria Santos",
      email: "maria@email.com",
      phone: "(11) 99999-8888",
      whatsapp: "(11) 99999-8888",
      cpfCnpj: "987.654.321-00",
      address: "Av. Principal, 456 - São Paulo, SP",
      vendorId: "vendor-1",
      userCode: "CLI002",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const preClient3: Client & { userCode?: string } = {
      id: "client-3",
      userId: null, // Cliente sem conta de usuário
      name: "Ana Costa",
      email: "ana@email.com",
      phone: "(11) 97777-6666",
      whatsapp: "(11) 97777-6666",
      cpfCnpj: "111.222.333-44",
      address: "Rua dos Bobos, 0 - Centro, São Paulo, SP",
      vendorId: "vendor-1",
      userCode: "CLI003",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const preClient4: Client & { userCode?: string } = {
      id: "client-4",
      userId: null,
      name: "Pedro Oliveira",
      email: "pedro@empresa.com",
      phone: "(11) 96666-5555",
      whatsapp: null,
      cpfCnpj: "12.345.678/0001-90",
      address: "Av. Paulista, 1000 - Bela Vista, São Paulo, SP",
      vendorId: "vendor-1",
      userCode: "CLI004",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const preClient5: Client & { userCode?: string } = {
      id: "client-5",
      userId: null,
      name: "Empresa ABC Ltda",
      email: "contato@abc.com.br",
      phone: "(11) 95555-4444",
      whatsapp: "(11) 95555-4444",
      cpfCnpj: "23.456.789/0001-12",
      address: "Rua do Comércio, 500 - Vila Madalena, São Paulo, SP",
      vendorId: "vendor-1",
      userCode: "CLI005",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.clients.set(preClient1.id, preClient1);
    this.clients.set(preClient2.id, preClient2);
    this.clients.set(preClient3.id, preClient3);
    this.clients.set(preClient4.id, preClient4);
    this.clients.set(preClient5.id, preClient5);

    console.log(`Clientes pré-cadastrados criados: ${this.clients.size} clientes`);
    console.log("Clientes:", Array.from(this.clients.values()).map(c => ({ id: c.id, name: c.name, userCode: c.userCode, vendorId: c.vendorId })));
  }

  private initializeData() {
    // This will be called first, then createTestUsers() will override with test users
    const adminUser: User = {
      id: "admin-1",
      username: "admin",
      password: "123",
      role: "admin",
      name: "Administrador do Sistema",
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

    // Create client profiles
    const client1: Client = {
      id: "client-1",
      userId: "client-1",
      name: "João Silva",
      email: "joao@gmail.com",
      phone: "(11) 98765-4321",
      whatsapp: null,
      cpfCnpj: null,
      address: "Rua das Flores, 123 - São Paulo",
      vendorId: "vendor-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const client2: Client = {
      id: "client-2",
      userId: null,
      name: "Maria Santos",
      email: "maria@email.com",
      phone: "(11) 99999-8888",
      whatsapp: null,
      cpfCnpj: null,
      address: "Av. Principal, 456 - São Paulo",
      vendorId: "vendor-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.clients.set(client1.id, client1);
    this.clients.set(client2.id, client2);

    // Adicionar mais alguns clientes de exemplo
    const client3: Client = {
      id: "client-3",
      userId: null,
      name: "Ana Costa",
      email: "ana@email.com",
      phone: "(11) 97777-6666",
      whatsapp: "(11) 97777-6666",
      cpfCnpj: "987.654.321-00",
      address: "Rua dos Bobos, 0 - Centro, São Paulo, SP",
      vendorId: "vendor-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const client4: Client = {
      id: "client-4",
      userId: null,
      name: "Pedro Oliveira",
      email: "pedro@empresa.com",
      phone: "(11) 96666-5555",
      whatsapp: null,
      cpfCnpj: "12.345.678/0001-90",
      address: "Av. Paulista, 1000 - Bela Vista, São Paulo, SP",
      vendorId: "vendor-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const client5: Client = {
      id: "client-5",
      userId: null,
      name: "Empresa ABC Ltda",
      email: "contato@abc.com.br",
      phone: "(11) 95555-4444",
      whatsapp: "(11) 95555-4444",
      cpfCnpj: "23.456.789/0001-12",
      address: "Rua do Comércio, 500 - Vila Madalena, São Paulo, SP",
      vendorId: "vendor-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.clients.set(client3.id, client3);
    this.clients.set(client4.id, client4);
    this.clients.set(client5.id, client5);

    // Limpar dados de pedidos, orçamentos, etc.
    mockOrders = [];
    mockBudgets = [];

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
        producerId: 'producer-1',
        type: 'external',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'product-2',
        name: 'Cadeira Estofada',
        description: 'Cadeira com estofado em couro sintético',
        category: 'Móveis',
        basePrice: '450.00',
        unit: 'un',
        isActive: true,
        producerId: 'producer-1',
        type: 'external',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'product-3',
        name: 'Estante Modular',
        description: 'Estante com módulos personalizáveis',
        category: 'Móveis',
        basePrice: '1200.00',
        unit: 'm',
        isActive: true,
        producerId: 'internal',
        type: 'internal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'product-4',
        name: 'Caneca Personalizada',
        description: 'Caneca de cerâmica branca 325ml para sublimação',
        category: 'Brindes',
        basePrice: '12.50',
        unit: 'un',
        isActive: true,
        producerId: 'internal',
        type: 'internal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'product-5',
        name: 'Mochila Promocional',
        description: 'Mochila em nylon resistente com compartimentos',
        category: 'Mochila',
        basePrice: '85.00',
        unit: 'un',
        isActive: true,
        producerId: 'internal',
        type: 'internal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'product-6',
        name: 'Camiseta Personalizada',
        description: 'Camiseta 100% algodão para estampa',
        category: 'Vestuário',
        basePrice: '25.00',
        unit: 'un',
        isActive: true,
        producerId: 'internal',
        type: 'internal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'product-7',
        name: 'Agenda Executiva',
        description: 'Agenda com logomarca personalizada',
        category: 'Papelaria',
        basePrice: '45.00',
        unit: 'un',
        isActive: true,
        producerId: 'internal',
        type: 'internal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'product-8',
        name: 'Copo Térmico',
        description: 'Copo térmico em aço inox com tampa',
        category: 'Copo',
        basePrice: '35.00',
        unit: 'un',
        isActive: true,
        producerId: 'internal',
        type: 'internal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    mockProducts.forEach(product => {
      this.products.set(product.id, product);
    });

    // Create sample payment methods
    this.paymentMethods = [
      {
        id: "pm-1",
        name: "PIX",
        type: "pix",
        maxInstallments: 1,
        installmentInterest: "0.00",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "pm-2",
        name: "Cartão de Crédito",
        type: "credit_card",
        maxInstallments: 12,
        installmentInterest: "2.50",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "pm-3",
        name: "Transferência Bancária",
        type: "transfer",
        maxInstallments: 1,
        installmentInterest: "0.00",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Create sample shipping methods
    this.shippingMethods = [
      {
        id: "sm-1",
        name: "Correios PAC",
        type: "calculated",
        basePrice: "0.00",
        freeShippingThreshold: "200.00",
        estimatedDays: 8,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "sm-2",
        name: "Correios SEDEX",
        type: "calculated",
        basePrice: "0.00",
        freeShippingThreshold: "300.00",
        estimatedDays: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "sm-3",
        name: "Entrega Própria",
        type: "fixed",
        basePrice: "50.00",
        freeShippingThreshold: "500.00",
        estimatedDays: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "sm-4",
        name: "Retirada no Local",
        type: "free",
        basePrice: "0.00",
        freeShippingThreshold: "0.00",
        estimatedDays: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Initialize default commission settings
    const defaultCommissionSettings: CommissionSettings = {
      id: "commission-settings-1",
      vendorCommissionRate: "10.00",
      partnerCommissionRate: "15.00",
      vendorPaymentTiming: "order_completion",
      partnerPaymentTiming: "order_start",
      isActive: true,
      updatedAt: new Date()
    };
    this.mockData.commissionSettings.push(defaultCommissionSettings);

    // Create sample customization options - apenas 3 diferentes
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
        id: "custom-3",
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

    // Limpar dados financeiros e transacionais
    this.mockData.accountsReceivable = [];
    this.mockData.expenseNotes = [];
    this.mockData.manualReceivables = [];
    this.mockData.manualPayables = [];
    this.mockData.bankTransactions = [];
    this.mockData.systemLogs = []; // Initialize system logs
    this.mockData.branches = []; // Initialize branches
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
      branchId: vendorData.branchId || null, // Assign branchId
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

  // Client methods
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const newClient: Client = {
      id: randomUUID(),
      userId: clientData.userId,
      name: clientData.name,
      email: clientData.email || null,
      phone: clientData.phone || null,
      whatsapp: clientData.whatsapp || null,
      cpfCnpj: clientData.cpfCnpj || null,
      address: clientData.address || null,
      vendorId: clientData.vendorId,
      branchId: clientData.branchId || null, // Include branchId from vendor
      isActive: clientData.isActive !== undefined ? clientData.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.clients.set(newClient.id, newClient);
    return newClient;
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
    // Get all orders and enrich them with budget item details, including producer names
    const ordersWithItems = await Promise.all(Array.from(this.orders.values()).map(async (order) => {
      let budgetItems = [];
      if (order.budgetId) {
        // Get budget items with product details
        const items = await this.getBudgetItems(order.budgetId);
        budgetItems = await Promise.all(
          items.map(async (item) => {
            const product = await this.getProduct(item.productId);
            let producerName = null;
            if (item.producerId && item.producerId !== 'internal') {
              const producer = await this.getUser(item.producerId);
              producerName = producer?.name || `Produtor ${item.producerId.slice(-6)}`;
            }
            return {
              ...item,
              producerName: producerName,
              product: {
                name: product?.name || 'Produto não encontrado',
                description: product?.description || '',
                category: product?.category || '',
                imageLink: product?.imageLink || ''
              }
            };
          })
        );
      }
      return { ...order, items: budgetItems };
    }));
    return ordersWithItems;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    let budgetItems = [];
    if (order.budgetId) {
      // Get budget items with product details
      const items = await this.getBudgetItems(order.budgetId);
      budgetItems = await Promise.all(
        items.map(async (item) => {
          const product = await this.getProduct(item.productId);
          let producerName = null;
          if (item.producerId && item.producerId !== 'internal') {
            const producer = await this.getUser(item.producerId);
            producerName = producer?.name || `Produtor ${item.producerId.slice(-6)}`;
          }
          return {
            ...item,
            producerName: producerName,
            product: {
              name: product?.name || 'Produto não encontrado',
              description: product?.description || '',
              category: product?.category || '',
              imageLink: product?.imageLink || ''
            }
          };
        })
      );
    }
    return { ...order, items: budgetItems };
  }


  async createOrder(orderData: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...orderData,
      id,
      orderNumber: orderData.orderNumber || `PED-${Date.now()}`, // Garantir que orderNumber seja definido
      producerId: orderData.producerId || null,
      budgetId: orderData.budgetId || null,
      description: orderData.description || null,
      paidValue: orderData.paidValue || "0.00",
      deadline: orderData.deadline || null,
      trackingCode: orderData.trackingCode || null,
      status: orderData.status || 'pending',
      refundAmount: orderData.refundAmount || "0.00", // Initialize refundAmount
      refundNotes: orderData.refundNotes || null, // Initialize refundNotes
      createdAt: new Date(),
      updatedAt: new Date(),
      // Contact information - always store this
      contactName: orderData.contactName || "",
      contactPhone: orderData.contactPhone || "",
      contactEmail: orderData.contactEmail || "",
      deliveryType: orderData.deliveryType || "delivery",
      // Order items and payment info
      items: orderData.items || [],
      paymentMethodId: orderData.paymentMethodId || "",
      shippingMethodId: orderData.shippingMethodId || "",
      installments: orderData.installments || 1,
      downPayment: orderData.downPayment !== undefined ? orderData.downPayment.toString() : '0.00',
      remainingAmount: orderData.remainingAmount !== undefined ? orderData.remainingAmount.toString() : '0.00',
      shippingCost: orderData.shippingCost !== undefined ? orderData.shippingCost.toString() : '0.00',
      hasDiscount: orderData.hasDiscount || false,
      discountType: orderData.discountType || "percentage",
      discountPercentage: orderData.discountPercentage !== undefined ? orderData.discountPercentage.toString() : '0.00',
      discountValue: orderData.discountValue !== undefined ? orderData.discountValue.toString() : '0.00'
    };
    this.orders.set(id, order);

    // Automatically create AccountsReceivable entry for this new order
    await this.createAccountsReceivableForOrder(order);

    // Automatically calculate and create commissions for this new order
    await this.calculateCommissions(order);

    // Auto-deduct partner commissions if any are marked for deduction
    await this.autoDeductPartnerCommissions(order);

    return order;
  }

  private async createAccountsReceivableForOrder(order: Order): Promise<void> {
    const paidValue = parseFloat(order.paidValue || "0");
    const totalValue = parseFloat(order.totalValue);
    const downPayment = parseFloat(order.downPayment || "0");
    const shippingCost = parseFloat(order.shippingCost || "0");

    console.log(`[CREATE RECEIVABLE] Order ${order.orderNumber}: totalValue=${order.totalValue}, paidValue=${order.paidValue}, downPayment=${order.downPayment}, shippingCost=${order.shippingCost}`);

    // O pagamento mínimo é SEMPRE entrada + frete quando há entrada definida
    // Se não há entrada definida, o pagamento mínimo é 0 (opcional)
    const minimumPaymentValue = downPayment > 0 ? (downPayment + shippingCost).toFixed(2) : "0.00";

    let status: 'pending' | 'partial' | 'paid' | 'overdue' = 'pending';
    if (paidValue >= totalValue) {
      status = 'paid';
    } else if (paidValue > 0) {
      // Check if minimum payment requirement is met
      if (parseFloat(minimumPaymentValue) > 0 && paidValue >= parseFloat(minimumPaymentValue)) {
        status = 'partial';
      } else if (parseFloat(minimumPaymentValue) > 0 && paidValue < parseFloat(minimumPaymentValue)) {
        status = 'pending'; // Minimum not met
      } else {
        status = 'partial'; // No minimum requirement
      }
    }

    // Check if overdue
    const dueDate = order.deadline ? new Date(order.deadline) : null;
    if (dueDate && new Date() > dueDate && status !== 'paid') {
      status = 'overdue';
    }

    const receivable: AccountsReceivable = {
      id: `ar-${order.id}`,
      orderId: order.id,
      clientId: order.clientId,
      vendorId: order.vendorId || 'vendor-1',
      description: `Venda: ${order.product}`,
      amount: totalValue.toFixed(2),
      receivedAmount: order.paidValue || "0.00",
      dueDate: order.deadline,
      minimumPayment: minimumPaymentValue, // Set the calculated minimum payment
      status: status,
      type: 'sale',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log(`[CREATE RECEIVABLE] Created receivable ar-${order.id}: amount=${receivable.amount}, minimumPayment=${receivable.minimumPayment}, status=${receivable.status}`);

    this.accountsReceivable.set(receivable.id, receivable);
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    //SEGURANÇA: Nunca permitir que fluxos de pagamento alterem totalValue
    const sanitized = { ...updates };

    // Proteção específica contra alteração acidental de totalValue em fluxos de pagamento
    if ('totalValue' in sanitized && sanitized.totalValue !== undefined) {
      const origin = (sanitized as any).__origin;

      // Se vier de fluxos de receivables/pagamento, bloquear mudança de totalValue
      if (origin === 'receivables' || origin === 'payment') {
        console.warn(`[SECURITY] Blocked totalValue change from ${origin} for order ${id}. Current: ${order.totalValue}, Attempted: ${sanitized.totalValue}`);
        delete (sanitized as any).totalValue;
      }
    }

    // Remove o campo __origin da atualização final
    if ('__origin' in sanitized) {
      delete (sanitized as any).__origin;
    }

    // NUNCA alterar o valor total do pedido em operações normais - isso deve ser feito apenas em operações específicas
    const updatedOrder = { ...order, ...sanitized, updatedAt: new Date() };
    this.orders.set(id, updatedOrder);

    // Update AccountsReceivable if totalValue, refundAmount, or downPayment changes
    if (updates.totalValue !== undefined || updates.refundAmount !== undefined || updates.downPayment !== undefined || updates.shippingCost !== undefined) {
      const receivableId = `ar-${id}`;
      const receivable = this.accountsReceivable.get(receivableId);
      if (receivable) {
        // Calculate expected amount based on payment info - MANTER O VALOR ORIGINAL DO PEDIDO
        let expectedAmount = parseFloat(order.totalValue); // NUNCA alterar o valor total do pedido
        let minimumPaymentValue = "0.00";

        // If order was converted from budget, get budget payment info
        if (order.budgetId) {
          const budgetPaymentInfo = await this.getBudgetPaymentInfo(order.budgetId);
          if (budgetPaymentInfo) {
            const budgetDownPayment = parseFloat(budgetPaymentInfo.downPayment || '0');
            const budgetShipping = parseFloat(budgetPaymentInfo.shippingCost || '0');

            if (budgetDownPayment > 0 || budgetShipping > 0) {
              minimumPaymentValue = (budgetDownPayment + budgetShipping).toFixed(2);
            }
          }
        }

        // Get current payments for this order
        const payments = await this.getPaymentsByOrder(order.id);
        const currentPaid = payments
          .filter(p => p.status === 'confirmed')
          .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        // Update minimum payment if new values provided
        const newDownPayment = parseFloat(updatedOrder.downPayment?.toString() || '0');
        const newShippingCost = parseFloat(updatedOrder.shippingCost?.toString() || '0');

        // Atualizar apenas o pagamento mínimo, NÃO o valor esperado total
        if (newDownPayment > 0 || newShippingCost > 0) {
          minimumPaymentValue = (newDownPayment + newShippingCost).toFixed(2);
        }

        // Status calculation logic based on currentPaid, expectedAmount, and minimumPaymentValue
        let status: 'pending' | 'partial' | 'paid' | 'overdue' = 'pending';
        if (currentPaid >= expectedAmount) {
          status = 'paid';
        } else if (currentPaid > 0) {
          const minPayment = parseFloat(minimumPaymentValue);
          if (minPayment > 0 && currentPaid >= minPayment) {
            status = 'partial';
          } else if (minPayment > 0 && currentPaid < minPayment) {
            status = 'pending';
          } else {
            status = 'partial';
          }
        }

        const dueDate = updatedOrder.deadline ? new Date(updatedOrder.deadline) : null;
        if (dueDate && new Date() > dueDate && status !== 'paid') {
          status = 'overdue';
        }

        await this.updateAccountsReceivable(receivableId, {
          amount: expectedAmount.toFixed(2), // Keep original total amount
          receivedAmount: currentPaid.toFixed(2),
          minimumPayment: minimumPaymentValue,
          status: status,
          dueDate: updatedOrder.deadline
        });
      }
    }

    return updatedOrder;
  }


  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      const updatedOrder = { ...order, status, updatedAt: new Date() };
      this.orders.set(id, updatedOrder);

      // Process commission payments
      await this.processCommissionPayments(updatedOrder, status);

      // Update commissions based on order status
      await this.updateCommissionsByOrderStatus(id, status);

      return updatedOrder;
    }
    return undefined;
  }

  async getOrdersByVendor(vendorId: string): Promise<Order[]> {
    // Get orders and enrich with budget items
    const ordersWithItems = await Promise.all(Array.from(this.orders.values())
      .filter(order => order.vendorId === vendorId)
      .map(async (order) => {
        let budgetItems = [];
        if (order.budgetId) {
          // Get budget items with product details
          const items = await this.getBudgetItems(order.budgetId);
          budgetItems = await Promise.all(
            items.map(async (item) => {
              const product = await this.getProduct(item.productId);
              let producerName = null;
              if (item.producerId && item.producerId !== 'internal') {
                const producer = await this.getUser(item.producerId);
                producerName = producer?.name || `Produtor ${item.producerId.slice(-6)}`;
              }
              return {
                ...item,
                producerName: producerName,
                product: {
                  name: product?.name || 'Produto não encontrado',
                  description: product?.description || '',
                  category: product?.category || '',
                  imageLink: product?.imageLink || ''
                }
              };
            })
          );
        }
        return { ...order, items: budgetItems };
      }));
    return ordersWithItems;
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

    // Enrich matching orders with budget items
    const enrichedOrders = await Promise.all(matchingOrders.map(async (order) => {
      let budgetItems = [];
      if (order.budgetId) {
        // Get budget items with product details
        const items = await this.getBudgetItems(order.budgetId);
        budgetItems = await Promise.all(
          items.map(async (item) => {
            const product = await this.getProduct(item.productId);
            let producerName = null;
            if (item.producerId && item.producerId !== 'internal') {
              const producer = await this.getUser(item.producerId);
              producerName = producer?.name || `Produtor ${item.producerId.slice(-6)}`;
            }
            return {
              ...item,
              producerName: producerName,
              product: {
                name: product?.name || 'Produto não encontrado',
                description: product?.description || '',
                category: product?.category || '',
                imageLink: product?.imageLink || ''
              }
            };
          })
        );
      }
      return { ...order, items: budgetItems };
    }));

    return enrichedOrders;
  }

  async getClientsByVendor(vendorId: string): Promise<Client[]> {
    console.log(`Storage: getClientsByVendor for vendorId: ${vendorId}`);
    console.log(`Storage: this.clients size: ${this.clients.size}`);
    const allClients = Array.from(this.clients.values());
    console.log(`Storage: Total clients available:`, allClients.map(c => ({ id: c.id, name: c.name, vendorId: c.vendorId })));

    const filteredClients = allClients.filter(client => {
      const isMatch = client.vendorId === vendorId;
      console.log(`Storage: Client ${client.name} (${client.id}) - vendorId: ${client.vendorId}, matches ${vendorId}: ${isMatch}`);
      return isMatch;
    });

    console.log(`Storage: Filtered clients for vendor ${vendorId}:`, filteredClients.map(c => ({ id: c.id, name: c.name, vendorId: c.vendorId })));

    return filteredClients;
  }

  // Production Order methods
  async getProductionOrders(): Promise<ProductionOrder[]> {
    return Array.from(this.productionOrders.values());
  }

  async getProductionOrdersByProducer(producerId: string): Promise<ProductionOrder[]> {
    console.log(`Storage: Getting production orders for producer: ${producerId}`);
    const productionOrders = Array.from(this.productionOrders.values()).filter(po => po.producerId === producerId);

    console.log(`Storage: Found ${productionOrders.length} production orders for producer ${producerId}:`, productionOrders.map(o => ({ id: o.id, orderId: o.orderId, status: o.status })));
    return productionOrders;
  }

  async getProductionOrdersByOrder(orderId: string): Promise<ProductionOrder[]> {
    return Array.from(this.productionOrders.values()).filter(po => po.orderId === orderId);
  }

  async createProductionOrder(insertProductionOrder: InsertProductionOrder & { orderDetails?: string }): Promise<ProductionOrder> {
    const id = randomUUID();
    const productionOrder: ProductionOrder & { orderDetails?: string } = {
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
      shippingAddress: insertProductionOrder.shippingAddress || null,
      producerValue: insertProductionOrder.producerValue || '0.00', // Default value
      producerValueLocked: insertProductionOrder.producerValueLocked || false, // Default locked status
      orderDetails: (insertProductionOrder as any).orderDetails || null, // Store detailed order info
    };
    this.productionOrders.set(id, productionOrder);
    return productionOrder;
  }

  async getProductionOrder(id: string): Promise<ProductionOrder | undefined> {
    return this.productionOrders.get(id);
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

  async updateProductionOrder(id: string, updates: Partial<ProductionOrder>): Promise<ProductionOrder | undefined> {
    const productionOrder = this.productionOrders.get(id);
    if (productionOrder) {
      const updatedPO = {
        ...productionOrder,
        ...updates
      };
      this.productionOrders.set(id, updatedPO);
      return updatedPO;
    }
    return undefined;
  }

  async updateProductionOrderValue(id: string, value: string, notes?: string, lockValue: boolean = false): Promise<ProductionOrder | undefined> {
    console.log(`Storage: Updating production order ${id} with value ${value}, notes: ${notes}, lockValue: ${lockValue}`);

    const productionOrder = this.productionOrders.get(id);
    if (!productionOrder) {
      console.log(`Storage: Production order not found with id: ${id}`);
      return undefined;
    }

    // Prevent update if the value is already locked and we are trying to change it
    if (productionOrder.producerValueLocked && productionOrder.producerValue !== value) {
      console.log(`Storage: Cannot update value for production order ${id} because it is locked.`);
      return productionOrder; // Return current state without updating
    }

    const updated = {
      ...productionOrder,
      producerValue: value,
      producerNotes: notes || productionOrder.producerNotes || null,
      producerPaymentStatus: 'pending' as const,
      producerValueLocked: lockValue // Apply the lockValue flag
    };

    this.productionOrders.set(id, updated);
    console.log(`Storage: Updated production order:`, updated);

    // Verificar se já existe um pagamento pendente para esta ordem
    const existingPayments = Array.from(this.producerPayments.values())
      .filter(payment => payment.productionOrderId === id);

    if (existingPayments.length === 0) {
      // Criar automaticamente um registro de pagamento pendente apenas se não existir
      await this.createProducerPayment({
        productionOrderId: id,
        producerId: productionOrder.producerId,
        amount: value,
        status: 'pending',
        notes: notes || null
      });
      console.log(`Storage: Created new producer payment for order ${id}`);
    } else {
      // Atualizar o pagamento existente
      const existingPayment = existingPayments[0];
      await this.updateProducerPayment(existingPayment.id, {
        amount: value,
        notes: notes || existingPayment.notes
      });
      console.log(`Storage: Updated existing producer payment ${existingPayment.id}`);
    }

    return updated;
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
      createdAt: new Date(),
      // Reconciliation fields - default to 'manual' for manual payments
      reconciliationStatus: insertPayment.reconciliationStatus || 'manual',
      bankTransactionId: insertPayment.bankTransactionId || null
    };
    this.payments.set(id, payment);

    // If the payment is confirmed, update the order's paid value
    if (payment.status === 'confirmed') {
      await this.updateOrderPaidValue(payment.orderId);
    }

    return payment;
  }

  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(payment => payment.orderId === orderId);
  }

  // Update order paid value based on confirmed payments
  async updateOrderPaidValue(orderId: string): Promise<void> {
    const payments = await this.getPaymentsByOrder(orderId);
    const totalPaid = payments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Update order paid value
    await this.updateOrder(orderId, {
      paidValue: totalPaid.toFixed(2)
    });

    // Update accounts receivable - CORRIGIDO: não alterar o valor original
    const receivables = await this.getAccountsReceivable();
    const receivable = receivables.find(r => r.orderId === orderId);

    if (receivable) {
      const totalAmount = parseFloat(receivable.amount); // MANTER valor original sempre
      let status: 'pending' | 'partial' | 'paid' | 'overdue' = 'pending';

      if (totalPaid >= totalAmount) {
        status = 'paid';
      } else if (totalPaid > 0) {
        // Check if minimum payment requirement is met
        const minPayment = parseFloat(receivable.minimumPayment || '0');
        if (minPayment > 0 && totalPaid >= minPayment) {
          status = 'partial'; // Entrada + frete pagos, restante pendente
        } else if (minPayment > 0 && totalPaid < minPayment) {
          status = 'pending'; // Entrada + frete ainda não pagos completamente
        } else {
          status = 'partial'; // Sem exigência de entrada, qualquer valor é parcial
        }
      }

      // Check if overdue
      const dueDate = receivable.dueDate ? new Date(receivable.dueDate) : null;
      if (dueDate && new Date() > dueDate && status !== 'paid') {
        status = 'overdue';
      }

      // IMPORTANTE: Atualizar apenas receivedAmount e status, NÃO o valor total
      await this.updateAccountsReceivable(receivable.id, {
        receivedAmount: totalPaid.toFixed(2), // Apenas valor recebido
        status: status // Apenas status
        // NÃO atualizar 'amount' - deve sempre permanecer o valor original do pedido
      });
    }
  }

  // Calculate and create commissions for an order
  async calculateCommissions(order: Order): Promise<void> {
    try {
      // Get vendor commission settings
      const vendor = await this.getVendor(order.vendorId);
      const commissionSettings = await this.getCommissionSettings();

      const vendorRate = vendor?.commissionRate || commissionSettings?.vendorCommissionRate || '10.00';
      const orderValue = parseFloat(order.totalValue);
      const vendorCommissionAmount = (orderValue * parseFloat(vendorRate)) / 100;

      // Create vendor commission
      const vendorCommission: Commission = {
        id: `commission-${order.id}-vendor`,
        vendorId: order.vendorId,
        orderId: order.id,
        percentage: vendorRate,
        amount: vendorCommissionAmount.toFixed(2),
        status: 'pending',
        type: 'vendor',
        orderValue: order.totalValue,
        orderNumber: order.orderNumber,
        paidAt: null,
        createdAt: new Date()
      };

      this.commissions.set(vendorCommission.id, vendorCommission);

      // Create partner commissions - divide equally among 3 partners
      const partnerRate = commissionSettings?.partnerCommissionRate || '15.00';
      const totalPartnerCommission = (orderValue * parseFloat(partnerRate)) / 100;
      const individualPartnerCommission = totalPartnerCommission / 3; // Divide by 3 partners

      const partnerIds = ['partner-1', 'partner-2', 'partner-3'];

      for (let i = 0; i < partnerIds.length; i++) {
        const partnerCommission: Commission = {
          id: `commission-${order.id}-partner-${i + 1}`,
          partnerId: partnerIds[i],
          orderId: order.id,
          percentage: (parseFloat(partnerRate) / 3).toFixed(2), // Individual percentage
          amount: individualPartnerCommission.toFixed(2),
          status: 'confirmed', // Partners get paid immediately when order starts
          type: 'partner',
          orderValue: order.totalValue,
          orderNumber: order.orderNumber,
          paidAt: new Date(), // Paid immediately
          createdAt: new Date()
        };

        this.commissions.set(partnerCommission.id, partnerCommission);
      }

      console.log(`Created vendor commission: ${vendorCommissionAmount.toFixed(2)} for order ${order.orderNumber}`);
      console.log(`Created 3 partner commissions: ${individualPartnerCommission.toFixed(2)} each (total: ${totalPartnerCommission.toFixed(2)}) for order ${order.orderNumber}`);
    } catch (error) {
      console.error('Error calculating commissions:', error);
    }
  }

  // Process commission payments based on order status
  async processCommissionPayments(order: Order, status: string): Promise<void> {
    try {
      if (status === 'delivered') {
        // Update vendor commissions to confirmed when order is delivered (not paid automatically)
        const vendorCommissions = Array.from(this.commissions.values())
          .filter(c => c.orderId === order.id && c.vendorId && c.status === 'pending');

        for (const commission of vendorCommissions) {
          commission.status = 'confirmed'; // Ready to be paid, but not paid automatically
          this.commissions.set(commission.id, commission);
          console.log(`Vendor commission ${commission.id} confirmed for payment - order delivered`);
        }
      } else if (status === 'cancelled') {
        // When order is cancelled, partners keep their commissions but they will be deducted from next orders
        const partnerCommissions = Array.from(this.commissions.values())
          .filter(c => c.orderId === order.id && c.partnerId && c.status === 'confirmed');

        console.log(`Order ${order.orderNumber} cancelled. Partner commissions will be deducted from future orders:`,
          partnerCommissions.map(c => `${c.partnerId}: ${c.amount}`));

        // Mark partner commissions as needing deduction (but they keep the money for now)
        for (const commission of partnerCommissions) {
          commission.status = 'deducted'; // This marks them for future deduction
          commission.deductedAt = new Date();
          this.commissions.set(commission.id, commission);
        }
      }
    } catch (error) {
      console.error('Error processing commission payments:', error);
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

  // Update commission status
  async updateCommissionStatus(id: string, status: string): Promise<Commission | undefined> {
    const commission = this.commissions.get(id);
    if (!commission) return undefined;

    commission.status = status;
    if (status === 'paid') {
      commission.paidAt = new Date();
    } else if (status === 'deducted') {
      commission.deductedAt = new Date();
    }

    this.commissions.set(id, commission);
    return commission;
  }

  // Update commissions based on order status
  async updateCommissionsByOrderStatus(orderId: string, orderStatus: string): Promise<void> {
    const allCommissions = Array.from(this.commissions.values());
    const orderCommissions = allCommissions.filter(c => c.orderId === orderId);

    for (const commission of orderCommissions) {
      let newStatus = commission.status;

      if (orderStatus === 'ready' || orderStatus === 'shipped' || orderStatus === 'delivered' || orderStatus === 'completed') {
        // Quando pedido fica pronto, comissão do vendedor vira "confirmed"
        if (commission.type === 'vendor' && commission.status === 'pending') {
          newStatus = 'confirmed';
        }
      } else if (orderStatus === 'cancelled') {
        if (commission.type === 'partner' && (commission.status === 'confirmed' || commission.status === 'paid')) {
          // Para sócios: se já receberam a comissão, ela fica como "deducted" para ser descontada no próximo pedido
          commission.status = 'deducted';
          commission.deductedAt = new Date();
          console.log(`Partner commission marked for deduction: ${commission.amount} for partner ${commission.partnerId}`);
        } else {
          // Para vendedores ou comissões ainda pendentes: apenas cancelar
          newStatus = 'cancelled';
        }
      }

      if (newStatus !== commission.status && commission.status !== 'deducted') {
        commission.status = newStatus;
        this.commissions.set(commission.id, commission);
        console.log(`Updated commission ${commission.id} from ${commission.status} to ${newStatus} due to order status: ${orderStatus}`);
      }
    }
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

  // Auto-deduct partner commissions when creating new partner commissions
  async autoDeductPartnerCommissions(order: Order): Promise<void> {
    const partnerIds = ['partner-1', 'partner-2', 'partner-3'];

    for (const partnerId of partnerIds) {
      // Find all deducted commissions for this partner
      const deductedCommissions = Array.from(this.commissions.values())
        .filter(c => c.partnerId === partnerId && c.status === 'deducted');

      let totalToDeduct = deductedCommissions.reduce((total, commission) => {
        return total + parseFloat(commission.amount);
      }, 0);

      if (totalToDeduct > 0) {
        console.log(`Auto-deducting ${totalToDeduct.toFixed(2)} from partner ${partnerId} commissions on order ${order.orderNumber}`);
        await this.deductPartnerCommission(partnerId, totalToDeduct.toFixed(2));

        // Mark deducted commissions as processed
        for (const commission of deductedCommissions) {
          commission.status = 'deduction_applied';
          this.commissions.set(commission.id, commission);
        }
      }
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

    // Create partner profiles for all 3 partners
    const partnerProfile1: Partner = {
      id: "partner-profile-1",
      userId: "partner-1",
      commissionRate: "15.00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const partnerProfile2: Partner = {
      id: "partner-profile-2",
      userId: "partner-2",
      commissionRate: "15.00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const partnerProfile3: Partner = {
      id: "partner-profile-3",
      userId: "partner-3",
      commissionRate: "15.00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.partners.set(partnerProfile1.id, partnerProfile1);
    this.partners.set(partnerProfile2.id, partnerProfile2);
    this.partners.set(partnerProfile3.id, partnerProfile3);
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
  async getProducts(options: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    producer?: string; // Added producer filter
  } = {}): Promise<{ products: any[]; total: number; page: number; totalPages: number; }> {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      producer = ''
    } = options;

    console.log(`Storage: getProducts called with options:`, { page, limit, search, category, producer });
    console.log(`Storage: Total products in storage: ${this.products.size}`);

    // Get all products as array
    let query = Array.from(this.products.values());
    console.log(`Storage: Initial query has ${query.length} products`);

    // Log some sample products for debugging
    console.log(`Storage: Sample products:`, query.slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      producerId: p.producerId,
      isActive: p.isActive
    })));

    // Only show active products first
    query = query.filter(product => product.isActive !== false);
    console.log(`Storage: After active filter: ${query.length} products`);

    // Apply search filter
    if (search && search.trim().length > 0) {
      const searchLower = search.toLowerCase().trim();
      query = query.filter(product =>
        (product.name?.toLowerCase() || '').includes(searchLower) ||
        (product.description?.toLowerCase() || '').includes(searchLower) ||
        (product.category?.toLowerCase() || '').includes(searchLower) ||
        (product.externalCode?.toLowerCase() || '').includes(searchLower) ||
        (product.compositeCode?.toLowerCase() || '').includes(searchLower) ||
        (product.friendlyCode?.toLowerCase() || '').includes(searchLower)
      );
      console.log(`Storage: After search filter: ${query.length} products`);
    }

    // Apply category filter
    if (category && category.trim().length > 0 && category !== 'all') {
      query = query.filter(product =>
        product.category === category
      );
      console.log(`Storage: After category filter: ${query.length} products`);
    }

    // Apply producer filter
    if (producer && producer.trim().length > 0 && producer !== 'all') {
      if (producer === 'internal') {
        query = query.filter(product => product.producerId === 'internal');
      } else {
        query = query.filter(product => product.producerId === producer);
      }
      console.log(`Storage: After producer filter: ${query.length} products`);
    }

    const total = query.length;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const products = query.slice(startIndex, endIndex);

    console.log(`Storage: Returning ${products.length} products (page ${page}/${totalPages})`);

    // Enrich with producer names
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        let producerName = 'Produto Interno';
        if (product.producerId && product.producerId !== 'internal') {
          const producer = await this.getUser(product.producerId);
          producerName = producer?.name || 'Produtor Desconhecido';
        }

        return {
          ...product,
          producerName
        };
      })
    );

    return { products: enrichedProducts, total, page, totalPages };
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
      producerId: productData.producerId || 'internal', // Default to 'internal' if not provided
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

  async importProducts(productsData: any[]): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

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
          producerId: item.producerId || 'internal',
          type: 'external',

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

  async importProductsForProducer(productsData: any[], producerId: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    console.log(`Starting import for producer: ${producerId}, ${productsData.length} products to import`);

    // Verify producer exists (allow 'internal' as well)
    if (producerId !== 'internal') {
      const producer = await this.getUser(producerId);
      console.log(`Producer verification for ${producerId}:`, producer ? { id: producer.id, name: producer.name, role: producer.role } : 'not found');
      if (!producer || (producer.role !== 'producer' && producer.role !== 'admin')) {
        throw new Error('Produtor não encontrado ou não possui permissão');
      }
    }

    for (const [index, productData] of productsData.entries()) {
      try {
        // Map common JSON fields to our product structure
        const name = productData.Nome || productData.name || productData.Produto;
        const description = productData.Descricao || productData.description || productData.Descrição;
        const category = productData.WebTipo || productData.category || productData.Categoria || productData.Tipo;
        let basePrice = 0;

        // Try to parse price from various possible fields
        if (productData.PrecoVenda !== undefined && productData.PrecoVenda !== null) {
          basePrice = parseFloat(productData.PrecoVenda.toString().replace(',', '.'));
        } else if (productData.basePrice !== undefined && productData.basePrice !== null) {
          basePrice = parseFloat(productData.basePrice.toString().replace(',', '.'));
        } else if (productData.Preco !== undefined && productData.Preco !== null) {
          basePrice = parseFloat(productData.Preco.toString().replace(',', '.'));
        } else if (productData.price !== undefined && productData.price !== null) {
          basePrice = parseFloat(productData.price.toString().replace(',', '.'));
        }

        if (!name || name.trim().length === 0) {
          errors.push(`Produto ${index + 1} sem nome`);
          continue;
        }

        if (isNaN(basePrice) || basePrice <= 0) {
          errors.push(`Produto "${name}" com preço inválido: ${productData.PrecoVenda || productData.basePrice || productData.Preco || productData.price || 'não informado'}`);
          continue;
        }

        const productId = `product-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`;

        const product = {
          id: productId,
          name: name.trim(),
          description: description?.trim() || '',
          category: category?.trim() || 'Geral',
          basePrice: basePrice.toFixed(2),
          unit: productData.unit || productData.Unidade || 'un',
          isActive: true,
          producerId: producerId, // Assign to the specified producer (can be 'internal')
          type: producerId === 'internal' ? 'internal' : 'external',
          // Additional fields from JSON if available
          externalId: productData.IdProduto || productData.id,
          externalCode: productData.CodigoXbz || productData.codigo,
          compositeCode: productData.CodigoComposto || productData.compositeCode,
          friendlyCode: productData.CodigoAmigavel || productData.friendlyCode,
          siteLink: productData.SiteLink || productData.link,
          imageLink: productData.ImageLink || productData.imagem || productData.foto,
          mainColor: productData.CorWebPrincipal || productData.cor,
          secondaryColor: productData.CorWebSecundaria,
          weight: productData.Peso ? parseFloat(productData.Peso.toString().replace(',', '.')) : null,
          height: productData.Altura ? parseFloat(productData.Altura.toString().replace(',', '.')) : null,
          width: productData.Largura ? parseFloat(productData.Largura.toString().replace(',', '.')) : null,
          depth: productData.Profundidade ? parseFloat(productData.Profundidade.toString().replace(',', '.')) : null,
          availableQuantity: productData.QuantidadeDisponivel ? parseInt(productData.QuantidadeDisponivel.toString()) : null,
          stockStatus: productData.StatusConfiabilidade,
          ncm: productData.Ncm,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        console.log(`Importing product ${imported + 1}: ${product.name} for producer ${producerId}`);
        this.products.set(productId, product);
        imported++;

        if (imported % 10 === 0) {
          const producerName = producerId === 'internal' ? 'Produtos Internos' : (await this.getUser(producerId))?.name || 'Unknown';
          console.log(`Progress: ${imported} products imported for ${producerName}...`);
        }
      } catch (error) {
        console.error('Error importing product:', error);
        errors.push(`Erro ao importar produto ${index + 1}: ${productData.Nome || productData.name || 'sem nome'} - ${(error as Error).message}`);
      }
    }

    const producerName = producerId === 'internal' ? 'Produtos Internos' : (await this.getUser(producerId))?.name || 'Unknown';
    console.log(`Finished importing ${imported} products for ${producerName}. Total products in storage: ${this.products.size}`);
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

  async getProductsByProducer(producerId: string): Promise<any[]> {
    return Array.from(this.products.values()).filter(p =>
      p.isActive && (p.producerId === producerId || p.producerId === 'internal')
    );
  }

  async getProductsGroupedByProducer(): Promise<{ [key: string]: any[] }> {
    const products = Array.from(this.products.values()).filter(p => p.isActive);
    const grouped: { [key: string]: any[] } = {};

    products.forEach(product => {
      const producerId = product.producerId || 'internal';
      if (!grouped[producerId]) {
        grouped[producerId] = [];
      }
      grouped[producerId].push(product);
    });

    return grouped;
  }

  // Budget methods
  async getBudgets(): Promise<any[]> {
    return Array.from(this.budgets.values());
  }

  async getBudget(id: string): Promise<any> {
    const budget = this.budgets.get(id);
    if (!budget) return null;

    // Get budget items with all fields including customizationPhoto
    const items = await Promise.all(
      Array.from(this.budgetItems.values())
      .filter(item => item.budgetId === id)
      .map(async (item) => {
        const product = await this.getProduct(item.productId);
        let producerName = null;
        if (item.producerId && item.producerId !== 'internal') {
          const producer = await this.getUser(item.producerId);
          producerName = producer?.name || `Produtor ${item.producerId.slice(-6)}`;
        }
        return {
          ...item,
          producerName: producerName,
          product: {
            name: product?.name || 'Produto não encontrado',
            description: product?.description || '',
            category: product?.category || '',
            imageLink: product?.imageLink || ''
          }
        };
      })
    );

    // Get budget photos
    const photos = Array.from(this.budgetPhotos.values()).filter(photo => photo.budgetId === id);

    // Get client info if clientId exists
    let clientName = budget.contactName;
    if (budget.clientId) {
      const client = this.clients.get(budget.clientId);
      if (client) {
        clientName = client.name;
      }
    }

    // Get vendor info if vendorId exists
    let vendorName = null;
    if (budget.vendorId) {
      const vendor = this.users.get(budget.vendorId);
      if (vendor) {
        vendorName = vendor.name;
      }
    }

    return {
      ...budget,
      items,
      photos,
      clientName,
      vendorName
    };
  }

  async getBudgetsByVendor(vendorId: string): Promise<any[]> {
    console.log(`Storage: getBudgetsByVendor for vendorId: ${vendorId}`);
    const allBudgets = Array.from(this.budgets.values());
    console.log(`Storage: Total budgets in storage: ${allBudgets.length}`);

    const vendorBudgets = allBudgets.filter(budget => {
      const isMatch = budget.vendorId === vendorId;
      console.log(`Storage: Budget ${budget.budgetNumber} - vendorId: ${budget.vendorId}, matches ${vendorId}: ${isMatch}`);
      return isMatch;
    });

    console.log(`Storage: Found ${vendorBudgets.length} budgets for vendor ${vendorId}`);

    // Enrich budgets with items and photos
    const enrichedBudgets = await Promise.all(
      vendorBudgets.map(async (budget) => {
        const items = await this.getBudgetItems(budget.id);
        const photos = await this.getBudgetPhotos(budget.id);

        return {
          ...budget,
          items: items,
          photos: photos.map(p => p.photoUrl || p.imageUrl)
        };
      })
    );

    console.log(`Storage: Returning ${enrichedBudgets.length} enriched budgets for vendor ${vendorId}:`,
      enrichedBudgets.map(b => ({ id: b.id, budgetNumber: b.budgetNumber, title: b.title })));
    return enrichedBudgets;
  }

  async getBudgetsByClient(clientId: string): Promise<any[]> {
    const budgets = Array.from(this.budgets.values()).filter(budget => budget.clientId === clientId);
    // Enrich with items and producer names
    const enrichedBudgets = await Promise.all(budgets.map(async (budget) => {
      const items = await Promise.all(
        Array.from(this.budgetItems.values())
        .filter(item => item.budgetId === budget.id)
        .map(async (item) => {
          const product = await this.getProduct(item.productId);
          let producerName = null;
          if (item.producerId && item.producerId !== 'internal') {
            const producer = await this.getUser(item.producerId);
            producerName = producer?.name || `Produtor ${item.producerId.slice(-6)}`;
          }
          return {
            ...item,
            producerName: producerName,
            product: {
              name: product?.name || 'Produto não encontrado',
              description: product?.description || '',
              category: product?.category || '',
              imageLink: product?.imageLink || ''
            }
          };
        })
      );
      return { ...budget, items };
    }));
    return enrichedBudgets;
  }

  // Helper function to parse monetary values in either BRL format or standard format
  // BRL: "15.000,00" (dot=thousands, comma=decimal) -> 15000.00
  // Standard: "15000.00" (dot=decimal, no thousands) -> 15000.00
  private parseBRLCurrency(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    // Convert to string and remove BRL currency symbol and spaces
    const strValue = String(value).replace(/[R$\s]/g, '').trim();

    // Check if this is Brazilian format (has comma) or standard format (no comma)
    if (strValue.includes(',')) {
      // Brazilian format: remove thousand separators (dot) and replace decimal comma with dot
      const normalized = strValue.replace(/\./g, '').replace(',', '.');
      return parseFloat(normalized) || 0;
    } else {
      // Standard format or already normalized: use as-is (dot is decimal separator)
      return parseFloat(strValue) || 0;
    }
  }

  // Helper function to parse percentage values (not currency - can have fractional percentages like 10.5)
  private parsePercentage(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    const strValue = String(value).replace(/[%\s]/g, '').trim();

    // Check if Brazilian format (comma for decimal)
    if (strValue.includes(',') && !strValue.includes('.')) {
      // Replace comma with dot for decimal
      return parseFloat(strValue.replace(',', '.')) || 0;
    } else {
      // Standard format
      return parseFloat(strValue) || 0;
    }
  }

  async createBudget(budgetData: any): Promise<any> {
    const id = generateId('budget');
    const now = new Date();

    // Normalize monetary fields to ensure consistency
    const normalizedTotalValue = this.parseBRLCurrency(budgetData.totalValue);

    const newBudget = {
      id,
      budgetNumber: `ORC-${Date.now()}`,
      title: budgetData.title || 'Orçamento sem título',
      description: budgetData.description || '',
      clientId: budgetData.clientId || null,
      contactName: budgetData.contactName || '',
      contactPhone: budgetData.contactPhone || '',
      contactEmail: budgetData.contactEmail || '',
      vendorId: budgetData.vendorId || null,
      validUntil: budgetData.validUntil || null,
      deliveryDeadline: budgetData.deliveryDeadline || null,
      deliveryType: budgetData.deliveryType || 'delivery',
      totalValue: normalizedTotalValue.toFixed(2),
      status: budgetData.status || 'draft',
      paymentMethodId: budgetData.paymentMethodId || '',
      shippingMethodId: budgetData.shippingMethodId || '',
      installments: parseInt(budgetData.installments) || 1,
      downPayment: this.parseBRLCurrency(budgetData.downPayment),
      remainingAmount: this.parseBRLCurrency(budgetData.remainingAmount),
      shippingCost: this.parseBRLCurrency(budgetData.shippingCost),
      hasDiscount: budgetData.hasDiscount || false,
      discountType: budgetData.discountType || 'percentage',
      discountPercentage: this.parsePercentage(budgetData.discountPercentage),
      discountValue: this.parseBRLCurrency(budgetData.discountValue),
      createdAt: now,
      updatedAt: now
    };

    // Add budget to storage
    this.budgets.set(newBudget.id, newBudget);
    console.log(`[CREATE BUDGET] Budget stored with ID: ${newBudget.id}. Total budgets in storage: ${this.budgets.size}`);
    console.log(`[CREATE BUDGET] Budget details:`, {
      id: newBudget.id,
      budgetNumber: newBudget.budgetNumber,
      vendorId: newBudget.vendorId,
      title: newBudget.title,
      contactName: newBudget.contactName
    });

    // Process items
    console.log(`[CREATE BUDGET] Processing ${budgetData.items.length} items from request`);
    if (budgetData.items && budgetData.items.length > 0) {
      for (const itemData of budgetData.items) {
        await this.createBudgetItem(newBudget.id, itemData);
      }
    }

    // Create budget photos if provided
    console.log(`[CREATE BUDGET] Processing ${budgetData.photos?.length || 0} photos from request`);
    if (budgetData.photos && Array.isArray(budgetData.photos)) {
      for (const photoUrl of budgetData.photos) {
        await this.createBudgetPhoto(newBudget.id, { photoUrl });
      }
    }

    return newBudget;
  }

  async updateBudget(id: string, budgetData: any): Promise<any> {
    const budget = this.budgets.get(id);
    if (!budget) return null;

    // Normalize monetary fields if present using BRL currency parser
    const normalizedData = { ...budgetData };
    if (budgetData.totalValue !== undefined) {
      normalizedData.totalValue = this.parseBRLCurrency(budgetData.totalValue).toFixed(2);
    }
    if (budgetData.downPayment !== undefined) {
      normalizedData.downPayment = this.parseBRLCurrency(budgetData.downPayment);
    }
    if (budgetData.remainingAmount !== undefined) {
      normalizedData.remainingAmount = this.parseBRLCurrency(budgetData.remainingAmount);
    }
    if (budgetData.shippingCost !== undefined) {
      normalizedData.shippingCost = this.parseBRLCurrency(budgetData.shippingCost);
    }
    if (budgetData.discountPercentage !== undefined) {
      normalizedData.discountPercentage = this.parsePercentage(budgetData.discountPercentage);
    }
    if (budgetData.discountValue !== undefined) {
      normalizedData.discountValue = this.parseBRLCurrency(budgetData.discountValue);
    }
    if (budgetData.installments !== undefined) {
      normalizedData.installments = parseInt(budgetData.installments) || 1;
    }

    const updatedBudget = {
      ...budget,
      ...normalizedData,
      updatedAt: new Date().toISOString()
    };

    this.budgets.set(id, updatedBudget);
    return updatedBudget;
  }

  async deleteBudget(id: string): Promise<boolean> {
    // Also delete related items and photos
    this.budgetItems = new Map([...this.budgetItems.entries()].filter(([key, value]) => value.budgetId !== id));
    this.budgetPhotos = new Map([...this.budgetPhotos.entries()].filter(([key, value]) => value.budgetId !== id));
    return this.budgets.delete(id);
  }

  async convertBudgetToOrder(budgetId: string, clientId?: string): Promise<Order> {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      throw new Error("Orçamento não encontrado");
    }

    if (budget.status === 'converted') {
      throw new Error("Este orçamento já foi convertido em pedido");
    }

    // Get budget items
    const budgetItems = await this.getBudgetItems(budgetId);
    console.log(`Budget items for conversion:`, budgetItems.length);

    // Get budget payment info
    const budgetPaymentInfo = await this.getBudgetPaymentInfo(budgetId);

    // Get budget photos
    const budgetPhotos = await this.getBudgetPhotos(budgetId);

    // Generate order number
    const orderNumber = `PED-${Date.now()}`;

    // Filter and deduplicate budget items - remove items with duplicate productId + producerId + quantity + unitPrice
    const uniqueBudgetItems = budgetItems.filter((item: any, index: number, self: any[]) => {
      const itemKey = `${item.productId}-${item.producerId || 'internal'}-${item.quantity}-${item.unitPrice}`;
      const firstIndex = self.findIndex((i: any) =>
        `${i.productId}-${i.producerId || 'internal'}-${i.quantity}-${i.unitPrice}` === itemKey
      );

      if (firstIndex !== index) {
        console.log(`Removing duplicate budget item: ${item.productName} (${itemKey})`);
        return false;
      }
      return true;
    });

    console.log(`Filtered ${budgetItems.length} items down to ${uniqueBudgetItems.length} unique items`);

    // Convert budget items to order format
    const orderItems = uniqueBudgetItems.map((item: any) => ({
      productId: item.productId,
      productName: item.productName || 'Produto',
      producerId: item.producerId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,

      // Personalização do item
      hasItemCustomization: item.hasItemCustomization || false,
      selectedCustomizationId: item.selectedCustomizationId || null,
      itemCustomizationValue: item.itemCustomizationValue || 0,
      itemCustomizationDescription: item.itemCustomizationDescription || '',
      additionalCustomizationNotes: item.additionalCustomizationNotes || '',
      customizationPhoto: item.customizationPhoto || '',

      // Personalização geral
      hasGeneralCustomization: item.hasGeneralCustomization || false,
      generalCustomizationName: item.generalCustomizationName || '',
      generalCustomizationValue: item.generalCustomizationValue || 0,

      // Desconto do item
      hasItemDiscount: item.hasItemDiscount || false,
      itemDiscountType: item.itemDiscountType || 'percentage',
      itemDiscountPercentage: item.itemDiscountPercentage || 0,
      itemDiscountValue: item.itemDiscountValue || 0,

      // Dimensões do produto
      productWidth: item.productWidth,
      productHeight: item.productHeight,
      productDepth: item.productDepth,
    }));

    // Recalculate total value from items to ensure accuracy (using BRL currency parser)
    let calculatedTotal = orderItems.reduce((sum, item) => {
      // Calculate item total with all components - parse BRL format values
      const basePrice = this.parseBRLCurrency(item.unitPrice) * item.quantity;

      // Item customization (valor por unidade personalizada)
      const itemCustomization = item.hasItemCustomization ?
        item.quantity * this.parseBRLCurrency(item.itemCustomizationValue) : 0;

      // General customization (valor por unidade aplicado à quantidade total)
      const generalCustomization = item.hasGeneralCustomization ?
        item.quantity * this.parseBRLCurrency(item.generalCustomizationValue) : 0;

      let itemSubtotal = basePrice + itemCustomization + generalCustomization;

      // Apply item discount (sobre o preço base apenas)
      if (item.hasItemDiscount) {
        if (item.itemDiscountType === 'percentage') {
          const discountAmount = (basePrice * this.parsePercentage(item.itemDiscountPercentage)) / 100;
          itemSubtotal -= discountAmount;
        } else if (item.itemDiscountType === 'value') {
          itemSubtotal -= this.parseBRLCurrency(item.itemDiscountValue);
        }
      }

      return sum + Math.max(0, itemSubtotal);
    }, 0);

    // Apply general discount to the subtotal
    if (budget.hasDiscount) {
      if (budget.discountType === 'percentage') {
        const discountAmount = (calculatedTotal * this.parsePercentage(budget.discountPercentage)) / 100;
        calculatedTotal -= discountAmount;
      } else if (budget.discountType === 'value') {
        calculatedTotal -= this.parseBRLCurrency(budget.discountValue);
      }
    }

    // Add shipping cost if delivery (not pickup)
    const shippingCost = budget.deliveryType === 'pickup' ? 0 :
      this.parseBRLCurrency(budgetPaymentInfo?.shippingCost);

    calculatedTotal += shippingCost;

    // Ensure total is never negative
    const finalTotalValue = Math.max(0, calculatedTotal).toFixed(2);

    console.log(`Budget ${budgetId} conversion - Recalculated total: R$ ${finalTotalValue} (original: R$ ${budget.totalValue})`);

    // Create order
    const orderData: InsertOrder = {
      orderNumber,
      budgetId: budgetId,
      clientId: clientId || budget.clientId || null,
      vendorId: budget.vendorId,
      product: budget.title,
      description: budget.description || '',
      totalValue: finalTotalValue,
      status: 'confirmed',
      deadline: budget.deliveryDeadline ? new Date(budget.deliveryDeadline) : null,

      // Contact info from budget
      contactName: budget.contactName,
      contactPhone: budget.contactPhone || '',
      contactEmail: budget.contactEmail || '',
      deliveryType: budget.deliveryType || 'delivery',

      // Payment info from budget
      paymentMethodId: budgetPaymentInfo?.paymentMethodId || '',
      shippingMethodId: budgetPaymentInfo?.shippingMethodId || '',
      installments: budgetPaymentInfo?.installments || 1,
      downPayment: budgetPaymentInfo?.downPayment || 0,
      remainingAmount: budgetPaymentInfo?.remainingAmount || 0,
      shippingCost: budgetPaymentInfo?.shippingCost || 0,

      // Discount from budget
      hasDiscount: budget.hasDiscount || false,
      discountType: budget.discountType || 'percentage',
      discountPercentage: budget.discountPercentage || 0,
      discountValue: budget.discountValue || 0,

      // Order items
      items: orderItems
    };

    const order = await this.createOrder(orderData);

    // Mark budget as converted
    await this.updateBudget(budgetId, { status: 'converted' });

    console.log(`Budget ${budgetId} converted to order ${order.id}`);
    return order;
  }


  // Budget Items methods
  async getBudgetItems(budgetId: string): Promise<any[]> {
    return Array.from(this.budgetItems.values()).filter(item => item.budgetId === budgetId);
  }

  async createBudgetItem(budgetId: string, itemData: any) {
    const id = generateId('budget-item');

    const item = {
      id,
      budgetId,
      productId: itemData.productId || null,
      productName: itemData.productName || '',
      producerId: itemData.producerId || null,
      quantity: parseInt(itemData.quantity) || 1,
      unitPrice: this.parseBRLCurrency(itemData.unitPrice),
      totalPrice: this.parseBRLCurrency(itemData.totalPrice),
      // Item customization fields
      hasItemCustomization: itemData.hasItemCustomization || false,
      selectedCustomizationId: itemData.selectedCustomizationId || null,
      itemCustomizationValue: this.parseBRLCurrency(itemData.itemCustomizationValue),
      itemCustomizationDescription: itemData.itemCustomizationDescription || '',
      additionalCustomizationNotes: itemData.additionalCustomizationNotes || '',
      customizationPhoto: itemData.customizationPhoto || '', // Add customization photo field
      // General customization fields
      hasGeneralCustomization: itemData.hasGeneralCustomization || false,
      generalCustomizationName: itemData.generalCustomizationName || '',
      generalCustomizationValue: this.parseBRLCurrency(itemData.generalCustomizationValue),
      // Product dimensions
      productWidth: itemData.productWidth || null,
      productHeight: itemData.productHeight || null,
      productDepth: itemData.productDepth || null,
      // Item discount
      hasItemDiscount: itemData.hasItemDiscount || false,
      itemDiscountType: itemData.itemDiscountType || 'percentage',
      itemDiscountPercentage: this.parsePercentage(itemData.itemDiscountPercentage),
      itemDiscountValue: this.parseBRLCurrency(itemData.itemDiscountValue),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.budgetItems.set(id, item);
    return item;
  }

  async updateBudgetItem(itemId: string, itemData: any): Promise<any> {
    const item = this.budgetItems.get(itemId);
    if (!item) return null;

    const updatedItem = {
      ...item,
      ...itemData,
      // Preserve customization photo if not explicitly updated
      customizationPhoto: itemData.customizationPhoto !== undefined ? itemData.customizationPhoto : item.customizationPhoto,
      // Recalculate fields if they are present in itemData
      quantity: itemData.quantity !== undefined ? parseFloat(itemData.quantity) : item.quantity,
      unitPrice: itemData.unitPrice !== undefined ? parseFloat(itemData.unitPrice) : item.unitPrice,
      totalPrice: itemData.totalPrice !== undefined ? parseFloat(itemData.totalPrice) : item.totalPrice,
      itemCustomizationValue: itemData.itemCustomizationValue !== undefined ? parseFloat(itemData.itemCustomizationValue) : item.itemCustomizationValue,
      generalCustomizationValue: itemData.generalCustomizationValue !== undefined ? parseFloat(itemData.generalCustomizationValue) : item.generalCustomizationValue,
      itemDiscountPercentage: itemData.itemDiscountPercentage !== undefined ? parseFloat(itemData.itemDiscountPercentage) : item.itemDiscountPercentage,
      itemDiscountValue: itemData.itemDiscountValue !== undefined ? parseFloat(itemData.itemDiscountValue) : item.itemDiscountValue,
      productWidth: itemData.productWidth !== undefined ? parseFloat(itemData.productWidth) : item.productWidth,
      productHeight: itemData.productHeight !== undefined ? parseFloat(itemData.productHeight) : item.productHeight,
      productDepth: itemData.productDepth !== undefined ? parseFloat(itemData.productDepth) : item.productDepth,
      updatedAt: new Date()
    };

    this.budgetItems.set(itemId, updatedItem);

    // Recalculate budget total
    await this.recalculateBudgetTotal(updatedItem.budgetId);

    return updatedItem;
  }

  async deleteBudgetItem(itemId: string): Promise<boolean> {
    const item = this.budgetItems.get(itemId);
    if (!item) {
      return false;
    }

    const budgetId = item.budgetId;
    this.budgetItems.delete(itemId);

    // Recalculate budget total
    await this.recalculateBudgetTotal(budgetId);

    return true;
  }

  async deleteBudgetItems(budgetId: string): Promise<boolean> {
    const initialSize = this.budgetItems.size;
    this.budgetItems = new Map([...this.budgetItems.entries()].filter(([key, value]) => value.budgetId !== budgetId));
    return this.budgetItems.size < initialSize;
  }

  // Budget Photos methods
  async getBudgetPhotos(budgetId: string): Promise<any[]> {
    return Array.from(this.budgetPhotos.values()).filter(photo => photo.budgetId === budgetId);
  }

  async createBudgetPhoto(budgetId: string, photoData: { imageUrl: string; description?: string }): Promise<any> {
    const newPhoto: BudgetPhoto = {
      id: `photo-${Date.now()}-${Math.random()}`,
      budgetId: budgetId,
      photoUrl: photoData.imageUrl,
      description: photoData.description || "",
      uploadedAt: new Date().toISOString()
    };
    this.budgetPhotos.set(newPhoto.id, newPhoto);
    return newPhoto;
  }

  async deleteBudgetPhoto(photoId: string): Promise<boolean> {
    return this.budgetPhotos.delete(photoId);
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

      // Add general customization value if applicable
      if (item.hasGeneralCustomization) {
        const generalCustomizationValue = parseFloat(item.generalCustomizationValue || '0');
        return sum + basePrice + generalCustomizationValue;
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

  // Update account receivable
  async updateAccountsReceivable(id: string, data: any): Promise<any> {
    console.log(`Updating receivable ${id} with updates:`, data);

    // Find in manual receivables
    const receivables = await this.getManualReceivables();
    const actualId = id.startsWith('manual-') ? id.replace('manual-', '') : id;
    const receivableIndex = receivables.findIndex((r: any) => r.id === actualId);

    if (receivableIndex !== -1) {
      const receivable = receivables[receivableIndex];
      const updatedReceivable = {
        ...receivable,
        ...data,
        updatedAt: new Date()
      };

      // Update in the array
      this.mockData.manualReceivables[receivableIndex] = updatedReceivable;

      console.log(`Updated manual receivable ${actualId}: status=${updatedReceivable.status}, receivedAmount=${updatedReceivable.receivedAmount}`);
      return updatedReceivable;
    }

    // Check if it's an order-based receivable and update the order
    const orders = await this.getOrders();
    const order = orders.find((o: any) => o.id === id);
    if (order) {
      // Update the order's paid value
      const currentPaidValue = parseFloat(order.paidValue || '0');
      const additionalPayment = parseFloat(data.receivedAmount || '0');
      const newPaidValue = currentPaidValue + additionalPayment;

      const updatedOrder = await this.updateOrder(order.id, { paidValue: newPaidValue.toFixed(2) });

      if (updatedOrder) {
        console.log(`Updated order receivable ${id}: new paidValue=${updatedOrder.paidValue}`);
        return updatedOrder;
      }
    }

    console.log(`Receivable ${id} not found for update`);
    return undefined; // Return undefined if not found or not updated
  }


  // Added method to get manual receivables
  async getManualReceivables(): Promise<any[]> {
    return this.mockData.manualReceivables || [];
  }

  // Create manual receivable
  async createManualReceivable(data: any): Promise<any> {
    const id = `manual-receivable-${randomUUID()}`;
    const receivable = {
      id,
      type: 'manual',
      clientName: data.clientName,
      description: data.description,
      amount: parseFloat(data.amount).toFixed(2),
      receivedAmount: '0.00',
      dueDate: new Date(data.dueDate),
      status: 'pending',
      notes: data.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Ensure manualReceivables array exists
    if (!this.mockData.manualReceivables) {
      this.mockData.manualReceivables = [];
    }

    this.mockData.manualReceivables.push(receivable);
    console.log(`Created manual receivable: ${receivable.id} for ${receivable.clientName} - R$ ${receivable.amount}`);
    console.log(`Total manual receivables: ${this.mockData.manualReceivables.length}`);

    return receivable;
  }

  // Create manual payable
  async createManualPayable(data: any): Promise<any> {
    const id = `manual-payable-${randomUUID()}`;
    const payable = {
      id,
      type: 'manual',
      beneficiary: data.beneficiary,
      description: data.description,
      amount: parseFloat(data.amount).toFixed(2),
      dueDate: new Date(data.dueDate),
      category: data.category || 'Outros',
      status: 'pending',
      notes: data.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Ensure manualPayables array exists
    if (!this.mockData.manualPayables) {
      this.mockData.manualPayables = [];
    }

    this.mockData.manualPayables.push(payable);
    console.log(`Created manual payable: ${payable.id} for ${payable.beneficiary} - R$ ${payable.amount}`);
    console.log(`Total manual payables: ${this.mockData.manualPayables.length}`);

    return payable;
  }

  // Get manual payables
  async getManualPayables(): Promise<any[]> {
    return this.mockData.manualPayables || [];
  }

  async updateManualPayable(id: string, updates: any) {
    const index = this.mockData.manualPayables.findIndex(p => p.id === id);
    if (index !== -1) {
      this.mockData.manualPayables[index] = {
        ...this.mockData.manualPayables[index],
        ...updates,
        updatedAt: new Date()
      };
      return this.mockData.manualPayables[index];
    }
    return null;
  }

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
      case 'financialNotes': // Added case for financialNotes
        return this.mockData.financialNotes;
      default:
        return [];
    }
  }

  // Financial module methods - Accounts Receivable
  // Helper method to calculate receivable status
  private calculateReceivableStatus(order: Order): 'pending' | 'partial' | 'paid' | 'overdue' {
    const totalValue = parseFloat(order.totalValue);
    const paidValue = parseFloat(order.paidValue || "0");
    const minimumPayment = parseFloat(order.downPayment || "0") + parseFloat(order.shippingCost || "0");


    if (paidValue >= totalValue) {
      return 'paid';
    } else if (paidValue > 0) {
      // Check if minimum payment requirement is met
      if (minimumPayment > 0 && paidValue >= minimumPayment) {
        return 'partial';
      } else if (minimumPayment > 0 && paidValue < minimumPayment) {
        return 'pending';
      } else {
        return 'partial';
      }
    } else {
      // Check if overdue
      const dueDate = order.deadline ? new Date(order.deadline) : null;
      if (dueDate && new Date() > dueDate) {
        return 'overdue';
      }
      return 'pending';
    }
  }



  async getAccountsReceivable(): Promise<AccountsReceivable[]> {
    const orders = await this.getOrders();

    // Get manual receivables from mockData
    const manualReceivables = this.mockData.manualReceivables || [];

    const orderReceivables = orders
      .filter(order => order.status !== 'cancelled') // Não incluir pedidos cancelados
      .map(order => {
        const totalValue = parseFloat(order.totalValue || "0");
        const paidValue = parseFloat(order.paidValue || "0");
        const remainingValue = Math.max(0, totalValue - paidValue);

        // Get minimum payment (entrada + frete) from budget if available
        let minimumPaymentValue = "0.00";
        if (order.budgetId) {
          // Try to get budget payment info for minimum payment calculation
          const downPayment = parseFloat(order.downPayment || "0");
          const shippingCost = parseFloat(order.shippingCost || "0");
          minimumPaymentValue = downPayment > 0 || shippingCost > 0 ?
            (downPayment + shippingCost).toFixed(2) : "0.00";
        }

        let status: 'pending' | 'partial' | 'paid' | 'overdue' = 'pending';
        if (paidValue >= totalValue) {
          status = 'paid';
        } else if (paidValue > 0) {
          // Check if minimum payment requirement is met
          if (parseFloat(minimumPaymentValue) > 0 && paidValue >= parseFloat(minimumPaymentValue)) {
            status = 'partial';
          } else if (parseFloat(minimumPaymentValue) > 0 && paidValue < parseFloat(minimumPaymentValue)) {
            status = 'pending'; // Minimum not met
          } else {
            status = 'partial'; // No minimum requirement
          }
        }

        // Check if overdue
        const dueDate = order.deadline ? new Date(order.deadline) : null;
        if (dueDate && new Date() > dueDate && status !== 'paid') {
          status = 'overdue';
        }

        return {
          id: `ar-${order.id}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          clientName: order.contactName || 'Cliente não identificado',
          amount: order.totalValue || "0.00", // ✅ CORRIGIDO: Sempre usar valor original do pedido
          receivedAmount: order.paidValue || "0.00",
          minimumPayment: minimumPaymentValue,
          status: status,
          dueDate: order.deadline ? new Date(order.deadline) : null,
          createdAt: new Date(order.createdAt),
          lastPaymentDate: order.lastPaymentDate ? new Date(order.lastPaymentDate) : null,
          isManual: false,
          type: 'order',
          description: `Venda: ${order.product}`,
          notes: order.notes || '',
          // Store remaining value for calculations if needed
          remainingValue: remainingValue.toFixed(2)
        };
      });

    // Convert manual receivables to the expected format
    const formattedManualReceivables = manualReceivables.map(receivable => ({
      id: receivable.id,
      orderId: null,
      orderNumber: 'MANUAL',
      clientName: receivable.clientName,
      amount: receivable.amount,
      receivedAmount: receivable.receivedAmount || "0.00",
      minimumPayment: receivable.minimumPayment || "0.00", // Add minimumPayment
      status: receivable.status,
      dueDate: receivable.dueDate ? new Date(receivable.dueDate) : null,
      createdAt: new Date(receivable.createdAt),
      lastPaymentDate: receivable.lastPaymentDate ? new Date(receivable.lastPaymentDate) : null,
      isManual: true,
      type: 'manual',
      description: receivable.description,
      notes: receivable.notes
    }));

    console.log(`Returning ${orderReceivables.length} order receivables and ${formattedManualReceivables.length} manual receivables`);
    return [...orderReceivables, ...formattedManualReceivables];
  }

  // This method is for creating manual receivables directly, not order-based ones.
  async createAccountsReceivable(data: any): Promise<any> {
    const id = `ar-${data.orderId}`; // This ID should be unique and related to an order or unique identifier for manual receivables
    const receivable = {
      id,
      orderId: data.orderId, // Might be null for manual receivables
      clientId: data.clientId,
      vendorId: data.vendorId,
      dueDate: data.dueDate,
      amount: data.amount,
      receivedAmount: '0.00',
      minimumPayment: data.minimumPayment || '0.00', // Entrada + frete obrigatório
      status: data.status || 'open',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If it's an order-based receivable, update the map
    if (data.orderId) {
      this.accountsReceivable.set(id, receivable);
    } else {
      // If it's a manual receivable, add it to mockData
      if (!this.mockData.manualReceivables) {
        this.mockData.manualReceivables = [];
      }
      // Ensure a unique ID for manual receivables if not provided
      if (!receivable.id || receivable.id.startsWith('ar-')) {
        receivable.id = `manual-${randomUUID()}`;// Ensure a unique ID for manual receivables
      }
      this.mockData.manualReceivables.push(receivable);
    }

    console.log(`Created receivable: ${receivable.id} with minimum payment: ${receivable.minimumPayment}`);
    return receivable;
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
    const receivable = await this.accountsReceivable.get(receivableId);
    if (receivable) {
      const currentReceived = parseFloat(receivable.receivedAmount);
      const allocationAmount = parseFloat(amount);
      const newReceived = currentReceived + allocationAmount;

      let status = receivable.status;
      if (newReceived >= parseFloat(receivable.amount)) {
        status = 'paid';
      } else if (newReceived > 0) {
        // Check minimum payment requirement
        const minimumPayment = parseFloat(receivable.minimumPayment || 0);
        if (minimumPayment > 0 && newReceived >= minimumPayment) {
          status = 'partial';
        } else if (minimumPayment > 0 && newReceived < minimumPayment) {
          status = 'pending';
        } else {
          status = 'partial';
        }
      } else {
        status = receivable.minimumPayment > 0 ? 'pending' : 'open';
      }

      // Check if overdue
      const dueDate = receivable.dueDate ? new Date(receivable.dueDate) : null;
      if (dueDate && new Date() > dueDate && status !== 'paid') {
        status = 'overdue';
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
    return Array.from(this.bankImports.values());
  }

  async getBankImport(id: string): Promise<BankImport | undefined> {
    return this.bankImports.get(id);
  }

  async createBankImport(data: InsertBankImport & { importType?: string }): Promise<BankImport> {
    const id = randomUUID();
    const bankImport: BankImport & { importType?: string } = {
      ...data,
      id,
      importType: (data as any).importType || 'general',
      processedTransactions: data.processedTransactions || 0,
      skippedTransactions: data.skippedTransactions || 0,
      errorMessage: data.errorMessage || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.bankImports.set(id, bankImport);
    console.log(`Created bank import: ${id} with ${data.transactionCount} transactions`);
    return bankImport;
  }

  async updateBankImport(id: string, data: Partial<InsertBankImport>): Promise<BankImport | undefined> {
    const bankImport = this.bankImports.get(id);
    if (bankImport) {
      const updated = {
        ...bankImport,
        ...data,
        updatedAt: new Date()
      };
      this.bankImports.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async getBankTransactionsByImport(importId: string): Promise<BankTransaction[]> {
    return Array.from(this.bankTransactions.values())
      .filter(transaction => transaction.importId === importId);
  }

  async getBankTransactions(): Promise<BankTransaction[]> {
    return Array.from(this.bankTransactions.values());
  }

  async getBankTransaction(id: string): Promise<BankTransaction | undefined> {
    return this.bankTransactions.get(id);
  }

  async getBankTransactionByFitId(fitId: string): Promise<BankTransaction | undefined> {
    const transaction = Array.from(this.bankTransactions.values()).find(t => t.fitId === fitId);
    console.log(`Looking for transaction with fitId ${fitId}: ${transaction ? 'found' : 'not found'}`);
    return transaction;
  }

  async createBankTransaction(data: InsertBankTransaction): Promise<BankTransaction> {
    const id = randomUUID();
    const transaction: BankTransaction = {
      ...data,
      id,
      status: data.status || 'unmatched',
      matchedReceivableId: data.matchedReceivableId || null,
      matchedPaymentId: data.matchedPaymentId || null,
      matchedOrderId: data.matchedOrderId || null,
      matchedAt: data.matchedAt || null,
      notes: data.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.bankTransactions.set(id, transaction);
    console.log(`Created bank transaction: ${id} - ${transaction.type} - R$ ${transaction.amount}`);
    return transaction;
  }

  async updateBankTransaction(id: string, data: Partial<InsertBankTransaction>): Promise<BankTransaction | undefined> {
    const transaction = this.bankTransactions.get(id);
    if (!transaction) return undefined;

    const updatedTransaction = {
      ...transaction,
      ...data,
      updatedAt: new Date()
    };

    this.bankTransactions.set(id, updatedTransaction);
    console.log(`Updated bank transaction: ${id} - status: ${updatedTransaction.status}`);
    return updatedTransaction;
  }

  async matchTransactionToReceivable(transactionId: string, receivableId: string): Promise<BankTransaction | undefined> {
    const transaction = this.bankTransactions.get(transactionId);
    if (transaction) {
      const updated = {
        ...transaction,
        status: 'matched' as const,
        matchedReceivableId: receivableId,
        matchedAt: new Date(),
        updatedAt: new Date()
      };
      this.bankTransactions.set(transactionId, updated);
      return updated;
    }
    return undefined;
  }

  // Financial module methods - Expense Notes
  async getExpenseNotes(): Promise<ExpenseNote[]> {
    if (!this.mockData.expenseNotes) {
      this.mockData.expenseNotes = [];
    }
    return this.mockData.expenseNotes;
  }

  async getExpenseNotesByVendor(vendorId: string): Promise<ExpenseNote[]> {
    return (this.mockData.expenseNotes || []).filter(en => en.vendorId === vendorId);
  }

  async getExpenseNotesByOrder(orderId: string): Promise<ExpenseNote[]> {
    return (this.mockData.expenseNotes || []).filter(en => en.orderId === orderId);
  }

  async createExpenseNote(data: InsertExpenseNote): Promise<ExpenseNote> {
    if (!this.mockData.expenseNotes) {
      this.mockData.expenseNotes = [];
    }

    const id = `expense-${Date.now()}`;
    const expense: ExpenseNote = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockData.expenseNotes.push(expense);
    console.log(`Created expense note: ${expense.id} - ${expense.description} - R$ ${expense.amount}`);
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

    // Handle reimbursement
    if (data.status === 'reimbursed') {
      updated.reimbursedBy = data.reimbursedBy;
      updated.reimbursedAt = new Date();
    }


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

  async getCommissionPayoutsByUser(userId: string, type: 'vendor' | 'partner'): Promise<CommissionPayout[]> {
    return this.mockData.commissionPayouts.filter(payout => payout.userId === userId && payout.type === type);
  }

  async updateCommissionPayout(id: string, data: Partial<InsertCommissionPayout>): Promise<CommissionPayout | undefined> {
    const existing = this.mockData.commissionPayouts.find(payout => payout.id === id);
    if (!existing) return undefined;

    const updated: CommissionPayout = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    const index = this.mockData.commissionPayouts.findIndex(payout => payout.id === id);
    if (index !== -1) {
      this.mockData.commissionPayouts[index] = updated;
    }
    return updated;
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

  // Producer Payments methods
  async getProducerPayments(): Promise<ProducerPayment[]> {
    const payments = Array.from(this.producerPayments.values());
    console.log(`Storage: getProducerPayments returning ${payments.length} payments:`,
      payments.map(p => ({ id: p.id, status: p.status, amount: p.amount, producerId: p.producerId })));
    return payments;
  }

  async getProducerPaymentsByProducer(producerId: string): Promise<ProducerPayment[]> {
    const allPayments = Array.from(this.producerPayments.values());
    const producerPayments = allPayments.filter(payment => payment.producerId === producerId);
    console.log(`Storage: getProducerPaymentsByProducer for ${producerId} returning ${producerPayments.length} payments:`, producerPayments.map(p => ({ id: p.id, amount: p.amount, status: p.status })));
    return producerPayments;
  }

  async getProducerPaymentByProductionOrderId(productionOrderId: string): Promise<ProducerPayment | undefined> {
    return Array.from(this.producerPayments.values()).find(p => p.productionOrderId === productionOrderId);
  }

  async createProducerPayment(data: InsertProducerPayment): Promise<ProducerPayment> {
    const newPayment: ProducerPayment = {
      id: randomUUID(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Reconciliation fields - default to 'pending' for new payments awaiting reconciliation
      // or 'manual' if paidAt is provided (manual payment)
      reconciliationStatus: data.reconciliationStatus || (data.paidAt ? 'manual' : 'pending'),
      bankTransactionId: data.bankTransactionId || null
    };
    this.producerPayments.set(newPayment.id, newPayment);
    return newPayment;
  }

  async updateProducerPayment(id: string, data: Partial<InsertProducerPayment & { paidBy?: string; paidAt?: Date; paymentMethod?: string }>): Promise<ProducerPayment | undefined> {
    const existing = this.producerPayments.get(id);
    if (!existing) return undefined;

    const updated: ProducerPayment = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.producerPayments.set(id, updated);
    console.log(`Updated producer payment ${id}:`, {
      status: updated.status,
      amount: updated.amount,
      paidAt: updated.paidAt,
      paymentMethod: updated.paymentMethod
    });
    return updated;
  }

  async getProducerPayment(id: string): Promise<ProducerPayment | undefined> {
    return this.producerPayments.get(id);
  }

  // Quote Requests methods
  async createConsolidatedQuoteRequest(data: any) {
    const id = generateId("quote-req");
    const quoteRequest = {
      id,
      clientId: data.clientId,
      vendorId: data.vendorId,
      contactName: data.contactName,
      whatsapp: data.whatsapp || "",
      email: data.email || "",
      observations: data.observations || "",
      totalEstimatedValue: data.totalEstimatedValue || 0,
      status: data.status || "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      products: data.products || []
    };

    // Salvar o orçamento principal
    this.quoteRequests.push(quoteRequest);

    console.log(`Created consolidated quote request ${id} with ${data.products.length} products`);
    return quoteRequest;
  }

  async createQuoteRequest(data: any) {
    const id = generateId("quote-req");
    const quoteRequest = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.quoteRequests.push(quoteRequest);
    return quoteRequest;
  }

  async getQuoteRequestsByVendor(vendorId: string) {
    const requests = this.quoteRequests.filter(request => request.vendorId === vendorId);

    // Enriquecer cada orçamento com informações dos produtos
    const enrichedRequests = requests.map(request => {
      if (request.products && request.products.length > 0) {
        // Orçamento consolidado
        return {
          ...request,
          productCount: request.products.length,
          productNames: request.products.map(p => p.productName).join(", "),
          // Para compatibilidade com código existente, usar o primeiro produto
          productId: request.products[0]?.productId || null,
          productName: request.products.length > 1
            ? `${request.products[0]?.productName} e mais ${request.products.length - 1} produto(s)`
            : request.products[0]?.productName || "Produtos diversos",
          quantity: request.products.reduce((total, p) => total + p.quantity, 0)
        };
      } else {
        // Orçamento antigo (single product)
        return {
          ...request,
          productCount: 1,
          productNames: request.productName || "Produto não especificado"
        };
      }
    });

    console.log(`Found ${enrichedRequests.length} quote requests for vendor ${vendorId}`);
    return enrichedRequests;
  }

  async getQuoteRequestsByClient(clientId: string) {
    console.log(`Searching quote requests for client: ${clientId}`);
    const requests = this.quoteRequests.filter(request => request.clientId === clientId);

    // Enriquecer cada orçamento com informações dos produtos
    const enrichedRequests = requests.map(request => {
      if (request.products && request.products.length > 0) {
        // Orçamento consolidado
        return {
          ...request,
          productCount: request.products.length,
          productNames: request.products.map(p => p.productName).join(", "),
          // Para compatibilidade com código existente, usar o primeiro produto
          productId: request.products[0]?.productId || null,
          productName: request.products.length > 1
            ? `${request.products[0]?.productName} e mais ${request.products.length - 1} produto(s)`
            : request.products[0]?.productName || "Produtos diversos",
          quantity: request.products.reduce((total, p) => total + p.quantity, 0)
        };
      } else {
        // Orçamento antigo (single product)
        return {
          ...request,
          productCount: 1,
          productNames: request.productName || "Produto não especificado"
        };
      }
    });

    console.log(`Found ${enrichedRequests.length} quote requests for client ${clientId}`);
    return enrichedRequests;
  }

  async getQuoteRequestById(id: string) {
    return this.quoteRequests.find(r => r.id === id);
  }

  async updateQuoteRequestStatus(id: string, status: string) {
    const request = this.quoteRequests.find(r => r.id === id);
    if (request) {
      request.status = status;
      request.updatedAt = new Date();
      return request;
    }
    return null;
  }

  // Logistics - Get paid orders that are ready to be sent to production
  async getPaidOrdersReadyForProduction(): Promise<Order[]> {
    console.log("Storage: Getting paid orders ready for production...");

    const allOrders = Array.from(this.orders.values());
    console.log(`Storage: Found ${allOrders.length} total orders`);

    // Filter orders that are paid and ready for production
    const paidOrders = allOrders.filter(order => {
      const totalValue = parseFloat(order.totalValue);
      const paidValue = parseFloat(order.paidValue || '0');
      const remainingValue = totalValue - paidValue;

      // Order is ready for production if:
      // 1. Status is 'confirmed'
      // 2. Has minimum payment (if required) or is fully paid
      // 3. Not already in production, shipped, delivered, or cancelled

      let hasMinimumPayment = true;
      const downPayment = parseFloat(order.downPayment || '0');
      const shippingCost = parseFloat(order.shippingCost || '0');

      if (downPayment > 0) {
        const minimumRequired = downPayment + shippingCost;
        hasMinimumPayment = paidValue >= minimumRequired;
      }

      const isReadyForProduction = order.status === 'confirmed' &&
                                   hasMinimumPayment &&
                                   remainingValue >= 0;

      if (isReadyForProduction) {
        console.log(`Storage: Order ${order.orderNumber} is ready for production - Total: ${totalValue}, Paid: ${paidValue}, Status: ${order.status}`);
      }

      return isReadyForProduction;
    });

    console.log(`Storage: Found ${paidOrders.length} paid orders ready for production`);
    return paidOrders;
  }

  // Get pending orders for reconciliation (orders with remaining balance)
  async getPendingOrdersForReconciliation(): Promise<Order[]> {
    console.log("Storage: Getting pending orders for reconciliation...");

    const allOrders = Array.from(this.orders.values());
    console.log(`Storage: Found ${allOrders.length} total orders`);

    // Filter orders that have remaining balance to be paid
    const pendingOrders = allOrders.filter(order => {
      const totalValue = parseFloat(order.totalValue);
      const paidValue = parseFloat(order.paidValue || '0');
      const remainingValue = totalValue - paidValue;

      // Include orders that:
      // 1. Are not cancelled
      // 2. Have remaining balance > 0.01 (to avoid floating point issues)
      // 3. Are confirmed (not just drafts)
      const shouldInclude = order.status !== 'cancelled' &&
                           remainingValue > 0.01 &&
                           (order.status === 'confirmed' || order.status === 'production' || order.status === 'pending');

      if (shouldInclude) {
        console.log(`Storage: Including order ${order.orderNumber} for reconciliation - Total: ${totalValue}, Paid: ${paidValue}, Remaining: ${remainingValue}, Status: ${order.status}`);
      }

      return shouldInclude;
    });

    console.log(`Storage: Found ${pendingOrders.length} pending orders for reconciliation`);
    return pendingOrders;
  }

  // Branch CRUD operations
  async getBranches(): Promise<Branch[]> {
    // Ensure mockData.branches is initialized
    if (!this.mockData.branches) {
      this.mockData.branches = [];
    }
    return this.mockData.branches;
  }

  async getBranch(id: string): Promise<Branch | null> {
    // Ensure mockData.branches is initialized
    if (!this.mockData.branches) {
      this.mockData.branches = [];
    }
    return this.mockData.branches.find(branch => branch.id === id) || null;
  }

  async createBranch(branchData: InsertBranch): Promise<Branch> {
    const id = randomUUID();
    const newBranch: Branch = {
      id,
      ...branchData,
      isHeadquarters: branchData.isHeadquarters || false,
      isActive: branchData.isActive !== undefined ? branchData.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // Ensure mockData.branches is initialized
    if (!this.mockData.branches) {
      this.mockData.branches = [];
    }
    this.mockData.branches.push(newBranch);
    console.log('Branch created:', newBranch);
    return newBranch;
  }

  async updateBranch(id: string, updateData: Partial<Branch>): Promise<Branch | null> {
    // Ensure mockData.branches is initialized
    if (!this.mockData.branches) {
      this.mockData.branches = [];
    }
    const index = this.mockData.branches.findIndex(branch => branch.id === id);
    if (index === -1) {
      console.error('Branch not found for update:', id);
      return null;
    }

    const updatedBranch = {
      ...this.mockData.branches[index],
      ...updateData,
      updatedAt: new Date(),
    };
    this.mockData.branches[index] = updatedBranch;
    console.log('Branch updated:', updatedBranch);
    return updatedBranch;
  }

  async deleteBranch(id: string): Promise<boolean> {
    // Ensure mockData.branches is initialized
    if (!this.mockData.branches) {
      this.mockData.branches = [];
    }
    const index = this.mockData.branches.findIndex(branch => branch.id === id);
    if (index === -1) return false;

    this.mockData.branches.splice(index, 1);
    await this.saveData(this.mockData);
    return true;
  }

  // System Logs methods
  async getSystemLogs(filters: {
    search?: string;
    action?: string;
    userId?: string;
    level?: string;
    dateFilter?: string;
  } = {}): Promise<SystemLog[]> {
    // Ensure mockData.systemLogs is initialized
    if (!this.mockData.systemLogs) {
      this.mockData.systemLogs = [];
    }
    let logs = [...this.mockData.systemLogs];

    // Ensure we have some initial logs if empty
    if (logs.length === 0) {
      // Create a sample log to show the system is working
      await this.logUserAction(
        'system',
        'Sistema',
        'system',
        'SYSTEM_START',
        'system',
        'startup',
        'Sistema de logs iniciado',
        'info'
      );
      logs = [...this.mockData.systemLogs];
    }

    if (filters) {
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase();
        logs = logs.filter(log =>
          log.description.toLowerCase().includes(searchLower) ||
          log.userName.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower) ||
          (log.entity && log.entity.toLowerCase().includes(searchLower))
        );
      }

      if (filters.action && filters.action !== 'all') {
        logs = logs.filter(log => log.action === filters.action);
      }

      if (filters.userId && filters.userId !== 'all') {
        logs = logs.filter(log => log.userId === filters.userId);
      }

      if (filters.level && filters.level !== 'all') {
        logs = logs.filter(log => log.level === filters.level);
      }

      if (filters.dateFilter && filters.dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filters.dateFilter) {
          case 'today':
            logs = logs.filter(log => new Date(log.createdAt) >= today);
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            logs = logs.filter(log => new Date(log.createdAt) >= weekAgo);
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            logs = logs.filter(log => new Date(log.createdAt) >= monthAgo);
            break;
        }
      }
    }

    // Sort by creation date descending (newest first)
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return logs;
  }

  async createSystemLog(logData: InsertSystemLog): Promise<SystemLog> {
    const id = randomUUID();
    const log: SystemLog = {
      ...logData,
      id,
      createdAt: new Date(),
    };

    // Ensure mockData.systemLogs is initialized
    if (!this.mockData.systemLogs) {
      this.mockData.systemLogs = [];
    }
    this.mockData.systemLogs.push(log);
    await this.saveData(this.mockData);

    console.log(`[SYSTEM LOG] ${log.userName} (${log.userRole}) - ${log.action} ${log.entity || ''}: ${log.description}`);

    return log;
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
    const log: SystemLog = {
      id: randomUUID(),
      userId,
      userName,
      userRole,
      action,
      entity: entity || null,
      entityId: entityId || null,
      description,
      details: details ? JSON.stringify(details) : null,
      level: level || 'info',
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: new Date()
    };

    this.mockData.systemLogs.push(log);
    console.log(`[LOG] ${userName} (${userRole}) - ${action} - ${description}`);
  }
}

export const storage = new MemStorage();