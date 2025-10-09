import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { Separator, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import RuleIdentitySection from './components/RuleIdentitySection'
import DateRangeSection from './components/DateRangeSection'
import SelectsSection from './components/SelectsSection'
import OptionalCodesSection from './components/OptionalCodesSection'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { env } from '@/common/env/EnvUtils'
import { BusinessAppContextProps } from '@/business-apps/types'
import { plansAndRequestsInRangeQuery } from './queries/CreateCalculationRuleQueries'
import { useRestClient } from '@/common/network/rest/useRestClient'
import FormHeader from './components/FormHeader'
import { useCreateCalculationRuleForm } from './context/useCreateCalculationRuleForm'
import { getCollidingDates, getDatesWithinRange } from './utils/validationUtils'
import LabeledToggle from './components/LabeledToggle'

interface CreateCalculationRuleFormProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  onCancel?: () => void
  onCreate?: () => void
  additionalData?: Record<string, any>
}

const CreateCalculationRuleForm: React.FC<CreateCalculationRuleFormProps> = ({
  accessToken,
  onCancel,
  onCreate,
  additionalData: _navigationPayload
}) => {
  const navigationPayload = (_navigationPayload as any)?.nvi_navigationPayload || null
  const {
    graphqlClient,
    formState,
    errors,
    calculationTypeOptions,
    currencyOptions,
    countryOptions,
    lastRuleId,
    existingFlag,
    prefilledRule,
    flagsLoaded,
    isUpdate,
    hasErrors,
    noInitialValuesChanged,
    initialSnapshotRef,
    dispatch,
    dispatchTouched,
    setFormSubmitted,
    setHasInteracted,
    setStandardValidationFailed,
    shouldShowError,
    getCurrentActiveUserLocale: _unusedLocale,
    getDateFormat: _unusedDateFormat
  } = useCreateCalculationRuleForm({ accessToken, navigationPayload })

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [collidingDatesState, setCollidingDatesState] = useState<any[]>([])

  const flowIconUrl = useMemo(() => {
    const base = env && typeof env === 'function' ? env('NEXT_PUBLIC_BASE_URL') || '' : ''
    return `${base}/_next/static/media/lowcoder-icons/newwork/flow_min_20x20.svg`
  }, [])

  const restClient = useRestClient(
    env && typeof env === 'function' ? env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') : undefined
  )

  useEffect(() => {
    if (!isUpdate) return
    if (initialSnapshotRef.current) return
    if (!prefilledRule) return
    if (!flagsLoaded) return
    initialSnapshotRef.current = { initialized: true } as any
  }, [isUpdate, prefilledRule, flagsLoaded, initialSnapshotRef])

  const handleStandardToggle = async (checked: boolean) => {
    dispatch({ type: 'SET_FIELD', field: 'isStandard', value: !!checked })
    setHasInteracted(true)
    dispatchTouched({ type: 'SET_TOUCHED', field: 'isStandard', value: true })

    if (!checked) {
      setStandardValidationFailed(false)
      return
    }

    const currentFrom = formState.validFrom ?? null
    const currentTo = formState.validTo ?? null
    if (!currentFrom || !currentTo) {
      setStandardValidationFailed(false)
      return
    }

    try {
      const res = await graphqlClient.request<any>(plansAndRequestsInRangeQuery, {
        from: currentFrom.toISOString(),
        to: currentTo.toISOString()
      })
      const plans = res?.ExpensePlan || []
      const requests = res?.ExpenseRequest || []
      const items = res?.ExpenseItem || []
      const standardPeriodsInRange = res?.StandardPeriodsInRange || []
      const collidingDates = getCollidingDates(standardPeriodsInRange, currentFrom, currentTo)
      setCollidingDatesState(collidingDates)
      const allMatching = [
        ...getDatesWithinRange(plans, currentFrom, currentTo, 'Plan'),
        ...getDatesWithinRange(requests, currentFrom, currentTo, 'Request'),
        ...getDatesWithinRange(items, currentFrom, currentTo, 'Item' as any)
      ].sort((a, b) => new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime())

      if (allMatching.length > 0 || collidingDates.length > 0) {
        setShowConfirmModal(true)
        setStandardValidationFailed(true)
      } else setStandardValidationFailed(false)
    } catch {
      // ignore range fetch errors
    }
  }

  const handleSubmitClick = useCallback(() => {
    setHasInteracted(true)
    setFormSubmitted(true)
    if (hasErrors) return
    if (isUpdate && noInitialValuesChanged) return
    ;(async () => {
      try {
        // 1) Determine candidate id/version for update
        const candidateId = navigationPayload?.id || lastRuleId
        const candidateVersion = navigationPayload?.version || prefilledRule?.version || 0

        // 2) Save ExpenseRule (INSERT/UPDATE)
        const basePayload = {
          code: isUpdate ? (navigationPayload?.code ?? formState.ruleCode) : formState.ruleCode,
          name: formState.ruleName,
          calculationTypeRef: formState.calculationTypeId,
          standard: !!formState.isStandard,
          activeFrom: formState.validFrom ? `${formState.validFrom.toISOString().slice(0, 10)}T00:00:00.000Z` : null,
          activeTo: formState.validTo ? `${formState.validTo.toISOString().slice(0, 10)}T00:00:00.000Z` : null,
          currencyRef: formState.currencyId,
          advancePaymentCode: formState.advancePaymentCode,
          taxesCode: formState.taxesCode,
          nonpayableCode: formState.nonPayableCode,
          useLastCountry: !!formState.useLastCountry,
          deductionLimit: !!formState.deductionLimit,
          useSingleCurrency: !!formState.useSingleCurrency,
          countryRef: formState.countryRefId
        } as any
        const payload = isUpdate
          ? {
              expenseRule: { id: candidateId, version: candidateVersion, ...basePayload },
              changeMode: 'UPDATE' as const
            }
          : {
              expenseRule: basePayload,
              changeMode: 'INSERT' as const
            }
        await restClient.post('/employee-expense/saveExpenseRule', payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        })

        // 3) If we had collisions, update previous standard=false
        const toModify = collidingDatesState || []
        if (Array.isArray(toModify) && toModify.length) {
          await Promise.all(
            toModify.map((calculationRule: any) => {
              const calculationRuleToModify = {
                expenseRule: {
                  id: calculationRule.id,
                  version: calculationRule.version,
                  standard: false
                },
                changeMode: 'UPDATE'
              }
              return restClient.post('/employee-expense/saveExpenseRule', calculationRuleToModify, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: 'application/json',
                  'Content-Type': 'application/json'
                }
              })
            })
          )
        }

        // 4) Save ExpenseRuleFlag (INSERT/UPDATE)
        const isAustrianAbroad = !!formState.austrianAbroad
        const isRomanianCalculation = !!formState.romanianCalculation
        const flagCode = isRomanianCalculation ? 'romanianCalculation' : 'austrianAbroad'
        const flagName = isRomanianCalculation ? 'Romanian Calculation' : 'Austrian Abroad'
        const flagValue = isAustrianAbroad || isRomanianCalculation ? 'true' : 'false'
        const flagPayload = existingFlag
          ? {
              expenseRuleFlag: {
                id: existingFlag.id,
                version: existingFlag.version,
                expenseRule: existingFlag.expenseRuleId,
                code: flagCode,
                name: flagName,
                value: flagValue
              },
              changeMode: 'UPDATE'
            }
          : {
              expenseRuleFlag: {
                expenseRule: candidateId,
                code: flagCode,
                name: flagName,
                value: flagValue
              },
              changeMode: 'INSERT'
            }
        await restClient.post('/employee-expense/saveExpenseRuleFlag', flagPayload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        })

        onCreate?.()
      } catch (e) {
        // keep minimal handling for now
      }
    })()
  }, [
    hasErrors,
    isUpdate,
    noInitialValuesChanged,
    navigationPayload?.id,
    prefilledRule?.version,
    formState,
    graphqlClient,
    restClient,
    accessToken,
    onCreate
  ])

  return (
    <div
      data-testid="create-calculation-rule-form"
      className="gba:flex gba:flex-col gba:flex-grow "
      style={{ width: '100%', maxWidth: '800px', height: '100%' }}
      onMouseDown={() => setHasInteracted(true)}
      onKeyDown={() => setHasInteracted(true)}
    >
      {/* Header copied from ExpensePlanItem */}
      <FormHeader isUpdate={isUpdate} flowIconUrl={flowIconUrl} />

      {/* Scrollable content container */}
      <div data-testid="ccr-scroll-container">
        <RuleIdentitySection
          isUpdate={isUpdate}
          ruleCode={formState.ruleCode}
          ruleName={formState.ruleName}
          onChangeCode={value => dispatch({ type: 'SET_FIELD', field: 'ruleCode', value })}
          onChangeName={value => dispatch({ type: 'SET_FIELD', field: 'ruleName', value })}
          onBlurCode={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'code', value: true })}
          onBlurName={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'name', value: true })}
          showCodeError={shouldShowError('code')}
          showNameError={shouldShowError('name')}
          errors={errors}
        />

        <DateRangeSection
          isUpdate={isUpdate}
          validFrom={formState.validFrom}
          validTo={formState.validTo}
          onChangeFrom={async value => {
            dispatch({ type: 'SET_FIELD', field: 'validFrom', value })
          }}
          onChangeTo={async value => {
            dispatch({ type: 'SET_FIELD', field: 'validTo', value })
          }}
          onBlurFrom={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'validFrom', value: true })}
          onBlurTo={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'validTo', value: true })}
          showFromError={shouldShowError('validFrom')}
          showToError={shouldShowError('validTo')}
          errors={errors}
        />

        {/* Standard (between Valid To and Currency) */}
        <div className={`gba:hidden`}>
          <LabeledToggle
            label={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.standard_checkbox',
              'Standard'
            )}
            name="ccrStandard"
            value={formState.isStandard}
            disabled={isUpdate}
            onChange={next => handleStandardToggle(next)}
            testId="ccr-standard-checkbox"
          />
        </div>

        <SelectsSection
          isUpdate={isUpdate}
          calculationTypeId={formState.calculationTypeId}
          countryRefId={formState.countryRefId}
          currencyId={formState.currencyId}
          calculationTypeOptions={calculationTypeOptions}
          countryOptions={countryOptions}
          currencyOptions={currencyOptions}
          onChangeCalculation={value => {
            dispatch({ type: 'SET_FIELD', field: 'calculationTypeId', value })
            setHasInteracted(true)
            dispatchTouched({ type: 'SET_TOUCHED', field: 'calculationType', value: true })
          }}
          onChangeCountry={value => {
            dispatch({ type: 'SET_FIELD', field: 'countryRefId', value })
            setHasInteracted(true)
            dispatchTouched({ type: 'SET_TOUCHED', field: 'countryRefId', value: true })
          }}
          onChangeCurrency={value => {
            dispatch({ type: 'SET_FIELD', field: 'currencyId', value })
            setHasInteracted(true)
            dispatchTouched({ type: 'SET_TOUCHED', field: 'currencyId', value: true })
          }}
          onBlurCalculation={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'calculationType', value: true })}
          onBlurCountry={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'countryRefId', value: true })}
          onBlurCurrency={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'currencyId', value: true })}
          showCalculationError={shouldShowError('calculationType')}
          showCountryError={shouldShowError('countryRefId')}
          showCurrencyError={shouldShowError('currencyId')}
          errors={errors}
        />

        <OptionalCodesSection
          isUpdate={isUpdate}
          advancePaymentCode={formState.advancePaymentCode}
          taxesCode={formState.taxesCode}
          nonPayableCode={formState.nonPayableCode}
          onChangeAdvance={value => dispatch({ type: 'SET_FIELD', field: 'advancePaymentCode', value })}
          onChangeTaxes={value => dispatch({ type: 'SET_FIELD', field: 'taxesCode', value })}
          onChangeNonPayable={value => dispatch({ type: 'SET_FIELD', field: 'nonPayableCode', value })}
        />

        {/* Boolean flags */}
        <LabeledToggle
          label={getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.austrian_abroad',
            'Austrian Abroad'
          )}
          name="ccr-austrian-abroad"
          value={formState.austrianAbroad}
          disabled={isUpdate}
          onChange={next => {
            dispatch({ type: 'SET_FIELD', field: 'austrianAbroad', value: next })
            if (next) dispatch({ type: 'SET_FIELD', field: 'romanianCalculation', value: false })
          }}
          testId="ccr-austrian-abroad-checkbox"
        />

        <LabeledToggle
          label={getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.romanian_calculation',
            'Romanian Calculation'
          )}
          name="ccr-romanian-calculation"
          value={formState.romanianCalculation}
          disabled={isUpdate}
          onChange={next => {
            dispatch({ type: 'SET_FIELD', field: 'romanianCalculation', value: next })
            if (next) dispatch({ type: 'SET_FIELD', field: 'austrianAbroad', value: false })
          }}
          testId="ccr-romanian-calculation-checkbox"
        />

        <LabeledToggle
          label={getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.use_last_country',
            'Use Last Country'
          )}
          name="ccr-use-last-country"
          value={formState.useLastCountry}
          disabled={isUpdate}
          onChange={next => dispatch({ type: 'SET_FIELD', field: 'useLastCountry', value: next })}
          testId="ccr-use-last-country-checkbox"
        />

        <LabeledToggle
          label={getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.deduction_limit',
            'Deduction Limit'
          )}
          name="ccr-deduction-limit"
          value={formState.deductionLimit}
          disabled={isUpdate}
          onChange={next => dispatch({ type: 'SET_FIELD', field: 'deductionLimit', value: next })}
          testId="ccr-deduction-limit-checkbox"
        />

        <LabeledToggle
          label={getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.use_single_currency',
            'Use single currency'
          )}
          name="ccr-use-single-currency"
          value={formState.useSingleCurrency}
          disabled={isUpdate}
          onChange={next => dispatch({ type: 'SET_FIELD', field: 'useSingleCurrency', value: next })}
          testId="ccr-use-single-currency-checkbox"
        />
      </div>
      {/* Confirmation modal for standard validation */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent
          data-testid="ccr-standard-confirm-modal"
          onOpenAutoFocus={e => {
            e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle data-testid="ccr-standard-confirm-title" className="gba:leading-[1.2]">
              {(() => {
                const count = collidingDatesState?.length || 0
                if (count === 1) {
                  const entry = collidingDatesState[0] || {}
                  const prefix = getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.checkbox_modal_text_first',
                    'This will deselect the standard flag on rule: '
                  )
                  return `${prefix} ${entry.code || ''}-${entry.name || ''}`
                }
                if (count > 1) {
                  return getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.checkbox_modal_text_second',
                    'This will deselect the standard flag on multiple rules'
                  )
                }
                return getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.checkbox_modal_text_third',
                  'This Expense Calculation Rule will now only be used through the Expense Calculation Rule Assignment!This Expense Calculation Rule will now only be used through the Expense Calculation Rule Assignment!'
                )
              })()}
            </DialogTitle>
          </DialogHeader>
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-6">
            <div data-testid="ccr-standard-confirm-message" className=" gba:font-medium">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.do_you_want_to_continue',
                'Do you want to continue?'
              )}
            </div>
            <div className="gba:flex gba:gap-4">
              <Button
                variant="outline"
                className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
                style={{ borderRadius: '22px', height: '40px' }}
                data-testid="ccr-standard-confirm-no-button"
                onClick={() => {
                  setShowConfirmModal(false)
                  dispatch({ type: 'SET_FIELD', field: 'isStandard', value: false })
                  setStandardValidationFailed(false)
                }}
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.no_button',
                  'No'
                )}
              </Button>
              <Button
                variant="default"
                className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
                style={{ borderRadius: '22px', height: '40px' }}
                data-testid="ccr-standard-confirm-yes-button"
                onClick={() => {
                  setShowConfirmModal(false)
                }}
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.yes_button',
                  'Yes'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Spacer to push actions to bottom */}
      <div className="gba:flex-grow" data-testid="ccr-spacer" />

      {/* Divider and actions (copying visual style from ExpensePlanItem bottom) */}
      <Separator className="gba:mt-[30px] gba:mb-[30px]" data-testid="ccr-form-divider" />
      <div className="gba:flex gba:justify-between gba:py-4" style={{ width: '100%' }} data-testid="ccr-actions">
        <Button
          variant="outline"
          onClick={onCancel}
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', height: '40px' }}
          data-testid="ccr-cancel-button"
        >
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.btn_discard',
            'Discard'
          )}
        </Button>
        <Button
          variant="default"
          onClick={handleSubmitClick}
          disabled={hasErrors || (isUpdate && noInitialValuesChanged)}
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', width: 'auto', height: '40px' }}
          data-testid="ccr-create-button"
        >
          {isUpdate
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.btn_update',
                'Update'
              )
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.btn_save',
                'Save'
              )}
        </Button>
      </div>
    </div>
  )
}

export default CreateCalculationRuleForm
export { CreateCalculationRuleForm }
