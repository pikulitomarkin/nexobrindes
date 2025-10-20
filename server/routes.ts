// Import necessary modules
const express = require('express');
const storage = require('./storage'); // Assuming storage.js handles database interactions

const app = express();
app.use(express.json());

// Dummy storage implementation for demonstration purposes
// In a real application, this would interact with a database
const dummyStorage = {
  commissionPayouts: [
    { id: '1', userId: 'user-1', amount: 100, status: 'paid', createdAt: '2023-10-26T10:00:00Z', paidAt: '2023-10-26T11:00:00Z' },
    { id: '2', userId: 'user-2', amount: 150, status: 'pending', createdAt: '2023-10-27T10:00:00Z', paidAt: null },
  ],
  allCommissions: [
    { id: 'comm-1', type: 'vendor', vendorId: 'vendor-1', amount: 50, status: 'confirmed', orderNumber: 'order-123', orderValue: 500, createdAt: '2023-10-25T09:00:00Z', paidAt: null },
    { id: 'comm-2', type: 'partner', partnerId: 'partner-1', amount: 75, status: 'confirmed', orderNumber: 'order-456', orderValue: 750, createdAt: '2023-10-26T09:00:00Z', paidAt: '2023-10-26T11:00:00Z' },
    { id: 'comm-3', type: 'vendor', vendorId: 'vendor-2', amount: 60, status: 'confirmed', orderNumber: 'order-789', orderValue: 600, createdAt: '2023-10-27T09:00:00Z', paidAt: null },
  ],
  users: {
    'vendor-1': { id: 'vendor-1', name: 'Tech Supplies Inc.' },
    'vendor-2': { id: 'vendor-2', name: 'Gadget World' },
    'partner-1': { id: 'partner-1', name: 'Affiliate Marketing Pro' },
  },
  getUser: async function(userId) {
    return new Promise(resolve => setTimeout(() => resolve(this.users[userId]), 50));
  },
  getCommissionPayouts: async function() {
    return new Promise(resolve => setTimeout(() => resolve(this.commissionPayouts), 50));
  },
  getAllCommissions: async function() {
    return new Promise(resolve => setTimeout(() => resolve(this.allCommissions), 50));
  },
  updateCommissionPayout: async function(id, updates) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = this.commissionPayouts.findIndex(p => p.id === id);
        if (index === -1) {
          return reject(new Error('Payout not found'));
        }
        this.commissionPayouts[index] = { ...this.commissionPayouts[index], ...updates, paidAt: updates.paidAt || this.commissionPayouts[index].paidAt };
        resolve(this.commissionPayouts[index]);
      }, 50);
    });
  },
  updateCommissionStatus: async function(id, status, paidAt) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = this.allCommissions.findIndex(c => c.id === id);
        if (index === -1) {
          return reject(new Error('Commission not found'));
        }
        this.allCommissions[index] = { ...this.allCommissions[index], status, paidAt };
        resolve(this.allCommissions[index]);
      }, 50);
    });
  }
};

// Use dummy storage if the real storage module is not available
const actualStorage = typeof storage !== 'undefined' ? storage : dummyStorage;


// Commission Payouts endpoints
app.get('/api/finance/commission-payouts', async (req, res) => {
  try {
    const payouts = await actualStorage.getCommissionPayouts();

    // Also get all confirmed commissions that haven't been paid yet
    const allCommissions = await actualStorage.getAllCommissions();
    const pendingCommissions = allCommissions.filter(c => 
      c.status === 'confirmed' && !c.paidAt
    );

    // Add user names to commissions
    const enrichedCommissions = await Promise.all(
      pendingCommissions.map(async (commission) => {
        let userName = 'Usuário não encontrado';

        if (commission.type === 'vendor' && commission.vendorId) {
          const vendor = await actualStorage.getUser(commission.vendorId);
          userName = vendor?.name || 'Vendedor não encontrado';
        } else if (commission.type === 'partner' && commission.partnerId) {
          const partner = await actualStorage.getUser(commission.partnerId);
          userName = partner?.name || 'Sócio não encontrado';
        }

        return {
          ...commission,
          userName
        };
      })
    );

    // Combine payouts and pending commissions
    const allPayouts = [
      ...payouts,
      ...enrichedCommissions.map(c => ({
        id: `commission-${c.id}`,
        commissionId: c.id,
        userId: c.vendorId || c.partnerId,
        type: c.type,
        amount: c.amount,
        status: 'pending',
        userName: c.userName,
        periodStart: c.createdAt,
        periodEnd: c.createdAt,
        orderNumber: c.orderNumber,
        orderValue: c.orderValue,
        createdAt: c.createdAt,
        paidAt: null
      }))
    ];

    res.json(allPayouts);
  } catch (error) {
    console.error('Error fetching commission payouts:', error);
    res.status(500).json({ error: 'Failed to fetch commission payouts' });
  }
});

app.patch('/api/finance/commission-payouts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if this is a commission ID (starts with commission-)
    if (id.startsWith('commission-')) {
      const commissionId = id.replace('commission-', '');

      // Update the commission status to paid
      const updatedCommission = await actualStorage.updateCommissionStatus(
        commissionId, 
        'paid', 
        new Date()
      );

      if (!updatedCommission) {
        return res.status(404).json({ error: 'Commission not found' });
      }

      console.log(`Marked commission ${commissionId} as paid`);
      res.json({ 
        ...updatedCommission, 
        id: `commission-${updatedCommission.id}`,
        status: 'paid'
      });
    } else {
      // Regular payout update
      const updatedPayout = await actualStorage.updateCommissionPayout(id, updates);
      if (!updatedPayout) {
        return res.status(404).json({ error: 'Commission payout not found' });
      }

      res.json(updatedPayout);
    }
  } catch (error) {
    console.error('Error updating commission payout:', error);
    res.status(500).json({ error: 'Failed to update commission payout' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});