import React, { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_NAME, GET_INITIATOR_EMPLOYEE_NAME } from './AdjustEmployeeSalaryReviewQueries'
import ReviewRows from '../components/ReviewRows'
import { buildSalaryComparisonRows, buildAdjustmentDetails } from './buildRows'
import type { SalaryChangePayload } from './types'

export const AdjustEmployeeSalaryReview: React.FC<BusinessAppContextProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  const form = useForm({
    defaultValues: {},
    mode: 'onChange'
  })

  const graphqlClient = useGraphQLClient(accessToken as any)
  const [employeeName, setEmployeeName] = useState<string>('')
  const [initiatorName, setInitiatorName] = useState<string>('')
  const locale = useMemo(() => getCurrentActiveUserLocale(), [])

  // Extract payload data
  const payload: SalaryChangePayload = (additionalData as any)?.psi_taskPayload || {}
  const newSalaryData = payload?.employeeSalary || {}
  const oldCompensation = payload?.oldEmployeeCompensation || {}

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

  // Build salary comparison rows (only actual salary changes)
  const comparisonRows = useMemo(() => {
    if (!oldCompensation || !newSalaryData) return []
    return buildSalaryComparisonRows({
      oldCompensation: oldCompensation as any,
      newSalaryData: newSalaryData as any,
      locale
    })
  }, [oldCompensation, newSalaryData, locale])

  // Build adjustment details (informational data)
  const adjustmentDetails = useMemo(() => {
    if (!oldCompensation || !newSalaryData) return null
    return buildAdjustmentDetails({
      oldCompensation: oldCompensation as any,
      newSalaryData: newSalaryData as any,
      locale
    })
  }, [oldCompensation, newSalaryData, locale])

  // Build title with employee name
  const titleText = getTranslationFromI18nKeyAndLabel(
    'lowcoder:review_forms.employee_salary_change_review_title',
    `Employee Salary Adjustment Review for ${employeeName || ''}`,
    { employeeName: employeeName || '', interpolation: { escapeValue: false } }
  )

  // Build initiator subtitle
  const initiatorText = initiatorName
    ? getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.initiated_by_text', `Initiated by ${initiatorName}`, {
        initiatorName,
        interpolation: { escapeValue: false }
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
          submitButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_request.approve_button',
            'Approve'
          )}
          cancelButtonText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_request.reject_button',
            'Reject'
          )}
          submitButtonTestId="review-employee-salary-change-confirm-button"
          cancelButtonTestId="review-employee-salary-change-cancel-button"
          onSubmit={async () => {
            return { approval: 'approved' }
          }}
          onCancel={async () => {
            return { approval: 'rejected' }
          }}
          data-testid="review-employee-salary-change"
        >
          {/* Salary Comparison Section */}
          <div className="gba:mb-6" data-testid="review-employee-salary-change-comparison-section">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
              {getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.salary_comparison', 'Salary Comparison')}
            </h3>
            <ReviewRows
              rows={comparisonRows}
              dataTestIdPrefix="review-employee-salary-change-row"
              oldDataText={getTranslationFromI18nKeyAndLabel(
                'lowcoder:review_forms.current_salary_text',
                'Current Salary'
              )}
              currentDataText={getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.new_salary_text', 'New Salary')}
              mode="diff"
            />
          </div>

          {/* Adjustment Details Section */}
          {adjustmentDetails && (
            <div className="gba:mb-4 gba:space-y-3" data-testid="adjust-employee-salary-review-details-section">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
                {getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.adjustment_details', 'Adjustment Details')}
              </h3>

              {/* Increase Summary - Highlighted */}
              <div
                className="gba:bg-success-secondary gba:text-success-secondary-foreground gba:p-3 gba:rounded-md"
                data-testid="adjust-employee-salary-review-increase-summary"
              >
                <div className="gba:text-sm gba:font-medium gba:mb-1">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.total_increase', 'Total Increase')}
                </div>
                <div className="gba:text-lg gba:font-semibold">{adjustmentDetails.increaseSummary}</div>
              </div>

              {/* Effective Date */}
              <div data-testid="adjust-employee-salary-review-effective-date">
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.effective_date', 'Effective Date')}
                </div>
                <div className="gba:font-medium">{adjustmentDetails.effectiveDate}</div>
              </div>

              {/* Reason */}
              <div data-testid="adjust-employee-salary-review-reason">
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.reason_text', 'Reason')}
                </div>
                <div className="gba:font-medium">{adjustmentDetails.reason}</div>
              </div>

              {/* Notes - Only if present */}
              {adjustmentDetails.notes && (
                <div data-testid="adjust-employee-salary-review-notes">
                  <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area',
                      'Notes'
                    )}
                  </div>
                  <div className="gba:font-medium gba:whitespace-pre-wrap">{adjustmentDetails.notes}</div>
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
