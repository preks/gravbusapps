import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ChartBarIcon } from '@phosphor-icons/react'
import type { DeepAgentSession } from '../../../types/enterpriseAgent'
import { useEnterpriseAgentClient } from '../../../hooks/useEnterpriseAgentClient'
import { parseIsoTimestampMs } from '../../../utils/renderUtils'
import { SectionHeader, MetricCard } from './SettingsShared'
import { MetricsGridSkeleton } from './SkeletonLoader'
import translations from '../../../_i18n'

type MetricsRange = '7d' | '30d' | 'all'
const MILLISECONDS_PER_DAY = 86_400_000

const RANGE_LABEL_KEYS: Record<MetricsRange, string> = {
  '7d': 'settings-metrics-range-7d',
  '30d': 'settings-metrics-range-30d',
  all: 'settings-metrics-range-all'
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'gba:bg-green-500',
  failed: 'gba:bg-red-500',
  running: 'gba:bg-blue-500'
}

interface MetricsSectionProps {
  client: ReturnType<typeof useEnterpriseAgentClient>
  isOpen: boolean
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({ client, isOpen }) => {
  const { t } = useTranslation(translations)
  const [range, setRange] = useState<MetricsRange>('30d')
  const [sessions, setSessions] = useState<DeepAgentSession[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    client
      .getSessions({ limit: 200 })
      .then(data => setSessions(data ?? []))
      .catch(() => setSessions([]))
      .finally(() => setIsLoading(false))
  }, [isOpen, client])

  const metrics = useMemo(() => {
    const now = Date.now()
    let cutoff = 0

    if (range === '7d') {
      cutoff = now - 7 * MILLISECONDS_PER_DAY
    } else if (range === '30d') {
      cutoff = now - 30 * MILLISECONDS_PER_DAY
    }

    const filtered = sessions.filter(s => {
      const createdAtMs = parseIsoTimestampMs(s.created_at)
      return createdAtMs !== null && createdAtMs >= cutoff
    })
    const totalSessions = filtered.length
    const tokensUsed = filtered.reduce((sum, s) => sum + (s.cost_summary?.tokens_used ?? 0), 0)
    const estimatedCost = filtered.reduce((sum, s) => sum + (s.cost_summary?.estimated_cost_usd ?? 0), 0)
    const totalDuration = filtered.reduce((sum, s) => sum + (s.duration_ms ?? 0), 0)
    const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions / 1000) : 0
    const byStatus = filtered.reduce(
      (acc, s) => {
        acc[s.status] = (acc[s.status] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return { totalSessions, tokensUsed, estimatedCost, avgDuration, byStatus }
  }, [sessions, range])

  return (
    <>
      <SectionHeader
        icon={<ChartBarIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />}
        title={t('settings-metrics-title')}
      />
      <div className="gba:px-3 sm:gba:px-4 gba:pb-4 sm:gba:pb-5">
        <div className="gba:flex gba:gap-1 gba:mb-2.5 sm:gba:mb-3">
          {(['7d', '30d', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:transition-colors ${
                range === r
                  ? 'gba:bg-foreground gba:text-background'
                  : 'gba:text-muted-foreground gba:hover:bg-muted/40'
              }`}
            >
              {t(RANGE_LABEL_KEYS[r])}
            </button>
          ))}
        </div>

        {isLoading ? (
          <MetricsGridSkeleton />
        ) : (
          <>
            <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:mb-2.5 sm:gba:mb-3">
              <MetricCard label={t('settings-metrics-total-sessions')} value={metrics.totalSessions} />
              <MetricCard
                label={t('settings-metrics-tokens')}
                value={metrics.tokensUsed > 0 ? metrics.tokensUsed.toLocaleString() : '—'}
              />
              <MetricCard
                label={t('settings-metrics-cost')}
                value={metrics.estimatedCost > 0 ? `$${metrics.estimatedCost.toFixed(2)}` : '—'}
              />
              <MetricCard
                label={t('settings-metrics-duration')}
                value={metrics.avgDuration > 0 ? `${metrics.avgDuration}s` : '—'}
              />
            </div>

            {Object.keys(metrics.byStatus).length > 0 && (
              <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3">
                <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
                  {t('settings-metrics-by-status')}
                </p>
                <div className="gba:flex gba:flex-wrap gba:gap-2">
                  {Object.entries(metrics.byStatus).map(([status, count]) => (
                    <span
                      key={status}
                      className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:py-1 gba:rounded-full gba:bg-muted/40 gba:text-xs gba:font-medium gba:text-muted-foreground"
                    >
                      <span
                        className={`gba:h-1.5 gba:w-1.5 gba:rounded-full ${STATUS_COLORS[status] ?? 'gba:bg-muted-foreground/40'}`}
                      />
                      {status}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
