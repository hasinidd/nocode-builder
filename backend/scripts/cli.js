#!/usr/bin/env node
import { NoCodeBuilderClient } from '../src/sdk/client.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new NoCodeBuilderClient({ apiKey: process.env.ADMIN_API_KEY || 'admin_token' });

async function showAgents() {
  console.log('\n📋 Fetching agent list...');
  try {
    const { agents, total } = await client.listAgents();
    console.log(`Total Agents: ${total}\n`);
    agents.forEach(a => {
      const status = a.published ? '🟢 Published' : '⚪ Draft';
      console.log(`  [${a.id}] ${a.name} (${a.language}) - ${status}`);
    });
  } catch (err) {
    console.error('❌ Error listing agents:', err.message);
  }
}

async function showStats(agentId) {
  console.log(`\n📊 Fetching stats for agent ${agentId}...`);
  try {
    const stats = await client.getStats(agentId);
    console.log(`  Total Messages:  ${stats.totalMessages}`);
    console.log(`  Success Rate:    ${stats.successRate}%`);
    console.log(`  Avg Latency:     ${stats.avgResponseMs}ms`);
    console.log(`  Actions:         Bookings=${stats.actions.booking}, Orders=${stats.actions.order}, Leads=${stats.actions.lead}`);
  } catch (err) {
    console.error('❌ Error fetching stats:', err.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'agents':
    case 'list':
      await showAgents();
      break;
    case 'stats':
      if (!args[1]) {
        console.log('Usage: node scripts/cli.js stats <agentId>');
      } else {
        await showStats(args[1]);
      }
      break;
    case 'help':
    default:
      console.log(`
NoCode Builder CLI v1.0.0

Commands:
  agents, list        List all registered AI agents
  stats <agentId>     Show performance metrics for an agent
  help                Show this help menu
`);
      break;
  }
}

main();
