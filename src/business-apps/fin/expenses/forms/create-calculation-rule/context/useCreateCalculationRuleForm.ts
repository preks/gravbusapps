import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  getCurrentActiveUserLocale,
  getDateFormat,
  getTranslationFromI18nKeyAndLabel,
  getCatalogValue
} from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  ruleDataQuery,
  getLastCalculationRule,
  getExpenseRuleFlagById,
  getCalculationRule,
  getExpenseRuleAggregateByCode
} from '../queries/CreateCalculationRuleQueries'

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

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value } as FormState
    case 'HYDRATE':
      return { ...state, ...action.payload } as FormState
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
}

export const useCreateCalculationRuleForm = ({ accessToken, navigationPayload }: UseCCRParams) => {
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
  const [codeDuplicate, setCodeDuplicate] = useState<boolean>(false)
  const [flagsLoaded, setFlagsLoaded] = useState<boolean>(false)
  const initialSnapshotRef = useRef<any | null>(null)

  const isUpdate = !!navigationPayload?.id
  const graphqlClient = useGraphQLClient(accessToken)

  // Data sources
  useEffect(() => {
    const fetchRuleData = async () => {
      if (!accessToken) return
      try {
        const res = await graphqlClient.request(ruleDataQuery, {
          activeUserLocale: getCurrentActiveUserLocale()
        })
        setCalculationTypes(res?.CalculationTypes || [])
        setCurrencies((res?.Currencies || []).map((c: any) => ({ id: c.id, code: c.code })))
        setCountries(res?.Countries || [])
      } catch {
        // silent
      }
    }
    fetchRuleData()
  }, [accessToken, graphqlClient])

  // On modal mount: fetch last rule and then its flag (or flag by navigation id)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const lastRule = await graphqlClient.request<any>(getLastCalculationRule)
        const candidateId = navigationPayload?.id || lastRule?.ExpenseRule?.[0]?.id || null
        if (cancelled) return
        setLastRuleId(candidateId)
        if (candidateId) {
          const flagsRes = await graphqlClient.request<any>(getExpenseRuleFlagById, { id: candidateId })
          if (cancelled) return
          const flag = flagsRes?.ExpenseRuleFlag?.[0] || null
          setExistingFlag(flag)
          const austrian = flag && flag.name === 'Austrian Abroad' && flag.value === 'true'
          const romanian = flag && flag.name === 'Romanian Calculation' && flag.value === 'true'
          if (austrian || romanian) {
            dispatch({ type: 'SET_FIELD', field: 'austrianAbroad', value: !!austrian })
            dispatch({ type: 'SET_FIELD', field: 'romanianCalculation', value: !!romanian })
          }
          setFlagsLoaded(true)
        } else {
          setExistingFlag(null)
          setFlagsLoaded(true)
        }
      } catch {
        if (!cancelled) {
          setLastRuleId(null)
          setExistingFlag(null)
        }
        setFlagsLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [graphqlClient, navigationPayload?.id])

  // Update mode: prefill form fields from server
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isUpdate || !navigationPayload?.id) return
      try {
        const res = await graphqlClient.request<any>(getCalculationRule, { calculationId: navigationPayload.id })
        if (cancelled) return
        const rule = res?.ExpenseRule?.[0] || null
        if (!rule) return
        setPrefilledRule(rule)
        const hydrated: Partial<FormState> = {
          ruleCode: rule.code || '',
          ruleName: rule.name || '',
          calculationTypeId: rule.calculationTypeRef || null,
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
          countryRefId: rule.countryRef || null
        }
        dispatch({ type: 'HYDRATE', payload: hydrated })
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isUpdate, navigationPayload?.id, graphqlClient])

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
    } else if (codeDuplicate) {
      newErrors.code = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_code_unique_second',
        'This code already exists'
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
    standardValidationFailed,
    codeDuplicate
  ])

  // Code uniqueness check
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const code = (formState.ruleCode || '').trim()
      if (!code) {
        setCodeDuplicate(false)
        return
      }
      try {
        const res = await graphqlClient.request<any>(getExpenseRuleAggregateByCode, {
          codeValue: code,
          ruleId: isUpdate ? navigationPayload?.id : null
        })
        if (cancelled) return
        const count = res?.ExpenseRuleAggregate?.aggregate?.count || 0
        setCodeDuplicate(count > 0)
      } catch {
        if (!cancelled) setCodeDuplicate(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [formState.ruleCode, graphqlClient, isUpdate, navigationPayload?.id])

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
    codeDuplicate,
    flagsLoaded,
    isUpdate,
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
