import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, Spinner, Alert, AlertDescription, Badge, Button } from '@newwork/nw-design-system'
import { Workflow, Play, X } from 'lucide-react'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import { FlowCanvasProvider, FlowCanvas } from '@/common/components/flow'
import { templateToFlowGraphDefinition, flowNodeIdToStepIndex } from '@/common/data/flow/templateToFlowGraph'
import { PreviewTemplate } from '../preview-template'
import { FlowPreviewStepPanel } from './FlowPreviewStepPanel'
import type { FlowPreviewTemplate } from './flowPreviewTypes'

const START_NODE_ID = 'start'
const END_NODE_ID = 'end'

export interface FlowPreviewItem {
  id: string
  label: string
  template: FlowPreviewTemplate
}

export interface FlowPreviewProps {
  accessToken: string
  /** Multiple preloaded templates with switcher. */
  items?: FlowPreviewItem[]
  /** Single preloaded template (no switcher). */
  template?: FlowPreviewTemplate | null
  /** Fetch a single template by id (no switcher). */
  flowId?: string
  'data-testid'?: string
}

export const FlowPreview: React.FC<FlowPreviewProps> = ({
  accessToken,
  items,
  template: templateProp,
  flowId,
  'data-testid': testId = 'flow-preview'
}) => {
  if (items && items.length > 0) {
    return (
      <PreviewTemplate items={items} data-testid={testId}>
        {selectedId => {
          const active = items.find(i => i.id === selectedId) ?? items[0]
          return (
            <FlowPreviewSingle accessToken={accessToken} template={active.template} testId={`${testId}-${active.id}`} />
          )
        }}
      </PreviewTemplate>
    )
  }
  return <FlowPreviewSingle accessToken={accessToken} templateProp={templateProp} flowId={flowId} testId={testId} />
}

interface FlowPreviewSingleProps {
  accessToken: string
  template?: FlowPreviewTemplate | null
  templateProp?: FlowPreviewTemplate | null
  flowId?: string
  testId: string
}

const FlowPreviewSingle: React.FC<FlowPreviewSingleProps> = ({
  accessToken,
  template: templateDirect,
  templateProp,
  flowId,
  testId
}) => {
  const resolvedTemplateProp = templateDirect ?? templateProp ?? null
  const client = useFlowTemplateClient(accessToken)
  const [template, setTemplate] = useState<FlowPreviewTemplate | null>(resolvedTemplateProp)
  const [loading, setLoading] = useState(resolvedTemplateProp == null && !!flowId)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    if (resolvedTemplateProp != null) {
      setTemplate(resolvedTemplateProp)
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
  }, [client, flowId, accessToken, resolvedTemplateProp])

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
  const selectedIndex = selectedNodeId == null ? null : flowNodeIdToStepIndex(selectedNodeId)
  const selectedStep = selectedIndex == null ? null : (steps[selectedIndex] ?? null)
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
      {(() => {
        let rightPanelContent: React.ReactNode = null
        if (selectedNodeId === START_NODE_ID) {
          rightPanelContent = (
            <div
              className="gba:h-full gba:min-h-0 gba:flex gba:flex-col gba:border-l gba:border-border gba:shadow-sm"
              style={{ width: 320, minWidth: 320 }}
              data-testid={`${testId}-start-panel`}
            >
              <div className="gba:flex gba:shrink-0 gba:items-center gba:justify-between gba:px-5 gba:py-3 gba:border-b gba:border-border">
                <span className="gba:text-sm gba:font-semibold gba:text-foreground">Start</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNodeId(null)}
                  aria-label="Close"
                  data-testid={`${testId}-start-panel-close`}
                >
                  <X className="gba:h-4 gba:w-4" />
                </Button>
              </div>
              <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-5 gba:pt-4">
                <p className="gba:text-sm gba:text-muted-foreground">
                  Workflow entry point. Triggers defined in the template.
                </p>
              </div>
            </div>
          )
        } else if (selectedNodeId === END_NODE_ID) {
          rightPanelContent = (
            <div
              className="gba:h-full gba:min-h-0 gba:flex gba:flex-col gba:border-l gba:border-border gba:shadow-sm"
              style={{ width: 320, minWidth: 320 }}
              data-testid={`${testId}-end-panel`}
            >
              <div className="gba:flex gba:shrink-0 gba:items-center gba:justify-between gba:px-5 gba:py-3 gba:border-b gba:border-border">
                <span className="gba:text-sm gba:font-semibold gba:text-foreground">Workflow Summary</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNodeId(null)}
                  aria-label="Close"
                  data-testid={`${testId}-end-panel-close`}
                >
                  <X className="gba:h-4 gba:w-4" />
                </Button>
              </div>
              <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-5 gba:pt-4">
                <p className="gba:text-sm gba:text-muted-foreground">
                  Final step. Summary fields are shown when the workflow completes.
                </p>
              </div>
            </div>
          )
        } else if (selectedStep != null && selectedIndex != null) {
          rightPanelContent = (
            <div
              className="gba:h-full gba:min-h-0 gba:flex gba:flex-col gba:border-l gba:border-border gba:shadow-sm"
              style={{ width: 320, minWidth: 320 }}
            >
              <FlowPreviewStepPanel
                step={selectedStep}
                index={selectedIndex}
                onClose={() => setSelectedNodeId(null)}
                data-testid={testId}
              />
            </div>
          )
        }
        return (
          <FlowCanvasProvider isInteractive onNodeSelect={handleNodeSelect} selectedNodeId={selectedNodeId}>
            <FlowCanvas definition={definition} rightPanel={rightPanelContent} data-testid={`${testId}-graph`} />
          </FlowCanvasProvider>
        )
      })()}
    </div>
  )
}
