
# Documentação: Implementação de Orçamentos Enviados no Painel do Cliente

## Resumo das Alterações

Esta documentação descreve as mudanças implementadas para que as solicitações de orçamento enviadas pelos clientes apareçam corretamente na seção "Solicitações Enviadas" do painel do cliente.

## Arquivos Modificados

### 1. `server/storage.ts`

#### Modificações no método `createConsolidatedQuoteRequest`:

```typescript
async createConsolidatedQuoteRequest(data: any): Promise<any> {
  const id = `quote-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log("Creating consolidated quote request:", {
    clientId: data.clientId,
    vendorId: data.vendorId,
    contactName: data.contactName,
    productCount: data.products?.length || 0,
    totalValue: data.totalEstimatedValue
  });

  const quoteRequest = {
    id,
    clientId: data.clientId,
    vendorId: data.vendorId,
    contactName: data.contactName,
    whatsapp: data.whatsapp,
    email: data.email,
    observations: data.observations,
    status: 'pending',
    totalEstimatedValue: data.totalEstimatedValue || 0,
    totalProducts: data.products?.length || 0,
    productSummary: data.products?.length > 1 
      ? `${data.products[0]?.productName} e mais ${data.products.length - 1} produto(s)`
      : data.products?.[0]?.productName || 'Produtos diversos',
    // Para compatibilidade com código existente
    productId: data.products?.[0]?.productId || null,
    productName: data.products?.length > 1 
      ? `${data.products[0]?.productName} e mais ${data.products.length - 1} produto(s)`
      : data.products?.[0]?.productName || 'Produtos diversos',
    quantity: data.products?.reduce((total: number, p: any) => total + p.quantity, 0) || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    products: data.products || []
  };

  // Salvar o orçamento principal - CORREÇÃO PRINCIPAL
  this.quoteRequests.push(quoteRequest);

  console.log(`Created consolidated quote request ${id} with ${data.products?.length || 0} products`);
  return quoteRequest;
}
```

**Principais mudanças:**
- Adicionada propriedade `productSummary` para melhor exibição
- Corrigido o salvamento usando `this.quoteRequests.push()` ao invés de tentar usar um método inexistente
- Melhoradas as informações de log para debug

#### Modificações no método `getQuoteRequestsByClient`:

```typescript
async getQuoteRequestsByClient(clientId: string): Promise<any[]> {
  console.log(`Storage: Searching quote requests for client ${clientId}`);
  
  const requests = this.quoteRequests.filter(request => {
    const isMatch = request.clientId === clientId;
    if (isMatch) {
      console.log(`Found direct match: ${request.id}`);
    }
    return isMatch;
  });

  // Enriquecer cada orçamento com informações dos produtos
  const enrichedRequests = requests.map(request => {
    if (request.products && request.products.length > 0) {
      // Orçamento consolidado
      return {
        ...request,
        productCount: request.products.length,
        productNames: request.products.map((p: any) => p.productName).join(", "),
        // Para compatibilidade com código existente, usar o primeiro produto
        productId: request.products[0]?.productId || null,
        productName: request.products.length > 1
          ? `${request.products[0]?.productName} e mais ${request.products.length - 1} produto(s)`
          : request.products[0]?.productName || "Produtos diversos",
        quantity: request.products.reduce((total: number, p: any) => total + p.quantity, 0)
      };
    } else {
      // Orçamento antigo (single product)
      return {
        ...request,
        productCount: 1,
        productNames: request.productName || "Produto não especificado"
      };
    }
  });

  console.log(`Storage: Found ${enrichedRequests.length} quote requests for client ${clientId}`);
  return enrichedRequests;
}
```

**Principais mudanças:**
- Adicionado logging detalhado para debug
- Implementado enriquecimento de dados para compatibilidade
- Melhorada a busca e filtragem de solicitações por cliente

### 2. `server/routes.ts`

#### Adicionado endpoint para buscar solicitações do cliente:

```typescript
app.get("/api/quote-requests/client/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`Fetching quote requests for client: ${clientId}`);
    
    const quoteRequests = await storage.getQuoteRequestsByClient(clientId);
    console.log(`Found ${quoteRequests.length} quote requests for client ${clientId}`);
    
    res.json(quoteRequests);
  } catch (error) {
    console.error("Error fetching quote requests for client:", error);
    res.status(500).json({ error: "Failed to fetch quote requests" });
  }
});
```

**Funcionalidade:**
- Endpoint específico para buscar solicitações de orçamento por cliente
- Retorna dados enriquecidos com informações dos produtos
- Inclui logging para facilitar debug

### 3. `client/src/pages/client/budgets.tsx`

#### Implementação da busca de solicitações enviadas:

```typescript
// Buscar solicitações de orçamento
const { data: quoteRequests, isLoading: requestsLoading, refetch: refetchQuoteRequests } = useQuery({
  queryKey: ["/api/quote-requests/client", clientId],
  queryFn: async () => {
    try {
      console.log(`Fetching quote requests for client: ${clientId}`);
      const response = await fetch(`/api/quote-requests/client/${clientId}`);
      if (!response.ok) {
        console.error('Failed to fetch quote requests:', response.status, response.statusText);
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch quote requests: ${response.status}`);
      }
      const data = await response.json();
      console.log('Quote requests fetched:', data);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      return []; // Retornar array vazio em caso de erro
    }
  },
  enabled: !!clientId,
  refetchInterval: 10000,
  refetchOnWindowFocus: true,
  retry: 1, // Reduzir retry para evitar spam
});
```

#### Interface atualizada para mostrar solicitações enviadas:

```typescript
{/* Solicitações de Orçamento Enviadas */}
<Card className="mb-8">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <MessageSquare className="h-5 w-5" />
      Solicitações Enviadas
    </CardTitle>
  </CardHeader>
  <CardContent>
    {requestsLoading ? (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Carregando solicitações...</p>
      </div>
    ) : quoteRequests && quoteRequests.length > 0 ? (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Encontradas {quoteRequests.length} solicitações de orçamento
        </p>
        {quoteRequests.map((request: any) => (
          <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {request.productSummary || request.productName || 'Solicitação de Orçamento'}
                </h3>
                {request.totalProducts > 1 && (
                  <p className="text-sm text-blue-600 mt-1">
                    {request.totalProducts} produtos solicitados
                  </p>
                )}
                {request.totalEstimatedValue > 0 && (
                  <p className="text-sm text-green-600 font-medium mt-1">
                    Valor estimado: R$ {parseFloat(request.totalEstimatedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  <span>Qtd: {request.quantity}</span>
                </div>
              </div>
              {getStatusBadge(request.status, 'request')}
            </div>

            {request.observations && (
              <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                <strong>Observações:</strong> {request.observations}
              </p>
            )}

            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Vendedor: {request.vendorName || 'Não informado'}</span>
              {request.status === 'quoted' && (
                <span className="text-green-600 font-medium">
                  ✓ Orçamento enviado pelo vendedor
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Nenhuma solicitação de orçamento enviada</p>
        <p className="text-sm text-gray-400 mt-2">
          Vá para o catálogo de produtos para solicitar orçamentos
        </p>
      </div>
    )}
  </CardContent>
</Card>
```

## Fluxo de Funcionamento

1. **Cliente solicita orçamento** no catálogo de produtos
2. **Sistema salva** a solicitação usando `createConsolidatedQuoteRequest`
3. **Dados são armazenados** no array `this.quoteRequests` no storage
4. **Cliente acessa** a página de orçamentos (`/budgets`)
5. **Sistema busca** as solicitações usando `getQuoteRequestsByClient`
6. **Interface exibe** as solicitações na seção "Solicitações Enviadas"

## Debugging e Logs

O sistema inclui logs detalhados em cada etapa:
- Criação da solicitação
- Busca das solicitações por cliente
- Renderização na interface

Para debugar, verifique os logs do console tanto no servidor quanto no cliente.

## Status das Solicitações

- **pending**: Aguardando análise do vendedor
- **reviewing**: Em análise pelo vendedor
- **quoted**: Orçamento enviado pelo vendedor
- **rejected**: Rejeitado pelo vendedor

## Próximos Passos

Para aplicar em outra cópia do sistema:

1. Copie as modificações do `server/storage.ts`
2. Adicione o endpoint no `server/routes.ts`
3. Atualize o componente `client/src/pages/client/budgets.tsx`
4. Teste criando uma solicitação de orçamento
5. Verifique se aparece na seção "Solicitações Enviadas"

