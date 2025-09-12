import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Typography, Divider as AntDivider } from "antd";
import {
  Button,
  Divider,
  InputField,
  DateInputField,
  SelectField,
  Checkbox,
} from "@newwork/gravity-ui-catalog";
import { getCurrentActiveUserLocale, getDateFormat, getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { env } from '@/common/env/EnvUtils';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/business-apps/types';
import { ruleDataQuery } from './queries/CreateCalculationRuleQueries';

interface CreateCalculationRuleFormProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  onCancel?: () => void;
  onCreate?: () => void;
}

const CreateCalculationRuleForm: React.FC<CreateCalculationRuleFormProps> = ({ accessToken, onCancel, onCreate }) => {
  const { t } = useTranslation();
  const [dateValue, setDateValue] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({ date: 'Please select a date' });

  const hasErrors = Object.values(errors).some((msg) => !!msg) || !dateValue;

  const flowIconUrl = useMemo(() => {
    const base = env('NEXT_PUBLIC_BASE_URL') || '';
    return `${base}/_next/static/media/lowcoder-icons/newwork/flow_min_20x20.svg`;
  }, []);

  // Data sources
  const graphqlClient = useGraphQLClient(accessToken);
  const [expenseRules, setExpenseRules] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [calculationTypes, setCalculationTypes] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);

  useEffect(() => {
    const fetchRuleData = async () => {
      if (!accessToken) return;
      try {
        const res = await graphqlClient.request(ruleDataQuery, {
          activeUserLocale: getCurrentActiveUserLocale(),
        });
        setExpenseRules(res?.ExpenseRule || []);
        setCurrencies(res?.Currencies || []);
        setCalculationTypes(res?.CalculationTypes || []);
        setCountries(res?.Countries || []);
      } catch (e) {
        // keep silent for visual-only scaffold
      }
    };
    fetchRuleData();
  }, [accessToken, graphqlClient]);


  return (
    <div data-testid="create-calculation-rule-form" className="gba:flex gba:flex-col gba:flex-grow" style={{ width: "100%",
        maxWidth: "800px",
        height: "100%",   
        minHeight: "calc(-3rem + 100vh)" }}>
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

      {/* Title (visual only) */}
      <div className={`gba:mb-4`} data-testid="ccr-title-field-container">
        <div className={`gba:relative`}>
          <InputField
            label={t("lowcoder:create_expense_type_item.current_title_label", "Title")}
            name="ccrTitle"
            placeholder={t("lowcoder:create_expense_type_item.current_title_placeholder", "Enter Title")}
            data-testid="ccr-title-input"
            onChange={() => {}}
            required={false}
          />
        </div>
      </div>

      {/* Date (visual only) */}
      <div className={`gba:mb-4`} data-testid="ccr-date-field-container">
        <div className={`gba:relative`}>
          <DateInputField
            label={t("lowcoder:create_expense_item.change_expense_item_container.current_date_label", "Date")}
            name="ccrDate"
            placeholder={t("lowcoder:create_expense_item.change_expense_item_container.current_date_placeholder", "Select date")}
            data-testid="ccr-date-input"
            onChange={(field: any) => {
              const value = field?.value || null;
              setDateValue(value);
              setErrors((prev) => ({ ...prev, date: value ? null : 'Please select a date' }));
            }}
            language={getCurrentActiveUserLocale().split("-")[0] as "en" | "de" | "ro" | undefined}
            format={getDateFormat('date.long')}
            required={false}
          />
          {errors.date && (
            <div className="gba:mt-1 gba:pl-1 gba:text-[14px]" style={{ color: '#ff4d4f' }} data-testid="ccr-date-error">
              {errors.date}
            </div>
          )}
        </div>
      </div>

      {/* Expense Group (visual only) */}
      <div className={`gba:mb-4`} data-testid="ccr-expense-group-field-container">
        <div className={`gba:relative`}>
          <SelectField
            allowClear
            label={t("lowcoder:create_expense_type_item.current_expense_group_label", "Expense Group")}
            name="ccrExpenseGroup"
            placeholder={t("lowcoder:create_expense_type_item.current_expense_group_placeholder", "Select Expense Group")}
            data-testid="ccr-expense-group-select"
            data={[{ id: 'placeholder', name: '—' }]}
            onChange={() => {}}
            required={false}
          />
        </div>
      </div>

      {/* Standard checkbox styled like inputs */}
      <div className={`gba:mb-4`} data-testid="ccr-standard-field-container">
        <div className={`gba:relative`}>
          <div
            className="gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:bg-[#F7F7F7] gba:px-4 gba:rounded"
            data-testid="ccr-standard-field"
          >
            <span className="gba:text-[#707070] gba:text-[12px] gba:font-medium" data-testid="ccr-standard-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.standard_label', 'Standard')}
            </span>
            <Checkbox
              name="ccrStandard"
              data-testid="ccr-standard-checkbox"
              onChange={() => {}}
            />
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
          onClick={onCreate}
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


