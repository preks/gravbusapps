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
import type { FlowGraphDefinition } from './flow-viewer/types/viewerTypes'
import { templateToFlowGraphDefinition } from '@/common/data/flow/templateToFlowGraph'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'

interface ReadonlyTemplateFlowCanvasProps {
  accessToken: string
  templateId?: string | null
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  isVisible?: boolean
  executionState?: FlowExecutionState
  showControls?: boolean
  'data-testid'?: string
}

export const ReadonlyTemplateFlowCanvas: React.FC<ReadonlyTemplateFlowCanvasProps> = ({
  accessToken,
  templateId,
  title,
  description,
  emptyTitle,
  emptyDescription,
  isVisible = true,
  executionState,
  showControls = true,
  'data-testid': testId = 'readonly-template-flow-canvas'
}) => {
  const templateClient = useFlowTemplateClient(accessToken)
  const [template, setTemplate] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
      .getTemplate(templateId)
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
  }, [templateClient, templateId])

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
  const resolvedExecutionState = useMemo(() => {
    if (!previewGraphDefinition || !executionState?.activeNodeId) return executionState
    return enrichExecutionStateWithActivePath(previewGraphDefinition, executionState)
  }, [executionState, previewGraphDefinition])
  const hasGraphContent = Boolean(previewGraphDefinition?.nodes?.length)
  const canvasMountKey = `${templateId ?? 'none'}-${isVisible ? 'visible' : 'hidden'}`

  return (
    <Card
      className="gba:flex gba:h-full gba:flex-col gba:overflow-hidden gba:border-border gba:bg-card"
      data-testid={testId}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="gba:flex gba:min-h-[560px] gba:flex-1 gba:flex-col gba:overflow-hidden gba:p-0">
        {!templateId ? (
          <div className="gba:flex gba:min-h-[520px] gba:flex-1 gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:px-6 gba:text-center">
            <h3 className="gba:text-base gba:font-medium gba:text-foreground">{emptyTitle}</h3>
            <p className="gba:max-w-md gba:text-sm gba:text-muted-foreground">{emptyDescription}</p>
          </div>
        ) : isLoading ? (
          <div className="gba:flex gba:min-h-[520px] gba:flex-1 gba:items-center gba:justify-center">
            <Spinner />
          </div>
        ) : error ? (
          <div className="gba:p-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : hasGraphContent && previewGraphDefinition ? (
          <div className="gba:h-full gba:min-h-[560px] gba:w-full gba:flex-1">
            <FlowCanvasProvider key={canvasMountKey} isInteractive={false} executionState={resolvedExecutionState}>
              <FlowCanvas
                definition={previewGraphDefinition}
                useForwardEdgesOnlyForRanking={true}
                fitViewOptions={{ padding: 0.26, minZoom: 0.65, maxZoom: 0.95 }}
                showMiniMap={false}
                showControls={showControls}
              />
            </FlowCanvasProvider>
          </div>
        ) : (
          <div className="gba:flex gba:min-h-[520px] gba:flex-1 gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:px-6 gba:text-center">
            <h3 className="gba:text-base gba:font-medium gba:text-foreground">{emptyTitle}</h3>
            <p className="gba:max-w-md gba:text-sm gba:text-muted-foreground">{emptyDescription}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const enrichExecutionStateWithActivePath = (
  definition: FlowGraphDefinition,
  executionState: FlowExecutionState
): FlowExecutionState => {
  const activeNodeId = executionState.activeNodeId
  if (!activeNodeId) return executionState

  const incomingEdges = new Map<string, Array<{ id: string; source: string }>>()
  definition.edges.forEach(edge => {
    const current = incomingEdges.get(edge.target) ?? []
    current.push({ id: edge.id, source: edge.source })
    incomingEdges.set(edge.target, current)
  })

  const pathNodeIds = new Set<string>([activeNodeId])
  const pathEdgeIds = new Set<string>()
  const queue = [activeNodeId]

  while (queue.length > 0) {
    const targetNodeId = queue.shift()
    if (!targetNodeId) continue

    const parents = incomingEdges.get(targetNodeId) ?? []
    parents.forEach(parent => {
      const parentStatus = executionState.nodeStates[parent.source]
      const shouldIncludeParent =
        parent.source === 'start' ||
        parentStatus === 'completed' ||
        parentStatus === 'active' ||
        parent.source === activeNodeId

      if (!shouldIncludeParent) return

      pathEdgeIds.add(parent.id)
      if (!pathNodeIds.has(parent.source)) {
        pathNodeIds.add(parent.source)
        queue.push(parent.source)
      }
    })
  }

  return {
    ...executionState,
    pathNodeIds: Array.from(pathNodeIds),
    pathEdgeIds: Array.from(pathEdgeIds)
  }
}
