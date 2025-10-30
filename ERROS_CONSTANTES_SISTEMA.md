
# Erros Constantes do Sistema - Documentação

## 1. Erro de Criação de Orçamentos - TypeError: value.toISOString is not a function

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
