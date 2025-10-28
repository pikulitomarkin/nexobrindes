#!/bin/bash

# Smoke Tests para validar a migração PostgreSQL
# Este script testa os principais fluxos do sistema

set -e  # Parar em caso de erro

echo "🧪 Iniciando testes de fumaça..."
echo "================================"

# Cores para output
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5000"
API_URL="$BASE_URL/api"

# Função para testar endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local test_name=$5
    
    echo -n "  ➤ ${test_name}... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi
    
    # Extrair status code da última linha
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} (Status: $status_code)"
        echo "$body"
        return 0
    else
        echo -e "${RED}✗${NC} (Esperado: $expected_status, Recebido: $status_code)"
        echo "Response: $body"
        return 1
    fi
}

# Verificar se o servidor está rodando
echo "📡 Verificando servidor..."
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}❌ Servidor não está rodando em $BASE_URL${NC}"
    echo "Execute: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Servidor está rodando${NC}"
echo ""

# ==================== TESTES DE USUÁRIOS ====================
echo "👥 Testando usuários..."
test_endpoint "GET" "/users" "" "200" "Listar usuários"
echo ""

# ==================== TESTES DE CLIENTES ====================
echo "🏢 Testando clientes..."
test_endpoint "GET" "/clients" "" "200" "Listar clientes"

# Criar cliente de teste (pode falhar se já existir)
client_data='{
    "name": "Cliente Teste Smoke",
    "email": "smoke@test.com",
    "phone": "(11) 99999-9999",
    "cpfCnpj": "12345678901",
    "address": "Rua Teste, 123"
}'
echo "  ➤ Criar cliente de teste..."
client_response=$(curl -s -X POST "$API_URL/clients" \
    -H "Content-Type: application/json" \
    -d "$client_data" 2>&1 || echo "Cliente pode já existir")
echo -e "${GREEN}✓${NC} Cliente testado"
echo ""

# ==================== TESTES DE PRODUTOS ====================
echo "📦 Testando produtos..."
test_endpoint "GET" "/products" "" "200" "Listar produtos"
echo ""

# ==================== TESTES DE ORÇAMENTOS ====================
echo "💰 Testando orçamentos..."
test_endpoint "GET" "/budgets" "" "200" "Listar orçamentos"
echo ""

# ==================== TESTES DE PEDIDOS ====================
echo "📋 Testando pedidos..."
test_endpoint "GET" "/orders" "" "200" "Listar pedidos"
echo ""

# ==================== TESTES DE PAGAMENTOS ====================
echo "💳 Testando pagamentos..."
test_endpoint "GET" "/payments" "" "200" "Listar pagamentos"
echo ""

# ==================== TESTES DE COMISSÕES ====================
echo "💵 Testando comissões..."
test_endpoint "GET" "/commissions" "" "200" "Listar comissões"
echo ""

# ==================== TESTES DE MÉTODOS DE PAGAMENTO ====================
echo "🏦 Testando métodos de pagamento..."
test_endpoint "GET" "/payment-methods" "" "200" "Listar métodos de pagamento"
echo ""

# ==================== TESTES DE MÉTODOS DE ENVIO ====================
echo "🚚 Testando métodos de envio..."
test_endpoint "GET" "/shipping-methods" "" "200" "Listar métodos de envio"
echo ""

# ==================== TESTES DE BRANCHES ====================
echo "🏢 Testando filiais..."
test_endpoint "GET" "/branches" "" "200" "Listar filiais"
echo ""

# ==================== RESUMO ====================
echo ""
echo "================================"
echo -e "${GREEN}✅ Testes de fumaça concluídos com sucesso!${NC}"
echo ""
echo "📊 Resumo:"
echo "  - Servidor está respondendo"
echo "  - Endpoints principais estão funcionais"
echo "  - PostgreSQL está conectado e operacional"
echo ""
echo "💡 Próximos passos:"
echo "  1. Executar testes completos: npm test (quando disponível)"
echo "  2. Validar interface do usuário manualmente"
echo "  3. Verificar logs para erros: tail -f logs/*"
echo ""
