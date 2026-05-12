import { useState, useCallback } from 'react'

export type RevenueMetric = 'pipelineRevenue' | 'wonRevenue'

export const REVENUE_METRIC_LABELS: Record<RevenueMetric, string> = {
  pipelineRevenue: 'Pipeline Revenue',
  wonRevenue: 'Won Revenue'
}

export interface RevenueTrendPointSelection {
  label: string
  startDate: string
  endDate: string
  metric: RevenueMetric
  pipelineId?: string
  currencyCode?: string
}

export interface RevenueDrillDownState {
  selectedRevenueTrendPoint: RevenueTrendPointSelection | null
  handleRevenueTrendPointClick: (
    label: string,
    startDate: string,
    endDate: string,
    metric: RevenueMetric,
    pipelineId?: string,
    currencyCode?: string
  ) => void
  handleRevenueTrendPointClose: () => void
  updateRevenuePipelineAndCurrency: (pipelineId?: string, currencyCode?: string) => void
}

export const useRevenueDrillDownState = (): RevenueDrillDownState => {
  const [selectedRevenueTrendPoint, setSelectedRevenueTrendPoint] = useState<RevenueTrendPointSelection | null>(null)

  const handleRevenueTrendPointClick = useCallback(
    (
      label: string,
      startDate: string,
      endDate: string,
      metric: RevenueMetric,
      pipelineId?: string,
      currencyCode?: string
    ) => {
      setSelectedRevenueTrendPoint({ label, startDate, endDate, metric, pipelineId, currencyCode })
    },
    []
  )

  const handleRevenueTrendPointClose = useCallback(() => {
    setSelectedRevenueTrendPoint(null)
  }, [])

  const updateRevenuePipelineAndCurrency = useCallback((pipelineId?: string, currencyCode?: string) => {
    setSelectedRevenueTrendPoint(prev => (prev ? { ...prev, pipelineId, currencyCode } : null))
  }, [])

  return {
    selectedRevenueTrendPoint,
    handleRevenueTrendPointClick,
    handleRevenueTrendPointClose,
    updateRevenuePipelineAndCurrency
  }
}
