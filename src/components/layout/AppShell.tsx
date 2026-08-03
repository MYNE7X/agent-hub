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
  { to: "/pending-approvals", label: "Pending Approvals", icon: UserCog, staffOnly: true },
  { to: "/admins", label: "Admins & Roles", icon: ShieldCheck, superOnly: true },
  { to: "/my-profile", label: "My Profile", icon: UserCircle },
];

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
            <item.icon className="size-4 transition-transform duration-200 group-hover:scale-110" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="glass rounded-xl p-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
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
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-64 rounded-none border-y-0 border-l-0 lg:block">
        {sidebar}
      </aside>

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

      <div className="lg:pl-64">
        <header className="glass sticky top-0 z-30 flex items-center gap-3 rounded-none border-x-0 border-t-0 px-4 py-3 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Agent Management &amp; Attendance</p>
          </div>
          <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:inline-flex">
            {labelize(primaryRole)}
          </span>
        </header>
        <main className="surface-grid min-h-[calc(100vh-57px)] px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}