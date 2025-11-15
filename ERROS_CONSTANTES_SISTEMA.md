
# Erros Constantes do Sistema - Documentação

## 1. Erro de Edição de Orçamentos/Pedidos - Valores Zerados no Formulário

### Descrição do Erro
Ao clicar em "Editar" em orçamentos ou pedidos, o formulário abre mas os valores dos itens aparecem zerados ou vazios, mesmo que o orçamento/pedido tenha items salvos no banco.

### Quando Ocorre
- Ao tentar editar orçamentos existentes (Admin e Vendor)
- Ao tentar editar pedidos existentes (Admin e Vendor)
- Items aparecem vazios mesmo tendo dados salvos
- Totais calculados ficam zerados

### Causa Raiz
**PADRÃO DE DADOS DIFERENTES ENTRE ENDPOINTS:**

- **GET /api/budgets** (listagem) retorna orçamentos **SEM** os items completos, apenas `itemCount`
- **GET /api/budgets/:id** (detalhes) retorna orçamento **COM** items completos

- **GET /api/orders** (listagem) retorna pedidos **SEM** os items completos, apenas `itemCount`
- **GET /api/orders/:id** (detalhes) retorna pedido **COM** items completos

Quando o código de edição usa o objeto da **lista** (que não tem items), o formulário é preenchido com arrays vazios.

### Arquivos Envolvidos
- `client/src/pages/admin/budgets.tsx` - handleEditBudget()
- `client/src/pages/vendor/budgets.tsx` - handleEditBudget()
- `client/src/pages/admin/orders.tsx` - handleEditOrder()
- `client/src/pages/vendor/orders.tsx` - handleEditOrder()
- `server/routes.ts` - Endpoints de listagem vs detalhes

### Status
🔴 **CRÍTICO** - Erro recorrente que impede edição correta de orçamentos e pedidos

### Solução Aplicada
**SEMPRE buscar o registro completo via GET /api/{budgets|orders}/:id antes de abrir o modo de edição:**

```typescript
// ❌ ERRADO - Usar dados da lista
const handleEditBudget = (budget: any) => {
  setFormData(budget); // budget.items será undefined ou vazio
  setIsEditMode(true);
};

// ✅ CORRETO - Buscar dados completos primeiro
const handleEditBudget = async (budget: any) => {
  try {
    const response = await fetch(`/api/budgets/${budget.id}`);
    if (!response.ok) throw new Error('Erro ao buscar orçamento');
    const fullBudget = await response.json();
    
    setFormData(fullBudget); // fullBudget.items terá todos os dados
    setIsEditMode(true);
  } catch (error) {
    toast({
      title: "Erro",
      description: "Erro ao carregar para edição",
      variant: "destructive",
    });
  }
};
```

### Prevenção Futura
1. **Nunca use dados da listagem para edição** - Sempre fazer fetch do endpoint de detalhes
2. **Padrão para edição:**
   - Listagem → Apenas para exibir
   - Detalhes → Para editar ou visualizar completo
3. **Criar hooks utilitários** (futuramente):
   - `useBudgetForEdit(id)` que sempre busca dados completos
   - `useOrderForEdit(id)` que sempre busca dados completos

### Como Reproduzir (Para Testar)
1. Ir em Orçamentos ou Pedidos (Admin ou Vendor)
2. Clicar em "Editar" em um registro existente
3. Verificar se os items e valores aparecem corretamente preenchidos
4. Verificar se os totais estão corretos

### Log de Correções Deste Erro
| Data | Arquivos Corrigidos | Status |
|------|---------------------|--------|
| Nov 15, 2025 | admin/budgets.tsx, vendor/budgets.tsx | ✅ Corrigido |
| Nov 15, 2025 | admin/orders.tsx, vendor/orders.tsx | ✅ Corrigido |

---

## 2. Erro de Criação de Orçamentos - TypeError: value.toISOString is not a function

### Descrição do Erro
```
Error creating budget: TypeError: value.toISOString is not a function
    at PgTimestamp.mapToDriverValue (/home/runner/workspace/node_modules/src/pg-core/columns/timestamp.ts:66:16)
```

### Quando Ocorre
- Ao tentar criar novos orçamentos
- Erro acontece no PostgreSQL adapter (Drizzle ORM)
- Problema na conversão de campos de data/timestamp

### Causa Raiz
O erro ocorre porque o código está tentando chamar `.toISOString()` em um valor que não é um objeto Date. Nos campos de timestamp do schema (validUntil, deliveryDeadline), os valores podem estar chegando como strings ao invés de objetos Date.

### Arquivos Envolvidos
- `server/storage.pg.ts` - Método `createBudget()`
- `shared/schema.ts` - Definições de timestamp
- `server/routes.ts` - Endpoint `/api/budgets`

### Status
🔴 **CRÍTICO** - Impede criação de orçamentos completamente

### Solução Necessária
Converter strings de data para objetos Date antes de inserir no banco:

```typescript
// No createBudget(), converter strings para Date:
if (processedData.validUntil && typeof processedData.validUntil === 'string') {
  processedData.validUntil = new Date(processedData.validUntil);
}
if (processedData.deliveryDeadline && typeof processedData.deliveryDeadline === 'string') {
  processedData.deliveryDeadline = new Date(processedData.deliveryDeadline);
}
```

---

## 2. Erro de Autenticação - Token Indefinido

### Descrição do Erro
```
Checking auth with token: undefined...
No token found
```

### Quando Ocorre
- Durante login/logout de usuários
- Principalmente após reconexões do servidor
- Vite hot reload pode causar perda de token

### Causa Raiz
Token de autenticação sendo perdido no localStorage ou não sendo enviado corretamente nas requisições.

### Status
🟡 **MODERADO** - Usuários precisam fazer login novamente

---

## 3. Erro de Conexão do Servidor Vite

### Descrição do Erro
```
[vite] server connection lost. Polling for restart...
```

### Quando Ocorre
- Durante desenvolvimento
- Após mudanças no código
- Pode causar perda de estado da aplicação

### Status
🟢 **MENOR** - Apenas durante desenvolvimento

---

## 4. Problemas de Sequência de IDs

### Descrição do Erro
Orçamentos e pedidos com números sequenciais incorretos ou duplicados.

### Causa Raiz
- Sequências do PostgreSQL não inicializadas corretamente
- Migrations podem não ter executado completamente

### Arquivos Envolvidos
- `migrations/0001_fix_budget_order_numbers.sql`
- `server/storage.pg.ts`

### Status
🟡 **MODERADO** - Pode gerar números duplicados

---

## 5. Erro de Produtos Não Encontrados

### Descrição do Erro
Produtos aparecem como "Produto não encontrado" em orçamentos.

### Causa Raiz
- Referencias de productId inválidas
- Produtos deletados mas ainda referenciados

### Status
🟡 **MODERADO** - Afeta relatórios e orçamentos

---

## Prioridade de Correção

### 🔴 URGENTE (Quebra funcionalidade)
1. **Erro de timestamp em orçamentos** - Sistema não consegue criar orçamentos

### 🟡 IMPORTANTE (Afeta UX)
2. Problemas de autenticação
3. Sequências de números
4. Produtos não encontrados

### 🟢 MENOR (Apenas desenvolvimento)
5. Conexões Vite perdidas

---

## Log de Correções

| Data | Erro | Status | Observações |
|------|------|--------|-------------|
| Atual | Timestamp orçamentos | 🔴 Pendente | Erro crítico bloqueando criação |
| - | - | - | - |

---

## Como Reproduzir Erros

### Erro de Timestamp:
1. Ir em qualquer tela de orçamentos (Vendor/Admin)
2. Tentar criar novo orçamento
3. Preencher dados obrigatórios
4. Clicar em "Criar"
5. Erro aparece no console

### Como Testar Correções:
1. Implementar fix de conversão de data
2. Tentar criar orçamento
3. Verificar se salva no banco sem erro
4. Confirmar que datas aparecem corretas na interface

---

*Última atualização: Janeiro 2025*
*Responsável: Equipe de Desenvolvimento*
