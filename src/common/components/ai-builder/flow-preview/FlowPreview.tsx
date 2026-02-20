import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Alert,
  AlertDescription,
  Badge,
  Button
} from '@newwork/nw-design-system'
import { Workflow, Play, X, Flag, CircleDot } from 'lucide-react'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import { FlowCanvasProvider, FlowCanvas } from '@/common/components/flow'
import { templateToFlowGraphDefinition, flowNodeIdToStepIndex } from '@/common/data/flow/templateToFlowGraph'
import { FlowPreviewStepPanel } from './FlowPreviewStepPanel'
import type { FlowPreviewTemplate } from './flowPreviewTypes'

const START_NODE_ID = 'start'
const END_NODE_ID = 'end'

export interface FlowPreviewProps {
  accessToken: string
  /** Preloaded template (e.g. demo). When provided, flowId is ignored. */
  template?: FlowPreviewTemplate | null
  /** When template is not provided, fetch by this id. */
  flowId?: string
  'data-testid'?: string
}

export const FlowPreview: React.FC<FlowPreviewProps> = ({
  accessToken,
  template: templateProp,
  flowId,
  'data-testid': testId = 'flow-preview'
}) => {
  const client = useFlowTemplateClient(accessToken)
  const [template, setTemplate] = useState<FlowPreviewTemplate | null>(templateProp ?? null)
  const [loading, setLoading] = useState(templateProp == null && !!flowId)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    if (templateProp != null) {
      setTemplate(templateProp)
      setLoading(false)
      setError(null)
      return
    }
    if (!flowId || !accessToken) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    client
      .getTemplate(flowId)
      .then(t => {
        if (!cancelled) setTemplate(t as unknown as FlowPreviewTemplate)
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load workflow')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client, flowId, accessToken, templateProp])

  const steps = template?.steps ?? []
  const definition = useMemo(
    () =>
      templateToFlowGraphDefinition({
        steps: template?.steps ?? [],
        start: template?.start,
        summaryFieldsCount: 0
      }),
    [template?.steps, template?.start]
  )
  const selectedIndex = selectedNodeId != null ? flowNodeIdToStepIndex(selectedNodeId) : null
  const selectedStep = selectedIndex != null ? (steps[selectedIndex] ?? null) : null
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId)
  }, [])

  if (loading)
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
        <Spinner size="lg" />
      </div>
    )
  if (error)
    return (
      <Alert variant="destructive" data-testid={`${testId}-error`}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  if (!template)
    return (
      <div className="gba:text-muted-foreground gba:py-4" data-testid={`${testId}-empty`}>
        No workflow data.
      </div>
    )

  return (
    <div className="gba:w-full gba:h-full gba:min-h-0 gba:flex gba:flex-col gba:min-h-96" data-testid={testId}>
      <Card className="gba:shrink-0 gba:border-border">
        <CardHeader className="gba:border-b gba:border-border">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:p-2 gba:rounded-lg gba:bg-primary/10">
              <Workflow className="gba:h-5 gba:w-5 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <CardTitle className="gba:text-lg">{template.name}</CardTitle>
              {template.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-0.5">{template.description}</p>
              )}
              {template.start?.triggers?.length ? (
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:mt-2 gba:flex-wrap">
                  <Play className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                  <span className="gba:text-xs gba:text-muted-foreground">Start:</span>
                  {template.start.triggers.map(t => (
                    <Badge key={t.id} variant="outline" className="gba:text-xs gba:font-normal">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>
      <FlowCanvasProvider isInteractive onNodeSelect={handleNodeSelect} selectedNodeId={selectedNodeId}>
        <FlowCanvas
          definition={definition}
          rightPanel={
            selectedNodeId === START_NODE_ID ? (
              <div className="gba:w-[320px] gba:h-full gba:flex gba:flex-col gba:bg-card gba:border-l gba:border-border gba:overflow-auto">
                <Card
                  className="gba:border-0 gba:rounded-none gba:flex-1 gba:flex gba:flex-col"
                  data-testid={`${testId}-start-panel`}
                >
                  <CardHeader className="gba:shrink-0 gba:border-b gba:border-border gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-primary/10 gba:text-primary">
                        <CircleDot className="gba:h-5 gba:w-5" />
                      </div>
                      <CardTitle className="gba:text-base">Start</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedNodeId(null)}
                      aria-label="Close"
                      data-testid={`${testId}-start-panel-close`}
                    >
                      <X className="gba:h-4 gba:w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="gba:pt-4">
                    <p className="gba:text-sm gba:text-muted-foreground">
                      Workflow entry point. Triggers defined in the template.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : selectedNodeId === END_NODE_ID ? (
              <div className="gba:w-[320px] gba:h-full gba:flex gba:flex-col gba:bg-card gba:border-l gba:border-border gba:overflow-auto">
                <Card
                  className="gba:border-0 gba:rounded-none gba:flex-1 gba:flex gba:flex-col"
                  data-testid={`${testId}-end-panel`}
                >
                  <CardHeader className="gba:shrink-0 gba:border-b gba:border-border gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-primary/10 gba:text-primary">
                        <Flag className="gba:h-5 gba:w-5" />
                      </div>
                      <CardTitle className="gba:text-base">Workflow Summary</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedNodeId(null)}
                      aria-label="Close"
                      data-testid={`${testId}-end-panel-close`}
                    >
                      <X className="gba:h-4 gba:w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="gba:pt-4">
                    <p className="gba:text-sm gba:text-muted-foreground">
                      Final step. Summary fields are shown when the workflow completes.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : selectedStep != null && selectedIndex != null ? (
              <div className="gba:w-[320px] gba:h-full gba:flex gba:flex-col gba:bg-card gba:border-l gba:border-border gba:overflow-auto">
                <FlowPreviewStepPanel
                  step={selectedStep}
                  index={selectedIndex}
                  onClose={() => setSelectedNodeId(null)}
                  data-testid={testId}
                />
              </div>
            ) : null
          }
          data-testid={`${testId}-graph`}
        />
      </FlowCanvasProvider>
    </div>
  )
}
