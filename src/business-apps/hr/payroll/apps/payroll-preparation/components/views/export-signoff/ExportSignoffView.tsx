import React, { useState, useMemo } from 'react'
import { Card, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import {
  ExportIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  XCircleIcon,
  ArrowClockwiseIcon
} from '@phosphor-icons/react'
import type {
  PayrollEmployee,
  PayrollRun,
  PayrollRunStatus,
  ExportOptions,
  AuditEvent,
  PayrollSummary,
  ApprovalDecision
} from '../../../types/payrollTypes'
import {
  generatePayrollCSV,
  generatePayrollXLSX,
  generateExceptionsCSV,
  downloadCSV,
  downloadBlob,
  getExportableEmployees
} from '../../../utils/exportUtils'
import { formatDate as formatPlatformDate } from '@/common/utils/windowUtils'
import { PayrollRunStatusBadge } from '../../shared/StatusBadge'

const STATUS_ORDER: PayrollRunStatus[] = [
  'PAYROLL_IN_PROGRESS',
  'PAYROLL_READY_FOR_REVIEW',
  'PAYROLL_APPROVED_FOR_EXPORT',
  'PAYROLL_EXPORTED',
  'PAYROLL_CLOSED'
]

function getStepIndex(status: PayrollRunStatus): number {
  const idx = STATUS_ORDER.indexOf(status)
  return Math.max(0, idx)
}

function getStepState(stepIndex: number, currentStep: number): StepDef['state'] {
  if (currentStep > stepIndex) return 'completed'
  if (currentStep === stepIndex) return 'active'
  return 'pending'
}

function getStepCircleClasses(state: StepDef['state']): string {
  if (state === 'completed') return 'gba:bg-success gba:text-success-foreground'
  if (state === 'active') return 'gba:bg-primary gba:text-primary-foreground'
  return 'gba:bg-muted gba:text-muted-foreground'
}

function getStepLabelClasses(state: StepDef['state']): string {
  if (state === 'active') return 'gba:font-semibold gba:text-foreground'
  return 'gba:text-muted-foreground'
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  const formatted = formatPlatformDate(iso, 'dateTime.short')
  return formatted ?? '-'
}

function getAuditDescriptionLabel(
  event: AuditEvent,
  t: (key: string, args?: Record<string, string | number>) => string
) {
  switch (event.eventType) {
    case 'payroll_run_created':
      return t('audit-payroll-created')
    case 'marked_ready':
      return t('audit-marked-ready')
    case 'status_changed':
      return t('audit-status-changed', { description: event.description })
    case 'review_approved':
      return t('audit-review-approved', { description: event.description })
    case 'review_rejected':
      return t('audit-review-rejected', { description: event.description })
    case 'export_generated':
      return t('audit-export-generated', { description: event.description })
    default:
      return event.description
  }
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

interface ExportSignoffViewProps {
  employees: PayrollEmployee[]
  filteredEmployees: PayrollEmployee[]
  gridFiltersActive: boolean
  payrollRun: PayrollRun | null
  summary: PayrollSummary
  auditEvents: AuditEvent[]
  updateStatus: (status: PayrollRunStatus) => Promise<void>
  markReadyForReview: () => Promise<void>
  submitReview: (decision: ApprovalDecision, comment: string) => Promise<void>
  recordExport: (mode: string, count: number) => void
  saving: boolean
  t: (key: string, args?: Record<string, string | number>) => string
}

interface StepDef {
  number: number
  label: string
  state: 'completed' | 'active' | 'pending'
}

export const ExportSignoffView: React.FC<ExportSignoffViewProps> = ({
  employees,
  filteredEmployees,
  gridFiltersActive,
  payrollRun,
  summary,
  auditEvents,
  updateStatus,
  markReadyForReview,
  submitReview,
  recordExport,
  saving,
  t
}) => {
  const [reviewComment, setReviewComment] = useState('')
  const [commentError, setCommentError] = useState(false)

  const [exportMode, setExportMode] = useState<ExportOptions['mode']>('ready_only')
  const [includeIssues, setIncludeIssues] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv')
  const [applyGridFilters, setApplyGridFilters] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [exporting, setExporting] = useState(false)

  const currentStatus = payrollRun?.status || 'PAYROLL_IN_PROGRESS'
  const currentStep = getStepIndex(currentStatus)

  const steps: StepDef[] = useMemo(
    () => [
      {
        number: 1,
        label: t('step-1-label'),
        state: getStepState(0, currentStep)
      },
      {
        number: 2,
        label: t('step-2-label'),
        state: getStepState(1, currentStep)
      },
      {
        number: 3,
        label: t('step-3-label'),
        state: getStepState(2, currentStep)
      },
      { number: 4, label: t('step-4-label'), state: currentStep >= 3 ? 'completed' : 'pending' }
    ],
    [currentStep, t]
  )

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

  const handleMarkReady = async () => {
    await markReadyForReview()
  }

  const handleApprove = async () => {
    if (!reviewComment.trim()) {
      setCommentError(true)
      return
    }
    setCommentError(false)
    await submitReview('APPROVED', reviewComment.trim())
    setReviewComment('')
  }

  const handleReject = async () => {
    if (!reviewComment.trim()) {
      setCommentError(true)
      return
    }
    setCommentError(false)
    if (!globalThis.confirm(t('step-2-reject-confirm'))) return
    await submitReview('NOT APPROVED', reviewComment.trim())
    setReviewComment('')
  }

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

  const renderStepIndicator = () => (
    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-8">
      {steps.map((step, idx) => (
        <React.Fragment key={step.number}>
          <div className="gba:flex gba:items-center gba:gap-2">
            <div
              className={`gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:text-sm gba:font-semibold gba:flex-shrink-0 ${getStepCircleClasses(step.state)}`}
            >
              {step.state === 'completed' ? <CheckCircleIcon size={16} weight="bold" /> : step.number}
            </div>
            <span className={`gba:text-sm gba:whitespace-nowrap ${getStepLabelClasses(step.state)}`}>{step.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`gba:flex-1 gba:h-px gba:min-w-[24px] ${
                steps[idx + 1].state === 'pending' ? 'gba:bg-border' : 'gba:bg-success'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )

  const renderStep1 = () => {
    const isActive = currentStatus === 'PAYROLL_IN_PROGRESS'
    const isCompleted = currentStep > 0

    return (
      <Card className={`gba:p-6 ${!isActive && !isCompleted ? 'gba:opacity-50' : ''}`}>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{t('step-1-label')}</h3>
          {isCompleted && (
            <span className="gba:text-xs gba:font-medium gba:text-success gba:flex gba:items-center gba:gap-1">
              <CheckCircleIcon size={14} weight="fill" /> {t('step-completed')}
            </span>
          )}
          {isActive && (
            <PayrollRunStatusBadge status={currentStatus} translatedLabel={getRunStatusLabel(currentStatus, t)} />
          )}
        </div>

        {isActive && (
          <>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{t('step-1-description')}</p>
            <Button onClick={handleMarkReady} disabled={saving || summary.blockedCount > 0}>
              {t('signoff-mark-ready')}
            </Button>
            {summary.blockedCount > 0 && (
              <p className="gba:text-xs gba:text-destructive gba:mt-2">
                {t('signoff-blocked-warning', { count: summary.blockedCount })}
              </p>
            )}
          </>
        )}

        {isCompleted && payrollRun?.preparedBy && (
          <div className="gba:text-sm gba:text-muted-foreground gba:space-y-1">
            <div className="gba:flex gba:gap-2">
              <span className="gba:font-medium gba:text-foreground">{t('signoff-prepared-by')}:</span>
              <span>{payrollRun.preparedBy}</span>
            </div>
            <div className="gba:flex gba:gap-2">
              <span className="gba:font-medium gba:text-foreground">{t('signoff-prepared-at')}:</span>
              <span>{formatDate(payrollRun.preparedAt)}</span>
            </div>
          </div>
        )}
      </Card>
    )
  }

  const renderStep2 = () => {
    const isActive = currentStatus === 'PAYROLL_READY_FOR_REVIEW'
    const isCompleted = currentStep > 1

    return (
      <Card className={`gba:p-6 ${!isActive && !isCompleted ? 'gba:opacity-50' : ''}`}>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{t('step-2-label')}</h3>
          {isCompleted && payrollRun?.approvalDecision === 'APPROVED' && (
            <span className="gba:text-xs gba:font-medium gba:text-success gba:flex gba:items-center gba:gap-1">
              <CheckCircleIcon size={14} weight="fill" /> {t('signoff-decision-approved')}
            </span>
          )}
          {isCompleted && payrollRun?.approvalDecision === 'NOT APPROVED' && (
            <span className="gba:text-xs gba:font-medium gba:text-destructive gba:flex gba:items-center gba:gap-1">
              <XCircleIcon size={14} weight="fill" /> {t('signoff-decision-not-approved')}
            </span>
          )}
          {isActive && (
            <PayrollRunStatusBadge status={currentStatus} translatedLabel={getRunStatusLabel(currentStatus, t)} />
          )}
        </div>

        {(isActive || isCompleted) && payrollRun?.preparedBy && (
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-4 gba:bg-muted gba:rounded-md gba:p-3">
            {t('step-2-prepared-info', {
              name: payrollRun.preparedBy,
              date: formatDate(payrollRun.preparedAt)
            })}
          </div>
        )}

        {isActive && (
          <>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{t('step-2-description')}</p>
            <div className="gba:mb-4">
              <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                {t('signoff-comments')} <span className="gba:text-destructive">*</span>
              </label>
              <textarea
                value={reviewComment}
                onChange={e => {
                  setReviewComment(e.target.value)
                  if (e.target.value.trim()) setCommentError(false)
                }}
                className={`gba:w-full gba:border gba:rounded-md gba:p-2 gba:text-sm gba:min-h-[80px] gba:resize-y gba:bg-background ${
                  commentError ? 'gba:border-destructive' : 'gba:border-border'
                }`}
                placeholder={t('signoff-comments-placeholder')}
              />
              {commentError && (
                <p className="gba:text-xs gba:text-destructive gba:mt-1">{t('step-2-comment-required')}</p>
              )}
            </div>
            <div className="gba:flex gba:gap-3">
              <Button onClick={handleApprove} disabled={saving}>
                <CheckCircleIcon size={16} weight="fill" className="gba:mr-2" />
                {t('signoff-approve')}
              </Button>
              <Button variant="outline" onClick={handleReject} disabled={saving}>
                <ArrowClockwiseIcon size={16} className="gba:mr-2" />
                {t('signoff-reject')}
              </Button>
            </div>
          </>
        )}

        {isCompleted && payrollRun?.reviewedBy && (
          <div className="gba:text-sm gba:text-muted-foreground gba:space-y-1">
            <div className="gba:flex gba:gap-2">
              <span className="gba:font-medium gba:text-foreground">{t('signoff-reviewed-by')}:</span>
              <span>{payrollRun.reviewedBy}</span>
            </div>
            <div className="gba:flex gba:gap-2">
              <span className="gba:font-medium gba:text-foreground">{t('signoff-reviewed-at')}:</span>
              <span>{formatDate(payrollRun.reviewedAt)}</span>
            </div>
            {payrollRun.reviewComment && (
              <div className="gba:flex gba:gap-2">
                <span className="gba:font-medium gba:text-foreground">{t('step-3-review-comment')}:</span>
                <span className="gba:italic">&ldquo;{payrollRun.reviewComment}&rdquo;</span>
              </div>
            )}
          </div>
        )}
      </Card>
    )
  }

  const renderStep3 = () => {
    const isActive = currentStatus === 'PAYROLL_APPROVED_FOR_EXPORT'
    const isCompleted = currentStep > 2

    return (
      <Card className={`gba:p-6 ${!isActive && !isCompleted ? 'gba:opacity-50' : ''}`}>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <h3 className="gba:text-base gba:font-semibold gba:text-foreground">
            <ExportIcon size={20} className="gba:inline gba:mr-2" />
            {t('step-3-label')}
          </h3>
          {isCompleted && (
            <span className="gba:text-xs gba:font-medium gba:text-success gba:flex gba:items-center gba:gap-1">
              <CheckCircleIcon size={14} weight="fill" /> {t('step-completed')}
            </span>
          )}
          {isActive && (
            <PayrollRunStatusBadge status={currentStatus} translatedLabel={getRunStatusLabel(currentStatus, t)} />
          )}
        </div>

        {(isActive || isCompleted) && payrollRun?.reviewedBy && (
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-4 gba:bg-muted gba:rounded-md gba:p-3">
            <p>
              {t('step-3-review-info', {
                decision: payrollRun.approvalDecision || '',
                name: payrollRun.reviewedBy,
                date: formatDate(payrollRun.reviewedAt)
              })}
            </p>
            {payrollRun.reviewComment && (
              <p className="gba:mt-1 gba:italic">&ldquo;{payrollRun.reviewComment}&rdquo;</p>
            )}
          </div>
        )}

        {isActive && (
          <>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{t('step-3-description')}</p>

            <div className="gba:space-y-4">
              <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                <div>
                  <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                    {t('export-mode-label')}
                  </label>
                  <Select
                    value={exportMode}
                    onValueChange={(val: string) => setExportMode(val as ExportOptions['mode'])}
                  >
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
          </>
        )}

        {isCompleted && <p className="gba:text-sm gba:text-muted-foreground">{t('export-success')}</p>}
      </Card>
    )
  }

  const renderStep4 = () => {
    const isCompleted = currentStep >= 3

    return (
      <Card className={`gba:p-6 ${isCompleted ? '' : 'gba:opacity-50'}`}>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{t('step-4-label')}</h3>
          {isCompleted && (
            <span className="gba:text-xs gba:font-medium gba:text-success gba:flex gba:items-center gba:gap-1">
              <CheckCircleIcon size={14} weight="fill" /> {t('step-completed')}
            </span>
          )}
        </div>

        {isCompleted ? (
          <div className="gba:space-y-3">
            <p className="gba:text-sm gba:text-muted-foreground">{t('step-4-description')}</p>
            {payrollRun && (
              <div className="gba:bg-muted gba:rounded-md gba:p-4 gba:text-sm gba:space-y-2">
                <div className="gba:flex gba:justify-between">
                  <span className="gba:text-muted-foreground">{t('signoff-status')}</span>
                  <PayrollRunStatusBadge
                    status={payrollRun.status}
                    translatedLabel={getRunStatusLabel(payrollRun.status, t)}
                  />
                </div>
                {payrollRun.preparedBy && (
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:text-muted-foreground">{t('signoff-prepared-by')}</span>
                    <span>
                      {payrollRun.preparedBy} ({formatDate(payrollRun.preparedAt)})
                    </span>
                  </div>
                )}
                {payrollRun.reviewedBy && (
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:text-muted-foreground">{t('signoff-reviewed-by')}</span>
                    <span>
                      {payrollRun.reviewedBy} ({formatDate(payrollRun.reviewedAt)})
                    </span>
                  </div>
                )}
                {payrollRun.approvalDecision && (
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:text-muted-foreground">{t('signoff-approve')}</span>
                    <span>{payrollRun.approvalDecision}</span>
                  </div>
                )}
                {payrollRun.reviewComment && (
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:text-muted-foreground">{t('step-3-review-comment')}</span>
                    <span className="gba:italic">&ldquo;{payrollRun.reviewComment}&rdquo;</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground">{t('step-pending')}</p>
        )}
      </Card>
    )
  }

  const renderAuditTrail = () => (
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
            <div key={event.id} className="gba:flex gba:items-start gba:gap-3 gba:py-2 gba:border-b gba:border-border">
              <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:mt-1.5 gba:flex-shrink-0" />
              <div className="gba:flex-1">
                <p className="gba:text-sm gba:text-foreground">{getAuditDescriptionLabel(event, t)}</p>
                <div className="gba:flex gba:gap-3 gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                  <span>{formatDate(event.timestamp)}</span>
                  <span>{event.userName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )

  return (
    <div className="gba:space-y-6">
      {renderStepIndicator()}
      {renderStep1()}
      {renderStep2()}
      {renderStep3()}
      {renderStep4()}
      {renderAuditTrail()}
    </div>
  )
}
