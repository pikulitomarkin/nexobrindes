# Overview

This ERP system manages sales and outsourced production with integrated financial control. It provides role-based interfaces for administrators, vendors, clients, external producers, and finance teams to manage the entire workflow from sales to production, delivery, and payment reconciliation. Key features include vendor-specific sales links, automated client and order registration upon partial payment, distribution of production orders to external producers, and OFX bank file import for payment reconciliation. The system aims to streamline operations, provide real-time updates, and ensure secure, role-based access.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend uses React 18 with TypeScript, built with Vite. It utilizes shadcn/ui and Radix UI primitives, styled with Tailwind CSS. Wouter is used for lightweight client-side routing. State management relies on TanStack React Query for server state and caching. The UI features a panel-based architecture with different dashboards for Admin, Vendor, Client, Producer, and Finance roles.

## Backend Architecture
The backend is built with Express.js and Node.js (ES modules), following a REST API architecture. It includes error handling middleware and request/response logging. A storage abstraction layer (`server/storage.ts`) is used for data operations. The API provides endpoints for dashboard statistics, order management, and role-specific data.

## Data Storage
PostgreSQL is the primary database, managed with Drizzle ORM for interactions and migrations. The schema includes core entities like users, orders, production orders, payments, commissions, and vendors, with UUIDs as primary keys and proper relationships. Development and production databases are separate, with schema synchronization on deployment and distinct data. Production databases are initialized with essential configuration and an admin user.

## Authentication and Authorization
The system implements role-based access control (admin, vendor, client, producer, finance), restricting access to specific panels and functionalities based on the user's role.

# External Dependencies

- **Neon Database**: Serverless PostgreSQL database hosting.
- **OFX File Processing**: For importing bank statements and payment reconciliation.
- **Payment Webhooks**: Integrations for automated payment confirmation.
- **React Query**: For efficient server state management and caching.
- **Drizzle Kit**: For database migrations and schema management.

# Recent Changes (January 2026)

## Order Cancellation / Refund System
When an order is cancelled (via PATCH /api/orders/:id/cancel):
1. Order status is set to 'cancelled' and paidValue is reset to '0.00'
2. The refundAmount is set to the original paidValue (if any)
3. All related commissions are set to status='cancelled' AND amount='0.00'
4. All accounts receivable for the order are set to receivedAmount='0.00' and status='cancelled'
5. A manual payable (estorno) is created if the order had payments

This ensures:
- Cancelled order commissions don't count in "Total a Pagar" calculations
- Cancelled accounts receivable don't count in "Contas a Receber" totals
- Refund amounts are properly tracked via the refundAmount field, not paidValue

## Vendor Commission Control
Vendors can now be configured as commissioned or non-commissioned:
- The `isCommissioned` field in the users table (default: true) determines if a vendor receives automatic commissions
- Vendor registration form includes a "Vendedor Comissionado" checkbox
- When a vendor is marked as non-commissioned (isCommissioned = false):
  1. No vendor commissions are generated for their orders
  2. Partner commissions are still processed normally
  3. Commission sections are hidden in their vendor panel
  4. Commission links are hidden in sidebar and navigation menus
- The commission logic in both storage.ts and storage.pg.ts checks `vendorUser.isCommissioned` before creating vendor commissions

## Pricing System (Formação de Preço) - February 2026
The system includes a complete pricing engine for calculating sale prices based on cost and revenue-based margin tiers.

### Tables
- `pricing_settings`: Stores global pricing configuration (tax rate, commission rate, cash discount)
- `pricing_margin_tiers`: Stores tiered margins based on **revenue ranges** (faturamento), each with both `marginRate` (ideal) and `minimumMarginRate` (minimum)
- `products.cost_price`: Product cost (used in margin calculations)

### Pricing Calculation Formula (Markup Divisor)
```
Ideal Price = Cost / (1 - Tax Rate - Commission Rate - Margin Rate)
Minimum Price = Cost / (1 - Tax Rate - Commission Rate - Minimum Margin Rate)
```

### Revenue-Based Margin Tiers (Current Configuration)
- R$ 0 - R$ 5,000: Margin 28%, Min Margin 20%
- R$ 5,001 - R$ 8,000: Margin 25%, Min Margin 18%
- R$ 8,001 - R$ 15,000: Margin 24%, Min Margin 17%
- R$ 15,001+: Margin 23%, Min Margin 16%

The tier is selected based on the total budget value (faturamento), not item quantity.

### Integration Points
1. **Admin Pricing Page** (`/admin/pricing`): Configure tax rates, commission rates, cash discount, and revenue-based margin tiers
2. **Budget Form**: When adding products, the system calculates:
   - Ideal price based on product cost and revenue-based margin from matching tier
   - Minimum price based on minimum margin from matching tier
   - Prices auto-recalculate when budget total crosses tier thresholds
3. **Discount Blocking**: Discounts are disabled when all products are already at minimum price
4. **Price Validation**: Visual indicator shows when unit price is below minimum

### API Endpoints
- `GET /api/pricing/settings`: Get active pricing settings
- `PUT /api/pricing/settings/:id`: Update pricing settings
- `GET /api/pricing/margin-tiers/:settingsId`: Get margin tiers
- `POST /api/pricing/margin-tiers`: Create/update margin tier (with minRevenue, maxRevenue, marginRate, minimumMarginRate)
- `PUT /api/pricing/margin-tiers/:id`: Update margin tier
- `DELETE /api/pricing/margin-tiers/:id`: Delete margin tier
- `POST /api/pricing/calculate`: Calculate price based on cost, quantity, and revenue

## TV Dashboard Data Source (February 2026)
The TV Dashboard (`/admin/tv-dashboard`) uses converted budgets as the primary sales data source, NOT the orders table (which may be empty). 
- **API**: `GET /api/tv-dashboard/sales` returns all converted budgets enriched with vendor name, budget items, client city/state, and branch data
- **Sales = Converted Budgets**: All temporal calculations (annual, monthly, weekly) filter converted budgets by `createdAt`
- **Top Vendors**: Ranked by total sales value (valor), showing weekly/monthly/annual breakdowns with vendor photos
- **Products Counting**: Counts 1 per order/budget that contains the product (not quantity sum)
- **Revenue by State**: Uses Brazil map with state-level coloring; derives state from branch.estado → client city → default RS
- **Branch Performance**: Sales without branchId default to Matriz (Novo Hamburgo - RS)