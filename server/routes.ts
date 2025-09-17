import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import express from 'express';
import path from 'path';
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from public/uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

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

          return {
            ...order,
            clientName: client?.name || 'Unknown',
            vendorName: vendor?.name || 'Unknown',
            producerName: producer?.name || null,
            budgetPhotos: budgetPhotos
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
          const clientUser = order ? await storage.getUser(order.clientId) : null;
          const clientDetails = order ? await storage.getClient(order.clientId) : null;
          return {
            ...po,
            product: order?.product || 'Unknown',
            orderNumber: order?.orderNumber || 'Unknown',
            clientName: clientUser?.name || 'Unknown',
            clientAddress: clientDetails?.address || null,
            clientPhone: clientDetails?.phone || clientUser?.phone || null
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch production orders" });
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
      const { name, email, phone, specialty, address, password } = req.body;

      // Create user with role producer including specialty and address
      const user = await storage.createUser({
        username: email,
        password: password || "123456",
        role: "producer",
        name,
        email,
        phone,
        specialty,
        address
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

      // Enrich with client and vendor names and budget photos
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

          return {
            ...order,
            clientName: client?.name || 'Unknown',
            vendorName: vendor?.name || 'Unknown',
            producerName: producer?.name || null,
            budgetPhotos: budgetPhotos
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

      // Enrich clients with order counts and total spent
      const enrichedClients = await Promise.all(
        clients.map(async (client) => {
          if (!client.userId) return { ...client, ordersCount: 0, totalSpent: 0 };
          const orders = await storage.getOrdersByClient(client.userId);
          const vendorOrders = orders.filter(order => order.vendorId === vendorId);

          const ordersCount = vendorOrders.length;
          const totalSpent = vendorOrders.reduce((sum, order) =>
            sum + parseFloat(order.totalValue || '0'), 0
          );

          return {
            ...client,
            ordersCount,
            totalSpent
          };
        })
      );

      res.json(enrichedClients);
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

  app.patch("/api/production-orders/:id/status", async (req, res) => {
    try {
      const { status, notes, deliveryDate } = req.body;

      const updatedPO = await storage.updateProductionOrderStatus(req.params.id, status, notes, deliveryDate);
      if (!updatedPO) {
        return res.status(404).json({ error: "Production order not found" });
      }

      res.json(updatedPO);
    } catch (error) {
      res.status(500).json({ error: "Failed to update production order status" });
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

      // Get client info
      const clientUser = await storage.getUser(order.clientId);
      const clientDetails = await storage.getClient(order.clientId);
      
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
          clientName: clientUser?.name || 'Cliente não encontrado',
          clientAddress: clientDetails?.address || null,
          clientPhone: clientDetails?.phone || clientUser?.phone || null,
          clientEmail: clientDetails?.email || clientUser?.email || null
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

      // Get production order if exists
      let productionOrder = null;
      if (order.producerId) {
        const productionOrders = await storage.getProductionOrdersByOrder(order.id);
        productionOrder = productionOrders[0] || null;
      }

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
          date: order.status !== 'pending' ? order.updatedAt : null,
          completed: order.status !== 'pending',
          icon: 'check-circle'
        },
        {
          id: 'production',
          status: 'production',
          title: 'Em Produção',
          description: productionOrder?.notes || 'Pedido em processo de produção',
          date: productionOrder?.acceptedAt || null,
          completed: productionOrder && ['accepted', 'production', 'quality_check', 'ready', 'shipped', 'completed'].includes(productionOrder.status),
          icon: 'settings'
        },
        {
          id: 'ready',
          status: 'ready',
          title: 'Pronto para Envio',
          description: 'Produto finalizado e pronto para envio',
          date: productionOrder?.status === 'ready' || productionOrder?.status === 'completed' ? productionOrder?.completedAt : null,
          completed: productionOrder && ['ready', 'shipped', 'completed'].includes(productionOrder.status),
          icon: 'package'
        },
        {
          id: 'shipped',
          status: 'shipped',
          title: 'Enviado',
          description: 'Produto foi enviado para o cliente',
          date: productionOrder?.status === 'shipped' ? productionOrder?.updatedAt : null,
          completed: productionOrder && ['shipped', 'completed'].includes(productionOrder.status),
          icon: 'truck'
        },
        {
          id: 'completed',
          status: 'completed',
          title: 'Entregue',
          description: 'Pedido foi entregue com sucesso',
          date: productionOrder?.status === 'completed' ? productionOrder?.completedAt : null,
          completed: productionOrder?.status === 'completed',
          icon: 'check-circle-2'
        }
      ];

      res.json({
        order: {
          ...order,
          productionOrder
        },
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

  const httpServer = createServer(app);
  return httpServer;
}