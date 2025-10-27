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
