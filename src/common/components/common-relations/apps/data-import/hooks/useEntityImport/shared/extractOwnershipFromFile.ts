/**
 * Ownership-only extraction for Investment Company import Step 4.
 * Sends a minimal mapping to Flowbot; Owned By / Owns columns are resolved
 * by the hardcoded IRM import layer via header aliases.
 */

import { flowbotClient } from '@/common/network/flowbot'
import type {
  ImportConfig,
  InvestmentCompanyOwnershipUpdate
} from '@/common/components/common-relations/apps/data-import/types'

const COMPANY_NAME_HEADER_ALIASES = ['name', 'company', 'company name', 'legal entity', 'legalentity']

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function findCompanyNameHeader(sourceFields: string[]): string | undefined {
  const normalizedFields = sourceFields.map(field => ({ field, norm: normalizeHeader(field) }))
  for (const alias of COMPANY_NAME_HEADER_ALIASES) {
    const match = normalizedFields.find(item => item.norm === alias)
    if (match) return match.field
  }
  return sourceFields[0]
}

export interface ExtractOwnershipFromFileResult {
  ownershipUpdates: InvestmentCompanyOwnershipUpdate[]
  warnings: string[]
}

export async function extractOwnershipFromFile(
  file: File,
  config: ImportConfig
): Promise<ExtractOwnershipFromFileResult> {
  const flowbotEntityType = config.flowbotEntityType ?? config.entityType

  const analyzerResponse = await flowbotClient.mapFromFile(flowbotEntityType, file, 'default', config.domain)

  const sourceFields = analyzerResponse.sourceFields ?? []
  const companyNameHeader = findCompanyNameHeader(sourceFields)
  const mappingJson = JSON.stringify({
    fieldMappings: companyNameHeader
      ? [{ sourceField: companyNameHeader, targetField: 'name', transformationType: 'direct' as const }]
      : []
  })

  const response = await flowbotClient.extractFromFile(
    flowbotEntityType,
    file,
    mappingJson,
    undefined,
    config.domain,
    'default',
    0,
    5000,
    'auto'
  )

  return {
    ownershipUpdates: response.ownershipUpdates ?? [],
    warnings: response.warnings ?? []
  }
}
