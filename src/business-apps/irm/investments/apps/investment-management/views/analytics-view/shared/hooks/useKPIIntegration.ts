import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * @interface KPIIntegrationResult
 * @description Result object returned by useKPIIntegration hook
 * @template T - The type of KPI data
 */
export interface KPIIntegrationResult<T> {
  /** Current KPI data */
  current: T
  /** Previous KPI data for comparison */
  previous: T
  /** Loading state */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Function to manually refetch data */
  refetch: () => Promise<void>
}

/**
 * @type KPIFetcher
 * @description Function type for fetching KPI data
 * @template T - The type of KPI data to fetch
 */
export type KPIFetcher<T> = (accessToken: string, ...args: any[]) => Promise<{ current: T; previous: T }>

/**
 * @hook useKPIIntegration
 * @description Generic hook for fetching and managing KPI data with loading, error, and refetch capabilities.
 * Provides a standardized pattern for KPI integration across all analytics views.
 *
 * @template T - The type of KPI data (e.g., EquityKPIData, LiquidFundKPIData)
 * @param {BusinessAppContextProps} context - Business app context containing accessToken
 * @param {KPIFetcher<T>} fetcher - Async function that fetches KPI data
 * @param {T} initialState - Initial state for current and previous KPI data
 * @param {any[]} [dependencies=[]] - Optional dependencies to trigger refetch
 * @returns {KPIIntegrationResult<T>} Object containing KPI data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * // Define your KPI data type
 * interface EquityKPIData {
 *   totalInvestments: number;
 *   totalAmountInvested: number;
 *   averageStake: number;
 *   portfolioMoic: number;
 * }
 *
 * // Create a fetcher function
 * const fetchEquityKPIs = async (accessToken: string): Promise<{ current: EquityKPIData; previous: EquityKPIData }> => {
 *   const query = GET_EQUITY_KPIS_QUERY();
 *   const result = await graphqlClient.request(query);
 *   return {
 *     current: transformData(result.current),
 *     previous: transformData(result.previous)
 *   };
 * };
 *
 * // Use the hook in your component
 * function EquityAnalytics(context: BusinessAppContextProps) {
 *   const initialState: EquityKPIData = {
 *     totalInvestments: 0,
 *     totalAmountInvested: 0,
 *     averageStake: 0,
 *     portfolioMoic: 0
 *   };
 *
 *   const { current, previous, isLoading, error, refetch } = useKPIIntegration(
 *     context,
 *     fetchEquityKPIs,
 *     initialState
 *   );
 *
 *   if (isLoading) return <LoadingState />;
 *   if (error) return <ErrorState message={error} onRetry={refetch} />;
 *
 *   return <KPICards kpis={current} previousKpis={previous} />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With dependencies (e.g., currency filter)
 * function PortfolioAnalytics(context: BusinessAppContextProps) {
 *   const [selectedCurrency, setSelectedCurrency] = useState('EUR');
 *
 *   const { current, previous, isLoading, error } = useKPIIntegration(
 *     context,
 *     (accessToken) => fetchPortfolioKPIs(accessToken, selectedCurrency),
 *     initialState,
 *     [selectedCurrency] // Refetch when currency changes
 *   );
 *
 *   // Component renders with filtered KPIs
 * }
 * ```
 */
export function useKPIIntegration<T>(
  context: BusinessAppContextProps,
  fetcher: KPIFetcher<T>,
  initialState: T,
  dependencies: any[] = []
): KPIIntegrationResult<T> {
  const [current, setCurrent] = useState<T>(initialState)
  const [previous, setPrevious] = useState<T>(initialState)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load KPI data from the provided fetcher function
   */
  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetcher(context.accessToken, ...dependencies)

      if (result && typeof result === 'object') {
        setCurrent(result.current || initialState)
        setPrevious(result.previous || initialState)
      } else {
        throw new Error('Invalid KPI data format returned from fetcher')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load KPI data'
      console.error('KPI Integration Error:', errorMessage, err)
      setError(errorMessage)
      // Keep existing data on error rather than resetting to initial state
    } finally {
      setIsLoading(false)
    }
    // Note: loadData is intentionally excluded to prevent circular dependencies
  }, [context.accessToken, fetcher, initialState, ...dependencies])

  /**
   * Trigger data load when context or dependencies change
   * Note: loadData is intentionally excluded to prevent circular dependencies
   */
  useEffect(() => {
    if (context.accessToken) {
      void loadData()
    }
  }, [context.accessToken, ...dependencies])

  return {
    current,
    previous,
    isLoading,
    error,
    refetch: loadData
  }
}

/**
 * @hook useSimpleKPIIntegration
 * @description Simplified version of useKPIIntegration for cases where you don't need previous data comparison.
 *
 * @template T - The type of KPI data
 * @param {BusinessAppContextProps} context - Business app context
 * @param {(accessToken: string, ...args: any[]) => Promise<T>} fetcher - Simpler fetcher that only returns current data
 * @param {T} initialState - Initial state for KPI data
 * @param {any[]} [dependencies=[]] - Optional dependencies
 * @returns {Omit<KPIIntegrationResult<T>, 'previous'>} Result without previous data
 *
 * @example
 * ```tsx
 * const { current, isLoading, error } = useSimpleKPIIntegration(
 *   context,
 *   fetchCurrentKPIs,
 *   initialState
 * );
 * ```
 */
export function useSimpleKPIIntegration<T>(
  context: BusinessAppContextProps,
  fetcher: (accessToken: string, ...args: any[]) => Promise<T>,
  initialState: T,
  dependencies: any[] = []
): Omit<KPIIntegrationResult<T>, 'previous'> {
  const wrappedFetcher: KPIFetcher<T> = async (accessToken: string, ...args: any[]) => {
    const current = await fetcher(accessToken, ...args)
    return { current, previous: initialState }
  }

  const result = useKPIIntegration(context, wrappedFetcher, initialState, dependencies)

  return {
    current: result.current,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch
  }
}
