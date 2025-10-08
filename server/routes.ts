import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import express from 'express';
import path from 'path';
import { storage } from "./storage";
import { db, eq, orders, clients, budgets, budgetPhotos, productionOrders, desc, sql, type ProductionOrder, users as usersTable, orders as ordersTable, productionOrders as productionOrdersTable } from './db'; // Assuming these are your database models and functions

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


// Helper function to parse OFX buffer
async function parseOFXBuffer(buffer: Buffer) {
  const ofxContent = buffer.toString('utf-8');
  const transactions = [];

  // Simple regex-based OFX parsing
  const transactionRegex = /<STMTTRN>(.*?)<\/STMTTRN>/gs;
  const matches = ofxContent.match(transactionRegex);

  if (matches) {
    matches.forEach((match, index) => {
      const trnType = match.match(/<TRNTYPE>(.*?)</)?.[1] || 'OTHER';
      const dtPostedRaw = match.match(/<DTPOSTED>(.*?)</)?.[1] || '';
      const trnAmt = match.match(/<TRNAMT>(.*?)</)?.[1] || '0';
      const fitId = match.match(/<FITID>(.*?)</)?.[1] || `TXN_${Date.now()}_${index}`;
      const memo = match.match(/<MEMO>(.*?)</)?.[1] || 'Transação bancária';
      const refNum = match.match(/<REFNUM>(.*?)</)?.[1] || null;

      // Parse date (format: YYYYMMDDHHMMSS or YYYYMMDD)
      let transactionDate = null;
      let hasValidDate = false;
      if (dtPostedRaw && dtPostedRaw.length >= 8) {
        try {
          const year = parseInt(dtPostedRaw.substring(0, 4));
          const month = parseInt(dtPostedRaw.substring(4, 6)) - 1; // Month is 0-based
          const day = parseInt(dtPostedRaw.substring(6, 8));

          // Check if date components are valid numbers before creating date
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            const parsedDate = new Date(year, month, day);
            // Further validate if the created date is reasonable
            if (parsedDate.getFullYear() === year && parsedDate.getMonth() === month && parsedDate.getDate() === day) {
              transactionDate = parsedDate;
              hasValidDate = true;
            }
          }
        } catch (e) {
          console.error("Error parsing date from DTPOSTED:", dtPostedRaw, e);
        }
      }

      transactions.push({
        fitId: fitId,
        dtPosted: transactionDate,
        hasValidDate: hasValidDate,
        amount: trnAmt,
        memo: memo,
        refNum: refNum,
        type: trnType
      });
    });
  }

  return { transactions };
}

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

      // Ensure we have the correct clientId - if it's a client record ID, get the userId
      let finalClientId = orderData.clientId;
      console.log("Original clientId:", finalClientId);

      // Check if clientId is a client record - if so, we might need to use the userId instead
      const clientRecord = await storage.getClient(orderData.clientId);
      if (clientRecord && clientRecord.userId) {
        console.log("Found client record, using userId for order:", clientRecord.userId);
        finalClientId = clientRecord.userId;
      } else {
        // Check if it's a userId that has a client record
        const clientByUserId = await storage.getClientByUserId(orderData.clientId);
        if (clientByUserId) {
          console.log("Found client by userId, keeping original clientId:", orderData.clientId);
          finalClientId = orderData.clientId;
        }
      }

      console.log("Final clientId for order:", finalClientId);

      // Create order with all provided data
      const newOrder = await storage.createOrder({
        orderNumber,
        clientId: finalClientId,
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

      console.log("Created order with final clientId:", newOrder.clientId);
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
          let clientName = 'Unknown';

          // Try multiple approaches to find the client name
          console.log(`Looking for client name for order ${order.orderNumber}, clientId: ${order.clientId}`);

          // Method 1: Try to get client record directly by ID
          const clientRecord = await storage.getClient(order.clientId);
          if (clientRecord) {
            console.log(`Found client record:`, clientRecord);
            clientName = clientRecord.name;
          } else {
            // Method 2: Try to find client record by userId
            const clientByUserId = await storage.getClientByUserId(order.clientId);
            if (clientByUserId) {
              console.log(`Found client by userId:`, clientByUserId);
              clientName = clientByUserId.name;
            } else {
              // Method 3: Fallback to user table
              const clientUser = await storage.getUser(order.clientId);
              if (clientUser) {
                console.log(`Found user record:`, clientUser);
                clientName = clientUser.name;
              } else {
                console.log(`No client found for ID: ${order.clientId}`);
              }
            }
          }

          return {
            ...order,
            clientName: clientName
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
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
  app.get("/api/production-orders", async (req, res) => {
    try {
      const productionOrders = await storage.getProductionOrders();

      const enrichedOrders = await Promise.all(
        productionOrders.map(async (po) => {
          const order = await storage.getOrder(po.orderId);
          const producer = po.producerId ? await storage.getUser(po.producerId) : null;

          // Get client details - try multiple approaches to find the client
          let clientName = 'Unknown';
          let clientAddress = null;
          let clientPhone = null;
          let clientEmail = null;

          console.log(`Looking for client with ID: ${order?.clientId}`);

          if (order) {
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
          }

          return {
            ...po,
            orderNumber: order?.orderNumber || 'Unknown',
            product: order?.product || 'Unknown',
            clientName: clientName,
            clientAddress: clientAddress,
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            producerName: producer?.name || null,
            order: order ? {
              ...order,
              clientName: clientName,
              clientAddress: clientAddress,
              clientPhone: clientPhone,
              clientEmail: clientEmail,
              shippingAddress: order.deliveryType === 'pickup'
                ? 'Sede Principal - Retirada no Local'
                : (clientAddress || 'Endereço não informado'),
              deliveryType: order.deliveryType || 'delivery'
            } : null
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

  // Get production status for vendor orders
  app.get("/api/production-orders/vendor/:vendorId/status", async (req, res) => {
    try {
      const { vendorId } = req.params;

      // Get all production orders
      const allProductionOrders = await storage.getProductionOrders();
      const orders = await storage.getOrders();
      const users = await storage.getUsers();

      // Filter production orders for this vendor's orders
      const vendorOrders = orders.filter(o => o.vendorId === vendorId);
      const vendorOrderIds = vendorOrders.map(o => o.id);

      const productionStatuses = allProductionOrders
        .filter(po => vendorOrderIds.includes(po.orderId))
        .map(po => {
          const producer = users.find(u => u.id === po.producerId);
          return {
            id: po.id,
            orderId: po.orderId,
            status: po.status,
            producerValue: po.producerValue,
            deliveryDate: po.deliveryDeadline,
            notes: po.notes,
            producerName: producer?.name || null,
            lastNoteAt: po.lastNoteAt,
          };
        });

      console.log(`Found ${productionStatuses.length} production statuses for vendor ${vendorId}`);
      res.json(productionStatuses);
    } catch (error) {
      console.error("Error fetching vendor production statuses:", error);
      res.status(500).json({ error: "Failed to fetch vendor production statuses" });
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
      const { name, email, phone, specialty, address, password, username } = req.body;

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username || email);
      if (existingUser) {
        return res.status(400).json({ error: "Código de usuário já existe" });
      }

      // Create user with role producer including specialty and address
      const user = await storage.createUser({
        username: username || email,
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

  // Endpoint específico para pedidos do vendedor (usado na página de pedidos do vendedor)
  app.get("/api/vendors/:vendorId/orders", async (req, res) => {
    const { vendorId } = req.params;
    try {
      const orders = await storage.getOrdersByVendor(vendorId);
      console.log(`Found ${orders.length} orders for vendor ${vendorId}`);

      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          let clientName = 'Unknown';

          console.log(`Processing order ${order.orderNumber}, clientId: ${order.clientId}`);

          // Try multiple approaches to find the client name
          // Method 1: Try to get client record directly by ID
          const clientRecord = await storage.getClient(order.clientId);
          if (clientRecord) {
            console.log(`Found client record for order ${order.orderNumber}:`, { id: clientRecord.id, name: clientRecord.name });
            clientName = clientRecord.name;
          } else {
            // Method 2: Try to find client record by userId
            const clientByUserId = await storage.getClientByUserId(order.clientId);
            if (clientByUserId) {
              console.log(`Found client by userId for order ${order.orderNumber}:`, { id: clientByUserId.id, name: clientByUserId.name });
              clientName = clientByUserId.name;
            } else {
              // Method 3: Fallback to user table
              const clientUser = await storage.getUser(order.clientId);
              if (clientUser) {
                console.log(`Found user record for order ${order.orderNumber}:`, { id: clientUser.id, name: clientUser.name });
                clientName = clientUser.name;
              } else {
                console.log(`No client found for order ${order.orderNumber}, clientId: ${order.clientId}`);
                // Method 4: Search all clients for a match
                const allClients = await storage.getClients();
                const matchingClient = allClients.find(c => c.userId === order.clientId || c.id === order.clientId);
                if (matchingClient) {
                  console.log(`Found matching client in all clients for order ${order.orderNumber}:`, { id: matchingClient.id, name: matchingClient.name });
                  clientName = matchingClient.name;
                }
              }
            }
          }

          const producer = order.producerId ? await storage.getUser(order.producerId) : null;

          // Check if there are unread production notes
          let hasUnreadNotes = false;
          if (order.producerId) {
            const productionOrders = await storage.getProductionOrdersByOrder(order.id);
            hasUnreadNotes = productionOrders.some(po => po.hasUnreadNotes);
          }

          return {
            ...order,
            clientName: clientName,
            producerName: producer?.name || null,
            hasUnreadNotes: hasUnreadNotes
          };
        })
      );

      console.log(`Returning ${enrichedOrders.length} enriched orders for vendor ${vendorId}`);
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
      res.status(500).json({ error: "Failed to fetch vendor orders" });
    }
  });

  app.get("/api/vendor/:userId/info", async (req, res) => {
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

  // Commission routes
  app.get("/api/commissions", async (req, res) => {
    try {
      const commissions = await storage.getAllCommissions();

      // Enrich with user names
      const enrichedCommissions = await Promise.all(
        commissions.map(async (commission) => {
          let vendorName = null;
          let partnerName = null;

          if (commission.vendorId) {
            const vendor = await storage.getUser(commission.vendorId);
            vendorName = vendor?.name;
          }

          if (commission.partnerId) {
            const partner = await storage.getUser(commission.partnerId);
            partnerName = partner?.name;
          }

          return {
            ...commission,
            vendorName,
            partnerName
          };
        })
      );

      res.json(enrichedCommissions);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });

  app.get("/api/commissions/vendor/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const commissions = await storage.getCommissionsByVendor(vendorId);
      res.json(commissions);
    } catch (error) {
      console.error("Error fetching vendor commissions:", error);
      res.status(500).json({ error: "Failed to fetch vendor commissions" });
    }
  });

  app.put("/api/commissions/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updatedCommission = await storage.updateCommissionStatus(id, status);
      if (!updatedCommission) {
        return res.status(404).json({ error: "Commission not found" });
      }

      res.json(updatedCommission);
    } catch (error) {
      console.error("Error updating commission status:", error);
      res.status(500).json({ error: "Failed to update commission status" });
    }
  });

  // Partners routes
  // Get all partners
  app.get("/api/partners", async (req, res) => {
    try {
      const users = await storage.getUsers();
      const partners = users.filter(user => user.role === 'partner');

      const partnersWithDetails = partners.map((partner) => ({
        id: partner.id,
        name: partner.name,
        email: partner.email || "",
        accessCode: partner.username || "",
        phone: partner.phone || "",
        createdAt: partner.createdAt,
        isActive: true
      }));

      res.json(partnersWithDetails);
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  app.post("/api/partners", async (req, res) => {
    try {
      const partner = await storage.createPartner(req.body);
      res.json(partner);
    } catch (error) {
      console.error("Error creating partner:", error);
      res.status(500).json({ error: "Failed to create partner" });
    }
  });

  app.put("/api/partners/:partnerId/commission", async (req, res) => {
    try {
      const { partnerId } = req.params;
      const { commissionRate } = req.body;

      await storage.updatePartnerCommission(partnerId, commissionRate);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating partner commission:", error);
      res.status(500).json({ error: "Failed to update partner commission" });
    }
  });

  // Financial data
  app.get("/api/finance/overview", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const payments = await storage.getPayments();
      const allCommissions = await storage.getAllCommissions();
      const productionOrders = await storage.getProductionOrders();
      const bankTransactions = await storage.getBankTransactions();
      const expenseNotes = await storage.getExpenseNotes();

      // Contas a Receber - soma dos valores pendentes dos pedidos
      const receivables = orders
        .filter(order => order.status !== 'cancelled')
        .reduce((total, order) => {
          const totalValue = parseFloat(order.totalValue);
          const paidValue = parseFloat(order.paidValue || '0');
          const remaining = totalValue - paidValue;
          return total + Math.max(0, remaining);
        }, 0);

      // Contas a Pagar - pagamentos pendentes para produtores
      const payables = productionOrders
        .filter(po =>
          po.producerValue &&
          parseFloat(po.producerValue) > 0 &&
          (!po.producerPaymentStatus || po.producerPaymentStatus === 'pending' || po.producerPaymentStatus === 'approved')
        )
        .reduce((total, po) => total + parseFloat(po.producerValue || '0'), 0);

      // Saldo em Conta - transações bancárias não conciliadas (entrada - saída)
      const bankBalance = bankTransactions.reduce((total, txn) => {
        const amount = parseFloat(txn.amount);
        // Assumir que valores positivos são entrada e negativos são saída
        return total + amount;
      }, 0);

      // Comissões Pendentes
      const pendingCommissions = allCommissions
        .filter(c => c.status === 'pending' || c.status === 'confirmed')
        .reduce((total, c) => total + parseFloat(c.amount), 0);

      // Receita Total do Mês
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyRevenue = orders
        .filter(order => {
          if (!order.createdAt || order.status === 'cancelled') return false;
          const orderDate = new Date(order.createdAt);
          return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        })
        .reduce((total, order) => total + parseFloat(order.totalValue), 0);

      // Despesas do Mês
      const monthlyExpenses = expenseNotes
        .filter(expense => {
          if (!expense.createdAt) return false;
          const expenseDate = new Date(expense.createdAt);
          return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        })
        .reduce((total, expense) => total + parseFloat(expense.amount), 0);

      res.json({
        receivables: receivables,
        payables: payables,
        balance: bankBalance,
        pendingCommissions: pendingCommissions,
        monthlyRevenue: monthlyRevenue,
        monthlyExpenses: monthlyExpenses
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
      const producerPayments = await storage.getProducerPaymentsByProducer(producerId);

      const activeOrders = productionOrders.filter(po => po.status === 'production' || po.status === 'accepted').length;
      const pendingOrders = productionOrders.filter(po => po.status === 'pending').length;
      const completedOrders = productionOrders.filter(po => po.status === 'completed').length;

      const pendingPayments = producerPayments
        .filter(p => p.status === 'pending' || p.status === 'approved')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      res.json({
        activeOrders,
        pendingOrders,
        completedOrders,
        pendingPayments
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
      const newProduct = await storage.createProduct(productData);
      res.json(newProduct);
    } catch (error) {
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

      if (productsData.length > 10000) {
        return res.status(400).json({
          error: "Muitos produtos no arquivo. O limite é de 10.000 produtos por importação."
        });
      }

      console.log(`Importing ${productsData.length} products...`);

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

      const newBudget = await storage.createBudget(budgetData);

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

  app.post("/api/settings/customization-options/bulk-import", requireAuth, async (req, res) => {
    try {
      const { customizations } = req.body;

      if (!Array.isArray(customizations) || customizations.length === 0) {
        return res.status(400).json({ error: "Lista de personalizações inválida" });
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (const customization of customizations) {
        try {
          if (!customization.name || !customization.category ||
            customization.minQuantity === undefined || customization.price === undefined) {
            errors.push(`Linha com dados incompletos: ${customization.name || 'sem nome'}`);
            continue;
          }

          await storage.createCustomizationOption({
            name: customization.name,
            description: customization.description || "",
            category: customization.category,
            minQuantity: parseInt(customization.minQuantity),
            price: parseFloat(customization.price).toFixed(2),
            isActive: customization.isActive !== undefined ? customization.isActive : true,
            createdBy: req.user?.id || 'admin-1'
          });

          importedCount++;
        } catch (error) {
          console.error(`Erro ao importar personalização ${customization.name}:`, error);
          errors.push(`Erro ao importar: ${customization.name}`);
        }
      }

      res.json({
        success: true,
        imported: importedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `${importedCount} personalizações importadas com sucesso${errors.length > 0 ? `. ${errors.length} com erro.` : ''}`
      });
    } catch (error) {
      console.error('Error bulk importing customizations:', error);
      res.status(500).json({ error: "Erro ao importar personalizações" });
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

  // Producer Payment routes
  app.get("/api/producer-payments", async (req, res) => {
    try {
      const payments = await storage.getProducerPayments();

      // Enrich with production order and producer data
      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          const productionOrder = await storage.getProductionOrder(payment.productionOrderId);
          const producer = await storage.getUser(payment.producerId);
          let order = null;

          if (productionOrder) {
            order = await storage.getOrder(productionOrder.orderId);
          }

          return {
            ...payment,
            productionOrder,
            order,
            producerName: producer?.name || 'Unknown'
          };
        })
      );

      res.json(enrichedPayments);
    } catch (error) {
      console.error("Failed to fetch producer payments:", error);
      res.status(500).json({ error: "Failed to fetch producer payments" });
    }
  });

  app.get("/api/producer-payments/producer/:producerId", async (req, res) => {
    try {
      const { producerId } = req.params;
      const payments = await storage.getProducerPaymentsByProducer(producerId);

      // Enrich with production order data
      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          const productionOrder = await storage.getProductionOrder(payment.productionOrderId);
          let order = null;

          if (productionOrder) {
            order = await storage.getOrder(productionOrder.orderId);
          }

          return {
            ...payment,
            productionOrder,
            order
          };
        })
      );

      res.json(enrichedPayments);
    } catch (error) {
      console.error("Error fetching producer payments:", error);
      res.status(500).json({ error: "Failed to fetch producer payments" });
    }
  });

  app.post("/api/production-orders/:id/set-value", async (req, res) => {
    try {
      const { id } = req.params;
      const { value, notes } = req.body;

      console.log(`API: Setting value for production order ${id}:`, { value, notes, type: typeof value });

      if (!value && value !== 0) {
        console.log("API: Value is missing");
        return res.status(400).json({ error: "Valor é obrigatório" });
      }

      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || numericValue <= 0) {
        console.log("API: Invalid numeric value:", numericValue);
        return res.status(400).json({ error: "Valor deve ser um número válido maior que zero" });
      }

      // Verificar se o valor já foi definido e está bloqueado
      const productionOrder = await storage.getProductionOrder(id);
      if (!productionOrder) {
        console.log("API: Production order not found");
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      if (productionOrder.producerValueLocked) {
        console.log("API: Producer value is locked");
        return res.status(400).json({ error: "O valor já foi definido e não pode ser alterado" });
      }

      console.log("API: Calling storage.updateProductionOrderValue...");
      const updated = await storage.updateProductionOrderValue(id, numericValue.toFixed(2), notes, true); // true para bloquear valor

      if (!updated) {
        console.log("API: Production order not found");
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      console.log("API: Value updated successfully:", { id: updated.id, producerValue: updated.producerValue });
      res.json({ success: true, productionOrder: updated });
    } catch (error) {
      console.error("API Error setting production order value:", error);
      res.status(500).json({
        error: "Failed to set production order value",
        details: error.message
      });
    }
  });

  // Producer payment approval route
  app.post("/api/finance/producer-payments/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;

      const updated = await storage.updateProducerPayment(id, {
        status: 'approved',
        approvedBy: 'admin-1',
        approvedAt: new Date()
      });

      if (!updated) {
        return res.status(404).json({ error: "Pagamento não encontrado" });
      }

      console.log(`Producer payment ${id} approved successfully`);
      res.json(updated);
    } catch (error) {
      console.error("Error approving producer payment:", error);
      res.status(500).json({ error: "Failed to approve producer payment" });
    }
  });

  app.patch("/api/producer-payments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvedBy, paidBy, paymentMethod, notes } = req.body;

      const updateData: any = { status };

      if (status === 'approved') {
        updateData.approvedBy = approvedBy;
        updateData.approvedAt = new Date();
      }

      if (status === 'paid') {
        updateData.paidBy = paidBy;
        updateData.paidAt = new Date();
        updateData.paymentMethod = paymentMethod;
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const updated = await storage.updateProducerPayment(id, updateData);

      if (!updated) {
        return res.status(404).json({ error: "Pagamento não encontrado" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating producer payment:", error);
      res.status(500).json({ error: "Failed to update producer payment" });
    }
  });

  // Active payment and shipping methods for vendor forms
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const paymentMethods = await storage.getPaymentMethods();
      res.json(paymentMethods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  app.get("/api/shipping-methods", async (req, res) => {
    try {
      const shippingMethods = await storage.getShippingMethods();
      res.json(shippingMethods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shipping methods" });
    }
  });

  // Routes by role
  app.get("/api/budgets/vendor/:vendorId", async (req, res) => {
    try {
      const budgets = await storage.getBudgetsByVendor(req.params.vendorId);

      // Enrich with client names and items
      const enrichedBudgets = await Promise.all(
        budgets.map(async (budget) => {
          let clientName = budget.contactName;
          if (budget.clientId) {
            const client = await storage.getUser(budget.clientId);
            clientName = client?.name || budget.contactName;
          }

          const items = await storage.getBudgetItems(budget.id);
          const photos = await storage.getBudgetPhotos(budget.id);
          const paymentInfo = await storage.getBudgetPaymentInfo(budget.id);

          return {
            ...budget,
            clientName: clientName,
            items: items,
            photos: photos.map(photo => photo.photoUrl),
            paymentMethodId: paymentInfo?.paymentMethodId || "",
            shippingMethodId: paymentInfo?.shippingMethodId || "",
            installments: paymentInfo?.installments || 1,
            downPayment: paymentInfo?.downPayment || "0.00",
            remainingAmount: paymentInfo?.remainingAmount || "0.00",
            shippingCost: paymentInfo?.shippingCost || "0.00"
          };
        })
      );

      res.json(enrichedBudgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor budgets" });
    }
  });

  app.get("/api/vendors/:vendorId/budgets", async (req, res) => {
    try {
      const budgets = await storage.getBudgetsByVendor(req.params.vendorId);

      // Enrich with client names
      const enrichedBudgets = await Promise.all(
        budgets.map(async (budget) => {
          const client = await storage.getUser(budget.clientId);
          return {
            ...budget,
            clientName: client?.name || 'Unknown'
          };
        })
      );

      res.json(enrichedBudgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor budgets" });
    }
  });

  app.get("/api/client/:clientId/budgets", async (req, res) => {
    try {
      const budgets = await storage.getBudgetsByClient(req.params.clientId);

      // Enrich with vendor names
      const enrichedBudgets = await Promise.all(
        budgets.map(async (budget) => {
          const vendor = await storage.getUser(budget.vendorId);
          return {
            ...budget,
            vendorName: vendor?.name || 'Unknown'
          };
        })
      );

      res.json(enrichedBudgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client budgets" });
    }
  });

  // Vendor routes
  app.get("/api/vendors", async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.post("/api/vendors", async (req, res) => {
    try {
      const newVendor = await storage.createVendor(req.body);
      res.json(newVendor);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  app.get("/api/vendors/:id/stats", async (req, res) => {
    try {
      const vendorId = req.params.id;
      const orders = await storage.getOrdersByVendor(vendorId);
      const clients = await storage.getClientsByVendor(vendorId);
      const commissions = await storage.getCommissionsByVendor(vendorId);

      const totalOrders = orders.length;
      const totalClients = clients.length;
      const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.totalValue), 0);
      const totalCommissions = commissions.reduce((sum, comm) => sum + parseFloat(comm.amount), 0);

      res.json({
        totalOrders,
        totalClients,
        totalSales,
        totalCommissions,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to fetch vendor stats" });
    }
  });

  // Get vendor orders
  app.get("/api/vendors/:vendorId/orders", async (req, res) => {
    const { vendorId } = req.params;
    try {
      const orders = await storage.getOrdersByVendor(vendorId);

      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const client = await storage.getUser(order.clientId);
          const producer = order.producerId ? await storage.getUser(order.producerId) : null;

          // Get budget photos if order was converted from budget
          let budgetPhotos = [];
          if (order.budgetId) {
            const photos = await storage.getBudgetPhotos(order.budgetId);
            budgetPhotos = photos.map(photo => photo.imageUrl || photo.photoUrl);
          }

          // Check if there are unread production notes
          let hasUnreadNotes = false;
          let productionNotes = null;
          let productionDeadline = null;
          let lastNoteAt = null;

          if (order.producerId) {
            const productionOrders = await storage.getProductionOrdersByOrder(order.id);
            if (productionOrders.length > 0) {
              const po = productionOrders[0];
              hasUnreadNotes = po.hasUnreadNotes || false;
              productionNotes = po.notes;
              productionDeadline = po.deliveryDeadline;
              lastNoteAt = po.lastNoteAt;
            }
          }

          return {
            ...order,
            clientName: client?.name || 'Unknown',
            producerName: producer?.name || null,
            budgetPhotos: budgetPhotos,
            hasUnreadNotes: hasUnreadNotes,
            productionNotes: productionNotes,
            productionDeadline: productionDeadline,
            lastNoteAt: lastNoteAt
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
      res.status(500).json({ error: "Failed to fetch vendor orders" });
    }
  });

  app.get("/api/vendors/:id/commissions", async (req, res) => {
    try {
      const vendorId = req.params.id;
      const commissions = await storage.getCommissionsByVendor(vendorId);
      res.json(commissions);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to fetch vendor commissions" });
    }
  });

  app.get("/api/vendors/:id/clients", async (req, res) => {
    try {
      const vendorId = req.params.id;
      console.log(`Fetching clients for vendor: ${vendorId}`);

      const clients = await storage.getClientsByVendor(vendorId);
      console.log(`Found ${clients.length} clients for vendor ${vendorId}:`, clients.map(c => ({ id: c.id, name: c.name, vendorId: c.vendorId })));

      // Enrich clients with order counts and total spent
      const enrichedClients = await Promise.all(
        clients.map(async (client) => {
          const clientId = client.userId || client.id;
          const orders = await storage.getOrdersByClient(clientId);
          const vendorOrders = orders.filter(order => order.vendorId === vendorId);

          const ordersCount = vendorOrders.length;
          const totalSpent = vendorOrders.reduce((sum, order) =>
            sum + parseFloat(order.totalValue || '0'), 0
          );

          // Get user data for userCode
          const user = await storage.getUser(client.userId);

          return {
            ...client,
            id: client.id,
            userId: client.userId,
            userCode: user?.username || 'N/A',
            username: user?.username,
            ordersCount,
            totalSpent
          };
        })
      );

      console.log(`Returning ${enrichedClients.length} enriched clients`);
      res.json(enrichedClients);
    } catch (error) {
      console.error("Error fetching vendor clients:", error);
      res.status(500).json({ error: "Failed to fetch vendor clients" });
    }
  });

  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();

      // Enrich clients with userCode and order statistics
      const enrichedClients = await Promise.all(
        clients.map(async (client) => {
          const user = await storage.getUser(client.userId);

          // Get orders using both userId and client id to ensure we catch all orders
          const ordersByUserId = await storage.getOrdersByClient(client.userId);
          const ordersByClientId = await storage.getOrdersByClient(client.id);

          // Combine and deduplicate orders
          const allOrders = [...ordersByUserId, ...ordersByClientId];
          const uniqueOrders = allOrders.filter((order, index, self) =>
            index === self.findIndex(o => o.id === order.id)
          );

          const ordersCount = uniqueOrders.length;
          const totalSpent = uniqueOrders.reduce((sum, order) =>
            sum + parseFloat(order.totalValue || '0'), 0
          );

          return {
            ...client,
            id: client.id,
            userId: client.userId,
            userCode: user?.username || 'N/A',
            username: user?.username,
            ordersCount,
            totalSpent
          };
        })
      );

      res.json(enrichedClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.get("/api/clients/:id/orders", async (req, res) => {
    try {
      const orders = await storage.getOrdersByClient(req.params.id);
      res.json(orders);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to fetch client orders" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const { userCode, password, ...clientData } = req.body;

      console.log('Creating client with data:', { name: clientData.name, userCode, vendorId: clientData.vendorId });

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userCode);
      if (existingUser) {
        return res.status(400).json({ error: "Código de usuário já existe" });
      }

      // Create user first
      const user = await storage.createUser({
        username: userCode,
        password: password,
        role: "client",
        name: clientData.name,
        email: clientData.email || null,
        phone: clientData.phone || null,
        address: clientData.address || null,
        isActive: true
      });

      // Create client record linked to user
      const newClient = await storage.createClient({
        ...clientData,
        userId: user.id
      });

      // Return enriched client data
      res.json({
        ...newClient,
        userCode: userCode,
        username: userCode,
        userId: user.id,
        name: clientData.name
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const updatedClient = await storage.updateClient(req.params.id, req.body);
      if (!updatedClient) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(updatedClient);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Send order to production
  app.post("/api/orders/:id/send-to-production", async (req, res) => {
    try {
      const orderId = req.params.id;
      const { producerId } = req.body;

      if (!producerId) {
        return res.status(400).json({ error: "Producer ID is required" });
      }

      // Update order status to production and assign producer
      const updatedOrder = await storage.updateOrder(orderId, {
        status: 'production',
        producerId: producerId
      });

      if (!updatedOrder) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Create production order for the selected producer
      await storage.createProductionOrder({
        orderId: updatedOrder.id,
        producerId: producerId,
        status: 'pending',
        deadline: updatedOrder.deadline
      });

      // Get enriched order data
      const client = await storage.getUser(updatedOrder.clientId);
      const vendor = await storage.getUser(updatedOrder.vendorId);
      const producer = await storage.getUser(producerId);

      const enrichedOrder = {
        ...updatedOrder,
        clientName: client?.name || 'Unknown',
        vendorName: vendor?.name || 'Unknown',
        producerName: producer?.name || null
      };

      res.json(enrichedOrder);
    } catch (error) {
      console.error("Error sending order to production:", error);
      res.status(500).json({ error: "Failed to send order to production" });
    }
  });

  // Update production order status
  app.patch("/api/production-orders/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status, notes, deliveryDate, trackingCode } = req.body;

    try {
      // Use storage instead of db.update
      const result = await storage.updateProductionOrderStatus(id, status, notes, deliveryDate, trackingCode);

      if (!result) {
        return res.status(404).json({ error: "Production order not found" });
      }

      // Update the main order status to match production status
      const productionOrder = await storage.getProductionOrder(id);
      if (productionOrder) {
        let orderStatus = 'production'; // Default

        switch (status) {
          case 'pending':
            orderStatus = 'pending';
            break;
          case 'accepted':
            orderStatus = 'confirmed';
            break;
          case 'production':
            orderStatus = 'production';
            break;
          case 'ready':
            orderStatus = 'ready';
            break;
          case 'shipped':
            orderStatus = 'shipped';
            break;
          case 'delivered':
            orderStatus = 'delivered';
            break;
          case 'completed':
            orderStatus = 'completed';
            break;
          case 'rejected':
            orderStatus = 'cancelled';
            break;
        }

        // Atualizar o pedido principal com o novo status
        await storage.updateOrder(productionOrder.orderId, {
          status: orderStatus,
          trackingCode: trackingCode || null
        });

        // Atualizar comissões baseado no novo status
        await storage.updateCommissionsByOrderStatus(productionOrder.orderId, orderStatus);
      }

      res.json({ success: true, productionOrder: result });
    } catch (error) {
      console.error("Error updating production order status:", error);
      res.status(500).json({ error: "Failed to update production order status" });
    }
  });

  // Mark production order notes as read
  app.patch("/api/production-orders/:id/acknowledge", async (req, res) => {
    const { id } = req.params;

    try {
      const po = await storage.getProductionOrder(id);
      if (po) {
        await storage.updateProductionOrderNotes(id, po.notes || '', false);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Production order not found" });
      }
    } catch (error) {
      console.error("Error acknowledging production order notes:", error);
      res.status(500).json({ error: "Failed to acknowledge production order notes" });
    }
  });

  // Update production order notes only
  app.patch("/api/production-orders/:id/notes", async (req, res) => {
    const { id } = req.params;
    const { notes, deliveryDeadline } = req.body;

    try {
      const updateData: any = {};

      if (notes) {
        updateData.notes = notes;
        updateData.hasUnreadNotes = true;
        updateData.lastNoteAt = new Date();
      }

      if (deliveryDeadline) {
        updateData.deliveryDeadline = new Date(deliveryDeadline);
      }

      await db.update(productionOrders)
        .set(updateData)
        .where(eq(productionOrders.id, id));

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating production order notes:", error);
      res.status(500).json({ error: "Failed to update production order notes" });
    }
  });

  // Mark production notes as read
  app.patch("/api/orders/:id/mark-notes-read", async (req, res) => {
    const { id } = req.params;

    try {
      // Find production order by order ID
      const productionOrderResult = await db.select()
        .from(productionOrders)
        .where(eq(productionOrders.orderId, id))
        .limit(1);

      if (productionOrderResult.length > 0) {
        await db.update(productionOrders)
          .set({ hasUnreadNotes: false })
          .where(eq(productionOrders.orderId, id));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notes as read:", error);
      res.status(500).json({ error: "Failed to mark notes as read" });
    }
  });

  // Producer profile management
  app.get("/api/producers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user || user.role !== 'producer') {
        return res.status(404).json({ error: "Producer not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch producer" });
    }
  });

  app.put("/api/producers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, specialty, address } = req.body;

      const updatedUser = await storage.updateUser(id, {
        name,
        phone,
        specialty,
        address
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "Producer not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to update producer" });
    }
  });

  app.put("/api/producers/:id/change-password", async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "Producer not found" });
      }

      // Verify current password
      if (user.password !== currentPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const updatedUser = await storage.updateUser(id, {
        password: newPassword
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // In a real application, you would send an actual email
      // For now, we'll just return success
      console.log(`Password reset requested for: ${email}`);

      res.json({
        success: true,
        message: "Password reset instructions sent to your email"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to process password reset" });
    }
  });

  // Get production order details for producer
  app.get("/api/production-orders/:id", async (req, res) => {
    try {
      const productionOrder = await storage.getProductionOrder(req.params.id);
      if (!productionOrder) {
        return res.status(404).json({ error: "Production order not found" });
      }

      // Get related order
      const order = await storage.getOrder(productionOrder.orderId);
      if (!order) {
        return res.status(404).json({ error: "Related order not found" });
      }

      // Get client info - try multiple approaches
      let clientName = 'Cliente não encontrado';
      let clientAddress = 'Endereço não informado';
      let clientPhone = null;
      let clientEmail = null;

      console.log(`Getting client details for order ${order.id}, clientId: ${order.clientId}`);

      // Method 1: Try to get client record directly by ID
      const clientRecord = await storage.getClient(order.clientId);
      if (clientRecord) {
        console.log(`Found client record for details:`, clientRecord);
        clientName = clientRecord.name;
        clientAddress = clientRecord.address || 'Endereço não informado';
        clientPhone = clientRecord.phone;
        clientEmail = clientRecord.email;
      } else {
        // Method 2: Try to find client record by userId
        const clientByUserId = await storage.getClientByUserId(order.clientId);
        if (clientByUserId) {
          console.log(`Found client by userId for details:`, clientByUserId);
          clientName = clientByUserId.name;
          clientAddress = clientByUserId.address || 'Endereço não informado';
          clientPhone = clientByUserId.phone;
          clientEmail = clientByUserId.email;
        } else {
          // Method 3: Fallback to user table
          const clientUser = await storage.getUser(order.clientId);
          if (clientUser) {
            console.log(`Found user record for details:`, clientUser);
            clientName = clientUser.name;
            clientPhone = clientUser.phone;
            clientEmail = clientUser.email;
            clientAddress = clientUser.address || 'Endereço não informado';
          } else {
            console.log(`No client found for details with ID: ${order.clientId}`);
          }
        }
      }

      // Get budget items if order has budgetId
      let budgetItems = [];
      let budgetPhotos = [];
      if (order.budgetId) {
        budgetItems = await storage.getBudgetItems(order.budgetId);
        budgetPhotos = await storage.getBudgetPhotos(order.budgetId);

        // Enrich items with product data
        budgetItems = await Promise.all(
          budgetItems.map(async (item) => {
            const product = await storage.getProduct(item.productId);
            return {
              ...item,
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

      const enrichedPO = {
        ...productionOrder,
        order: {
          ...order,
          clientName: clientName,
          clientAddress: clientAddress,
          clientPhone: clientPhone,
          clientEmail: clientEmail,
          shippingAddress: order.deliveryType === 'pickup'
            ? 'Sede Principal - Retirada no Local'
            : clientAddress,
          deliveryType: order.deliveryType || 'delivery'
        },
        items: budgetItems,
        photos: budgetPhotos.map(photo => photo.imageUrl || photo.photoUrl)
      };

      res.json(enrichedPO);
    } catch (error) {
      console.error('Error fetching production order:', error);
      res.status(500).json({ error: "Failed to fetch production order" });
    }
  });

  // Get order timeline for client view
  app.get("/api/orders/:id/timeline", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Get enriched order data
      const client = await storage.getUser(order.clientId);
      const vendor = await storage.getUser(order.vendorId);
      const producer = order.producerId ? await storage.getUser(order.producerId) : null;

      // Get production order if exists
      let productionOrder = null;
      if (order.producerId) {
        const productionOrders = await storage.getProductionOrdersByOrder(order.id);
        productionOrder = productionOrders[0] || null;
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
          console.log("Error fetching budget info for timeline:", order.id, error);
        }
      }

      // Use budget down payment if available, otherwise use calculated payments
      const actualPaidValue = budgetDownPayment > 0 ? budgetDownPayment : totalPaid;
      const totalValue = parseFloat(order.totalValue);
      const remainingBalance = Math.max(0, totalValue - actualPaidValue);

      // Create enriched order with all information including updated payment values
      const enrichedOrder = {
        ...order,
        paidValue: actualPaidValue.toFixed(2), // Use budget down payment or payments
        remainingValue: remainingBalance.toFixed(2), // Add remaining balance
        clientName: client?.name || 'Unknown',
        vendorName: vendor?.name || 'Unknown',
        producerName: producer?.name || null,
        trackingCode: order.trackingCode || productionOrder?.trackingCode || null,
        productionOrder,
        payments: confirmedPayments, // Include only confirmed payments
        budgetInfo: originalBudgetInfo // Include original budget payment info
      };

      const timeline = [
        {
          id: 'created',
          status: 'created',
          title: 'Pedido Criado',
          description: 'Pedido foi criado e está aguardando confirmação',
          date: order.createdAt,
          completed: true,
          icon: 'file-plus'
        },
        {
          id: 'confirmed',
          status: 'confirmed',
          title: 'Pedido Confirmado',
          description: 'Pedido foi confirmado e enviado para produção',
          date: ['confirmed', 'production', 'ready', 'shipped', 'delivered', 'completed'].includes(order.status) ? order.updatedAt : null,
          completed: ['confirmed', 'production', 'ready', 'shipped', 'delivered', 'completed'].includes(order.status),
          icon: 'check-circle'
        },
        {
          id: 'production',
          status: 'production',
          title: 'Em Produção',
          description: productionOrder?.notes || 'Pedido em processo de produção',
          date: productionOrder?.acceptedAt || (['production', 'ready', 'shipped', 'delivered', 'completed'].includes(order.status) ? order.updatedAt : null),
          completed: ['production', 'ready', 'shipped', 'delivered', 'completed'].includes(order.status),
          icon: 'settings',
          estimatedDelivery: productionOrder?.deliveryDeadline || null
        },
        {
          id: 'ready',
          status: 'ready',
          title: 'Pronto para Envio',
          description: 'Produto finalizado e pronto para envio',
          date: ['ready', 'shipped', 'delivered', 'completed'].includes(order.status) ? order.updatedAt : null,
          completed: ['ready', 'shipped', 'delivered', 'completed'].includes(order.status),
          icon: 'package'
        },
        {
          id: 'shipped',
          status: 'shipped',
          title: 'Enviado',
          description: enrichedOrder.trackingCode ? `Código de rastreamento: ${enrichedOrder.trackingCode}` : 'Produto foi enviado para o cliente',
          date: ['shipped', 'delivered', 'completed'].includes(order.status) ? order.updatedAt : null,
          completed: ['shipped', 'delivered', 'completed'].includes(order.status),
          icon: 'truck',
          trackingCode: enrichedOrder.trackingCode
        },
        {
          id: 'completed',
          status: 'completed',
          title: 'Entregue',
          description: 'Pedido foi entregue com sucesso',
          date: ['delivered', 'completed'].includes(order.status) ? order.updatedAt : null,
          completed: ['delivered', 'completed'].includes(order.status),
          icon: 'check-circle-2'
        }
      ];

      res.json({
        order: enrichedOrder,
        timeline
      });
    } catch (error) {
      console.error('Error fetching order timeline:', error);
      res.status(500).json({ error: "Failed to fetch order timeline" });
    }
  });

  // Image upload for budget customizations using local file system
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo foi enviado" });

      const { mimetype, size, buffer, originalname } = req.file;
      if (!mimetype.startsWith("image/")) {
        return res.status(400).json({ error: "Apenas imagens são permitidas" });
      }
      if (size > 5 * 1024 * 1024) { // 5MB
        return res.status(400).json({ error: "Imagem muito grande. Limite de 5MB." });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const extension = originalname.split('.').pop() || 'jpg';
      const filename = `image-${timestamp}-${randomStr}.${extension}`;

      // Save to public directory (accessible by Vite)
      const fs = await import('fs');
      const path = await import('path');

      // Create public/uploads directory if it doesn't exist
      const uploadsDir = path.default.join(process.cwd(), 'public', 'uploads');
      if (!fs.default.existsSync(uploadsDir)) {
        fs.default.mkdirSync(uploadsDir, { recursive: true });
      }

      // Save file
      const filePath = path.default.join(uploadsDir, filename);
      fs.default.writeFileSync(filePath, buffer);

      // Return public URL that Vite can serve
      const url = `/uploads/${filename}`;
      return res.json({ url });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: "Erro ao processar upload" });
    }
  });

  // Commission management routes
  app.get("/api/commissions", async (req, res) => {
    try {
      const commissions = await storage.getAllCommissions();

      // Enrich with user and order data
      const enrichedCommissions = await Promise.all(
        commissions.map(async (commission) => {
          const order = await storage.getOrder(commission.orderId);
          const vendor = commission.vendorId ? await storage.getUser(commission.vendorId) : null;
          const partner = commission.partnerId ? await storage.getUser(commission.partnerId) : null;
          const client = order ? await storage.getUser(order.clientId) : null;

          return {
            ...commission,
            orderNumber: order?.orderNumber || commission.orderNumber || 'N/A',
            orderValue: order ? order.totalValue : commission.orderValue || '0.00',
            vendorName: vendor?.name || null,
            partnerName: partner?.name || null,
            clientName: client?.name || 'Unknown'
          };
        })
      );

      res.json(enrichedCommissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });

  app.put("/api/commissions/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const updatedCommission = await storage.updateCommissionStatus(req.params.id, status);

      if (!updatedCommission) {
        return res.status(404).json({ error: "Commission not found" });
      }

      res.json(updatedCommission);
    } catch (error) {
      res.status(500).json({ error: "Failed to update commission status" });
    }
  });

  // Partners management
  app.get("/api/partners", async (req, res) => {
    try {
      const users = await storage.getUsers();
      const partners = users.filter(user => user.role === 'partner');

      const partnersWithInfo = await Promise.all(
        partners.map(async (partner) => {
          const partnerInfo = await storage.getPartner(partner.id);
          const commissions = await storage.getCommissionsByVendor(partner.id);
          const totalCommissions = commissions.reduce((sum, c) => sum + parseFloat(c.amount), 0);

          return {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            username: partner.username,
            commissionRate: partnerInfo?.commissionRate || '15.00',
            isActive: partnerInfo?.isActive || true,
            totalCommissions
          };
        })
      );

      res.json(partnersWithInfo);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  app.post("/api/partners", async (req, res) => {
    try {
      const { name, email, username, commissionRate } = req.body;

      const user = await storage.createPartner({
        username,
        name,
        email,
        commissionRate: commissionRate || '15.00'
      });

      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ error: "Failed to create partner" });
    }
  });

  app.put("/api/partners/:partnerId/commission", async (req, res) => {
    try {
      const { partnerId } = req.params;
      const { commissionRate } = req.body;

      await storage.updatePartnerCommission(partnerId, commissionRate);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update partner commission" });
    }
  });

  // Commission settings
  app.get("/api/commission-settings", async (req, res) => {
    try {
      const settings = await storage.getCommissionSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch commission settings" });
    }
  });

  app.put("/api/commission-settings", async (req, res) => {
    try {
      const settings = await storage.updateCommissionSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update commission settings" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { name, email, username, password, role } = req.body;
      const newUser = await storage.createUser({
        name,
        email,
        username,
        password,
        role,
        isActive: true // Default to active
      });
      res.json(newUser);
    } catch (error) {
      console.error("Failed to create user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Exclude password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, username, role, isActive, specialty, address, phone } = req.body;

      const updatedUser = await storage.updateUser(id, {
        name,
        email,
        username,
        role,
        isActive,
        specialty,
        address,
        phone
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // ===== FINANCIAL MODULE ROUTES =====

  // Accounts Receivable routes
  app.get("/api/finance/receivables", async (req, res) => {
    try {
      const receivables = await storage.getAccountsReceivable();

      // Enrich with order and client data
      const enrichedReceivables = await Promise.all(
        receivables.map(async (receivable) => {
          const order = await storage.getOrder(receivable.orderId);
          let clientName = 'Cliente não identificado';

          if (order) {
            // Try to get client details
            const client = await storage.getClient(order.clientId);
            if (client) {
              clientName = client.name;
            } else {
              // Fallback to user table
              const user = await storage.getUser(order.clientId);
              if (user) {
                clientName = user.name;
              }
            }
          }

          return {
            ...receivable,
            orderNumber: order?.orderNumber || `#${receivable.orderId}`,
            clientName: clientName,
            amount: receivable.amount.toString(),
            receivedAmount: receivable.receivedAmount.toString(),
            dueDate: receivable.dueDate ? new Date(receivable.dueDate).toISOString() : null,
            createdAt: receivable.createdAt ? new Date(receivable.createdAt).toISOString() : null,
            updatedAt: receivable.updatedAt ? new Date(receivable.updatedAt).toISOString() : null
          };
        })
      );

      res.json(enrichedReceivables);
    } catch (error) {
      console.error("Failed to fetch receivables:", error);
      res.status(500).json({ error: "Failed to fetch receivables" });
    }
  });

  app.get("/api/finance/receivables/by-order/:orderId", async (req, res) => {
    try {
      const receivables = await storage.getAccountsReceivableByOrder(req.params.orderId);
      res.json(receivables);
    } catch (error) {
      console.error("Failed to fetch receivables by order:", error);
      res.status(500).json({ error: "Failed to fetch receivables by order" });
    }
  });

  app.post("/api/finance/receivables", async (req, res) => {
    try {
      const receivable = await storage.createAccountsReceivable(req.body);
      res.json(receivable);
    } catch (error) {
      console.error("Failed to create receivable:", error);
      res.status(500).json({ error: "Failed to create receivable" });
    }
  });

  app.patch("/api/finance/receivables/:id", async (req, res) => {
    try {
      const receivable = await storage.updateAccountsReceivable(req.params.id, req.body);
      if (!receivable) {
        return res.status(404).json({ error: "Receivable not found" });
      }
      res.json(receivable);
    } catch (error) {
      console.error("Failed to update receivable:", error);
      res.status(500).json({ error: "Failed to update receivable" });
    }
  });

  // Manual payment for receivables
  app.post("/api/receivables/:id/payment", async (req, res) => {
    try {
      const { amount, method, transactionId, notes } = req.body;
      const receivableId = req.params.id;

      // Get the receivable to find the actual order ID
      const receivable = await storage.getAccountsReceivable().then(receivables =>
        receivables.find(r => r.id === receivableId)
      );

      if (!receivable) {
        return res.status(404).json({ error: "Conta a receber não encontrada" });
      }

      // Create a confirmed payment record using the actual order ID
      const payment = await storage.createPayment({
        orderId: receivable.orderId, // Use the actual order ID
        amount: amount.toString(),
        method: method || "manual",
        status: "confirmed",
        transactionId: transactionId || `MANUAL-${Date.now()}`,
        notes: notes || "",
        paidAt: new Date()
      });

      // Update the receivable with new received amount
      const newReceivedAmount = parseFloat(receivable.receivedAmount) + parseFloat(amount);
      const totalAmount = parseFloat(receivable.amount);

      let newStatus: 'pending' | 'partial' | 'paid' | 'overdue' = receivable.status;
      if (newReceivedAmount >= totalAmount) {
        newStatus = 'paid';
      } else if (newReceivedAmount > 0) {
        newStatus = 'partial';
      }

      await storage.updateAccountsReceivable(receivableId, {
        receivedAmount: newReceivedAmount.toFixed(2),
        status: newStatus
      });

      res.json({ success: true, payment });
    } catch (error) {
      console.error("Error creating manual payment:", error);
      res.status(500).json({ error: "Failed to create manual payment" });
    }
  });

  // Payment allocation routes
  app.post("/api/finance/receivables/:id/allocate-payment", async (req, res) => {
    try {
      const { paymentId, amount } = req.body;
      const allocation = await storage.allocatePaymentToReceivable(paymentId, req.params.id, amount);
      res.json(allocation);
    } catch (error) {
      console.error("Failed to allocate payment:", error);
      res.status(500).json({ error: "Failed to allocate payment" });
    }
  });

  // Expense Notes routes
  app.get("/api/finance/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenseNotes();
      res.json(expenses);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/finance/expenses", async (req, res) => {
    try {
      const expense = await storage.createExpenseNote(req.body);
      res.json(expense);
    } catch (error) {
      console.error("Failed to create expense:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  // Get orders with pending balance for reconciliation
  app.get("/api/finance/pending-orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const clients = await storage.getClients();
      const users = await storage.getUsers();

      const pendingOrders = await Promise.all(
        orders
          .filter(order => {
            const totalValue = parseFloat(order.totalValue);
            const paidValue = parseFloat(order.paidValue || '0');
            return paidValue < totalValue && order.status !== 'cancelled'; // Has pending balance and not cancelled
          })
          .map(async (order) => {
            // Try to get client by direct ID first
            let clientName = 'Unknown';
            const client = clients.find(c => c.id === order.clientId);
            if (client) {
              clientName = client.name;
            } else {
              // Fallback to user table
              const clientUser = users.find(u => u.id === order.clientId);
              if (clientUser) {
                clientName = clientUser.name;
              }
            }

            const vendor = users.find(v => v.id === order.vendorId);
            const producer = order.producerId ? users.find(p => p.id === order.producerId) : null;

            // Get payment history for this order
            const payments = await storage.getPaymentsByOrder(order.id);
            const confirmedPayments = payments.filter(p => p.status === 'confirmed');

            // Get budget information if order was converted from budget
            let budgetInfo = null;
            if (order.budgetId) {
              try {
                const budget = await storage.getBudget(order.budgetId);
                const budgetPaymentInfo = await storage.getBudgetPaymentInfo(order.budgetId);

                if (budgetPaymentInfo) {
                  budgetInfo = {
                    downPayment: parseFloat(budgetPaymentInfo.downPayment || '0'),
                    remainingAmount: parseFloat(budgetPaymentInfo.remainingAmount || '0'),
                    installments: budgetPaymentInfo.installments || 1,
                    paymentMethodId: budgetPaymentInfo.paymentMethodId,
                    shippingMethodId: budgetPaymentInfo.shippingMethodId
                  };
                }
              } catch (error) {
                console.log("Error fetching budget info for pending order:", order.id, error);
              }
            }

            const totalValue = parseFloat(order.totalValue);
            const paidValue = parseFloat(order.paidValue || '0');
            const remainingBalance = totalValue - paidValue;

            return {
              ...order,
              clientName,
              vendorName: vendor?.name || 'Unknown',
              producerName: producer?.name || null,
              remainingBalance: remainingBalance.toFixed(2),
              budgetInfo,
              paymentHistory: confirmedPayments.map(p => ({
                id: p.id,
                amount: p.amount,
                method: p.method,
                paidAt: p.paidAt,
                transactionId: p.transactionId
              })),
              paymentCount: confirmedPayments.length,
              paymentPercentage: Math.round((paidValue / totalValue) * 100)
            };
          })
      );

      // Sort by creation date (newest first) and then by remaining balance (highest first)
      const sortedOrders = pendingOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        const balanceA = parseFloat(a.remainingBalance);
        const balanceB = parseFloat(b.remainingBalance);

        // First by date (newest first), then by balance (highest first)
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        return balanceB - balanceA;
      });

      console.log(`Returning ${sortedOrders.length} pending orders for reconciliation`);
      res.json(sortedOrders);
    } catch (error) {
      console.error("Failed to fetch pending orders:", error);
      res.status(500).json({ error: "Failed to fetch pending orders" });
    }
  });

  // Associate bank transaction with order payment
  app.post("/api/finance/associate-payment", async (req, res) => {
    try {
      const { transactionId, orderId, amount } = req.body;

      console.log("Associating payment:", { transactionId, orderId, amount });

      if (!transactionId || !orderId || !amount) {
        return res.status(400).json({ error: "Transaction ID, Order ID e valor são obrigatórios" });
      }

      // Get order to validate
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Get transaction to validate
      const bankTransactions = await storage.getBankTransactions();
      const transaction = bankTransactions.find(t => t.id === transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "Transação bancária não encontrada" });
      }

      if (transaction.status === 'matched') {
        return res.status(400).json({ error: "Esta transação já foi conciliada com outro pagamento" });
      }

      // Update transaction as matched
      await storage.updateBankTransaction(transactionId, {
        status: 'matched',
        matchedOrderId: orderId,
        matchedAt: new Date()
      });

      // Create payment record with proper description
      const payment = await storage.createPayment({
        orderId,
        amount: parseFloat(amount).toFixed(2),
        method: 'bank_transfer', // Assume bank transfer for OFX transactions
        status: 'confirmed',
        transactionId: `BANK-${transactionId}`,
        paidAt: transaction.date || new Date()
      });

      // Get updated order to return current state
      const updatedOrder = await storage.getOrder(orderId);

      console.log("Payment association successful:", {
        paymentId: payment.id,
        amount: payment.amount,
        orderPaidValue: updatedOrder?.paidValue
      });

      res.json({
        success: true,
        payment,
        order: updatedOrder,
        message: "Pagamento confirmado e associado ao pedido com sucesso"
      });
    } catch (error) {
      console.error("Failed to associate payment:", error);
      res.status(500).json({
        error: "Erro ao associar pagamento",
        details: (error as Error).message
      });
    }
  });

  app.patch("/api/finance/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.updateExpenseNote(req.params.id, req.body);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Failed to update expense:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  // Commission Payouts routes
  app.get("/api/finance/commission-payouts", async (req, res) => {
    try {
      const payouts = await storage.getCommissionPayouts();
      res.json(payouts);
    } catch (error) {
      console.error("Failed to fetch commission payouts:", error);
      res.status(500).json({ error: "Failed to fetch commission payouts" });
    }
  });

  app.get("/api/finance/commission-payouts/user/:userId/:type", async (req, res) => {
    try {
      const { userId, type } = req.params;
      const payouts = await storage.getCommissionPayoutsByUser(userId, type as 'vendor' | 'partner');
      res.json(payouts);
    } catch (error) {
      console.error("Failed to fetch user commission payouts:", error);
      res.status(500).json({ error: "Failed to fetch user commission payouts" });
    }
  });

  app.post("/api/finance/commission-payouts", async (req, res) => {
    try {
      const payout = await storage.createCommissionPayout(req.body);
      res.json(payout);
    } catch (error) {
      console.error("Failed to create commission payout:", error);
      res.status(500).json({ error: "Failed to create commission payout" });
    }
  });

  app.patch("/api/finance/commission-payouts/:id", async (req, res) => {
    try {
      const payout = await storage.updateCommissionPayout(req.params.id, req.body);
      if (!payout) {
        return res.status(404).json({ error: "Commission payout not found" });
      }
      res.json(payout);
    } catch (error) {
      console.error("Failed to update commission payout:", error);
      res.status(500).json({ error: "Failed to update commission payout" });
    }
  });

  // Bank Imports & Transactions routes
  app.get("/api/finance/bank-imports", async (req, res) => {
    try {
      const imports = await storage.getBankImports();
      res.json(imports);
    } catch (error) {
      console.error("Failed to fetch bank imports:", error);
      res.status(500).json({ error: "Failed to fetch bank imports" });
    }
  });

  app.post("/api/finance/bank-imports", async (req, res) => {
    try {
      const bankImport = await storage.createBankImport(req.body);
      res.json(bankImport);
    } catch (error) {
      console.error("Failed to create bank import:", error);
      res.status(500).json({ error: "Failed to create bank import" });
    }
  });

  app.get("/api/finance/bank-imports/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getBankTransactionsByImport(req.params.id);
      res.json(transactions);
    } catch (error) {
      console.error("Failed to fetch bank transactions:", error);
      res.status(500).json({ error: "Failed to fetch bank transactions" });
    }
  });

  app.get("/api/finance/bank-transactions", async (req, res) => {
    try {
      const transactions = await storage.getBankTransactions();
      // Garantir que todas as transações tenham status padrão se não tiver
      const normalizedTransactions = transactions.map(txn => ({
        ...txn,
        status: txn.status || 'unmatched'
      }));
      res.json(normalizedTransactions);
    } catch (error) {
      console.error("Failed to fetch bank transactions:", error);
      res.status(500).json({ error: "Failed to fetch bank transactions" });
    }
  });

  app.post("/api/finance/bank-transactions", async (req, res) => {
    try {
      const transaction = await storage.createBankTransaction(req.body);
      res.json(transaction);
    } catch (error) {
      console.error("Failed to create bank transaction:", error);
      res.status(500).json({ error: "Failed to create bank transaction" });
    }
  });

  app.patch("/api/finance/bank-transactions/:id/match", async (req, res) => {
    try {
      const { receivableId } = req.body;
      const transaction = await storage.matchTransactionToReceivable(req.params.id, receivableId);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      console.error("Failed to match transaction:", error);
      res.status(500).json({ error: "Failed to match transaction" });
    }
  });



  // Producer payment association route
  app.post("/api/finance/producer-payments/associate-payment", async (req, res) => {
    try {
      const { transactionIds, productionOrderId } = req.body;

      if (!transactionIds || !Array.isArray(transactionIds) || !productionOrderId) {
        return res.status(400).json({ error: "TransactionIds e productionOrderId são obrigatórios" });
      }

      console.log(`Associating ${transactionIds.length} transactions to production order ${productionOrderId}`);

      // Get the production order
      const productionOrder = await storage.getProductionOrder(productionOrderId);
      if (!productionOrder) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      // Get producer payment
      const producerPayments = await storage.getProducerPaymentsByProducer(productionOrder.producerId);
      const payment = producerPayments.find(p => p.productionOrderId === productionOrderId);

      if (!payment) {
        return res.status(404).json({ error: "Pagamento do produtor não encontrado" });
      }

      // Calculate total transaction amount
      let totalTransactionAmount = 0;
      let processedTransactions = 0;
      let hasAdjustment = false;
      let difference = 0;

      // Process each transaction
      for (const transactionId of transactionIds) {
        const transaction = await storage.getBankTransaction(transactionId);
        if (!transaction) {
          console.warn(`Transaction ${transactionId} not found, skipping`);
          continue;
        }

        // Verify this is a debit transaction (outgoing payment)
        const transactionAmount = parseFloat(transaction.amount);
        if (transactionAmount >= 0) {
          console.warn(`Transaction ${transactionId} is not a debit, skipping`);
          continue;
        }

        // Check if already matched
        if (transaction.status === 'matched') {
          console.warn(`Transaction ${transactionId} already matched, skipping`);
          continue;
        }

        // Update bank transaction status
        await storage.updateBankTransaction(transactionId, {
          status: 'matched',
          matchedOrderId: productionOrder.orderId, // Link to the main order for reference
          matchedAt: new Date(),
          notes: `Conciliado com pagamento de produtor ${productionOrder.producerId} - Ordem ${productionOrder.id}`
        });

        totalTransactionAmount += Math.abs(transactionAmount); // Convert to positive for comparison
        processedTransactions++;
      }

      if (processedTransactions === 0) {
        return res.status(400).json({ error: "Nenhuma transação válida foi processada" });
      }

      // Update production order payment status
      await storage.updateProductionOrder(productionOrderId, {
        producerPaymentStatus: 'paid',
        paidAt: new Date()
      });

      // Get producer name for response
      const producer = await storage.getUser(productionOrder.producerId);

      // Check for differences between transaction total and production order value
      const productionOrderValue = parseFloat(productionOrder.producerValue || '0');
      difference = totalTransactionAmount - productionOrderValue;

      if (Math.abs(difference) > 0.01) { // More than 1 cent difference
        hasAdjustment = true;

        // Create adjustment record if needed
        if (difference !== 0) {
          await storage.createExpenseNote({
            type: difference > 0 ? 'adjustment_surplus' : 'adjustment_shortage',
            vendorId: producer?.id, // Use producer ID for the adjustment
            amount: Math.abs(difference).toFixed(2),
            description: `Ajuste de conciliação - ${difference > 0 ? 'sobra' : 'falta'} na conciliação do pagamento do produtor ${producer?.name || productionOrder.producerId}`,
            status: 'pending', // Needs review
            date: new Date()
          });
        }
      }

      console.log(`Successfully associated ${processedTransactions} transactions with payment for producer ${producer?.name || productionOrder.producerId}`);

      res.json({
        success: true,
        message: `Pagamento conciliado com sucesso`,
        payment: {
          producerName: producer?.name || 'Desconhecido',
          amount: productionOrderValue.toFixed(2),
          transactionsProcessed: processedTransactions,
          hasAdjustment,
          difference: difference.toFixed(2)
        }
      });

    } catch (error) {
      console.error("Error associating producer payment:", error);
      res.status(500).json({ error: "Failed to associate producer payment: " + error.message });
    }
  });

  // OFX Import route with file processing
  app.post("/api/finance/ofx-import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }

      console.log("Processing OFX file:", req.file.originalname, "Size:", req.file.size);

      // Validate file type
      if (!req.file.originalname.toLowerCase().endsWith('.ofx')) {
        return res.status(400).json({ error: "Apenas arquivos .ofx são aceitos" });
      }

      // Validate file size (max 10MB)
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "Arquivo muito grande. Máximo 10MB." });
      }

      const { transactions } = await parseOFXBuffer(req.file.buffer);

      if (!transactions || transactions.length === 0) {
        return res.status(400).json({
          error: "Nenhuma transação encontrada no arquivo OFX"
        });
      }

      console.log(`Parsed ${transactions.length} transactions from OFX`);

      // Create bank import record
      const bankImport = await storage.createBankImport({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        totalTransactions: transactions.length,
        importedBy: 'admin-1', // In production, get from authenticated user
        status: 'completed'
      });

      // Create bank transactions
      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;
      const dateWarnings = [];

      for (const transaction of transactions) {
        try {
          // Check if transaction already exists by fitId
          const existing = await storage.getBankTransactionByFitId(transaction.fitId);
          if (existing) {
            duplicateCount++;
            continue;
          }

          // Track date warnings
          if (!transaction.hasValidDate) {
            dateWarnings.push(transaction.fitId);
          }

          // Validate transaction data
          if (!transaction.amount || isNaN(parseFloat(transaction.amount))) {
            console.log('Invalid transaction amount:', transaction.amount);
            errorCount++;
            continue;
          }

          let notes = parseFloat(transaction.amount) > 0
            ? 'Entrada - Disponível para conciliação com contas a receber'
            : 'Saída - Disponível para conciliação com contas a pagar e pagamentos de produtores';

          // Add date warning to notes if applicable
          if (!transaction.hasValidDate) {
            notes += ' (Data gerada automaticamente - não encontrada no OFX)';
          }

          await storage.createBankTransaction({
            importId: bankImport.id,
            fitId: transaction.fitId,
            amount: transaction.amount,
            date: transaction.dtPosted,
            description: transaction.memo || 'Transação sem descrição',
            type: transaction.type,
            status: 'unmatched',
            bankRef: transaction.refNum,
            notes: notes
          });
          successCount++;
        } catch (error) {
          console.error('Error creating transaction:', error);
          errorCount++;
        }
      }

      console.log(`Import completed: ${successCount} new transactions, ${duplicateCount} duplicates, ${errorCount} errors`);

      let message = `Importadas ${successCount} transações com sucesso.`;
      if (duplicateCount > 0) {
        message += ` ${duplicateCount} duplicatas ignoradas.`;
      }
      if (errorCount > 0) {
        message += ` ${errorCount} transações com erro.`;
      }
      if (dateWarnings.length > 0) {
        message += ` ${dateWarnings.length} com data gerada automaticamente.`;
      }


      res.json({
        success: true,
        importId: bankImport.id,
        message: message,
        totalTransactions: transactions.length,
        newTransactions: successCount,
        duplicates: duplicateCount,
        errors: errorCount,
        dateWarnings: dateWarnings.length
      });

    } catch (error) {
      console.error("Error importing OFX:", error);
      res.status(500).json({
        error: "Erro ao processar arquivo OFX",
        details: error.message
      });
    }
  });

  // Producer Payments API
  app.get("/api/finance/producer-payments", async (req, res) => {
    try {
      const productionOrders = await storage.getProductionOrders();

      const producerPayments = await Promise.all(
        productionOrders
          .filter(po => po.producerValue && parseFloat(po.producerValue) > 0)
          .map(async (po) => {
            const order = await storage.getOrder(po.orderId);
            const producer = await storage.getUser(po.producerId);

            let clientName = 'Unknown';
            if (order) {
              const client = await storage.getClient(order.clientId);
              if (client) {
                clientName = client.name;
              }
            }

            return {
              id: po.id,
              productionOrderId: po.id,
              producerId: po.producerId,
              producerName: producer?.name || 'Unknown',
              amount: po.producerValue,
              status: po.producerPaymentStatus || 'pending',
              orderNumber: order?.orderNumber || 'Unknown',
              product: order?.product || po.product || 'Unknown',
              clientName: clientName,
              deadline: po.deadline,
              notes: po.producerNotes,
              createdAt: po.acceptedAt || new Date()
            };
          })
      );

      res.json(producerPayments);
    } catch (error) {
      console.error("Failed to fetch producer payments:", error);
      res.status(500).json({ error: "Failed to fetch producer payments" });
    }
  });

  app.get("/api/finance/producer-payments/pending", async (req, res) => {
    try {
      const producerPayments = await storage.getProducerPayments();

      // Enrich with production order and producer data
      const enrichedPayments = await Promise.all(
        producerPayments
          .filter(payment => payment.status === 'approved' || payment.status === 'pending')
          .map(async (payment) => {
            const productionOrder = await storage.getProductionOrder(payment.productionOrderId);
            const producer = await storage.getUser(payment.producerId);
            let order = null;
            let clientName = 'Unknown';

            if (productionOrder) {
              order = await storage.getOrder(productionOrder.orderId);

              if (order) {
                // Get client name
                const clientRecord = await storage.getClient(order.clientId);
                if (clientRecord) {
                  clientName = clientRecord.name;
                } else {
                  const clientByUserId = await storage.getClientByUserId(order.clientId);
                  if (clientByUserId) {
                    clientName = clientByUserId.name;
                  } else {
                    const clientUser = await storage.getUser(order.clientId);
                    if (clientUser) {
                      clientName = clientUser.name;
                    }
                  }
                }
              }
            }

            return {
              ...payment,
              productionOrder,
              order,
              producerName: producer?.name || 'Unknown',
              orderNumber: order?.orderNumber || 'Unknown',
              product: order?.product || 'Unknown',
              clientName: clientName
            };
          })
      );

      res.json(enrichedPayments);
    } catch (error) {
      console.error("Error fetching pending producer payments:", error);
      res.status(500).json({ error: "Failed to fetch pending producer payments" });
    }
  });

  app.post("/api/finance/producer-payments/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;

      // Buscar o pagamento de produtor
      const producerPayment = await storage.getProducerPayment(id);
      if (!producerPayment) {
        return res.status(404).json({ error: "Producer payment not found" });
      }

      // Atualizar status para aprovado
      const updated = await storage.updateProducerPayment(id, {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: 'admin' // Em produção, usar req.user.id
      });

      if (!updated) {
        return res.status(404).json({ error: "Failed to update producer payment" });
      }

      res.json({
        success: true,
        message: "Pagamento aprovado com sucesso",
        payment: updated
      });
    } catch (error) {
      console.error("Failed to approve producer payment:", error);
      res.status(500).json({ error: "Failed to approve producer payment" });
    }
  });

  // Producer payment association route
  app.post("/api/finance/producer-payments/associate-payment", async (req, res) => {
    try {
      const { transactionId, producerPaymentId, amount } = req.body;

      console.log("Associating producer payment:", { transactionId, producerPaymentId, amount });

      // Get the bank transaction
      const transaction = await storage.getBankTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }

      // Verify this is a debit transaction (outgoing payment)
      if (parseFloat(transaction.amount) >= 0) {
        return res.status(400).json({ error: "Esta transação não é uma saída (débito)" });
      }

      // Get the producer payment
      const producerPayment = await storage.getProducerPayment(producerPaymentId);
      if (!producerPayment) {
        return res.status(404).json({ error: "Pagamento de produtor não encontrado" });
      }

      // Update producer payment status to paid
      await storage.updateProducerPayment(producerPaymentId, {
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: 'bank_transfer'
      });

      // Update bank transaction status
      await storage.updateBankTransaction(transactionId, {
        status: 'matched',
        paidAt: new Date(),
        notes: `Conciliado com pagamento de produtor ${producerPayment.producerId} - Conta a pagar`
      });

      res.json({
        success: true,
        message: "Pagamento de produtor conciliado com sucesso"
      });

    } catch (error) {
      console.error("Error associating producer payment:", error);
      res.status(500).json({ error: "Erro ao conciliar pagamento de produtor" });
    }
  });

  // Producer-specific production orders
  app.get("/api/production-orders/producer/:producerId", async (req, res) => {
    try {
      const { producerId } = req.params;
      console.log(`API: Fetching production orders for producer: ${producerId}`);

      // Get production orders for this producer
      const productionOrders = await storage.getProductionOrdersByProducer(producerId);
      const orders = await storage.getOrders();
      const clients = await storage.getClients();

      // Enrich production orders with order and client data
      const productionOrdersList = productionOrders
        .map(po => {
          const order = orders.find(o => o.id === po.orderId);
          if (!order) return null;

          const client = clients.find(c => c.id === order.clientId);

          return {
            id: po.id,
            orderId: po.orderId,
            status: po.status,
            deadline: po.deadline,
            acceptedAt: po.acceptedAt,
            completedAt: po.completedAt,
            notes: po.notes,
            deliveryDeadline: po.deliveryDeadline,
            hasUnreadNotes: po.hasUnreadNotes,
            lastNoteAt: po.lastNoteAt,
            producerValue: po.producerValue,
            // Order data
            orderNumber: order.orderNumber,
            product: order.product,
            description: order.description,
            totalValue: order.totalValue,
            // Client data
            clientName: client?.name || null,
          };
        })
        .filter(po => po !== null)
        .sort((a, b) => {
          // Sort by acceptedAt descending
          if (!a.acceptedAt && !b.acceptedAt) return 0;
          if (!a.acceptedAt) return 1;
          if (!b.acceptedAt) return -1;
          return new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime();
        });

      console.log(`Producer orders for ${producerId}:`, productionOrdersList.length, 'orders found');
      console.log('Orders data:', JSON.stringify(productionOrdersList, null, 2));

      res.json(productionOrdersList);
    } catch (error) {
      console.error("Error fetching producer production orders:", error);
      res.status(500).json({ error: "Failed to fetch production orders" });
    }
  });

  // Corrected route for associating multiple payments with better validation and error handling
  app.post("/api/finance/associate-multiple-payments", async (req, res) => {
    try {
      const { transactions, orderId, totalAmount } = req.body;

      console.log("Associate multiple payments request:", { transactions, orderId, totalAmount });

      // Validação detalhada
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.error("Invalid transactions:", transactions);
        return res.status(400).json({ error: "Transações são obrigatórias e devem ser um array" });
      }

      if (!orderId || typeof orderId !== 'string') {
        console.error("Invalid orderId:", orderId);
        return res.status(400).json({ error: "ID do pedido é obrigatório" });
      }

      // Validate transactions structure
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        if (!transaction || typeof transaction !== 'object') {
          console.error(`Transaction ${i} is not an object:`, transaction);
          return res.status(400).json({ error: `Transação ${i + 1} tem formato inválido` });
        }
        if (!transaction.transactionId) {
          console.error(`Transaction ${i} missing transactionId:`, transaction);
          return res.status(400).json({ error: `Transação ${i + 1} deve ter transactionId` });
        }
        if (transaction.amount === undefined || transaction.amount === null) {
          console.error(`Transaction ${i} missing amount:`, transaction);
          return res.status(400).json({ error: `Transação ${i + 1} deve ter amount` });
        }
      }

      // Get the order
      const order = await storage.getOrder(orderId);
      if (!order) {
        console.error("Order not found:", orderId);
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      let paymentsCreated = 0;
      let totalProcessed = 0;
      const errors = [];

      // Process each transaction
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        try {
          const amount = parseFloat(transaction.amount);
          if (isNaN(amount) || amount <= 0) {
            errors.push(`Transação ${i + 1}: valor inválido (${transaction.amount})`);
            continue;
          }

          // Verificar se a transação existe
          const bankTransaction = await storage.getBankTransaction(transaction.transactionId);
          if (!bankTransaction) {
            errors.push(`Transação ${i + 1}: não encontrada no sistema bancário`);
            continue;
          }

          // Create payment record
          const payment = await storage.createPayment({
            orderId: orderId,
            amount: amount.toFixed(2),
            method: "bank_transfer", // Default for bank reconciliation
            status: "confirmed",
            transactionId: transaction.transactionId,
            paidAt: new Date()
          });

          // Update transaction status
          await storage.updateBankTransaction(transaction.transactionId, {
            status: 'matched',
            matchedOrderId: orderId,
            matchedPaymentId: payment.id,
            matchedAt: new Date()
          });

          paymentsCreated++;
          totalProcessed += amount;

          console.log(`Successfully processed transaction ${i + 1}:`, {
            transactionId: transaction.transactionId,
            amount: amount,
            paymentId: payment.id
          });

        } catch (transactionError) {
          console.error(`Error processing transaction ${i + 1}:`, transactionError);
          errors.push(`Transação ${i + 1}: erro ao processar (${transactionError.message})`);
        }
      }

      const response = {
        success: paymentsCreated > 0,
        paymentsCreated,
        totalAmount: totalProcessed.toFixed(2),
        message: `${paymentsCreated} pagamentos processados com sucesso`,
        errors: errors.length > 0 ? errors : undefined
      };

      console.log("Multiple payments association response:", response);

      // Retornar status 200 mesmo se houve alguns erros, mas pelo menos um pagamento foi processado
      if (paymentsCreated > 0) {
        res.status(200).json(response);
      } else {
        res.status(400).json({
          success: false,
          error: "Nenhum pagamento pôde ser processado",
          errors: errors
        });
      }
    } catch (error) {
      console.error("Error associating multiple payments:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        details: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}