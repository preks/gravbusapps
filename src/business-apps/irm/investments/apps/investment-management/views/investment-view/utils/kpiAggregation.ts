import { getGroupConfiguration } from '../config/groupConfigurations'

/**
 * Aggregate KPI results from specialized and generic hooks into a single map
 * Reduces cognitive complexity by extracting conditional logic
 */
export const aggregateDynamicKPIs = (
  investmentGroups: Array<{ tabId: string; code: string }>,
  equityKPIs: any,
  liquidFundKPIs: any,
  realEstateKPIs: any,
  genericKPIResults: any[]
): Record<string, any> => {
  const kpis: Record<string, any> = {}

  investmentGroups.forEach((group, index) => {
    const config = getGroupConfiguration(group.code)

    // Use specialized KPI hook results if defined, otherwise use generic
    if (config.kpiHookName === 'useEquityKPIIntegration') {
      kpis[group.tabId] = equityKPIs
    } else if (config.kpiHookName === 'useLiquidFundKPIIntegration') {
      kpis[group.tabId] = liquidFundKPIs
    } else if (config.kpiHookName === 'useRealEstateKPIIntegration') {
      kpis[group.tabId] = realEstateKPIs
    } else {
      // Use generic KPI hook for unknown groups (including Private Equity)
      kpis[group.tabId] = genericKPIResults[index]
    }
  })

  return kpis
}

/**
 * Aggregate count results from multiple hooks into a single map
 */
export const aggregateDynamicCounts = (
  investmentGroups: Array<{ tabId: string }>,
  groupCounts: Array<{ count: number; isLoading: boolean }>
): Record<string, { count: number; isLoading: boolean }> => {
  const counts: Record<string, { count: number; isLoading: boolean }> = {}

  investmentGroups.forEach((group, index) => {
    if (groupCounts[index]) {
      counts[group.tabId] = {
        count: groupCounts[index].count,
        isLoading: groupCounts[index].isLoading
      }
    }
  })

  return counts
}

/**
 * Aggregate state results from multiple hooks into a single map
 */
export const aggregateDynamicStates = (
  investmentGroups: Array<{ tabId: string }>,
  groupStates: any[]
): Record<string, any> => {
  const states: Record<string, any> = {}

  investmentGroups.forEach((group, index) => {
    if (groupStates[index]) {
      states[group.tabId] = groupStates[index]
    }
  })

  return states
}
