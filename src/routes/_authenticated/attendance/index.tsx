import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/billzo/StatusBadge";
import { formatTime, hoursLabel, todayISO } from "@/lib/billzo";
import { useAttendance, useMyAgent } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/attendance/")({
  component: AttendancePage,
});

function AttendancePage() {
  const { user } = useAuth();
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
          <p className="mt-1 text-sm text-muted-foreground">{(rows ?? []).length} record(s) for {date}</p>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
      </header>

      {myAgent ? (
        <section className="glass animate-rise flex flex-wrap items-center gap-4 rounded-2xl p-5">
          <div className="flex-1">
            <p className="text-sm font-medium">{myAgent.full_name}</p>
            <p className="text-xs text-muted-foreground">
              In {formatTime(mine?.clock_in)} · Out {formatTime(mine?.clock_out)} · {hoursLabel(mine?.total_hours)}
            </p>
          </div>
          <Button onClick={() => void clockIn()} disabled={Boolean(mine?.clock_in)}>
            <LogIn className="size-4" /> Clock In
          </Button>
          <Button variant="outline" onClick={() => void clockOut()} disabled={!mine?.clock_in || Boolean(mine?.clock_out)}>
            <LogOut className="size-4" /> Clock Out
          </Button>
        </section>
      ) : null}

      <div className="glass animate-rise overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Clock In</th>
              <th className="px-4 py-3">Clock Out</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!(rows ?? []).length ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No records for this date.</td></tr>
            ) : (
              (rows ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{r.agents?.full_name ?? "—"}</td>
                  <td className="px-4 py-3">{formatTime(r.clock_in)}</td>
                  <td className="px-4 py-3">{formatTime(r.clock_out)}</td>
                  <td className="px-4 py-3 tabular-nums">{hoursLabel(r.total_hours)}</td>
                  <td className="px-4 py-3"><StatusBadge value={r.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}