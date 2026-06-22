// Slim header for the Workforce Agents screen.
//
// Title + subtitle on the left, primary CTA on the right, then a row of
// four KPI tiles below. KPIs are workforce-specific: active agents,
// paused agents, active triggers (work the agents react to), and
// credits consumed in the last seven days.

import { Button, useTranslation } from '@newwork/nw-design-system'
import {
  LightningIcon,
  PauseIcon,
  PlusIcon,
  SparkleIcon,
  UsersThreeIcon,
  WebhooksLogoIcon
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import React from 'react'
import type { WorkforceCounts } from './useWorkforceData'
import translations from '../../_i18n'

interface WorkforceHeroProps {
  counts: WorkforceCounts
  onHireAgent: () => void
  onTestWebhook?: () => void
  canTestWebhook?: boolean
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

export const WorkforceHero: React.FC<WorkforceHeroProps> = ({
  counts,
  onHireAgent,
  onTestWebhook,
  canTestWebhook = false,
  workingNow = 0
}) => {
  const { t } = useTranslation(translations)
  return (
    <div className="gba:flex gba:flex-col gba:gap-5">
      <div className="gba:flex gba:flex-col gba:items-start gba:justify-between gba:gap-3 gba:sm:flex-row gba:sm:items-center">
        <div>
          <div className="gba:flex gba:items-center gba:gap-2.5">
            <h1 className="gba:text-2xl gba:font-semibold gba:tracking-tight gba:text-foreground">
              {t('workforce-hero-title')}
            </h1>
            {workingNow > 0 && (
              <span
                className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:bg-emerald-50 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-semibold gba:text-emerald-700"
                data-testid="workforce-working-now"
              >
                <span className="gba:relative gba:flex gba:h-2 gba:w-2">
                  <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:animate-ping gba:rounded-full gba:bg-emerald-400" />
                  <span className="gba:relative gba:inline-flex gba:h-2 gba:w-2 gba:rounded-full gba:bg-emerald-500" />
                </span>
                {t('workforce-hero-working-now', { count: workingNow })}
              </span>
            )}
          </div>
          <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('workforce-hero-subtitle')}</p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          {onTestWebhook && (
            <Button
              variant="outline"
              onClick={onTestWebhook}
              disabled={!canTestWebhook}
              title={
                canTestWebhook
                  ? t('workforce-hero-test-webhook-enabled-tooltip')
                  : t('workforce-hero-test-webhook-disabled-tooltip')
              }
              data-testid="workforce-test-webhook-button"
            >
              <WebhooksLogoIcon className="gba:mr-1.5 gba:h-4 gba:w-4" />
              {t('workforce-hero-test-webhook')}
            </Button>
          )}
          <Button onClick={onHireAgent} data-testid="workforce-hire-button">
            <PlusIcon className="gba:mr-1.5 gba:h-4 gba:w-4" />
            {t('workforce-hero-hire')}
          </Button>
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-2.5 gba:sm:grid-cols-4">
        <KpiTile
          icon={UsersThreeIcon}
          label={t('workforce-kpi-active')}
          value={counts.active}
          testId="workforce-kpi-active"
        />
        <KpiTile
          icon={PauseIcon}
          label={t('workforce-kpi-paused')}
          value={counts.paused}
          testId="workforce-kpi-paused"
        />
        <KpiTile
          icon={LightningIcon}
          label={t('workforce-kpi-triggers')}
          value={counts.activeTriggers}
          testId="workforce-kpi-triggers"
        />
        <KpiTile
          icon={SparkleIcon}
          label={t('workforce-kpi-credits')}
          value={counts.creditsThisWeek}
          testId="workforce-kpi-credits"
        />
      </div>
    </div>
  )
}
