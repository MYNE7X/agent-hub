# Billzo Office Management System

Agent Management + Attendance module — a premium dark-glass SaaS dashboard for managing agent profiles, documents, and daily attendance.

## Stack

- **Frontend**: React 19 + Vite 8 (SPA)
- **Routing**: TanStack Router v1 (file-based)
- **State/Data**: TanStack Query v5
- **Styling**: Tailwind CSS v4 + tw-animate-css
- **UI components**: Radix UI + shadcn/ui
- **Auth & DB**: Supabase (auth + PostgreSQL + storage)
- **Forms**: React Hook Form + Zod

## Running the app

```bash
npm run dev      # dev server on http://localhost:5000
npm run build    # production build → dist/
npm run preview  # preview production build locally
```

## Deployment (Vercel)

The project is a plain Vite SPA configured for Vercel:

- `vercel.json` rewrites all routes to `index.html` for client-side routing
- Set these environment variables in the Vercel dashboard:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

## Project structure

```
src/
  routes/          # File-based routes (TanStack Router)
    __root.tsx     # Root layout (QueryClient + AuthProvider)
    index.tsx      # Sign-in / Create Account page (/)
    _authenticated/
      route.tsx    # Auth guard — redirects to / if not logged in
      dashboard.tsx
      agents/      # Agent directory, new agent, agent detail
      attendance/  # Clock in/out, daily attendance view
  components/
    agents/        # AgentForm, DocumentManager
    billzo/        # StatCard, StatusBadge, SecureImage, etc.
    layout/        # AppShell (sidebar + nav)
    ui/            # shadcn/ui components
  hooks/
    useAuth.tsx    # Auth context (session, roles, profile)
  integrations/
    supabase/
      client.ts    # Browser Supabase client
      types.ts     # Generated DB types
  lib/             # Utility helpers, query hooks, export utils
```

## Roles

| Role        | Access                                          |
|-------------|-------------------------------------------------|
| super_admin | Full access — manage admins, agents, all data   |
| admin       | Manage assigned agents, attendance, reports     |
| agent       | Own profile, mark attendance, upload documents  |

## User preferences

- Keep the existing dark-glass design system and Tailwind v4 setup.
