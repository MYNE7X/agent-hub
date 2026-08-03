import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Agent = Database["public"]["Tables"]["agents"]["Row"];
export type AgentInsert = Database["public"]["Tables"]["agents"]["Insert"];
export type AgentUpdate = Database["public"]["Tables"]["agents"]["Update"];
export type AgentDocument = Database["public"]["Tables"]["agent_documents"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];

export type AgentWithRefs = Agent & {
  departments: { id: string; name: string } | null;
  designations: { id: string; name: string } | null;
};

const AGENT_SELECT = "*, departments:department_id(id,name), designations:designation_id(id,name)";

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useDesignations() {
  return useQuery({
    queryKey: ["designations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("designations").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select(AGENT_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AgentWithRefs[];
    },
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ["agent", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select(AGENT_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as AgentWithRefs | null;
    },
    enabled: Boolean(id),
  });
}

/** The agent record linked to the signed-in user, if any. */
export function useMyAgent(userId?: string | null) {
  return useQuery({
    queryKey: ["my-agent", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select(AGENT_SELECT)
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as AgentWithRefs | null;
    },
    enabled: Boolean(userId),
  });
}

export function useSaveAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: AgentInsert | AgentUpdate }) => {
      if (id) {
        const { data, error } = await supabase
          .from("agents")
          .update(values as AgentUpdate)
          .eq("id", id)
          .select("id")
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("agents")
        .insert(values as AgentInsert)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agents"] });
      void qc.invalidateQueries({ queryKey: ["agent"] });
      void qc.invalidateQueries({ queryKey: ["my-agent"] });
    },
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useAgentDocuments(agentId?: string) {
  return useQuery({
    queryKey: ["agent-documents", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_documents")
        .select("*")
        .eq("agent_id", agentId!)
        .order("uploaded_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AgentDocument[];
    },
    enabled: Boolean(agentId),
  });
}

export type AttendanceRow = Attendance & {
  agents: {
    id: string;
    full_name: string;
    employee_id: string;
    profile_picture_url: string | null;
    department_id: string | null;
    departments: { name: string } | null;
  } | null;
};

export function useAttendance(date: string) {
  return useQuery({
    queryKey: ["attendance", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select(
          "*, agents:agent_id(id, full_name, employee_id, profile_picture_url, department_id, departments:department_id(name))",
        )
        .eq("date", date)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AttendanceRow[];
    },
  });
}

export function useAgentAttendanceHistory(agentId?: string, limit = 60) {
  return useQuery({
    queryKey: ["attendance-history", agentId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("agent_id", agentId!)
        .order("date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Attendance[];
    },
    enabled: Boolean(agentId),
  });
}

export function useStaffProfiles() {
  return useQuery({
    queryKey: ["staff-profiles"],
    queryFn: async () => {
      const [{ data: roles, error: rErr }, { data: profiles, error: pErr }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, full_name, email, avatar_url"),
      ]);
      if (rErr) throw rErr;
      if (pErr) throw pErr;
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });
}

export function logActivity(actorId: string | undefined, action: string, entityType?: string, entityId?: string) {
  if (!actorId) return;
  void supabase
    .from("activity_logs")
    .insert({ actor_id: actorId, action, entity_type: entityType ?? null, entity_id: entityId ?? null });
}

/** Fetch a single profile by user ID (for showing linked account info). */
export function useProfile(userId?: string | null) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, phone")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
}

/** All profiles whose user_id is NOT yet linked to any agent (plus optionally the current one). */
export function useUnlinkedProfiles(currentLinkedId?: string | null) {
  return useQuery({
    queryKey: ["unlinked-profiles", currentLinkedId],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: linked, error: lErr }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email"),
        supabase.from("agents").select("user_id").not("user_id", "is", null),
      ]);
      if (pErr) throw pErr;
      if (lErr) throw lErr;
      const linkedIds = new Set((linked ?? []).map((a) => a.user_id).filter(Boolean));
      // include profiles that are not linked, or that are the current one (so we don't hide it)
      return (profiles ?? []).filter(
        (p) => !linkedIds.has(p.id) || p.id === currentLinkedId,
      );
    },
  });
}

/** Fetch all profiles that are not yet approved (pending self-signup approvals). */
export function usePendingUsers() {
  return useQuery({
    queryKey: ["pending-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("is_approved", false)
        .order("id");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null; email: string | null; avatar_url: string | null }[];
    },
  });
}

/** Approve a user by setting is_approved = true on their profile. */
export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: true })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pending-users"] });
      void qc.invalidateQueries({ queryKey: ["staff-profiles"] });
    },
  });
}

type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

/** Update an existing attendance record (admin adjustment). */
export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: {
        clock_in?: string | null;
        clock_out?: string | null;
        status?: AttendanceStatus | null;
        notes?: string | null;
      };
    }) => {
      // Recalculate total_hours when both times are provided
      let total_hours: number | null = null;
      if (values.clock_in && values.clock_out) {
        total_hours =
          (new Date(values.clock_out).getTime() - new Date(values.clock_in).getTime()) /
          3_600_000;
        if (total_hours < 0) total_hours = null;
      }
      const { status, notes, clock_in, clock_out } = values;
      const { error } = await supabase
        .from("attendance")
        .update({
          ...(clock_in !== undefined ? { clock_in } : {}),
          ...(clock_out !== undefined ? { clock_out } : {}),
          ...(status != null ? { status } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(total_hours !== null ? { total_hours } : {}),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

/** Insert a manual attendance record for any agent (admin-only action). */
export function useInsertAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      agent_id,
      date,
      clock_in,
      clock_out,
      status,
      notes,
      created_by,
    }: {
      agent_id: string;
      date: string;
      clock_in?: string | null;
      clock_out?: string | null;
      status?: AttendanceStatus | null;
      notes?: string | null;
      created_by?: string | null;
    }) => {
      let total_hours: number | null = null;
      if (clock_in && clock_out) {
        total_hours =
          (new Date(clock_out).getTime() - new Date(clock_in).getTime()) / 3_600_000;
        if (total_hours < 0) total_hours = null;
      }
      const { error } = await supabase.from("attendance").insert({
        agent_id,
        date,
        ...(clock_in != null ? { clock_in } : {}),
        ...(clock_out != null ? { clock_out } : {}),
        ...(status != null ? { status } : {}),
        ...(notes != null ? { notes } : {}),
        ...(total_hours !== null ? { total_hours } : {}),
        ...(created_by != null ? { created_by } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

// ── Monthly Sales ─────────────────────────────────────────────────────────────

export type MonthlySale = Database["public"]["Tables"]["agent_monthly_sales"]["Row"];

export function useAgentMonthlySales(agentId?: string) {
  return useQuery({
    queryKey: ["monthly-sales", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_monthly_sales")
        .select("*")
        .eq("agent_id", agentId!)
        .order("month", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MonthlySale[];
    },
    enabled: Boolean(agentId),
  });
}

export function useUpsertMonthlySale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      agentId,
      month,
      amount,
      notes,
      createdBy,
    }: {
      agentId: string;
      month: string; // "YYYY-MM-01"
      amount: number;
      notes?: string;
      createdBy?: string | null;
    }) => {
      const { error } = await supabase.from("agent_monthly_sales").upsert(
        { agent_id: agentId, month, amount, notes: notes ?? null, created_by: createdBy ?? null, updated_at: new Date().toISOString() },
        { onConflict: "agent_id,month" },
      );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["monthly-sales", vars.agentId] });
    },
  });
}

export function useDeleteMonthlySale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string }) => {
      const { error } = await supabase.from("agent_monthly_sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["monthly-sales", vars.agentId] });
    },
  });
}

/** Link (or unlink) a user account to an agent by setting agents.user_id. */
export function useLinkAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, userId }: { agentId: string; userId: string | null }) => {
      const { error } = await supabase
        .from("agents")
        .update({ user_id: userId } as AgentUpdate)
        .eq("id", agentId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["agents"] });
      void qc.invalidateQueries({ queryKey: ["agent", vars.agentId] });
      void qc.invalidateQueries({ queryKey: ["my-agent"] });
      void qc.invalidateQueries({ queryKey: ["unlinked-profiles"] });
      void qc.invalidateQueries({ queryKey: ["profile", vars.userId] });
    },
  });
}