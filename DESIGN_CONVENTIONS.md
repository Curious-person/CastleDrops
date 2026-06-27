# Castle Drops UI/UX Design Conventions

This document outlines the UI/UX design conventions, styling constraints, and responsive implementation patterns for the Castle Drops project. All developers and agents working on UI components must strictly adhere to these guidelines.

---

## 🎨 Core Design System & Colors

### 1. Primary Palette
*   **Primary Brand Color**: `#2FA9D9` (Sky Blue). 
    *   Used for active sidebar states, primary buttons, badges, highlights, and main page titles.
*   **Body & Typography UI Color**: Off-Black (e.g., `text-gray-900`, `text-slate-900`, or `#1A1A1A`).
    *   Most text elements should use off-black for high contrast and modern styling. Avoid pure black text (`text-black`).
*   **Page Background**: `#e7f6fc` (Soft blue tint).
    *   Used globally on the dashboard layout container.
*   **Card / Content Background**: `bg-white` (pure white) with `rounded-xl` border radius.

### 2. Status & Badge Colors
Use soft background fills with colored text for statuses and tags rather than solid, high-contrast fills:
*   **Delivered / Success**: `bg-emerald-50 text-emerald-700 border border-emerald-200`
*   **Cancelled / Error**: `bg-rose-50 text-rose-700 border border-rose-200`
*   **Ongoing / Progress**: `bg-sky-50 text-sky-700 border border-sky-200`
*   **Water Types**:
    *   *Alkaline*: `bg-sky-100 text-sky-700`
    *   *Mineral*: `bg-emerald-100 text-emerald-700`
*   **Container Types**:
    *   *Round*: `bg-orange-100 text-orange-700`
    *   *Flat*: `bg-slate-100 text-slate-700`
*   **Payment Methods**:
    *   *GCash*: `bg-blue-100 text-blue-700`
    *   *Cash*: `bg-green-100 text-green-700`
    *   *Bank Transfer*: `bg-purple-100 text-purple-700`
    *   *Credit*: `bg-amber-100 text-amber-700`

---

## 🚫 Shadows & Borders

> [!IMPORTANT]
> **Use NO Shadows.**
> Shadows (e.g., `shadow`, `shadow-md`, `shadow-lg`) are prohibited in UI layouts. Instead, establish depth, hierarchy, and separation using:
> *   Clean borders: `border border-gray-100` or `border border-gray-200`
> *   Background contrast: White content panels placed on the `#e7f6fc` layout background.
> *   Whitespace and consistent padding.
> *   *Note*: The only exceptions are default UI inputs/buttons defined within shadcn (e.g. `shadow-xs` in outline buttons), but custom components must not declare custom shadow utilities.

---

## 🧩 Icons & UI Library

### 1. Lucide Icons
*   Use `lucide-react` exclusively for icons across the codebase.
*   **Sizing Convention**:
    *   Button icon labels: `w-4 h-4` (e.g., `<Trash className="w-4 h-4" />`)
    *   Standard status/action buttons: `w-4 h-4` or `w-3.5 h-3.5`
    *   Section headers or tallies: `w-5 h-5`
    *   Empty states / Illustrations: `w-12 h-12` (opacity `50%`)
*   Add a margins to icons in buttons (e.g., `<Plus className="mr-2 w-4 h-4" />`).

### 2. No Emojis
*   **Do NOT use emojis as icons or visual accents anywhere in the UI.** For example, avoid using emojis like `🚚` or `🏪` for delivery status, categories, buttons, or list tags. Always use standard `lucide-react` icons (e.g., `Truck` or `Store`) for graphical representation.

### 3. Shadcn Components
Leverage shadcn components from `@/components/ui/*` rather than writing custom HTML components:
*   **Modals & Dialogs**: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
*   **Dropdown / Selects**: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
*   **Tabs**: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
*   **Buttons**: Use custom variants where defined (e.g., `variant="sidebar"`, `variant="outline"`).

---

## 📱 Responsiveness (Mobile & Web)

Every component must degrade gracefully on mobile screens:

### 1. Sidebar & Navigation
*   **Desktop**: Sticky sidebar on the left (`w-64 min-w-[256px]`).
*   **Mobile**: The sidebar should adapt. *Pattern to follow:* Hide the fixed sidebar (`hidden md:flex`) and implement a hamburger trigger rendering a sheet drawer (`Sheet` from Shadcn) on mobile viewports.

### 2. Page Padding
Apply responsive padding to layout containers:
*   Use Tailwind classes: `p-4 sm:p-6 lg:p-8` to ensure touch targets don't clip at screen edges.

### 3. Grid & Column Layouts
Avoid hardcoded widths for grid items. Use responsive grid columns:
*   `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
*   Keep form elements full-width on mobile (`w-full`), and let them resize to standard widths on larger screens (`sm:w-auto` or `sm:max-w-md`).

### 4. Data Tables vs. Cards
Standard tables overflow and become unreadable on mobile devices.
*   **Responsive Tables**: Wrap tables in an scrollable wrapper:
    ```tsx
    <div className="w-full overflow-x-auto">
      <Table>...</Table>
    </div>
    ```
*   **Card-based Layout fallback (Recommended)**: For list-heavy views, use a table on desktop but render responsive card elements (`block md:hidden`) on mobile.

---

## ⚙️ Key Implementation Patterns

### 1. Page Container Pattern
Wrap all screen content in the standard `PageContainer` component:
*   Located at `@/components/PageContainer`.
*   Automatically applies responsive padding and encapsulates children in a rounded white background.

### 2. Search & Filtering Debouncing
*   When executing text search queries that touch Supabase database actions, always wrap the query handler in a debounce callback (`useDebouncedCallback` from `use-debounce`) with a default timeout of `300ms` to prevent server overload.

### 3. Loading & Mutation Feedback
*   Show active state transitions (e.g., disabling buttons and rendering `Updating...` or spinner) when invoking Supabase Server Actions.
*   Disable modal action buttons while a transaction/action is pending to prevent duplicate submissions.

### 4. Session-Based Tallies
*   For grouped operations (such as multi-order sessions), provide a summary tally modal detailing breakdown items (e.g., sum of quantities and total prices by container/water type) to enhance administrative UX.
