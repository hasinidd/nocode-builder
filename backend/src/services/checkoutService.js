import stripeService from './stripeService.js';
import supabase from '../db/supabase.js';

export class CheckoutService {
  async processAddonCheckout(userId, addonType, quantity = 1) {
    const addonPrices = {
      extra_agents: 1000,
      extra_storage: 500,
      whatsapp_credits: 2000
    };

    const unitPrice = addonPrices[addonType] || 1000;
    const totalAmount = unitPrice * quantity;

    const { data: purchase, error } = await supabase
      .from('addon_purchases')
      .insert({
        user_id: userId,
        addon_type: addonType,
        quantity,
        amount: totalAmount,
        status: 'completed',
        purchased_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return purchase;
  }
}

export const checkoutService = new CheckoutService();
export default checkoutService;
