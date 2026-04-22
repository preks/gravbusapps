/**
 * The backend's `extract-from-file` response for the investment domain mixes
 * flat root-level fields (for the specific payload, e.g. `proprietorName`)
 * with already-nested sub-objects (`investment`, `additionalProperties`,
 * sometimes the payload itself).
 *
 * To stay consistent with the lead/account flows — which always treat
 * converted entities as flat top-level keys (sometimes containing dots) —
 * promote those sub-objects' contents to the top level using
 * `<segment>.<field>` keys. The nesting is rebuilt at import time inside
 * `toInvestmentBatchPayload`.
 */

import type { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { isPlainRecord, spreadSubObject } from '../shared/dottedKeys'

export function flattenInvestmentResponseRecord(
  record: Record<string, unknown>,
  config: ImportConfig
): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...record }
  const payloadKey = config.investmentPayloadKey

  if (isPlainRecord(flat.investment)) {
    spreadSubObject(flat, flat.investment, 'investment')
    delete flat.investment
  }

  if (payloadKey && isPlainRecord(flat[payloadKey])) {
    spreadSubObject(flat, flat[payloadKey], payloadKey)
    delete flat[payloadKey]
  }

  if (isPlainRecord(flat.additionalProperties)) {
    const additionalPropertiesPrefix = payloadKey ? `${payloadKey}.additionalProperties` : 'additionalProperties'
    for (const [key, value] of Object.entries(flat.additionalProperties)) {
      const alreadyDotted = key.includes('.')
      const flatKey = alreadyDotted ? key : `${additionalPropertiesPrefix}.${key}`
      if (!(flatKey in flat)) {
        flat[flatKey] = value
      }
    }
    delete flat.additionalProperties
  }

  return flat
}
