import { useState, useCallback } from 'react'

export type LifecycleMetric = 'opportunitiesCreated' | 'opportunitiesWon'

export const LIFECYCLE_METRIC_LABELS: Record<LifecycleMetric, string> = {
  opportunitiesCreated: 'Opportunities Created',
  opportunitiesWon: 'Opportunities Won'
}

export interface LifecycleDrillDownSelection {
  label: string
  startDate: string
  endDate: string
  metric: LifecycleMetric
  pipelineId?: string
}

export interface LifecycleDrillDownState {
  selectedLifecyclePoint: LifecycleDrillDownSelection | null
  handleLifecyclePointClick: (
    date: string,
    startDate: string,
    endDate: string,
    metric: LifecycleMetric,
    pipelineId?: string
  ) => void
  handleLifecyclePointClose: () => void
  updateLifecyclePipeline: (pipelineId?: string) => void
}

export const useLifecycleDrillDownState = (): LifecycleDrillDownState => {
  const [selectedLifecyclePoint, setSelectedLifecyclePoint] = useState<LifecycleDrillDownSelection | null>(null)

  const handleLifecyclePointClick = useCallback(
    (date: string, startDate: string, endDate: string, metric: LifecycleMetric, pipelineId?: string) => {
      setSelectedLifecyclePoint({ label: date, startDate, endDate, metric, pipelineId })
    },
    []
  )

  const handleLifecyclePointClose = useCallback(() => {
    setSelectedLifecyclePoint(null)
  }, [])

  const updateLifecyclePipeline = useCallback((pipelineId?: string) => {
    setSelectedLifecyclePoint(prev => (prev ? { ...prev, pipelineId } : null))
  }, [])

  return {
    selectedLifecyclePoint,
    handleLifecyclePointClick,
    handleLifecyclePointClose,
    updateLifecyclePipeline
  }
}
