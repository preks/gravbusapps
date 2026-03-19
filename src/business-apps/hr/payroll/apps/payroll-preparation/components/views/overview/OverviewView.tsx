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

type PanelCategory = 'total' | 'ready' | 'warning' | 'blocked' | 'excluded' | 'blockers' | 'changed' | null

interface OverviewViewProps {
  summary: PayrollSummary
  payrollRun: PayrollRun | null
  employees: PayrollEmployee[]
  t: (key: string) => string
  onNavigateToGrid?: () => void
}

interface KpiCardProps {
  testId: string
  label: string
  value: number | string
  icon: React.ReactNode
  iconBgClass: string
  iconColorClass: string
  onClick?: () => void
}

const KpiCard: React.FC<KpiCardProps> = ({ testId, label, value, icon, iconBgClass, iconColorClass, onClick }) => (
  <Card
    data-testid={testId}
    className={onClick ? 'gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow' : ''}
    onClick={onClick}
  >
    <CardContent className="gba:p-4 gba:flex gba:items-center gba:gap-4">
      <div className={`gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center ${iconBgClass}`}>
        <span className={iconColorClass}>{icon}</span>
      </div>
      <div>
        <p
          className={`gba:text-2xl gba:font-bold ${typeof value === 'number' && value > 0 ? 'gba:text-foreground' : 'gba:text-muted-foreground'}`}
        >
          {value}
        </p>
        <p className="gba:text-sm gba:text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
)

interface EmployeeListPanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  employees: PayrollEmployee[]
  t: (key: string) => string
  onViewEmployee?: (employee: PayrollEmployee) => void
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
              {employees.map(emp => {
                const openIssues = emp.issues.filter(i => i.status === 'open')
                const hasBlockers = openIssues.some(i => i.severity === 'blocker')

                return (
                  <div
                    key={emp.id}
                    className="gba:p-4 gba:hover:bg-muted/50 gba:cursor-pointer gba:transition-colors"
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
                          <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                            {emp.displayName}
                          </p>
                          <ReadinessStatusBadge status={emp.readinessStatus} />
                        </div>
                        <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                          {emp.department} · {emp.code}
                        </p>

                        {openIssues.length > 0 && (
                          <div className="gba:flex gba:gap-2 gba:mt-2 gba:flex-wrap">
                            {hasBlockers && (
                              <Badge variant="destructive" className="gba:text-xs">
                                {openIssues.filter(i => i.severity === 'blocker').length} blocker
                                {openIssues.filter(i => i.severity === 'blocker').length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {openIssues.filter(i => i.severity === 'warning').length > 0 && (
                              <Badge variant="warning" className="gba:text-xs">
                                {openIssues.filter(i => i.severity === 'warning').length} warning
                                {openIssues.filter(i => i.severity === 'warning').length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        )}

                        {emp.changedSinceLastPayroll && (
                          <Badge variant="outline" className="gba:text-xs gba:mt-2">
                            <ArrowsClockwiseIcon size={10} className="gba:mr-1" />
                            Changed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export const OverviewView: React.FC<OverviewViewProps> = ({ summary, payrollRun, employees, t, onNavigateToGrid }) => {
  const [panelCategory, setPanelCategory] = useState<PanelCategory>(null)

  const filteredEmployees = useMemo(() => {
    if (!panelCategory) return []

    switch (panelCategory) {
      case 'total':
        return employees
      case 'ready':
        return employees.filter(e => e.readinessStatus === 'ready')
      case 'warning':
        return employees.filter(e => e.readinessStatus === 'warning')
      case 'blocked':
        return employees.filter(e => e.readinessStatus === 'blocked')
      case 'excluded':
        return employees.filter(e => e.readinessStatus === 'excluded')
      case 'blockers':
        return employees.filter(e => e.issues.some(i => i.severity === 'blocker' && i.status === 'open'))
      case 'changed':
        return employees.filter(e => e.changedSinceLastPayroll)
      default:
        return []
    }
  }, [panelCategory, employees])

  const panelTitle = useMemo(() => {
    switch (panelCategory) {
      case 'total':
        return t('summary-total')
      case 'ready':
        return t('summary-ready')
      case 'warning':
        return t('summary-warning')
      case 'blocked':
        return t('summary-blocked')
      case 'excluded':
        return t('summary-excluded')
      case 'blockers':
        return t('summary-blockers')
      case 'changed':
        return t('summary-changed')
      default:
        return ''
    }
  }, [panelCategory, t])

  const openWarnings = useMemo(() => {
    return employees.reduce((acc, emp) => {
      return acc + emp.issues.filter(i => i.severity === 'warning' && i.status === 'open').length
    }, 0)
  }, [employees])

  const handleViewEmployee = () => {
    setPanelCategory(null)
    onNavigateToGrid?.()
  }

  return (
    <div className="gba:space-y-6">
      {payrollRun && (
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
      )}

      {/* Row 1: 5 cards - Total, Ready, Blocked, Excluded, Changed */}
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
          onClick={summary.readyCount > 0 ? () => setPanelCategory('ready') : undefined}
        />
        <KpiCard
          testId="payroll-overview-blocked-card"
          label={t('summary-blocked')}
          value={summary.blockedCount}
          icon={<XCircleIcon size={20} weight="fill" />}
          iconBgClass="gba:bg-destructive/10"
          iconColorClass="gba:text-destructive"
          onClick={summary.blockedCount > 0 ? () => setPanelCategory('blocked') : undefined}
        />
        <KpiCard
          testId="payroll-overview-excluded-card"
          label={t('summary-excluded')}
          value={summary.excludedCount}
          icon={<MinusCircleIcon size={20} weight="fill" />}
          iconBgClass="gba:bg-muted"
          iconColorClass="gba:text-muted-foreground"
          onClick={summary.excludedCount > 0 ? () => setPanelCategory('excluded') : undefined}
        />
        <KpiCard
          testId="payroll-overview-changed-card"
          label={t('summary-changed')}
          value={summary.changedSinceLastPayroll}
          icon={<ArrowsClockwiseIcon size={20} />}
          iconBgClass="gba:bg-primary/10"
          iconColorClass="gba:text-primary"
          onClick={summary.changedSinceLastPayroll > 0 ? () => setPanelCategory('changed') : undefined}
        />
      </div>

      {/* Row 2: 2 cards - Open Blockers, Open Warnings */}
      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
        <KpiCard
          testId="payroll-overview-blockers-card"
          label={t('summary-blockers')}
          value={summary.openBlockers}
          icon={<ShieldWarningIcon size={20} weight="fill" />}
          iconBgClass="gba:bg-destructive/10"
          iconColorClass="gba:text-destructive"
          onClick={summary.openBlockers > 0 ? () => setPanelCategory('blockers') : undefined}
        />
        <KpiCard
          testId="payroll-overview-warnings-card"
          label={t('summary-open-warnings')}
          value={openWarnings}
          icon={<WarningIcon size={20} weight="fill" />}
          iconBgClass="gba:bg-warning/10"
          iconColorClass="gba:text-warning"
          onClick={openWarnings > 0 ? () => setPanelCategory('warning') : undefined}
        />
      </div>

      {/* Readiness distribution */}
      {summary.totalEmployees > 0 && (
        <Card className="gba:p-6">
          <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-4">{t('overview-readiness')}</h4>
          <div className="gba:flex gba:h-4 gba:rounded-full gba:overflow-hidden gba:bg-muted">
            {summary.readyCount > 0 && (
              <div
                className="gba:bg-[hsl(var(--success))] gba:transition-all gba:cursor-pointer hover:gba:opacity-80"
                style={{ width: `${(summary.readyCount / summary.totalEmployees) * 100}%` }}
                title={`${t('summary-ready')}: ${summary.readyCount}`}
                onClick={() => setPanelCategory('ready')}
              />
            )}
            {summary.warningCount > 0 && (
              <div
                className="gba:bg-[hsl(var(--warning))] gba:transition-all gba:cursor-pointer hover:gba:opacity-80"
                style={{ width: `${(summary.warningCount / summary.totalEmployees) * 100}%` }}
                title={`${t('summary-warning')}: ${summary.warningCount}`}
                onClick={() => setPanelCategory('warning')}
              />
            )}
            {summary.blockedCount > 0 && (
              <div
                className="gba:bg-destructive gba:transition-all gba:cursor-pointer hover:gba:opacity-80"
                style={{ width: `${(summary.blockedCount / summary.totalEmployees) * 100}%` }}
                title={`${t('summary-blocked')}: ${summary.blockedCount}`}
                onClick={() => setPanelCategory('blocked')}
              />
            )}
            {summary.excludedCount > 0 && (
              <div
                className="gba:bg-muted-foreground/30 gba:transition-all gba:cursor-pointer hover:gba:opacity-80"
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
      )}

      {/* Employee list side panel */}
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
