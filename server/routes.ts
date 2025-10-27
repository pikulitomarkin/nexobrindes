import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export function registerRoutes(app: Express): Server {
  app.post("/api/receivables/:id/payment", async (req: Request, res: Response) => {
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

      // If orderId exists, it's a payment for an order
      if (receivable.orderId) {
        console.log(`Processing receivables payment: ${JSON.stringify({ id, amount, method, transactionId })}`);

        // Create payment record for the order with special flag to prevent automatic order update
        const payment = await storage.createPayment({
          orderId: receivable.orderId,
          amount: amount,
          method: method || 'manual',
          status: 'confirmed',
          transactionId: transactionId || `MANUAL-${Date.now()}`,
          paidAt: new Date(),
          reconciliationStatus: 'manual',
          bankTransactionId: null,
          notes: notes || '',
          __skipOrderUpdate: true // Flag to prevent automatic order update
        } as any);

        console.log(`Payment processed successfully:`, payment);

        // Get all payments for this order to calculate correct total
        const allPayments = await storage.getPaymentsByOrder(receivable.orderId);
        const confirmedPayments = allPayments.filter(p => p.status === 'confirmed');
        const totalPaid = confirmedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        // Update order paid value manually with correct total
        await storage.updateOrder(receivable.orderId, {
          paidValue: totalPaid.toFixed(2),
          __origin: 'receivables' // Mark as coming from receivables to prevent totalValue changes
        } as any);

        // Update the receivable with correct amounts
        const totalAmount = parseFloat(receivable.amount);
        let newStatus = 'pending';

        if (totalPaid >= totalAmount) {
          newStatus = 'paid';
        } else if (totalPaid > 0) {
          const minPayment = parseFloat(receivable.minimumPayment || '0');
          if (minPayment > 0 && totalPaid >= minPayment) {
            newStatus = 'partial';
          } else if (minPayment > 0 && totalPaid < minPayment) {
            newStatus = 'pending';
          } else {
            newStatus = 'partial';
          }
        }

        await storage.updateAccountsReceivable(id, {
          receivedAmount: totalPaid.toFixed(2),
          status: newStatus
        } as any);

        console.log(`[RECEIVABLE PAYMENT] Order ${receivable.orderId}: Payment ${amount} added. TotalValue=${totalAmount} (unchanged), PaidValue=${totalPaid}, Remaining=${totalAmount - totalPaid}`);

        paymentRecord = payment;
      } else {
        // This is a manual receivable - update the receivable directly
        const currentReceived = parseFloat(receivable.receivedAmount || '0');
        const newReceivedAmount = currentReceived + parseFloat(amount);

        await storage.updateAccountsReceivable(id, {
          receivedAmount: newReceivedAmount.toFixed(2),
          status: newReceivedAmount >= parseFloat(receivable.amount) ? 'paid' : 'partial'
        } as any);

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
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      res.status(500).json({ error: "Erro ao processar pagamento: " + errorMessage });
    }
  });

  // Auth verification endpoint
  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      // Set JSON header explicitly
      res.setHeader('Content-Type', 'application/json');
      
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Token não fornecido" });
      }

      const token = authHeader.substring(7);
      
      if (!token) {
        return res.status(401).json({ error: "Token inválido" });
      }

      // Decode simple token (userId:username:timestamp)
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [userId, username, timestamp] = decoded.split(':');
        
        if (!userId || !username || !timestamp) {
          return res.status(401).json({ error: "Token malformado" });
        }

        // Get user data from storage
        const users = await storage.getUsers();
        const user = users.find(u => u.id === userId && u.username === username);
        
        if (!user) {
          return res.status(401).json({ error: "Usuário não encontrado" });
        }

        console.log(`Auth verification successful for: ${username} (${user.role})`);
        
        res.json({ 
          success: true, 
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role
          }
        });
      } catch (decodeError) {
        console.error("Token decode error:", decodeError);
        return res.status(401).json({ error: "Token inválido" });
      }
    } catch (error) {
      console.error("Auth verification error:", error);
      // Ensure JSON response even in error cases
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Erro interno do servidor",
          message: error instanceof Error ? error.message : "Erro desconhecido"
        });
      }
    }
  });

  // Auth login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password, preferredRole } = req.body;
      
      console.log(`Login attempt: ${username} with preferred role: ${preferredRole}`);

      if (!username || !password) {
        return res.status(400).json({ error: "Username e password são obrigatórios" });
      }

      // Get all users
      const users = await storage.getUsers();
      let user = users.find(u => u.username === username && u.password === password);

      if (!user) {
        // Check if it's a client code
        const clients = await storage.getClients();
        const client = clients.find(c => c.userCode === username && c.password === password);
        
        if (client) {
          user = {
            id: client.id,
            username: client.userCode,
            name: client.name,
            role: 'client',
            password: client.password
          };
        }
      }

      if (!user) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      // Use preferred role if specified and user is admin, otherwise use user's role
      const effectiveRole = (user.role === 'admin' && preferredRole) ? preferredRole : user.role;

      const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');

      console.log(`Login successful: ${user.username} as ${effectiveRole}`);

      res.json({ 
        success: true, 
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: effectiveRole
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get clients by vendor
  app.get("/api/vendors/:vendorId/clients", async (req: Request, res: Response) => {
    try {
      const { vendorId } = req.params;
      console.log(`Getting clients for vendor: ${vendorId}`);

      const clients = await storage.getClientsByVendor(vendorId);
      console.log(`Found ${clients.length} clients for vendor ${vendorId}:`, 
        clients.map(c => ({ id: c.id, name: c.name, vendorId: c.vendorId })));

      res.json(clients);
    } catch (error) {
      console.error("Error getting clients by vendor:", error);
      res.status(500).json({ 
        error: "Erro ao buscar clientes", 
        details: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  // Producers endpoints
  app.get("/api/producers", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const producers = await storage.getUsersByRole('producer');
      res.json(producers);
    } catch (error) {
      console.error("Error getting producers:", error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Erro ao buscar produtores", 
          message: error instanceof Error ? error.message : "Erro desconhecido" 
        });
      }
    }
  });

  app.post("/api/producers", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const { name, email, phone, specialty, address, password, username } = req.body;

      if (!name || !password) {
        return res.status(400).json({ error: "Nome e senha são obrigatórios" });
      }

      const producerData = {
        username: username || `producer-${Date.now()}`,
        password,
        role: 'producer',
        name,
        email: email || null,
        phone: phone || null,
        specialty: specialty || null,
        address: address || null,
        vendorId: null,
        isActive: true
      };

      const producer = await storage.createUser(producerData as any);
      console.log('Producer created successfully:', producer);

      res.status(201).json(producer);
    } catch (error) {
      console.error("Error creating producer:", error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Erro ao criar produtor", 
          message: error instanceof Error ? error.message : "Erro desconhecido" 
        });
      }
    }
  });

  // Products endpoints
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const { page, limit, search, category, producer } = req.query;
      
      const options = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        search: search as string,
        category: category as string,
        producer: producer as string
      };

      const result = await storage.getProducts(options);
      res.json(result);
    } catch (error) {
      console.error("Error getting products:", error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Erro ao buscar produtos", 
          message: error instanceof Error ? error.message : "Erro desconhecido" 
        });
      }
    }
  });

  app.post("/api/products", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const productData = req.body;
      const product = await storage.createProduct(productData);
      
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Erro ao criar produto", 
          message: error instanceof Error ? error.message : "Erro desconhecido" 
        });
      }
    }
  });

  app.put("/api/products/:id", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const { id } = req.params;
      const productData = req.body;
      
      const product = await storage.updateProduct(id, productData);
      
      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Erro ao atualizar produto", 
          message: error instanceof Error ? error.message : "Erro desconhecido" 
        });
      }
    }
  });

  app.delete("/api/products/:id", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const { id } = req.params;
      const success = await storage.deleteProduct(id);
      
      if (!success) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Erro ao deletar produto", 
          message: error instanceof Error ? error.message : "Erro desconhecido" 
        });
      }
    }
  });

  // Logistics endpoints
  app.get("/api/logistics/products", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const { page, limit, search, category, producer } = req.query;
      
      const options = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        search: search as string,
        category: category as string,
        producer: producer as string
      };

      const result = await storage.getProducts(options);
      
      // Enrich products with producer names
      const enrichedProducts = await Promise.all(
        result.products.map(async (product: any) => {
          if (product.producerId && product.producerId !== 'internal') {
            const producer = await storage.getUser(product.producerId);
            return {
              ...product,
              producerName: producer?.name || `Produtor ${product.producerId.slice(-6)}`
            };
          }
          return product;
        })
      );

      res.json({
        ...result,
        products: enrichedProducts
      });
    } catch (error) {
      console.error("Error getting logistics products:", error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Erro ao buscar produtos da logística", 
          message: error instanceof Error ? error.message : "Erro desconhecido" 
        });
      }
    }
  });

  app.get("/api/logistics/producer-stats", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const products = await storage.getProducts();
      const producers = await storage.getUsersByRole('producer');
      
      const stats = producers.map((producer: any) => {
        const producerProducts = products.products.filter((p: any) => p.producerId === producer.id);
        const activeProducts = producerProducts.filter((p: any) => p.isActive);
        
        return {
          producerId: producer.id,
          producerName: producer.name,
          totalProducts: producerProducts.length,
          activeProducts: activeProducts.length
        };
      });
      
      res.json(stats);
    } catch (error) {
      console.error("Error getting producer stats:", error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Erro ao buscar estatísticas de produtores", 
          message: error instanceof Error ? error.message : "Erro desconhecido" 
        });
      }
    }
  });

  app.get("/api/logistics/paid-orders", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const orders = await storage.getOrders();
      const paidOrders = orders.filter((order: any) => {
        const paidValue = parseFloat(order.paidValue || '0');
        return paidValue > 0 && order.status !== 'production' && order.status !== 'shipped' && order.status !== 'delivered';
      });
      
      res.json(paidOrders);
    } catch (error) {
      console.error("Error getting paid orders:", error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Erro ao buscar pedidos pagos", 
          message: error instanceof Error ? error.message : "Erro desconhecido" 
        });
      }
    }
  });

  app.get("/api/production-orders", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const productionOrders = await storage.getProductionOrders();
      
      // Enrich with producer and order information
      const enrichedOrders = await Promise.all(
        productionOrders.map(async (po: any) => {
          const producer = await storage.getUser(po.producerId);
          const order = await storage.getOrder(po.orderId);
          
          return {
            ...po,
            producerName: producer?.name || `Produtor ${po.producerId.slice(-6)}`,
            orderNumber: order?.orderNumber || `PED-${po.orderId.slice(-6)}`,
            clientName: order?.clientName || 'Cliente não informado',
            product: order?.product || 'Produto não informado'
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error getting production orders:", error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ 
          error: "Erro ao buscar ordens de produção", 
          message: error instanceof Error ? error.message : "Erro desconhecido" 
        });
      }
    }
  });

  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      console.log("POST /api/clients - Request body:", req.body);

      const { name, email, phone, whatsapp, cpfCnpj, address, vendorId, userCode, password } = req.body;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      }

      const clientData = {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        cpfCnpj: cpfCnpj?.trim() || null,
        address: address?.trim() || null,
        vendorId: vendorId || null,
        userCode: userCode || null,
        password: password.trim(),
        isActive: true
      };

      console.log("Creating client with data:", clientData);

      const client = await storage.createClient(clientData as any);
      console.log("Client created successfully:", client);

      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ 
        error: "Erro ao criar cliente", 
        details: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  const server = createServer(app);
  return server;
}
