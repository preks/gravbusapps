/**
 * Group-specific payload extensions applied at the tail of
 * `toInvestmentBatchPayload`. Reserved for value coercions that structural
 * re-nesting (via `nestFlatDottedKeys`) cannot express — e.g. turning a
 * JSON-encoded string into an object.
 */

import type { InvestmentPayloadExtension } from '@/common/components/common-relations/apps/data-import/types'

const parseJsonObjectString = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed.startsWith('{')) return value
  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed === 'object' && parsed !== null ? parsed : value
  } catch {
    return value
  }
}

/**
 * Real estate's `liquidityForecast` comes in as a JSON-encoded string from
 * the CSV → extraction pipeline. The Java endpoint expects a nested object
 * — parse it here so downstream callers don't have to.
 */
export const parseRealEstateLiquidityForecast: InvestmentPayloadExtension = ({ specific }) => {
  if (!('liquidityForecast' in specific)) return
  specific.liquidityForecast = parseJsonObjectString(specific.liquidityForecast)
}
