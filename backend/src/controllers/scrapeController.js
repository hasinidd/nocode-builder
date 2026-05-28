import { scrapeWithFirecrawl } from '../services/firecrawlService.js';
import supabase from '../db/supabase.js';

// ── Scrape a URL and index content into agent KB ──────────────────────────────
export const scrapeUrl = async (req, res, next) => {
  try {
    const { url, agentId } = req.body;

    // Verify agent belongs to user
    const { data: agent } = await supabase
      .from('agents').select('id').eq('id', agentId).eq('user_id', req.user.id).single();
    if (!agent) return res.status(403).json({ error: 'Agent not found or access denied' });

    // Check if URL already indexed
    const { data: existing } = await supabase
      .from('knowledge_base').select('id, indexed_at').eq('agent_id', agentId).eq('source_url', url).single();

    const content = await scrapeWithFirecrawl(url);

    if (!content || content.trim().length < 50) {
      return res.status(422).json({ error: 'Could not extract meaningful content from URL' });
    }

    // Chunk content into segments of ~1000 chars for better retrieval
    const chunks = chunkContent(content, 1000);

    if (existing) {
      // Re-index: delete old entries and insert fresh
      await supabase.from('knowledge_base').delete().eq('agent_id', agentId).eq('source_url', url);
    }

    const inserts = chunks.map((chunk, i) => ({
      agent_id: agentId,
      source_url: url,
      content: chunk,
      chunk_index: i,
      indexed_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('knowledge_base').insert(inserts);
    if (error) throw error;

    res.json({
      success: true,
      url,
      chunks: chunks.length,
      characters: content.length,
      reindexed: !!existing
    });
  } catch (err) { next(err); }
};

// ── List indexed sources for an agent ────────────────────────────────────────
export const listSources = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('source_url, source_file, chunk_index, indexed_at')
      .eq('agent_id', agentId)
      .order('indexed_at', { ascending: false });
    if (error) throw error;

    // Group by source
    const grouped = data.reduce((acc, row) => {
      const key = row.source_url || row.source_file;
      if (!acc[key]) acc[key] = { source: key, type: row.source_url ? 'url' : 'file', chunks: 0, indexed_at: row.indexed_at };
      acc[key].chunks++;
      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (err) { next(err); }
};

// ── Delete a source from KB ───────────────────────────────────────────────────
export const deleteSource = async (req, res, next) => {
  try {
    const { agentId, sourceUrl } = req.params;
    const url = decodeURIComponent(sourceUrl);
    const { error } = await supabase
      .from('knowledge_base').delete().eq('agent_id', agentId).eq('source_url', url);
    if (error) throw error;
    res.json({ success: true, deleted: url });
  } catch (err) { next(err); }
};

// ── Chunk content helper ──────────────────────────────────────────────────────
function chunkContent(text, maxChars) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = '';
  for (const para of paragraphs) {
    if ((current + para).length > maxChars && current) {
      chunks.push(current.trim());
      current = '';
    }
    current += para + '\n\n';
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
