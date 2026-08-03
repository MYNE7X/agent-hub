import { useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ShieldCheck,
  UserCircle,
  LogOut,
  Menu,
  X,
  Building2,
  UserCog,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, labelize } from "@/lib/billzo";

type NavItem = { to: string; label: string; icon: typeof Users; staffOnly?: boolean; superOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agents", label: "Agents", icon: Users, staffOnly: true },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/pending-approvals", label: "Pending", icon: UserCog, staffOnly: true },
  { to: "/admins", label: "Admins", icon: ShieldCheck, superOnly: true },
  { to: "/my-profile", label: "Profile", icon: UserCircle },
];

/** Animated "Made by" credit shown in sidebar + above mobile bottom nav */
function MadeByCredit({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 ${compact ? "py-1.5" : "py-2"}`}
      aria-label="Made by Myne7x (Aziz)"
    >
      <Sparkles className="size-3 text-primary/60 animate-pulse" />
      <span
        className={`${compact ? "text-[9px]" : "text-[10px]"} font-medium tracking-widest uppercase select-none`}
        style={{
          background: "linear-gradient(90deg, hsl(var(--primary)/0.5) 0%, hsl(var(--primary)) 40%, hsl(var(--primary)/0.8) 70%, hsl(var(--primary)/0.4) 100%)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "madeby-shimmer 3s linear infinite",
        }}
      >
        Made by Myne7x (Aziz)
      </span>
      <Sparkles className="size-3 text-primary/60 animate-pulse" style={{ animationDelay: "1.5s" }} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, roles, isSuperAdmin, isStaff, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((i) => (!i.staffOnly || isStaff) && (!i.superOnly || isSuperAdmin));
  const primaryRole = roles.includes("super_admin")
    ? "super_admin"
    : roles.includes("admin")
      ? "admin"
      : "agent";

  // Bottom nav: show up to 5 items; if more, last slot becomes the hamburger
  const bottomItems = items.slice(0, 5);
  const extraItems = items.slice(5);

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
        <span className="grid size-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Building2 className="size-5 text-primary" />
        </span>
        <span>
          <span className="font-display block text-lg font-semibold leading-tight text-gradient">Billzo</span>
          <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">Office System</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            activeProps={{ className: "bg-primary/15 text-primary ring-1 ring-primary/25" }}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary/70 hover:text-foreground"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary/60 transition-colors group-hover:bg-primary/15">
              <item.icon className="size-4 transition-transform duration-200 group-hover:scale-110" />
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Profile card */}
      <div className="glass rounded-xl p-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 ring-2 ring-primary/20 ring-offset-1 ring-offset-background">
            <AvatarFallback className="bg-primary/20 text-xs text-primary">
              {initials(profile?.full_name ?? profile?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile?.full_name ?? "User"}</p>
            <p className="truncate text-[11px] text-muted-foreground">{labelize(primaryRole)}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={async () => {
            await signOut();
            void router.navigate({ to: "/" });
          }}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>

      {/* Animated credit */}
      <div className="border-t border-border/30 pt-1">
        <MadeByCredit />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* ── Desktop sidebar ── */}
      <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-64 rounded-none border-y-0 border-l-0 lg:block">
        {sidebar}
      </aside>

      {/* ── Mobile slide-in drawer (extra items / full nav fallback) ── */}
      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="glass animate-rise fixed inset-y-0 left-0 z-50 w-72 rounded-none lg:hidden">
            {sidebar}
          </aside>
        </>
      ) : null}

      {/* ── Main content ── */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="glass sticky top-0 z-30 flex items-center gap-3 rounded-none border-x-0 border-t-0 px-4 py-3 lg:px-8">
          {/* Hamburger only shown on mobile (for extra items or as fallback) */}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          {/* Brand mark on mobile header */}
          <div className="flex items-center gap-2 lg:hidden">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Building2 className="size-3.5 text-primary" />
            </span>
            <span className="font-display text-sm font-semibold text-gradient">Billzo</span>
          </div>
          <div className="flex-1" />
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {labelize(primaryRole)}
          </span>
        </header>

        {/* Page content — extra bottom padding on mobile for bottom nav */}
        <main className="surface-grid min-h-[calc(100vh-57px)] px-4 py-6 pb-24 lg:px-8 lg:pb-6">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="glass fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t border-border/50 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {bottomItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            activeProps={{
              className: "text-primary after:absolute after:top-0 after:inset-x-2 after:h-0.5 after:rounded-full after:bg-primary",
            }}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-95"
          >
            <span className="grid size-8 place-items-center rounded-xl transition-all duration-150 hover:bg-primary/10">
              <item.icon className="size-5" />
            </span>
            <span className="text-[9px] font-medium leading-none tracking-wide">{item.label}</span>
          </Link>
        ))}
        {/* If there are extra items, show a "More" slot that opens the drawer */}
        {extraItems.length > 0 && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <span className="grid size-8 place-items-center rounded-xl transition-all duration-150 hover:bg-primary/10">
              <Menu className="size-5" />
            </span>
            <span className="text-[9px] font-medium leading-none tracking-wide">More</span>
          </button>
        )}
      </nav>

      {/* ── shimmer keyframe ── */}
      <style>{`
        @keyframes madeby-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  );
}
