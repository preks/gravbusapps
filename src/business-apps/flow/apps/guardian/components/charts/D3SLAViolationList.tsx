import React, { useEffect, useState, useCallback } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { GuardianFilter } from '../../types/guardianTypes'

interface SLAViolation {
  id: string
  flowName: string
  stepName: string
  department: string
  violationRate: number
  avgOverdueHours: number
  totalTasks: number
  slaViolations: number
}

interface D3SLAViolationListProps {
  workflowData: any
  dimensions: { width: number; height: number }
  filters: GuardianFilter
  grouping?: 'flow' | 'task'
  prefixDataTestId: string
  pageSize?: number
}

export const D3SLAViolationList: React.FC<D3SLAViolationListProps> = ({
  workflowData,
  grouping = 'flow',
  prefixDataTestId,
  pageSize = 5
}) => {
  const [items, setItems] = useState<SLAViolation[]>([])
  const [page, setPage] = useState(0)

  const extract = useCallback((data: any): SLAViolation[] => {
    const analytics = data?.analytics || {}
    const killers = analytics.flowManagement?.slaKillers || []
    const slaRisk = analytics.velocityInsights?.slaRisk || []

    // Primary: historical SLA killers (completed late)
    if (Array.isArray(killers) && killers.length > 0) {
      const mapped: SLAViolation[] = killers.map((k: any, idx: number) => ({
        id: `sla-${idx}`,
        flowName: k.flow_name || 'Unknown Flow',
        stepName: k.step_name || 'Unknown Step',
        department: k.department || k.orgUnit || '—',
        violationRate: k.violation_rate || 0,
        avgOverdueHours: k.avg_overdue_hours || 0,
        totalTasks: k.total_tasks || 0,
        slaViolations: k.sla_violations || 0
      }))

      return mapped.slice(0, 50)
    }

    // Fallback: current SLA risk queue (due soon / overdue)
    if (Array.isArray(slaRisk) && slaRisk.length > 0) {
      const mapped: SLAViolation[] = slaRisk.slice(0, 50).map((it: any, idx: number) => {
        // Some backends may not provide etaToBreachMinutes; derive it from dueDate when possible.
        const dueRaw = it.dueDate || it.due_date || it.due_date_utc || it.due || it.dueAt || it.due_at
        const etaFromField = typeof it.etaToBreachMinutes === 'number' ? it.etaToBreachMinutes : undefined
        const eta =
          etaFromField !== undefined
            ? etaFromField
            : dueRaw
              ? Math.round((new Date(dueRaw).getTime() - Date.now()) / 60000)
              : undefined

        const overdueHours = eta !== undefined && eta < 0 ? Math.abs(eta) / 60 : 0
        const riskScore = typeof it.riskScore === 'number' ? it.riskScore : 0

        return {
          id: `risk-${idx}`,
          flowName: it.templateName || it.templateId || it.flowId || 'Flow',
          stepName: it.stepName || '—',
          department: it.orgUnit || '—',
          // Reuse the same visual language: show "risk" as the % chip
          violationRate: Math.max(0, Math.min(100, riskScore)),
          avgOverdueHours: Math.round(overdueHours * 10) / 10,
          totalTasks: typeof it.totalTasks === 'number' ? it.totalTasks : 1,
          // For the risk queue, treat "breaches" as currently overdue items.
          slaViolations: overdueHours > 0 ? 1 : 0
        }
      })

      return mapped
    }

    return []
  }, [])

  useEffect(() => {
    if (!workflowData) return
    setItems(extract(workflowData))
  }, [workflowData, extract])

  useEffect(() => {
    setPage(0)
  }, [items.length])

  const safePageSize = Math.max(1, Math.floor(pageSize))
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize))
  const pageIndex = Math.min(Math.max(0, page), totalPages - 1)
  const pagedItems = items.slice(pageIndex * safePageSize, pageIndex * safePageSize + safePageSize)

  return (
    <div
      data-testid={`${prefixDataTestId}-container`}
      className="gba:w-full gba:h-auto gba:p-4 gba:bg-card/30 gba:overflow-hidden gba:rounded-lg"
    >
      <div className="gba:flex gba:flex-col gba:gap-3">
        {pagedItems.map(it => {
          return (
            <div
              key={it.id}
              data-testid={`${prefixDataTestId}-row-${it.id}`}
              className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-card/30 gba:p-3"
            >
              <div className="gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-lg gba:bg-muted gba:text-foreground gba:font-bold">
                {Math.round(it.violationRate)}%
              </div>

              <div className="gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-foreground gba:font-semibold">
                    {grouping === 'task' ? it.stepName : it.flowName}
                  </span>
                  <Badge variant="outline" className="gba:max-w-64 gba:overflow-hidden">
                    <span
                      style={{
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'bottom'
                      }}
                      title={grouping === 'task' ? it.flowName : it.stepName}
                    >
                      {grouping === 'task' ? it.flowName : it.stepName}
                    </span>
                  </Badge>
                </div>
                <div className="gba:text-muted-foreground gba:text-xs gba:mt-0.5">
                  {it.department} • {it.totalTasks} tasks
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {items.length > safePageSize ? (
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-3">
          <div className="gba:text-muted-foreground gba:text-xs">
            Page {pageIndex + 1}/{totalPages} • {items.length} total
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              data-testid={`${prefixDataTestId}-prev-page`}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={pageIndex >= totalPages - 1}
              data-testid={`${prefixDataTestId}-next-page`}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
