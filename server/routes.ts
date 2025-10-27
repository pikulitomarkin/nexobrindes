import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { storage } from "./storage";
import { db, eq, budgets, budgetPhotos, productionOrders, desc, sql, type ProductionOrder, users as usersTable, orders as ordersTable, productionOrders as productionOrdersTable } from './db'; // Assuming these are your database models and functions

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

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


// Robust OFX Parser using node-ofx-parser library
import Ofx from 'node-ofx-parser';

interface ParsedOFXTransaction {
  fitId: string;
  rawFitId: string;
  date: Date | null;
  hasValidDate: boolean;
  amount: string;
  description: string;
  bankRef: string | null;
  type: 'credit' | 'debit' | 'other';
  originalType: string;
}

interface ParsedOFXResult {
  transactions: ParsedOFXTransaction[];
  stats: {
    totalLines: number;
    accountId?: string;
    bankId?: string;
    accountType?: string;
  };
}

async function parseOFXBuffer(buffer: Buffer): Promise<ParsedOFXResult> {
  const ofxContent = buffer.toString('utf-8');
  const stats = {
    totalLines: ofxContent.split('\n').length,
    accountId: undefined as string | undefined,
    bankId: undefined as string | undefined,
    accountType: undefined as string | undefined
  };

  // Parse OFX using node-ofx-parser (synchronous, no await needed but doesn't hurt)
  const ofxData = Ofx.parse(ofxContent);

  const transactions: ParsedOFXTransaction[] = [];

  // Normalize STMTTRNRS to array (node-ofx-parser may return single object or array)
  const stmtTrnRsList = ofxData?.OFX?.BANKMSGSRSV1?.STMTTRNRS;
  if (!stmtTrnRsList) {
    console.warn('No STMTTRNRS found in OFX file');
    return { transactions, stats };
  }

  // Ensure STMTTRNRS is an array
  const stmtTrnRsArray = Array.isArray(stmtTrnRsList) ? stmtTrnRsList : [stmtTrnRsList];

  // Iterate over each STMTTRNRS entry
  for (const stmtTrnRs of stmtTrnRsArray) {
    const stmtRs = stmtTrnRs?.STMTRS;
    if (!stmtRs) continue;

    // Extract account information for better reconciliation (only once)
    if (!stats.accountId) {
      const bankAccount = stmtRs.BANKACCTFROM;
      if (bankAccount) {
        stats.accountId = bankAccount.ACCTID;
        stats.bankId = bankAccount.BANKID;
        stats.accountType = bankAccount.ACCTTYPE;
      }
    }

    // Extract transactions from the current statement
    const statementTransactions = stmtRs.BANKTRANLIST?.STMTTRN;

    if (!statementTransactions) {
      console.log('No transactions in this STMTRS entry, skipping');
      continue;
    }

    // Ensure it's an array
    const txnArray = Array.isArray(statementTransactions) ? statementTransactions : [statementTransactions];

  txnArray.forEach((txn, index) => {
    // Extract transaction data safely
    const trnType = txn.TRNTYPE || 'OTHER';
    const dtPostedRaw = txn.DTPOSTED || '';
    const trnAmt = txn.TRNAMT || '0';
    const memo = txn.MEMO || txn.NAME || 'Transação bancária';
    const refNum = txn.REFNUM || txn.CHECKNUM || null;

    // Generate deterministic FITID when missing
    let fitId = txn.FITID;
    if (!fitId) {
      // Create deterministic hash from date+amount+memo for consistent deduplication
      const hashInput = `${dtPostedRaw}|${trnAmt}|${memo}`;
      const hash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
      fitId = `HASH_${hash}`;
      console.log(`Generated deterministic FITID for transaction: ${fitId} from ${hashInput}`);
    }

    // Parse date (format: YYYYMMDDHHMMSS or YYYYMMDD)
    let transactionDate: Date | null = null;
    let hasValidDate = false;

    if (dtPostedRaw && dtPostedRaw.length >= 8) {
      try {
        const dateStr = String(dtPostedRaw);
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-based
        const day = parseInt(dateStr.substring(6, 8));

        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const parsedDate = new Date(year, month, day);
          if (parsedDate.getFullYear() === year &&
              parsedDate.getMonth() === month &&
              parsedDate.getDate() === day) {
            transactionDate = parsedDate;
            hasValidDate = true;
          }
        }
      } catch (e) {
        console.error("Error parsing date from DTPOSTED:", dtPostedRaw, e);
      }
    }

    // Classify transaction type
    let standardType: 'credit' | 'debit' | 'other' = 'other';
    const amount = parseFloat(trnAmt);

    // Check for debit indicators (payments/withdrawals)
    const isDebit = amount < 0 ||
                   trnType === 'PAYMENT' ||
                   trnType === 'DEBIT' ||
                   trnType === 'CHECK' ||
                   trnType === 'XFER' ||
                   trnType === 'WITHDRAWAL' ||
                   trnType === 'DEP' || // Some banks use DEP for debits
                   memo.toLowerCase().includes('pag') ||
                   memo.toLowerCase().includes('transf') ||
                   memo.toLowerCase().includes('saque') ||
                   memo.toLowerCase().includes('débito');

    if (isDebit) {
      standardType = 'debit';
    } else if (trnType === 'CREDIT' || trnType === 'DEP' || amount > 0) {
      standardType = 'credit';
    }

      transactions.push({
        fitId: fitId,
        rawFitId: fitId, // Store original/generated FITID for deduplication
        date: transactionDate,
        hasValidDate: hasValidDate,
        amount: trnAmt,
        description: memo,
        bankRef: refNum,
        type: standardType,
        originalType: trnType
      });
    });
  }

  console.log(`Parsed OFX successfully: ${transactions.length} transactions found`);
  return { transactions, stats };
}

// Helper function to generate unique IDs (replace with a proper UUID library in production)
function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 15)}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from public/uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  // File upload endpoint
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const extension = req.file.originalname.split('.').pop();
      const filename = `image-${timestamp}-${randomStr}.${extension}`;
      const filepath = path.join(process.cwd(), 'public', 'uploads', filename);

      // Write file to disk
      fs.writeFileSync(filepath, req.file.buffer);

      const url = `/uploads/${filename}`;

      console.log(`File uploaded successfully: ${filename}`);
      res.json({ url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Erro no upload do arquivo' });
    }
  });

  // Budget approval/rejection by client
  app.patch("/api/budgets/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, observations } = req.body; // status: 'approved' or 'rejected'

      const budget = await storage.getBudget(id);
      if (!budget) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      // Update budget status
      const updatedBudget = await storage.updateBudget(id, {
        status,
        clientObservations: observations || null,
        reviewedAt: new Date().toISOString()
      });

      console.log(`Budget ${id} ${status} by client`);
      res.json(updatedBudget);
    } catch (error) {
      console.error("Error updating budget status:", error);
      res.status(500).json({ error: "Erro ao atualizar status do orçamento" });
    }
  });

  // Get budget details for client review
  app.get("/api/budgets/:id/review", async (req, res) => {
    try {
      const { id } = req.params;
      const budget = await storage.getBudget(id);

      if (!budget) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      // Get budget items
      const items = await storage.getBudgetItems(id);

      // Get budget photos
      const photos = await storage.getBudgetPhotos(id);

      res.json({
        ...budget,
        items,
        photos: photos.map(p => p.photoUrl || p.imageUrl)
      });
    } catch (error) {
      console.error("Error fetching budget for review:", error);
      res.status(500).json({ error: "Erro ao buscar orçamento" });
    }
  });

  // Get budget PDF data with all images
  app.get("/api/budgets/:id/pdf-data", async (req, res) => {
    try {
      const { id } = req.params;
      const budget = await storage.getBudget(id);

      if (!budget) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      // Get all budget data including item photos
      const budgetData = {
        budget: budget,
        items: budget.items || [],
        photos: budget.photos || [],
        itemPhotos: budget.items?.map((item: any) => item.customizationPhoto).filter(Boolean) || []
      };

      res.json(budgetData);
    } catch (error) {
      console.error("Error fetching budget PDF data:", error);
      res.status(500).json({ error: "Erro ao buscar dados do orçamento para PDF" });
    }
  });

  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    const { username, password, preferredRole } = req.body;

    try {
      console.log("Login attempt:", { username, preferredRole });

      // Get user by username first
      const user = await storage.getUserByUsername(username);
      console.log("Found user:", user ? { id: user.id, username: user.username, role: user.role } : "not found");

      if (!user || user.password !== password || !user.isActive) {
        console.log("Login failed - invalid credentials or inactive user");
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      // Check if preferred role matches user role
      if (preferredRole && user.role !== preferredRole) {
        console.log(`Role mismatch: requested ${preferredRole}, user has ${user.role}`);
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      // Create a simple token (in production, use JWT)
      const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');

      // Return user data without password
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

  // Logistics - Get paid orders ready for production
  app.get("/api/logistics/paid-orders", async (req, res) => {
    try {
      console.log("Fetching paid orders ready for production...");
      const paidOrders = await storage.getPaidOrdersReadyForProduction();

      console.log(`Found ${paidOrders.length} paid orders ready for production`);

      // Enrich with client names and producer information
      const enrichedOrders = await Promise.all(
        paidOrders.map(async (order) => {
          // Always use contactName as primary client identifier
          let clientName = order.contactName;

          // Only if contactName is missing, try to get from client record
          if (!clientName && order.clientId) {
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

          // If still no name, use a descriptive message
          if (!clientName) {
            clientName = "Nome não informado";
          }

          return {
            ...order,
            clientName: clientName
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching paid orders:", error);
      res.status(500).json({ error: "Failed to fetch paid orders" });
    }
  });

  // Logistics dispatch order
  app.post("/api/logistics/dispatch-order", async (req, res) => {
    try {
      const { productionOrderId, orderId, notes, trackingCode } = req.body;

      console.log(`Dispatching order - productionOrderId: ${productionOrderId}, orderId: ${orderId}`);

      // Update production order status to shipped
      const updatedPO = await storage.updateProductionOrderStatus(
        productionOrderId,
        'shipped',
        notes,
        undefined, // deliveryDate
        trackingCode
      );

      if (!updatedPO) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      // Update main order status to shipped if this was the last pending production order
      const allProductionOrders = await storage.getProductionOrdersByOrder(orderId);
      const allShipped = allProductionOrders.every(po => po.status === 'shipped' || po.status === 'delivered');

      if (allShipped) {
        await storage.updateOrderStatus(orderId, 'shipped');
      }

      console.log(`Order ${orderId} dispatched with tracking: ${trackingCode}`);

      res.json({
        success: true,
        message: "Pedido despachado com sucesso",
        productionOrder: updatedPO
      });
    } catch (error) {
      console.error("Error dispatching order:", error);
      res.status(500).json({ error: "Erro ao despachar pedido: " + error.message });
    }
  });

  // Send order to production - creates separate production orders for each producer
  app.post("/api/orders/:id/send-to-production", async (req, res) => {
    try {
      const { id } = req.params;
      const { producerId } = req.body; // Optional - if provided, only send to this producer

      console.log(`Sending order ${id} to production. Producer filter: ${producerId || 'all'}`);

      let order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Get all items from the order (including budget items)
      let allItems = [];
      if (order.budgetId) {
        const budgetItems = await storage.getBudgetItems(order.budgetId);
        allItems = budgetItems;
      } else if (order.items && Array.isArray(order.items)) {
        allItems = order.items;
      }

      console.log(`Order ${id} has ${allItems.length} total items`);

      // If no items found, return error
      if (!allItems || allItems.length === 0) {
        return res.status(400).json({ error: "Nenhum item encontrado no pedido" });
      }

      // Group items by producer
      const itemsByProducer = new Map();
      allItems.forEach((item: any) => {
        const itemProducerId = item.producerId || 'internal';

        // Only consider external producers
        if (itemProducerId && itemProducerId !== 'internal') {
          // Only send to specified producer if producerId is provided
          if (producerId && itemProducerId !== producerId) {
            return; // Skip this item
          }

          if (!itemsByProducer.has(itemProducerId)) {
            itemsByProducer.set(itemProducerId, []);
          }
          itemsByProducer.get(itemProducerId).push(item);
        }
      });

      console.log(`Items grouped by producer:`, Array.from(itemsByProducer.keys()));

      if (itemsByProducer.size === 0) {
        const errorMsg = producerId ?
          `Nenhum item encontrado para o produtor especificado` :
          `Nenhum item de produção externa encontrado`;
        return res.status(400).json({ error: errorMsg });
      }

      // If a specific producer was requested, make sure it exists in the items
      if (producerId && !itemsByProducer.has(producerId)) {
        return res.status(400).json({ error: "Produtor especificado não possui itens neste pedido" });
      }

      const createdOrders = [];
      const producerNames = [];

      // Get budget photos if order was converted from budget
      let photos = [];
      if (order.budgetId) {
        const budgetPhotos = await storage.getBudgetPhotos(order.budgetId);
        photos = budgetPhotos.map(photo => photo.photoUrl || photo.imageUrl);
      }

      // Create a separate production order for each producer
      for (const [currentProducerId, items] of itemsByProducer) {
        const producer = await storage.getUser(currentProducerId);
        if (!producer) {
          console.log(`Producer not found: ${currentProducerId}`);
          continue;
        }

        // Calculate total value for this producer's items
        const producerTotalValue = items.reduce((sum: number, item: any) =>
          sum + parseFloat(item.totalPrice || '0'), 0
        );

        // Filter and deduplicate items for this producer
        const producerItems = items.filter(item => item.producerId === currentProducerId);
        const uniqueProducerItems = [];
        const seenItems = new Set();

        for (const item of producerItems) {
          const itemKey = `${item.productId}-${item.producerId}-${item.quantity}-${item.unitPrice}`;
          if (!seenItems.has(itemKey)) {
            seenItems.add(itemKey);
            uniqueProducerItems.push(item);
          } else {
            console.log(`Removing duplicate production item: ${item.productName || item.productId} for producer ${currentProducerId}`);
          }
        }

        console.log(`Producer ${currentProducerId} has ${uniqueProducerItems.length} unique items (filtered from ${producerItems.length})`);

        // Create detailed order information specific to this producer
        const orderDetails = {
          orderNumber: order.orderNumber,
          product: `${order.product} - Produção: ${producer.name}`,
          description: order.description,
          totalValue: producerTotalValue.toFixed(2), // Value only for this producer's items
          deadline: order.deadline,
          deliveryDeadline: order.deliveryDeadline,
          clientDetails: {
            name: order.contactName,
            phone: order.contactPhone,
            email: order.contactEmail
          },
          shippingAddress: order.deliveryType === 'pickup'
            ? 'Sede Principal - Retirada no Local'
            : (order.shippingAddress || 'Endereço não informado'),
          items: uniqueProducerItems, // Use unique items only
          photos: photos,
          producerId: currentProducerId, // Add producer ID to identify items
          producerName: producer.name
        };

        // Check if production order already exists for this producer
        const existingOrders = await storage.getProductionOrdersByOrder(id);
        const existingForProducer = existingOrders.find(po => po.producerId === currentProducerId);

        if (existingForProducer) {
          console.log(`Production order already exists for producer ${currentProducerId} on order ${id}`);

          // If sending to specific producer and order already exists, return error
          if (producerId) {
            return res.status(400).json({
              error: `Ordem de produção para ${producer.name} já foi criada anteriormente`
            });
          }

          // Otherwise, just add to the list and continue
          createdOrders.push(existingForProducer);
          producerNames.push(producer.name);
          continue;
        }

        // Create production order
        const productionOrder = await storage.createProductionOrder({
          orderId: id,
          producerId: currentProducerId,
          status: 'pending',
          deadline: order.deadline,
          deliveryDeadline: order.deliveryDeadline,
          shippingAddress: orderDetails.shippingAddress,
          orderDetails: JSON.stringify(orderDetails),
          producerValue: '0.00',
          producerValueLocked: false
        });

        createdOrders.push(productionOrder);
        producerNames.push(producer.name);

        console.log(`Created production order ${productionOrder.id} for producer ${producer.name} with ${items.length} items`);
      }

      // Update order status to production only if we created orders and it's not already in production
      if (createdOrders.length > 0 && order.status !== 'production') {
        await storage.updateOrder(id, { status: 'production' });
      }

      const message = producerId
        ? `Ordem de produção criada para ${producerNames[0]}`
        : `Pedido enviado para produção - ${createdOrders.length} ordem(ns) criada(s) para: ${producerNames.join(', ')}`;

      res.json({
        success: true,
        productionOrders: createdOrders,
        productionOrdersCreated: createdOrders.length,
        producerNames: producerNames,
        message: message,
        isSpecificProducer: !!producerId
      });
    } catch (error) {
      console.error("Error sending order to production:", error);
      res.status(500).json({ error: "Erro ao enviar pedido para produção: " + error.message });
    }
  });

  // Logistics Products Routes
  app.get("/api/logistics/products", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const search = (req.query.search as string) || '';
      const category = (req.query.category as string) || '';
      const producer = (req.query.producer as string) || '';

      console.log(`Logistics products request: page=${page}, limit=${limit}, search='${search}', category='${category}', producer='${producer}'`);

      const result = await storage.getProducts({
        page,
        limit,
        search,
        category,
        producer
      });

      console.log(`Logistics products result: ${result.products.length} products found, total=${result.total}`);

      // Products are already enriched with producer names in storage
      res.json(result);
    } catch (error) {
      console.error("Error fetching logistics products:", error);
      res.status(500).json({ error: "Failed to fetch logistics products: " + error.message });
    }
  });

  app.post("/api/logistics/products", async (req, res) => {
    try {
      const productData = req.body;
      console.log("Creating logistics product:", productData);

      // Validate required fields
      if (!productData.name) {
        return res.status(400).json({ error: "Nome do produto é obrigatório" });
      }

      if (!productData.basePrice || parseFloat(productData.basePrice) <= 0) {
        return res.status(400).json({ error: "Preço base deve ser maior que zero" });
      }

      // Set default values
      const newProduct = {
        ...productData,
        producerId: productData.producerId || 'internal',
        type: productData.producerId === 'internal' || !productData.producerId ? 'internal' : 'external',
        isActive: productData.isActive !== undefined ? productData.isActive : true,
        unit: productData.unit || 'un',
        category: productData.category || 'Geral'
      };

      const product = await storage.createProduct(newProduct);
      console.log("Logistics product created successfully:", product.id);

      res.json(product);
    } catch (error) {
      console.error("Error creating logistics product:", error);
      res.status(500).json({ error: "Erro ao criar produto: " + error.message });
    }
  });

  app.put("/api/logistics/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      console.log(`Updating logistics product ${id}:`, updateData);

      const updatedProduct = await storage.updateProduct(id, updateData);
      if (!updatedProduct) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating logistics product:", error);
      res.status(500).json({ error: "Erro ao atualizar produto: " + error.message });
    }
  });

  app.delete("/api/logistics/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Deleting logistics product ${id}`);

      const deleted = await storage.deleteProduct(id);
      if (!deleted) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting logistics product:", error);
      res.status(500).json({ error: "Erro ao deletar produto: " + error.message });
    }
  });

  // Process producer payment
  app.post("/api/finance/producer-payments/:id/pay", async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, notes, transactionId } = req.body;

      console.log(`Processing payment for producer payment: ${id}`, { paymentMethod, notes, transactionId });

      // Update the producer payment status to paid
      const updatedPayment = await storage.updateProducerPayment(id, {
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: paymentMethod || 'manual',
        notes: notes || null,
        transactionId: transactionId || null,
        // Mark as manual payment to prevent OFX reconciliation
        reconciliationStatus: 'manual',
        bankTransactionId: null
      });

      if (!updatedPayment) {
        return res.status(404).json({ error: "Pagamento do produtor não encontrado" });
      }

      console.log(`Producer payment ${id} marked as paid manually (reconciliationStatus=manual)`);

      res.json({
        success: true,
        payment: updatedPayment,
        message: "Pagamento do produtor registrado com sucesso"
      });
    } catch (error) {
      console.error("Error processing producer payment:", error);
      res.status(500).json({ error: "Erro ao registrar pagamento: " + error.message });
    }
  });

  // Update producer value for production order
  app.patch("/api/production-orders/:id/value", async (req, res) => {
    try {
      const { id } = req.params;
      const { value, notes } = req.body;

      if (!value || parseFloat(value) <= 0) {
        return res.status(400).json({ error: "Valor deve ser maior que zero" });
      }

      // Only update the producer value, don't create payment yet
      const updatedPO = await storage.updateProductionOrderValue(id, value, notes, false);
      if (!updatedPO) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      console.log(`Updated producer value for production order ${id} to R$ ${value} - payment will be created when marked as ready`);
      res.json(updatedPO);
    } catch (error) {
      console.error("Error updating producer value:", error);
      res.status(500).json({ error: "Erro ao atualizar valor do produtor" });
    }
  });

  // Update production order status
  app.patch("/api/production-orders/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, deliveryDate, trackingCode } = req.body;

      console.log(`Updating production order ${id} status to: ${status}`);

      const updatedPO = await storage.updateProductionOrderStatus(id, status, notes, deliveryDate, trackingCode);
      if (!updatedPO) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      console.log(`Production order ${id} status updated successfully to: ${status}`);
      res.json(updatedPO);
    } catch (error) {
      console.error("Error updating production order status:", error);
      res.status(500).json({ error: "Erro ao atualizar status da ordem de produção: " + error.message });
    }
  });

  // Get production orders for a specific producer
  app.get("/api/production-orders/producer/:producerId", async (req, res) => {
    try {
      const { producerId } = req.params;
      console.log(`Fetching production orders for producer: ${producerId}`);

      const productionOrders = await storage.getProductionOrdersByProducer(producerId);
      console.log(`Found ${productionOrders.length} production orders for producer ${producerId}`);

      // Enrich with order and client information
      const enrichedOrders = await Promise.all(
        productionOrders.map(async (po) => {
          let order = await storage.getOrder(po.orderId);
          if (!order) {
            console.log(`Order not found for production order: ${po.orderId}`);
            return null;
          }

          // Get client information
          let clientName = order.contactName;
          if (!clientName && order.clientId) {
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

          if (!clientName) {
            clientName = "Nome não informado";
          }

          return {
            ...po,
            orderNumber: order.orderNumber,
            product: order.product,
            clientName: clientName,
            order: {
              ...order,
              clientName: clientName,
              // Remove valores financeiros para produtores
              totalValue: undefined,
              downPayment: undefined,
              remainingAmount: undefined,
              shippingCost: undefined
            }
          };
        })
      );

      // Filter out null values (orders that weren't found)
      const validOrders = enrichedOrders.filter(order => order !== null);

      console.log(`Returning ${validOrders.length} enriched production orders for producer ${producerId}`);
      res.json(validOrders);
    } catch (error) {
      console.error("Error fetching production orders for producer:", error);
      res.status(500).json({ error: "Failed to fetch production orders for producer" });
    }
  });

  // Get producer payments by producer ID
  app.get("/api/finance/producer-payments/producer/:producerId", async (req, res) => {
    try {
      const { producerId } = req.params;
      console.log(`Fetching producer payments for producer: ${producerId}`);

      const producerPayments = await storage.getProducerPaymentsByProducer(producerId);
      console.log(`Found ${producerPayments.length} producer payments for producer ${producerId}`);

      // Enrich with production order and order data
      const enrichedPayments = await Promise.all(
        producerPayments.map(async (payment) => {
          const productionOrder = await storage.getProductionOrder(payment.productionOrderId);
          let order = null;

          if (productionOrder) {
            order = await storage.getOrder(productionOrder.orderId);
          }

          return {
            ...payment,
            productionOrder,
            order,
            // Add clientName, orderNumber, product from order if available
            clientName: order?.contactName || 'Cliente não encontrado',
            orderNumber: order?.orderNumber || 'N/A',
            product: order?.product || 'Produto não informado'
          };
        })
      );

      console.log(`Returning ${enrichedPayments.length} enriched producer payments for producer ${producerId}`);
      res.json(enrichedPayments);
    } catch (error) {
      console.error("Error fetching producer payments for producer:", error);
      res.status(500).json({ error: "Failed to fetch producer payments for producer" });
    }
  });

  // Get specific production order by ID
  app.get("/api/production-orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching production order: ${id}`);

      const productionOrder = await storage.getProductionOrder(id);
      if (!productionOrder) {
        console.log(`Production order not found: ${id}`);
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      // Get the related order
      let order = await storage.getOrder(productionOrder.orderId);
      if (!order) {
        console.log(`Related order not found for production order: ${id}`);
        return res.status(404).json({ error: "Pedido relacionado não encontrado" });
      }

      // Get client information
      let clientName = order.contactName;
      let clientPhone = order.contactPhone;
      let clientEmail = order.contactEmail;
      let clientAddress = null;

      if (!clientName && order.clientId) {
        const clientRecord = await storage.getClient(order.clientId);
        if (clientRecord) {
          clientName = clientRecord.name;
          clientPhone = clientRecord.phone || order.contactPhone;
          clientEmail = clientRecord.email || order.contactEmail;
          clientAddress = clientRecord.address;
        } else {
          const clientByUserId = await storage.getClientByUserId(order.clientId);
          if (clientByUserId) {
            clientName = clientByUserId.name;
            clientPhone = clientByUserId.phone || order.contactPhone;
            clientEmail = clientByUserId.email || order.contactEmail;
            clientAddress = clientByUserId.address;
          } else {
            const clientUser = await storage.getUser(order.clientId);
            if (clientUser) {
              clientName = clientUser.name;
              clientPhone = clientUser.phone || order.contactPhone;
              clientEmail = clientUser.email || order.contactEmail;
              clientAddress = clientUser.address;
            }
          }
        }
      }

      if (!clientName) {
        clientName = "Nome não informado";
      }

      // Get budget photos if order was converted from budget
      let photos = [];
      if (order.budgetId) {
        const budgetPhotos = await storage.getBudgetPhotos(order.budgetId);
        photos = budgetPhotos.map(photo => photo.photoUrl || photo.imageUrl);
      }

      // Parse order details if available and filter items for this producer
      let orderDetails = null;
      if (productionOrder.orderDetails) {
        try {
          const parsedDetails = JSON.parse(productionOrder.orderDetails);
          // Filter items to show only those for this producer
          if (parsedDetails.items && parsedDetails.producerId) {
            const filteredItems = parsedDetails.items.filter((item: any) =>
              item.producerId === parsedDetails.producerId || item.producerId === productionOrder.producerId
            );

            // Remove duplicatas baseado em productId, producerId, quantity e unitPrice
            const uniqueItems = filteredItems.filter((item: any, index: number, self: any[]) =>
              self.findIndex(i =>
                i.productId === item.productId &&
                i.producerId === item.producerId &&
                i.quantity === item.quantity &&
                i.unitPrice === item.unitPrice
              ) === index
            );

            console.log(`Producer ${parsedDetails.producerId}: Filtered ${filteredItems.length} items down to ${uniqueItems.length} unique items`);

            // Remove valores financeiros dos itens
            parsedDetails.items = uniqueItems.map((item: any) => ({
              ...item,
              unitPrice: undefined,
              totalPrice: undefined,
              itemCustomizationValue: undefined,
              generalCustomizationValue: undefined,
              itemDiscountValue: undefined,
              itemDiscountPercentage: undefined,
              discountValue: undefined,
              discountPercentage: undefined
            }));

            // Remove TODOS os valores financeiros do pedido
            parsedDetails.totalValue = undefined;
            parsedDetails.downPayment = undefined;
            parsedDetails.remainingAmount = undefined;
            parsedDetails.shippingCost = undefined;
            parsedDetails.discountValue = undefined;
            parsedDetails.discountPercentage = undefined;

            console.log(`Filtered items for producer ${parsedDetails.producerId}: ${parsedDetails.items.length} unique items`);
          }
          orderDetails = parsedDetails;
        } catch (e) {
          console.log(`Error parsing order details for production order ${id}:`, e);
        }
      }

      const enrichedProductionOrder = {
        ...productionOrder,
        order: {
          ...order,
          clientName: clientName,
          clientPhone: clientPhone,
          clientEmail: clientEmail,
          clientAddress: clientAddress,
          shippingAddress: order.deliveryType === 'pickup'
            ? 'Sede Principal - Retirada no Local'
            : (clientAddress || 'Endereço não informado')
        },
        photos: photos,
        orderDetails: orderDetails
      };

      console.log(`Returning enriched production order: ${id}`);
      res.json(enrichedProductionOrder);
    } catch (error) {
      console.error("Error fetching production order:", error);
      res.status(500).json({ error: "Erro ao buscar ordem de produção: " + error.message });
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
      if (!orderData.contactName) {
        return res.status(400).json({ error: "Nome de contato é obrigatório" });
      }

      if (!orderData.vendorId) {
        return res.status(400).json({ error: "Vendedor é obrigatório" });
      }

      if (!orderData.product && !orderData.title) {
        return res.status(400).json({ error: "Produto/título é obrigatório" });
      }

      // Validar personalizações antes de criar o pedido - apenas logar alertas
      let orderWarnings = [];

      if (req.body.items && req.body.items.length > 0) {
        console.log("Validando personalizações dos itens:", JSON.stringify(req.body.items, null, 2));

        for (const item of req.body.items) {
          console.log(`Item: hasItemCustomization=${item.hasItemCustomization}, selectedCustomizationId=${item.selectedCustomizationId}, quantity=${item.quantity}`);

          if (item.hasItemCustomization && item.selectedCustomizationId) {
            const customizations = await storage.getCustomizationOptions();
            const customization = customizations.find(c => c.id === item.selectedCustomizationId);

            if (customization) {
              const itemQty = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
              const minQty = typeof customization.minQuantity === 'string' ? parseInt(customization.minQuantity) : customization.minQuantity;

              console.log(`Validação: itemQty=${itemQty} (${typeof item.quantity}), minQty=${minQty} (${typeof customization.minQuantity}), customization=${customization.name}`);

              if (itemQty < minQty) {
                console.log(`ALERTA: ${itemQty} < ${minQty} - Salvando pedido mesmo assim`);
                orderWarnings.push(`A personalização "${customization.name}" requer no mínimo ${minQty} unidades, mas o item tem ${itemQty} unidades.`);
              } else {
                console.log(`APROVADO: ${itemQty} >= ${minQty}`);
              }
            }
          }
        }
      }

      // Handle clientId - use the provided clientId if exists, otherwise create order without client link
      let finalClientId = null;
      if (orderData.clientId && orderData.clientId !== "") {
        // Verify client exists
        const clientRecord = await storage.getClient(orderData.clientId);
        if (clientRecord) {
          finalClientId = clientRecord.userId || orderData.clientId;
          console.log("Using client record:", clientRecord.name);
        } else {
          // Try finding by userId
          const clientByUserId = await storage.getClientByUserId(orderData.clientId);
          if (clientByUserId) {
            finalClientId = orderData.clientId;
            console.log("Using client by userId:", clientByUserId.name);
          }
        }
      }

      console.log("Final clientId for order:", finalClientId);

      // Generate order number
      const orderNumber = `PED-${Date.now()}`;

      // Remove duplicate items by productId and producerId before creating order
      let uniqueItems = [];
      if (orderData.items && orderData.items.length > 0) {
        const seenItems = new Set();
        uniqueItems = orderData.items.filter(item => {
          const itemKey = `${item.productId}-${item.producerId || 'internal'}-${item.quantity}-${item.unitPrice}`;
          if (seenItems.has(itemKey)) {
            console.log(`Removing duplicate item: ${item.productName} (${itemKey})`);
            return false;
          }
          seenItems.add(itemKey);
          return true;
        });
        console.log(`Filtered ${orderData.items.length} items down to ${uniqueItems.length} unique items`);
      }

      // Create order with contact name as primary identifier and proper items handling
      const newOrder = await storage.createOrder({
        orderNumber,
        clientId: finalClientId, // Can be null if no client selected
        vendorId: orderData.vendorId,
        budgetId: orderData.budgetId || null,
        product: orderData.product || orderData.title,
        description: orderData.description || "",
        totalValue: orderData.totalValue || "0.00",
        status: orderData.status || "confirmed",
        deadline: orderData.deadline ? new Date(orderData.deadline) : null,
        deliveryDeadline: orderData.deliveryDeadline ? new Date(orderData.deliveryDeadline) : null,
        // Contact information is required and primary
        contactName: orderData.contactName,
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
        items: uniqueItems
      });

      console.log("Created order with contact name:", newOrder.contactName);

      // Incluir alertas na resposta se existirem
      const response = {
        ...newOrder,
        warnings: orderWarnings.length > 0 ? orderWarnings : undefined
      };

      res.json(response);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order: " + error.message });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      console.log(`Updating order ${id} with data:`, updateData);

      const updatedOrder = await storage.updateOrder(id, updateData);
      if (!updatedOrder) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // If order is being cancelled, update related commissions
      if (updateData.status === 'cancelled') {
        console.log(`Order ${id} cancelled - updating related commissions and payments`);
        await storage.updateCommissionsByOrderStatus(id, 'cancelled');
      }

      console.log(`Order ${id} updated successfully`);
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Erro ao atualizar pedido: " + error.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let order = await storage.getOrder(id);

      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Enrich with user data and budget photos/items
      let clientName = order.contactName;

      // Only if contactName is missing, try to get from client record
      if (!clientName && order.clientId) {
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

      if (!clientName) {
        clientName = "Nome não informado";
      }

      const vendor = await storage.getUser(order.vendorId);
      const producer = order.producerId ? await storage.getUser(order.producerId) : null;

      // Get budget photos and items if order was converted from budget
      let budgetPhotos = [];
      let budgetItems = [];
      if (order.budgetId) {
        const photos = await storage.getBudgetPhotos(order.budgetId);
        budgetPhotos = photos.map(photo => photo.imageUrl || photo.photoUrl);

        // Get budget items with product details
        const items = await storage.getBudgetItems(order.budgetId);
        budgetItems = await Promise.all(
          items.map(async (item) => {
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

      // Get production order for tracking info
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
          console.log("Error fetching budget info for order:", order.id, error);
        }
      }

      // Use the actual paid value from payments table, not budget down payment
      const totalValue = parseFloat(order.totalValue);
      const actualPaidValue = Math.max(totalPaid, parseFloat(order.paidValue || '0'));
      const remainingBalance = Math.max(0, totalValue - actualPaidValue);

      const enrichedOrder = {
        ...order,
        clientName: clientName,
        vendorName: vendor?.name || 'Vendedor',
        producerName: producer?.name || null,
        budgetPhotos: budgetPhotos,
        budgetItems: budgetItems,
        trackingCode: order.trackingCode || productionOrder?.trackingCode || null,
        estimatedDelivery: productionOrder?.deliveryDeadline || null,
        payments: payments.filter(p => p.status === 'confirmed'),
        budgetInfo: originalBudgetInfo,
        paidValue: actualPaidValue.toFixed(2),
        remainingValue: remainingBalance.toFixed(2)
      };

      res.json(enrichedOrder);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();

      // Enrich with user data and budget photos/items
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          // Always use contactName as primary client name, no fallback to 'Unknown'
          let clientName = order.contactName;

          // Only if contactName is missing, try to get from client record
          if (!clientName && order.clientId) {
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

          // If still no name, use a descriptive message instead of "Unknown"
          if (!clientName) {
            clientName = "Nome não informado";
          }

          const vendor = await storage.getUser(order.vendorId);
          const producer = order.producerId ? await storage.getUser(order.producerId) : null;

          // Get budget photos and items if order was converted from budget
          let budgetPhotos = [];
          let budgetItems = [];
          if (order.budgetId) {
            const photos = await storage.getBudgetPhotos(order.budgetId);
            budgetPhotos = photos.map(photo => photo.imageUrl || photo.photoUrl);

            // Get budget items with product details
            const items = await storage.getBudgetItems(order.budgetId);
            budgetItems = await Promise.all(
              items.map(async (item) => {
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

          // Check if there are unread production notes
          let hasUnreadNotes = false;
          if (order.producerId) {
            const productionOrders = await storage.getProductionOrdersByOrder(order.id);
            hasUnreadNotes = productionOrders.some(po => po.hasUnreadNotes);
          }

          return {
            ...order,
            clientName: clientName, // Never use fallback 'Unknown'
            vendorName: vendor?.name || 'Vendedor',
            producerName: producer?.name || null,
            budgetPhotos: budgetPhotos,
            budgetItems: budgetItems,
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
          // Always use contactName as primary client name - it's required on order creation
          let clientName = order.contactName;

          // Only if contactName is missing, try to get from client record
          if (!clientName && order.clientId) {
            console.log(`Contact name missing for order ${order.orderNumber}, looking for client name with ID: ${order.clientId}`);

            const clientRecord = await storage.getClient(order.clientId);
            if (clientRecord) {
              console.log(`Found client record:`, clientRecord);
              clientName = clientRecord.name;
            } else {
              const clientByUserId = await storage.getClientByUserId(order.clientId);
              if (clientByUserId) {
                console.log(`Found client by userId:`, clientByUserId);
                clientName = clientByUserId.name;
              } else {
                const clientUser = await storage.getUser(order.clientId);
                if (clientUser) {
                  console.log(`Found user record:`, clientUser);
                  clientName = clientUser.name;
                }
              }
            }
          }

          // If still no name, use a descriptive message instead of "Unknown"
          if (!clientName) {
            clientName = "Nome não informado";
          }

          // Get budget photos and items if order was converted from budget
          let budgetPhotos = [];
          let budgetItems = [];
          if (order.budgetId) {
            const photos = await storage.getBudgetPhotos(order.budgetId);
            budgetPhotos = photos.map(photo => photo.imageUrl || photo.photoUrl);

            // Get budget items with product details
            const items = await storage.getBudgetItems(order.budgetId);
            budgetItems = await Promise.all(
              items.map(async (item) => {
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

          return {
            ...order,
            clientName: clientName, // Never use fallback 'Unknown'
            budgetPhotos: budgetPhotos,
            budgetItems: budgetItems
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

          // Get budget photos and items if order was converted from budget
          let budgetPhotos = [];
          let budgetItems = [];
          if (order.budgetId) {
            const photos = await storage.getBudgetPhotos(order.budgetId);
            budgetPhotos = photos.map(photo => photo.imageUrl || photo.photoUrl);

            // Get budget items with product details
            const items = await storage.getBudgetItems(order.budgetId);
            budgetItems = await Promise.all(
              items.map(async (item) => {
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
            budgetItems: budgetItems,
            trackingCode: order.trackingCode || productionOrder?.trackingCode || null,
            estimatedDelivery: productionOrder?.deliveryDeadline || null,
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
          let order = await storage.getOrder(po.orderId);
          const producer = po.producerId ? await storage.getUser(po.producerId) : null;

          // Always use contactName as primary client identifier
          let clientName = order?.contactName;
          let clientAddress = null;
          let clientPhone = order?.contactPhone;
          let clientEmail = order?.contactEmail;

          // Only if contactName is missing, try to get from client record
          if (!clientName && order?.clientId) {
            console.log(`Contact name missing, looking for client with ID: ${order.clientId}`);

            const clientRecord = await storage.getClient(order.clientId);
            if (clientRecord) {
              console.log(`Found client record:`, clientRecord);
              clientName = clientRecord.name;
              clientAddress = clientRecord.address;
              clientPhone = clientRecord.phone || order.contactPhone;
              clientEmail = clientRecord.email || order.contactEmail;
            } else {
              const clientByUserId = await storage.getClientByUserId(order.clientId);
              if (clientByUserId) {
                console.log(`Found client by userId:`, clientByUserId);
                clientName = clientByUserId.name;
                clientAddress = clientByUserId.address;
                clientPhone = clientByUserId.phone || order.contactPhone;
                clientEmail = clientByUserId.email || order.contactEmail;
              } else {
                const clientUser = await storage.getUser(order.clientId);
                if (clientUser) {
                  console.log(`Found user record:`, clientUser);
                  clientName = clientUser.name;
                  clientPhone = clientUser.phone || order.contactPhone;
                  clientEmail = clientUser.email || order.contactEmail;
                  clientAddress = clientUser.address;
                }
              }
            }
          }

          // If still no name, use a descriptive message instead of "Unknown"
          if (!clientName) {
            clientName = "Nome não informado";
          }

          return {
            ...po,
            orderNumber: order?.orderNumber || `PO-${po.id}`,
            product: order?.product || 'Produto não informado',
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
      const { name, email, phone, specialty, address, password, username, userCode } = req.body;

      console.log('Creating producer with request data:', { name, email, phone, specialty, address, username: username || userCode, hasPassword: !!password });

      // Use userCode as username if username is not provided
      const finalUsername = username || userCode || email;

      if (!finalUsername) {
        return res.status(400).json({ error: "Username ou código de usuário é obrigatório" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(finalUsername);
      if (existingUser) {
        console.log('Username already exists:', finalUsername);
        return res.status(400).json({ error: "Código de usuário já existe" });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }

      // Create user with role producer including specialty and address
      const user = await storage.createUser({
        username: finalUsername,
        password: password,
        role: "producer",
        name,
        email: email || null,
        phone: phone || null,
        specialty: specialty || null,
        address: address || null,
        isActive: true
      });

      console.log('Producer created successfully:', { id: user.id, username: user.username, name: user.name });

      res.json({
        success: true,
        user: {
          ...user,
          userCode: finalUsername // Include userCode in response for display
        }
      });
    } catch (error) {
      console.error('Error creating producer:', error);
      res.status(500).json({ error: "Failed to create producer: " + error.message });
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

  // Quote Requests routes - Consolidated version
  app.post("/api/quote-requests/consolidated", async (req, res) => {
    try {
      const quoteRequestData = req.body;

      if (!quoteRequestData.clientId || !quoteRequestData.vendorId || !quoteRequestData.products || quoteRequestData.products.length === 0) {
        return res.status(400).json({ error: "Dados obrigatórios não fornecidos" });
      }

      console.log("Creating consolidated quote request:", {
        clientId: quoteRequestData.clientId,
        vendorId: quoteRequestData.vendorId,
        contactName: quoteRequestData.contactName,
        productCount: quoteRequestData.products.length,
        totalValue: quoteRequestData.totalEstimatedValue
      });

      const newQuoteRequest = await storage.createConsolidatedQuoteRequest(quoteRequestData);
      res.json(newQuoteRequest);
    } catch (error) {
      console.error("Error creating consolidated quote request:", error);
      res.status(500).json({ error: "Failed to create consolidated quote request" });
    }
  });

  // Quote Requests routes - Legacy single product version (manter para compatibilidade)
  app.post("/api/quote-requests", async (req, res) => {
    try {
      const quoteRequestData = req.body;

      if (!quoteRequestData.clientId || !quoteRequestData.vendorId || !quoteRequestData.productId) {
        return res.status(400).json({ error: "Dados obrigatórios não fornecidos" });
      }

      const newQuoteRequest = await storage.createQuoteRequest(quoteRequestData);
      res.json(newQuoteRequest);
    } catch (error) {
      console.error("Error creating quote request:", error);
      res.status(500).json({ error: "Failed to create quote request" });
    }
  });

  app.get("/api/quote-requests/vendor/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const quoteRequests = await storage.getQuoteRequestsByVendor(vendorId);
      res.json(quoteRequests);
    } catch (error) {
      console.error("Error fetching quote requests:", error);
      res.status(500).json({ error: "Failed to fetch quote requests" });
    }
  });

  app.patch("/api/quote-requests/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updatedRequest = await storage.updateQuoteRequestStatus(id, status);
      if (!updatedRequest) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating quote request status:", error);
      res.status(500).json({ error: "Failed to update quote request status" });
    }
  });

  // Convert quote request to official budget
  app.post("/api/quote-requests/:id/convert-to-budget", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Converting quote request ${id} to official budget`);

      const quoteRequest = await storage.getQuoteRequestById(id);
      if (!quoteRequest) {
        return res.status(404).json({ error: "Solicitação de orçamento não encontrada" });
      }

      // Criar orçamento oficial baseado na solicitação
      const budgetData = {
        clientId: quoteRequest.clientId,
        vendorId: quoteRequest.vendorId,
        contactName: quoteRequest.contactName,
        contactPhone: quoteRequest.whatsapp,
        contactEmail: quoteRequest.email,
        title: `Orçamento baseado na solicitação`,
        description: quoteRequest.observations || "",
        validUntil: null,
        deliveryDeadline: null,
        deliveryType: "delivery",
        hasDiscount: false,
        discountType: "percentage",
        discountPercentage: 0,
        discountValue: 0,
        items: quoteRequest.products ? quoteRequest.products.map((product: any) => ({
          productId: product.productId,
          productName: product.productName,
          producerId: 'internal', // Pode ser ajustado conforme necessário
          quantity: product.quantity,
          unitPrice: parseFloat(product.basePrice),
          totalPrice: parseFloat(product.basePrice) * product.quantity,
          hasItemCustomization: false,
          selectedCustomizationId: "",
          itemCustomizationValue: 0,
          itemCustomizationDescription: "",
          additionalCustomizationNotes: product.observations || "",
          customizationPhoto: "",
          hasGeneralCustomization: false,
          generalCustomizationName: "",
          generalCustomizationValue: 0,
          hasItemDiscount: false,
          itemDiscountType: "percentage",
          itemDiscountPercentage: 0,
          itemDiscountValue: 0,
          productWidth: "",
          productHeight: "",
          productDepth: ""
        })) : [],
        totalValue: quoteRequest.totalEstimatedValue || 0
      };

      const newBudget = await storage.createBudget(budgetData);

      // Processar itens do orçamento
      for (const item of budgetData.items) {
        await storage.createBudgetItem(newBudget.id, item);
      }

      // Marcar a solicitação como convertida
      await storage.updateQuoteRequestStatus(id, "quoted");

      console.log(`Successfully converted quote request ${id} to budget ${newBudget.id}`);
      res.json({
        success: true,
        budget: newBudget,
        message: "Solicitação convertida em orçamento oficial com sucesso!"
      });
    } catch (error) {
      console.error("Error converting quote request to budget:", error);
      res.status(500).json({ error: "Erro ao converter solicitação em orçamento: " + error.message });
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
          const client = await storage.getUser(order.clientId);
          const producer = order.producerId ? await storage.getUser(order.producerId) : null;

          // Get budget photos and items if order was converted from budget
          let budgetPhotos = [];
          let budgetItems = [];
          if (order.budgetId) {
            const photos = await storage.getBudgetPhotos(order.budgetId);
            budgetPhotos = photos.map(photo => photo.imageUrl || photo.photoUrl);

            // Get budget items with product details
            const items = await storage.getBudgetItems(order.budgetId);
            budgetItems = await Promise.all(
              items.map(async (item) => {
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
            hasUnreadNotes: hasUnreadNotes,
            budgetPhotos: budgetPhotos,
            budgetItems: budgetItems,
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

      // Enrich with user names and determine commission type
      const enrichedCommissions = await Promise.all(
        commissions.map(async (commission) => {
          let vendorName = null;
          let partnerName = null;
          let orderValue = commission.orderValue;
          let orderNumber = commission.orderNumber;
          let type = 'vendor'; // Default to vendor

          if (commission.vendorId) {
            const vendor = await storage.getUser(commission.vendorId);
            vendorName = vendor?.name;
            type = 'vendor';
          }

          if (commission.partnerId) {
            const partner = await storage.getUser(commission.partnerId);
            partnerName = partner?.name;
            type = 'partner';
          }

          // Use existing type field if available, otherwise determine from IDs
          if (commission.type) {
            type = commission.type;
          }

          // Enrich with order data if missing
          if (commission.orderId && (!orderValue || !orderNumber)) {
            let order = await storage.getOrder(commission.orderId);
            if (order) {
              orderValue = orderValue || order.totalValue;
              orderNumber = orderNumber || order.orderNumber;
            }
          }

          return {
            ...commission,
            type,
            vendorName,
            partnerName,
            orderValue,
            orderNumber
          };
        })
      );

      // Filter out invalid commissions (without names or order numbers)
      const validCommissions = enrichedCommissions.filter(commission =>
        commission.amount &&
        (commission.vendorName || commission.partnerName) &&
        commission.orderNumber
      );

      res.json(validCommissions);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });

  app.get("/api/commissions/vendor/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const commissions = await storage.getCommissionsByVendor(vendorId);

      // Enrich with order data
      const enrichedCommissions = await Promise.all(
        commissions.map(async (commission) => {
          if (commission.orderId) {
            let order = await storage.getOrder(commission.orderId);
            if (order) {
              return {
                ...commission,
                orderValue: commission.orderValue || order.totalValue,
                orderNumber: commission.orderNumber || order.orderNumber
              };
            }
          }
          return commission;
        })
      );

      res.json(enrichedCommissions);
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

      const partnersWithDetails = await Promise.all(partners.map(async (partner) => {
        const partnerProfile = await storage.getPartner(partner.id);
        return {
          id: partner.id,
          name: partner.name,
          email: partner.email || "",
          accessCode: partner.username || "",
          phone: partner.phone || "",
          commissionRate: partnerProfile?.commissionRate || '5.00',
          createdAt: partner.createdAt,
          isActive: true
        };
      }));

      res.json(partnersWithDetails);
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  // Create partner (admin-level user)
  app.post("/api/partners", async (req, res) => {
    const { name, email, phone, username, password } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create user first
    const userId = generateId("partner");
    const user = {
      id: userId,
      username,
      password,
      role: "partner",
      name,
      email,
      phone: phone || "",
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    // Create partner profile
    const partner = {
      id: userId,
      userId,
      name,
      email,
      phone: phone || "",
      username,
      password, // Note: Storing password directly here is insecure for production.
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    try {
      await storage.addUser(user); // Assuming addUser exists and handles user creation
      await storage.addPartner(partner); // Assuming addPartner exists for partner-specific data
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

  // Update partner name
  app.put("/api/partners/:partnerId/name", async (req, res) => {
    try {
      const { partnerId } = req.params;
      const { name } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      const updatedUser = await storage.updateUser(partnerId, { name: name.trim() });
      if (!updatedUser) {
        return res.status(404).json({ error: "Sócio não encontrado" });
      }

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating partner name:", error);
      res.status(500).json({ error: "Failed to update partner name" });
    }
  });

  // Get all accounts receivable (orders + manual)
  app.get("/api/finance/receivables", async (req, res) => {
    try {
      const receivables = await storage.getAccountsReceivable();
      console.log(`Returning ${receivables.length} total receivables to frontend`);
      res.json(receivables);
    } catch (error) {
      console.error("Error fetching accounts receivable:", error);
      res.status(500).json({ error: "Failed to fetch accounts receivable" });
    }
  });

  // Get pending orders for payment reconciliation
  app.get("/api/finance/pending-orders", async (req, res) => {
    try {
      console.log("Fetching pending orders for payment reconciliation...");
      const allOrders = await storage.getOrders();

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
          console.log(`Including order ${order.orderNumber}: Total=${totalValue}, Paid=${paidValue}, Remaining=${remainingValue}, Status=${order.status}`);
        }

        return shouldInclude;
      });

      // Enrich with client names and additional info
      const enrichedOrders = await Promise.all(
        pendingOrders.map(async (order) => {
          // Always use contactName as primary client identifier
          let clientName = order.contactName;

          // Only if contactName is missing, try to get from client record
          if (!clientName && order.clientId) {
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

          if (!clientName) {
            clientName = "Nome não informado";
          }

          // Get budget payment info if order was converted from budget
          let budgetInfo = null;
          if (order.budgetId) {
            try {
              const budgetPaymentInfo = await storage.getBudgetPaymentInfo(order.budgetId);
              if (budgetPaymentInfo) {
                budgetInfo = {
                  downPayment: parseFloat(budgetPaymentInfo.downPayment || '0'),
                  remainingAmount: parseFloat(budgetPaymentInfo.remainingAmount || '0'),
                  installments: budgetPaymentInfo.installments || 1
                };
              }
            } catch (error) {
              console.log("Error fetching budget info for order:", order.id, error);
            }
          }

          return {
            ...order,
            clientName: clientName,
            budgetInfo: budgetInfo
          };
        })
      );

      console.log(`Returning ${enrichedOrders.length} pending orders for payment reconciliation`);
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching pending orders:", error);
      res.status(500).json({ error: "Failed to fetch pending orders for payment reconciliation" });
    }
  });

  // Create expense note
  app.post("/api/finance/expenses", async (req, res) => {
    try {
      const { name, amount, category, date, description, status, createdBy } = req.body;

      if (!name || !amount || !category || !date) {
        return res.status(400).json({ error: "Campos obrigatórios não fornecidos" });
      }

      // Create expense note
      const expense = await storage.createExpenseNote({
        date: new Date(date),
        category: category,
        description: name + (description ? ` - ${description}` : ''),
        amount: parseFloat(amount).toFixed(2),
        vendorId: null, // Notas de despesa não têm vendedor associado
        orderId: null,  // Não estão associadas a pedidos
        attachmentUrl: null,
        status: status || 'recorded',
        approvedBy: null,
        approvedAt: null,
        createdBy: createdBy || 'admin-1'
      });

      res.json(expense);
    } catch (error) {
      console.error("Error creating expense note:", error);
      res.status(500).json({ error: "Erro ao criar nota de despesa: " + error.message });
    }
  });

  // Get expense notes
  app.get("/api/finance/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenseNotes();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expense notes:", error);
      res.status(500).json({ error: "Failed to fetch expense notes" });
    }
  });

  // Associate multiple payments endpoint
  app.post("/api/finance/associate-multiple-payments", async (req, res) => {
    try {
      const { transactions, orderId, totalAmount } = req.body;

      console.log("Processing multiple payment association:", {
        transactionCount: transactions?.length,
        orderId,
        totalAmount
      });

      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ error: "Nenhuma transação fornecida" });
      }

      if (!orderId) {
        return res.status(400).json({ error: "ID do pedido não fornecido" });
      }

      let paymentsCreated = 0;
      let errors: string[] = [];
      let actualTotalAmount = 0;
      let duplicateCount = 0;

      // Process each transaction
      for (const txn of transactions) {
        try {
          const transaction = await storage.getBankTransaction(txn.transactionId);
          if (!transaction) {
            errors.push(`Transação ${txn.transactionId} não encontrada`);
            continue;
          }

          if (transaction.status === 'matched') {
            errors.push(`Transação ${txn.transactionId} já foi conciliada`);
            duplicateCount++;
            continue;
          }

          const amount = Math.abs(parseFloat(transaction.amount));

          // Create payment record with OFX reconciliation
          const payment = await storage.createPayment({
            orderId: orderId,
            amount: amount.toFixed(2),
            method: "bank_transfer",
            status: "confirmed",
            transactionId: transaction.fitId || `TXN-${Date.now()}`,
            notes: `Conciliação OFX - ${transaction.description}`,
            paidAt: new Date(transaction.date),
            // Mark as OFX reconciled to prevent manual payment
            reconciliationStatus: 'ofx',
            bankTransactionId: txn.transactionId
          });

          // Mark transaction as matched
          await storage.updateBankTransaction(txn.transactionId, {
            status: 'matched',
            matchedOrderId: orderId,
            matchedPaymentId: payment.id,
            matchedAt: new Date(),
            notes: `Conciliado com pedido ${orderId}`,
            matchedEntityType: 'payment',
            matchedEntityId: payment.id
          });

          paymentsCreated++;
          actualTotalAmount += amount;

          console.log(`Created payment ${payment.id} for R$ ${amount} from transaction ${txn.transactionId}`);
        } catch (error) {
          console.error(`Error processing transaction ${txn.transactionId}:`, error);
          errors.push(`Erro ao processar transação ${txn.transactionId}: ${error.message}`);
        }
      }

      // Update order paid value
      if (paymentsCreated > 0) {
        await storage.updateOrderPaidValue(orderId);
      }

      res.json({
        success: true,
        paymentsCreated,
        totalAmount: actualTotalAmount.toFixed(2),
        errors,
        duplicates: duplicateCount
      });
    } catch (error) {
      console.error("Error in multiple payment association:", error);
      res.status(500).json({ error: "Erro ao processar associação múltipla de pagamentos: " + error.message });
    }
  });

  // Single payment association endpoint
  app.post("/api/finance/associate-payment", async (req, res) => {
    try {
      const { transactionId, orderId, amount } = req.body;

      console.log("Processing single payment association:", { transactionId, orderId, amount });

      const transaction = await storage.getBankTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }

      if (transaction.status === 'matched') {
        return res.status(400).json({ error: "Transação já foi conciliada" });
      }

      const paymentAmount = parseFloat(amount);
      const transactionAmount = Math.abs(parseFloat(transaction.amount));

      // Create payment record with OFX reconciliation
      const payment = await storage.createPayment({
        orderId: orderId,
        amount: paymentAmount.toFixed(2),
        method: "bank_transfer",
        status: "confirmed",
        transactionId: transaction.fitId || `TXN-${Date.now()}`,
        notes: `Conciliação OFX - ${transaction.description}`,
        paidAt: new Date(transaction.date),
        // Mark as OFX reconciled to prevent manual payment
        reconciliationStatus: 'ofx',
        bankTransactionId: transactionId
      });

      // Mark transaction as matched
      await storage.updateBankTransaction(transactionId, {
        status: 'matched',
        matchedOrderId: orderId,
        matchedPaymentId: payment.id,
        matchedAt: new Date(),
        notes: `Conciliado com pedido ${orderId}`,
        matchedEntityType: 'payment',
        matchedEntityId: payment.id
      });

      // Update order paid value
      await storage.updateOrderPaidValue(orderId);

      console.log(`Created payment ${payment.id} for R$ ${paymentAmount}`);

      res.json({
        success: true,
        payment: payment,
        message: "Pagamento associado com sucesso"
      });
    } catch (error) {
      console.error("Error in payment association:", error);
      res.status(500).json({ error: "Erro ao associar pagamento: " + error.message });
    }
  });

  // Receivables payment endpoint
  app.post("/api/receivables/:id/payment", async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, method, transactionId, notes } = req.body;

      console.log("Processing receivables payment:", { id, amount, method, transactionId });

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Valor deve ser maior que zero" });
      }

      // Check if this is a manual receivable or order-based
      const receivables = await storage.getAccountsReceivable();
      const receivable = receivables.find(r => r.id === id);

      if (!receivable) {
        return res.status(404).json({ error: "Conta a receber não encontrada" });
      }

      let paymentRecord;

      if (receivable.orderId) {
        // This is an order-based receivable - create payment for the order
        paymentRecord = await storage.createPayment({
          orderId: receivable.orderId,
          amount: parseFloat(amount).toFixed(2),
          method: method || "manual",
          status: "confirmed",
          transactionId: transactionId || `MANUAL-${Date.now()}`,
          notes: notes || "",
          paidAt: new Date()
        });
      } else {
        // This is a manual receivable - update the receivable directly
        const currentReceived = parseFloat(receivable.receivedAmount || '0');
        const newReceivedAmount = currentReceived + parseFloat(amount);

        await storage.updateAccountsReceivable(id, {
          receivedAmount: newReceivedAmount.toFixed(2),
          status: newReceivedAmount >= parseFloat(receivable.amount) ? 'paid' : 'partial'
        });

        paymentRecord = {
          id: `payment-${Date.now()}`,
          amount: parseFloat(amount).toFixed(2),
          method: method || "manual",
          transactionId: transactionId || `MANUAL-${Date.now()}`,
          notes: notes || "",
          paidAt: new Date()
        };
      }

      console.log("Payment processed successfully:", paymentRecord);
      res.json({ success: true, payment: paymentRecord });
    } catch (error) {
      console.error("Error processing receivables payment:", error);
      res.status(500).json({ error: "Erro ao processar pagamento: " + error.message });
    }
  });

  // Create manual payables endpoint
  app.post("/api/finance/payables/manual", async (req, res) => {
    try {
      const { beneficiary, description, amount, dueDate, category, notes } = req.body;

      if (!beneficiary || !description || !amount || !dueDate) {
        return res.status(400).json({ error: "Campos obrigatórios não fornecidos" });
      }

      // Create a manual payable entry
      const payable = await storage.createManualPayable({
        beneficiary,
        description,
        amount: parseFloat(amount).toFixed(2),
        dueDate: new Date(dueDate),
        category: category || 'Outros',
        notes: notes || null
      });

      console.log(`Created manual payable: ${payable.id} - ${payable.description} - R$ ${payable.amount}`);
      res.json(payable);
    } catch (error) {
      console.error("Error creating manual payable:", error);
      res.status(500).json({ error: "Erro ao criar conta a pagar: " + error.message });
    }
  });

  // Get manual payables endpoint
  app.get("/api/finance/payables/manual", async (req, res) => {
    try {
      const payables = await storage.getManualPayables();
      console.log(`Returning ${payables.length} manual payables to frontend`);
      res.json(payables);
    } catch (error) {
      console.error("Error fetching manual payables:", error);
      res.status(500).json({ error: "Erro ao buscar contas a pagar manuais: " + error.message });
    }
  });

  // Pay manual payable endpoint
  app.post("/api/finance/payables/manual/:id/pay", async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, notes, transactionId } = req.body;

      console.log(`Processing payment for manual payable: ${id}`, { paymentMethod, notes, transactionId });

      // Update the manual payable status to paid
      const updatedPayable = await storage.updateManualPayable(id, {
        status: 'paid',
        paidBy: 'admin-1', // Could be req.user.id in real auth
        paidAt: new Date(),
        paymentMethod: paymentMethod || 'manual',
        paymentNotes: notes || null,
        transactionId: transactionId || null
      });

      if (!updatedPayable) {
        return res.status(404).json({ error: "Conta a pagar não encontrada" });
      }

      console.log(`Manual payable ${id} marked as paid successfully`);

      res.json({
        success: true,
        payable: updatedPayable,
        message: "Pagamento registrado com sucesso"
      });
    } catch (error) {
      console.error("Error processing manual payable payment:", error);
      res.status(500).json({ error: "Erro ao registrar pagamento: " + error.message });
    }
  });

  // Create manual receivables endpoint
  app.post("/api/finance/receivables/manual", async (req, res) => {
    try {
      const { clientName, description, amount, dueDate, notes } = req.body;

      if (!clientName || !description || !amount || !dueDate) {
        return res.status(400).json({ error: "Campos obrigatórios não fornecidos" });
      }

      // Create a manual receivable entry
      const receivable = await storage.createManualReceivable({
        clientName,
        description,
        amount: parseFloat(amount).toFixed(2),
        dueDate: new Date(dueDate),
        notes: notes || null
      });

      res.json(receivable);
    } catch (error) {
      console.error("Error creating manual receivable:", error);
      res.status(500).json({ error: "Erro ao criar conta a receber: " + error.message });
    }
  });

  // OFX Import for general reconciliation (receivables)
  app.post("/api/finance/ofx-import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo OFX enviado' });
      }

      if (!req.file.originalname.toLowerCase().endsWith('.ofx')) {
        return res.status(400).json({ error: 'Arquivo deve ter extensão .ofx' });
      }

      console.log(`Processing OFX file: ${req.file.originalname} (${req.file.size} bytes)`);

      // Parse OFX content
      const parseResult = await parseOFXBuffer(req.file.buffer);
      const { transactions, stats } = parseResult;

      if (transactions.length === 0) {
        return res.status(400).json({ error: 'Nenhuma transação encontrada no arquivo OFX' });
      }

      // Create bank import record
      const importRecord = await storage.createBankImport({
        fileName: req.file.originalname,
        fileSize: req.file.size.toString(),
        transactionCount: transactions.length,
        importedAt: new Date(),
        status: 'completed'
      });

      console.log(`Created import record: ${importRecord.id}`);

      let importedCount = 0;
      let skippedCount = 0;
      let errors: string[] = [];

      // Process and store transactions
      for (const transaction of transactions) {
        try {
          // Check if transaction already exists by fitId
          const existingTransaction = await storage.getBankTransactionByFitId(transaction.fitId);
          if (existingTransaction) {
            console.log(`Transaction already exists: ${transaction.fitId}`);
            skippedCount++;
            continue;
          }

          // Create new transaction with proper validation
          if (!transaction.fitId || !transaction.amount) {
            console.log(`Skipping invalid transaction:`, transaction);
            errors.push(`Transação inválida: faltam dados essenciais`);
            continue;
          }

          const newTransaction = await storage.createBankTransaction({
            importId: importRecord.id,
            fitId: transaction.fitId,
            date: transaction.date,
            hasValidDate: transaction.hasValidDate,
            amount: transaction.amount,
            description: transaction.description,
            bankRef: transaction.bankRef,
            type: transaction.type,
            status: 'unmatched'
          });

          console.log(`Created transaction: ${newTransaction.id} - ${transaction.description} - ${transaction.amount}`);
          importedCount++;
        } catch (error) {
          console.error("Error saving transaction:", error);
          errors.push(`Erro ao salvar transação ${transaction.fitId}: ${error.message}`);
        }
      }

      // Update import record with results
      await storage.updateBankImport(importRecord.id, {
        status: 'completed',
        processedTransactions: importedCount,
        skippedTransactions: skippedCount
      });

      console.log(`OFX import completed: ${importedCount} imported, ${skippedCount} skipped`);

      res.json({
        success: true,
        message: `Arquivo OFX importado com sucesso! ${importedCount} transações importadas, ${skippedCount} duplicatas ignoradas.`,
        importId: importRecord.id,
        stats: {
          total: transactions.length,
          imported: importedCount,
          skipped: skippedCount,
          ...stats
        },
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("OFX import error:", error);
      res.status(500).json({
        error: "Erro ao importar arquivo OFX",
        details: error.message
      });
    }
  });

  // OFX Import for producer payments (payables)
  app.post("/api/finance/producer-ofx-import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo OFX enviado' });
      }

      if (!req.file.originalname.toLowerCase().endsWith('.ofx')) {
        return res.status(400).json({ error: 'Arquivo deve ter extensão .ofx' });
      }

      console.log(`Processing producer payment OFX file: ${req.file.originalname} (${req.file.size} bytes)`);

      // Parse OFX content
      const parseResult = await parseOFXBuffer(req.file.buffer);
      const { transactions, stats } = parseResult;

      if (transactions.length === 0) {
        return res.status(400).json({ error: 'Nenhuma transação encontrada no arquivo OFX' });
      }

      // Filter debit transactions (payments to producers - money going out)
      // Accept both parsed 'debit' type AND original OFX types like 'PAYMENT', 'DEBIT'
      const debitTransactions = transactions.filter(t =>
        t.type === 'debit' ||
        t.originalType === 'PAYMENT' ||
        t.originalType === 'DEBIT' ||
        t.originalType === 'XFER' ||
        parseFloat(t.amount) < 0 // Also accept negative amounts as debits
      );

      console.log(`Processing producer payment OFX file: Found ${debitTransactions.length} debit transactions out of ${transactions.length} total`);
      console.log(`Sample transactions:`, transactions.slice(0, 3).map(t => ({
        type: t.type,
        originalType: t.originalType,
        amount: t.amount,
        description: t.description
      })));

      if (debitTransactions.length === 0) {
        return res.status(400).json({
          error: "Nenhuma transação de débito (pagamentos) encontrada no arquivo OFX"
        });
      }

      // Create bank import record for producer payments
      const importRecord = await storage.createBankImport({
        fileName: req.file.originalname,
        fileSize: req.file.size.toString(),
        transactionCount: debitTransactions.length,
        importedAt: new Date(),
        status: 'completed',
        importType: 'producer_payments'
      });

      console.log(`Created producer payment import record: ${importRecord.id}`);

      let importedCount = 0;
      let skippedCount = 0;
      let errors: string[] = [];

      // Process each debit transaction
      for (const transaction of debitTransactions) {
        try {
          // Check if transaction already exists
          const existingTransaction = await storage.getBankTransactionByFitId(transaction.fitId);

          if (existingTransaction) {
            console.log(`Transaction ${transaction.fitId} already exists, skipping`);
            skippedCount++;
            continue;
          }

          // Create new transaction with absolute amount for display
          await storage.createBankTransaction({
            importId: importRecord.id,
            fitId: transaction.fitId,
            date: new Date(transaction.date),
            amount: transaction.amount, // Keep original negative value
            description: transaction.description,
            type: transaction.type,
            bankRef: transaction.bankRef,
            status: 'unmatched'
          });

          importedCount++;
        } catch (transactionError) {
          console.error(`Error importing producer payment transaction ${transaction.fitId}:`, transactionError);
          errors.push(`Erro ao importar transação ${transaction.fitId}: ${transactionError.message}`);
        }
      }

      // Update import record with results
      await storage.updateBankImport(importRecord.id, {
        status: 'completed',
        processedTransactions: importedCount,
        skippedTransactions: skippedCount
      });

      console.log(`Producer payment OFX import completed: ${importedCount} imported, ${skippedCount} skipped`);

      res.json({
        success: true,
        message: `Arquivo OFX de pagamentos importado com sucesso! ${importedCount} transações de débito importadas, ${skippedCount} duplicatas ignoradas.`,
        importId: importRecord.id,
        stats: {
          total: transactions.length,
          debits: debitTransactions.length,
          imported: importedCount,
          skipped: skippedCount,
          ...stats
        },
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Producer payment OFX import error:", error);
      res.status(500).json({
        error: "Erro ao importar arquivo OFX de pagamentos",
        details: error.message
      });
    }
  });

  // Financial overview data
  app.get("/api/finance/overview", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const payments = await storage.getPayments();
      const allCommissions = await storage.getAllCommissions();
      const productionOrders = await storage.getProductionOrders();
      const bankTransactions = await storage.getBankTransactions();
      const expenseNotes = await storage.getExpenseNotes();
      const producerPayments = await storage.getProducerPayments();

      console.log('Overview calculation - Data counts:', {
        orders: orders.length,
        payments: payments.length,
        commissions: allCommissions.length,
        productionOrders: productionOrders.length,
        expenseNotes: expenseNotes.length,
        producerPayments: producerPayments.length
      });

      // Contas a Receber - usar accountsReceivable (que já tem o valor correto)
      const accountsReceivable = await storage.getAccountsReceivable();
      const orderReceivables = accountsReceivable
        .filter(ar => ar.status !== 'paid')
        .reduce((total, ar) => {
          const amount = parseFloat(ar.amount || '0');
          const received = parseFloat(ar.receivedAmount || '0');
          const remaining = amount - received;
          return total + Math.max(0, remaining);
        }, 0);

      // Add manual receivables
      const manualReceivables = await storage.getManualReceivables();
      const manualReceivablesAmount = manualReceivables
        .filter(receivable => receivable.status !== 'paid')
        .reduce((total, receivable) => {
          const amount = parseFloat(receivable.amount || '0');
          const received = parseFloat(receivable.receivedAmount || '0');
          return total + Math.max(0, amount - received);
        }, 0);

      const receivables = orderReceivables + manualReceivablesAmount;

      // Contas a Pagar - usando producer payments em vez de production orders
      const producers = producerPayments
        .filter(payment => ['pending', 'approved'].includes(payment.status))
        .reduce((total, payment) => total + parseFloat(payment.amount || '0'), 0);

      console.log(`Producer payments pending/approved: ${producerPayments.filter(p => ['pending', 'approved'].includes(p.status)).length}, total: ${producers}`);

      const expenses = expenseNotes
        .filter(expense => expense.status === 'approved' && !expense.reimbursedAt)
        .reduce((total, expense) => total + parseFloat(expense.amount), 0);

      console.log(`Expenses approved not reimbursed: ${expenseNotes.filter(e => e.status === 'approved' && !e.reimbursedAt).length}, total: ${expenses}`);

      const commissions = allCommissions
        .filter(c => ['pending', 'confirmed'].includes(c.status) && !c.paidAt)
        .reduce((total, c) => total + parseFloat(c.amount), 0);

      console.log(`Commissions pending/confirmed: ${allCommissions.filter(c => ['pending', 'confirmed'].includes(c.status) && !c.paidAt).length}, total: ${commissions}`);

      const refunds = orders
        .filter(order => order.status === 'cancelled' && parseFloat(order.paidValue || '0') > 0)
        .reduce((total, order) => {
          const refundAmount = order.refundAmount ? parseFloat(order.refundAmount) : parseFloat(order.paidValue || '0');
          return total + refundAmount;
        }, 0);

      console.log(`Refunds for cancelled orders: ${orders.filter(o => o.status === 'cancelled' && parseFloat(order.paidValue || '0') > 0).length}, total: ${refunds}`);

      // Incluir contas a pagar manuais
      const manualPayables = await storage.getManualPayables();
      console.log(`Found ${manualPayables.length} manual payables:`, manualPayables.map(p => ({ id: p.id, amount: p.amount, status: p.status })));
      const manualPayablesAmount = manualPayables
        .filter(payable => payable.status === 'pending')
        .reduce((total, payable) => total + parseFloat(payable.amount || '0'), 0);

      console.log(`Manual payables total: ${manualPayablesAmount}`);

      const payables = producers + expenses + commissions + refunds + manualPayablesAmount;

      console.log('Payables breakdown:', {
        producers,
        expenses,
        commissions,
        refunds,
        manual: manualPayablesAmount,
        total: payables
      });

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
        payablesBreakdown: {
          producers: Number(producers) || 0,
          expenses: Number(expenses) || 0,
          commissions: Number(commissions) || 0,
          refunds: Number(refunds) || 0,
          manual: Number(manualPayablesAmount) || 0
        },
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
      const orders = await storage.getOrders();

      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          const order = orders.find(o => o.id === payment.orderId);
          let clientName = 'Cliente não identificado';

          if (order) {
            // Use contactName as primary source
            clientName = order.contactName;

            // If contactName is missing, try to get from client record
            if (!clientName && order.clientId) {
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
            orderNumber: order?.orderNumber || `#${payment.orderId?.slice(-6)}`,
            clientName: clientName,
            description: `${payment.method?.toUpperCase() || 'PAGAMENTO'} - ${clientName}`,
            orderValue: order?.totalValue || '0.00'
          };
        })
      );

      // Sort by payment date (most recent first)
      enrichedPayments.sort((a, b) => {
        const dateA = new Date(a.paidAt || a.createdAt);
        const dateB = new Date(b.paidAt || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      res.json(enrichedPayments);
    } catch (error) {
      console.error("Error fetching finance payments:", error);
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
      const totalOrders = productionOrders.length;

      const pendingPayments = producerPayments
        .filter(p => p.status === 'pending' || p.status === 'approved')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      const totalReceived = producerPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      res.json({
        activeOrders,
        pendingOrders,
        completedOrders,
        totalOrders,
        pendingPayments,
        totalReceived
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

  // Get products grouped by producer for budget/order creation
  app.get("/api/products/by-producer", async (req, res) => {
    try {
      const productsGrouped = await storage.getProductsGroupedByProducer();
      res.json(productsGrouped);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products by producer" });
    }
  });

  // Get products for specific producer
  app.get("/api/products/producer/:producerId", async (req, res) => {
    try {
      const { producerId } = req.params;
      const products = await storage.getProductsByProducer(producerId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch producer products" });
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

  // Create payments endpoint (used by receivables module)
  app.post("/api/payments", async (req, res) => {
    try {
      const { orderId, amount, method, status, transactionId, notes, paidAt } = req.body;

      console.log("Creating payment:", { orderId, amount, method, status });

      if (!orderId) {
        return res.status(400).json({ error: "Order ID é obrigatório" });
      }

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Valor deve ser maior que zero" });
      }

      // Verify order exists
      let order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Create payment
      const payment = await storage.createPayment({
        orderId: orderId,
        amount: parseFloat(amount).toFixed(2),
        method: method || "manual",
        status: status || "confirmed",
        transactionId: transactionId || `MANUAL-${Date.now()}`,
        notes: notes || "",
        paidAt: paidAt ? new Date(paidAt) : new Date()
      });

      console.log("Payment created successfully:", payment.id);
      res.json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Erro ao criar pagamento: " + error.message });
    }
  });

  // Create test payment for order
  app.post("/api/orders/:id/create-test-payment", async (req, res) => {
    try {
      const { amount } = req.body;
      const orderId = req.params.id;

      let order = await storage.getOrder(orderId);
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

  // Confirm order delivery (client received the order)
  app.post("/api/orders/:id/confirm-delivery", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Client confirming delivery for order: ${id}`);

      let order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      if (order.status !== 'shipped') {
        return res.status(400).json({ error: "Pedido deve estar despachado para confirmar a entrega" });
      }

      // Update order status to delivered
      const updatedOrder = await storage.updateOrder(id, {
        status: 'delivered',
        updatedAt: new Date()
      });

      // Update related production orders to delivered
      const productionOrders = await storage.getProductionOrdersByOrder(id);
      for (const po of productionOrders) {
        await storage.updateProductionOrderStatus(po.id, 'delivered', 'Cliente confirmou o recebimento');
      }

      console.log(`Order ${id} confirmed as delivered by client`);
      res.json({
        success: true,
        order: updatedOrder,
        message: "Entrega confirmada com sucesso!"
      });
    } catch (error) {
      console.error("Error confirming delivery:", error);
      res.status(500).json({ error: "Erro ao confirmar entrega: " + error.message });
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

  // Logistics products import route
  app.post("/api/logistics/products/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }

      const { producerId } = req.body;
      if (!producerId) {
        return res.status(400).json({ error: "Produtor é obrigatório para a importação" });
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
          error: "O arquivo JSON deve conter um array de produtos"
        });
      }

      if (productsData.length === 0) {
        return res.status(400).json({
          error: "O arquivo JSON está vazio."
        });
      }

      if (productsData.length > 10000) {
        return res.status(400).json({
          error: "Muitos produtos no arquivo. O limite é de 10.000 produtos por importação."
        });
      }

      console.log(`Importing ${productsData.length} products for producer ${producerId}...`);

      // Import products with producer assignment
      const result = await storage.importProductsForProducer(productsData, producerId);

      console.log(`Import completed: ${result.imported} imported, ${result.errors.length} errors`);

      res.json({
        message: `${result.imported} produtos importados com sucesso para o produtor`,
        imported: result.imported,
        total: productsData.length,
        errors: result.errors
      });
    } catch (error) {
      console.error('Logistics products import error:', error);
      res.status(500).json({
        error: "Erro interno do servidor ao processar importação de produtos",
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

  app.get("/api/budgets/client/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      console.log(`Fetching budgets for client: ${clientId}`);

      let budgets = [];

      // Get all budgets to search through
      const allBudgets = await storage.getBudgets();
      console.log(`Total budgets in system: ${allBudgets.length}`);

      // Find budgets that match this client ID in various ways
      for (const budget of allBudgets) {
        let shouldInclude = false;

        // Direct match with clientId
        if (budget.clientId === clientId) {
          shouldInclude = true;
        }

        // Check if clientId refers to a user, and find client record
        if (!shouldInclude) {
          try {
            const clientRecord = await storage.getClientByUserId(clientId);
            if (clientRecord && budget.clientId === clientRecord.id) {
              shouldInclude = true;
            }
          } catch (e) {
            // Continue searching
          }
        }

        // Check if budget.clientId is a client record, and see if its userId matches
        if (!shouldInclude) {
          try {
            const budgetClientRecord = await storage.getClient(budget.clientId);
            if (budgetClientRecord && budgetClientRecord.userId === clientId) {
              shouldInclude = true;
            }
          } catch (e) {
            // Continue searching
          }
        }

        // Also check if contactName matches user info (fallback for orders created from budgets)
        if (!shouldInclude && budget.contactName) {
          try {
            const user = await storage.getUser(clientId);
            if (user && user.name === budget.contactName) {
              shouldInclude = true;
            }
          } catch (e) {
            // Continue searching
          }
        }

        if (shouldInclude) {
          budgets.push(budget);
        }
      }

      // Remove duplicates
      const uniqueBudgets = budgets.filter((budget, index, self) =>
        index === self.findIndex(b => b.id === budget.id)
      );

      console.log(`Found ${uniqueBudgets.length} unique budgets for client ${clientId}`);

      // Enrich with vendor names and items
      const enrichedBudgets = await Promise.all(
        uniqueBudgets.map(async (budget) => {
          const vendor = await storage.getUser(budget.vendorId);
          const items = await storage.getBudgetItems(budget.id);
          const photos = await storage.getBudgetPhotos(budget.id);

          // Enrich items with product details
          const enrichedItems = await Promise.all(
            items.map(async (item) => {
              const product = await storage.getProduct(item.productId);
              return {
                ...item,
                productName: product?.name || 'Produto não encontrado'
              };
            })
          );

          // Get payment data
          const paymentData = await storage.getBudgetPaymentInfo(budget.id);

          // Ensure all budget fields are properly set
          return {
            ...budget,
            status: budget.status || 'draft', // Ensure status is always present
            vendorName: vendor?.name || 'Vendedor',
            photos: photos,
            items: enrichedItems,
            paymentData
          };
        })
      );

      // Sort by creation date (newest first)
      enrichedBudgets.sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      res.json(enrichedBudgets);
    } catch (error) {
      console.error("Error fetching client budgets:", error);
      res.status(500).json({ error: "Failed to fetch client budgets" });
    }
  });

  app.post("/api/budgets", async (req, res) => {
    try {
      // Validar personalizações antes de criar o orçamento - apenas logar alertas
      let customizationWarnings = [];

      if (req.body.items && req.body.items.length > 0) {
        console.log("Validando personalizações dos itens do orçamento:", JSON.stringify(req.body.items, null, 2));

        for (const item of req.body.items) {
          console.log(`Item: hasItemCustomization=${item.hasItemCustomization}, selectedCustomizationId=${item.selectedCustomizationId}, quantity=${item.quantity}`);

          if (item.hasItemCustomization && item.selectedCustomizationId) {
            const customizations = await storage.getCustomizationOptions();
            const customization = customizations.find(c => c.id === item.selectedCustomizationId);

            if (customization) {
              const itemQty = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
              const minQty = typeof customization.minQuantity === 'string' ? parseInt(customization.minQuantity) : customization.minQuantity;

              console.log(`Validação: itemQty=${itemQty} (${typeof item.quantity}), minQty=${minQty} (${typeof customization.minQuantity}), customization=${customization.name}`);

              if (itemQty < minQty) {
                console.log(`ALERTA: ${itemQty} < ${minQty} - Salvando orçamento mesmo assim`);
                customizationWarnings.push(`A personalização "${customization.name}" requer no mínimo ${minQty} unidades, mas o item tem ${itemQty} unidades.`);
              } else {
                console.log(`APROVADO: ${itemQty} >= ${minQty}`);
              }
            }
          }
        }
      }

      // Validate that contactName is provided
      if (!req.body.contactName) {
        return res.status(400).json({ error: "Nome de contato é obrigatório" });
      }

      console.log(`[CREATE BUDGET] Received ${req.body.items.length} items from frontend`);
      console.log('[CREATE BUDGET] Items received:', JSON.stringify(req.body.items.map(i => ({
        productId: i.productId,
        producerId: i.producerId,
        quantity: i.quantity,
        hasGeneralCustomization: i.hasGeneralCustomization,
        generalCustomizationName: i.generalCustomizationName
      }))));

      const newBudget = await storage.createBudget(req.body);

      // Remove duplicate items before processing
      const seenItems = new Set();
      const uniqueItems = req.body.items.filter(item => {
        const itemKey = `${item.productId}-${item.producerId || 'internal'}-${item.quantity}-${item.unitPrice}`;
        if (seenItems.has(itemKey)) {
          console.log(`[CREATE BUDGET] Removing duplicate budget item: ${item.productName || item.productId} (${itemKey})`);
          return false;
        }
        seenItems.add(itemKey);
        return true;
      });

      console.log(`[CREATE BUDGET] Processing ${uniqueItems.length} unique budget items (filtered from ${req.body.items.length})`);

      // Process budget items with ALL customization data
      for (const item of uniqueItems) {
        const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
        const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
        const itemCustomizationValue = typeof item.itemCustomizationValue === 'string' ? parseFloat(item.itemCustomizationValue) : item.itemCustomizationValue || 0;
        const generalCustomizationValue = typeof item.generalCustomizationValue === 'string' ? parseFloat(item.generalCustomizationValue) : item.generalCustomizationValue || 0;

        // Calculate total price including all customizations
        let totalPrice = unitPrice * quantity;
        if (item.hasItemCustomization && itemCustomizationValue > 0) {
          totalPrice += (itemCustomizationValue * quantity);
        }
        if (item.hasGeneralCustomization && generalCustomizationValue > 0) {
          totalPrice += (generalCustomizationValue * quantity);
        }

        await storage.createBudgetItem(newBudget.id, {
          productId: item.productId,
          producerId: item.producerId || 'internal',
          quantity: quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
          // Item Customization
          hasItemCustomization: item.hasItemCustomization || false,
          selectedCustomizationId: item.selectedCustomizationId || "",
          itemCustomizationValue: itemCustomizationValue.toFixed(2),
          itemCustomizationDescription: item.itemCustomizationDescription || "",
          additionalCustomizationNotes: item.additionalCustomizationNotes || "",
          customizationPhoto: item.customizationPhoto || "",
          // General Customization
          hasGeneralCustomization: item.hasGeneralCustomization || false,
          generalCustomizationName: item.generalCustomizationName || "",
          generalCustomizationValue: generalCustomizationValue.toFixed(2),
          // Product dimensions
          productWidth: item.productWidth ? parseFloat(item.productWidth) : null,
          productHeight: item.productHeight ? parseFloat(item.productHeight) : null,
          productDepth: item.productDepth ? parseFloat(item.productDepth) : null
        });
      }

      // Save payment and shipping information
      if (req.body.paymentMethodId || req.body.shippingMethodId) {
        await storage.createBudgetPaymentInfo({
          budgetId: newBudget.id,
          paymentMethodId: req.body.paymentMethodId || null,
          shippingMethodId: req.body.shippingMethodId || null,
          installments: req.body.installments || 1,
          downPayment: req.body.downPayment?.toString() || "0.00",
          remainingAmount: req.body.remainingAmount?.toString() || "0.00",
          shippingCost: req.body.shippingCost?.toString() || "0.00"
        });
      }

      // Process budget photos
      if (req.body.photos && req.body.photos.length > 0) {
        for (const photoUrl of req.body.photos) {
          await storage.createBudgetPhoto(newBudget.id, {
            imageUrl: photoUrl,
            description: "Imagem de personalização"
          });
        }
      }

      // Incluir alertas na resposta se existirem
      const response = {
        ...newBudget,
        warnings: customizationWarnings.length > 0 ? customizationWarnings : undefined
      };

      res.json(response);
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

      // Remove duplicate items before processing
      const seenItems = new Set();
      const uniqueItems = budgetData.items.filter(item => {
        const itemKey = `${item.productId}-${item.producerId || 'internal'}-${item.quantity}-${item.unitPrice}`;
        if (seenItems.has(itemKey)) {
          console.log(`Removing duplicate budget update item: ${item.productName || item.productId} (${itemKey})`);
          return false;
        }
        seenItems.add(itemKey);
        return true;
      });

      console.log(`Processing ${uniqueItems.length} unique budget update items (filtered from ${budgetData.items.length})`);

      for (const item of uniqueItems) {
        const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
        const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
        const itemCustomizationValue = typeof item.itemCustomizationValue === 'string' ? parseFloat(item.itemCustomizationValue) : item.itemCustomizationValue || 0;
        const generalCustomizationValue = typeof item.generalCustomizationValue === 'string' ? parseFloat(item.generalCustomizationValue) : item.generalCustomizationValue || 0;

        // Calculate total price including all customizations
        let totalPrice = unitPrice * quantity;
        if (item.hasItemCustomization && itemCustomizationValue > 0) {
          totalPrice += (itemCustomizationValue * quantity);
        }
        if (item.hasGeneralCustomization && generalCustomizationValue > 0) {
          totalPrice += (generalCustomizationValue * quantity);
        }

        await storage.createBudgetItem(updatedBudget.id, {
          productId: item.productId,
          producerId: item.producerId || 'internal',
          quantity: quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
          // Item Customization
          hasItemCustomization: item.hasItemCustomization || false,
          selectedCustomizationId: item.selectedCustomizationId || "",
          itemCustomizationValue: itemCustomizationValue.toFixed(2),
          itemCustomizationDescription: item.itemCustomizationDescription || "",
          additionalCustomizationNotes: item.additionalCustomizationNotes || "",
          customizationPhoto: item.customizationPhoto || "",
          // General Customization
          hasGeneralCustomization: item.hasGeneralCustomization || false,
          generalCustomizationName: item.generalCustomizationName || "",
          generalCustomizationValue: generalCustomizationValue.toFixed(2),
          // Product dimensions
          productWidth: item.productWidth ? parseFloat(item.productWidth) : null,
          productHeight: item.productHeight ? parseFloat(item.productHeight) : null,
          productDepth: item.productDepth ? parseFloat(item.productDepth) : null
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

  // Budget approval endpoint (for clients)
  app.post("/api/budgets/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { observations } = req.body;

      const updatedBudget = await storage.updateBudget(id, {
        status: "approved",
        approvedAt: new Date(),
        clientObservations: observations || null,
        hasVendorNotification: true // Nova notificação para o vendedor
      });

      if (!updatedBudget) {
        return res.status(404).json({ error: "Budget not found" });
      }

      console.log(`Budget ${id} approved by client with observations: ${observations}`);
      res.json(updatedBudget);
    } catch (error) {
      console.error("Error approving budget:", error);
      res.status(500).json({ error: "Erro ao aprovar orçamento" });
    }
  });

  // Budget rejection endpoint (for clients)
  app.post("/api/budgets/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { observations } = req.body;

      const updatedBudget = await storage.updateBudget(id, {
        status: "rejected",
        rejectedAt: new Date(),
        clientObservations: observations || null,
        hasVendorNotification: true // Nova notificação para o vendedor
      });

      if (!updatedBudget) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      console.log(`Budget ${id} rejected by client with observations: ${observations}`);
      res.json(updatedBudget);
    } catch (error) {
      console.error("Error rejecting budget:", error);
      res.status(500).json({ error: "Erro ao rejeitar orçamento" });
    }
  });

  // Convert approved budget to order
  app.post("/api/budgets/:id/convert-to-order", async (req, res) => {
    try {
      const { id } = req.params;
      const { producerId } = req.body;

      console.log(`Converting budget ${id} to order for client ${req.body.clientId}`);

      const order = await storage.convertBudgetToOrder(id, producerId);
      if (!order) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      res.json(order);
    } catch (error) {
      console.error("Error converting budget to order:", error.message);
      res.status(500).json({ error: "Erro ao converter orçamento em pedido: " + (error?.message || 'Erro desconhecido') });
    }
  });

  app.post("/api/budgets/:id/convert-to-budget", async (req, res) => {
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

      // Update budget status to 'sent' with proper timestamp
      const updatedBudget = await storage.updateBudget(req.params.id, {
        status: 'sent',
        updatedAt: new Date()
      });

      console.log(`Budget ${req.params.id} status updated to 'sent' for client ${budget.clientId || budget.contactName}`);

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
        message: "Orçamento marcado como enviado e disponível no painel do cliente",
        budget: updatedBudget
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
  app.get("/api/finance/producer-payments", async (req, res) => {
    try {
      const payments = await storage.getProducerPayments();

      // Enrich with production order and producer data
      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          const producer = await storage.getUser(payment.producerId);
          const productionOrder = await storage.getProductionOrder(payment.productionOrderId);
          let order = null;

          if (productionOrder) {
            order = await storage.getOrder(productionOrder.orderId);
          }

          return {
            ...payment,
            producerName: producer?.name || 'Unknown',
            productionOrder,
            order,
            // Add clientName, orderNumber, product from order if available
            clientName: order?.contactName || 'Cliente não encontrado',
            orderNumber: order?.orderNumber || 'N/A',
            product: order?.product || 'Produto não informado'
          };
        })
      );

      res.json(enrichedPayments);
    } catch (error) {
      console.error("Failed to fetch producer payments:", error);
      res.status(500).json({ error: "Failed to fetch producer payments" });
    }
  });

  // Register manual payment for producer
  app.post("/api/finance/producer-payments/:id/pay", async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, notes, transactionId } = req.body;

      console.log(`Manual payment for producer payment: ${id}`, { paymentMethod, notes, transactionId });

      // First try to get existing producer payment
      let payment = await storage.getProducerPayment(id);

      if (!payment) {
        // If payment doesn't exist, try to find production order and create payment
        const productionOrder = await storage.getProductionOrder(id);
        if (productionOrder && productionOrder.producerValue) {
          payment = await storage.createProducerPayment({
            productionOrderId: id,
            producerId: productionOrder.producerId,
            amount: productionOrder.producerValue,
            status: 'pending',
            notes: productionOrder.producerNotes || notes || null
          });
          console.log(`Created producer payment for production order ${id}`);
        } else {
          return res.status(404).json({ error: "Ordem de produção não encontrada ou sem valor definido" });
        }
      }

      // Update payment status to paid with all payment details
      const updatedPayment = await storage.updateProducerPayment(payment.id, {
        status: 'paid',
        paidBy: 'admin-1', // Could be req.user.id in real auth
        paidAt: new Date(),
        paymentMethod: paymentMethod || 'manual',
        notes: notes || payment.notes,
        // Mark as manual payment to prevent OFX reconciliation
        reconciliationStatus: 'manual',
        bankTransactionId: null
      });

      // Update production order payment status
      if (payment.productionOrderId) {
        await storage.updateProductionOrder(payment.productionOrderId, {
          producerPaymentStatus: 'paid'
        });
      }

      console.log(`Producer payment ${payment.id} marked as paid successfully`);

      res.json({
        success: true,
        payment: updatedPayment,
        message: "Pagamento registrado com sucesso"
      });
    } catch (error) {
      console.error("Error registering producer payment:", error);
      res.status(500).json({ error: "Erro ao registrar pagamento: " + error.message });
    }
  });

  app.get("/api/finance/producer-payments/pending", async (req, res) => {
    try {
      console.log("Fetching pending producer payments...");

      // Get all producer payments that are pending approval
      const allPayments = await storage.getProducerPayments();
      console.log(`Total producer payments found: ${allPayments.length}`);

      // Filter only pending payments that haven't been reconciled yet
      // Mutual exclusivity: only show payments with reconciliationStatus='pending'
      const pendingPayments = allPayments.filter(payment =>
        (payment.status === 'pending' || payment.status === 'approved') &&
        (payment.reconciliationStatus === 'pending' || !payment.reconciliationStatus)
      );
      console.log(`Pending/approved payments (not reconciled) found: ${pendingPayments.length}`);

      const enrichedPayments = await Promise.all(
        pendingPayments.map(async (payment) => {
          const producer = await storage.getUser(payment.producerId);
          const productionOrder = await storage.getProductionOrder(payment.productionOrderId);
          let orderInfo = null;
          let clientName = "Cliente não informado";

          if (productionOrder) {
            let order = await storage.getOrder(productionOrder.orderId);
            if (order) {
              orderInfo = order;
              clientName = order.contactName || "Nome não informado";
            }
          }

          const enrichedPayment = {
            ...payment,
            producerName: producer?.name || 'Produtor não encontrado',
            productionOrder: productionOrder,
            order: orderInfo,
            clientName: clientName,
            orderNumber: orderInfo?.orderNumber || 'N/A',
            product: orderInfo?.product || 'Produto não informado'
          };

          console.log(`Enriched payment ${payment.id}: status=${payment.status}, producer=${enrichedPayment.producerName}, amount=${payment.amount}`);
          return enrichedPayment;
        })
      );

      console.log(`Returning ${enrichedPayments.length} enriched pending producer payments`);
      res.json(enrichedPayments);
    } catch (error) {
      console.error("Error fetching pending producer payments:", error);
      res.status(500).json({ error: "Failed to fetch pending producer payments" });
    }
  });

  // Get logistics producer stats
  app.get("/api/logistics/producer-stats", async (req, res) => {
    try {
      const users = await storage.getUsers();
      const producers = users.filter(user => user.role === 'producer');
      const productsResult = await storage.getProducts({ limit: 9999 });

      const producerStats = await Promise.all(
        producers.map(async (producer) => {
          const productionOrders = await storage.getProductionOrdersByProducer(producer.id);
          const producerProducts = productsResult.products.filter(p => p.producerId === producer.id);

          return {
            id: producer.id,
            name: producer.name,
            specialty: producer.specialty || 'Não especificado',
            activeOrders: productionOrders.filter(po =>
              ['pending', 'accepted', 'production', 'quality_check', 'ready'].includes(po.status)
            ).length,
            completedOrders: productionOrders.filter(po => po.status === 'completed').length,
            totalProducts: producerProducts.length,
            isActive: producer.isActive
          };
        })
      );

      res.json(producerStats);
    } catch (error) {
      console.error("Error fetching producer stats:", error);
      res.status(500).json({ error: "Failed to fetch producer stats" });
    }
  });

  // Get paid orders for logistics (orders that are paid but not yet sent to production)
  app.get("/api/logistics/paid-orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();

      // Filter orders that are paid and ready for production
      const paidOrders = orders.filter(order => {
        const isPaid = parseFloat(order.paidValue || '0') > 0;
        const isConfirmed = order.status === 'confirmed';
        const notInProduction = order.status !== 'production';
        const hasExternalItems = order.items && Array.isArray(order.items) &&
          order.items.some((item: any) => item.producerId && item.producerId !== 'internal');

        return isPaid && isConfirmed && notInProduction && hasExternalItems;
      });

      // Enrich with client information
      const enrichedOrders = await Promise.all(
        paidOrders.map(async (order) => {
          let clientName = order.contactName || 'Cliente não identificado';
          let clientAddress = null;
          let clientPhone = order.contactPhone;
          let clientEmail = order.contactEmail;

          // Get client details if available
          if (order.clientId) {
            const clientRecord = await storage.getClient(order.clientId);
            if (clientRecord) {
              clientName = clientRecord.name;
              clientAddress = clientRecord.address;
              clientPhone = clientRecord.phone || order.contactPhone;
              clientEmail = clientRecord.email || order.contactEmail;
            } else {
              const clientByUserId = await storage.getClientByUserId(order.clientId);
              if (clientByUserId) {
                clientName = clientByUserId.name;
                clientAddress = clientByUserId.address;
                clientPhone = clientByUserId.phone || order.contactPhone;
                clientEmail = clientByUserId.email || order.contactEmail;
              } else {
                const clientUser = await storage.getUser(order.clientId);
                if (clientUser) {
                  clientName = clientUser.name;
                  clientPhone = clientUser.phone || order.contactPhone;
                  clientEmail = clientUser.email || order.contactEmail;
                  clientAddress = clientUser.address;
                }
              }
            }
          }

          const vendor = await storage.getUser(order.vendorId);
          const producer = order.producerId ? await storage.getUser(order.producerId) : null;

          // Get payment information
          const payments = await storage.getPaymentsByOrder(order.id);
          const lastPayment = payments
            .filter(p => p.status === 'confirmed')
            .sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime())[0];

          return {
            ...order,
            clientName: clientName,
            clientAddress: clientAddress || 'Endereço não informado',
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            lastPaymentDate: lastPayment?.paidAt || lastPayment?.createdAt,
            shippingAddress: order.deliveryType === 'pickup'
              ? 'Sede Principal - Retirada no Local'
              : (clientAddress || 'Endereço não informado')
          };
        })
      );

      console.log(`Found ${enrichedOrders.length} paid orders ready for production`);
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching paid orders:", error);
      res.status(500).json({ error: "Failed to fetch paid orders" });
    }
  });

  // Get production orders for logistics tracking
  app.get("/api/logistics/production-orders", async (req, res) => {
    try {
      const productionOrders = await storage.getProductionOrders();

      const enrichedOrders = await Promise.all(
        productionOrders.map(async (po) => {
          let order = await storage.getOrder(po.orderId);
          const producer = po.producerId ? await storage.getUser(po.producerId) : null;

          if (!order) {
            return null; // Skip if order doesn't exist
          }

          // Always use contactName as primary client identifier
          let clientName = order.contactName;
          let clientAddress = null;
          let clientPhone = order.contactPhone;
          let clientEmail = order.contactEmail;

          // Only if contactName is missing, try to get from client record
          if (!clientName && order.clientId) {
            const clientRecord = await storage.getClient(order.clientId);
            if (clientRecord) {
              clientName = clientRecord.name;
              clientAddress = clientRecord.address;
              clientPhone = clientRecord.phone || order.contactPhone;
              clientEmail = clientRecord.email || order.contactEmail;
            } else {
              const clientByUserId = await storage.getClientByUserId(order.clientId);
              if (clientByUserId) {
                clientName = clientByUserId.name;
                clientAddress = clientByUserId.address;
                clientPhone = clientByUserId.phone || order.contactPhone;
                clientEmail = clientByUserId.email || order.contactEmail;
              } else {
                const clientUser = await storage.getUser(order.clientId);
                if (clientUser) {
                  clientName = clientUser.name;
                  clientPhone = clientUser.phone || order.contactPhone;
                  clientEmail = clientUser.email || order.contactEmail;
                  clientAddress = clientUser.address;
                }
              }
            }
          }

          // If still no name, use a descriptive message
          if (!clientName) {
            clientName = "Nome não informado";
          }

          return {
            ...po,
            orderNumber: order.orderNumber || `PO-${po.id}`,
            product: order.product || 'Produto não informado',
            clientName: clientName,
            clientAddress: clientAddress,
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            producerName: producer?.name || null,
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

      // Filter out null entries
      const validOrders = enrichedOrders.filter(order => order !== null);

      console.log(`Returning ${validOrders.length} enriched production orders`);
      res.json(validOrders);
    } catch (error) {
      console.error("Error fetching production orders:", error);
      res.status(500).json({ error: "Failed to fetch production orders" });
    }
  });

  // Dispatch order (mark as shipped)
  app.post("/api/logistics/dispatch-order", async (req, res) => {
    try {
      const { productionOrderId, orderId, notes, trackingCode } = req.body;

      // Update production order to shipped status
      if (productionOrderId) {
        await storage.updateProductionOrderStatus(
          productionOrderId,
          'shipped',
          notes || 'Produto despachado para o cliente',
          null,
          trackingCode
        );
      }

      // Update main order to shipped status
      if (orderId) {
        await storage.updateOrder(orderId, {
          status: 'shipped',
          trackingCode: trackingCode || null
        });
      }

      console.log(`Order ${orderId} dispatched with tracking: ${trackingCode}`);

      res.json({
        success: true,
        message: "Pedido despachado com sucesso"
      });
    } catch (error) {
      console.error("Error dispatching order:", error);
      res.status(500).json({ error: "Failed to dispatch order" });
    }
  });

  // Get budgets by vendor
  app.get("/api/budgets/vendor/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const budgets = await storage.getBudgetsByVendor(vendorId);
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching vendor budgets:", error);
      res.status(500).json({ error: "Failed to fetch vendor budgets" });
    }
  });

  // Get all clients
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      console.log(`Found ${clients.length} clients`);

      // Enrich with additional information
      const enrichedClients = await Promise.all(
        clients.map(async (client) => {
          // Get vendor information
          const vendor = client.vendorId ? await storage.getUser(client.vendorId) : null;

          // Get orders count and total spent
          const orders = await storage.getOrdersByClient(client.id);
          const ordersCount = orders.length;
          const totalSpent = orders.reduce((sum, order) => {
            return sum + parseFloat(order.totalValue || '0');
          }, 0);

          return {
            ...client,
            vendorName: vendor?.name || null,
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

  // Get clients by vendor
  app.get("/api/vendors/:vendorId/clients", async (req, res) => {
    try {
      const { vendorId } = req.params;
      console.log(`Fetching clients for vendor: ${vendorId}`);

      const clients = await storage.getClientsByVendor(vendorId);
      console.log(`Found ${clients.length} clients for vendor ${vendorId}:`, clients.map(c => ({ id: c.id, name: c.name, vendorId: c.vendorId })));

      // Enrich with user data if available
      const enrichedClients = await Promise.all(
        clients.map(async (client) => {
          // Get user information if userId is available
          let userData = null;
          if (client.userId) {
            userData = await storage.getUser(client.userId);
          }

          // Get orders count and total spent
          const orders = await storage.getOrdersByClient(client.id);
          const ordersCount = orders.length;
          const totalSpent = orders.reduce((sum, order) => {
            return sum + parseFloat(order.totalValue || '0');
          }, 0);

          return {
            ...client,
            username: userData?.username || client.userCode || 'N/A',
            userCode: client.userCode || userData?.username || client.username || 'N/A',
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

  // Create client
  app.post("/api/clients", async (req, res) => {
    try {
      const clientData = req.body;
      console.log(`Creating client with data:`, clientData);

      const newClient = await storage.createClient(clientData);
      console.log(`Client created successfully:`, newClient);

      res.json(newClient);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  // Get client orders
  app.get("/api/clients/:clientId/orders", async (req, res) => {
    try {
      const { clientId } = req.params;
      console.log(`Fetching orders for client: ${clientId}`);

      const orders = await storage.getOrdersByClient(clientId);
      console.log(`Found ${orders.length} orders for client ${clientId}`);

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
      console.error("Error fetching client orders:", error);
      res.status(500).json({ error: "Failed to fetch client orders" });
    }
  });

  // Logistics routes
  app.get("/api/logistics/orders", async (req, res) => {
    try {
      // Get orders that are ready for logistics (shipped, ready)
      const orders = await storage.getOrders();
      const logisticsOrders = orders.filter(order =>
        ['ready', 'shipped', 'delivered'].includes(order.status)
      );

      const enrichedOrders = await Promise.all(
        logisticsOrders.map(async (order) => {
          let clientName = order.contactName || 'Cliente não identificado';
          let clientAddress = null;
          let clientPhone = order.contactPhone;
          let clientEmail = order.contactEmail;

          // Get client details if available
          if (order.clientId) {
            const clientRecord = await storage.getClient(order.clientId);
            if (clientRecord) {
              clientName = clientRecord.name;
              clientAddress = clientRecord.address;
              clientPhone = clientRecord.phone || order.contactPhone;
              clientEmail = clientRecord.email || order.contactEmail;
            } else {
              const clientByUserId = await storage.getClientByUserId(order.clientId);
              if (clientByUserId) {
                clientName = clientByUserId.name;
                clientAddress = clientByUserId.address;
                clientPhone = clientByUserId.phone || order.contactPhone;
                clientEmail = clientByUserId.email || order.contactEmail;
              } else {
                const clientUser = await storage.getUser(order.clientId);
                if (clientUser) {
                  clientName = clientUser.name;
                  clientPhone = clientUser.phone || order.contactPhone;
                  clientEmail = clientUser.email || order.contactEmail;
                  clientAddress = clientUser.address;
                }
              }
            }
          }

          const vendor = await storage.getUser(order.vendorId);
          const producer = order.producerId ? await storage.getUser(order.producerId) : null;

          return {
            ...order,
            clientName,
            clientAddress: clientAddress || 'Endereço não informado',
            clientPhone,
            clientEmail,
            vendorName: vendor?.name || 'Vendedor',
            producerName: producer?.name || null,
            shippingAddress: order.deliveryType === 'pickup'
              ? 'Sede Principal - Retirada no Local'
              : (clientAddress || 'Endereço não informado'),
            deliveryType: order.deliveryType || 'delivery'
          };
        })
      );

      console.log(`Returning ${enrichedOrders.length} logistics orders`);
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching logistics orders:", error);
      res.status(500).json({ error: "Failed to fetch logistics orders" });
    }
  });

  // Expedition routes
  app.get("/api/expedition/orders", async (req, res) => {
    try {
      // Get orders that are ready for expedition (completed, ready for shipping)
      const orders = await storage.getOrders();
      const expeditionOrders = orders.filter(order =>
        ['ready', 'shipped'].includes(order.status)
      );

      const enrichedOrders = await Promise.all(
        expeditionOrders.map(async (order) => {
          let clientName = order.contactName || 'Cliente não identificado';
          let clientAddress = null;
          let clientPhone = order.contactPhone;
          let clientEmail = order.contactEmail;

          // Get client details if available
          if (order.clientId) {
            const clientRecord = await storage.getClient(order.clientId);
            if (clientRecord) {
              clientName = clientRecord.name;
              clientAddress = clientRecord.address;
              clientPhone = clientRecord.phone || order.contactPhone;
              clientEmail = clientRecord.email || order.contactEmail;
            } else {
              const clientByUserId = await storage.getClientByUserId(order.clientId);
              if (clientByUserId) {
                clientName = clientByUserId.name;
                clientAddress = clientByUserId.address;
                clientPhone = clientByUserId.phone || order.contactPhone;
                clientEmail = clientByUserId.email || order.contactEmail;
              } else {
                const clientUser = await storage.getUser(order.clientId);
                if (clientUser) {
                  clientName = clientUser.name;
                  clientPhone = clientUser.phone || order.contactPhone;
                  clientEmail = clientUser.email || order.contactEmail;
                  clientAddress = clientUser.address;
                }
              }
            }
          }

          const vendor = await storage.getUser(order.vendorId);
          const producer = order.producerId ? await storage.getUser(order.producerId) : null;

          return {
            ...order,
            clientName,
            clientAddress: clientAddress || 'Endereço não informado',
            clientPhone,
            clientEmail,
            vendorName: vendor?.name || 'Vendedor',
            producerName: producer?.name || null,
            shippingAddress: order.deliveryType === 'pickup'
              ? 'Sede Principal - Retirada no Local'
              : (clientAddress || 'Endereço não informado'),
            deliveryType: order.deliveryType || 'delivery'
          };
        })
      );

      console.log(`Returning ${enrichedOrders.length} expedition orders`);
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching expedition orders:", error);
      res.status(500).json({ error: "Failed to fetch expedition orders" });
    }
  });

  // Get all payment methods
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const methods = await storage.getAllPaymentMethods();
      res.json(methods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  // Get all shipping methods
  app.get("/api/shipping-methods", async (req, res) => {
    try {
      const methods = await storage.getAllShippingMethods();
      res.json(methods);
    } catch (error) {
      console.error("Error fetching shipping methods:", error);
      res.status(500).json({ error: "Failed to fetch shipping methods" });
    }
  });

  // Approve budget
  app.post("/api/budgets/:id/approve", async (req, res) => {
    try {
      const budgetId = req.params.id;
      const budget = await storage.getBudget(budgetId);

      if (!budget) {
        return res.status(404).json({ error: "Budget not found" });
      }

      budget.status = 'approved';
      budget.updatedAt = new Date().toISOString();

      await storage.updateBudget(budgetId, budget);

      res.json({ success: true, budget });
    } catch (error) {
      console.error('Error approving budget:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get pending actions count for vendor
  app.get("/api/vendor/:vendorId/pending-actions", async (req, res) => {
    try {
      const vendorId = req.params.vendorId;
      const budgets = await storage.getBudgetsByVendor(vendorId);

      // Count approved budgets waiting to be converted to orders
      const approvedBudgets = budgets.filter((budget: any) => budget.status === 'approved');

      res.json({ count: approvedBudgets.length });
    } catch (error) {
      console.error('Error fetching pending actions:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Finance payment data routes
  app.get("/api/finance/payment-data", async (req, res) => {
    try {
      const paymentData = await storage.getPaymentData();
      res.json(paymentData || {
        pix: '',
        bankAccount: '',
        paymentLink: '',
        instructions: ''
      });
    } catch (error) {
      console.error('Error fetching payment data:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/finance/payment-data", async (req, res) => {
    try {
      const paymentData = req.body;
      await storage.updatePaymentData(paymentData);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating payment data:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get budgets for client
  app.get("/api/budgets/client/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      console.log(`Fetching budgets for client: ${clientId}`);

      let budgets = [];

      // Get all budgets to search through
      const allBudgets = await storage.getBudgets();
      console.log(`Total budgets in system: ${allBudgets.length}`);

      // Find budgets that match this client ID in various ways
      for (const budget of allBudgets) {
        let shouldInclude = false;

        // Direct match with clientId
        if (budget.clientId === clientId) {
          shouldInclude = true;
        }

        // Check if clientId refers to a user, and find client record
        if (!shouldInclude) {
          try {
            const clientRecord = await storage.getClientByUserId(clientId);
            if (clientRecord && budget.clientId === clientRecord.id) {
              shouldInclude = true;
            }
          } catch (e) {
            // Continue searching
          }
        }

        // Check if budget.clientId is a client record, and see if its userId matches
        if (!shouldInclude) {
          try {
            const budgetClientRecord = await storage.getClient(budget.clientId);
            if (budgetClientRecord && budgetClientRecord.userId === clientId) {
              shouldInclude = true;
            }
          } catch (e) {
            // Continue searching
          }
        }

        // Also check if contactName matches user info (fallback for orders created from budgets)
        if (!shouldInclude && budget.contactName) {
          try {
            const user = await storage.getUser(clientId);
            if (user && user.name === budget.contactName) {
              shouldInclude = true;
            }
          } catch (e) {
            // Continue searching
          }
        }

        if (shouldInclude) {
          budgets.push(budget);
        }
      }

      // Remove duplicates
      const uniqueBudgets = budgets.filter((budget, index, self) =>
        index === self.findIndex(b => b.id === budget.id)
      );

      console.log(`Found ${uniqueBudgets.length} unique budgets for client ${clientId}`);

      // Enrich with vendor names and items
      const enrichedBudgets = await Promise.all(
        uniqueBudgets.map(async (budget) => {
          const vendor = await storage.getUser(budget.vendorId);
          const items = await storage.getBudgetItems(budget.id);
          const photos = await storage.getBudgetPhotos(budget.id);

          // Enrich items with product details
          const enrichedItems = await Promise.all(
            items.map(async (item) => {
              const product = await storage.getProduct(item.productId);
              return {
                ...item,
                productName: product?.name || 'Produto não encontrado'
              };
            })
          );

          // Get payment data
          const paymentData = await storage.getBudgetPaymentInfo(budget.id);

          // Ensure all budget fields are properly set
          return {
            ...budget,
            status: budget.status || 'draft', // Ensure status is always present
            vendorName: vendor?.name || 'Vendedor',
            photos: photos,
            items: enrichedItems,
            paymentData
          };
        })
      );

      // Sort by creation date (newest first)
      enrichedBudgets.sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      res.json(enrichedBudgets);
    } catch (error) {
      console.error("Error fetching client budgets:", error);
      res.status(500).json({ error: "Failed to fetch client budgets" });
    }
  });

  // Send order to production
  app.post("/api/orders/:id/send-to-production", async (req, res) => {
    try {
      const { id } = req.params;
      const { producerId } = req.body;

      let order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Update order status to production
      await storage.updateOrderStatus(id, 'production');

      // Create production orders for each producer involved in this order
      const producersInvolved = new Set<string>();
      const producerNames: string[] = [];

      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          if (item.producerId && item.producerId !== 'internal') {
            producersInvolved.add(item.producerId);
          }
        }
      }

      // If specific producerId is provided, only create for that producer
      const targetProducers = producerId ? [producerId] : Array.from(producersInvolved);

      let productionOrdersCreated = 0;

      for (const pId of targetProducers) {
        const producer = await storage.getUser(pId);
        if (producer) {
          producerNames.push(producer.name);

          // Check if production order already exists
          const existingPOs = await storage.getProductionOrdersByOrder(id);
          const existingPO = existingPOs.find(po => po.producerId === pId);

          if (!existingPO) {
            await storage.createProductionOrder({
              orderId: id,
              producerId: pId,
              status: 'pending',
              deadline: order.deadline,
              notes: `Produção de itens do pedido ${order.orderNumber}`,
              deliveryDeadline: order.deliveryDeadline
            });
            productionOrdersCreated++;
          }
        }
      }

      console.log(`Order ${id} sent to production. Created ${productionOrdersCreated} production orders for producers: ${producerNames.join(', ')}`);

      res.json({
        success: true,
        productionOrdersCreated,
        producerNames
      });
    } catch (error) {
      console.error("Error sending order to production:", error);
      res.status(500).json({ error: "Erro ao enviar para produção" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}