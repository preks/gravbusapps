/**
 * Normalizes labels for consistent filtering and mutation payloads.
 * - trim whitespace
 * - lowercase
 * - deduplicate
 * - remove empty values
 */
export function normalizeLabels(labels: string[] = []): string[] {
  return Array.from(new Set(labels.map(label => label.trim().toLowerCase()).filter(Boolean)))
}
