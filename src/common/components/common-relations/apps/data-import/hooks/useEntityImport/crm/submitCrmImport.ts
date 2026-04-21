/**
 * CRM submission strategy. Owns:
 *  - Endpoint selection (lead / contact / account / opportunity under
 *    `customer-relations`)
 *  - CRM-only structural entity preparation (string-form `addressLine` for
 *    the CRM lead endpoint). Value-level defaults such as `leadStatusRef`
 *    come from `ImportConfig.enforcedSelects` and are applied generically
 *    in the core hook before this runs.
 *  - CRM-only error normalization (account marshalling, plus the shared
 *    communication-channel error patterns)
 */

import type { ImportConfig, ImportResult } from '@/common/components/common-relations/apps/data-import/types'
import {
  extractErrorMessage,
  getStandardEntityCollectionKey,
  matchCommunicationChannelError,
  processStandardEntityResponse
} from '../shared'
import type { ImportSubmissionContext, ImportSubmissionStrategy } from '../types'
import { toCustomerAccountPayload } from './toCustomerAccountPayload'
import { toLeadAddressLineString } from './toLeadAddressLineString'

const STANDARD_ENTITY_ENDPOINTS = {
  lead: 'Leads',
  contact: 'Contacts',
  account: 'Accounts',
  opportunity: 'Opportunities'
} as const

type SupportedStandardEntityType = keyof typeof STANDARD_ENTITY_ENDPOINTS

function isSupportedStandardEntityType(value: string): value is SupportedStandardEntityType {
  return value in STANDARD_ENTITY_ENDPOINTS
}

function prepareCrmEntityForSubmission(entity: Record<string, any>, config: ImportConfig): Record<string, any> {
  if (config.entityType !== 'lead') return entity

  const prepared = { ...entity }
  const addressLine = toLeadAddressLineString(prepared.addressLine)
  if (addressLine) {
    prepared.addressLine = addressLine
  } else {
    delete prepared.addressLine
  }
  return prepared
}

function buildRequestEntities(
  entities: Record<string, any>[],
  config: ImportConfig,
  ownerEmployeeId: string | undefined
): Record<string, any>[] {
  if (config.entityType === 'account') {
    return entities.map(entity => toCustomerAccountPayload(entity, ownerEmployeeId))
  }
  return entities
}

async function submit(entities: Record<string, any>[], ctx: ImportSubmissionContext): Promise<ImportResult> {
  const { config, restClient, accessToken, ownerEmployeeId } = ctx

  if (!isSupportedStandardEntityType(config.entityType)) {
    throw new Error(`Unsupported CRM entity type: ${config.entityType}`)
  }

  const entitySuffix = STANDARD_ENTITY_ENDPOINTS[config.entityType]
  const endpoint = `/customer-relations/create${entitySuffix}`
  const entityCollectionKey = getStandardEntityCollectionKey(entitySuffix, 'customer')
  const requestEntities = buildRequestEntities(entities, config, ownerEmployeeId)

  const response = await restClient.post(
    endpoint,
    { [entityCollectionKey]: requestEntities },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  return processStandardEntityResponse(response, entityCollectionKey)
}

function normalizeCrmImportError(error: unknown, entityType: string): string | undefined {
  const base = extractErrorMessage(error)

  if (/error while marshalling process instance/i.test(base) && entityType === 'account') {
    return 'Import failed: CRM Account payload shape is invalid for Java process.'
  }

  return matchCommunicationChannelError(base, entityType)
}

export function createCrmImportStrategy(config: ImportConfig): ImportSubmissionStrategy {
  return {
    prepareEntityForSubmission: entity => prepareCrmEntityForSubmission(entity, config),
    submit,
    normalizeError: error => normalizeCrmImportError(error, config.entityType)
  }
}
