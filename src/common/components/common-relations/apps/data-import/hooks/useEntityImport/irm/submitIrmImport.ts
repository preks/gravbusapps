/**
 * IRM submission strategy. Owns:
 *  - The two IRM submission paths:
 *      1. Investment batch (`createInvestments`) for investment-group
 *         entity types like `equity-investment`, `real-estate-investment`,
 *         `liquid-fund-investment`
 *      2. Standard entity endpoints under `investment-relations`
 *         (`createInvestmentLeads`, `createInvestmentContacts`,
 *         `createInvestmentAccounts`, `createInvestmentOpportunities`) with a
 *         singular fallback for contacts
 *  - IRM error normalization (Java marshalling, missing endpoints, shared
 *    communication-channel patterns)
 *  - The extracted-record flattening pass performed during `convertData`
 *
 * Value-level defaults (e.g. `leadStatusRef` fallback, forced investment
 * type) are declared on `ImportConfig.enforcedSelects` and applied
 * generically in the core hook — this strategy only handles structural
 * concerns.
 */

import type { ImportConfig, ImportResult } from '@/common/components/common-relations/apps/data-import/types'
import {
  extractErrorMessage,
  getStandardEntityCollectionKey,
  matchCommunicationChannelError,
  processStandardEntityResponse
} from '../shared'
import type { ImportSubmissionContext, ImportSubmissionStrategy } from '../types'
import { flattenInvestmentResponseRecord } from './flattenInvestmentResponseRecord'
import {
  deriveInvestmentGroupCodeFromEntityType,
  GET_INVESTMENT_GROUP_BY_CODE_QUERY,
  type InvestmentGroupCatalogResponse,
  toNormalizedInvestmentGroupCode
} from './investmentGroup'
import { processInvestmentResponse } from './processInvestmentResponse'
import {
  shouldFallbackToSingularInvestmentContactEndpoint,
  submitInvestmentContactsWithFallback
} from './submitInvestmentContactsWithFallback'
import { toInvestmentBatchPayload } from './toInvestmentBatchPayload'
import { toInvestmentContactPayload } from './toInvestmentContactPayload'
import { toInvestmentOpportunityPayload } from './toInvestmentOpportunityPayload'

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

function buildStandardRequestEntities(
  entities: Record<string, any>[],
  config: ImportConfig,
  ownerEmployeeId: string | undefined
): Record<string, any>[] {
  if (config.entityType === 'contact') {
    return entities.map(entity => toInvestmentContactPayload(entity, ownerEmployeeId))
  }
  if (config.entityType === 'opportunity') {
    return entities.map(entity => toInvestmentOpportunityPayload(entity, ownerEmployeeId))
  }
  return entities
}

async function resolveDefaultInvestmentGroupRef(
  config: ImportConfig,
  graphQLClient: ImportSubmissionContext['graphQLClient'],
  cache: Map<string, string>
): Promise<string | undefined> {
  // Skip the GraphQL round-trip when the caller already pre-resolved the
  // catalog ref (the standard path through `getGroupImportConfiguration`).
  if (config.investmentGroupRef) return config.investmentGroupRef

  const codeCandidate = config.investmentGroupCodeHint || deriveInvestmentGroupCodeFromEntityType(config.entityType)
  if (!codeCandidate) return undefined

  const normalizedCode = toNormalizedInvestmentGroupCode(codeCandidate)
  const cached = cache.get(normalizedCode)
  if (cached) return cached

  const response = await graphQLClient.request<InvestmentGroupCatalogResponse>(GET_INVESTMENT_GROUP_BY_CODE_QUERY, {
    groupCode: normalizedCode
  })
  const found = response.groups?.[0]
  if (!found?.id) return undefined

  cache.set(normalizedCode, found.id)
  if (found.code) {
    cache.set(toNormalizedInvestmentGroupCode(found.code), found.id)
  }

  return found.id
}

function normalizeIrmImportError(error: unknown, entityType: string): string | undefined {
  const base = extractErrorMessage(error)

  if (/createinvestmentsmodelinput\.investmentrequests/i.test(base)) {
    return 'Import failed: Java endpoint expects `investmentRequests` payload root.'
  }
  if (/error while marshalling process instance/i.test(base) && entityType === 'contact') {
    return 'Import failed: Java marshalling error for Investment Contact payload shape.'
  }
  if (/createinvestmentcontactsmodelinput\.investmentcontacts/i.test(base)) {
    return 'Import failed: Java endpoint expects `investmentContacts` as a non-empty array.'
  }
  if (/no static resource createinvestmentopportunities/i.test(base)) {
    return 'Import failed: Java process endpoint `createInvestmentOpportunities` is missing.'
  }

  return matchCommunicationChannelError(base, entityType)
}

export function createIrmImportStrategy(config: ImportConfig): ImportSubmissionStrategy {
  const investmentGroupRefCache = new Map<string, string>()

  // Batch submission is chosen exclusively by an explicit `investmentPayloadKey`
  // on the config. Standard investment entity types (lead/contact/account/
  // opportunity) fall through to the per-entity endpoints.
  const investmentPayloadKey = config.investmentPayloadKey
  const isInvestmentBatchImport = Boolean(investmentPayloadKey)

  async function submit(entities: Record<string, any>[], ctx: ImportSubmissionContext): Promise<ImportResult> {
    const { restClient, graphQLClient, accessToken, ownerEmployeeId } = ctx

    if (isInvestmentBatchImport && investmentPayloadKey) {
      const defaultInvestmentGroupRef = await resolveDefaultInvestmentGroupRef(
        config,
        graphQLClient,
        investmentGroupRefCache
      )
      if (!defaultInvestmentGroupRef) {
        const derivedCode = config.investmentGroupCodeHint || deriveInvestmentGroupCodeFromEntityType(config.entityType)
        throw new Error(`Import failed: InvestmentGroup not found for code ${derivedCode || config.entityType}.`)
      }

      const payload = toInvestmentBatchPayload(
        entities,
        investmentPayloadKey,
        ownerEmployeeId,
        defaultInvestmentGroupRef,
        config
      )

      const response = await restClient.post('/investment-relations/createInvestments', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      return processInvestmentResponse(response)
    }

    if (!isSupportedStandardEntityType(config.entityType)) {
      throw new Error(`Unsupported IRM entity type: ${config.entityType}`)
    }

    const entitySuffix = STANDARD_ENTITY_ENDPOINTS[config.entityType]
    const endpoint = `/investment-relations/createInvestment${entitySuffix}`
    const entityCollectionKey = getStandardEntityCollectionKey(entitySuffix, 'investment')
    const requestEntities = buildStandardRequestEntities(entities, config, ownerEmployeeId)

    try {
      const response = await restClient.post(
        endpoint,
        { [entityCollectionKey]: requestEntities },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      return processStandardEntityResponse(response, entityCollectionKey)
    } catch (error) {
      if (config.entityType === 'contact' && shouldFallbackToSingularInvestmentContactEndpoint(error)) {
        return submitInvestmentContactsWithFallback(restClient, accessToken, requestEntities)
      }
      throw error
    }
  }

  return {
    postProcessExtractedRecords: records => records.map(record => flattenInvestmentResponseRecord(record, config)),
    submit,
    normalizeError: error => normalizeIrmImportError(error, config.entityType)
  }
}
