import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, FileDown, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/billzo/StatusBadge";
import { SecureImage } from "@/components/billzo/SecureImage";
import { AGENT_STATUSES, formatDate, formatPKR, labelize } from "@/lib/billzo";
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

  return (
    <div className="space-y-5">
      <header className="animate-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} of {agents?.length ?? 0} records</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(exportRows, COLUMNS, "billzo-agents")}>
            <FileDown className="size-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void exportExcel(exportRows, COLUMNS, "billzo-agents")}>
            <FileDown className="size-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportPDF(exportRows, COLUMNS, "billzo-agents", "Billzo — Agents Report")}
          >
            <FileDown className="size-4" /> PDF
          </Button>
          <Button size="sm" asChild>
            <Link to="/agents/new">
              <Plus className="size-4" /> Add Agent
            </Link>
          </Button>
        </div>
      </header>

      <div className="glass animate-rise grid gap-3 rounded-2xl p-4 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, ID, CNIC, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {(departments ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {AGENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{labelize(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="glass animate-rise overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Salary</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Loading agents…</td></tr>
              ) : !filtered.length ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No agents found.</td></tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <SecureImage
                          path={a.profile_picture_url}
                          alt={a.full_name}
                          className="size-9 rounded-full object-cover ring-1 ring-border"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{a.email ?? a.phone_number ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{a.employee_id}</td>
                    <td className="px-4 py-3">{a.departments?.name ?? "—"}</td>
                    <td className="px-4 py-3">{a.designations?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(a.joining_date)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatPKR(a.salary)}</td>
                    <td className="px-4 py-3"><StatusBadge value={a.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to="/agents/$agentId" params={{ agentId: a.id }}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        {isSuperAdmin ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (!confirm(`Delete ${a.full_name}? This cannot be undone.`)) return;
                              del.mutate(a.id, {
                                onSuccess: () => toast.success("Agent deleted"),
                                onError: (e) => toast.error(e.message),
                              });
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}