# CastleDrops - Project Context

## Project Overview

**CastleDrops** is a Next.js 16 web application for tracking daily water usage logs. The application provides a dashboard for recording, viewing, editing, and exporting water meter readings with usage calculations. It features a clean, responsive UI built with shadcn/ui components and Radix UI primitives, with data persistence handled by Supabase.

### Core Features
- **Daily Logs Management**: CRUD operations for water meter readings (opening/closing readings, usage calculation)
- **Search & Sorting**: Filter logs by notes, sort by date or usage amounts
- **Statistical Dashboard**: Revenue tracking cards with trend indicators (Philippine Peso currency)
- **Print/Export**: Report generation functionality for exporting logs
- **Responsive Design**: Mobile-first UI with Tailwind CSS v4

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.1.4 (App Router) |
| **Language** | TypeScript 5 |
| **UI Library** | React 19.2.3 |
| **Styling** | Tailwind CSS v4 |
| **Component System** | shadcn/ui (New York style), Radix UI |
| **Icons** | Lucide React |
| **Database** | Supabase |
| **Forms** | React Hook Form + Zod validation |
| **Tables** | TanStack Table (@tanstack/react-table) |
| **Utilities** | date-fns, clsx, tailwind-merge, use-debounce |

## Project Structure

```
my-next-app/
├── app/                      # Next.js App Router
│   ├── actions/              # Server actions (logs.ts)
│   ├── daily-logs/           # Daily logs feature page
│   │   ├── DailyLogsClient.tsx
│   │   └── page.tsx
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home (redirects to /daily-logs)
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── interaction/          # Interactive components
│   ├── index.ts
│   └── NavigationBar.tsx     # Top navigation with export button
├── features/
│   └── daily-logs/
│       └── components/       # Feature-specific components
│           ├── DataTable.tsx
│           ├── StatCard.tsx
│           └── PrintableDailyLogs.tsx
├── lib/
│   ├── supabase/
│   │   └── server.jsx        # Supabase client factory
│   └── utils.ts              # cn() utility function
└── public/
    └── images/
        └── logo.png          # Application logo
```

## Building and Running

### Prerequisites
- Node.js 20+
- Supabase project with `orders` table

### Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build    # Build for production
npm run start    # Start production server
```

### Linting
```bash
npm run lint
```

## Database Schema

The application expects a Supabase table `orders` with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| `id` | int8 | Primary key |
| `created_at` | timestamptz | Record creation timestamp |
| `updated_at` | timestamptz | Record update timestamp |
| `log_date` | date | Date of the log entry |
| `start_time` | time | Operation start time |
| `end_time` | time | Operation end time |
| `opening_reading` | numeric | Starting meter reading |
| `closing_reading` | numeric | Ending meter reading |
| `daily_usage` | numeric | Calculated usage (closing - opening) |
| `user_notes` | text | Optional notes |

## Development Conventions

### Code Style
- **TypeScript**: Strict mode enabled (`tsconfig.json`)
- **Path Aliases**: `@/*` maps to project root
- **Component Naming**: PascalCase for components, camelCase for utilities
- **File Organization**: Feature-based structure in `features/`, shared components in `components/`

### Architecture Patterns
- **Server Components**: Default for pages; data fetching in server components
- **Client Components**: Marked with `'use client'` for interactivity (forms, modals)
- **Server Actions**: CRUD operations in `app/actions/` with `revalidatePath` for cache invalidation
- **Form Validation**: Zod schemas with React Hook Form integration

### UI Conventions
- **shadcn/ui**: Component registry at `components/ui/`
- **Styling**: Tailwind CSS with `cn()` utility for conditional classes
- **Icons**: Lucide React icons consistently used throughout

## Key Implementation Details

1. **Home Page**: Automatically redirects to `/daily-logs`
2. **Search**: Debounced (300ms) search with URL state management
3. **Sorting**: Three options - Newest, Highest Usage, Lowest Usage
4. **Print Support**: `PrintableDailyLogs` component for report generation (hidden via `print:hidden` classes)
5. **Date Handling**: `date-fns` for formatting; client-side date initialization to prevent hydration mismatches
6. **Form Validation**: Cross-field validation ensures closing reading ≥ opening reading

