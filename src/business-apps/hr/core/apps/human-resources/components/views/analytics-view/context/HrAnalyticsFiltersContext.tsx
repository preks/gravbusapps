import React, { createContext, useContext, useMemo } from 'react'

export interface HrAnalyticsFiltersState {
  selectedCompanyIds: string[]
  setSelectedCompanyIds: (ids: string[]) => void
  companyLabelMap: Record<string, string>
}

const HrAnalyticsFiltersContext = createContext<HrAnalyticsFiltersState | undefined>(undefined)

export function useHrAnalyticsFilters(): HrAnalyticsFiltersState {
  const ctx = useContext(HrAnalyticsFiltersContext)
  if (!ctx) {
    throw new Error('useHrAnalyticsFilters must be used within HrAnalyticsFiltersProvider')
  }
  return ctx
}

interface HrAnalyticsFiltersProviderProps {
  selectedCompanyIds: string[]
  setSelectedCompanyIds: (ids: string[]) => void
  companyLabelMap: Record<string, string>
  children: React.ReactNode
}

export const HrAnalyticsFiltersProvider: React.FC<HrAnalyticsFiltersProviderProps> = ({
  selectedCompanyIds,
  setSelectedCompanyIds,
  companyLabelMap,
  children
}) => {
  const value = useMemo(
    () => ({
      selectedCompanyIds,
      setSelectedCompanyIds,
      companyLabelMap
    }),
    [selectedCompanyIds, setSelectedCompanyIds, companyLabelMap]
  )

  return <HrAnalyticsFiltersContext.Provider value={value}>{children}</HrAnalyticsFiltersContext.Provider>
}
