/**
 * Core entity-import hook.
 *
 * Generic orchestration of the 3-step import flow (upload → mapping →
 * result). Domain-specific behavior is delegated to an
 * `ImportSubmissionStrategy` which the caller MUST inject — CRM callers pass
 * a strategy built by `useCrmImportSubmissionStrategy`, IRM callers one
 * built by `useIrmImportSubmissionStrategy`.
 *
 * The hook itself never imports anything domain-specific and never decides
 * which strategy to use — every CRM/IRM concern flows through the injected
 * strategy.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  ImportAnalyzer,
  type ImportAnalyzerContext
} from '@/common/components/common-relations/apps/data-import/services'
import { transformCommunicationChannels } from '@/common/components/common-relations/apps/data-import/utils'
import type {
  ConvertedEntity,
  CsvQuality,
  FieldMapping,
  ImportAnalyzerResponse,
  ImportConfig,
  ImportResult,
  ImportStep,
  InvestmentCompanyOwnershipUpdate,
  InvestmentCompanyExecutiveUpdate,
  InvestmentCompanyStakeholderUpdate
} from '@/common/components/common-relations/apps/data-import/types'
import { env } from '@/common/env/EnvUtils'
import { flowbotClient } from '@/common/network/flowbot'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { toShortAlias } from '@/common/components/common-relations/apps/data-import/utils/enforcedSelectForm'
import {
  applyEnforcedSelectDefaults,
  buildTargetFieldAdapters,
  extractErrorMessage,
  extractOwnershipFromFile,
  extractWithRetry,
  normalizeEntityForImport,
  resolveInitialTargetField,
  restoreUiTargetFieldNames,
  stripEmptyValues
} from './shared'
import type { ImportSubmissionStrategy } from './types'

function mergeEnforcedFieldsJson(
  enforcedFieldsJson: string | undefined,
  investmentCompanyGroupId: string
): string | undefined {
  const base = enforcedFieldsJson ? (JSON.parse(enforcedFieldsJson) as Record<string, string>) : {}
  const merged = investmentCompanyGroupId.length > 0 ? { ...base, investmentCompanyGroupId } : base
  return Object.keys(merged).length > 0 ? JSON.stringify(merged) : undefined
}

export interface UseEntityImportReturn<T> {
  file: File | null
  agentResponse: ImportAnalyzerResponse | null
  convertedEntities: T[]
  campaignId: string
  campaignName: string
  setCampaign: (id: string | null, name?: string | null) => void
  investmentCompanyGroupId: string
  setInvestmentCompanyGroup: (id: string | null) => void
  step: ImportStep
  isLoading: boolean
  error: string | null
  importResult: ImportResult | null
  /**
   * Structural-quality stats returned by the backend's last successful
   * extraction. `null` whenever no extraction has succeeded yet, when
   * the file format is not CSV, or after `reset`.
   */
  csvQuality: CsvQuality | null
  extractionWarnings: string[]
  ownershipUpdates: InvestmentCompanyOwnershipUpdate[]
  executiveUpdates: InvestmentCompanyExecutiveUpdate[]
  stakeholderUpdates: InvestmentCompanyStakeholderUpdate[]
  ownershipFile: File | null
  ownershipExtractionWarnings: string[]
  ownershipImportResult: ImportResult | null
  createdCompaniesForOwnership: Record<string, any>[]
  sourceEntitiesForOwnership: Record<string, any>[]
  deferOwnershipSubmission: boolean
  handleFileChange: (file: File | null) => Promise<void>
  analyzeWithAgent: () => Promise<void>
  convertData: (
    mappings: FieldMapping[],
    enforcedFieldsJson?: string,
    transformFn?: (entity: ConvertedEntity) => T
  ) => Promise<void>
  /**
   * Re-run the most recent `convertData` invocation with `repair_csv=hard`,
   * forcing the backend to apply aggressive structural repair. No-op
   * when there is no previous `convertData` call to replay.
   */
  retryWithHardRepair: () => Promise<void>
  importToBackend: () => Promise<void>
  goToOwnershipStep: () => void
  skipOwnershipStep: () => void
  setOwnershipFile: (file: File | null) => void
  usePreviousFileForOwnership: () => void
  extractOwnershipFromFile: () => Promise<void>
  importOwnershipToBackend: () => Promise<void>
  downloadJSON: () => void
  reset: () => void
}

export function useEntityImport<T = ConvertedEntity>(
  props: BusinessAppContextProps,
  config: ImportConfig,
  strategy: ImportSubmissionStrategy,
  /**
   * Optional LLM-only context forwarded verbatim to Flowbot's
   * `map-from-file` endpoint. The hook never inspects or transforms it —
   * computing it (for IRM imports: `aggregateInvestmentGroupContext`)
   * is the caller's responsibility.
   */
  analyzerContext?: ImportAnalyzerContext
): UseEntityImportReturn<T> {
  const { accessToken } = props

  const [file, setFile] = useState<File | null>(null)
  const [agentResponse, setAgentResponse] = useState<ImportAnalyzerResponse | null>(null)
  const [convertedEntities, setConvertedEntities] = useState<T[]>([])
  const [campaignId, setCampaignId] = useState<string>('')
  const [campaignName, setCampaignName] = useState<string>('')
  const [investmentCompanyGroupId, setInvestmentCompanyGroupId] = useState<string>('')
  const [step, setStep] = useState<ImportStep>('upload')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [csvQuality, setCsvQuality] = useState<CsvQuality | null>(null)
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([])
  const [ownershipUpdates, setOwnershipUpdates] = useState<InvestmentCompanyOwnershipUpdate[]>([])
  const [executiveUpdates, setExecutiveUpdates] = useState<InvestmentCompanyExecutiveUpdate[]>([])
  const [stakeholderUpdates, setStakeholderUpdates] = useState<InvestmentCompanyStakeholderUpdate[]>([])
  const [ownershipFile, setOwnershipFile] = useState<File | null>(null)
  const [ownershipExtractionWarnings, setOwnershipExtractionWarnings] = useState<string[]>([])
  const [ownershipImportResult, setOwnershipImportResult] = useState<ImportResult | null>(null)
  const [createdCompaniesForOwnership, setCreatedCompaniesForOwnership] = useState<Record<string, any>[]>([])
  const [sourceEntitiesForOwnership, setSourceEntitiesForOwnership] = useState<Record<string, any>[]>([])

  const deferOwnershipSubmission = Boolean(config.deferOwnershipSubmission)

  // Snapshot of the last `convertData` arguments so `retryWithHardRepair`
  // can replay the call without making the user re-pick mappings.
  const lastConvertArgsRef = useRef<{
    mappings: FieldMapping[]
    enforcedFieldsJson?: string
    transformFn?: (entity: ConvertedEntity) => T
  } | null>(null)

  const setCampaign = useCallback((id: string | null, name?: string | null) => {
    setCampaignId(id || '')
    setCampaignName(name || '')
  }, [])

  const setInvestmentCompanyGroup = useCallback((id: string | null) => {
    setInvestmentCompanyGroupId(id || '')
  }, [])

  const aiServiceRef = useRef<ImportAnalyzer | null>(null)

  useEffect(() => {
    if (accessToken) {
      aiServiceRef.current = new ImportAnalyzer(
        accessToken,
        config.flowbotEntityType ?? config.entityType,
        config.domain
      )
      flowbotClient.setAccessToken(accessToken)
    }
  }, [accessToken, config.entityType, config.flowbotEntityType, config.domain])

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const graphQLClient = useGraphQLClient(accessToken)

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
      const agentResult = await aiServiceRef.current.analyzeImport(file, analyzerContext)
      const targetFieldValues = config.targetFields.map(f => f.value)
      const adapters = buildTargetFieldAdapters(targetFieldValues, config.domain === 'investment')
      const resolvedMappings = agentResult.fieldMappings.map(mapping => ({
        ...mapping,
        targetField: resolveInitialTargetField(mapping.targetField, adapters)
      }))

      const targetFieldByValue = new Map(config.targetFields.map(f => [f.value, f] as const))
      const normalizedMappings = resolvedMappings.map(mapping => {
        const targetField = targetFieldByValue.get(mapping.targetField)
        if (!targetField) {
          return {
            ...mapping,
            transformationType: 'direct' as const,
            catalogIdentifier: undefined
          }
        }
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

      setAgentResponse({
        ...agentResult,
        fieldMappings: normalizedMappings,
        unmappedSourceFields: agentResult.unmappedSourceFields
      })
      setStep('mapping')
    } catch (err) {
      const isFileError =
        err instanceof Error &&
        (err.name === 'AbortError' ||
          /rest request failed: 40[04]/i.test(err.message) ||
          /timeout|timed out|failed to fetch/i.test(err.message))

      if (isFileError) {
        setError('Try to upload a file that does not contain corrupted data!')
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }, [file, config.targetFields, config.domain, analyzerContext])

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

      const resolvedEnforcedFieldsJson = mergeEnforcedFieldsJson(enforcedFieldsJson, investmentCompanyGroupId)
      lastConvertArgsRef.current = { mappings, enforcedFieldsJson, transformFn }

      setIsLoading(true)
      setError(null)
      setImportResult(null)
      setCsvQuality(null)
      setOwnershipUpdates([])

      try {
        const enforcedKeys = resolvedEnforcedFieldsJson
          ? new Set(Object.keys(JSON.parse(resolvedEnforcedFieldsJson) as Record<string, string>))
          : new Set<string>()
        const filteredMappings =
          enforcedKeys.size > 0 ? mappings.filter(m => !enforcedKeys.has(toShortAlias(m.targetField))) : mappings

        const adapters = buildTargetFieldAdapters(
          config.targetFields.map(targetField => targetField.value),
          config.domain === 'investment'
        )

        const {
          records,
          usedUiMappings,
          csvQuality: extractedCsvQuality,
          warnings: backendWarnings,
          ownershipUpdates: extractedOwnershipUpdates,
          executiveUpdates: extractedExecutiveUpdates,
          stakeholderUpdates: extractedStakeholderUpdates
        } = await extractWithRetry(
          file,
          config,
          filteredMappings,
          resolvedEnforcedFieldsJson,
          adapters,
          'auto',
          analyzerContext?.requiredSubtypeKey,
          analyzerContext?.additionalPropertiesFields,
          analyzerContext?.tileFieldKeys,
          analyzerContext?.additionalPropertiesFieldTypes
        )

        const responseRecords = usedUiMappings ? records : restoreUiTargetFieldNames(records, adapters)

        // Strategy-driven post-processing (e.g. IRM flattens the hybrid
        // response shape into dotted top-level keys).
        const processedRecords = strategy.postProcessExtractedRecords?.(responseRecords) ?? responseRecords

        const recordsWithUiFields = processedRecords as ConvertedEntity[]
        const transformedEntities = transformFn ? recordsWithUiFields.map(transformFn) : (recordsWithUiFields as T[])

        const finalEntities =
          config.entityType === 'contact' || config.entityType === 'account'
            ? transformedEntities.map(entity => transformCommunicationChannels(entity as ConvertedEntity))
            : transformedEntities

        setConvertedEntities(finalEntities as T[])
        setCsvQuality(extractedCsvQuality)
        setExtractionWarnings(backendWarnings)
        if (deferOwnershipSubmission) {
          setOwnershipUpdates([])
        } else {
          setOwnershipUpdates(extractedOwnershipUpdates)
        }
        setExecutiveUpdates(extractedExecutiveUpdates)
        setStakeholderUpdates(extractedStakeholderUpdates)
        setStep('result')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Conversion failed')
      } finally {
        setIsLoading(false)
      }
    },
    [file, config, strategy, analyzerContext, investmentCompanyGroupId, deferOwnershipSubmission]
  )

  const retryWithHardRepair = useCallback(async () => {
    const args = lastConvertArgsRef.current
    if (!file || !args) {
      setError('No previous conversion to retry')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { mappings, enforcedFieldsJson, transformFn } = args
      const resolvedEnforcedFieldsJson = mergeEnforcedFieldsJson(enforcedFieldsJson, investmentCompanyGroupId)

      const enforcedKeys = resolvedEnforcedFieldsJson
        ? new Set(Object.keys(JSON.parse(resolvedEnforcedFieldsJson) as Record<string, string>))
        : new Set<string>()
      const filteredMappings =
        enforcedKeys.size > 0 ? mappings.filter(m => !enforcedKeys.has(toShortAlias(m.targetField))) : mappings

      const adapters = buildTargetFieldAdapters(
        config.targetFields.map(targetField => targetField.value),
        config.domain === 'investment'
      )

      const {
        records,
        usedUiMappings,
        csvQuality: repairedCsvQuality,
        warnings: backendWarnings,
        ownershipUpdates: repairedOwnershipUpdates,
        executiveUpdates: repairedExecutiveUpdates,
        stakeholderUpdates: repairedStakeholderUpdates
      } = await extractWithRetry(
        file,
        config,
        filteredMappings,
        resolvedEnforcedFieldsJson,
        adapters,
        'hard',
        analyzerContext?.requiredSubtypeKey,
        analyzerContext?.additionalPropertiesFields,
        analyzerContext?.tileFieldKeys,
        analyzerContext?.additionalPropertiesFieldTypes
      )

      const responseRecords = usedUiMappings ? records : restoreUiTargetFieldNames(records, adapters)
      const processedRecords = strategy.postProcessExtractedRecords?.(responseRecords) ?? responseRecords
      const recordsWithUiFields = processedRecords as ConvertedEntity[]
      const transformedEntities = transformFn ? recordsWithUiFields.map(transformFn) : (recordsWithUiFields as T[])

      const finalEntities =
        config.entityType === 'contact' || config.entityType === 'account'
          ? transformedEntities.map(entity => transformCommunicationChannels(entity as ConvertedEntity))
          : transformedEntities

      setConvertedEntities(finalEntities as T[])
      setCsvQuality(repairedCsvQuality)
      setExtractionWarnings(backendWarnings)
      if (deferOwnershipSubmission) {
        setOwnershipUpdates([])
      } else {
        setOwnershipUpdates(repairedOwnershipUpdates)
      }
      setExecutiveUpdates(repairedExecutiveUpdates)
      setStakeholderUpdates(repairedStakeholderUpdates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hard repair failed')
    } finally {
      setIsLoading(false)
    }
  }, [file, config, strategy, analyzerContext, investmentCompanyGroupId, deferOwnershipSubmission])

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

      const preparedEntities = (convertedEntities as unknown as Record<string, any>[]).map(entity => {
        const normalized = normalizeEntityForImport(entity)
        const withOwnerAndCampaign = {
          ...normalized,
          // Prefer a per-row owner already resolved by Flowbot (e.g. from an
          // "Owned By" column) over the current importer's employee id; the
          // importer is only used as a fallback when the row didn't specify
          // one. `resolveOwnerEmployeeId` enforces the same precedence
          // downstream in each IRM payload builder.
          ownerEmployee: entity.ownerEmployee || entity.ownerEmployeeId || ownerEmployeeId,
          ...(campaignId ? { salesCampaign: campaignId } : {}),
          ...(investmentCompanyGroupId ? { investmentCompanyGroupId } : {})
        }
        const withEnforcedDefaults = applyEnforcedSelectDefaults(withOwnerAndCampaign, config.enforcedSelects)
        const domainPrepared = strategy.prepareEntityForSubmission
          ? strategy.prepareEntityForSubmission(withEnforcedDefaults)
          : withEnforcedDefaults
        return stripEmptyValues(domainPrepared)
      }) as Record<string, any>[]

      const result = await strategy.submit(preparedEntities, {
        restClient,
        graphQLClient,
        accessToken,
        ownerEmployeeId,
        config,
        ownershipUpdates: deferOwnershipSubmission ? [] : ownershipUpdates,
        executiveUpdates,
        stakeholderUpdates,
        deferOwnershipSubmission
      })

      if (result.success === false) {
        setError(`Import failed: ${result.errors?.[0]?.error || 'Unknown error'}`)
        setImportResult(null)
        throw new Error(result.errors?.[0]?.error || 'Import failed')
      }

      setImportResult(result)
      if (deferOwnershipSubmission) {
        const createdCompanies =
          result.createdEntities ??
          (result.createdIds ?? []).map((id, index) => ({
            id,
            name: preparedEntities[index]?.name
          }))
        setCreatedCompaniesForOwnership(createdCompanies)
        setSourceEntitiesForOwnership(preparedEntities)
      }
      setError(null)
    } catch (err) {
      console.error(`Bulk create ${config.entityType}s failed:`, err)
      const friendlyMessage = strategy.normalizeError?.(err) ?? extractErrorMessage(err)
      setError(friendlyMessage)
      setImportResult(null)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [
    convertedEntities,
    config,
    props.userInfo,
    restClient,
    graphQLClient,
    accessToken,
    campaignId,
    strategy,
    ownershipUpdates,
    executiveUpdates,
    stakeholderUpdates,
    deferOwnershipSubmission
  ])

  const goToOwnershipStep = useCallback(() => {
    setStep('ownership')
    setOwnershipImportResult(null)
    setOwnershipExtractionWarnings([])
    setOwnershipUpdates([])
    setOwnershipFile(null)
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setFile(null)
    setAgentResponse(null)
    setConvertedEntities([])
    setCampaignId('')
    setCampaignName('')
    setInvestmentCompanyGroupId('')
    setStep('upload')
    setError(null)
    setImportResult(null)
    setCsvQuality(null)
    setExtractionWarnings([])
    setOwnershipUpdates([])
    setExecutiveUpdates([])
    setStakeholderUpdates([])
    setOwnershipFile(null)
    setOwnershipExtractionWarnings([])
    setOwnershipImportResult(null)
    setCreatedCompaniesForOwnership([])
    setSourceEntitiesForOwnership([])
    lastConvertArgsRef.current = null
  }, [])

  const skipOwnershipStep = useCallback(() => {
    reset()
  }, [reset])

  const handleOwnershipFileChange = useCallback((selectedFile: File | null) => {
    setOwnershipFile(selectedFile)
    setOwnershipUpdates([])
    setOwnershipExtractionWarnings([])
    setOwnershipImportResult(null)
    setError(null)
  }, [])

  const usePreviousFileForOwnership = useCallback(() => {
    if (!file) {
      setError('No file available from Step 1')
      return
    }
    handleOwnershipFileChange(file)
  }, [file, handleOwnershipFileChange])

  const extractOwnershipFromFileAction = useCallback(async () => {
    if (!ownershipFile) {
      setError('Please upload an ownership file first')
      return
    }

    setIsLoading(true)
    setError(null)
    setOwnershipImportResult(null)

    try {
      const { ownershipUpdates: extractedOwnershipUpdates, warnings } = await extractOwnershipFromFile(
        ownershipFile,
        config
      )
      setOwnershipUpdates(extractedOwnershipUpdates)
      setOwnershipExtractionWarnings(warnings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ownership extraction failed')
    } finally {
      setIsLoading(false)
    }
  }, [ownershipFile, config])

  const importOwnershipToBackend = useCallback(async () => {
    if (!strategy.submitOwnership) {
      setError('Ownership import is not supported for this entity type')
      return
    }

    if (ownershipUpdates.length === 0) {
      setError('No ownership relationships to import')
      return
    }

    setIsLoading(true)
    setError(null)
    setOwnershipImportResult(null)

    try {
      const result = await strategy.submitOwnership(ownershipUpdates, {
        restClient,
        graphQLClient,
        accessToken,
        ownerEmployeeId: props.userInfo?.employeeDetails?.employeeId,
        config,
        createdCompaniesForOwnership,
        sourceEntitiesForOwnership,
        deferOwnershipSubmission: true
      })

      if (result.success === false) {
        setError('Ownership import failed')
        setOwnershipImportResult(result)
        throw new Error('Ownership import failed')
      }

      setOwnershipImportResult(result)
      setError(null)
    } catch (err) {
      const friendlyMessage = strategy.normalizeError?.(err) ?? extractErrorMessage(err)
      setError(friendlyMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [
    strategy,
    ownershipUpdates,
    restClient,
    graphQLClient,
    accessToken,
    props.userInfo,
    config,
    createdCompaniesForOwnership,
    sourceEntitiesForOwnership
  ])

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

  return {
    file,
    agentResponse,
    convertedEntities,
    campaignId,
    campaignName,
    setCampaign,
    investmentCompanyGroupId,
    setInvestmentCompanyGroup,
    step,
    isLoading,
    error,
    importResult,
    csvQuality,
    extractionWarnings,
    ownershipUpdates,
    executiveUpdates,
    stakeholderUpdates,
    ownershipFile,
    ownershipExtractionWarnings,
    ownershipImportResult,
    createdCompaniesForOwnership,
    sourceEntitiesForOwnership,
    deferOwnershipSubmission,
    handleFileChange,
    analyzeWithAgent,
    convertData,
    retryWithHardRepair,
    importToBackend,
    goToOwnershipStep,
    skipOwnershipStep,
    setOwnershipFile: handleOwnershipFileChange,
    usePreviousFileForOwnership,
    extractOwnershipFromFile: extractOwnershipFromFileAction,
    importOwnershipToBackend,
    downloadJSON,
    reset
  }
}
