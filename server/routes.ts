import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const users = await storage.getUsers();
      const payments = await storage.getPayments();
      const products = await storage.getProducts();
      const budgets = await storage.getBudgets();

      const today = new Date().toDateString();
      const ordersToday = orders.filter(order => 
        new Date(order.createdAt).toDateString() === today
      ).length;

      const inProduction = orders.filter(order => 
        order.status === 'production'
      ).length;

      const monthlyRevenue = orders
        .filter(order => {
          const orderMonth = new Date(order.createdAt).getMonth();
          const currentMonth = new Date().getMonth();
          return orderMonth === currentMonth && order.status !== 'cancelled';
        })
        .reduce((total, order) => total + parseFloat(order.totalValue), 0);

      const pendingPayments = payments
        .filter(payment => payment.status === 'pending')
        .reduce((total, payment) => total + parseFloat(payment.amount), 0);

      res.json({
        ordersToday,
        inProduction,
        monthlyRevenue,
        pendingPayments,
        totalOrders: orders.length,
        totalClients: users.filter(u => u.role === 'client').length,
        totalVendors: users.filter(u => u.role === 'vendor').length,
        totalProducers: users.filter(u => u.role === 'producer').length,
        totalProducts: products.length,
        totalBudgets: budgets.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();

      // Enrich with user data
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const client = await storage.getUser(order.clientId);
          const vendor = await storage.getUser(order.vendorId);
          const producer = order.producerId ? await storage.getUser(order.producerId) : null;

          return {
            ...order,
            clientName: client?.name || 'Unknown',
            vendorName: vendor?.name || 'Unknown',
            producerName: producer?.name || null
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/vendor/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const orders = await storage.getOrdersByVendor(vendorId);

      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const client = await storage.getUser(order.clientId);
          return {
            ...order,
            clientName: client?.name || 'Unknown'
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor orders" });
    }
  });

  app.get("/api/orders/client/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const orders = await storage.getOrdersByClient(clientId);

      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const vendor = await storage.getUser(order.vendorId);
          const producer = order.producerId ? await storage.getUser(order.producerId) : null;
          return {
            ...order,
            vendorName: vendor?.name || 'Unknown',
            producerName: producer?.name || null
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client orders" });
    }
  });

  // Production Orders
  app.get("/api/production-orders/producer/:producerId", async (req, res) => {
    try {
      const { producerId } = req.params;
      const productionOrders = await storage.getProductionOrdersByProducer(producerId);

      const enrichedOrders = await Promise.all(
        productionOrders.map(async (po) => {
          const order = await storage.getOrder(po.orderId);
          return {
            ...po,
            product: order?.product || 'Unknown',
            orderNumber: order?.orderNumber || 'Unknown'
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch production orders" });
    }
  });

  // Vendors
  app.get("/api/vendors", async (req, res) => {
    try {
      const users = await storage.getUsers();
      const vendors = users.filter(user => user.role === 'vendor');

      const vendorsWithInfo = await Promise.all(
        vendors.map(async (vendor) => {
          const vendorInfo = await storage.getVendor(vendor.id);
          return {
            id: vendor.id,
            name: vendor.name,
            email: vendor.email,
            username: vendor.username,
            commissionRate: vendorInfo?.commissionRate || '10.00',
            isActive: vendorInfo?.isActive || true
          };
        })
      );

      res.json(vendorsWithInfo);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.post("/api/vendors", async (req, res) => {
    try {
      const { name, email, username, commissionRate } = req.body;

      // Create user
      const user = await storage.createUser({
        username,
        password: "123456", // Default password
        role: "vendor",
        name,
        email
      });

      // Create vendor info
      await storage.createVendor({
        userId: user.id,
        commissionRate: commissionRate || '10.00',
        isActive: true,
        salesLink: null
      });

      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  app.put("/api/vendors/:vendorId/commission", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const { commissionRate } = req.body;

      await storage.updateVendorCommission(vendorId, commissionRate);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update vendor commission" });
    }
  });

  // Vendor info
  app.get("/api/vendor/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const vendor = await storage.getVendor(userId);
      const orders = await storage.getOrdersByVendor(userId);
      const commissions = await storage.getCommissionsByVendor(userId);

      const monthlySales = orders
        .filter(order => {
          const orderMonth = new Date(order.createdAt).getMonth();
          const currentMonth = new Date().getMonth();
          return orderMonth === currentMonth;
        })
        .reduce((total, order) => total + parseFloat(order.totalValue), 0);

      const totalCommissions = commissions
        .reduce((total, commission) => total + parseFloat(commission.amount), 0);

      res.json({
        vendor,
        monthlySales,
        totalCommissions,
        confirmedOrders: orders.filter(o => o.status !== 'pending').length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor info" });
    }
  });

  // Financial data
  app.get("/api/finance/overview", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const payments = await storage.getPayments();
      const commissions = await storage.getCommissionsByVendor("");

      const receivables = orders
        .filter(order => order.status !== 'cancelled')
        .reduce((total, order) => total + (parseFloat(order.totalValue) - parseFloat(order.paidValue)), 0);

      const payables = 12450; // Mock data for suppliers/producers
      const balance = 89230; // Mock bank balance
      const pendingCommissions = commissions
        .filter(c => c.status === 'pending')
        .reduce((total, c) => total + parseFloat(c.amount), 0);

      res.json({
        receivables,
        payables,
        balance,
        pendingCommissions
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch financial overview" });
    }
  });

  app.get("/api/finance/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments();

      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          const order = await storage.getOrder(payment.orderId);
          const client = order ? await storage.getUser(order.clientId) : null;

          return {
            ...payment,
            orderNumber: order?.orderNumber || 'Unknown',
            clientName: client?.name || 'Unknown',
            description: `${payment.method.toUpperCase()} - ${client?.name || 'Unknown'}`
          };
        })
      );

      res.json(enrichedPayments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Producer stats
  app.get("/api/producer/:producerId/stats", async (req, res) => {
    try {
      const { producerId } = req.params;
      const productionOrders = await storage.getProductionOrdersByProducer(producerId);

      const activeOrders = productionOrders.filter(po => po.status === 'production' || po.status === 'accepted').length;
      const pendingOrders = productionOrders.filter(po => po.status === 'pending').length;
      const completedOrders = productionOrders.filter(po => po.status === 'completed').length;

      res.json({
        activeOrders,
        pendingOrders, 
        completedOrders
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch producer stats" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = req.body;
      const newProduct = await storage.createProduct(productData);
      res.json(newProduct);
    } catch (error) {
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  app.post("/api/products/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }

      let productsData;
      const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase() || '';

      if (fileExtension === 'json') {
        // Parse JSON file
        const fileContent = req.file.buffer.toString('utf8');
        productsData = JSON.parse(fileContent);
      } else {
        return res.status(400).json({ error: "Formato de arquivo não suportado. Use arquivos JSON." });
      }

      if (!Array.isArray(productsData)) {
        return res.status(400).json({ error: "O arquivo JSON deve conter um array de produtos" });
      }

      let imported = 0;
      let errors = [];

      for (const item of productsData) {
        try {
          // Map the JSON structure to our product schema
          const productData = {
            name: item.Nome || item.name || 'Produto Sem Nome',
            description: item.Descricao || item.description || '',
            category: item.WebTipo || item.category || 'Sem Categoria',
            basePrice: (item.PrecoVenda || item.basePrice || 0).toString(),
            unit: 'un', // Default unit
            isActive: true
          };

          // Validate required fields
          if (!productData.name || !productData.basePrice || productData.basePrice === '0') {
            errors.push(`Produto "${productData.name}" ignorado: dados insuficientes`);
            continue;
          }

          await storage.createProduct(productData);
          imported++;
        } catch (productError) {
          errors.push(`Erro ao importar produto "${item.Nome || item.name}": ${productError.message}`);
        }
      }

      res.json({
        imported,
        total: productsData.length,
        errors: errors.slice(0, 10) // Limit error messages
      });

    } catch (parseError) {
      console.error('Import error:', parseError);
      res.status(400).json({ error: "Erro ao processar arquivo: " + parseError.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}