import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CurrencyOption {
  id: string // "Currency:v1:EUR"
  code: string // "EUR"
  value: string // "European euro"
}

interface CurrencyFilters {
  // For IRM Investments
  investmentGroupId?: string // "InvestmentGroup:v1:EQUITY"
  investmentGroupIds?: string[]

  // For IRM Opportunities
  dealType?: string // "DIVESTMENT_DEAL"

  // Common - Supports both IRM and CRM entities
  entity?: 'Investment' | 'InvestmentOpportunity' | 'Opportunity' | 'Account'
}

interface UseAvailableCurrenciesOptions {
  filters?: CurrencyFilters
  returnFormat?: 'full' | 'codes' // full: CurrencyOption[], codes: string[]
  autoLoad?: boolean // Default: true
}

interface UseAvailableCurrenciesResult {
  currencies: CurrencyOption[] | string[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Central hook to efficiently fetch available currencies using GraphQL distinctOn
 * Supports both IRM (Investment, InvestmentOpportunity) and CRM (Opportunity, Account) entities
 *
 * @example
 * // IRM - Investment View - All investments
 * const { currencies } = useAvailableCurrencies(context, {
 *   filters: { entity: 'Investment' },
 *   returnFormat: 'codes'
 * })
 *
 * @example
 * // IRM - Equity Analytics - Equity investments only
 * const { currencies } = useAvailableCurrencies(context, {
 *   filters: { entity: 'Investment', investmentGroupId: 'InvestmentGroup:v1:EQUITY' },
 *   returnFormat: 'full'
 * })
 *
 * @example
 * // IRM - Divestment - Exit opportunities
 * const { currencies } = useAvailableCurrencies(context, {
 *   filters: { entity: 'InvestmentOpportunity', dealType: 'DIVESTMENT_DEAL' },
 *   returnFormat: 'codes'
 * })
 *
 * @example
 * // CRM - Opportunity View - All opportunities
 * const { currencies } = useAvailableCurrencies(context, {
 *   filters: { entity: 'Opportunity' },
 *   returnFormat: 'codes'
 * })
 *
 * @example
 * // CRM - Account View - All accounts
 * const { currencies } = useAvailableCurrencies(context, {
 *   filters: { entity: 'Account' },
 *   returnFormat: 'full'
 * })
 */
export const useAvailableCurrencies = (
  context: BusinessAppContextProps,
  options: UseAvailableCurrenciesOptions = {}
): UseAvailableCurrenciesResult => {
  const { filters = {}, returnFormat = 'codes', autoLoad = true } = options

  const graphqlClient = useGraphQLClient(context.accessToken)
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([])
  const [isLoading, setIsLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)

  // Destructure filter values to avoid dependency on entire object
  const entity = filters.entity || 'Investment'
  const investmentGroupId = filters.investmentGroupId
  const investmentGroupIds = filters.investmentGroupIds
  const dealType = filters.dealType

  // Serialize array dependencies to avoid reference changes causing infinite loops
  const investmentGroupIdsKey = investmentGroupIds ? JSON.stringify(investmentGroupIds) : ''

  // Build WHERE conditions based on filters
  const whereConditions = useMemo(() => {
    const conditions: string[] = ['{ isDeleted: { _eq: false } }', '{ currencyRef: { _isNull: false } }']

    // IRM-specific filters
    if (investmentGroupId) {
      conditions.push(`{ investmentGroup: { id: { _eq: "${investmentGroupId}" } } }`)
    }

    if (investmentGroupIds?.length) {
      const groupIds = investmentGroupIds.map(id => `"${id}"`).join(', ')
      conditions.push(`{ investmentGroup: { id: { _in: [${groupIds}] } } }`)
    }

    if (dealType) {
      conditions.push(`{ dealType: { _eq: "${dealType}" } }`)
    }

    return conditions
  }, [investmentGroupId, investmentGroupIdsKey, dealType])

  const loadAvailableCurrencies = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetAvailableCurrencies {
          ${entity}(
            distinctOn: currencyRef
            orderBy: [{ currencyRef: ASC }]
            where: {
              _and: [
                ${whereConditions.join(',\n                ')}
              ]
            }
          ) {
            currencyRef
            currency {
              code
              value
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        Investment?: Array<{
          currencyRef: string | null
          currency: { code: string; value: string } | null
        }>
        InvestmentOpportunity?: Array<{
          currencyRef: string | null
          currency: { code: string; value: string } | null
        }>
        Opportunity?: Array<{
          currencyRef: string | null
          currency: { code: string; value: string } | null
        }>
        Account?: Array<{
          currencyRef: string | null
          currency: { code: string; value: string } | null
        }>
      }>(query)

      const data = result[entity] || []

      const fetchedCurrencies = data
        .filter(item => item.currency?.code && item.currencyRef)
        .map(item => ({
          id: item.currencyRef!,
          code: item.currency!.code,
          value: item.currency!.value || item.currency!.code
        }))
        // Sort with EUR first, then alphabetically
        .sort((a, b) => {
          if (a.code === 'EUR') return -1
          if (b.code === 'EUR') return 1
          return a.code.localeCompare(b.code)
        })

      setCurrencies(
        fetchedCurrencies.length > 0
          ? fetchedCurrencies
          : [{ id: 'Currency:v1:EUR', code: 'EUR', value: 'European euro' }]
      )
    } catch (err) {
      console.error('Error fetching available currencies:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch currencies')

      // Fallback to default currencies
      setCurrencies([
        { id: 'Currency:v1:EUR', code: 'EUR', value: 'European euro' },
        { id: 'Currency:v1:USD', code: 'USD', value: 'US Dollar' },
        { id: 'Currency:v1:GBP', code: 'GBP', value: 'British Pound' }
      ])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient, entity, whereConditions])

  useEffect(() => {
    if (autoLoad && context.accessToken) {
      void loadAvailableCurrencies()
    }
  }, [autoLoad, context.accessToken, loadAvailableCurrencies])

  // Return in requested format
  const formattedCurrencies = useMemo(() => {
    if (returnFormat === 'codes') {
      return currencies.map(c => c.code)
    }
    return currencies
  }, [currencies, returnFormat])

  return {
    currencies: formattedCurrencies,
    isLoading,
    error,
    refetch: loadAvailableCurrencies
  }
}
