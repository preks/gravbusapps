import { useMemo } from 'react'
import { useTemplatePerformanceAnalytics } from './useFlowAnalytics'
import { useFlowTemplateOptions } from './useFlowTemplateOptions'
import type { SuccessTimeframe } from '../utils/timeframe'

interface FlowSuccessContextOption {
  id: string
  name: string
}

type FlowSuccessEmptyStateReason = 'none' | 'no-flows' | 'no-analytics' | 'selected-flow-no-analytics'

interface UseFlowSuccessContextArgs {
  accessToken: string
  timeframe: SuccessTimeframe
  templateId: string
  allFlowsLabel: string
  dynamicFlowLabel: string
}

export interface FlowSuccessContextData {
  selectedFlowLabel: string
  comboboxOptions: Array<{ value: string; label: string }>
  allFlowOptions: FlowSuccessContextOption[]
  analyticsFlowOptions: FlowSuccessContextOption[]
  analyticsScopedTemplateId?: string
  isDynamicFlow: boolean
  hasAnalyticsData: boolean
  emptyStateReason: FlowSuccessEmptyStateReason
  isLoading: boolean
}

const dedupeFlowOptions = (options: FlowSuccessContextOption[]) => {
  const seen = new Set<string>()
  return options.filter(option => {
    if (!option.id || seen.has(option.id)) return false
    seen.add(option.id)
    return true
  })
}

export const useFlowSuccessContext = ({
  accessToken,
  timeframe,
  templateId,
  allFlowsLabel,
  dynamicFlowLabel
}: UseFlowSuccessContextArgs): FlowSuccessContextData => {
  const { data: catalogFlowOptions, isLoading: catalogLoading } = useFlowTemplateOptions(accessToken)
  const { data: analyticsFlowData, isLoading: analyticsLoading } = useTemplatePerformanceAnalytics({
    accessToken,
    timeframe,
    limit: 100,
    offset: 0,
    sortBy: 'totalWorkflows',
    sortOrder: 'desc'
  })

  const analyticsFlowOptions = useMemo(
    () =>
      dedupeFlowOptions(
        (analyticsFlowData?.templates || []).map(flow => ({
          id: flow.templateId,
          name: flow.templateId === 'DYNAMIC' ? dynamicFlowLabel : flow.templateName
        }))
      ),
    [analyticsFlowData?.templates, dynamicFlowLabel]
  )

  const allFlowOptions = useMemo(() => {
    const mergedOptions = [...catalogFlowOptions]

    analyticsFlowOptions.forEach(option => {
      if (!mergedOptions.some(existingOption => existingOption.id === option.id)) {
        mergedOptions.push(option)
      }
    })

    return dedupeFlowOptions(mergedOptions)
  }, [analyticsFlowOptions, catalogFlowOptions])

  const selectedFlowOption = useMemo(
    () =>
      allFlowOptions.find(option => option.id === templateId) ||
      analyticsFlowOptions.find(option => option.id === templateId),
    [allFlowOptions, analyticsFlowOptions, templateId]
  )

  const selectedFlowLabel = templateId === 'ALL' ? allFlowsLabel : selectedFlowOption?.name || templateId
  const hasAnalyticsData =
    templateId === 'ALL'
      ? analyticsFlowOptions.length > 0
      : analyticsFlowOptions.some(option => option.id === templateId)
  const emptyStateReason: FlowSuccessEmptyStateReason = !allFlowOptions.length
    ? 'no-flows'
    : analyticsFlowOptions.length === 0
      ? 'no-analytics'
      : templateId !== 'ALL' && !hasAnalyticsData
        ? 'selected-flow-no-analytics'
        : 'none'

  return {
    selectedFlowLabel,
    comboboxOptions: [
      { value: 'ALL', label: allFlowsLabel },
      ...allFlowOptions.map(option => ({ value: option.id, label: option.name }))
    ],
    allFlowOptions,
    analyticsFlowOptions,
    analyticsScopedTemplateId: templateId !== 'ALL' ? templateId : undefined,
    isDynamicFlow: templateId === 'DYNAMIC',
    hasAnalyticsData,
    emptyStateReason,
    isLoading: catalogLoading || analyticsLoading
  }
}
