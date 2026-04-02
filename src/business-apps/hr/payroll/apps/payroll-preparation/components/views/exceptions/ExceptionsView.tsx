import React, { useState, useMemo, useCallback } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { WarningCircleIcon, ShieldWarningIcon, InfoIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'
import type { PayrollEmployee, PayrollIssue, IssueCategory, IssueSeverity } from '../../../types/payrollTypes'
import { SeverityBadge } from '../../shared/StatusBadge'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface ExceptionsViewProps {
  employees: PayrollEmployee[]
  onRefresh: () => Promise<void>
  refreshing: boolean
  t: (key: string) => string
}

const CATEGORY_KEYS: Record<IssueCategory, string> = {
  missing_personal_data: 'category-missing-personal-data',
  missing_bank_details: 'category-missing-bank-details',
  missing_contract_salary: 'category-missing-contract-salary',
  missing_tax_social: 'category-missing-tax-social',
  missing_country_specific: 'category-missing-country-specific',
  missing_approvals: 'category-missing-approvals',
  missing_absence_data: 'category-missing-absence-data',
  overlapping_absences: 'category-overlapping-absences',
  retroactive_changes: 'category-retroactive-changes',
  pending_final_payroll: 'category-pending-final-payroll',
  invalid_effective_dates: 'category-invalid-effective-dates'
}

const SeverityIcon: React.FC<{ severity: IssueSeverity }> = ({ severity }) => {
  switch (severity) {
    case 'blocker':
      return <ShieldWarningIcon size={16} weight="fill" className="gba:text-destructive" />
    case 'warning':
      return <WarningCircleIcon size={16} weight="fill" className="gba:text-warning" />
    case 'info':
      return <InfoIcon size={16} weight="fill" className="gba:text-primary" />
  }
}

interface IssueWithEmployee extends PayrollIssue {
  employeeName: string
  employeeCode: string
}

export const ExceptionsView: React.FC<ExceptionsViewProps> = ({ employees, onRefresh, refreshing, t }) => {
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'all'>('all')
  const [addressedIds, setAddressedIds] = useState<Set<string>>(new Set())
  const [hideAddressed, setHideAddressed] = useState(false)

  const toggleAddressed = useCallback((issueKey: string) => {
    setAddressedIds(prev => {
      const next = new Set(prev)
      if (next.has(issueKey)) {
        next.delete(issueKey)
      } else {
        next.add(issueKey)
      }
      return next
    })
  }, [])

  const allIssues = useMemo(() => {
    const issues: IssueWithEmployee[] = []
    for (const emp of employees) {
      for (const issue of emp.issues) {
        if (issue.status !== 'open') continue
        issues.push({
          ...issue,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeCode: emp.code
        })
      }
    }
    return issues
  }, [employees])

  const filteredIssues = useMemo(() => {
    let result = allIssues
    if (severityFilter !== 'all') {
      result = result.filter(i => i.severity === severityFilter)
    }
    if (categoryFilter !== 'all') {
      result = result.filter(i => i.category === categoryFilter)
    }
    if (hideAddressed) {
      result = result.filter(i => !addressedIds.has(`${i.employeeId}-${i.issueCode}`))
    }
    return result
  }, [allIssues, severityFilter, categoryFilter, hideAddressed, addressedIds])

  const { blockerCount, warningCount, infoCount, affectedEmployees } = useMemo(() => {
    let blockers = 0
    let warnings = 0
    let infos = 0
    const employeeIds = new Set<string>()
    for (const issue of allIssues) {
      if (issue.severity === 'blocker') blockers++
      else if (issue.severity === 'warning') warnings++
      else if (issue.severity === 'info') infos++
      employeeIds.add(issue.employeeId)
    }
    return { blockerCount: blockers, warningCount: warnings, infoCount: infos, affectedEmployees: employeeIds.size }
  }, [allIssues])

  const handleNavigateForIssue = useCallback((employeeId: string, category: IssueCategory) => {
    switch (category) {
      case 'missing_personal_data':
      case 'missing_bank_details':
        navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId, tab: 'hrAdmin', subView: 'details' }))
        break
      case 'missing_contract_salary':
      case 'missing_tax_social':
      case 'missing_country_specific':
      case 'pending_final_payroll':
      case 'invalid_effective_dates':
        navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId, tab: 'hrAdmin', subView: 'employment' }))
        break
      case 'missing_approvals':
        navigateTo(buildPlatformUrl('/platform/task-manager', { view: 'inbox' }))
        break
      case 'missing_absence_data':
      case 'overlapping_absences':
        navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId, tab: 'absences' }))
        break
      case 'retroactive_changes':
        navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId, tab: 'hrAdmin', subView: 'changeLog' }))
        break
      default:
        navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId, tab: 'hrAdmin', subView: 'details' }))
    }
  }, [])

  return (
    <div className="gba:space-y-6">
      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
        <Card className="gba:p-4 gba:text-center">
          <p className="gba:text-2xl gba:font-bold gba:text-destructive">{blockerCount}</p>
          <p className="gba:text-sm gba:text-muted-foreground">{t('severity-blocker')}s</p>
        </Card>
        <Card className="gba:p-4 gba:text-center">
          <p className="gba:text-2xl gba:font-bold gba:text-warning">{warningCount}</p>
          <p className="gba:text-sm gba:text-muted-foreground">{t('severity-warning')}s</p>
        </Card>
        <Card className="gba:p-4 gba:text-center">
          <p className="gba:text-2xl gba:font-bold gba:text-primary">{infoCount}</p>
          <p className="gba:text-sm gba:text-muted-foreground">{t('severity-info')}</p>
        </Card>
        <Card className="gba:p-4 gba:text-center">
          <p className="gba:text-2xl gba:font-bold gba:text-foreground">{affectedEmployees}</p>
          <p className="gba:text-sm gba:text-muted-foreground">{t('summary-total')}</p>
        </Card>
      </div>

      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:flex-wrap">
        <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">
              {t('label-severity')}
            </span>
            <div className="gba:min-w-[140px]">
              <Select
                value={severityFilter}
                onValueChange={(val: string) => setSeverityFilter(val as IssueSeverity | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter-all')}</SelectItem>
                  <SelectItem value="blocker">{t('severity-blocker')}</SelectItem>
                  <SelectItem value="warning">{t('severity-warning')}</SelectItem>
                  <SelectItem value="info">{t('severity-info')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">
              {t('label-category')}
            </span>
            <div className="gba:min-w-[200px]">
              <Select
                value={categoryFilter}
                onValueChange={(val: string) => setCategoryFilter(val as IssueCategory | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter-all')}</SelectItem>
                  {Object.entries(CATEGORY_KEYS).map(([key, i18nKey]) => (
                    <SelectItem key={key} value={key}>
                      {t(i18nKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {addressedIds.size > 0 && (
            <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
              <Checkbox checked={hideAddressed} onCheckedChange={checked => setHideAddressed(!!checked)} />
              <span className="gba:text-sm gba:text-muted-foreground">
                {t('exceptions-hide-addressed')} ({addressedIds.size})
              </span>
            </label>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          <ArrowsClockwiseIcon size={16} className={refreshing ? 'gba:animate-spin' : ''} />
          {t('refresh-data')}
        </Button>
      </div>

      <div className="gba:space-y-2">
        {filteredIssues.length === 0 ? (
          <Card className="gba:p-8 gba:text-center gba:text-muted-foreground">
            {allIssues.length === 0
              ? 'No exceptions found. All employees pass validation.'
              : 'No issues match the selected filters.'}
          </Card>
        ) : (
          filteredIssues.map(issue => {
            const issueKey = `${issue.employeeId}-${issue.issueCode}`
            const isAddressed = addressedIds.has(issueKey)
            return (
              <Card
                key={issueKey}
                className={`gba:p-4 gba:transition-colors ${isAddressed ? 'gba:opacity-50' : 'gba:hover:bg-muted/50'}`}
              >
                <div className="gba:flex gba:items-start gba:gap-3">
                  <Checkbox
                    checked={isAddressed}
                    onCheckedChange={() => toggleAddressed(issueKey)}
                    aria-label={t('exceptions-mark-addressed')}
                    className="gba:mt-0.5"
                  />
                  <SeverityIcon severity={issue.severity} />
                  <button
                    type="button"
                    className="gba:flex-1 gba:min-w-0 gba:cursor-pointer gba:text-left"
                    onClick={() => handleNavigateForIssue(issue.employeeId, issue.category)}
                  >
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-1 gba:flex-wrap gba:gap-2">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span
                          className={`gba:text-sm gba:font-semibold ${isAddressed ? 'gba:line-through gba:text-muted-foreground' : 'gba:text-foreground'}`}
                        >
                          {issue.employeeName}
                        </span>
                        <span className="gba:text-xs gba:text-muted-foreground gba:font-mono">
                          {issue.employeeCode}
                        </span>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:text-xs gba:font-mono gba:text-muted-foreground">{issue.issueCode}</span>
                        <SeverityBadge severity={issue.severity} t={t} />
                      </div>
                    </div>
                    <p
                      className={`gba:text-sm gba:mb-1 ${isAddressed ? 'gba:line-through gba:text-muted-foreground' : 'gba:text-foreground'}`}
                    >
                      {issue.message}
                    </p>
                    <p className="gba:text-xs gba:text-primary">{issue.recommendedAction}</p>
                  </button>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
