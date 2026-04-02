import React, { useState, useMemo } from 'react'
import { Spinner, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { ChartBar, UsersThree, CheckCircle, ClipboardText, Target } from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { usePerformanceTracking } from '../hooks/usePerformanceTracking'
import { useCycleDetail } from '../hooks/useCycleDetail'
import { CycleDetailView } from './CycleDetailView'
import type { CycleTrackingSummary } from '../types'
import { formatDate } from '../utils/formatLabels'

function formatCycleLabel(cycle: CycleTrackingSummary): string {
  const start = formatDate(cycle.evaluationPeriodStartDate ?? cycle.startDate, '')
  const end = formatDate(cycle.evaluationPeriodEndDate ?? cycle.endDate, '')
  const range = start && end ? ` (${start} – ${end})` : ''
  return `${cycle.name}${range}`
}

function buildKpiWidgets(cycle: CycleTrackingSummary): WidgetItem[] {
  const evalPercent =
    cycle.totalEvaluations > 0 ? Math.round((cycle.completedEvaluations / cycle.totalEvaluations) * 100) : 0
  const reviewerPercent =
    cycle.totalReviewerTasks > 0 ? Math.round((cycle.completedReviewerTasks / cycle.totalReviewerTasks) * 100) : 0

  return [
    {
      key: 'total-evaluations',
      title: 'Evaluations',
      value: cycle.totalEvaluations,
      prefix: <UsersThree size={20} aria-hidden />,
      color: '#1890ff',
      footer: `${cycle.completedEvaluations} completed`
    },
    {
      key: 'evaluation-progress',
      title: 'Evaluation Progress',
      value: `${evalPercent}%`,
      valueIsString: true,
      prefix: <Target size={20} aria-hidden />,
      color: evalPercent === 100 ? '#52c41a' : '#fa8c16',
      footer: `${cycle.completedEvaluations} of ${cycle.totalEvaluations} done`
    },
    {
      key: 'reviewer-tasks',
      title: 'Reviewer Tasks',
      value: cycle.totalReviewerTasks,
      prefix: <ClipboardText size={20} aria-hidden />,
      color: '#722ed1',
      footer: `${cycle.completedReviewerTasks} completed`
    },
    {
      key: 'reviewer-progress',
      title: 'Reviewer Progress',
      value: `${reviewerPercent}%`,
      valueIsString: true,
      prefix: <CheckCircle size={20} aria-hidden />,
      color: reviewerPercent === 100 ? '#52c41a' : '#fa8c16',
      footer: `${cycle.completedReviewerTasks} of ${cycle.totalReviewerTasks} done`
    }
  ]
}

interface CycleTrackingTabProps {
  accessToken: string | undefined
}

export const CycleTrackingTab: React.FC<CycleTrackingTabProps> = ({ accessToken }) => {
  const { cycles, loading, error, refetch } = usePerformanceTracking(accessToken)
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)

  const selectedCycle = cycles.find(c => c.id === selectedCycleId) ?? cycles[0] ?? null
  const activeCycleId = selectedCycle?.id ?? null

  const { evaluations, loading: detailLoading, error: detailError } = useCycleDetail(accessToken, activeCycleId)

  const kpiWidgets = useMemo(() => {
    return selectedCycle ? buildKpiWidgets(selectedCycle) : []
  }, [selectedCycle])

  if (error) {
    return (
      <div className="gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-destructive gba:text-sm">
        {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12">
        <Spinner size="lg" data-testid="cycle-tracking-loading" />
      </div>
    )
  }

  if (cycles.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:text-muted-foreground">
        <ChartBar size={48} className="gba:mb-4 gba:opacity-40" />
        <p className="gba:text-lg gba:font-medium">No performance cycles found</p>
        <p className="gba:text-sm">Create a cycle in Performance Configuration to get started.</p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6">
      <div className="gba:flex gba:items-center gba:gap-3">
        <Select value={activeCycleId ?? ''} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="gba:min-w-[320px]" data-testid="cycle-tracking-cycle-select">
            <SelectValue placeholder="Select a cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map(cycle => (
              <SelectItem value={cycle.id} key={cycle.id}>
                {formatCycleLabel(cycle)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCycle && (
        <>
          <WidgetGroup
            widgets={kpiWidgets}
            isLoading={false}
            error={null}
            onRetry={refetch}
            data-testid="cycle-tracking-kpis"
          />
          <CycleDetailView
            evaluations={evaluations}
            loading={detailLoading}
            error={detailError}
            cycleName={selectedCycle.name}
          />
        </>
      )}
    </div>
  )
}
