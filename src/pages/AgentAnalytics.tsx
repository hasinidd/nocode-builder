import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Clock, TrendingUp } from "lucide-react";

export default function AgentAnalytics() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<any>(null);
  const [stats, setStats] = useState({ conversations: 0, messages: 0, avgMessages: 0 });

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (agentId: string) => {
    const { data: agentData } = await supabase.from("agents").select("*").eq("id", agentId).single();
    if (agentData) setAgent(agentData);

    const { data: convos } = await supabase.from("conversations").select("id").eq("agent_id", agentId);
    const convoCount = convos?.length || 0;

    let msgCount = 0;
    if (convos && convos.length > 0) {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convos.map(c => c.id));
      msgCount = count || 0;
    }

    setStats({
      conversations: convoCount,
      messages: msgCount,
      avgMessages: convoCount > 0 ? Math.round(msgCount / convoCount) : 0,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 glass">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="font-display font-semibold">{agent?.name || "Agent"} Analytics</h1>
          <div />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Total Conversations", value: stats.conversations, icon: MessageSquare },
            { label: "Total Messages", value: stats.messages, icon: TrendingUp },
            { label: "Avg Messages/Convo", value: stats.avgMessages, icon: Clock },
          ].map(s => (
            <Card key={s.label} className="glass border-border/50 card-shadow">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-display font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass border-border/50 card-shadow mt-8">
          <CardHeader>
            <CardTitle className="font-display">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {stats.conversations === 0
                ? "No conversations yet. Deploy your agent and share the link to start getting analytics."
                : `Your agent has had ${stats.conversations} conversations with ${stats.messages} total messages.`}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
