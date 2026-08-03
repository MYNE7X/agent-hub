import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  LogIn, LogOut, CalendarClock, PlusCircle,
  Clock, User, StickyNote, Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/billzo/StatusBadge";
import { formatTime, hoursLabel, todayISO } from "@/lib/billzo";
import { useAttendance, useMyAgent } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AttendanceEditDialog,
  AttendanceAddDialog,
} from "@/components/attendance/AttendanceAdjustDialog";
import type { AttendanceRow } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/attendance/")({
  component: AttendancePage,
});

/* ─── tiny time chip ─────────────────────────────── */
function TimeChip({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
        {label}
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums">
        {formatTime(value) ?? <span className="text-muted-foreground/40">—</span>}
      </span>
    </div>
  );
}

/* ─── mobile attendance card ─────────────────────── */
function AttendanceCard({
  row,
  isStaff,
}: {
  row: AttendanceRow;
  isStaff: boolean;
}) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-4">
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* agent + status row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <User className="size-4 text-primary/70" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">
              {row.agents?.full_name ?? "—"}
            </p>
            {row.agents?.employee_id && (
              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground/60">
                {row.agents.employee_id}
              </span>
            )}
          </div>
        </div>
        <StatusBadge value={row.status} className="shrink-0" />
      </div>

      {/* time strip */}
      <div className="mt-3 flex items-center justify-around rounded-xl bg-secondary/40 py-3 ring-1 ring-border/30">
        <TimeChip label="Clock In" value={row.clock_in} />
        <div className="h-8 w-px bg-border/40" />
        <TimeChip label="Clock Out" value={row.clock_out} />
        <div className="h-8 w-px bg-border/40" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            Hours
          </span>
          <span className="font-mono text-sm font-semibold text-primary tabular-nums">
            {hoursLabel(row.total_hours)}
          </span>
        </div>
      </div>

      {/* note + edit row */}
      {(row.notes || isStaff) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          {row.notes ? (
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground/70">
              <StickyNote className="size-3 shrink-0 text-muted-foreground/40" />
              <span className="truncate">{row.notes}</span>
            </span>
          ) : (
            <span />
          )}
          {isStaff && (
            <AttendanceEditDialog
              row={row}
              trigger={
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary"
                >
                  <Pencil className="size-3" /> Edit
                </Button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── main page ──────────────────────────────────── */
function AttendancePage() {
  const { user, isStaff } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const { data: myAgent } = useMyAgent(user?.id ?? null);
  const { data: rows } = useAttendance(date);

  const mine = (rows ?? []).find((r) => r.agent_id === myAgent?.id);
  const refresh = () => void qc.invalidateQueries({ queryKey: ["attendance"] });

  const clockIn = async () => {
    if (!myAgent) { toast.error("No agent profile linked to your account"); return; }
    const { error } = await supabase
      .from("attendance")
      .insert({ agent_id: myAgent.id, date, clock_in: new Date().toISOString(), created_by: user?.id ?? null });
    if (error) { toast.error(error.message); return; }
    toast.success("Clocked in ✓");
    refresh();
  };

  const clockOut = async () => {
    if (!mine) { toast.error("You have not clocked in yet"); return; }
    const { error } = await supabase
      .from("attendance")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", mine.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Clocked out ✓");
    refresh();
  };

  const empty = !(rows ?? []).length;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <header className="animate-rise">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Attendance</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {(rows ?? []).length} record{(rows ?? []).length !== 1 ? "s" : ""} for {date}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-40 bg-secondary/30 text-sm"
            />
            {isStaff && (
              <AttendanceAddDialog
                defaultDate={date}
                createdBy={user?.id}
                trigger={
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <PlusCircle className="size-4" /> Add Record
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </header>

      {/* ── My clock-in card ── */}
      {myAgent && (
        <section className="glass animate-rise overflow-hidden rounded-2xl">
          {/* gradient top line */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <div className="p-4 sm:p-5">
            {/* name row */}
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <User className="size-4 text-primary" />
              </span>
              <div>
                <p className="font-semibold leading-tight">{myAgent.full_name}</p>
                <p className="text-[11px] text-muted-foreground">Today · {date}</p>
              </div>
              {mine?.status && (
                <div className="ml-auto">
                  <StatusBadge value={mine.status} />
                </div>
              )}
            </div>

            {/* time summary strip */}
            <div className="mt-3 grid grid-cols-3 divide-x divide-border/40 rounded-xl bg-secondary/40 py-3 ring-1 ring-border/30">
              <TimeChip label="Clock In" value={mine?.clock_in} />
              <TimeChip label="Clock Out" value={mine?.clock_out} />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  Hours
                </span>
                <span className="font-mono text-sm font-semibold text-primary tabular-nums">
                  {hoursLabel(mine?.total_hours)}
                </span>
              </div>
            </div>

            {/* action buttons */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                className="w-full gap-2"
                onClick={() => void clockIn()}
                disabled={Boolean(mine?.clock_in)}
              >
                <LogIn className="size-4" /> Clock In
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => void clockOut()}
                disabled={!mine?.clock_in || Boolean(mine?.clock_out)}
              >
                <LogOut className="size-4" /> Clock Out
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Desktop table (md+) ── */}
      {!empty && (
        <div className="glass animate-rise hidden overflow-hidden rounded-2xl md:block">
          <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-gradient-to-r from-secondary/60 via-secondary/40 to-secondary/60">
                  {["Agent", "Clock In", "Clock Out", "Hours", "Status",
                    ...(isStaff ? ["Note", ""] : [])
                  ].map((h, i) => (
                    <th key={i} className={`px-4 py-3.5 ${i === (isStaff ? 6 : 5) - 1 && isStaff ? "text-right" : "text-left"}`}>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {(rows ?? []).map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-primary/[0.04]">
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold leading-tight">{r.agents?.full_name ?? "—"}</span>
                        {r.agents?.employee_id && (
                          <span className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">
                            {r.agents.employee_id}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm tabular-nums">{formatTime(r.clock_in) ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm tabular-nums">{formatTime(r.clock_out) ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm font-semibold text-primary tabular-nums">
                        {hoursLabel(r.total_hours)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge value={r.status} />
                    </td>
                    {isStaff && (
                      <td className="max-w-[160px] px-4 py-3.5">
                        {r.notes ? (
                          <span className="block truncate text-xs text-muted-foreground/70" title={r.notes}>
                            {r.notes}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/30">—</span>
                        )}
                      </td>
                    )}
                    {isStaff && (
                      <td className="px-4 py-3.5 text-right">
                        <AttendanceEditDialog
                          row={r}
                          trigger={
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            >
                              <CalendarClock className="size-3.5" /> Edit
                            </Button>
                          }
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Mobile cards (< md) ── */}
      {!empty && (
        <div className="animate-rise grid gap-3 md:hidden">
          {(rows ?? []).map((r) => (
            <AttendanceCard key={r.id} row={r} isStaff={isStaff} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {empty && (
        <div className="glass animate-rise flex flex-col items-center justify-center gap-3 rounded-2xl py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Clock className="size-6 text-primary/60" />
          </span>
          <div>
            <p className="font-medium">No records for {date}</p>
            {isStaff && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Use <strong>Add Record</strong> to create a manual entry.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Staff legend (desktop only) */}
      {isStaff && !empty && (
        <p className="hidden text-right text-xs text-muted-foreground md:block">
          Click <strong>Edit</strong> on any row to adjust times, status, or add a note.
        </p>
      )}
    </div>
  );
}
