import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  getCurrentActiveUserLocale,
  getDateFormat,
  getTranslationFromI18nKeyAndLabel,
  getCatalogValue
} from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getEditModeData, getCreateModeData } from '../queries/CreateCalculationRuleQueries'

export type FormState = {
  ruleCode: string
  ruleName: string
  calculationTypeId: string | null
  validFrom: Date | null
  validTo: Date | null
  isStandard: boolean
  currencyId: string | null
  advancePaymentCode: string
  taxesCode: string
  nonPayableCode: string
  austrianAbroad: boolean
  romanianCalculation: boolean
  useLastCountry: boolean
  deductionLimit: boolean
  useSingleCurrency: boolean
  countryRefId: string | null
}

export const initialFormState: FormState = {
  ruleCode: '',
  ruleName: '',
  calculationTypeId: null,
  validFrom: new Date(),
  validTo: new Date('9999-12-31'),
  isStandard: false,
  currencyId: null,
  advancePaymentCode: '',
  taxesCode: '',
  nonPayableCode: '',
  austrianAbroad: false,
  romanianCalculation: false,
  useLastCountry: false,
  deductionLimit: false,
  useSingleCurrency: false,
  countryRefId: null
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: any }
  | { type: 'HYDRATE'; payload: Partial<FormState> }
  | { type: 'RESET' }

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value } as FormState
    case 'HYDRATE':
      return { ...state, ...action.payload } as FormState
    case 'RESET':
      return { ...initialFormState, validFrom: new Date(), validTo: new Date('9999-12-31') }
    default:
      return state
  }
}

export type ErrorsState = Record<string, string | null>
type ErrorsAction = { type: 'SET_ERRORS'; payload: ErrorsState }
const errorsReducer = (_state: ErrorsState, action: ErrorsAction): ErrorsState => {
  switch (action.type) {
    case 'SET_ERRORS':
      return action.payload
    default:
      return _state
  }
}

export type TouchedState = Record<string, boolean>
type TouchedAction = { type: 'SET_TOUCHED'; field: string; value: boolean } | { type: 'RESET' }
const touchedReducer = (state: TouchedState, action: TouchedAction): TouchedState => {
  switch (action.type) {
    case 'SET_TOUCHED':
      return { ...state, [action.field]: action.value }
    case 'RESET':
      return {}
    default:
      return state
  }
}

export interface UseCCRParams {
  accessToken: string
  navigationPayload: any | null
  open?: boolean
}

export const useCreateCalculationRuleForm = ({ accessToken, navigationPayload, open = true }: UseCCRParams) => {
  const [formState, dispatch] = useReducer(formReducer, initialFormState)
  const [errors, dispatchErrors] = useReducer(errorsReducer, {} as ErrorsState)
  const [touched, dispatchTouched] = useReducer(touchedReducer, {} as TouchedState)
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [standardValidationFailed, setStandardValidationFailed] = useState(false)
  const [calculationTypes, setCalculationTypes] = useState<any[]>([])
  const [currencies, setCurrencies] = useState<any[]>([])
  const [countries, setCountries] = useState<any[]>([])
  const [lastRuleId, setLastRuleId] = useState<string | null>(null)
  const [existingFlag, setExistingFlag] = useState<any | null>(null)
  const [prefilledRule, setPrefilledRule] = useState<any | null>(null)
  const [flagsLoaded, setFlagsLoaded] = useState<boolean>(false)
  // Initialize to true for update mode (safer default - prevents edits until usage check completes)
  const [isRuleUsed, setIsRuleUsed] = useState<boolean>(!!navigationPayload?.id)
  const initialSnapshotRef = useRef<any | null>(null)

  const isUpdate = !!navigationPayload?.id
  const graphqlClient = useGraphQLClient(accessToken)

  // CREATE MODE: Reset form when opening in create mode (not update mode)
  useEffect(() => {
    if (!open || isUpdate) return

    // Reset form to initial state for new rule creation
    dispatch({ type: 'RESET' })
    dispatchTouched({ type: 'RESET' })
    setFormSubmitted(false)
    setHasInteracted(false)
    setStandardValidationFailed(false)
    setLastRuleId(null)
    setExistingFlag(null)
    setPrefilledRule(null)
    setFlagsLoaded(false)
    setIsRuleUsed(false)
    initialSnapshotRef.current = null
  }, [open, isUpdate])

  // EDIT MODE: Immediately hydrate form from navigationPayload (data already passed from list)
  useEffect(() => {
    if (!open || !isUpdate || !navigationPayload) return

    // Immediately hydrate form with data passed from the list - no waiting for API
    const rule = navigationPayload
    setPrefilledRule(rule)
    setLastRuleId(rule.id)

    const hydrated: Partial<FormState> = {
      ruleCode: rule.code || '',
      ruleName: rule.name || '',
      calculationTypeId: rule.calculationTypeRef || rule.calculationType?.id || null,
      validFrom: rule.activeFrom ? new Date(rule.activeFrom) : new Date(),
      validTo: rule.activeTo ? new Date(rule.activeTo) : new Date('9999-12-31'),
      isStandard: !!rule.standard,
      currencyId: rule.currencyRef || rule.currency?.id || null,
      advancePaymentCode: rule.advancePaymentCode || '',
      taxesCode: rule.taxesCode || '',
      nonPayableCode: rule.nonpayableCode || '',
      useLastCountry: !!rule.useLastCountry,
      deductionLimit: !!rule.deductionLimit,
      useSingleCurrency: !!rule.useSingleCurrency,
      countryRefId: rule.countryRef || null,
      austrianAbroad: false, // Will be updated when flags load
      romanianCalculation: false // Will be updated when flags load
    }
    dispatch({ type: 'HYDRATE', payload: hydrated })
  }, [open, isUpdate, navigationPayload])

  // Fetch additional data (catalogs, flags, usage check) in background
  useEffect(() => {
    if (!open) return // Don't fetch data when modal is closed

    let cancelled = false
    ;(async () => {
      if (!accessToken) return

      try {
        if (isUpdate && navigationPayload?.id) {
          // EDIT MODE: Fetch only catalogs + flags + usage (rule data already from navigationPayload)
          const res = await graphqlClient.request<any>(getEditModeData, {
            calculationId: navigationPayload.id,
            activeUserLocale: getCurrentActiveUserLocale()
          })

          if (cancelled) return

          // Set catalog data
          setCalculationTypes(res?.CalculationTypes || [])
          setCurrencies((res?.Currencies || []).map((c: any) => ({ id: c.id, code: c.code })))
          setCountries(res?.Countries || [])

          // Process ALL flags and update form
          const flags = res?.ExpenseRuleFlag || []
          // Find the first active flag (we store the first for update operations)
          setExistingFlag(flags[0] || null)

          // Check ALL flags for Austrian and Romanian settings
          const austrianFlag = flags.find((f: any) => f.name === 'Austrian Abroad' && f.value === 'true')
          const romanianFlag = flags.find((f: any) => f.name === 'Romanian Calculation' && f.value === 'true')

          // Update form with found flag values
          dispatch({
            type: 'HYDRATE',
            payload: {
              austrianAbroad: !!austrianFlag,
              romanianCalculation: !!romanianFlag
            }
          })

          // Process usage check - determine if rule has been used
          const planCount = res?.planCount?.aggregate?.count || 0
          const requestCount = res?.requestCount?.aggregate?.count || 0
          const itemCount = res?.itemCount?.aggregate?.count || 0
          setIsRuleUsed(planCount > 0 || requestCount > 0 || itemCount > 0)

          setFlagsLoaded(true)
        } else {
          // CREATE MODE: Fetch catalogs + last rule in ONE call
          const res = await graphqlClient.request<any>(getCreateModeData, {
            activeUserLocale: getCurrentActiveUserLocale()
          })

          if (cancelled) return

          // Set catalog data
          setCalculationTypes(res?.CalculationTypes || [])
          setCurrencies((res?.Currencies || []).map((c: any) => ({ id: c.id, code: c.code })))
          setCountries(res?.Countries || [])

          // Set last rule reference
          const lastRule = res?.ExpenseRule?.[0] || null
          setLastRuleId(lastRule?.id || null)
          setFlagsLoaded(true)
        }
      } catch (err) {
        console.error('Error fetching form data:', err)
        setFlagsLoaded(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, accessToken, isUpdate, navigationPayload?.id])

  // Validation
  useEffect(() => {
    const newErrors: ErrorsState = {}
    const trimmedCode = (formState.ruleCode || '').trim()
    const trimmedName = (formState.ruleName || '').trim()
    if (!trimmedCode) {
      newErrors.code = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_code_unique_first',
        "The 'Rule Code' field is required."
      )
    }
    if (!trimmedName) {
      newErrors.name = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_custom_rule',
        "The 'Rule Name' field is required"
      )
    }
    if (!formState.validFrom) {
      newErrors.validFrom = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_valid_from_unique_first',
        "The 'Valid From' field is required."
      )
    }
    if (!formState.validTo) {
      newErrors.validTo = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_valid_to_unique_first',
        "The 'The 'Valid To' field is required."
      )
    }
    if (!formState.calculationTypeId || String(formState.calculationTypeId).trim() === '') {
      newErrors.calculationType = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_period_custom_rule',
        "The 'Rule Calculation' field is required"
      )
    }
    if (!formState.currencyId || String(formState.currencyId).trim() === '') {
      newErrors.currencyId = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currenct_custom_rule',
        "The 'Currency' field is required"
      )
    }
    if (!formState.countryRefId || String(formState.countryRefId).trim() === '') {
      newErrors.countryRefId = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.country_ref_select_custom_rule',
        'The Country field is required'
      )
    }
    if (formState.isStandard && standardValidationFailed) {
      newErrors.validTo = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_to_custom_rule',
        'Standard already exists for this period'
      )
    }
    dispatchErrors({ type: 'SET_ERRORS', payload: newErrors })
  }, [
    formState.ruleCode,
    formState.ruleName,
    formState.calculationTypeId,
    formState.validFrom,
    formState.validTo,
    formState.isStandard,
    formState.currencyId,
    formState.countryRefId,
    standardValidationFailed
  ])

  const hasErrors = useMemo(() => Object.values(errors).some(msg => !!msg), [errors])

  const currentSnapshot = useMemo(
    () => ({
      ruleCode: (formState.ruleCode || '').trim(),
      ruleName: (formState.ruleName || '').trim(),
      calculationTypeId: formState.calculationTypeId || null,
      validFrom: formState.validFrom ? formState.validFrom.toISOString().slice(0, 10) : null,
      validTo: formState.validTo ? formState.validTo.toISOString().slice(0, 10) : null,
      isStandard: !!formState.isStandard,
      currencyId: formState.currencyId || null,
      advancePaymentCode: formState.advancePaymentCode || '',
      taxesCode: formState.taxesCode || '',
      nonPayableCode: formState.nonPayableCode || '',
      austrianAbroad: !!formState.austrianAbroad,
      romanianCalculation: !!formState.romanianCalculation,
      useLastCountry: !!formState.useLastCountry,
      deductionLimit: !!formState.deductionLimit,
      useSingleCurrency: !!formState.useSingleCurrency,
      countryRefId: formState.countryRefId || null
    }),
    [formState]
  )

  const noInitialValuesChanged = useMemo(() => {
    if (!isUpdate || !initialSnapshotRef.current) return true
    try {
      return JSON.stringify(currentSnapshot) === JSON.stringify(initialSnapshotRef.current)
    } catch {
      return true
    }
  }, [currentSnapshot, isUpdate])

  // Capture initial snapshot after hydration and flag prefill are done
  useEffect(() => {
    if (!isUpdate) return
    if (initialSnapshotRef.current) return
    if (!prefilledRule) return
    if (!flagsLoaded) return
    initialSnapshotRef.current = { ...currentSnapshot }
  }, [isUpdate, prefilledRule, flagsLoaded, currentSnapshot])

  const calculationTypeOptions = useMemo(() => {
    return (calculationTypes || []).map((ct: any) => ({ id: ct.id, name: getCatalogValue(ct) }))
  }, [calculationTypes])

  const currencyOptions = useMemo(() => {
    return (currencies || []).map((c: any) => ({ id: c.id, name: c.code }))
  }, [currencies])

  const countryOptions = useMemo(() => {
    return (countries || []).map((c: any) => ({ id: c.id, name: getCatalogValue(c) }))
  }, [countries])

  const shouldShowError = (field: string) =>
    Boolean(errors[field]) && ((Boolean(touched[field]) && hasInteracted) || formSubmitted)

  return {
    graphqlClient,
    // state
    formState,
    errors,
    touched,
    formSubmitted,
    hasInteracted,
    standardValidationFailed,
    calculationTypeOptions,
    currencyOptions,
    countryOptions,
    lastRuleId,
    existingFlag,
    prefilledRule,
    flagsLoaded,
    isUpdate,
    isRuleUsed,
    hasErrors,
    noInitialValuesChanged,
    initialSnapshotRef,
    // dispatchers
    dispatch,
    dispatchTouched,
    setFormSubmitted,
    setHasInteracted,
    setStandardValidationFailed,
    // helpers
    shouldShowError,
    getCurrentActiveUserLocale,
    getDateFormat
  }
}
