import { useState, useCallback } from 'react'

export type GrowthMetric = 'accountsCreated' | 'accountsWithOpportunities'

export const GROWTH_METRIC_LABELS: Record<GrowthMetric, string> = {
  accountsCreated: 'New Accounts',
  accountsWithOpportunities: 'Accounts with Opportunities'
}

export interface GrowthBarSelection {
  month: string
  date: string
  metric: GrowthMetric
}

export interface AccountGrowthDrillDownState {
  selectedGrowthBar: GrowthBarSelection | null
  handleGrowthBarClick: (month: string, date: string, metric: GrowthMetric) => void
  handleGrowthBarClose: () => void
}

export const useAccountGrowthDrillDownState = (): AccountGrowthDrillDownState => {
  const [selectedGrowthBar, setSelectedGrowthBar] = useState<GrowthBarSelection | null>(null)

  const handleGrowthBarClick = useCallback((month: string, date: string, metric: GrowthMetric) => {
    setSelectedGrowthBar({ month, date, metric })
  }, [])

  const handleGrowthBarClose = useCallback(() => {
    setSelectedGrowthBar(null)
  }, [])

  return { selectedGrowthBar, handleGrowthBarClick, handleGrowthBarClose }
}
