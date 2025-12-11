import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface PlannedExitInvestment {
  id: string
  name: string
  acquisitionDate: string
  exitDate?: string
  plannedExitDate?: string
  initialInvestmentAmount: number
  totalInvestmentAmount: number
  stakePercentage: number
  debtFinancingAmount: number
  investmentMarketValue: number
  investmentGroup?: {
    id: string
    code: string
    value: string
    description: string
  }
  investmentType?: {
    id: string
    code: string
    value: string
    description: string
  }
  currency?: {
    id: string
    code: string
    value: string
  }
  ownerEmployee?: {
    id: string
    displayName: string
    firstName: string
    lastName: string
    pictureThumbnail?: string
  }
}

export interface UsePlannedExitsDataParams {
  accessToken: string
  searchTerm?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  limit?: number
  offset?: number
  currencyCode?: string
  filters?: {
    investmentGroupIds?: string[]
    ownerEmployeeIds?: string[]
    plannedExitDateFrom?: string
    plannedExitDateTo?: string
    createdAfter?: string
    createdBefore?: string
    investmentNameContains?: string
    initialInvestmentMinAmount?: number
    initialInvestmentMaxAmount?: number
    totalInvestmentMinAmount?: number
    totalInvestmentMaxAmount?: number
    investmentMarketValueMinAmount?: number
    investmentMarketValueMaxAmount?: number
    stakePercentageMin?: number
    stakePercentageMax?: number
  }
}

export interface UsePlannedExitsDataReturn {
  investments: PlannedExitInvestment[]
  isLoading: boolean
  error: string | null
  totalCount: number
  refetch: () => void
}

const PLANNED_EXITS_QUERY = `
  query GetPlannedExits(
    $where: InvestmentBoolExp
    $orderBy: [InvestmentOrderBy!]
    $limit: Int
    $offset: Int
  ) {
    Investment(where: $where, orderBy: $orderBy, limit: $limit, offset: $offset) {
      id
      name
      acquisitionDate
      exitDate
      plannedExitDate
      initialInvestmentAmount
      totalInvestmentAmount
      stakePercentage
      debtFinancingAmount
      investmentMarketValue
      investmentGroup {
        id
        code
        value
        description
      }
      investmentType {
        id
        code
        value
        description
      }
      currency {
        id
        code
        value
      }
      ownerEmployee {
        id
        displayName
        firstName
        lastName
        pictureThumbnail
      }
    }
    InvestmentAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

export const usePlannedExitsData = (params: UsePlannedExitsDataParams): UsePlannedExitsDataReturn => {
  const [investments, setInvestments] = useState<PlannedExitInvestment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const graphqlClient = useGraphQLClient(params.accessToken)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Build where clause for planned exits
      const where: any = {
        planedExit: { _eq: true }
      }

      // Add search filter if provided
      if (params.searchTerm) {
        where._or = [
          { name: { _ilike: `%${params.searchTerm}%` } },
          {
            investmentGroup: {
              _or: [
                { code: { _ilike: `%${params.searchTerm}%` } },
                { description: { _ilike: `%${params.searchTerm}%` } }
              ]
            }
          }
        ]
      }

      // Apply currency filter if provided
      if (params.currencyCode) {
        where.currency = { code: { _eq: params.currencyCode } }
      }

      // Apply filters
      const f = params.filters || {}
      if (f.investmentGroupIds && f.investmentGroupIds.length) {
        where.investmentGroup = { id: { _in: f.investmentGroupIds } }
      }
      if (f.ownerEmployeeIds && f.ownerEmployeeIds.length) {
        where.ownerEmployee = { id: { _in: f.ownerEmployeeIds } }
      }
      if (f.plannedExitDateFrom) {
        where.plannedExitDate = { ...(where.plannedExitDate || {}), _gte: f.plannedExitDateFrom }
      }
      if (f.plannedExitDateTo) {
        where.plannedExitDate = { ...(where.plannedExitDate || {}), _lte: f.plannedExitDateTo }
      }
      if (f.createdAfter || f.createdBefore) {
        const createdAny: any = {}
        if (f.createdAfter) createdAny._gte = f.createdAfter
        if (f.createdBefore) createdAny._lte = f.createdBefore
        where.createdAt = createdAny
      }
      if (f.investmentNameContains) {
        where.name = { _ilike: `%${f.investmentNameContains}%` }
      }
      if (f.initialInvestmentMinAmount !== undefined || f.initialInvestmentMaxAmount !== undefined) {
        const obj: any = {}
        if (f.initialInvestmentMinAmount !== undefined) obj._gte = f.initialInvestmentMinAmount
        if (f.initialInvestmentMaxAmount !== undefined) obj._lte = f.initialInvestmentMaxAmount
        where.initialInvestmentAmount = obj
      }
      if (f.totalInvestmentMinAmount !== undefined || f.totalInvestmentMaxAmount !== undefined) {
        const obj: any = {}
        if (f.totalInvestmentMinAmount !== undefined) obj._gte = f.totalInvestmentMinAmount
        if (f.totalInvestmentMaxAmount !== undefined) obj._lte = f.totalInvestmentMaxAmount
        where.totalInvestmentAmount = obj
      }
      if (f.investmentMarketValueMinAmount !== undefined || f.investmentMarketValueMaxAmount !== undefined) {
        const obj: any = {}
        if (f.investmentMarketValueMinAmount !== undefined) obj._gte = f.investmentMarketValueMinAmount
        if (f.investmentMarketValueMaxAmount !== undefined) obj._lte = f.investmentMarketValueMaxAmount
        where.investmentMarketValue = obj
      }
      if (f.stakePercentageMin !== undefined || f.stakePercentageMax !== undefined) {
        const obj: any = {}
        if (f.stakePercentageMin !== undefined) obj._gte = f.stakePercentageMin
        if (f.stakePercentageMax !== undefined) obj._lte = f.stakePercentageMax
        where.stakePercentage = obj
      }

      // Build order by clause
      const orderBy: any[] = []
      if (params.sortBy) {
        const direction = params.sortDirection === 'desc' ? 'DESC' : 'ASC'

        // Handle nested fields
        if (params.sortBy.includes('.')) {
          const [relation, field] = params.sortBy.split('.')
          orderBy.push({ [relation]: { [field]: direction } })
        } else {
          orderBy.push({ [params.sortBy]: direction })
        }
      } else {
        // Default sort by planned exit date
        orderBy.push({ plannedExitDate: 'ASC' })
      }

      const variables = {
        where,
        orderBy,
        limit: params.limit || 50,
        offset: params.offset || 0
      }

      const response = await graphqlClient.request(PLANNED_EXITS_QUERY, variables)

      if (response.Investment) {
        setInvestments(response.Investment)
        setTotalCount(response.InvestmentAggregate?.aggregate?.count || 0)
      } else {
        setInvestments([])
        setTotalCount(0)
      }
    } catch (err) {
      console.error('Error fetching planned exits:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch planned exits')
      setInvestments([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [
    graphqlClient,
    params.searchTerm,
    params.sortBy,
    params.sortDirection,
    params.limit,
    params.offset,
    params.currencyCode,
    JSON.stringify(params.filters)
  ])

  useEffect(() => {
    if (params.accessToken) {
      fetchData()
    }
  }, [fetchData, params.accessToken])

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    investments,
    isLoading,
    error,
    totalCount,
    refetch
  }
}
