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