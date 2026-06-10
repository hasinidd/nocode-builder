/**
 * Extract text content from uploaded PDF or TXT files.
 * Uses FileReader for .txt and a simple text extraction for PDFs via edge function.
 */

import { supabase } from "@/integrations/supabase/client";

export interface DocumentExtractResult {
  success: boolean;
  content?: string;
  fileName?: string;
  error?: string;
}

const SUPPORTED_TYPES = [
  "text/plain",
  "application/pdf",
  "text/markdown",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
];

const SUPPORTED_EXTENSIONS = [".txt", ".pdf", ".md", ".csv", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".tif"];

export function isSupportedDocument(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return SUPPORTED_TYPES.includes(file.type) || SUPPORTED_EXTENSIONS.includes(ext);
}

export async function extractDocumentText(file: File): Promise<DocumentExtractResult> {
  if (!isSupportedDocument(file)) {
    return { success: false, error: "Unsupported file type. Please upload a PDF, TXT, MD, CSV, or image file (JPG, PNG, etc.)." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "File is too large. Maximum size is 10MB." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase();

  // Text-based files: read directly
  if (ext === "txt" || ext === "md" || ext === "csv" || file.type === "text/plain" || file.type === "text/markdown" || file.type === "text/csv") {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          success: true,
          content: reader.result as string,
          fileName: file.name,
        });
      };
      reader.onerror = () => {
        resolve({ success: false, error: "Failed to read file." });
      };
      reader.readAsText(file);
    });
  }

  // PDF or image: send to edge function for extraction (with OCR fallback)
  const isImageOrPdf = ext === "pdf" || file.type === "application/pdf" ||
    file.type.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "tif"].includes(ext || "");

  if (isImageOrPdf) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const { data, error } = await supabase.functions.invoke("extract-document", {
        body: { fileBase64: base64, fileName: file.name, mimeType: file.type },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: data.success,
        content: data.content,
        fileName: file.name,
        error: data.error,
      };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to extract content" };
    }
  }

  return { success: false, error: "Unsupported file format." };
}
