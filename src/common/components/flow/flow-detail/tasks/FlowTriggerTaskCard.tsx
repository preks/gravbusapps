import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Collapsible, CollapsibleContent, CollapsibleTrigger, Spinner } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, PlayCircle } from 'lucide-react'
import { useFlowProgressClient } from '@/common/network/flows/useFlowProgressClient'
import type { FlowDetailData, FlowTriggerData } from '../types'
import { KeyValueFormData } from '../tabs/taskStepDataRendering'
import { CopyFlowShareLinkButton } from '../CopyFlowShareLinkButton'
import { buildFlowTriggerFocusTaskId } from '../flowDetailShareLinks'

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  MANUAL_FORM: 'Manual form',
  WEBHOOK: 'Webhook',
  EVENT: 'Event',
  SCHEDULE: 'Scheduled',
  API_SCHEMA: 'API'
}

function formatTriggerTypeLabel(triggerType?: string): string {
  if (!triggerType) return 'Triggered'
  if (TRIGGER_TYPE_LABELS[triggerType]) return TRIGGER_TYPE_LABELS[triggerType]
  return triggerType
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function mergeTriggerPayload(
  triggerData?: FlowTriggerData,
  startPayload?: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(triggerData?.payload || {}) }

  if (startPayload) {
    for (const [key, value] of Object.entries(startPayload)) {
      if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
        merged[key] = value
      }
    }
  }

  return merged
}

interface FlowTriggerTaskCardProps {
  flowData: FlowDetailData
  accessToken?: string
  initialOpen?: boolean
}

export const FlowTriggerTaskCard: React.FC<FlowTriggerTaskCardProps> = ({
  flowData,
  accessToken,
  initialOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [startPayload, setStartPayload] = useState<Record<string, unknown> | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false)

  const contextForClient = { accessToken } as Parameters<typeof useFlowProgressClient>[0]
  const { getStepDataByReference } = useFlowProgressClient(contextForClient)

  const displayPayload = useMemo(
    () => mergeTriggerPayload(flowData.triggerData, startPayload || undefined),
    [flowData.triggerData, startPayload]
  )

  const hasDisplayData = Object.keys(displayPayload).length > 0

  const loadStartData = useCallback(async () => {
    if (!accessToken || !flowData.flowId) return

    setIsLoading(true)
    try {
      const response = await getStepDataByReference(flowData.flowId, 'start', { limit: 1 })
      const row = response.data[0]
      const payload = (row?.inputData || row?.formData) as Record<string, unknown> | undefined
      if (payload && Object.keys(payload).length > 0) {
        setStartPayload(payload)
      }
      setHasLoaded(true)
    } catch {
      setHasLoaded(true)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, flowData.flowId, getStepDataByReference])

  useEffect(() => {
    if (!accessToken || !flowData.flowId || hasLoaded || isLoading) return
    void loadStartData()
  }, [accessToken, flowData.flowId, hasLoaded, isLoading, loadStartData])

  useEffect(() => {
    if (!initialOpen) return
    setIsOpen(true)
    if (!hasLoaded && !isLoading) {
      void loadStartData()
    }
  }, [hasLoaded, initialOpen, isLoading, loadStartData])

  useEffect(() => {
    if (!initialOpen || !isOpen || !hasLoaded || hasScrolledRef.current) return
    hasScrolledRef.current = true
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hasLoaded, initialOpen, isOpen])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && !hasLoaded && !isLoading) {
      void loadStartData()
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} data-testid="flow-trigger-task-card">
      <div ref={cardRef} className="gba:rounded-xl gba:border gba:border-border gba:bg-card">
        <div className="gba:flex gba:items-start gba:gap-2 gba:p-4 gba:pb-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="gba:flex gba:min-w-0 gba:flex-1 gba:items-start gba:justify-between gba:gap-3 gba:pb-4 gba:text-left"
              data-testid="flow-trigger-task-card-toggle"
            >
              <div className="gba:flex gba:min-w-0 gba:flex-1 gba:items-start gba:gap-3">
                <div className="gba:mt-0.5 gba:text-muted-foreground">
                  {isOpen ? <ChevronDown className="gba:h-4 gba:w-4" /> : <ChevronRight className="gba:h-4 gba:w-4" />}
                </div>
                <div className="gba:min-w-0 gba:flex-1 gba:space-y-2">
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                    <PlayCircle className="gba:h-4 gba:w-4 gba:text-primary" />
                    <span className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                      Start
                    </span>
                    <h3 className="gba:text-base gba:font-semibold gba:text-foreground">Input trigger</h3>
                    <Badge
                      variant="outline"
                      className="gba:border-none gba:bg-success gba:text-xs gba:font-semibold gba:text-success-foreground"
                    >
                      COMPLETED
                    </Badge>
                  </div>
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                    <span>{formatTriggerTypeLabel(flowData.triggerData?.triggerType)}</span>
                    {flowData.triggerData?.initiatedBy || flowData.initiatedBy ? (
                      <span>Initiated by {flowData.triggerData?.initiatedBy || flowData.initiatedBy}</span>
                    ) : null}
                    {flowData.startTime ? <span>{new Date(flowData.startTime).toLocaleString()}</span> : null}
                  </div>
                </div>
              </div>
            </button>
          </CollapsibleTrigger>
          <CopyFlowShareLinkButton
            flowId={flowData.flowId}
            taskId={buildFlowTriggerFocusTaskId(flowData.flowId)}
            size="icon"
            variant="ghost"
            tooltip="Copy link to trigger input"
            data-testid="flow-trigger-task-card-copy-link"
          />
        </div>

        <CollapsibleContent>
          <div className="gba:space-y-3 gba:border-t gba:border-border gba:px-4 gba:pb-4 gba:pt-4">
            {isLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-8 gba:text-sm gba:text-muted-foreground">
                <Spinner className="gba:h-5 gba:w-5" />
                Loading trigger data...
              </div>
            ) : hasDisplayData ? (
              <>
                <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">Captured data</h4>
                <KeyValueFormData formData={displayPayload} accessToken={accessToken} />
              </>
            ) : (
              <div className="gba:rounded-md gba:border gba:border-dashed gba:border-border gba:bg-muted/10 gba:px-3 gba:py-4 gba:text-sm gba:text-muted-foreground">
                No trigger input data available.
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
