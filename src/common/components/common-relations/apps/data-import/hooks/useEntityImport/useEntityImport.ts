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
  ImportStep
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
  extractWithRetry,
  normalizeEntityForImport,
  resolveInitialTargetField,
  restoreUiTargetFieldNames,
  stripEmptyValues
} from './shared'
import type { ImportSubmissionStrategy } from './types'

export interface UseEntityImportReturn<T> {
  file: File | null
  agentResponse: ImportAnalyzerResponse | null
  convertedEntities: T[]
  campaignId: string
  campaignName: string
  setCampaign: (id: string | null, name?: string | null) => void
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
  const [step, setStep] = useState<ImportStep>('upload')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [csvQuality, setCsvQuality] = useState<CsvQuality | null>(null)
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([])

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

      lastConvertArgsRef.current = { mappings, enforcedFieldsJson, transformFn }

      setIsLoading(true)
      setError(null)
      setImportResult(null)
      setCsvQuality(null)

      try {
        const enforcedKeys = enforcedFieldsJson
          ? new Set(Object.keys(JSON.parse(enforcedFieldsJson) as Record<string, string>))
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
          warnings: backendWarnings
        } = await extractWithRetry(
          file,
          config,
          filteredMappings,
          enforcedFieldsJson,
          adapters,
          'auto',
          analyzerContext?.requiredSubtypeKey,
          analyzerContext?.additionalPropertiesFields
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
        setStep('result')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Conversion failed')
      } finally {
        setIsLoading(false)
      }
    },
    [file, config, strategy, analyzerContext]
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

      const enforcedKeys = enforcedFieldsJson
        ? new Set(Object.keys(JSON.parse(enforcedFieldsJson) as Record<string, string>))
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
        warnings: backendWarnings
      } = await extractWithRetry(
        file,
        config,
        filteredMappings,
        enforcedFieldsJson,
        adapters,
        'hard',
        analyzerContext?.requiredSubtypeKey,
        analyzerContext?.additionalPropertiesFields
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hard repair failed')
    } finally {
      setIsLoading(false)
    }
  }, [file, config, strategy, analyzerContext])

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
          ownerEmployee: ownerEmployeeId || entity.ownerEmployee || entity.ownerEmployeeId,
          ...(campaignId ? { salesCampaign: campaignId } : {})
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
        config
      })

      if (result.success === false) {
        setError(`Import failed: ${result.errors?.[0]?.error || 'Unknown error'}`)
        setImportResult(null)
        throw new Error(result.errors?.[0]?.error || 'Import failed')
      }

      setImportResult(result)
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
  }, [convertedEntities, config, props.userInfo, restClient, graphQLClient, accessToken, campaignId, strategy])

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
    setCampaignId('')
    setCampaignName('')
    setStep('upload')
    setError(null)
    setImportResult(null)
    setCsvQuality(null)
    setExtractionWarnings([])
    lastConvertArgsRef.current = null
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
    csvQuality,
    extractionWarnings,
    handleFileChange,
    analyzeWithAgent,
    convertData,
    retryWithHardRepair,
    importToBackend,
    downloadJSON,
    reset
  }
}
