// Displays cost summary from the terminal event's cost_summary field.

import {
  ChartLineIcon,
  ClockIcon,
  CoinsIcon,
  CompassIcon,
  CurrencyDollarIcon,
  type Icon,
  LightbulbIcon,
  ListChecksIcon,
  RobotIcon,
  WrenchIcon
} from '@phosphor-icons/react'
import type { TraceModel } from '../../utils/traceModel'

interface TraceCostTabProps {
  model: TraceModel
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = ((ms % 60_000) / 1000).toFixed(0)
  return `${mins}m ${secs}s`
}

interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  icon: Icon
  accent?: 'primary' | 'emerald' | 'sky' | 'amber' | 'violet' | 'teal'
}

const ACCENT_STYLE: Record<NonNullable<StatCardProps['accent']>, { bg: string; text: string }> = {
  primary: { bg: 'gba:bg-primary/10', text: 'gba:text-primary' },
  emerald: { bg: 'gba:bg-emerald-500/10', text: 'gba:text-emerald-600 dark:gba:text-emerald-400' },
  sky: { bg: 'gba:bg-sky-500/10', text: 'gba:text-sky-600 dark:gba:text-sky-400' },
  amber: { bg: 'gba:bg-amber-500/10', text: 'gba:text-amber-600 dark:gba:text-amber-400' },
  violet: { bg: 'gba:bg-violet-500/10', text: 'gba:text-violet-600 dark:gba:text-violet-400' },
  teal: { bg: 'gba:bg-teal-500/10', text: 'gba:text-teal-600 dark:gba:text-teal-400' }
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sublabel, icon: Icon, accent = 'primary' }) => {
  const accentStyle = ACCENT_STYLE[accent]
  return (
    <div className="gba:rounded-lg gba:border gba:border-border/40 gba:bg-card gba:p-4 gba:flex gba:items-start gba:gap-3 gba:hover:border-border/70 gba:transition-colors">
      <span
        className={`gba:flex gba:h-9 gba:w-9 gba:items-center gba:justify-center gba:rounded-md gba:shrink-0 ${accentStyle.bg} ${accentStyle.text}`}
      >
        <Icon className="gba:h-4 gba:w-4" weight="bold" />
      </span>
      <div className="gba:min-w-0 gba:flex-1">
        <p className="gba:text-[11px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          {label}
        </p>
        <p className="gba:text-xl gba:font-semibold gba:tabular-nums gba:text-foreground gba:mt-0.5">{value}</p>
        {sublabel && <p className="gba:text-[11px] gba:text-muted-foreground gba:mt-0.5">{sublabel}</p>}
      </div>
    </div>
  )
}

interface SectionTitleProps {
  children: React.ReactNode
}

const SectionTitle: React.FC<SectionTitleProps> = ({ children }) => (
  <h4 className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:mb-3">
    {children}
  </h4>
)

export const TraceCostTab: React.FC<TraceCostTabProps> = ({ model }) => {
  const { summary } = model
  const cost = summary.costSummary

  return (
    <div className="gba:p-5 gba:space-y-6 gba:overflow-y-auto gba:flex-1" data-testid="trace-cost-tab">
      <section>
        <SectionTitle>Execution overview</SectionTitle>
        <div className="gba:grid gba:grid-cols-2 gba:lg:grid-cols-4 gba:gap-3">
          <StatCard
            label="Total runtime"
            value={formatDuration(summary.durationMs)}
            icon={ClockIcon}
            accent="primary"
          />
          <StatCard label="Events processed" value={summary.eventCount} icon={ChartLineIcon} accent="sky" />
          <StatCard label="Tool calls" value={summary.toolCallCount} icon={WrenchIcon} accent="emerald" />
          <StatCard label="Decisions" value={summary.decisionCount} icon={ListChecksIcon} accent="amber" />
        </div>
      </section>

      <section>
        <SectionTitle>LLM cost</SectionTitle>
        {cost ? (
          <div className="gba:space-y-3">
            <div className="gba:grid gba:grid-cols-2 gba:gap-3">
              <StatCard
                label="Tokens used"
                value={cost.tokens_used.toLocaleString()}
                icon={CoinsIcon}
                accent="violet"
              />
              <StatCard
                label="Estimated cost"
                value={`$${cost.estimated_cost_usd.toFixed(4)}`}
                sublabel={`${cost.budget_pct.toFixed(1)}% of budget`}
                icon={CurrencyDollarIcon}
                accent="emerald"
              />
            </div>
            <div className="gba:rounded-lg gba:border gba:border-border/40 gba:bg-card gba:p-4">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <span className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                  Budget consumed
                </span>
                <span
                  className={`gba:text-xs gba:font-medium gba:tabular-nums ${
                    cost.budget_pct > 80
                      ? 'gba:text-destructive'
                      : cost.budget_pct > 50
                        ? 'gba:text-amber-600 dark:gba:text-amber-400'
                        : 'gba:text-emerald-600 dark:gba:text-emerald-400'
                  }`}
                >
                  {cost.budget_pct.toFixed(1)}%
                </span>
              </div>
              <div className="gba:w-full gba:h-2 gba:rounded-full gba:bg-muted gba:overflow-hidden">
                <div
                  className={`gba:h-full gba:rounded-full gba:transition-all ${
                    cost.budget_pct > 80
                      ? 'gba:bg-destructive'
                      : cost.budget_pct > 50
                        ? 'gba:bg-amber-500'
                        : 'gba:bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(cost.budget_pct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:gap-2 gba:rounded-lg gba:border gba:border-dashed gba:border-border/50 gba:bg-muted/10">
            <CurrencyDollarIcon className="gba:h-6 gba:w-6 gba:text-muted-foreground" weight="duotone" />
            <p className="gba:text-sm gba:text-muted-foreground">Cost data will appear once the session completes</p>
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Participants</SectionTitle>
        <div className="gba:grid gba:grid-cols-3 gba:gap-3">
          <StatCard label="Sub-agents" value={summary.subagentCount} icon={RobotIcon} accent="emerald" />
          <StatCard label="Experts" value={summary.expertCount} icon={CompassIcon} accent="violet" />
          <StatCard label="Skills" value={summary.skillLoadCount} icon={LightbulbIcon} accent="teal" />
        </div>
      </section>
    </div>
  )
}
