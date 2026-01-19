import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildAdvancePaymentsQuery, validateFilters, AdvancePaymentFilters } from '../queries/advancePayments'

export interface AdvancePaymentData {
  id: string
  code: string
  description: string
  amount: number
  currencyRef: string
  currency: { code: string }
  costCenter: { name: string }
  status: string
  paymentMethod: string
  expensePlan: {
    code: string
    title: string
    totalAmount: number
    currency: { code: string }
    id: string
    reimbursableAmount: number
    startDate: string
    endDate: string
    planDate: string
    decisionDate: string
    status: string
    requestTypeRef: string
    createdAt: string
    employeeDocumentId: string
    expenseRequest: {
      id: string
      code: string
      status: string
      totalAmount: number
    }
  }
  expensePlanId: string
}

export interface AdvancePaymentResponse {
  AdvancePaymentAggregate: {
    aggregate: {
      count: number
    }
  }
  AdvancePayment: AdvancePaymentData[]
}

export interface UseAdvancePaymentsParams {
  employeeId: string
  limit?: number
  offset?: number
  searchTerm?: string
  filters?: AdvancePaymentFilters
}

export const useAdvancePayments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAdvancePayments = useCallback(
    async (params: UseAdvancePaymentsParams) => {
      if (!context.accessToken) {
        throw new Error('Access token is required')
      }

      setIsLoading(true)
      setError(null)

      try {
        // Build dynamic query based on filters
        const query = buildAdvancePaymentsQuery(params.filters || {})
        const filterState = validateFilters(params.filters || {})

        // Prepare variables object
        const variables: any = {
          employeeId: params.employeeId,
          limit: params.limit || 20,
          offset: params.offset || 0,
          searchTerm: params.searchTerm || '%'
        }

        // Add filter variables only if filters are active
        if (filterState.hasStatusFilter && params.filters?.statusFilter) {
          variables.statusFilter = params.filters.statusFilter
        }

        if (filterState.hasAmountRange && params.filters?.amountRange) {
          variables.amountMin = params.filters.amountRange.min
          variables.amountMax = params.filters.amountRange.max
        }

        if (filterState.hasAdvanceRange && params.filters?.advanceRange) {
          variables.advanceMin = params.filters.advanceRange.min
          variables.advanceMax = params.filters.advanceRange.max
        }

        const result = await graphqlClient.request<AdvancePaymentResponse>(query, variables)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch advance payments'
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  return {
    fetchAdvancePayments,
    isLoading,
    error,
    clearError: () => setError(null)
  }
}

// Hook for managing filter state
export const useAdvancePaymentFilters = () => {
  const [filters, setFilters] = useState<AdvancePaymentFilters>({})

  const updateFilters = useCallback((newFilters: Partial<AdvancePaymentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  const hasActiveFilters =
    validateFilters(filters).hasStatusFilter ||
    validateFilters(filters).hasAmountRange ||
    validateFilters(filters).hasAdvanceRange

  return {
    filters,
    updateFilters,
    clearFilters,
    hasActiveFilters
  }
}
