import { useCallback, useState, useMemo, useRef } from 'react'
import { env } from '@/common/env/EnvUtils'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

/**
 * Types for calculation trace data
 */
export interface CalculationStep {
  stepId: string
  stepOrder: number
  category: StepCategory
  stepName: string
  description: string
  sourceService: string
  sourceMethod: string
  timestamp: string
  durationMs?: number
  inputs: Record<string, any>
  outputs: Record<string, any>
  formula?: string
  calculatedValue?: number
  success: boolean
  errorMessage?: string
  warningMessage?: string
  relatedEntityId?: string
  relatedEntityType?: string
  subSteps?: CalculationStep[]
}

export type StepCategory =
  | 'RULE_LOOKUP'
  | 'RULE_MATCH'
  | 'DATA_FETCH'
  | 'TRAVEL_BREAKDOWN'
  | 'ALLOWANCE_PERIOD'
  | 'ALLOWANCE_CODE'
  | 'AMOUNT_CALCULATION'
  | 'DEDUCTION'
  | 'MILEAGE'
  | 'AGGREGATION'
  | 'VALIDATION'
  | 'COUNTRY_RULE'
  | 'DMN_DECISION'
  | 'STATUS_CHANGE'
  | 'ERROR'
  | 'WARNING'

export interface RuleInfo {
  ruleId: string
  ruleName: string
  ruleCode: string
  countryRef?: string
  calculationType?: string
  useLastCountry: boolean
  deductionLimit: boolean
  useSingleCurrency: boolean
  currencyRef?: string
  activeFrom?: string
  activeTo?: string
}

export interface CalculationSummary {
  totalSteps: number
  successfulSteps: number
  failedSteps: number
  warningSteps: number
  totalAllowance?: number
  totalDeductions?: number
  totalMileage?: number
  totalExpense?: number
  totalReimbursable?: number
  totalNonReimbursable?: number
  travelDays: number
  travelHours: number
  calculationMethod: string
  homeCountry: string
  hasAbroad: boolean
}

export interface CalculationTrace {
  traceId: string
  calculationType: string
  entityId: string
  entityType: string
  employeeId: string
  startTime: string
  endTime?: string
  totalDurationMs?: number
  status: 'IN_PROGRESS' | 'COMPLETED' | 'COMPLETED_WITH_WARNINGS' | 'FAILED'
  steps: CalculationStep[]
  summary?: CalculationSummary
  contextData: Record<string, any>
  finalAmounts: Record<string, number>
  errors: string[]
  warnings: string[]
  appliedRule?: RuleInfo
}

export interface RequestAnalysis {
  request: {
    id: string
    code: string
    status: string
    totalAmount: number
    totalAmountAllowance: number
    totalAmountMileage: number
    totalAmountExpense: number
    employeeId: string
  }
  trips: Array<{
    id: string
    point: string
    address?: string
    pointType: string
    tripDateTime: string
    countryRef: string
    countryName?: string
    travelRegionRef: string
    travelRegionName?: string
    tripOrder: number
  }>
  appliedRule?: {
    id: string
    name: string
    code: string
    countryRef: string
    countryName?: string
    calculationType: string
    calculationTypeName?: string
    useLastCountry: boolean
    deductionLimit: boolean
  }
  ruleError?: string
  calculationTrace: CalculationTrace
}

interface UseCalculationTraceReturn {
  traces: CalculationTrace[]
  currentTrace: CalculationTrace | null
  analysis: RequestAnalysis | null
  loading: boolean
  error: string | null
  fetchTraces: () => Promise<void>
  fetchTrace: (traceId: string) => Promise<void>
  fetchTracesForRequest: (requestId: string) => Promise<void>
  fetchTracesForPlan: (planId: string) => Promise<void>
  triggerTraceForRequest: (requestId: string) => Promise<void>
  triggerTraceForPlan: (planId: string) => Promise<void>
  analyzeRequest: (requestId: string) => Promise<void>
  debugRuleAssignment: (employeeId: string, date: Date) => Promise<void>
  compareTraces: (traceId1: string, traceId2: string) => Promise<any>
  clearTraces: () => void
}

/**
 * Parse a catalog ref string like "Country:v1:DE" into its components
 */
function parseCatalogRef(ref: string): { catalogIdentifier: string; version: string; code: string } | null {
  if (!ref) return null
  const parts = ref.split(':')
  if (parts.length >= 3) {
    return {
      catalogIdentifier: parts[0],
      version: parts[1],
      code: parts.slice(2).join(':') // Handle codes with colons
    }
  }
  return null
}

/**
 * Get localized value from catalog entry
 */
function getLocalizedValue(entry: any): string {
  const locale = ((window as any)?.lowcoder?.i18n?.selectedLocale || 'en-US').toLowerCase()

  if (Array.isArray(entry.translations)) {
    const translation = entry.translations.find((t: any) => t?.localeCode?.toLowerCase() === locale)
    if (translation?.value) {
      return translation.value
    }
  }

  return entry.value || entry.code || ''
}

/**
 * Hook for interacting with the calculation debug API
 */
export function useCalculationTrace(accessToken: string): UseCalculationTraceReturn {
  const [traces, setTraces] = useState<CalculationTrace[]>([])
  const [currentTrace, setCurrentTrace] = useState<CalculationTrace | null>(null)
  const [analysis, setAnalysis] = useState<RequestAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Catalog client for resolving refs to display names
  const catalogClient = useCatalogManagerClient(accessToken)

  // Cache for resolved ref strings (ref -> display name)
  const resolvedRefCache = useRef<Map<string, string>>(new Map())

  // Cache for loaded catalogs (catalogKey -> Map<code, entry>)
  const catalogEntriesCache = useRef<Map<string, Map<string, any>>>(new Map())

  // Use the same base URL as other expense services
  const baseUrl = useMemo(() => {
    const envBaseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
    return `${envBaseUrl}/processes/employee-expense/debug/calculation`
  }, [])

  /**
   * Load a catalog and cache all entries by code
   */
  const loadCatalog = useCallback(
    async (catalogIdentifier: string, version: string): Promise<Map<string, any>> => {
      const cacheKey = `${catalogIdentifier}:${version}`

      // Return cached catalog if available
      if (catalogEntriesCache.current.has(cacheKey)) {
        return catalogEntriesCache.current.get(cacheKey)!
      }

      console.log(`[CatalogResolver] Loading catalog: ${cacheKey}`)

      try {
        const response = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier, version },
          { limit: 500, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        )

        // Create a map of code -> entry for fast lookup
        const entriesMap = new Map<string, any>()
        if (response?.data) {
          response.data.forEach((entry: any) => {
            if (entry.code) {
              entriesMap.set(entry.code, entry)
            }
          })
        }

        console.log(`[CatalogResolver] Loaded ${entriesMap.size} entries for ${cacheKey}`)
        catalogEntriesCache.current.set(cacheKey, entriesMap)
        return entriesMap
      } catch (err) {
        console.warn(`[CatalogResolver] Failed to load catalog ${cacheKey}:`, err)
        return new Map()
      }
    },
    [catalogClient]
  )

  /**
   * Resolve a catalog ref (e.g., "Country:v1:DE") to its display name
   */
  const resolveCatalogRef = useCallback(
    async (ref: string | null | undefined): Promise<string> => {
      if (!ref) {
        return ''
      }

      // Check resolved cache first
      if (resolvedRefCache.current.has(ref)) {
        return resolvedRefCache.current.get(ref) || ''
      }

      // Parse the ref string
      const parsed = parseCatalogRef(ref)
      if (!parsed) {
        // Not a valid ref format, return as-is
        resolvedRefCache.current.set(ref, ref)
        return ref
      }

      console.log(`[CatalogResolver] Resolving: ${ref}`)

      try {
        // Load the catalog (will use cache if already loaded)
        const entriesMap = await loadCatalog(parsed.catalogIdentifier, parsed.version)

        // Find entry by code
        const entry = entriesMap.get(parsed.code)
        if (entry) {
          const displayName = getLocalizedValue(entry)
          console.log(`[CatalogResolver] Resolved ${ref} -> ${displayName}`)
          resolvedRefCache.current.set(ref, displayName)
          return displayName
        }
      } catch (err) {
        console.warn(`[CatalogResolver] Failed to resolve ref: ${ref}`, err)
      }

      // Fallback: use the code part of the ref
      const fallback = parsed.code
      console.log(`[CatalogResolver] Using fallback for ${ref}: ${fallback}`)
      resolvedRefCache.current.set(ref, fallback)
      return fallback
    },
    [loadCatalog]
  )

  /**
   * Check if a value looks like a catalog ref (e.g., "Country:v1:DE")
   */
  const isCatalogRef = useCallback((value: any): boolean => {
    if (typeof value !== 'string') return false
    // Match pattern like "CatalogName:version:code"
    const parts = value.split(':')
    if (parts.length < 3) return false
    // First part should be a catalog name (capital letter start)
    if (!/^[A-Z][a-zA-Z]*$/.test(parts[0])) return false
    // Second part should be a version like "v1"
    if (!/^v\d+$/.test(parts[1])) return false
    return true
  }, [])

  /**
   * Resolve catalog refs in trace step inputs/outputs
   */
  const resolveTraceStepCatalogs = useCallback(
    async (steps: CalculationStep[]): Promise<CalculationStep[]> => {
      // Collect all unique refs from steps
      const refsToResolve = new Set<string>()

      steps.forEach(step => {
        // Check inputs
        Object.values(step.inputs || {}).forEach(value => {
          if (isCatalogRef(value)) refsToResolve.add(value)
        })
        // Check outputs
        Object.values(step.outputs || {}).forEach(value => {
          if (isCatalogRef(value)) refsToResolve.add(value)
        })
      })

      if (refsToResolve.size === 0) return steps

      console.log(`[CatalogResolver] Resolving ${refsToResolve.size} refs in trace steps`)

      // Batch resolve all refs
      const resolvedMap = new Map<string, string>()
      await Promise.all(
        Array.from(refsToResolve).map(async ref => {
          const resolved = await resolveCatalogRef(ref)
          resolvedMap.set(ref, resolved)
        })
      )

      console.log(`[CatalogResolver] Step refs resolved:`, Object.fromEntries(resolvedMap))

      // Apply resolved names to steps
      return steps.map(step => ({
        ...step,
        inputs: Object.fromEntries(
          Object.entries(step.inputs || {}).map(([key, value]) => [
            key,
            isCatalogRef(value) ? resolvedMap.get(value) || value : value
          ])
        ),
        outputs: Object.fromEntries(
          Object.entries(step.outputs || {}).map(([key, value]) => [
            key,
            isCatalogRef(value) ? resolvedMap.get(value) || value : value
          ])
        )
      }))
    },
    [isCatalogRef, resolveCatalogRef]
  )

  /**
   * Resolve all catalog refs in an analysis response
   */
  const resolveAnalysisCatalogs = useCallback(
    async (data: RequestAnalysis): Promise<RequestAnalysis> => {
      // Collect all unique refs to resolve
      const refsToResolve = new Set<string>()

      // From trips
      data.trips?.forEach(trip => {
        if (trip.countryRef) refsToResolve.add(trip.countryRef)
        if (trip.travelRegionRef) refsToResolve.add(trip.travelRegionRef)
      })

      // From applied rule
      if (data.appliedRule?.countryRef) refsToResolve.add(data.appliedRule.countryRef)
      if (data.appliedRule?.calculationType) refsToResolve.add(data.appliedRule.calculationType)

      console.log(`[CatalogResolver] Refs to resolve:`, Array.from(refsToResolve))

      // Batch resolve all refs
      const resolvedMap = new Map<string, string>()
      await Promise.all(
        Array.from(refsToResolve).map(async ref => {
          const resolved = await resolveCatalogRef(ref)
          resolvedMap.set(ref, resolved)
        })
      )

      console.log(`[CatalogResolver] Resolved map:`, Object.fromEntries(resolvedMap))

      // Apply resolved names to trips
      const resolvedTrips =
        data.trips?.map(trip => ({
          ...trip,
          countryName: trip.countryRef ? resolvedMap.get(trip.countryRef) || trip.countryRef : undefined,
          travelRegionName: trip.travelRegionRef
            ? resolvedMap.get(trip.travelRegionRef) || trip.travelRegionRef
            : undefined
        })) || []

      // Apply resolved names to rule
      const resolvedRule = data.appliedRule
        ? {
            ...data.appliedRule,
            countryName: data.appliedRule.countryRef
              ? resolvedMap.get(data.appliedRule.countryRef) || data.appliedRule.countryRef
              : undefined,
            calculationTypeName: data.appliedRule.calculationType
              ? resolvedMap.get(data.appliedRule.calculationType) || data.appliedRule.calculationType
              : undefined
          }
        : undefined

      return {
        ...data,
        trips: resolvedTrips,
        appliedRule: resolvedRule
      }
    },
    [resolveCatalogRef]
  )

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    }),
    [accessToken]
  )

  const parseResponse = async (response: Response, action: string) => {
    const contentType = response.headers.get('content-type')
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Debug API endpoint not found. The backend debug service needs to be deployed. (${action})`)
      }
      throw new Error(`${action} failed: ${response.status} ${response.statusText}`)
    }
    if (!contentType?.includes('application/json')) {
      throw new Error(
        `Debug API not available. Expected JSON but got ${contentType}. The backend debug service may not be deployed yet.`
      )
    }
    return response.json()
  }

  const fetchTraces = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${baseUrl}/traces?limit=50`, { headers })
      const data = await parseResponse(response, 'Fetch traces')
      setTraces(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [accessToken, baseUrl, headers])

  const fetchTrace = useCallback(
    async (traceId: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${baseUrl}/traces/${traceId}`, { headers })
        const data = await parseResponse(response, 'Fetch trace')
        setCurrentTrace(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [baseUrl, headers]
  )

  const fetchTracesForRequest = useCallback(
    async (requestId: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${baseUrl}/traces/request/${requestId}`, { headers })
        const data = await parseResponse(response, 'Fetch traces for request')
        setTraces(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [baseUrl, headers]
  )

  const fetchTracesForPlan = useCallback(
    async (planId: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${baseUrl}/traces/plan/${planId}`, { headers })
        const data = await parseResponse(response, 'Fetch traces for plan')
        setTraces(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [baseUrl, headers]
  )

  const triggerTraceForRequest = useCallback(
    async (requestId: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${baseUrl}/trace/request/${requestId}/allowance`, {
          method: 'POST',
          headers
        })
        const data = await parseResponse(response, 'Trigger trace for request')
        setCurrentTrace(data)
        setTraces(prev => [data, ...prev])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [baseUrl, headers]
  )

  const triggerTraceForPlan = useCallback(
    async (planId: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${baseUrl}/trace/plan/${planId}/allowance`, {
          method: 'POST',
          headers
        })
        const data = await parseResponse(response, 'Trigger trace for plan')
        setCurrentTrace(data)
        setTraces(prev => [data, ...prev])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [baseUrl, headers]
  )

  const analyzeRequest = useCallback(
    async (requestId: string) => {
      setLoading(true)
      setError(null)
      // Clear previous trace before starting new analysis
      setCurrentTrace(null)
      setAnalysis(null)
      try {
        const response = await fetch(`${baseUrl}/analyze/request/${requestId}`, { headers })
        const data = await parseResponse(response, 'Analyze request')
        console.log('[CalculationDebugger] Analyze response keys:', Object.keys(data))
        console.log('[CalculationDebugger] calculationTrace exists:', !!data.calculationTrace)
        console.log('[CalculationDebugger] calculationTrace steps:', data.calculationTrace?.steps?.length || 0)

        // Log trip data for debugging
        if (data.trips && data.trips.length > 0) {
          console.log('[CalculationDebugger] First trip raw data:', {
            point: data.trips[0].point,
            address: data.trips[0].address,
            countryRef: data.trips[0].countryRef,
            travelRegionRef: data.trips[0].travelRegionRef
          })
        }

        // Resolve catalog refs to display names (on FE)
        console.log('[CalculationDebugger] Starting catalog resolution...')
        const resolvedData = await resolveAnalysisCatalogs(data)
        console.log('[CalculationDebugger] Catalog refs resolved')

        // Log resolved trip data
        if (resolvedData.trips && resolvedData.trips.length > 0) {
          console.log('[CalculationDebugger] First trip resolved data:', {
            address: resolvedData.trips[0].address,
            countryName: resolvedData.trips[0].countryName,
            travelRegionName: resolvedData.trips[0].travelRegionName
          })
        }

        // Set analysis with resolved names
        setAnalysis(resolvedData)

        // Then set trace (ensure it's set even if empty)
        if (resolvedData.calculationTrace) {
          console.log('[CalculationDebugger] Setting currentTrace with:', {
            traceId: resolvedData.calculationTrace.traceId,
            status: resolvedData.calculationTrace.status,
            stepsCount: resolvedData.calculationTrace.steps?.length || 0
          })

          // Resolve catalog refs in trace steps
          if (resolvedData.calculationTrace.steps?.length) {
            console.log('[CalculationDebugger] Resolving catalog refs in trace steps...')
            const resolvedSteps = await resolveTraceStepCatalogs(resolvedData.calculationTrace.steps)
            setCurrentTrace({
              ...resolvedData.calculationTrace,
              steps: resolvedSteps
            })
          } else {
            setCurrentTrace(resolvedData.calculationTrace)
          }
        } else {
          console.warn(
            '[CalculationDebugger] No calculationTrace in response - keys available:',
            Object.keys(resolvedData)
          )
          setCurrentTrace(null)
        }
      } catch (err) {
        console.error('[CalculationDebugger] Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setCurrentTrace(null)
      } finally {
        setLoading(false)
      }
    },
    [baseUrl, headers, resolveAnalysisCatalogs, resolveTraceStepCatalogs]
  )

  const debugRuleAssignment = useCallback(
    async (employeeId: string, date: Date) => {
      setLoading(true)
      setError(null)
      try {
        const dateStr = date.toISOString()
        const response = await fetch(
          `${baseUrl}/debug/rule-assignment/${employeeId}?allowanceDate=${encodeURIComponent(dateStr)}`,
          { headers }
        )
        const data = await parseResponse(response, 'Debug rule assignment')
        setCurrentTrace(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [baseUrl, headers]
  )

  const compareTraces = useCallback(
    async (traceId1: string, traceId2: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${baseUrl}/compare?traceId1=${traceId1}&traceId2=${traceId2}`, {
          headers
        })
        return await parseResponse(response, 'Compare traces')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        return null
      } finally {
        setLoading(false)
      }
    },
    [baseUrl, headers]
  )

  const clearTraces = useCallback(() => {
    setTraces([])
    setCurrentTrace(null)
    setAnalysis(null)
    setError(null)
  }, [])

  return {
    traces,
    currentTrace,
    analysis,
    loading,
    error,
    fetchTraces,
    fetchTrace,
    fetchTracesForRequest,
    fetchTracesForPlan,
    triggerTraceForRequest,
    triggerTraceForPlan,
    analyzeRequest,
    debugRuleAssignment,
    compareTraces,
    clearTraces
  }
}
