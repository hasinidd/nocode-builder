import pdfParse from 'pdf-parse';
import supabase from '../db/supabase.js';

export class DocumentExtractorService {
  async extractTextFromBuffer(buffer, mimeType) {
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      return { text: data.text, numPages: data.numpages, info: data.info };
    }

    if (mimeType.startsWith('text/')) {
      return { text: buffer.toString('utf-8'), numPages: 1 };
    }

    throw new Error(`Unsupported document MIME type: ${mimeType}`);
  }

  async processAndStoreDocument(agentId, fileBuffer, fileName, mimeType) {
    const { text, numPages } = await this.extractTextFromBuffer(fileBuffer, mimeType);

    const chunkSize = 1000;
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    const rows = chunks.map((content, idx) => ({
      agent_id: agentId,
      source_file: fileName,
      content,
      chunk_index: idx,
      indexed_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('knowledge_base').insert(rows);
    if (error) throw error;

    return { fileName, characters: text.length, numPages, totalChunks: chunks.length };
  }
}

export const documentExtractorService = new DocumentExtractorService();
export default documentExtractorService;
