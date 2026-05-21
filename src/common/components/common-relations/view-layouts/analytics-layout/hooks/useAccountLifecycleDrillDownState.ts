import { useState, useCallback } from 'react'

export type LifecycleMetric = 'accountsCreated' | 'accountsWithOpportunities'

export const LIFECYCLE_METRIC_LABELS: Record<LifecycleMetric, string> = {
  accountsCreated: 'Accounts Created',
  accountsWithOpportunities: 'Accounts with Opportunities'
}

export interface LifecyclePointSelection {
  label: string
  date: string
  endDate: string
  metric: LifecycleMetric
}

export interface AccountLifecycleDrillDownState {
  selectedLifecyclePoint: LifecyclePointSelection | null
  handleLifecyclePointClick: (label: string, date: string, endDate: string, metric: LifecycleMetric) => void
  handleLifecyclePointClose: () => void
}

export const useAccountLifecycleDrillDownState = (): AccountLifecycleDrillDownState => {
  const [selectedLifecyclePoint, setSelectedLifecyclePoint] = useState<LifecyclePointSelection | null>(null)

  const handleLifecyclePointClick = useCallback(
    (label: string, date: string, endDate: string, metric: LifecycleMetric) => {
      setSelectedLifecyclePoint({ label, date, endDate, metric })
    },
    []
  )

  const handleLifecyclePointClose = useCallback(() => {
    setSelectedLifecyclePoint(null)
  }, [])

  return { selectedLifecyclePoint, handleLifecyclePointClick, handleLifecyclePointClose }
}
