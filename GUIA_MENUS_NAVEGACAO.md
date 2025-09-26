
# Guia de Menus de Navegação - Sistema Nexo Brindes

## 1. Menu Principal Lateral (Main Layout)

**Arquivo:** `client/src/components/layout/main-layout.tsx`

### Como Adicionar um Novo Link

1. Localize a função `getMenuItems()` no arquivo
2. Encontre o caso correspondente ao role (admin, vendor, client, etc.)
3. Adicione o novo item no array seguindo o padrão:

```typescript
{ href: "/caminho/da/rota", icon: IconeDoLucide, label: "Nome do Menu" }
```

### Exemplo Prático - Adicionando "Personalizações" no menu Admin:

```typescript
case "admin":
  return [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/admin/products", icon: Package, label: "Produtos" },
    { href: "/admin/producers", icon: Factory, label: "Produtores" },
    { href: "/admin/clients", icon: Users, label: "Clientes" },
    { href: "/admin/vendors", icon: ShoppingCart, label: "Vendedores" },
    { href: "/admin/customizations", icon: Settings, label: "Personalizações" }, // ← NOVO ITEM
    { href: "/admin/commission-management", icon: DollarSign, label: "Gestão de Comissões" },
    { href: "/finance", icon: DollarSign, label: "Módulo Financeiro" },
  ];
```

### Passos para Adicionar um Novo Link:

1. **Importar o ícone** (se necessário):
```typescript
import { Settings } from "lucide-react"; // Adicione no topo do arquivo
```

2. **Adicionar o item no array** do role correspondente

3. **Criar a página correspondente** em `client/src/pages/[role]/[nome-da-pagina].tsx`

4. **Adicionar a rota no App.tsx** (se necessário)

---

## 2. Menu de Painéis (Sidebar Component)

**Arquivo:** `client/src/components/layout/sidebar.tsx`

### Como Adicionar Links nos Painéis

Cada painel (admin, vendor, client, producer, finance) tem sua própria seção. Para adicionar um link:

```typescript
// Exemplo para o painel de vendor
{activePanel === "vendor" && (
  <nav className="mt-8">
    <SidebarItem 
      icon={NovoIcone} 
      label="Novo Item" 
      href="/vendor/novo-item"
      isActive={location === "/vendor/novo-item"}
    />
  </nav>
)}
```

---

## 3. Menu de Ações Rápidas (Dashboard)

**Arquivo:** `client/src/pages/dashboard.tsx`

### Como Adicionar Quick Actions

Localize a função `getQuickActions()` e adicione novos itens:

```typescript
if (user.role === "admin") {
  return [
    { href: "/admin/orders", icon: ShoppingCart, label: "Gerenciar Pedidos", color: "text-blue-600" },
    { href: "/admin/novo-item", icon: NovoIcone, label: "Novo Item", color: "text-purple-600" }, // ← NOVO
  ];
}
```

---

## 4. Estrutura de Roles e Menus

### Roles Disponíveis:
- **admin**: Administrador geral
- **vendor**: Vendedor
- **client**: Cliente
- **producer**: Produtor
- **finance**: Financeiro
- **partner**: Sócio

### Convenção de Rotas:
- Admin: `/admin/[funcionalidade]`
- Vendor: `/vendor/[funcionalidade]`
- Client: `/client/[funcionalidade]`
- Producer: `/producer/[funcionalidade]`
- Finance: `/finance/[funcionalidade]`
- Partner: `/partner/[funcionalidade]`

---

## 5. Ícones Disponíveis (Lucide React)

Principais ícones usados no sistema:

```typescript
import {
  Home,           // Dashboard
  Package,        // Produtos
  Users,          // Clientes/Usuários
  ShoppingCart,   // Pedidos/Vendas
  Factory,        // Produtores
  DollarSign,     // Financeiro/Comissões
  Settings,       // Configurações
  FileText,       // Documentos/Orçamentos
  TrendingUp,     // Crescimento/Relatórios
  CreditCard,     // Pagamentos
  Award,          // Comissões/Prêmios
  Briefcase,      // Negócios
  BarChart3,      // Gráficos/Analytics
} from "lucide-react";
```

---

## 6. Checklist para Adicionar Novo Menu

- [ ] Escolher o ícone apropriado do Lucide React
- [ ] Importar o ícone no arquivo correto
- [ ] Adicionar o item no array do role correspondente
- [ ] Definir href seguindo convenção de rotas
- [ ] Criar a página correspondente
- [ ] Adicionar rota no App.tsx (se necessário)
- [ ] Testar navegação
- [ ] Verificar responsividade mobile

---

## 7. Exemplo Completo - Adicionando "Relatórios" para Admin

### 1. No main-layout.tsx:
```typescript
// Importar ícone
import { BarChart3 } from "lucide-react";

// Adicionar no case "admin":
{ href: "/admin/reports", icon: BarChart3, label: "Relatórios" },
```

### 2. Criar arquivo da página:
`client/src/pages/admin/reports.tsx`

### 3. Adicionar rota no App.tsx:
```typescript
<Route path="/admin/reports" component={AdminReports} />
```

---

## 8. Troubleshooting

### Problemas Comuns:

1. **Ícone não aparece**: Verificar se foi importado corretamente
2. **Link não funciona**: Verificar se a rota existe no App.tsx
3. **Menu não atualiza**: Verificar se está no role correto
4. **Página não carrega**: Verificar se o arquivo da página existe

### Dicas:

- Use nomes de labels em português para melhor UX
- Mantenha consistência nas cores dos ícones
- Teste em diferentes roles/usuários
- Verifique responsividade em mobile
