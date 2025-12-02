import React, { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_NAME,
  GET_INITIATOR_EMPLOYEE_NAME,
  SALARY_ADJUST_REASON_CATALOG_QUERY
} from './AdjustEmployeeSalaryReviewQueries'
import ReviewRows from '../components/ReviewRows'
import {
  buildSalaryComparisonRows,
  buildAdjustmentDetails,
  buildNewSalaryDetailRows,
  buildAssignmentDetails
} from './buildRows'
import type { SalaryChangePayload, ReviewMode } from './types'
import translations from '../_i18n'

export const AdjustEmployeeSalaryReview: React.FC<BusinessAppContextProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  const { t } = useTranslation(translations)
  const form = useForm({
    defaultValues: {},
    mode: 'onChange'
  })

  const graphqlClient = useGraphQLClient(accessToken as any)
  const [employeeName, setEmployeeName] = useState<string>('')
  const [initiatorName, setInitiatorName] = useState<string>('')
  const [salaryAdjustReasonEntries, setSalaryAdjustReasonEntries] = useState<
    Array<{
      id: string
      code: string
      value: string
      displayOrder: number | null
      translations: Array<{
        localeCode: string
        value: string
      }>
      catalog: {
        identifier: string
        version: string
        defaultLocale: string
      }
    }>
  >([])
  const locale = useMemo(() => getCurrentActiveUserLocale(), [])

  // Extract payload data
  const payload: SalaryChangePayload = (additionalData as any)?.psi_taskPayload || {}
  const newSalaryData = payload?.employeeSalary || {}
  const oldCompensation = payload?.oldEmployeeSalary

  // Determine review mode based on whether old salary exists
  const reviewMode: ReviewMode = useMemo(() => {
    // If oldEmployeeSalary is null, undefined, or has no meaningful salary data, it's "assign" mode
    if (!oldCompensation) return 'assign'
    const hasOldSalary =
      (oldCompensation.annualGrossSalary && oldCompensation.annualGrossSalary > 0) ||
      (oldCompensation.monthlyGrossSalary && oldCompensation.monthlyGrossSalary > 0) ||
      (oldCompensation.hourlyGrossSalary && oldCompensation.hourlyGrossSalary > 0)
    return hasOldSalary ? 'adjust' : 'assign'
  }, [oldCompensation])

  // Determine employee ID with fallback priority
  const employeeIdFromPayload: string | undefined =
    payload?.employeeId || newSalaryData?.employee || userInfo?.employeeDetails?.employeeId

  // Initiator employee ID
  const initiatorEmployeeId: string | undefined = payload?.initiatorEmployeeId

  // Fetch affected employee name
  useEffect(() => {
    const fetchName = async () => {
      try {
        if (!accessToken || !employeeIdFromPayload) return
        const result = await graphqlClient.request<{ employee: { firstName: string; lastName: string } }>(
          GET_EMPLOYEE_NAME,
          { employeeId: employeeIdFromPayload }
        )
        const emp = result?.employee
        if (emp) {
          setEmployeeName(`${emp.firstName || ''} ${emp.lastName || ''}`.trim())
        }
      } catch {
        // ignore
      }
    }
    fetchName()
  }, [accessToken, employeeIdFromPayload, graphqlClient])

  // Fetch initiator employee name (who created the request)
  useEffect(() => {
    const fetchInitiatorName = async () => {
      try {
        if (!accessToken || !initiatorEmployeeId) return
        const result = await graphqlClient.request<{ initiator: { firstName: string; lastName: string } }>(
          GET_INITIATOR_EMPLOYEE_NAME,
          { initiatorEmployeeId }
        )
        const initiator = result?.initiator
        if (initiator) {
          setInitiatorName(`${initiator.firstName || ''} ${initiator.lastName || ''}`.trim())
        }
      } catch {
        // ignore
      }
    }
    fetchInitiatorName()
  }, [accessToken, initiatorEmployeeId, graphqlClient])

  // Fetch salary adjustment reason catalog
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        if (!accessToken) return
        const result = await graphqlClient.request<{
          CatalogEntry: Array<{
            id: string
            code: string
            value: string
            displayOrder: number | null
            translations: Array<{
              localeCode: string
              value: string
            }>
            catalog: {
              identifier: string
              version: string
              defaultLocale: string
            }
          }>
        }>(SALARY_ADJUST_REASON_CATALOG_QUERY)
        setSalaryAdjustReasonEntries(result?.CatalogEntry || [])
      } catch {
        // ignore
      }
    }
    fetchCatalog()
  }, [accessToken, graphqlClient])

  // ===== ADJUST MODE: Build salary comparison rows (old vs new) =====
  const comparisonRows = useMemo(() => {
    if (reviewMode !== 'adjust' || !oldCompensation || !newSalaryData) return []
    return buildSalaryComparisonRows({
      oldCompensation: oldCompensation as any,
      newSalaryData: newSalaryData as any,
      locale,
      t
    })
  }, [reviewMode, oldCompensation, newSalaryData, locale, t])

  // ===== ADJUST MODE: Build adjustment details (with increase summary) =====
  const adjustmentDetails = useMemo(() => {
    if (reviewMode !== 'adjust' || !oldCompensation || !newSalaryData) return null
    return buildAdjustmentDetails({
      oldCompensation: oldCompensation as any,
      newSalaryData: newSalaryData as any,
      locale,
      salaryAdjustReasonEntries,
      t
    })
  }, [reviewMode, oldCompensation, newSalaryData, locale, salaryAdjustReasonEntries, t])

  // ===== ASSIGN MODE: Build new salary detail rows (single-column) =====
  const newSalaryDetailRows = useMemo(() => {
    if (reviewMode !== 'assign' || !newSalaryData) return []
    return buildNewSalaryDetailRows({
      newSalaryData: newSalaryData as any,
      locale,
      t
    })
  }, [reviewMode, newSalaryData, locale, t])

  // ===== ASSIGN MODE: Build assignment details (start date, notes) =====
  const assignmentDetails = useMemo(() => {
    if (reviewMode !== 'assign' || !newSalaryData) return null
    return buildAssignmentDetails({
      newSalaryData: newSalaryData as any
    })
  }, [reviewMode, newSalaryData])

  // Build title with employee name - different for assign vs adjust mode
  const titleText = useMemo(() => {
    if (reviewMode === 'assign') {
      return t('assign-salary-review-title', {
        employeeName: employeeName || '',
        defaultValue: `New Employee Salary Assignment Review for ${employeeName || ''}`
      })
    }
    return t('adjust-salary-review-title', {
      employeeName: employeeName || '',
      defaultValue: `Employee Salary Adjustment Review for ${employeeName || ''}`
    })
  }, [reviewMode, employeeName, t])

  // Build initiator subtitle
  const initiatorText = initiatorName
    ? t('adjust-salary-review-initiated-by', {
        initiatorName,
        defaultValue: `Initiated by ${initiatorName}`
      })
    : ''

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[1200px]"
      data-testid="review-employee-salary-change-form-container"
    >
      <FormHeader title={titleText} flowIconUrl={flowIconUrl} className="gba:px-6" />

      {/* Initiator subtitle */}
      {initiatorText && (
        <div
          className="gba:px-6 gba:-mt-6 gba:mb-4 gba:text-sm gba:text-muted-foreground"
          data-testid="review-employee-salary-change-initiator"
        >
          {initiatorText}
        </div>
      )}

      <div
        className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='review-employee-salary-change']]:pt-0! gba:**:data-[testid='review-employee-salary-change-form']:max-w-none!"
        data-testid="review-employee-salary-change-form-content"
      >
        <AppActionForm
          processType="update"
          form={form as any}
          formData={{}}
          submitEventType="pse_submit"
          cancelEventType="pse_cancel"
          submitButtonText={t('adjust-salary-review-acknowledge', { defaultValue: 'Acknowledge' })}
          cancelButtonText={t('adjust-salary-review-reject', { defaultValue: 'Reject' })}
          submitButtonTestId="review-employee-salary-change-confirm-button"
          cancelButtonTestId="review-employee-salary-change-cancel-button"
          onSubmit={async () => {
            return {
              approval: 'approved'
            }
          }}
          onCancel={async () => {
            return {
              approval: 'rejected'
            }
          }}
          data-testid="review-employee-salary-change"
        >
          {/* ===== ADJUST MODE: Salary Comparison (Side-by-Side) ===== */}
          {reviewMode === 'adjust' && (
            <>
              <div className="gba:mb-6" data-testid="review-employee-salary-change-comparison-section">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
                  {t('adjust-salary-review-salary-comparison', { defaultValue: 'Salary Comparison' })}
                </h3>
                <ReviewRows
                  rows={comparisonRows}
                  dataTestIdPrefix="review-employee-salary-change-row"
                  oldDataText={t('adjust-salary-review-current-salary', { defaultValue: 'Current Salary' })}
                  currentDataText={t('adjust-salary-review-new-salary', { defaultValue: 'New Salary' })}
                  mode="diff"
                />
              </div>

              {/* Adjustment Details Section */}
              {adjustmentDetails && (
                <div className="gba:mb-4 gba:space-y-3" data-testid="adjust-employee-salary-review-details-section">
                  <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
                    {t('adjust-salary-review-adjustment-details', { defaultValue: 'Adjustment Details' })}
                  </h3>

                  {/* Increase Summary - Highlighted */}
                  <div
                    className="gba:bg-card gba:text-card-foreground gba:border gba:border-foreground gba:p-3 gba:rounded-md"
                    data-testid="adjust-employee-salary-review-increase-summary"
                  >
                    <div className="gba:text-sm gba:font-medium gba:mb-1">
                      {t('adjust-salary-review-total-increase', { defaultValue: 'Total Increase' })}
                    </div>
                    <div className="gba:text-lg gba:font-semibold">{adjustmentDetails.increaseSummary}</div>
                  </div>

                  {/* Effective Date */}
                  <div data-testid="adjust-employee-salary-review-effective-date">
                    <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                      {t('adjust-salary-review-effective-date', { defaultValue: 'Effective Date' })}
                    </div>
                    <div className="gba:font-medium">{adjustmentDetails.effectiveDate}</div>
                  </div>

                  {/* Reason */}
                  <div data-testid="adjust-employee-salary-review-reason">
                    <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                      {t('adjust-salary-review-reason', { defaultValue: 'Reason' })}
                    </div>
                    <div className="gba:font-medium">{adjustmentDetails.reason}</div>
                  </div>

                  {/* Notes - Only if present */}
                  {adjustmentDetails.notes && (
                    <div data-testid="adjust-employee-salary-review-notes">
                      <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                        {t('adjust-salary-review-notes', { defaultValue: 'Notes' })}
                      </div>
                      <div className="gba:font-medium gba:whitespace-pre-wrap">{adjustmentDetails.notes}</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ===== ASSIGN MODE: New Salary Details (Single-Column) ===== */}
          {reviewMode === 'assign' && (
            <div className="gba:space-y-6" data-testid="assign-employee-salary-review-content">
              {/* New Salary Section */}
              <div data-testid="assign-employee-salary-review-salary-section">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
                  {t('assign-salary-review-salary-details', { defaultValue: 'Salary Details' })}
                </h3>
                <div className="gba:space-y-3">
                  {newSalaryDetailRows.map(row => {
                    // Only the primary salary row (annual or hourly) gets a border
                    const isPrimarySalary = row.key === 'annualSalary' || row.key === 'hourlySalary'
                    return (
                      <div
                        key={row.key}
                        className={`gba:p-3 gba:rounded-md ${isPrimarySalary ? 'gba:border gba:border-foreground' : ''}`}
                        data-testid={`assign-employee-salary-review-${row.key}`}
                      >
                        <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{row.label}</div>
                        <div className="gba:font-medium gba:text-foreground">{row.value}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Assignment Details Section */}
              {assignmentDetails && (
                <div className="gba:space-y-3" data-testid="assign-employee-salary-review-details-section">
                  <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
                    {t('assign-salary-review-assignment-details', { defaultValue: 'Assignment Details' })}
                  </h3>

                  {/* Start Date */}
                  <div data-testid="assign-employee-salary-review-start-date">
                    <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                      {t('assign-salary-review-start-date', { defaultValue: 'Start Date' })}
                    </div>
                    <div className="gba:font-medium">{assignmentDetails.startDate}</div>
                  </div>

                  {/* Notes - Only if present */}
                  {assignmentDetails.notes && (
                    <div data-testid="assign-employee-salary-review-notes">
                      <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                        {t('assign-salary-review-notes', { defaultValue: 'Notes' })}
                      </div>
                      <div className="gba:font-medium gba:whitespace-pre-wrap">{assignmentDetails.notes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </AppActionForm>
      </div>
    </div>
  )
}

export default AdjustEmployeeSalaryReview
