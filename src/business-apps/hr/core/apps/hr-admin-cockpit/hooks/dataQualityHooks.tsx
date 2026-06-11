import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { DataQualityComputedContextValue, DataQualityFilters } from '../types/dataQuality.types'
import {
  applyCompletenessFilterToFacts,
  buildEmployeeDataQualityFacts,
  computeBreakdownFromFacts,
  computeBreakdownMatrixFromFacts,
  computeDashboardFromFacts,
  computeJobArchitecture,
  computeJobArchitectureLists,
  computeEmployeeAttentionRowsFromFacts,
  computeRecommendedActionsFromFacts,
  computeRecordsNeedingAttentionFromFacts,
  computeRequirementsFromFacts,
  computeTopUrgentRecordsFromFacts
} from '../services/dataQualityCompute'
import type { RawEmployeeRow, RawJobArchitecture } from '../services/dataQualityFetch'
import {
  fetchActiveStructureId,
  fetchEmployeeForDataQuality,
  fetchEmployeesForDataQuality,
  fetchJobArchitecture,
  fetchOrgUnits,
  fetchSiteLocations
} from '../services/dataQualityFetch'

export const DEFAULT_DATA_QUALITY_FILTERS: DataQualityFilters = {
  search: '',
  companyId: null,
  siteLocationId: null,
  organizationalUnitId: null,
  completeness: 'all',
  issueFocus: null
}

const DataQualityComputedContext = createContext<DataQualityComputedContextValue | null>(null)

const EMPTY_RAW_JOB_ARCHITECTURE: RawJobArchitecture = {
  jobPositionsTotal: { aggregate: { count: 0 } },
  jobPositionsMissingProfile: { aggregate: { count: 0 } },
  jobPositionsSample: [],
  jobProfiles: []
}

const EMPTY_DASHBOARD = {
  overallCompletionRate: 0,
  employeesWithMissingDataCount: 0,
  criticalPayrollBlockersCount: 0,
  jobPositionsMissingProfilesCount: 0,
  jobProfilesMissingDescriptionsOrSkillsCount: 0,
  employeeSampleSize: 0
}

const EMPTY_JOB_ARCHITECTURE = {
  totalJobPositions: 0,
  jobPositionsWithProfile: 0,
  jobPositionsMissingProfile: 0,
  totalJobProfiles: 0,
  jobProfilesWithDescription: 0,
  jobProfilesMissingDescription: 0,
  jobProfilesWithSkills: 0,
  jobProfilesMissingSkills: 0
}

const EMPTY_BREAKDOWN_MATRIX = { companies: [], locations: [], cells: new Map(), allLocationsColumn: new Map() }

function buildJobArchitectureCacheKey(structureId: string, filters: DataQualityFilters): string {
  return [structureId, filters.companyId ?? '', filters.siteLocationId ?? '', filters.organizationalUnitId ?? ''].join(
    ':'
  )
}

export interface DataQualityComputedProviderProps {
  readonly accessToken: string
  readonly activeTab?: string
  readonly children: React.ReactNode
}

export function DataQualityComputedProvider({
  accessToken,
  activeTab = 'overview',
  children
}: Readonly<DataQualityComputedProviderProps>) {
  const graphqlClient = useGraphqlClient(accessToken)
  const [filters, setFilters] = useState<DataQualityFilters>(DEFAULT_DATA_QUALITY_FILTERS)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawEmployees, setRawEmployees] = useState<RawEmployeeRow[]>([])
  const [rawJob, setRawJob] = useState<RawJobArchitecture | null>(null)

  const [structureId, setStructureId] = useState<string | null>(null)

  const jobArchitectureCacheRef = useRef(new Map<string, RawJobArchitecture>())
  const employeesRequestIdRef = useRef(0)
  const jobArchitectureRequestIdRef = useRef(0)

  const debouncedSearch = useDebounce(filters.search, 300)
  const stableFilters = useMemo(
    () => ({
      companyId: filters.companyId,
      siteLocationId: filters.siteLocationId,
      organizationalUnitId: filters.organizationalUnitId,
      completeness: filters.completeness,
      issueFocus: filters.issueFocus
    }),
    [filters.companyId, filters.siteLocationId, filters.organizationalUnitId, filters.completeness, filters.issueFocus]
  )
  const debouncedFilters = useMemo<DataQualityFilters>(
    () => ({ ...stableFilters, search: debouncedSearch }),
    [stableFilters, debouncedSearch]
  )

  // Fetch / refresh structureId (and employees) when filters change.
  // Job architecture is fetched separately and cached per structureId.
  const loadEmployees = useCallback(async () => {
    const requestId = (employeesRequestIdRef.current += 1)
    setLoading(true)
    setError(null)

    try {
      const sid = await fetchActiveStructureId(graphqlClient)
      if (requestId !== employeesRequestIdRef.current) return

      setStructureId(sid)

      if (!sid) {
        setRawEmployees([])
        setRawJob(null)
        setError('error-no-structure')
        setLoading(false)
        return
      }

      const emps = await fetchEmployeesForDataQuality(graphqlClient, debouncedFilters, sid)
      if (requestId !== employeesRequestIdRef.current) return

      setRawEmployees(emps)

      const cacheKey = buildJobArchitectureCacheKey(sid, debouncedFilters)
      const cachedJob = jobArchitectureCacheRef.current.get(cacheKey)
      setRawJob(cachedJob ?? EMPTY_RAW_JOB_ARCHITECTURE)
    } catch (e) {
      if (requestId !== employeesRequestIdRef.current) return
      setRawEmployees([])
      setRawJob(null)
      setError(e instanceof Error ? e.message : 'error-load-failed')
    } finally {
      if (requestId === employeesRequestIdRef.current) {
        setLoading(false)
      }
    }
  }, [graphqlClient, debouncedFilters])

  const loadJobArchitecture = useCallback(async () => {
    if (!structureId) return

    const cacheKey = buildJobArchitectureCacheKey(structureId, debouncedFilters)
    const cached = jobArchitectureCacheRef.current.get(cacheKey)
    if (cached) {
      setRawJob(cached)
      return
    }

    const requestId = (jobArchitectureRequestIdRef.current += 1)
    try {
      const ja = await fetchJobArchitecture(graphqlClient, structureId, debouncedFilters)
      if (requestId !== jobArchitectureRequestIdRef.current) return
      jobArchitectureCacheRef.current.set(cacheKey, ja)
      setRawJob(ja)
    } catch {
      // Keep page usable with employee data; job architecture can be empty if this fails.
    }
  }, [graphqlClient, structureId, debouncedFilters])

  useEffect(() => {
    loadEmployees().catch(() => {
      // loadEmployees already manages error state; this prevents unhandled promise warnings
    })
  }, [loadEmployees])

  useEffect(() => {
    loadJobArchitecture().catch(() => {})
  }, [loadJobArchitecture])

  const refetch = useCallback(() => {
    ;(async () => {
      if (structureId) {
        jobArchitectureCacheRef.current.delete(buildJobArchitectureCacheKey(structureId, debouncedFilters))
      }
      await loadEmployees()
      await loadJobArchitecture()
    })().catch(() => {
      // both functions already manage their own state; this prevents unhandled promise warnings
    })
  }, [structureId, debouncedFilters, loadEmployees, loadJobArchitecture])

  const refreshEmployee = useCallback(
    async (employeeId: string) => {
      if (!structureId) return

      const refreshedEmployee = await fetchEmployeeForDataQuality(
        graphqlClient,
        employeeId,
        debouncedFilters,
        structureId
      )
      setRawEmployees(currentEmployees => {
        const employeeExists = currentEmployees.some(employee => employee.id === employeeId)
        if (!refreshedEmployee) {
          return employeeExists ? currentEmployees.filter(employee => employee.id !== employeeId) : currentEmployees
        }

        if (!employeeExists) {
          return [...currentEmployees, refreshedEmployee]
        }

        return currentEmployees.map(employee => (employee.id === employeeId ? refreshedEmployee : employee))
      })
    },
    [graphqlClient, debouncedFilters, structureId]
  )

  const employeeFacts = useMemo(() => buildEmployeeDataQualityFacts(rawEmployees), [rawEmployees])

  const visibleEmployeeFacts = useMemo(
    () => applyCompletenessFilterToFacts(employeeFacts, filters.completeness),
    [employeeFacts, filters.completeness]
  )

  const employeeById = useMemo(() => new Map(rawEmployees.map(e => [e.id, e])), [rawEmployees])

  const computed = useMemo(() => {
    if (!rawJob) {
      return null
    }

    const isIssuesTab = activeTab === 'issues'
    const isOverviewTab = !isIssuesTab

    const dashboard = isOverviewTab ? computeDashboardFromFacts(employeeFacts, rawJob) : EMPTY_DASHBOARD
    const requirements = isOverviewTab ? computeRequirementsFromFacts(visibleEmployeeFacts) : { categories: [] }
    const breakdown = isOverviewTab
      ? computeBreakdownFromFacts(visibleEmployeeFacts)
      : { byCompany: [], bySiteLocation: [] }
    const jobArchitecture = isOverviewTab ? computeJobArchitecture(rawJob) : EMPTY_JOB_ARCHITECTURE
    const jobArchitectureLists = isOverviewTab
      ? computeJobArchitectureLists(rawJob)
      : {
          jobPositionsMissingProfileList: [],
          jobProfilesMissingDescriptionList: [],
          jobProfilesMissingSkillsList: []
        }
    const recommendedActions = isOverviewTab ? computeRecommendedActionsFromFacts(employeeFacts, rawJob) : []
    const recordsNeedingAttention = computeRecordsNeedingAttentionFromFacts(
      visibleEmployeeFacts,
      isIssuesTab ? EMPTY_RAW_JOB_ARCHITECTURE : rawJob,
      filters
    )
    const employeeAttentionRows = isIssuesTab
      ? computeEmployeeAttentionRowsFromFacts(visibleEmployeeFacts, filters)
      : []
    const topUrgentRecords = isOverviewTab ? computeTopUrgentRecordsFromFacts(employeeFacts, rawJob) : []
    const breakdownMatrix = isOverviewTab
      ? computeBreakdownMatrixFromFacts(visibleEmployeeFacts)
      : EMPTY_BREAKDOWN_MATRIX

    return {
      dashboard,
      requirements,
      breakdown,
      jobArchitecture,
      recommendedActions,
      recordsNeedingAttention,
      employeeAttentionRows,
      topUrgentRecords,
      breakdownMatrix,
      jobPositionsMissingProfileList: jobArchitectureLists.jobPositionsMissingProfileList,
      jobProfilesMissingDescriptionList: jobArchitectureLists.jobProfilesMissingDescriptionList,
      jobProfilesMissingSkillsList: jobArchitectureLists.jobProfilesMissingSkillsList
    }
  }, [rawJob, activeTab, employeeFacts, visibleEmployeeFacts, filters])

  const contextValue = useMemo<DataQualityComputedContextValue>(() => {
    if (!computed) {
      return {
        filters,
        setFilters,
        loading,
        error,
        refetch,
        refreshEmployee,
        dashboard: EMPTY_DASHBOARD,
        requirements: { categories: [] },
        breakdown: { byCompany: [], bySiteLocation: [] },
        jobArchitecture: EMPTY_JOB_ARCHITECTURE,
        recommendedActions: [],
        recordsNeedingAttention: [],
        employeeAttentionRows: [],
        topUrgentRecords: [],
        breakdownMatrix: EMPTY_BREAKDOWN_MATRIX,
        employeeById,
        jobPositionsMissingProfileList: [],
        jobProfilesMissingDescriptionList: [],
        jobProfilesMissingSkillsList: []
      }
    }

    return {
      filters,
      setFilters,
      loading,
      error,
      refetch,
      refreshEmployee,
      dashboard: computed.dashboard,
      requirements: computed.requirements,
      breakdown: computed.breakdown,
      jobArchitecture: computed.jobArchitecture,
      recommendedActions: computed.recommendedActions,
      recordsNeedingAttention: computed.recordsNeedingAttention,
      employeeAttentionRows: computed.employeeAttentionRows,
      topUrgentRecords: computed.topUrgentRecords,
      breakdownMatrix: computed.breakdownMatrix,
      employeeById,
      jobPositionsMissingProfileList: computed.jobPositionsMissingProfileList,
      jobProfilesMissingDescriptionList: computed.jobProfilesMissingDescriptionList,
      jobProfilesMissingSkillsList: computed.jobProfilesMissingSkillsList
    }
  }, [computed, filters, loading, error, refetch, refreshEmployee, employeeById])

  return <DataQualityComputedContext.Provider value={contextValue}>{children}</DataQualityComputedContext.Provider>
}

export function useDataQualityContext(): DataQualityComputedContextValue {
  const ctx = useContext(DataQualityComputedContext)
  if (!ctx) {
    throw new Error('Data quality hooks require DataQualityComputedProvider.')
  }
  return ctx
}

/** @param _filters Optional - reserved so call sites can mirror filter identity; data always tracks provider state. */
export function useDataQualityDashboard() {
  const ctx = useDataQualityContext()
  return { data: ctx.dashboard, loading: ctx.loading, error: ctx.error, refetch: ctx.refetch }
}

export function useDataQualityRequirements() {
  const ctx = useDataQualityContext()
  return { data: ctx.requirements, loading: ctx.loading, error: ctx.error, refetch: ctx.refetch }
}

export function useMissingDataBreakdown() {
  const ctx = useDataQualityContext()
  return { data: ctx.breakdown, loading: ctx.loading, error: ctx.error, refetch: ctx.refetch }
}

export function useJobArchitectureCompleteness() {
  const ctx = useDataQualityContext()
  return { data: ctx.jobArchitecture, loading: ctx.loading, error: ctx.error, refetch: ctx.refetch }
}

export function useRecommendedDataQualityActions() {
  const ctx = useDataQualityContext()
  return { data: ctx.recommendedActions, loading: ctx.loading, error: ctx.error, refetch: ctx.refetch }
}

export function useRecordsNeedingAttention() {
  const ctx = useDataQualityContext()
  return { data: ctx.recordsNeedingAttention, loading: ctx.loading, error: ctx.error, refetch: ctx.refetch }
}

export function useFilterOptionSources(accessToken: string) {
  const graphqlClient = useGraphqlClient(accessToken)
  const [structureId, setStructureId] = useState<string | null>(null)
  const [sites, setSites] = useState<Array<{ id: string; name?: string | null; code?: string | null }>>([])
  const [orgUnits, setOrgUnits] = useState<Array<{ id: string; name?: string | null }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const sid = await fetchActiveStructureId(graphqlClient)
        const locs = await fetchSiteLocations(graphqlClient)
        if (cancelled) return
        setStructureId(sid)
        setSites(locs)
        if (sid) {
          const ous = await fetchOrgUnits(graphqlClient, sid)
          if (!cancelled) setOrgUnits(ous)
        } else {
          setOrgUnits([])
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'error-load-filters')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [graphqlClient])

  return { structureId, sites, orgUnits, loading, error }
}
