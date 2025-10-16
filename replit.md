# Overview

This is a comprehensive ERP (Enterprise Resource Planning) system designed for sales and outsourced production management with financial control. The system provides different user interfaces for administrators, vendors, clients, external producers, and finance teams to manage the complete workflow from sales through production to delivery and payment reconciliation.

The application features vendor-specific sales links, automated client and order registration upon 30% payment confirmation, production order distribution to external producers, and OFX bank file import for payment reconciliation. It's built as a modern web application with real-time updates and role-based access control.

# Recent Changes

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