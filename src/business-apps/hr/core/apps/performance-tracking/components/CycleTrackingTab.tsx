import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { ChartBar, UsersThree, ClipboardText, UserCircle, User } from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { usePerformanceTracking } from '../hooks/usePerformanceTracking'
import { useCycleDetail } from '../hooks/useCycleDetail'
import { CycleDetailView } from './CycleDetailView'
import { ManagerReviewsTable } from './ManagerReviewsTable'
import { SelfReviewsTable } from './SelfReviewsTable'
import type { CycleTrackingSummary } from '../types'
import { formatDate } from '../utils/formatLabels'
import translations from '../_i18n'

const CARD_SELECTOR = 'div[class*="card"], div[class*="Card"]'

function findCardByTitle(root: HTMLElement, title: string): HTMLElement | null {
  const titleNode = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,p,span,div')).find(
    node => node.textContent?.trim() === title.trim()
  )
  if (!titleNode) return null
  const card = titleNode.closest<HTMLElement>(CARD_SELECTOR)
  if (!card) return null
  let top = card
  let ancestor = top.parentElement?.closest<HTMLElement>(CARD_SELECTOR)
  while (ancestor) {
    top = ancestor
    ancestor = top.parentElement?.closest<HTMLElement>(CARD_SELECTOR)
  }
  return top
}

function wireClickableWidgets(root: HTMLElement, widgets: WidgetItem[]): () => void {
  const controller = new AbortController()
  const { signal } = controller

  for (const widget of widgets) {
    if (typeof widget.onClick !== 'function') continue
    const card = findCardByTitle(root, widget.title)
    if (!card) continue

    card.style.cursor = 'pointer'
    card.setAttribute('role', 'button')
    card.tabIndex = 0
    if (widget.title) card.setAttribute('aria-label', widget.title)

    const activate = (): void => {
      widget.onClick?.()
    }
    card.addEventListener('click', activate, { signal })
    card.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          activate()
        }
      },
      { signal }
    )
  }

  return () => controller.abort()
}

function formatCycleLabel(cycle: CycleTrackingSummary): string {
  const start = formatDate(cycle.evaluationPeriodStartDate ?? cycle.startDate, '')
  const end = formatDate(cycle.evaluationPeriodEndDate ?? cycle.endDate, '')
  const range = start && end ? ` (${start} – ${end})` : ''
  return `${cycle.name}${range}`
}

function buildKpiWidgets(
  cycle: CycleTrackingSummary,
  t: (key: string, vars?: Record<string, unknown>) => string
): WidgetItem[] {
  const evalPercent =
    cycle.totalEvaluations > 0 ? Math.round((cycle.completedEvaluations / cycle.totalEvaluations) * 100) : 0
  const reviewerPercent =
    cycle.totalReviewerTasks > 0 ? Math.round((cycle.completedReviewerTasks / cycle.totalReviewerTasks) * 100) : 0

  return [
    {
      key: 'total-evaluations',
      title: t('kpi-evaluations'),
      value: cycle.totalEvaluations,
      prefix: <UsersThree size={20} aria-hidden />,
      color: '#1890ff',
      footer: t('kpi-completed-footer', { completed: cycle.completedEvaluations }),
      trend: {
        value: `${evalPercent}%`,
        positive: evalPercent > 0,
        description: t('kpi-done-description', { completed: cycle.completedEvaluations, total: cycle.totalEvaluations })
      }
    },
    {
      key: 'reviewer-tasks',
      title: t('kpi-reviewer-tasks'),
      value: cycle.totalReviewerTasks,
      prefix: <ClipboardText size={20} aria-hidden />,
      color: '#722ed1',
      footer: t('kpi-completed-footer', { completed: cycle.completedReviewerTasks }),
      trend: {
        value: `${reviewerPercent}%`,
        positive: reviewerPercent > 0,
        description: t('kpi-done-description', {
          completed: cycle.completedReviewerTasks,
          total: cycle.totalReviewerTasks
        })
      }
    },
    {
      key: 'manager-reviews',
      title: t('kpi-manager-reviews'),
      value: cycle.totalManagerReviews,
      prefix: <UserCircle size={20} aria-hidden />,
      color: '#722ed1',
      footer: t('kpi-completed-pending-footer', {
        completed: cycle.completedManagerReviews,
        pending: cycle.totalManagerReviews - cycle.completedManagerReviews
      })
    },
    {
      key: 'self-reviews',
      title: t('kpi-self-reviews'),
      value: cycle.totalSelfReviews,
      prefix: <User size={20} aria-hidden />,
      color: '#1890ff',
      footer: t('kpi-completed-pending-footer', {
        completed: cycle.completedSelfReviews,
        pending: cycle.totalSelfReviews - cycle.completedSelfReviews
      })
    }
  ]
}

interface CycleTrackingTabProps {
  accessToken: string | undefined
}

export const CycleTrackingTab: React.FC<CycleTrackingTabProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)
  const { cycles, loading, error, refetch } = usePerformanceTracking(accessToken)
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)
  const [showManagerTable, setShowManagerTable] = useState(false)
  const [showSelfTable, setShowSelfTable] = useState(false)
  const kpiContainerRef = useRef<HTMLDivElement>(null)

  const selectedCycle = cycles.find(c => c.id === selectedCycleId) ?? cycles[0] ?? null
  const activeCycleId = selectedCycle?.id ?? null

  const { evaluations, loading: detailLoading, error: detailError } = useCycleDetail(accessToken, activeCycleId)

  const kpiWidgets = useMemo(() => {
    if (!selectedCycle) return []
    const widgets = buildKpiWidgets(selectedCycle, t)
    const managerWidget = widgets.find(w => w.key === 'manager-reviews')
    if (managerWidget) {
      managerWidget.onClick = () => setShowManagerTable(prev => !prev)
      managerWidget.active = showManagerTable
    }
    const selfWidget = widgets.find(w => w.key === 'self-reviews')
    if (selfWidget) {
      selfWidget.onClick = () => setShowSelfTable(prev => !prev)
      selfWidget.active = showSelfTable
    }
    return widgets
  }, [selectedCycle, showManagerTable, showSelfTable])

  useEffect(() => {
    if (!kpiContainerRef.current || kpiWidgets.length === 0) return
    let cleanup = wireClickableWidgets(kpiContainerRef.current, kpiWidgets)
    const timeoutId = setTimeout(() => {
      cleanup()
      if (kpiContainerRef.current) {
        cleanup = wireClickableWidgets(kpiContainerRef.current, kpiWidgets)
      }
    }, 100)
    return () => {
      clearTimeout(timeoutId)
      cleanup()
    }
  }, [kpiWidgets])

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
        <p className="gba:text-lg gba:font-medium">{t('empty-no-cycles-title')}</p>
        <p className="gba:text-sm">{t('empty-no-cycles-description')}</p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6">
      <div className="gba:flex gba:items-center gba:gap-3">
        <Select value={activeCycleId ?? ''} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="gba:min-w-[320px]" data-testid="cycle-tracking-cycle-select">
            <SelectValue placeholder={t('select-cycle-placeholder')} />
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
          <div ref={kpiContainerRef}>
            <WidgetGroup
              widgets={kpiWidgets}
              isLoading={false}
              error={null}
              onRetry={refetch}
              data-testid="cycle-tracking-kpis"
            />
          </div>
          {showManagerTable && (
            <ManagerReviewsTable evaluations={evaluations} loading={detailLoading} cycleName={selectedCycle.name} />
          )}
          {showSelfTable && (
            <SelfReviewsTable evaluations={evaluations} loading={detailLoading} cycleName={selectedCycle.name} />
          )}
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
