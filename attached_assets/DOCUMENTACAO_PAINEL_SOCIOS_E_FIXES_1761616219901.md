
# Documentação: Painel dos Sócios e Correção de Contas a Receber

## 📋 Visão Geral

Este documento descreve a implementação completa do painel dos sócios e a correção do problema de duplicação nas contas a receber. Serve como guia para recriar essas funcionalidades em caso de rollback.

## 👥 Implementação do Painel dos Sócios

### 1. Estrutura de Dados dos Sócios

#### Backend - Criação dos Usuários Sócios
No arquivo `server/storage.ts`, os sócios são criados como usuários com role "partner":

```typescript
// Criar 3 partners - eles podem editar seus nomes depois
const partner1User = {
  id: "partner-1",
  username: "socio1",
  password: "123456",
  name: "Sócio 1",
  email: "socio1@erp.com",
  phone: null,
  vendorId: null,
  role: "partner",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};
// Similar para partner-2 e partner-3
```

#### Perfil de Partner no Storage
```typescript
async getPartner(userId: string): Promise<Partner | undefined> {
  return Array.from(this.partners.values()).find(partner => partner.userId === userId);
}

async createPartner(partnerData: any): Promise<User> {
  // Create user first
  const newUser: User = {
    id: randomUUID(),
    username: partnerData.username || userCode,
    password: partnerData.password || "123456",
    role: 'partner',
    name: partnerData.name,
    email: partnerData.email || null,
    phone: partnerData.phone || null,
    address: partnerData.address || null,
    specialty: partnerData.specialty || null,
    vendorId: null,
    isActive: true
  };

  this.users.set(newUser.id, newUser);

  // Create partner profile
  const partnerProfile: Partner = {
    id: randomUUID(),
    userId: newUser.id,
    commissionRate: partnerData.commissionRate || "15.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  this.partners.set(partnerProfile.id, partnerProfile);
  return newUser;
}
```

### 2. Sistema de Comissões dos Sócios

#### Cálculo Automático das Comissões
```typescript
// Calculate and create commissions for an order
async calculateCommissions(order: Order): Promise<void> {
  try {
    // Get vendor commission settings
    const vendor = await this.getVendor(order.vendorId);
    const commissionSettings = await this.getCommissionSettings();

    const vendorRate = vendor?.commissionRate || commissionSettings?.vendorCommissionRate || '10.00';
    const orderValue = parseFloat(order.totalValue);
    const vendorCommissionAmount = (orderValue * parseFloat(vendorRate)) / 100;

    // Create vendor commission
    const vendorCommission: Commission = {
      id: `commission-${order.id}-vendor`,
      vendorId: order.vendorId,
      orderId: order.id,
      percentage: vendorRate,
      amount: vendorCommissionAmount.toFixed(2),
      status: 'pending',
      type: 'vendor',
      orderValue: order.totalValue,
      orderNumber: order.orderNumber,
      paidAt: null,
      createdAt: new Date()
    };

    this.commissions.set(vendorCommission.id, vendorCommission);

    // Create partner commissions - divide equally among 3 partners
    const partnerRate = commissionSettings?.partnerCommissionRate || '15.00';
    const totalPartnerCommission = (orderValue * parseFloat(partnerRate)) / 100;
    const individualPartnerCommission = totalPartnerCommission / 3; // Divide by 3 partners

    const partnerIds = ['partner-1', 'partner-2', 'partner-3'];

    for (let i = 0; i < partnerIds.length; i++) {
      const partnerCommission: Commission = {
        id: `commission-${order.id}-partner-${i + 1}`,
        partnerId: partnerIds[i],
        orderId: order.id,
        percentage: (parseFloat(partnerRate) / 3).toFixed(2), // Individual percentage
        amount: individualPartnerCommission.toFixed(2),
        status: 'confirmed', // Partners get paid immediately when order starts
        type: 'partner',
        orderValue: order.totalValue,
        orderNumber: order.orderNumber,
        paidAt: new Date(), // Paid immediately
        createdAt: new Date()
      };

      this.commissions.set(partnerCommission.id, partnerCommission);
    }
  } catch (error) {
    console.error('Error calculating commissions:', error);
  }
}
```

### 3. Rotas de API para Sócios

#### Routes.ts - Endpoints dos Sócios
```typescript
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
```

### 4. Frontend - Painel do Sócio

#### Partner Dashboard (client/src/pages/dashboards/partner-dashboard.tsx)
```typescript
export default function PartnerDashboard() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/verify"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");

      const response = await fetch("/api/auth/verify", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Invalid token");

      return response.json();
    },
  });

  // Get partner specific data
  const { data: partnerData, isLoading: partnerLoading } = useQuery({
    queryKey: ["/api/partners", user?.user?.id],
    queryFn: async () => {
      if (!user?.user?.id) return null;

      const response = await fetch(`/api/partners/${user.user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) return null;

      return response.json();
    },
    enabled: !!user?.user?.id,
  });

  // Query específica para as comissões deste sócio
  const { data: partnerCommissions } = useQuery({
    queryKey: ["/api/commissions"],
    select: (data) => {
      // Filtrar apenas comissões deste sócio específico
      return data?.filter((commission: any) => 
        commission.partnerId === user?.user?.id && commission.type === 'partner'
      ) || [];
    }
  });

  // Cálculos específicos das comissões deste sócio
  const totalPartnerCommissions = partnerCommissions?.reduce((sum: number, commission: any) => 
    sum + parseFloat(commission.amount || '0'), 0) || 0;

  const pendingPartnerCommissions = partnerCommissions?.filter((c: any) => 
    ['pending', 'confirmed'].includes(c.status)).reduce((sum: number, c: any) => 
    sum + parseFloat(c.amount || '0'), 0) || 0;

  const paidPartnerCommissions = partnerCommissions?.filter((c: any) => 
    c.status === 'paid').reduce((sum: number, c: any) => 
    sum + parseFloat(c.amount || '0'), 0) || 0;

  // Rest of component implementation...
}
```

### 5. Sistema de Navegação e Autenticação

#### Main Layout (client/src/components/layout/main-layout.tsx)
```typescript
// Partner navigation items
const partnerNavigation = [
  { name: 'Dashboard', href: '/partner/dashboard', icon: BarChart3 },
  { name: 'Minhas Comissões', href: '/partner/commission-management', icon: TrendingUp },
  { name: 'Pedidos', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Vendedores', href: '/admin/vendors', icon: Users },
  { name: 'Clientes', href: '/admin/clients', icon: Users },
  { name: 'Produtores', href: '/admin/producers', icon: Factory },
  { name: 'Produtos', href: '/admin/products', icon: Package },
  { name: 'Orçamentos', href: '/admin/budgets', icon: BarChart3 },
  { name: 'Financeiro', href: '/finance', icon: DollarSign },
];

// Role-based navigation
const getNavigationForRole = (role: string) => {
  switch (role) {
    case 'admin':
      return adminNavigation;
    case 'vendor':
      return vendorNavigation;
    case 'client':
      return clientNavigation;
    case 'producer':
      return producerNavigation;
    case 'finance':
      return financeNavigation;
    case 'logistics':
      return logisticsNavigation;
    case 'partner':
      return partnerNavigation;
    default:
      return [];
  }
};
```

## 💰 Correção do Problema de Duplicação em Contas a Receber

### 1. Problema Identificado

O sistema estava duplicando valores nas contas a receber por dois motivos:
1. Criação automática de `AccountsReceivable` para cada pedido
2. Soma incorreta dos valores já pagos com novos pagamentos

### 2. Solução Implementada

#### Storage.ts - Método updateOrderPaidValue Corrigido
```typescript
// Update order paid value based on confirmed payments
async updateOrderPaidValue(orderId: string): Promise<void> {
  const payments = await this.getPaymentsByOrder(orderId);
  const totalPaid = payments
    .filter(p => p.status === 'confirmed')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  // Update order paid value
  await this.updateOrder(orderId, {
    paidValue: totalPaid.toFixed(2)
  });

  // Update accounts receivable - CORRIGIDO: não alterar o valor original
  const receivables = await this.getAccountsReceivable();
  const receivable = receivables.find(r => r.orderId === orderId);

  if (receivable) {
    const totalAmount = parseFloat(receivable.amount); // MANTER valor original sempre
    let status: 'pending' | 'partial' | 'paid' | 'overdue' = 'pending';
    if (totalPaid >= totalAmount) {
      status = 'paid';
    } else if (totalPaid > 0) {
      // Check if minimum payment requirement is met
      const minPayment = parseFloat(receivable.minimumPayment || '0');
      if (minPayment > 0 && totalPaid >= minPayment) {
        status = 'partial'; // Entrada + frete pagos, restante pendente
      } else if (minPayment > 0 && totalPaid < minPayment) {
        status = 'pending'; // Entrada + frete ainda não pagos completamente
      } else {
        status = 'partial'; // Sem exigência de entrada, qualquer valor é parcial
      }
    }

    // Check if overdue
    const dueDate = receivable.dueDate ? new Date(receivable.dueDate) : null;
    if (dueDate && new Date() > dueDate && status !== 'paid') {
      status = 'overdue';
    }

    // IMPORTANTE: Atualizar apenas receivedAmount e status, NÃO o valor total
    await this.updateAccountsReceivable(receivable.id, {
      receivedAmount: totalPaid.toFixed(2), // Apenas valor recebido
      status: status // Apenas status
      // NÃO atualizar 'amount' - deve sempre permanecer o valor original do pedido
    });
  }
}
```

#### Método updateOrder Protegido
```typescript
async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
  const order = this.orders.get(id);
  if (!order) return undefined;

  //SEGURANÇA: Nunca permitir que fluxos de pagamento alterem totalValue
  const sanitized = { ...updates };

  // Proteção específica contra alteração acidental de totalValue em fluxos de pagamento
  if ('totalValue' in sanitized && sanitized.totalValue !== undefined) {
    const origin = (sanitized as any).__origin;

    // Se vier de fluxos de receivables/pagamento, bloquear mudança de totalValue
    if (origin === 'receivables' || origin === 'payment') {
      console.warn(`[SECURITY] Blocked totalValue change from ${origin} for order ${id}. Current: ${order.totalValue}, Attempted: ${sanitized.totalValue}`);
      delete (sanitized as any).totalValue;
    }
  }

  // Remove o campo __origin da atualização final
  if ('__origin' in sanitized) {
    delete (sanitized as any).__origin;
  }

  // NUNCA alterar o valor total do pedido em operações normais - isso deve ser feito apenas em operações específicas
  const updatedOrder = { ...order, ...sanitized, updatedAt: new Date() };
  this.orders.set(id, updatedOrder);

  // Update AccountsReceivable if necessary...
  return updatedOrder;
}
```

#### Frontend - Receivables.tsx Corrigido
```typescript
// Convert API data to expected format - SEMPRE mostrar valor total original do pedido
const mockReceivables = receivablesData.map((receivable: any) => ({
  id: receivable.id,
  orderNumber: receivable.orderNumber || `#${receivable.orderId}`,
  clientName: receivable.clientName || 'Cliente não identificado',
  dueDate: receivable.dueDate ? new Date(receivable.dueDate) : new Date(),
  amount: receivable.amount || "0.00", // SEMPRE o valor total original do pedido
  paidAmount: receivable.receivedAmount || "0.00",
  minimumPayment: receivable.minimumPayment || "0.00", // Pagamento mínimo obrigatório (entrada + frete)
  status: receivable.status || "pending",
  createdAt: receivable.createdAt ? new Date(receivable.createdAt) : new Date(),
  lastPaymentDate: receivable.lastPaymentDate ? new Date(receivable.lastPaymentDate) : null
}));

// Calcular totais corretos: Valor Original - Valor Recebido = Saldo restante
const totalToReceive = mockReceivables.reduce((sum, r) => {
  const originalAmount = parseFloat(r.amount); // Valor original do pedido
  const receivedAmount = parseFloat(r.paidAmount || r.receivedAmount || "0");
  return sum + Math.max(0, originalAmount - receivedAmount);
}, 0);

const totalReceived = mockReceivables.reduce((sum, r) => sum + parseFloat(r.paidAmount || r.receivedAmount || "0"), 0);
```

### 3. Routes.ts - Endpoint de Pagamento de Receivables
```typescript
// Receivables payment endpoint
app.post("/api/receivables/:id/payment", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, transactionId, notes } = req.body;

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
      
      paymentRecord = await storage.createPayment({
        orderId: receivable.orderId,
        amount: finalAmount.toFixed(2),
        method: method || 'manual',
        status: 'confirmed',
        transactionId: transactionId || `MANUAL-${Date.now()}`,
        notes: notes || ''
      });
    }

    res.json({
      success: true,
      payment: paymentRecord,
      message: "Pagamento registrado com sucesso"
    });
  } catch (error) {
    console.error("Error processing receivables payment:", error);
    res.status(500).json({ error: "Erro ao registrar pagamento: " + error.message });
  }
});
```

## 📝 Pontos Críticos para Recreação

### 1. Sistema de Comissões dos Sócios
- As comissões são calculadas automaticamente quando um pedido é criado
- São divididas igualmente entre os 3 sócios (15% total / 3 = 5% cada)
- Status inicial é 'confirmed' (pago imediatamente)
- Em caso de cancelamento, as comissões ficam marcadas para dedução futura

### 2. Autenticação e Navegação
- Role 'partner' tem acesso administrativo completo
- Navegação específica com foco em comissões
- Dashboard próprio com métricas consolidadas

### 3. Proteção Contra Duplicação
- Método `updateOrderPaidValue` calcula o total pago baseado apenas em payments confirmados
- Valor original do pedido (`totalValue`) nunca é alterado em fluxos de pagamento
- Sistema de validação previne pagamentos acima do valor restante

### 4. Frontend Responsivo
- Cards com hover effects
- Tabelas responsivas
- Sistema de cores consistente
- Loading states apropriados

Este documento serve como guia completo para recriar tanto o painel dos sócios quanto a correção das contas a receber em caso de rollback do sistema.
