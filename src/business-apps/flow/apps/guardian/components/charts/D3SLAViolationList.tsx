import React, { useEffect, useState, useCallback } from 'react'
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

  // Filter out items with 0% violation rate - they're not actual violations
  const filteredItems = items.filter(it => it.violationRate > 0)

  const safePageSize = Math.max(1, Math.floor(pageSize))
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / safePageSize))
  const pageIndex = Math.min(Math.max(0, page), totalPages - 1)
  const pagedItems = filteredItems.slice(pageIndex * safePageSize, pageIndex * safePageSize + safePageSize)

  if (filteredItems.length === 0) {
    return (
      <div
        data-testid={`${prefixDataTestId}-container`}
        style={{
          width: '100%',
          padding: 16,
          color: 'var(--guardian-text-muted)',
          textAlign: 'center'
        }}
      >
        No violations found.
      </div>
    )
  }

  return (
    <div
      data-testid={`${prefixDataTestId}-container`}
      style={{
        width: '100%',
        height: 'auto',
        padding: 16,
        background: 'transparent',
        overflow: 'hidden',
        borderRadius: 8
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pagedItems.map(it => {
          return (
            <div
              key={it.id}
              data-testid={`${prefixDataTestId}-row-${it.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderRadius: 8,
                border: '1px solid var(--guardian-border)',
                background: 'var(--guardian-card)',
                padding: 12
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background:
                    it.violationRate === 0
                      ? 'rgba(16, 185, 129, 0.2)'
                      : it.violationRate < 50
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(239, 68, 68, 0.2)',
                  color:
                    it.violationRate === 0
                      ? 'var(--color-success-500, #10b981)'
                      : it.violationRate < 50
                        ? 'var(--color-warning-500, #f59e0b)'
                        : 'var(--color-destructive-500, #ef4444)',
                  fontWeight: 700,
                  fontSize: 14
                }}
              >
                {Math.round(it.violationRate)}%
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--guardian-text)', fontWeight: 600 }}>
                    {grouping === 'task' ? it.stepName : it.flowName}
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--guardian-border)',
                      background: 'var(--guardian-card)',
                      color: 'var(--guardian-text-muted)',
                      fontSize: 12
                    }}
                    title={grouping === 'task' ? it.flowName : it.stepName}
                  >
                    {grouping === 'task' ? it.flowName : it.stepName}
                  </span>
                </div>
                <div style={{ color: 'var(--guardian-text-muted)', fontSize: 12, marginTop: 2 }}>
                  {it.department && it.department !== '—' ? `${it.department} • ` : ''}
                  {it.totalTasks} tasks
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredItems.length > safePageSize ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12
          }}
        >
          <div style={{ color: 'var(--guardian-text-muted)', fontSize: 12 }}>
            Page {pageIndex + 1}/{totalPages} • {filteredItems.length} total
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              data-testid={`${prefixDataTestId}-prev-page`}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid var(--guardian-border)',
                background: 'var(--guardian-bg-secondary)',
                color: pageIndex === 0 ? 'var(--guardian-text-muted)' : 'var(--guardian-text)',
                cursor: pageIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: pageIndex === 0 ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={pageIndex >= totalPages - 1}
              data-testid={`${prefixDataTestId}-next-page`}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid var(--guardian-border)',
                background: 'var(--guardian-bg-secondary)',
                color: pageIndex >= totalPages - 1 ? 'var(--guardian-text-muted)' : 'var(--guardian-text)',
                cursor: pageIndex >= totalPages - 1 ? 'not-allowed' : 'pointer',
                opacity: pageIndex >= totalPages - 1 ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
