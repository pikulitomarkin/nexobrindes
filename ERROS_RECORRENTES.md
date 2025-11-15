# 📋 Erros Recorrentes e Soluções

Este documento registra os erros mais comuns encontrados no sistema e suas respectivas soluções para referência futura.

## 🚫 Erro: Importação OFX não funciona

### Descrição do Problema
```
OFX import error: TypeError [ERR_UNKNOWN_ENCODING]: Unknown encoding: utf-utf-8
    at Buffer.toString (node:buffer:861:11)
    at parseOFXBuffer (/home/runner/workspace/server/routes.ts:56:29)
```

### Causa
Erro de digitação no encoding do buffer. Foi usado `'utf-utf-8'` ao invés de `'utf-8'`.

### Solução
**Arquivo:** `server/routes.ts` - linha 56
**Alteração:**
```typescript
// ERRO:
const ofxContent = buffer.toString('utf-utf-8');

// CORREÇÃO:
const ofxContent = buffer.toString('utf-8');
```

### Data de Resolução
28/01/2025

---

## 🚫 Erro: storage.createManualReceivable is not a function

### Descrição do Problema
```
Error creating manual receivable: TypeError: storage.createManualReceivable is not a function
    at <anonymous> (/home/runner/workspace/server/routes.ts:2495:40)
```

### Causa
Método `createManualReceivable` estava declarado na interface `IStorage` mas não implementado na classe `MemStorage`.

### Solução
**Arquivo:** `server/storage.ts`
**Alteração:** Adicionar implementação completa do método:

```typescript
async createManualReceivable(data: any): Promise<any> {
  const id = `manual-receivable-${randomUUID()}`;
  const receivable = {
    id,
    ...data,
    status: data.status || 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  this.mockData.manualReceivables.push(receivable);
  console.log(`Created manual receivable: ${id} for ${data.description} - R$ ${data.amount}`);
  return receivable;
}
```

### Data de Resolução
28/01/2025

---

## ✅ Como Identificar Problemas Similares

### Padrões Comuns:
1. **Métodos não implementados**: Erro "X is not a function"
   - Verificar se o método existe na interface e na implementação
   - Verificar se o método foi exportado corretamente

2. **Problemas de encoding**: Erros com "Unknown encoding" ou caracteres especiais
   - Verificar se o encoding está correto (utf-8, não utf-utf-8)
   - Verificar se arquivos externos estão sendo lidos corretamente

3. **Imports/Exports**: Módulos não encontrados ou undefined
   - Verificar caminhos de import
   - Verificar se as funções estão sendo exportadas

### Processo de Debug:
1. Analisar o stack trace completo
2. Identificar o arquivo e linha exata do erro
3. Verificar se todas as dependências estão implementadas
4. Testar a correção em ambiente controlado
5. Documentar a solução neste arquivo

---

## 📝 Template para Novos Erros

```markdown
## 🚫 Erro: [Título do Erro]

### Descrição do Problema
[Stack trace ou descrição do erro]

### Causa
[Explicação da causa raiz]

### Solução
**Arquivo:** [nome do arquivo] - [localização]
**Alteração:**
[código da correção]

### Data de Resolução
[DD/MM/AAAA]
```

---

## 🚫 Erro: Importação OFX para produtores não encontra transações de débito

### Descrição do Problema
```
Processing producer payment OFX file: Found 0 debit transactions out of 54 total
POST /api/finance/producer-ofx-import 400 :: {"error":"Nenhuma transação de débito (pagamentos) encontrada no arquivo OFX"}
```

### Causa
A função `parseOFXBuffer` estava criando transações com tipos 'CREDIT' e 'PAYMENT', mas o filtro para importação de produtores procurava apenas por `type === 'debit'`. Isso causava incompatibilidade entre os tipos de transação.

### Solução
**Arquivo:** `server/routes.ts`
**Alteração:** 
1. Padronizar tipos de transação na função `parseOFXBuffer`:
   - 'CREDIT' ou valores positivos → 'credit'  
   - 'PAYMENT'/'DEBIT' ou valores negativos → 'debit'

2. Atualizar filtro para aceitar tanto 'PAYMENT' quanto 'debit':
```typescript
// ANTES:
const debitTransactions = transactions.filter(t => t.type === 'debit');

// DEPOIS:
const debitTransactions = transactions.filter(t => t.type === 'PAYMENT' || t.type === 'debit');
```

### Data de Resolução
28/01/2025

---

## 🚫 Erro: Pagamentos de produtores não aparecem na aba "Aguardando Aprovação"

### Descrição do Problema
Os pagamentos de produtores eram criados corretamente quando o produtor definia o valor da ordem de produção, mas não apareciam na aba "Aguardando Aprovação" no painel de pagamentos aos produtores.

### Causa
1. A rota `/api/finance/producer-payments/pending` não estava filtrando corretamente os pagamentos pendentes
2. Falta de logs de depuração para identificar problemas na busca de pagamentos
3. O filtro estava muito restritivo (apenas 'pending' em vez de 'pending' OU 'approved')

### Solução
**Arquivo:** `server/routes.ts`
**Alteração:** 
1. Melhorar logs de depuração na rota `/api/finance/producer-payments/pending`
2. Expandir filtro para incluir pagamentos com status 'approved' além de 'pending'
3. Adicionar logs detalhados para rastrear o processo de enriquecimento dos dados

**Arquivo:** `server/storage.ts`
**Alteração:**
1. Adicionar logs de depuração no método `getProducerPayments()`

### Data de Resolução
28/01/2025

---

## Erro: Importação OFX não funcionando corretamente em Pagamentos de Produtores

**Problema:** 
- A importação de OFX estava falhando na tela de Pagamentos de Produtores
- As transações não estavam sendo importadas corretamente
- O endpoint específico para produtores não estava funcionando

**Causa:** 
- Faltava o endpoint `/api/finance/producer-ofx-import` no routes.ts
- O endpoint não estava filtrando apenas transações de débito (pagamentos)
- A interface não estava chamando o endpoint correto

**Solução aplicada:**
1. Criado endpoint específico `/api/finance/producer-ofx-import` que:
   - Filtra apenas transações DEBIT/PAYMENT (saídas de dinheiro)
   - Processa apenas transações de pagamento aos produtores
   - Mantém os mesmos padrões de importação mas focado em débitos
2. Corrigido o mutation na interface para chamar o endpoint correto
3. Adicionado logs específicos para debug do processo

**Como identificar:** Se a importação OFX falhar na tela de produtores ou não mostrar transações de débito

**Data da correção:** Janeiro 2025

---

## Erro: Conciliação Bancária não mostra transações OFX e botão de conciliação não funciona

**Problema:** 
- Transações OFX são importadas mas não aparecem na seção "Histórico de Importações OFX"
- Botão "Confirmar Entrada" não funciona
- Modal de associação de pagamentos não abre
- Transações não são filtradas corretamente para conciliação
- **Erro:** `storage.getBankTransaction is not a function`

**Causa:** 
- Interface da conciliação não estava renderizando as transações corretamente
- Faltavam endpoints `/api/finance/associate-payment` e `/api/finance/associate-multiple-payments`
- Filtros de transação não consideravam diferentes tipos (credit/debit)
- ⚠️ **CAUSA RAIZ:** Métodos `getBankTransaction` e `updateBankTransaction` foram documentados como implementados mas **só existiam na interface IStorage**, não no storage PostgreSQL (storage.pg.ts)

**Solução aplicada:**
1. Corrigida a renderização das transações OFX na interface:
   - Separa transações não conciliadas e conciliadas
   - Mostra detalhes completos das transações
   - Filtros melhorados para mostrar apenas entradas de dinheiro
2. Adicionados endpoints de associação:
   - `/api/finance/associate-payment` para associação única
   - `/api/finance/associate-multiple-payments` para múltiplas transações
3. ✅ **[IMPLEMENTADO EM 15/11/2025]** Métodos no storage PostgreSQL (storage.pg.ts):
   - `getBankTransaction(id: string)` para buscar transação por ID (linha 1598)
   - `updateBankTransaction()` para atualizar status das transações (já existia, linha 1679)
4. Corrigidos filtros de transação para aceitar valores positivos OU tipo 'credit'
5. Modal de conciliação agora funciona corretamente com seleção múltipla

**Como identificar:** 
- Transações OFX importadas mas não visíveis na conciliação
- Botões de "Confirmar Entrada" não funcionam
- Modal não abre ao clicar em conciliação
- Console mostra erro: `storage.getBankTransaction is not a function`

**Data da correção inicial:** Janeiro 2025  
**Data da implementação completa:** 15/11/2025 - Implementação real no PostgreSQL storage

---

*Mantenha este documento atualizado sempre que resolver um erro recorrente!*