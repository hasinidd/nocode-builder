export class Sanitizer {

  sanitizeHtml(input) {
    if (typeof input !== 'string') return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }

  redactPii(text) {
    if (!text) return '';
    let result = text;
    result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
    result = result.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CARD]');
    result = result.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
    return result;
  }

  preventPromptInjection(userInput) {
    if (!userInput) return '';
    const dangerousPatterns = [
      /ignore previous instructions/gi,
      /ignore all instructions/gi,
      /system prompt/gi,
      /you are now in developer mode/gi,
      /DAN mode/gi
    ];
    let cleaned = userInput;
    dangerousPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '[FILTERED_PROMPT_INJECTION]');
    });
    return cleaned;
  }
}

export const sanitizer = new Sanitizer();
export default sanitizer;
