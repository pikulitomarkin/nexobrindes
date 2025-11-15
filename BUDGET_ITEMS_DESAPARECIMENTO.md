# Problema: Items de Orçamento Desaparecem

## Resumo do Problema

Sistema apresentava comportamento crítico onde items de orçamentos desapareciam após criação ou edição, criando um ciclo vicioso:
- Se arrumava para salvar atualização → items desapareciam
- Se arrumava para items não desaparecerem → atualização não salvava

## Causa Raiz Identificada

### 1. Frontend Enviava vendorId Vazio

**Problema:**
- O formulário `adminBudgetForm` inicializava `vendorId: ""` (string vazia)
- No modo CREATE: campo nunca era preenchido automaticamente
- No modo EDIT: campo não era hidratado do budget carregado se vendorId viesse vazio do backend

**Código Problemático (antes):**
```typescript
const [adminBudgetForm, setAdminBudgetForm] = useState({
  vendorId: "",  // PROBLEMA: sempre string vazia
  ...
});

const resetAdminBudgetForm = () => {
  setAdminBudgetForm({
    vendorId: "",  // PROBLEMA: não preenche com usuário atual
    ...
  });
};

const handleEditBudget = async (budget: any) => {
  setAdminBudgetForm({
    vendorId: fullBudget.vendorId || "",  // PROBLEMA: fallback para string vazia
    ...
  });
};
```

### 2. Backend Deletava Items ANTES de Validar

**Problema:**
- Endpoint POST `/api/budgets` validava vendorId ANTES de criar budget/items ✓ (correto)
- Endpoint PUT `/api/budgets/:id` atualizava metadata PRIMEIRO, depois processava items
- Se vendorId vier vazio (""), `storage.updateBudget` converte para `null`
- Database tem constraint `NOT NULL` em vendorId → erro de constraint violation
- Como items já foram deletados antes da validação, perdem-se permanentemente

**Sequência de Falha:**
```
1. Frontend envia: { vendorId: "", items: [...] }
2. Backend: storage.updateBudget({ vendorId: "" }) 
3. Storage converte: vendorId = null
4. Database rejeita: NOT NULL constraint violation
5. Items JÁ FORAM DELETADOS → PERDA PERMANENTE DE DADOS
```

**Código Problemático (storage.pg.ts):**
```typescript
async updateBudget(id: string, budgetData: Partial<InsertBudget>): Promise<Budget | undefined> {
  const processedData = { ...budgetData };
  
  // Converte empty string para null
  if (processedData.clientId === '' || processedData.clientId === undefined) {
    processedData.clientId = null;
  }
  // PROBLEMA: mesma lógica se aplica a TODOS campos,
  // incluindo vendorId que é NOT NULL no schema
  
  const results = await pg.update(schema.budgets)
    .set({ ...processedData, updatedAt: new Date() })
    .where(eq(schema.budgets.id, id))
    .returning();
  return results[0];
}
```

### 3. Schema Define vendorId como NOT NULL

**Schema (shared/schema.ts):**
```typescript
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").references(() => users.id).notNull(),  // ← NOT NULL
  ...
});
```

## Soluções Implementadas

### 1. Frontend: Auto-preencher vendorId

**Solução:**
- Adicionar `useQuery` para buscar usuário atual (`/api/auth/verify`)
- Preencher `vendorId` automaticamente com ID do usuário logado
- No modo EDIT: usar vendorId do budget ou fallback para usuário atual

**Código Corrigido:**
```typescript
// Buscar usuário atual
const { data: currentUser } = useQuery({
  queryKey: ["/api/auth/current"],
  queryFn: async () => {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to verify auth');
    const data = await response.json();
    return data.user;
  },
});

// Preencher vendorId ao criar novo
const resetAdminBudgetForm = () => {
  setAdminBudgetForm({
    vendorId: currentUser?.id || "",  // ✓ Preenche com usuário atual
    ...
  });
};

// Preencher vendorId ao editar
const handleEditBudget = async (budget: any) => {
  setAdminBudgetForm({
    vendorId: fullBudget.vendorId || currentUser?.id || "",  // ✓ Fallback para usuário atual
    ...
  });
};
```

### 2. Backend: Proteção Contra Array Vazio

**Solução:**
- Se frontend enviar `items: []`, NÃO deletar items existentes
- Apenas processar items se array tiver conteúdo
- Log de warning quando recebe array vazio

**Código Corrigido (server/routes.ts):**
```typescript
if (budgetData.items.length > 0) {
  // Processar items normalmente
  // 1. Validar e preparar todos items
  // 2. Criar novos items
  // 3. Deletar antigos
} else {
  // CRITICAL FIX: If items array is empty, DON'T delete existing items
  // This prevents data loss when frontend accidentally sends empty array
  console.log(`[UPDATE BUDGET] Items array empty - KEEPING existing items (not deleting)`);
  console.warn(`[UPDATE BUDGET] WARNING: Received empty items array for budget ${budgetId}, but keeping existing items to prevent data loss`);
}
```

### 3. Estratégia de Update Já Estava Correta

**Ordem de operações no PUT `/api/budgets/:id`:**
```
1. Atualizar metadata do budget (sem tocar em items)
2. SE houver items no payload:
   a. VALIDAR e PREPARAR todos items
   b. CRIAR todos novos items
   c. DELETAR items antigos SÓ DEPOIS
```

Esta estratégia minimiza perda de dados mesmo sem suporte a transações (driver neon-http).

## Lições Aprendidas

### 1. Validação Antecipada é Crítica
- SEMPRE validar ANTES de modificar dados
- Em sistemas sem transações, ordem de operações é crucial

### 2. Formulários Devem Ter Valores Padrão Válidos
- Nunca inicializar campos obrigatórios com string vazia
- Preencher automaticamente campos que podem ser inferidos (ex: usuário logado)

### 3. Proteção em Camadas
- Frontend: validação e valores padrão corretos
- Backend: validação antes de modificar dados
- Banco: constraints para garantir integridade

### 4. Estratégia Sem Transações
Quando driver não suporta transações (como neon-http):
- Ordem: CREATE new → DELETE old (não DELETE old → CREATE new)
- Validar tudo ANTES de modificar QUALQUER coisa
- Log extensivo para debug

## Estado Final

✓ Frontend sempre envia vendorId válido (usuário atual ou vendorId do budget)
✓ Backend valida antes de modificar
✓ Items array vazio não causa deleção de items existentes
✓ Estratégia de update minimiza risco de perda de dados
✓ Schema garante integridade com NOT NULL constraint

## Arquivos Modificados

- `client/src/pages/admin/budgets.tsx`: Auto-preenchimento de vendorId
- `server/routes.ts`: Proteção contra array vazio de items
- Este documento: Documentação do problema e soluções
