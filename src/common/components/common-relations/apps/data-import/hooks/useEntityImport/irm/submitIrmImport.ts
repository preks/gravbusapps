/**
 * IRM submission strategy. Owns:
 *  - The two IRM submission paths:
 *      1. Investment batch (`createInvestments`) for investment-group
 *         entity types like `equity-investment`, `real-estate-investment`,
 *         `liquid-fund-investment`
 *      2. Investment report batch (`createInvestmentReports`) for report
 *         imports scoped by `InvestmentGroup`
 *      3. Investment company bulk (`createInvestmentCompanies`)
 *      4. Standard entity endpoints under `investment-relations`
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

import type { ImportConfig, ImportResult, InvestmentCompanyOwnershipUpdate } from '../../../types/importTypes'
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
import { toEquityInvestmentRoundBatchPayload } from './toEquityInvestmentRoundBatchPayload'
import { toInvestmentBatchPayload } from './toInvestmentBatchPayload'
import { groupOwnershipPayloadsByCompany, toInvestmentCompanyOwnershipPayloads } from './toInvestmentCompanyPayload'
import { toInvestmentContactPayload } from './toInvestmentContactPayload'
import { toInvestmentOpportunityPayload } from './toInvestmentOpportunityPayload'
import { toInvestmentReportBatchPayload } from './toInvestmentReportBatchPayload'
import { toInvestmentCompanyImportPayload } from './toInvestmentCompanyImportPayload'

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
  if (/createinvestmentreportsmodelinput\.investmentreportrequests/i.test(base)) {
    return 'Import failed: Java endpoint expects `investmentReportRequests` payload root.'
  }
  if (/createequityinvestmentroundsmodelinput\.equityinvestmentroundrequests/i.test(base)) {
    return 'Import failed: Java endpoint expects `equityInvestmentRoundRequests` payload root.'
  }
  if (/no static resource createequityinvestmentrounds/i.test(base)) {
    return 'Import failed: Java process endpoint `createEquityInvestmentRounds` is missing.'
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
  if (/createinvestmentcompaniesmodelinput\.investmentcompanies/i.test(base)) {
    return 'Import failed: Java endpoint expects `investmentCompanies` as a non-empty array.'
  }
  if (/no static resource createinvestmentcompanies/i.test(base)) {
    return 'Import failed: Java process endpoint `createInvestmentCompanies` is missing.'
  }
  if (/updateinvestmentcompaniesmodelinput\.investmentcompanies/i.test(base)) {
    return 'Import failed: Java endpoint expects `investmentCompanies` as a non-empty array.'
  }
  if (/no static resource updateinvestmentcompanies/i.test(base)) {
    return 'Import failed: Java process endpoint `updateInvestmentCompanies` is missing.'
  }

  return matchCommunicationChannelError(base, entityType)
}

function processInvestmentReportResponse(response: any): ImportResult {
  const hasErrors = response.validationResponse?.errors?.length > 0
  const createdReports = response.investmentReports || response.investmentReportRequests || []

  return {
    success: !hasErrors && createdReports.length > 0,
    successCount: createdReports.length,
    errorCount: hasErrors ? response.validationResponse.errors.length : 0,
    errors: hasErrors
      ? response.validationResponse.errors.map((err: any, idx: number) => ({
          rowIndex: idx,
          entityData: {},
          error: `${err.code || 'ERROR'}: ${err.detail || err.title || 'Unknown error'}`
        }))
      : [],
    createdIds: createdReports.map((report: any) => report.investmentReport?.id || report.id).filter(Boolean)
  }
}

function processEquityInvestmentRoundResponse(response: any): ImportResult {
  const hasErrors = response.validationResponse?.errors?.length > 0
  const createdRounds = response.equityInvestmentRounds || response.equityInvestmentRoundRequests || []

  return {
    success: !hasErrors && createdRounds.length > 0,
    successCount: createdRounds.length,
    errorCount: hasErrors ? response.validationResponse.errors.length : 0,
    errors: hasErrors
      ? response.validationResponse.errors.map((err: any, idx: number) => ({
          rowIndex: idx,
          entityData: {},
          error: `${err.code || 'ERROR'}: ${err.detail || err.title || 'Unknown error'}`
        }))
      : [],
    createdIds: createdRounds.map((round: any) => round.equityInvestmentRound?.id || round.id).filter(Boolean)
  }
}

function processInvestmentCompanyResponse(
  response: any,
  relationshipSuccessCount = 0,
  relationshipErrorCount = 0
): ImportResult {
  const hasErrors = response.validationResponse?.errors?.length > 0
  const createdCompanies = response.investmentCompanies || []

  return {
    success: !hasErrors && createdCompanies.length > 0,
    successCount: createdCompanies.length,
    errorCount: hasErrors ? response.validationResponse.errors.length : 0,
    errors: hasErrors
      ? response.validationResponse.errors.map((err: any, idx: number) => ({
          rowIndex: idx,
          entityData: {},
          error: `${err.code || 'ERROR'}: ${err.detail || err.title || 'Unknown error'}`
        }))
      : [],
    createdIds: createdCompanies.map((company: any) => company.id).filter(Boolean),
    createdEntities: createdCompanies,
    relationshipSuccessCount,
    relationshipErrorCount
  }
}

function shouldDeferOwnershipSubmission(ctx: ImportSubmissionContext): boolean {
  return Boolean(ctx.deferOwnershipSubmission ?? ctx.config.deferOwnershipSubmission)
}

async function submitInvestmentCompanyOwnershipBatch(
  ownershipPayloads: Record<string, any>[],
  createdCompanies: Record<string, any>[],
  restClient: ImportSubmissionContext['restClient'],
  accessToken: string | undefined
): Promise<{ relationshipSuccessCount: number; relationshipErrorCount: number }> {
  const investmentCompanies = groupOwnershipPayloadsByCompany(ownershipPayloads, createdCompanies)

  if (investmentCompanies.length === 0) {
    return { relationshipSuccessCount: 0, relationshipErrorCount: 0 }
  }

  if (!accessToken) {
    return {
      relationshipSuccessCount: 0,
      relationshipErrorCount: ownershipPayloads.length
    }
  }

  try {
    const response = await restClient.post(
      '/investment-relations/updateInvestmentCompanies',
      { investmentCompanies },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const ownershipErrors = response.validationResponse?.errors?.length ?? 0

    if (ownershipErrors > 0) {
      return {
        relationshipSuccessCount: 0,
        relationshipErrorCount: ownershipPayloads.length
      }
    }

    return {
      relationshipSuccessCount: ownershipPayloads.length,
      relationshipErrorCount: 0
    }
  } catch {
    return {
      relationshipSuccessCount: 0,
      relationshipErrorCount: ownershipPayloads.length
    }
  }
}

export async function submitInvestmentCompanyOwnershipOnly(
  ownershipUpdates: InvestmentCompanyOwnershipUpdate[],
  ctx: ImportSubmissionContext
): Promise<ImportResult> {
  const { restClient, accessToken, createdCompaniesForOwnership = [], sourceEntitiesForOwnership = [] } = ctx
  const ownershipPayloads = toInvestmentCompanyOwnershipPayloads(
    ownershipUpdates,
    createdCompaniesForOwnership,
    sourceEntitiesForOwnership
  )

  if (ownershipPayloads.length === 0) {
    return {
      success: true,
      successCount: 0,
      errorCount: 0,
      relationshipSuccessCount: 0,
      relationshipErrorCount: 0
    }
  }

  const { relationshipSuccessCount, relationshipErrorCount } = await submitInvestmentCompanyOwnershipBatch(
    ownershipPayloads,
    createdCompaniesForOwnership,
    restClient,
    accessToken
  )

  return {
    success: relationshipErrorCount === 0 && relationshipSuccessCount > 0,
    successCount: relationshipSuccessCount,
    errorCount: relationshipErrorCount,
    relationshipSuccessCount,
    relationshipErrorCount
  }
}

export function createIrmImportStrategy(config: ImportConfig): ImportSubmissionStrategy {
  const investmentGroupRefCache = new Map<string, string>()

  // Batch submission is chosen exclusively by an explicit `investmentPayloadKey`
  // on the config. Standard investment entity types (lead/contact/account/
  // opportunity) fall through to the per-entity endpoints.
  const investmentPayloadKey = config.investmentPayloadKey
  const isInvestmentBatchImport = Boolean(investmentPayloadKey)
  const isInvestmentReportBatchImport =
    Boolean(config.investmentReportPayloadKey) || /investmentreport$/i.test(config.flowbotEntityType ?? '')
  const isEquityInvestmentRoundBatchImport =
    Boolean(config.equityInvestmentRoundPayloadKey) || /equityinvestmentround$/i.test(config.flowbotEntityType ?? '')
  const isInvestmentCompanyImport = config.entityType === 'investmentCompany' || config.entityType === 'company'

  async function submit(entities: Record<string, any>[], ctx: ImportSubmissionContext): Promise<ImportResult> {
    const { restClient, graphQLClient, accessToken, ownerEmployeeId, ownershipUpdates } = ctx

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

    if (isInvestmentReportBatchImport) {
      const payload = toInvestmentReportBatchPayload(entities, config)
      const response = await restClient.post('/investment-relations/createInvestmentReports', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      return processInvestmentReportResponse(response)
    }

    if (isEquityInvestmentRoundBatchImport) {
      const payload = toEquityInvestmentRoundBatchPayload(entities, config)
      const response = await restClient.post('/investment-relations/createEquityInvestmentRounds', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      return processEquityInvestmentRoundResponse(response)
    }

    if (isInvestmentCompanyImport) {
      const investmentCompanies = entities.map(entity => {
        const groupId =
          typeof entity.investmentCompanyGroupId === 'string' ? entity.investmentCompanyGroupId : undefined
        return toInvestmentCompanyImportPayload(entity, groupId, ownerEmployeeId)
      })

      const companyResponse = await restClient.post(
        '/investment-relations/createInvestmentCompanies',
        { investmentCompanies, changeMode: 'INSERT' },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      const createdCompanies = companyResponse.investmentCompanies || []

      if (shouldDeferOwnershipSubmission(ctx)) {
        return processInvestmentCompanyResponse(companyResponse)
      }

      const ownershipPayloads = toInvestmentCompanyOwnershipPayloads(ownershipUpdates ?? [], createdCompanies, entities)

      if (ownershipPayloads.length === 0) {
        return processInvestmentCompanyResponse(companyResponse)
      }

      const { relationshipSuccessCount, relationshipErrorCount } = await submitInvestmentCompanyOwnershipBatch(
        ownershipPayloads,
        createdCompanies,
        restClient,
        accessToken
      )

      return processInvestmentCompanyResponse(companyResponse, relationshipSuccessCount, relationshipErrorCount)
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
    postProcessExtractedRecords: isInvestmentCompanyImport
      ? records => records
      : records => records.map(record => flattenInvestmentResponseRecord(record, config)),
    submit,
    submitOwnership: (ownershipUpdates, ctx) => submitInvestmentCompanyOwnershipOnly(ownershipUpdates, ctx),
    normalizeError: error => normalizeIrmImportError(error, config.entityType)
  }
}
