import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  User, Phone, Mail, MapPin, Calendar, Briefcase, GraduationCap,
  Building2, Clock, Banknote, CreditCard, FileText, ShieldCheck,
  Hash, HeartPulse, Languages, Star, Pencil, Save, X, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import {
  useMyAgent, useAgentAttendanceHistory, useAgentDocuments,
  useSaveAgent, type AgentWithRefs,
} from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import {
  formatDate, formatPKR, formatTime, hoursLabel, initials, labelize,
} from "@/lib/billzo";
import { StatusBadge } from "@/components/billzo/StatusBadge";
import { SecureImage } from "@/components/billzo/SecureImage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/my-profile")({
  component: MyProfilePage,
});

// ── tiny helpers ─────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-secondary/20 px-4 py-3 transition-colors hover:bg-secondary/40">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-3.5 text-primary" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
      <span className="h-px flex-1 bg-primary/20" />
      {children}
      <span className="h-px flex-1 bg-primary/20" />
    </h3>
  );
}

const STATUS_COLOR: Record<string, string> = {
  present: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25",
  absent: "bg-red-500/15 text-red-400 ring-1 ring-red-500/25",
  late: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25",
  half_day: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25",
  leave: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/25",
  holiday: "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/25",
};

// ── edit-personal mini-form ───────────────────────────────────────────────────

function EditPersonalForm({ agent, onDone }: { agent: AgentWithRefs; onDone: () => void }) {
  const save = useSaveAgent();
  const [vals, setVals] = useState({
    phone_number: agent.phone_number ?? "",
    whatsapp_number: agent.whatsapp_number ?? "",
    emergency_contact_name: agent.emergency_contact_name ?? "",
    emergency_contact_number: agent.emergency_contact_number ?? "",
    home_address: agent.home_address ?? "",
    city: agent.city ?? "",
  });
  const set = (k: keyof typeof vals, v: string) => setVals((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({ id: agent.id, values: vals as never });
      toast.success("Personal info updated");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          ["phone_number", "Phone Number", Phone],
          ["whatsapp_number", "WhatsApp Number", Phone],
          ["emergency_contact_name", "Emergency Contact Name", User],
          ["emergency_contact_number", "Emergency Contact Number", Phone],
          ["city", "City", MapPin],
        ] as [keyof typeof vals, string, React.ElementType][]).map(([key, label, Icon]) => (
          <div key={key} className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Icon className="size-3 text-primary/70" /> {label}
            </Label>
            <Input value={vals[key]} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <MapPin className="size-3 text-primary/70" /> Home Address
          </Label>
          <Textarea rows={2} value={vals.home_address} onChange={(e) => set("home_address", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onDone} disabled={save.isPending}>
          <X className="size-3.5" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={save.isPending}>
          <Save className="size-3.5" /> Save Changes
        </Button>
      </div>
    </form>
  );
}

// ── attendance tab ────────────────────────────────────────────────────────────

function AttendanceTab({ agentId }: { agentId: string }) {
  const { data: history = [], isLoading } = useAgentAttendanceHistory(agentId, 90);

  const counts = history.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalHours = history.reduce((s, r) => s + (r.total_hours ?? 0), 0);

  const summaryItems = [
    { label: "Days Worked", value: counts["present"] ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Absent", value: counts["absent"] ?? 0, color: "text-red-400", bg: "bg-red-500/10" },
    { label: "Late", value: counts["late"] ?? 0, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Leave", value: counts["leave"] ?? 0, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Half Day", value: counts["half_day"] ?? 0, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Total Hours", value: totalHours.toFixed(1) + "h", color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summaryItems.map((s) => (
          <div key={s.label} className={`rounded-xl ${s.bg} p-3 text-center ring-1 ring-border/30`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-10">Loading attendance…</p>
      ) : history.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No attendance records yet.</p>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/30">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Clock In</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Clock Out</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Hours</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {history.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-secondary/20">
                    <td className="px-4 py-2.5 font-mono text-xs">{formatDate(row.date)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{formatTime(row.clock_in)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{formatTime(row.clock_out)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{hoursLabel(row.total_hours)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[row.status] ?? ""}`}>
                        {labelize(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── documents tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ agentId }: { agentId: string }) {
  const { data: docs = [], isLoading } = useAgentDocuments(agentId);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const openDoc = async (path: string) => {
    const { data } = await supabase.storage.from("agent-documents").createSignedUrl(path, 300);
    if (data?.signedUrl) {
      setPreviewing(data.signedUrl);
      window.open(data.signedUrl, "_blank");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-10 text-center">Loading documents…</p>;
  if (docs.length === 0) return <p className="text-sm text-muted-foreground py-10 text-center">No documents uploaded yet.</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((doc) => (
        <button
          key={doc.id}
          onClick={() => doc.file_path && openDoc(doc.file_path)}
          className="group flex items-start gap-3 rounded-xl border border-border/40 bg-secondary/20 p-4 text-left transition-all hover:border-primary/40 hover:bg-secondary/40"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 transition-colors group-hover:bg-primary/20">
            <FileText className="size-4 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{doc.file_name}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{labelize(doc.category)}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(doc.uploaded_date)}</p>
          </div>
          <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>
      ))}
    </div>
  );
}

// ── no-agent placeholder ──────────────────────────────────────────────────────

function NotLinked({ name }: { name?: string | null | undefined }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-primary/5 blur-xl" />
        <div className="relative flex size-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <User className="size-9 text-primary/60" />
        </div>
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{name ?? "Your account"} is not linked to an agent profile</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          Ask your Super Admin or Admin to link your account to your agent profile so you can view your data.
        </p>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

function MyProfilePage() {
  const { user, profile } = useAuth();
  const { data: agent, isLoading } = useMyAgent(user?.id);
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!agent) {
    return <NotLinked name={profile?.full_name ?? profile?.email} />;
  }

  const dept = agent.departments?.name;
  const desig = agent.designations?.name;

  return (
    <div className="mx-auto max-w-4xl space-y-5 animate-rise">

      {/* ── HERO CARD ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-secondary/60 via-secondary/30 to-primary/5 p-6 shadow-xl shadow-black/20">
        {/* decorative glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 size-40 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* avatar */}
          <div className="relative shrink-0">
            <div className="size-24 overflow-hidden rounded-2xl ring-2 ring-primary/30 ring-offset-2 ring-offset-background shadow-lg sm:size-28">
              {agent.profile_picture_url ? (
                <SecureImage path={agent.profile_picture_url} alt={agent.full_name} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                  <span className="text-3xl font-bold text-primary">{initials(agent.full_name)}</span>
                </div>
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-emerald-500 shadow" />
          </div>

          {/* identity */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{agent.full_name}</h1>
              {(desig || dept) && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {desig ?? "—"}{dept ? ` · ${dept}` : ""}
                </p>
              )}
            </div>

            {/* ID + status row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/50 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                <Hash className="size-3 text-primary/60" />
                {agent.employee_id}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/50 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                <Hash className="size-3 text-primary/60" />
                {agent.reference_id}
              </span>
              <StatusBadge value={agent.status} />
            </div>

            {/* quick stats strip */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                [Calendar, agent.joining_date ? "Joined " + formatDate(agent.joining_date) : null],
                [Clock, agent.shift_timing],
                [Briefcase, agent.employee_type ? labelize(agent.employee_type) : null],
                [MapPin, [agent.city, agent.country].filter(Boolean).join(", ") || null],
              ].filter(([, v]) => v).map(([Icon, label], i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground">
                  {/* @ts-ignore */}
                  <Icon className="size-3 text-primary/70" />
                  {label as string}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="personal"><User className="size-3.5" /> Personal</TabsTrigger>
          <TabsTrigger value="employment"><Briefcase className="size-3.5" /> Employment</TabsTrigger>
          <TabsTrigger value="attendance"><Calendar className="size-3.5" /> Attendance</TabsTrigger>
          <TabsTrigger value="salary"><Banknote className="size-3.5" /> Salary</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="size-3.5" /> Documents</TabsTrigger>
        </TabsList>

        {/* PERSONAL TAB */}
        <TabsContent value="personal" className="glass rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <SectionTitle>Personal Information</SectionTitle>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            )}
          </div>

          {editing ? (
            <EditPersonalForm agent={agent} onDone={() => setEditing(false)} />
          ) : (
            <div className="space-y-5">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <InfoRow icon={User} label="Full Name" value={agent.full_name} />
                <InfoRow icon={User} label="Father's Name" value={agent.father_name} />
                <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(agent.date_of_birth)} />
                <InfoRow icon={User} label="Gender" value={agent.gender} />
                <InfoRow icon={HeartPulse} label="Blood Group" value={agent.blood_group} />
                <InfoRow icon={User} label="Marital Status" value={labelize(agent.marital_status)} />
                <InfoRow icon={ShieldCheck} label="CNIC Number" value={agent.cnic_number} />
                <InfoRow icon={ShieldCheck} label="Passport Number" value={agent.passport_number} />
              </div>

              <SectionTitle>Contact</SectionTitle>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <InfoRow icon={Phone} label="Phone" value={agent.phone_number} />
                <InfoRow icon={Phone} label="WhatsApp" value={agent.whatsapp_number} />
                <InfoRow icon={Mail} label="Email" value={agent.email} />
                <InfoRow icon={Phone} label="Emergency Contact" value={
                  [agent.emergency_contact_name, agent.emergency_contact_number].filter(Boolean).join(" · ") || null
                } />
                <InfoRow icon={MapPin} label="City / Province" value={[agent.city, agent.province].filter(Boolean).join(", ")} />
                <InfoRow icon={MapPin} label="Country" value={agent.country} />
                <InfoRow icon={MapPin} label="Home Address" value={agent.home_address} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* EMPLOYMENT TAB */}
        <TabsContent value="employment" className="glass rounded-xl p-5 space-y-5">
          <SectionTitle>Employment Details</SectionTitle>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <InfoRow icon={Building2} label="Department" value={dept} />
            <InfoRow icon={Briefcase} label="Designation" value={desig} />
            <InfoRow icon={Calendar} label="Joining Date" value={formatDate(agent.joining_date)} />
            <InfoRow icon={Briefcase} label="Employee Type" value={labelize(agent.employee_type)} />
            <InfoRow icon={Clock} label="Shift Timing" value={agent.shift_timing} />
            <InfoRow icon={Star} label="Status" value={labelize(agent.status)} />
          </div>

          <SectionTitle>Education & Skills</SectionTitle>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <InfoRow icon={GraduationCap} label="Qualification" value={agent.highest_qualification} />
            <InfoRow icon={GraduationCap} label="Degree" value={agent.degree} />
            <InfoRow icon={GraduationCap} label="Institute" value={agent.institute_name} />
            <InfoRow icon={Star} label="Certifications" value={agent.certifications} />
            <InfoRow icon={Languages} label="Languages" value={agent.languages} />
            <InfoRow icon={Star} label="Skills" value={agent.skills} />
            <InfoRow icon={Briefcase} label="Previous Company" value={agent.previous_company} />
            <InfoRow icon={FileText} label="Experience Summary" value={agent.previous_experience} />
          </div>
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="glass rounded-xl p-5">
          <AttendanceTab agentId={agent.id} />
        </TabsContent>

        {/* SALARY TAB */}
        <TabsContent value="salary" className="glass rounded-xl p-5 space-y-5">
          <SectionTitle>Salary</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Monthly Salary</p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-primary">{formatPKR(agent.salary)}</p>
          </div>

          <SectionTitle>Bank Details</SectionTitle>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <InfoRow icon={Banknote} label="Bank Name" value={agent.bank_name} />
            <InfoRow icon={User} label="Account Title" value={agent.account_title} />
            <InfoRow icon={CreditCard} label="Account Number" value={
              agent.account_number ? "••••  ••••  " + agent.account_number.slice(-4) : null
            } />
            <InfoRow icon={CreditCard} label="IBAN" value={
              agent.iban ? agent.iban.slice(0, 6) + " ···· " + agent.iban.slice(-4) : null
            } />
          </div>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="glass rounded-xl p-5">
          <DocumentsTab agentId={agent.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
