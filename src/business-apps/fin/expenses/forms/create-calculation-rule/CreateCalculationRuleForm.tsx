import React, { useEffect, useMemo, useReducer, useState } from "react";
import { Typography, Divider as AntDivider } from "antd";
import {
  Button,
  Divider,
  InputField,
  DateInputField,
  SelectField,
  Checkbox,
} from "@newwork/gravity-ui-catalog";
import { getCurrentActiveUserLocale, getDateFormat, getTranslationFromI18nKeyAndLabel, getCatalogValue } from "@/common/utils/windowUtils";
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { env } from '@/common/env/EnvUtils';
import { BusinessAppContextProps } from '@/business-apps/types';
import { ruleDataQuery, plansAndRequestsInRangeQuery, buildGetAffectedExpensesQuery, getLastCalculationRule, getExpenseRuleFlagById, getCalculationRule, getExpenseRuleAggregateByCode } from './queries/CreateCalculationRuleQueries';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { transformCurrencies } from '@/business-apps/fin/expenses/forms/expense-item/utils/currencyUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system';
import AffectedExpensesTable from './components/AffectedExpensesTable';

interface CreateCalculationRuleFormProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  onCancel?: () => void;
  onCreate?: () => void;
  additionalData?: Record<string, any>;
}

// Centralized form state
type FormState = {
  ruleCode: string;
  ruleName: string;
  calculationTypeId: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  isStandard: boolean;
  currencyId: string | null;
  advancePaymentCode: string;
  taxesCode: string;
  nonPayableCode: string;
  austrianAbroad: boolean;
  romanianCalculation: boolean;
  useLastCountry: boolean;
  deductionLimit: boolean;
  useSingleCurrency: boolean;
  countryRefId: string | null;
};

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: any }
  | { type: 'HYDRATE'; payload: Partial<FormState> };

const initialFormState: FormState = {
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
  countryRefId: null,
};

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value } as FormState;
    case 'HYDRATE':
      return { ...state, ...action.payload } as FormState;
    default:
      return state;
  }
};

// Centralized errors state
type ErrorsState = Record<string, string | null>;

type ErrorsAction = { type: 'SET_ERRORS'; payload: ErrorsState };

const errorsReducer = (_state: ErrorsState, action: ErrorsAction): ErrorsState => {
  switch (action.type) {
    case 'SET_ERRORS':
      return action.payload;
    default:
      return _state;
  }
};

// Track field interactions to control when to show error messages
type TouchedState = Record<string, boolean>;

type TouchedAction = { type: 'SET_TOUCHED'; field: string; value: boolean } | { type: 'RESET' };

const touchedReducer = (state: TouchedState, action: TouchedAction): TouchedState => {
  switch (action.type) {
    case 'SET_TOUCHED':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return {};
    default:
      return state;
  }
};

const CreateCalculationRuleForm: React.FC<CreateCalculationRuleFormProps> = ({ accessToken, onCancel, onCreate, additionalData: _navigationPayload }) => {
  const [formState, dispatch] = useReducer(formReducer, initialFormState);
  const [errors, dispatchErrors] = useReducer(errorsReducer, {} as ErrorsState);
  const [touched, dispatchTouched] = useReducer(touchedReducer, {} as TouchedState);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [standardValidationFailed, setStandardValidationFailed] = useState(false);
  const [collidingDatesState, setCollidingDatesState] = useState<any[]>([]);
  const [affectedRows, setAffectedRows] = useState<any[]>([]);
  const [affectedSort, setAffectedSort] = useState<{ field: 'createdAt' | 'title' | 'requestType' | 'type'; order: 'asc' | 'desc' } | null>(null);
  const [affectedPage, setAffectedPage] = useState(1);
  const [affectedTotal, setAffectedTotal] = useState(0);
  const [showAffectedModal, setShowAffectedModal] = useState(false);
  const [lastRuleId, setLastRuleId] = useState<string | null>(null);
  const [existingFlag, setExistingFlag] = useState<any | null>(null);
  const [prefilledRule, setPrefilledRule] = useState<any | null>(null);
  const [codeDuplicate, setCodeDuplicate] = useState<boolean>(false);
  const initialSnapshotRef = React.useRef<any | null>(null);
  const [flagsLoaded, setFlagsLoaded] = useState<boolean>(false);

  const navigationPayload = (_navigationPayload as any)?.nvi_navigationPayload || null;
  const isUpdate = !!navigationPayload?.id;

  const flowIconUrl = useMemo(() => {
    const base = (env && typeof env === 'function') ? (env('NEXT_PUBLIC_BASE_URL') || '') : '';
    return `${base}/_next/static/media/lowcoder-icons/newwork/flow_min_20x20.svg`;
  }, []);

  // Data sources
  const graphqlClient = useGraphQLClient(accessToken);
  const restClient = useRestClient((env && typeof env === 'function') ? env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') : undefined);
  const [calculationTypes, setCalculationTypes] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);

  useEffect(() => {
    const fetchRuleData = async () => {
      if (!accessToken) return;
      try {
        const res = await graphqlClient.request(ruleDataQuery, {
          activeUserLocale: getCurrentActiveUserLocale(),
        });
        setCalculationTypes(res?.CalculationTypes || []);
        setCurrencies(transformCurrencies(res?.Currencies || []));
        setCountries(res?.Countries || []);
      } catch (e) {
        // silent for now
      }
    };
    fetchRuleData();
  }, [accessToken, graphqlClient]);

  // On modal mount: fetch last rule and then its flag (or flag by navigation id)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lastRule = await graphqlClient.request<any>(getLastCalculationRule);
        const candidateId = navigationPayload?.id || lastRule?.ExpenseRule?.[0]?.id || null;
        if (cancelled) return;
        setLastRuleId(candidateId);
        if (candidateId) {
          const flagsRes = await graphqlClient.request<any>(getExpenseRuleFlagById, { id: candidateId });
          if (cancelled) return;
          const flag = flagsRes?.ExpenseRuleFlag?.[0] || null;
          setExistingFlag(flag);
          // Prefill mutally exclusive flags
          const austrian = flag && flag.name === 'Austrian Abroad' && flag.value === 'true';
          const romanian = flag && flag.name === 'Romanian Calculation' && flag.value === 'true';
          if (austrian || romanian) {
            dispatch({ type: 'SET_FIELD', field: 'austrianAbroad', value: !!austrian });
            dispatch({ type: 'SET_FIELD', field: 'romanianCalculation', value: !!romanian });
          }
          setFlagsLoaded(true);
        } else {
          setExistingFlag(null);
          setFlagsLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setLastRuleId(null);
          setExistingFlag(null);
        }
        setFlagsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [graphqlClient, navigationPayload?.id]);

  // Update mode: prefill form fields from server
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isUpdate || !navigationPayload?.id) return;
      try {
        const res = await graphqlClient.request<any>(getCalculationRule, { calculationId: navigationPayload.id });
        if (cancelled) return;
        const rule = res?.ExpenseRule?.[0] || null;
        if (!rule) return;
        setPrefilledRule(rule);
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
          countryRefId: rule.countryRef || null,
        };
        dispatch({ type: 'HYDRATE', payload: hydrated });
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [isUpdate, navigationPayload?.id, graphqlClient]);

  // Validation (required rules and conditional)
  useEffect(() => {
    const newErrors: ErrorsState = {};

    const trimmedCode = (formState.ruleCode || '').trim();
    const trimmedName = (formState.ruleName || '').trim();

    if (!trimmedCode) {
      newErrors.code = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_code_unique_first',
        "The 'Rule Code' field is required."
      );
    } else if (codeDuplicate) {
      newErrors.code = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_code_unique_second',
        'This code already exists'
      );
    }

    if (!trimmedName) {
      newErrors.name = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_custom_rule',
        "The 'Rule Name' field is required"
      );
    }
    if (!formState.validFrom) {
      newErrors.validFrom = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_valid_from_unique_first',
        "The 'Valid From' field is required."
      );
    }
    if (!formState.validTo) {
      newErrors.validTo = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.is_valid_to_unique_first',
        "The 'The 'Valid To' field is required."
      );
    }

    if (!formState.calculationTypeId || String(formState.calculationTypeId).trim() === '') {
      newErrors.calculationType = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_period_custom_rule',
        "The 'Rule Calculation' field is required"
      );
    }

    if (!formState.currencyId || String(formState.currencyId).trim() === '') {
      newErrors.currencyId = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currenct_custom_rule',
        "The 'Currency' field is required"
      );
    }

    if (!formState.countryRefId || String(formState.countryRefId).trim() === '') {
      newErrors.countryRefId = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.country_ref_select_custom_rule',
        'The Country field is required'
      );
    }

    if (formState.isStandard && standardValidationFailed) {
      newErrors.validTo = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_to_custom_rule',
        'Standard already exists for this period'
      );
    }

    dispatchErrors({ type: 'SET_ERRORS', payload: newErrors });
  }, [formState.ruleCode, formState.ruleName, formState.calculationTypeId, formState.validFrom, formState.validTo, formState.isStandard, formState.currencyId, formState.countryRefId, standardValidationFailed, codeDuplicate]);

  // Code uniqueness check
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const code = (formState.ruleCode || '').trim();
      if (!code) { setCodeDuplicate(false); return; }
      try {
        const res = await graphqlClient.request<any>(getExpenseRuleAggregateByCode, {
          codeValue: code,
          ruleId: isUpdate ? navigationPayload?.id : null,
        });
        if (cancelled) return;
        const count = res?.ExpenseRuleAggregate?.aggregate?.count || 0;
        setCodeDuplicate(count > 0);
      } catch {
        if (!cancelled) setCodeDuplicate(false);
      }
    })();
    return () => { cancelled = true; };
  }, [formState.ruleCode, graphqlClient, isUpdate, navigationPayload?.id]);

  const hasErrors = Object.values(errors).some((msg) => !!msg);
  const currentSnapshot = useMemo(() => ({
    ruleCode: (formState.ruleCode || '').trim(),
    ruleName: (formState.ruleName || '').trim(),
    calculationTypeId: formState.calculationTypeId || null,
    validFrom: formState.validFrom ? formState.validFrom.toISOString().slice(0,10) : null,
    validTo: formState.validTo ? formState.validTo.toISOString().slice(0,10) : null,
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
    countryRefId: formState.countryRefId || null,
  }), [formState]);
  const noInitialValuesChanged = useMemo(() => {
    if (!isUpdate || !initialSnapshotRef.current) return true;
    try {
      return JSON.stringify(currentSnapshot) === JSON.stringify(initialSnapshotRef.current);
    } catch { return true; }
  }, [currentSnapshot, isUpdate]);

  // Capture initial snapshot after hydration and flag prefill are done
  useEffect(() => {
    if (!isUpdate) return;
    if (initialSnapshotRef.current) return;
    if (!prefilledRule) return;
    if (!flagsLoaded) return;
    initialSnapshotRef.current = { ...currentSnapshot };
  }, [isUpdate, prefilledRule, flagsLoaded, currentSnapshot]);

  // Helpers for mapping data
  const calculationTypeOptions = useMemo(() => {
    return (calculationTypes || []).map((ct: any) => ({
      id: ct.id,
      name: getCatalogValue(ct),
    }));
  }, [calculationTypes]);

  const currencyOptions = useMemo(() => {
    return (currencies || []).map((c: any) => ({ id: c.id, name: c.code }));
  }, [currencies]);

  const countryOptions = useMemo(() => {
    return (countries || []).map((c: any) => ({ id: c.id, name: getCatalogValue(c) }));
  }, [countries]);

  const shouldShowError = (field: string) => Boolean(errors[field]) && ((Boolean(touched[field]) && hasInteracted) || formSubmitted);

  const getCollidingDates = (data: any[], validFrom?: Date | null, validTo?: Date | null) => {
    if (!validFrom || !validTo) return [] as any[];
    const validFromDate = new Date(validFrom);
    const validToDate = new Date(validTo);
    const collidingItems: any[] = [];
    data.forEach((item) => {
      const itemFrom = new Date((item?.activeFrom || '').split('T')[0] || item?.activeFrom);
      const itemTo = new Date((item?.activeTo || '').split('T')[0] || item?.activeTo);
      if (itemFrom < validToDate && itemTo > validFromDate && item?.standard === true) {
        const newItem = {
          ...item,
          name: item?.name,
          code: item?.code,
          activeFrom: (item?.activeFrom || '').split('T')[0],
          activeTo: (item?.activeTo || '').split('T')[0],
        };
        collidingItems.push(newItem);
      }
    });
    return collidingItems;
  };

  const getDatesWithinRange = (data: any[], validFrom: Date, validTo: Date, type: 'Plan' | 'Request') => {
    const matchingItems: any[] = [];
    data.forEach((item) => {
      const createdAtDate = new Date(item.createdAt);
      if (createdAtDate >= validFrom && createdAtDate <= validTo) {
        const newItem = {
          ...item,
          type,
          requestType: item?.requestType?.value,
          createdAt: (item?.createdAt || '').split('T')[0],
        };
        matchingItems.push(newItem);
      }
    });
    return matchingItems;
  };

  // Server-paginated date validation to populate affected expenses modal
  const runDateValidation = React.useCallback(
    async (from: Date | null, to: Date | null, page: number = 1, order: 'ASC' | 'DESC' = 'ASC') => {
      if (!from || !to) { setShowAffectedModal(false); setAffectedRows([]); setAffectedTotal(0); return; }
      try {
        const query = buildGetAffectedExpensesQuery();
        const limit = 5; // page size
        const offset = (page - 1) * limit;
        const res = await graphqlClient.request<any>(query, {
          from: from.toISOString(),
          to: to.toISOString(),
          limit,
          offset,
          orderDirection: order,
        });
        const plans = (res?.ExpensePlan || []).map((r: any) => ({ createdAt: (r?.createdAt || '').split('T')[0], title: r?.title, requestType: r?.requestType?.value, type: 'Plan' as const }));
        const requests = (res?.ExpenseRequest || []).map((r: any) => ({ createdAt: (r?.createdAt || '').split('T')[0], title: r?.title, requestType: r?.requestType?.value, type: 'Request' as const }));
        const items = (res?.ExpenseItem || []).map((r: any) => ({ createdAt: (r?.createdAt || '').split('T')[0], title: r?.title, requestType: null, type: 'Item' as const }));
        // merge and sort by createdAt, then take the first pageSize records to enforce consistent 5/page
        const merged = [...plans, ...requests, ...items].sort((a, b) => {
          const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return order === 'ASC' ? cmp : -cmp;
        });
        const pageData = merged.slice(0, limit);
        const total = (res?.ExpensePlanAggregate?.aggregate?.count || 0) + (res?.ExpenseRequestAggregate?.aggregate?.count || 0) + (res?.ExpenseItemAggregate?.aggregate?.count || 0);
        setAffectedRows(pageData);
        setAffectedTotal(total);
        setAffectedPage(page);
        setShowAffectedModal(total > 0);
      } catch {
        setShowAffectedModal(false);
        setAffectedRows([]);
        setAffectedTotal(0);
      }
    },
    [graphqlClient]
  );

  const handleStandardToggle = async (checked: boolean) => {
    dispatch({ type: 'SET_FIELD', field: 'isStandard', value: !!checked });
    setHasInteracted(true);
    dispatchTouched({ type: 'SET_TOUCHED', field: 'isStandard', value: true });

    if (!checked) {
      setStandardValidationFailed(false);
      return;
    }

    const currentFrom = formState.validFrom ?? null;
    const currentTo = formState.validTo ?? null;
    if (!currentFrom || !currentTo) {
      setStandardValidationFailed(false);
      return;
    }

    // Range-based check for plans and requests + standard collisions
    try {
      const res = await graphqlClient.request<any>(plansAndRequestsInRangeQuery, {
        from: currentFrom.toISOString(),
        to: currentTo.toISOString(),
      });
      const plans = res?.ExpensePlan || [];
      const requests = res?.ExpenseRequest || [];
      const items = res?.ExpenseItem || [];
      const standardPeriodsInRange = res?.StandardPeriodsInRange || [];
      const collidingDates = getCollidingDates(standardPeriodsInRange, currentFrom, currentTo);
      setCollidingDatesState(collidingDates);
      const allMatching = [
        ...getDatesWithinRange(plans, currentFrom, currentTo, 'Plan'),
        ...getDatesWithinRange(requests, currentFrom, currentTo, 'Request'),
        ...getDatesWithinRange(items, currentFrom, currentTo, 'Item' as any),
      ].sort((a, b) => new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime());

      if (allMatching.length > 0 || collidingDates.length > 0) {
        setAffectedRows(allMatching);
        setAffectedTotal(allMatching.length);
        setAffectedPage(1);
        setAffectedSort(null);
        setShowConfirmModal(true);
        setStandardValidationFailed(true)
      }
      else setStandardValidationFailed(false)
    } catch {
      // ignore range fetch errors
    }
  };

  const handleSubmitClick = () => {
    setHasInteracted(true);
    setFormSubmitted(true);
    if (hasErrors) return;
    if (isUpdate && noInitialValuesChanged) return;
    (async () => {
      try {
        // 1) Determine candidate id/version for update
        const candidateId = navigationPayload?.id || lastRuleId;
        const candidateVersion = navigationPayload?.version || prefilledRule?.version || 0;

        // 2) Save ExpenseRule (INSERT/UPDATE)
        const basePayload = {
          code: isUpdate ? (navigationPayload?.code ?? formState.ruleCode) : formState.ruleCode,
          name: formState.ruleName,
          calculationTypeRef: formState.calculationTypeId,
          standard: !!formState.isStandard,
          activeFrom: formState.validFrom ? `${formState.validFrom.toISOString().slice(0,10)}T00:00:00.000Z` : null,
          activeTo: formState.validTo ? `${formState.validTo.toISOString().slice(0,10)}T00:00:00.000Z` : null,
          currencyRef: formState.currencyId,
          advancePaymentCode: formState.advancePaymentCode,
          taxesCode: formState.taxesCode,
          nonpayableCode: formState.nonPayableCode,
          useLastCountry: !!formState.useLastCountry,
          deductionLimit: !!formState.deductionLimit,
          useSingleCurrency: !!formState.useSingleCurrency,
          countryRef: formState.countryRefId,
        } as any;
        const payload = isUpdate ? {
          expenseRule: { id: candidateId, version: candidateVersion, ...basePayload },
          changeMode: 'UPDATE' as const,
        } : {
          expenseRule: basePayload,
          changeMode: 'INSERT' as const,
        };
        await restClient.post('/employee-expense/saveExpenseRule', payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        // 3) If we had collisions, update previous standard=false
        const toModify = collidingDatesState || [];
        if (Array.isArray(toModify) && toModify.length) {
          await Promise.all(
            toModify.map((calculationRule: any) => {
              const calculationRuleToModify = {
                expenseRule: {
                  id: calculationRule.id,
                  version: calculationRule.version,
                  standard: false,
                },
                changeMode: 'UPDATE',
              };
              return restClient.post('/employee-expense/saveExpenseRule', calculationRuleToModify, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
              });
            })
          );
        }

        // 4) Save ExpenseRuleFlag (INSERT/UPDATE)
        const isAustrianAbroad = !!formState.austrianAbroad;
        const isRomanianCalculation = !!formState.romanianCalculation;
        const flagCode = isRomanianCalculation ? 'romanianCalculation' : 'austrianAbroad';
        const flagName = isRomanianCalculation ? 'Romanian Calculation' : 'Austrian Abroad';
        const flagValue = (isAustrianAbroad || isRomanianCalculation) ? 'true' : 'false';
        const flagPayload = existingFlag ? {
          expenseRuleFlag: {
            id: existingFlag.id,
            version: existingFlag.version,
            expenseRule: existingFlag.expenseRuleId,
            code: flagCode,
            name: flagName,
            value: flagValue,
          },
          changeMode: 'UPDATE'
        } : {
          expenseRuleFlag: {
            expenseRule: candidateId,
            code: flagCode,
            name: flagName,
            value: flagValue,
          },
          changeMode: 'INSERT'
        };
        await restClient.post('/employee-expense/saveExpenseRuleFlag', flagPayload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        onCreate?.();
      } catch (e) {
        // keep minimal handling for now
      }
    })();
  };

  return (
    <div
      data-testid="create-calculation-rule-form"
      className="gba:flex gba:flex-col gba:flex-grow "
      style={{ width: "100%",
        maxWidth: "800px",
        height: "100%",   }}
      onMouseDown={() => setHasInteracted(true)}
      onKeyDown={() => setHasInteracted(true)}
    >
      {/* Header copied from ExpensePlanItem */}
      <div className="gba:mx-auto gba:font-primary gba:flex gba:flex-col" style={{ width: '100%', maxWidth: '800px' }} data-testid="ccr-main-container">
        <div className="gba:flex gba:items-center gba:pt-2 gba:font-primary gba:relative gba:pb-[30px] gba:h-8 gba:box-content" data-testid="expense-plan-item-header-container">
          <div className="gba:flex gba:items-center gba:gap-3" data-testid="expense-plan-item-title-container">
            <img
              src={flowIconUrl}
              alt="Flow"
              className="gba:w-5 gba:h-5"
              style={{ filter: 'invert(1) brightness(0)' }}
              data-testid="ccr-title-icon"
            />
            <Typography.Title level={4} className="gba:mb-0 gba:m-0 gba:font-primary" data-testid="expense-plan-item-header-title">
              {isUpdate
                ? getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.header_title_update', 'Update Calculation Rule')
                : getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.header_title', 'Create Calculation Rule')}
            </Typography.Title>
          </div>
        </div>
        <AntDivider className="gba:m-0 gba:ml-0 gba:mb-[30px]" data-testid="expense-plan-item-header-divider" />
      </div>

      {/* Scrollable content container */}
      <div  data-testid="ccr-scroll-container">

      {/* Affected expenses modal */}
      <Dialog open={showAffectedModal} onOpenChange={setShowAffectedModal}>
        <DialogContent data-testid="ccr-affected-expenses-modal" onOpenAutoFocus={(e) => { e.preventDefault(); }} className="gba:max-w-[60vw] gba:w-[60vw]">
          <DialogHeader>
            <DialogTitle data-testid="ccr-affected-expenses-title">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.affected_expenses_title', 'Affected Expenses')}
            </DialogTitle>
          </DialogHeader>
          <AffectedExpensesTable
            data={affectedRows}
            page={affectedPage}
            pageSize={5}
            totalCount={affectedTotal}
            onPageChange={async (p) => {
              setAffectedPage(p);
              await runDateValidation(formState.validFrom, formState.validTo, p, affectedSort?.order === 'asc' ? 'ASC' : 'DESC');
            }}
            sort={affectedSort}
            onSortChange={async (next) => {
              setAffectedSort(next);
              await runDateValidation(formState.validFrom, formState.validTo, 1, next?.order === 'asc' ? 'ASC' : 'DESC');
            }}
            dataTestId="ccr-affected-expenses"
          />
          <div className="gba:flex gba:justify-center gba:mt-4">
            <Button
              variant="primary"
              className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
              style={{ borderRadius: '22px', height: '40px' }}
              data-testid="ccr-affected-expenses-back-button"
              onClick={() => setShowAffectedModal(false)}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.back_btn', 'Back')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rule Code */}
      <div className={`gba:mb-4`} data-testid="ccr-rule-code-container">
        <div className={`gba:relative`}>
          <InputField
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_code_label', 'Rule Code')}
            name="ccrRuleCode"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_code_placeholder', 'Enter Rule Code')}
            data-testid="ccr-code-input"
            autoFocus={false}
            value={formState.ruleCode}
            disabled={isUpdate}
            onChange={(field: any) => {
              dispatch({ type: 'SET_FIELD', field: 'ruleCode', value: field?.value ?? '' });
            }}
            onBlur={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'code', value: true })}
            required
          />
          {shouldShowError('code') && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-code-error">
              {errors.code}
            </div>
          )}
        </div>
      </div>

      {/* Rule Name */}
      <div className={`gba:mb-4`} data-testid="ccr-rule-name-container">
        <div className={`gba:relative`}>
          <InputField
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_label', 'Rule Name')}
            name="ccrRuleName"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_placeholder', 'Enter Rule Name')}
            data-testid="ccr-name-input"
            autoFocus={false}
            value={formState.ruleName}
            disabled={isUpdate}
            onChange={(field: any) => {
              dispatch({ type: 'SET_FIELD', field: 'ruleName', value: field?.value ?? '' });
            }}
            onBlur={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'name', value: true })}
            required
          />
          {shouldShowError('name') && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-name-error">
              {errors.name}
            </div>
          )}
        </div>
      </div>

      {/* Calculation Type */}
      <div className={`gba:mb-4`} data-testid="ccr-calculation-type-container">
        <div className={`gba:relative`}>
          <SelectField
            allowClear
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_period_label', 'Rule Calculation')}
            name="ccrCalculationType"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_period_placeholder', 'Select Rule Calculation')}
            data-testid="ccr-calculation-select"
            data={calculationTypeOptions}
            value={formState.calculationTypeId || undefined}
            disabled={isUpdate}
            onChange={(value: any) => {
              dispatch({ type: 'SET_FIELD', field: 'calculationTypeId', value: value?.value ?? null });
              setHasInteracted(true);
              dispatchTouched({ type: 'SET_TOUCHED', field: 'calculationType', value: true });
            }}
            required
          />
          {shouldShowError('calculationType') && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-calculation-error">
              {errors.calculationType}
            </div>
          )}
        </div>
      </div>

      {/* Valid From */}
      <div className={`gba:mb-4`} data-testid="ccr-valid-from-container">
        <div className={`gba:relative`}>
          <DateInputField
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_from_label', 'Valid From')}
            name="ccrValidFrom"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_placeholder', 'Select Date')}
            data-testid="ccr-valid-from-input"
            value={formState.validFrom as any}
            disabled={isUpdate}
            onChange={async (field: any) => {
              const value = field?.value ? new Date(field.value) : null;
              dispatch({ type: 'SET_FIELD', field: 'validFrom', value });
              await runDateValidation(value, formState.validTo, 1, affectedSort?.order === 'asc' ? 'ASC' : 'DESC');
            }}
            onBlur={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'validFrom', value: true })}
            language={getCurrentActiveUserLocale().split("-")[0] as "en" | "de" | "ro" | undefined}
            format={getDateFormat('date.long')}
            required
          />
          {shouldShowError('validFrom') && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-valid-from-error">
              {errors.validFrom}
            </div>
          )}
        </div>
      </div>

      {/* Valid To */}
      <div className={`gba:mb-4`} data-testid="ccr-valid-to-container">
        <div className={`gba:relative`}>
          <DateInputField
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_to_label', 'Valid To')}
            name="ccrValidTo"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_placeholder', 'Select Date')}
            data-testid="ccr-valid-to-input"
            value={formState.validTo as any}
            onChange={async (field: any) => {
              const value = field?.value ? new Date(field.value) : null;
              dispatch({ type: 'SET_FIELD', field: 'validTo', value });
              await runDateValidation(formState.validFrom, value, 1, affectedSort?.order === 'asc' ? 'ASC' : 'DESC');
            }}
            onBlur={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'validTo', value: true })}
            language={getCurrentActiveUserLocale().split("-")[0] as "en" | "de" | "ro" | undefined}
            format={getDateFormat('date.long')}
            required
          />
          {shouldShowError('validTo') && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-valid-to-error">
              {errors.validTo}
            </div>
          )}
          {shouldShowError('validTo') && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-valid-to-error">
              {errors.validTo}
            </div>
          )}
        </div>
      </div>

      {/* Standard (re-added between Valid To and Currency) */}
      <div className={`gba:mb-4 gba:hidden`} data-testid="ccr-standard-field-container">
        <div className={`gba:relative`}>
          <div
            className={`${isUpdate ? 'gba:bg-[#eeeff0] gba:cursor-not-allowed' : 'gba:bg-[#F7F7F7]'} gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:px-4 gba:rounded`}
            data-testid="ccr-standard-field"
          >
            <span className={`${isUpdate ? 'gba:text-[#b5b6b6]' : 'gba:text-[#707070]'} gba:text-[12px] gba:font-medium`} data-testid="ccr-standard-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.standard_checkbox', 'Standard')}
            </span>
            <Checkbox
              name="ccrStandard"
              data-testid="ccr-standard-checkbox"
              value={formState.isStandard}
              disabled={isUpdate}
              onChange={(field: any) => {
                handleStandardToggle(!!field?.value);
              }}
            />
          </div>
        </div>
      </div>

      {/* Country */}
      <div className={`gba:mb-4`} data-testid="ccr-country-container">
        <div className={`gba:relative`}>
          <SelectField
            allowClear
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.country_ref_select_label', 'Country')}
            name="ccrCountry"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.country_ref_select_placeholder', 'Select Country')}
            data-testid="ccr-country-select"
            data={countryOptions}
            value={formState.countryRefId || undefined}
            disabled={isUpdate}
            onChange={(value: any) => {
              dispatch({ type: 'SET_FIELD', field: 'countryRefId', value: value?.value ?? null });
              setHasInteracted(true);
              dispatchTouched({ type: 'SET_TOUCHED', field: 'countryRefId', value: true });
            }}
            required
          />
          {shouldShowError('countryRefId') && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-country-error">
              {errors.countryRefId}
            </div>
          )}
        </div>
      </div>

      {/* Currency (moved after Standard) */}
      <div className={`gba:mb-4`} data-testid="ccr-currency-container">
        <div className={`gba:relative`}>
          <SelectField
            allowClear
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currency_label', 'Currency')}
            name="ccrCurrency"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currency_placeholder', 'Select Currency')}
            data-testid="ccr-currency-select"
            data={currencyOptions}
            isDataSorted={false}
            value={formState.currencyId || undefined}
            disabled={isUpdate}
            onChange={(value: any) => {
              dispatch({ type: 'SET_FIELD', field: 'currencyId', value: value?.value ?? null });
              setHasInteracted(true);
              dispatchTouched({ type: 'SET_TOUCHED', field: 'currencyId', value: true });
            }}
            required
          />
          {shouldShowError('currencyId') && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-currency-error">
              {errors.currencyId}
            </div>
          )}
        </div>
      </div>

      {/* Optional Codes */}
      <div className={`gba:mb-4`} data-testid="ccr-advance-payment-code-container">
        <div className={`gba:relative`}>
          <InputField
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.advance_payment_code_input_label', 'Advance Payment Code')}
            name="ccrAdvancePaymentCode"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.advance_payment_code_input_placeholder', 'Enter Advance Payment Code')}
            data-testid="ccr-advance-payment-code-input"
            value={formState.advancePaymentCode}
            disabled={isUpdate}
            onChange={(field: any) => dispatch({ type: 'SET_FIELD', field: 'advancePaymentCode', value: field?.value ?? '' })}
            required={false}
          />
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-taxes-code-container">
        <div className={`gba:relative`}>
          <InputField
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.taxes_code_input_label', 'Taxes Code')}
            name="ccrTaxesCode"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.taxes_code_input_placeholder', 'Enter Taxes Code')}
            data-testid="ccr-taxes-code-input"
            value={formState.taxesCode}
            disabled={isUpdate}
            onChange={(field: any) => dispatch({ type: 'SET_FIELD', field: 'taxesCode', value: field?.value ?? '' })}
            required={false}
          />
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-nonpayable-code-container">
        <div className={`gba:relative`}>
          <InputField
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.nonpayable_code_input_label', 'Non Payable Code')}
            name="ccrNonPayableCode"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.nonpayable_code_input_placeholder', 'Enter Non Payable Code')}
            data-testid="ccr-nonpayable-code-input"
            value={formState.nonPayableCode}
            disabled={isUpdate}
            onChange={(field: any) => dispatch({ type: 'SET_FIELD', field: 'nonPayableCode', value: field?.value ?? '' })}
            required={false}
          />
        </div>
      </div>

      {/* Boolean flags */}
      <div className={`gba:mb-4`} data-testid="ccr-austrian-abroad-container">
        <div className={`gba:relative`}>
          <div className={`${isUpdate ? 'gba:bg-[#eeeff0] gba:cursor-not-allowed' : 'gba:bg-[#F7F7F7]'} gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:px-4 gba:rounded`}>
            <span className={`${isUpdate ? 'gba:text-[#b5b6b6]' : 'gba:text-[#707070]'} gba:text-[12px] gba:font-medium`}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.austrian_abroad', 'Austrian Abroad')}
            </span>
            <Checkbox
              name="ccr-austrian-abroad"
              data-testid="ccr-austrian-abroad-checkbox"
              value={formState.austrianAbroad}
              disabled={isUpdate}
              onChange={(f: any) => {
                const next = !!f?.value;
                dispatch({ type: 'SET_FIELD', field: 'austrianAbroad', value: next });
                if (next) {
                  dispatch({ type: 'SET_FIELD', field: 'romanianCalculation', value: false });
                }
              }} />
          </div>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-romanian-calculation-container">
        <div className={`gba:relative`}>
          <div className={`${isUpdate ? 'gba:bg-[#eeeff0] gba:cursor-not-allowed' : 'gba:bg-[#F7F7F7]'} gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:px-4 gba:rounded`}>
            <span className={`${isUpdate ? 'gba:text-[#b5b6b6]' : 'gba:text-[#707070]'} gba:text-[12px] gba:font-medium`}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.romanian_calculation', 'Romanian Calculation')}
            </span>
            <Checkbox
              name="ccr-romanian-calculation"
              data-testid="ccr-romanian-calculation-checkbox"
              value={formState.romanianCalculation}
              disabled={isUpdate}
              onChange={(f: any) => {
                const next = !!f?.value;
                dispatch({ type: 'SET_FIELD', field: 'romanianCalculation', value: next });
                if (next) {
                  dispatch({ type: 'SET_FIELD', field: 'austrianAbroad', value: false });
                }
              }} />
          </div>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-use-last-country-container">
        <div className={`gba:relative`}>
          <div className={`${isUpdate ? 'gba:bg-[#eeeff0] gba:cursor-not-allowed' : 'gba:bg-[#F7F7F7]'} gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:px-4 gba:rounded`}>
            <span className={`${isUpdate ? 'gba:text-[#b5b6b6]' : 'gba:text-[#707070]'} gba:text-[12px] gba:font-medium`}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.use_last_country', 'Use Last Country')}
            </span>
            <Checkbox
              name="ccr-use-last-country"
              data-testid="ccr-use-last-country-checkbox"
              value={formState.useLastCountry}
              disabled={isUpdate}
              onChange={(f: any) => dispatch({ type: 'SET_FIELD', field: 'useLastCountry', value: !!f?.value })} />
          </div>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-deduction-limit-container">
        <div className={`gba:relative`}>
          <div className={`${isUpdate ? 'gba:bg-[#eeeff0] gba:cursor-not-allowed' : 'gba:bg-[#F7F7F7]'} gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:px-4 gba:rounded`}>
            <span className={`${isUpdate ? 'gba:text-[#b5b6b6]' : 'gba:text-[#707070]'} gba:text-[12px] gba:font-medium`}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.deduction_limit', 'Deduction Limit')}
            </span>
            <Checkbox
              name="ccr-deduction-limit"
              data-testid="ccr-deduction-limit-checkbox"
              value={formState.deductionLimit}
              disabled={isUpdate}
              onChange={(f: any) => dispatch({ type: 'SET_FIELD', field: 'deductionLimit', value: !!f?.value })} />
          </div>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-use-single-currency-container">
        <div className={`gba:relative`}>
          <div className={`${isUpdate ? 'gba:bg-[#eeeff0] gba:cursor-not-allowed' : 'gba:bg-[#F7F7F7]'} gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:px-4 gba:rounded`}>
            <span className={`${isUpdate ? 'gba:text-[#b5b6b6]' : 'gba:text-[#707070]'} gba:text-[12px] gba:font-medium`}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.use_single_currency', 'Use single currency')}
            </span>
            <Checkbox
              name="ccr-use-single-currency"
              data-testid="ccr-use-single-currency-checkbox"
              value={formState.useSingleCurrency}
              disabled={isUpdate}
              onChange={(f: any) => dispatch({ type: 'SET_FIELD', field: 'useSingleCurrency', value: !!f?.value })} />
          </div>
        </div>
      </div>


      </div>

      {/* Confirmation modal for standard validation */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent data-testid="ccr-standard-confirm-modal" onOpenAutoFocus={(e) => { e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle data-testid="ccr-standard-confirm-title">
              {(() => {
                const count = collidingDatesState?.length || 0;
                if (count === 1) {
                  const entry = collidingDatesState[0] || {};
                  const prefix = getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.checkbox_modal_text_first',
                    'This will deselect the standard flag on rule: '
                  );
                  return `${prefix} ${entry.code || ''}-${entry.name || ''}`;
                }
                if (count > 1) {
                  return getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.checkbox_modal_text_second',
                    'This will deselect the standard flag on multiple rules'
                  );
                }
                return getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.checkbox_modal_text_third',
                  'This Expense Calculation Rule will now only be used through the Expense Calculation Rule Assignment!This Expense Calculation Rule will now only be used through the Expense Calculation Rule Assignment!'
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-6">
            <div data-testid="ccr-standard-confirm-message" className=" gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.do_you_want_to_continue', 'Do you want to continue?')}
            </div>
            <div className="gba:flex gba:gap-4">
              <Button
                variant="outline"
                className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
                style={{ borderRadius: '22px', height: '40px' }}
                data-testid="ccr-standard-confirm-no-button"
                onClick={() => {
                  setShowConfirmModal(false);
                  dispatch({ type: 'SET_FIELD', field: 'isStandard', value: false });
                  setStandardValidationFailed(false);
                }}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.no_button', 'No')}
              </Button>
              <Button
                variant="primary"
                className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
                style={{ borderRadius: '22px', height: '40px' }}
                data-testid="ccr-standard-confirm-yes-button"
                onClick={() => {
                  setShowConfirmModal(false);
                }}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.checkbox_modal.yes_button', 'Yes')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Spacer to push actions to bottom */}
      <div className="gba:flex-grow" data-testid="ccr-spacer" />

      {/* Divider and actions (copying visual style from ExpensePlanItem bottom) */}
      <Divider 
        color="#EFEFEF"
        horizontal
        size={1}
        className="gba:mt-[30px] gba:mb-[30px]"
        data-testid="ccr-form-divider"
      />
      <div className="gba:flex gba:justify-between gba:py-4" style={{ width: '100%' }} data-testid="ccr-actions">
        <Button
          variant="outline"
          onClick={onCancel}
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', height: '40px' }}
          data-testid="ccr-cancel-button"
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.btn_discard', 'Discard')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmitClick}
          disabled={hasErrors || (isUpdate && noInitialValuesChanged)}
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', width: 'auto', height: '40px' }}
          data-testid="ccr-create-button"
        >
          {isUpdate
            ? getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.btn_update', 'Update')
            : getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.btn_save', 'Save')}
        </Button>
      </div>
    </div>
  );
};

export default CreateCalculationRuleForm;
export { CreateCalculationRuleForm };


