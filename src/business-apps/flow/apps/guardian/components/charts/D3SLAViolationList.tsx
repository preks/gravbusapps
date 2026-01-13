import React, { useEffect, useState, useCallback } from 'react'
import { Badge } from '@newwork/nw-design-system'
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
  dimensions,
  filters,
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
        const eta = typeof it.etaToBreachMinutes === 'number' ? it.etaToBreachMinutes : undefined
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
          totalTasks: 1,
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

  const rowTint = (rate: number): { border: string; bg: string; chip: string } => {
    if (rate > 50) return { border: '#7f1d1d', bg: '#1a0f12', chip: '#ef4444' }
    if (rate > 20) return { border: '#7c2d12', bg: '#1a1308', chip: '#f59e0b' }
    return { border: '#374151', bg: '#111827', chip: '#eab308' }
  }

  const safePageSize = Math.max(1, Math.floor(pageSize))
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize))
  const pageIndex = Math.min(Math.max(0, page), totalPages - 1)
  const pagedItems = items.slice(pageIndex * safePageSize, pageIndex * safePageSize + safePageSize)

  return (
    <div
      data-testid={`${prefixDataTestId}-container`}
      style={{
        width: '100%',
        height: 'auto',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.3)', // Match card background
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pagedItems.map(it => {
          const tint = rowTint(it.violationRate)
          return (
            <div
              key={it.id}
              data-testid={`${prefixDataTestId}-row-${it.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: `1px solid ${tint.border}`,
                background: tint.bg,
                borderRadius: 8,
                padding: 12
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: tint.chip + '22',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tint.chip,
                  fontWeight: 700
                }}
              >
                {Math.round(it.violationRate)}%
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#e5e7eb', fontWeight: 600 }}>
                    {grouping === 'task' ? it.stepName : it.flowName}
                  </span>
                  <Badge variant="outline" style={{ borderColor: tint.chip, color: tint.chip }}>
                    {grouping === 'task' ? it.flowName : it.stepName}
                  </Badge>
                </div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                  {it.department} • Avg overdue {it.avgOverdueHours}h • {it.totalTasks} tasks • {it.slaViolations}{' '}
                  breaches
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {items.length > safePageSize ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <div style={{ color: '#9ca3af', fontSize: 12 }}>
            Page {pageIndex + 1}/{totalPages} • {items.length} total
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: pageIndex === 0 ? 'rgba(15,23,42,0.25)' : 'rgba(15,23,42,0.45)',
                color: pageIndex === 0 ? '#6b7280' : '#e5e7eb',
                cursor: pageIndex === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={pageIndex >= totalPages - 1}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: pageIndex >= totalPages - 1 ? 'rgba(15,23,42,0.25)' : 'rgba(15,23,42,0.45)',
                color: pageIndex >= totalPages - 1 ? '#6b7280' : '#e5e7eb',
                cursor: pageIndex >= totalPages - 1 ? 'not-allowed' : 'pointer'
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
