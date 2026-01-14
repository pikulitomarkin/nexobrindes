import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db as storage, eq, budgets, budgetPhotos, productionOrders, desc, sql, type ProductionOrder, users as usersTable, orders as ordersTable, productionOrders as productionOrdersTable } from './db';
import { OrderEnrichmentService } from './services/order-enrichment.js';
import { logger } from './logger';
import { ObjectStorageService, ObjectNotFoundError } from './objectStorage';

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

  // Try to get user from token if available
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [userId] = decoded.split(':');
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          req.user = user;
        }
      }
    } catch (e) {
      // If token parsing fails, continue without user context
    }
  }

  // Fallback: Mock req.user for routes that need it if no valid user found
  if (!req.user) {
    req.user = null; // Set to null instead of mock data
  }

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

  console.log(`Parsing OFX content: ${ofxContent.length} characters, ${stats.totalLines} lines`);

  let ofxData;
  try {
    // Parse OFX using node-ofx-parser
    ofxData = Ofx.parse(ofxContent);
    console.log('OFX parsing successful, structure:', JSON.stringify(ofxData, null, 2).substring(0, 500) + '...');
  } catch (parseError) {
    console.error('OFX parsing failed:', parseError);
    throw new Error(`Erro ao analisar arquivo OFX: ${parseError.message}`);
  }

  const transactions: ParsedOFXTransaction[] = [];

  // Check for different OFX structures
  const stmtTrnRsList = ofxData?.OFX?.BANKMSGSRSV1?.STMTTRNRS || 
                       ofxData?.BANKMSGSRSV1?.STMTTRNRS ||
                       ofxData?.OFX?.STMTTRNRS;
                       
  if (!stmtTrnRsList) {
    console.warn('No STMTTRNRS found in OFX file. Available keys:', Object.keys(ofxData || {}));
    if (ofxData?.OFX) {
      console.warn('OFX keys:', Object.keys(ofxData.OFX));
      if (ofxData.OFX.BANKMSGSRSV1) {
        console.warn('BANKMSGSRSV1 keys:', Object.keys(ofxData.OFX.BANKMSGSRSV1));
      }
    }
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
  // Serve static files from public/uploads directory (legacy support)
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  // Serve objects from Object Storage
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      await objectStorageService.downloadObject(`/objects/${req.params.objectPath}`, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // File upload endpoint - using Object Storage for persistence
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      console.log(`Upload request received: ${req.file.originalname}, size: ${req.file.size}, type: ${req.file.mimetype}`);

      // Validate file size (5MB limit)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Arquivo muito grande. Limite de 5MB.' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Tipo de arquivo não permitido. Use apenas imagens.' });
      }

      const objectStorageService = new ObjectStorageService();
      const folder = (req.body.folder || 'uploads') as string;
      
      // Upload to Object Storage for persistence
      const objectPath = await objectStorageService.uploadBuffer(
        req.file.buffer,
        folder,
        req.file.originalname
      );

      console.log(`File uploaded successfully: ${objectPath}`);
      res.json({ url: objectPath });
    } catch (error) {
      console.error('Upload error details:', {
        message: error.message,
        stack: error.stack,
        fileName: req.file?.originalname,
        fileSize: req.file?.size
      });
      
      // Return more specific error message
      const errorMessage = error.message.includes('Object Storage') 
        ? 'Erro no serviço de armazenamento. Tente novamente.'
        : 'Erro no upload do arquivo. Verifique o formato e tamanho.';
        
      res.status(500).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

  // Get production order details with enriched data
  app.get("/api/production-orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Getting production order details for: ${id}`);

      const productionOrder = await storage.getProductionOrder(id);
      if (!productionOrder) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      // Get the main order details
      const order = await storage.getOrder(productionOrder.orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido principal não encontrado" });
      }

      // Get production order items
      const items = await storage.getProductionOrderItems(productionOrder.id);

      // Get budget photos if order was converted from budget
      let photos = [];
      if (order.budgetId) {
        const budgetPhotos = await storage.getBudgetPhotos(order.budgetId);
        photos = budgetPhotos.map(photo => photo.imageUrl || photo.photoUrl);
      }

      // Parse orderDetails if it exists (JSON string)
      let orderDetails = null;
      if (productionOrder.orderDetails) {
        try {
          orderDetails = JSON.parse(productionOrder.orderDetails);
        } catch (e) {
          console.log("Error parsing orderDetails JSON:", e);
        }
      }

      const enrichedProductionOrder = {
        ...productionOrder,
        order: order,
        orderDetails: orderDetails,
        items: items || [],
        photos: photos || []
      };

      console.log(`Production order ${id} details fetched with status: ${productionOrder.status}`);
      res.json(enrichedProductionOrder);
    } catch (error) {
      console.error("Error fetching production order details:", error);
      res.status(500).json({ error: "Erro ao buscar detalhes da ordem de produção" });
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

  // Get budgets by vendor
  app.get("/api/budgets/vendor/:vendorId", async (req, res) => {
    try {
      const { vendorId } = req.params;
      console.log(`Fetching budgets for vendor: ${vendorId}`);

      const budgets = await storage.getBudgetsByVendor(vendorId);
      console.log(`Found ${budgets.length} budgets for vendor ${vendorId}`);

      // Enrich each budget with its items (like admin does)
      const enrichedBudgets = await Promise.all(
        budgets.map(async (budget) => {
          const items = await storage.getBudgetItems(budget.id);
          return {
            ...budget,
            items
          };
        })
      );

      res.json(enrichedBudgets);
    } catch (error) {
      console.error("Error fetching budgets by vendor:", error);
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  // Debug endpoint to check product-producer associations
  app.get("/api/debug/budget-items/:budgetId", async (req, res) => {
    try {
      const { budgetId } = req.params;

      const budget = await storage.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ error: "Budget not found" });
      }

      const items = await storage.getBudgetItems(budgetId);
      const producers = await storage.getUsersByRole('producer');

      const debugInfo = {
        budgetId: budgetId,
        budgetTitle: budget.title,
        totalItems: items.length,
        producers: producers.map(p => ({ id: p.id, name: p.name })),
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          producerId: item.producerId || 'NOT_SET',
          hasProducer: !!item.producerId && item.producerId !== 'internal'
        })),
        itemsByProducer: {}
      };

      // Group by producer
      const grouped: { [key: string]: any[] } = {};
      items.forEach(item => {
        const pid = item.producerId || 'internal';
        if (!grouped[pid]) grouped[pid] = [];
        grouped[pid].push({
          productId: item.productId,
          productName: item.productName
        });
      });
      debugInfo.itemsByProducer = grouped;

      console.log(`[DEBUG ENDPOINT] Budget ${budgetId} analysis:`, debugInfo);
      res.json(debugInfo);
    } catch (error) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Customization Options endpoints
  app.get("/api/settings/customization-options", requireAuth, async (req, res) => {
    try {
      const options = await storage.getCustomizationOptions();
      res.json(options);
    } catch (error) {
      console.error('Error fetching customization options:', error);
      res.status(500).json({ error: "Erro ao buscar opções de personalização" });
    }
  });

  app.post("/api/settings/customization-options", requireAuth, async (req, res) => {
    try {
      const { name, description, category, minQuantity, price, isActive } = req.body;

      if (!name || !category || !minQuantity || !price) {
        return res.status(400).json({ error: "Campos obrigatórios: nome, categoria, quantidade mínima e preço" });
      }

      const newOption = await storage.createCustomizationOption({
        name,
        description: description || "",
        category,
        minQuantity: parseInt(minQuantity),
        price: parseFloat(price).toFixed(2),
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user?.id || '6baf169c-0086-4452-b923-7541ab59ae39'
      });

      res.json(newOption);
    } catch (error) {
      console.error('Error creating customization option:', error);
      res.status(500).json({ error: "Erro ao criar opção de personalização" });
    }
  });

  app.put("/api/settings/customization-options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, category, minQuantity, price, isActive } = req.body;

      if (!name || !category || !minQuantity || !price) {
        return res.status(400).json({ error: "Campos obrigatórios: nome, categoria, quantidade mínima e preço" });
      }

      const updatedOption = await storage.updateCustomizationOption(id, {
        name,
        description: description || "",
        category,
        minQuantity: parseInt(minQuantity),
        price: parseFloat(price).toFixed(2),
        isActive: isActive !== undefined ? isActive : true
      });

      if (!updatedOption) {
        return res.status(404).json({ error: "Opção de personalização não encontrada" });
      }

      res.json(updatedOption);
    } catch (error) {
      console.error('Error updating customization option:', error);
      res.status(500).json({ error: "Erro ao atualizar opção de personalização" });
    }
  });

  app.delete("/api/settings/customization-options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await storage.deleteCustomizationOption(id);
      if (!deleted) {
        return res.status(404).json({ error: "Opção de personalização não encontrada" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting customization option:', error);
      res.status(500).json({ error: "Erro ao deletar opção de personalização" });
    }
  });

  app.post("/api/settings/customization-options/bulk-import", requireAuth, async (req, res) => {
    try {
      const { customizations } = req.body;

      if (!customizations || !Array.isArray(customizations)) {
        return res.status(400).json({ error: "Lista de personalizações inválida" });
      }

      let imported = 0;
      const errors = [];

      for (const customization of customizations) {
        try {
          if (!customization.name || !customization.category || !customization.minQuantity || customization.price === undefined) {
            errors.push(`Personalização "${customization.name || 'sem nome'}" - campos obrigatórios faltando`);
            continue;
          }

          await storage.createCustomizationOption({
            name: customization.name,
            description: customization.description || "",
            category: customization.category,
            minQuantity: parseInt(customization.minQuantity),
            price: parseFloat(customization.price).toFixed(2),
            isActive: customization.isActive !== undefined ? customization.isActive : true,
            createdBy: req.user?.id || '6baf169c-0086-4452-b923-7541ab59ae39'
          });
          imported++;
        } catch (error) {
          errors.push(`Erro ao importar "${customization.name}": ${error.message}`);
        }
      }

      res.json({ 
        imported, 
        total: customizations.length, 
        errors: errors.slice(0, 10) // Limitar erros para não sobrecarregar resposta
      });
    } catch (error) {
      console.error('Error bulk importing customization options:', error);
      res.status(500).json({ error: "Erro ao importar personalizações em lote" });
    }
  });

  // Categories endpoints for customization options
  app.get("/api/customization-categories", async (req, res) => {
    try {
      const categories = await storage.getCustomizationCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching customization categories:', error);
      res.status(500).json({ error: "Erro ao buscar categorias de personalização" });
    }
  });

  app.post("/api/customization-categories", requireAuth, async (req, res) => {
    try {
      const { name } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: "Nome da categoria é obrigatório" });
      }

      const category = await storage.createCustomizationCategory(name.trim());
      res.json(category);
    } catch (error) {
      console.error('Error creating customization category:', error);
      res.status(500).json({ error: "Erro ao criar categoria de personalização" });
    }
  });

  // Get budget PDF data with all images
  app.get("/api/budgets/:id/pdf-data", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`=== PDF DATA REQUEST FOR BUDGET: ${id} ===`);

      const budget = await storage.getBudget(id);
      if (!budget) {
        console.log(`ERROR: Budget not found: ${id}`);
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      console.log(`Found budget: ${budget.budgetNumber} - ${budget.title}`);

      // Get budget items with product details
      const items = await storage.getBudgetItems(id);
      console.log(`Found ${items.length} budget items:`, items.map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })));

      // Filter and validate items before enriching
      const validItems = items.filter((item: any) => {
        const isValid = item.productId &&
                       item.productName &&
                       item.productName.trim() !== '' &&
                       item.quantity > 0 &&
                       item.unitPrice > 0;

        if (!isValid) {
          console.log(`Filtering out invalid item for PDF:`, {
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          });
        }

        return isValid;
      });

      // Remove duplicates based on productId, producerId, quantity, and unitPrice
      const uniqueValidItems = [];
      const seenItemKeys = new Set();

      for (const item of validItems) {
        const itemKey = `${item.productId}-${item.producerId || 'internal'}-${item.quantity}-${item.unitPrice}`;
        if (!seenItemKeys.has(itemKey)) {
          seenItemKeys.add(itemKey);
          uniqueValidItems.push(item);
        } else {
          console.log(`Removing duplicate item for PDF: ${item.productName} (${itemKey})`);
        }
      }

      console.log(`Processing ${uniqueValidItems.length} unique valid items for PDF (filtered from ${items.length} total items)`);

      // Enrich items with product data
      const enrichedItems = await Promise.all(
        uniqueValidItems.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return {
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            hasItemCustomization: item.hasItemCustomization,
            itemCustomizationPercentage: item.itemCustomizationPercentage,
            itemCustomizationDescription: item.itemCustomizationDescription,
            itemCustomizationValue: item.itemCustomizationValue,
            customizationPhoto: item.customizationPhoto,
            productWidth: item.productWidth,
            productHeight: item.productHeight,
            productDepth: item.productDepth,
            product: {
              name: product?.name || item.productName || 'Produto não encontrado',
              description: product?.description || '',
              category: product?.category || '',
              imageLink: product?.imageLink || ''
            }
          };
        })
      );

      // Get client information
      let clientName = budget.contactName || 'Cliente não informado';
      let clientEmail = budget.contactEmail || '';
      let clientPhone = budget.contactPhone || '';

      // Try to get client data if clientId exists
      if (budget.clientId) {
        try {
          const client = await storage.getClient(budget.clientId);
          if (client) {
            clientName = client.name;
            clientEmail = client.email || budget.contactEmail || '';
            clientPhone = client.phone || budget.contactPhone || '';
          } else {
            // Try to get by userId if not found as client
            const clientByUserId = await storage.getClientByUserId(budget.clientId);
            if (clientByUserId) {
              clientName = clientByUserId.name;
              clientEmail = clientByUserId.email || budget.contactEmail || '';
              clientPhone = clientByUserId.phone || budget.contactPhone || '';
            }
          }
        } catch (error) {
          console.log(`Error fetching client data for PDF: ${error.message}`);
        }
      }

      console.log(`Final client data:`, { name: clientName, email: clientEmail, phone: clientPhone });

      // Get vendor information
      let vendor = null;
      try {
        vendor = await storage.getUser(budget.vendorId);
        console.log(`Vendor lookup - budget.vendorId: ${budget.vendorId}, found vendor:`, !!vendor);
      } catch (error) {
        console.log(`Error fetching vendor data for PDF: ${error.message}`);
      }

      // Get budget photos
      const photos = await storage.getBudgetPhotos(id);
      const photoUrls = photos.map(photo => photo.imageUrl || photo.photoUrl);

      // Get payment and shipping methods
      const paymentMethods = await storage.getPaymentMethods();
      const shippingMethods = await storage.getShippingMethods();

      // Get payment info
      const paymentInfo = await storage.getBudgetPaymentInfo(id);

      // Get branch info if budget has a branchId
      let branchInfo = null;
      if (budget.branchId) {
        const branch = await storage.getBranch(budget.branchId);
        if (branch) {
          branchInfo = {
            id: branch.id,
            name: branch.name,
            city: branch.city,
            cnpj: branch.cnpj || null,
            address: branch.address || null,
            email: (branch as any).email || null,
            phone: (branch as any).phone || null,
            isHeadquarters: branch.isHeadquarters || false
          };
          console.log(`Branch info for PDF: ${branch.name} - CNPJ: ${branch.cnpj || 'N/A'} - Email: ${(branch as any).email || 'N/A'}`);
        }
      }

      // Calculate total budget value
      const totalBudget = enrichedItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

      const pdfData = {
        budget: {
          id: budget.id,
          budgetNumber: budget.budgetNumber,
          title: budget.title,
          description: budget.description,
          clientId: budget.clientId,
          vendorId: budget.vendorId,
          branchId: budget.branchId,
          totalValue: totalBudget.toFixed(2),
          validUntil: budget.validUntil,
          deliveryDeadline: budget.deliveryDeadline,
          hasCustomization: budget.hasCustomization,
          customizationPercentage: budget.customizationPercentage,
          customizationDescription: budget.customizationDescription,
          hasDiscount: budget.hasDiscount,
          discountType: budget.discountType,
          discountPercentage: budget.discountPercentage,
          discountValue: budget.discountValue,
          createdAt: budget.createdAt,
          photos: photoUrls,
          paymentMethodId: paymentInfo?.paymentMethodId || null,
          shippingMethodId: paymentInfo?.shippingMethodId || null,
          installments: paymentInfo?.installments || 1,
          downPayment: paymentInfo?.downPayment || "0.00",
          remainingAmount: paymentInfo?.remainingAmount || "0.00",
          shippingCost: paymentInfo?.shippingCost || "0.00"
        },
        branch: branchInfo,
        items: enrichedItems,
        client: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone
        },
        vendor: {
          name: vendor?.name || 'Vendedor',
          email: vendor?.email || '',
          phone: vendor?.phone || ''
        },
        paymentMethods: paymentMethods || [],
        shippingMethods: shippingMethods || []
      };

      console.log(`=== PDF DATA PREPARED ===`);
      console.log(`Budget: ${pdfData.budget.budgetNumber} - ${pdfData.budget.title}`);
      console.log(`Items: ${enrichedItems.length}`);
      console.log(`Client: ${clientName} (${clientEmail})`);
      console.log(`Vendor: ${vendor?.name || 'Unknown'} (${vendor?.email || 'No email'})`);
      console.log(`Total Value: R$ ${totalBudget.toFixed(2)}`);
      console.log(`=== SENDING RESPONSE ===`);

      res.json(pdfData);
    } catch (error) {
      console.error("=== ERROR IN PDF DATA ENDPOINT ===");
      console.error("Error details:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ error: "Erro ao buscar dados do orçamento para PDF: " + error.message });
    }
  });

  // Get bank transactions for reconciliation (with optional filters)
  app.get("/api/finance/bank-transactions", async (req, res) => {
    try {
      // Optional filters via query: ?status=unmatched|matched & type=credit|debit
      const { status, type } = req.query as { status?: string; type?: string };

      const all = await storage.getBankTransactions(); // from storage.ts
      const normalized = (all || []).map(tx => ({
        id: tx.id,
        importId: tx.importId || null,
        fitId: tx.fitId || null,
        date: tx.date,
        hasValidDate: !!tx.hasValidDate,
        amount: typeof tx.amount === "string" ? tx.amount : String(tx.amount),
        description: tx.description || "",
        memo: tx.memo || "",
        bankRef: tx.bankRef || "",
        originalType: tx.originalType || "",
        type: tx.type || (parseFloat(tx.amount) >= 0 ? "credit" : "debit"),
        status: tx.status || "unmatched",
        matchedOrderId: tx.matchedOrderId || null,
        matchedPaymentId: tx.matchedPaymentId || null,
        matchedAt: tx.matchedAt || null,
        notes: tx.notes || "",
      }));

      const filtered = normalized.filter(tx => {
        const okStatus = status ? tx.status === status : true;
        const okType   = type ? tx.type   === type   : true;
        return okStatus && okType;
      });

      console.log(`Returning ${filtered.length} bank transactions (status: ${status || 'all'}, type: ${type || 'all'})`);
      res.json(filtered);
    } catch (err: any) {
      console.error("Error fetching bank transactions:", err);
      res.status(500).json({ error: "Failed to fetch bank transactions" });
    }
  });

  // Reconciliation summary (used to load the panel without skeleton freezing)
  app.get("/api/finance/reconciliation", async (req, res) => {
    try {
      const [txs, orders] = await Promise.all([
        storage.getBankTransactions(),
        storage.getOrders(),
      ]);

      const totalTx = txs?.length || 0;
      const matched = txs?.filter(t => t.status === "matched").length || 0;
      const unmatched = totalTx - matched;

      const pendingOrders = (orders || []).filter(o => {
        const total = parseFloat(o.totalValue || "0");
        const paid  = parseFloat(o.paidValue  || "0");
        const remaining = total - paid;
        return o.status !== "cancelled" && remaining > 0.01;
      });

      const totalRemaining = pendingOrders.reduce((acc, o) => {
        const total = parseFloat(o.totalValue || "0");
        const paid  = parseFloat(o.paidValue  || "0");
        return acc + (total - paid);
      }, 0);

      console.log(`Reconciliation summary: ${totalTx} total transactions, ${matched} matched, ${unmatched} unmatched, ${pendingOrders.length} pending orders`);

      res.json({
        bank: { total: totalTx, matched, unmatched },
        orders: { pendingCount: pendingOrders.length, totalRemaining: Number(totalRemaining.toFixed(2)) },
        lastUpdated: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Error building reconciliation summary:", err);
      res.status(500).json({ error: "Failed to build reconciliation summary" });
    }
  });

  // Get pending orders for reconciliation
  app.get("/api/finance/pending-orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();

      const pendingOrders = (orders || []).filter(o => {
        const total = parseFloat(o.totalValue || "0");
        const paid  = parseFloat(o.paidValue  || "0");
        const remaining = total - paid;
        return o.status !== "cancelled" && remaining > 0.01;
      });

      // Enrich with client names and budget info
      const enrichedOrders = await Promise.all(
        pendingOrders.map(async (order) => {
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

          // Get budget payment info if order was converted from budget
          let budgetInfo = null;
          if (order.budgetId) {
            try {
              const budgetPaymentInfo = await storage.getBudgetPaymentInfo(order.budgetId);
              if (budgetPaymentInfo && budgetPaymentInfo.downPayment) {
                budgetInfo = {
                  downPayment: parseFloat(budgetPaymentInfo.downPayment),
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

      console.log(`Returning ${enrichedOrders.length} pending orders for reconciliation`);
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching pending orders:", error);
      res.status(500).json({ error: "Failed to fetch pending orders" });
    }
  });

  // Cancel order endpoint
  app.patch("/api/orders/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`Cancelling order: ${id}`);

      // Get order to validate it exists
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Check if order can be cancelled
      if (order.status === 'cancelled') {
        return res.status(400).json({ error: "Pedido já está cancelado" });
      }

      if (order.status === 'delivered' || order.status === 'completed') {
        return res.status(400).json({ error: "Não é possível cancelar um pedido que já foi entregue" });
      }

      // Update order status to cancelled
      await storage.updateOrder(id, {
        status: 'cancelled',
        updatedAt: new Date()
      });

      // Cancel related commissions
      await storage.updateCommissionsByOrderStatus(id, 'cancelled');

      // If order has production orders, cancel them too
      const productionOrders = await storage.getProductionOrdersByOrder(id);
      for (const po of productionOrders) {
        await storage.updateProductionOrderStatus(po.id, 'cancelled', 'Pedido cancelado');
      }

      // Update accounts receivable status to cancelled
      const receivables = await storage.getAccountsReceivableByOrder(id);
      for (const receivable of receivables) {
        await storage.updateAccountsReceivable(receivable.id, {
          status: 'cancelled'
        });
      }

      console.log(`Order ${id} cancelled successfully - ${receivables.length} receivables also cancelled`);

      res.json({
        success: true,
        message: "Pedido cancelado com sucesso",
        order: { ...order, status: 'cancelled' }
      });
    } catch (error) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ error: "Erro ao cancelar pedido: " + error.message });
    }
  });

  // Update product status for dropshipping workflow
  app.patch("/api/orders/:id/product-status", async (req, res) => {
    try {
      const { id } = req.params;
      const { productStatus } = req.body;

      console.log(`Updating product status for order ${id} to ${productStatus}`);

      // Validate status
      const validStatuses = ['to_buy', 'purchased', 'in_store'];
      if (!validStatuses.includes(productStatus)) {
        return res.status(400).json({ error: "Status de produto inválido" });
      }

      // Get order to validate it exists
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Update order product status
      await storage.updateOrder(id, {
        productStatus: productStatus,
        updatedAt: new Date()
      });

      console.log(`Order ${id} product status updated to ${productStatus}`);

      res.json({
        success: true,
        message: `Status do produto atualizado para ${productStatus === 'to_buy' ? 'Comprar Produto' : productStatus === 'purchased' ? 'Produto Comprado' : 'Produto na Loja'}`,
        order: { ...order, productStatus }
      });
    } catch (error) {
      console.error("Error updating product status:", error);
      res.status(500).json({ error: "Erro ao atualizar status do produto: " + error.message });
    }
  });

  // Update vendor
  app.put("/api/vendors/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      console.log(`Updating vendor ${id} with data:`, updateData);

      // Validate required fields
      if (!updateData.name || updateData.name.trim().length === 0) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      if (!updateData.commissionRate || isNaN(parseFloat(updateData.commissionRate))) {
        return res.status(400).json({ error: "Taxa de comissão inválida" });
      }

      // Check if vendor exists
      const existingVendor = await storage.getUser(id);
      if (!existingVendor) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }

      // Update user data
      const updatedUser = await storage.updateUser(id, {
        name: updateData.name.trim(),
        email: updateData.email?.trim() || null,
        phone: updateData.phone?.trim() || null,
        address: updateData.address?.trim() || null,
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "Erro ao atualizar dados do vendedor" });
      }

      // Update vendor data (branchId, commissionRate, salesLink)
      await storage.updateVendor(id, {
        branchId: updateData.branchId || null,
        commissionRate: updateData.commissionRate || '10.00',
        salesLink: updateData.salesLink || null
      });

      // Get updated vendor info
      const vendorInfo = await storage.getVendor(id);

      console.log(`Vendor ${id} updated successfully`);
      res.json({
        success: true,
        vendor: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          address: updatedUser.address,
          username: updatedUser.username,
          userCode: updatedUser.username,
          branchId: vendorInfo?.branchId || null,
          commissionRate: vendorInfo?.commissionRate || updateData.commissionRate || '10.00',
          isActive: updatedUser.isActive
        },
        message: "Vendedor atualizado com sucesso"
      });
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ error: "Erro ao atualizar vendedor: " + error.message });
    }
  });

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      
      // Also get clients from the clients table and merge them
      const clients = await storage.getClients();
      
      // CRITICAL FIX: Create map of userId -> client data for enrichment
      const clientsByUserId = new Map(
        clients.map(c => [c.userId, c])
      );
      
      // Enrich users with client data and filter duplicates
      const seenUserIds = new Set();
      const allUsers = users
        .filter(u => {
          // Filter out inactive users
          if (u.isActive === false) {
            return false;
          }
          // Remove duplicate user entries (keep first occurrence)
          if (seenUserIds.has(u.id)) {
            console.log(`Skipping duplicate user: ${u.name} (${u.id})`);
            return false;
          }
          seenUserIds.add(u.id);
          return true;
        })
        .map(u => {
          // If this user has a client record, enrich with client data
          const clientData = clientsByUserId.get(u.id);
          if (clientData) {
            return {
              ...u,
              // Enrich with client-specific data if available
              clientId: clientData.id,
              whatsapp: clientData.whatsapp,
              cpfCnpj: clientData.cpfCnpj,
              address: clientData.address || u.address
            };
          }
          return u;
        });
      
      console.log(`Returning ${allUsers.length} total users (${users.length} from users table, ${clients.length} from clients table)`);
      console.log(`Client records:`, clients.map(c => ({ id: c.id, name: c.name, userId: c.userId })));
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  // Change user password
  app.put("/api/users/:id/change-password", async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres" });
      }

      // Get user
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Verify current password
      if (user.password !== currentPassword) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }

      // Update password
      await storage.updateUser(id, { password: newPassword });

      console.log(`Password changed for user: ${user.username}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
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

      // Log successful login
      await storage.logUserAction(
        user.id,
        user.name,
        user.role,
        'LOGIN',
        'auth',
        user.id,
        `Login realizado com sucesso - Role: ${user.role}`,
        'info',
        {
          username: user.username,
          role: user.role
        },
        req.ip,
        req.get('User-Agent')
      );

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


  // Logistics dispatch order
  app.post("/api/logistics/dispatch-order", async (req, res) => {
    try {
      const { productionOrderId, orderId, notes, trackingCode } = req.body;

      console.log(`Dispatching order - productionOrderId: ${productionOrderId}, orderId: ${orderId}`);

      // Update production order status to shipped with shippedAt timestamp
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

      // Set shippedAt timestamp
      await storage.updateProductionOrder(productionOrderId, {
        shippedAt: new Date()
      });

      // Check shipping status and update main order accordingly
      const allProductionOrders = await storage.getProductionOrdersByOrder(orderId);
      const shippedOrders = allProductionOrders.filter(po => po.status === 'shipped' || po.status === 'delivered');
      const totalOrders = allProductionOrders.length;
      const shippedCount = shippedOrders.length;

      console.log(`Order ${orderId} shipping status: ${shippedCount}/${totalOrders} producers shipped`);

      let newStatus = 'production'; // Default status

      if (shippedCount === 0) {
        // No orders shipped yet - keep current status or set to production
        newStatus = 'production';
      } else if (shippedCount === totalOrders) {
        // All production orders shipped - mark as fully shipped
        newStatus = 'shipped';
        console.log(`Order ${orderId} marked as fully shipped - all ${totalOrders} producers completed`);
      } else {
        // Some but not all shipped - mark as partial
        newStatus = 'partial_shipped';
        console.log(`Order ${orderId} marked as partially shipped - ${shippedCount}/${totalOrders} producers shipped`);
      }

      // Update the main order status
      await storage.updateOrderStatus(orderId, newStatus);

      console.log(`Order ${orderId} dispatched with tracking: ${trackingCode}, new status: ${newStatus}`);

      res.json({
        success: true,
        message: "Pedido despachado com sucesso",
        productionOrder: updatedPO,
        orderStatus: newStatus,
        shippingProgress: {
          shipped: shippedCount,
          total: totalOrders
        }
      });
    } catch (error) {
      console.error("Error dispatching order:", error);
      res.status(500).json({ error: "Erro ao despachar pedido: " + error.message });
    }
  });

  // Create budget endpoint
  app.post("/api/budgets", async (req, res) => {
    try {
      const budgetData = req.body;
      console.log("[CREATE BUDGET] Received budget data:", JSON.stringify(budgetData, null, 2));

      // Validate required fields
      if (!budgetData.contactName) {
        return res.status(400).json({ error: "Nome de contato é obrigatório" });
      }

      if (!budgetData.vendorId) {
        return res.status(400).json({ error: "Vendedor é obrigatório" });
      }

      if (!budgetData.title) {
        return res.status(400).json({ error: "Título é obrigatório" });
      }

      // Convert empty clientId to null (to avoid foreign key violation)
      if (!budgetData.clientId || budgetData.clientId === '' || budgetData.clientId === 'null') {
        budgetData.clientId = null;
      }
      
      // Validate clientId if provided
      if (budgetData.clientId) {
        try {
          const client = await storage.getClient(budgetData.clientId);
          if (!client) {
            console.log(`[CREATE BUDGET] Client ID ${budgetData.clientId} not found, setting to null`);
            budgetData.clientId = null;
          } else {
            console.log(`[CREATE BUDGET] Client validated: ${client.name}`);
          }
        } catch (error) {
          console.log(`[CREATE BUDGET] Error validating client ID ${budgetData.clientId}, setting to null:`, error);
          budgetData.clientId = null;
        }
      }

      // Fix branchId if it's "matriz" - replace with actual branch ID
      if (budgetData.branchId === 'matriz' || !budgetData.branchId) {
        const branches = await storage.getBranches();
        if (branches && branches.length > 0) {
          budgetData.branchId = branches[0].id;
          console.log(`[CREATE BUDGET] Replaced branchId 'matriz' with real branch ID: ${budgetData.branchId}`);
        }
      }

      // Validate and process items
      let processedItems = [];
      if (budgetData.items && Array.isArray(budgetData.items)) {
        console.log(`[CREATE BUDGET] Received ${budgetData.items.length} items from frontend`);

        // Validar personalizações antes de criar o orçamento
        console.log("Validando personalizações dos itens do orçamento:", JSON.stringify(budgetData.items, null, 2));

        for (const item of budgetData.items) {
          console.log(`Item: hasItemCustomization=${item.hasItemCustomization}, selectedCustomizationId=${item.selectedCustomizationId}, quantity=${item.quantity}`);

          if (item.hasItemCustomization && item.selectedCustomizationId) {
            const customizations = await storage.getCustomizationOptions();
            const customization = customizations.find(c => c.id === item.selectedCustomizationId);

            if (customization) {
              const itemQty = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
              const minQty = typeof customization.minQuantity === 'string' ? parseInt(customization.minQuantity) : customization.minQuantity;

              console.log(`Validação: itemQty=${itemQty} (${typeof item.quantity}), minQty=${minQty} (${typeof customization.minQuantity}), customization=${customization.name}`);

              if (itemQty < minQty) {
                return res.status(400).json({
                  error: `A personalização "${customization.name}" requer no mínimo ${minQty} unidades, mas o item "${item.productName}" tem apenas ${itemQty} unidades.`
                });
              }
            }
          }
        }

        // Process items for creation
        processedItems = budgetData.items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          producerId: item.producerId || 'internal',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          hasItemCustomization: item.hasItemCustomization || false,
          selectedCustomizationId: item.selectedCustomizationId || null,
          itemCustomizationValue: item.itemCustomizationValue || 0,
          itemCustomizationDescription: item.itemCustomizationDescription || null,
          additionalCustomizationNotes: item.additionalCustomizationNotes || null,
          customizationPhoto: item.customizationPhoto || null,
          hasGeneralCustomization: item.hasGeneralCustomization || false,
          generalCustomizationName: item.generalCustomizationName || null,
          generalCustomizationValue: item.generalCustomizationValue || 0,
          hasItemDiscount: item.hasItemDiscount || false,
          itemDiscountType: item.itemDiscountType || 'percentage',
          itemDiscountPercentage: item.itemDiscountPercentage || 0,
          itemDiscountValue: item.itemDiscountValue || 0,
          productWidth: item.productWidth || null,
          productHeight: item.productHeight || null,
          productDepth: item.productDepth || null
        }));

        console.log(`[CREATE BUDGET] Items received:`, processedItems.map(item => ({
          productId: item.productId,
          producerId: item.producerId,
          quantity: item.quantity,
          hasGeneralCustomization: item.hasGeneralCustomization,
          generalCustomizationName: item.generalCustomizationName
        })));
      }

      // Create budget with processed data
      const newBudget = await storage.createBudget({
        ...budgetData,
        items: processedItems,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log("[CREATE BUDGET] Budget created successfully:", newBudget.id);

      // Log budget creation (non-blocking)
      const vendor = await storage.getUser(budgetData.vendorId);
      if (vendor) {
        logger.logBudgetCreated(
          vendor.id,
          vendor.name,
          newBudget.id,
          budgetData.contactName
        ).catch(() => {});
      }

      res.json(newBudget);
    } catch (error) {
      console.error("Error creating budget:", error);
      res.status(500).json({ error: "Failed to create budget" });
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

      // Group items by producer - PRODUCTION FIX
      const itemsByProducer = new Map();

      console.log(`[PRODUCTION DEBUG] Processing ${allItems.length} total items for order ${id}`);

      allItems.forEach((item: any, index: number) => {
        const itemProducerId = item.producerId || 'internal';

        console.log(`[PRODUCTION DEBUG] Item ${index}: productId=${item.productId}, producerId=${itemProducerId}, productName=${item.productName || 'N/A'}`);

        // Only consider external producers
        if (itemProducerId && itemProducerId !== 'internal') {
          // If producerId is specified, ONLY process that specific producer
          if (producerId) {
            if (itemProducerId === producerId) {
              if (!itemsByProducer.has(itemProducerId)) {
                itemsByProducer.set(itemProducerId, []);
              }
              itemsByProducer.get(itemProducerId).push(item);
              console.log(`[PRODUCTION DEBUG] Added item to specific producer ${itemProducerId}`);
            } else {
              console.log(`[PRODUCTION DEBUG] Skipping item - producer ${itemProducerId} doesn't match requested ${producerId}`);
            }
          } else {
            // No specific producer - process all external producers
            if (!itemsByProducer.has(itemProducerId)) {
              itemsByProducer.set(itemProducerId, []);
            }
            itemsByProducer.get(itemProducerId).push(item);
            console.log(`[PRODUCTION DEBUG] Added item to producer ${itemProducerId} (processing all)`);
          }
        } else {
          console.log(`[PRODUCTION DEBUG] Skipping internal item: productId=${item.productId}, producerId=${itemProducerId}`);
        }
      });

      console.log(`[PRODUCTION DEBUG] Items grouped by producer:`, Array.from(itemsByProducer.keys()));
      console.log(`[PRODUCTION DEBUG] Total producers with items: ${itemsByProducer.size}`);
      console.log(`[PRODUCTION DEBUG] Requested specific producer:`, producerId);
      console.log(`[PRODUCTION DEBUG] Processing ${itemsByProducer.size} producers`);

      if (itemsByProducer.size === 0) {
        const errorMsg = producerId ?
          `Nenhum item encontrado para o produtor especificado (${producerId})` :
          `Nenhum item de produção externa encontrado`;
        return res.status(400).json({ error: errorMsg });
      }

      // If a specific producer was requested, make sure ONLY that producer is being processed
      if (producerId && itemsByProducer.size !== 1) {
        console.error(`ERRO: Solicitado produtor específico ${producerId}, mas processando ${itemsByProducer.size} produtores`);
        return res.status(400).json({ error: "Erro interno: processamento incorreto de produtor específico" });
      }

      if (producerId && !itemsByProducer.has(producerId)) {
        console.error(`ERRO: Produtor específico ${producerId} não encontrado nos itens agrupados`);
        return res.status(400).json({ error: `Produtor especificado não possui itens neste pedido` });
      }

      if (producerId && !itemsByProducer.has(producerId)) {
        return res.status(400).json({ error: "Produtor especificado não possui itens neste pedido" });
      }

      const createdOrders = [];
      const producerNames = [];

      // Get budget photos if order was converted from budget
      let photos = [];
      if (order.budgetId) {
        const budgetPhotos = await storage.getBudgetPhotos(order.budgetId);
        photos = budgetPhotos.map(photo => photo.imageUrl || photo.photoUrl);
      }

      // Create a separate production order for each producer - PRODUCTION FIX
      for (const [currentProducerId, items] of itemsByProducer) {
        console.log(`[PRODUCTION DEBUG] Processing producer: ${currentProducerId} with ${items.length} items`);

        const producer = await storage.getUser(currentProducerId);
        if (!producer) {
          console.error(`[PRODUCTION ERROR] Producer not found: ${currentProducerId}`);
          console.log(`[PRODUCTION DEBUG] Available producers:`, await storage.getUsersByRole('producer'));
          continue;
        }

        console.log(`[PRODUCTION DEBUG] Found producer: ${producer.name} (ID: ${producer.id})`);

        // Validate that all items belong to this producer
        const invalidItems = items.filter((item: any) => item.producerId !== currentProducerId);
        if (invalidItems.length > 0) {
          console.error(`[PRODUCTION ERROR] Found ${invalidItems.length} items not belonging to producer ${currentProducerId}:`, invalidItems);
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

        let productionOrder;

        if (existingForProducer) {
          console.log(`Production order already exists for producer ${currentProducerId} on order ${id} with status: ${existingForProducer.status}`);

          // If status is pending, update to accepted (user is confirming the send)
          if (existingForProducer.status === 'pending') {
            console.log(`Updating production order ${existingForProducer.id} from pending to accepted`);
            
            // Update the production order status and details
            productionOrder = await storage.updateProductionOrder(existingForProducer.id, {
              status: 'accepted',
              orderDetails: JSON.stringify(orderDetails),
              shippingAddress: orderDetails.shippingAddress
            });

            // Reconcile production order items (ensure all expected items exist)
            const existingItems = await storage.getProductionOrderItems(existingForProducer.id);
            
            // Build set of existing item keys using comprehensive unique identifier
            const existingItemKeys = new Set(
              (existingItems || []).map(item => {
                // Use multiple fields to ensure uniqueness, including customization
                const customKey = item.hasItemCustomization ? 
                  `${item.itemCustomizationDescription || ''}-${item.customizationPhoto || ''}` : '';
                const generalKey = item.hasGeneralCustomization ?
                  `${item.generalCustomizationName || ''}-${item.generalCustomizationValue || ''}` : '';
                return `${item.productId}-${item.budgetItemId || 'null'}-${item.quantity}-${customKey}-${generalKey}`;
              })
            );
            
            // Find items that should exist but don't
            const missingItems = uniqueProducerItems.filter((item: any) => {
              const customKey = item.hasItemCustomization ? 
                `${item.itemCustomizationDescription || ''}-${item.customizationPhoto || ''}` : '';
              const generalKey = item.hasGeneralCustomization ?
                `${item.generalCustomizationName || ''}-${item.generalCustomizationValue || ''}` : '';
              const itemKey = `${item.productId}-${item.id || item.budgetItemId || 'null'}-${item.quantity}-${customKey}-${generalKey}`;
              return !existingItemKeys.has(itemKey);
            });
            
            // Create missing items with error tracking
            const itemCreationErrors = [];
            if (missingItems.length > 0) {
              console.log(`Creating ${missingItems.length} missing items for production order ${existingForProducer.id}`);
              for (const item of missingItems) {
                // Add budgetItemId if it exists (for budget-based orders)
                const itemWithBudgetId = {
                  ...item,
                  budgetItemId: item.id || item.budgetItemId || null
                };
                try {
                  await storage.createProductionOrderItem(existingForProducer.id, itemWithBudgetId);
                  console.log(`✓ Created item: ${item.productName} (qty: ${item.quantity})`);
                } catch (error) {
                  const errorMsg = `Failed to create item ${item.productName}: ${error.message}`;
                  console.error(`✗ ${errorMsg}`);
                  itemCreationErrors.push(errorMsg);
                }
              }
              
              // Alert if any items failed to create
              if (itemCreationErrors.length > 0) {
                console.error(`⚠️ WARNING: ${itemCreationErrors.length} items failed to create for production order ${existingForProducer.id}`);
                console.error('Failed items:', itemCreationErrors);
              }
            }

            createdOrders.push(productionOrder);
            producerNames.push(producer.name);
            console.log(`Updated production order ${productionOrder.id} for producer ${producer.name} from pending to accepted`);
          } else {
            // Production order already sent/accepted
            if (producerId) {
              return res.status(400).json({
                error: `Ordem de produção para ${producer.name} já foi enviada anteriormente`
              });
            }

            // Even if production order exists with accepted/other status,
            // ensure ALL items exist (reconcile expected vs existing)
            const existingItems = await storage.getProductionOrderItems(existingForProducer.id);
            
            // Build set of existing item keys using comprehensive unique identifier
            const existingItemKeys = new Set(
              (existingItems || []).map(item => {
                // Use multiple fields to ensure uniqueness, including customization
                const customKey = item.hasItemCustomization ? 
                  `${item.itemCustomizationDescription || ''}-${item.customizationPhoto || ''}` : '';
                const generalKey = item.hasGeneralCustomization ?
                  `${item.generalCustomizationName || ''}-${item.generalCustomizationValue || ''}` : '';
                return `${item.productId}-${item.budgetItemId || 'null'}-${item.quantity}-${customKey}-${generalKey}`;
              })
            );
            
            // Find items that should exist but don't
            const missingItems = uniqueProducerItems.filter((item: any) => {
              const customKey = item.hasItemCustomization ? 
                `${item.itemCustomizationDescription || ''}-${item.customizationPhoto || ''}` : '';
              const generalKey = item.hasGeneralCustomization ?
                `${item.generalCustomizationName || ''}-${item.generalCustomizationValue || ''}` : '';
              const itemKey = `${item.productId}-${item.id || item.budgetItemId || 'null'}-${item.quantity}-${customKey}-${generalKey}`;
              return !existingItemKeys.has(itemKey);
            });
            
            // Create missing items with error tracking
            const itemCreationErrors = [];
            if (missingItems.length > 0) {
              console.log(`CRITICAL: Production order ${existingForProducer.id} is missing ${missingItems.length} items! Creating them now...`);
              for (const item of missingItems) {
                const itemWithBudgetId = {
                  ...item,
                  budgetItemId: item.id || item.budgetItemId || null
                };
                try {
                  await storage.createProductionOrderItem(existingForProducer.id, itemWithBudgetId);
                  console.log(`✓ Created missing item: ${item.productName} (qty: ${item.quantity})`);
                } catch (error) {
                  const errorMsg = `Failed to create missing item ${item.productName}: ${error.message}`;
                  console.error(`✗ ${errorMsg}`);
                  itemCreationErrors.push(errorMsg);
                }
              }
              
              // Alert if any items failed to create
              if (itemCreationErrors.length > 0) {
                console.error(`⚠️ WARNING: ${itemCreationErrors.length} items failed to create for production order ${existingForProducer.id}`);
                console.error('Failed items:', itemCreationErrors);
              }
            }

            // Add to the list and continue
            createdOrders.push(existingForProducer);
            producerNames.push(producer.name);
          }
          continue;
        }

        // Create new production order if it doesn't exist
        productionOrder = await storage.createProductionOrder({
          orderId: id,
          producerId: currentProducerId,
          status: 'accepted', // Start as accepted since user is actively sending
          deadline: order.deadline,
          deliveryDeadline: order.deliveryDeadline,
          shippingAddress: orderDetails.shippingAddress,
          orderDetails: JSON.stringify(orderDetails),
          producerValue: '0.00',
          producerValueLocked: false
        });

        // Create production order items
        console.log(`Creating ${uniqueProducerItems.length} items for production order ${productionOrder.id}`);
        for (const item of uniqueProducerItems) {
          // Add budgetItemId if it exists (for budget-based orders)
          const itemWithBudgetId = {
            ...item,
            budgetItemId: item.id || item.budgetItemId || null
          };
          try {
            await storage.createProductionOrderItem(productionOrder.id, itemWithBudgetId);
          } catch (error) {
            console.error(`Error creating production order item:`, error);
          }
        }

        createdOrders.push(productionOrder);
        producerNames.push(producer.name);

        console.log(`Created production order ${productionOrder.id} for producer ${producer.name} with ${uniqueProducerItems.length} items`);
      }

      // Only update order status to production if ALL producers have received their orders
      if (createdOrders.length > 0 && order.status !== 'production') {
        // Check if there are still producers without production orders
        const allProductionOrders = await storage.getProductionOrdersByOrder(id);
        const uniqueProducers = new Set();

        // Count unique producers in the order items
        allItems.forEach((item: any) => {
          if (item.producerId && item.producerId !== 'internal') {
            uniqueProducers.add(item.producerId);
          }
        });

        // Count unique producers with production orders
        const producersWithOrders = new Set(allProductionOrders.map(po => po.producerId));

        // Only mark as production if all producers have been sent
        if (uniqueProducers.size === producersWithOrders.size) {
          await storage.updateOrder(id, { status: 'production' });
        }
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
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000);
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

      // Map codes for frontend display
      const mappedProducts = result.products.map((p: any) => ({
        ...p,
        code: p.friendlyCode || p.externalCode || p.compositeCode || p.code || null
      }));

      res.json({
        ...result,
        products: mappedProducts
      });
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

      // Clean numeric fields - convert empty strings to null
      const cleanNumericField = (value: any) => {
        if (value === "" || value === undefined || value === null) return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num.toString();
      };

      // Set default values with proper numeric field handling
      // Handle producerId - 'internal' means null (no external producer)
      const isInternal = !productData.producerId || productData.producerId === 'internal';
      const newProduct = {
        ...productData,
        producerId: isInternal ? null : productData.producerId,
        type: isInternal ? 'internal' : 'external',
        isActive: productData.isActive !== undefined ? productData.isActive : true,
        unit: productData.unit || 'un',
        category: productData.category || 'Geral',
        // Clean numeric fields
        weight: cleanNumericField(productData.weight),
        height: cleanNumericField(productData.height),
        width: cleanNumericField(productData.width),
        depth: cleanNumericField(productData.depth)
      };

      const product = await storage.createProduct(newProduct);

      // Log product creation only if user is properly authenticated
      if (req.user && req.user.id) {
        try {
          await storage.logUserAction(
            req.user.id,
            req.user.name || 'Usuário',
            req.user.role || 'user',
            'CREATE',
            'products',
            product.id,
            `Produto criado: ${product.name} - Preço: R$ ${product.basePrice}`,
            'success',
            {
              productName: product.name,
              category: product.category,
              basePrice: product.basePrice,
              producerId: product.producerId
            }
          );
        } catch (logError) {
          console.error('Error logging product creation:', logError);
          // Continue execution even if logging fails
        }
      }

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

      // Clean numeric fields - convert empty strings to null
      const cleanNumericField = (value: any) => {
        if (value === "" || value === undefined || value === null) return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num.toString();
      };

      // Handle producerId - 'internal' means null (no external producer)
      const isInternal = !updateData.producerId || updateData.producerId === 'internal';
      
      // Clean the update data
      const cleanedUpdateData = {
        ...updateData,
        // Handle producerId properly
        producerId: isInternal ? null : updateData.producerId,
        type: isInternal ? 'internal' : 'external',
        // Clean numeric fields if they exist in the update
        weight: updateData.weight !== undefined ? cleanNumericField(updateData.weight) : undefined,
        height: updateData.height !== undefined ? cleanNumericField(updateData.height) : undefined,
        width: updateData.width !== undefined ? cleanNumericField(updateData.width) : undefined,
        depth: updateData.depth !== undefined ? cleanNumericField(updateData.depth) : undefined
      };

      // Remove undefined values
      Object.keys(cleanedUpdateData).forEach(key => {
        if (cleanedUpdateData[key] === undefined) {
          delete cleanedUpdateData[key];
        }
      });

      const updatedProduct = await storage.updateProduct(id, cleanedUpdateData);
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

  // Associate OFX bank transactions with producer payment
  app.post("/api/finance/producer-payments/associate-payment", async (req, res) => {
    try {
      const { transactionIds, productionOrderId } = req.body;

      console.log("Associate payment request:", { transactionIds, productionOrderId });

      if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ error: "Nenhuma transação selecionada" });
      }

      if (!productionOrderId) {
        return res.status(400).json({ error: "ID da ordem de produção não informado" });
      }

      // Get the production order
      const productionOrder = await storage.getProductionOrder(productionOrderId);
      if (!productionOrder) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      // Get or create producer payment for this production order
      let producerPayment = await storage.getProducerPaymentByProductionOrderId(productionOrderId);
      
      if (!producerPayment) {
        // Create payment if it doesn't exist
        if (!productionOrder.producerValue || parseFloat(productionOrder.producerValue) <= 0) {
          return res.status(400).json({ error: "Ordem de produção não possui valor definido para o produtor" });
        }

        producerPayment = await storage.createProducerPayment({
          productionOrderId,
          producerId: productionOrder.producerId,
          amount: productionOrder.producerValue,
          status: 'pending',
          notes: productionOrder.producerNotes || null
        });
        console.log(`Created producer payment ${producerPayment.id} for association`);
      }

      // Get the bank transactions
      const bankTransactions = await Promise.all(
        transactionIds.map((id: string) => storage.getBankTransaction(id))
      );

      const validTransactions = bankTransactions.filter(t => t && t.status !== 'matched');
      
      if (validTransactions.length === 0) {
        return res.status(400).json({ error: "Nenhuma transação válida encontrada. As transações podem já ter sido conciliadas." });
      }

      // Calculate total from selected transactions (use absolute value for debits)
      const transactionTotal = validTransactions.reduce((sum, t) => {
        const amount = Math.abs(parseFloat(t.amount));
        return sum + amount;
      }, 0);

      const paymentAmount = parseFloat(producerPayment.amount);
      const difference = transactionTotal - paymentAmount;
      const hasAdjustment = Math.abs(difference) > 0.01;

      console.log(`Association: Transaction total = ${transactionTotal}, Payment amount = ${paymentAmount}, Difference = ${difference}`);

      // Update bank transactions to mark as matched
      for (const txn of validTransactions) {
        await storage.updateBankTransaction(txn.id, {
          status: 'matched',
          matchedOrderId: productionOrderId,
          matchedAt: new Date()
        });
      }

      // Get producer name for response
      let producerName = 'Produtor';
      if (productionOrder.producerId) {
        const producer = await storage.getUser(productionOrder.producerId);
        if (producer) {
          producerName = producer.name;
        }
      }

      // Update producer payment to paid with OFX reconciliation
      const updatedPayment = await storage.updateProducerPayment(producerPayment.id, {
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: 'ofx',
        reconciliationStatus: 'ofx_matched',
        bankTransactionId: transactionIds[0], // Primary transaction ID
        notes: hasAdjustment 
          ? `Conciliado via OFX. Diferença: R$ ${difference.toFixed(2)} (${transactionIds.length} transações)`
          : `Conciliado via OFX com ${transactionIds.length} transação(ões)`
      });

      console.log(`Producer payment ${producerPayment.id} associated with ${validTransactions.length} OFX transactions`);

      res.json({
        success: true,
        payment: {
          ...updatedPayment,
          producerName,
          amount: paymentAmount.toFixed(2),
          transactionTotal: transactionTotal.toFixed(2),
          difference: difference.toFixed(2),
          hasAdjustment,
          transactionsCount: validTransactions.length
        },
        message: `Pagamento de R$ ${paymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} conciliado com sucesso`
      });
    } catch (error) {
      console.error("Error associating producer payment:", error);
      res.status(500).json({ error: "Erro ao associar pagamento: " + error.message });
    }
  });

  // Approve producer payment (move from pending to approved)
  app.post("/api/finance/producer-payments/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`Approving producer payment: ${id}`);

      // First try to find by producer payment ID
      let payment = await storage.getProducerPayment(id);

      if (!payment) {
        // If not found, try to find by production order ID
        payment = await storage.getProducerPaymentByProductionOrderId(id);
      }

      if (!payment) {
        return res.status(404).json({ error: "Pagamento do produtor não encontrado" });
      }

      if (payment.status === 'paid') {
        return res.status(400).json({ error: "Este pagamento já foi realizado" });
      }

      const updatedPayment = await storage.updateProducerPayment(payment.id, {
        status: 'approved',
        reconciliationStatus: 'pending'
      });

      console.log(`Producer payment ${payment.id} approved for OFX reconciliation`);

      res.json({
        success: true,
        payment: updatedPayment,
        message: "Pagamento aprovado. Agora você pode conciliar com transações do OFX."
      });
    } catch (error) {
      console.error("Error approving producer payment:", error);
      res.status(500).json({ error: "Erro ao aprovar pagamento: " + error.message });
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

  // Get expenses for finance module
  app.get("/api/finance/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      console.log(`Returning ${expenses?.length || 0} expenses for finance module`);
      res.json(expenses || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  // Database backup endpoint
  app.get("/api/admin/database/backup", requireAuth, async (req, res) => {
    try {
      console.log("Creating database backup...");

      // Get all data from all tables
      const [
        users,
        clients, 
        vendors,
        partners,
        products,
        budgets,
        orders,
        productionOrders,
        payments,
        commissions,
        branches,
        paymentMethods,
        shippingMethods,
        customizationOptions,
        producerPayments,
        accountsReceivable,
        bankTransactions,
        expenseNotes,
        systemLogs
      ] = await Promise.all([
        storage.getUsers(),
        storage.getClients(),
        storage.getVendors(),
        storage.getPartners(), 
        storage.getProducts({ limit: 10000 }).then(result => result.products),
        storage.getBudgets(),
        storage.getOrders(),
        storage.getProductionOrders(),
        storage.getPayments(),
        storage.getAllCommissions(),
        storage.getBranches(),
        storage.getAllPaymentMethods(),
        storage.getAllShippingMethods(),
        storage.getCustomizationOptions(),
        storage.getProducerPayments(),
        storage.getAccountsReceivable(),
        storage.getBankTransactions(),
        storage.getExpenseNotes(),
        storage.getSystemLogs()
      ]);

      // Get budget items for all budgets
      const allBudgetItems = [];
      for (const budget of budgets) {
        try {
          const items = await storage.getBudgetItems(budget.id);
          allBudgetItems.push(...items.map(item => ({ ...item, budgetId: budget.id })));
        } catch (error) {
          console.log(`Error fetching items for budget ${budget.id}:`, error);
        }
      }

      // Get budget photos for all budgets
      const allBudgetPhotos = [];
      for (const budget of budgets) {
        try {
          const photos = await storage.getBudgetPhotos(budget.id);
          allBudgetPhotos.push(...photos.map(photo => ({ ...photo, budgetId: budget.id })));
        } catch (error) {
          console.log(`Error fetching photos for budget ${budget.id}:`, error);
        }
      }

      const totalRecords = users.length + clients.length + products.length + budgets.length + 
                          orders.length + allBudgetItems.length + payments.length + commissions.length;

      const backupData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: "1.1",
          totalRecords: totalRecords,
          tables: {
            users: users.length,
            clients: clients.length,
            vendors: vendors.length,
            partners: partners.length,
            products: products.length,
            budgets: budgets.length,
            budgetItems: allBudgetItems.length,
            budgetPhotos: allBudgetPhotos.length,
            orders: orders.length,
            productionOrders: productionOrders.length,
            payments: payments.length,
            commissions: commissions.length,
            branches: branches.length,
            paymentMethods: paymentMethods.length,
            shippingMethods: shippingMethods.length,
            customizationOptions: customizationOptions.length,
            producerPayments: producerPayments.length,
            accountsReceivable: accountsReceivable.length,
            bankTransactions: bankTransactions.length,
            expenseNotes: expenseNotes.length,
            systemLogs: Math.min(systemLogs.length, 1000)
          }
        },
        data: {
          users: users.map(u => ({ ...u, password: '[HIDDEN]' })), // Hide passwords for security
          clients,
          vendors,
          partners,
          products,
          budgets,
          budgetItems: allBudgetItems,
          budgetPhotos: allBudgetPhotos,
          orders,
          productionOrders,
          payments,
          commissions,
          branches,
          paymentMethods,
          shippingMethods,
          customizationOptions,
          producerPayments,
          accountsReceivable,
          bankTransactions,
          expenseNotes,
          systemLogs: systemLogs.slice(0, 1000) // Limit logs to prevent huge files
        }
      };

      console.log(`Database backup created successfully:`);
      console.log(`- Total records: ${totalRecords}`);
      console.log(`- Tables included: ${Object.keys(backupData.data).length}`);
      console.log(`- Export date: ${backupData.metadata.exportDate}`);

      // Set proper headers for JSON download
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="database_backup_${new Date().toISOString().split('T')[0]}.json"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Send the actual JSON data
      res.send(JSON.stringify(backupData, null, 2));

    } catch (error) {
      console.error("Error creating database backup:", error);
      res.status(500).json({ error: "Erro ao criar backup do banco de dados: " + error.message });
    }
  });

  // Update production order status
  app.patch("/api/production-orders/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, deliveryDate, trackingCode } = req.body;

      console.log(`Updating production order ${id} status to: ${status}`);

      // Get current production order to validate
      const currentPO = await storage.getProductionOrder(id);
      if (!currentPO) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      // Validate that producer value is set before allowing 'ready' status
      if (status === 'ready') {
        if (!currentPO.producerValue || parseFloat(currentPO.producerValue) <= 0) {
          return res.status(400).json({ 
            error: "Não é possível marcar como pronto sem definir o valor que você cobrará por este pedido. Defina o valor primeiro." 
          });
        }
      }

      const updatedPO = await storage.updateProductionOrderStatus(id, status, notes, deliveryDate, trackingCode);
      if (!updatedPO) {
        return res.status(404).json({ error: "Ordem de produção não encontrada" });
      }

      // Set timestamp fields based on status change
      if (status === 'shipped' && !currentPO.shippedAt) {
        await storage.updateProductionOrder(id, { shippedAt: new Date() });
      }
      if (status === 'delivered' && !currentPO.deliveredAt) {
        await storage.updateProductionOrder(id, { deliveredAt: new Date() });
      }

      console.log(`Production order ${id} status updated successfully to: ${status}`);

      // When production order is marked as ready, create producer payment and update order status
      if (status === 'ready' && updatedPO.producerValue && parseFloat(updatedPO.producerValue) > 0) {
        // Check if payment already exists
        const existingPayment = await storage.getProducerPaymentByProductionOrderId(id);

        if (!existingPayment) {
          // Create producer payment
          const payment = await storage.createProducerPayment({
            productionOrderId: id,
            producerId: updatedPO.producerId,
            amount: updatedPO.producerValue,
            status: 'pending',
            notes: updatedPO.producerNotes || notes || null
          });
          console.log(`[READY STATUS] Created producer payment ${payment.id} for R$ ${updatedPO.producerValue}`);
        } else {
          console.log(`[READY STATUS] Producer payment already exists for production order ${id}`);
        }

        // Update order status to 'ready' ONLY when ALL production orders are ready
        if (updatedPO.orderId) {
          const order = await storage.getOrder(updatedPO.orderId);
          if (order && order.status === 'production') {
            // Check if all production orders for this order are ready
            const allProductionOrders = await storage.getProductionOrdersByOrder(updatedPO.orderId);

            // Guard: Must have at least one production order to mark as ready
            if (allProductionOrders.length > 0) {
              const allReady = allProductionOrders.every(po => po.status === 'ready' || po.status === 'shipped' || po.status === 'delivered');

              if (allReady) {
                await storage.updateOrder(updatedPO.orderId, { status: 'ready' });
                console.log(`[READY STATUS] Updated order ${updatedPO.orderId} status to 'ready' - all ${allProductionOrders.length} production orders are ready`);
              } else {
                const readyCount = allProductionOrders.filter(po => po.status === 'ready' || po.status === 'shipped' || po.status === 'delivered').length;
                console.log(`[READY STATUS] Order ${updatedPO.orderId} still in production - ${readyCount}/${allProductionOrders.length} production orders ready`);
              }
            } else {
              console.log(`[READY STATUS] Order ${updatedPO.orderId} has no production orders yet - skipping status update`);
            }
          }
        }
      }

      res.json(updatedPO);
    } catch (error) {
      console.error("Error updating production order status:", error);
      res.status(500).json({ error: "Erro ao atualizar status da ordem de produção: " + error.message });
    }
  });

  // Logistics products import route
  app.post("/api/logistics/products/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }

      let { producerId } = req.body;
      
      // Handle internal products - producerId 'internal' or empty means null
      const isInternal = !producerId || producerId === 'internal';
      producerId = isInternal ? null : producerId;

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

      console.log(`Importing ${productsData.length} products for producer ${producerId}...`);

      const result = await storage.importProductsForProducer(productsData, producerId);

      console.log(`Import completed: ${result.imported} imported, ${result.errors.length} errors`);

      res.json({
        message: `${result.imported} produtos importados com sucesso para o produtor!`,
        imported: result.imported,
        total: productsData.length,
        errors: result.errors
      });
    } catch (error) {
      console.error('Logistics import error:', error);

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

  // Get shipping details for order (for partial shipping status)
  app.get("/api/orders/:id/shipping-details", async (req, res) => {
    try {
      const { id: orderId } = req.params;
      console.log(`Fetching shipping details for order: ${orderId}`);

      // Get all production orders for this order
      const productionOrders = await storage.getProductionOrdersByOrder(orderId);
      console.log(`Found ${productionOrders.length} production orders for order ${orderId}`);

      if (productionOrders.length === 0) {
        return res.json({
          shippedCount: 0,
          totalCount: 0,
          shipmentDetails: []
        });
      }

      // Count shipped vs total producers
      const shippedOrders = productionOrders.filter(po => po.status === 'shipped' || po.status === 'delivered');
      const totalCount = productionOrders.length;
      const shippedCount = shippedOrders.length;

      console.log(`Shipping status: ${shippedCount}/${totalCount} producers have shipped`);

      // Get detailed shipping info for each production order
      const shipmentDetails = await Promise.all(
        productionOrders.map(async (po) => {
          const producer = await storage.getUser(po.producerId);

          // Parse order details to get items for this producer
          let producerItems = [];
          if (po.orderDetails) {
            try {
              const orderDetails = JSON.parse(po.orderDetails);
              if (orderDetails.items) {
                producerItems = orderDetails.items.filter(item =>
                  item.producerId === po.producerId
                );
              }
            } catch (e) {
              console.log(`Error parsing order details for PO ${po.id}:`, e);
            }
          }

          return {
            producerId: po.producerId,
            producerName: producer?.name || 'Produtor não encontrado',
            status: po.status,
            trackingCode: po.trackingCode,
            dispatchDate: po.status === 'shipped' || po.status === 'delivered' ? po.updatedAt : null,
            items: producerItems.map(item => ({
              productName: item.productName || 'Produto',
              quantity: item.quantity || 1
            }))
          };
        })
      );

      res.json({
        shippedCount,
        totalCount,
        shipmentDetails
      });
    } catch (error) {
      console.error("Error fetching shipping details:", error);
      res.status(500).json({ error: "Failed to fetch shipping details" });
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

  // Get quote requests for client
  app.get("/api/quote-requests/client/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      console.log(`Getting quote requests for client: ${clientId}`);

      const quoteRequests = await storage.getQuoteRequestsByClient(clientId);
      console.log(`Found ${quoteRequests.length} quote requests for client ${clientId}`);

      res.json(quoteRequests);
    } catch (error) {
      console.error("Error fetching client quote requests:", error);
      res.status(500).json({ error: "Failed to fetch quote requests" });
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
        photos = budgetPhotos.map(photo => photo.imageUrl || photo.photoUrl);
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
        totalClients: (await storage.getClients()).length,
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

      // Fix branchId if it's "matriz" - replace with actual branch ID
      if (orderData.branchId === 'matriz' || !orderData.branchId) {
        const branches = await storage.getBranches();
        if (branches && branches.length > 0) {
          orderData.branchId = branches[0].id;
          console.log(`[CREATE ORDER] Replaced branchId 'matriz' with real branch ID: ${orderData.branchId}`);
        }
      }

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
                orderWarnings.push(`A personalização "${customization.name}" requer no mínimo ${minQty} unidades, mas o item "${item.productName}" tem ${itemQty} unidades.`);
              } else {
                console.log(`APROVADO: ${itemQty} >= ${minQty}`);
              }
            }
          }
        }
      }

      // Handle clientId - use the provided clientId if exists, otherwise create order without client link
      // Note: orders.clientId references clients.id, NOT users.id
      let finalClientId = null;
      if (orderData.clientId && orderData.clientId !== "") {
        // First try to find client by ID directly
        const clientRecord = await storage.getClient(orderData.clientId);
        if (clientRecord) {
          finalClientId = clientRecord.id; // Use client.id (from clients table)
          console.log("Using client record by id:", clientRecord.name, "clientId:", clientRecord.id);
        } else {
          // Try finding by userId (when clientId is actually a userId)
          const clientByUserId = await storage.getClientByUserId(orderData.clientId);
          if (clientByUserId) {
            finalClientId = clientByUserId.id; // Use client.id, NOT the userId
            console.log("Using client by userId:", clientByUserId.name, "clientId:", clientByUserId.id);
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

      // Get vendor's branch info
      const vendor = await storage.getVendor(orderData.vendorId);
      const vendorBranchId = vendor?.branchId || null;

      // Create order with contact name as primary identifier and proper items handling
      const newOrder = await storage.createOrder({
        orderNumber,
        clientId: finalClientId, // Can be null if no client selected
        vendorId: orderData.vendorId,
        branchId: vendorBranchId, // Associate order with vendor's branch
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

      // Log order creation (non-blocking)
      logger.logOrderCreated(
        orderData.vendorId,
        vendor?.name || 'Vendedor',
        newOrder.id,
        newOrder.contactName
      ).catch(() => {});

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

      // Get original order before update for comparison
      const originalOrder = await storage.getOrder(id);
      if (!originalOrder) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      const updatedOrder = await storage.updateOrder(id, updateData);
      if (!updatedOrder) {
        return res.status(404).json({ error: "Erro ao atualizar pedido" });
      }

      // If order is being cancelled, update related commissions
      if (updateData.status === 'cancelled') {
        console.log(`Order ${id} cancelled - updating related commissions and payments`);
        await storage.updateCommissionsByOrderStatus(id, 'cancelled');
      }

      // === CASCADING UPDATES ===
      
      // 1. Check if order value changed - recalculate commissions
      const originalValue = parseFloat(originalOrder.totalValue || '0');
      const newValue = parseFloat(updatedOrder.totalValue || '0');
      
      if (originalValue !== newValue && updateData.status !== 'cancelled') {
        console.log(`Order ${id} value changed from ${originalValue} to ${newValue} - recalculating commissions`);
        
        // Recalculate commissions with new value (updates existing commissions)
        await storage.recalculateCommissionsForOrder(updatedOrder);
        console.log(`Commissions recalculated for order ${id}`);
      }

      // 2. Update accounts receivable (financial receivables)
      console.log(`Updating accounts receivable for order ${id}`);
      await storage.updateAccountsReceivableForOrder(updatedOrder);
      console.log(`Accounts receivable updated for order ${id}`);

      // 3. Update production orders if items changed
      if (updateData.items && Array.isArray(updateData.items) && updateData.items.length > 0) {
        console.log(`Order ${id} items updated - syncing production orders`);
        
        // Get existing production orders for this order
        const existingProductionOrders = await storage.getProductionOrdersByOrder(id);
        
        // Group new items by producer
        const producerGroups = new Map<string, typeof updateData.items>();
        for (const item of updateData.items) {
          const producerId = item.producerId || 'internal';
          if (!producerGroups.has(producerId)) {
            producerGroups.set(producerId, []);
          }
          producerGroups.get(producerId)!.push(item);
        }

        // Get deadline for production orders
        const deliveryDeadline = updatedOrder.deliveryDeadline || new Date();

        // For each producer group, create or update production order
        for (const [producerId, items] of producerGroups.entries()) {
          if (producerId === 'internal') continue; // Skip internal production
          
          // Check if production order already exists for this producer
          const existingPO = existingProductionOrders.find(po => po.producerId === producerId);
          
          if (existingPO) {
            // Update existing production order notes
            const itemsDescription = items.map((i: any) => `${i.productName} (${i.quantity}x)`).join(', ');
            await storage.updateProductionOrderStatus(
              existingPO.id, 
              existingPO.status, 
              `Itens atualizados: ${itemsDescription}`
            );
            console.log(`Updated production order ${existingPO.id} for producer ${producerId}`);
          } else {
            // Create new production order for this producer
            const productionOrderData = {
              orderId: id,
              producerId: producerId,
              status: 'pending' as const,
              deadline: typeof deliveryDeadline === 'string' ? new Date(deliveryDeadline) : deliveryDeadline,
              deliveryDeadline: typeof deliveryDeadline === 'string' ? new Date(deliveryDeadline) : deliveryDeadline,
              notes: `Itens: ${items.map((i: any) => `${i.productName} (${i.quantity}x)`).join(', ')}`,
            };
            
            const newPO = await storage.createProductionOrder(productionOrderData);
            console.log(`Created new production order ${newPO.id} for producer ${producerId}`);
            
            // Create production order items
            for (const item of items) {
              await storage.createProductionOrderItem(newPO.id, {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice?.toString() || '0',
                totalPrice: item.totalPrice?.toString() || '0'
              });
            }
          }
        }

        // Remove production orders for producers that are no longer in the order
        const newProducerIds = Array.from(producerGroups.keys());
        for (const existingPO of existingProductionOrders) {
          if (!newProducerIds.includes(existingPO.producerId) && existingPO.status === 'pending') {
            // Mark as cancelled instead of deleting
            await storage.updateProductionOrderStatus(existingPO.id, 'cancelled', 'Produtor removido do pedido');
            console.log(`Cancelled production order ${existingPO.id} - producer removed from order`);
          }
        }
        
        console.log(`Production orders synced for order ${id}`);
      }

      // Log order update (non-blocking)
      if (req.user?.role === 'vendor') {
        logger.logOrderUpdated(
          req.user.id,
          req.user.name,
          id,
          `Status: ${updatedOrder.status}`
        ).catch(() => {});
      } else {
        storage.logUserAction(
          req.user?.id || 'system',
          req.user?.name || 'Sistema',
          req.user?.role || 'system',
          'UPDATE',
          'orders',
          id,
          `Pedido atualizado: ${updatedOrder.orderNumber} - Status: ${updatedOrder.status}`,
          'info',
          { orderNumber: updatedOrder.orderNumber, changes: updateData, newStatus: updatedOrder.status },
          undefined,
          undefined,
          updatedOrder.vendorId
        ).catch(() => {});
      }

      console.log(`Order ${id} updated successfully with cascading updates`);
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

      // Build client address and contact info
      let clientAddress: string | null = null;
      let clientPhone: string | null = order.contactPhone || null;
      let clientEmail: string | null = order.contactEmail || null;

      if (order.clientId) {
        const clientRecord = await storage.getClient(order.clientId);
        if (clientRecord) {
          // Build address from delivery fields
          if (clientRecord.enderecoEntregaLogradouro) {
            clientAddress = `${clientRecord.enderecoEntregaLogradouro}, ${clientRecord.enderecoEntregaNumero || 's/n'}${clientRecord.enderecoEntregaComplemento ? ` - ${clientRecord.enderecoEntregaComplemento}` : ''}, ${clientRecord.enderecoEntregaBairro || ''}, ${clientRecord.enderecoEntregaCidade || ''}, CEP: ${clientRecord.enderecoEntregaCep || ''}`;
          } else if (clientRecord.address) {
            clientAddress = clientRecord.address;
          }
          if (!clientPhone) clientPhone = clientRecord.phone || null;
          if (!clientEmail) clientEmail = clientRecord.email || null;
        } else {
          const clientByUserId = await storage.getClientByUserId(order.clientId);
          if (clientByUserId) {
            if (clientByUserId.enderecoEntregaLogradouro) {
              clientAddress = `${clientByUserId.enderecoEntregaLogradouro}, ${clientByUserId.enderecoEntregaNumero || 's/n'}${clientByUserId.enderecoEntregaComplemento ? ` - ${clientByUserId.enderecoEntregaComplemento}` : ''}, ${clientByUserId.enderecoEntregaBairro || ''}, ${clientByUserId.enderecoEntregaCidade || ''}, CEP: ${clientByUserId.enderecoEntregaCep || ''}`;
            } else if (clientByUserId.address) {
              clientAddress = clientByUserId.address;
            }
            if (!clientPhone) clientPhone = clientByUserId.phone || null;
            if (!clientEmail) clientEmail = clientByUserId.email || null;
          } else {
            const clientUser = await storage.getUser(order.clientId);
            if (clientUser) {
              clientAddress = clientUser.address || null;
              if (!clientPhone) clientPhone = clientUser.phone || null;
              if (!clientEmail) clientEmail = clientUser.email || null;
            }
          }
        }
      }

      // Priority: saved order address > client delivery address
      const finalShippingAddress = (order as any).shippingAddress || clientAddress || null;

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

      console.log(`Order ${order.orderNumber}: Total=${totalValue}, BudgetDownPayment=${budgetDownPayment}, Paid=${totalPaid}, ActualPaid=${actualPaidValue}, Remaining=${remainingBalance}`);

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
        remainingValue: remainingBalance.toFixed(2),
        shippingAddress: finalShippingAddress,
        clientAddress: clientAddress,
        clientPhone: clientPhone,
        clientEmail: clientEmail
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
          // Always use contactName as primary client name
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

          // If still no name, use a descriptive message
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
          // Always use contactName as primary client name
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
            vendorName: "Unknown", // Placeholder, needs vendor lookup
            producerName: null, // Placeholder, needs producer lookup
            budgetPhotos: budgetPhotos,
            budgetItems: budgetItems,
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
          let clientAddress: string | null = null;
          let clientPhone = order?.contactPhone;
          let clientEmail = order?.contactEmail;

          // SEMPRE buscar endereço do cliente para logística (independente do contactName)
          if (order?.clientId) {
            const clientRecord = await storage.getClient(order.clientId);
            console.log(`[PROD-ORDER DEBUG] Order ${order?.orderNumber}, clientId=${order.clientId}, clientRecord found=${!!clientRecord}`);
            if (clientRecord) {
              if (!clientName) {
                clientName = clientRecord.name;
              }
              // Montar endereço de entrega do cliente
              clientAddress = clientRecord.enderecoEntregaLogradouro 
                ? `${clientRecord.enderecoEntregaLogradouro}, ${clientRecord.enderecoEntregaNumero || 's/n'}${clientRecord.enderecoEntregaComplemento ? ` - ${clientRecord.enderecoEntregaComplemento}` : ''}, ${clientRecord.enderecoEntregaBairro || ''}, ${clientRecord.enderecoEntregaCidade || ''}, CEP: ${clientRecord.enderecoEntregaCep || ''}`
                : clientRecord.address;
              console.log(`[PROD-ORDER DEBUG] Built address from clientRecord: ${clientAddress?.substring(0, 50)}`);
              clientPhone = clientPhone || clientRecord.phone;
              clientEmail = clientEmail || clientRecord.email;
            } else {
              const clientByUserId = await storage.getClientByUserId(order.clientId);
              if (clientByUserId) {
                if (!clientName) {
                  clientName = clientByUserId.name;
                }
                // Montar endereço de entrega do cliente
                clientAddress = clientByUserId.enderecoEntregaLogradouro 
                  ? `${clientByUserId.enderecoEntregaLogradouro}, ${clientByUserId.enderecoEntregaNumero || 's/n'}${clientByUserId.enderecoEntregaComplemento ? ` - ${clientByUserId.enderecoEntregaComplemento}` : ''}, ${clientByUserId.enderecoEntregaBairro || ''}, ${clientByUserId.enderecoEntregaCidade || ''}, CEP: ${clientByUserId.enderecoEntregaCep || ''}`
                  : clientByUserId.address;
                clientPhone = clientPhone || clientByUserId.phone;
                clientEmail = clientEmail || clientByUserId.email;
              } else {
                const clientUser = await storage.getUser(order.clientId);
                if (clientUser) {
                  if (!clientName) {
                    clientName = clientUser.name;
                  }
                  clientPhone = clientPhone || clientUser.phone;
                  clientEmail = clientEmail || clientUser.email;
                  clientAddress = clientUser.address;
                }
              }
            }
          }

          // If still no name, use a descriptive message
          if (!clientName) {
            clientName = "Nome não informado";
          }

          // IMPORTANTE: Priorizar endereço salvo no pedido (definido na conversão do orçamento)
          // Se não existir, usar endereço do cliente como fallback
          const savedShippingAddress = (order as any)?.shippingAddress;
          const finalShippingAddress = order?.deliveryType === 'pickup'
            ? 'Sede Principal - Retirada no Local'
            : (savedShippingAddress || clientAddress || 'Endereço não informado');

          return {
            ...po,
            orderNumber: order?.orderNumber || `PO-${po.id}`,
            product: order?.product || 'Produto não informado',
            clientName: clientName,
            clientAddress: finalShippingAddress,
            shippingAddress: finalShippingAddress,
            deliveryType: order?.deliveryType || 'delivery',
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            producerName: producer?.name || null,
            order: order ? {
              ...order,
              clientName: clientName,
              clientAddress: finalShippingAddress,
              shippingAddress: finalShippingAddress,
              clientPhone: clientPhone,
              clientEmail: clientEmail,
              deliveryType: order.deliveryType || 'delivery'
            } : null
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
      const finalUsername = userCode || username || email;

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

      // Log partner creation - only if user is authenticated
      if (req.user && req.user.id) {
        try {
          await storage.logUserAction(
            req.user.id,
            req.user.name || 'Admin',
            req.user.role || 'admin',
            'CREATE',
            'partners', // Note: This logs as 'partners' even for producer creation, could be a bug
            user.id,
            `Produtor criado: ${user.name} - Username: ${user.username}`,
            'success',
            {
              producerName: user.name,
              username: user.username,
              email: user.email
            }
          );
        } catch (logError) {
          console.error('Error logging producer creation:', logError);
          // Continue execution even if logging fails
        }
      } else {
        console.log('Warning: No authenticated user for logging, skipping log');
      }

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

  // Branches
  app.get("/api/branches", async (req, res) => {
    try {
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  app.post("/api/branches", async (req, res) => {
    try {
      const branchData = req.body;
      console.log("Creating branch:", branchData);

      // Validate required fields
      if (!branchData.name || !branchData.city) {
        return res.status(400).json({ error: "Nome e cidade são obrigatórios" });
      }

      const newBranch = await storage.createBranch(branchData);
      res.json(newBranch);
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).json({ error: "Failed to create branch" });
    }
  });

  app.put("/api/branches/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      console.log(`Updating branch ${id}:`, updateData);

      const updatedBranch = await storage.updateBranch(id, updateData);
      if (!updatedBranch) {
        return res.status(404).json({ error: "Filial não encontrada" });
      }

      res.json(updatedBranch);
    } catch (error) {
      console.error("Error updating branch:", error);
      res.status(500).json({ error: "Failed to update branch" });
    }
  });

  app.get("/api/branches/:id", async (req, res) => {
    try {
      const branch = await storage.getBranch(req.params.id);
      if (!branch) {
        return res.status(404).json({ error: "Filial não encontrada" });
      }
      res.json(branch);
    } catch (error) {
      console.error("Error fetching branch:", error);
      res.status(500).json({ error: "Failed to fetch branch" });
    }
  });

  // Get clients by vendor
  app.get("/api/vendors/:vendorId/clients", async (req, res) => {
    try {
      const { vendorId } = req.params;
      console.log(`Fetching clients for vendor: ${vendorId}`);

      const clients = await storage.getClientsByVendor(vendorId);
      console.log(`Found ${clients.length} clients for vendor ${vendorId}`);

      // Enrich with order stats
      const enrichedClients = await Promise.all(
        clients.map(async (client) => {
          const ownerUser = client.userId ? await storage.getUser(client.userId) : null;
          const clientOrders = await storage.getOrdersByClient(client.id);
          const totalSpent = clientOrders.reduce((sum, order) =>
            sum + parseFloat(order.totalValue || '0'), 0
          );

          return {
            ...client,
            userCode: ownerUser?.username || null,
            ordersCount: clientOrders.length,
            totalSpent,
          };
        })
      );

      res.json(enrichedClients);
    } catch (error) {
      console.error("Error fetching vendor clients:", error);
      res.status(500).json({ error: "Failed to fetch vendor clients" });
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
          const branch = vendorInfo?.branchId ? await storage.getBranch(vendorInfo.branchId) : null;
          return {
            id: vendor.id,
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            address: vendor.address,
            username: vendor.username,
            userCode: vendor.username,
            branchId: vendorInfo?.branchId || null,
            branchName: branch?.name || null,
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

      // Validate required fields
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      if (!userCode || userCode.trim().length === 0) {
        return res.status(400).json({ error: "Código de usuário é obrigatório" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userCode);
      if (existingUser) {
        return res.status(400).json({ error: "Código de usuário já existe" });
      }

      // Create vendor using storage method (creates user + vendor record)
      const newVendor = await storage.createVendor({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        username: userCode.trim(),
        password: password || "123456",
        commissionRate: commissionRate || '10.00'
      });

      // Get vendor info
      const vendorInfo = await storage.getVendor(newVendor.id);

      res.json({
        success: true,
        user: {
          id: newVendor.id,
          name: newVendor.name,
          email: newVendor.email,
          phone: newVendor.phone,
          address: newVendor.address,
          userCode: userCode,
          commissionRate: vendorInfo?.commissionRate || commissionRate || '10.00',
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

  // UPDATE endpoints
  
  app.put("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const clientData = req.body;

      const updatedClient = await storage.updateClient(id, clientData);
      if (!updatedClient) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }

      res.json(updatedClient);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  // DELETE endpoints with validations

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Validar se cliente tem orçamentos
      const budgets = await storage.getBudgets();
      const clientBudgets = budgets.filter(budget => budget.clientId === id);

      if (clientBudgets.length > 0) {
        return res.status(400).json({
          error: `Não é possível excluir este cliente pois existem ${clientBudgets.length} orçamento(s) associado(s) a ele`
        });
      }

      // Validar se cliente tem pedidos
      const orders = await storage.getOrders();
      const clientOrders = orders.filter(order => order.clientId === id);

      if (clientOrders.length > 0) {
        return res.status(400).json({
          error: `Não é possível excluir este cliente pois existem ${clientOrders.length} pedido(s) associado(s) a ele`
        });
      }

      // Buscar o cliente para obter o userId
      const client = await storage.getClient(id);
      if (client && client.userId) {
        // Marcar o usuário como inativo
        await storage.updateUser(client.userId, { isActive: false });
      }

      // Excluir cliente
      await storage.deleteClient(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  app.delete("/api/vendors/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Validar se vendedor tem pedidos
      const orders = await storage.getOrders();
      const vendorOrders = orders.filter(order => order.vendorId === id);

      if (vendorOrders.length > 0) {
        return res.status(400).json({
          error: "Não é possível excluir este vendedor pois existem pedidos associados a ele"
        });
      }

      // Excluir vendedor
      await storage.deleteVendor(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting vendor:', error);
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  app.delete("/api/branches/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Validar se filial tem pedidos
      const orders = await storage.getOrders();
      const branchOrders = orders.filter(order => order.branchId === id);

      if (branchOrders.length > 0) {
        return res.status(400).json({
          error: "Não é possível excluir esta filial pois existem pedidos associados a ela"
        });
      }

      // Excluir filial
      await storage.deleteBranch(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting branch:', error);
      res.status(500).json({ error: "Failed to delete branch" });
    }
  });

  // Update producer
  app.patch("/api/producers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, specialty, address } = req.body;

      console.log(`Updating producer ${id}:`, { name, email, phone, specialty, address });

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: "Nome deve ter pelo menos 2 caracteres" });
      }

      const updatedUser = await storage.updateUser(id, {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        specialty: specialty || null,
        address: address || null,
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "Produtor não encontrado" });
      }

      console.log(`Producer ${id} updated successfully`);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating producer:", error);
      res.status(500).json({ error: "Erro ao atualizar produtor" });
    }
  });

  // Change producer password
  app.patch("/api/producers/:id/password", async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      console.log(`Changing password for producer ${id}`);

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }

      const producer = await storage.getUser(id);
      if (!producer || producer.role !== 'producer') {
        return res.status(404).json({ error: "Produtor não encontrado" });
      }

      await storage.updateUser(id, { password: newPassword });

      console.log(`Password changed successfully for producer ${id}`);
      res.json({ success: true, message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Error changing producer password:", error);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });

  app.delete("/api/producers/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Validar se produtor tem pedidos de produção
      const productionOrders = await storage.getProductionOrders();
      const producerOrders = productionOrders.filter(po => po.producerId === id);

      if (producerOrders.length > 0) {
        return res.status(400).json({
          error: "Não é possível excluir este produtor pois existem pedidos de produção associados a ele"
        });
      }

      // Validar se produtor tem produtos associados
      const products = await storage.getProductsByProducer(id);
      if (products.length > 0) {
        return res.status(400).json({
          error: "Não é possível excluir este produtor pois existem produtos associados a ele"
        });
      }

      // Validar se produtor tem pagamentos pendentes
      const producerPayments = await storage.getProducerPaymentsByProducer(id);
      const pendingPayments = producerPayments.filter(payment => payment.status === 'pending' || payment.status === 'approved');

      if (pendingPayments.length > 0) {
        return res.status(400).json({
          error: "Não é possível excluir este produtor pois existem pagamentos pendentes associados a ele"
        });
      }

      // Excluir produtor
      const deleted = await storage.deleteProducer(id);
      if (!deleted) {
        return res.status(404).json({ error: "Produtor não encontrado" });
      }

      // Log producer deletion
      if (req.user && req.user.id) {
        try {
          await storage.logUserAction(
            req.user.id,
            req.user.name || 'Usuário',
            req.user.role || 'user',
            'DELETE',
            'producers',
            id,
            `Produtor excluído`,
            'warning',
            {
              producerId: id
            }
          );
        } catch (logError) {
          console.error('Error logging producer deletion:', logError);
        }
      }

      res.json({ success: true, message: "Produtor excluído com sucesso" });
    } catch (error) {
      console.error('Error deleting producer:', error);
      res.status(500).json({ error: "Erro ao excluir produtor: " + error.message });
    }
  });

  // Logistics users routes
  app.get("/api/logistics", async (req, res) => {
    try {
      const users = await storage.getUsers();
      const logisticsUsers = users.filter(user => user.role === 'logistics');
      res.json(logisticsUsers);
    } catch (error) {
      console.error('Error fetching logistics users:', error);
      res.status(500).json({ error: "Failed to fetch logistics users" });
    }
  });

  app.post("/api/logistics", async (req, res) => {
    try {
      const { name, email, phone, password, username, userCode } = req.body;

      console.log('Creating logistics user with request data:', { name, email, phone, username: username || userCode, hasPassword: !!password });

      // Use userCode as username if username is not provided
      const finalUsername = userCode || username || email;

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

      const logisticsUser = await storage.createUser({
        username: finalUsername,
        password,
        name,
        email: email || null,
        phone: phone || null,
        role: 'logistics',
        userCode: userCode || finalUsername
      });

      console.log('Logistics user created successfully:', logisticsUser.id);

      res.json({
        ...logisticsUser,
        password: password // Return password in response so it can be shown to admin
      });
    } catch (error) {
      console.error('Error creating logistics user:', error);
      res.status(500).json({ error: "Failed to create logistics user" });
    }
  });

  // Update logistics user
  app.patch("/api/logistics/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone } = req.body;

      console.log(`Updating logistics user ${id}:`, { name, email, phone });

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: "Nome deve ter pelo menos 2 caracteres" });
      }

      const user = await storage.getUser(id);
      if (!user || user.role !== 'logistics') {
        return res.status(404).json({ error: "Usuário de logística não encontrado" });
      }

      const updatedUser = await storage.updateUser(id, {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
      });

      console.log(`Logistics user ${id} updated successfully`);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating logistics user:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  // Change logistics user password
  app.patch("/api/logistics/:id/password", async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      console.log(`Changing password for logistics user ${id}`);

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }

      const user = await storage.getUser(id);
      if (!user || user.role !== 'logistics') {
        return res.status(404).json({ error: "Usuário de logística não encontrado" });
      }

      await storage.updateUser(id, { password: newPassword });

      console.log(`Password changed successfully for logistics user ${id}`);
      res.json({ success: true, message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Error changing logistics user password:", error);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });

  app.delete("/api/logistics/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Deletar usuário de logística
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting logistics user:', error);
      res.status(500).json({ error: "Failed to delete logistics user" });
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

  app.patch("/api/commissions/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'confirmed', 'paid', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const updatedCommission = await storage.updateCommissionStatus(id, status);
      if (!updatedCommission) {
        return res.status(404).json({ error: "Comissão não encontrada" });
      }

      // Log the status change
      if (req.user) {
        try {
          await storage.logUserAction(
            req.user.id,
            req.user.name || 'Usuário',
            req.user.role || 'user',
            'UPDATE',
            'commissions',
            id,
            `Status da comissão alterado para ${status}`,
            'info',
            { status }
          );
        } catch (logError) {
          console.error('Error logging commission status change:', logError);
        }
      }

      res.json(updatedCommission);
    } catch (error) {
      console.error('Error updating commission status:', error);
      res.status(500).json({ error: "Erro ao atualizar status da comissão" });
    }
  });

  app.patch("/api/commissions/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'confirmed', 'paid', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const updatedCommission = await storage.updateCommissionStatus(id, status);
      if (!updatedCommission) {
        return res.status(404).json({ error: "Comissão não encontrada" });
      }

      // Log the status change
      if (req.user) {
        try {
          await storage.logUserAction(
            req.user.id,
            req.user.name || 'Usuário',
            req.user.role || 'user',
            'UPDATE',
            'commissions',
            id,
            `Status da comissão alterado para ${status}`,
            'info',
            { status }
          );
        } catch (logError) {
          console.error('Error logging commission status change:', logError);
        }
      }

      res.json(updatedCommission);
    } catch (error) {
      console.error('Error updating commission status:', error);
      res.status(500).json({ error: "Erro ao atualizar status da comissão" });
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

      // Get client record from clients table using userId
      const clientRecord = await storage.getClientByUserId(quoteRequest.clientId);
      if (!clientRecord) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }

      // Criar orçamento oficial baseado na solicitação
      const budgetData = {
        budgetNumber: `ORC-${Date.now()}`,
        clientId: clientRecord.id,  // Use the client table ID, not user ID
        vendorId: quoteRequest.vendorId,
        contactName: quoteRequest.contactName,
        contactPhone: quoteRequest.whatsapp || '',
        contactEmail: quoteRequest.email || '',
        title: `Orçamento - ${(quoteRequest.items || []).map((p: any) => p.productName).join(', ')}`,
        description: quoteRequest.observations || '',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        deliveryDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
        deliveryType: "delivery",
        status: "draft",
        paymentMethodId: "pm-1", // Default to PIX
        shippingMethodId: "sm-1", // Default to Correios PAC
        installments: 1,
        downPayment: 0,
        remainingAmount: quoteRequest.totalEstimatedValue || 0,
        shippingCost: 0,
        hasDiscount: false,
        discountType: "percentage",
        discountPercentage: 0,
        discountValue: 0,
        items: (quoteRequest.items || []).map((product: any) => ({
          productId: product.productId,
          productName: product.productName,
          producerId: product.producerId || 'internal',
          quantity: product.quantity || 1,
          unitPrice: parseFloat(product.basePrice) || 0,
          totalPrice: (product.quantity || 1) * (parseFloat(product.basePrice) || 0),
          hasItemCustomization: false,
          selectedCustomizationId: '',
          itemCustomizationValue: 0,
          itemCustomizationDescription: '',
          additionalCustomizationNotes: product.observations || '',
          customizationPhoto: '',
          hasGeneralCustomization: false,
          generalCustomizationName: '',
          generalCustomizationValue: 0,
          hasItemDiscount: false,
          itemDiscountType: 'percentage',
          itemDiscountPercentage: 0,
          itemDiscountValue: 0,
          productWidth: '',
          productHeight: '',
          productDepth: ''
        })) || [],
        totalValue: quoteRequest.totalEstimatedValue || 0
      };

      // Create budget without items first (items are already included in budgetData)
      const newBudget = await storage.createBudget(budgetData);

      // Items are automatically created by storage.createBudget, no need to create them again

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
            items: budgetItems, // CRITICAL FIX: Add items for frontend compatibility
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
        confirmedOrders: orders.filter(o => o.status !== 'cancelled').length
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
      console.log(`Fetching commissions for vendor: ${vendorId}`);
      
      const commissions = await storage.getCommissionsByVendor(vendorId);
      console.log(`Found ${commissions.length} commissions for vendor ${vendorId}`);

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

      console.log(`Returning ${enrichedCommissions.length} enriched commissions for vendor ${vendorId}`);
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

      console.log(`Found ${partners.length} partners in users table`);

      const partnersWithDetails = await Promise.all(partners.map(async (partner) => {
        const partnerProfile = await storage.getPartner(partner.id);
        return {
          id: partner.id,
          name: partner.name,
          email: partner.email || "",
          username: partner.username || "",
          userCode: partner.username || "",
          phone: partner.phone || "",
          commissionRate: partnerProfile?.commissionRate || '15.00',
          createdAt: partner.createdAt,
          isActive: partner.isActive || true
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
    try {
      const { name, email, phone, username, password } = req.body;

      console.log('Creating partner with request data:', { name, email, phone, username, hasPassword: !!password });

      // Validate required fields
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      if (!username || username.trim().length === 0) {
        return res.status(400).json({ error: "Nome de usuário é obrigatório" });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username.trim());
      if (existingUser) {
        console.log('Username already exists:', username);
        return res.status(400).json({ error: "Nome de usuário já existe" });
      }

      // Create partner using storage method
      const newPartner = await storage.createPartner({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        username: username.trim(),
        password: password,
        commissionRate: '15.00' // Default commission rate for partners
      });

      console.log('Partner created successfully:', { id: newPartner.id, username: newPartner.username, name: newPartner.name });

      // Return partner without password
      const { password: _, ...partnerWithoutPassword } = newPartner;

      res.json({
        success: true,
        partner: {
          ...partnerWithoutPassword,
          userCode: newPartner.username,
          commissionRate: '15.00'
        }
      });
    } catch (error) {
      console.error('Error creating partner:', error);
      res.status(500).json({ error: "Failed to create partner: " + error.message });
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

  // Delete commission
  app.delete("/api/commissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Deleting commission: ${id}`);

      // Get commission details before deletion for logging
      const commissions = await storage.getAllCommissions();
      const commission = commissions.find(c => c.id === id);

      const deleted = await storage.deleteCommission(id);
      if (!deleted) {
        return res.status(404).json({ error: "Comissão não encontrada" });
      }

      // Log commission deletion
      if (req.user && req.user.id) {
        try {
          await storage.logUserAction(
            req.user.id,
            req.user.name || 'Usuário',
            req.user.role || 'user',
            'DELETE',
            'commissions',
            id,
            `Comissão excluída: R$ ${commission?.amount || '0.00'} - ${commission?.type || 'Unknown'} - Pedido: ${commission?.orderNumber || 'N/A'}`,
            'warning',
            {
              commissionId: id,
              amount: commission?.amount,
              type: commission?.type,
              orderNumber: commission?.orderNumber
            }
          );
        } catch (logError) {
          console.error('Error logging commission deletion:', logError);
        }
      }

      res.json({ success: true, message: "Comissão excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting commission:", error);
      res.status(500).json({ error: "Erro ao excluir comissão: " + error.message });
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

  // Get commissions for a specific partner
  app.get("/api/commissions/partner/:partnerId", async (req, res) => {
    try {
      const { partnerId } = req.params;
      const commissions = await storage.getCommissionsByPartner(partnerId);

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
      console.error("Error fetching partner commissions:", error);
      res.status(500).json({ error: "Failed to fetch partner commissions" });
    }
  });

  // Get all partners
  app.get("/api/partners", async (req, res) => {
    try {
      const partners = await storage.getPartners();

      // Enrich with commission totals
      const enrichedPartners = await Promise.all(
        partners.map(async (partner) => {
          const commissions = await storage.getCommissionsByPartner(partner.id);
          const totalCommissions = commissions.reduce((sum, c) => sum + parseFloat(c.amount || '0'), 0);

          return {
            ...partner,
            totalCommissions
          };
        })
      );

      console.log(`Found ${enrichedPartners.length} partners`);
      res.json(enrichedPartners);
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  // Update partner (admin only)
  app.put("/api/partners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const partnerData = req.body;

      console.log(`Updating partner ${id} with data:`, partnerData);

      // Validate required fields
      if (!partnerData.name || partnerData.name.trim().length === 0) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      // Update user information
      const updatedUser = await storage.updateUser(id, {
        name: partnerData.name.trim(),
        email: partnerData.email?.trim() || null,
        phone: partnerData.phone?.trim() || null,
        isActive: partnerData.isActive !== undefined ? partnerData.isActive : true
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "Sócio não encontrado" });
      }

      console.log('Partner updated successfully:', updatedUser.name);

      // Return updated user without password
      const { password: _, ...userWithoutPassword } = updatedUser;

      res.json({
        success: true,
        partner: userWithoutPassword,
        message: "Sócio atualizado com sucesso"
      });
    } catch (error) {
      console.error("Error updating partner:", error);
      res.status(500).json({ error: "Erro ao atualizar sócio: " + error.message });
    }
  });

  // Delete partner
  app.delete("/api/partners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Attempting to delete partner: ${id}`);

      // Check if partner has commissions
      const commissions = await storage.getCommissionsByPartner(id);
      if (commissions.length > 0) {
        console.log(`Partner ${id} has ${commissions.length} commissions, cannot delete`);
        return res.status(400).json({
          error: "Não é possível excluir este sócio pois existem comissões associadas"
        });
      }

      // Delete partner profile first
      try {
        await storage.deletePartner(id);
        console.log(`Partner profile deleted for user: ${id}`);
      } catch (partnerError) {
        console.log(`No partner profile found for user ${id}, continuing with user deletion`);
      }

      // Delete user
      const userDeleted = await storage.deleteUser(id);
      if (!userDeleted) {
        return res.status(404).json({ error: "Sócio não encontrado" });
      }

      console.log(`Partner and user ${id} deleted successfully`);
      res.json({ success: true, message: "Sócio excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting partner:", error);
      res.status(500).json({ error: "Erro ao excluir sócio: " + error.message });
    }
  });

  // Recalculate commissions for all orders (migration fix)
  app.post("/api/admin/recalculate-commissions", requireAuth, async (req, res) => {
    try {
      console.log("Starting commission recalculation...");
      await storage.recalculateAllCommissions();

      res.json({
        success: true,
        message: "Comissões recalculadas com sucesso"
      });
    } catch (error) {
      console.error("Error recalculating commissions:", error);
      res.status(500).json({ error: "Erro ao recalcular comissões: " + error.message });
    }
  });

  // Get system logs with filters
  app.get("/api/admin/logs", async (req, res) => {
    try {
      const { search, action, user, level, date, export: isExport } = req.query as {
        search?: string;
        action?: string;
        user?: string;
        level?: string;
        date?: string;
        export?: string;
      };

      const logs = await storage.getSystemLogs({
        search,
        action: action === 'all' ? undefined : action,
        userId: user === 'all' ? undefined : user,
        level: level === 'all' ? undefined : level,
        dateFilter: date === 'all' ? undefined : date
      });

      if (isExport === 'true') {
        // Return CSV format for export
        const csvHeaders = 'Data,Usuário,Ação,Nível,Descrição,Detalhes,IP,User Agent\n';
        const csvData = logs.map((log: any) => {
          const date = new Date(log.createdAt).toLocaleString('pt-BR');
          const details = (log.details || '').replace(/"/g, '""');
          const description = (log.description || '').replace(/"/g, '""');
          const userAgent = (log.userAgent || '').replace(/"/g, '""');

          return `"${date}","${log.userName}","${log.action}","${log.level}","${description}","${details}","${log.ipAddress || ''}","${userAgent}"`;
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=logs-sistema-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvHeaders + csvData);
      } else {
        res.json(logs);
      }
    } catch (error) {
      console.error("Error fetching system logs:", error);
      res.status(500).json({ error: "Failed to fetch system logs" });
    }
  });

  // Create backup of logs
  app.post("/api/admin/logs/backup", async (req, res) => {
    try {
      console.log("Creating logs backup...");

      // Get all logs from the last 7 days
      const logs = await storage.getSystemLogs({
        dateFilter: 'week'
      });

      if (logs.length === 0) {
        return res.json({
          success: true,
          message: "Nenhum log encontrado para backup",
          backupId: null
        });
      }

      // Create backup record
      const backupDate = new Date();
      const backupId = `backup-${backupDate.getTime()}`;

      // Generate Excel data
      const excelData = logs.map((log: any) => ({
        'Data': new Date(log.createdAt).toLocaleString('pt-BR'),
        'Usuário': log.userName,
        'Ação': log.action,
        'Nível': log.level,
        'Descrição': log.description || '',
        'Detalhes': log.details || '',
        'IP': log.ipAddress || '',
        'User Agent': log.userAgent || ''
      }));

      // Store backup info
      const backup = await storage.createLogBackup({
        id: backupId,
        backupDate: backupDate,
        logCount: logs.length,
        excelData: JSON.stringify(excelData),
        status: 'completed'
      });

      // Clean old logs (older than 7 days)
      await storage.cleanOldLogs(7);

      console.log(`Backup created: ${backupId} with ${logs.length} logs`);

      res.json({
        success: true,
        backup: backup,
        message: `Backup criado com sucesso! ${logs.length} logs arquivados.`
      });
    } catch (error) {
      console.error("Error creating logs backup:", error);
      res.status(500).json({ error: "Erro ao criar backup de logs: " + error.message });
    }
  });

  // Get log backups list
  app.get("/api/admin/logs/backups", async (req, res) => {
    try {
      const backups = await storage.getLogBackups();
      res.json(backups);
    } catch (error) {
      console.error("Error fetching log backups:", error);
      res.status(500).json({ error: "Failed to fetch log backups" });
    }
  });

  // Download log backup as Excel
  app.get("/api/admin/logs/backups/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const backup = await storage.getLogBackup(id);

      if (!backup) {
        return res.status(404).json({ error: "Backup não encontrado" });
      }

      const excelData = JSON.parse(backup.excelData);

      // Set headers for Excel download
      const fileName = `logs-backup-${new Date(backup.backupDate).toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Send Excel data as JSON (frontend will handle Excel generation)
      res.json({
        success: true,
        data: excelData,
        fileName: fileName,
        backupInfo: {
          date: backup.backupDate,
          logCount: backup.logCount
        }
      });
    } catch (error) {
      console.error("Error downloading log backup:", error);
      res.status(500).json({ error: "Erro ao baixar backup: " + error.message });
    }
  });

  // Delete log backup
  app.delete("/api/admin/logs/backups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteLogBackup(id);

      if (!deleted) {
        return res.status(404).json({ error: "Backup não encontrado" });
      }

      res.json({ success: true, message: "Backup excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting log backup:", error);
      res.status(500).json({ error: "Erro ao excluir backup: " + error.message });
    }
  });

  // Get all accounts receivable (orders + manual)
  app.get("/api/finance/receivables", async (req, res) => {
    try {
      const accountsReceivable = await storage.getAccountsReceivable();
      const manualReceivables = await storage.getManualReceivables();
      const orders = await storage.getOrders();

      // Enrich order-based receivables with order and client data
      const enrichedReceivables = await Promise.all(
        accountsReceivable.map(async (receivable) => {
          try {
            // Get order data
            const order = await storage.getOrder(receivable.orderId);
            if (!order) {
              console.log(`Order not found for receivable: ${receivable.orderId}`);
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
              clientName = "Cliente não informado";
            }

            // Get payments for this order
            const payments = await storage.getPaymentsByOrder(order.id);
            const confirmedPayments = payments.filter(p => p.status === 'confirmed');
            const totalPaid = confirmedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

            // Get last payment date
            let lastPaymentDate = null;
            if (confirmedPayments.length > 0) {
              const sortedPayments = confirmedPayments.sort((a, b) =>
                new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime()
              );
              lastPaymentDate = sortedPayments[0].paidAt || sortedPayments[0].createdAt;
            }

            // Get budget payment info if order was converted from budget
            let budgetDownPayment = 0;
            let budgetShippingCost = 0;
            if (order.budgetId) {
              try {
                const budgetPaymentInfo = await storage.getBudgetPaymentInfo(order.budgetId);
                if (budgetPaymentInfo) {
                  budgetDownPayment = parseFloat(budgetPaymentInfo.downPayment || "0");
                  budgetShippingCost = parseFloat(budgetPaymentInfo.shippingCost || "0");
                  console.log(`[RECEIVABLES API] Order ${order.orderNumber} - Budget down payment: R$ ${budgetDownPayment}, shipping: R$ ${budgetShippingCost}`);
                }
              } catch (error) {
                console.log(`Error getting budget payment info for order ${order.id}:`, error);
              }
            }

            // Calculate minimum payment (down payment + shipping from budget)
            const calculatedMinimumPayment = budgetDownPayment + budgetShippingCost;
            const minimumPayment = calculatedMinimumPayment > 0 ? calculatedMinimumPayment.toFixed(2) : (receivable.minimumPayment || "0.00");

            // Get order items (from budget or order items)
            let orderItems = [];
            if (order.budgetId) {
              const budgetItems = await storage.getBudgetItems(order.budgetId);
              orderItems = budgetItems || [];
            } else if (order.items && Array.isArray(order.items)) {
              orderItems = order.items;
            }

            return {
              id: receivable.id,
              orderId: receivable.orderId,
              orderNumber: order.orderNumber,
              clientId: receivable.clientId,
              clientName: clientName,
              vendorId: receivable.vendorId,
              dueDate: receivable.dueDate,
              amount: receivable.amount, // Total amount of the order
              receivedAmount: totalPaid.toFixed(2), // Actually paid amount
              minimumPayment: minimumPayment, // Minimum required payment (entrada + frete)
              status: receivable.status,
              notes: receivable.notes,
              createdAt: receivable.createdAt,
              updatedAt: receivable.updatedAt,
              lastPaymentDate: lastPaymentDate,
              shippingCost: budgetShippingCost.toFixed(2) || "0.00",
              items: orderItems,
              branchId: order.branchId
            };
          } catch (error) {
            console.error(`Error enriching receivable ${receivable.id}:`, error);
            return null;
          }
        })
      );

      // Filter out null values
      const validOrderReceivables = enrichedReceivables.filter(r => r !== null);

      // Add manual receivables (already in correct format from DB)
      const allReceivables = [
        ...validOrderReceivables,
        ...manualReceivables
      ];

      res.json(allReceivables);
    } catch (error) {
      console.error("Error fetching receivables:", error);
      res.status(500).json({ error: "Failed to fetch receivables" });
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
                             (order.status === 'confirmed' || order.status === 'production' || order.status ==='pending');

        if (shouldInclude) {
          console.log(`Including order ${order.orderNumber}: Total=${totalValue}, Paid=${paidValue}, Remaining=${remainingValue}, Status=${order.status}`);
        }

        return shouldInclude;
      });

      // Enrich with client names and additional info
      const enrichedOrders = await Promise.all(
        pendingOrders.map(async (order) => {
          // Always use contactName as primary client name
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

      // Get admin user ID if createdBy not provided
      let effectiveCreatedBy = createdBy || req.user?.id;
      if (!effectiveCreatedBy) {
        const adminUser = await storage.getUserByUsername('admin');
        effectiveCreatedBy = adminUser?.id;
        if (!effectiveCreatedBy) {
          console.error("Cannot create expense note: admin user not found in system");
          return res.status(500).json({ error: "Usuário admin não encontrado no sistema" });
        }
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
        createdBy: effectiveCreatedBy
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

      // Log payment creation
      const order = await storage.getOrder(orderId);
      await storage.logUserAction(
        req.user?.id || 'system',
        req.user?.name || 'Sistema',
        req.user?.role || 'system',
        'CREATE',
        'payments',
        payment.id,
        `Pagamento processado via OFX: R$ ${paymentAmount.toFixed(2)} - Pedido: ${order?.orderNumber}`,
        'success',
        {
          amount: paymentAmount.toFixed(2),
          method: 'bank_transfer',
          orderId: orderId,
          orderNumber: order?.orderNumber,
          transactionId: payment.transactionId
        }
      );

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
        const order = await storage.getOrder(receivable.orderId);
        if (!order) {
          return res.status(404).json({ error: "Pedido relacionado não encontrado" });
        }

        // Validate payment amount against remaining balance
        const requested = parseFloat(amount);
        const alreadyPaid = parseFloat(order.paidValue || '0');
        const total = parseFloat(order.totalValue);

        // Never accept payment above the remaining amount
        const allowable = Math.max(0, total - alreadyPaid);
        const finalAmount = Math.min(requested, allowable);

        if (finalAmount !== requested) {
          console.log(`[RECEIVABLES PAYMENT] Clamped payment from ${requested} to ${finalAmount} for order ${order.orderNumber}`);
        }

        // Create payment with confirmed status - this automatically calls updateOrderPaidValue()
        paymentRecord = await storage.createPayment({
          orderId: receivable.orderId,
          amount: finalAmount.toFixed(2),
          method: method || 'manual',
          status: 'confirmed',
          transactionId: transactionId || `MANUAL-${Date.now()}`,
          notes: notes || '',
          paidAt: new Date()
        });

        console.log(`[RECEIVABLE PAYMENT] Created payment for order ${order.orderNumber}: amount=${finalAmount.toFixed(2)}`);

        // IMPORTANT: Also update the receivedAmount in accounts_receivable for this order
        // This ensures the UI shows the correct "already paid" amount
        const currentReceived = parseFloat(receivable.receivedAmount || '0');
        const newReceivedAmount = currentReceived + finalAmount;
        const totalAmount = parseFloat(receivable.amount);

        await storage.updateAccountsReceivable(receivable.id, {
          receivedAmount: newReceivedAmount.toFixed(2),
          status: newReceivedAmount >= totalAmount ? 'paid' : 'partial',
          updatedAt: new Date()
        });

        console.log(`[RECEIVABLE PAYMENT] Updated receivedAmount from ${currentReceived} to ${newReceivedAmount.toFixed(2)} for receivable ${receivable.id}`);

        // Note: createPayment() with status='confirmed' already calls updateOrderPaidValue() which:
        // 1. Sums all confirmed payments for the order
        // 2. Updates order.paidValue
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
      const { beneficiary, description, amount, dueDate, category, notes, attachmentUrl } = req.body;

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
        notes: notes || null,
        attachmentUrl: attachmentUrl || null
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

      // Get admin user ID if req.user not available
      let uploadedById = req.user?.id;
      if (!uploadedById) {
        const adminUser = await storage.getUserByUsername('admin');
        uploadedById = adminUser?.id;
        if (!uploadedById) {
          return res.status(500).json({ error: 'Usuário admin não encontrado no sistema' });
        }
      }

      // Create bank import record
      const importRecord = await storage.createBankImport({
        filename: req.file.originalname,
        uploadedBy: uploadedById,
        status: 'processing',
        fileSize: req.file.size.toString(),
        transactionCount: transactions.length
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

          // Validate essential fields
          if (!transaction.fitId) {
            console.log(`Skipping transaction without fitId:`, transaction);
            errors.push(`Transação sem ID único (FITID)`);
            continue;
          }

          if (!transaction.amount || transaction.amount === '0' || transaction.amount === '0.00') {
            console.log(`Skipping zero amount transaction:`, transaction);
            errors.push(`Transação com valor zero: ${transaction.fitId}`);
            continue;
          }

          // Ensure date is properly formatted
          let transactionDate = transaction.date;
          if (!transactionDate || !transaction.hasValidDate) {
            transactionDate = new Date(); // Use current date as fallback
            console.warn(`Using current date for transaction ${transaction.fitId} - original date invalid`);
          }

          const newTransaction = await storage.createBankTransaction({
            importId: importRecord.id,
            fitId: transaction.fitId,
            date: transactionDate,
            hasValidDate: transaction.hasValidDate || false,
            amount: transaction.amount,
            description: transaction.description || 'Transação bancária',
            memo: transaction.description || '',
            bankRef: transaction.bankRef || '',
            originalType: transaction.originalType || '',
            type: transaction.type || 'other',
            status: 'unmatched',
            notes: ''
          });

          console.log(`Created transaction: ${newTransaction.id} - ${transaction.description} - R$ ${transaction.amount}`);
          importedCount++;
        } catch (error) {
          console.error("Error saving transaction:", error);
          errors.push(`Erro ao salvar transação ${transaction.fitId || 'sem ID'}: ${error.message}`);
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

      // Get admin user ID if req.user not available
      let uploadedById = req.user?.id;
      if (!uploadedById) {
        const adminUser = await storage.getUserByUsername('admin');
        uploadedById = adminUser?.id;
        if (!uploadedById) {
          return res.status(500).json({ error: 'Usuário admin não encontrado no sistema' });
        }
      }

      // Create bank import record for producer payments
      const importRecord = await storage.createBankImport({
        filename: req.file.originalname,
        uploadedBy: uploadedById,
        status: 'processing',
        fileSize: req.file.size.toString(),
        transactionCount: debitTransactions.length
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

          // Validate essential fields
          if (!transaction.fitId) {
            console.log(`Skipping debit transaction without fitId:`, transaction);
            errors.push(`Transação de débito sem ID único (FITID)`);
            continue;
          }

          // Ensure date is properly formatted
          let transactionDate = transaction.date;
          if (!transactionDate || !transaction.hasValidDate) {
            transactionDate = new Date(); // Use current date as fallback
            console.warn(`Using current date for debit transaction ${transaction.fitId}`);
          }

          // Create new transaction
          await storage.createBankTransaction({
            importId: importRecord.id,
            fitId: transaction.fitId,
            date: transactionDate,
            hasValidDate: transaction.hasValidDate || false,
            amount: transaction.amount, // Keep original negative value
            description: transaction.description || 'Pagamento bancário',
            memo: transaction.description || '',
            bankRef: transaction.bankRef || '',
            originalType: transaction.originalType || '',
            type: transaction.type || 'debit',
            status: 'unmatched',
            notes: ''
          });

          console.log(`Created debit transaction: ${transaction.fitId} - ${transaction.description} - R$ ${transaction.amount}`);
          importedCount++;
        } catch (transactionError) {
          console.error(`Error importing producer payment transaction ${transaction.fitId}:`, transactionError);
          errors.push(`Erro ao importar transação ${transaction.fitId || 'sem ID'}: ${transactionError.message}`);
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
      const { branchId } = req.query;
      
      let orders = await storage.getOrders();
      const payments = await storage.getPayments();
      let allCommissions = await storage.getAllCommissions();
      let productionOrders = await storage.getProductionOrders();
      const bankTransactions = await storage.getBankTransactions();
      const expenseNotes = await storage.getExpenseNotes();
      let producerPayments = await storage.getProducerPayments();

      // Filtrar por filial se especificada
      if (branchId && branchId !== 'all') {
        console.log(`Filtering financial overview by branchId: ${branchId}`);
        orders = orders.filter(order => order.branchId === branchId);
        
        // Filtrar production orders e producer payments pelos orders filtrados
        const orderIds = orders.map(o => o.id);
        productionOrders = productionOrders.filter(po => orderIds.includes(po.orderId));
        
        const productionOrderIds = productionOrders.map(po => po.id);
        producerPayments = producerPayments.filter(pp => productionOrderIds.includes(pp.productionOrderId));
        
        // Filtrar comissões pelos orders filtrados
        allCommissions = allCommissions.filter(c => orderIds.includes(c.orderId));
      }

      console.log('Overview calculation - Data counts:', {
        orders: orders.length,
        payments: payments.length,
        commissions: allCommissions.length,
        productionOrders: productionOrders.length,
        expenseNotes: expenseNotes.length,
        producerPayments: producerPayments.length,
        branchId: branchId || 'all'
      });

      // Contas a Receber - usar accountsReceivable (que já tem o valor correto)
      let accountsReceivable = await storage.getAccountsReceivable();
      
      // Filtrar por filial se especificada
      if (branchId && branchId !== 'all') {
        const orderIds = orders.map(o => o.id);
        accountsReceivable = accountsReceivable.filter(ar => orderIds.includes(ar.orderId));
      }
      
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

      console.log(`Refunds for cancelled orders: ${orders.filter(o => o.status === 'cancelled' && parseFloat(o.paidValue || '0') > 0).length}, total: ${refunds}`);

      // Incluir contas a pagar manuais
      const manualPayables = await storage.getManualPayables();
      console.log(`Found ${manualPayables.length} manual payables:`, manualPayables.map(p => ({ id: p.id, amount: p.amount, status: p.status })));
      const manualPayablesAmount = manualPayables
        .filter(payable => payable.status === 'pending')
        .reduce((total, payable) => total + parseFloat(payable.amount || '0'), 0);

      console.log(`Manual payables total: ${manualPayablesAmount}`);

      const payables = producers + expenses + commissions + refunds + manualPayablesAmount;

      console.log('Payables breakdown:', {
        producers: Number(producers) || 0,
        expenses: Number(expenses) || 0,
        commissions: Number(commissions) || 0,
        refunds: Number(refunds) || 0,
        manual: Number(manualPayablesAmount) || 0
      });

      // Saldo em Conta - transações bancárias não conciliadas (entrada - saída)
      const bankBalance = bankTransactions.reduce((total, txn) => {
        const amount = parseFloat(txn.amount);
        // Assumir que valores positivos são entrada e negativos são saída
        return total + amount;
      }, 0);

      // Comissões Pendentes
      const pendingCommissions = allCommissions
        .filter(c => ['pending', 'confirmed'].includes(c.status) && !c.paidAt)
        .reduce((total, c) => total + parseFloat(c.amount), 0);

      // Receita Total do Mês
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyRevenue = orders
        .filter(order => {
          if (!order.createdAt) return false;
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

  // DEPRECATED: Get all products (producer selection is now at budget item level)
  app.get("/api/products/by-producer", async (req, res) => {
    try {
      // Retorna todos os produtos (não mais agrupados por produtor)
      const result = await storage.getProducts({ limit: 9999 });
      res.json(result.products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // DEPRECATED: Get all products (producer is chosen at budget item level)
  app.get("/api/products/producer/:producerId", async (req, res) => {
    try {
      // Retorna todos os produtos globais - produtor é agora selecionado por item no orçamento
      const result = await storage.getProducts({ limit: 9999 });
      res.json(result.products);
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
      res.status(500).json({ error: "Failed to createproduct" });
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
      const updateData = req.body;

      console.log(`Updating profile for user: ${userId}`, updateData);

      // Update user record first (excluding name - it's not editable by client)
      const updatedUser = await storage.updateUser(userId, {
        email: updateData.email,
        phone: updateData.phone,
        address: updateData.address
      });

      // Update or create client record
      const clientRecord = await storage.getClientByUserId(userId);
      if (clientRecord) {
        // Update existing client record with all commercial fields (excluding name and cpfCnpj - not editable)
        await storage.updateClient(clientRecord.id, {
          email: updateData.email,
          phone: updateData.phone,
          whatsapp: updateData.whatsapp,
          address: updateData.address,
          // Commercial fields
          nomeFantasia: updateData.nomeFantasia,
          razaoSocial: updateData.razaoSocial,
          inscricaoEstadual: updateData.inscricaoEstadual,
          logradouro: updateData.logradouro,
          numero: updateData.numero,
          complemento: updateData.complemento,
          bairro: updateData.bairro,
          cidade: updateData.cidade,
          cep: updateData.cep,
          emailBoleto: updateData.emailBoleto,
          emailNF: updateData.emailNF,
          nomeContato: updateData.nomeContato,
          emailContato: updateData.emailContato
        });
      }

      // Get updated data
      const updatedData = await storage.getClientByUserId(userId);
      const vendor = updatedData?.vendorId ? await storage.getUser(updatedData.vendorId) : null;

      res.json({
        ...updatedData,
        vendorName: vendor?.name || null
      });
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

  // Get all clients
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();

      // Enrich with vendor names and statistics
      const enrichedClients = await Promise.all(
        clients.map(async (client) => {
          const vendor = client.vendorId ? await storage.getUser(client.vendorId) : null;
          const ownerUser = client.userId ? await storage.getUser(client.userId) : null;

          // Count orders for this client
          const clientOrders = await storage.getOrdersByClient(client.id);
          const totalSpent = clientOrders.reduce((sum, order) =>
            sum + parseFloat(order.totalValue || '0'), 0
          );

          const enriched = {
            ...client,
            userCode: ownerUser?.username || null,
            vendorName: vendor?.name || null,
            ordersCount: clientOrders.length,
            totalSpent,
          };

          return enriched;
        })
      );

      res.json(enrichedClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // Get orders for a specific client
  app.get("/api/clients/:id/orders", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching orders for client: ${id}`);

      const orders = await storage.getOrdersByClient(id);
      console.log(`Found ${orders.length} orders for client ${id}`);

      // Enrich orders using the service
      const enrichmentService = new OrderEnrichmentService(storage);
      const enrichedOrders = await enrichmentService.enrichOrders(orders, {
        includeUnreadNotes: true
      });

      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching client orders:", error);
      res.status(500).json({ error: "Failed to fetch client orders" });
    }
  });

  // Create client endpoint
  app.post("/api/clients", async (req, res) => {
    try {
      const clientData = req.body;
      console.log("=== CREATING CLIENT ===");
      console.log("Request body:", JSON.stringify(clientData, null, 2));

      // Validate required fields
      if (!clientData.name) {
        console.log("ERROR: Nome é obrigatório");
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      if (!clientData.password) {
        console.log("ERROR: Senha é obrigatória");
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      // Use userCode as username if provided, otherwise generate one
      const username = clientData.userCode || `cli_${Date.now()}`;
      console.log(`Generated username: ${username}`);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log(`ERROR: Username ${username} already exists`);
        return res.status(400).json({ error: "Código de usuário já existe" });
      }

      console.log("Creating user and client atomically in transaction...");
      
      // Create user and client in a single transaction (atomic operation)
      const { user, client } = await storage.createClientWithUser(
        {
          username: username,
          password: clientData.password,
          name: clientData.name,
          email: clientData.email || null,
          phone: clientData.phone || null
        },
        {
          whatsapp: clientData.whatsapp || null,
          cpfCnpj: clientData.cpfCnpj || null,
          address: clientData.address || null,
          vendorId: clientData.vendorId || null,
          isActive: true,
          nomeFantasia: clientData.nomeFantasia || null,
          razaoSocial: clientData.razaoSocial || null,
          inscricaoEstadual: clientData.inscricaoEstadual || null,
          logradouro: clientData.logradouro || null,
          numero: clientData.numero || null,
          complemento: clientData.complemento || null,
          bairro: clientData.bairro || null,
          cidade: clientData.cidade || null,
          cep: clientData.cep || null,
          emailBoleto: clientData.emailBoleto || null,
          emailNF: clientData.emailNF || null,
          nomeContato: clientData.nomeContato || null,
          emailContato: clientData.emailContato || null,
          enderecoFaturamentoLogradouro: clientData.enderecoFaturamentoLogradouro || null,
          enderecoFaturamentoNumero: clientData.enderecoFaturamentoNumero || null,
          enderecoFaturamentoComplemento: clientData.enderecoFaturamentoComplemento || null,
          enderecoFaturamentoBairro: clientData.enderecoFaturamentoBairro || null,
          enderecoFaturamentoCidade: clientData.enderecoFaturamentoCidade || null,
          enderecoFaturamentoCep: clientData.enderecoFaturamentoCep || null,
          enderecoEntregaLogradouro: clientData.enderecoEntregaLogradouro || null,
          enderecoEntregaNumero: clientData.enderecoEntregaNumero || null,
          enderecoEntregaComplemento: clientData.enderecoEntregaComplemento || null,
          enderecoEntregaBairro: clientData.enderecoEntregaBairro || null,
          enderecoEntregaCidade: clientData.enderecoEntregaCidade || null,
          enderecoEntregaCep: clientData.enderecoEntregaCep || null
        }
      );

      console.log(`SUCCESS: User and client created successfully: ${client.id} - ${client.name}`);

      const response = {
        success: true,
        client: {
          ...client,
          userCode: username // Include userCode in response
        }
      };

      console.log("Sending response:", JSON.stringify(response, null, 2));
      res.json(response);
    } catch (error) {
      console.error("ERROR creating client:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: "Erro ao criar cliente: " + error.message });
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
        return res.status(400).json({ error:"Valor deve ser maior que zero" });
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

      console.log(`Confirming delivery for order: ${id}`);

      // First, check if the order exists and has products in store
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Validate that the order has gone through the correct workflow
      // Products must be in_store before marking as delivered
      if (order.productStatus !== 'in_store') {
        console.log(`Order ${id} cannot be delivered - products not in store yet (status: ${order.productStatus})`);
        return res.status(400).json({ 
          error: "Os produtos ainda não estão na loja. Complete a etapa de compra primeiro." 
        });
      }

      // Check all production orders for this order
      const productionOrders = await storage.getProductionOrdersByOrder(id);
      
      // Verify that production orders have been dispatched before delivery
      const hasShippedOrDelivered = productionOrders.every(po => 
        po.status === 'shipped' || po.status === 'delivered'
      );
      
      if (!hasShippedOrDelivered && productionOrders.length > 0) {
        console.log(`Order ${id} cannot be delivered - not all production orders are shipped`);
        return res.status(400).json({ 
          error: "Alguns produtos ainda não foram despachados. Finalize o envio primeiro." 
        });
      }
      
      const allDelivered = productionOrders.every(po => po.status === 'delivered');

      if (allDelivered) {
        // All production orders are delivered, mark main order as delivered
        const updatedOrder = await storage.updateOrderStatus(id, 'delivered');
        if (!updatedOrder) {
          return res.status(404).json({ error: "Pedido não encontrado" });
        }

        console.log(`Order ${id} fully delivered - all producers completed`);

        res.json({
          success: true,
          message: "Entrega completa confirmada com sucesso",
          order: updatedOrder
        });
      } else {
        // Some production orders are still pending, keep as partially shipped
        const updatedOrder = await storage.updateOrderStatus(id, 'partial_shipped');
        if (!updatedOrder) {
          return res.status(404).json({ error: "Pedido não encontrado" });
        }

        console.log(`Order ${id} partially delivered - some producers still pending`);

        res.json({
          success: true,
          message: "Entrega parcial confirmada com sucesso",
          order: updatedOrder
        });
      }

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
      const { id } = req.params;
      const { createdAt, updatedAt, ...productData } = req.body;

      const updatedProduct = await storage.updateProduct(id, productData);
      if (!updatedProduct) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
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
      console.log(`Found ${budgets.length} budgets in database`);

      // Enrich budgets with vendor names and item counts
      const enrichedBudgets = await Promise.all(
        budgets.map(async (budget) => {
          try {
            // Get vendor name
            let vendorName = 'Vendedor não encontrado';
            if (budget.vendorId) {
              const vendor = await storage.getUser(budget.vendorId);
              vendorName = vendor?.name || vendorName;
            }

            // Get client name (prioritize contactName, fallback to client record)
            let clientName = budget.contactName || 'Cliente não informado';
            if (!clientName && budget.clientId) {
              const client = await storage.getClient(budget.clientId);
              if (client) {
                clientName = client.name;
              }
            }

            // Get items count
            const items = await storage.getBudgetItems(budget.id);
            const itemCount = items.length;

            // Get photos count
            const photos = await storage.getBudgetPhotos(budget.id);
            const photoCount = photos.length;

            // Ensure all required fields are present
            return {
              ...budget,
              id: budget.id,
              budgetNumber: budget.budgetNumber || 'N/A',
              title: budget.title || 'Sem título',
              status: budget.status || 'draft',
              totalValue: budget.totalValue || '0.00',
              vendorName,
              clientName,
              itemCount,
              photoCount,
              createdAt: budget.createdAt || new Date(),
              validUntil: budget.validUntil,
              deliveryDeadline: budget.deliveryDeadline
            };
          } catch (budgetError) {
            console.error(`Error enriching budget ${budget.id}:`, budgetError);
            // Return basic budget data if enrichment fails
            return {
              ...budget,
              vendorName: 'Erro ao carregar',
              clientName: budget.contactName || 'Cliente não informado',
              itemCount: 0,
              photoCount: 0
            };
          }
        })
      );

      console.log(`Returning ${enrichedBudgets.length} enriched budgets`);
      res.json(enrichedBudgets);
    } catch (error) {
      console.error("Error fetching all budgets:", error);
      res.status(500).json({ error: "Failed to fetch budgets: " + error.message });
    }
  });

  app.get("/api/budgets/:id", async (req, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      // Include items, photos, payment info, client and vendor data
      const items = await storage.getBudgetItems(req.params.id);
      const photos = await storage.getBudgetPhotos(req.params.id);
      const paymentInfo = await storage.getBudgetPaymentInfo(req.params.id);

      // Get client data if clientId exists
      let clientData = null;
      if (budget.clientId) {
        clientData = await storage.getClient(budget.clientId);
      }

      // Get vendor data if vendorId exists
      let vendorData = null;
      if (budget.vendorId) {
        const user = await storage.getUser(budget.vendorId);
        if (user) {
          vendorData = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone
          };
        }
      }

      res.json({
        ...budget,
        items,
        photos,
        paymentInfo,
        client: clientData,
        vendor: vendorData
      });
    } catch (error) {
      console.error('Error fetching budget:', error);
      res.status(500).json({ error: "Failed to fetch budget" });
    }
  });

  app.put("/api/budgets/:id", async (req, res) => {
    try {
      const budgetData = req.body;
      const budgetId = req.params.id;
      
      console.log(`[UPDATE BUDGET] Processing update for budget ${budgetId}`);
      
      // CRITICAL FIX: Detect if items should be processed using hasOwnProperty
      // - If 'items' key not present → metadata-only update (keep existing items)
      // - If 'items' key present but null/undefined → treat as metadata-only (frontend compat)
      // - If 'items' key present and is [] → explicit removal of all items
      // - If 'items' key present and is [...] → update items list
      const shouldProcessItems = Object.prototype.hasOwnProperty.call(budgetData, 'items') 
        && budgetData.items !== null 
        && budgetData.items !== undefined;
      
      // Remove items from metadata payload to prevent DB column corruption
      const budgetMetadata = { ...budgetData };
      delete budgetMetadata.items;
      
      // FIX: Convert 'matriz' branchId to null (matriz is not a valid FK)
      if (budgetMetadata.branchId === 'matriz') {
        budgetMetadata.branchId = null;
      }
      
      // Update budget metadata
      const updatedBudget = await storage.updateBudget(budgetId, budgetMetadata);

      // Process items only if explicitly provided as an array
      if (shouldProcessItems) {
        if (!Array.isArray(budgetData.items)) {
          console.error(`[UPDATE BUDGET] Invalid items format - must be array`);
          return res.status(400).json({ 
            error: "Items must be an array when provided" 
          });
        }
        
        console.log(`[UPDATE BUDGET] Updating items: ${budgetData.items.length} items provided`);
        
        // CRITICAL FIX: VALIDATE and PREPARE all items BEFORE deleting anything
        // This prevents data loss if any item has invalid data
        const itemsToInsert = [];
        
        if (budgetData.items.length > 0) {
          // Remove duplicate items before processing
          const seenItems = new Set();
          const uniqueItems = budgetData.items.filter(item => {
            const itemKey = `${item.productId}-${item.producerId || 'internal'}-${item.quantity}-${item.unitPrice}`;
            if (seenItems.has(itemKey)) {
              console.log(`[UPDATE BUDGET] Removing duplicate: ${item.productName} (${itemKey})`);
              return false;
            }
            seenItems.add(itemKey);
            return true;
          });

          console.log(`[UPDATE BUDGET] Processing ${uniqueItems.length} unique items (filtered from ${budgetData.items.length})`);

          // STEP 1: Get FULL existing items BEFORE any changes (for rollback safety)
          const existingItems = await storage.getBudgetItems(budgetId);
          const existingItemIds = existingItems.map(item => item.id);
          console.log(`[UPDATE BUDGET] Found ${existingItemIds.length} existing items to replace`);

          // STEP 2: VALIDATE and PREPARE each item (no DB operations yet)
          for (const item of uniqueItems) {
        const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
        const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
        const itemCustomizationValue = typeof item.itemCustomizationValue === 'string' ? parseFloat(item.itemCustomizationValue) : (item.itemCustomizationValue || 0);
        const generalCustomizationValue = typeof item.generalCustomizationValue === 'string' ? parseFloat(item.generalCustomizationValue) : (item.generalCustomizationValue || 0);

        // Calculate total price including customizations and discounts
        let totalPrice = unitPrice * quantity;
        if (item.hasItemCustomization && itemCustomizationValue > 0) {
          totalPrice += (itemCustomizationValue * quantity);
        }
        if (item.hasGeneralCustomization && generalCustomizationValue > 0) {
          totalPrice += (generalCustomizationValue * quantity);
        }

        // Add to preparation array (no DB operation yet)
            itemsToInsert.push({
          productId: item.productId,
          producerId: item.producerId || 'internal',
          quantity: quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
          // Item Customization
          hasItemCustomization: item.hasItemCustomization || false,
          selectedCustomizationId: item.selectedCustomizationId || null,
          itemCustomizationValue: itemCustomizationValue.toFixed(2),
          itemCustomizationDescription: item.itemCustomizationDescription || null,
          customizationPhoto: item.customizationPhoto || null,
          // General Customization
          hasGeneralCustomization: item.hasGeneralCustomization || false,
          generalCustomizationName: item.generalCustomizationName || null,
          generalCustomizationValue: generalCustomizationValue.toFixed(2),
          // Product dimensions
          productWidth: item.productWidth || null,
          productHeight: item.productHeight || null,
          productDepth: item.productDepth || null,
          // Item discount
          hasItemDiscount: item.hasItemDiscount || false,
          itemDiscountType: item.itemDiscountType || "percentage",
            itemDiscountPercentage: item.itemDiscountPercentage ? parseFloat(item.itemDiscountPercentage) : 0,
            itemDiscountValue: item.itemDiscountValue ? parseFloat(item.itemDiscountValue) : 0
            });
          }
          
          // STEP 3: Create ALL new items FIRST (safer than deleting first)
          console.log(`[UPDATE BUDGET] Creating ${itemsToInsert.length} new items FIRST (before deleting old ones)...`);
          const createdItemIds = [];
          
          // Insert all new items - if this fails, old items remain intact
          for (const itemData of itemsToInsert) {
            const newItem = await storage.createBudgetItem(updatedBudget.id, itemData);
            createdItemIds.push(newItem.id);
          }
          console.log(`[UPDATE BUDGET] Successfully created ${createdItemIds.length} new items`);
          
          // STEP 4: Only delete old items after ALL new ones are created successfully
          // NOTE: Without DB transactions, if deletion fails after some deletes, we may have
          // temporary duplicates, but this is better than losing data completely
          console.log(`[UPDATE BUDGET] Deleting ${existingItemIds.length} old items...`);
          let deletedCount = 0;
          for (const oldItemId of existingItemIds) {
            try {
              await storage.deleteBudgetItem(oldItemId);
              deletedCount++;
            } catch (deleteError) {
              console.error(`[UPDATE BUDGET] Error deleting old item ${oldItemId}:`, deleteError);
              // Continue with other deletions even if one fails
            }
          }
          console.log(`[UPDATE BUDGET] Budget items updated - ${createdItemIds.length} new items created, ${deletedCount}/${existingItemIds.length} old items deleted`);
        } else {
          // CRITICAL FIX: If items array is empty, DON'T delete existing items
          // This prevents data loss when frontend accidentally sends empty array
          console.log(`[UPDATE BUDGET] Items array empty - KEEPING existing items (not deleting)`);
          console.warn(`[UPDATE BUDGET] WARNING: Received empty items array for budget ${budgetId}, but keeping existing items to prevent data loss`);
        }
      } else {
        console.log(`[UPDATE BUDGET] Metadata-only update - keeping existing items for budget ${budgetId}`);
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

      console.log(`[UPDATE BUDGET] Successfully updated budget ${req.params.id}`);
      res.json(updatedBudget);
    } catch (error) {
      console.error("[UPDATE BUDGET] Error updating budget:", error);
      res.status(500).json({ error: "Failed to update budget: " + (error.message || error) });
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
      const { clientId, deliveryDate } = req.body;

      if (!clientId) {
        return res.status(400).json({ error: "Cliente é obrigatório para conversão" });
      }

      if (!deliveryDate) {
        return res.status(400).json({ error: "Prazo de entrega é obrigatório para conversão" });
      }

      console.log(`Converting budget ${id} to order with client: ${clientId} and delivery date: ${deliveryDate}`);

      // CRITICAL FIX: Convert deliveryDate string to Date object for Drizzle
      const deliveryDateObj = new Date(deliveryDate);
      
      const order = await storage.convertBudgetToOrder(id, clientId, deliveryDateObj);

      // Update budget status
      await storage.updateBudget(id, { status: 'converted' });

      // Get production orders with items for the response
      const productionOrders = await storage.getProductionOrdersByOrder(order.id);
      const productionOrdersWithItems = await storage.getProductionOrdersWithItems(productionOrders.map(po => po.id));

      console.log(`Budget ${id} converted to order: ${order.id} with ${productionOrdersWithItems.length} production orders`);
      res.json({
        order,
        productionOrders: productionOrdersWithItems
      });
    } catch (error) {
      console.error("Error converting budget to order:", error);
      res.status(500).json({ error: error.message });
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
          const product =await storage.getProduct(item.productId);
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

      // Get branch info if budget has a branchId
      let branchInfo = null;
      if (budget.branchId) {
        const branch = await storage.getBranch(budget.branchId);
        if (branch) {
          branchInfo = {
            id: branch.id,
            name: branch.name,
            city: branch.city,
            cnpj: branch.cnpj || null,
            address: branch.address || null,
            isHeadquarters: branch.isHeadquarters || false
          };
        }
      }

      const pdfData = {
        budget: {
          id: budget.id,
          budgetNumber: budget.budgetNumber,
          title: budget.title,
          description: budget.description,
          clientId: budget.clientId,
          vendorId: budget.vendorId,
          branchId: budget.branchId,
          totalValue: totalBudget.toFixed(2),
          validUntil: budget.validUntil,
          hasCustomization: budget.hasCustomization,
          customizationPercentage: budget.customizationPercentage,
          customizationDescription: budget.customizationDescription,
          hasDiscount: budget.hasDiscount,
          discountType: budget.discountType,
          discountPercentage: budget.discountPercentage,
          discountValue: budget.discountValue,
          createdAt: budget.createdAt,
          photos: photoUrls,
          paymentMethodId: paymentInfo?.paymentMethodId || null,
          shippingMethodId: paymentInfo?.shippingMethodId || null,
          installments: paymentInfo?.installments || 1,
          downPayment: paymentInfo?.downPayment || "0.00",
          remainingAmount: paymentInfo?.remainingAmount || "0.00",
          shippingCost: paymentInfo?.shippingCost || "0.00"
        },
        branch: branchInfo,
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
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  app.post("/api/settings/payment-methods", async (req, res) => {
    try {
      const paymentMethod = await storage.createPaymentMethod(req.body);
      res.json(paymentMethod);
    } catch (error) {
      console.error("Error creating payment method:", error);
      res.status(500).json({ error: "Failed to create payment method" });
    }
  });

  app.put("/api/settings/payment-methods/:id", async (req, res) => {
    try {
      const paymentMethod = await storage.updatePaymentMethod(req.params.id, req.body);
      if (!paymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json(paymentMethod);
    } catch (error) {
      console.error("Error updating payment method:", error);
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
      console.error("Error deleting payment method:", error);
      res.status(500).json({ error: "Failed to delete payment method" });
    }
  });

  // Settings Routes - Shipping Methods
  app.get("/api/settings/shipping-methods", async (req, res) => {
    try {
      const shippingMethods = await storage.getAllShippingMethods();
      res.json(shippingMethods);
    } catch (error) {
      console.error("Error fetching shipping methods:", error);
      res.status(500).json({ error: "Failed to fetch shipping methods" });
    }
  });

  app.post("/api/settings/shipping-methods", async (req, res) => {
    try {
      const shippingMethod = await storage.createShippingMethod(req.body);
      res.json(shippingMethod);
    } catch (error) {
      console.error("Error creating shipping method:", error);
      res.status(500).json({ error: "Failed to create shipping method" });
    }
  });

  app.put("/api/settings/shipping-methods/:id", async (req, res) => {
    try {
      const shippingMethod = await storage.updateShippingMethod(req.params.id, req.body);
      if (!shippingMethod) {
        return res.status(404).json({ error: "Shipping method not found" });
      }
      res.json(shippingMethod);
    } catch (error) {
      console.error("Error updating shipping method:", error);
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
      console.error("Error deleting shipping method:", error);
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

  // Get customization options filtered by category and quantity
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
            producerName: producer?.name || 'Produtor não encontrado',
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
        message: "Pagamento do produtor registrado com sucesso"
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

  // Get dropshipping orders - all paid orders in the dropshipping workflow
  app.get("/api/logistics/dropshipping-orders", async (req, res) => {
    try {
      console.log("Fetching dropshipping orders for logistics...");

      const orders = await storage.getOrders();
      const productionOrders = await storage.getProductionOrders();

      // Group production orders by order ID
      const productionOrdersByOrder = new Map<string, any[]>();
      for (const po of productionOrders) {
        if (!productionOrdersByOrder.has(po.orderId)) {
          productionOrdersByOrder.set(po.orderId, []);
        }
        productionOrdersByOrder.get(po.orderId)!.push(po);
      }

      // Filter orders that are paid and have external producers (dropshipping candidates)
      const dropshippingOrders = orders.filter(order => {
        // Order must be cancelled to be excluded
        if (order.status === 'cancelled') return false;
        
        // Check payment status - order must have received some payment
        const paidValue = parseFloat(order.paidValue || '0');
        const isPaid = paidValue > 0;
        
        if (!isPaid) return false;

        // Check if order has items with external producers
        let hasExternalProducers = false;
        if (order.items) {
          for (const item of order.items) {
            if (item.producerId && item.producerId !== 'internal') {
              hasExternalProducers = true;
              break;
            }
          }
        }

        // Order must have external producers
        if (!hasExternalProducers) return false;

        // Check if already fully sent to production
        let uniqueProducers = new Set<string>();
        for (const item of (order.items || [])) {
          if (item.producerId && item.producerId !== 'internal') {
            uniqueProducers.add(item.producerId);
          }
        }
        
        const existingPOs = productionOrdersByOrder.get(order.id) || [];
        const sentPOs = existingPOs.filter(po => po.status !== 'pending');
        const producersWithSentPOs = new Set(sentPOs.map(po => po.producerId));
        
        // Exclude if ALL producers have been sent POs already
        const allProducersHaveSentPOs = uniqueProducers.size > 0 && uniqueProducers.size === producersWithSentPOs.size;
        
        return !allProducersHaveSentPOs;
      });

      console.log(`Found ${dropshippingOrders.length} dropshipping orders`);
      
      // Enrich orders with producer names and client data
      const enrichedOrders = await Promise.all(
        dropshippingOrders.map(async (order) => {
          // Enrich items with producer names
          const enrichedItems = await Promise.all(
            (order.items || []).map(async (item: any) => {
              if (item.producerId && item.producerId !== 'internal') {
                const producer = await storage.getUser(item.producerId);
                return {
                  ...item,
                  producerName: producer?.name || null
                };
              }
              return item;
            })
          );
          
          // Get client data
          let clientName = order.contactName;
          let clientPhone = order.contactPhone;
          let clientEmail = order.contactEmail;
          
          if (order.clientId) {
            let clientRecord = await storage.getClient(order.clientId);
            if (!clientRecord) {
              clientRecord = await storage.getClientByUserId(order.clientId);
            }
            if (clientRecord) {
              if (!clientName) clientName = clientRecord.name;
              if (!clientPhone) clientPhone = clientRecord.telefone;
              if (!clientEmail) clientEmail = clientRecord.email;
            }
          }
          
          return {
            ...order,
            items: enrichedItems,
            clientName: clientName,
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            productStatus: order.productStatus || 'to_buy'
          };
        })
      );

      // Sort by product status priority: to_buy first, then purchased, then in_store
      const statusPriority: Record<string, number> = {
        'to_buy': 1,
        'purchased': 2,
        'in_store': 3
      };
      
      enrichedOrders.sort((a, b) => {
        const priorityA = statusPriority[a.productStatus] || 1;
        const priorityB = statusPriority[b.productStatus] || 1;
        return priorityA - priorityB;
      });

      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching dropshipping orders:", error);
      res.status(500).json({ error: "Failed to fetch dropshipping orders" });
    }
  });

  // Get individual items for dropshipping (product-level tracking)
  app.get("/api/logistics/dropshipping-items", async (req, res) => {
    try {
      console.log("Fetching dropshipping items for logistics...");
      const { status } = req.query;

      const orders = await storage.getOrders();
      const allItems: any[] = [];

      for (const order of orders) {
        if (order.status === 'cancelled') continue;
        const paidValue = parseFloat(order.paidValue || '0');
        if (paidValue <= 0) continue;
        if (!order.budgetId) continue;
        if (order.productStatus === 'in_store') continue;
        
        const budgetItems = await storage.getBudgetItems(order.budgetId);
        let clientName = order.contactName;
        let clientPhone = order.contactPhone;
        
        if (order.clientId) {
          let clientRecord = await storage.getClient(order.clientId);
          if (!clientRecord) clientRecord = await storage.getClientByUserId(order.clientId);
          if (clientRecord) {
            if (!clientName) clientName = clientRecord.name;
            if (!clientPhone) clientPhone = clientRecord.telefone || clientRecord.phone;
          }
        }

        for (const item of budgetItems) {
          if (!item.producerId || item.producerId === 'internal') continue;
          
          const producer = await storage.getUser(item.producerId);
          const product = await storage.getProduct(item.productId);
          
          const purchaseStatus = item.purchaseStatus || 'to_buy';
          
          // Map purchaseStatus to filter status based on button logic:
          // if status is 'to_buy', it shows button for 'purchased'
          // if status is 'purchased', it shows button for 'in_store'
          // if status is 'in_store', it shows no button (already in store)
          
          // The user says: "if the button is 'Na loja', filter those. if the button is 'Comprado', filter those. if the button is 'Para comprar', filter those."
          // Based on the code:
          // Item status 'to_buy' -> Button is 'Comprado' (yellow)
          // Item status 'purchased' -> Button is 'Na loja' (green)
          // Item status 'pending' -> Button is 'Para comprar' (red)
          
          let buttonStatus = '';
          if (purchaseStatus === 'pending') buttonStatus = 'to_buy';
          else if (purchaseStatus === 'to_buy') buttonStatus = 'purchased';
          else if (purchaseStatus === 'purchased') buttonStatus = 'in_store';
          
          if (status && status !== 'all' && buttonStatus !== status) continue;

          allItems.push({
            itemId: item.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            budgetId: order.budgetId,
            clientName: clientName,
            clientPhone: clientPhone,
            productId: item.productId,
            productName: item.productName || product?.name || 'Produto',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            producerId: item.producerId,
            producerName: producer?.name || 'Produtor',
            productCode: product?.friendlyCode || product?.externalCode || product?.compositeCode || product?.code || item.productCode || null,
            purchaseStatus: purchaseStatus,
            deliveryDeadline: order.deliveryDeadline || order.deadline,
            orderCreatedAt: order.createdAt,
            orderStatus: order.status,
            hasCustomization: item.hasItemCustomization || false,
            customizationDescription: item.itemCustomizationDescription,
            notes: item.notes,
            productWidth: item.productWidth,
            productHeight: item.productHeight,
            productDepth: item.productDepth
          });
        }
      }

      // Sort by purchase status priority: to_buy first, then purchased, then in_store
      const statusPriority: Record<string, number> = { 
        'to_buy': 1, 
        'purchased': 2, 
        'in_store': 3,
        'pending': 1 // Fallback pending to same as to_buy
      };
      allItems.sort((a, b) => {
        const priorityA = statusPriority[a.purchaseStatus] || 1;
        const priorityB = statusPriority[b.purchaseStatus] || 1;
        if (priorityA !== priorityB) return priorityA - priorityB;
        if (a.deliveryDeadline && b.deliveryDeadline) return new Date(a.deliveryDeadline).getTime() - new Date(b.deliveryDeadline).getTime();
        return 0;
      });

      console.log(`Found ${allItems.length} dropshipping items`);
      res.json(allItems);
    } catch (error) {
      console.error("Error fetching dropshipping items:", error);
      res.status(500).json({ error: "Failed to fetch dropshipping items" });
    }
  });

  // Update individual item purchase status
  app.patch("/api/budget-items/:itemId/purchase-status", async (req, res) => {
    try {
      const { itemId } = req.params;
      const { purchaseStatus } = req.body;
      
      if (!['pending', 'to_buy', 'purchased', 'in_store'].includes(purchaseStatus)) {
        return res.status(400).json({ error: "Status inválido. Use: pending, to_buy, purchased, in_store" });
      }
      
      const updatedItem = await storage.updateBudgetItemPurchaseStatus(itemId, purchaseStatus);
      
      if (!updatedItem) {
        return res.status(404).json({ error: "Item não encontrado" });
      }
      
      // Get the budget to find the order
      const budgets = await storage.getBudgets();
      const budget = budgets.find(b => b.id === updatedItem.budgetId);
      
      let allItemsReady = false;
      let orderNumber = '';
      
      if (budget) {
        // Find the order for this budget
        const orders = await storage.getOrders();
        const order = orders.find(o => o.budgetId === budget.id);
        
        if (order) {
          orderNumber = order.orderNumber || '';
          
          // Check if all items are now in_store
          const allInStore = await storage.checkAllItemsInStore(order.id);
          
          if (allInStore && order.productStatus !== 'in_store') {
            // Update order productStatus to 'in_store' when all items are in store
            // This makes the order appear in the production queue (Dashboard)
            await storage.updateOrder(order.id, { productStatus: 'in_store' });
            allItemsReady = true;
            console.log(`Order ${order.orderNumber} automatically moved to 'in_store' - all items ready for production queue`);
          }
        }
      }
      
      res.json({ 
        success: true, 
        message: `Status do item atualizado para ${purchaseStatus}`,
        item: updatedItem,
        allItemsReady,
        orderNumber
      });
    } catch (error) {
      console.error("Error updating item purchase status:", error);
      res.status(500).json({ error: "Erro ao atualizar status do item" });
    }
  });

  // Bulk update items to 'to_buy' when order receives first payment
  app.post("/api/orders/:orderId/initialize-item-status", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }
      
      if (!order.budgetId) {
        return res.status(400).json({ error: "Pedido não tem orçamento associado" });
      }
      
      const items = await storage.getBudgetItems(order.budgetId);
      let updatedCount = 0;
      
      for (const item of items) {
        // Only update items with external producers that are still pending
        if (item.producerId && item.producerId !== 'internal' && (!item.purchaseStatus || item.purchaseStatus === 'pending')) {
          await storage.updateBudgetItemPurchaseStatus(item.id, 'to_buy');
          updatedCount++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `${updatedCount} itens atualizados para 'to_buy'`,
        updatedCount 
      });
    } catch (error) {
      console.error("Error initializing item status:", error);
      res.status(500).json({ error: "Erro ao inicializar status dos itens" });
    }
  });

  // Get paid orders for logistics (orders that are paid but not yet sent to production)
  app.get("/api/logistics/paid-orders", async (req, res) => {
    try {
      console.log("Fetching paid orders for logistics...");

      const orders = await storage.getOrders();
      const productionOrders = await storage.getProductionOrders();

      // Group production orders by order ID
      const productionOrdersByOrder = new Map<string, any[]>();
      for (const po of productionOrders) {
        if (!productionOrdersByOrder.has(po.orderId)) {
          productionOrdersByOrder.set(po.orderId, []);
        }
        productionOrdersByOrder.get(po.orderId)!.push(po);
      }

      // Filter orders that are paid but not yet fully sent to production
      // ONLY show orders with productStatus = 'in_store' (ready for production)
      const paidOrders = orders.filter(order => {
        // Check payment status - order must have received some payment
        const totalValue = parseFloat(order.totalValue || '0');
        const paidValue = parseFloat(order.paidValue || '0');
        const isPaid = paidValue > 0; // Any payment received
        
        // For dropshipping workflow: only show orders with product in store
        const productStatus = order.productStatus || 'to_buy';
        const isProductInStore = productStatus === 'in_store';

        // Check if order has items with external producers
        let hasExternalProducers = false;
        let uniqueProducers = new Set<string>();
        
        if (order.budgetId) {
          // For budget-based orders, check budget items
          const budgetItems = order.items || [];
          for (const item of budgetItems) {
            if (item.producerId && item.producerId !== 'internal') {
              hasExternalProducers = true;
              uniqueProducers.add(item.producerId);
            }
          }
        } else if (order.items) {
          // For direct orders, check order items
          for (const item of order.items) {
            if (item.producerId && item.producerId !== 'internal') {
              hasExternalProducers = true;
              uniqueProducers.add(item.producerId);
            }
          }
        }

        // Count how many unique producers already have production orders that were SENT (not pending)
        const existingPOs = productionOrdersByOrder.get(order.id) || [];
        const sentPOs = existingPOs.filter(po => po.status !== 'pending');
        const producersWithSentPOs = new Set(sentPOs.map(po => po.producerId));
        
        // Order is valid if it's paid, has external producers, NOT ALL producers have been sent POs yet, AND product is in store
        const notAllProducersHaveSentPOs = uniqueProducers.size > producersWithSentPOs.size;
        const isValid = isPaid && hasExternalProducers && notAllProducersHaveSentPOs && isProductInStore;

        if (isValid) {
          console.log(`Valid paid order: ${order.orderNumber} - Paid: R$ ${paidValue} / Total: R$ ${totalValue} - Producers: ${uniqueProducers.size} total, ${producersWithSentPOs.size} sent`);
        }

        return isValid;
      });

      console.log(`Found ${paidOrders.length} paid orders ready for production`);
      
      // Enrich orders with producer names and client data
      const enrichedOrders = await Promise.all(
        paidOrders.map(async (order) => {
          // Enrich items with producer names
          const enrichedItems = await Promise.all(
            (order.items || []).map(async (item: any) => {
              if (item.producerId && item.producerId !== 'internal') {
                const producer = await storage.getUser(item.producerId);
                return {
                  ...item,
                  producerName: producer?.name || null
                };
              }
              return item;
            })
          );
          
          // Get client data for logistics display
          let clientName = order.contactName;
          let clientAddress = null;
          let clientPhone = order.contactPhone;
          let clientEmail = order.contactEmail;
          
          // Always try to get client address for logistics
          if (order.clientId) {
            // Try to get client by ID first (direct client table lookup)
            let clientRecord = await storage.getClient(order.clientId);
            
            // If not found, try by userId
            if (!clientRecord) {
              clientRecord = await storage.getClientByUserId(order.clientId);
            }
            
            if (clientRecord) {
              // Use client name if contactName not available
              if (!clientName) {
                clientName = clientRecord.name;
              }
              // Always get delivery address from client record
              clientAddress = clientRecord.enderecoEntregaLogradouro 
                ? `${clientRecord.enderecoEntregaLogradouro}, ${clientRecord.enderecoEntregaNumero || 's/n'}${clientRecord.enderecoEntregaComplemento ? ` - ${clientRecord.enderecoEntregaComplemento}` : ''}, ${clientRecord.enderecoEntregaBairro || ''}, ${clientRecord.enderecoEntregaCidade || ''}, CEP: ${clientRecord.enderecoEntregaCep || ''}`
                : clientRecord.address;
              clientPhone = clientPhone || clientRecord.phone;
              clientEmail = clientEmail || clientRecord.email;
            } else {
              // Fallback to user record
              const clientUser = await storage.getUser(order.clientId);
              if (clientUser) {
                if (!clientName) {
                  clientName = clientUser.name;
                }
                clientPhone = clientPhone || clientUser.phone;
                clientEmail = clientEmail || clientUser.email;
                clientAddress = clientUser.address;
              }
            }
          }
          
          if (!clientName) {
            clientName = "Nome não informado";
          }
          
          // Priorizar endereço salvo no pedido, depois endereço do cliente
          const finalShippingAddress = order.deliveryType === 'pickup'
            ? 'Sede Principal - Retirada no Local'
            : (order.shippingAddress || clientAddress || 'Endereço não informado');
          
          return {
            ...order,
            items: enrichedItems,
            clientName: clientName,
            clientAddress: finalShippingAddress,
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            shippingAddress: finalShippingAddress,
            deliveryType: order.deliveryType || 'delivery'
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching paid orders for logistics:", error);
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

          // Use contactName as primary client name
          let clientName = order?.contactName;
          let clientAddress = null;
          let clientPhone = order?.contactPhone;
          let clientEmail = order?.contactEmail;

          // Always try to get client address for logistics, even if we have contactName
          if (order?.clientId) {
            // Try to get client by ID first (direct client table lookup)
            let clientRecord = await storage.getClient(order.clientId);
            
            // If not found, try by userId
            if (!clientRecord) {
              clientRecord = await storage.getClientByUserId(order.clientId);
            }
            
            if (clientRecord) {
              // Use client name if contactName not available
              if (!clientName) {
                clientName = clientRecord.name;
              }
              // Always get delivery address from client record
              clientAddress = clientRecord.enderecoEntregaLogradouro 
                ? `${clientRecord.enderecoEntregaLogradouro}, ${clientRecord.enderecoEntregaNumero || 's/n'}${clientRecord.enderecoEntregaComplemento ? ` - ${clientRecord.enderecoEntregaComplemento}` : ''}, ${clientRecord.enderecoEntregaBairro || ''}, ${clientRecord.enderecoEntregaCidade || ''}, CEP: ${clientRecord.enderecoEntregaCep || ''}`
                : clientRecord.address;
              clientPhone = clientPhone || clientRecord.phone;
              clientEmail = clientEmail || clientRecord.email;
            } else {
              // Fallback to user record
              const clientUser = await storage.getUser(order.clientId);
              if (clientUser) {
                if (!clientName) {
                  clientName = clientUser.name;
                }
                clientPhone = clientPhone || clientUser.phone;
                clientEmail = clientEmail || clientUser.email;
                clientAddress = clientUser.address;
              }
            }
          }

          // If still no name, use a descriptive message
          if (!clientName) {
            clientName = "Nome não informado";
          }

          // IMPORTANTE: Priorizar endereço salvo no pedido (definido na conversão do orçamento)
          // Se não existir, usar endereço do cliente como fallback
          const savedShippingAddress = (order as any)?.shippingAddress;
          const finalShippingAddress = order?.deliveryType === 'pickup'
            ? 'Sede Principal - Retirada no Local'
            : (savedShippingAddress || clientAddress || 'Endereço não informado');

          return {
            ...po,
            orderNumber: order?.orderNumber || `PO-${po.id}`,
            product: order?.product || 'Produto não informado',
            clientName: clientName,
            clientAddress: finalShippingAddress,
            shippingAddress: finalShippingAddress,
            deliveryType: order?.deliveryType || 'delivery',
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            producerName: producer?.name || null,
            order: order ? {
              ...order,
              clientName: clientName,
              clientAddress: finalShippingAddress,
              shippingAddress: finalShippingAddress,
              clientPhone: clientPhone,
              clientEmail: clientEmail,
              deliveryType: order.deliveryType || 'delivery'
            } : null
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

          // Get client details - always try to get delivery address
          if (order.clientId) {
            // Try to get client by ID first (direct client table lookup)
            let clientRecord = await storage.getClient(order.clientId);
            
            // If not found, try by userId
            if (!clientRecord) {
              clientRecord = await storage.getClientByUserId(order.clientId);
            }
            
            if (clientRecord) {
              // Use client name if contactName not available
              if (!clientName || clientName === 'Cliente não identificado') {
                clientName = clientRecord.name;
              }
              // Always get delivery address from client record
              clientAddress = clientRecord.enderecoEntregaLogradouro 
                ? `${clientRecord.enderecoEntregaLogradouro}, ${clientRecord.enderecoEntregaNumero || 's/n'}${clientRecord.enderecoEntregaComplemento ? ` - ${clientRecord.enderecoEntregaComplemento}` : ''}, ${clientRecord.enderecoEntregaBairro || ''}, ${clientRecord.enderecoEntregaCidade || ''}, CEP: ${clientRecord.enderecoEntregaCep || ''}`
                : clientRecord.address;
              clientPhone = clientPhone || clientRecord.phone;
              clientEmail = clientEmail || clientRecord.email;
            } else {
              // Fallback to user record
              const clientUser = await storage.getUser(order.clientId);
              if (clientUser) {
                if (!clientName || clientName === 'Cliente não identificado') {
                  clientName = clientUser.name;
                }
                clientPhone = clientPhone || clientUser.phone;
                clientEmail = clientEmail || clientUser.email;
                clientAddress = clientUser.address;
              }
            }
          }

          const vendor = await storage.getUser(order.vendorId);
          const producer = order.producerId ? await storage.getUser(order.producerId) : null;
          
          // Priorizar endereço salvo no pedido, depois endereço do cliente
          const finalShippingAddress = order.deliveryType === 'pickup'
            ? 'Sede Principal - Retirada no Local'
            : (order.shippingAddress || clientAddress || 'Endereço não informado');

          return {
            ...order,
            clientName,
            clientAddress: finalShippingAddress,
            clientPhone,
            clientEmail,
            vendorName: vendor?.name || 'Vendedor',
            producerName: producer?.name || null,
            shippingAddress: finalShippingAddress,
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

  // Budget approval endpoint (for clients)
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
            id: budget.id,
            budgetNumber: budget.budgetNumber || 'N/A',
            title: budget.title || 'Sem título',
            status: budget.status || 'draft',
            totalValue: budget.totalValue || '0.00',
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

  // System logs
  app.get("/api/admin/logs", async (req, res) => {
    try {
      const logs = await storage.getSystemLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching system logs:", error);
      res.status(500).json({ error: "Failed to fetch system logs" });
    }
  });

  // Vendor logs - filtered for vendor and their clients
  app.get("/api/vendor/logs", async (req, res) => {
    try {
      const { vendorId, search, action, level, date } = req.query as {
        vendorId?: string;
        search?: string;
        action?: string;
        level?: string;
        date?: string;
      };

      if (!vendorId) {
        return res.status(400).json({ error: "Vendor ID is required" });
      }

      const allLogs = await storage.getSystemLogs();
      const vendorClients = await storage.getClientsByVendor(vendorId as string);
      const vendorClientIds = vendorClients.map(c => c.userId || c.id);

      // Filter logs for vendor and their clients
      let filteredLogs = allLogs.filter((log: any) => {
        // Logs do próprio vendedor
        if (log.userId === vendorId) return true;

        // Logs dos clientes do vendedor
        if (vendorClientIds.includes(log.userId)) return true;

        // Logs de entidades relacionadas ao vendedor (pedidos, orçamentos, etc)
        if (log.details) {
          try {
            const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
            if (details.vendorId === vendorId) return true;
            if (details.vendor === vendorId) return true;
          } catch (e) {
            // Ignore parse errors
          }
        }

        return false;
      });

      // Apply additional filters
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredLogs = filteredLogs.filter((log: any) =>
          log.action.toLowerCase().includes(searchTerm) ||
          log.description.toLowerCase().includes(searchTerm) ||
          log.userName.toLowerCase().includes(searchTerm)
        );
      }

      if (action && action !== 'all') {
        filteredLogs = filteredLogs.filter((log: any) => log.action === action);
      }

      if (level && level !== 'all') {
        filteredLogs = filteredLogs.filter((log: any) => log.level === level);
      }

      if (date && date !== 'all') {
        const now = new Date();
        let startDate;

        switch (date) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }

        if (startDate) {
          filteredLogs = filteredLogs.filter((log: any) =>
            new Date(log.createdAt) >= startDate
          );
        }
      }

      // Sort by most recent first
      filteredLogs.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(`Found ${filteredLogs.length} logs for vendor ${vendorId}`);
      res.json(filteredLogs);
    } catch (error) {
      console.error("Error fetching vendor logs:", error);
      res.status(500).json({ error: "Failed to fetch vendor logs" });
    }
  });

  app.post("/api/admin/logs", async (req, res) => {
    try {
      const logData = req.body;

      const log = await storage.createSystemLog({
        ...logData,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
      });

      res.json(log);
    } catch (error) {
      console.error("Error creating system log:", error);
      res.status(500).json({ error: "Failed to create system log" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}