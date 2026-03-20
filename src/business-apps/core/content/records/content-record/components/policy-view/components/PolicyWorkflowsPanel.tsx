import React, { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { CheckCircle2, Clock, Shield, Send, ClipboardCheck } from 'lucide-react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import translations from '../../../_i18n'

interface PolicyWorkflowsPanelProps {
  accessToken: string
  userId?: string
  policyRootId: string
  /** Callback to open the send-for-approval dialog */
  onSendApproval?: () => void
  /** Callback to open the send-for-acknowledgement dialog */
  onSendAcknowledgement?: () => void
  /** Whether the policy is in a draft/pending state (controls which actions are available) */
  isDraft?: boolean
}

interface PolicyFlow {
  id: string
  workflowName: string
  status: string
  app: string
  startTime?: string
  updateTime?: string
  totalTasks: number
  completedTasks: number
}

const statusConfig = (status: string) => {
  const s = status.toUpperCase()
  if (s === 'RUNNING') return { label: 'Running', icon: Clock, colorClass: 'gba:text-info', variant: 'info' as const }
  if (s === 'COMPLETED')
    return { label: 'Completed', icon: CheckCircle2, colorClass: 'gba:text-success', variant: 'success' as const }
  if (s === 'FAILED')
    return { label: 'Failed', icon: Shield, colorClass: 'gba:text-destructive', variant: 'destructive' as const }
  return { label: status, icon: Clock, colorClass: 'gba:text-muted-foreground', variant: 'outline' as const }
}

const appIcon = (app: string) => {
  if (app === 'policy-approval') return ClipboardCheck
  return Send
}

export const PolicyWorkflowsPanel: React.FC<PolicyWorkflowsPanelProps> = ({
  accessToken,
  userId,
  policyRootId,
  onSendApproval,
  onSendAcknowledgement,
  isDraft
}) => {
  const { t } = useTranslation(translations)
  const [flows, setFlows] = useState<PolicyFlow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)
    try {
      const apiBase = getFlowEngineApiBaseUrl()
      const url = `${apiBase}/flows/user/${userId}/initiated?limit=50&offset=0`
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const allFlows: any[] = data?.data?.flows || data?.flows || []

      const policyFlows = allFlows
        .filter(f => {
          const tags = f.tags && typeof f.tags === 'object' ? f.tags : {}
          return String(tags.policyRootId || '') === String(policyRootId)
        })
        .map(f => {
          const tags = f.tags && typeof f.tags === 'object' ? f.tags : {}
          return {
            id: String(f.workflowId || f.id || ''),
            workflowName: String(f.workflowName || f.name || ''),
            status: String(f.status || 'UNKNOWN'),
            app: String(tags.app || 'policy'),
            startTime: f.startTime || f.createdAt,
            updateTime: f.updateTime || f.updatedAt,
            totalTasks: Number(f.totalTasks ?? f.stepStatus?.total ?? 0),
            completedTasks: Number(f.completedTasks ?? f.stepStatus?.completed ?? 0)
          } as PolicyFlow
        })
        .sort((a, b) => {
          const at = new Date(a.updateTime || a.startTime || 0).getTime()
          const bt = new Date(b.updateTime || b.startTime || 0).getTime()
          return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0)
        })

      setFlows(policyFlows)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, userId, policyRootId])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  if (!userId) {
    return (
      <div className="gba:text-sm gba:text-muted-foreground" data-testid="policy-workflows-no-user">
        {t('policy_workflows_no_user')}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-10" data-testid="policy-workflows-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:space-y-3" data-testid="policy-workflows-error">
        <div className="gba:text-sm gba:text-destructive">{error}</div>
        <Button variant="outline" size="sm" onClick={load} data-testid="policy-workflows-retry">
          {t('retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="gba:space-y-3" data-testid="policy-workflows-panel">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
        <Badge variant="outline" data-testid="policy-workflows-count">
          {t('policy_workflows_count', { count: flows.length })}
        </Badge>
        <div className="gba:flex gba:gap-2">
          {onSendApproval && isDraft && (
            <Button variant="outline" size="sm" onClick={onSendApproval} data-testid="policy-workflows-send-approval">
              <ClipboardCheck className="gba:h-4 gba:w-4 gba:mr-1.5" />
              {t('policy_action_send_approval_short')}
            </Button>
          )}
          {onSendAcknowledgement && !isDraft && (
            <Button variant="outline" size="sm" onClick={onSendAcknowledgement} data-testid="policy-workflows-send-ack">
              <Send className="gba:h-4 gba:w-4 gba:mr-1.5" />
              {t('policy_action_send_ack_short')}
            </Button>
          )}
        </div>
      </div>

      {flows.length === 0 ? (
        <div className="gba:text-sm gba:text-muted-foreground" data-testid="policy-workflows-empty">
          {t('policy_workflows_empty')}
        </div>
      ) : (
        <div className="gba:space-y-2" data-testid="policy-workflows-list">
          {flows.map(flow => {
            const cfg = statusConfig(flow.status)
            const StatusIcon = cfg.icon
            const AppIcon = appIcon(flow.app)
            const isApproval = flow.app === 'policy-approval'
            const timeLabel = flow.startTime ? new Date(flow.startTime).toLocaleDateString() : ''

            return (
              <div
                key={flow.id}
                className="gba:w-full gba:p-3 gba:rounded-md gba:border gba:border-border gba:bg-card"
                data-testid={`policy-workflow-row-${flow.id}`}
              >
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                    <AppIcon className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
                    <div className="gba:min-w-0">
                      <div className="gba:text-sm gba:font-medium gba:truncate">
                        {flow.workflowName ||
                          (isApproval
                            ? t('policy_workflows_type_approval')
                            : t('policy_workflows_type_acknowledgement'))}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        {isApproval ? t('policy_workflows_type_approval') : t('policy_workflows_type_acknowledgement')}
                        {timeLabel ? ` · ${timeLabel}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
                    {flow.totalTasks > 0 && (
                      <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">
                        {flow.completedTasks}/{flow.totalTasks}
                      </span>
                    )}
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <StatusIcon className={`gba:h-3.5 gba:w-3.5 ${cfg.colorClass}`} />
                      <Badge variant={cfg.variant} data-testid={`policy-workflow-status-${flow.id}`}>
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PolicyWorkflowsPanel
