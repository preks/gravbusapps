import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  DebouncedInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import {
  ArrowsClockwiseIcon,
  WarningCircleIcon,
  ShieldWarningIcon,
  InfoIcon,
  MagnifyingGlassIcon
} from '@phosphor-icons/react'
import type { PayrollEmployee, PayrollIssue, IssueCategory, IssueSeverity } from '../../../types/payrollTypes'
import { payrollIssueCodeTitle } from '../../../utils/payrollIssueCodeLabels'
import { SeverityBadge } from '../../shared/StatusBadge'
import { ExceptionDetailDrawer } from './ExceptionDetailDrawer'

interface ExceptionsViewProps {
  employees: PayrollEmployee[]
  onRefresh: () => Promise<void>
  refreshing: boolean
  accessToken?: string
  t: (key: string, values?: Record<string, string | number>) => string
}

const CATEGORY_KEYS: Record<IssueCategory, string> = {
  missing_contract_data: 'category-missing-contract-data',
  missing_bank_details: 'category-missing-bank-details',
  missing_salary_data: 'category-missing-salary-data',
  missing_tax_social: 'category-missing-tax-social',
  missing_contract_master_data: 'category-missing-contract-master-data',
  missing_absence_data: 'category-missing-absence-data',
  missing_working_hours: 'category-missing-working-hours',
  pending_final_payroll: 'category-pending-final-payroll',
  other_exceptions: 'category-other-exceptions'
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
  employee: PayrollEmployee
  employeeName: string
  employeeCode: string
}

const EXCEPTIONS_PAGE_SIZE = 10

export const ExceptionsView: React.FC<ExceptionsViewProps> = ({ employees, onRefresh, refreshing, accessToken, t }) => {
  const tWithValues = t as (key: string, values?: Record<string, string | number>) => string
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIssue, setSelectedIssue] = useState<IssueWithEmployee | null>(null)

  const allIssues = useMemo(() => {
    const issues: IssueWithEmployee[] = []
    for (const emp of employees) {
      for (const issue of emp.issues) {
        if (issue.status !== 'open') continue
        issues.push({
          ...issue,
          employee: emp,
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
    const query = search.trim().toLowerCase()
    if (query) {
      result = result.filter(issue => issue.employeeName.toLowerCase().includes(query))
    }
    return result
  }, [allIssues, severityFilter, categoryFilter, search, t])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, severityFilter, categoryFilter])

  useEffect(() => {
    if (filteredIssues.length === 0) {
      return
    }

    const maxPage = Math.max(1, Math.ceil(filteredIssues.length / EXCEPTIONS_PAGE_SIZE))
    if (currentPage > maxPage) {
      setCurrentPage(maxPage)
    }
  }, [currentPage, filteredIssues.length])

  const totalPages = Math.ceil(filteredIssues.length / EXCEPTIONS_PAGE_SIZE)
  const paginatedIssues = filteredIssues.slice(
    (currentPage - 1) * EXCEPTIONS_PAGE_SIZE,
    currentPage * EXCEPTIONS_PAGE_SIZE
  )

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
        <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap gba:pl-2 gba:pt-1">
          <div className="gba:relative gba:flex-1 gba:min-w-[240px] gba:max-w-[360px]">
            <MagnifyingGlassIcon
              size={16}
              className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
            />
            <DebouncedInput
              value={search}
              onChange={(value: string | number) => setSearch(String(value))}
              placeholder={t('filter-search')}
              className="gba:pl-9"
              data-testid="payroll-prep-exceptions-search-input"
            />
          </div>
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
        {paginatedIssues.length === 0 ? (
          <Card
            className="gba:p-8 gba:text-center gba:text-muted-foreground"
            data-testid="payroll-prep-exceptions-empty-state"
          >
            {allIssues.length === 0 ? t('exceptions-empty') : t('exceptions-no-match')}
          </Card>
        ) : (
          paginatedIssues.map(issue => {
            const issueKey = `${issue.employeeId}-${issue.id}-${issue.issueCode}-${issue.createdAt}`
            return (
              <button
                key={issueKey}
                type="button"
                className="gba:block gba:w-full gba:text-left"
                onClick={() => setSelectedIssue(issue)}
                data-issue-code={issue.issueCode}
                data-testid={`payroll-prep-exception-card-${issueKey}`}
              >
                <Card className="gba:p-4 gba:transition-colors gba:hover:bg-muted/30">
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <div className="gba:mt-1">
                      <SeverityIcon severity={issue.severity} />
                    </div>

                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:justify-between gba:mb-1 gba:flex-wrap gba:gap-2">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <span className="gba:text-sm gba:font-semibold gba:text-foreground">
                            {issue.employeeName}
                          </span>
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
              </button>
            )
          })
        )}
      </div>

      {filteredIssues.length > 0 && (
        <div className="gba:flex gba:items-center gba:justify-between gba:border-t gba:border-border gba:px-1 gba:pt-2 gba:text-sm gba:text-muted-foreground">
          <span>
            {tWithValues('exceptions-pagination-showing', {
              start: (currentPage - 1) * EXCEPTIONS_PAGE_SIZE + 1,
              end: Math.min(currentPage * EXCEPTIONS_PAGE_SIZE, filteredIssues.length),
              total: filteredIssues.length
            })}
          </span>
          <div className="gba:flex gba:items-center gba:gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              data-testid="payroll-prep-exceptions-pagination-prev-button"
            >
              {t('grid-pagination-prev')}
            </Button>
            <span className="gba:px-3">
              {currentPage} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages}
              data-testid="payroll-prep-exceptions-pagination-next-button"
            >
              {t('grid-pagination-next')}
            </Button>
          </div>
        </div>
      )}

      <ExceptionDetailDrawer
        issue={selectedIssue}
        employee={selectedIssue?.employee || null}
        accessToken={accessToken}
        onClose={() => setSelectedIssue(null)}
        t={t}
      />
    </div>
  )
}
