import { useState, useCallback } from 'react'

export type LeadLifecycleMetric = 'leadsCreated' | 'leadsConverted' | 'leadsLost'

export const LEAD_LIFECYCLE_METRIC_LABELS: Record<LeadLifecycleMetric, string> = {
  leadsCreated: 'Leads Created',
  leadsConverted: 'Leads Converted',
  leadsLost: 'Leads Lost'
}

export interface LeadLifecyclePointSelection {
  label: string
  date: string
  endDate: string
  metric: LeadLifecycleMetric
}

export interface LeadLifecycleDrillDownState {
  selectedLeadLifecyclePoint: LeadLifecyclePointSelection | null
  handleLeadLifecyclePointClick: (label: string, date: string, endDate: string, metric: LeadLifecycleMetric) => void
  handleLeadLifecyclePointClose: () => void
}

export const useLeadLifecycleDrillDownState = (): LeadLifecycleDrillDownState => {
  const [selectedLeadLifecyclePoint, setSelectedLeadLifecyclePoint] = useState<LeadLifecyclePointSelection | null>(null)

  const handleLeadLifecyclePointClick = useCallback(
    (label: string, date: string, endDate: string, metric: LeadLifecycleMetric) => {
      setSelectedLeadLifecyclePoint({ label, date, endDate, metric })
    },
    []
  )

  const handleLeadLifecyclePointClose = useCallback(() => {
    setSelectedLeadLifecyclePoint(null)
  }, [])

  return { selectedLeadLifecyclePoint, handleLeadLifecyclePointClick, handleLeadLifecyclePointClose }
}
