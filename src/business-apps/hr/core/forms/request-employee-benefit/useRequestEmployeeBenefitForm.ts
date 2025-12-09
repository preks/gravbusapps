import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getDefaultStartDate } from '@/business-apps/hr/core/apps/employee-record/utils/utils'
import { extractEmployeeId } from './utils/employeeIdUtils'
import {
  buildBenefitSubmitPayload,
  composeValueWithCurrency,
  computeDerivedValues,
  validateBenefitForm
} from './utils/benefitFormHelpers'
import type { RequestEmployeeBenefitContextData, EmployeeDataResponse } from './types'

type EmployeePositionType = { jobPosition?: { name?: string } } | undefined

interface UseRequestEmployeeBenefitFormParams {
  data: RequestEmployeeBenefitContextData | null
  additionalData: BusinessAppContextProps['additionalData']
  userInfo?: BusinessAppContextProps['userInfo']
  t: (key: string, params?: any) => string
}

interface UseRequestEmployeeBenefitFormReturn {
  employeeProfile: EmployeeDataResponse['EmployeeByPk'] | null
  employeePosition?: EmployeePositionType
  selectedBenefit: RequestEmployeeBenefitContextData['selectedBenefit']
  benefitProviders: RequestEmployeeBenefitContextData['benefitProviders']
  countryCurrency: RequestEmployeeBenefitContextData['countryCurrency']
  employeeId: string
  provider: string
  setProvider: (value: string) => void
  startDate: string
  setStartDate: (value: string) => void
  justification: string
  setJustification: (value: string) => void
  period: string
  setPeriod: (value: string) => void
  includedDisplayWithCurrency: string
  resolvedPeriodDisplay: string
  isFormValid: boolean
  validateForm: () => string[] | null
  buildSubmitPayload: (options: { markAsSubmitted: () => void }) => Promise<any>
}

export const useRequestEmployeeBenefitForm = ({
  data,
  additionalData,
  userInfo,
  t
}: UseRequestEmployeeBenefitFormParams): UseRequestEmployeeBenefitFormReturn => {
  const employeeProfile = useMemo(() => data?.employee?.EmployeeByPk ?? null, [data])
  const employeePosition = useMemo(() => data?.employee?.EmployeePosition?.[0], [data])
  const selectedBenefit = useMemo(() => data?.selectedBenefit ?? null, [data])
  const benefitProviders = useMemo(() => data?.benefitProviders ?? [], [data])
  const countryCurrency = useMemo(() => data?.countryCurrency ?? { currencyRef: null, currencyCode: '' }, [data])

  // IDs
  const employeeId = useMemo(
    () => extractEmployeeId(additionalData, userInfo, employeeProfile),
    [additionalData, userInfo, employeeProfile]
  )

  // Form state
  const [provider, setProvider] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [justification, setJustification] = useState('')
  const [period, setPeriod] = useState<string>('')

  // Initialize start date on mount
  useEffect(() => {
    if (!startDate) {
      setStartDate(getDefaultStartDate())
    }
  }, [startDate])

  const {
    includedValueDisplay,
    resolvedPeriodDisplay,
    derivedAmountNumber,
    employeeYearlyContribution,
    employeeMonthlyContribution
  } = useMemo(() => computeDerivedValues(selectedBenefit), [selectedBenefit])

  const includedDisplayWithCurrency = useMemo(
    () => composeValueWithCurrency(includedValueDisplay, countryCurrency.currencyCode),
    [includedValueDisplay, countryCurrency.currencyCode]
  )

  useEffect(() => {
    if (resolvedPeriodDisplay) {
      setPeriod(resolvedPeriodDisplay)
    }
  }, [resolvedPeriodDisplay])

  const validateForm = useCallback(
    () =>
      validateBenefitForm({
        startDate,
        justification,
        t
      }),
    [startDate, justification, t]
  )

  const isFormValid = useMemo(() => {
    const trimmedJustification = justification.trim()
    return (
      startDate.length > 0 &&
      trimmedJustification.length >= 20 && // BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH
      trimmedJustification.length <= 500 // BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH
    )
  }, [startDate, justification])

  const buildSubmitPayload = useCallback(
    async ({ markAsSubmitted }: { markAsSubmitted: () => void }) =>
      buildBenefitSubmitPayload({
        employeeId,
        selectedBenefit,
        provider,
        derivedAmountNumber,
        period,
        resolvedPeriodDisplay,
        countryCurrencyRef: countryCurrency.currencyRef,
        startDate,
        justification,
        employeeYearlyContribution,
        employeeMonthlyContribution,
        markAsSubmitted
      }),
    [
      employeeId,
      selectedBenefit,
      provider,
      derivedAmountNumber,
      period,
      resolvedPeriodDisplay,
      countryCurrency.currencyRef,
      startDate,
      justification,
      employeeYearlyContribution,
      employeeMonthlyContribution
    ]
  )

  return {
    employeeProfile,
    employeePosition,
    selectedBenefit,
    benefitProviders,
    countryCurrency,
    employeeId,
    provider,
    setProvider,
    startDate,
    setStartDate,
    justification,
    setJustification,
    period,
    setPeriod,
    includedDisplayWithCurrency,
    resolvedPeriodDisplay,
    isFormValid,
    validateForm,
    buildSubmitPayload
  }
}
