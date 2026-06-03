import { writeFileSync } from 'fs';
import supabase from '../backend/src/db/supabase.js';

async function generate() {
  console.log('Generating database schema documentation...');
  const tables = ['users', 'agents', 'knowledge_base', 'bookings', 'orders', 'inquiries', 'chat_logs'];
  const doc = [];

  for (const table of tables) {
    const { data } = await supabase.from(table).select('*').limit(1);
    const keys = data && data.length > 0 ? Object.keys(data[0]) : [];
    doc.push(`Table: ${table}\nColumns: ${keys.join(', ')}\n`);
  }

  writeFileSync('./database-schema.txt', doc.join('\n'));
  console.log('Done!');
}

generate();
