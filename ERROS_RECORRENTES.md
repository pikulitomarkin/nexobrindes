
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

*Mantenha este documento atualizado sempre que resolver um erro recorrente!*
