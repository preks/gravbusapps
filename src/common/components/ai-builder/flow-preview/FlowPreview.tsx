import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  AlertDescription,
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { Workflow, Play, X, CheckCircle2, Loader2 } from 'lucide-react'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import { FlowCanvasProvider, FlowCanvas } from '@/common/components/flow'
import { templateToFlowGraphDefinition, flowNodeIdToStepIndex } from '@/common/data/flow/templateToFlowGraph'
import { PreviewTemplate } from '../preview-template'
import { FlowPreviewStepPanel } from './FlowPreviewStepPanel'
import type { FlowPreviewInputBlock, FlowPreviewTemplate } from './flowPreviewTypes'

const TRIGGER_LABEL: Record<string, string> = {
  MANUAL_FORM: 'Manual form',
  WEBHOOK: 'Webhook',
  EVENT: 'Event',
  SCHEDULE: 'Schedule',
  API_SCHEMA: 'API'
}

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

interface StartFormFieldProps {
  field: FlowPreviewInputBlock
  value: string
  onValueChange: (value: string) => void
  testId: string
}

const StartFormField: React.FC<StartFormFieldProps> = ({ field, value, onValueChange, testId }) => {
  return (
    <div key={field.name} className="gba:space-y-1">
      <Label htmlFor={`${testId}-start-${field.name}`} className="gba:text-xs">
        {field.label || field.name}
        {field.required && <span className="gba:text-destructive gba:ml-0.5">*</span>}
      </Label>
      {field.options?.length ? (
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger id={`${testId}-start-${field.name}`}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={`${testId}-start-${field.name}`}
          value={value}
          onChange={e => onValueChange(e.target.value)}
          placeholder={field.label}
        />
      )}
    </div>
  )
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
  const [startFormValues, setStartFormValues] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<string | null>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)

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

  const startFormFields: FlowPreviewInputBlock[] = template?.start?.form ?? []
  const triggerTypes = template?.start?.triggers?.map(t => t.type) ?? []
  const canExecute = !!template?.id

  const executeFlow = useCallback(async () => {
    if (!template?.id) return
    setExecuting(true)
    setExecutionError(null)
    setExecutionResult(null)
    try {
      const result = await client.executeWorkflow(template.id, {
        initiator: 'preview',
        inputValues: Object.keys(startFormValues).length > 0 ? startFormValues : undefined
      })
      setExecutionResult(result.workflowId)
    } catch (e) {
      setExecutionError(e instanceof Error ? e.message : 'Failed to start workflow')
    } finally {
      setExecuting(false)
    }
  }, [client, template?.id, startFormValues])

  const resetExecution = useCallback(() => {
    setExecutionResult(null)
    setExecutionError(null)
    setStartFormValues({})
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
    <div className="gba:w-full gba:h-full gba:min-h-96 gba:flex gba:flex-col" data-testid={testId}>
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
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Play className="gba:h-4 gba:w-4 gba:text-primary" />
                  <span className="gba:text-sm gba:font-semibold gba:text-foreground">Start Flow</span>
                </div>
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
              <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-5 gba:pt-4 gba:pb-4">
                <div className="gba:space-y-4">
                  {triggerTypes.length > 0 && (
                    <div>
                      <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">Triggered by</p>
                      <div className="gba:flex gba:flex-wrap gba:gap-1.5">
                        {triggerTypes.map(type => (
                          <Badge key={type} variant="secondary" className="gba:text-xs">
                            {TRIGGER_LABEL[type] ?? type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {executionResult ? (
                    <div className="gba:space-y-3">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-green-600">
                        <CheckCircle2 className="gba:h-4 gba:w-4" />
                        <span className="gba:font-medium">Flow started!</span>
                      </div>
                      <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/30 gba:px-3 gba:py-2">
                        <p className="gba:text-xs gba:text-muted-foreground gba:mb-0.5">Instance ID</p>
                        <p className="gba:text-xs gba:font-mono gba:text-foreground gba:break-all">{executionResult}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={resetExecution} className="gba:w-full">
                        Start another
                      </Button>
                    </div>
                  ) : (
                    <div className="gba:space-y-4">
                      {startFormFields.length > 0 && (
                        <div className="gba:space-y-3">
                          {startFormFields.map(field => (
                            <StartFormField
                              key={field.name}
                              field={field}
                              value={startFormValues[field.name] ?? ''}
                              onValueChange={v => setStartFormValues(prev => ({ ...prev, [field.name]: v }))}
                              testId={testId}
                            />
                          ))}
                        </div>
                      )}

                      {!canExecute && (
                        <p className="gba:text-xs gba:text-muted-foreground">
                          This flow can be started once it is deployed.
                        </p>
                      )}

                      {executionError && (
                        <Alert variant="destructive" className="gba:py-2">
                          <AlertDescription className="gba:text-xs">{executionError}</AlertDescription>
                        </Alert>
                      )}

                      {canExecute && (
                        <Button
                          onClick={executeFlow}
                          disabled={executing}
                          className="gba:w-full"
                          data-testid={`${testId}-start-btn`}
                        >
                          {executing ? (
                            <>
                              <Loader2 className="gba:h-4 gba:w-4 gba:mr-2 gba:animate-spin" />
                              Starting…
                            </>
                          ) : (
                            <>
                              <Play className="gba:h-4 gba:w-4 gba:mr-2" />
                              Start Flow
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
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
