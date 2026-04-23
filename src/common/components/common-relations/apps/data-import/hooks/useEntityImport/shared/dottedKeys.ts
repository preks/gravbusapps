/**
 * Helpers for bridging flat dotted-key records and deeply nested objects.
 *
 * The backend's `extract-from-file` response — especially for investments —
 * mixes flat and nested fields. The UI normalizes everything to flat
 * top-level keys for data-quality and preview; submission strategies then
 * rebuild the nested payload shape via `nestFlatDottedKeys`.
 */

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function spreadSubObject(
  target: Record<string, unknown>,
  subObject: Record<string, unknown>,
  prefix: string
): void {
  for (const [key, value] of Object.entries(subObject)) {
    const flatKey = `${prefix}.${key}`
    if (!(flatKey in target)) {
      target[flatKey] = value
    }
  }
}

/**
 * Build a nested object from a flat record whose keys are dot-separated paths.
 *
 * Example:
 *   { 'investment.name': 'X', 'liquidFundInvestment.additionalProperties.isin': 'DE...' }
 *   => { investment: { name: 'X' }, liquidFundInvestment: { additionalProperties: { isin: 'DE...' } } }
 *
 * Keys without a dot become top-level keys. Existing nested objects in `flat`
 * are preserved as-is (defensive: in case a previous step already produced a
 * nested value).
 */
export function nestFlatDottedKeys(flat: Record<string, unknown>): Record<string, any> {
  const root: Record<string, any> = {}

  for (const [rawKey, value] of Object.entries(flat)) {
    if (value === undefined) continue

    if (!rawKey.includes('.')) {
      root[rawKey] = value
      continue
    }

    const segments = rawKey.split('.')
    let cursor = root
    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i]
      const next = cursor[segment]
      if (!isPlainRecord(next)) {
        cursor[segment] = {}
      }
      cursor = cursor[segment] as Record<string, any>
    }
    cursor[segments[segments.length - 1]] = value
  }

  return root
}
