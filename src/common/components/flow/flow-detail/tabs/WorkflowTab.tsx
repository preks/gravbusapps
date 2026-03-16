import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from '@newwork/nw-design-system'
import { Activity } from 'lucide-react'
import { ReadonlyTemplateFlowCanvas } from '@/common/components/flow'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { formatDisplayText } from '@/common/utils/displayText'

interface SystemActivityEntry {
  id: string
  timestamp: string
  action: string
  taskName?: string
  details?: {
    reason?: string
  }
}

interface WorkflowTabProps {
  flowId: string
  templateId?: string
  accessToken: string
  isVisible?: boolean
}

export const WorkflowTab: React.FC<WorkflowTabProps> = ({ flowId, templateId, accessToken, isVisible = true }) => {
  const [systemEntries, setSystemEntries] = useState<SystemActivityEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!flowId || !accessToken) {
      setSystemEntries([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetch(`${getFlowEngineApiBaseUrl()}/audit/logs?flowId=${flowId}&action=SYSTEM&limit=12`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(result => {
        if (!cancelled) {
          setSystemEntries(Array.isArray(result?.data?.entries) ? result.data.entries : [])
        }
      })
      .catch(() => {
        if (!cancelled) setSystemEntries([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, flowId])

  return (
    <div
      className="gba:grid gba:grid-cols-1 gba:gap-6 gba:xl:grid-cols-[1.4fr_0.8fr]"
      data-testid="flow-detail-workflow-tab"
    >
      <ReadonlyTemplateFlowCanvas
        accessToken={accessToken}
        templateId={templateId}
        title="Flow Definition"
        description="Read-only graph rendering of the template used by this workflow instance."
        emptyTitle="No definition available"
        emptyDescription="The flow template could not be loaded for this workflow instance."
        isVisible={isVisible}
        data-testid="flow-detail-flow-renderer"
      />

      <Card className="gba:border-border gba:bg-card">
        <CardHeader className="gba:border-b gba:border-border">
          <CardTitle>System Task Activity</CardTitle>
          <CardDescription>Recent system-generated events for this workflow instance.</CardDescription>
        </CardHeader>
        <CardContent className="gba:flex gba:min-h-[520px] gba:flex-col gba:gap-4 gba:p-5">
          {isLoading ? (
            <div className="gba:flex gba:flex-1 gba:items-center gba:justify-center">
              <Spinner />
            </div>
          ) : systemEntries.length ? (
            systemEntries.map(entry => (
              <div
                key={entry.id}
                className="gba:flex gba:gap-3 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4"
              >
                <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
                  <Activity className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                </div>
                <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:gap-1">
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">
                    {formatDisplayText(entry.taskName, entry.action)}
                  </span>
                  <span className="gba:text-sm gba:text-muted-foreground">{entry.action}</span>
                  {entry.details?.reason ? (
                    <span className="gba:text-xs gba:text-muted-foreground">{entry.details.reason}</span>
                  ) : null}
                  <span className="gba:text-xs gba:text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="gba:flex gba:flex-1 gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:text-center">
              <Activity className="gba:h-8 gba:w-8 gba:text-muted-foreground" />
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-base gba:font-medium gba:text-foreground">No system task events</span>
                <span className="gba:text-sm gba:text-muted-foreground">
                  System activity will appear here when function, agent, or other automated steps run.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
