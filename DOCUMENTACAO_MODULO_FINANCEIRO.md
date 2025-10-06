# Documentação do Módulo Financeiro e Pagamentos de Produtores

## Data: 06 de Outubro de 2025

Este documento descreve o estado atual do módulo financeiro, sistema de pagamentos de produtores e inserção de valores em pedidos de produção. Use este documento para restaurar essas funcionalidades após o rollback do sistema.

---

## 1. MÓDULO FINANCEIRO COMPLETO

### 1.1 Visão Geral do Painel Financeiro (`/finance`)

**Localização Frontend:** `client/src/pages/finance/index.tsx`

O módulo financeiro é um hub central que agrupa 7 submódulos:

#### Submódulos Disponíveis:

1. **Contas a Receber** (`/finance/receivables`)
   - Controle de valores a receber de clientes
   - Ícone: DollarSign (azul)

2. **Contas a Pagar** (`/finance/payables`)
   - Controle de valores a pagar para fornecedores
   - Ícone: TrendingDown (vermelho)

3. **Notas de Despesas** (`/finance/expenses`)
   - Upload e controle de notas de gastos
   - Ícone: Receipt (laranja)

4. **Pagamentos de Comissão** (`/finance/commission-payouts`)
   - Gestão de pagamentos para vendedores e sócios
   - Ícone: Users (verde)

5. **Pagamentos de Produtores** (`/admin/producer-payments`)
   - Controle de pagamentos para produtores externos
   - Ícone: Factory (roxo)
   - **PRINCIPAL FUNCIONALIDADE DESCRITA NESTE DOCUMENTO**

6. **Conciliação Bancária** (`/finance/reconciliation`)
   - Upload de arquivos OFX e conciliação
   - Ícone: Calculator (índigo)

7. **Histórico de Pagamentos** (`/finance/payments`)
   - Visualização de todos os pagamentos do sistema
   - Ícone: CreditCard (roxo)

#### Cards de Resumo na Dashboard:
- Total a Receber: R$ 15.450,00
- Total a Pagar: R$ 8.320,00
- Produtores a Pagar: R$ 830,00
- Despesas do Mês: R$ 2.150,00
- Saldo Líquido: R$ 4.980,00

---

## 2. PAINEL ADMINISTRATIVO FINANCEIRO

### 2.1 Visão Financeira Admin (`/admin/finance`)

**Localização Frontend:** `client/src/pages/admin/finance.tsx`

Este painel fornece visão gerencial consolidada:

#### Cards de Resumo:
1. **Contas a Receber**
   - Query: `/api/finance/overview`
   - Campo: `receivables`
   - Cor: Verde com ícone TrendingUp

2. **Contas a Pagar**
   - Calculado dinamicamente de `producerPayments`
   - Soma: pendentes + aprovados
   - Exibe contador: `X pendente(s) • Y aprovado(s)`
   - Cor: Vermelho com ícone TrendingDown

3. **Saldo em Conta**
   - Campo: `balance`
   - Cor: Gradient com ícone DollarSign

4. **Comissões Pendentes**
   - Campo: `pendingCommissions`
   - Cor: Amarelo com ícone Clock

#### Ações Rápidas:
- Importar Arquivo OFX
- Processar Comissões
- Gerar Relatório Mensal
- Conciliar Pagamentos

#### Resumo do Mês (valores estáticos no frontend):
- Receita Total: R$ 84.500,00
- Custos de Produção: R$ 52.300,00
- Comissões Pagas: R$ 8.450,00
- **Lucro Líquido: R$ 23.750,00**

---

## 3. SISTEMA DE PAGAMENTOS DE PRODUTORES

### 3.1 Painel de Pagamentos de Produtores

**Localização Frontend:** `client/src/pages/admin/producer-payments.tsx`

Este é o módulo MAIS CRÍTICO do sistema financeiro.

#### Funcionalidades Principais:

##### A. Gestão de Pagamentos

**Query Principal:** `/api/producer-payments`

**Estados de Pagamento:**
- `pending`: Pendente de aprovação (cor amarela)
- `approved`: Aprovado, aguardando pagamento (cor azul)
- `paid`: Pago e finalizado (cor verde)
- `rejected`: Rejeitado (cor vermelha)

##### B. Cards de Resumo:

1. **Pendentes**
   - Soma de todos `status === 'pending'`
   - Cor: Amarelo com ícone Clock

2. **Aprovados**
   - Soma de todos `status === 'approved'`
   - Cor: Azul com ícone CheckCircle

3. **Pagos**
   - Soma de todos `status === 'paid'`
   - Cor: Verde com ícone DollarSign

##### C. Filtros Disponíveis:
- **Busca por texto:** Produtor, Pedido, Produto
- **Filtro de status:** Todos, Pendente, Aprovado, Pago, Rejeitado

##### D. Tabela de Pagamentos

Colunas:
1. **Produtor** (com ícone User)
2. **Pedido** (order.orderNumber)
3. **Produto** (order.product)
4. **Valor** (formatado R$ X.XXX,XX)
5. **Status** (Badge colorido)
6. **Data Criação** (formato pt-BR)
7. **Ações**

**Ações por Status:**

- **Status `pending`:**
  - Botão "Aprovar" (verde) → Chama `updatePaymentMutation` com `status: 'approved'`
  - Botão "Rejeitar" (vermelho) → Chama `updatePaymentMutation` com `status: 'rejected'`

- **Status `approved`:**
  - Botão "Marcar como Pago" (azul) → Abre dialog para informar método de pagamento

- Botão "Ver" (sempre disponível) → Visualizar detalhes

#### 3.2 Sistema de Importação OFX

**Botão:** "Importar OFX" (canto superior direito)

**Dialog de Upload:**
- Aceita arquivos `.ofx` ou `.OFX`
- FormData upload para `/api/upload-ofx`
- Retorna: `{ transactionsImported: N }`
- Invalida queries após sucesso:
  - `/api/producer-payments`
  - `/api/finance/bank-transactions`
  - `/api/finance/bank-imports`

#### 3.3 Sistema de Abas (Tabs)

##### Aba 1: "Gerenciar Pagamentos"
- Tabela completa de pagamentos
- Filtros e busca
- Ações de aprovação/rejeição/pagamento

##### Aba 2: "Conciliação Bancária"
- Query: `/api/finance/bank-transactions`
- Filtra: `status === 'unmatched' && amount < 0` (saídas)
- **Funcionalidade:** Conciliar transações bancárias com pagamentos aprovados

**Processo de Conciliação:**
1. Lista pagamentos com `status === 'approved'`
2. Para cada pagamento, busca transações compatíveis (tolerância 5%)
3. Botão "Conciliar" abre dialog
4. Seleciona transação bancária
5. API: `PATCH /api/finance/bank-transactions/:id`
   - Define: `status: 'matched'`, `matchedPaymentId`, `reconciled: true`
6. Atualiza pagamento: `status: 'paid'`, `paymentMethod: 'bank_transfer'`

##### Aba 3: "Histórico de Importações"
- Query: `/api/finance/bank-imports`
- Lista: importações OFX anteriores
- Mostra: data, arquivo, transações importadas

#### 3.4 Dialog de Marcar como Pago

Campos:
- **Método de Pagamento** (Select - obrigatório):
  - PIX
  - Transferência Bancária
  - Dinheiro
  - Outros

- **Observações** (Textarea - opcional)

**Mutation:**
```javascript
updatePaymentMutation.mutate({
  id: payment.id,
  status: "paid",
  paidBy: "admin-1", // user ID
  paymentMethod: paymentMethod,
  notes: notes
})
```

---

## 4. SISTEMA DE INSERÇÃO DE VALOR PELO PRODUTOR

### 4.1 Painel do Produtor - Detalhes do Pedido

**Localização Frontend:** `client/src/pages/producer/order-details.tsx`
**Rota:** `/producer/order/:id`

Este painel permite ao produtor:
1. Visualizar detalhes completos do pedido
2. **Inserir o valor que ele cobrará pela produção**
3. Atualizar status de produção
4. Adicionar observações

#### 4.2 Fluxo de Inserção de Valor

**Card Especial (não mostrado no código atual):**

O produtor deve ter um card para "Definir Valor de Produção":

```tsx
<Card>
  <CardHeader>
    <CardTitle>Valor da Produção</CardTitle>
  </CardHeader>
  <CardContent>
    <Label>Valor a Cobrar</Label>
    <Input 
      type="number" 
      placeholder="0.00"
      value={producerValue}
      onChange={...}
    />
    <Label>Observações</Label>
    <Textarea 
      placeholder="Descrição de custos, materiais, etc."
      value={producerNotes}
      onChange={...}
    />
    <Button onClick={handleSetValue}>
      Definir Valor
    </Button>
  </CardContent>
</Card>
```

**Mutation:**
```javascript
const setValueMutation = useMutation({
  mutationFn: async ({ value, notes }) => {
    const response = await fetch(`/api/production-orders/${id}/set-value`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, notes }),
    });
    if (!response.ok) throw new Error("Erro ao definir valor");
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
    toast({ title: "Valor definido com sucesso!" });
  }
});
```

#### 4.3 Status Timeline do Produtor

Estados disponíveis:
1. `pending` → Aguardando aceitação
2. `accepted` → Aceito pelo produtor
3. `production` → Em produção
4. `quality_check` → Controle de qualidade
5. `ready` → Pronto para envio
6. `shipped` → Enviado (requer código de rastreamento)
7. `delivered` → Entregue
8. `completed` → Finalizado
9. `rejected` → Rejeitado

**Ações por Status:**

- **`pending`:**
  - "Aceitar Ordem" → `status: 'accepted'`
  - "Rejeitar" → `status: 'rejected'` (com observação obrigatória)

- **`accepted`:**
  - "Iniciar Produção" → `status: 'production'`

- **`production`:**
  - "Marcar Pronto" → `status: 'ready'`

- **`ready`:**
  - "Marcar Enviado" → `status: 'shipped'` (abre dialog para tracking)

- **`shipped`:**
  - "Marcar Entregue" → `status: 'delivered'`
  - "Finalizar Ordem" → `status: 'completed'`

- **`delivered`:**
  - "Finalizar Ordem" → `status: 'completed'`

**Botões Auxiliares:**
- "Alterar Prazo" → Atualiza `deliveryDeadline`
- "Adicionar Observação" → Adiciona `notes`

---

## 5. ENDPOINTS DA API

### 5.1 Produção e Pagamentos

#### POST `/api/production-orders/:id/set-value`
Define o valor que o produtor cobrará pela produção.

**Request Body:**
```json
{
  "value": "1500.00",
  "notes": "Materiais: madeira, verniz, etc."
}
```

**Processo:**
1. Valida que `value` existe
2. Busca production order por ID
3. Chama `storage.updateProductionOrderValue(id, value, notes)`
4. Cria ou atualiza `producer_payment`:
   - Se já existe: atualiza `amount` e `notes`
   - Se não existe: cria novo com `status: 'pending'`
5. Retorna: `{ success: true, productionOrder: {...} }`

**Código:**
```javascript
app.post("/api/production-orders/:id/set-value", async (req, res) => {
  const { id } = req.params;
  const { value, notes } = req.body;

  if (!value) {
    return res.status(400).json({ error: "Valor é obrigatório" });
  }

  const productionOrder = await storage.getProductionOrder(id);
  if (!productionOrder) {
    return res.status(404).json({ error: "Ordem de produção não encontrada" });
  }

  const updated = await storage.updateProductionOrderValue(id, value, notes || undefined);

  const existingPayments = await storage.getProducerPaymentsByProducer(productionOrder.producerId);
  const existingPayment = existingPayments.find(p => p.productionOrderId === id);

  if (existingPayment) {
    await storage.updateProducerPayment(existingPayment.id, {
      amount: value,
      notes: notes || null
    });
  } else {
    await storage.createProducerPayment({
      productionOrderId: id,
      producerId: productionOrder.producerId,
      amount: value,
      status: 'pending',
      notes: notes || null
    });
  }

  res.json({ success: true, productionOrder: updated });
});
```

#### PATCH `/api/production-orders/:id/status`
Atualiza o status de uma ordem de produção.

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Produto concluído",
  "trackingCode": "BR123456789",
  "deliveryDate": "2025-10-15"
}
```

**Validação Zod:**
```javascript
const updateStatusSchema = z.object({
  status: z.enum([
    'pending', 'accepted', 'production', 'quality_check',
    'ready', 'completed', 'shipped', 'delivered'
  ]),
  notes: z.string().optional(),
  deliveryDate: z.string().optional(),
  trackingCode: z.string().optional(),
}).refine(
  (data) => {
    if (['completed', 'shipped', 'delivered'].includes(data.status)) {
      return !!data.trackingCode;
    }
    return true;
  },
  {
    message: "Código de rastreamento é obrigatório para pedidos concluídos, enviados ou entregues",
    path: ["trackingCode"],
  }
);
```

**Código Completo:**
```javascript
app.patch("/api/production-orders/:id/status", async (req, res) => {
  const { id } = req.params;

  const validationResult = updateStatusSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ 
      error: validationResult.error.errors[0]?.message || "Dados inválidos" 
    });
  }

  const { status, notes, deliveryDate, trackingCode } = validationResult.data;

  const productionOrder = await storage.getProductionOrder(id);
  if (!productionOrder) {
    return res.status(404).json({ error: "Ordem de produção não encontrada" });
  }

  const updated = await storage.updateProductionOrderStatus(
    id, 
    status, 
    notes || undefined, 
    deliveryDate || undefined, 
    trackingCode || undefined
  );

  res.json({ success: true, productionOrder: updated });
});
```

#### GET `/api/producer-payments`
Lista todos os pagamentos de produtores.

**Response:**
```json
[
  {
    "id": "uuid",
    "productionOrderId": "uuid",
    "producerId": "uuid",
    "producerName": "Marcenaria Santos",
    "amount": "1500.00",
    "status": "pending",
    "notes": "Materiais inclusos",
    "createdAt": "2025-10-06T...",
    "order": {
      "orderNumber": "#12345",
      "product": "Mesa de Jantar",
      ...
    }
  }
]
```

#### PATCH `/api/producer-payments/:id`
Atualiza um pagamento de produtor (aprovar, rejeitar, marcar como pago).

**Request Body (Aprovar):**
```json
{
  "status": "approved",
  "approvedBy": "admin-1"
}
```

**Request Body (Marcar como Pago):**
```json
{
  "status": "paid",
  "paidBy": "admin-1",
  "paymentMethod": "pix",
  "notes": "Pago via PIX"
}
```

#### POST `/api/upload-ofx`
Importa arquivo OFX do banco.

**Request:** `multipart/form-data` com arquivo `.ofx`

**Response:**
```json
{
  "message": "15 transações importadas",
  "transactionsImported": 15
}
```

### 5.2 Conciliação Bancária

#### GET `/api/finance/bank-transactions`
Lista transações bancárias importadas via OFX.

**Response:**
```json
[
  {
    "id": "uuid",
    "importId": "uuid",
    "date": "2025-10-06",
    "amount": "-1500.00",
    "description": "PAGTO PRODUTOR",
    "bankRef": "DOC123456",
    "status": "unmatched",
    "matchedPaymentId": null,
    "reconciled": false
  }
]
```

#### PATCH `/api/finance/bank-transactions/:id`
Atualiza transação bancária (conciliação).

**Request Body:**
```json
{
  "status": "matched",
  "matchedPaymentId": "payment-uuid",
  "reconciled": true
}
```

#### GET `/api/finance/bank-imports`
Lista histórico de importações OFX.

**Response:**
```json
[
  {
    "id": "uuid",
    "filename": "extrato_10_2025.ofx",
    "transactionsImported": 15,
    "importedAt": "2025-10-06T...",
    "importedBy": "admin-1"
  }
]
```

---

## 6. ESTRUTURA DO BANCO DE DADOS

### 6.1 Tabela: `production_orders`

```sql
CREATE TABLE production_orders (
  id VARCHAR PRIMARY KEY,
  order_id VARCHAR NOT NULL REFERENCES orders(id),
  producer_id VARCHAR NOT NULL REFERENCES users(id),
  status VARCHAR NOT NULL,
  deadline TIMESTAMP,
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  delivery_deadline TIMESTAMP,
  has_unread_notes BOOLEAN DEFAULT false,
  last_note_at TIMESTAMP,
  tracking_code VARCHAR,
  shipping_address TEXT,
  producer_value NUMERIC(10,2),
  producer_payment_status VARCHAR DEFAULT 'pending',
  producer_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Campos Críticos:**
- `producer_value`: Valor definido pelo produtor
- `producer_payment_status`: Status do pagamento (`pending`, `paid`)
- `producer_notes`: Observações do produtor sobre custos
- `tracking_code`: Código de rastreamento (obrigatório para completed/shipped/delivered)

### 6.2 Tabela: `producer_payments`

```sql
CREATE TABLE producer_payments (
  id VARCHAR PRIMARY KEY,
  production_order_id VARCHAR NOT NULL REFERENCES production_orders(id),
  producer_id VARCHAR NOT NULL REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  status VARCHAR NOT NULL, -- pending, approved, paid, rejected
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  paid_by VARCHAR REFERENCES users(id),
  paid_at TIMESTAMP,
  payment_method VARCHAR,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fluxo de Status:**
1. `pending` → Aguardando aprovação do admin
2. `approved` → Aprovado, aguardando pagamento
3. `paid` → Pago e finalizado
4. `rejected` → Rejeitado pelo admin

### 6.3 Tabela: `bank_transactions`

```sql
CREATE TABLE bank_transactions (
  id VARCHAR PRIMARY KEY,
  import_id VARCHAR NOT NULL REFERENCES bank_imports(id),
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  bank_ref VARCHAR,
  status VARCHAR DEFAULT 'unmatched', -- unmatched, matched
  matched_payment_id VARCHAR REFERENCES producer_payments(id),
  reconciled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Para Conciliação:**
- Buscar: `amount < 0` (saídas) e `status = 'unmatched'`
- Tolerância: ±5% do valor do pagamento
- Após conciliar: `status = 'matched'`, `reconciled = true`

### 6.4 Tabela: `bank_imports`

```sql
CREATE TABLE bank_imports (
  id VARCHAR PRIMARY KEY,
  filename VARCHAR NOT NULL,
  transactions_imported INTEGER DEFAULT 0,
  imported_by VARCHAR REFERENCES users(id),
  imported_at TIMESTAMP DEFAULT NOW()
);
```

### 6.5 Tabela: `payment_methods`

```sql
CREATE TABLE payment_methods (
  id VARCHAR PRIMARY KEY,
  name TEXT NOT NULL,
  type VARCHAR NOT NULL, -- instant, credit_card, bank_slip, cash, bank_transfer
  max_installments INTEGER DEFAULT 1,
  installment_interest NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Dados Iniciais:**
```sql
INSERT INTO payment_methods (name, type, max_installments) VALUES
('PIX', 'instant', 1),
('Cartão de Crédito', 'credit_card', 12),
('Boleto Bancário', 'bank_slip', 1),
('Dinheiro', 'cash', 1),
('Transferência Bancária', 'bank_transfer', 1);
```

### 6.6 Tabela: `shipping_methods`

```sql
CREATE TABLE shipping_methods (
  id VARCHAR PRIMARY KEY,
  name TEXT NOT NULL,
  type VARCHAR NOT NULL, -- pickup, pac, sedex, carrier, own_delivery
  base_price NUMERIC(10,2) NOT NULL,
  free_shipping_threshold NUMERIC(10,2),
  estimated_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Dados Iniciais:**
```sql
INSERT INTO shipping_methods (name, type, base_price, free_shipping_threshold, estimated_days) VALUES
('Retirada no Local', 'pickup', 0, NULL, 0),
('Correios - PAC', 'pac', 15.00, 200.00, 12),
('Correios - SEDEX', 'sedex', 25.00, NULL, 5),
('Transportadora', 'carrier', 50.00, 500.00, 7),
('Entrega Própria', 'own_delivery', 30.00, 300.00, 3);
```

---

## 7. MÉTODOS DO STORAGE LAYER

### 7.1 Production Orders

```typescript
async updateProductionOrderValue(
  id: string, 
  value: string, 
  notes?: string
): Promise<ProductionOrder | undefined> {
  const po = await this.getProductionOrder(id);
  if (!po) return undefined;

  const [updated] = await db.update(schema.productionOrders)
    .set({
      producerValue: value,
      producerNotes: notes || po.producerNotes,
      producerPaymentStatus: 'pending'
    })
    .where(eq(schema.productionOrders.id, id))
    .returning();
  
  return updated;
}

async updateProductionOrderStatus(
  id: string, 
  status: string, 
  notes?: string, 
  deliveryDate?: string, 
  trackingCode?: string
): Promise<ProductionOrder | undefined> {
  const po = await this.getProductionOrder(id);
  if (!po) return undefined;

  const updates: any = {
    status: status === 'unchanged' ? po.status : status,
    notes: notes || po.notes,
    trackingCode: trackingCode || po.trackingCode,
  };

  if (notes) {
    updates.hasUnreadNotes = true;
    updates.lastNoteAt = new Date();
  }

  if (status === 'accepted' && !po.acceptedAt) {
    updates.acceptedAt = new Date();
  }

  if (['completed', 'shipped', 'delivered'].includes(status) && !po.completedAt) {
    updates.completedAt = new Date();
  }

  if (deliveryDate) {
    updates.deliveryDeadline = new Date(deliveryDate);
  }

  const [updated] = await db.update(schema.productionOrders)
    .set(updates)
    .where(eq(schema.productionOrders.id, id))
    .returning();
  
  return updated;
}
```

### 7.2 Producer Payments

```typescript
async getProducerPaymentsByProducer(producerId: string): Promise<ProducerPayment[]> {
  return await db.select().from(schema.producerPayments)
    .where(eq(schema.producerPayments.producerId, producerId));
}

async createProducerPayment(payment: InsertProducerPayment): Promise<ProducerPayment> {
  const [created] = await db.insert(schema.producerPayments)
    .values(payment)
    .returning();
  return created;
}

async updateProducerPayment(id: string, data: Partial<ProducerPayment>): Promise<ProducerPayment> {
  const [updated] = await db.update(schema.producerPayments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.producerPayments.id, id))
    .returning();
  return updated;
}
```

---

## 8. FLUXO COMPLETO DO PROCESSO

### 8.1 Fluxo de Pagamento ao Produtor

```
1. PEDIDO CRIADO
   ↓
2. CONVERTIDO PARA ORDEM DE PRODUÇÃO
   - Status: pending
   - producer_value: null
   ↓
3. PRODUTOR ACEITA E DEFINE VALOR
   - POST /api/production-orders/:id/set-value
   - producer_value: "1500.00"
   - Cria producer_payment com status: 'pending'
   ↓
4. ADMIN APROVA PAGAMENTO
   - PATCH /api/producer-payments/:id
   - status: 'approved'
   - approvedBy: admin-1
   ↓
5. OPÇÃO A: PAGAMENTO MANUAL
   - Admin clica "Marcar como Pago"
   - Informa método de pagamento
   - status: 'paid'
   
   OPÇÃO B: CONCILIAÇÃO BANCÁRIA
   - Admin importa OFX
   - Sistema lista transações não conciliadas
   - Admin seleciona transação compatível
   - Sistema concilia automaticamente
   - status: 'paid'
   ↓
6. PRODUÇÃO CONTINUA
   - Status: production → ready → shipped → completed
   - tracking_code obrigatório para shipped/completed
```

### 8.2 Validações Críticas

1. **Tracking Code Obrigatório:**
   - Status `completed`, `shipped`, `delivered` requerem `trackingCode`
   - Validação feita por Zod no endpoint PATCH

2. **Valor do Produtor:**
   - Pode ser definido a qualquer momento
   - Cria automaticamente `producer_payment` com status `pending`
   - Se já existe pagamento, apenas atualiza o valor

3. **Conciliação Bancária:**
   - Tolerância de 5% para matching
   - Apenas transações `unmatched` e negativas (saídas)
   - Após conciliar, marca transação e pagamento automaticamente

---

## 9. COMPONENTES REUTILIZÁVEIS

### 9.1 Status Badges

```tsx
const getStatusBadge = (status: string) => {
  const statusMap = {
    pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
    approved: { label: "Aprovado", color: "bg-blue-100 text-blue-800" },
    paid: { label: "Pago", color: "bg-green-100 text-green-800" },
    rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800" },
  };

  const info = statusMap[status] || statusMap.pending;

  return (
    <Badge className={`${info.color} border-0`}>
      {info.label}
    </Badge>
  );
};
```

### 9.2 Formatação de Moeda

```tsx
const formatCurrency = (value: string | number) => {
  return parseFloat(value.toString()).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Uso: R$ {formatCurrency(amount)}
```

### 9.3 Formatação de Data

```tsx
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('pt-BR');
};

const formatDateTime = (date: string | Date) => {
  return new Date(date).toLocaleString('pt-BR');
};
```

---

## 10. QUERIES E MUTATIONS REACT QUERY

### 10.1 Queries Principais

```typescript
// Listar pagamentos de produtores
const { data: producerPayments } = useQuery({
  queryKey: ["/api/producer-payments"],
});

// Listar transações bancárias
const { data: bankTransactions } = useQuery({
  queryKey: ["/api/finance/bank-transactions"],
});

// Detalhes de ordem de produção
const { data: productionOrder } = useQuery({
  queryKey: ["/api/production-orders", id],
  enabled: !!id,
});

// Overview financeiro
const { data: overview } = useQuery({
  queryKey: ["/api/finance/overview"],
});
```

### 10.2 Mutations Principais

```typescript
// Atualizar pagamento
const updatePaymentMutation = useMutation({
  mutationFn: async (data: any) => {
    const response = await fetch(`/api/producer-payments/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Erro ao atualizar");
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/producer-payments"] });
  },
});

// Upload OFX
const uploadOFXMutation = useMutation({
  mutationFn: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload-ofx", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Erro ao importar");
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/producer-payments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/finance/bank-transactions"] });
  },
});

// Atualizar status de produção
const updateStatusMutation = useMutation({
  mutationFn: async ({ status, notes, trackingCode }) => {
    const response = await fetch(`/api/production-orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes, trackingCode }),
    });
    if (!response.ok) throw new Error("Erro ao atualizar");
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
  },
});
```

---

## 11. OBSERVAÇÕES IMPORTANTES

### 11.1 Segurança
- Todos os endpoints devem ter autenticação
- `paidBy` e `approvedBy` devem vir do contexto de autenticação, não do body
- Validação de permissões por role (admin pode aprovar, produtor pode definir valor)

### 11.2 Validações
- Tracking code é OBRIGATÓRIO para status finais
- Valor deve ser numérico positivo
- Status deve seguir enum definido
- Conciliação só funciona com transações negativas (saídas)

### 11.3 Performance
- Queries invalidadas após mutations para refresh automático
- Filtros client-side para performance (status, busca)
- Tabelas paginadas para grandes volumes

### 11.4 UX
- Loading states em todas mutations
- Toast notifications de sucesso/erro
- Confirmação para ações destrutivas (rejeitar)
- Badges coloridos por status para fácil identificação

---

## 12. CHECKLIST DE RESTAURAÇÃO PÓS-ROLLBACK

### Frontend:
- [ ] `client/src/pages/finance/index.tsx` - Dashboard principal
- [ ] `client/src/pages/admin/finance.tsx` - Visão admin
- [ ] `client/src/pages/admin/producer-payments.tsx` - Pagamentos produtores
- [ ] `client/src/pages/producer/order-details.tsx` - Detalhes e inserção de valor

### Backend:
- [ ] Endpoint: `POST /api/production-orders/:id/set-value`
- [ ] Endpoint: `PATCH /api/production-orders/:id/status` (com validação Zod)
- [ ] Endpoint: `GET /api/producer-payments`
- [ ] Endpoint: `PATCH /api/producer-payments/:id`
- [ ] Endpoint: `POST /api/upload-ofx`
- [ ] Endpoint: `GET /api/finance/bank-transactions`
- [ ] Endpoint: `PATCH /api/finance/bank-transactions/:id`

### Database:
- [ ] Tabela `production_orders` com campos: `producer_value`, `producer_notes`
- [ ] Tabela `producer_payments` completa
- [ ] Tabela `bank_transactions` completa
- [ ] Tabela `bank_imports` completa
- [ ] Tabela `payment_methods` com dados
- [ ] Tabela `shipping_methods` com dados

### Storage Layer:
- [ ] `updateProductionOrderValue()`
- [ ] `updateProductionOrderStatus()`
- [ ] `getProducerPaymentsByProducer()`
- [ ] `createProducerPayment()`
- [ ] `updateProducerPayment()`

---

**FIM DA DOCUMENTAÇÃO**

Data de Criação: 06 de Outubro de 2025
Versão: 1.0
Status: Pronto para Rollback
