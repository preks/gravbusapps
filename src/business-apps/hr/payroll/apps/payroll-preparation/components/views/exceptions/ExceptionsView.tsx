import React, { useState, useMemo, useCallback } from 'react'
import { Card, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { WarningCircleIcon, ShieldWarningIcon, InfoIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import type { PayrollEmployee, PayrollIssue, IssueCategory, IssueSeverity } from '../../../types/payrollTypes'
import { SeverityBadge } from '../../shared/StatusBadge'
import { Navigation, navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface ExceptionsViewProps {
  readonly employees: PayrollEmployee[]
  readonly t: (key: string) => string
}

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  missing_personal_data: 'Missing Personal Data',
  missing_bank_details: 'Missing Bank Details',
  missing_contract_salary: 'Missing Contract/Salary',
  missing_tax_social: 'Missing Tax/Social Data',
  missing_country_specific: 'Missing Country-Specific Data',
  missing_approvals: 'Missing Approvals',
  missing_absence_data: 'Missing Absence Data',
  overlapping_absences: 'Overlapping Absences',
  retroactive_changes: 'Retroactive Changes',
  pending_final_payroll: 'Pending Final Payroll',
  invalid_effective_dates: 'Invalid Effective Dates'
}

/**
 * Maps issue categories to the appropriate employee-record tab and subView.
 * Uses the legacy tab shortcuts that employee-record supports.
 */
const CATEGORY_TO_TAB: Record<IssueCategory, { tab: string; subView?: string }> = {
  missing_personal_data: { tab: 'hrAdmin', subView: 'details' },
  missing_bank_details: { tab: 'hrAdmin', subView: 'details' },
  missing_contract_salary: { tab: 'compensation', subView: 'currentCompensation' },
  missing_tax_social: { tab: 'hrAdmin', subView: 'details' },
  missing_country_specific: { tab: 'hrAdmin', subView: 'details' },
  missing_approvals: { tab: 'absences' },
  missing_absence_data: { tab: 'absences' },
  overlapping_absences: { tab: 'absences' },
  retroactive_changes: { tab: 'hrAdmin', subView: 'changeLog' },
  pending_final_payroll: { tab: 'compensation', subView: 'currentCompensation' },
  invalid_effective_dates: { tab: 'hrAdmin', subView: 'employment' }
}

interface IssueWithEmployee extends PayrollIssue {
  employeeName: string
  employeeCode: string
}

function IssueSeverityIcon({ severity }: Readonly<{ severity: IssueSeverity }>) {
  switch (severity) {
    case 'blocker':
      return <ShieldWarningIcon size={16} weight="fill" className="gba:text-destructive" />
    case 'warning':
      return <WarningCircleIcon size={16} weight="fill" className="gba:text-warning" />
    case 'info':
      return <InfoIcon size={16} weight="fill" className="gba:text-primary" />
  }
}

export const ExceptionsView: React.FC<ExceptionsViewProps> = ({ employees, t }) => {
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'all'>('all')

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
    return result
  }, [allIssues, severityFilter, categoryFilter])

  const blockerCount = allIssues.filter(i => i.severity === 'blocker').length
  const warningCount = allIssues.filter(i => i.severity === 'warning').length
  const infoCount = allIssues.filter(i => i.severity === 'info').length
  const affectedEmployees = new Set(allIssues.map(i => i.employeeId)).size

  const handleIssueClick = useCallback((issue: IssueWithEmployee) => {
    const tabConfig = CATEGORY_TO_TAB[issue.category]
    const params: Record<string, string> = {
      id: issue.employeeId,
      tab: tabConfig.tab
    }
    if (tabConfig.subView) {
      params.subView = tabConfig.subView
    }
    navigateTo(buildPlatformUrl(Navigation.HR_EMPLOYEE_RECORD, params))
  }, [])

  return (
    <div className="gba:space-y-6">
      {/* Summary KPIs */}
      <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-4">
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

      {/* Filters */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap">
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
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Issues List */}
      <div className="gba:space-y-2">
        {filteredIssues.length === 0 ? (
          <Card className="gba:p-8 gba:text-center gba:text-muted-foreground">
            {allIssues.length === 0
              ? 'No exceptions found. All employees pass validation.'
              : 'No issues match the selected filters.'}
          </Card>
        ) : (
          filteredIssues.map(issue => (
            <Card
              key={`${issue.employeeId}-${issue.issueCode}`}
              className="gba:p-4 gba:cursor-pointer gba:transition-colors gba:hover:bg-muted/50"
              onClick={() => handleIssueClick(issue)}
            >
              <div className="gba:flex gba:items-start gba:gap-3">
                <IssueSeverityIcon severity={issue.severity} />
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-1 gba:flex-wrap gba:gap-2">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span className="gba:text-sm gba:font-semibold gba:text-foreground">{issue.employeeName}</span>
                      <span className="gba:text-xs gba:text-muted-foreground gba:font-mono">{issue.employeeCode}</span>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span className="gba:text-xs gba:font-mono gba:text-muted-foreground">{issue.issueCode}</span>
                      <SeverityBadge severity={issue.severity} />
                      <ArrowSquareOutIcon size={14} className="gba:text-muted-foreground" />
                    </div>
                  </div>
                  <p className="gba:text-sm gba:text-foreground gba:mb-1">{issue.message}</p>
                  <p className="gba:text-xs gba:text-primary">{issue.recommendedAction}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
