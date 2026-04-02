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
import { flowbotClient } from '@/common/network/flowbot'

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

// Entity type configuration maps
const INVESTMENT_TYPE_MAP = {
  'real-estate-investment': 'realEstateInvestment',
  'equity-investment': 'equityInvestment',
  'liquid-fund-investment': 'liquidFundInvestment'
} as const

const STANDARD_ENTITY_ENDPOINTS = {
  lead: 'Leads',
  contact: 'Contacts',
  account: 'Accounts',
  opportunity: 'Opportunities'
} as const

// Investment entity types whose targetField must have the object prefix stripped
// before sending to /extract-from-file. The backend schema for each sub-type
// expects leaf field names (e.g. "buildingYear"), not the FE prefixed form
// (e.g. "realEstateInvestment.buildingYear").
const INVESTMENT_ENTITY_TYPES = new Set([
  'investment',
  'real-estate-investment',
  'equity-investment',
  'liquid-fund-investment'
])

const INVESTMENT_FIELD_PREFIXES = ['investment.', 'realEstateInvestment.', 'equityInvestment.', 'liquidFundInvestment.']

function normalizeTargetFieldForFlowbot(targetField: string, entityType: string): string {
  if (!INVESTMENT_ENTITY_TYPES.has(entityType)) return targetField
  for (const prefix of INVESTMENT_FIELD_PREFIXES) {
    if (targetField.startsWith(prefix)) {
      return targetField.slice(prefix.length)
    }
  }
  return targetField
}

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

// Helper function to build investment payload
function buildInvestmentPayload(
  entities: any[],
  investmentType: 'realEstateInvestment' | 'equityInvestment' | 'liquidFundInvestment',
  ownerEmployeeId?: string
) {
  return {
    investments: entities.map((entity: any) => {
      const { investment, [investmentType]: specificInvestment } = entity
      return {
        investmentRequest: {
          investment: {
            ...investment,
            ownerEmployee: ownerEmployeeId
          },
          [investmentType]: specificInvestment
        }
      }
    })
  }
}

// Helper function to process investment API response
function processInvestmentResponse(response: any): ImportResult {
  const hasErrors = response.validationResponse?.errors?.length > 0
  const createdInvestments = response.investments || []

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

  // Map internal ImportConfig domain to the Flowbot API domain param
  const flowbotDomain: 'crm' | 'irm' | undefined = config.domain === 'investment' ? 'irm' : undefined

  const aiServiceRef = useRef<ImportAnalyzer | null>(null)

  useEffect(() => {
    if (accessToken) {
      aiServiceRef.current = new ImportAnalyzer(accessToken, config.entityType, flowbotDomain)
      flowbotClient.setAccessToken(accessToken)
    }
  }, [accessToken, config.entityType, flowbotDomain])

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const handleFileChange = useCallback(async (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null)
      setError(null)
      return
    }

    setFile(selectedFile)
    setError(null)
  }, [])

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

      // map-from-file returns unprefixed leaf names (e.g. "buildingYear") for investment
      // entities, but the FE config uses prefixed values (e.g. "realEstateInvestment.buildingYear")
      // so the transform functions can reconstruct the nested structure. Build a reverse map
      // from the last path segment to the full config value and expand before validation.
      const shortToFullTargetField = new Map<string, string>()
      config.targetFields.forEach(f => {
        const lastPart = f.value.includes('.') ? f.value.split('.').pop()! : f.value
        if (!shortToFullTargetField.has(lastPart)) {
          shortToFullTargetField.set(lastPart, f.value)
        }
      })

      const expandedMappings = agentResult.fieldMappings.map(mapping => {
        if (!config.targetFields.some(f => f.value === mapping.targetField)) {
          const expanded = shortToFullTargetField.get(mapping.targetField)
          if (expanded) return { ...mapping, targetField: expanded }
        }
        return mapping
      })

      const validTargetFields = new Set(config.targetFields.map(f => f.value))
      const validMappings = expandedMappings.filter(mapping => {
        const isValid = validTargetFields.has(mapping.targetField)
        if (!isValid) {
          console.warn(
            `Removing invalid mapping: ${mapping.sourceField} → ${mapping.targetField} (target field not in schema)`
          )
        }
        return isValid
      })

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

      const invalidSourceFields = expandedMappings
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

      try {
        const enforcedKeys = enforcedFieldsJson
          ? new Set(Object.keys(JSON.parse(enforcedFieldsJson) as Record<string, string>))
          : new Set<string>()
        const filteredMappings =
          enforcedKeys.size > 0 ? mappings.filter(m => !enforcedKeys.has(m.targetField)) : mappings

        // extract-from-file expects leaf field names without the object prefix
        // (e.g. "buildingYear" not "realEstateInvestment.buildingYear").
        const normalizedMappings = filteredMappings.map(m => ({
          ...m,
          targetField: normalizeTargetFieldForFlowbot(m.targetField, config.entityType)
        }))

        const mappingJson = JSON.stringify({ fieldMappings: normalizedMappings })

        const response = await flowbotClient.extractFromFile(
          config.entityType,
          file,
          mappingJson,
          enforcedFieldsJson,
          flowbotDomain
        )

        const transformedEntities = transformFn ? response.records.map(transformFn) : (response.records as T[])

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
    [file, config.entityType, flowbotDomain]
  )

  const importToBackend = useCallback(async () => {
    if (convertedEntities.length === 0) {
      setError('No data to import')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const ownerEmployeeId = props.userInfo?.employeeDetails?.employeeId

      const entitiesWithOwner = convertedEntities.map((entity: any) => {
        const base = {
          ...entity,
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

      if (config.entityType in INVESTMENT_TYPE_MAP) {
        const investmentType = INVESTMENT_TYPE_MAP[config.entityType as keyof typeof INVESTMENT_TYPE_MAP]
        const payload = buildInvestmentPayload(entitiesWithOwner, investmentType, ownerEmployeeId)

        const response = await restClient.post('/investment-relations/createInvestments', payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        result = processInvestmentResponse(response)
      } else if (config.entityType in STANDARD_ENTITY_ENDPOINTS) {
        const domainPrefix = config.domain === 'investment' ? 'investment-relations' : 'customer-relations'
        const entityPrefix = config.domain === 'investment' ? 'Investment' : ''
        const entitySuffix = STANDARD_ENTITY_ENDPOINTS[config.entityType as keyof typeof STANDARD_ENTITY_ENDPOINTS]
        const endpoint = `/${domainPrefix}/create${entityPrefix}${entitySuffix}`
        const entityTypePlural = entitySuffix.toLowerCase()

        const response = await restClient.post(
          endpoint,
          { [entityTypePlural]: entitiesWithOwner },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        result = processStandardEntityResponse(response, entityTypePlural)
      } else {
        throw new Error(`Unsupported entity type: ${config.entityType}`)
      }

      if (result.success === false) {
        setError(`Import failed: ${result.errors?.[0]?.error || 'Unknown error'}`)
        setImportResult(null)
      } else {
        setImportResult(result)
        setError(null)
      }
    } catch (err) {
      console.error(`Bulk create ${config.entityType}s failed:`, err)
      setError(err instanceof Error ? err.message : 'Import failed')
      setImportResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [convertedEntities, config.entityType, config.domain, props.userInfo, restClient, accessToken, campaignId])

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
