import supabase from '../db/supabase.js';
import { emailService } from './emailService.js';
import { whatsAppService } from './whatsappService.js';

export class FollowupEngineService {
  async scheduleFollowup(agentId, customerEmail, customerPhone, sequenceType, delayHours = 24) {
    const executeAt = new Date(Date.now() + delayHours * 3600000).toISOString();

    const { data, error } = await supabase
      .from('followup_queue')
      .insert({
        agent_id: agentId,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        sequence_type: sequenceType,
        execute_at: executeAt,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async processPendingFollowups() {
    const now = new Date().toISOString();
    const { data: pending } = await supabase
      .from('followup_queue')
      .select('*, agents(name, config)')
      .eq('status', 'pending')
      .lte('execute_at', now)
      .limit(50);

    if (!pending || pending.length === 0) return { processed: 0 };

    let count = 0;
    for (const item of pending) {
      try {
        if (item.customer_email) {
          await emailService.sendEmail({
            to: item.customer_email,
            subject: `Follow-up from ${item.agents?.name || 'our team'}`,
            html: `<p>Hi! We wanted to check in and see if you had any further questions for ${item.agents?.name}.</p>`
          });
        }

        if (item.customer_phone) {
          await whatsAppService.sendMessage(item.customer_phone, `Hi from ${item.agents?.name}! Just checking in to see if you need any assistance.`);
        }

        await supabase.from('followup_queue').update({ status: 'completed', processed_at: new Date().toISOString() }).eq('id', item.id);
        count++;
      } catch (err) {
        await supabase.from('followup_queue').update({ status: 'failed', error: err.message }).eq('id', item.id);
      }
    }

    return { processed: count };
  }
}

export const followupEngineService = new FollowupEngineService();
export default followupEngineService;
