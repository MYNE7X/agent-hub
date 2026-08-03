import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LogIn, LogOut, CalendarClock, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/billzo/StatusBadge";
import { formatTime, hoursLabel, todayISO, labelize } from "@/lib/billzo";
import { useAttendance, useMyAgent } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AttendanceEditDialog,
  AttendanceAddDialog,
} from "@/components/attendance/AttendanceAdjustDialog";

export const Route = createFileRoute("/_authenticated/attendance/")({
  component: AttendancePage,
});

function AttendancePage() {
  const { user, isStaff } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const { data: myAgent } = useMyAgent(user?.id ?? null);
  const { data: rows } = useAttendance(date);

  const mine = (rows ?? []).find((r) => r.agent_id === myAgent?.id);
  const refresh = () => void qc.invalidateQueries({ queryKey: ["attendance"] });

  const clockIn = async () => {
    if (!myAgent) {
      toast.error("No agent profile linked to your account");
      return;
    }
    const { error } = await supabase
      .from("attendance")
      .insert({ agent_id: myAgent.id, date, clock_in: new Date().toISOString(), created_by: user?.id ?? null });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Clocked in");
    refresh();
  };

  const clockOut = async () => {
    if (!mine) {
      toast.error("You have not clocked in yet");
      return;
    }
    const { error } = await supabase
      .from("attendance")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", mine.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Clocked out");
    refresh();
  };

  return (
    <div className="space-y-5">
      <header className="animate-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {(rows ?? []).length} record(s) for {date}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
          {isStaff && (
            <AttendanceAddDialog
              defaultDate={date}
              createdBy={user?.id}
              trigger={
                <Button size="sm" variant="outline" className="gap-1.5">
                  <PlusCircle className="size-4" />
                  Add Record
                </Button>
              }
            />
          )}
        </div>
      </header>

      {/* My clock-in/out card (for linked agents) */}
      {myAgent ? (
        <section className="glass animate-rise flex flex-wrap items-center gap-4 rounded-2xl p-5">
          <div className="flex-1">
            <p className="text-sm font-medium">{myAgent.full_name}</p>
            <p className="text-xs text-muted-foreground">
              In {formatTime(mine?.clock_in)} · Out {formatTime(mine?.clock_out)} ·{" "}
              {hoursLabel(mine?.total_hours)}
            </p>
          </div>
          <Button onClick={() => void clockIn()} disabled={Boolean(mine?.clock_in)}>
            <LogIn className="size-4" /> Clock In
          </Button>
          <Button
            variant="outline"
            onClick={() => void clockOut()}
            disabled={!mine?.clock_in || Boolean(mine?.clock_out)}
          >
            <LogOut className="size-4" /> Clock Out
          </Button>
        </section>
      ) : null}

      {/* Attendance table */}
      <div className="glass animate-rise overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Clock In</th>
              <th className="px-4 py-3">Clock Out</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Status</th>
              {isStaff && <th className="px-4 py-3">Note</th>}
              {isStaff && <th className="px-4 py-3 text-right">Adjust</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!(rows ?? []).length ? (
              <tr>
                <td
                  colSpan={isStaff ? 7 : 5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No records for this date.
                  {isStaff && (
                    <span className="ml-1">
                      Use <strong>Add Record</strong> to create a manual entry.
                    </span>
                  )}
                </td>
              </tr>
            ) : (
              (rows ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex flex-col">
                      <span>{r.agents?.full_name ?? "—"}</span>
                      {r.agents?.employee_id && (
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {r.agents.employee_id}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatTime(r.clock_in)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatTime(r.clock_out)}</td>
                  <td className="px-4 py-3 tabular-nums">{hoursLabel(r.total_hours)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={r.status} />
                  </td>
                  {isStaff && (
                    <td className="px-4 py-3 max-w-[160px]">
                      {r.notes ? (
                        <span className="truncate text-xs text-muted-foreground" title={r.notes}>
                          {r.notes}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                  )}
                  {isStaff && (
                    <td className="px-4 py-3 text-right">
                      <AttendanceEditDialog
                        row={r}
                        trigger={
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-primary"
                          >
                            <CalendarClock className="size-3.5" />
                            Edit
                          </Button>
                        }
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Staff legend */}
      {isStaff && (rows ?? []).length > 0 && (
        <p className="animate-rise text-right text-xs text-muted-foreground">
          Click <strong>Edit</strong> on any row to adjust times, status, or add a note.
        </p>
      )}
    </div>
  );
}
