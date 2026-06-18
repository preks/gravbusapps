import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getDefaultStartDate } from '@/business-apps/hr/core/apps/employee-record/utils/utils'
import { BENEFIT_FORM_VALIDATION } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/constants/benefitFormValidation'
import { extractEmployeeId } from '@/business-apps/hr/core/utils/employeeIdUtils'
import { translatePeriod } from '@/business-apps/hr/core/utils/benefitExtractionUtils'
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

  const defaultProvider = useMemo(() => {
    const fromModal = selectedBenefit?.providerRef
    const providerIds = benefitProviders.map(p => p.id)
    const fromAvailable = selectedBenefit?.availableProviders?.map(p => p.id) ?? []
    const validIds = new Set([...providerIds, ...fromAvailable])

    if (fromModal && validIds.has(fromModal)) {
      return fromModal
    }

    return benefitProviders[0]?.id ?? selectedBenefit?.availableProviders?.[0]?.id ?? ''
  }, [benefitProviders, selectedBenefit])

  const selectedProvider = provider || defaultProvider

  // Initialize start date on mount
  useEffect(() => {
    if (!startDate) {
      setStartDate(getDefaultStartDate())
    }
  }, [startDate])

  // Keep local state in sync so the select never renders empty when provider options exist.
  useEffect(() => {
    if (!provider && defaultProvider) {
      setProvider(defaultProvider)
    }
  }, [defaultProvider, provider])

  const {
    includedValueDisplay,
    shouldAppendFallbackCurrency,
    resolvedPeriodDisplay,
    derivedAmountNumber,
    employeeYearlyContribution,
    employeeMonthlyContribution
  } = useMemo(() => computeDerivedValues(selectedBenefit), [selectedBenefit])

  const includedDisplayWithCurrency = useMemo(
    () => composeValueWithCurrency(includedValueDisplay, countryCurrency.currencyCode, shouldAppendFallbackCurrency),
    [includedValueDisplay, countryCurrency.currencyCode, shouldAppendFallbackCurrency]
  )

  // Translate the period when it changes
  const translatedPeriod = useMemo(() => translatePeriod(resolvedPeriodDisplay, t), [resolvedPeriodDisplay, t])

  useEffect(() => {
    if (translatedPeriod) {
      setPeriod(translatedPeriod)
    }
  }, [translatedPeriod])

  const validateForm = useCallback(() => {
    const errors =
      validateBenefitForm({
        startDate,
        justification,
        t
      }) ?? []

    if (!employeeId) {
      errors.push(t('benefit-request-employee-id-missing'))
    }

    if (!selectedBenefit) {
      errors.push(t('benefit-request-benefit-missing'))
    }

    return errors.length > 0 ? errors : null
  }, [employeeId, justification, selectedBenefit, startDate, t])

  const isFormValid = useMemo(() => {
    const trimmedJustification = justification.trim()

    if (!employeeId || !selectedBenefit) return false

    // Start date is required
    if (startDate.length === 0) return false

    // Justification is optional, but if provided, must meet min/max length requirements
    if (trimmedJustification.length > 0) {
      return (
        trimmedJustification.length >= BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH &&
        trimmedJustification.length <= BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH
      )
    }

    // Form is valid if start date is present and justification is empty or meets requirements
    return true
  }, [employeeId, justification, selectedBenefit, startDate])

  const buildSubmitPayload = useCallback(
    async ({ markAsSubmitted }: { markAsSubmitted: () => void }) =>
      buildBenefitSubmitPayload({
        employeeId,
        selectedBenefit,
        provider: selectedProvider,
        derivedAmountNumber,
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
      selectedProvider,
      derivedAmountNumber,
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
    provider: selectedProvider,
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
