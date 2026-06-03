// Slim header for the Enterprise Workforce screen.
//
// Title + subtitle on the left, primary CTA on the right, then a row of
// four KPI tiles below. Intentionally low-ornament — the page lives in
// the surrounding card surfaces (composer, filters, tiles), not here.

import { Button } from '@newwork/nw-design-system'
import { ArchiveIcon, PlusIcon, PulseIcon, SparkleIcon, UsersThreeIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { WorkforceCounts } from './useWorkforceData'

interface WorkforceHeroProps {
  counts: WorkforceCounts
  liveCount: number
  onHireAgent: () => void
}

interface KpiTileProps {
  icon: Icon
  label: string
  value: number
}

const KpiTile: React.FC<KpiTileProps> = ({ icon: IconComponent, label, value }) => (
  <div className="gba:flex gba:items-center gba:gap-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:px-3.5 gba:py-2.5">
    <IconComponent className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
    <div className="gba:min-w-0">
      <p className="gba:text-lg gba:font-semibold gba:leading-none gba:text-foreground gba:tabular-nums">{value}</p>
      <p className="gba:mt-1 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wider gba:text-muted-foreground">
        {label}
      </p>
    </div>
  </div>
)

export const WorkforceHero: React.FC<WorkforceHeroProps> = ({ counts, liveCount, onHireAgent }) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-5">
      <div className="gba:flex gba:flex-col gba:items-start gba:justify-between gba:gap-3 gba:sm:flex-row gba:sm:items-center">
        <div>
          <h1 className="gba:text-2xl gba:font-semibold gba:tracking-tight gba:text-foreground">
            Enterprise Workforce
          </h1>
          <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
            Activate specialists across the company. Active agents become available to orchestrators, scheduled tasks
            and live sessions.
          </p>
        </div>
        <Button onClick={onHireAgent} data-testid="workforce-hire-button">
          <PlusIcon className="gba:mr-1.5 gba:h-4 gba:w-4" />
          Hire agent
        </Button>
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-2.5 gba:sm:grid-cols-4">
        <KpiTile icon={UsersThreeIcon} label="Active agents" value={counts.active} />
        <KpiTile icon={PulseIcon} label="In live sessions" value={liveCount} />
        <KpiTile icon={SparkleIcon} label="Built-in" value={counts.builtin} />
        <KpiTile icon={ArchiveIcon} label="Archived" value={counts.archived} />
      </div>
    </div>
  )
}
