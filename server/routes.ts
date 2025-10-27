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

      // If orderId exists, it's a payment for an order
      if (receivable.orderId) {
        console.log(`Processing receivables payment: ${JSON.stringify({ id: receivableId, amount: paymentAmount, method, transactionId })}`);

        // Create payment record for the order with special flag to prevent automatic order update
        const payment = await storage.createPayment({
          orderId: receivable.orderId,
          amount: paymentAmount,
          method: method || 'manual',
          status: 'confirmed',
          transactionId: transactionId || `MANUAL-${Date.now()}`,
          paidAt: new Date(),
          reconciliationStatus: 'manual',
          bankTransactionId: null,
          notes: notes || '',
          __skipOrderUpdate: true // Flag to prevent automatic order update
        });

        console.log(`Payment processed successfully:`, payment);

        // Get all payments for this order to calculate correct total
        const allPayments = await storage.getPaymentsByOrder(receivable.orderId);
        const confirmedPayments = allPayments.filter(p => p.status === 'confirmed');
        const totalPaid = confirmedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        // Update order paid value manually with correct total
        await storage.updateOrder(receivable.orderId, {
          paidValue: totalPaid.toFixed(2),
          __origin: 'receivables' // Mark as coming from receivables to prevent totalValue changes
        });

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

        await storage.updateAccountsReceivable(receivableId, {
          receivedAmount: totalPaid.toFixed(2),
          status: newStatus
        });

        console.log(`[RECEIVABLE PAYMENT] Order ${receivable.orderId}: Payment ${paymentAmount} added. TotalValue=${totalAmount} (unchanged), PaidValue=${totalPaid}, Remaining=${totalAmount - totalPaid}`);

        return payment;
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