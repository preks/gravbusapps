import React from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { formatHoursDuration, formatPercent } from '../../utils/formatters'

interface SlaImmediateActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statusMetrics?: {
    overdue_tasks?: number
    overdue_percentage?: number
    pending_tasks?: number
    completed_tasks?: number
  } | null
  items: Array<{
    flow_id: string
    flow_name: string
    template_id: string
    status: string
    last_activity_time?: string
    due_date?: string
    step_name: string
    sla_violations: number
    violation_rate: number
    avg_overdue_hours: number
    assigned_users?: string
  }>
  'data-testid'?: string
}

export const SlaImmediateActionDialog: React.FC<SlaImmediateActionDialogProps> = ({
  open,
  onOpenChange,
  statusMetrics,
  items,
  'data-testid': testId = 'sla-immediate-action-dialog'
}) => {
  const { t } = useTranslation(translations)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:flex gba:max-h-screen gba:max-w-4xl gba:flex-col gba:overflow-hidden"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle>{t('sla-immediate-action-details-title')}</DialogTitle>
          <DialogDescription>{t('sla-immediate-action-details-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:flex gba:flex-col gba:gap-6 gba:overflow-y-auto gba:pr-1">
          <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-4">
            <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{t('sla-overdue-tasks')}</span>
              <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                {statusMetrics?.overdue_tasks || 0}
              </div>
            </div>
            <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{t('sla-overdue-rate')}</span>
              <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                {formatPercent(statusMetrics?.overdue_percentage)}
              </div>
            </div>
            <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{t('tasks-pending')}</span>
              <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                {statusMetrics?.pending_tasks || 0}
              </div>
            </div>
            <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('tasks-completed-tasks')}
              </span>
              <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">
                {statusMetrics?.completed_tasks || 0}
              </div>
            </div>
          </div>

          <div className="gba:flex gba:flex-col gba:gap-3">
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-sm gba:font-semibold gba:text-foreground">
                {t('sla-immediate-action-top-steps')}
              </span>
              <span className="gba:text-sm gba:text-muted-foreground">
                {t('sla-immediate-action-top-steps-description')}
              </span>
            </div>

            {!items.length ? (
              <div className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4 gba:text-sm gba:text-muted-foreground">
                {t('state-empty')}
              </div>
            ) : (
              <div className="gba:overflow-x-auto">
                <table className="gba:w-full gba:border-collapse">
                  <thead>
                    <tr className="gba:border-b gba:border-border">
                      <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('sla-flow')}</th>
                      <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('sla-step')}</th>
                      <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('sla-assigned-to')}</th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('sla-overdue-tasks')}</th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('sla-violation-rate')}</th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('sla-avg-overdue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={`${item.flow_id}-${item.step_name}-${index}`}
                        className="gba:border-b gba:border-border/60"
                      >
                        <td className="gba:p-3 gba:text-sm gba:font-medium gba:text-foreground">{item.flow_name}</td>
                        <td className="gba:p-3 gba:text-sm gba:text-foreground">{item.step_name}</td>
                        <td className="gba:max-w-64 gba:p-3 gba:text-sm gba:text-foreground">
                          {item.assigned_users || t('sla-unassigned')}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {item.sla_violations}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatPercent(item.violation_rate)}
                        </td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                          {formatHoursDuration(item.avg_overdue_hours)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('action-close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
