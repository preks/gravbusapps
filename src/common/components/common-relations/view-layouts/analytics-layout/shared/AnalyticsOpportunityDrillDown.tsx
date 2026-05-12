import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { OpportunityLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import { createOpportunityConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/opportunityConfigBuilder'
import { StageDrillDownPanel } from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/StageDrillDownPanel'
import type { StageSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useStageDrillDownState'
import { opportunityFilterConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityFilters'
import type { FlowContextName } from '@/common/types/FlowRegistryTypes'

const BUCKET_STATUS_OPTIONS: Record<string, { id: string; label: string }> = {
  open: { id: 'BUCKET:open', label: 'Open' },
  won: { id: 'BUCKET:won', label: 'Won' },
  lost: { id: 'BUCKET:lost', label: 'Lost' }
}

const buildPreseededStatusConfig = (option: { id: string; label: string }) => ({
  ...opportunityFilterConfig,
  groups: opportunityFilterConfig.groups.map(group => {
    if (group.id !== 'status-group') return group
    return {
      ...group,
      filters: group.filters.map(filter => {
        if (filter.id !== 'opportunityStatusIds') return filter
        return { ...filter, config: { options: [option] } }
      })
    }
  })
})

/**
 * All module-specific (CRM / IRM) building blocks, passed once per view.
 * The component builds the full OpportunityViewConfig internally so no
 * adapter component files are needed.
 */
export interface OpportunityModuleConfig {
  contextType: 'customer' | 'investment'
  fetchOpportunities: (variables: any) => Promise<any>
  filterHook: (context: BusinessAppContextProps) => any
  viewDescriptors: any
  columnMappings: { pipeline: string; stage: string }
  flowContexts: {
    entity: FlowContextName
    create: FlowContextName
    createContextData?: Record<string, any>
  }
  urlPaths: {
    opportunityRecord: string
    accountRecord: string
    source: string
  }
  boardConfig?: any
  fetchBoardOpportunities?: (variables: any) => Promise<any>
  extractBoardOpportunities?: (result: any) => any[]
  extractBoardTotalCount?: (result: any) => number
  rowActionsContextArray?: FlowContextName[]
  buildRowActionsExternalContextData?: (row: { original: any }) => Record<string, string>
  extendedColumnIds?: string[]
  createColumns?: () => any[]
  /** Extra sortable columns merged after the base set (e.g. CRM-specific). */
  additionalSortableColumns?: { id: string; [key: string]: any }[]
}

export interface AnalyticsOpportunityDrillDownProps {
  context: BusinessAppContextProps
  opportunityModuleConfig: OpportunityModuleConfig
  selection: StageSelection
  onClose: () => void
  moduleColor?: string
  /** The module-specific status ID used to pre-select "Open" in the filter panel. */
  openStatusId: string
  openPipelineOnly?: boolean
  statusBucket?: 'open' | 'won' | 'lost'
  pipelineId?: string
  additionalInitialFilters?: Record<string, any>
  titleOverride?: string
  cacheKey?: string
  defaultCurrency?: string
  dataTestId: string
}

export const AnalyticsOpportunityDrillDown: React.FC<AnalyticsOpportunityDrillDownProps> = ({
  context,
  opportunityModuleConfig,
  selection,
  onClose,
  moduleColor = 'default',
  openStatusId,
  openPipelineOnly = true,
  statusBucket,
  pipelineId,
  additionalInitialFilters,
  titleOverride,
  cacheKey,
  defaultCurrency,
  dataTestId
}) => {
  const config = useMemo(() => {
    const baseConfig = createOpportunityConfig({
      contextType: opportunityModuleConfig.contextType,
      fetchOpportunities: opportunityModuleConfig.fetchOpportunities,
      extendQueryVariables: statusBucket
        ? (vars: any) => {
            if (statusBucket === 'open') return { ...vars, activeOnly: true }
            if (statusBucket === 'won') return { ...vars, opportunityStatusTypesIn: ['WON'] }
            return { ...vars, opportunityStatusTypesIn: ['LOST'] }
          }
        : undefined,
      filterDataHook: opportunityModuleConfig.filterHook,
      viewDescriptors: opportunityModuleConfig.viewDescriptors,
      columnMappings: opportunityModuleConfig.columnMappings,
      flowContexts: opportunityModuleConfig.flowContexts,
      urlPaths: opportunityModuleConfig.urlPaths,
      boardConfig: opportunityModuleConfig.boardConfig,
      fetchBoardOpportunities: opportunityModuleConfig.fetchBoardOpportunities!,
      extractBoardOpportunities: opportunityModuleConfig.extractBoardOpportunities!,
      extractBoardTotalCount: opportunityModuleConfig.extractBoardTotalCount!,
      rowActionsContextArray: opportunityModuleConfig.rowActionsContextArray!,
      buildRowActionsExternalContextData: opportunityModuleConfig.buildRowActionsExternalContextData!
    })

    const bucketOption = statusBucket ? BUCKET_STATUS_OPTIONS[statusBucket] : null
    const preseededOpenConfig = buildPreseededStatusConfig({ id: openStatusId, label: 'Open' })
    const fallbackFilterConfig = openPipelineOnly ? preseededOpenConfig : opportunityFilterConfig
    const baseFilterConfig = bucketOption ? buildPreseededStatusConfig(bucketOption) : fallbackFilterConfig

    return {
      ...baseConfig,
      baseFilterConfig,
      ...(opportunityModuleConfig.createColumns && {
        createColumns: opportunityModuleConfig.createColumns
      }),
      ...(opportunityModuleConfig.additionalSortableColumns?.length && {
        createSortableColumns: (availableColumnIds?: string[]) => {
          const baseSortable = baseConfig.createSortableColumns(availableColumnIds)
          const extra = (opportunityModuleConfig.additionalSortableColumns ?? []).filter(
            col => !availableColumnIds || availableColumnIds.includes(col.id)
          ) as { id: string; label: string }[]
          return [...baseSortable, ...extra]
        }
      })
    }
  }, [opportunityModuleConfig, statusBucket, openPipelineOnly, openStatusId])

  const initialFilters: Record<string, string[]> = {}

  if (statusBucket) {
    initialFilters.opportunityStatusIds = [BUCKET_STATUS_OPTIONS[statusBucket].id]
  } else {
    if (selection.stageRef) {
      initialFilters.opportunityPipelineStageIds = [selection.stageRef]
    }
    if (openPipelineOnly) {
      initialFilters.opportunityStatusIds = [openStatusId]
    }
  }

  if (pipelineId) {
    initialFilters.opportunityPipelineIds = [pipelineId]
  }

  const mergedFilters = additionalInitialFilters ? { ...initialFilters, ...additionalInitialFilters } : initialFilters

  return (
    <StageDrillDownPanel
      stage={selection.stage}
      titleOverride={titleOverride}
      onClose={onClose}
      moduleColor={moduleColor}
    >
      <OpportunityLayout
        key={cacheKey ?? statusBucket ?? `${selection.stageRef}-${pipelineId ?? 'all'}`}
        context={context}
        config={config}
        dataTestId={dataTestId}
        initialFilters={mergedFilters}
        extendVisibleColumns={opportunityModuleConfig.extendedColumnIds}
        customPrimaryAction={<></>}
        hideBoard
        defaultCurrency={defaultCurrency}
      />
    </StageDrillDownPanel>
  )
}

export default AnalyticsOpportunityDrillDown
