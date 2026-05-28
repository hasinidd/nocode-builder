#!/usr/bin/env node
/**
 * seed.js — Populate the database with realistic demo data
 * Usage: node scripts/seed.js
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── Seed data ─────────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { email: 'demo@nocode.io', name: 'Demo User', password: 'Demo@2026!' },
  { email: 'salon@example.com', name: 'Salon Owner', password: 'Salon@2026!' },
  { email: 'shop@example.com', name: 'Shop Manager', password: 'Shop@2026!' }
];

const DEMO_AGENTS = [
  {
    name: 'Bella Hair Studio',
    description: 'AI assistant for a hair salon — handles bookings, service info and pricing',
    language: 'en', tone: 'friendly',
    features: ['booking', 'services', 'lead'],
    system_prompt: 'You are the virtual assistant for Bella Hair Studio. Help customers book appointments, explain services and prices, and collect contact info for follow-ups. Be warm, professional and concise.',
    published: true
  },
  {
    name: 'TechGadget Shop',
    description: 'E-commerce assistant for an electronics store — product discovery, orders and support',
    language: 'en', tone: 'professional',
    features: ['orders', 'leads'],
    system_prompt: 'You are the shopping assistant for TechGadget Shop. Help customers find products, compare specs, place orders and track their purchases. Be accurate, helpful and efficient.',
    published: true
  },
  {
    name: 'Dr. Perera Clinic',
    description: 'Patient assistant for a private GP clinic — appointments, FAQs and directions',
    language: 'en', tone: 'professional',
    features: ['booking', 'services'],
    system_prompt: 'You are the patient assistant for Dr. Perera\'s clinic. Help patients book appointments, answer general health FAQs (not medical advice) and provide clinic directions and hours.',
    published: false
  }
];

const SERVICES = {
  'Bella Hair Studio': [
    { name: 'Haircut & Blowdry', description: 'Professional cut and finish', price: 3500, duration_minutes: 60 },
    { name: 'Full Colour', description: 'Root to tip colour application', price: 8500, duration_minutes: 120 },
    { name: 'Highlights', description: 'Balayage or foil highlights', price: 11000, duration_minutes: 150 },
    { name: 'Keratin Treatment', description: 'Smoothing keratin treatment', price: 15000, duration_minutes: 180 },
    { name: 'Scalp Treatment', description: 'Deep cleansing scalp treatment', price: 4500, duration_minutes: 45 }
  ],
  'Dr. Perera Clinic': [
    { name: 'General Consultation', description: 'GP consultation - 20 minutes', price: 2000, duration_minutes: 20 },
    { name: 'Follow-up Visit', description: 'Follow-up for existing patients', price: 1500, duration_minutes: 15 },
    { name: 'Health Screening', description: 'Basic health checkup package', price: 5000, duration_minutes: 45 }
  ]
};

const PRODUCTS = [
  { name: 'Wireless Earbuds Pro X', description: 'ANC earbuds with 30hr battery life', price: 12900, inventory: 50 },
  { name: 'USB-C Hub 7-in-1', description: 'HDMI, USB 3.0, SD card and more', price: 4500, inventory: 120 },
  { name: 'Mechanical Keyboard TKL', description: 'Tenkeyless with Cherry MX switches', price: 18500, inventory: 30 },
  { name: 'Portable SSD 1TB', description: '1050MB/s transfer, shock-resistant', price: 22000, inventory: 25 }
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function addDays(n) {
  return new Date(Date.now() + n * 86400000).toISOString().split('T')[0];
}

function randomMs(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Seed functions ────────────────────────────────────────────────────────────
async function seedUsers() {
  console.log('👤 Seeding users...');
  const users = [];
  for (const u of DEMO_USERS) {
    const password_hash = await bcrypt.hash(u.password, 10);
    const { data, error } = await supabase
      .from('users')
      .upsert({ id: uuidv4(), email: u.email, name: u.name, password_hash, role: 'user' }, { onConflict: 'email' })
      .select().single();
    if (error) { console.warn(`  ⚠ User ${u.email}: ${error.message}`); continue; }
    users.push(data);
    console.log(`  ✓ ${u.name} (${u.email})`);
  }
  return users;
}

async function seedAgents(users) {
  console.log('\n🤖 Seeding agents...');
  const agents = [];
  for (let i = 0; i < DEMO_AGENTS.length; i++) {
    const user = users[i % users.length];
    const a = DEMO_AGENTS[i];
    const publicId = uuidv4();
    const { data, error } = await supabase
      .from('agents')
      .insert({
        id: publicId,
        user_id: user.id,
        name: a.name,
        description: a.description,
        system_prompt: a.system_prompt,
        language: a.language,
        tone: a.tone,
        features: a.features,
        published: a.published,
        public_url: a.published ? `https://nocode.io/a/${publicId}` : null,
        config: { autoDetectLanguage: true, fallbackLanguage: a.language }
      })
      .select().single();
    if (error) { console.warn(`  ⚠ Agent ${a.name}: ${error.message}`); continue; }
    agents.push(data);
    console.log(`  ✓ ${a.name} [${a.published ? 'published' : 'draft'}]`);
  }
  return agents;
}

async function seedServices(agents) {
  console.log('\n💼 Seeding services...');
  for (const agent of agents) {
    const svcs = SERVICES[agent.name];
    if (!svcs) continue;
    for (const s of svcs) {
      const { error } = await supabase.from('services').insert({ ...s, agent_id: agent.id });
      if (error) console.warn(`  ⚠ Service ${s.name}: ${error.message}`);
      else console.log(`  ✓ ${agent.name} → ${s.name}`);
    }
  }
}

async function seedSlots(agents) {
  console.log('\n📅 Seeding availability slots...');
  const TIMES = [['09:00','09:30'],['09:30','10:00'],['10:00','10:30'],['10:30','11:00'],['14:00','14:30'],['14:30','15:00'],['15:00','15:30']];
  for (const agent of agents) {
    if (!agent.features?.includes('booking')) continue;
    const slots = [];
    for (let d = 1; d <= 14; d++) {
      const date = addDays(d);
      for (const [start, end] of TIMES) {
        slots.push({ id: uuidv4(), agent_id: agent.id, date, start_time: start, end_time: end });
      }
    }
    const { error } = await supabase.from('availability_slots').insert(slots);
    if (error) console.warn(`  ⚠ Slots for ${agent.name}: ${error.message}`);
    else console.log(`  ✓ ${agent.name} → ${slots.length} slots (next 14 days)`);
  }
}

async function seedProducts(agents) {
  console.log('\n📦 Seeding products...');
  const shopAgent = agents.find(a => a.name === 'TechGadget Shop');
  if (!shopAgent) return;
  for (const p of PRODUCTS) {
    const { data: product, error } = await supabase
      .from('products').insert({ ...p, agent_id: shopAgent.id }).select().single();
    if (error) { console.warn(`  ⚠ Product ${p.name}: ${error.message}`); continue; }
    console.log(`  ✓ ${p.name}`);
    // Add colour variants
    const variants = [
      { product_id: product.id, name: 'Colour', value: 'Black', price_delta: 0, inventory: Math.ceil(p.inventory * 0.6) },
      { product_id: product.id, name: 'Colour', value: 'Silver', price_delta: 500, inventory: Math.floor(p.inventory * 0.4) }
    ];
    await supabase.from('variants').insert(variants);
  }
}

async function seedChatLogs(agents) {
  console.log('\n💬 Seeding chat logs...');
  const SAMPLE_MESSAGES = [
    ['Hi, what services do you offer?', 'We offer a range of services. Let me list them for you...'],
    ['How can I book an appointment?', 'I can help you book! What date works best for you?'],
    ['What are your opening hours?', 'We are open Monday–Saturday, 9 AM to 6 PM.'],
    ['Do you have availability this weekend?', 'Let me check... Yes, we have slots on Saturday!'],
    ['How much does a haircut cost?', 'A haircut and blowdry starts from LKR 3,500.'],
    ['Can I reschedule my appointment?', 'Of course! Please give me your booking reference.'],
    ['What payment methods do you accept?', 'We accept cash, cards and online transfers.'],
    ['Is parking available?', 'Yes, free parking is available in our building.']
  ];
  for (const agent of agents) {
    const logs = [];
    for (let i = 0; i < 50; i++) {
      const [userMsg, agentReply] = randomChoice(SAMPLE_MESSAGES);
      logs.push({
        agent_id: agent.id,
        session_id: `seed_session_${Math.floor(i / 5)}`,
        user_message: userMsg,
        agent_reply: agentReply,
        language: 'en',
        response_ms: randomMs(400, 2500),
        success: Math.random() > 0.05,
        action_triggered: Math.random() > 0.7 ? randomChoice(['booking', 'lead', null]) : null,
        created_at: new Date(Date.now() - randomMs(0, 30 * 86400000)).toISOString()
      });
    }
    const { error } = await supabase.from('chat_logs').insert(logs);
    if (error) console.warn(`  ⚠ Logs for ${agent.name}: ${error.message}`);
    else console.log(`  ✓ ${agent.name} → ${logs.length} chat log entries`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 NoCode Builder — Database Seeder\n');
  try {
    const users  = await seedUsers();
    const agents = await seedAgents(users);
    await seedServices(agents);
    await seedSlots(agents);
    await seedProducts(agents);
    await seedChatLogs(agents);
    console.log('\n✅ Seeding complete!');
    console.log('\nDemo credentials:');
    for (const u of DEMO_USERS) {
      console.log(`  ${u.email}  /  ${u.password}`);
    }
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

main();
