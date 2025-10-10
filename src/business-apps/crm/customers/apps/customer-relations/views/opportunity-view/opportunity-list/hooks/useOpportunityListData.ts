import { useState, useCallback } from 'react'
import { Opportunity, UseOpportunityListDataReturn } from '../types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { enforceQueryLimit } from '@/business-apps/crm/common/utils/queryLimits'
import { useCustomerOpportunities } from '@/common/data/customer/hooks/useCustomerOpportunities'
import type { CustomerOpportunityQueryVariables } from '@/common/data/customer/queries/customerOpportunityQueries'

// deprecated mapping no longer used

interface UseOpportunityListDataParams {
  search?: string
  sortField: string
  sortOrder: 'ASC' | 'DESC'
  context: BusinessAppContextProps
  sourceApp?: string
  stages?: string[]
  winningChanceRanges?: Array<{ min?: number; max?: number }>
  amountRanges?: Array<{ min?: number; max?: number }>
  statuses?: string[]
  accounts?: string[]
  createdAfter?: string
  createdBefore?: string
  owners?: string[]
  pipelines?: string[]
}

// Data returned from centralized API already matches Opportunity type via mappers

export const useOpportunityListData = (params: UseOpportunityListDataParams): UseOpportunityListDataReturn => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { fetchCustomerOpportunities } = useCustomerOpportunities(params.context)

  const loadPage = useCallback(
    async (
      page: number,
      pageSize = 20,
      additionalFilters?: any,
      overrideSortField?: string,
      overrideSortOrder?: 'ASC' | 'DESC' | '',
      showLoading: boolean = true
    ) => {
      if (!params.context.accessToken) {
        console.warn('No access token provided for opportunity data loading')
        return
      }

      if (showLoading) {
        setLoading(true)
      }
      setError(null)

      try {
        // Enforce query limit to ensure optimal performance
        const safePageSize = enforceQueryLimit(pageSize)
        const offset = (page - 1) * safePageSize

        // Build where conditions - start with base condition
        const whereConditions: any[] = [{ isDeleted: { _eq: false } }]

        // Add search functionality - only search name and related fields that exist
        const search = additionalFilters?.search || params.search
        if (search?.trim()) {
          const searchTerm = `%${search.trim()}%`
          const isNumber = !isNaN(Number(search))

          const searchConditions: any[] = [{ name: { _ilike: searchTerm } }]

          // Add account name search
          searchConditions.push({
            account: {
              name: { _ilike: searchTerm }
            }
          })

          // Add owner employee search
          searchConditions.push({
            ownerEmployee: {
              firstName: { _ilike: searchTerm }
            }
          })
          searchConditions.push({
            ownerEmployee: {
              lastName: { _ilike: searchTerm }
            }
          })
          searchConditions.push({
            ownerEmployee: {
              displayName: { _ilike: searchTerm }
            }
          })

          // Add stage and pipeline search (centralized names)
          searchConditions.push({ stage: { _ilike: searchTerm } })
          searchConditions.push({
            opportunityPipelineStage: { value: { _ilike: searchTerm } }
          })
          searchConditions.push({
            pipeline: { value: { _ilike: searchTerm } }
          })
          searchConditions.push({
            opportunityPipeline: { value: { _ilike: searchTerm } }
          })

          // Add status search
          searchConditions.push({
            opportunityStatus: { value: { _ilike: searchTerm } }
          })

          // Add number-specific conditions if the search term can be parsed as a number
          if (isNumber) {
            const numericValue = Number(search)
            searchConditions.push({ estimatedAmount: { _eq: numericValue } })
            searchConditions.push({ winningChance: { _eq: numericValue } })
          }

          whereConditions.push({ _or: searchConditions })
        }

        // Add stage filtering (check both stage and salesPipelineStage.value)
        const stages = additionalFilters?.stages || params.stages
        if (stages && stages.length > 0) {
          const stageConditions: any[] = [
            { stage: { _in: stages } },
            { salesPipelineStage: { value: { _in: stages } } }
          ]
          whereConditions.push({ _or: stageConditions })
        }

        // Add winning chance filtering
        const winningChanceRanges = additionalFilters?.winningChanceRanges || params.winningChanceRanges
        if (winningChanceRanges && winningChanceRanges.length > 0) {
          const winningChanceConditions = winningChanceRanges.map((range: { min?: number; max?: number }) => {
            const condition: any = {}
            if (range.min !== undefined) {
              condition._gte = range.min
            }
            if (range.max !== undefined) {
              condition._lte = range.max
            }
            return { winningChance: condition }
          })
          whereConditions.push({ _or: winningChanceConditions })
        }

        // Add amount filtering
        const amountRanges = additionalFilters?.amountRanges || params.amountRanges
        if (amountRanges && amountRanges.length > 0) {
          const amountConditions = amountRanges.map((range: { min?: number; max?: number }) => {
            const condition: any = {}
            if (range.min !== undefined) {
              condition._gte = range.min
            }
            if (range.max !== undefined) {
              condition._lte = range.max
            }
            return { estimatedAmount: condition }
          })
          whereConditions.push({ _or: amountConditions })
        }

        // Add status filtering (Java enum values)
        const statusEnums = additionalFilters?.statuses || params.statuses
        if (statusEnums && statusEnums.length > 0) {
          whereConditions.push({ status: { _in: statusEnums } })
        }

        // Add close date filtering (was incorrectly filtering createdAt)
        const createdAfter = additionalFilters?.createdAfter || params.createdAfter
        const createdBefore = additionalFilters?.createdBefore || params.createdBefore
        if (createdAfter || createdBefore) {
          const dateCondition: any = {}
          if (createdAfter) {
            dateCondition._gte = createdAfter
          }
          if (createdBefore) {
            dateCondition._lte = createdBefore
          }
          whereConditions.push({ closeDate: dateCondition })
        }

        // Note: Opportunity name filtering is handled directly in search above, not as separate filter

        // Merge additionalFilters with params for owner filtering
        const owners = additionalFilters?.owners || params.owners
        if (owners && owners.length > 0) {
          whereConditions.push({ ownerEmployeeId: { _in: owners } })
        }

        // Add pipeline filtering (check both pipeline and opportunityPipeline ID)
        const pipelines = additionalFilters?.pipelines || params.pipelines
        if (pipelines && pipelines.length > 0) {
          const pipelineConditions: any[] = [
            { pipeline: { id: { _in: pipelines } } },
            { opportunityPipeline: { id: { _in: pipelines } } }
          ]
          whereConditions.push({ _or: pipelineConditions })
        }

        // Add account filtering
        const accounts = additionalFilters?.accounts || params.accounts
        if (accounts && accounts.length > 0) {
          whereConditions.push({ accountId: { _in: accounts } })
        }

        // Add status filtering
        const statuses = additionalFilters?.statuses || params.statuses
        if (statuses && statuses.length > 0) {
          whereConditions.push({
            opportunityStatus: { id: { _in: statuses } }
          })
        }

        // Combine all where conditions with _and
        // local whereCondition no longer used directly; centralized variables constructed below

        // Build order by condition - handle both override and regular sorting
        let orderBy: any[] = []
        if (overrideSortField && overrideSortField !== '') {
          const sortCondition: any = {}

          if (overrideSortField === 'name') {
            sortCondition.name = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'estimatedAmount') {
            // Nulls first in ASC so null behaves like 0
            sortCondition.estimatedAmount = overrideSortOrder === 'ASC' ? 'ASC_NULLS_FIRST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'winningChance') {
            sortCondition.winningChance = overrideSortOrder === 'ASC' ? 'ASC_NULLS_FIRST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'closeDate') {
            sortCondition.closeDate = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'createdAt') {
            sortCondition.createdAt = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'ownerEmployeeId') {
            sortCondition.ownerEmployee = {
              displayName: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'stage') {
            // Schema supports direct scalar 'stage' sorting
            sortCondition.stage = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'pipeline') {
            // Fallback: pipeline nested sort not supported → sort by name
            sortCondition.name = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'accountId') {
            sortCondition.account = {
              name: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'status') {
            // Fallback: status nested sort not supported → sort by createdAt
            sortCondition.createdAt = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          }

          if (Object.keys(sortCondition).length > 0) {
            orderBy = [sortCondition]
          }
        } else if (params.sortField && params.sortField !== '' && params.sortOrder) {
          const sortCondition: any = {}

          if (params.sortField === 'name') {
            sortCondition.name = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'estimatedAmount') {
            sortCondition.estimatedAmount = params.sortOrder === 'ASC' ? 'ASC_NULLS_FIRST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'winningChance') {
            sortCondition.winningChance = params.sortOrder === 'ASC' ? 'ASC_NULLS_FIRST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'closeDate') {
            sortCondition.closeDate = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'createdAt') {
            sortCondition.createdAt = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'ownerEmployeeId') {
            sortCondition.ownerEmployee = {
              displayName: params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (params.sortField === 'stage') {
            sortCondition.stage = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'pipeline') {
            // Fallback: pipeline nested sort not supported → sort by name
            sortCondition.name = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'accountId') {
            sortCondition.account = {
              name: params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (params.sortField === 'status') {
            // Fallback: status nested sort not supported → sort by createdAt
            sortCondition.createdAt = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          }

          if (Object.keys(sortCondition).length > 0) {
            orderBy = [sortCondition]
          }
        }

        // Default sorting if no specific sort is provided
        if (orderBy.length === 0) {
          orderBy = [{ createdAt: 'DESC_NULLS_LAST' }]
        }

        // Map local filters to centralized query variables
        const variables: CustomerOpportunityQueryVariables = {
          offset,
          limit: safePageSize
        } as any

        // Map sorting
        const resolveSortField = (f?: string): string | undefined => {
          if (!f) return undefined
          if (f === 'ownerEmployeeId') return 'ownerEmployee'
          if (f === 'stage') return 'stage'
          if (f === 'pipeline') return 'name'
          if (f === 'accountId') return 'account'
          if (f === 'status') return 'createdAt'
          return f
        }

        const selectedSortField = resolveSortField(
          overrideSortField && overrideSortField !== '' ? overrideSortField : params.sortField
        )
        const selectedSortOrder = (
          overrideSortField && overrideSortField !== '' ? overrideSortOrder : params.sortOrder
        ) as 'ASC' | 'DESC'

        if (selectedSortField) {
          variables.orderBy = [{ field: selectedSortField, direction: selectedSortOrder }]
        } else {
          variables.orderBy = [{ field: 'createdAt', direction: 'DESC' }]
        }

        // Translate whereCondition structure into variables used by centralized builder
        // Only pass arrays we control from filters; search already handled below
        const searchParam = additionalFilters?.search || params.search
        if (searchParam?.trim()) variables.search = searchParam.trim()
        const stagesParam = additionalFilters?.stages || params.stages
        if (stagesParam?.length) (variables as any).stageValues = stagesParam
        const pipelinesParam = additionalFilters?.pipelines || params.pipelines
        if (pipelinesParam?.length) (variables as any).pipelineIds = pipelinesParam
        const accountsParam = additionalFilters?.accounts || params.accounts
        if (accountsParam?.length) variables.accountIds = accountsParam
        const ownersParam = additionalFilters?.owners || params.owners
        if (ownersParam?.length) variables.ownerEmployeeIds = ownersParam
        const statusesParam = additionalFilters?.statuses || params.statuses
        if (statusesParam?.length) variables.statusIds = statusesParam
        const winningChanceRangesParam = additionalFilters?.winningChanceRanges || params.winningChanceRanges
        if (winningChanceRangesParam?.length) variables.winningChanceRanges = winningChanceRangesParam
        const amountRangesParam = additionalFilters?.amountRanges || params.amountRanges
        if (amountRangesParam?.length) variables.estimatedAmountRanges = amountRangesParam
        const createdAfterParam = additionalFilters?.createdAfter || params.createdAfter
        const createdBeforeParam = additionalFilters?.createdBefore || params.createdBefore
        if (createdAfterParam) variables.closeDateFrom = createdAfterParam
        if (createdBeforeParam) variables.closeDateTo = createdBeforeParam

        const result = await fetchCustomerOpportunities(variables)

        if (result) {
          setOpportunities(result.opportunities as unknown as Opportunity[])

          const totalCount = result.total || 0
          setTotal(totalCount)
          setCurrentPage(page)
          setPageSize(safePageSize)
          setHasMore(offset + safePageSize < totalCount)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load opportunities'))
        console.error('Error loading opportunities:', err)
      } finally {
        setLoading(false)
      }
    },
    [
      fetchCustomerOpportunities,
      params.search,
      params.sortField,
      params.sortOrder,
      JSON.stringify(params.stages), // Use JSON.stringify for array
      JSON.stringify(params.winningChanceRanges), // Use JSON.stringify for array
      JSON.stringify(params.amountRanges), // Use JSON.stringify for array
      JSON.stringify(params.statuses), // Use JSON.stringify for array
      params.createdAfter,
      params.createdBefore,
      params.context.accessToken
    ]
  )

  const loadMore = useCallback(() => {
    console.log('Load more opportunities requested')
    // Implementation for infinite scroll if needed
  }, [])

  const retry = useCallback(() => {
    console.log('Retrying opportunity data load')
    loadPage(currentPage, pageSize)
  }, [currentPage, pageSize, loadPage])

  return {
    opportunities,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry
  }
}
