import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import {
  buildSalaryComparisonRows,
  buildAdjustmentDetails,
  buildNewSalaryDetailRows,
  buildAssignmentDetails
} from './buildRows'
import { useReviewFormData } from './hooks/useReviewFormData'
import { AdjustModeContent } from './components/AdjustModeContent'
import { AssignModeContent } from './components/AssignModeContent'
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

  // Use custom hook for all data fetching
  const { employeeName, initiatorName, salaryAdjustReasonEntries, locale, payload, reviewMode, employee } =
    useReviewFormData({
      accessToken,
      additionalData,
      employeeId: userInfo?.employeeDetails?.employeeId
    })

  const newSalaryData = payload?.employeeSalary || {}
  const oldCompensation = payload?.oldEmployeeSalary

  // Check if newSalaryData has meaningful salary values (not just an empty object)
  const hasNewSalaryData =
    newSalaryData.employee ||
    newSalaryData.annualGrossSalary ||
    newSalaryData.monthlyGrossSalary ||
    newSalaryData.hourlyGrossSalary

  // ===== ADJUST MODE: Build salary comparison rows (old vs new) =====
  const comparisonRows = useMemo(() => {
    if (reviewMode !== 'adjust' || !oldCompensation || !hasNewSalaryData) return []
    return buildSalaryComparisonRows({
      oldCompensation: oldCompensation as any,
      newSalaryData: newSalaryData as any,
      locale,
      t
    })
  }, [reviewMode, oldCompensation, hasNewSalaryData, newSalaryData, locale, t])

  // ===== ADJUST MODE: Build adjustment details (with increase summary) =====
  const adjustmentDetails = useMemo(() => {
    if (reviewMode !== 'adjust' || !oldCompensation || !hasNewSalaryData) return null
    return buildAdjustmentDetails({
      oldCompensation: oldCompensation as any,
      newSalaryData: newSalaryData as any,
      locale,
      salaryAdjustReasonEntries,
      t
    })
  }, [reviewMode, oldCompensation, hasNewSalaryData, newSalaryData, locale, salaryAdjustReasonEntries, t])

  // ===== ASSIGN MODE: Build new salary detail rows (single-column) =====
  const newSalaryDetailRows = useMemo(() => {
    if (reviewMode !== 'assign' || !hasNewSalaryData) return []
    return buildNewSalaryDetailRows({
      newSalaryData: newSalaryData as any,
      locale,
      t
    })
  }, [reviewMode, hasNewSalaryData, newSalaryData, locale, t])

  // ===== ASSIGN MODE: Build assignment details (start date, notes) =====
  const assignmentDetails = useMemo(() => {
    if (reviewMode !== 'assign' || !hasNewSalaryData) return null
    return buildAssignmentDetails({
      newSalaryData: newSalaryData as any
    })
  }, [reviewMode, hasNewSalaryData, newSalaryData])

  // Build title with employee name - different for assign vs adjust mode
  const titleText = useMemo(() => {
    if (reviewMode === 'assign') {
      return t('assign-salary-review-title', {
        employeeName: employeeName || '',
        defaultValue: `Initial Salary Assignment Review for ${employeeName || ''}`
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
      <FormHeader title={titleText} flowIconUrl={flowIconUrl} employee={employee} />

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
        className="gba:flex gba:flex-col gba:[&>div[data-testid='review-employee-salary-change']]:pt-0! gba:**:data-[testid='review-employee-salary-change-form']:max-w-none!"
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
            return { approval: 'approved' }
          }}
          onCancel={async () => {
            return { approval: 'rejected' }
          }}
          data-testid="review-employee-salary-change"
        >
          {/* ===== ADJUST MODE ===== */}
          {reviewMode === 'adjust' && (
            <AdjustModeContent comparisonRows={comparisonRows} adjustmentDetails={adjustmentDetails} t={t} />
          )}

          {/* ===== ASSIGN MODE ===== */}
          {reviewMode === 'assign' && (
            <AssignModeContent newSalaryDetailRows={newSalaryDetailRows} assignmentDetails={assignmentDetails} t={t} />
          )}
        </AppActionForm>
      </div>
    </div>
  )
}

export default AdjustEmployeeSalaryReview
