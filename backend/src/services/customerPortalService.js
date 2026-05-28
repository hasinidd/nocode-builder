import supabase from '../db/supabase.js';

export class CustomerPortalService {
  async getUserBillingOverview(userId) {
    const [{ data: user }, { data: sub }, { data: addons }] = await Promise.all([
      supabase.from('users').select('email, name, role, created_at').eq('id', userId).single(),
      supabase.from('subscriptions').select('*').eq('user_id', userId).single(),
      supabase.from('addon_purchases').select('*').eq('user_id', userId)
    ]);

    return {
      user,
      subscription: sub || { plan: 'free', status: 'active' },
      addons: addons || [],
      limits: {
        maxAgents: sub?.plan === 'pro' ? 10 : sub?.plan === 'business' ? 50 : 2,
        maxKnowledgeBaseMb: sub?.plan === 'pro' ? 500 : sub?.plan === 'business' ? 5000 : 50
      }
    };
  }
}

export const customerPortalService = new CustomerPortalService();
export default customerPortalService;
