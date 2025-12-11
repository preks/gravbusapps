import { BENEFIT_FORM_VALIDATION } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/constants/benefitFormValidation'
import { getReasonLabel } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/constants/benefitDeactivationReasons'
import type { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'

interface ValidateDeactivationFormParams {
  endDate: string
  reason: string
  additionalDetails: string
  t: (key: string, params?: any) => string
}

/**
 * Validates the benefit deactivation form
 * Returns array of error messages or null if valid
 */
export const validateDeactivationForm = ({
  endDate,
  reason,
  additionalDetails,
  t
}: ValidateDeactivationFormParams): string[] | null => {
  const errors: string[] = []

  // Check end date
  if (!endDate || endDate.length === 0) {
    errors.push(t('error-end-date-required'))
  } else {
    const selectedDate = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      errors.push(t('error-end-date-today-or-later'))
    }
  }

  // Check reason
  if (!reason || reason.length === 0) {
    errors.push(t('error-reason-required'))
  }

  // Check additional details if "other" is selected
  if (reason === 'other') {
    const trimmedDetails = additionalDetails.trim()
    if (trimmedDetails.length < BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH) {
      errors.push(
        t('error-additional-details-min-length', {
          min: BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH
        })
      )
    }
    if (trimmedDetails.length > BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH) {
      errors.push(
        t('error-additional-details-max-length', {
          max: BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH
        })
      )
    }
  }

  return errors.length > 0 ? errors : null
}

interface BuildDeactivationPayloadParams {
  employeeId: string
  benefit: BenefitCatalogItem
  reason: string
  additionalDetails: string
  endDate: string
  markAsSubmitted: () => void
}

/**
 * Builds the payload for the benefit deactivation Kogito process
 */
export const buildDeactivationPayload = ({
  employeeId,
  benefit,
  reason,
  additionalDetails,
  endDate,
  markAsSubmitted
}: BuildDeactivationPayloadParams) => {
  // Mark as submitted to prevent abort on cleanup
  markAsSubmitted()

  // Determine deactivation reason text
  const deactivationReasonText = reason === 'other' ? additionalDetails.trim() : getReasonLabel(reason)

  // Build and return payload for Kogito process
  // Payload structure matches EmployeeBenefit GraphQL schema
  return {
    employeeBenefit: {
      id: benefit.employeeBenefitId,
      employee: employeeId,
      version: 0,
      notes: deactivationReasonText,
      endDate: endDate // Date format (YYYY-MM-DD)
    }
  }
}
