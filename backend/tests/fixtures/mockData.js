export const mockUser = {
  id: 'usr_mock_12345',
  email: 'testuser@nocode.io',
  name: 'Test Administrator',
  role: 'user',
  created_at: '2026-05-20T10:00:00.000Z'
};

export const mockAgent = {
  id: 'agt_mock_99999',
  user_id: mockUser.id,
  name: 'Customer Support Bot',
  description: 'AI customer support agent for e-commerce website',
  system_prompt: 'You are an helpful e-commerce support assistant.',
  language: 'en',
  tone: 'friendly',
  features: ['booking', 'orders', 'leads'],
  published: true,
  public_url: 'https://nocode.io/a/agt_mock_99999',
  created_at: '2026-05-21T09:00:00.000Z'
};

export const mockKbChunks = [
  {
    id: 'kb_1',
    agent_id: mockAgent.id,
    source_url: 'https://example.com/faq',
    content: 'We offer free shipping on all orders over $50. Standard delivery takes 3-5 business days.',
    chunk_index: 0
  },
  {
    id: 'kb_2',
    agent_id: mockAgent.id,
    source_url: 'https://example.com/return-policy',
    content: 'Items can be returned within 30 days of purchase for a full refund or exchange.',
    chunk_index: 1
  }
];

export const mockSlots = [
  { id: 'slot_1', agent_id: mockAgent.id, date: '2026-09-01', start_time: '09:00', end_time: '09:30', is_booked: false },
  { id: 'slot_2', agent_id: mockAgent.id, date: '2026-09-01', start_time: '10:00', end_time: '10:30', is_booked: true }
];

export const mockProducts = [
  { id: 'prod_1', agent_id: mockAgent.id, name: 'Smart Watch Series 5', price: 199.99, inventory: 25 },
  { id: 'prod_2', agent_id: mockAgent.id, name: 'Wireless Charging Pad', price: 29.99, inventory: 100 }
];

export const mockLogs = Array.from({ length: 25 }, (_, i) => ({
  id: `log_${i + 1}`,
  agent_id: mockAgent.id,
  session_id: `session_${(i % 5) + 1}`,
  user_message: `Test query number ${i + 1}`,
  agent_reply: `Test response number ${i + 1}`,
  language: 'en',
  response_ms: 150 + (i * 20),
  success: true,
  action_triggered: i % 3 === 0 ? 'booking' : null,
  created_at: new Date(Date.now() - i * 3600000).toISOString()
}));
