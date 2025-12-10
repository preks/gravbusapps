import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getDefaultEndDate } from '@/business-apps/hr/core/apps/employee-record/utils/utils'
import { BENEFIT_FORM_VALIDATION } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/constants/benefitFormValidation'
import { extractEmployeeId } from '@/business-apps/hr/core/utils/employeeIdUtils'
import { validateDeactivationForm, buildDeactivationPayload } from './utils/deactivationHelpers'
import type { DeactivateEmployeeBenefitContextData, EmployeeDataResponse } from './types'
import type { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'

type EmployeePositionType = { jobPosition?: { name?: string } } | undefined

interface UseDeactivateEmployeeBenefitFormParams {
  data: DeactivateEmployeeBenefitContextData | null
  additionalData: BusinessAppContextProps['additionalData']
  userInfo?: BusinessAppContextProps['userInfo']
  t: (key: string, params?: any) => string
}

interface UseDeactivateEmployeeBenefitFormReturn {
  employeeProfile: EmployeeDataResponse['EmployeeByPk'] | null
  employeePosition?: EmployeePositionType
  selectedBenefit: BenefitCatalogItem | null
  employeeId: string
  endDate: string
  setEndDate: (value: string) => void
  reason: string
  setReason: (value: string) => void
  additionalDetails: string
  setAdditionalDetails: (value: string) => void
  isFormValid: boolean
  validateForm: () => string[] | null
  buildSubmitPayload: (options: { markAsSubmitted: () => void }) => Promise<any>
}

export const useDeactivateEmployeeBenefitForm = ({
  data,
  additionalData,
  userInfo,
  t
}: UseDeactivateEmployeeBenefitFormParams): UseDeactivateEmployeeBenefitFormReturn => {
  const employeeProfile = useMemo(() => data?.employee?.EmployeeByPk ?? null, [data])
  const employeePosition = useMemo(() => data?.employee?.EmployeePosition?.[0], [data])
  const selectedBenefit = useMemo(() => data?.selectedBenefit ?? null, [data])

  // IDs
  const employeeId = useMemo(
    () => extractEmployeeId(additionalData, userInfo, employeeProfile),
    [additionalData, userInfo, employeeProfile]
  )

  // Form state
  const [endDate, setEndDate] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [additionalDetails, setAdditionalDetails] = useState('')

  // Initialize end date on mount
  useEffect(() => {
    if (!endDate) {
      setEndDate(getDefaultEndDate())
    }
  }, [endDate])

  const validateForm = useCallback(
    () =>
      validateDeactivationForm({
        endDate,
        reason,
        additionalDetails,
        t
      }),
    [endDate, reason, additionalDetails, t]
  )

  const isFormValid = useMemo(() => {
    const hasEndDate = endDate.length > 0
    const hasReason = reason.length > 0
    const trimmedDetails = additionalDetails.trim()
    const hasDetailsIfOther =
      reason !== 'other' ||
      (trimmedDetails.length >= BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH &&
        trimmedDetails.length <= BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH)

    return hasEndDate && hasReason && hasDetailsIfOther
  }, [endDate, reason, additionalDetails])

  const buildSubmitPayload = useCallback(
    async ({ markAsSubmitted }: { markAsSubmitted: () => void }) => {
      if (!selectedBenefit) {
        throw new Error('No benefit selected')
      }

      return buildDeactivationPayload({
        employeeId,
        benefit: selectedBenefit,
        reason,
        additionalDetails,
        endDate,
        markAsSubmitted
      })
    },
    [employeeId, selectedBenefit, reason, additionalDetails, endDate]
  )

  return {
    employeeProfile,
    employeePosition,
    selectedBenefit,
    employeeId,
    endDate,
    setEndDate,
    reason,
    setReason,
    additionalDetails,
    setAdditionalDetails,
    isFormValid,
    validateForm,
    buildSubmitPayload
  }
}
