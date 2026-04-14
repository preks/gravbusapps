/**
 * Entity Import Hook (Generic)
 * Main orchestration hook for entity import flow
 * Works with any entity type (Lead, Contact, Account, etc.)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ImportAnalyzer } from '@/common/components/common-relations/apps/data-import/services'
import { transformCommunicationChannels } from '@/common/components/common-relations/apps/data-import/utils'
import {
  FieldMapping,
  ImportAnalyzerResponse,
  ImportStep,
  ImportConfig,
  ConvertedEntity,
  ImportResult
} from '@/common/components/common-relations/apps/data-import/types'
import { env } from '@/common/env/EnvUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { flowbotClient } from '@/common/network/flowbot'
import { buildCustomerAccountPayload } from '@/common/data/customer/types/customerAccountTypes'
import { buildInvestmentContactPayload } from '@/common/data/investment/types/investmentContactTypes'
import { buildInvestmentOpportunityPayload } from '@/common/data/investment/types/investmentOpportunityTypes'

export interface UseEntityImportReturn<T> {
  // File state
  file: File | null

  // Analysis state
  agentResponse: ImportAnalyzerResponse | null

  // Conversion state
  convertedEntities: T[]

  // Campaign state
  campaignId: string
  campaignName: string
  setCampaign: (id: string | null, name?: string | null) => void

  // UI state
  step: ImportStep
  isLoading: boolean
  error: string | null
  importResult: ImportResult | null

  // Handlers
  handleFileChange: (file: File | null) => Promise<void>
  analyzeWithAgent: () => Promise<void>
  convertData: (
    mappings: FieldMapping[],
    enforcedFieldsJson?: string,
    transformFn?: (entity: ConvertedEntity) => T
  ) => Promise<void>
  importToBackend: () => Promise<void>
  downloadJSON: () => void
  reset: () => void
}

const STANDARD_ENTITY_ENDPOINTS = {
  lead: 'Leads',
  contact: 'Contacts',
  account: 'Accounts',
  opportunity: 'Opportunities'
} as const

type SupportedStandardEntityType = keyof typeof STANDARD_ENTITY_ENDPOINTS

const GET_INVESTMENT_GROUP_BY_CODE_QUERY = `
  query GetInvestmentGroupByCode($groupCode: String!) {
    groups: CatalogEntry(
      where: {
        catalog: {identifier: {_eq: "InvestmentGroup"}, version: {_eq: "v1"}}
        isDeleted: {_eq: false}
        _or: [{code: {_eq: $groupCode}}, {value: {_eq: $groupCode}}]
      }
      limit: 1
    ) {
      id
      code
      value
    }
  }
`

function stripEmptyValues<T extends Record<string, any>>(entity: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(entity).filter(([, value]) => {
      if (value === null || value === undefined || value === '') return false
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'object') return Object.keys(value).length > 0
      return true
    })
  ) as Partial<T>
}

function parseJsonObjectString(value: unknown): unknown {
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

function normalizeEntityForImport<T extends Record<string, any>>(entity: T): T {
  const normalized = { ...entity } as T

  // Flowbot extraction may return addressLine as a JSON string.
  // Java import endpoints expect an object (e.g. { lines: [...] }).
  if ('addressLine' in normalized) {
    ;(normalized as any).addressLine = parseJsonObjectString((normalized as any).addressLine)
  }

  if (Array.isArray((normalized as any).addresses)) {
    ;(normalized as any).addresses = (normalized as any).addresses.map((addr: Record<string, unknown>) => ({
      ...addr,
      addressLine: parseJsonObjectString(addr.addressLine)
    }))
  }

  for (const [segment, segmentValue] of Object.entries(normalized as Record<string, unknown>)) {
    if (segment !== 'investment' && !segment.endsWith('Investment')) continue
    if (!segmentValue || typeof segmentValue !== 'object' || Array.isArray(segmentValue)) continue
    ;(normalized as any)[segment] = {
      ...segmentValue,
      addressLine: parseJsonObjectString((segmentValue as Record<string, unknown>).addressLine)
    }
  }

  return normalized
}

type TargetFieldAdapters = {
  uiAllowedFields: Set<string>
  backendAllowedFields: Set<string>
  uiToBackend: Map<string, string>
  backendToUi: Map<string, string>
  ambiguousBackendFields: Set<string>
}

function toBackendTargetField(uiField: string, stripRootSegment: boolean): string {
  if (!stripRootSegment) return uiField
  const separatorIndex = uiField.indexOf('.')
  return separatorIndex > -1 ? uiField.slice(separatorIndex + 1) : uiField
}

function buildTargetFieldAdapters(targetFields: string[], stripRootSegment: boolean): TargetFieldAdapters {
  const uiAllowedFields = new Set(targetFields)
  const backendAllowedFields = new Set<string>()
  const uiToBackend = new Map<string, string>()
  const backendToUiCandidates = new Map<string, Set<string>>()
  const ambiguousBackendFields = new Set<string>()

  for (const uiField of targetFields) {
    const backendField = toBackendTargetField(uiField, stripRootSegment)
    uiToBackend.set(uiField, backendField)
    backendAllowedFields.add(backendField)

    const candidates = backendToUiCandidates.get(backendField) ?? new Set<string>()
    candidates.add(uiField)
    backendToUiCandidates.set(backendField, candidates)
  }

  const backendToUi = new Map<string, string>()
  for (const [backendField, candidates] of backendToUiCandidates.entries()) {
    if (candidates.size === 1) {
      backendToUi.set(backendField, [...candidates][0])
      continue
    }
    ambiguousBackendFields.add(backendField)
  }

  return {
    uiAllowedFields,
    backendAllowedFields,
    uiToBackend,
    backendToUi,
    ambiguousBackendFields
  }
}

function toBackendMappings(mappings: FieldMapping[], adapters: TargetFieldAdapters): FieldMapping[] {
  return mappings.map(mapping => ({
    ...mapping,
    targetField: adapters.uiToBackend.get(mapping.targetField) ?? mapping.targetField
  }))
}

function resolveInitialTargetField(targetField: string, adapters: TargetFieldAdapters): string {
  if (adapters.uiAllowedFields.has(targetField)) return targetField

  const mapped = adapters.backendToUi.get(targetField)
  if (mapped) return mapped

  if (adapters.ambiguousBackendFields.has(targetField)) {
    console.warn(`[Import] Ambiguous backend target field ignored during initial mapping: ${targetField}`)
  }
  return targetField
}

function restoreUiTargetFieldNames(
  records: Record<string, unknown>[],
  adapters: TargetFieldAdapters
): Record<string, unknown>[] {
  if (records.length === 0) return records

  return records.map(record => {
    const updated = { ...record }
    for (const [backendTarget, uiTarget] of adapters.backendToUi.entries()) {
      if (backendTarget in updated && !(uiTarget in updated)) {
        updated[uiTarget] = updated[backendTarget]
      }
    }
    return updated
  })
}

function shouldRetryWithUiMappings(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return msg.includes('targetfield') && msg.includes('not in graphql schema')
}

function toRecordObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, any>
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error
  }
  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>
    const directMessage = candidate.message
    if (typeof directMessage === 'string' && directMessage.trim().length > 0) {
      return directMessage
    }
    const detail = candidate.detail
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return detail
    }
    const response = candidate.response
    if (response && typeof response === 'object') {
      const responseData = (response as Record<string, unknown>).data
      if (responseData && typeof responseData === 'object') {
        const responseMessage = (responseData as Record<string, unknown>).message
        if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
          return responseMessage
        }
        const responseDetail = (responseData as Record<string, unknown>).detail
        if (typeof responseDetail === 'string' && responseDetail.trim().length > 0) {
          return responseDetail
        }
      }
    }
  }
  return 'Import failed'
}

function sanitizeAdditionalProperties(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const result = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== null && v !== '')
  )
  return Object.keys(result).length > 0 ? result : undefined
}

function sanitizeCommunicationChannels(
  channels: unknown
): Array<{ communicationChannelRef: string; value: string; valueExtension?: string }> | undefined {
  if (!Array.isArray(channels)) return undefined
  const normalizeCommunicationChannelRef = (ref: string): string => {
    if (/^CommunicationChannel:v\d+:/i.test(ref)) return ref
    if (ref.startsWith('CommunicationChannel:'))
      return ref.replace(/^CommunicationChannel:/, 'CommunicationChannel:v1:')
    return ref
  }

  const valid = channels
    .filter(channel => channel && typeof channel === 'object')
    .map(channel => {
      const raw = channel as Record<string, unknown>
      const communicationChannelRef =
        typeof raw.communicationChannelRef === 'string'
          ? normalizeCommunicationChannelRef(raw.communicationChannelRef)
          : ''
      const value = typeof raw.value === 'string' ? raw.value.trim() : ''
      const valueExtension = typeof raw.valueExtension === 'string' ? raw.valueExtension : undefined
      return { communicationChannelRef, value, valueExtension }
    })
    .filter(channel => channel.value.length > 0 && channel.communicationChannelRef.startsWith('CommunicationChannel:'))
  return valid.length > 0 ? valid : undefined
}

function resolveContactValueByChannelCode(
  channels: Array<{ communicationChannelRef: string; value: string }>,
  channelCode: string
): string | undefined {
  const match = channels.find(channel => channel.communicationChannelRef === channelCode)
  return match?.value
}

function resolveOwnerEmployeeId(entity: Record<string, any>, ownerEmployeeId?: string): string | undefined {
  if (ownerEmployeeId) return ownerEmployeeId
  if (typeof entity.ownerEmployeeId === 'string' && entity.ownerEmployeeId.length > 0) return entity.ownerEmployeeId
  if (typeof entity.ownerEmployee === 'string' && entity.ownerEmployee.length > 0) return entity.ownerEmployee
  return undefined
}

type InvestmentGroupCatalogResponse = {
  groups: Array<{ id: string; code?: string; value?: string }>
}

function toNormalizedInvestmentGroupCode(value: string): string {
  const codeWithoutPrefix = value.replace(/^InvestmentGroup:v\d+:/i, '')
  return codeWithoutPrefix.trim().replace(/-/g, '_').replace(/\s+/g, '_').toUpperCase()
}

function deriveInvestmentGroupCodeFromEntityType(entityType: string): string | undefined {
  if (!entityType.endsWith('-investment')) return undefined
  const codePart = entityType.replace(/-investment$/, '')
  if (!codePart) return undefined
  return codePart.replace(/-/g, '_').toUpperCase()
}

function deriveInvestmentPayloadKeyFromEntityType(entityType: string): string | undefined {
  if (!entityType.endsWith('-investment')) return undefined
  const words = entityType.split('-')
  return words.map((word, index) => (index === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)).join('')
}

function toInvestmentBatchPayload(
  entities: Record<string, any>[],
  investmentType: string,
  ownerEmployeeId: string | undefined,
  defaultInvestmentGroupRef: string,
  forcedInvestmentTypeRef?: string
): { investmentRequests: Record<string, any>[] } {
  const investmentRequests = entities.map(entity => {
    const normalized = normalizeEntityForImport(entity)
    const investmentData = toRecordObject(normalized.investment)
    const specificInvestmentData = toRecordObject(normalized[investmentType])
    const resolvedOwnerEmployeeId =
      resolveOwnerEmployeeId(investmentData, ownerEmployeeId) ?? resolveOwnerEmployeeId(normalized, ownerEmployeeId)

    return {
      investment: {
        ...investmentData,
        investmentGroupRef: investmentData.investmentGroupRef || defaultInvestmentGroupRef,
        investmentTypeRef: forcedInvestmentTypeRef || investmentData.investmentTypeRef,
        investmentStatusRef: investmentData.investmentStatusRef || 'InvestmentStatus:v1:ACTIVE',
        ownerEmployee: resolvedOwnerEmployeeId || investmentData.ownerEmployee
      },
      [investmentType]: specificInvestmentData
    }
  })

  return { investmentRequests }
}

function toInvestmentContactPayload(entity: Record<string, any>, ownerEmployeeId?: string): Record<string, any> {
  const normalized = normalizeEntityForImport(entity)
  const resolvedOwnerEmployeeId = resolveOwnerEmployeeId(normalized, ownerEmployeeId)
  const sanitizedChannels = sanitizeCommunicationChannels(normalized.communicationChannels)
  const emailFromChannels = sanitizedChannels
    ? resolveContactValueByChannelCode(sanitizedChannels, 'CommunicationChannel:v1:e-mail')
    : undefined
  const phoneFromChannels = sanitizedChannels
    ? resolveContactValueByChannelCode(sanitizedChannels, 'CommunicationChannel:v1:Phone') ||
      resolveContactValueByChannelCode(sanitizedChannels, 'CommunicationChannel:v1:Mobile')
    : undefined

  // Keep submit payload deterministic: only forward fields confirmed by successful Java process calls.
  const payloadInput = stripEmptyValues({
    firstName: typeof normalized.firstName === 'string' ? normalized.firstName : undefined,
    lastName: typeof normalized.lastName === 'string' ? normalized.lastName : undefined,
    jobPosition: typeof normalized.jobPosition === 'string' ? normalized.jobPosition : undefined,
    description: typeof normalized.description === 'string' ? normalized.description : undefined,
    email: typeof normalized.email === 'string' ? normalized.email : emailFromChannels,
    phone: typeof normalized.phone === 'string' ? normalized.phone : phoneFromChannels,
    userId: typeof normalized.userId === 'string' ? normalized.userId : undefined,
    ownerEmployeeId: resolvedOwnerEmployeeId,
    communicationChannels: sanitizedChannels
  })

  return buildInvestmentContactPayload(payloadInput as any).investmentContact
}

function toInvestmentOpportunityPayload(entity: Record<string, any>, ownerEmployeeId?: string): Record<string, any> {
  const normalized = normalizeEntityForImport(entity)
  const resolvedOwnerEmployeeId = resolveOwnerEmployeeId(normalized, ownerEmployeeId)
  const additionalProperties = sanitizeAdditionalProperties(normalized.additionalProperties)

  const payloadInput = stripEmptyValues({
    ...normalized,
    ownerEmployeeId: resolvedOwnerEmployeeId
  })

  delete (payloadInput as Record<string, unknown>).ownerEmployee

  const built = buildInvestmentOpportunityPayload(payloadInput).investmentOpportunity as Record<string, any>
  if (additionalProperties) {
    built.additionalProperties = additionalProperties
  }
  return built
}

function toCustomerAccountPayload(entity: Record<string, any>, ownerEmployeeId?: string): Record<string, any> {
  const normalized = normalizeEntityForImport(entity)
  const resolvedOwnerEmployeeId = resolveOwnerEmployeeId(normalized, ownerEmployeeId)
  const sanitizedChannels = sanitizeCommunicationChannels(normalized.communicationChannels)
  const additionalProperties = sanitizeAdditionalProperties(normalized.additionalProperties)

  const payloadInput = stripEmptyValues({
    ...normalized,
    ownerEmployeeId: resolvedOwnerEmployeeId,
    communicationChannels: sanitizedChannels,
    additionalProperties
  })

  delete (payloadInput as Record<string, unknown>).ownerEmployee

  return buildCustomerAccountPayload(payloadInput as any).account
}

function normalizeImportError(error: unknown, entityType: string): string {
  const base = extractErrorMessage(error)
  if (/createinvestmentsmodelinput\.investmentrequests/i.test(base)) {
    return 'Import failed: Java endpoint expects `investmentRequests` payload root.'
  }
  if (/error while marshalling process instance/i.test(base) && entityType === 'contact') {
    return 'Import failed: Java marshalling error for Investment Contact payload shape.'
  }
  if (/error while marshalling process instance/i.test(base) && entityType === 'account') {
    return 'Import failed: CRM Account payload shape is invalid for Java process.'
  }
  if (/createinvestmentcontactsmodelinput\.investmentcontacts/i.test(base)) {
    return 'Import failed: Java endpoint expects `investmentContacts` as a non-empty array.'
  }
  if (/communicationchannel/i.test(base) && entityType === 'contact') {
    return 'Import failed: invalid contact communication channel reference or value.'
  }
  if (/communicationchannel/i.test(base) && entityType === 'account') {
    return 'Import failed: invalid account communication channel reference or value.'
  }
  if (/no static resource createinvestmentopportunities/i.test(base)) {
    return 'Import failed: Java process endpoint `createInvestmentOpportunities` is missing.'
  }
  return base
}

function shouldFallbackToSingularInvestmentContactEndpoint(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase()
  return (
    /no static resource createinvestmentcontacts/i.test(message) ||
    (message.includes('404') && message.includes('createinvestmentcontacts'))
  )
}

// Helper function to process investment API response
function processInvestmentResponse(response: any): ImportResult {
  const hasErrors = response.validationResponse?.errors?.length > 0
  const createdInvestments = response.investments || response.investmentRequests || []

  return {
    success: !hasErrors && createdInvestments.length > 0,
    successCount: createdInvestments.length,
    errorCount: hasErrors ? response.validationResponse.errors.length : 0,
    errors: hasErrors
      ? response.validationResponse.errors.map((err: any, idx: number) => ({
          rowIndex: idx,
          entityData: {},
          error: `${err.code || 'ERROR'}: ${err.detail || err.title || 'Unknown error'}`
        }))
      : [],
    createdIds: createdInvestments.map((inv: any) => inv.investment?.id).filter(Boolean)
  }
}

// Helper function to process standard entity API response
function processStandardEntityResponse(response: any, entityTypePlural: string): ImportResult {
  const hasErrors = response.validationResponse?.errors?.length > 0
  const createdEntities = response[entityTypePlural] || []

  return {
    success: !hasErrors && createdEntities.length > 0,
    successCount: createdEntities.length,
    errorCount: hasErrors ? response.validationResponse.errors.length : 0,
    errors: hasErrors
      ? response.validationResponse.errors.map((err: any, idx: number) => ({
          rowIndex: idx,
          entityData: {},
          error: `${err.code || 'ERROR'}: ${err.detail || err.title || 'Unknown error'}`
        }))
      : [],
    createdIds: createdEntities.map((entity: any) => entity.id)
  }
}

function getStandardEntityCollectionKey(entitySuffix: string, domain: ImportConfig['domain']): string {
  return domain === 'investment'
    ? `investment${entitySuffix}`
    : entitySuffix.charAt(0).toLowerCase() + entitySuffix.slice(1)
}

async function submitInvestmentContactsWithFallback(
  restClient: ReturnType<typeof useRestClient>,
  accessToken: string | undefined,
  contacts: Record<string, any>[]
): Promise<ImportResult> {
  let successCount = 0
  const errors: ImportResult['errors'] = []
  const createdIds: string[] = []

  for (let idx = 0; idx < contacts.length; idx += 1) {
    const investmentContact = contacts[idx]
    try {
      const response = await restClient.post(
        '/investment-relations/createInvestmentContact',
        { investmentContact, changeMode: 'INSERT' },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      const validationErrors = response?.validationResponse?.errors
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        errors.push({
          rowIndex: idx,
          entityData: investmentContact,
          error: `${validationErrors[0]?.code || 'ERROR'}: ${validationErrors[0]?.detail || 'Validation failure'}`
        })
        continue
      }

      successCount += 1
      if (typeof response?.investmentContact?.id === 'string') {
        createdIds.push(response.investmentContact.id)
      }
    } catch (error) {
      const message = extractErrorMessage(error)
      errors.push({
        rowIndex: idx,
        entityData: investmentContact,
        error: message
      })
      // Abort early on systemic marshalling/endpoint issues to avoid dozens of repeated failing calls.
      if (
        /error while marshalling process instance/i.test(message.toLowerCase()) ||
        /no static resource createinvestmentcontact/i.test(message.toLowerCase())
      ) {
        break
      }
    }
  }

  return {
    success: errors.length === 0 && successCount > 0,
    successCount,
    errorCount: errors.length,
    errors,
    createdIds
  }
}

export function useEntityImport<T = ConvertedEntity>(
  props: BusinessAppContextProps,
  config: ImportConfig
): UseEntityImportReturn<T> {
  const { accessToken } = props

  // State
  const [file, setFile] = useState<File | null>(null)
  const [agentResponse, setAgentResponse] = useState<ImportAnalyzerResponse | null>(null)
  const [convertedEntities, setConvertedEntities] = useState<T[]>([])
  const [campaignId, setCampaignIdState] = useState<string>('')
  const [campaignName, setCampaignNameState] = useState<string>('')
  const [step, setStep] = useState<ImportStep>('upload')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const setCampaign = useCallback((id: string | null, name?: string | null) => {
    setCampaignIdState(id || '')
    setCampaignNameState(name || '')
  }, [])

  // Services
  const aiServiceRef = useRef<ImportAnalyzer | null>(null)

  // Initialize AI service and flowbot client
  useEffect(() => {
    if (accessToken) {
      aiServiceRef.current = new ImportAnalyzer(accessToken, config.entityType, config.domain)
      flowbotClient.setAccessToken(accessToken)
    }
  }, [accessToken, config.entityType, config.domain])

  // Hooks
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const graphQLClient = useGraphQLClient(accessToken)
  const investmentGroupRefCacheRef = useRef<Map<string, string>>(new Map())
  const forcedInvestmentTypeRefRef = useRef<string | undefined>(undefined)

  const resolveDefaultInvestmentGroupRef = useCallback(async (): Promise<string | undefined> => {
    if (config.domain !== 'investment') return undefined

    const codeCandidate = config.investmentGroupCodeHint || deriveInvestmentGroupCodeFromEntityType(config.entityType)
    if (!codeCandidate) return undefined

    const normalizedCode = toNormalizedInvestmentGroupCode(codeCandidate)
    const cached = investmentGroupRefCacheRef.current.get(normalizedCode)
    if (cached) return cached

    const response = await graphQLClient.request<InvestmentGroupCatalogResponse>(GET_INVESTMENT_GROUP_BY_CODE_QUERY, {
      groupCode: normalizedCode
    })
    const found = response.groups?.[0]
    if (!found?.id) return undefined

    investmentGroupRefCacheRef.current.set(normalizedCode, found.id)
    if (found.code) {
      investmentGroupRefCacheRef.current.set(toNormalizedInvestmentGroupCode(found.code), found.id)
    }

    return found.id
  }, [config.domain, config.entityType, config.investmentGroupCodeHint, graphQLClient])

  // Handle file change
  const handleFileChange = useCallback(async (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null)
      setError(null)
      return
    }

    setFile(selectedFile)
    setError(null)
  }, [])

  // Analyze with AI
  const analyzeWithAgent = useCallback(async () => {
    if (!file) {
      setError('Please upload a file first')
      return
    }

    if (!aiServiceRef.current) {
      setError('AI service not initialized')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const agentResult = await aiServiceRef.current.analyzeImport(file)
      const targetFieldValues = config.targetFields.map(f => f.value)
      const adapters = buildTargetFieldAdapters(targetFieldValues, config.domain === 'investment')
      const resolvedMappings = agentResult.fieldMappings.map(mapping => ({
        ...mapping,
        targetField: resolveInitialTargetField(mapping.targetField, adapters)
      }))

      // Validate mappings - filter out invalid target fields
      const validTargetFields = new Set(targetFieldValues)
      const validMappings = resolvedMappings.filter(mapping => {
        const isValid = validTargetFields.has(mapping.targetField)
        if (!isValid) {
          console.warn(
            `Removing invalid mapping: ${mapping.sourceField} → ${mapping.targetField} (target field not in schema)`
          )
        }
        return isValid
      })

      // Normalize mappings based on config:
      // - ensure catalog mappings carry the correct catalogIdentifier
      // - ensure direct mappings don't carry a catalogIdentifier
      const targetFieldByValue = new Map(config.targetFields.map(f => [f.value, f] as const))
      const normalizedMappings = validMappings.map(mapping => {
        const targetField = targetFieldByValue.get(mapping.targetField)
        if (!targetField) return mapping
        if (targetField.type === 'catalog') {
          return {
            ...mapping,
            transformationType: 'catalog' as const,
            catalogIdentifier: targetField.catalog
          }
        }
        return {
          ...mapping,
          transformationType: 'direct' as const,
          catalogIdentifier: undefined
        }
      })

      // Update unmapped fields to include the invalid mappings
      const invalidSourceFields = resolvedMappings
        .filter(m => !validTargetFields.has(m.targetField))
        .map(m => m.sourceField)

      const updatedUnmappedFields = [...new Set([...agentResult.unmappedSourceFields, ...invalidSourceFields])]

      setAgentResponse({
        ...agentResult,
        fieldMappings: normalizedMappings,
        unmappedSourceFields: updatedUnmappedFields
      })
      setStep('mapping')
    } catch (err) {
      const isFileError =
        err instanceof Error &&
        (err.name === 'AbortError' ||
          /rest request failed: 40[04]/i.test(err.message) ||
          /timeout|timed out|failed to fetch/i.test(err.message))

      setError(
        isFileError
          ? 'Try to upload a file that does not contain corrupted data!'
          : err instanceof Error
            ? err.message
            : 'Unknown error occurred'
      )
    } finally {
      setIsLoading(false)
    }
  }, [file, config.targetFields])

  // Convert data
  const convertData = useCallback(
    async (mappings: FieldMapping[], enforcedFieldsJson?: string, transformFn?: (entity: ConvertedEntity) => T) => {
      if (!file) {
        setError('No file available')
        return
      }

      if (mappings.length === 0) {
        setError('No mappings available')
        return
      }

      setIsLoading(true)
      setError(null)
      setImportResult(null)
      forcedInvestmentTypeRefRef.current = undefined

      try {
        if (enforcedFieldsJson) {
          const enforced = JSON.parse(enforcedFieldsJson) as Record<string, string>
          forcedInvestmentTypeRefRef.current =
            enforced['investment.investmentTypeRef'] || enforced['investmentTypeRef'] || undefined
        }

        // Remove enforced fields from the mappings so they are not double-counted
        const enforcedKeys = enforcedFieldsJson
          ? new Set(Object.keys(JSON.parse(enforcedFieldsJson) as Record<string, string>))
          : new Set<string>()
        const filteredMappings =
          enforcedKeys.size > 0 ? mappings.filter(m => !enforcedKeys.has(m.targetField)) : mappings
        const adapters = buildTargetFieldAdapters(
          config.targetFields.map(targetField => targetField.value),
          config.domain === 'investment'
        )
        const backendMappings = toBackendMappings(filteredMappings, adapters)
        const backendMappingJson = JSON.stringify({ fieldMappings: backendMappings })
        const uiMappingJson = JSON.stringify({ fieldMappings: filteredMappings })

        let response
        let usedUiMappings = false

        try {
          response = await flowbotClient.extractFromFile(
            config.entityType,
            file,
            backendMappingJson,
            enforcedFieldsJson,
            config.domain
          )
        } catch (error) {
          if (config.domain === 'investment' && shouldRetryWithUiMappings(error)) {
            console.warn('[Import] extract-from-file targetField mismatch, retrying once with UI-prefixed mappings')
            response = await flowbotClient.extractFromFile(
              config.entityType,
              file,
              uiMappingJson,
              enforcedFieldsJson,
              config.domain
            )
            usedUiMappings = true
          } else {
            throw error
          }
        }

        const responseRecords = usedUiMappings
          ? response.records
          : restoreUiTargetFieldNames(response.records, adapters)
        const recordsWithUiFields = responseRecords as ConvertedEntity[]

        // Apply transformation function if provided (for nested structures like investments)
        const transformedEntities = transformFn ? recordsWithUiFields.map(transformFn) : (recordsWithUiFields as T[])

        // Post-process: Transform flat communication fields into communicationChannels array for contacts and accounts
        const finalEntities =
          config.entityType === 'contact' || config.entityType === 'account'
            ? transformedEntities.map(entity => transformCommunicationChannels(entity as ConvertedEntity))
            : transformedEntities

        setConvertedEntities(finalEntities as T[])
        setStep('result')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Conversion failed')
      } finally {
        setIsLoading(false)
      }
    },
    [file, config.entityType, config.domain]
  )

  // Import to backend
  const importToBackend = useCallback(async () => {
    if (convertedEntities.length === 0) {
      setError('No data to import')
      return
    }

    setIsLoading(true)
    setError(null)
    setImportResult(null)

    try {
      const ownerEmployeeId = props.userInfo?.employeeDetails?.employeeId

      // Inject ownerEmployee and optional campaignId into all entities before import
      const entitiesWithOwner = convertedEntities.map((entity: any) => {
        const normalizedEntity = normalizeEntityForImport(entity)
        const base = {
          ...normalizedEntity,
          ownerEmployee: ownerEmployeeId || entity.ownerEmployee || entity.ownerEmployeeId,
          ...(campaignId ? { salesCampaign: campaignId } : {})
        }

        // Align with createLead defaulting: ensure a status is present for leads.
        if (config.entityType === 'lead' && !base.leadStatusRef) {
          base.leadStatusRef =
            config.domain === 'investment' ? 'InvestmentLeadStatus:v1:OPEN' : 'SalesLeadStatus:v1:OPEN'
        }

        return stripEmptyValues(base)
      })

      let result: ImportResult

      const investmentPayloadKey =
        config.investmentPayloadKey ?? deriveInvestmentPayloadKeyFromEntityType(config.entityType)

      // Handle investment imports with investment payload segment keys.
      if (config.domain === 'investment' && investmentPayloadKey) {
        const defaultInvestmentGroupRef = await resolveDefaultInvestmentGroupRef()
        if (!defaultInvestmentGroupRef) {
          const derivedCode =
            config.investmentGroupCodeHint || deriveInvestmentGroupCodeFromEntityType(config.entityType)
          throw new Error(`Import failed: InvestmentGroup not found for code ${derivedCode || config.entityType}.`)
        }

        const payload = toInvestmentBatchPayload(
          entitiesWithOwner as Record<string, any>[],
          investmentPayloadKey,
          ownerEmployeeId,
          defaultInvestmentGroupRef,
          forcedInvestmentTypeRefRef.current
        )

        const response = await restClient.post('/investment-relations/createInvestments', payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        result = processInvestmentResponse(response)
      }
      // Handle standard entity imports (lead, contact, account)
      else if (config.entityType in STANDARD_ENTITY_ENDPOINTS) {
        const domainPrefix = config.domain === 'investment' ? 'investment-relations' : 'customer-relations'
        const entityPrefix = config.domain === 'investment' ? 'Investment' : ''
        const entitySuffix = STANDARD_ENTITY_ENDPOINTS[config.entityType as SupportedStandardEntityType]
        const endpoint = `/${domainPrefix}/create${entityPrefix}${entitySuffix}`
        const entityCollectionKey = getStandardEntityCollectionKey(entitySuffix, config.domain)

        const requestEntities =
          config.domain === 'investment' && config.entityType === 'contact'
            ? (entitiesWithOwner as Record<string, any>[]).map(entity =>
                toInvestmentContactPayload(entity, ownerEmployeeId)
              )
            : config.domain === 'investment' && config.entityType === 'opportunity'
              ? (entitiesWithOwner as Record<string, any>[]).map(entity =>
                  toInvestmentOpportunityPayload(entity, ownerEmployeeId)
                )
              : config.domain === 'customer' && config.entityType === 'account'
                ? (entitiesWithOwner as Record<string, any>[]).map(entity =>
                    toCustomerAccountPayload(entity, ownerEmployeeId)
                  )
                : entitiesWithOwner

        let response: any
        try {
          response = await restClient.post(
            endpoint,
            { [entityCollectionKey]: requestEntities },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
        } catch (error) {
          if (
            config.domain === 'investment' &&
            config.entityType === 'contact' &&
            shouldFallbackToSingularInvestmentContactEndpoint(error)
          ) {
            result = await submitInvestmentContactsWithFallback(restClient, accessToken, requestEntities)
            if (result.success === false) {
              setError(`Import failed: ${result.errors?.[0]?.error || 'Unknown error'}`)
              setImportResult(null)
              throw new Error(result.errors?.[0]?.error || 'Investment contact import failed')
            } else {
              setImportResult(result)
              setError(null)
            }
            return
          }
          throw error
        }

        result = processStandardEntityResponse(response, entityCollectionKey)
      } else {
        throw new Error(`Unsupported entity type: ${config.entityType}`)
      }

      // Handle result
      if (result.success === false) {
        setError(`Import failed: ${result.errors?.[0]?.error || 'Unknown error'}`)
        setImportResult(null)
        throw new Error(result.errors?.[0]?.error || 'Import failed')
      } else {
        setImportResult(result)
        setError(null)
      }
    } catch (err) {
      console.error(`Bulk create ${config.entityType}s failed:`, err)
      setError(normalizeImportError(err, config.entityType))
      setImportResult(null)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [
    convertedEntities,
    config.domain,
    config.entityType,
    config.investmentGroupCodeHint,
    config.investmentPayloadKey,
    props.userInfo,
    restClient,
    accessToken,
    campaignId,
    resolveDefaultInvestmentGroupRef
  ])

  // Download JSON
  const downloadJSON = useCallback(() => {
    const dataStr = JSON.stringify(convertedEntities, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `converted-${config.entityType}s.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [convertedEntities, config.entityType])

  // Reset
  const reset = useCallback(() => {
    setFile(null)
    setAgentResponse(null)
    setConvertedEntities([])
    setCampaignIdState('')
    setCampaignNameState('')
    setStep('upload')
    setError(null)
    setImportResult(null)
  }, [])

  return {
    file,
    agentResponse,
    convertedEntities,
    campaignId,
    campaignName,
    setCampaign,
    step,
    isLoading,
    error,
    importResult,
    handleFileChange,
    analyzeWithAgent,
    convertData,
    importToBackend,
    downloadJSON,
    reset
  }
}
