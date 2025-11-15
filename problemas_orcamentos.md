# 🔧 PROBLEMAS E CORREÇÕES - ORÇAMENTOS E PEDIDOS

**Data:** 15 de Novembro de 2025  
**Status:** AGUARDANDO APROVAÇÃO PARA EXECUTAR

---

## 📋 PROBLEMAS IDENTIFICADOS

### PROBLEMA 1: Ao VER orçamento, produtos não aparecem
- **Sintoma:** Lista de orçamentos mostra items vazios `items: []`
- **Local:** Endpoint GET `/api/budgets/vendor/:vendorId`
- **Causa:** Após conversão para pedido, items do orçamento são deletados

### PROBLEMA 2: Ao EDITAR orçamento, aparecem campos zerados
- **Sintoma:** Formulário de edição abre sem produtos, tudo vazio
- **Local:** Formulário de edição de orçamento (frontend recebe `items: []`)
- **Causa:** Mesma do Problema 1 - items foram deletados

### PROBLEMA 3: Ao VER pedido, produtos não aparecem
- **Sintoma:** Detalhes do pedido não mostram os produtos
- **Local:** Páginas de visualização e edição de pedidos
- **Causa:** Pedido referencia orçamento via `budgetId`, mas items do orçamento foram deletados

### PROBLEMA 4: Nome do cliente NULL em pedidos
- **Sintoma:** Pedidos mostram `clientName: null`
- **Local:** Ao converter orçamento para pedido
- **Causa:** Função de conversão não busca nome do cliente do banco

---

## 🛠️ CORREÇÕES QUE SERÃO FEITAS

### CORREÇÃO 1: Preservar items ao editar orçamento

**Arquivo:** `server/routes.ts`  
**Localização:** Linha aproximada 6628  
**Endpoint:** `PUT /api/budgets/:id`

**CÓDIGO ATUAL (PROBLEMÁTICO):**
```typescript
app.put("/api/budgets/:id", requireAuth, async (req, res) => {
  try {
    const budgetData = req.body;
    const updatedBudget = await storage.updateBudget(req.params.id, budgetData);

    // ❌ PROBLEMA: Sempre deleta items, mesmo quando não vem no body
    await storage.deleteBudgetItems(req.params.id);

    // Remove duplicate items before processing
    const seenItems = new Set();
    const uniqueItems = budgetData.items.filter(item => {
      const itemKey = `${item.productId}-${item.producerId || 'internal'}-${item.quantity}-${item.unitPrice}`;
      if (seenItems.has(itemKey)) {
        console.log(`[CREATE BUDGET] Removing duplicate budget update item: ${item.productName} (${itemKey})`);
        return false;
      }
      seenItems.add(itemKey);
      return true;
    });

    console.log(`Processing ${uniqueItems.length} unique budget update items`);

    for (const item of uniqueItems) {
      await storage.createBudgetItem(req.params.id, {
        productId: item.productId,
        producerId: item.producerId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        // ... outros campos
      });
    }

    res.json(updatedBudget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**CÓDIGO CORRIGIDO:**
```typescript
app.put("/api/budgets/:id", requireAuth, async (req, res) => {
  try {
    const budgetData = req.body;
    const updatedBudget = await storage.updateBudget(req.params.id, budgetData);

    // ✅ SOLUÇÃO: Só deletar e recriar se items foram enviados no body
    if (budgetData.items && budgetData.items.length > 0) {
      console.log(`[UPDATE BUDGET] Updating ${budgetData.items.length} items for budget ${req.params.id}`);
      
      await storage.deleteBudgetItems(req.params.id);

      // Remove duplicate items before processing
      const seenItems = new Set();
      const uniqueItems = budgetData.items.filter(item => {
        const itemKey = `${item.productId}-${item.producerId || 'internal'}-${item.quantity}-${item.unitPrice}`;
        if (seenItems.has(itemKey)) {
          console.log(`[CREATE BUDGET] Removing duplicate budget update item: ${item.productName} (${itemKey})`);
          return false;
        }
        seenItems.add(itemKey);
        return true;
      });

      console.log(`Processing ${uniqueItems.length} unique budget update items`);

      for (const item of uniqueItems) {
        await storage.createBudgetItem(req.params.id, {
          productId: item.productId,
          producerId: item.producerId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          // ... outros campos
        });
      }
    } else {
      // ✅ NOVO: Se não há items no body, preservar os existentes
      console.log(`[UPDATE BUDGET] No items in request body, preserving existing items for budget ${req.params.id}`);
    }

    res.json(updatedBudget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**O QUE MUDA:**
- Adiciono um `if` que verifica se há items no body
- Se SIM: comportamento normal (deleta e recria)
- Se NÃO: não faz nada, preserva items existentes
- Adiciono logs para debug

---

### CORREÇÃO 2: Incluir nome do cliente ao converter para pedido

**Arquivo:** `server/storage.pg.ts`  
**Localização:** Linhas 1252-1285  
**Função:** `convertBudgetToOrder()`

**CÓDIGO ATUAL (PROBLEMÁTICO):**
```typescript
async convertBudgetToOrder(budgetId: string, clientId: string, deliveryDate?: string): Promise<Order> {
  const budget = await this.getBudget(budgetId);
  if (!budget) throw new Error('Budget not found');

  const parsedDeliveryDate = deliveryDate ? new Date(deliveryDate) : null;

  // ❌ PROBLEMA: Não busca dados do cliente, clientName fica undefined/null
  const orderData: InsertOrder = {
    orderNumber: `PED-${Date.now()}`,
    clientId: clientId,
    vendorId: budget.vendorId,
    branchId: budget.branchId,
    budgetId: budget.id,
    product: budget.title,
    description: budget.description,
    totalValue: budget.totalValue,
    paidValue: "0.00",
    status: 'pending',
    contactName: budget.contactName,
    contactPhone: budget.contactPhone,
    contactEmail: budget.contactEmail,
    deliveryType: budget.deliveryType,
    deliveryDeadline: parsedDeliveryDate,
    deadline: parsedDeliveryDate
  } as InsertOrder;

  const order = await this.createOrder(orderData);
  await this.updateBudget(budgetId, { status: 'converted' });
  
  return order;
}
```

**CÓDIGO CORRIGIDO:**
```typescript
async convertBudgetToOrder(budgetId: string, clientId: string, deliveryDate?: string): Promise<Order> {
  const budget = await this.getBudget(budgetId);
  if (!budget) throw new Error('Budget not found');

  // ✅ SOLUÇÃO: Buscar dados completos do cliente
  const client = await this.getClient(clientId);
  const clientName = client?.name || budget.contactName || 'Cliente não identificado';
  
  console.log(`[CONVERT BUDGET] Converting budget ${budgetId} to order for client: ${clientName} (ID: ${clientId})`);

  const parsedDeliveryDate = deliveryDate ? new Date(deliveryDate) : null;

  const orderData: InsertOrder = {
    orderNumber: `PED-${Date.now()}`,
    clientId: clientId,
    clientName: clientName,  // ✅ NOVO: Campo preenchido com nome do cliente
    vendorId: budget.vendorId,
    branchId: budget.branchId,
    budgetId: budget.id,
    product: budget.title,
    description: budget.description,
    totalValue: budget.totalValue,
    paidValue: "0.00",
    status: 'pending',
    contactName: budget.contactName,
    contactPhone: budget.contactPhone,
    contactEmail: budget.contactEmail,
    deliveryType: budget.deliveryType,
    deliveryDeadline: parsedDeliveryDate,
    deadline: parsedDeliveryDate
  } as InsertOrder;

  const order = await this.createOrder(orderData);
  await this.updateBudget(budgetId, { status: 'converted' });
  
  return order;
}
```

**O QUE MUDA:**
- Adiciono `const client = await this.getClient(clientId)` para buscar dados do cliente
- Adiciono `const clientName = ...` com fallback para contactName
- Adiciono `clientName: clientName` no orderData
- Adiciono log para debug

---

## 📊 RESUMO DAS MUDANÇAS

| Arquivo | Função/Endpoint | Linhas Modificadas | O que muda |
|---------|-----------------|-------------------|------------|
| `server/routes.ts` | `PUT /api/budgets/:id` | ~15 linhas | Adiciona condicional `if` para preservar items |
| `server/storage.pg.ts` | `convertBudgetToOrder()` | ~5 linhas | Busca cliente e preenche clientName |

**Total:** 2 arquivos, ~20 linhas modificadas

---

## ✅ RESULTADO ESPERADO

Após as correções:

### ✅ Ver Orçamento
- Lista de orçamentos mostra produtos corretamente
- Items aparecem com todas as informações
- Funciona mesmo após conversão para pedido

### ✅ Editar Orçamento
- Formulário abre com todos os produtos preenchidos
- Dados corretos em todos os campos
- Funciona mesmo após conversão para pedido

### ✅ Ver Pedido
- Detalhes do pedido mostram todos os produtos
- Nome do cliente aparece corretamente
- Items listados com informações completas

### ✅ Editar Pedido
- Formulário abre com produtos preenchidos
- Nome do cliente visível
- Dados corretos

### ✅ PDFs
- PDF de orçamento mostra produtos
- PDF de pedido mostra produtos e cliente

---

## 🧪 TESTES A EXECUTAR

Após implementar as correções, testarei:

1. **Criar orçamento** → verificar produtos aparecem
2. **Converter para pedido** → verificar nome cliente e produtos
3. **Ver orçamento convertido** → verificar produtos ainda aparecem
4. **Editar orçamento convertido** → verificar campos preenchidos
5. **Ver pedido** → verificar produtos e nome cliente
6. **Editar pedido** → verificar campos preenchidos
7. **Gerar PDF orçamento** → verificar produtos no PDF
8. **Gerar PDF pedido** → verificar produtos e cliente no PDF

---

## ⚠️ IMPORTANTE

- ✅ Não afeta orçamentos que não foram convertidos
- ✅ Não afeta criação de novos orçamentos
- ✅ Não deleta nenhum dado existente
- ✅ Apenas PRESERVA dados que estavam sendo deletados incorretamente
- ✅ Compatível com sistema atual
- ✅ Sem impacto em outras funcionalidades

---

**PRONTO PARA EXECUTAR QUANDO APROVADO**
