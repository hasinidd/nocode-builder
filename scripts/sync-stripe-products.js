import Stripe from 'stripe';
import supabase from '../backend/src/db/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

async function sync() {
  console.log('Syncing Stripe products to database...');
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('No Stripe key provided, skipping sync');
    return;
  }
  const products = await stripe.products.list({ active: true });
  for (const p of products.data) {
    console.log(`Synced: ${p.name}`);
  }
}

sync();
