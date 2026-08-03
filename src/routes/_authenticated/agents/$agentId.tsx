import { createFileRoute, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { AgentForm } from "@/components/agents/AgentForm";
import { DocumentManager } from "@/components/agents/DocumentManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgent, useSaveAgent } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/agents/$agentId")({
  component: AgentDetail,
});

function AgentDetail() {
  const { agentId } = useParams({ from: "/_authenticated/agents/$agentId" });
  const { isStaff } = useAuth();
  const { data: agent, isLoading } = useAgent(agentId);
  const save = useSaveAgent();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  if (!agent) return <p className="text-sm text-muted-foreground">Agent not found.</p>;

  return (
    <div className="space-y-5">
      <header className="animate-rise">
        <h1 className="text-2xl font-semibold sm:text-3xl">{agent.full_name}</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {agent.employee_id} · {agent.reference_id}
        </p>
      </header>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <AgentForm
            agent={agent}
            saving={save.isPending}
            readOnlyEmployment={!isStaff}
            onSubmit={async (payload) => {
              try {
                await save.mutateAsync({ id: agentId, values: payload as never });
                toast.success("Profile updated");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not save changes");
              }
            }}
          />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentManager agentId={agentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}