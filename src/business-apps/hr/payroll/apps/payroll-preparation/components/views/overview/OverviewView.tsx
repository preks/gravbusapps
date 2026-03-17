import React from 'react'
import { Badge, Card } from '@newwork/nw-design-system'
import {
  CheckCircleIcon,
  WarningIcon,
  XCircleIcon,
  MinusCircleIcon,
  UsersIcon,
  ArrowsClockwiseIcon,
  ShieldWarningIcon
} from '@phosphor-icons/react'
import type { PayrollSummary, PayrollRun } from '../../../types/payrollTypes'
import { PayrollRunStatusBadge } from '../../shared/StatusBadge'

interface OverviewViewProps {
  summary: PayrollSummary
  payrollRun: PayrollRun | null
  t: (key: string) => string
}

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'

interface KpiCardProps {
  label: string
  value: number
  icon: React.ReactNode
  variant: BadgeVariant
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, variant }) => (
  <Card className="gba:p-4 gba:flex gba:items-center gba:gap-4">
    <Badge variant={variant} className="gba:w-12 gba:h-12 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
      {icon}
    </Badge>
    <div>
      <p className="gba:text-2xl gba:font-bold gba:text-foreground">{value}</p>
      <p className="gba:text-sm gba:text-muted-foreground">{label}</p>
    </div>
  </Card>
)

export const OverviewView: React.FC<OverviewViewProps> = ({ summary, payrollRun, t }) => {
  return (
    <div className="gba:space-y-6">
      {payrollRun && (
        <Card className="gba:p-6">
          <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
            <div>
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{payrollRun.legalEntityName}</h3>
              <p className="gba:text-sm gba:text-muted-foreground">
                {payrollRun.year}-{String(payrollRun.month).padStart(2, '0')} &middot; {payrollRun.country}
              </p>
            </div>
            <PayrollRunStatusBadge status={payrollRun.status} />
          </div>
        </Card>
      )}

      <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 lg:gba:grid-cols-7 gba:gap-4">
        <KpiCard
          label={t('summary-total')}
          value={summary.totalEmployees}
          icon={<UsersIcon size={24} />}
          variant="outline"
        />
        <KpiCard
          label={t('summary-ready')}
          value={summary.readyCount}
          icon={<CheckCircleIcon size={24} weight="fill" />}
          variant="success"
        />
        <KpiCard
          label={t('summary-warning')}
          value={summary.warningCount}
          icon={<WarningIcon size={24} weight="fill" />}
          variant="warning"
        />
        <KpiCard
          label={t('summary-blocked')}
          value={summary.blockedCount}
          icon={<XCircleIcon size={24} weight="fill" />}
          variant="destructive"
        />
        <KpiCard
          label={t('summary-excluded')}
          value={summary.excludedCount}
          icon={<MinusCircleIcon size={24} weight="fill" />}
          variant="secondary"
        />
        <KpiCard
          label={t('summary-blockers')}
          value={summary.openBlockers}
          icon={<ShieldWarningIcon size={24} weight="fill" />}
          variant="destructive"
        />
        <KpiCard
          label={t('summary-changed')}
          value={summary.changedSinceLastPayroll}
          icon={<ArrowsClockwiseIcon size={24} />}
          variant="outline"
        />
      </div>

      {summary.totalEmployees > 0 && (
        <Card className="gba:p-6">
          <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-4">{t('overview-readiness')}</h4>
          <div className="gba:flex gba:h-4 gba:rounded-full gba:overflow-hidden gba:bg-muted">
            {summary.readyCount > 0 && (
              <div
                className="gba:bg-[hsl(var(--success))] gba:transition-all"
                style={{ width: `${(summary.readyCount / summary.totalEmployees) * 100}%` }}
                title={`${t('summary-ready')}: ${summary.readyCount}`}
              />
            )}
            {summary.warningCount > 0 && (
              <div
                className="gba:bg-[hsl(var(--warning))] gba:transition-all"
                style={{ width: `${(summary.warningCount / summary.totalEmployees) * 100}%` }}
                title={`${t('summary-warning')}: ${summary.warningCount}`}
              />
            )}
            {summary.blockedCount > 0 && (
              <div
                className="gba:bg-destructive gba:transition-all"
                style={{ width: `${(summary.blockedCount / summary.totalEmployees) * 100}%` }}
                title={`${t('summary-blocked')}: ${summary.blockedCount}`}
              />
            )}
            {summary.excludedCount > 0 && (
              <div
                className="gba:bg-muted-foreground/30 gba:transition-all"
                style={{ width: `${(summary.excludedCount / summary.totalEmployees) * 100}%` }}
                title={`${t('summary-excluded')}: ${summary.excludedCount}`}
              />
            )}
          </div>
          <div className="gba:flex gba:gap-4 gba:mt-3 gba:flex-wrap">
            <Badge variant="success">
              {t('summary-ready')} ({summary.readyCount})
            </Badge>
            <Badge variant="warning">
              {t('summary-warning')} ({summary.warningCount})
            </Badge>
            <Badge variant="destructive">
              {t('summary-blocked')} ({summary.blockedCount})
            </Badge>
            <Badge variant="secondary">
              {t('summary-excluded')} ({summary.excludedCount})
            </Badge>
          </div>
        </Card>
      )}
    </div>
  )
}
