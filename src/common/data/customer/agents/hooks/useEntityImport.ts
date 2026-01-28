/**
 * Entity Import Hook (Generic)
 * Main orchestration hook for entity import flow
 * Works with any entity type (Lead, Contact, Account, etc.)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCsvParser, useCatalogLookup } from '@/common/data/customer/agents/hooks'
import { ImportAnalyzer, ImportApiService } from '@/common/data/customer/agents/services'
import { convertParsedDataToEntities } from '@/common/data/customer/agents/utils'
import {
  ParsedRow,
  FieldMapping,
  ImportAnalyzerResponse,
  ImportStep,
  ImportConfig,
  ConvertedEntity,
  ImportResult
} from '@/common/data/customer/agents/types'
import { env } from '@/common/env/EnvUtils'

export interface UseEntityImportReturn<T extends ConvertedEntity> {
  // File state
  file: File | null
  csvText: string
  parsedData: ParsedRow[]

  // Analysis state
  agentResponse: ImportAnalyzerResponse | null

  // Conversion state
  convertedEntities: T[]

  // UI state
  step: ImportStep
  isLoading: boolean
  error: string | null
  importResult: ImportResult | null

  // Handlers
  handleFileChange: (file: File | null) => Promise<void>
  analyzeWithAgent: () => Promise<void>
  convertData: (mappings: FieldMapping[]) => void
  importToBackend: () => Promise<void>
  downloadJSON: () => void
  reset: () => void

  // Catalog lookup
  lookupCatalogEntry: (catalogIdentifier: string, searchValue: string) => string | null
  isLoadingCatalogs: boolean
}

// Helper function to get required catalog identifiers from config
function getRequiredCatalogIdentifiers(config: ImportConfig): string[] {
  return config.targetFields.filter(field => field.type === 'catalog' && field.catalog).map(field => field.catalog!)
}

export function useEntityImport<T extends ConvertedEntity>(
  props: BusinessAppContextProps,
  config: ImportConfig
): UseEntityImportReturn<T> {
  const { accessToken } = props

  // State
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState<string>('')
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [agentResponse, setAgentResponse] = useState<ImportAnalyzerResponse | null>(null)
  const [convertedEntities, setConvertedEntities] = useState<T[]>([])
  const [step, setStep] = useState<ImportStep>('upload')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Services
  const aiServiceRef = useRef<ImportAnalyzer | null>(null)
  const apiServiceRef = useRef<ImportApiService | null>(null)

  // Initialize services
  useEffect(() => {
    if (accessToken) {
      aiServiceRef.current = new ImportAnalyzer(accessToken, config.aiAgentName)
      const baseUrl = env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') || ''
      apiServiceRef.current = new ImportApiService(baseUrl, accessToken)
    }
  }, [accessToken, config.aiAgentName])

  // Hooks
  const { parseCSVFile } = useCsvParser()
  const catalogIdentifiers = useMemo(() => getRequiredCatalogIdentifiers(config), [config])
  const { lookupCatalogEntry, isLoadingCatalogs } = useCatalogLookup({
    accessToken,
    catalogIdentifiers
  })

  // Handle file change
  const handleFileChange = useCallback(async (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null)
      setCsvText('')
      setParsedData([])
      setError(null)
      return
    }

    setFile(selectedFile)
    setError(null)

    try {
      // Read file content
      const text = await selectedFile.text()
      setCsvText(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
    }
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
      // Parse CSV to get data (for display)
      if (csvText) {
        const parsed = await parseCSVFile(file)
        setParsedData(parsed)
      }

      // Call AI service with file
      const agentResult = await aiServiceRef.current.analyzeImport(file)

      // Validate mappings - filter out invalid target fields
      const validTargetFields = new Set(config.targetFields.map(f => f.value))
      const validMappings = agentResult.fieldMappings.filter(mapping => {
        const isValid = validTargetFields.has(mapping.targetField)
        if (!isValid) {
          console.warn(
            `Removing invalid mapping: ${mapping.sourceField} → ${mapping.targetField} (target field not in schema)`
          )
        }
        return isValid
      })

      // Update unmapped fields to include the invalid mappings
      const invalidSourceFields = agentResult.fieldMappings
        .filter(m => !validTargetFields.has(m.targetField))
        .map(m => m.sourceField)

      const updatedUnmappedFields = [...new Set([...agentResult.unmappedSourceFields, ...invalidSourceFields])]

      setAgentResponse({
        ...agentResult,
        fieldMappings: validMappings,
        unmappedSourceFields: updatedUnmappedFields
      })
      setStep('mapping')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [file, csvText, parseCSVFile, config.targetFields])

  // Convert data
  const convertData = useCallback(
    (mappings: FieldMapping[]) => {
      if (parsedData.length === 0 || mappings.length === 0) {
        setError('No data or mappings available')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const converted = convertParsedDataToEntities(parsedData, mappings, lookupCatalogEntry) as T[]

        setConvertedEntities(converted)
        setStep('result')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Conversion failed')
      } finally {
        setIsLoading(false)
      }
    },
    [parsedData, lookupCatalogEntry]
  )

  // Import to backend
  const importToBackend = useCallback(async () => {
    if (!apiServiceRef.current) {
      setError('API service not initialized')
      return
    }

    if (convertedEntities.length === 0) {
      setError('No data to import')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get employee ID from user info
      const ownerEmployeeId = props.userInfo?.employeeDetails?.employeeId

      // Inject ownerEmployee into all entities before import
      // Note: Backend expects 'ownerEmployee' field, not 'ownerEmployeeId'
      const entitiesWithOwner = convertedEntities.map(entity => ({
        ...entity,
        ownerEmployee: ownerEmployeeId || entity.ownerEmployee || entity.ownerEmployeeId // Preserve existing if already set
      }))

      const result = await apiServiceRef.current.bulkCreateEntities(config.entityType, entitiesWithOwner)

      if (result.success === false) {
        setError(`Import failed: ${result.errors?.[0]?.error || 'Unknown error'}`)
        setImportResult(null)
      } else {
        // Success - store result and clear any errors
        setImportResult(result)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setImportResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [convertedEntities, config.entityType, props.userInfo])

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
    setCsvText('')
    setParsedData([])
    setAgentResponse(null)
    setConvertedEntities([])
    setStep('upload')
    setError(null)
    setImportResult(null)
  }, [])

  return {
    file,
    csvText,
    parsedData,
    agentResponse,
    convertedEntities,
    step,
    isLoading,
    error,
    importResult,
    handleFileChange,
    analyzeWithAgent,
    convertData,
    importToBackend,
    downloadJSON,
    reset,
    lookupCatalogEntry,
    isLoadingCatalogs
  }
}
