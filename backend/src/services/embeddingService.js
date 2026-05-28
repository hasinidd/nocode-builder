import { GoogleGenerativeAI } from '@google/generative-ai';
import supabase from '../db/supabase.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class EmbeddingService {
  constructor(modelName = 'text-embedding-004') {
    this.modelName = modelName;
  }

  async generateEmbedding(text) {
    if (!process.env.GEMINI_API_KEY) {
      return this._syntheticVector(text, 768);
    }
    try {
      const model = genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      console.warn('[EmbeddingService] API call failed, falling back:', err.message);
      return this._syntheticVector(text, 768);
    }
  }

  async generateBatchEmbeddings(texts) {
    return Promise.all(texts.map(t => this.generateEmbedding(t)));
  }

  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async searchKnowledgeBase(agentId, queryText, topK = 5, matchThreshold = 0.6) {
    const queryVector = await this.generateEmbedding(queryText);

    const { data: matches, error } = await supabase.rpc('match_knowledge_base', {
      query_embedding: queryVector,
      filter_agent_id: agentId,
      match_count: topK,
      match_threshold: matchThreshold
    });

    if (!error && matches) {
      return matches;
    }

    const { data: chunks } = await supabase
      .from('knowledge_base')
      .select('id, content, source_url, source_file, chunk_index')
      .eq('agent_id', agentId)
      .limit(100);

    if (!chunks || chunks.length === 0) return [];

    const scored = chunks.map(chunk => {
      const chunkVector = this._syntheticVector(chunk.content, 768);
      const similarity = this.cosineSimilarity(queryVector, chunkVector);
      return { ...chunk, similarity };
    });

    return scored
      .filter(c => c.similarity >= matchThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  chunkText(text, chunkSize = 800, overlap = 150) {
    if (!text || typeof text !== 'string') return [];
    const normalized = text.replace(/\r\n/g, '\n').trim();
    const chunks = [];
    let start = 0;

    while (start < normalized.length) {
      let end = start + chunkSize;
      if (end < normalized.length) {
        const lastPara = normalized.lastIndexOf('\n\n', end);
        if (lastPara > start + chunkSize / 2) {
          end = lastPara;
        } else {
          const lastSentence = normalized.lastIndexOf('. ', end);
          if (lastSentence > start + chunkSize / 2) {
            end = lastSentence + 1;
          }
        }
      }
      const chunk = normalized.slice(start, end).trim();
      if (chunk.length > 20) {
        chunks.push(chunk);
      }
      start += chunkSize - overlap;
    }

    return chunks;
  }

  _syntheticVector(str, dim = 768) {
    const vec = new Array(dim).fill(0);
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      vec[i % dim] += (code / 255) * Math.sin(i + 1);
    }
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  }
}

export const embeddingService = new EmbeddingService();
export default embeddingService;
