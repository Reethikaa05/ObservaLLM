// PII Redaction patterns
const PII_PATTERNS = [
  // Email addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, label: '[EMAIL]' },
  // Phone numbers (various formats)
  { pattern: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: '[PHONE]' },
  // SSN
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, label: '[SSN]' },
  // Credit card numbers
  { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, label: '[CC_NUMBER]' },
  // IP addresses
  { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, label: '[IP_ADDRESS]' },
  // API Keys (common patterns)
  { pattern: /\b(sk-|pk-|api_key[=:]\s*)[A-Za-z0-9_\-]{20,}\b/gi, label: '[API_KEY]' },
  // Names with common titles
  { pattern: /\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?\b/g, label: '[NAME]' },
  // Dates of birth patterns
  { pattern: /\b(DOB|date of birth|born on)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, label: '[DOB]' },
  // Passport numbers
  { pattern: /\b[A-Z]{1,2}\d{6,9}\b/g, label: '[PASSPORT]' },
];

export function redactPII(text) {
  if (!text || typeof text !== 'string') return { text, redacted: false, count: 0 };
  
  let redacted = text;
  let count = 0;
  
  for (const { pattern, label } of PII_PATTERNS) {
    const matches = redacted.match(pattern);
    if (matches) {
      count += matches.length;
      redacted = redacted.replace(pattern, label);
    }
  }
  
  return {
    text: redacted,
    redacted: count > 0,
    count
  };
}

export function redactMessages(messages) {
  return messages.map(msg => {
    const { text, redacted, count } = redactPII(msg.content);
    return {
      ...msg,
      content: text,
      _piiRedacted: redacted,
      _piiCount: count
    };
  });
}
