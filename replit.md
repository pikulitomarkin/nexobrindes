# Overview

This is a comprehensive ERP (Enterprise Resource Planning) system designed for sales and outsourced production management with financial control. The system provides different user interfaces for administrators, vendors, clients, external producers, and finance teams to manage the complete workflow from sales through production to delivery and payment reconciliation.

The application features vendor-specific sales links, automated client and order registration upon 30% payment confirmation, production order distribution to external producers, and OFX bank file import for payment reconciliation. It's built as a modern web application with real-time updates and role-based access control.

# Recent Changes

**October 29, 2025 - CLIENT SELF-REGISTRATION PORTAL**
- **FEATURE: Public Client Registration Page** - Clientes podem se cadastrar sozinhos no sistema
- **URL**: /clientes (rota pública, não requer autenticação)
- **Funcionalidades**:
  - Interface com tabs "Login" e "Cadastro"
  - Formulário completo com dados do cliente (nome, email, telefone, whatsapp, CPF, endereço)
  - Seleção obrigatória de vendedor (dropdown com todos vendedores ativos)
  - Validação de senha com confirmação
  - Geração automática de código de usuário após cadastro
  - Auto-preenchimento do login após cadastro bem-sucedido
  - Design responsivo com gradiente e componentes shadcn/ui
- **Backend**: Reutiliza POST /api/clients existente com associação vendorId
- **Impacto**: 
  - Clientes podem se registrar sem intervenção do admin
  - Associação automática cliente-vendedor
  - Vendedor vê cliente em sua lista após registro
  - Fluxo completo testado e validado end-to-end
- **Files Modified**: 
  - client/src/pages/ClientRegister.tsx (created)
  - client/src/App.tsx (added public route)

**October 29, 2025 - POST-MIGRATION BUG FIXES**
- **FIXED: Producer Payment Auto-Creation** - Pagamentos de produtores não eram criados quando production order era marcado como 'ready'
- **Root Cause**: Endpoint PATCH /api/production-orders/:id/status apenas atualizava status, não criava pagamento
- **Solution**: Adicionada lógica automática (linhas 1350-1392):
  - Ao marcar como 'ready', verifica se já existe pagamento (evita duplicatas)
  - Cria producer_payment com status 'pending' se não existir
  - Verifica se TODOS os production orders estão prontos antes de atualizar pedido do cliente
  - Guarda contra array vazio (evita marcar como 'ready' prematuramente)
- **Files Modified**: server/routes.ts (added lines 1350-1392)
- **Impact**: 
  - Produtores agora veem o valor a receber no painel deles
  - Admin vê o pagamento pendente no financeiro
  - Cliente só vê pedido como 'ready' quando TODOS os produtores finalizaram
  - Multi-produtor workflows agora funcionam corretamente

**October 29, 2025 - BUDGET ITEMS INSERTION FIX**
- **FIXED: Budget Items Not Saving** - Items não eram salvos no banco, causando pedidos vazios na logística
- **Root Cause**: Frontend enviava strings vazias ("") para campos numéricos, causando "invalid input syntax for type numeric: ''" no PostgreSQL
- **Solution**: Adicionada normalização em POST /api/budgets (linhas 5551-5566):
  - Converte strings vazias para null em campos nullable (productWidth, productHeight, etc.)
  - Converte strings vazias para "0.00" em campos decimal (customizationValue, discountValue, etc.)
  - Converte strings vazias para null em campos text (customizationPhoto, etc.)
- **Files Modified**: server/routes.ts (added normalization in budget creation)
- **Impact**: Orçamentos agora salvam items corretamente e aparecem na logística após conversão e pagamento

**October 29, 2025 - RECEIVABLES MINIMUM PAYMENT FIX**
- **FIXED: Entrada Zerada** - Contas a receber mostravam R$ 0,00 para valor mínimo (entrada)
- **Root Cause**: Campo minimum_payment estava zerado após migração para PostgreSQL
- **Solution**: Executado SQL para recalcular minimum_payment de budget_payment_info (downPayment + shippingCost)
- **Impact**: 4 receivables corrigidos com valores corretos (R$ 32, R$ 35, R$ 700, R$ 1.100)

**October 27, 2025 - RECEIVABLES CARD PAYMENT UPDATE FIX**
- **FIXED: Contas a Receber Card Not Updating After Payment** - Valor restante permanecia igual ao valor total do pedido após registrar entrada
- **Root Cause**: Endpoint `/api/receivables/:id/payment` criava o pagamento MAS NÃO atualizava o `receivedAmount` no accountsReceivable para pedidos (apenas para receivables manuais)
- **Solution**: Adicionada atualização do receivedAmount após criar pagamento de pedidos (linhas 2966-2976):
  - Calcula newReceivedAmount = currentReceived + payment amount
  - Atualiza receivedAmount no accountsReceivable
  - Atualiza status para 'paid' ou 'partial' baseado no valor total
  - Adicionado log detalhado para debug
- **Files Modified**: server/routes.ts (added lines 2966-2976)
- **Impact**: Card "Contas a Receber" no dashboard admin agora mostra valor correto após registrar pagamentos (entrada ou complemento)

**October 27, 2025 - PRODUCTION ORDER ROUTING FIX**
- **FIXED: Duplicate Route Bug in Logistics** - Clicking "Send to Producer" button for ONE producer was triggering MULTIPLE producers
- **Root Cause**: Duplicate `/api/orders/:id/send-to-production` route (lines 5853-5917) was overriding the correct implementation (line 462)
- **Solution**: Removed duplicate route completely, keeping only the robust implementation with:
  - Proper producerId filtering when specific producer is sent
  - Item grouping by producer with deduplication
  - Validation that only requested producer is processed
  - Detailed logging for debugging
- **Files Modified**: server/routes.ts (removed lines 5853-5917)
- **Impact**: Each "Send to Producer" button now correctly sends ONLY to that specific producer, not all producers
- Frontend already had correct event handling with stopPropagation() and isPending checks

**October 27, 2025 - CRITICAL BUG FIX**
- **FIXED: Order Total Calculation Error** - Pedidos de R$ 15.000,00 apareciam como R$ 4.672,00 no painel financeiro
- **Root Cause**: convertBudgetToOrder copiava budget.totalValue sem recalcular; valores em formato brasileiro ("15.000,00") eram mal interpretados
- **Solution Implemented**:
  1. Created `parseBRLCurrency()` helper function that auto-detects format:
     - Brazilian format ("15.000,00") → 15000.00
     - Standard format ("15000.00") → 15000.00  
     - Never corrupts already-normalized values
  2. Created `parsePercentage()` for discount percentages (supports "10,5" and "10.5")
  3. convertBudgetToOrder now recalculates totalValue from items + customizations + discounts + shipping
  4. All monetary fields normalized on budget/item creation and updates
- **Files Modified**: server/storage.ts (lines 2501-2752)
- **UI CONSOLIDATION**: "Personalização Geral" foi movida para dentro de "Personalização do Item" criando interface mais limpa com apenas 1 toggle
- Estrutura consolidada aplicada em admin/budgets.tsx, vendor/orders.tsx e vendor/budgets.tsx
- Divisão visual com Separator entre personalização do item e personalização geral
- Removido toggle duplicado de "Personalização Geral" que estava causando confusão de UI

**October 22, 2025**
- **OFX PARSER CORRIGIDO**: Substituído parsing regex por biblioteca node-ofx-parser robusta
- Corrigido caminho de acesso: ofxData.OFX (não ofxData.body.OFX) - parser retorna estrutura diretamente
- Importação OFX agora funcional com deduplicação por FITID e hash determinístico SHA256
- Sistema de mutual exclusivity implementado: manual bloqueia OFX e vice-versa
- Adicionados campos reconciliationStatus, bankTransactionId, rawFitId aos payments/producerPayments

**October 16, 2025**
- Fixed critical bug in product import: storage.importProducts now correctly preserves producerId and type fields when importing JSON products
- Product imports in Logistics panel now correctly associate products with the selected producer instead of defaulting to "internal"
- Added producerId and type preservation in storage.ts importProducts function (lines 2010-2012)

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend uses **React 18** with **TypeScript** and is built using **Vite** as the build tool. The component library is based on **shadcn/ui** with **Radix UI** primitives, styled using **Tailwind CSS** with CSS variables for theming. The application uses **Wouter** for client-side routing instead of React Router, providing a lightweight routing solution.

State management is handled through **TanStack React Query** (formerly React Query) for server state management and caching. The UI follows a panel-based architecture where different user roles see different dashboards (Admin, Vendor, Client, Producer, Finance) all accessible from a single interface with role switching capabilities.

## Backend Architecture
The backend is built with **Express.js** and **Node.js** using ES modules. It follows a REST API architecture with proper error handling middleware and request/response logging. The server implements a storage abstraction layer defined in `server/storage.ts` that provides a clean interface for data operations, though the actual database implementation appears to be incomplete in the current codebase.

The API structure includes endpoints for dashboard statistics, orders management, and role-specific data retrieval. The server is configured for both development (with Vite integration) and production deployments.

## Data Storage
The system is configured to use **PostgreSQL** as the primary database with **Drizzle ORM** for database interactions and migrations. The database schema defines the core entities: users, orders, production orders, payments, commissions, and vendors with proper relationships and constraints.

### Development vs Production Database Separation
Replit automatically maintains separate databases for development and production:

- **Development Database**: Used in the workspace/editor environment via `DATABASE_URL`
- **Production Database**: Used in published deployments via separate production `DATABASE_URL`

**Important**: 
- Schema changes (structure) are synchronized automatically when publishing
- Data is NOT synchronized automatically between environments
- Use `npm run db:push` to sync schema changes to development
- Use `npx tsx server/reset-production.ts` to reset production database
- Use `npx tsx server/seed.ts` to populate empty databases with essential data

Production database contains only clean data:
- 1 admin user (username: admin, password: 123456)
- Essential configuration tables (payment methods, shipping methods, etc.)
- No test data from development environment

Key tables include:
- `users` - Multi-role user management (admin, vendor, client, producer, finance)
- `orders` - Main order tracking with status workflow
- `production_orders` - External production management
- `payments` - Payment tracking and reconciliation
- `commissions` - Vendor commission calculations
- `vendors` - Vendor-specific data and sales links

The schema uses UUIDs for primary keys and includes proper foreign key relationships and status tracking fields.

## Authentication and Authorization
The system implements role-based access control with five distinct user roles: admin, vendor, client, producer, and finance. Each role has access to specific panels and functionality within the application. The current implementation appears to use a simple role-based system without JWT tokens or complex session management visible in the codebase.

## External Dependencies
- **Neon Database** - Serverless PostgreSQL database hosting
- **OFX File Processing** - For bank statement import and payment reconciliation
- **Payment Webhooks** - Integration for automated payment confirmation (30% down payment)
- **React Query** - For efficient server state management and caching
- **Drizzle Kit** - Database migrations and schema management

The system is designed to integrate with external payment processors through webhooks and supports OFX file format for bank reconciliation, making it suitable for Brazilian financial workflows.