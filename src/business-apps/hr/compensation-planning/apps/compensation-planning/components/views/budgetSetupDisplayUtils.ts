/** Shared helpers for budget setup read-only display. */

export type TranslateFn = (id: string, args?: Record<string, string | number>) => string

export function formatEnumLabelForDisplay(value: string | null | undefined): string {
  if (value == null || value === '') {
    return ''
  }
  return String(value).replace(/_/g, ' ')
}
