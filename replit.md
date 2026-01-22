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