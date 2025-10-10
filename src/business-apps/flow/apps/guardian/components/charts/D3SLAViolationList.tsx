import React, { useEffect, useState, useCallback } from 'react'
import { Card, Badge, Button } from '@newwork/nw-design-system'
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
}

export const D3SLAViolationList: React.FC<D3SLAViolationListProps> = ({
  workflowData,
  dimensions,
  filters,
  grouping = 'flow',
  prefixDataTestId
}) => {
  const [items, setItems] = useState<SLAViolation[]>([])

  const extract = useCallback((data: any): SLAViolation[] => {
    const analytics = data?.analytics || {}
    const killers = analytics.flowManagement?.slaKillers || []

    const mapped: SLAViolation[] = killers.map((k: any, idx: number) => ({
      id: `sla-${idx}`,
      flowName: k.flow_name || 'Unknown Flow',
      stepName: k.step_name || 'Unknown Step',
      department: ['HR', 'Finance', 'IT', 'Operations', 'Engineering'][idx % 5],
      violationRate: k.violation_rate || 0,
      avgOverdueHours: k.avg_overdue_hours || 0,
      totalTasks: k.total_tasks || 0,
      slaViolations: k.sla_violations || 0
    }))

    return mapped.slice(0, 10)
  }, [])

  useEffect(() => {
    if (!workflowData) return
    setItems(extract(workflowData))
  }, [workflowData, extract])

  const rowTint = (rate: number): { border: string; bg: string; chip: string } => {
    if (rate > 50) return { border: '#7f1d1d', bg: '#1a0f12', chip: '#ef4444' }
    if (rate > 20) return { border: '#7c2d12', bg: '#1a1308', chip: '#f59e0b' }
    return { border: '#374151', bg: '#111827', chip: '#eab308' }
  }

  return (
    <div
      data-testid={`${prefixDataTestId}-container`}
      style={{
        width: '100%',
        height: '100%',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.3)', // Match card background
        overflow: 'auto'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(it => {
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

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="outline" size="sm" style={{ color: '#e5e7eb', borderColor: '#374151' }}>
                  Details
                </Button>
                <Button variant="secondary" size="sm">
                  Prioritize
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
