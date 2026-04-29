import { useMemo } from 'react'
import { useInvestmentGroups } from './useInvestmentGroups'
import type { InvestmentGroup } from './useInvestmentGroups'
import {
  buildAggregatedInvestmentListColumnConfiguration,
  type InvestmentListColumnConfiguration
} from '../utils/investmentListColumnTransformer'

export interface InvestmentViewCatalogState {
  investmentGroups: InvestmentGroup[]
  catalogData: ReturnType<typeof useInvestmentGroups>['catalogData']
  groupsLoading: boolean
  dynamicColumnConfigByTab: Record<string, InvestmentListColumnConfiguration>
  activeGroup: InvestmentGroup | undefined
  activeColumnConfig: InvestmentListColumnConfiguration | undefined
}

export const useInvestmentViewCatalog = (accessToken: string, currentSection: string): InvestmentViewCatalogState => {
  const { investmentGroups, catalogData, isLoading: groupsLoading } = useInvestmentGroups(accessToken)

  const dynamicColumnConfigByTab = useMemo(
    () =>
      investmentGroups.reduce(
        (acc, group) => {
          acc[group.tabId] = buildAggregatedInvestmentListColumnConfiguration(group, catalogData)
          return acc
        },
        {} as Record<string, InvestmentListColumnConfiguration>
      ),
    [catalogData, investmentGroups]
  )

  const activeGroup = useMemo(
    () => investmentGroups.find(group => group.tabId === currentSection),
    [currentSection, investmentGroups]
  )
  const activeColumnConfig = currentSection === 'overview' ? undefined : dynamicColumnConfigByTab[currentSection]

  return {
    investmentGroups,
    catalogData,
    groupsLoading,
    dynamicColumnConfigByTab,
    activeGroup,
    activeColumnConfig
  }
}
