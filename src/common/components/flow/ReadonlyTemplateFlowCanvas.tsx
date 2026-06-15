import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner
} from '@newwork/nw-design-system'
import { FlowCanvas } from './flow-viewer/FlowViewer'
import { FlowCanvasProvider } from './flow-viewer/FlowViewerProvider'
import type { FlowExecutionState } from './flow-viewer/types/viewerTypes'
import { enrichExecutionStateWithActivePath, enrichExecutionStateWithCompletedPath } from './flowPathEnrichment'
import { templateToFlowGraphDefinition } from '@/common/data/flow/templateToFlowGraph'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'

interface ReadonlyTemplateFlowCanvasProps {
  accessToken: string
  templateId?: string | null
  templateVersion?: number | null
  templateDefinition?: Record<string, unknown> | null
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  isVisible?: boolean
  executionState?: FlowExecutionState
  selectedNodeId?: string | null
  selectedStepReference?: string | null
  /** When provided, nodes become clickable and report their id (null on pane click). */
  onNodeSelect?: (nodeId: string | null) => void
  compact?: boolean
  showControls?: boolean
  showMiniMap?: boolean
  /** Interactive zoom-out floor for the canvas. Defaults to React Flow's 0.5. */
  minZoom?: number
  /** Interactive zoom-in ceiling for the canvas. Defaults to React Flow's 2. */
  maxZoom?: number
  /** Hide the card header (title/description) so the flow fills the full height. */
  hideHeader?: boolean
  /** Override the outer Card className (e.g. for a borderless full-bleed canvas). */
  className?: string
  'data-testid'?: string
}

export const ReadonlyTemplateFlowCanvas: React.FC<ReadonlyTemplateFlowCanvasProps> = ({
  accessToken,
  templateId,
  templateVersion,
  templateDefinition,
  title,
  description,
  emptyTitle,
  emptyDescription,
  isVisible = true,
  executionState,
  selectedNodeId,
  selectedStepReference,
  onNodeSelect,
  compact = false,
  showControls = true,
  showMiniMap = false,
  minZoom,
  maxZoom,
  hideHeader = false,
  className,
  'data-testid': testId = 'readonly-template-flow-canvas'
}) => {
  const templateClient = useFlowTemplateClient(accessToken)
  const [template, setTemplate] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (templateDefinition) {
      setTemplate(templateDefinition)
      setError(null)
      setIsLoading(false)
      return
    }

    if (!templateId) {
      setTemplate(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    templateClient
      .getTemplate(templateId, templateVersion ?? undefined)
      .then(nextTemplate => {
        if (!cancelled) setTemplate(nextTemplate)
      })
      .catch(nextError => {
        if (!cancelled) {
          setTemplate(null)
          setError(nextError instanceof Error ? nextError.message : 'Failed to load template')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [templateClient, templateDefinition, templateId, templateVersion])

  const graphDefinition = useMemo(() => {
    if (!template) return null
    return templateToFlowGraphDefinition({
      steps: template.steps ?? [],
      start: template.start,
      summaryFieldsCount: Array.isArray(template.summaryFields) ? template.summaryFields.length : 0
    })
  }, [template])
  const previewGraphDefinition = useMemo(() => {
    if (!graphDefinition) return null

    return {
      ...graphDefinition,
      nodes: graphDefinition.nodes.map(node => ({
        ...node,
        metadata: node.metadata ? { ...node.metadata, stepNumber: undefined } : node.metadata
      }))
    }
  }, [graphDefinition])
  const resolvedSelectedNodeId = useMemo(() => {
    if (selectedNodeId) return selectedNodeId
    const reference = String(selectedStepReference || '').trim()
    if (!reference || !template?.steps?.length) return null

    const matchedIndex = template.steps.findIndex((step: { reference?: string; id?: string }, index: number) => {
      const candidates = [String(step?.reference || '').trim(), String(step?.id || '').trim(), `step_${index}`].filter(
        Boolean
      )
      return candidates.includes(reference)
    })

    return matchedIndex >= 0 ? `step-${matchedIndex}` : null
  }, [selectedNodeId, selectedStepReference, template])
  const resolvedExecutionState = useMemo(() => {
    if (!previewGraphDefinition || !executionState) return executionState
    if (executionState.activeNodeId) {
      return enrichExecutionStateWithActivePath(previewGraphDefinition, executionState)
    }
    // No active node means the flow has settled (e.g. the end of a replay):
    // bold the full route it took instead of leaving the path unhighlighted.
    const hasExecuted = Object.values(executionState.nodeStates).some(
      status => status === 'completed' || status === 'failed'
    )
    if (hasExecuted) {
      return enrichExecutionStateWithCompletedPath(previewGraphDefinition, executionState)
    }
    return executionState
  }, [executionState, previewGraphDefinition])
  const hasGraphContent = Boolean(previewGraphDefinition?.nodes?.length)
  // Interactive selection is controlled at runtime (node clicks) and must not
  // remount/relayout the canvas on each click; only fold selection into the
  // mount key for deep-link (non-interactive) selection.
  const selectionKeyPart = onNodeSelect ? 'interactive' : (resolvedSelectedNodeId ?? 'no-selection')
  const canvasMountKey = [
    templateId ?? 'none',
    templateVersion ?? 'latest',
    isVisible ? 'visible' : 'hidden',
    selectionKeyPart,
    previewGraphDefinition?.nodes?.length ?? 0,
    previewGraphDefinition?.edges?.length ?? 0,
    compact ? 'compact' : 'full'
  ].join('-')
  const canvasHeightClass = compact ? 'gba:h-[320px]' : 'gba:h-[560px]'
  const emptyStateMinHeightClass = compact ? 'gba:min-h-[280px]' : 'gba:min-h-[520px]'
  const isFullBleed = hideHeader || Boolean(className?.includes('gba:h-full'))

  return (
    <Card
      className={className ?? 'gba:flex gba:flex-col gba:overflow-hidden gba:border-border gba:bg-card'}
      data-testid={testId}
    >
      {!hideHeader && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      )}
      <CardContent
        className={`gba:flex gba:flex-col gba:overflow-hidden gba:p-0 ${
          isFullBleed ? 'gba:flex-1' : 'gba:shrink-0'
        } ${isFullBleed ? '' : canvasHeightClass}`}
      >
        {!templateId && !templateDefinition ? (
          <div
            className={`gba:flex gba:flex-1 gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:px-6 gba:text-center ${emptyStateMinHeightClass}`}
          >
            <h3 className="gba:text-base gba:font-medium gba:text-foreground">{emptyTitle}</h3>
            <p className="gba:max-w-md gba:text-sm gba:text-muted-foreground">{emptyDescription}</p>
          </div>
        ) : isLoading ? (
          <div className={`gba:flex gba:flex-1 gba:items-center gba:justify-center ${emptyStateMinHeightClass}`}>
            <Spinner />
          </div>
        ) : error ? (
          <div className="gba:p-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : hasGraphContent && previewGraphDefinition ? (
          <div
            className={
              isFullBleed ? 'gba:h-full gba:w-full gba:flex-1' : `gba:relative gba:w-full ${canvasHeightClass}`
            }
          >
            <div className={isFullBleed ? 'gba:h-full gba:w-full' : 'gba:absolute gba:inset-0'}>
              <FlowCanvasProvider
                key={canvasMountKey}
                isInteractive={false}
                executionState={resolvedExecutionState}
                selectedNodeId={resolvedSelectedNodeId}
              >
                <FlowCanvas
                  definition={previewGraphDefinition}
                  useForwardEdgesOnlyForRanking={true}
                  fitViewOptions={{ padding: 0.26, minZoom: 0.65, maxZoom: 0.95 }}
                  minZoom={minZoom}
                  maxZoom={maxZoom}
                  showMiniMap={showMiniMap}
                  showControls={showControls}
                  {...(onNodeSelect
                    ? {
                        elementsSelectable: true,
                        onNodeClick: (_event: React.MouseEvent, node: { id: string }) => onNodeSelect(node.id),
                        onPaneClick: () => onNodeSelect(null)
                      }
                    : {})}
                />
              </FlowCanvasProvider>
            </div>
          </div>
        ) : (
          <div
            className={`gba:flex gba:flex-1 gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:px-6 gba:text-center ${emptyStateMinHeightClass}`}
          >
            <h3 className="gba:text-base gba:font-medium gba:text-foreground">{emptyTitle}</h3>
            <p className="gba:max-w-md gba:text-sm gba:text-muted-foreground">{emptyDescription}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
