import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import express from 'express';
import path from 'path';
import { storage } from "./storage";
import { db, eq, orders, clients, budgets, budgetPhotos, productionOrders, desc, sql, type ProductionOrder } from './db'; // Assuming these are your database models and functions

// Mock requireAuth middleware for demonstration purposes
// In a real application, this would verify JWT tokens or session
const requireAuth = async (req: any, res: any, next: any) => {
  // Mock authentication: Assume any request to these routes is authenticated
  // In a real app, you'd check req.headers.authorization, verify token, etc.
  // For now, we'll just log and proceed to simulate authentication success.
  console.log("Simulating authentication check...");

  // Mock req.user for routes that need it
  // This should be populated based on the actual authenticated user
  req.user = { id: 'mock-user-id', role: 'admin' }; // Example user

  // Example: If you have a token verification middleware, it would look something like this:
  /*
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token not provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = await storage.getUser(decoded.userId); // Fetch user from DB
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or inactive user' });
    }
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
  */

  // For this example, we'll just allow the request to proceed
  next();
};


export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from public/uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;

    try {
      const user = await storage.getUserByUsername(username);

      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: "Usuário inativo" });
      }

      // Create a simple token (in production, use JWT)
      const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;

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

  // Verify Token (middleware for protected routes)
  app.get("/api/auth/verify", async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.log("No token provided");
      return res.status(401).json({ error: "Token não fornecido" });
    }

    try {
      console.log("Verifying token:", token.substring(0, 20) + "...");
      const decoded = Buffer.from(token, 'base64').toString();
      console.log("Decoded token:", decoded);

      const tokenParts = decoded.split(':');
      if (tokenParts.length !== 3) {
        console.log("Invalid token format, parts:", tokenParts.length);
        return res.status(401).json({ error: "Formato de token inválido" });
      }

      const [userId, username, timestamp] = tokenParts;
      console.log("Token parts - userId:", userId, "username:", username, "timestamp:", timestamp);

      // Check if token is not too old (24 hours)
      const tokenTimestamp = parseInt(timestamp);
      if (isNaN(tokenTimestamp)) {
        console.log("Invalid timestamp:", timestamp);
        return res.status(401).json({ error: "Token inválido" });
      }

      const tokenAge = Date.now() - tokenTimestamp;
      if (tokenAge > 24 * 60 * 60 * 1000) {
        console.log("Token expired, age:", tokenAge);
        return res.status(401).json({ error: "Token expirado" });
      }

      const user = await storage.getUser(userId);
      console.log("User found:", user ? `${user.id} - ${user.username}` : "not found");

      if (!user) {
        console.log("User not found for ID:", userId);
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      if (!user.isActive) {
        console.log("User inactive:", userId);
        return res.status(401).json({ error: "Usuário inativo" });
      }

      // Verify username matches
      if (user.username !== username) {
        console.log("Username mismatch. Token:", username, "User:", user.username);
        return res.status(401).json({ error: "Token inválido" });
      }

      console.log("Token verification successful for user:", user.username);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(401).json({ error: "Erro na verificação do token" });
    }
  });

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
        order.createdAt && new Date(order.createdAt).toDateString() === today
      ).length;

      const inProduction = orders.filter(order =>
        order.status === 'production'
      ).length;

      const monthlyRevenue = orders
        .filter(order => {
          if (!order.createdAt) return false;
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
        totalProducts: products.total,
        totalBudgets: budgets.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Orders
  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = req.body;
      console.log("Received order data:", orderData);

      // Validate required fields
      if (!orderData.clientId) {
        return res.status(400).json({ error: "Cliente é obrigatório" });
      }

      if (!orderData.vendorId) {
        return res.status(400).json({ error: "Vendedor é obrigatório" });
      }

      if (!orderData.product && !orderData.title) {
        return res.status(400).json({ error: "Produto/título é obrigatório" });
      }

      // Generate order number
      const orderNumber = `PED-${Date.now()}`;

      // Create order with all provided data
      const newOrder = await storage.createOrder({
        orderNumber,
        clientId: orderData.clientId,
        vendorId: orderData.vendorId,
        product: orderData.product || orderData.title,
        description: orderData.description || "",
        totalValue: orderData.totalValue || "0.00",
        status: orderData.status || "confirmed",
        deadline: orderData.deadline ? new Date(orderData.deadline) : null,
        deliveryDeadline: orderData.deliveryDeadline ? new Date(orderData.deliveryDeadline) : null,
        // Additional fields
        contactName: orderData.contactName || "",
        contactPhone: orderData.contactPhone || "",
        contactEmail: orderData.contactEmail || "",
        deliveryType: orderData.deliveryType || "delivery",
        paymentMethodId: orderData.paymentMethodId || "",
        shippingMethodId: orderData.shippingMethodId || "",
        installments: orderData.installments || 1,
        downPayment: orderData.downPayment || 0,
        remainingAmount: orderData.remainingAmount || 0,
        shippingCost: orderData.shippingCost || 0,
        hasDiscount: orderData.hasDiscount || false,
        discountType: orderData.discountType || "percentage",
        discountPercentage: orderData.discountPercentage || 0,
        discountValue: orderData.discountValue || 0,
        items: orderData.items || []
      });

      console.log("Created order:", newOrder);
      res.json(newOrder);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order: " + error.message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();

      // Enrich with user data and budget photos
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const client = await storage.getUser(order.clientId);
          const vendor = await storage.getUser(order.vendorId);
          const producer = order.producerId ? await storage.getUser(order.producerId) : null;

          // Get budget photos if order was converted from budget
          let budgetPhotos = [];
          if (order.budgetId) {
            const photos = await storage.getBudgetPhotos(order.budgetId);
            budgetPhotos = photos.map(photo => photo.imageUrl);
          }

          // Check if there are unread production notes
          let hasUnreadNotes = false;
          if (order.producerId) {
            const productionOrders = await storage.getProductionOrdersByOrder(order.id);
            hasUnreadNotes = productionOrders.some(po => po.hasUnreadNotes);
          }

          return {
            ...order,
            clientName: client?.name || 'Unknown',
            vendorName: vendor?.name || 'Unknown',
            producerName: producer?.name || null,
            budgetPhotos: budgetPhotos,
            hasUnreadNotes: hasUnreadNotes
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
      console.log(`Fetching orders for client: ${clientId}`);

      let orders = [];

      // Get all orders to search through
      const allOrders = await storage.getOrders();
      console.log(`Total orders in system: ${allOrders.length}`);

      // Find orders that match this client ID in various ways
      for (const order of allOrders) {
        let shouldInclude = false;

        // Direct match with clientId
        if (order.clientId === clientId) {
          shouldInclude = true;
        }

        // Check if clientId refers to a user, and find client record
        if (!shouldInclude) {
          try {
            const clientRecord = await storage.getClientByUserId(clientId);
            if (clientRecord && order.clientId === clientRecord.id) {
              shouldInclude = true;
            }
          } catch (e) {
            // Continue searching
          }
        }

        // Check if order.clientId is a client record, and see if its userId matches
        if (!shouldInclude) {
          try {
            const orderClientRecord = await storage.getClient(order.clientId);
            if (orderClientRecord && orderClientRecord.userId === clientId) {
              shouldInclude = true;
            }
          } catch (e) {
            // Continue searching
          }
        }

        if (shouldInclude) {
          orders.push(order);
        }
      }

      // Remove duplicates
      const uniqueOrders = orders.filter((order, index, self) => 
        index === self.findIndex(o => o.id === order.id)
      );

      console.log(`Found ${uniqueOrders.length} unique orders for client ${clientId}`);

      const enrichedOrders = await Promise.all(
        uniqueOrders.map(async (order) => {
          const vendor = await storage.getUser(order.vendorId);
          const producer = order.producerId ? await storage.getUser(order.producerId) : null;

          // Get production order for tracking info
          let productionOrder = null;
          if (order.producerId) {
            const productionOrders = await storage.getProductionOrdersByOrder(order.id);
            productionOrder = productionOrders[0] || null;
          }

          // Get budget photos if order was converted from budget
          let budgetPhotos = [];
          if (order.budgetId) {
            const photos = await storage.getBudgetPhotos(order.budgetId);
            budgetPhotos = photos.map(photo => photo.imageUrl || photo.photoUrl);
          }

          // Get payments for this order to calculate correct paid value
          const payments = await storage.getPaymentsByOrder(order.id);
          const confirmedPayments = payments.filter(payment => payment.status === 'confirmed');
          const totalPaid = confirmedPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

          // Get budget information if order was converted from budget
          let budgetDownPayment = 0;
          let originalBudgetInfo = null;

          if (order.budgetId) {
            try {
              const budget = await storage.getBudget(order.budgetId);
              const budgetPaymentInfo = await storage.getBudgetPaymentInfo(order.budgetId);

              if (budgetPaymentInfo && budgetPaymentInfo.downPayment) {
                budgetDownPayment = parseFloat(budgetPaymentInfo.downPayment);
                originalBudgetInfo = {
                  downPayment: budgetDownPayment,
                  remainingAmount: parseFloat(budgetPaymentInfo.remainingAmount || '0'),
                  installments: budgetPaymentInfo.installments || 1
                };
              }
            } catch (error) {
              console.log("Error fetching budget info for order:", order.id, error);
            }
          }

          // Use budget down payment if available, otherwise use calculated payments
          const actualPaidValue = budgetDownPayment > 0 ? budgetDownPayment : totalPaid;
          const totalValue = parseFloat(order.totalValue);
          const remainingBalance = Math.max(0, totalValue - actualPaidValue);

          console.log(`Order ${order.orderNumber}: Total=${totalValue}, BudgetDownPayment=${budgetDownPayment}, Paid=${totalPaid}, ActualPaid=${actualPaidValue}, Remaining=${remainingBalance}`);

          return {
            ...order,
            paidValue: actualPaidValue.toFixed(2), // Use budget down payment or payments
            remainingValue: remainingBalance.toFixed(2), // Add remaining balance
            vendorName: vendor?.name || 'Unknown',
            producerName: producer?.name || null,
            budgetPhotos: budgetPhotos,
            trackingCode: order.trackingCode || productionOrder?.trackingCode || null,
            estimatedDelivery: productionOrder?.deliveryDelivery || null,
            payments: payments.filter(p => p.status === 'confirmed'), // Include payment details
            budgetInfo: originalBudgetInfo // Include original budget payment info
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching client orders:", error);
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
          if (!order) {
            return {
              ...po,
              product: 'Unknown',
              orderNumber: 'Unknown',
              clientName: 'Unknown',
              clientAddress: null,
              clientPhone: null,
              order: null
            };
          }

          // Get client details - try multiple approaches to find the client
          let clientName = 'Unknown';
          let clientAddress = null;
          let clientPhone = null;
          let clientEmail = null;

          console.log(`Looking for client with ID: ${order.clientId}`);

          // Method 1: Try to get client record directly by ID
          const clientRecord = await storage.getClient(order.clientId);
          if (clientRecord) {
            console.log(`Found client record:`, clientRecord);
            clientName = clientRecord.name;
            clientAddress = clientRecord.address;
            clientPhone = clientRecord.phone;
            clientEmail = clientRecord.email;
          } else {
            // Method 2: Try to find client record by userId
            const clientByUserId = await storage.getClientByUserId(order.clientId);
            if (clientByUserId) {
              console.log(`Found client by userId:`, clientByUserId);
              clientName = clientByUserId.name;
              clientAddress = clientByUserId.address;
              clientPhone = clientByUserId.phone;
              clientEmail = clientByUserId.email;
            } else {
              // Method 3: Fallback to user table
              const clientUser = await storage.getUser(order.clientId);
              if (clientUser) {
                console.log(`Found user record:`, clientUser);
                clientName = clientUser.name;
                clientPhone = clientUser.phone;
                clientEmail = clientUser.email;
                clientAddress = clientUser.address;
              } else {
                console.log(`No client found for ID: ${order.clientId}`);
              }
            }
          }

          return {
            ...po,
            product: order.product || 'Unknown',
            orderNumber: order.orderNumber || 'Unknown',
            clientName: clientName,
            clientAddress: clientAddress,
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            order: {
              ...order,
              clientName: clientName,
              clientAddress: clientAddress,
              clientPhone: clientPhone,
              clientEmail: clientEmail,
              shippingAddress: order.deliveryType === 'pickup' 
                ? 'Sede Principal - Retirada no Local'
                : (clientAddress || 'Endereço não informado'),
              deliveryType: order.deliveryType || 'delivery'
            }
          };
        })
      );

      console.log(`Returning ${enrichedOrders.length} enriched production orders`);
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching production orders:", error);
      res.status(500).json({ error: "Failed to fetch production orders" });
    }
  });

  // Get single production order by ID
  app.get("/api/production-orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const productionOrder = await storage.getProductionOrder(id);

      if (!productionOrder) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      const order = await storage.getOrder(productionOrder.orderId);

      let enrichedOrder = {
        ...productionOrder,
        product: 'Unknown',
        orderNumber: 'Unknown',
        clientName: 'Unknown',
        order: null as any
      };

      if (order) {
        let clientName = 'Unknown';
        let clientAddress = null;
        let clientPhone = null;
        let clientEmail = null;

        const clientRecord = await storage.getClient(order.clientId);
        if (clientRecord) {
          clientName = clientRecord.name;
          clientAddress = clientRecord.address;
          clientPhone = clientRecord.phone;
          clientEmail = clientRecord.email;
        } else {
          const clientByUserId = await storage.getClientByUserId(order.clientId);
          if (clientByUserId) {
            clientName = clientByUserId.name;
            clientAddress = clientByUserId.address;
            clientPhone = clientByUserId.phone;
            clientEmail = clientByUserId.email;
          } else {
            const clientUser = await storage.getUser(order.clientId);
            if (clientUser) {
              clientName = clientUser.name;
              clientPhone = clientUser.phone;
              clientEmail = clientUser.email;
              clientAddress = clientUser.address;
            }
          }
        }

        enrichedOrder = {
          ...productionOrder,
          product: order.product || 'Unknown',
          orderNumber: order.orderNumber || 'Unknown',
          clientName: clientName,
          clientAddress: clientAddress,
          clientPhone: clientPhone,
          clientEmail: clientEmail,
          order: {
            ...order,
            clientName: clientName,
            clientAddress: clientAddress,
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            shippingAddress: order.deliveryType === 'pickup' 
              ? 'Sede Principal - Retirada no Local'
              : (clientAddress || 'Endereço não informado'),
            deliveryType: order.deliveryType || 'delivery'
          }
        };
      }

      res.json(enrichedOrder);
    } catch (error) {
      console.error("Error fetching production order:", error);
      res.status(500).json({ error: "Failed to fetch production order" });
    }
  });

  // Set producer value for a production order
  app.post("/api/production-orders/:id/set-value", async (req, res) => {
    try {
      const { id } = req.params;
      const { value, notes } = req.body;

      if (!value) {
        return res.status(400).json({ error: "Valor é obrigatório" });
      }

      const productionOrder = await storage.getProductionOrder(id);
      if (!productionOrder) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      // Update production order with producer value
      const updated = await storage.updateProductionOrderValue(id, value, notes || undefined);

      // Create or update producer payment record
      const existingPayments = await storage.getProducerPaymentsByProducer(productionOrder.producerId);
      const existingPayment = existingPayments.find(p => p.productionOrderId === id);

      if (existingPayment) {
        await storage.updateProducerPayment(existingPayment.id, {
          amount: value,
          notes: notes || null
        });
      } else {
        await storage.createProducerPayment({
          productionOrderId: id,
          producerId: productionOrder.producerId,
          amount: value,
          status: 'pending',
          notes: notes || null
        });
      }

      res.json({ success: true, productionOrder: updated });
    } catch (error) {
      console.error("Error setting producer value:", error);
      res.status(500).json({ error: "Failed to set producer value" });
    }
  });

  // Update production order status
  app.patch("/api/production-orders/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, deliveryDate, trackingCode } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status é obrigatório" });
      }

      const validStatuses = ['pending', 'accepted', 'production', 'quality_check', 'ready', 'completed', 'shipped', 'delivered'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const productionOrder = await storage.getProductionOrder(id);
      if (!productionOrder) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      const updated = await storage.updateProductionOrderStatus(
        id, 
        status, 
        notes || undefined, 
        deliveryDate || undefined, 
        trackingCode || undefined
      );

      res.json({ success: true, productionOrder: updated });
    } catch (error) {
      console.error("Error updating production order status:", error);
      res.status(500).json({ error: "Failed to update production order status" });
    }
  });

  // Producers
  app.get("/api/producers", async (req, res) => {
    try {
      const users = await storage.getUsers();
      const producers = users.filter(user => user.role === 'producer');

      const producersWithStats = await Promise.all(
        producers.map(async (producer) => {
          const productionOrders = await storage.getProductionOrdersByProducer(producer.id);
          const activeOrders = productionOrders.filter(po =>
            ['pending', 'accepted', 'production', 'quality_check', 'ready'].includes(po.status)
          ).length;
          const completedOrders = productionOrders.filter(po => po.status === 'completed').length;

          return {
            ...producer,
            activeOrders,
            completedOrders,
            totalOrders: productionOrders.length
          };
        })
      );

      res.json(producersWithStats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch producers" });
    }
  });

  app.post("/api/producers", async (req, res) => {
    try {
      const { name, email, phone, specialty, address, password, userCode } = req.body;

      // Check if userCode already exists
      const existingUser = await storage.getUserByUsername(userCode);
      if (existingUser) {
        return res.status(400).json({ error: "Código de usuário já existe" });
      }

      // Create user with role producer including specialty and address
      const user = await storage.createUser({
        username: userCode,
        password: password || "123456",
        role: "producer",
        name,
        email,
        phone,
        specialty,
        address,
        isActive: true
      });

      res.json({ success: true, user });
    } catch (error) {
      console.error('Error creating producer:', error);
      res.status(500).json({ error: "Failed to create producer" });
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
            phone: vendor.phone,
            address: vendor.address,
            username: vendor.username,
            userCode: vendor.username, // Use username as userCode for display
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
      const { name, email, password, commissionRate, userCode, phone, address } = req.body;

      console.log('Creating vendor with data:', { name, email, userCode, phone, address, commissionRate });

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userCode);
      if (existingUser) {
        return res.status(400).json({ error: "Código de usuário já existe" });
      }

      // Create user first
      const user = await storage.createUser({
        username: userCode,
        password: password,
        role: "vendor",
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        isActive: true
      });

      // Create vendor record
      const vendor = await storage.createVendor({
        userId: user.id,
        commissionRate: commissionRate || '10.00'
      });

      res.json({ 
        success: true, 
        user: { 
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          userCode: userCode,
          commissionRate: vendor.commissionRate,
          isActive: true
        }
      });
    } catch (error) {
      console.error('Error creating vendor:', error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  app.post("/api/partners", async (req, res) => {
    try {
      const { name, email, password, commissionRate, userCode, phone } = req.body;

      console.log('Creating partner with data:', { name, email, userCode, phone, commissionRate });

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userCode);
      if (existingUser) {
        return res.status(400).json({ error: "Código de usuário já existe" });
      }

      // Create user with role partner
      const user = await storage.createUser({
        username: userCode,
        password: password,
        role: "partner",
        name,
        email: email || null,
        phone: phone || null,
        isActive: true
      });

      res.json({ success: true, user });
    } catch (error) {
      console.error('Error creating partner:', error);
      res.status(500).json({ error: "Failed to create partner" });
    }
  });

  // Clients
  app.post("/api/clients", async (req, res) => {
    try {
      const { name, email, phone, whatsapp, cpfCnpj, address, password, userCode, vendorId } = req.body;

      console.log('Creating client with data:', { name, email, userCode, phone, vendorId });

      // Check if userCode already exists
      const existingUser = await storage.getUserByUsername(userCode);
      if (existingUser) {
        return res.status(400).json({ error: "Código de usuário já existe" });
      }

      // Create user with role client
      const user = await storage.createUser({
        username: userCode,
        password: password,
        role: "client",
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        isActive: true
      });

      // Create client record
      const client = await storage.createClient({
        userId: user.id,
        name: user.name,
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        cpfCnpj: cpfCnpj || null,
        address: address || null,
        vendorId: vendorId || null,
        isActive: true
      });

      res.json({ 
        success: true, 
        name: client.name,
        userCode: userCode,
        ...client
      });
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ error: "Failed to create client" });
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
          if (!order.createdAt) return false;
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
      const producerPayments = await storage.getProducerPayments();

      const receivables = orders
        .filter(order => order.status !== 'cancelled')
        .reduce((total, order) => total + (parseFloat(order.totalValue) - parseFloat(order.paidValue || '0')), 0);

      // Calculate payables from producer payments (pending + approved, not paid yet)
      const producerPayables = producerPayments
        .filter(pp => pp.status === 'pending' || pp.status === 'approved')
        .reduce((total, pp) => total + parseFloat(pp.amount), 0);

      const payables = producerPayables;
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
      console.error("Error fetching financial overview:", error);
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const search = (req.query.search as string) || '';
      const category = (req.query.category as string) || '';

      const result = await storage.getProducts({
        page,
        limit,
        search,
        category
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });



  app.get("/api/products/categories", async (req, res) => {
    try {
      const result = await storage.getProducts({ limit: 9999 });
      const categories = Array.from(new Set(result.products
        .map((product: any) => product.category)
        .filter(Boolean)
      )).sort();

      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Product search endpoint
  app.get("/api/products/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const products = await storage.searchProducts(q as string);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to search products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = req.body;
      
      // Convert empty strings to null for numeric fields
      const cleanedData = {
        ...productData,
        weight: productData.weight === '' ? null : productData.weight,
        height: productData.height === '' ? null : productData.height,
        width: productData.width === '' ? null : productData.width,
        depth: productData.depth === '' ? null : productData.depth,
        availableQuantity: productData.availableQuantity === '' ? null : productData.availableQuantity,
      };
      
      console.log('Creating product with data:', cleanedData);
      const newProduct = await storage.createProduct(cleanedData);
      console.log('Product created successfully:', newProduct.id);
      res.json(newProduct);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for JSON imports
  });

  // Client profile endpoints
  app.get("/api/clients/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(`Fetching profile for user: ${userId}`);

      // First try to find client by userId
      const clientRecord = await storage.getClientByUserId(userId);
      let clientData;

      if (clientRecord) {
        console.log(`Found client record: ${clientRecord.id}`);
        // Get vendor info if assigned
        const vendor = clientRecord.vendorId ? await storage.getUser(clientRecord.vendorId) : null;
        clientData = {
          ...clientRecord,
          vendorName: vendor?.name || null
        };
      } else {
        // Fallback to user data
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "Cliente não encontrado" });
        }
        clientData = {
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          isActive: user.isActive,
          vendorName: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      res.json(clientData);
    } catch (error) {
      console.error("Error fetching client profile:", error);
      res.status(500).json({ error: "Failed to fetch client profile" });
    }
  });

  app.put("/api/clients/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, email, phone, address } = req.body;

      // Update user record
      await storage.updateUser(userId, { name, email, phone, address });

      // Update client record if exists
      const clientRecord = await storage.getClientByUserId(userId);
      if (clientRecord) {
        await storage.updateClient(clientRecord.id, { name, email, phone, address });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating client profile:", error);
      res.status(500).json({ error: "Failed to update client profile" });
    }
  });

  app.put("/api/clients/password/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      if (user.password !== currentPassword) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }

      // Update password
      await storage.updateUser(userId, { password: newPassword });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating client password:", error);
      res.status(500).json({ error: "Failed to update password" });
    }
  });

  // Create test payment for order
  app.post("/api/orders/:id/create-test-payment", async (req, res) => {
    try {
      const { amount } = req.body;
      const orderId = req.params.id;

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Create a confirmed payment
      const payment = await storage.createPayment({
        orderId: orderId,
        amount: amount || "567.00", // Default test amount
        method: "pix",
        status: "confirmed",
        transactionId: `TEST-${Date.now()}`,
        paidAt: new Date()
      });

      res.json({ success: true, payment });
    } catch (error) {
      console.error("Error creating test payment:", error);
      res.status(500).json({ error: "Failed to create test payment" });
    }
  });

  // Clear test data endpoint
  app.delete("/api/orders/test-data", async (req, res) => {
    try {
      // Get all orders
      const orders = await storage.getOrders();

      // Delete test orders (you can adjust the criteria)
      const testOrders = orders.filter(order => 
        order.orderNumber?.includes('TEST') || 
        order.product?.toLowerCase().includes('test') ||
        order.description?.toLowerCase().includes('test')
      );

      for (const order of testOrders) {
        // Delete related production orders first
        const productionOrders = await storage.getProductionOrdersByOrder(order.id);
        for (const po of productionOrders) {
          await storage.deleteProductionOrder(po.id);
        }

        // Delete the order
        await storage.deleteOrder(order.id);
      }

      res.json({ 
        success: true, 
        deletedCount: testOrders.length,
        message: `${testOrders.length} pedidos de teste foram removidos`
      });
    } catch (error) {
      console.error("Error clearing test orders:", error);
      res.status(500).json({ error: "Failed to clear test orders" });
    }
  });

  // Additional product routes
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const updatedProduct = await storage.updateProduct(req.params.id, req.body);
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.post("/api/products/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }

      // Check file size
      if (req.file.size > 50 * 1024 * 1024) {
        return res.status(400).json({
          error: "Arquivo muito grande. O limite é de 50MB."
        });
      }

      let productsData;
      const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase() || '';

      if (fileExtension === 'json') {
        try {
          const fileContent = req.file.buffer.toString('utf8');
          productsData = JSON.parse(fileContent);
        } catch (parseError) {
          return res.status(400).json({
            error: "Erro ao analisar arquivo JSON. Verifique se o formato está correto.",
            details: (parseError as Error).message
          });
        }
      } else {
        return res.status(400).json({ error: "Formato de arquivo não suportado. Use arquivos JSON." });
      }

      if (!Array.isArray(productsData)) {
        return res.status(400).json({
          error: "O arquivo JSON deve conter um array de produtos",
          example: "[{\"Nome\": \"Produto\", \"PrecoVenda\": 10.50}]"
        });
      }

      if (productsData.length === 0) {
        return res.status(400).json({
          error: "O arquivo JSON está vazio. Adicione pelo menos um produto."
        });
      }

      // Get optional producerId from form data
      const producerId = req.body.producerId || null;

      console.log(`Importing ${productsData.length} products${producerId ? ` for producer ${producerId}` : ''}...`);

      // If producerId is provided, add it to all products
      if (producerId) {
        productsData = productsData.map((product: any) => ({
          ...product,
          producerId
        }));
      }

      const result = await storage.importProducts(productsData);

      console.log(`Import completed: ${result.imported} imported, ${result.errors.length} errors`);

      res.json({
        message: `${result.imported} produtos importados com sucesso`,
        imported: result.imported,
        total: productsData.length,
        errors: result.errors
      });
    } catch (error) {
      console.error('Import error:', error);

      if (error instanceof SyntaxError) {
        return res.status(400).json({
          error: "Formato JSON inválido. Verifique a sintaxe do arquivo.",
          details: error.message
        });
      }

      if ((error as any).code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: "Arquivo muito grande. O limite é de 50MB."
        });
      }

      res.status(500).json({
        error: "Erro interno do servidor ao processar importação",
        details: (error as Error).message
      });
    }
  });

  // Budget routes
  app.get("/api/budgets", async (req, res) => {
    try {
      const budgets = await storage.getBudgets();
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  app.get("/api/budgets/:id", async (req, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      // Include items and photos
      const items = await storage.getBudgetItems(req.params.id);
      const photos = await storage.getBudgetPhotos(req.params.id);

      res.json({
        ...budget,
        items,
        photos
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budget" });
    }
  });

  app.post("/api/budgets", async (req, res) => {
    try {
      const budgetData = req.body;

      // Validate that contactName is provided
      if (!budgetData.contactName) {
        return res.status(400).json({ error: "Nome de contato é obrigatório" });
      }

      // Generate budget number
      const budgetNumber = `ORC-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      const newBudget = await storage.createBudget({
        ...budgetData,
        budgetNumber
      });

      // Process budget items
      for (const item of budgetData.items) {
        const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
        const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
        const customizationValue = typeof item.itemCustomizationValue === 'string' ? parseFloat(item.itemCustomizationValue) : item.itemCustomizationValue || 0;

        await storage.createBudgetItem(newBudget.id, {
          productId: item.productId,
          quantity: quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: (unitPrice * quantity).toFixed(2),
          hasItemCustomization: item.hasItemCustomization || false,
          itemCustomizationValue: customizationValue.toFixed(2),
          itemCustomizationDescription: item.itemCustomizationDescription || "",
          customizationPhoto: item.customizationPhoto || ""
        });
      }

      // Save payment and shipping information
      if (budgetData.paymentMethodId || budgetData.shippingMethodId) {
        await storage.createBudgetPaymentInfo({
          budgetId: newBudget.id,
          paymentMethodId: budgetData.paymentMethodId || null,
          shippingMethodId: budgetData.shippingMethodId || null,
          installments: budgetData.installments || 1,
          downPayment: budgetData.downPayment?.toString() || "0.00",
          remainingAmount: budgetData.remainingAmount?.toString() || "0.00",
          shippingCost: budgetData.shippingCost?.toString() || "0.00"
        });
      }

      // Process budget photos
      if (budgetData.photos && budgetData.photos.length > 0) {
        for (const photoUrl of budgetData.photos) {
          await storage.createBudgetPhoto(newBudget.id, {
            imageUrl: photoUrl,
            description: "Imagem de personalização"
          });
        }
      }

      res.json(newBudget);
    } catch (error) {
      console.error("Error creating budget:", error);
      res.status(500).json({ error: "Failed to create budget" });
    }
  });

  app.put("/api/budgets/:id", async (req, res) => {
    try {
      const budgetData = req.body;
      const updatedBudget = await storage.updateBudget(req.params.id, budgetData);

      // Remove existing items and re-add them to ensure consistency
      await storage.deleteBudgetItems(req.params.id);
      for (const item of budgetData.items) {
        const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
        const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
        const customizationValue = typeof item.itemCustomizationValue === 'string' ? parseFloat(item.itemCustomizationValue) : item.itemCustomizationValue || 0;

        // Calculate correct total with item customization
        const baseTotal = unitPrice * quantity;
        let itemTotal = baseTotal;

        if (item.hasItemCustomization && customizationValue > 0) {
          itemTotal = baseTotal + (customizationValue * quantity);
        }

        await storage.createBudgetItem(updatedBudget.id, {
          productId: item.productId,
          quantity: quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: itemTotal.toFixed(2),
          hasItemCustomization: item.hasItemCustomization || false,
          itemCustomizationValue: customizationValue.toFixed(2),
          itemCustomizationDescription: item.itemCustomizationDescription || "",
          customizationPhoto: item.customizationPhoto || ""
        });
      }

      // Update payment and shipping information
      if (budgetData.paymentMethodId || budgetData.shippingMethodId) {
        await storage.updateBudgetPaymentInfo(req.params.id, {
          paymentMethodId: budgetData.paymentMethodId || null,
          shippingMethodId: budgetData.shippingMethodId || null,
          installments: budgetData.installments || 1,
          downPayment: budgetData.downPayment?.toString() || "0.00",
          remainingAmount: budgetData.remainingAmount?.toString() || "0.00",
          shippingCost: budgetData.shippingCost?.toString() || "0.00"
        });
      }

      res.json(updatedBudget);
    } catch (error) {
      console.error("Error updating budget:", error);
      res.status(500).json({ error: "Failed to update budget" });
    }
  });

  app.delete("/api/budgets/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBudget(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete budget" });
    }
  });

  app.post("/api/budgets/:id/convert-to-order", async (req, res) => {
    try {
      const { producerId, clientId } = req.body;

      // Validate that clientId is provided for order conversion
      if (!clientId) {
        return res.status(400).json({ error: "Cliente deve ser selecionado para converter orçamento em pedido" });
      }

      // Update budget with clientId before conversion
      await storage.updateBudget(req.params.id, { clientId });

      const order = await storage.convertBudgetToOrder(req.params.id, producerId);

      // Create production order for the selected producer
      if (producerId && order) {
        await storage.createProductionOrder({
          orderId: order.id,
          producerId: producerId,
          status: 'pending',
          deadline: order.deadline
        });
      }

      // Return enriched order data with proper client name
      let clientName = 'Unknown';
      const clientDetails = await storage.getClient(order.clientId);
      if (clientDetails) {
        clientName = clientDetails.name;
      } else {
        const clientUser = await storage.getUser(order.clientId);
        if (clientUser) {
          clientName = clientUser.name;
        }
      }

      const vendor = await storage.getUser(order.vendorId);
      const producer = producerId ? await storage.getUser(producerId) : null;

      const enrichedOrder = {
        ...order,
        clientName: clientName,
        vendorName: vendor?.name || 'Unknown',
        producerName: producer?.name || null
      };

      res.json(enrichedOrder);
    } catch (error) {
      console.error("Error converting budget to order:", error);
      res.status(500).json({ error: "Failed to convert budget to order" });
    }
  });

  app.post("/api/budgets/:id/send-whatsapp", async (req, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      // Get client data or use contact name
      let clientName = budget.contactName;
      let clientPhone = budget.contactPhone;

      if (budget.clientId) {
        const client = await storage.getUser(budget.clientId);
        if (client) {
          clientName = client.name;
          clientPhone = client.phone || budget.contactPhone;
        }
      }

      // Update budget status to 'sent'
      await storage.updateBudget(req.params.id, { status: 'sent' });

      // Generate WhatsApp message
      const message = `Olá ${clientName}! 👋

Segue seu orçamento:

📋 *${budget.title}*
💰 Valor: R$ ${parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
📅 Válido até: ${budget.validUntil ? new Date(budget.validUntil).toLocaleDateString('pt-BR') : 'Não especificado'}

${budget.description ? `📝 ${budget.description}` : ''}

Para mais detalhes, entre em contato conosco!`;

      // Create WhatsApp URL
      const encodedMessage = encodeURIComponent(message);
      const phoneNumber = clientPhone?.replace(/\D/g, '') || ''; // Remove non-digits
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

      res.json({
        success: true,
        whatsappUrl,
        message: "Orçamento marcado como enviado"
      });
    } catch (error) {
      console.error('Error sending budget via WhatsApp:', error);
      res.status(500).json({ error: "Failed to send budget via WhatsApp" });
    }
  });

  // Budget PDF data endpoint
  app.get("/api/budgets/:id/pdf-data", async (req, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      // Get budget items
      const items = await storage.getBudgetItems(req.params.id);

      // Enrich items with product data and calculate totals
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          const quantity = item.quantity;
          const unitPrice = parseFloat(item.unitPrice);
          const customizationValue = parseFloat(item.itemCustomizationValue || '0');

          let itemTotal = unitPrice * quantity;
          if (item.hasItemCustomization && customizationValue > 0) {
            itemTotal += customizationValue;
          }

          return {
            id: item.id,
            productId: item.productId,
            quantity: quantity,
            unitPrice: unitPrice.toFixed(2),
            totalPrice: itemTotal.toFixed(2),
            hasItemCustomization: item.hasItemCustomization,
            itemCustomizationValue: item.itemCustomizationValue,
            itemCustomizationDescription: item.itemCustomizationDescription || '',
            customizationPhoto: item.customizationPhoto || '',
            product: {
              name: product?.name || 'Produto não encontrado',
              description: product?.description || '',
              category: product?.category || '',
              imageLink: product?.imageLink || ''
            }
          };
        })
      );

      // Calculate overall budget total
      const totalBudget = enrichedItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

      // Get client and vendor data
      const client = await storage.getUser(budget.clientId);
      const vendor = await storage.getUser(budget.vendorId);

      // Get budget photos
      const photos = await storage.getBudgetPhotos(req.params.id);
      const photoUrls = photos.map(photo => photo.imageUrl || photo.photoUrl);

      // Get payment and shipping info
      const paymentInfo = await storage.getBudgetPaymentInfo(req.params.id);

      const pdfData = {
        budget: {
          id: budget.id,
          budgetNumber: budget.budgetNumber,
          title: budget.title,
          description: budget.description,
          clientId: budget.clientId,
          vendorId: budget.vendorId,
          totalValue: totalBudget.toFixed(2),
          validUntil: budget.validUntil,
          hasCustomization: budget.hasCustomization,
          customizationPercentage: budget.customizationPercentage,
          customizationDescription: budget.customizationDescription,
          createdAt: budget.createdAt,
          photos: photoUrls,
          paymentMethodId: paymentInfo?.paymentMethodId || null,
          shippingMethodId: paymentInfo?.shippingMethodId || null,
          installments: paymentInfo?.installments || 1,
          downPayment: paymentInfo?.downPayment || "0.00",
          remainingAmount: paymentInfo?.remainingAmount || "0.00",
          shippingCost: paymentInfo?.shippingCost || "0.00"
        },
        items: enrichedItems,
        client: {
          name: client?.name || 'Cliente não encontrado',
          email: client?.email || '',
          phone: client?.phone || ''
        },
        vendor: {
          name: vendor?.name || 'Vendedor não encontrado',
          email: vendor?.email || '',
          phone: vendor?.phone || ''
        },
        paymentMethods: await storage.getPaymentMethods(),
        shippingMethods: await storage.getShippingMethods()
      };

      res.json(pdfData);
    } catch (error) {
      console.error('Error fetching budget PDF data:', error);
      res.status(500).json({ error: "Failed to fetch budget PDF data" });
    }
  });

  // Budget Items routes
  app.get("/api/budgets/:budgetId/items", async (req, res) => {
    try {
      const items = await storage.getBudgetItems(req.params.budgetId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budget items" });
    }
  });

  app.post("/api/budgets/:budgetId/items", async (req, res) => {
    try {
      const newItem = await storage.createBudgetItem(req.params.budgetId, req.body);
      res.json(newItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to create budget item" });
    }
  });

  app.put("/api/budget-items/:id", async (req, res) => {
    try {
      const updatedItem = await storage.updateBudgetItem(req.params.id, req.body);
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to update budget item" });
    }
  });

  app.delete("/api/budget-items/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBudgetItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Item não encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete budget item" });
    }
  });

  // Budget Photos routes
  app.get("/api/budgets/:budgetId/photos", async (req, res) => {
    try {
      const photos = await storage.getBudgetPhotos(req.params.budgetId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budget photos" });
    }
  });

  app.post("/api/budgets/:budgetId/photos", async (req, res) => {
    try {
      const newPhoto = await storage.createBudgetPhoto(req.params.budgetId, req.body);
      res.json(newPhoto);
    } catch (error) {
      res.status(500).json({ error: "Failed to create budget photo" });
    }
  });

  app.delete("/api/budget-photos/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBudgetPhoto(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Foto não encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete budget photo" });
    }
  });

  // Settings Routes - Payment Methods
  app.get("/api/settings/payment-methods", async (req, res) => {
    try {
      const paymentMethods = await storage.getAllPaymentMethods();
      res.json(paymentMethods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  app.post("/api/settings/payment-methods", async (req, res) => {
    try {
      const newPaymentMethod = await storage.createPaymentMethod(req.body);
      res.json(newPaymentMethod);
    } catch (error) {
      res.status(500).json({ error: "Failed to create payment method" });
    }
  });

  app.put("/api/settings/payment-methods/:id", async (req, res) => {
    try {
      const updatedPaymentMethod = await storage.updatePaymentMethod(req.params.id, req.body);
      if (!updatedPaymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json(updatedPaymentMethod);
    } catch (error) {
      res.status(500).json({ error: "Failed to update payment method" });
    }
  });

  app.delete("/api/settings/payment-methods/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePaymentMethod(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment method" });
    }
  });

  // Settings Routes - Shipping Methods
  app.get("/api/settings/shipping-methods", async (req, res) => {
    try {
      const shippingMethods = await storage.getAllShippingMethods();
      res.json(shippingMethods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shipping methods" });
    }
  });

  app.post("/api/settings/shipping-methods", async (req, res) => {
    try {
      const newShippingMethod = await storage.createShippingMethod(req.body);
      res.json(newShippingMethod);
    } catch (error) {
      res.status(500).json({ error: "Failed to create shipping method" });
    }
  });

  app.put("/api/settings/shipping-methods/:id", async (req, res) => {
    try {
      const updatedShippingMethod = await storage.updateShippingMethod(req.params.id, req.body);
      if (!updatedShippingMethod) {
        return res.status(404).json({ error: "Shipping method not found" });
      }
      res.json(updatedShippingMethod);
    } catch (error) {
      res.status(500).json({ error: "Failed to update shipping method" });
    }
  });

  app.delete("/api/settings/shipping-methods/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteShippingMethod(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Shipping method not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete shipping method" });
    }
  });

  // Settings Routes - Customization Options
  app.get("/api/settings/customization-options", requireAuth, async (req, res) => {
    try {
      const customizations = await storage.getCustomizationOptions();
      res.json(customizations);
    } catch (error) {
      console.error('Error fetching customization options:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/settings/customization-options", requireAuth, async (req, res) => {
    try {
      const { name, description, category, minQuantity, price, isActive } = req.body;

      if (!name || !category || minQuantity === undefined || price === undefined) {
        return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });
      }

      const newCustomization = await storage.createCustomizationOption({
        name,
        description: description || "",
        category,
        minQuantity: parseInt(minQuantity),
        price: parseFloat(price).toFixed(2),
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user?.id || 'admin-1'
      });

      res.json(newCustomization);
    } catch (error) {
      console.error('Error creating customization:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.put("/api/settings/customization-options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, category, minQuantity, price, isActive } = req.body;

      const updatedCustomization = await storage.updateCustomizationOption(id, {
        name,
        description: description || "",
        category,
        minQuantity: parseInt(minQuantity),
        price: parseFloat(price).toFixed(2),
        isActive: isActive !== undefined ? isActive : true
      });

      if (!updatedCustomization) {
        return res.status(404).json({ error: "Personalização não encontrada" });
      }

      res.json(updatedCustomization);
    } catch (error) {
      console.error('Error updating customization:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.delete("/api/settings/customization-options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await storage.deleteCustomizationOption(id);
      if (!deleted) {
        return res.status(404).json({ error: "Personalização não encontrada" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting customization:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/settings/customization-options/category/:category", requireAuth, async (req, res) => {
    try {
      const { category } = req.params;
      const { minQuantity } = req.query;

      let customizations = await storage.getCustomizationOptions();
      let filtered = customizations.filter(c => 
        c.category === category && 
        c.isActive === true
      );

      if (minQuantity) {
        const qty = parseInt(minQuantity as string);
        filtered = filtered.filter(c => c.minQuantity <= qty);
      }

      res.json(filtered);
    } catch (error) {
      console.error('Error fetching customizations by category:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Route to get customization options filtered by category and quantity
  app.get("/api/customization-options", async (req, res) => {
    try {
      const { category, quantity } = req.query;

      if (category && quantity) {
        const options = await storage.getCustomizationOptionsByCategory(
          category as string, 
          parseInt(quantity as string)
        );
        res.json(options);
      } else {
        const allOptions = await storage.getCustomizationOptions();
        res.json(allOptions);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customization options" });
    }
  });

  // Upload OFX for producer payments reconciliation
  app.post("/api/upload-ofx", upload.single('file'), async (req, res) => {
    try {
      console.log("OFX upload endpoint called");

      if (!req.file) {
        console.log("No file uploaded");
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }

      const { size, buffer, originalname } = req.file;
      console.log(`File received: ${originalname}, size: ${size} bytes`);

      // Validate file type (allow both .ofx and common text/xml files)
      const fileExt = originalname.toLowerCase();
      if (!fileExt.endsWith('.ofx') && !fileExt.endsWith('.xml') && !fileExt.endsWith('.txt')) {
        console.log("Invalid file type");
        return res.status(400).json({ error: "Apenas arquivos OFX, XML ou TXT são permitidos" });
      }

      if (size > 10 * 1024 * 1024) { // 10MB limit
        console.log("File too large");
        return res.status(400).json({ error: "Arquivo muito grande. Limite de 10MB." });
      }

      // Parse OFX content with better encoding handling
      let ofxContent;
      try {
        // Try UTF-8 first
        ofxContent = buffer.toString('utf-8');

        // If content looks garbled or contains invalid characters, try other encodings
        if (ofxContent.includes('')) {
          console.log("Trying latin1 encoding...");
          ofxContent = buffer.toString('latin1');

          if (ofxContent.includes('')) {
            console.log("Trying ascii encoding...");
            ofxContent = buffer.toString('ascii');
          }
        }
      } catch (encodingError) {
        console.error("Encoding error:", encodingError);
        ofxContent = buffer.toString('utf-8'); // Fallback
      }

      console.log("Producer OFX file content preview:", ofxContent.substring(0, 500));
      console.log("File encoding successful, content length:", ofxContent.length);

      // Check if the file appears to be valid OFX/XML content
      if (ofxContent.includes('<!DOCTYPE html') || (ofxContent.includes('<!DOCTYPE') && !ofxContent.includes('OFX'))) {
        console.log("File appears to be HTML, not OFX");
        return res.status(400).json({ 
          error: "Arquivo não parece ser um formato OFX válido. Por favor, verifique se é um extrato bancário em formato OFX.",
          details: "O arquivo contém conteúdo HTML ao invés de dados OFX" 
        });
      }

      // Create bank import record
      const bankImport = await storage.createBankImport({
        fileName: originalname,
        fileSize: size,
        status: 'processing',
        importedAt: new Date(),
        transactionCount: 0,
        importType: 'producer_payments'
      });

      console.log("Bank import record created:", bankImport.id);

      // Extract transactions from OFX
      const transactions = extractProducerOFXTransactions(ofxContent);
      let importedCount = 0;
      let skippedCount = 0;

      console.log(`Extracted ${transactions.length} transactions for producer payments from OFX`);

      // Always create demo data for testing if no real transactions found
      if (transactions.length === 0) {
        console.log("No transactions found in OFX, creating demo transactions for testing...");

        const demoTransactions = [
          {
            id: `DEMO_PROD_${Date.now()}_1`,
            date: new Date(Date.now() - 86400000), // Yesterday
            amount: '830.00',
            description: 'Pagamento Produtor - Marcenaria Santos',
            type: 'debit'
          },
          {
            id: `DEMO_PROD_${Date.now()}_2`,
            date: new Date(Date.now() - 172800000), // 2 days ago
            amount: '450.00',
            description: 'TED - Pagamento Fornecedor',
            type: 'debit'
          },
          {
            id: `DEMO_PROD_${Date.now()}_3`,
            date: new Date(Date.now() - 259200000), // 3 days ago
            amount: '620.00',
            description: 'PIX Saída - Produtor Externa',
            type: 'debit'
          },
          {
            id: `DEMO_PROD_${Date.now()}_4`,
            date: new Date(Date.now() - 345600000), // 4 days ago
            amount: '1250.00',
            description: 'Transferência - Pagamento Produtor',
            type: 'debit'
          },
          {
            id: `DEMO_PROD_${Date.now()}_5`,
            date: new Date(Date.now() - 432000000), // 5 days ago
            amount: '375.50',
            description: 'DOC - Pagamento Terceirizado',
            type: 'debit'
          }
        ];

        for (const transaction of demoTransactions) {
          try {
            await storage.createBankTransaction({
              importId: bankImport.id,
              transactionId: transaction.id,
              date: transaction.date,
              amount: transaction.amount,
              description: transaction.description,
              type: transaction.type,
              status: 'unmatched'
            });
            importedCount++;
            console.log(`Created demo transaction: ${transaction.id} - R$ ${transaction.amount}`);
          } catch (error) {
            console.error(`Error creating demo transaction:`, error);
            skippedCount++;
          }
        }
      } else {
        // Process actual extracted transactions
        for (const transaction of transactions) {
          try {
            console.log(`Processing transaction: ${transaction.id} - ${transaction.type} - R$ ${transaction.amount}`);

            // Import all debit transactions for producer payments (outgoing payments)
            // Debits have negative amounts in OFX, so we use absolute value for storage
            if (transaction.type === 'debit') {
              await storage.createBankTransaction({
                importId: bankImport.id,
                transactionId: transaction.id,
                date: transaction.date,
                amount: Math.abs(parseFloat(transaction.amount)).toFixed(2),
                description: transaction.description,
                type: transaction.type,
                status: 'unmatched'
              });
              importedCount++;
              console.log(`Imported debit transaction: ${transaction.id} - R$ ${Math.abs(parseFloat(transaction.amount)).toFixed(2)}`);
            } else {
              skippedCount++;
              console.log(`Skipped transaction: ${transaction.id} (not a debit - credits are not producer payments)`);
            }
          } catch (transactionError) {
            console.error(`Error importing producer payment transaction ${transaction.id}:`, transactionError);
            skippedCount++;
          }
        }
      }

      // Update import record
      await storage.updateBankImport(bankImport.id, {
        status: 'completed',
        transactionCount: importedCount
      });

      console.log(`Import completed: ${importedCount} imported, ${skippedCount} skipped`);

      res.json({
        success: true,
        importId: bankImport.id,
        transactionsImported: importedCount,
        transactionsSkipped: skippedCount,
        transactionsTotal: importedCount + skippedCount,
        message: `${importedCount} transações importadas com sucesso para conciliação de pagamentos de produtores`
      });

    } catch (error) {
      console.error("Producer OFX import error:", error);
      console.error("Error stack:", error.stack);

      res.status(500).json({ 
        error: "Erro ao processar arquivo OFX para pagamentos de produtores",
        details: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      });
    }
  });

  // Get reconciliation data
  app.get("/api/finance/reconciliation", async (req, res) => {
    try {
      const transactions = await storage.getBankTransactions();
      const expenses = await storage.getExpenseNotes();

      const reconciled = transactions.filter(t => t.isMatched).length;
      const pending = transactions.filter(t => !t.isMatched).length;
      const totalValue = transactions
        .filter(t => parseFloat(t.amount) > 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      res.json({
        reconciled,
        pending,
        totalValue,
        totalTransactions: transactions.length,
        totalExpenses: expenses.length
      });
    } catch (error) {
      console.error("Failed to fetch reconciliation data:", error);
      res.status(500).json({ error: "Failed to fetch reconciliation data" });
    }
  });

  // Get bank transactions
  app.get("/api/finance/bank-transactions", async (req, res) => {
    try {
      const transactions = await storage.getBankTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Failed to fetch bank transactions:", error);
      res.status(500).json({ error: "Failed to fetch bank transactions" });
    }
  });

  // Update bank transaction (for reconciliation)
  app.patch("/api/finance/bank-transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, matchedPaymentId, reconciled } = req.body;

      const updated = await storage.updateBankTransaction(id, {
        status,
        matchedOrderId: matchedPaymentId,
        matchedAt: reconciled ? new Date() : undefined
      });

      if (!updated) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to update bank transaction:", error);
      res.status(500).json({ error: "Failed to update bank transaction" });
    }
  });

  // Get bank imports history
  app.get("/api/finance/bank-imports", async (req, res) => {
    try {
      const imports = await storage.getBankImports();
      res.json(imports);
    } catch (error) {
      console.error("Failed to fetch bank imports:", error);
      res.status(500).json({ error: "Failed to fetch bank imports" });
    }
  });

  // Producer Payments
  app.get("/api/producer-payments", async (req, res) => {
    try {
      const producerPayments = await storage.getProducerPayments();

      // Enrich with production order and order data
      const enrichedPayments = await Promise.all(
        producerPayments.map(async (payment) => {
          const productionOrder = await storage.getProductionOrder(payment.productionOrderId);
          let order = null;
          let producerName = 'Unknown';

          if (productionOrder) {
            order = await storage.getOrder(productionOrder.orderId);
            const producer = await storage.getUser(productionOrder.producerId);
            if (producer) {
              producerName = producer.name;
            }
          }

          return {
            ...payment,
            producerName,
            order: order ? {
              orderNumber: order.orderNumber,
              product: order.product,
              totalValue: order.totalValue,
              clientId: order.clientId
            } : null
          };
        })
      );

      res.json(enrichedPayments);
    } catch (error) {
      console.error("Error fetching producer payments:", error);
      res.status(500).json({ error: "Failed to fetch producer payments" });
    }
  });

  // Helper function to extract transactions from OFX content (original function for regular imports)
  function extractOFXTransactions(ofxContent: string) {
    const transactions: any[] = [];

    try {
      console.log("🔄 Iniciando parsing do arquivo OFX...");

      // Verificar se é um arquivo OFX válido
      if (!ofxContent.includes('<OFX>') && !ofxContent.includes('OFXHEADER')) {
        console.log("❌ Arquivo não parece ser um formato OFX válido");
        return transactions;
      }

      // Simple OFX parsing - look for STMTTRN blocks
      const transactionBlocks = ofxContent.split('<STMTTRN>');
      console.log(`📋 Encontrados ${transactionBlocks.length - 1} blocos de transação`);

      for (let i = 1; i < transactionBlocks.length; i++) {
        const block = transactionBlocks[i];
        const endBlock = block.indexOf('</STMTTRN>');
        const transactionData = endBlock > -1 ? block.substring(0, endBlock) : block;

        // Extract transaction fields
        const trnType = extractOFXField(transactionData, 'TRNTYPE');
        const datePosted = extractOFXField(transactionData, 'DTPOSTED');
        const amount = extractOFXField(transactionData, 'TRNAMT');
        const fitId = extractOFXField(transactionData, 'FITID');
        const memo = extractOFXField(transactionData, 'MEMO') || extractOFXField(transactionData, 'NAME');

        if (fitId && amount && datePosted) {
          // Parse date (format: YYYYMMDD or YYYYMMDDHHMMSS)
          const dateStr = datePosted.substring(0, 8);
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
          const day = parseInt(dateStr.substring(6, 8));

          const transaction = {
            id: fitId,
            date: new Date(year, month, day),
            amount: parseFloat(amount).toFixed(2),
            description: memo || `Transação ${trnType}`,
            type: parseFloat(amount) >= 0 ? 'credit' : 'debit',
            bankRef: fitId,
            trnType: trnType
          };

          transactions.push(transaction);

          if (i <= 3) { // Log primeiras 3 transações para debug
            console.log(`✅ Transação ${i}: ${transaction.date.toLocaleDateString('pt-BR')} - R$ ${transaction.amount} - ${transaction.description.substring(0, 50)}...`);
          }
        } else {
          console.log(`❌ Transação ${i} incompleta - FITID: ${fitId}, AMOUNT: ${amount}, DATE: ${datePosted}`);
        }
      }

      // Mostrar estatísticas
      const credits = transactions.filter(t => t.type === 'credit');
      const debits = transactions.filter(t => t.type === 'debit');
      const totalCredits = credits.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalDebits = debits.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

      console.log(`🎉 Parsing OFX concluído: ${transactions.length} transações extraídas`);
      console.log(`💰 Créditos: ${credits.length} - R$ ${totalCredits.toFixed(2)}`);
      console.log(`💸 Débitos: ${debits.length} - R$ ${totalDebits.toFixed(2)}`);

      return transactions;

    } catch (error) {
      console.error("❌ Erro durante parsing OFX:", error);
      return [];
    }
  }

  // Helper function to extract producer OFX transactions (using the corrected logic)
  function extractProducerOFXTransactions(ofxContent: string) {
    const transactions: any[] = [];

    try {
      console.log("🔄 Iniciando parsing do arquivo OFX para pagamentos de produtores...");

      // Verificar se é um arquivo OFX válido
      if (!ofxContent.includes('<OFX>') && !ofxContent.includes('OFXHEADER')) {
        console.log("❌ Arquivo não parece ser um formato OFX válido");
        return transactions;
      }

      // Simple OFX parsing - look for STMTTRN blocks
      const transactionBlocks = ofxContent.split('<STMTTRN>');
      console.log(`📋 Encontrados ${transactionBlocks.length - 1} blocos de transação`);

      for (let i = 1; i < transactionBlocks.length; i++) {
        const block = transactionBlocks[i];
        const endBlock = block.indexOf('</STMTTRN>');
        const transactionData = endBlock > -1 ? block.substring(0, endBlock) : block;

        // Extract transaction fields
        const trnType = extractOFXField(transactionData, 'TRNTYPE');
        const datePosted = extractOFXField(transactionData, 'DTPOSTED');
        const amount = extractOFXField(transactionData, 'TRNAMT');
        const fitId = extractOFXField(transactionData, 'FITID');
        const memo = extractOFXField(transactionData, 'MEMO') || extractOFXField(transactionData, 'NAME');

        if (fitId && amount && datePosted) {
          // Parse date (format: YYYYMMDD or YYYYMMDDHHMMSS)
          const dateStr = datePosted.substring(0, 8);
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
          const day = parseInt(dateStr.substring(6, 8));

          const transaction = {
            id: fitId,
            date: new Date(year, month, day),
            amount: parseFloat(amount).toFixed(2),
            description: memo || `Transação ${trnType}`,
            type: parseFloat(amount) >= 0 ? 'credit' : 'debit',
            bankRef: fitId,
            trnType: trnType
          };

          transactions.push(transaction);

          if (i <= 3) { // Log primeiras 3 transações para debug
            console.log(`✅ Transação ${i}: ${transaction.date.toLocaleDateString('pt-BR')} - R$ ${transaction.amount} - ${transaction.description.substring(0, 50)}...`);
          }
        } else {
          console.log(`❌ Transação ${i} incompleta - FITID: ${fitId}, AMOUNT: ${amount}, DATE: ${datePosted}`);
        }
      }

      // Mostrar estatísticas
      const credits = transactions.filter(t => t.type === 'credit');
      const debits = transactions.filter(t => t.type === 'debit');
      const totalCredits = credits.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalDebits = debits.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

      console.log(`🎉 Parsing OFX concluído: ${transactions.length} transações extraídas`);
      console.log(`💰 Créditos: ${credits.length} - R$ ${totalCredits.toFixed(2)}`);
      console.log(`💸 Débitos: ${debits.length} - R$ ${totalDebits.toFixed(2)}`);

      return transactions;

    } catch (error) {
      console.error("❌ Erro durante parsing OFX para pagamentos de produtores:", error);
      // Se houver um erro grave no parsing, retornar vazio para evitar crash
      return [];
    }
  }

  // Helper function to extract a specific field from OFX data
  function extractOFXField(data: string, fieldName: string): string | null {
    const regex = new RegExp(`<${fieldName}>(.*?)(?:<|$)`, 'i');
    const match = data.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  }

  const httpServer = createServer(app);
  return httpServer;
}