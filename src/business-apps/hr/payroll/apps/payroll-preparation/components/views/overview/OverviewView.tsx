import React, { useMemo } from 'react'
import { Badge, Card } from '@newwork/nw-design-system'
import {
  CheckCircleIcon,
  WarningIcon,
  XCircleIcon,
  MinusCircleIcon,
  UsersIcon,
  ArrowsClockwiseIcon,
  ShieldWarningIcon,
  WarningCircleIcon
} from '@phosphor-icons/react'
import type { PayrollSummary, PayrollRun, PayrollEmployee } from '../../../types/payrollTypes'
import { PayrollRunStatusBadge } from '../../shared/StatusBadge'

interface OverviewViewProps {
  summary: PayrollSummary
  employees: PayrollEmployee[]
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
  <Card className="gba:p-4 gba:flex gba:flex-row gba:items-center gba:gap-3">
    <Badge
      variant={variant}
      className="gba:w-10 gba:h-10 gba:shrink-0 gba:rounded-lg gba:flex gba:items-center gba:justify-center"
    >
      {icon}
    </Badge>
    <div className="gba:min-w-0">
      <p className="gba:text-xl gba:font-bold gba:text-foreground gba:leading-tight">{value}</p>
      <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{label}</p>
    </div>
  </Card>
)

export const OverviewView: React.FC<OverviewViewProps> = ({ summary, employees, payrollRun, t }) => {
  const employeesWithoutCompany = useMemo(() => employees.filter(e => !e.legalEntityName), [employees])

  return (
    <div className="gba:space-y-6">
      {employeesWithoutCompany.length > 0 && (
        <Card className="gba:p-4 gba:border-warning gba:bg-warning/5">
          <div className="gba:flex gba:items-start gba:gap-3">
            <WarningCircleIcon size={20} weight="fill" className="gba:text-warning gba:mt-0.5 gba:shrink-0" />
            <div>
              <p className="gba:text-sm gba:font-semibold gba:text-foreground">
                {t('overview-no-company-title', { count: employeesWithoutCompany.length })}
              </p>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{t('overview-no-company-description')}</p>
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-2">
                {employeesWithoutCompany.slice(0, 10).map(e => (
                  <Badge key={e.id} variant="outline" className="gba:text-xs">
                    {e.displayName} ({e.code})
                  </Badge>
                ))}
                {employeesWithoutCompany.length > 10 && (
                  <Badge variant="outline" className="gba:text-xs">
                    +{employeesWithoutCompany.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

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

      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
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
