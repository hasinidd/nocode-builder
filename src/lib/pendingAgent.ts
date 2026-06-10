import { supabase } from "@/integrations/supabase/client";

interface ClaimPendingAgentOptions {
  activate?: boolean;
  agentId?: string | null;
}

interface ClaimPendingAgentResponse {
  agentId?: string;
  status?: string;
}

export async function claimPendingAgent(options: ClaimPendingAgentOptions = {}) {
  const pendingId = options.agentId ?? localStorage.getItem("pending_built_agent_id");
  if (!pendingId) return null;

  const { data, error } = await supabase.functions.invoke("claim-pending-agent", {
    body: {
      agentId: pendingId,
      activate: options.activate ?? false,
    },
  });

  if (error) throw error;

  return ((data as ClaimPendingAgentResponse | null)?.agentId ?? null) as string | null;
}