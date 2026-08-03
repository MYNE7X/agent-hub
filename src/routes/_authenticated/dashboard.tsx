import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, UserCheck, UserX, Clock, PlaneTakeoff, ArrowRight } from "lucide-react";

import { StatCard } from "@/components/billzo/StatCard";
import { StatusBadge } from "@/components/billzo/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAgents, useAttendance } from "@/lib/queries";
import { formatTime, hoursLabel, todayISO } from "@/lib/billzo";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Billzo Office Management" },
      { name: "description", content: "Live agent headcount and today's attendance overview in Billzo." },
      { property: "og:title", content: "Dashboard — Billzo Office Management" },
      { property: "og:description", content: "Live agent headcount and today's attendance overview." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, isStaff } = useAuth();
  const today = todayISO();
  const { data: agents } = useAgents();
  const { data: attendance } = useAttendance(today);

  const rows = attendance ?? [];
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const total = agents?.length ?? 0;

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Welcome back, <span className="text-gradient">{profile?.full_name ?? "there"}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here is the live snapshot for {new Date().toLocaleDateString("en-PK", { dateStyle: "full" })}.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Agents" value={total} icon={Users} delay={0} />
        <StatCard label="Present Today" value={count("present")} icon={UserCheck} tone="success" delay={60} />
        <StatCard label="Absent Today" value={count("absent")} icon={UserX} tone="destructive" delay={120} />
        <StatCard label="Late Today" value={count("late")} icon={Clock} tone="warning" delay={180} />
        <StatCard label="On Leave" value={count("leave")} icon={PlaneTakeoff} tone="info" delay={240} />
      </section>

      <section className="glass animate-rise rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Today&apos;s Activity</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/attendance">
              Attendance <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        {!rows.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No attendance recorded yet today.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {rows.slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="flex-1 truncate font-medium">{r.agents?.full_name ?? "—"}</span>
                <span className="hidden w-28 text-muted-foreground sm:block">{r.agents?.employee_id}</span>
                <span className="w-20 text-muted-foreground">{formatTime(r.clock_in)}</span>
                <span className="w-20 text-muted-foreground">{formatTime(r.clock_out)}</span>
                <span className="hidden w-20 tabular-nums text-muted-foreground sm:block">
                  {hoursLabel(r.total_hours)}
                </span>
                <StatusBadge value={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {isStaff ? (
        <section className="glass animate-rise rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Quick actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/agents/new">Add new agent</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/agents">Manage agents</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/attendance">Attendance dashboard</Link>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}