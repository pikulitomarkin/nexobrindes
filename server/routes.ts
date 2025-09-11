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

      const receivables = orders
        .filter(order => order.status !== 'cancelled')
        .reduce((total, order) => total + (parseFloat(order.totalValue) - parseFloat(order.paidValue || '0')), 0);

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
      const categories = [...new Set(result.products
        .map((product: any) => product.category)
        .filter(Boolean)
      )].sort();

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
          itemCustomizationDescription: item.itemCustomizationDescription || ""
        });
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
        const customizationPercentage = typeof item.itemCustomizationPercentage === 'string' ? parseFloat(item.itemCustomizationPercentage) : item.itemCustomizationPercentage || 0;

        // Calculate correct total with item customization
        const baseTotal = unitPrice * quantity;
        let itemTotal = baseTotal;

        if (item.hasItemCustomization && customizationPercentage > 0) {
          const customizationAmount = baseTotal * (customizationPercentage / 100);
          itemTotal = baseTotal + customizationAmount;
        }

        await storage.createBudgetItem(updatedBudget.id, {
          productId: item.productId,
          quantity: quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: itemTotal.toFixed(2),
          hasItemCustomization: item.hasItemCustomization || false,
          itemCustomizationPercentage: customizationPercentage.toFixed(2),
          itemCustomizationDescription: item.itemCustomizationDescription || ""
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
      const order = await storage.convertBudgetToOrder(req.params.id);
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to convert budget to order" });
    }
  });

  app.post("/api/budgets/:id/send-whatsapp", async (req, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ error: "Orçamento não encontrado" });
      }

      // Get client data
      const client = await storage.getUser(budget.clientId);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }

      // Update budget status to 'sent'
      await storage.updateBudget(req.params.id, { status: 'sent' });

      // Generate WhatsApp message
      const message = `Olá ${client.name}! 👋

Segue seu orçamento:

📋 *${budget.title}*
💰 Valor: R$ ${parseFloat(budget.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
📅 Válido até: ${budget.validUntil ? new Date(budget.validUntil).toLocaleDateString('pt-BR') : 'Não especificado'}

${budget.description ? `📝 ${budget.description}` : ''}

Para mais detalhes, entre em contato conosco!`;

      // Create WhatsApp URL
      const encodedMessage = encodeURIComponent(message);
      const phoneNumber = client.phone?.replace(/\D/g, '') || ''; // Remove non-digits
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
            itemCustomizationValue: customizationValue.toFixed(2),
            itemCustomizationDescription: item.itemCustomizationDescription || '',
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
          createdAt: budget.createdAt
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
        }
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

  // Routes by role
  app.get("/api/budgets/vendor/:vendorId", async (req, res) => {
    try {
      const budgets = await storage.getBudgetsByVendor(req.params.vendorId);
      
      // Enrich with client names and items
      const enrichedBudgets = await Promise.all(
        budgets.map(async (budget) => {
          const client = await storage.getUser(budget.clientId);
          const items = await storage.getBudgetItems(budget.id);
          const photos = await storage.getBudgetPhotos(budget.id);
          
          return {
            ...budget,
            clientName: client?.name || 'Unknown',
            items: items,
            photos: photos
          };
        })
      );
      
      res.json(enrichedBudgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor budgets" });
    }
  });

  app.get("/api/vendor/:vendorId/budgets", async (req, res) => {
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

  app.get("/api/vendors/:id/orders", async (req, res) => {
    try {
      const vendorId = req.params.id;
      const orders = await storage.getOrdersByVendor(vendorId);
      
      // Enrich with client and vendor names
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
      console.log(error);
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
      const clients = await storage.getClientsByVendor(vendorId);
      res.json(clients);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to fetch vendor clients" });
    }
  });

  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.log(error);
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
      const newClient = await storage.createClient(req.body);
      res.json(newClient);
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
      
      // Update order status to production
      const updatedOrder = await storage.updateOrder(orderId, { 
        status: 'production',
        productionStartedAt: new Date().toISOString()
      });
      
      if (!updatedOrder) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }
      
      // Get enriched order data
      const client = await storage.getUser(updatedOrder.clientId);
      const vendor = await storage.getUser(updatedOrder.vendorId);
      const producer = updatedOrder.producerId ? await storage.getUser(updatedOrder.producerId) : null;
      
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

  const httpServer = createServer(app);
  return httpServer;
}