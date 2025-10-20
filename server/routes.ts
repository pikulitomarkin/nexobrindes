import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import express from 'express';
import path from 'path';
import { storage } from "./storage";
import { db, eq, orders, clients, budgets, budgetPhotos, productionOrders, desc, sql, type ProductionOrder, users as usersTable, orders as ordersTable, productionOrders as productionOrdersTable } from './db';

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Mock requireAuth middleware for demonstration purposes
const requireAuth = async (req: any, res: any, next: any) => {
  console.log("Simulating authentication check...");
  req.user = { id: 'mock-user-id', role: 'admin' };
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from public/uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    const { username, password, preferredRole } = req.body;

    try {
      console.log("Login attempt:", { username, preferredRole });

      const user = await storage.getUserByUsername(username);
      console.log("Found user:", user ? { id: user.id, username: user.username, role: user.role } : "not found");

      if (!user || user.password !== password || !user.isActive) {
        console.log("Login failed - invalid credentials or inactive user");
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      if (preferredRole && user.role !== preferredRole) {
        console.log(`Role mismatch: requested ${preferredRole}, user has ${user.role}`);
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
      const { password: _, ...userWithoutPassword } = user;

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

  app.get("/api/auth/verify", async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log("No authorization header found");
      return res.status(401).json({ error: "Não autenticado" });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log("Verifying token:", token.substring(0, 20) + "...");

    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      console.log("Decoded token:", decoded);
      
      const [userId, username, timestamp] = decoded.split(':');
      console.log("Token parts - userId:", userId, "username:", username, "timestamp:", timestamp);

      const user = await storage.getUser(userId);
      console.log("User found:", userId, "-", username);

      if (!user || !user.isActive) {
        console.log("User not found or inactive");
        return res.status(401).json({ error: "Usuário não encontrado ou inativo" });
      }

      const { password: _, ...userWithoutPassword } = user;
      console.log("Token verification successful for user:", username);
      
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(401).json({ error: "Token inválido" });
    }
  });

  // Production Orders
  app.patch("/api/production-orders/:id/value", async (req, res) => {
    try {
      const { id } = req.params;
      const { value, notes } = req.body;

      if (!value || parseFloat(value) <= 0) {
        return res.status(400).json({ error: "Valor deve ser maior que zero" });
      }

      const updatedPO = await storage.updateProductionOrderValue(id, value, notes, false);
      if (!updatedPO) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      res.json(updatedPO);
    } catch (error) {
      console.error("Error updating producer value:", error);
      res.status(500).json({ error: "Erro ao atualizar valor do produtor" });
    }
  });

  app.get("/api/production-orders/producer/:producerId", async (req, res) => {
    try {
      const { producerId } = req.params;
      console.log("API: Fetching production orders for producer:", producerId);
      
      const orders = await storage.getProductionOrdersByProducer(producerId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching production orders:", error);
      res.status(500).json({ error: "Erro ao buscar ordens de produção" });
    }
  });

  app.get("/api/production-orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getProductionOrderById(id);
      
      if (!order) {
        return res.status(404).json({ error: "Ordem não encontrada" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching production order:", error);
      res.status(500).json({ error: "Erro ao buscar ordem" });
    }
  });

  app.patch("/api/production-orders/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const updated = await storage.updateProductionOrderStatus(id, status, notes);
      if (!updated) {
        return res.status(404).json({ error: "Ordem não encontrada" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating status:", error);
      res.status(500).json({ error: "Erro ao atualizar status" });
    }
  });

  // Producer stats
  app.get("/api/producer/:producerId/stats", async (req, res) => {
    try {
      const { producerId } = req.params;
      const stats = await storage.getProducerStats(producerId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching producer stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // Producer payments
  app.get("/api/producer-payments/producer/:producerId", async (req, res) => {
    try {
      const { producerId } = req.params;
      const payments = await storage.getProducerPayments(producerId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching producer payments:", error);
      res.status(500).json({ error: "Erro ao buscar pagamentos" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Erro ao buscar pedidos" });
    }
  });

  // Logistics
  app.get("/api/logistics/production-orders", async (req, res) => {
    try {
      const orders = await storage.getProductionOrdersForLogistics();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching logistics orders:", error);
      res.status(500).json({ error: "Erro ao buscar ordens" });
    }
  });

  app.get("/api/logistics/paid-orders", async (req, res) => {
    try {
      const orders = await storage.getPaidOrdersForLogistics();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching paid orders:", error);
      res.status(500).json({ error: "Erro ao buscar pedidos pagos" });
    }
  });

  app.get("/api/logistics/producer-stats", async (req, res) => {
    try {
      const stats = await storage.getLogisticsProducerStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching producer stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  app.get("/api/producers", async (req, res) => {
    try {
      const producers = await storage.getProducers();
      res.json(producers);
    } catch (error) {
      console.error("Error fetching producers:", error);
      res.status(500).json({ error: "Erro ao buscar produtores" });
    }
  });

  // Customization options
  app.get("/api/settings/customization-options", async (req, res) => {
    try {
      console.log("Simulating authentication check...");
      const options = await storage.getCustomizationOptions();
      res.json(options);
    } catch (error) {
      console.error("Error fetching customization options:", error);
      res.status(500).json({ error: "Erro ao buscar opções" });
    }
  });

  // File upload placeholder routes
  app.post("/api/products/import", upload.single('file'), async (req, res) => {
    res.json({ success: true, message: "Import endpoint ready" });
  });

  app.post("/api/logistics/products/import", upload.single('file'), async (req, res) => {
    res.json({ success: true, message: "Import endpoint ready" });
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    res.json({ success: true, message: "Upload endpoint ready" });
  });

  app.post("/api/finance/ofx-import", upload.single('file'), async (req, res) => {
    res.json({ success: true, message: "OFX import endpoint ready" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
