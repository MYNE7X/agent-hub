import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plus, Search, FileDown, Trash2, Eye, Users, UserCheck, UserX,
  Building2, Briefcase, Calendar, X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/billzo/StatusBadge";
import { SecureImage } from "@/components/billzo/SecureImage";
import { AGENT_STATUSES, formatDate, formatPKR, initials, labelize } from "@/lib/billzo";
import { useAgents, useDeleteAgent, useDepartments } from "@/lib/queries";
import { exportCSV, exportExcel, exportPDF, type ExportColumn } from "@/lib/export";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/agents/")({
  component: AgentsPage,
});

type Row = Record<string, unknown>;

const COLUMNS: ExportColumn<Row>[] = [
  { key: "employee_id", label: "Employee ID" },
  { key: "reference_id", label: "Reference ID" },
  { key: "full_name", label: "Full Name" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "phone_number", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "joining_date", label: "Joining Date" },
  { key: "salary", label: "Salary (PKR)" },
  { key: "status", label: "Status" },
];

/** Unique colour per department name (deterministic hash → hsl palette) */
function deptColor(name?: string | null) {
  if (!name) return { bg: "bg-secondary/60", text: "text-muted-foreground", ring: "ring-border/40" };
  const hues = [210, 160, 280, 40, 320, 185, 0, 240];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  const hue = hues[h % hues.length];
  return {
    bg: `bg-[hsl(${hue}_70%_55%/0.12)]`,
    text: `text-[hsl(${hue}_70%_65%)]`,
    ring: `ring-[hsl(${hue}_70%_55%/0.25)]`,
  };
}

/** Avatar with gradient fallback keyed to name */
function AgentAvatar({ path, name, size = "md" }: { path?: string | null; name: string; size?: "sm" | "md" }) {
  const px = size === "sm" ? "size-8" : "size-10";
  const tx = size === "sm" ? "text-xs" : "text-sm";
  const hues = [200, 270, 160, 30, 330];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  const hue = hues[h % hues.length];

  if (path) {
    return (
      <SecureImage
        path={path}
        alt={name}
        className={`${px} shrink-0 rounded-xl object-cover ring-2 ring-primary/20 ring-offset-1 ring-offset-background`}
      />
    );
  }
  return (
    <span
      className={`${px} ${tx} inline-flex shrink-0 items-center justify-center rounded-xl font-bold ring-2 ring-offset-1 ring-offset-background`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 30%), hsl(${hue} 70% 20%))`,
        color: `hsl(${hue} 70% 75%)`,
        ringColor: `hsl(${hue} 70% 50% / 0.3)`,
        boxShadow: `0 0 0 2px hsl(${hue} 70% 50% / 0.25), 0 0 12px hsl(${hue} 70% 50% / 0.12)`,
      }}
    >
      {initials(name)}
    </span>
  );
}

function AgentsPage() {
  const { isSuperAdmin } = useAuth();
  const { data: agents, isLoading } = useAgents();
  const { data: departments } = useDepartments();
  const del = useDeleteAgent();

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (agents ?? []).filter((a) => {
      const matches =
        !term ||
        [a.full_name, a.employee_id, a.reference_id, a.cnic_number, a.phone_number, a.email, a.city]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      return matches && (dept === "all" || a.department_id === dept) && (status === "all" || a.status === status);
    });
  }, [agents, q, dept, status]);

  const activeCount = (agents ?? []).filter((a) => a.status === "active").length;
  const inactiveCount = (agents ?? []).filter((a) => a.status !== "active").length;

  const exportRows: Row[] = filtered.map((a) => ({
    employee_id: a.employee_id,
    reference_id: a.reference_id,
    full_name: a.full_name,
    department: a.departments?.name ?? "",
    designation: a.designations?.name ?? "",
    phone_number: a.phone_number ?? "",
    email: a.email ?? "",
    joining_date: a.joining_date ?? "",
    salary: a.salary ?? "",
    status: labelize(a.status),
  }));

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    del.mutate(id, {
      onSuccess: () => toast.success("Agent deleted"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <header className="animate-rise flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Agent Directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} of {agents?.length ?? 0} agents
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* export cluster */}
          <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-secondary/30 p-1">
            <button
              onClick={() => exportCSV(exportRows, COLUMNS, "billzo-agents")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <FileDown className="size-3.5" /> CSV
            </button>
            <button
              onClick={() => void exportExcel(exportRows, COLUMNS, "billzo-agents")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <FileDown className="size-3.5" /> Excel
            </button>
            <button
              onClick={() => void exportPDF(exportRows, COLUMNS, "billzo-agents", "Billzo — Agents Report")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <FileDown className="size-3.5" /> PDF
            </button>
          </div>
          <Button size="sm" asChild className="gap-1.5 shadow-lg shadow-primary/20">
            <Link to="/agents/new">
              <Plus className="size-4" /> Add Agent
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Quick stat strip ── */}
      <div className="animate-rise grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: agents?.length ?? 0, icon: Users, color: "text-primary", bg: "bg-primary/10", ring: "ring-primary/20" },
          { label: "Active", value: activeCount, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
          { label: "Other", value: inactiveCount, icon: UserX, color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/20" },
        ].map((s) => (
          <div key={s.label} className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ring-1 ${s.bg} ${s.ring}`}>
              <s.icon className={`size-4 ${s.color}`} />
            </span>
            <div>
              <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search / filter bar ── */}
      <div className="glass animate-rise flex flex-col gap-3 rounded-2xl p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            className="border-border/50 bg-secondary/30 pl-9 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            placeholder="Search name, ID, CNIC, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="border-border/50 bg-secondary/30 sm:w-44">
            <Building2 className="mr-2 size-3.5 text-muted-foreground/60" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {(departments ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="border-border/50 bg-secondary/30 sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {AGENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{labelize(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table (desktop) / Cards (mobile) ── */}
      {isLoading ? (
        <div className="glass animate-rise flex items-center justify-center gap-3 rounded-2xl py-16 text-sm text-muted-foreground">
          <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading agents…
        </div>
      ) : !filtered.length ? (
        <div className="glass animate-rise flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Users className="size-6 text-primary/60" />
          </span>
          <p className="font-medium">No agents found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="glass animate-rise hidden overflow-hidden rounded-2xl md:block">
            {/* gradient accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-gradient-to-r from-secondary/60 via-secondary/40 to-secondary/60">
                    <th className="px-5 py-3.5 text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Agent</span>
                    </th>
                    <th className="px-4 py-3.5 text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Employee ID</span>
                    </th>
                    <th className="px-4 py-3.5 text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Department</span>
                    </th>
                    <th className="px-4 py-3.5 text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Designation</span>
                    </th>
                    <th className="px-4 py-3.5 text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Joined</span>
                    </th>
                    <th className="px-4 py-3.5 text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Salary</span>
                    </th>
                    <th className="px-4 py-3.5 text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Status</span>
                    </th>
                    <th className="px-4 py-3.5 text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filtered.map((a) => {
                    const dc = deptColor(a.departments?.name);
                    return (
                      <tr
                        key={a.id}
                        className="group relative transition-all duration-150 hover:bg-primary/[0.04]"
                      >
                        {/* glow on hover */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3.5">
                            <AgentAvatar path={a.profile_picture_url} name={a.full_name} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold leading-tight text-foreground/90">{a.full_name}</p>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
                                {a.email ?? a.phone_number ?? "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-lg bg-secondary/70 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wider text-primary/80 ring-1 ring-primary/15">
                            {a.employee_id}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {a.departments?.name ? (
                            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ${dc.bg} ${dc.text} ${dc.ring}`}>
                              <Building2 className="size-3 opacity-70" />
                              {a.departments.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {a.designations?.name ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Briefcase className="size-3 text-muted-foreground/40" />
                              {a.designations.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
                            <Calendar className="size-3 text-muted-foreground/40" />
                            {formatDate(a.joining_date) ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-semibold text-foreground/80 tabular-nums">
                            {formatPKR(a.salary)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge value={a.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg p-0 text-muted-foreground/60 transition-all hover:bg-primary/15 hover:text-primary"
                              asChild
                            >
                              <Link to="/agents/$agentId" params={{ agentId: a.id }}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                            {isSuperAdmin ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg p-0 text-muted-foreground/40 transition-all hover:bg-destructive/15 hover:text-destructive"
                                onClick={() => handleDelete(a.id, a.full_name)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card grid */}
          <div className="animate-rise grid gap-3 md:hidden">
            {filtered.map((a) => {
              const dc = deptColor(a.departments?.name);
              return (
                <div
                  key={a.id}
                  className="glass group relative overflow-hidden rounded-2xl p-4 transition-all duration-200 hover:ring-1 hover:ring-primary/30"
                >
                  {/* top accent */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                  <div className="flex items-start gap-3.5">
                    <AgentAvatar path={a.profile_picture_url} name={a.full_name} />

                    <div className="min-w-0 flex-1 space-y-2">
                      {/* name + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold leading-tight">{a.full_name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
                            {a.email ?? a.phone_number ?? "—"}
                          </p>
                        </div>
                        <StatusBadge value={a.status} className="shrink-0" />
                      </div>

                      {/* chips row */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center rounded-lg bg-secondary/70 px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider text-primary/80 ring-1 ring-primary/15">
                          {a.employee_id}
                        </span>
                        {a.departments?.name && (
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium ring-1 ${dc.bg} ${dc.text} ${dc.ring}`}>
                            <Building2 className="size-2.5" />
                            {a.departments.name}
                          </span>
                        )}
                        {a.designations?.name && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-secondary/50 px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border/30">
                            <Briefcase className="size-2.5" />
                            {a.designations.name}
                          </span>
                        )}
                      </div>

                      {/* meta row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/60">
                          {a.joining_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatDate(a.joining_date)}
                            </span>
                          )}
                          {a.salary != null && (
                            <span className="font-mono font-semibold tabular-nums text-foreground/70">
                              {formatPKR(a.salary)}
                            </span>
                          )}
                        </div>

                        {/* actions */}
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg p-0 text-muted-foreground/60 hover:bg-primary/15 hover:text-primary"
                            asChild
                          >
                            <Link to="/agents/$agentId" params={{ agentId: a.id }}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          {isSuperAdmin ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg p-0 text-muted-foreground/40 hover:bg-destructive/15 hover:text-destructive"
                              onClick={() => handleDelete(a.id, a.full_name)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
