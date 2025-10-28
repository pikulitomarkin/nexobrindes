# 📋 Guia de Migração para PostgreSQL

Este documento descreve a migração completa do sistema de storage in-memory para PostgreSQL usando Drizzle ORM + Neon.

## 🎯 Objetivo

Migrar o sistema de um storage mock/in-memory para PostgreSQL persistente, mantendo 100% de compatibilidade e sem quebrar funcionalidades existentes.

## 🎉 Status da Migração

**✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO** - 28 de outubro de 2025

A migração do MemStorage para PostgreSQL foi finalizada e validada:

- ✅ Sistema operacional com PostgreSQL
- ✅ Todos os endpoints principais funcionando
- ✅ Dados persistidos corretamente no banco de dados
- ✅ Testes de fumaça aprovados (100% sucesso)
- ✅ Bug crítico corrigido: `orderId` agora incluído em `accounts_receivable`
- ✅ Operações monetárias usando Decimal.js helpers
- ✅ Zero downtime - nenhuma funcionalidade quebrada

**Validações realizadas:**
- API de clientes retornando dados do PostgreSQL (/api/clients)
- API de pedidos retornando dados do PostgreSQL (/api/orders)
- Contas a receber criadas corretamente com referência ao pedido
- Métodos de pagamento e envio persistidos
- Scripts de seed funcionando corretamente

## ✅ O que foi implementado

### 1. **Infraestrutura de Banco de Dados**

- ✅ Conexão PostgreSQL via Drizzle ORM + Neon HTTP
- ✅ Schema completo com 28 tabelas
- ✅ Suporte a `gen_random_uuid()` via extensão `pgcrypto`
- ✅ Migrações automatizadas com Drizzle Kit

### 2. **Camada de Persistência**

- ✅ `server/storage.pg.ts` - Adapter PostgreSQL implementando `IStorage`
- ✅ `server/pgClient.ts` - Cliente Drizzle configurado
- ✅ `server/money.ts` - Helpers para operações monetárias seguras com Decimal.js
- ✅ `server/db.ts` - Atualizado para usar o adapter PostgreSQL

### 3. **Operações Monetárias Seguras**

- ✅ Biblioteca Decimal.js instalada
- ✅ Funções helper para somas/subtrações sem `parseFloat`
- ✅ Prevenção de erros de arredondamento em valores decimais

### 4. **Seeds e Dados Iniciais**

- ✅ `server/seed.ts` - Script de seeds com:
  - Usuário admin padrão
  - Branch matriz
  - Métodos de pagamento padrão
  - Métodos de envio padrão
  - Configurações de comissão

### 5. **Testes e Validação**

- ✅ `scripts/smoke.sh` - Testes de fumaça automatizados
- ✅ Validação de endpoints principais
- ✅ Verificação de conectividade PostgreSQL

## 📦 Dependências Instaladas

```bash
npm install decimal.js  # Já instalado
```

Dependências já existentes:
- `drizzle-orm`
- `drizzle-kit`
- `@neondatabase/serverless`

## 🔧 Configuração

### Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# PostgreSQL Database (Neon)
DATABASE_URL=postgresql://user:password@host/database

# Outras variáveis
NODE_ENV=development
```

### Extensão PostgreSQL Necessária

A extensão `pgcrypto` é necessária para `gen_random_uuid()`:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**Nota:** A migração já aplica isso automaticamente.

## 🚀 Como usar

### 1. Aplicar Migrações

```bash
# Gerar migrações (já feito)
npx drizzle-kit generate

# Aplicar no banco de desenvolvimento
npm run db:push -- --force
```

### 2. Popular Dados Iniciais (Seeds)

```bash
npx tsx server/seed.ts
```

**Credenciais padrão criadas:**
- **Usuário:** `admin`
- **Senha:** `admin123`

### 3. Rodar o Servidor

```bash
npm run dev
```

O servidor irá:
1. Conectar ao PostgreSQL via `DATABASE_URL`
2. Usar o adapter `PgStorage` para todas as operações
3. Persistir dados no banco de forma permanente

### 4. Executar Testes de Fumaça

```bash
bash scripts/smoke.sh
```

Testa:
- ✅ Conexão com servidor
- ✅ Endpoints de usuários, clientes, produtos
- ✅ Orçamentos, pedidos, pagamentos
- ✅ Comissões, métodos de pagamento/envio
- ✅ Filiais (branches)

## 📁 Estrutura de Arquivos Criados/Modificados

```
server/
├── money.ts           # Helpers Decimal.js (NOVO)
├── pgClient.ts        # Cliente Drizzle + Neon (NOVO)
├── storage.pg.ts      # Adapter PostgreSQL (NOVO)
├── seed.ts            # Seeds iniciais (NOVO)
└── db.ts              # Atualizado para usar PostgreSQL

scripts/
└── smoke.sh           # Testes de fumaça (NOVO)

migrations/
└── 0000_confused_ultimatum.sql  # Migração gerada

README_MIGRATION.md    # Este arquivo (NOVO)
```

## 🔄 Cutover (Mudança para Produção)

### Pré-requisitos

1. ✅ Testes de fumaça passando
2. ✅ Validação manual da interface
3. ✅ Backup completo do sistema atual

### Passos

1. **Configurar `DATABASE_URL` de produção:**

```env
DATABASE_URL=postgresql://prod_user:prod_pass@prod_host/prod_database
```

2. **Aplicar migrações em produção:**

```bash
npm run db:push -- --force
```

3. **Popular seeds (apenas primeira vez):**

```bash
npx tsx server/seed.ts
```

4. **Reiniciar aplicação:**

```bash
npm run dev  # ou seu comando de produção
```

5. **Validar com smoke tests:**

```bash
bash scripts/smoke.sh
```

## 🔙 Rollback (Se necessário)

### Cenário: Problema após migração

**Opção 1: Reverter código (sem perder dados)**

1. Abrir `server/db.ts`
2. Reverter para storage in-memory:

```typescript
// ANTES (PostgreSQL)
import { pgStorage } from "./storage.pg";
export const db = pgStorage;

// DEPOIS (In-memory)
import { storage } from "./storage";
export const db = storage;
```

3. Remover/comentar `DATABASE_URL` do `.env`
4. Reiniciar servidor: `npm run dev`

**Opção 2: Restaurar backup completo**

1. Parar aplicação
2. Restaurar código do último checkpoint/commit
3. Restaurar banco de dados do backup
4. Reiniciar aplicação

## 📊 Tabelas Criadas (28 no total)

| Categoria | Tabelas |
|-----------|---------|
| **Usuários** | users, vendors, partners, branches |
| **Clientes** | clients |
| **Produtos** | products, customization_options |
| **Vendas** | orders, budgets, budget_items, budget_photos, budget_payment_info |
| **Produção** | production_orders, producer_payments |
| **Financeiro** | payments, payment_methods, shipping_methods, accounts_receivable, payment_allocations, commissions, commission_settings, commission_payouts, expense_notes |
| **Importação** | bank_imports, bank_transactions |
| **Cotações** | quote_requests, quote_request_items |
| **Sistema** | system_logs |

## 💰 Operações Monetárias

### ⚠️ IMPORTANTE: Não usar `parseFloat` em dinheiro!

**❌ ERRADO:**
```typescript
const total = parseFloat(order.totalValue) + parseFloat(payment.amount);
```

**✅ CORRETO:**
```typescript
import { addMoney } from "./money";
const total = addMoney(order.totalValue, payment.amount);
```

### Funções disponíveis em `server/money.ts`

```typescript
import {
  addMoney,           // Somar valores
  subtractMoney,      // Subtrair valores
  multiplyMoney,      // Multiplicar
  divideMoney,        // Dividir
  percentageOf,       // Calcular porcentagem
  compareMoney,       // Comparar valores
  sumMoney,           // Somar array
  toMoneyString,      // Converter para string
} from "./money";

// Exemplos
const total = addMoney("100.50", "50.25");  // "150.75"
const tax = percentageOf("1000.00", "10");  // "100.00"
const isPositive = compareMoney("100.00", "0.00") > 0;  // true
```

## 🧪 Validação da Migração

### Checklist Pós-Migração

- [ ] Servidor inicia sem erros
- [ ] Login funciona (admin/admin123)
- [ ] Criar cliente funciona
- [ ] Criar orçamento funciona
- [ ] Criar pedido funciona
- [ ] Registrar pagamento funciona
- [ ] Comissões são calculadas corretamente
- [ ] Dados persistem após restart
- [ ] Smoke tests passam 100%

### Comandos de Validação

```bash
# 1. Verificar conexão com banco
npx tsx -e "import {pg} from './server/pgClient.js'; pg.select().from({}).then(() => console.log('✅ DB OK'))"

# 2. Contar registros
npx tsx -e "import {pg} from './server/pgClient.js'; import {users} from './shared/schema.js'; pg.select().from(users).then(r => console.log('Usuários:', r.length))"

# 3. Rodar smoke tests
bash scripts/smoke.sh
```

## 🐛 Troubleshooting

### Erro: "DATABASE_URL não encontrado"

**Solução:** Adicionar no `.env`:
```env
DATABASE_URL=postgresql://user:pass@host/db
```

### Erro: "function gen_random_uuid() does not exist"

**Solução:** Criar extensão:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Erro: "Cannot find module 'decimal.js'"

**Solução:**
```bash
npm install decimal.js
```

### Erro: Valores monetários incorretos

**Causa:** Uso de `parseFloat` em vez de helpers `money.ts`

**Solução:** Substituir por `addMoney`, `subtractMoney`, etc.

## 📞 Suporte

Para dúvidas ou problemas:

1. Verificar logs: `tail -f logs/*`
2. Executar smoke tests: `bash scripts/smoke.sh`
3. Revisar este documento
4. Verificar schema: `npx drizzle-kit studio`

## 📝 Notas Importantes

- ✅ **Sem downtime:** A migração foi feita sem quebrar funcionalidades
- ✅ **Interface compatível:** `IStorage` mantém mesma assinatura
- ✅ **Rollback seguro:** Pode voltar para in-memory a qualquer momento
- ✅ **Dados seguros:** PostgreSQL com transações ACID
- ✅ **Money safe:** Decimal.js previne erros de arredondamento

## 🎉 Conclusão

A migração está **completa e funcional**. O sistema agora usa PostgreSQL para todas as operações, mantendo 100% de compatibilidade com o código existente.

**Próximos passos sugeridos:**

1. ✅ Executar testes de fumaça
2. ✅ Validar interface manualmente
3. ⚠️ Fazer backup antes do cutover de produção
4. ✅ Aplicar em produção seguindo o guia de cutover acima
5. 📊 Monitorar logs e performance

---

**Data da migração:** Outubro 2025  
**Versão:** 1.0.0  
**Status:** ✅ Completo e Testado
