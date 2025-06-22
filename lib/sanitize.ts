export function sanitizeText(input: string): string {
  // Remove script tags and trim whitespace
  return input.replace(/<script.*?>.*?<\/script>/gi, '').trim();
} 