/**
 * Runs the flowbot `extract-from-file` call with an IRM-only fallback:
 * if the backend rejects backend-style target fields for an investment flow,
 * retry once with UI-prefixed mappings instead. This keeps the core hook
 * free of flowbot-specific knowledge.
 *
 * The optional `repairCsv` argument is forwarded verbatim so callers can
 * trigger the backend's hard-repair pipeline on demand (e.g. when the
 * user clicks "Try repair" after seeing a CSV-quality warning). The
 * `csvQuality` field returned by the backend is propagated to the
 * caller so it can render quality feedback without making a second
 * extraction call.
 */

import { flowbotClient } from '@/common/network/flowbot'
import type {
  CsvQuality,
  FieldMapping,
  ImportConfig
} from '@/common/components/common-relations/apps/data-import/types'
import { shouldRetryWithUiMappings } from './errorHandling'
import { toBackendMappings, type TargetFieldAdapters } from './targetFieldAdapters'

export interface ExtractWithRetryResult {
  records: Record<string, unknown>[]
  usedUiMappings: boolean
  csvQuality: CsvQuality | null
  warnings: string[]
}

export async function extractWithRetry(
  file: File,
  config: ImportConfig,
  mappings: FieldMapping[],
  enforcedFieldsJson: string | undefined,
  adapters: TargetFieldAdapters,
  repairCsv: 'auto' | 'hard' = 'auto',
  requiredSubtypeKey?: string | null,
  additionalPropertiesFields?: readonly string[] | null
): Promise<ExtractWithRetryResult> {
  const backendMappings = toBackendMappings(mappings, adapters)
  const backendMappingJson = JSON.stringify({ fieldMappings: backendMappings })
  const uiMappingJson = JSON.stringify({ fieldMappings: mappings })
  const flowbotEntityType = config.flowbotEntityType ?? config.entityType

  try {
    const response = await flowbotClient.extractFromFile(
      flowbotEntityType,
      file,
      backendMappingJson,
      enforcedFieldsJson,
      config.domain,
      'default',
      0,
      5000,
      repairCsv,
      requiredSubtypeKey,
      additionalPropertiesFields
    )
    return {
      records: response.records,
      usedUiMappings: false,
      csvQuality: response.csvQuality ?? null,
      warnings: response.warnings ?? []
    }
  } catch (error) {
    if (config.domain === 'investment' && shouldRetryWithUiMappings(error)) {
      console.warn('[Import] extract-from-file targetField mismatch, retrying once with UI-prefixed mappings')
      const response = await flowbotClient.extractFromFile(
        flowbotEntityType,
        file,
        uiMappingJson,
        enforcedFieldsJson,
        config.domain,
        'default',
        0,
        5000,
        repairCsv,
        requiredSubtypeKey,
        additionalPropertiesFields
      )
      return {
        records: response.records,
        usedUiMappings: true,
        csvQuality: response.csvQuality ?? null,
        warnings: response.warnings ?? []
      }
    }
    throw error
  }
}
