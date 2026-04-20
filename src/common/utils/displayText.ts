const UNRESOLVED_EXPRESSION_PATTERN = /\{\{\s*[^}]+\s*\}\}/g

export function formatDisplayText(value?: string | null, fallback = 'n/a', placeholder = 'details pending'): string {
  const trimmed = String(value || '').trim()
  if (!trimmed) return fallback

  const sanitized = trimmed.replace(UNRESOLVED_EXPRESSION_PATTERN, placeholder).replace(/\s+/g, ' ').trim()
  return sanitized || fallback
}
