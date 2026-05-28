import { extractTextFromPDF, extractTextFromImage } from '../services/ocrService.js';
import supabase from '../db/supabase.js';

const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'image/gif': 'image'
};

// ── Upload and OCR a document or image ────────────────────────────────────────
export const uploadDocument = async (req, res, next) => {
  try {
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { buffer, mimetype, originalname, size } = req.file;
    const fileType = ALLOWED_TYPES[mimetype];

    if (!fileType) {
      return res.status(415).json({ error: `Unsupported file type: ${mimetype}` });
    }

    // Verify agent ownership
    const { data: agent } = await supabase
      .from('agents').select('id').eq('id', agentId).eq('user_id', req.user.id).single();
    if (!agent) return res.status(403).json({ error: 'Agent not found or access denied' });

    let extractedText = '';
    if (fileType === 'pdf') {
      extractedText = await extractTextFromPDF(buffer);
    } else {
      extractedText = await extractTextFromImage(buffer);
    }

    if (!extractedText.trim()) {
      return res.status(422).json({ error: 'Could not extract text from the file' });
    }

    // Chunk and store in knowledge base
    const chunkSize = 800;
    const chunks = [];
    for (let i = 0; i < extractedText.length; i += chunkSize) {
      chunks.push(extractedText.slice(i, i + chunkSize));
    }

    const inserts = chunks.map((chunk, i) => ({
      agent_id: agentId,
      source_file: originalname,
      content: chunk,
      chunk_index: i,
      file_type: fileType,
      indexed_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('knowledge_base').insert(inserts);
    if (error) throw error;

    // Store file metadata
    await supabase.from('uploaded_files').insert({
      agent_id: agentId,
      filename: originalname,
      mime_type: mimetype,
      size_bytes: size,
      chunks: chunks.length
    });

    res.json({
      success: true,
      filename: originalname,
      fileType,
      characters: extractedText.length,
      chunks: chunks.length,
      sizeBytes: size
    });
  } catch (err) { next(err); }
};

// ── Upload image for visual matching ──────────────────────────────────────────
export const uploadImage = async (req, res, next) => {
  try {
    const { agentId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const { buffer, originalname, mimetype } = req.file;
    if (!mimetype.startsWith('image/')) {
      return res.status(415).json({ error: 'Only image files are accepted for this endpoint' });
    }

    const extractedText = await extractTextFromImage(buffer);

    const { error } = await supabase.from('knowledge_base').insert({
      agent_id: agentId,
      source_file: originalname,
      content: extractedText || `[Image: ${originalname}]`,
      chunk_index: 0,
      file_type: 'image',
      indexed_at: new Date().toISOString()
    });
    if (error) throw error;

    res.json({
      success: true,
      filename: originalname,
      extractedText: extractedText.slice(0, 200) + (extractedText.length > 200 ? '...' : '')
    });
  } catch (err) { next(err); }
};

// ── List uploaded files for an agent ─────────────────────────────────────────
export const listFiles = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('agent_id', req.params.agentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

// ── Delete an uploaded file and its KB entries ────────────────────────────────
export const deleteFile = async (req, res, next) => {
  try {
    const { agentId, filename } = req.params;
    const name = decodeURIComponent(filename);
    await Promise.all([
      supabase.from('knowledge_base').delete().eq('agent_id', agentId).eq('source_file', name),
      supabase.from('uploaded_files').delete().eq('agent_id', agentId).eq('filename', name)
    ]);
    res.json({ success: true, deleted: name });
  } catch (err) { next(err); }
};
