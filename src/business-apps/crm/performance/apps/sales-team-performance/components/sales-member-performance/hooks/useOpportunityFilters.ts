import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { DateRangeFilter } from '@/business-apps/crm/core/apps/customer-relations/views/lead-view/components/DateRangeFilter'
import {
  getAllPreselectedFilters,
  processFilterByGroup
} from '@/business-apps/crm/core/apps/customer-relations/views/opportunity-view/hooks/filterUrlHelpers'

export interface FilterGroup {
  id: string
  title: string // Changed from label to title to match DataFilterGroup
  filters: Array<{ id: string; label: string; value: any; selected: boolean }>
  backendSearch?: (search: string) => {
    filters: Array<{ id: string; label: string; value: any; selected: boolean }>
    loading: boolean
    error: any
  }
}

export interface OpportunityFilters {
  search: string
  setSearch: (search: string) => void
  selectedFilters: string[]
  filterGroups: FilterGroup[]
  filterLabelMap: Record<string, string>
  addFilter: (filterId: string) => void
  removeFilter: (filterId: string) => void
  clearAllFilters: () => void
  getFilters: () => any
  createdAfter?: string
  createdBefore?: string
  handleDateRangeChange: (after?: string, before?: string) => void
  filtersInitialized: boolean
}

export const useOpportunityFilters = (context: BusinessAppContextProps): OpportunityFilters => {
  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [createdAfter, setCreatedAfter] = useState<string | undefined>()
  const [createdBefore, setCreatedBefore] = useState<string | undefined>()
  const [filtersInitialized, setFiltersInitialized] = useState(false)
  // Ensure filters are considered initialized early, so initial data can load without waiting for filter option datasets
  useEffect(() => {
    if (!filtersInitialized) {
      setFiltersInitialized(true)
    }
  }, [filtersInitialized])

  const graphqlClient = useGraphQLClient(context.accessToken)
  const [opportunityOwners, setOpportunityOwners] = useState<Array<{ id: string; name: string }>>([])
  const [pipelineStageOptions, setPipelineStageOptions] = useState<Array<{ id: string; name: string }>>([])
  const [pipelineOptions, setPipelineOptions] = useState<Array<{ id: string; name: string }>>([])
  const [accountOptions, setAccountOptions] = useState<Array<{ id: string; name: string }>>([])
  const [statusOptions, setStatusOptions] = useState<Array<{ id: string; name: string }>>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isOwnersLoading, setIsOwnersLoading] = useState(false)
  const [isPipelineStagesLoading, setIsPipelineStagesLoading] = useState(false)
  const [isPipelinesLoading, setIsPipelinesLoading] = useState(false)
  const [isAccountsLoading, setIsAccountsLoading] = useState(false)
  const [isStatusesLoading, setIsStatusesLoading] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_ownersError, setOwnersError] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_pipelineStagesError, setPipelineStagesError] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_pipelinesError, setPipelinesError] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_accountsError, setAccountsError] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_statusesError, setStatusesError] = useState<any>(null)

  const loadOwners = useCallback(async () => {
    if (!context.accessToken) return
    setIsOwnersLoading(true)
    setOwnersError(null)
    try {
      const res = await graphqlClient.request<{
        Opportunity: Array<{
          ownerEmployee?: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
        }>
      }>(`
        query GetOppOwners {
          Opportunity(where: { isDeleted: { _eq: false }, ownerEmployee: { id: { _isNull: false } } }, distinctOn: [ownerEmployeeId], limit: 50) {
            ownerEmployee { id displayName firstName lastName }
          }
        }
      `)
      const items = (res?.Opportunity || [])
        .filter(r => r.ownerEmployee)
        .map(r => {
          const e = r.ownerEmployee!
          const name = e.displayName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown'
          return { id: e.id, name }
        })
      setOpportunityOwners(items)
    } catch (e) {
      setOwnersError(e)
      setOpportunityOwners([])
    } finally {
      setIsOwnersLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  const loadStages = useCallback(async () => {
    if (!context.accessToken) return
    setIsPipelineStagesLoading(true)
    setPipelineStagesError(null)
    try {
      const res = await graphqlClient.request<{
        Opportunity: Array<{ salesPipelineStage?: { id: string; code?: string; value?: string } | null }>
      }>(`
        query GetOppStages {
          Opportunity(where: { isDeleted: { _eq: false } }, distinctOn: [salesPipelineStageRef], limit: 50) {
            salesPipelineStage { id code value }
          }
        }
      `)
      const map = new Map<string, string>()
      for (const r of res?.Opportunity || []) {
        const s = r.salesPipelineStage
        if (s?.id) map.set(s.id, s.value || s.code || s.id)
      }
      setPipelineStageOptions(Array.from(map.entries()).map(([id, name]) => ({ id, name })))
    } catch (e) {
      setPipelineStagesError(e)
      setPipelineStageOptions([])
    } finally {
      setIsPipelineStagesLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  const loadPipelines = useCallback(async () => {
    if (!context.accessToken) return
    setIsPipelinesLoading(true)
    setPipelinesError(null)
    try {
      const res = await graphqlClient.request<{
        Opportunity: Array<{ salesPipeline?: { id: string; code?: string; value?: string } | null }>
      }>(`
        query GetOppPipelines {
          Opportunity(where: { isDeleted: { _eq: false } }, distinctOn: [salesPipelineRef], limit: 50) {
            salesPipeline { id code value }
          }
        }
      `)
      const map = new Map<string, string>()
      for (const r of res?.Opportunity || []) {
        const p = r.salesPipeline
        if (p?.id) map.set(p.id, p.value || p.code || p.id)
      }
      setPipelineOptions(Array.from(map.entries()).map(([id, name]) => ({ id, name })))
    } catch (e) {
      setPipelinesError(e)
      setPipelineOptions([])
    } finally {
      setIsPipelinesLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  const loadAccounts = useCallback(async () => {
    if (!context.accessToken) return
    setIsAccountsLoading(true)
    setAccountsError(null)
    try {
      const res = await graphqlClient.request<{
        Opportunity: Array<{ account?: { id: string; name?: string } | null }>
      }>(`
        query GetOppAccounts {
          Opportunity(where: { isDeleted: { _eq: false } }, limit: 100) {
            account { id name }
          }
        }
      `)
      const map = new Map<string, string>()
      for (const r of res?.Opportunity || []) {
        const a = r.account
        if (a?.id) map.set(a.id, a.name || 'Unknown Account')
      }
      setAccountOptions(Array.from(map.entries()).map(([id, name]) => ({ id, name })))
    } catch (e) {
      setAccountsError(e)
      setAccountOptions([])
    } finally {
      setIsAccountsLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  const loadStatuses = useCallback(async () => {
    if (!context.accessToken) return
    setIsStatusesLoading(true)
    setStatusesError(null)
    try {
      const res = await graphqlClient.request<{
        Opportunity: Array<{ opportunityStatus?: { id: string; code?: string; value?: string } | null }>
      }>(`
        query GetOppStatuses {
          Opportunity(where: { isDeleted: { _eq: false } }, distinctOn: [opportunityStatusRef], limit: 50) {
            opportunityStatus { id code value }
          }
        }
      `)
      const map = new Map<string, string>()
      for (const r of res?.Opportunity || []) {
        const s = r.opportunityStatus
        if (s?.id) map.set(s.id, s.value || s.code || s.id)
      }
      setStatusOptions(Array.from(map.entries()).map(([id, name]) => ({ id, name })))
    } catch (e) {
      setStatusesError(e)
      setStatusOptions([])
    } finally {
      setIsStatusesLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    loadOwners()
    loadStages()
    loadPipelines()
    loadAccounts()
    loadStatuses()
  }, [loadOwners, loadStages, loadPipelines, loadAccounts, loadStatuses])

  // Initialize filters from URL parameters when pipeline options are loaded
  useEffect(() => {
    if (
      !filtersInitialized &&
      !isPipelineStagesLoading &&
      !isPipelinesLoading &&
      !isAccountsLoading &&
      !isStatusesLoading
    ) {
      const urlParams = new URLSearchParams(globalThis.location.search)

      // Only process URL filters if we have data loaded
      if (pipelineStageOptions.length > 0 || pipelineOptions.length > 0) {
        const preselectedFilters = getAllPreselectedFilters(urlParams, {
          pipelineStageOptions,
          pipelineOptions
        })

        if (preselectedFilters.length > 0) {
          setSelectedFilters(preselectedFilters)
        }
      }

      // Always set initialized to true once loading is complete, regardless of whether data exists
      setFiltersInitialized(true)
    }
  }, [
    pipelineStageOptions,
    pipelineOptions,
    isPipelineStagesLoading,
    isPipelinesLoading,
    isAccountsLoading,
    isStatusesLoading,
    filtersInitialized
  ])

  // Backend search functions removed – we load static option lists per group

  // (none)

  // (none)

  // (none)

  const handleDateRangeChange = useCallback((after?: string, before?: string) => {
    setCreatedAfter(after)
    setCreatedBefore(before)
  }, [])

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: 'dateRange',
        title: 'Close Date',
        customComponent: React.createElement(DateRangeFilter, {
          createdAfter: createdAfter,
          createdBefore: createdBefore,
          onDateRangeChange: handleDateRangeChange,
          className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent'
        }),
        hideSearch: true
      } as any, // Temporary type assertion to bypass interface issue
      {
        id: 'owners',
        title: 'Owner',
        filters: (opportunityOwners || []).map(owner => ({
          id: owner.id,
          label: owner.name,
          value: owner.name,
          selected: selectedFilters.includes(owner.id)
        }))
      },
      {
        id: 'stage',
        title: 'Stage',
        filters: (pipelineStageOptions || []).map(option => ({
          id: `stage-${option.id}`,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(`stage-${option.id}`)
        }))
      },
      {
        id: 'pipeline',
        title: 'Pipeline',
        filters: (pipelineOptions || []).map(option => ({
          id: `pipeline-${option.id}`,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(`pipeline-${option.id}`)
        }))
      },
      {
        id: 'winningChance',
        title: 'Winning Chance',
        filters: [
          {
            id: 'chance-high',
            label: 'High (75-100%)',
            value: { min: 75, max: 100 },
            selected: selectedFilters.includes('chance-high')
          },
          {
            id: 'chance-medium',
            label: 'Medium (50-74%)',
            value: { min: 50, max: 74 },
            selected: selectedFilters.includes('chance-medium')
          },
          {
            id: 'chance-low',
            label: 'Low (25-49%)',
            value: { min: 25, max: 49 },
            selected: selectedFilters.includes('chance-low')
          },
          {
            id: 'chance-very-low',
            label: 'Very Low (0-24%)',
            value: { min: 0, max: 24 },
            selected: selectedFilters.includes('chance-very-low')
          }
        ]
      },
      {
        id: 'estimatedAmount',
        title: 'Deal Size',
        filters: [
          {
            id: 'amount-large',
            label: 'Large (>$100K)',
            value: { min: 100000 },
            selected: selectedFilters.includes('amount-large')
          },
          {
            id: 'amount-medium',
            label: 'Medium ($50K-$100K)',
            value: { min: 50000, max: 100000 },
            selected: selectedFilters.includes('amount-medium')
          },
          {
            id: 'amount-small',
            label: 'Small ($10K-$50K)',
            value: { min: 10000, max: 50000 },
            selected: selectedFilters.includes('amount-small')
          },
          {
            id: 'amount-micro',
            label: 'Micro (<$10K)',
            value: { max: 10000 },
            selected: selectedFilters.includes('amount-micro')
          }
        ]
      },
      {
        id: 'accounts',
        title: 'Account',
        filters: (accountOptions || []).map(option => ({
          id: option.id,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(option.id)
        }))
      },
      {
        id: 'statuses',
        title: 'Status',
        filters: (statusOptions || []).map(option => ({
          id: `status-${option.id}`,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(`status-${option.id}`)
        }))
      }
    ],
    [
      selectedFilters,
      opportunityOwners,
      pipelineStageOptions,
      pipelineOptions,
      accountOptions,
      statusOptions,
      createdAfter,
      createdBefore,
      handleDateRangeChange
    ]
  )

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    if (filterGroups) {
      for (const group of filterGroups) {
        if (group.filters) {
          for (const filter of group.filters) {
            map[filter.id] = filter.label
          }
        }
      }
    }
    return map
  }, [filterGroups])

  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => {
      if (!prev.includes(filterId)) {
        return [...prev, filterId]
      }
      return prev
    })
  }, [])

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId))
  }, [])

  const clearAllFilters = useCallback(() => {
    setSelectedFilters([])
    setCreatedAfter(undefined)
    setCreatedBefore(undefined)
  }, [])

  const getFilters = useCallback(() => {
    const filters: any = {}

    if (search) {
      filters.search = search
    }

    if (createdAfter) {
      filters.createdAfter = createdAfter
    }

    if (createdBefore) {
      filters.createdBefore = createdBefore
    }

    // Process selected filters
    for (const filterId of selectedFilters) {
      for (const group of filterGroups) {
        if (!group.filters || !Array.isArray(group.filters)) {
          continue
        }

        const filter = group.filters.find(f => f.id === filterId)
        if (filter) {
          processFilterByGroup(group.id, filterId, filter.value, filters)
          break
        }
      }
    }

    return filters
  }, [search, selectedFilters, createdAfter, createdBefore, filterGroups])

  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
    createdAfter,
    createdBefore,
    handleDateRangeChange,
    filtersInitialized
  }
}
