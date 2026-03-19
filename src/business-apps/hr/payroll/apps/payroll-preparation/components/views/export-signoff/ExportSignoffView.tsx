import React, { useState } from 'react'
import { Card, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { ExportIcon, CheckCircleIcon, ClockIcon } from '@phosphor-icons/react'
import type {
  PayrollEmployee,
  PayrollRun,
  ExportOptions,
  AuditEvent,
  PayrollSummary
} from '../../../types/payrollTypes'
import { generatePayrollCSV, generateExceptionsCSV, downloadCSV } from '../../../utils/exportUtils'
import { usePayrollRunStore } from '../../../hooks/usePayrollRunStore'
import { PayrollRunStatusBadge } from '../../shared/StatusBadge'

interface ExportSignoffViewProps {
  employees: PayrollEmployee[]
  payrollRun: PayrollRun | null
  summary: PayrollSummary
  auditEvents: AuditEvent[]
  t: (key: string) => string
}

export const ExportSignoffView: React.FC<ExportSignoffViewProps> = ({
  employees,
  payrollRun,
  summary,
  auditEvents,
  t
}) => {
  const { recordExport, setSignOff, updateStatus } = usePayrollRunStore()

  const [exportMode, setExportMode] = useState<ExportOptions['mode']>('ready_only')
  const [includeIssues, setIncludeIssues] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [reviewComment, setReviewComment] = useState('')

  const getExportCount = (): number => {
    switch (exportMode) {
      case 'ready_only':
        return summary.readyCount
      case 'ready_and_warning':
        return summary.readyCount + summary.warningCount
      case 'all':
        return summary.totalEmployees - summary.excludedCount
      default:
        return 0
    }
  }

  const handleExport = () => {
    if (!payrollRun) return

    const options: ExportOptions = {
      mode: exportMode,
      includeIssueSummary: includeIssues,
      format: 'csv'
    }

    const csv = generatePayrollCSV(employees, payrollRun, options)
    const filename = `payroll_${payrollRun.country}_${payrollRun.year}-${String(payrollRun.month).padStart(2, '0')}_${payrollRun.legalEntityName.replace(/\s+/g, '_')}.csv`
    downloadCSV(csv, filename)
    recordExport(options, getExportCount())
    setExportSuccess(true)
    setTimeout(() => setExportSuccess(false), 3000)
  }

  const handleExportExceptions = () => {
    if (!payrollRun) return

    const csv = generateExceptionsCSV(employees)
    const filename = `payroll_exceptions_${payrollRun.country}_${payrollRun.year}-${String(payrollRun.month).padStart(2, '0')}.csv`
    downloadCSV(csv, filename)
  }

  const handleApprove = () => {
    if (!payrollRun) return
    setSignOff({
      preparedBy: 'Current User',
      preparedAt: new Date().toISOString(),
      reviewedBy: 'Current User',
      reviewedAt: new Date().toISOString(),
      approvalDecision: 'approved',
      comments: reviewComment
    })
    updateStatus('approved_for_export')
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
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                {t('export-mode-label')}
              </label>
              <Select value={exportMode} onValueChange={(val: string) => setExportMode(val as ExportOptions['mode'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ready_only">
                    {t('export-mode-ready')} ({summary.readyCount})
                  </SelectItem>
                  <SelectItem value="ready_and_warning">
                    {t('export-mode-ready-warning')} ({summary.readyCount + summary.warningCount})
                  </SelectItem>
                  <SelectItem value="all">
                    {t('export-mode-all')} ({summary.totalEmployees - summary.excludedCount})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:cursor-pointer">
              <input
                type="checkbox"
                checked={includeIssues}
                onChange={e => setIncludeIssues(e.target.checked)}
                className="gba:rounded gba:border-border"
              />
              {t('export-include-issues')}
            </label>

            <div className="gba:flex gba:gap-3">
              <Button onClick={handleExport} disabled={!payrollRun || getExportCount() === 0}>
                <ExportIcon size={16} className="gba:mr-2" />
                {t('export-button')} ({getExportCount()})
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
              <Button onClick={handleApprove} disabled={!payrollRun || summary.blockedCount > 0}>
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
