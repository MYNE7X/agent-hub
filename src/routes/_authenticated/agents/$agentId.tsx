import { createFileRoute, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { AgentForm } from "@/components/agents/AgentForm";
import { DocumentManager } from "@/components/agents/DocumentManager";
import { LinkAccountPanel } from "@/components/agents/LinkAccountPanel";
import { SetPasswordPanel } from "@/components/agents/SetPasswordPanel";
import { StatusBadge } from "@/components/billzo/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgent, useSaveAgent } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/billzo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/agents/$agentId")({
  component: AgentDetail,
});

function AgentDetail() {
  const { agentId } = useParams({ from: "/_authenticated/agents/$agentId" });
  const { isStaff, isSuperAdmin } = useAuth();
  const { data: agent, isLoading, refetch } = useAgent(agentId);
  const save = useSaveAgent();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!agent) return <p className="text-sm text-muted-foreground">Agent not found.</p>;

  return (
    <div className="space-y-5 animate-rise">
      {/* header */}
      <header className="flex items-center gap-4">
        <Avatar className="size-14 ring-2 ring-primary/25 ring-offset-2 ring-offset-background">
          <AvatarFallback className="bg-primary/15 text-lg font-bold text-primary">
            {initials(agent.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{agent.full_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {agent.employee_id} · {agent.reference_id}
            </span>
            <StatusBadge value={agent.status} />
          </div>
        </div>
      </header>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {isStaff && <TabsTrigger value="account">Link Account</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="login">Login / Password</TabsTrigger>}
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

        {isStaff && (
          <TabsContent value="account" className="mt-4">
            <div className="glass rounded-xl p-5">
              <div className="mb-4">
                <h2 className="font-semibold">Link User Account</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Connect a registered user to this agent so they can log in and view their own profile, attendance, and salary.
                </p>
              </div>
              <LinkAccountPanel
                agentId={agentId}
                currentUserId={agent.user_id}
              />
            </div>
          </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="login" className="mt-4">
            <div className="glass rounded-xl p-5">
              <div className="mb-4">
                <h2 className="font-semibold">Login Account & Password</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {agent.user_id
                    ? "This agent has a linked account. You can force a temporary password reset."
                    : "Create a login account for this agent with a temporary password. They will be required to set a new password on first login."}
                </p>
              </div>
              <SetPasswordPanel
                agentId={agentId}
                agentEmail={agent.email}
                agentName={agent.full_name}
                currentUserId={agent.user_id}
                onAccountCreated={() => void refetch()}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
