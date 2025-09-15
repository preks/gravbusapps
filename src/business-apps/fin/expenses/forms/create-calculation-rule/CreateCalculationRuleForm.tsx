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
import { env } from '@/common/env/EnvUtils';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/business-apps/types';
import { ruleDataQuery } from './queries/CreateCalculationRuleQueries';
import { transformCurrencies } from '@/business-apps/fin/expenses/forms/expense-item/utils/currencyUtils';

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

  const flowIconUrl = useMemo(() => {
    const base = env('NEXT_PUBLIC_BASE_URL') || '';
    return `${base}/_next/static/media/lowcoder-icons/newwork/flow_min_20x20.svg`;
  }, []);

  // Data sources
  const graphqlClient = useGraphQLClient(accessToken);
  const [standardPeriods, setStandardPeriods] = useState<any[]>([]);
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
        setStandardPeriods(res?.StandardPeriods || []);
        setCalculationTypes(res?.CalculationTypes || []);
        setCurrencies(transformCurrencies(res?.Currencies || []));
        setCountries(res?.Countries || []);
      } catch (e) {
        // silent for now
      }
    };
    fetchRuleData();
  }, [accessToken, graphqlClient]);

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
    }

    if (!trimmedName) {
      newErrors.name = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_name_custom_rule',
        "The 'Rule Name' field is required"
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

    // If standard is checked, show provided error on validTo
    if (formState.isStandard) {
      newErrors.validTo = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.valid_to_custom_rule',
        'Standard already exists for this period'
      );
    }

    dispatchErrors({ type: 'SET_ERRORS', payload: newErrors });
  }, [formState.ruleCode, formState.ruleName, formState.calculationTypeId, formState.validFrom, formState.validTo, formState.isStandard, formState.currencyId, formState.countryRefId]);

  const hasErrors = Object.values(errors).some((msg) => !!msg);

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

  const handleSubmitClick = () => {
    setHasInteracted(true);
    setFormSubmitted(true);
    if (!hasErrors && onCreate) {
      onCreate();
    }
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
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.header_title', 'Create Calculation Rule')}
            </Typography.Title>
          </div>
        </div>
        <AntDivider className="gba:m-0 gba:ml-0 gba:mb-[30px]" data-testid="expense-plan-item-header-divider" />
      </div>

      {/* Scrollable content container */}
      <div  data-testid="ccr-scroll-container">

      {/* Rule Code */}
      <div className={`gba:mb-4`} data-testid="ccr-rule-code-container">
        <div className={`gba:relative`}>
          <InputField
            label={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_code_label', 'Rule Code')}
            name="ccrRuleCode"
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.current_rule_code_placeholder', 'Enter Rule Code')}
            data-testid="ccr-code-input"
            autoFocus={false}
            onChange={(field: any) => {
              dispatch({ type: 'SET_FIELD', field: 'ruleCode', value: field?.value ?? '' });
            }}
            onBlur={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'code', value: true })}
            required={false}
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
            onChange={(field: any) => {
              dispatch({ type: 'SET_FIELD', field: 'ruleName', value: field?.value ?? '' });
            }}
            onBlur={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'name', value: true })}
            required={false}
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
            onChange={(value: any) => {
              dispatch({ type: 'SET_FIELD', field: 'calculationTypeId', value: value?.value ?? null });
              setHasInteracted(true);
              dispatchTouched({ type: 'SET_TOUCHED', field: 'calculationType', value: true });
            }}
            required={false}
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
            onChange={(field: any) => {
              const value = field?.value ? new Date(field.value) : null;
              dispatch({ type: 'SET_FIELD', field: 'validFrom', value });
            }}
            onBlur={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'validFrom', value: true })}
            language={getCurrentActiveUserLocale().split("-")[0] as "en" | "de" | "ro" | undefined}
            format={getDateFormat('date.long')}
            required={false}
          />
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
            onChange={(field: any) => {
              const value = field?.value ? new Date(field.value) : null;
              dispatch({ type: 'SET_FIELD', field: 'validTo', value });
            }}
            onBlur={() => dispatchTouched({ type: 'SET_TOUCHED', field: 'validTo', value: true })}
            language={getCurrentActiveUserLocale().split("-")[0] as "en" | "de" | "ro" | undefined}
            format={getDateFormat('date.long')}
            required={false}
          />
          {shouldShowError('validTo') && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-valid-to-error">
              {errors.validTo}
            </div>
          )}
        </div>
      </div>

      {/* Standard (re-added between Valid To and Currency) */}
      <div className={`gba:mb-4`} data-testid="ccr-standard-field-container">
        <div className={`gba:relative`}>
          <div
            className="gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:bg-[#F7F7F7] gba:px-4 gba:rounded"
            data-testid="ccr-standard-field"
          >
            <span className="gba:text-[#707070] gba:text-[12px] gba:font-medium" data-testid="ccr-standard-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.standard_checkbox', 'Standard')}
            </span>
            <Checkbox
              name="ccrStandard"
              data-testid="ccr-standard-checkbox"
              onChange={(field: any) => {
                dispatch({ type: 'SET_FIELD', field: 'isStandard', value: !!field?.value });
                setHasInteracted(true);
                dispatchTouched({ type: 'SET_TOUCHED', field: 'isStandard', value: true });
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
            onChange={(value: any) => {
              dispatch({ type: 'SET_FIELD', field: 'countryRefId', value: value?.value ?? null });
              setHasInteracted(true);
              dispatchTouched({ type: 'SET_TOUCHED', field: 'countryRefId', value: true });
            }}
            required={false}
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
            onChange={(value: any) => {
              dispatch({ type: 'SET_FIELD', field: 'currencyId', value: value?.value ?? null });
              setHasInteracted(true);
              dispatchTouched({ type: 'SET_TOUCHED', field: 'currencyId', value: true });
            }}
            required={false}
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
            onChange={(field: any) => dispatch({ type: 'SET_FIELD', field: 'nonPayableCode', value: field?.value ?? '' })}
            required={false}
          />
        </div>
      </div>

      {/* Boolean flags */}
      <div className={`gba:mb-4`} data-testid="ccr-austrian-abroad-container">
        <div className={`gba:relative`}>
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:bg-[#F7F7F7] gba:px-4 gba:rounded">
            <span className="gba:text-[#707070] gba:text-[12px] gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.austrian_abroad', 'Austrian Abroad')}
            </span>
            <Checkbox
              name="ccr-austrian-abroad"
              data-testid="ccr-austrian-abroad-checkbox"
              onChange={(f: any) => dispatch({ type: 'SET_FIELD', field: 'austrianAbroad', value: !!f?.value })} />
          </div>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-romanian-calculation-container">
        <div className={`gba:relative`}>
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:bg-[#F7F7F7] gba:px-4 gba:rounded">
            <span className="gba:text-[#707070] gba:text-[12px] gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.romanian_calculation', 'Romanian Calculation')}
            </span>
            <Checkbox
              name="ccr-romanian-calculation"
              data-testid="ccr-romanian-calculation-checkbox"
              onChange={(f: any) => dispatch({ type: 'SET_FIELD', field: 'romanianCalculation', value: !!f?.value })} />
          </div>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-use-last-country-container">
        <div className={`gba:relative`}>
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:bg-[#F7F7F7] gba:px-4 gba:rounded">
            <span className="gba:text-[#707070] gba:text-[12px] gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.use_last_country', 'Use Last Country')}
            </span>
            <Checkbox
              name="ccr-use-last-country"
              data-testid="ccr-use-last-country-checkbox"
              onChange={(f: any) => dispatch({ type: 'SET_FIELD', field: 'useLastCountry', value: !!f?.value })} />
          </div>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-deduction-limit-container">
        <div className={`gba:relative`}>
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:bg-[#F7F7F7] gba:px-4 gba:rounded">
            <span className="gba:text-[#707070] gba:text-[12px] gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.deduction_limit', 'Deduction Limit')}
            </span>
            <Checkbox
              name="ccr-deduction-limit"
              data-testid="ccr-deduction-limit-checkbox"
              onChange={(f: any) => dispatch({ type: 'SET_FIELD', field: 'deductionLimit', value: !!f?.value })} />
          </div>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="ccr-use-single-currency-container">
        <div className={`gba:relative`}>
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:bg-[#F7F7F7] gba:px-4 gba:rounded">
            <span className="gba:text-[#707070] gba:text-[12px] gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.use_single_currency', 'Use single currency')}
            </span>
            <Checkbox
              name="ccr-use-single-currency"
              data-testid="ccr-use-single-currency-checkbox"
              onChange={(f: any) => dispatch({ type: 'SET_FIELD', field: 'useSingleCurrency', value: !!f?.value })} />
          </div>
        </div>
      </div>


      </div>

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
          disabled={hasErrors}
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', width: 'auto', height: '40px' }}
          data-testid="ccr-create-button"
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.btn_save', 'Save')}
        </Button>
      </div>
    </div>
  );
};

export default CreateCalculationRuleForm;
export { CreateCalculationRuleForm };


