# Overview

This ERP system manages sales and outsourced production with integrated financial control. It provides role-based interfaces for administrators, vendors, clients, external producers, and finance teams to manage the entire workflow from sales to production, delivery, and payment reconciliation. Key features include vendor-specific sales links, automated client and order registration upon partial payment, distribution of production orders to external producers, and OFX bank file import for payment reconciliation. The system aims to streamline operations, provide real-time updates, and ensure secure, role-based access.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend uses React 18 with TypeScript, built with Vite. It utilizes shadcn/ui and Radix UI primitives, styled with Tailwind CSS. Wouter is used for lightweight client-side routing. State management relies on TanStack React Query for server state and caching. The UI features a panel-based architecture with different dashboards for Admin, Vendor, Client, Producer, and Finance roles.

## Backend Architecture
The backend is built with Express.js and Node.js (ES modules), following a REST API architecture. It includes error handling middleware and request/response logging. A storage abstraction layer (`server/storage.ts`) is used for data operations. The API provides endpoints for dashboard statistics, order management, and role-specific data.

## Data Storage
PostgreSQL is the primary database, managed with Drizzle ORM for interactions and migrations. The schema includes core entities like users, orders, production orders, payments, commissions, and vendors, with UUIDs as primary keys and proper relationships. Development and production databases are separate, with schema synchronization on deployment and distinct data. Production databases are initialized with essential configuration and an admin user.

## Authentication and Authorization
The system implements role-based access control (admin, vendor, client, producer, finance), restricting access to specific panels and functionalities based on the user's role.

# External Dependencies

- **Neon Database**: Serverless PostgreSQL database hosting.
- **OFX File Processing**: For importing bank statements and payment reconciliation.
- **Payment Webhooks**: Integrations for automated payment confirmation.
- **React Query**: For efficient server state management and caching.
- **Drizzle Kit**: For database migrations and schema management.

---

# 🔧 PROBLEMAS CRÍTICOS IDENTIFICADOS - ORÇAMENTOS E PEDIDOS

**Data da Identificação:** 15 de Novembro de 2025  
**Status:** DOCUMENTADO - AGUARDANDO APROVAÇÃO PARA CORREÇÃO

## 📋 Resumo Executivo

Foram identificados 3 problemas críticos que afetam a visualização e edição de orçamentos e pedidos no painel do vendedor:

1. **Items de orçamentos desaparecem** após conversão para pedido
2. **Nome do cliente aparece NULL** nos pedidos convertidos
3. **Produtos não aparecem** ao visualizar/editar orçamentos e pedidos

Esses problemas ocorrem devido a falhas na lógica de conversão de orçamento para pedido e na lógica de atualização de orçamentos.

---

## 🔴 PROBLEMA #1: Items de Orçamentos Desaparecem Após Conversão

### Sintomas Observados
- Orçamento criado com produtos aparece corretamente
- Após conversão para pedido, ao visualizar o orçamento, **não aparecem os produtos** (items: [])
- Ao tentar editar o orçamento, aparece **zerado** sem nenhum produto

### Evidências dos Logs
```
1763179630918.0 - ["Received 3 budgets from API:",[{"id":"3b735439...","items":[{"id":"dbbfd823..."}]}]]
1763179816348.0 - ["Received 3 budgets from API:",[{"id":"3b735439...","status":"converted","items":[]}]]
```

### Causa Raiz
**Arquivo:** `server/routes.ts` (linha 6628)  
**Função:** `PUT /api/budgets/:id`

O endpoint de edição de orçamento executa:
```typescript
// Linha 6628
await storage.deleteBudgetItems(req.params.id);

// Depois tenta recriar com items do body
for (const item of uniqueItems) {
  await storage.createBudgetItem(req.params.id, itemData);
}
```

**O que acontece:**
1. Quando você **edita um orçamento que já foi convertido**, o frontend não envia os items no body da requisição
2. O código **deleta TODOS os items existentes** com `deleteBudgetItems()`
3. Como não há items no body, **nenhum item é recriado**
4. O orçamento fica vazio permanentemente

### Impacto
- ❌ Perda de dados dos produtos do orçamento após conversão
- ❌ Impossibilidade de visualizar o orçamento original
- ❌ Impossibilidade de gerar PDF correto do orçamento
- ❌ Dados históricos comprometidos

---

## 🔴 PROBLEMA #2: Nome do Cliente NULL em Pedidos

### Sintomas Observados
- Ao visualizar um pedido convertido, o campo `clientName` aparece como `null`
- Nos logs: `"clientName":null`

### Evidências dos Logs
```
1763179834607.0 - ["Editing order:",{"orderNumber":"PED-1763179811354","clientName":null,...}]
```

### Causa Raiz
**Arquivo:** `server/storage.pg.ts` (linhas 1252-1285)  
**Função:** `convertBudgetToOrder()`

```typescript
async convertBudgetToOrder(budgetId: string, clientId: string, deliveryDate?: string): Promise<Order> {
  const budget = await this.getBudget(budgetId);
  
  const orderData: InsertOrder = {
    orderNumber: `PED-${Date.now()}`,
    clientId: clientId,          // ✅ Apenas o ID
    vendorId: budget.vendorId,
    contactName: budget.contactName,  // ⚠️ Não é o nome do cliente do cadastro
    // clientName: ???            // ❌ FALTANDO!
  } as InsertOrder;
  
  const order = await this.createOrder(orderData);
  return order;
}
```

**O que está faltando:**
- A função não busca o registro do cliente no banco (`getClient(clientId)`)
- Não popula o campo denormalizado `clientName` com o nome real do cliente cadastrado
- Usa apenas `contactName` do orçamento, que pode ser diferente ou vazio

### Impacto
- ❌ Pedidos aparecem sem identificação clara do cliente
- ❌ Relatórios e listagens ficam incompletos
- ❌ Dificuldade para identificar pedidos visualmente

---

## 🔴 PROBLEMA #3: Produtos Não Aparecem ao Visualizar Pedidos

### Sintomas Observados
- Ao abrir a tela de "Ver Pedido" ou "Editar Pedido", os produtos não são listados
- Similar ao problema #1, mas afeta especificamente a visualização de pedidos

### Causa Raiz
**Arquivos:** `server/storage.pg.ts` (linhas 200-227)  
**Funções:** `getOrders()` e `getOrder()`

Essas funções JÁ TENTAM enriquecer os pedidos com items:
```typescript
async getOrders(): Promise<Order[]> {
  const orders = await pg.select().from(schema.orders);
  
  const enrichedOrders = await Promise.all(orders.map(async (order) => {
    if (order.budgetId) {
      const items = await this.getBudgetItems(order.budgetId);
      return { ...order, items } as any;
    }
    return { ...order, items: [] } as any;
  }));
  
  return enrichedOrders;
}
```

**MAS:** Como o Problema #1 deletou os items do orçamento, `getBudgetItems(order.budgetId)` retorna array vazio!

### Impacto
- ❌ Impossível ver quais produtos estão no pedido
- ❌ Não consegue editar pedidos corretamente
- ❌ PDF de pedidos sai incompleto
- ❌ Produção não sabe o que fabricar

---

## ✅ SOLUÇÕES PLANEJADAS

### SOLUÇÃO #1: Preservar Items do Orçamento Durante Edição

**Arquivo a Modificar:** `server/routes.ts` (aproximadamente linha 6620-6680)  
**Endpoint:** `PUT /api/budgets/:id`

**Mudança Proposta:**
```typescript
// ANTES:
await storage.deleteBudgetItems(req.params.id);
for (const item of uniqueItems) {
  await storage.createBudgetItem(req.params.id, itemData);
}

// DEPOIS:
// Apenas deletar e recriar se items foram enviados no body
if (budgetData.items && budgetData.items.length > 0) {
  await storage.deleteBudgetItems(req.params.id);
  for (const item of uniqueItems) {
    await storage.createBudgetItem(req.params.id, itemData);
  }
} else {
  // Se não há items no body, preservar os existentes
  console.log(`[UPDATE BUDGET] No items in request body, preserving existing items for budget ${req.params.id}`);
}
```

**Benefícios:**
- ✅ Items do orçamento são preservados após conversão
- ✅ Histórico completo mantido
- ✅ Não afeta edições normais de orçamentos (que enviam items)

**Arquivos Impactados:**
- `server/routes.ts` (apenas lógica de atualização de orçamento)

---

### SOLUÇÃO #2: Buscar e Incluir Nome do Cliente na Conversão

**Arquivo a Modificar:** `server/storage.pg.ts` (linhas 1252-1285)  
**Função:** `convertBudgetToOrder()`

**Mudança Proposta:**
```typescript
async convertBudgetToOrder(budgetId: string, clientId: string, deliveryDate?: string): Promise<Order> {
  const budget = await this.getBudget(budgetId);
  if (!budget) throw new Error('Budget not found');
  
  // NOVO: Buscar dados completos do cliente
  const client = await this.getClient(clientId);
  const clientName = client?.name || budget.contactName || 'Cliente não identificado';

  const parsedDeliveryDate = deliveryDate ? new Date(deliveryDate) : null;

  const orderData: InsertOrder = {
    orderNumber: `PED-${Date.now()}`,
    clientId: clientId,
    clientName: clientName,  // ✅ ADICIONAR este campo
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

**Benefícios:**
- ✅ Pedidos criados com nome do cliente preenchido
- ✅ Fallback para contactName se cliente não encontrado
- ✅ Mantém compatibilidade com sistema existente

**Arquivos Impactados:**
- `server/storage.pg.ts` (apenas função de conversão)

---

### SOLUÇÃO #3: Garantia de Exibição de Items em Pedidos

**Status:** NÃO REQUER MODIFICAÇÃO

A lógica atual em `getOrders()` e `getOrder()` já está correta:
- Busca items via `getBudgetItems(order.budgetId)` 
- Retorna items junto com o pedido

Ao implementar a **Solução #1**, os items estarão preservados no banco e serão retornados corretamente.

**Benefícios:**
- ✅ Nenhuma mudança adicional necessária
- ✅ Sistema funciona corretamente após Solução #1

---

## 🧪 PLANO DE TESTES

Após implementar as soluções, executar o seguinte fluxo de testes:

### Teste 1: Criar e Converter Orçamento
1. Login como vendedor
2. Criar novo orçamento com 2-3 produtos
3. Salvar e verificar que produtos aparecem
4. Converter orçamento para pedido
5. **VERIFICAR:** Orçamento ainda mostra os produtos ✅
6. **VERIFICAR:** Pedido mostra os produtos ✅
7. **VERIFICAR:** Nome do cliente aparece no pedido ✅

### Teste 2: Editar Orçamento Convertido
1. Abrir orçamento que foi convertido
2. Clicar em "Editar Orçamento"
3. **VERIFICAR:** Produtos aparecem na tela de edição ✅
4. Alterar apenas o título (não mexer nos produtos)
5. Salvar
6. **VERIFICAR:** Produtos continuam visíveis ✅

### Teste 3: Visualizar e Editar Pedido
1. Abrir pedido criado na conversão
2. **VERIFICAR:** Nome do cliente aparece ✅
3. **VERIFICAR:** Produtos listados corretamente ✅
4. Clicar em "Editar Pedido"
5. **VERIFICAR:** Produtos aparecem no formulário ✅

### Teste 4: Gerar PDFs
1. Gerar PDF do orçamento convertido
2. **VERIFICAR:** Produtos aparecem no PDF ✅
3. Gerar PDF do pedido
4. **VERIFICAR:** Produtos e nome do cliente aparecem ✅

---

## 📁 ARQUIVOS QUE SERÃO MODIFICADOS

### Modificações Obrigatórias
1. **`server/routes.ts`** (linhas ~6620-6680)
   - Endpoint: `PUT /api/budgets/:id`
   - Mudança: Condicional para preservar items quando body vazio

2. **`server/storage.pg.ts`** (linhas 1252-1285)
   - Função: `convertBudgetToOrder()`
   - Mudança: Buscar cliente e preencher clientName

### Arquivos NÃO Modificados
- ❌ `server/storage.pg.ts` - funções `getOrders()` e `getOrder()` (já estão corretas)
- ❌ `shared/schema.ts` (schema do banco já tem os campos necessários)
- ❌ Frontend (componentes já estão preparados para receber os dados)
- ❌ Outras rotas ou endpoints

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

### Segurança dos Dados
- ✅ As modificações NÃO deletam dados existentes
- ✅ Apenas PRESERVAM dados que estariam sendo deletados incorretamente
- ✅ Não afeta orçamentos que ainda não foram convertidos

### Compatibilidade
- ✅ Mudanças são retrocompatíveis
- ✅ Orçamentos novos continuam funcionando normalmente
- ✅ Edições normais de orçamentos não são afetadas

### Performance
- ✅ Uma query adicional (`getClient()`) na conversão - impacto mínimo
- ✅ Nenhuma mudança em queries existentes
- ✅ Sem impacto na performance geral do sistema

---

## 🎯 RESUMO FINAL

| Problema | Causa | Solução | Impacto |
|----------|-------|---------|---------|
| Items desaparecem | `deleteBudgetItems()` sempre deleta | Adicionar condicional | Baixo - 1 endpoint |
| Cliente NULL | `convertBudgetToOrder()` não busca cliente | Buscar dados do cliente | Baixo - 1 função |
| Produtos não aparecem | Consequência do problema 1 | Automático com solução 1 | Nenhum |

**Total de linhas a modificar:** ~15 linhas em 2 arquivos  
**Risco:** Baixo  
**Tempo estimado:** 10-15 minutos  
**Testes necessários:** 4 cenários principais

---

## 📝 NOTAS PARA MANUTENÇÃO FUTURA

### Como Evitar que Esses Problemas Voltem

1. **Ao modificar endpoints de atualização (PUT/PATCH):**
   - Sempre verificar se dados relacionados devem ser preservados
   - Não deletar dados automaticamente sem verificar o contexto
   - Logar quando dados importantes estão sendo modificados

2. **Ao criar conversões entre entidades:**
   - Sempre buscar dados completos das entidades relacionadas
   - Preencher campos denormalizados (como clientName)
   - Documentar quais campos são obrigatórios

3. **Ao testar novos recursos:**
   - Testar o ciclo completo (criar → converter → editar → visualizar)
   - Verificar PDFs e relatórios
   - Validar dados históricos após operações

### Checklist de Revisão de Código
- [ ] Conversões preservam dados relacionados?
- [ ] Campos denormalizados são preenchidos?
- [ ] Items/relacionamentos são mantidos após operações?
- [ ] Logs adequados para debug?
- [ ] Testes cobrem ciclo completo?

---

**FIM DO DOCUMENTO DE PROBLEMAS E SOLUÇÕES**
