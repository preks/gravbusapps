import React, { useMemo, useState, useCallback, useEffect } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  DateInput
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { env } from '@/common/env/EnvUtils'
import { BusinessAppContextProps } from '@/business-apps/types'
import { plansAndRequestsInRangeQuery } from './queries/CreateCalculationRuleQueries'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useCreateCalculationRuleForm } from './context/useCreateCalculationRuleForm'
import { getCollidingDates, getDatesWithinRange } from './utils/validationUtils'

interface CatalogOption {
  id: string
  code: string
  name: string
}

interface PreloadedCatalogs {
  calculationTypes: CatalogOption[]
  currencies: CatalogOption[]
  countries: CatalogOption[]
}

interface CreateCalculationRuleFormProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCancel?: () => void
  onCreate?: () => void
  additionalData?: Record<string, any>
  preloadedCatalogs?: PreloadedCatalogs
}

interface FormValues {
  ruleCode: string
  ruleName: string
  validFrom: string
  validTo: string
  calculationTypeId: string
  countryRefId: string
  currencyId: string
  advancePaymentCode: string
  taxesCode: string
  nonPayableCode: string
  isStandard: boolean
  austrianAbroad: boolean
  romanianCalculation: boolean
  useLastCountry: boolean
  deductionLimit: boolean
  useSingleCurrency: boolean
}

const CreateCalculationRuleForm: React.FC<CreateCalculationRuleFormProps> = ({
  accessToken,
  open = true,
  onOpenChange,
  onCancel,
  onCreate,
  additionalData: _navigationPayload,
  preloadedCatalogs
}) => {
  const navigationPayload = (_navigationPayload as any)?.nvi_navigationPayload || null
  const {
    graphqlClient,
    calculationTypeOptions: hookCalcTypes,
    currencyOptions: hookCurrencies,
    countryOptions: hookCountries,
    lastRuleId,
    existingFlag,
    prefilledRule,
    flagsLoaded,
    isUpdate,
    isRuleUsed,
    initialSnapshotRef
  } = useCreateCalculationRuleForm({ accessToken, navigationPayload, open })

  // Use preloaded catalogs if available (faster), otherwise fall back to hook data
  const calculationTypeOptions = preloadedCatalogs?.calculationTypes?.length
    ? preloadedCatalogs.calculationTypes
    : hookCalcTypes
  const currencyOptions = preloadedCatalogs?.currencies?.length ? preloadedCatalogs.currencies : hookCurrencies
  const countryOptions = preloadedCatalogs?.countries?.length ? preloadedCatalogs.countries : hookCountries

  // Check if catalogs are ready (either preloaded or loaded via hook)
  const catalogsReady = calculationTypeOptions.length > 0 && currencyOptions.length > 0 && countryOptions.length > 0

  // Fields are disabled only if the rule has been used (in plans, requests, or items)
  // Rule code is always disabled in update mode (primary identifier)
  const isFieldDisabled = isUpdate && isRuleUsed

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [collidingDatesState, setCollidingDatesState] = useState<any[]>([])
  const [standardValidationFailed, setStandardValidationFailed] = useState(false)
  const [localCodeDuplicate, setLocalCodeDuplicate] = useState(false)
  const [initialSnapshot, setInitialSnapshot] = useState<FormValues | null>(null)

  const restClient = useRestClient(
    env && typeof env === 'function' ? env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') : undefined
  )

  // Initialize react-hook-form
  const form = useForm<FormValues>({
    defaultValues: {
      ruleCode: '',
      ruleName: '',
      validFrom: new Date().toISOString().slice(0, 10),
      validTo: '9999-12-31',
      calculationTypeId: '',
      countryRefId: '',
      currencyId: '',
      advancePaymentCode: '',
      taxesCode: '',
      nonPayableCode: '',
      isStandard: false,
      austrianAbroad: false,
      romanianCalculation: false,
      useLastCountry: false,
      deductionLimit: false,
      useSingleCurrency: false
    }
  })

  const { watch, setValue } = form
  const formValues = watch()

  // Prefill basic fields immediately (text, dates, checkboxes)
  useEffect(() => {
    if (!isUpdate || !prefilledRule) return

    // Set non-Select fields immediately - these don't need options
    setValue('ruleCode', prefilledRule.code || '')
    setValue('ruleName', prefilledRule.name || '')
    setValue(
      'validFrom',
      prefilledRule.activeFrom ? prefilledRule.activeFrom.slice(0, 10) : new Date().toISOString().slice(0, 10)
    )
    setValue('validTo', prefilledRule.activeTo ? prefilledRule.activeTo.slice(0, 10) : '9999-12-31')
    setValue('advancePaymentCode', prefilledRule.advancePaymentCode || '')
    setValue('taxesCode', prefilledRule.taxesCode || '')
    setValue('nonPayableCode', prefilledRule.nonpayableCode || '')
    setValue('isStandard', !!prefilledRule.standard)
    setValue('useLastCountry', !!prefilledRule.useLastCountry)
    setValue('deductionLimit', !!prefilledRule.deductionLimit)
    setValue('useSingleCurrency', !!prefilledRule.useSingleCurrency)
  }, [isUpdate, prefilledRule, setValue])

  // Prefill Select fields when options are loaded (either preloaded or from hook)
  useEffect(() => {
    if (!isUpdate || !prefilledRule || !catalogsReady) return

    // Set Select fields only after options are available
    const calcTypeId = prefilledRule.calculationTypeRef || prefilledRule.calculationType?.id || ''
    const countryId = prefilledRule.countryRef || ''
    const currId = prefilledRule.currencyRef || prefilledRule.currency?.id || ''

    if (calcTypeId) setValue('calculationTypeId', calcTypeId)
    if (countryId) setValue('countryRefId', countryId)
    if (currId) setValue('currencyId', currId)
  }, [isUpdate, prefilledRule, catalogsReady, setValue])

  // Prefill flags when loaded
  useEffect(() => {
    if (!flagsLoaded || !existingFlag) return

    const austrian = existingFlag.name === 'Austrian Abroad' && existingFlag.value === 'true'
    const romanian = existingFlag.name === 'Romanian Calculation' && existingFlag.value === 'true'

    if (austrian) setValue('austrianAbroad', true)
    if (romanian) setValue('romanianCalculation', true)
  }, [flagsLoaded, existingFlag, setValue])

  // Capture initial snapshot for update mode (to detect if values changed)
  useEffect(() => {
    if (!isUpdate) return
    if (initialSnapshot) return
    if (!prefilledRule) return
    if (!flagsLoaded) return
    // Capture current form values as initial snapshot
    setInitialSnapshot({ ...formValues })
    initialSnapshotRef.current = { initialized: true } as any
  }, [isUpdate, prefilledRule, flagsLoaded, initialSnapshotRef, formValues, initialSnapshot])

  // Check if form values changed from initial snapshot
  const noInitialValuesChanged = useMemo(() => {
    if (!isUpdate || !initialSnapshot) return false
    try {
      // Use form.getValues() to get fresh values instead of watched values
      const currentValues = form.getValues()
      return JSON.stringify(currentValues) === JSON.stringify(initialSnapshot)
    } catch {
      return false
    }
  }, [formValues, isUpdate, initialSnapshot, form])

  // Check if form has validation errors
  const hasErrors = useMemo(() => {
    const { errors } = form.formState
    return Object.keys(errors).length > 0 || localCodeDuplicate || standardValidationFailed
  }, [form.formState, localCodeDuplicate, standardValidationFailed])

  // Code uniqueness check - watches react-hook-form state
  // Only check when the modal is open to avoid unnecessary requests on close
  useEffect(() => {
    if (!open) return // Don't run check when modal is closing/closed

    let cancelled = false
    const code = (formValues.ruleCode || '').trim()

    if (!code) {
      setLocalCodeDuplicate(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      if (cancelled) return // Early exit if cancelled
      try {
        const { getExpenseRuleAggregateByCode } = await import('./queries/CreateCalculationRuleQueries')
        const res = await graphqlClient.request<any>(getExpenseRuleAggregateByCode, {
          codeValue: code,
          ruleId: isUpdate ? navigationPayload?.id : null
        })
        if (cancelled) return
        const count = res?.ExpenseRuleAggregate?.aggregate?.count || 0
        setLocalCodeDuplicate(count > 0)
      } catch {
        if (!cancelled) setLocalCodeDuplicate(false)
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [open, formValues.ruleCode, isUpdate, navigationPayload?.id])

  const handleStandardToggle = async (checked: boolean) => {
    setValue('isStandard', checked)

    if (!checked) {
      setStandardValidationFailed(false)
      return
    }

    const currentFrom = formValues.validFrom ? new Date(formValues.validFrom) : null
    const currentTo = formValues.validTo ? new Date(formValues.validTo) : null
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

  const onSubmit = useCallback(
    async (data: FormValues) => {
      // Extra validation checks
      if (localCodeDuplicate) return
      if (standardValidationFailed) return
      if (isUpdate && noInitialValuesChanged) return

      try {
        const candidateId = navigationPayload?.id || lastRuleId
        const candidateVersion = navigationPayload?.version || prefilledRule?.version || 0

        const basePayload = {
          code: isUpdate ? (navigationPayload?.code ?? data.ruleCode) : data.ruleCode,
          name: data.ruleName,
          calculationTypeRef: data.calculationTypeId || null,
          standard: !!data.isStandard,
          activeFrom: data.validFrom ? `${data.validFrom}T00:00:00.000Z` : null,
          activeTo: data.validTo ? `${data.validTo}T00:00:00.000Z` : null,
          currencyRef: data.currencyId || null,
          advancePaymentCode: data.advancePaymentCode,
          taxesCode: data.taxesCode,
          nonpayableCode: data.nonPayableCode,
          useLastCountry: !!data.useLastCountry,
          deductionLimit: !!data.deductionLimit,
          useSingleCurrency: !!data.useSingleCurrency,
          countryRef: data.countryRefId || null
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

        // Handle colliding dates
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

        // Save ExpenseRuleFlag
        const isAustrianAbroad = !!data.austrianAbroad
        const isRomanianCalculation = !!data.romanianCalculation
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
      } catch {
        // keep minimal handling for now
      }
    },
    [
      isUpdate,
      navigationPayload,
      prefilledRule,
      lastRuleId,
      existingFlag,
      collidingDatesState,
      localCodeDuplicate,
      standardValidationFailed,
      noInitialValuesChanged,
      graphqlClient,
      restClient,
      accessToken,
      onCreate
    ]
  )

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange?.(isOpen)
    if (!isOpen) {
      onCancel?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid="create-calculation-rule-form">
        <DialogHeader data-testid="ccr-modal-header">
          <DialogTitle data-testid="ccr-modal-title">
            {isUpdate
              ? getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.header_update',
                  'Update Calculation Rule'
                )
              : getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.header_create',
                  'Create Calculation Rule'
                )}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:max-h-[60vh] gba:overflow-y-auto gba:pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div data-testid="ccr-scroll-container" className="gba:space-y-4">
                {/* Rule Code */}
                <FormField
                  control={form.control}
                  name="ruleCode"
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_code_unique_first',
                      "The 'Rule Code' field is required."
                    ),
                    validate: () => {
                      if (localCodeDuplicate) {
                        return getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_code_unique_second',
                          'This code already exists'
                        )
                      }
                      return true
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_code_label',
                          'Rule Code'
                        )}{' '}
                        *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="gba:w-full"
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_code_placeholder',
                            'Enter Rule Code'
                          )}
                          disabled={isUpdate}
                          data-testid="ccr-code-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rule Name */}
                <FormField
                  control={form.control}
                  name="ruleName"
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_custom_rule',
                      "The 'Rule Name' field is required"
                    )
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_label',
                          'Rule Name'
                        )}{' '}
                        *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="gba:w-full"
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_placeholder',
                            'Enter Rule Name'
                          )}
                          disabled={isFieldDisabled}
                          data-testid="ccr-name-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Valid From */}
                <FormField
                  control={form.control}
                  name="validFrom"
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_valid_from_unique_first',
                      "The 'Valid From' field is required."
                    )
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_from_label',
                          'Valid From'
                        )}{' '}
                        *
                      </FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value}
                          onChange={date => field.onChange(date)}
                          disabled={isFieldDisabled}
                          data-testid="ccr-valid-from-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Valid To */}
                <FormField
                  control={form.control}
                  name="validTo"
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_valid_to_unique_first',
                      "The 'Valid To' field is required."
                    ),
                    validate: () => {
                      if (standardValidationFailed) {
                        return getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_to_custom_rule',
                          'Standard already exists for this period'
                        )
                      }
                      return true
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_to_label',
                          'Valid To'
                        )}{' '}
                        *
                      </FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value}
                          onChange={date => field.onChange(date)}
                          data-testid="ccr-valid-to-input"
                        />
                      </FormControl>
                      <FormMessage />
                      {standardValidationFailed && (
                        <p className="gba:text-sm gba:text-destructive">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_to_custom_rule',
                            'Standard already exists for this period'
                          )}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Standard Toggle - Hidden */}
                <div className="gba:hidden">
                  <FormField
                    control={form.control}
                    name="isStandard"
                    render={({ field }) => (
                      <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={checked => handleStandardToggle(!!checked)}
                            disabled={isFieldDisabled}
                            data-testid="ccr-standard-checkbox"
                            className="gba:border-foreground/50 gba:disabled:opacity-100 gba:disabled:border-muted-foreground"
                          />
                        </FormControl>
                        <FormLabel className={`gba:font-normal ${isFieldDisabled ? 'gba:text-muted-foreground' : ''}`}>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.standard_checkbox',
                            'Standard'
                          )}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Rule Calculation */}
                <FormField
                  control={form.control}
                  name="calculationTypeId"
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_period_custom_rule',
                      "The 'Rule Calculation' field is required"
                    )
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_period_label',
                          'Rule Calculation'
                        )}{' '}
                        *
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isFieldDisabled}>
                        <FormControl>
                          <SelectTrigger className="gba:w-full" data-testid="ccr-calculation-select">
                            <SelectValue
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_period_placeholder',
                                'Select Rule Calculation'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {calculationTypeOptions.map((option: any) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Country */}
                <FormField
                  control={form.control}
                  name="countryRefId"
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.country_ref_select_custom_rule',
                      'The Country field is required'
                    )
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.country_ref_select_label',
                          'Country'
                        )}{' '}
                        *
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isFieldDisabled}>
                        <FormControl>
                          <SelectTrigger className="gba:w-full" data-testid="ccr-country-select">
                            <SelectValue
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.country_ref_select_placeholder',
                                'Select Country'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countryOptions.map((option: any) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency */}
                <FormField
                  control={form.control}
                  name="currencyId"
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currenct_custom_rule',
                      "The 'Currency' field is required"
                    )
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currency_label',
                          'Currency'
                        )}{' '}
                        *
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isFieldDisabled}>
                        <FormControl>
                          <SelectTrigger className="gba:w-full" data-testid="ccr-currency-select">
                            <SelectValue
                              placeholder={getTranslationFromI18nKeyAndLabel(
                                'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currency_placeholder',
                                'Select Currency'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencyOptions.map((option: any) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Advance Payment Code */}
                <FormField
                  control={form.control}
                  name="advancePaymentCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.advance_payment_code_input_label',
                          'Advance Payment Code'
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="gba:w-full"
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.advance_payment_code_input_placeholder',
                            'Enter Advance Payment Code'
                          )}
                          disabled={isFieldDisabled}
                          data-testid="ccr-advance-payment-code-input"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Taxes Code */}
                <FormField
                  control={form.control}
                  name="taxesCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.taxes_code_input_label',
                          'Taxes Code'
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="gba:w-full"
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.taxes_code_input_placeholder',
                            'Enter Taxes Code'
                          )}
                          disabled={isFieldDisabled}
                          data-testid="ccr-taxes-code-input"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Non Payable Code */}
                <FormField
                  control={form.control}
                  name="nonPayableCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.nonpayable_code_input_label',
                          'Non Payable Code'
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="gba:w-full"
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.nonpayable_code_input_placeholder',
                            'Enter Non Payable Code'
                          )}
                          disabled={isFieldDisabled}
                          data-testid="ccr-nonpayable-code-input"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Boolean Toggles */}
                <FormField
                  control={form.control}
                  name="austrianAbroad"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={checked => {
                            field.onChange(checked)
                            if (checked) setValue('romanianCalculation', false)
                          }}
                          disabled={isFieldDisabled}
                          data-testid="ccr-austrian-abroad-checkbox"
                          className="gba:border-foreground/50 gba:disabled:opacity-100 gba:disabled:border-muted-foreground"
                        />
                      </FormControl>
                      <FormLabel className={`gba:font-normal ${isFieldDisabled ? 'gba:text-muted-foreground' : ''}`}>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.austrian_abroad',
                          'Austrian Abroad'
                        )}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="romanianCalculation"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={checked => {
                            field.onChange(checked)
                            if (checked) setValue('austrianAbroad', false)
                          }}
                          disabled={isFieldDisabled}
                          data-testid="ccr-romanian-calculation-checkbox"
                          className="gba:border-foreground/50 gba:disabled:opacity-100 gba:disabled:border-muted-foreground"
                        />
                      </FormControl>
                      <FormLabel className={`gba:font-normal ${isFieldDisabled ? 'gba:text-muted-foreground' : ''}`}>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.romanian_calculation',
                          'Romanian Calculation'
                        )}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="useLastCountry"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isFieldDisabled}
                          data-testid="ccr-use-last-country-checkbox"
                          className="gba:border-foreground/50 gba:disabled:opacity-100 gba:disabled:border-muted-foreground"
                        />
                      </FormControl>
                      <FormLabel className={`gba:font-normal ${isFieldDisabled ? 'gba:text-muted-foreground' : ''}`}>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.use_last_country',
                          'Use Last Country'
                        )}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deductionLimit"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isFieldDisabled}
                          data-testid="ccr-deduction-limit-checkbox"
                          className="gba:border-foreground/50 gba:disabled:opacity-100 gba:disabled:border-muted-foreground"
                        />
                      </FormControl>
                      <FormLabel className={`gba:font-normal ${isFieldDisabled ? 'gba:text-muted-foreground' : ''}`}>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.deduction_limit',
                          'Deduction Limit'
                        )}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="useSingleCurrency"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isFieldDisabled}
                          data-testid="ccr-use-single-currency-checkbox"
                          className="gba:border-foreground/50 gba:disabled:opacity-100 gba:disabled:border-muted-foreground"
                        />
                      </FormControl>
                      <FormLabel className={`gba:font-normal ${isFieldDisabled ? 'gba:text-muted-foreground' : ''}`}>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.use_single_currency',
                          'Use single currency'
                        )}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {/* Confirmation modal for standard validation */}
              <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent data-testid="ccr-standard-confirm-modal" onOpenAutoFocus={e => e.preventDefault()}>
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
                          'This Expense Calculation Rule will now only be used through the Expense Calculation Rule Assignment!'
                        )
                      })()}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="gba:flex gba:flex-col gba:items-center gba:gap-6">
                    <div data-testid="ccr-standard-confirm-message" className="gba:font-medium">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.do_you_want_to_continue',
                        'Do you want to continue?'
                      )}
                    </div>
                    <div className="gba:flex gba:gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
                        style={{ borderRadius: '22px', height: '40px' }}
                        data-testid="ccr-standard-confirm-no-button"
                        onClick={() => {
                          setShowConfirmModal(false)
                          setValue('isStandard', false)
                          setStandardValidationFailed(false)
                        }}
                      >
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.no_button',
                          'No'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
                        style={{ borderRadius: '22px', height: '40px' }}
                        data-testid="ccr-standard-confirm-yes-button"
                        onClick={() => setShowConfirmModal(false)}
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
            </form>
          </Form>
        </div>

        <DialogFooter data-testid="ccr-modal-footer" className="gba:mt-6">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="ccr-cancel-button">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.btn_discard',
              'Discard'
            )}
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={hasErrors || (isUpdate && noInitialValuesChanged)}
            onClick={form.handleSubmit(onSubmit)}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateCalculationRuleForm
export { CreateCalculationRuleForm }
