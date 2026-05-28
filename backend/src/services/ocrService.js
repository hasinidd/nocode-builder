import pdf from 'pdf-parse/lib/pdf-parse.js';
import Tesseract from 'tesseract.js';

export const extractTextFromPDF = async (buffer) => {
  const data = await pdf(buffer);
  return data.text;
};

export const extractTextFromImage = async (buffer) => {
  const { data: { text } } = await Tesseract.recognize(buffer, 'eng', { logger: () => {} });
  return text;
};
