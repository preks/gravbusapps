import React, { useState, useMemo } from 'react'
import { Button, Card, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { ArrowsClockwiseIcon, WarningCircleIcon, ShieldWarningIcon, InfoIcon } from '@phosphor-icons/react'
import type { PayrollEmployee, PayrollIssue, IssueCategory, IssueSeverity } from '../../../types/payrollTypes'
import { payrollIssueCodeTitle } from '../../../utils/payrollIssueCodeLabels'
import { SeverityBadge } from '../../shared/StatusBadge'

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

  const allIssues = useMemo(() => {
    const issues: IssueWithEmployee[] = []
    for (const emp of employees) {
      for (const issue of emp.issues) {
        if (issue.status !== 'open') continue
        issues.push({
          ...issue,
          employeeName: emp.fullName,
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
    return result
  }, [allIssues, severityFilter, categoryFilter])

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

  return (
    <div className="gba:space-y-6" data-testid="payroll-prep-exceptions-view">
      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
        <Card className="gba:p-4 gba:min-h-[96px]">
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full">
            <p className="gba:text-2xl gba:font-bold gba:text-destructive">{blockerCount}</p>
            <p className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">{t('severity-blocker')}s</p>
          </div>
        </Card>
        <Card className="gba:p-4 gba:min-h-[96px]">
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full">
            <p className="gba:text-2xl gba:font-bold gba:text-warning">{warningCount}</p>
            <p className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">{t('severity-warning')}s</p>
          </div>
        </Card>
        <Card className="gba:p-4 gba:min-h-[96px]">
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full">
            <p className="gba:text-2xl gba:font-bold gba:text-primary">{infoCount}</p>
            <p className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">{t('severity-info')}</p>
          </div>
        </Card>
        <Card className="gba:p-4 gba:min-h-[96px]">
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full">
            <p className="gba:text-2xl gba:font-bold gba:text-foreground">{affectedEmployees}</p>
            <p className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">{t('summary-total')}</p>
          </div>
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
                <SelectTrigger data-testid="payroll-prep-exceptions-severity-select">
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
                <SelectTrigger data-testid="payroll-prep-exceptions-category-select">
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
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          data-testid="payroll-prep-exceptions-refresh-button"
        >
          <ArrowsClockwiseIcon size={16} className={refreshing ? 'gba:animate-spin' : ''} />
          {t('refresh-data')}
        </Button>
      </div>

      {/* Issues List */}
      <div className="gba:space-y-2">
        {filteredIssues.length === 0 ? (
          <Card
            className="gba:p-8 gba:text-center gba:text-muted-foreground"
            data-testid="payroll-prep-exceptions-empty-state"
          >
            {allIssues.length === 0
              ? 'No exceptions found. All employees pass validation.'
              : 'No issues match the selected filters.'}
          </Card>
        ) : (
          filteredIssues.map(issue => {
            const issueKey = `${issue.employeeId}-${issue.issueCode}`
            return (
              <Card
                key={issueKey}
                className="gba:p-4"
                data-issue-code={issue.issueCode}
                data-testid={`payroll-prep-exception-card-${issueKey}`}
              >
                <div className="gba:flex gba:items-start gba:gap-3">
                  <div className="gba:mt-1">
                    <SeverityIcon severity={issue.severity} />
                  </div>

                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-1 gba:flex-wrap gba:gap-2">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:text-sm gba:font-semibold gba:text-foreground">{issue.employeeName}</span>
                        <span className="gba:text-xs gba:text-muted-foreground gba:font-mono">
                          {issue.employeeCode}
                        </span>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                        <span
                          className="gba:text-xs gba:font-medium gba:text-foreground gba:truncate"
                          title={issue.issueCode}
                        >
                          {payrollIssueCodeTitle(issue.issueCode, t)}
                        </span>
                        <SeverityBadge severity={issue.severity} t={t} />
                      </div>
                    </div>
                    <p className="gba:text-sm gba:mb-1 gba:text-foreground">{issue.message}</p>
                    <p className="gba:text-xs gba:text-primary">{issue.recommendedAction}</p>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
