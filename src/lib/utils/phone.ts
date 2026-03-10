/**
 * Normalize a phone number by stripping + prefix and non-digits.
 * Ported from n8n Workflow 2 makeChatId function.
 */
export function normalizePhone(phone: string): string {
  let value = phone.trim();
  if (value.startsWith("+")) {
    value = value.slice(1);
  }
  return value.replace(/\D/g, "");
}

/**
 * Derive a Green API chat ID from a phone number.
 * Format: digits@c.us
 */
export function deriveChatId(phone: string): string {
  const digits = normalizePhone(phone);
  if (!digits) return "";
  return `${digits}@c.us`;
}
