import { v4 as uuidv4 } from 'uuid';
import { generateAgentConfig, rebuildSystemPrompt } from '../services/geminiService.js';
import { generateQRCode } from '../services/qrService.js';
import supabase from '../db/supabase.js';

// ── List all agents for user ───────────────────────────────────────────────────
export const getAgents = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('agents')
      .select('id, name, description, published, public_url, language, created_at, updated_at', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) query = query.eq('published', status === 'published');
    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ agents: data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

// ── Get single agent ──────────────────────────────────────────────────────────
export const getAgentById = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*, knowledge_base(id, source_url, source_file, indexed_at)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Agent not found' });
    res.json(data);
  } catch (err) { next(err); }
};

// ── Create agent ──────────────────────────────────────────────────────────────
export const createAgent = async (req, res, next) => {
  try {
    const { name, description, language = 'en', tone = 'professional', features = [] } = req.body;

    // Generate system prompt + config via Gemini
    const config = await generateAgentConfig({ name, description, language, tone, features });

    const { data, error } = await supabase
      .from('agents')
      .insert({
        id: uuidv4(),
        user_id: req.user.id,
        name,
        description,
        language,
        tone,
        features,
        system_prompt: config.systemPrompt,
        config,
        published: false
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

// ── Update agent ──────────────────────────────────────────────────────────────
export const updateAgent = async (req, res, next) => {
  try {
    const updates = req.body;
    const agentId = req.params.id;

    // If core settings changed, rebuild system prompt
    const promptFields = ['description', 'language', 'tone', 'features'];
    const needsRebuild = promptFields.some(f => f in updates);
    if (needsRebuild) {
      const { data: current } = await supabase.from('agents').select('*').eq('id', agentId).single();
      const merged = { ...current, ...updates };
      updates.system_prompt = await rebuildSystemPrompt(merged);
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('agents').update(updates).eq('id', agentId).eq('user_id', req.user.id).select().single();

    if (error || !data) return res.status(404).json({ error: 'Agent not found or access denied' });
    res.json(data);
  } catch (err) { next(err); }
};

// ── Delete agent ──────────────────────────────────────────────────────────────
export const deleteAgent = async (req, res, next) => {
  try {
    // Cascade delete related records
    const agentId = req.params.id;
    await Promise.all([
      supabase.from('knowledge_base').delete().eq('agent_id', agentId),
      supabase.from('bookings').delete().eq('agent_id', agentId),
      supabase.from('inquiries').delete().eq('agent_id', agentId),
      supabase.from('chat_logs').delete().eq('agent_id', agentId)
    ]);

    const { error } = await supabase
      .from('agents').delete().eq('id', agentId).eq('user_id', req.user.id);
    if (error) throw error;

    res.status(204).send();
  } catch (err) { next(err); }
};

// ── Publish agent ─────────────────────────────────────────────────────────────
export const publishAgent = async (req, res, next) => {
  try {
    const agentId = req.params.id;
    const publicUrl = `${process.env.CLIENT_URL}/a/${agentId}`;

    const { data, error } = await supabase
      .from('agents')
      .update({ published: true, public_url: publicUrl, published_at: new Date().toISOString() })
      .eq('id', agentId).eq('user_id', req.user.id)
      .select().single();

    if (error || !data) return res.status(404).json({ error: 'Agent not found' });

    const qr = await generateQRCode(publicUrl);
    res.json({ agent: data, publicUrl, qr });
  } catch (err) { next(err); }
};

// ── Unpublish agent ───────────────────────────────────────────────────────────
export const unpublishAgent = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .update({ published: false, public_url: null })
      .eq('id', req.params.id).eq('user_id', req.user.id)
      .select().single();

    if (error || !data) return res.status(404).json({ error: 'Agent not found' });
    res.json(data);
  } catch (err) { next(err); }
};

// ── Generate QR code ──────────────────────────────────────────────────────────
export const generateQR = async (req, res, next) => {
  try {
    const { data: agent } = await supabase
      .from('agents').select('public_url, published').eq('id', req.params.id).single();
    if (!agent?.published || !agent?.public_url)
      return res.status(400).json({ error: 'Agent must be published before generating QR' });

    const qr = await generateQRCode(agent.public_url);
    res.json({ qr, url: agent.public_url });
  } catch (err) { next(err); }
};

// ── Duplicate agent ───────────────────────────────────────────────────────────
export const duplicateAgent = async (req, res, next) => {
  try {
    const { data: source } = await supabase
      .from('agents').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!source) return res.status(404).json({ error: 'Agent not found' });

    const { id: _id, created_at: _ca, updated_at: _ua, published_at: _pa, ...rest } = source;
    const { data, error } = await supabase
      .from('agents')
      .insert({ ...rest, id: uuidv4(), name: `${source.name} (copy)`, published: false, public_url: null })
      .select().single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};
