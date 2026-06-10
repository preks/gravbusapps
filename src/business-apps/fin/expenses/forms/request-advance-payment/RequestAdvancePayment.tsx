import React, { useEffect, useMemo, useCallback, useReducer } from 'react'
import { Spinner, Alert, AlertTitle, AlertDescription, Button, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useRequestAdvancePaymentData } from './hooks/useRequestAdvancePaymentData'
import type { ExpensePlan } from './hooks/useRequestAdvancePaymentData'
import { formatCurrencyRef } from './utils/currencyUtils'
import { validateForm } from './utils/validationUtils'
import { FormSubmissionState } from './types/FormTypes'
import { extractExpensePlanIdFromAdditionalData } from './utils/additionalDataUtils'
import {
  EMPTY_ADVANCE_PAYMENT_FORM,
  INITIAL_VALIDATION_STATE,
  buildFormStateForPlan
} from './utils/buildFormStateForPlan'
import { getExpensePlanRequestTypeLabel } from './utils/expensePlanDisplayUtils'

// Components
import Header from './components/Header'
import ExpensePlanSelect from './components/ExpensePlanSelect'
import TotalAmountDisplay from './components/TotalAmountDisplay'
import AmountCurrencySection from './components/AmountCurrencySection'
import CostCenterSelect from './components/CostCenterSelect'
import PaymentMethodSelect from './components/PaymentMethodSelect'
import NotesField from './components/NotesField'
import ActionsBar from './components/ActionsBar'
import translations from './_i18n'

interface RequestAdvancePaymentProps extends BusinessAppContextProps {
  expensePlanId?: string
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

const RequestAdvancePayment: React.FC<RequestAdvancePaymentProps> = ({
  accessToken,
  userInfo,
  additionalData,
  expensePlanId,
  onSuccess,
  onError
}) => {
  const { t } = useTranslation(translations)

  const validationMessages = useMemo(
    () => ({
      expensePlanRequired: t('validation-expense-plan-required'),
      amountRequired: t('validation-amount-required'),
      currencyRequired: t('validation-currency-required'),
      costCenterRequired: t('validation-cost-center-required'),
      paymentMethodRequired: t('validation-payment-method-required'),
      amountLimit: t('amount-error')
    }),
    [t]
  )

  type FormScreenState = {
    formData: typeof EMPTY_ADVANCE_PAYMENT_FORM
    validationState: typeof INITIAL_VALIDATION_STATE
    submissionState: FormSubmissionState
  }

  const [screenState, dispatchScreen] = useReducer(
    (
      state: FormScreenState,
      action:
        | { type: 'plan-change'; planId: string; plans: ExpensePlan[] }
        | { type: 'patch-form'; patch: Partial<typeof EMPTY_ADVANCE_PAYMENT_FORM> }
        | { type: 'set-validation-error'; error: string | null }
        | { type: 'set-submission'; submissionState: FormSubmissionState }
        | { type: 'finish-submit' }
    ) => {
      switch (action.type) {
        case 'plan-change': {
          if (state.formData.expensePlanId === action.planId) {
            return state
          }

          return {
            formData: buildFormStateForPlan(action.planId, action.plans),
            validationState: INITIAL_VALIDATION_STATE,
            submissionState: { ...state.submissionState, error: null }
          }
        }
        case 'patch-form':
          return { ...state, formData: { ...state.formData, ...action.patch } }
        case 'set-validation-error':
          return { ...state, validationState: { ...state.validationState, validationError: action.error } }
        case 'set-submission':
          return { ...state, submissionState: action.submissionState }
        case 'finish-submit':
          return {
            ...state,
            submissionState: { ...state.submissionState, isSubmitting: false }
          }
        default:
          return state
      }
    },
    {
      formData: EMPTY_ADVANCE_PAYMENT_FORM,
      validationState: INITIAL_VALIDATION_STATE,
      submissionState: { isSubmitting: false, error: null }
    }
  )

  const { formData, validationState, submissionState } = screenState

  const {
    expensePlans,
    costCenters,
    paymentMethods,
    isLoading,
    error: dataError,
    refetch
  } = useRequestAdvancePaymentData({
    accessToken,
    userInfo,
    additionalData
  })

  // Consolidated selection: prefer explicit prop, then extract from additionalData
  useEffect(() => {
    if (formData.expensePlanId) return
    if (!expensePlans || expensePlans.length === 0) return

    const incomingPlanId = expensePlanId || extractExpensePlanIdFromAdditionalData(additionalData)
    if (!incomingPlanId) return

    const existing = expensePlans.find(p => p.id === incomingPlanId)
    if (existing) {
      dispatchScreen({ type: 'plan-change', planId: existing.id, plans: expensePlans })
    }
  }, [expensePlanId, additionalData, expensePlans, formData.expensePlanId])

  const handleExpensePlanChange = useCallback(
    (planId: string) => {
      dispatchScreen({ type: 'plan-change', planId, plans: expensePlans })
    },
    [expensePlans]
  )

  const selectedPlan = useMemo(
    () => expensePlans.find(plan => plan.id === formData.expensePlanId),
    [expensePlans, formData.expensePlanId]
  )

  const hasSelectedPlan = Boolean(formData.expensePlanId)
  const maxAmount = selectedPlan?.totalRemainingAmount ?? 0
  const requestTypeLabel = getExpensePlanRequestTypeLabel(selectedPlan)

  const handleAmountChange = useCallback((newAmount: number) => {
    dispatchScreen({ type: 'patch-form', patch: { amount: newAmount } })
  }, [])

  const handleCurrencyChange = useCallback((value: string) => {
    dispatchScreen({ type: 'patch-form', patch: { currency: value } })
  }, [])

  const handleCostCenterChange = useCallback((value: string) => {
    dispatchScreen({ type: 'patch-form', patch: { costCenter: value } })
  }, [])

  const handlePaymentMethodChange = useCallback((value: string) => {
    dispatchScreen({ type: 'patch-form', patch: { paymentMethod: value } })
  }, [])

  const handleNotesChange = useCallback((value: string) => {
    dispatchScreen({ type: 'patch-form', patch: { notes: value } })
  }, [])

  const handleValidationError = useCallback((error: string | null) => {
    dispatchScreen({ type: 'set-validation-error', error })
  }, [])

  const handleSubmit = async () => {
    const validation = validateForm(formData, maxAmount, validationMessages)

    if (!validation.isValid) {
      dispatchScreen({
        type: 'set-submission',
        submissionState: { ...submissionState, error: validation.errors[0] }
      })
      return
    }

    dispatchScreen({
      type: 'set-submission',
      submissionState: { isSubmitting: true, error: null }
    })

    try {
      const payload = {
        advancePayment: {
          currencyRef: selectedPlan?.currencyRef || formatCurrencyRef(formData.currency),
          amount: formData.amount,
          paymentMethod: formData.paymentMethod,
          expensePlan: formData.expensePlanId,
          costCenter: formData.costCenter,
          description: formData.notes
        },
        event: 'pse_submit'
      }

      dispatchProcessContinueEvent('pse_submit', payload)
      onSuccess?.(formData)
    } catch (err) {
      console.error('Error submitting advance payment request:', err)
      const errorMessage = err instanceof Error ? err.message : t('error-submit-failed')
      dispatchScreen({
        type: 'set-submission',
        submissionState: { isSubmitting: false, error: errorMessage }
      })
      onError?.(errorMessage)
    } finally {
      dispatchScreen({ type: 'finish-submit' })
    }
  }

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_cancel', {})
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  if (dataError && !isLoading) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t('error-loading-title')}</AlertTitle>
        <AlertDescription>{dataError}</AlertDescription>
        <Button variant="outline" size="sm" onClick={refetch} className="gba:mt-2">
          {t('action-retry')}
        </Button>
      </Alert>
    )
  }

  const isSubmitDisabled =
    !formData.expensePlanId || !formData.amount || !formData.currency || !formData.costCenter || !formData.paymentMethod

  return (
    <div
      className="gba:w-full gba:max-w-2xl gba:self-stretch gba:mx-auto gba:p-6"
      data-testid="request-advance-payment-container"
    >
      <Header />

      <div className="gba:w-full" data-testid="request-advance-payment-content">
        {submissionState.error && (
          <Alert variant="destructive" className="gba:mb-4">
            <AlertTitle>{t('error-title')}</AlertTitle>
            <AlertDescription>{submissionState.error}</AlertDescription>
          </Alert>
        )}

        <ExpensePlanSelect plans={expensePlans} value={formData.expensePlanId} onChange={handleExpensePlanChange} />

        {hasSelectedPlan && (
          <TotalAmountDisplay
            totalRemainingAmount={selectedPlan?.totalRemainingAmount}
            requestTypeValue={requestTypeLabel}
            selectedPlan={selectedPlan}
          />
        )}

        <div className="gba:mb-4 gba:pb-2">
          <h3
            className="gba:text-base gba:font-semibold gba:text-black gba:m-0"
            data-testid="request-advance-payment-section-header"
          >
            {t('section-advance-payment')}
          </h3>
        </div>

        <div className="gba:w-full">
          <AmountCurrencySection
            amount={formData.amount}
            currency={formData.currency}
            onAmountChange={handleAmountChange}
            onCurrencyChange={handleCurrencyChange}
            onValidationError={handleValidationError}
            maxAmount={maxAmount}
            disabled={!hasSelectedPlan}
          />

          {validationState.validationError && (
            <div className="gba:mb-4 gba:w-full">
              <p className="gba:text-red-600 gba:text-sm" data-testid="request-advance-payment-validation-error">
                {validationState.validationError}
              </p>
            </div>
          )}
        </div>

        <CostCenterSelect
          costCenters={costCenters}
          selectedPlanCostCenterId={selectedPlan?.costCenterId}
          value={formData.costCenter}
          onChange={handleCostCenterChange}
          disabled={!hasSelectedPlan}
        />

        <PaymentMethodSelect
          methods={paymentMethods}
          value={formData.paymentMethod}
          onChange={handlePaymentMethodChange}
          disabled={!hasSelectedPlan}
        />

        <NotesField value={formData.notes} onChange={handleNotesChange} disabled={!hasSelectedPlan} />

        <ActionsBar
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          isSubmitting={submissionState.isSubmitting}
          isSubmitDisabled={isSubmitDisabled}
        />
      </div>
    </div>
  )
}

export default RequestAdvancePayment
