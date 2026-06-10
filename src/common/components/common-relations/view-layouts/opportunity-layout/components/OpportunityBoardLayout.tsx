import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, Spinner } from '@newwork/nw-design-system'
import { KanbanBoard, KanbanItem, KanbanStage } from '@/components/kanban-board'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGenericPipelineStages } from '@/components/kanban-board/hooks/useGenericPipelineStages'
import { startProcess } from '@/common/utils/start-process'
import { FileText } from 'lucide-react'
import type { GenericOpportunityForBoard, OpportunityBoardConfig } from '../config/opportunityBoardTypes'
import { OpportunityDetailSheet } from '@/common/components/common-relations/detail-sheets/opportunity-detail-sheet'

// Click detection thresholds
const CLICK_TIMEOUT_MS = 300 // Maximum duration for a click (vs drag)
const DRAG_THRESHOLD_PX = 5 // Maximum movement distance for a click (vs drag)

export interface OpportunityBoardLayoutProps<T extends GenericOpportunityForBoard> extends BusinessAppContextProps {
  // Configuration
  config: OpportunityBoardConfig

  // Data (already filtered by parent)
  opportunities: T[]
  isLoading?: boolean
  error?: string | null

  // Selected pipeline (controlled by parent/DataDisplay)
  selectedPipelineId: string

  // Refresh callback
  onRefresh?: () => void

  // Optional refresh trigger from parent
  refreshTrigger?: number

  // Custom card renderer
  renderCard?: (opportunity: T) => React.ReactNode

  // Test ID
  dataTestId?: string
}

export function OpportunityBoardLayout<T extends GenericOpportunityForBoard>(
  props: Readonly<OpportunityBoardLayoutProps<T>>
) {
  const {
    accessToken,
    config,
    opportunities,
    isLoading = false,
    error = null,
    selectedPipelineId,
    onRefresh,
    refreshTrigger,
    renderCard,
    dataTestId = 'opportunity-board'
  } = props
  // Track recent process starts to prevent duplicates
  const [recentProcessStarts, setRecentProcessStarts] = useState<Set<string>>(new Set())

  // State for detail sheet
  const [selectedOpportunity, setSelectedOpportunity] = useState<T | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)

  // Track mouse down time and position for click detection
  const mouseDownTime = useRef<number>(0)
  const mouseDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Load stages for selected pipeline
  const { stages, isLoading: isLoadingStages } = useGenericPipelineStages(
    accessToken,
    config.pipelineStageCatalog,
    selectedPipelineId || undefined
  )

  // Refresh when parent triggers
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && onRefresh) {
      onRefresh()
    }
  }, [refreshTrigger, onRefresh])

  // Get stage ID from opportunity (works for both CRM and IRM)
  const getOpportunityStageId = useCallback((opp: T): string => {
    return opp.opportunityPipelineStage?.id || opp.opportunityPipelineStageRef || opp.salesPipelineStageRef || ''
  }, [])

  // Map opportunities to kanban items
  const kanbanItems: KanbanItem[] = useMemo(() => {
    return opportunities.map(opp => ({
      id: opp.id,
      name: opp.name || 'Unnamed Opportunity',
      description: opp.account?.name,
      stageId: getOpportunityStageId(opp),
      position: 0,
      opportunityData: opp
    }))
  }, [opportunities, getOpportunityStageId])

  // Handle card click to open detail sheet
  const handleCardClick = useCallback((opp: T) => {
    setSelectedOpportunity(opp)
    setIsDetailSheetOpen(true)
  }, [])

  // Default card renderer if none provided
  const defaultRenderCard = useCallback(
    (item: KanbanItem) => {
      const opp = item.opportunityData as T
      const amount = opp.forecastedProfitAmount || opp.estimatedAmount || 0
      const formattedAmount = config.formatCurrency
        ? config.formatCurrency(amount)
        : new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: opp.currency?.code || 'EUR',
            notation: 'compact',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
          }).format(amount)

      return (
        <button
          type="button"
          className="gba:bg-white gba:dark:bg-gray-800 gba:rounded-md gba:shadow-sm gba:border gba:border-gray-200 gba:dark:border-gray-700 gba:p-3 gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow gba:w-full gba:text-left"
          data-testid={`opportunity-card-${opp.id}`}
          onClick={e => {
            e.stopPropagation()
            handleCardClick(opp)
          }}
        >
          <h4 className="gba:font-medium gba:text-sm gba:line-clamp-2 gba:mb-2">{opp.name || 'Unnamed Opportunity'}</h4>
          <p className="gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:line-clamp-1">
            {opp.account?.name || '-'}
          </p>
          <div className="gba:mt-2 gba:font-bold gba:text-sm">{formattedAmount}</div>
        </button>
      )
    },
    [config.formatCurrency, handleCardClick]
  )

  // Wrapped card renderer that adds click handling to any card (custom or default)
  const wrappedRenderCard = useCallback(
    (item: KanbanItem) => {
      const opp = item.opportunityData as T
      const cardContent = renderCard ? renderCard(opp) : defaultRenderCard(item)

      // If using custom renderCard, wrap it with click handler
      // We use onMouseDown + onMouseUp with timing to distinguish clicks from drags
      if (renderCard) {
        return (
          <button
            type="button"
            className="gba:cursor-pointer gba:hover:opacity-90 gba:transition-opacity gba:w-full gba:bg-transparent gba:border-none gba:p-0 gba:font-inherit gba:text-inherit gba:text-left"
            onMouseDown={e => {
              mouseDownTime.current = Date.now()
              mouseDownPos.current = { x: e.clientX, y: e.clientY }
            }}
            onMouseUp={e => {
              const timeDiff = Date.now() - mouseDownTime.current
              const dx = Math.abs(e.clientX - mouseDownPos.current.x)
              const dy = Math.abs(e.clientY - mouseDownPos.current.y)

              // If quick click and minimal movement, treat as click (not drag)
              if (timeDiff < CLICK_TIMEOUT_MS && dx < DRAG_THRESHOLD_PX && dy < DRAG_THRESHOLD_PX) {
                e.stopPropagation()
                handleCardClick(opp)
              }
            }}
          >
            {cardContent}
          </button>
        )
      }

      // Default card already has click handler built in
      return cardContent
    },
    [renderCard, defaultRenderCard, handleCardClick]
  )

  // Custom stage header with totals
  const renderStageHeader = useCallback(
    (stage: KanbanStage, itemCount: number) => {
      const stageOpportunities = opportunities.filter(opp => getOpportunityStageId(opp) === stage.id)
      const totalAmount = stageOpportunities.reduce(
        (sum, opp) => sum + (opp.forecastedProfitAmount || opp.estimatedAmount || 0),
        0
      )

      const formattedTotal = config.formatCurrency
        ? config.formatCurrency(totalAmount)
        : new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: stageOpportunities[0]?.currency?.code || 'EUR',
            notation: 'compact',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
          }).format(totalAmount)

      return (
        <div>
          <div className="gba:flex gba:items-center gba:justify-between">
            <h3 className="gba:font-medium gba:text-sm" data-testid={`stage-title-${stage.id}`}>
              {stage.name}
            </h3>
          </div>
          <div className="gba:flex gba:justify-between gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:pt-1">
            <div>
              <span className="gba:font-medium" data-testid={`stage-total-${stage.id}`}>
                {formattedTotal}
              </span>
            </div>
            <div>
              <span className="gba:font-medium">{itemCount}</span> {itemCount === 1 ? 'opportunity' : 'opportunities'}
            </div>
          </div>
        </div>
      )
    },
    [opportunities, getOpportunityStageId, config.formatCurrency]
  )

  // Handle drag end events
  const handleDragEnd = useCallback(
    (itemId: string, toStageId: string) => {
      const opportunity = opportunities.find(op => op.id === itemId)
      if (!opportunity) return

      const currentStageId = getOpportunityStageId(opportunity)
      if (currentStageId === toStageId) {
        return // Same stage - no action needed
      }

      // Different stage - start transition process if configured
      if (config.processConfig) {
        const transitionKey = `${itemId}-${currentStageId}-${toStageId}`

        if (recentProcessStarts.has(transitionKey)) {
          return // Prevent duplicate process starts
        }

        setRecentProcessStarts(prev => new Set(prev).add(transitionKey))

        setTimeout(() => {
          setRecentProcessStarts(prev => {
            const newSet = new Set(prev)
            newSet.delete(transitionKey)
            return newSet
          })
        }, 3000)

        startProcess({
          domain: config.processConfig.domain,
          processName: config.processConfig.processName,
          payload: config.processConfig.buildPayload(itemId, toStageId),
          builderType: 'NATIVE_SCREEN'
        })

        // Refresh data after transition
        setTimeout(() => {
          onRefresh?.()
        }, 1000)
      }
    },
    [opportunities, getOpportunityStageId, config.processConfig, recentProcessStarts, onRefresh]
  )

  // Loading state
  if (isLoadingStages) {
    return (
      <Card data-testid={`${dataTestId}-loading`}>
        <CardContent className="gba:p-8">
          <div className="gba:flex gba:items-center gba:justify-center gba:text-center">
            <div>
              <Spinner size="lg" />
              <p className="gba:mt-4 gba:text-gray-500">Loading pipeline stages...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No stages
  if (stages.length === 0) {
    return (
      <Card data-testid="no-stages-message">
        <CardContent className="gba:p-8">
          <div className="gba:text-center">
            <div className="gba:flex gba:justify-center gba:mb-4">
              <FileText className="gba:h-16 gba:w-16 gba:text-gray-400" />
            </div>
            <h3 className="gba:text-xl gba:font-semibold gba:text-gray-700 gba:mb-2">No Stages for This Pipeline</h3>
            <p className="gba:text-gray-500 gba:mb-4">This pipeline doesn't have any stages configured yet.</p>
            <p className="gba:text-sm gba:text-gray-400">
              Configure stages in the pipeline settings to start organizing opportunities.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="gba:p-8">
          <div className="gba:text-center">
            <div className="gba:text-red-500 gba:text-6xl gba:mb-4">⚠️</div>
            <h3 className="gba:text-xl gba:font-semibold gba:text-gray-700 gba:mb-2">Error Loading Opportunities</h3>
            <p className="gba:text-gray-500 gba:mb-4">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded gba:hover:bg-blue-600"
              >
                Retry
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render the board
  return (
    <div data-testid={dataTestId}>
      <KanbanBoard
        stages={stages}
        items={kanbanItems}
        onDragEnd={handleDragEnd}
        renderCard={wrappedRenderCard}
        renderStageHeader={renderStageHeader}
        loading={isLoading}
        allowReorderWithinStage={false}
        className="gba:w-full"
      />

      {/* Opportunity Detail Sheet */}
      <OpportunityDetailSheet
        opportunity={selectedOpportunity as any}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        data-testid="opportunity-board-detail-sheet"
      />
    </div>
  )
}

export default OpportunityBoardLayout
