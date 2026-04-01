import React, { useMemo } from 'react'
import {
  Badge,
  Button,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead
} from '@newwork/nw-design-system'
import {
  CheckCircleIcon,
  WarningIcon,
  XCircleIcon,
  MinusCircleIcon,
  UsersIcon,
  ArrowsClockwiseIcon,
  ShieldWarningIcon,
  WarningCircleIcon,
  PlusIcon,
  FolderOpenIcon
} from '@phosphor-icons/react'
import type { PayrollSummary, PayrollRun, PayrollEmployee, PayrollRunStatus } from '../../../types/payrollTypes'
import { formatDate as formatPlatformDate } from '@/common/utils/windowUtils'
import { PayrollRunStatusBadge } from '../../shared/StatusBadge'

interface OverviewViewProps {
  activeRun: PayrollRun | null
  runs: PayrollRun[]
  runsLoading: boolean
  summary: PayrollSummary
  employees: PayrollEmployee[]
  onSelectRun: (run: PayrollRun) => void
  onCreateRun: () => void
  t: (key: string, args?: Record<string, any>) => string
}

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'

interface KpiCardProps {
  label: string
  value: number
  icon: React.ReactNode
  variant: BadgeVariant
}

interface ReadinessSegmentConfig {
  key: 'ready' | 'warning' | 'blocked' | 'excluded'
  count: number
  badgeVariant: BadgeVariant
  barClassName: string
  label: string
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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const formatted = formatPlatformDate(dateStr, 'date.short')
  return formatted ?? '—'
}

function getRunStatusLabel(status: PayrollRunStatus, t: (key: string) => string): string {
  switch (status) {
    case 'PAYROLL_IN_PROGRESS':
      return t('status-in-progress')
    case 'PAYROLL_READY_FOR_REVIEW':
      return t('status-ready-for-review')
    case 'PAYROLL_APPROVED_FOR_EXPORT':
      return t('status-approved')
    case 'PAYROLL_EXPORTED':
      return t('status-exported')
    case 'PAYROLL_CLOSED':
      return t('status-closed')
    default:
      return status
  }
}

function RunsListView({
  runs,
  runsLoading,
  onSelectRun,
  onCreateRun,
  t
}: Readonly<{
  runs: PayrollRun[]
  runsLoading: boolean
  onSelectRun: (run: PayrollRun) => void
  onCreateRun: () => void
  t: (key: string) => string
}>) {
  if (runsLoading) {
    return <Card className="gba:p-12 gba:text-center gba:text-muted-foreground">{t('loading')}</Card>
  }

  if (runs.length === 0) {
    return (
      <Card className="gba:p-12 gba:text-center">
        <FolderOpenIcon size={48} className="gba:mx-auto gba:text-muted-foreground/40 gba:mb-4" />
        <h3 className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">{t('runs-empty')}</h3>
        <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{t('runs-empty-hint')}</p>
        <Button onClick={onCreateRun}>
          <PlusIcon size={16} className="gba:mr-2" />
          {t('runs-new-button')}
        </Button>
      </Card>
    )
  }

  return (
    <div className="gba:space-y-6">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('runs-title')}</h3>
          <p className="gba:text-sm gba:text-muted-foreground">{t('runs-description')}</p>
        </div>
        <Button onClick={onCreateRun}>
          <PlusIcon size={16} className="gba:mr-2" />
          {t('runs-new-button')}
        </Button>
      </div>

      <Card className="gba:overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="gba:whitespace-nowrap">{t('runs-col-period')}</TableHead>
              <TableHead className="gba:whitespace-nowrap">{t('runs-col-status')}</TableHead>
              <TableHead className="gba:whitespace-nowrap">{t('runs-col-cutoff')}</TableHead>
              <TableHead className="gba:whitespace-nowrap">{t('runs-col-payment')}</TableHead>
              <TableHead className="gba:whitespace-nowrap">{t('runs-col-created')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map(run => (
              <TableRow key={run.id} className="gba:cursor-pointer gba:hover:bg-muted" onClick={() => onSelectRun(run)}>
                <TableCell className="gba:font-medium gba:text-foreground">
                  {t(`month-${run.month}`)} {run.year}
                </TableCell>
                <TableCell>
                  <PayrollRunStatusBadge status={run.status} translatedLabel={getRunStatusLabel(run.status, t)} />
                </TableCell>
                <TableCell className="gba:text-sm gba:text-muted-foreground">{formatDate(run.cutOffDate)}</TableCell>
                <TableCell className="gba:text-sm gba:text-muted-foreground">{formatDate(run.paymentDate)}</TableCell>
                <TableCell className="gba:text-sm gba:text-muted-foreground">{formatDate(run.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function RunDashboardView({
  summary,
  employees,
  payrollRun,
  t
}: Readonly<{
  summary: PayrollSummary
  employees: PayrollEmployee[]
  payrollRun: PayrollRun
  t: (key: string, args?: Record<string, any>) => string
}>) {
  const employeesWithoutCompany = useMemo(() => employees.filter(e => !e.legalEntityName), [employees])
  const kpiCards = useMemo(
    () => [
      {
        label: t('summary-total'),
        value: summary.totalEmployees,
        icon: <UsersIcon size={24} />,
        variant: 'outline' as const
      },
      {
        label: t('summary-ready'),
        value: summary.readyCount,
        icon: <CheckCircleIcon size={24} weight="fill" />,
        variant: 'success' as const
      },
      {
        label: t('summary-warning'),
        value: summary.warningCount,
        icon: <WarningIcon size={24} weight="fill" />,
        variant: 'warning' as const
      },
      {
        label: t('summary-blocked'),
        value: summary.blockedCount,
        icon: <XCircleIcon size={24} weight="fill" />,
        variant: 'destructive' as const
      },
      {
        label: t('summary-excluded'),
        value: summary.excludedCount,
        icon: <MinusCircleIcon size={24} weight="fill" />,
        variant: 'secondary' as const
      },
      {
        label: t('summary-blockers'),
        value: summary.openBlockers,
        icon: <ShieldWarningIcon size={24} weight="fill" />,
        variant: 'destructive' as const
      },
      {
        label: t('summary-changed'),
        value: summary.changedSinceLastPayroll,
        icon: <ArrowsClockwiseIcon size={24} />,
        variant: 'outline' as const
      }
    ],
    [summary, t]
  )

  const readinessSegments = useMemo<ReadinessSegmentConfig[]>(
    () => [
      {
        key: 'ready',
        count: summary.readyCount,
        badgeVariant: 'success',
        barClassName: 'gba:bg-success',
        label: t('summary-ready')
      },
      {
        key: 'warning',
        count: summary.warningCount,
        badgeVariant: 'warning',
        barClassName: 'gba:bg-warning',
        label: t('summary-warning')
      },
      {
        key: 'blocked',
        count: summary.blockedCount,
        badgeVariant: 'destructive',
        barClassName: 'gba:bg-destructive',
        label: t('summary-blocked')
      },
      {
        key: 'excluded',
        count: summary.excludedCount,
        badgeVariant: 'secondary',
        barClassName: 'gba:bg-muted-foreground/30',
        label: t('summary-excluded')
      }
    ],
    [summary, t]
  )

  return (
    <div className="gba:space-y-6">
      {employeesWithoutCompany.length > 0 && (
        <Card className="gba:p-4 gba:border-warning gba:bg-warning/5">
          <div className="gba:flex gba:items-start gba:gap-3">
            <WarningCircleIcon size={20} weight="fill" className="gba:text-warning gba:mt-0.5 gba:shrink-0" />
            <div>
              <p className="gba:text-sm gba:font-semibold gba:text-foreground">
                {t('overview-no-company-title', {
                  count: employeesWithoutCompany.length,
                  defaultValue: `${employeesWithoutCompany.length} employee(s) without a company assignment`
                })}
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

      <Card className="gba:p-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{payrollRun.legalEntityName}</h3>
            <p className="gba:text-sm gba:text-muted-foreground">
              {t(`month-${payrollRun.month}`)} {payrollRun.year} &middot; {payrollRun.country}
            </p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {t('runs-col-cutoff')}: {formatDate(payrollRun.cutOffDate)} &middot; {t('runs-col-payment')}:{' '}
              {formatDate(payrollRun.paymentDate)}
            </p>
          </div>
          <PayrollRunStatusBadge status={payrollRun.status} translatedLabel={getRunStatusLabel(payrollRun.status, t)} />
        </div>
      </Card>

      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
        {kpiCards.map(card => (
          <KpiCard key={card.label} label={card.label} value={card.value} icon={card.icon} variant={card.variant} />
        ))}
      </div>

      {summary.totalEmployees > 0 && (
        <Card className="gba:p-6">
          <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-4">{t('overview-readiness')}</h4>
          <div className="gba:flex gba:h-4 gba:rounded-full gba:overflow-hidden gba:bg-muted">
            {readinessSegments
              .filter(segment => segment.count > 0)
              .map(segment => (
                <div
                  key={segment.key}
                  className={`${segment.barClassName} gba:transition-all`}
                  style={{ width: `${(segment.count / summary.totalEmployees) * 100}%` }}
                  title={`${segment.label}: ${segment.count}`}
                />
              ))}
          </div>
          <div className="gba:flex gba:gap-4 gba:mt-3 gba:flex-wrap">
            {readinessSegments.map(segment => (
              <Badge key={segment.key} variant={segment.badgeVariant}>
                {segment.label} ({segment.count})
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  activeRun,
  runs,
  runsLoading,
  summary,
  employees,
  onSelectRun,
  onCreateRun,
  t
}) => {
  if (activeRun) {
    return <RunDashboardView summary={summary} employees={employees} payrollRun={activeRun} t={t} />
  }

  return (
    <RunsListView runs={runs} runsLoading={runsLoading} onSelectRun={onSelectRun} onCreateRun={onCreateRun} t={t} />
  )
}
