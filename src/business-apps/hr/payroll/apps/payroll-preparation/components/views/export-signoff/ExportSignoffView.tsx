import React, { useState, useMemo } from 'react'
import { Card, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { ExportIcon, CheckCircleIcon, ClockIcon, FunnelIcon } from '@phosphor-icons/react'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import type {
  PayrollEmployee,
  PayrollRun,
  PayrollRunStatus,
  ExportOptions,
  AuditEvent,
  PayrollSummary,
  SignOffData
} from '../../../types/payrollTypes'
import {
  generatePayrollCSV,
  generatePayrollXLSX,
  generateExceptionsCSV,
  downloadCSV,
  downloadBlob,
  getExportableEmployees
} from '../../../utils/exportUtils'
import { PayrollRunStatusBadge } from '../../shared/StatusBadge'

function getUserDisplayName(userInfo?: UserInfoProps): string {
  if (!userInfo) return 'Unknown'
  const emp = userInfo.employeeDetails
  if (emp?.displayName) return emp.displayName
  if (emp?.firstName && emp?.lastName) return `${emp.firstName} ${emp.lastName}`
  if (userInfo.givenName && userInfo.familyName) return `${userInfo.givenName} ${userInfo.familyName}`
  return userInfo.userName || 'Unknown'
}

interface ExportSignoffViewProps {
  employees: PayrollEmployee[]
  filteredEmployees: PayrollEmployee[]
  gridFiltersActive: boolean
  payrollRun: PayrollRun | null
  summary: PayrollSummary
  auditEvents: AuditEvent[]
  userInfo?: UserInfoProps
  updateStatus: (status: PayrollRunStatus) => Promise<void>
  signOff: (data: SignOffData) => Promise<void>
  recordExport: (mode: string, count: number) => void
  saving: boolean
  t: (key: string) => string
}

export const ExportSignoffView: React.FC<ExportSignoffViewProps> = ({
  employees,
  filteredEmployees,
  gridFiltersActive,
  payrollRun,
  summary,
  auditEvents,
  userInfo,
  updateStatus,
  signOff,
  recordExport,
  saving,
  t
}) => {
  const [exportMode, setExportMode] = useState<ExportOptions['mode']>('ready_only')
  const [includeIssues, setIncludeIssues] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv')
  const [applyGridFilters, setApplyGridFilters] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [reviewComment, setReviewComment] = useState('')

  const sourceEmployees = applyGridFilters ? filteredEmployees : employees

  const exportCount = useMemo(() => {
    const opts: ExportOptions = { mode: exportMode, includeIssueSummary: false, format: 'csv', applyGridFilters }
    return getExportableEmployees(sourceEmployees, opts).length
  }, [sourceEmployees, exportMode, applyGridFilters])

  const fallbackRun: PayrollRun = useMemo(
    () => ({
      id: 'draft',
      month: 0,
      year: 0,
      country: 'DE',
      legalEntityId: '',
      legalEntityName: '',
      cutOffDate: '',
      paymentDate: '',
      status: 'PAYROLL_IN_PROGRESS' as PayrollRunStatus,
      version: 0,
      isDeleted: false,
      createdBy: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    []
  )

  const effectiveRun = payrollRun || fallbackRun

  const handleExport = async () => {
    const options: ExportOptions = {
      mode: exportMode,
      includeIssueSummary: includeIssues,
      format: exportFormat,
      applyGridFilters
    }

    setExporting(true)
    try {
      const baseFilename = `payroll_${effectiveRun.country}_${effectiveRun.year}-${String(effectiveRun.month).padStart(2, '0')}_${(effectiveRun.legalEntityName || 'export').replace(/\s+/g, '_')}`

      if (exportFormat === 'xlsx') {
        const blob = await generatePayrollXLSX(sourceEmployees, effectiveRun, options)
        downloadBlob(blob, `${baseFilename}.xlsx`)
      } else {
        const csv = generatePayrollCSV(sourceEmployees, effectiveRun, options)
        downloadCSV(csv, `${baseFilename}.csv`)
      }

      recordExport(options.mode, exportCount)
      if (payrollRun) {
        await updateStatus('PAYROLL_EXPORTED')
      }
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } finally {
      setExporting(false)
    }
  }

  const handleExportExceptions = () => {
    const csv = generateExceptionsCSV(sourceEmployees)
    const filename = `payroll_exceptions_${effectiveRun.country}_${effectiveRun.year}-${String(effectiveRun.month).padStart(2, '0')}.csv`
    downloadCSV(csv, filename)
  }

  const displayName = getUserDisplayName(userInfo)

  const handleApprove = async () => {
    if (!payrollRun) return
    await signOff({
      preparedBy: displayName,
      preparedAt: new Date().toISOString(),
      reviewedBy: displayName,
      reviewedAt: new Date().toISOString(),
      approvalDecision: 'approved',
      comments: reviewComment
    })
  }

  const handleMarkReady = async () => {
    await updateStatus('PAYROLL_READY_FOR_REVIEW')
  }

  return (
    <div className="gba:space-y-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card className="gba:p-6">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">
            <ExportIcon size={20} className="gba:inline gba:mr-2" />
            {t('export-title')}
          </h3>

          <div className="gba:space-y-4">
            <div className="gba:grid gba:grid-cols-2 gba:gap-3">
              <div>
                <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                  {t('export-mode-label')}
                </label>
                <Select value={exportMode} onValueChange={(val: string) => setExportMode(val as ExportOptions['mode'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ready_only">{t('export-mode-ready')}</SelectItem>
                    <SelectItem value="ready_and_warning">{t('export-mode-ready-warning')}</SelectItem>
                    <SelectItem value="all">{t('export-mode-all')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                  {t('export-format-label')}
                </label>
                <Select value={exportFormat} onValueChange={(val: string) => setExportFormat(val as 'csv' | 'xlsx')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">{t('export-format-csv')}</SelectItem>
                    <SelectItem value="xlsx">{t('export-format-xlsx')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="gba:space-y-2">
              <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeIssues}
                  onChange={e => setIncludeIssues(e.target.checked)}
                  className="gba:rounded gba:border-border"
                />
                {t('export-include-issues')}
              </label>

              <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyGridFilters}
                  onChange={e => setApplyGridFilters(e.target.checked)}
                  className="gba:rounded gba:border-border"
                />
                <span
                  className={gridFiltersActive ? 'gba:text-foreground gba:font-medium' : 'gba:text-muted-foreground'}
                >
                  {t('export-apply-grid-filters')}
                </span>
                {gridFiltersActive && <FunnelIcon size={14} weight="fill" className="gba:text-primary" />}
              </label>
              {applyGridFilters && gridFiltersActive && (
                <p className="gba:text-xs gba:text-muted-foreground gba:ml-6">
                  {t('export-grid-filters-active', { count: filteredEmployees.length, total: employees.length })}
                </p>
              )}
            </div>

            <div className="gba:flex gba:gap-3">
              <Button onClick={handleExport} disabled={exportCount === 0 || exporting}>
                <ExportIcon size={16} className="gba:mr-2" />
                {t('export-button')} ({exportCount})
              </Button>
              <Button variant="outline" onClick={handleExportExceptions}>
                {t('export-exceptions-button')}
              </Button>
            </div>

            {exportSuccess && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                <CheckCircleIcon size={16} weight="fill" className="gba:text-success" />
                {t('export-success')}
              </div>
            )}
          </div>
        </Card>

        <Card className="gba:p-6">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">{t('signoff-title')}</h3>

          <div className="gba:space-y-4">
            {payrollRun && (
              <div className="gba:space-y-2 gba:text-sm">
                <div className="gba:flex gba:justify-between">
                  <span className="gba:text-muted-foreground">{t('signoff-status')}</span>
                  <PayrollRunStatusBadge status={payrollRun.status} />
                </div>
                <div className="gba:flex gba:justify-between">
                  <span className="gba:text-muted-foreground">{t('signoff-current-user')}</span>
                  <span className="gba:text-foreground gba:font-medium">{displayName}</span>
                </div>
                {payrollRun.preparedBy && (
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:text-muted-foreground">{t('signoff-prepared-by')}</span>
                    <span className="gba:text-foreground">{payrollRun.preparedBy}</span>
                  </div>
                )}
                {payrollRun.preparedAt && (
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:text-muted-foreground">{t('signoff-prepared-at')}</span>
                    <span className="gba:text-foreground">{new Date(payrollRun.preparedAt).toLocaleString()}</span>
                  </div>
                )}
                {payrollRun.reviewedBy && (
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:text-muted-foreground">{t('signoff-reviewed-by')}</span>
                    <span className="gba:text-foreground">{payrollRun.reviewedBy}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                {t('signoff-comments')}
              </label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                className="gba:w-full gba:border gba:border-border gba:rounded-md gba:p-2 gba:text-sm gba:min-h-[80px] gba:resize-y gba:bg-background"
                placeholder={t('signoff-comments-placeholder')}
              />
            </div>

            <div className="gba:flex gba:gap-3">
              {payrollRun?.status === 'PAYROLL_IN_PROGRESS' && (
                <Button variant="outline" onClick={handleMarkReady} disabled={saving || summary.blockedCount > 0}>
                  {t('signoff-mark-ready')}
                </Button>
              )}
              <Button onClick={handleApprove} disabled={!payrollRun || summary.blockedCount > 0 || saving}>
                <CheckCircleIcon size={16} weight="fill" className="gba:mr-2" />
                {t('signoff-approve')}
              </Button>
            </div>
            {summary.blockedCount > 0 && (
              <p className="gba:text-xs gba:text-destructive">
                {t('signoff-blocked-warning', { count: summary.blockedCount })}
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="gba:p-6">
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">
          <ClockIcon size={20} className="gba:inline gba:mr-2" />
          {t('audit-trail')}
        </h3>
        {auditEvents.length === 0 ? (
          <p className="gba:text-sm gba:text-muted-foreground">{t('audit-empty')}</p>
        ) : (
          <div className="gba:space-y-2 gba:max-h-[400px] gba:overflow-y-auto">
            {auditEvents.map(event => (
              <div
                key={event.id}
                className="gba:flex gba:items-start gba:gap-3 gba:py-2 gba:border-b gba:border-border"
              >
                <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:mt-1.5 gba:flex-shrink-0" />
                <div className="gba:flex-1">
                  <p className="gba:text-sm gba:text-foreground">{event.description}</p>
                  <div className="gba:flex gba:gap-3 gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                    <span>{event.userName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
