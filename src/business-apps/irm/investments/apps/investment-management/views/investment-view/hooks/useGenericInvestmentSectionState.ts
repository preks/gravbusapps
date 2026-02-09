import { useMemo } from 'react'
import { useInvestments } from '@/common/data/investment/hooks/useInvestments.new'

export interface GenericInvestmentSectionStateProps {
  accessToken: string
  groupCode: string
  selectedFilters: Record<string, any>
}

/**
 * Generic hook for fetching investments filtered by investment group
 * Works for any investment group by building custom conditions dynamically
 *
 * @param accessToken - User access token for authentication
 * @param groupCode - Investment group code (e.g., 'EQUITY', 'REAL_ESTATE')
 * @param selectedFilters - Additional filters to apply
 */
export const useGenericInvestmentSectionState = ({
  accessToken,
  groupCode,
  selectedFilters
}: GenericInvestmentSectionStateProps) => {
  // Build custom conditions to filter by investment group
  // CRITICAL: Memoize to prevent infinite loops - new array on every render would trigger refetch
  const customConditions = useMemo(
    () => [{ investmentGroup: { id: { _eq: `InvestmentGroup:v1:${groupCode}` } } }],
    [groupCode]
  )

  // Memoize the query variables to prevent recreating object on every render
  const queryVariables = useMemo(
    () => ({
      ...selectedFilters,
      customConditions
    }),
    [selectedFilters, customConditions]
  )

  // Use the standard useInvestments hook with group-specific conditions
  // Note: useInvestments signature is (accessToken, variables, config)
  return useInvestments(accessToken, queryVariables, 'list')
}
