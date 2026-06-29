# CastleDrops - Project Context

## Project Overview

**CastleDrops** is a Next.js 16 web application for managing water refilling station operations. It supports tracking customer profiles, handling water orders (grouped by sessions), logging daily water flowmeter readings to analyze usage discrepancies, and configuring administrator settings. The app features a high-fidelity, responsive UI designed around standard brand conventions using Tailwind CSS v4, shadcn/ui components, and Supabase database integration.

---

### Core Features

- **Order Session Management**: Tracks customer orders grouped by unique sessions. Includes custom sorting (by log date, customer name, and water type) and search filters. Supports bulk ordering for multiple items under a single transaction.
- **Multi-Step Order Form**: An interactive wizard-style layout (`/orders/new`) that guides users through configuring container counts and refill times, picking payment methods, choosing fulfillment types, and reviewing order status.
- **Daily Flowmeter Logs**: Records start and end reading values (in gallons) to measure water usage. Compares logged values against actual orders sales volumes dynamically to highlight discrepancies.
- **Variance Warnings**: Automatically flags water usage variance (if metered usage vs. transactional order volume exceeds 5%) via alert components on the logs listing page.
- **Customer Directory**: Centralizes profiles including names, contact numbers, addresses, landmarks, and operational notes. Dynamically aggregates data from order history to determine their primary water preference (`alkaline`, `mineral`, `both`, or `no_order_yet`).
- **Administrative Utilities**: Handles user session authentication via cookies and supports admin-configured defaults like secure password reset/update flows.
- **Print & Invoicing Support**: Renders styled invoice sheets and summaries optimized for physical print layout styling.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.1.4 (App Router) |
| **Language** | TypeScript 5 |
| **UI Library** | React 19.2.3 / React DOM 19.2.3 |
| **Styling** | Tailwind CSS v4 |
| **Headless UI** | `@base-ui/react` ^1.2.0 & `radix-ui` ^1.4.3 |
| **Icons** | Lucide React |
| **Database Integration**| Supabase JS SDK (`@supabase/supabase-js` ^2.97.0) |
| **Forms & Validation** | React Hook Form + Zod validation |
| **Tables Engine** | TanStack Table (`@tanstack/react-table` ^8.21.3) |
| **Utility Packages** | date-fns, clsx, tailwind-merge, use-debounce |

---

## Project Structure

```
my-next-app/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Protected Authentication Group
│   │   ├── layout.tsx                # Auth layout template
│   │   ├── login/
│   │   │   └── page.tsx              # Email / Password sign-in form
│   │   └── reset-password/
│   │       └── page.tsx              # Passcode update interface
│   ├── (dashboard)/                  # Authenticated Dashboard Layout
│   │   ├── layout.tsx                # Sidebar & Header container wrapper
│   │   ├── customers/
│   │   │   └── page.tsx              # Customer directory screen
│   │   ├── orders/
│   │   │   ├── page.tsx              # Orders dashboard listing page
│   │   │   └── new/
│   │   │       └── page.tsx          # Multi-step checkout wizard form
│   │   ├── settings/
│   │   │   └── page.tsx              # Admin controls & profile settings
│   │   └── water-logs/
│   │       └── page.tsx              # Water usage tracker and variance panel
│   ├── actions/                      # Next.js Server Actions
│   │   ├── auth.ts                   # Supabase authentication methods
│   │   ├── customers.ts              # Customer CRUD & preferences aggregates
│   │   ├── logs.ts                   # Orders CRUD & session update hooks
│   │   └── water_logs.ts             # Flowmeter logs CRUD utilities
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts              # OAuth callback routing path
│   ├── globals.css                   # Global styling configuration
│   ├── layout.tsx                    # Root HTML layout wrapper
│   ├── loading.tsx                   # Default loader fallback component
│   └── page.tsx                      # Index home page (redirects to /orders)
├── components/
│   ├── ui/                           # Primitive shadcn/ui components
│   ├── DataTable.tsx                 # Reusable table (responsive card fallback on mobile)
│   ├── NavigationBar.tsx             # Header top-bar navigation component
│   ├── PageContainer.tsx             # Universal padding and panel card boundary
│   └── Sidebar.tsx                   # Sticky left panel (Hamburger sheet drawer on mobile)
├── features/
│   └── orders/                       # Feature modules for Orders
│       └── components/
│           ├── OrdersClient.tsx      # Main interactive client controller for orders
│           ├── PrintableOrders.tsx   # Print invoicing layout preview template
│           └── StatCard.tsx          # Numerical metrics panel template
├── lib/
│   ├── supabase/
│   │   └── server.jsx                # Server-side Supabase client instance factory
│   └── utils.ts                      # cn() tailwind-merge helper function
```

---

## Building and Running

### Prerequisites
- Node.js 20+
- A Supabase project with `orders`, `customers`, and `water_logs` tables configured.

### Environment Variables
Create a `.env.local` file in the project root containing the following configurations:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

### Script Tasks

- **Start Development Server**:
  ```bash
  npm run dev
  ```
  App opens locally at [http://localhost:3000](http://localhost:3000).

- **Production Compilation**:
  ```bash
  npm run build
  ```

- **Run Compiled Server**:
  ```bash
  npm run start
  ```

- **Lint Check**:
  ```bash
  npm run lint
  ```

---

## Database Schema

The database relies on three main tables managed in Supabase:

### 1. `customers` Table
Stores contact profiles and metadata for client records.
- `id` (uuid, Primary Key)
- `name` (text, Not Null)
- `phone` (text)
- `address` (text)
- `landmark` (text)
- `water_preference` (text)
- `notes` (text)
- `created_at` (timestamptz)

### 2. `orders` Table
Stores order logs linked to customer IDs.
- `id` (int8, Primary Key)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `log_date` (date)
- `customer_id` (uuid, Foreign Key referencing `customers(id)` on delete SET NULL)
- `customer_name` (text)
- `customer_address` (text)
- `water_type` (text)
- `container_type` (text)
- `quantity` (numeric)
- `price_per_gallon` (numeric)
- `total_gallons` (numeric)
- `total_price` (numeric)
- `payment_method` (text)
- `fulfillment_type` (text)
- `status` (text, default "ongoing")
- `session_id` (text)
- `session_address` (text)
- `session_status` (text)

### 3. `water_logs` Table
Logs daily water flowmeter measurements.
- `id` (uuid, Primary Key)
- `log_date` (date, Not Null)
- `water_type` (text, Not Null)
- `start_reading` (numeric, Not Null)
- `end_reading` (numeric, Not Null)
- `notes` (text)
- `created_at` (timestamptz)

---

## Development & Styling Conventions

### UI Design Constraints (from [DESIGN_CONVENTIONS.md](file:///d:/projects/projects/my-next-app/DESIGN_CONVENTIONS.md))

- **Colors**:
  - Primary Accent: `#2FA9D9` (Sky Blue) is the main highlight and active navigation color.
  - Page Backgrounds: Styled with a soft sky blue background tint (`#e7f6fc`).
  - Text: High-contrast off-black (`text-gray-900` or `text-slate-900`). Do not use full pure black (`text-black`).
- **No Layout Shadows**: Global layout panels, main tables, and screens must not define custom shadow classes (e.g. `shadow-md`, `shadow-lg`). Establish separation using borders (`border-gray-100` / `border-gray-200`) and the `#e7f6fc` background color.
- **Icons**: Use Lucide React (`lucide-react`) exclusively. No emojis as visual accents (e.g., use `lucide-react` icons like `Truck` instead of `🚚`).
- **Layout Wrapper**: Keep page interfaces wrapped in the universal [PageContainer.tsx](file:///d:/projects/projects/my-next-app/components/PageContainer.tsx) layout helper to enforce layout paddings (`p-4 sm:p-6 lg:p-8`).

### Architecture Guidelines

- **Next.js App Routing**: Grouped pages logically using route directories (`(auth)` and `(dashboard)`) to categorize public and private areas.
- **Server Actions**: All DB operations are isolated in `app/actions/` module files and leverage `revalidatePath` to trigger route caches refresh automatically.
- **Responsive Layout Design**:
  - Navigation sidebar is sticky on desktops but transforms into a trigger-controlled sheet drawer on mobile viewports.
  - Tables utilize a mobile card fallback template (`renderMobileItem` inside [DataTable.tsx](file:///d:/projects/projects/my-next-app/components/DataTable.tsx)) on smaller widths.
- **Search Queries**: Wrapping inputs in custom debounce logic (`300ms` window) to avoid redundant DB reads.

---

## File References & Code Modules

### Server Actions
* [auth.ts](file:///d:/projects/projects/my-next-app/app/actions/auth.ts) — Sign in, sign out, password updating methods.
* [customers.ts](file:///d:/projects/projects/my-next-app/app/actions/customers.ts) — CRUD routines for customer directory and water preference aggregations.
* [logs.ts](file:///d:/projects/projects/my-next-app/app/actions/logs.ts) — Order session modifiers, statuses, and deletion hooks.
* [water_logs.ts](file:///d:/projects/projects/my-next-app/app/actions/water_logs.ts) — Flowmeter reading update query helpers.

### Layout Components
* [Sidebar.tsx](file:///d:/projects/projects/my-next-app/components/Sidebar.tsx) — Main collateral menu panel.
* [NavigationBar.tsx](file:///d:/projects/projects/my-next-app/components/NavigationBar.tsx) — Sticky dashboard header.
* [PageContainer.tsx](file:///d:/projects/projects/my-next-app/components/PageContainer.tsx) — Content layout card container.
* [DataTable.tsx](file:///d:/projects/projects/my-next-app/components/DataTable.tsx) — Reusable table engine with responsive templates.

### Orders Feature
* [OrdersClient.tsx](file:///d:/projects/projects/my-next-app/features/orders/components/OrdersClient.tsx) — Dashboard orders management client logic.
* [PrintableOrders.tsx](file:///d:/projects/projects/my-next-app/features/orders/components/PrintableOrders.tsx) — Stylesheet and HTML structure optimized for receipt printers.
* [StatCard.tsx](file:///d:/projects/projects/my-next-app/features/orders/components/StatCard.tsx) — Numeric statistic presentation block.

---

*Updated based on the current codebase layout on June 29, 2026.*
