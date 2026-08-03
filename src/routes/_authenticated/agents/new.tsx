import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { AgentForm } from "@/components/agents/AgentForm";
import { useCreateAgent } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/agents/new")({
  head: () => ({
    meta: [
      { title: "Add Agent — Billzo Office Management" },
      { name: "description", content: "Create a complete Billzo agent profile with documents and bank details." },
      { property: "og:title", content: "Add Agent — Billzo Office Management" },
      { property: "og:description", content: "Create a complete Billzo agent profile." },
    ],
  }),
  component: NewAgent,
});

function NewAgent() {
  const navigate = useNavigate();
  const create = useCreateAgent();

  return (
    <div className="space-y-5">
      <header className="animate-rise">
        <h1 className="text-2xl font-semibold sm:text-3xl">Add new agent</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Employee ID and reference ID are generated automatically on save.
        </p>
      </header>
      <AgentForm
        submitting={create.isPending}
        onSubmit={async (payload) => {
          try {
            const row = await create.mutateAsync(payload);
            toast.success(`Agent created — ${row.employee_id}`);
            void navigate({ to: "/agents/$agentId", params: { agentId: row.id } });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not create agent");
          }
        }}
      />
    </div>
  );
}