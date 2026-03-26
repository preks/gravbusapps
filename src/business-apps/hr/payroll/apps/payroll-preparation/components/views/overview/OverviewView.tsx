import React, { useState, useMemo } from 'react'
import {
  Badge,
  Card,
  CardContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import {
  CheckCircleIcon,
  WarningIcon,
  XCircleIcon,
  MinusCircleIcon,
  UsersIcon,
  ArrowsClockwiseIcon,
  ShieldWarningIcon
} from '@phosphor-icons/react'
import type { PayrollSummary, PayrollRun, PayrollEmployee } from '../../../types/payrollTypes'
import { PayrollRunStatusBadge, ReadinessStatusBadge } from '../../shared/StatusBadge'
import { getPictureDataUrl } from '../../../utils/imageUtils'
import {
  type PanelCategory,
  countOpenWarningsAcrossEmployees,
  filterEmployeesForPanel,
  kpiPanelOnClick,
  panelTitleForCategory
} from './overviewPanelHelpers'

interface OverviewViewProps {
  readonly summary: PayrollSummary
  readonly payrollRun: PayrollRun | null
  readonly employees: PayrollEmployee[]
  readonly t: (key: string) => string
  readonly onNavigateToGrid?: () => void
}

interface KpiCardProps {
  readonly testId: string
  readonly label: string
  readonly value: number | string
  readonly icon: React.ReactNode
  readonly iconBgClass: string
  readonly iconColorClass: string
  readonly onClick?: () => void
}

const KpiCard: React.FC<KpiCardProps> = ({ testId, label, value, icon, iconBgClass, iconColorClass, onClick }) => {
  const interactiveProps = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }
      }
    : {}

  const valueIsPositiveNumber = typeof value === 'number' && value > 0

  return (
    <Card
      data-testid={testId}
      className={onClick ? 'gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow' : ''}
      onClick={onClick}
      {...interactiveProps}
    >
      <CardContent className="gba:p-4 gba:flex gba:items-center gba:gap-4">
        <div className={`gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center ${iconBgClass}`}>
          <span className={iconColorClass}>{icon}</span>
        </div>
        <div>
          <p
            className={`gba:text-2xl gba:font-bold ${valueIsPositiveNumber ? 'gba:text-foreground' : 'gba:text-muted-foreground'}`}
          >
            {value}
          </p>
          <p className="gba:text-sm gba:text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

interface EmployeeListPanelProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly title: string
  readonly employees: PayrollEmployee[]
  readonly t: (key: string) => string
  readonly onViewEmployee?: (employee: PayrollEmployee) => void
}

interface EmployeeListRowProps {
  readonly emp: PayrollEmployee
  readonly onViewEmployee?: (employee: PayrollEmployee) => void
}

const EmployeeListRow: React.FC<EmployeeListRowProps> = ({ emp, onViewEmployee }) => {
  const openIssues = emp.issues.filter(i => i.status === 'open')
  const hasBlockers = openIssues.some(i => i.severity === 'blocker')
  const blockerCount = openIssues.filter(i => i.severity === 'blocker').length
  const warningCount = openIssues.filter(i => i.severity === 'warning').length
  const hasWarnings = warningCount > 0

  return (
    <button
      type="button"
      className="gba:w-full gba:text-left gba:p-4 gba:hover:bg-muted/50 gba:cursor-pointer gba:transition-colors gba:border-0 gba:bg-transparent"
      onClick={() => onViewEmployee?.(emp)}
    >
      <div className="gba:flex gba:items-start gba:gap-3">
        <Avatar size="sm" className="gba:h-10 gba:w-10 gba:flex-shrink-0">
          <AvatarImage src={getPictureDataUrl(emp.pictureThumbnail)} alt={emp.displayName} />
          <AvatarFallback>
            {emp.firstName?.charAt(0) || ''}
            {emp.lastName?.charAt(0) || ''}
          </AvatarFallback>
        </Avatar>

        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{emp.displayName}</p>
            <ReadinessStatusBadge status={emp.readinessStatus} />
          </div>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
            {emp.department} · {emp.code}
          </p>

          {openIssues.length > 0 && (
            <div className="gba:flex gba:gap-2 gba:mt-2 gba:flex-wrap">
              {hasBlockers && (
                <Badge variant="destructive" className="gba:text-xs">
                  {blockerCount} blocker
                  {blockerCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {hasWarnings && (
                <Badge variant="warning" className="gba:text-xs">
                  {warningCount} warning
                  {warningCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}

          {emp.changedSinceLastPayroll ? (
            <Badge variant="outline" className="gba:text-xs gba:mt-2">
              <ArrowsClockwiseIcon size={10} className="gba:mr-1" />
              Changed
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  )
}

const EmployeeListPanel: React.FC<EmployeeListPanelProps> = ({
  isOpen,
  onClose,
  title,
  employees,
  t,
  onViewEmployee
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="gba:w-full sm:gba:max-w-md gba:p-0" style={{ borderRadius: '12px 0 0 12px' }}>
        <SheetHeader className="gba:p-5 gba:border-b gba:border-border">
          <SheetTitle className="gba:text-lg gba:font-semibold">{title}</SheetTitle>
          <p className="gba:text-sm gba:text-muted-foreground">
            {employees.length} {employees.length === 1 ? 'employee' : 'employees'}
          </p>
        </SheetHeader>

        <div className="gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
          {employees.length === 0 ? (
            <div className="gba:p-5 gba:text-center gba:text-muted-foreground">{t('no-data')}</div>
          ) : (
            <div className="gba:divide-y gba:divide-border">
              {employees.map(emp => (
                <EmployeeListRow key={emp.id} emp={emp} onViewEmployee={onViewEmployee} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface OverviewPayrollRunCardProps {
  readonly payrollRun: PayrollRun
}

function OverviewPayrollRunCard({ payrollRun }: OverviewPayrollRunCardProps) {
  return (
    <Card className="gba:p-6">
      <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{payrollRun.legalEntityName}</h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            {payrollRun.year}-{String(payrollRun.month).padStart(2, '0')} · {payrollRun.country}
          </p>
        </div>
        <PayrollRunStatusBadge status={payrollRun.status} />
      </div>
    </Card>
  )
}

interface OverviewKpiGridsProps {
  readonly summary: PayrollSummary
  readonly t: (key: string) => string
  readonly openWarnings: number
  readonly setPanelCategory: (c: PanelCategory) => void
}

function OverviewKpiGrids({ summary, t, openWarnings, setPanelCategory }: OverviewKpiGridsProps) {
  const onReady = kpiPanelOnClick(summary.readyCount, setPanelCategory, 'ready')
  const onBlocked = kpiPanelOnClick(summary.blockedCount, setPanelCategory, 'blocked')
  const onExcluded = kpiPanelOnClick(summary.excludedCount, setPanelCategory, 'excluded')
  const onChanged = kpiPanelOnClick(summary.changedSinceLastPayroll, setPanelCategory, 'changed')
  const onBlockers = kpiPanelOnClick(summary.openBlockers, setPanelCategory, 'blockers')
  const onWarnings = kpiPanelOnClick(openWarnings, setPanelCategory, 'warning')

  return (
    <>
      <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-3 lg:gba:grid-cols-5 gba:gap-4">
        <KpiCard
          testId="payroll-overview-total-card"
          label={t('summary-total')}
          value={summary.totalEmployees}
          icon={<UsersIcon size={20} />}
          iconBgClass="gba:bg-primary/10"
          iconColorClass="gba:text-primary"
          onClick={() => setPanelCategory('total')}
        />
        <KpiCard
          testId="payroll-overview-ready-card"
          label={t('summary-ready')}
          value={summary.readyCount}
          icon={<CheckCircleIcon size={20} weight="fill" />}
          iconBgClass="gba:bg-success/10"
          iconColorClass="gba:text-success"
          onClick={onReady}
        />
        <KpiCard
          testId="payroll-overview-blocked-card"
          label={t('summary-blocked')}
          value={summary.blockedCount}
          icon={<XCircleIcon size={20} weight="fill" />}
          iconBgClass="gba:bg-destructive/10"
          iconColorClass="gba:text-destructive"
          onClick={onBlocked}
        />
        <KpiCard
          testId="payroll-overview-excluded-card"
          label={t('summary-excluded')}
          value={summary.excludedCount}
          icon={<MinusCircleIcon size={20} weight="fill" />}
          iconBgClass="gba:bg-muted"
          iconColorClass="gba:text-muted-foreground"
          onClick={onExcluded}
        />
        <KpiCard
          testId="payroll-overview-changed-card"
          label={t('summary-changed')}
          value={summary.changedSinceLastPayroll}
          icon={<ArrowsClockwiseIcon size={20} />}
          iconBgClass="gba:bg-primary/10"
          iconColorClass="gba:text-primary"
          onClick={onChanged}
        />
      </div>

      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
        <KpiCard
          testId="payroll-overview-blockers-card"
          label={t('summary-blockers')}
          value={summary.openBlockers}
          icon={<ShieldWarningIcon size={20} weight="fill" />}
          iconBgClass="gba:bg-destructive/10"
          iconColorClass="gba:text-destructive"
          onClick={onBlockers}
        />
        <KpiCard
          testId="payroll-overview-warnings-card"
          label={t('summary-open-warnings')}
          value={openWarnings}
          icon={<WarningIcon size={20} weight="fill" />}
          iconBgClass="gba:bg-warning/10"
          iconColorClass="gba:text-warning"
          onClick={onWarnings}
        />
      </div>
    </>
  )
}

interface OverviewReadinessSectionProps {
  readonly summary: PayrollSummary
  readonly t: (key: string) => string
  readonly setPanelCategory: (c: PanelCategory) => void
}

function OverviewReadinessSection({ summary, t, setPanelCategory }: OverviewReadinessSectionProps) {
  if (summary.totalEmployees <= 0) return null

  return (
    <Card className="gba:p-6">
      <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-4">{t('overview-readiness')}</h4>
      <div className="gba:flex gba:h-4 gba:rounded-full gba:overflow-hidden gba:bg-muted">
        {summary.readyCount > 0 && (
          <button
            type="button"
            className="gba:bg-[hsl(var(--success))] gba:transition-all gba:cursor-pointer hover:gba:opacity-80 gba:h-full gba:min-w-0 gba:border-0 gba:p-0"
            style={{ width: `${(summary.readyCount / summary.totalEmployees) * 100}%` }}
            title={`${t('summary-ready')}: ${summary.readyCount}`}
            onClick={() => setPanelCategory('ready')}
          />
        )}
        {summary.warningCount > 0 && (
          <button
            type="button"
            className="gba:bg-[hsl(var(--warning))] gba:transition-all gba:cursor-pointer hover:gba:opacity-80 gba:h-full gba:min-w-0 gba:border-0 gba:p-0"
            style={{ width: `${(summary.warningCount / summary.totalEmployees) * 100}%` }}
            title={`${t('summary-warning')}: ${summary.warningCount}`}
            onClick={() => setPanelCategory('warning')}
          />
        )}
        {summary.blockedCount > 0 && (
          <button
            type="button"
            className="gba:bg-destructive gba:transition-all gba:cursor-pointer hover:gba:opacity-80 gba:h-full gba:min-w-0 gba:border-0 gba:p-0"
            style={{ width: `${(summary.blockedCount / summary.totalEmployees) * 100}%` }}
            title={`${t('summary-blocked')}: ${summary.blockedCount}`}
            onClick={() => setPanelCategory('blocked')}
          />
        )}
        {summary.excludedCount > 0 && (
          <button
            type="button"
            className="gba:bg-muted-foreground/30 gba:transition-all gba:cursor-pointer hover:gba:opacity-80 gba:h-full gba:min-w-0 gba:border-0 gba:p-0"
            style={{ width: `${(summary.excludedCount / summary.totalEmployees) * 100}%` }}
            title={`${t('summary-excluded')}: ${summary.excludedCount}`}
            onClick={() => setPanelCategory('excluded')}
          />
        )}
      </div>
      <div className="gba:flex gba:gap-4 gba:mt-3 gba:flex-wrap">
        <button
          type="button"
          className="gba:bg-transparent gba:border-0 gba:p-0 gba:cursor-pointer"
          onClick={() => setPanelCategory('ready')}
        >
          <Badge variant="success">
            {t('summary-ready')} ({summary.readyCount})
          </Badge>
        </button>
        <button
          type="button"
          className="gba:bg-transparent gba:border-0 gba:p-0 gba:cursor-pointer"
          onClick={() => setPanelCategory('warning')}
        >
          <Badge variant="warning">
            {t('summary-warning')} ({summary.warningCount})
          </Badge>
        </button>
        <button
          type="button"
          className="gba:bg-transparent gba:border-0 gba:p-0 gba:cursor-pointer"
          onClick={() => setPanelCategory('blocked')}
        >
          <Badge variant="destructive">
            {t('summary-blocked')} ({summary.blockedCount})
          </Badge>
        </button>
        <button
          type="button"
          className="gba:bg-transparent gba:border-0 gba:p-0 gba:cursor-pointer"
          onClick={() => setPanelCategory('excluded')}
        >
          <Badge variant="secondary">
            {t('summary-excluded')} ({summary.excludedCount})
          </Badge>
        </button>
      </div>
    </Card>
  )
}

export const OverviewView: React.FC<OverviewViewProps> = ({ summary, payrollRun, employees, t, onNavigateToGrid }) => {
  const [panelCategory, setPanelCategory] = useState<PanelCategory>(null)

  const filteredEmployees = useMemo(() => filterEmployeesForPanel(employees, panelCategory), [panelCategory, employees])

  const panelTitle = useMemo(() => panelTitleForCategory(panelCategory, t), [panelCategory, t])

  const openWarnings = useMemo(() => countOpenWarningsAcrossEmployees(employees), [employees])

  const handleViewEmployee = () => {
    setPanelCategory(null)
    onNavigateToGrid?.()
  }

  return (
    <div className="gba:space-y-6">
      {payrollRun ? <OverviewPayrollRunCard payrollRun={payrollRun} /> : null}

      <OverviewKpiGrids summary={summary} t={t} openWarnings={openWarnings} setPanelCategory={setPanelCategory} />

      <OverviewReadinessSection summary={summary} t={t} setPanelCategory={setPanelCategory} />

      <EmployeeListPanel
        isOpen={panelCategory !== null}
        onClose={() => setPanelCategory(null)}
        title={panelTitle}
        employees={filteredEmployees}
        t={t}
        onViewEmployee={handleViewEmployee}
      />
    </div>
  )
}
