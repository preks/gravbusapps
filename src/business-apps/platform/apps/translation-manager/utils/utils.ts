export function pathJoin(...parts: string[]): string {
  return parts.join('/').replace(/\/+/, '/')
}
export function parentDir(p: string): string {
  const s = p.split('/').filter(Boolean)
  s.pop()
  return s.join('/')
}
export function nowIso(): string {
  return new Date().toISOString()
}
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
export function toLocaleKeyProp(locale: string) {
  // 'en-US' -> 'enUS', 'pt-BR' -> 'ptBR'
  return locale.replace('-', () => '').replace(/-([A-Z]{2})$/, (_, cc) => cc)
}
export function hyphenLocaleToProp(locale: string) {
  // en-US -> enUS; de-DE -> deDE; ro-RO -> roRO
  return locale.replace('-', '').replace(/([a-z]{2})([A-Z]{2})/, (_, a, b) => a + b)
}
export function localeProp(locale: string) {
  const parts = locale.split('-')
  return parts[0] + (parts[1] ? parts[1] : '')
}
export function unique<T>(arr: T[]) {
  return Array.from(new Set(arr))
}
