import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import { MemStorage, type IStorage } from "./storage";
import {
  insertUserSchema,
  insertClientSchema,
  insertOrderSchema,
  insertProductSchema,
  insertBudgetSchema,
  insertProductionOrderSchema,
  insertPaymentSchema,
  insertCommissionSchema,
  insertPartnerSchema,
  insertVendorSchema,
  insertPaymentMethodSchema,
  insertShippingMethodSchema,
  insertBudgetPaymentInfoSchema,
  insertAccountsReceivableSchema,
  insertExpenseNoteSchema,
  insertCommissionPayoutSchema,
  insertCustomizationOptionSchema,
  insertProducerPaymentSchema,
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage: IStorage = new MemStorage();

const upload = multer({
  storage: multer.diskStorage({
    destination: 'public/uploads/',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

export function registerRoutes(app: Express): Server {
  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ message: "User account is inactive" });
      }
      
      res.json({ user: { ...user, password: undefined } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    res.json({ authenticated: false });
  });

  // Users routes
  app.get("/api/users", async (_req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(u => ({ ...u, password: undefined })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const user = await storage.createUser(result.data);
      res.json({ ...user, password: undefined });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Clients routes
  app.get("/api/clients", async (_req: Request, res: Response) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      const result = insertClientSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const client = await storage.createClient(result.data);
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteClient(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/clients/vendor/:vendorId", async (req: Request, res: Response) => {
    try {
      const clients = await storage.getClientsByVendor(req.params.vendorId);
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Products routes
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        search: req.query.search as string,
        category: req.query.category as string,
        producer: req.query.producer as string,
      };
      const result = await storage.getProducts(options);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/products", async (req: Request, res: Response) => {
    try {
      const product = await storage.createProduct(req.body);
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/products/import", async (req: Request, res: Response) => {
    try {
      const result = await storage.importProducts(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/search/:query", async (req: Request, res: Response) => {
    try {
      const products = await storage.searchProducts(req.params.query);
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/producer/:producerId", async (req: Request, res: Response) => {
    try {
      const products = await storage.getProductsByProducer(req.params.producerId);
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Orders routes
  app.get("/api/orders", async (_req: Request, res: Response) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const result = insertOrderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const order = await storage.createOrder(result.data);
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const order = await storage.updateOrder(req.params.id, req.body);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders/:id/send-to-production", async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const { producerId } = req.body;
      const productionOrder = await storage.createProductionOrder({
        orderId: order.id,
        producerId,
        status: 'pending',
        deadline: order.deadline,
        notes: null,
        deliveryDeadline: order.deadline,
        hasUnreadNotes: false,
        lastNoteAt: null,
        trackingCode: null,
        shippingAddress: null,
        producerValue: null,
        producerValueLocked: false,
        producerPaymentStatus: 'pending',
        producerNotes: null,
        acceptedAt: null,
        completedAt: null
      });
      
      res.json(productionOrder);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/vendor/:vendorId", async (req: Request, res: Response) => {
    try {
      const orders = await storage.getOrdersByVendor(req.params.vendorId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/client/:clientId", async (req: Request, res: Response) => {
    try {
      const orders = await storage.getOrdersByClient(req.params.clientId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Production Orders routes
  app.get("/api/production-orders", async (_req: Request, res: Response) => {
    try {
      const orders = await storage.getProductionOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/production-orders/:id", async (req: Request, res: Response) => {
    try {
      const order = await storage.getProductionOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Production order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/production-orders", async (req: Request, res: Response) => {
    try {
      const order = await storage.createProductionOrder(req.body);
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/production-orders/:id/status", async (req: Request, res: Response) => {
    try {
      const { status, notes, deliveryDate, trackingCode } = req.body;
      const order = await storage.updateProductionOrderStatus(
        req.params.id,
        status,
        notes,
        deliveryDate,
        trackingCode
      );
      if (!order) {
        return res.status(404).json({ message: "Production order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/production-orders/:id/value", async (req: Request, res: Response) => {
    try {
      const { value, notes, lockValue } = req.body;
      const order = await storage.updateProductionOrderValue(
        req.params.id,
        value,
        notes,
        lockValue
      );
      if (!order) {
        return res.status(404).json({ message: "Production order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/production-orders/producer/:producerId", async (req: Request, res: Response) => {
    try {
      const orders = await storage.getProductionOrdersByProducer(req.params.producerId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/production-orders/order/:orderId", async (req: Request, res: Response) => {
    try {
      const orders = await storage.getProductionOrdersByOrder(req.params.orderId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Budgets routes
  app.get("/api/budgets", async (_req: Request, res: Response) => {
    try {
      const budgets = await storage.getBudgets();
      res.json(budgets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/budgets/:id", async (req: Request, res: Response) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      res.json(budget);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/budgets", async (req: Request, res: Response) => {
    try {
      const budget = await storage.createBudget(req.body);
      res.json(budget);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/budgets/:id", async (req: Request, res: Response) => {
    try {
      const budget = await storage.updateBudget(req.params.id, req.body);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      res.json(budget);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/budgets/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteBudget(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Budget not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/budgets/:id/convert", async (req: Request, res: Response) => {
    try {
      const { producerId } = req.body;
      const order = await storage.convertBudgetToOrder(req.params.id, producerId);
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/budgets/vendor/:vendorId", async (req: Request, res: Response) => {
    try {
      const budgets = await storage.getBudgetsByVendor(req.params.vendorId);
      res.json(budgets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/budgets/client/:clientId", async (req: Request, res: Response) => {
    try {
      const budgets = await storage.getBudgetsByClient(req.params.clientId);
      res.json(budgets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Budget Items routes
  app.get("/api/budgets/:budgetId/items", async (req: Request, res: Response) => {
    try {
      const items = await storage.getBudgetItems(req.params.budgetId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/budgets/:budgetId/items", async (req: Request, res: Response) => {
    try {
      const item = await storage.createBudgetItem(req.params.budgetId, req.body);
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/budget-items/:id", async (req: Request, res: Response) => {
    try {
      const item = await storage.updateBudgetItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Budget item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/budget-items/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteBudgetItem(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Budget item not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Budget Photos routes
  app.get("/api/budgets/:budgetId/photos", async (req: Request, res: Response) => {
    try {
      const photos = await storage.getBudgetPhotos(req.params.budgetId);
      res.json(photos);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/budgets/:budgetId/photos", upload.single('photo'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }
      const photoUrl = `/uploads/${req.file.filename}`;
      const photo = await storage.createBudgetPhoto(req.params.budgetId, {
        photoUrl,
        description: req.body.description
      });
      res.json(photo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/budget-photos/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteBudgetPhoto(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Photo not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payments routes
  app.get("/api/payments", async (_req: Request, res: Response) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payments", async (req: Request, res: Response) => {
    try {
      const payment = await storage.createPayment(req.body);
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payments/order/:orderId", async (req: Request, res: Response) => {
    try {
      const payments = await storage.getPaymentsByOrder(req.params.orderId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Commissions routes
  app.get("/api/commissions", async (_req: Request, res: Response) => {
    try {
      const commissions = await storage.getAllCommissions();
      res.json(commissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/commissions/vendor/:vendorId", async (req: Request, res: Response) => {
    try {
      const commissions = await storage.getCommissionsByVendor(req.params.vendorId);
      res.json(commissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/commissions", async (req: Request, res: Response) => {
    try {
      const commission = await storage.createCommission(req.body);
      res.json(commission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/commissions/:id/status", async (req: Request, res: Response) => {
    try {
      const { status, paidAt } = req.body;
      const commission = await storage.updateCommissionStatus(req.params.id, status, paidAt);
      if (!commission) {
        return res.status(404).json({ message: "Commission not found" });
      }
      res.json(commission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Partners routes
  app.get("/api/partners", async (_req: Request, res: Response) => {
    try {
      const partners = await storage.getPartners();
      res.json(partners.map(p => ({ ...p, password: undefined })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/partners", async (req: Request, res: Response) => {
    try {
      const partner = await storage.createPartner(req.body);
      res.json({ ...partner, password: undefined });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/partners/:userId/commission", async (req: Request, res: Response) => {
    try {
      const { commissionRate } = req.body;
      await storage.updatePartnerCommission(req.params.userId, commissionRate);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vendors routes
  app.get("/api/vendors", async (_req: Request, res: Response) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors.map(v => ({ ...v, password: undefined })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vendors", async (req: Request, res: Response) => {
    try {
      const vendor = await storage.createVendor(req.body);
      res.json({ ...vendor, password: undefined });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/vendors/:userId/commission", async (req: Request, res: Response) => {
    try {
      const { commissionRate } = req.body;
      await storage.updateVendorCommission(req.params.userId, commissionRate);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Producers routes
  app.get("/api/producers", async (_req: Request, res: Response) => {
    try {
      const producers = await storage.getUsersByRole('producer');
      res.json(producers.map(p => ({ ...p, password: undefined })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/producers/:id", async (req: Request, res: Response) => {
    try {
      const producer = await storage.getUser(req.params.id);
      if (!producer || producer.role !== 'producer') {
        return res.status(404).json({ message: "Producer not found" });
      }
      res.json({ ...producer, password: undefined });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/producer/:producerId/stats", async (req: Request, res: Response) => {
    try {
      const orders = await storage.getProductionOrdersByProducer(req.params.producerId);
      const stats = {
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        inProductionOrders: orders.filter(o => o.status === 'production').length,
        completedOrders: orders.filter(o => o.status === 'completed').length,
      };
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Commission Settings routes
  app.get("/api/commission-settings", async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getCommissionSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/commission-settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.updateCommissionSettings(req.body);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment Methods routes
  app.get("/api/payment-methods", async (_req: Request, res: Response) => {
    try {
      const methods = await storage.getPaymentMethods();
      res.json(methods);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payment-methods", async (req: Request, res: Response) => {
    try {
      const method = await storage.createPaymentMethod(req.body);
      res.json(method);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/payment-methods/:id", async (req: Request, res: Response) => {
    try {
      const method = await storage.updatePaymentMethod(req.params.id, req.body);
      if (!method) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      res.json(method);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/payment-methods/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deletePaymentMethod(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Shipping Methods routes
  app.get("/api/shipping-methods", async (_req: Request, res: Response) => {
    try {
      const methods = await storage.getShippingMethods();
      res.json(methods);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/shipping-methods", async (req: Request, res: Response) => {
    try {
      const method = await storage.createShippingMethod(req.body);
      res.json(method);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/shipping-methods/:id", async (req: Request, res: Response) => {
    try {
      const method = await storage.updateShippingMethod(req.params.id, req.body);
      if (!method) {
        return res.status(404).json({ message: "Shipping method not found" });
      }
      res.json(method);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/shipping-methods/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteShippingMethod(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Shipping method not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Budget Payment Info routes
  app.get("/api/budget-payment-info/:budgetId", async (req: Request, res: Response) => {
    try {
      const info = await storage.getBudgetPaymentInfo(req.params.budgetId);
      res.json(info);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/budget-payment-info", async (req: Request, res: Response) => {
    try {
      const info = await storage.createBudgetPaymentInfo(req.body);
      res.json(info);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/budget-payment-info/:budgetId", async (req: Request, res: Response) => {
    try {
      const info = await storage.updateBudgetPaymentInfo(req.params.budgetId, req.body);
      res.json(info);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Financial - Accounts Receivable routes
  app.get("/api/finance/receivables", async (_req: Request, res: Response) => {
    try {
      const receivables = await storage.getAccountsReceivable();
      res.json(receivables);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/finance/receivables/order/:orderId", async (req: Request, res: Response) => {
    try {
      const receivables = await storage.getAccountsReceivableByOrder(req.params.orderId);
      res.json(receivables);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/finance/receivables", async (req: Request, res: Response) => {
    try {
      const receivable = await storage.createAccountsReceivable(req.body);
      res.json(receivable);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/finance/receivables/:id", async (req: Request, res: Response) => {
    try {
      const receivable = await storage.updateAccountsReceivable(req.params.id, req.body);
      if (!receivable) {
        return res.status(404).json({ message: "Receivable not found" });
      }
      res.json(receivable);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Financial - Expense Notes routes
  app.get("/api/finance/expenses", async (_req: Request, res: Response) => {
    try {
      const expenses = await storage.getExpenseNotes();
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/finance/expenses", async (req: Request, res: Response) => {
    try {
      const expense = await storage.createExpenseNote(req.body);
      res.json(expense);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/finance/expenses/:id", async (req: Request, res: Response) => {
    try {
      const expense = await storage.updateExpenseNote(req.params.id, req.body);
      if (!expense) {
        return res.status(404).json({ message: "Expense note not found" });
      }
      res.json(expense);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Financial - Commission Payouts routes
  app.get("/api/finance/commission-payouts", async (_req: Request, res: Response) => {
    try {
      const payouts = await storage.getCommissionPayouts();
      const allCommissions = await storage.getAllCommissions();
      const pendingCommissions = allCommissions.filter(c => 
        c.status === 'confirmed' && !c.paidAt
      );

      const enrichedCommissions = await Promise.all(
        pendingCommissions.map(async (commission) => {
          let userName = 'Usuário não encontrado';

          if (commission.type === 'vendor' && commission.vendorId) {
            const vendor = await storage.getUser(commission.vendorId);
            userName = vendor?.name || 'Vendedor não encontrado';
          } else if (commission.type === 'partner' && commission.partnerId) {
            const partner = await storage.getUser(commission.partnerId);
            userName = partner?.name || 'Sócio não encontrado';
          }

          return {
            ...commission,
            userName
          };
        })
      );

      const allPayouts = [
        ...payouts,
        ...enrichedCommissions.map(c => ({
          id: `commission-${c.id}`,
          commissionId: c.id,
          userId: c.vendorId || c.partnerId,
          type: c.type,
          amount: c.amount,
          status: 'pending',
          userName: c.userName,
          periodStart: c.createdAt,
          periodEnd: c.createdAt,
          orderNumber: c.orderNumber,
          orderValue: c.orderValue,
          createdAt: c.createdAt,
          paidAt: null
        }))
      ];

      res.json(allPayouts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/finance/commission-payouts", async (req: Request, res: Response) => {
    try {
      const payout = await storage.createCommissionPayout(req.body);
      res.json(payout);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/finance/commission-payouts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (id.startsWith('commission-')) {
        const commissionId = id.replace('commission-', '');
        const updatedCommission = await storage.updateCommissionStatus(
          commissionId, 
          'paid', 
          new Date()
        );

        if (!updatedCommission) {
          return res.status(404).json({ message: 'Commission not found' });
        }

        res.json({ 
          ...updatedCommission, 
          id: `commission-${updatedCommission.id}`,
          status: 'paid'
        });
      } else {
        const payout = await storage.updateCommissionPayout(id, updates);
        if (!payout) {
          return res.status(404).json({ message: "Commission payout not found" });
        }
        res.json(payout);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Financial - Bank Import and Transactions routes
  app.get("/api/finance/bank-imports", async (_req: Request, res: Response) => {
    try {
      const imports = await storage.getBankImports();
      res.json(imports);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/finance/bank-imports", async (req: Request, res: Response) => {
    try {
      const bankImport = await storage.createBankImport(req.body);
      res.json(bankImport);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/finance/bank-transactions", async (_req: Request, res: Response) => {
    try {
      const transactions = await storage.getBankTransactions();
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/finance/bank-transactions", async (req: Request, res: Response) => {
    try {
      const transaction = await storage.createBankTransaction(req.body);
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/finance/bank-transactions/:id", async (req: Request, res: Response) => {
    try {
      const transaction = await storage.updateBankTransaction(req.params.id, req.body);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customization Options routes
  app.get("/api/settings/customization-options", async (_req: Request, res: Response) => {
    try {
      const options = await storage.getCustomizationOptions();
      res.json(options);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings/customization-options", async (req: Request, res: Response) => {
    try {
      const option = await storage.createCustomizationOption(req.body);
      res.json(option);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/settings/customization-options/:id", async (req: Request, res: Response) => {
    try {
      const option = await storage.updateCustomizationOption(req.params.id, req.body);
      if (!option) {
        return res.status(404).json({ message: "Customization option not found" });
      }
      res.json(option);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/settings/customization-options/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteCustomizationOption(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Customization option not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Producer Payments routes
  app.get("/api/producer-payments", async (_req: Request, res: Response) => {
    try {
      const payments = await storage.getProducerPayments();
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/producer-payments/producer/:producerId", async (req: Request, res: Response) => {
    try {
      const payments = await storage.getProducerPaymentsByProducer(req.params.producerId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/producer-payments", async (req: Request, res: Response) => {
    try {
      const payment = await storage.createProducerPayment(req.body);
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/producer-payments/:id", async (req: Request, res: Response) => {
    try {
      const payment = await storage.updateProducerPayment(req.params.id, req.body);
      if (!payment) {
        return res.status(404).json({ message: "Producer payment not found" });
      }
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Quote Requests routes
  app.post("/api/quote-requests", async (req: Request, res: Response) => {
    try {
      const quoteRequest = await storage.createQuoteRequest(req.body);
      res.json(quoteRequest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/quote-requests/vendor/:vendorId", async (req: Request, res: Response) => {
    try {
      const quoteRequests = await storage.getQuoteRequestsByVendor(req.params.vendorId);
      res.json(quoteRequests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/quote-requests/:id/status", async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const quoteRequest = await storage.updateQuoteRequestStatus(req.params.id, status);
      res.json(quoteRequest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Logistics routes
  app.get("/api/logistics/paid-orders", async (_req: Request, res: Response) => {
    try {
      const orders = await storage.getOrders();
      const paidOrders = orders.filter(o => {
        const paidValue = parseFloat(o.paidValue || '0');
        const totalValue = parseFloat(o.totalValue || '0');
        return paidValue >= totalValue && o.status === 'confirmed';
      });
      res.json(paidOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/logistics/dispatch-order", async (req: Request, res: Response) => {
    try {
      const { productionOrderId, trackingCode, shippingAddress } = req.body;
      const order = await storage.updateProductionOrder(productionOrderId, {
        status: 'shipped',
        trackingCode,
        shippingAddress
      });
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/logistics/producer-stats", async (_req: Request, res: Response) => {
    try {
      const productionOrders = await storage.getProductionOrders();
      const producers = await storage.getUsersByRole('producer');
      
      const stats = producers.map(producer => {
        const orders = productionOrders.filter(o => o.producerId === producer.id);
        return {
          producerId: producer.id,
          producerName: producer.name,
          totalOrders: orders.length,
          pendingOrders: orders.filter(o => o.status === 'pending').length,
          inProductionOrders: orders.filter(o => o.status === 'production').length,
          completedOrders: orders.filter(o => o.status === 'completed').length,
        };
      });
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard stats routes
  app.get("/api/dashboard/stats", async (_req: Request, res: Response) => {
    try {
      const orders = await storage.getOrders();
      const clients = await storage.getClients();
      const products = await storage.getProducts();
      const budgets = await storage.getBudgets();

      const stats = {
        totalOrders: orders.length,
        totalClients: clients.length,
        totalProducts: products.total || 0,
        totalBudgets: budgets.length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        completedOrders: orders.filter(o => o.status === 'delivered').length,
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Finance overview routes
  app.get("/api/finance/overview", async (_req: Request, res: Response) => {
    try {
      const receivables = await storage.getAccountsReceivable();
      const expenses = await storage.getExpenseNotes();
      const commissions = await storage.getAllCommissions();

      const totalReceivable = receivables.reduce((sum, r) => {
        return sum + parseFloat(r.amount || '0');
      }, 0);

      const totalExpenses = expenses.reduce((sum, e) => {
        return sum + parseFloat(e.amount || '0');
      }, 0);

      const totalCommissions = commissions.reduce((sum, c) => {
        return sum + parseFloat(c.amount || '0');
      }, 0);

      res.json({
        totalReceivable,
        totalExpenses,
        totalCommissions,
        netRevenue: totalReceivable - totalExpenses - totalCommissions,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/finance/payments", async (_req: Request, res: Response) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
