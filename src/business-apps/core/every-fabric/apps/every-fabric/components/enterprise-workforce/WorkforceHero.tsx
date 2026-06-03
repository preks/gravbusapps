// Slim header for the Workforce Agents screen.
//
// Title + subtitle on the left, primary CTA on the right, then a row of
// four KPI tiles below. KPIs are workforce-specific: active agents,
// paused agents, active triggers (work the agents react to), and
// credits consumed in the last seven days.

import { Button } from '@newwork/nw-design-system'
import { LightningIcon, PauseIcon, PlusIcon, SparkleIcon, UsersThreeIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import React from 'react'
import type { WorkforceCounts } from './useWorkforceData'

interface WorkforceHeroProps {
  counts: WorkforceCounts
  onHireAgent: () => void
  /** Number of agents with an in-flight run right now. */
  workingNow?: number
}

interface KpiTileProps {
  icon: Icon
  label: string
  value: number | string
  testId: string
}

const KpiTile: React.FC<KpiTileProps> = ({ icon: IconComponent, label, value, testId }) => (
  <div
    className="gba:flex gba:items-center gba:gap-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:px-3.5 gba:py-2.5"
    data-testid={testId}
  >
    <IconComponent className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
    <div className="gba:min-w-0">
      <p className="gba:text-lg gba:font-semibold gba:leading-none gba:text-foreground gba:tabular-nums">{value}</p>
      <p className="gba:mt-1 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wider gba:text-muted-foreground">
        {label}
      </p>
    </div>
  </div>
)

export const WorkforceHero: React.FC<WorkforceHeroProps> = ({ counts, onHireAgent, workingNow = 0 }) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-5">
      <div className="gba:flex gba:flex-col gba:items-start gba:justify-between gba:gap-3 gba:sm:flex-row gba:sm:items-center">
        <div>
          <div className="gba:flex gba:items-center gba:gap-2.5">
            <h1 className="gba:text-2xl gba:font-semibold gba:tracking-tight gba:text-foreground">Agent Workforce</h1>
            {workingNow > 0 && (
              <span
                className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:bg-emerald-50 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-semibold gba:text-emerald-700"
                data-testid="workforce-working-now"
              >
                <span className="gba:relative gba:flex gba:h-2 gba:w-2">
                  <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:animate-ping gba:rounded-full gba:bg-emerald-400" />
                  <span className="gba:relative gba:inline-flex gba:h-2 gba:w-2 gba:rounded-full gba:bg-emerald-500" />
                </span>
                {workingNow} working now
              </span>
            )}
          </div>
          <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
            Your AI employees. They react to triggers, follow policies, use skills, and escalate to humans when needed.
          </p>
        </div>
        <Button onClick={onHireAgent} data-testid="workforce-hire-button">
          <PlusIcon className="gba:mr-1.5 gba:h-4 gba:w-4" />
          Hire
        </Button>
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-2.5 gba:sm:grid-cols-4">
        <KpiTile icon={UsersThreeIcon} label="Active agents" value={counts.active} testId="workforce-kpi-active" />
        <KpiTile icon={PauseIcon} label="Paused" value={counts.paused} testId="workforce-kpi-paused" />
        <KpiTile
          icon={LightningIcon}
          label="Active triggers"
          value={counts.activeTriggers}
          testId="workforce-kpi-triggers"
        />
        <KpiTile
          icon={SparkleIcon}
          label="Credits / 7d"
          value={counts.creditsThisWeek}
          testId="workforce-kpi-credits"
        />
      </div>
    </div>
  )
}
