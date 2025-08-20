import React from "react";
import { useTranslation } from "react-i18next";
import { InputField, SelectField, Switch } from "@newwork/gravity-ui-catalog";
import {
  ExpensePosition,
  ExpenseGroup,
  ExpenseType,
  CostCenter,
  CustomField,
  Currency,
} from "../../types";
import { getCatalogValue } from "../../../../../../../common/utils/windowUtils";
import { NoSpinner } from '../../../expense-request-wizard/screens/components/CommonStyledComponents';
import { useExpenseItem } from "../../context/ExpenseItemContext";
import { Form } from "antd";

interface SinglePositionComponentProps {
  positions: ExpensePosition[];
  setPositions: (positions: ExpensePosition[]) => void;
  expenseGroups: ExpenseGroup[];
  expenseTypes: { [classId: string]: ExpenseType[] };
  customFields: { [expenseTypeId: string]: CustomField[] };
  costCenters: CostCenter[];
  currencies: Currency[];
  handleExpenseGroupChange: (
    value: string,
    positionIndex: number
  ) => Promise<void>;
  handleExpenseTypeChange: (
    value: string,
    positionIndex: number
  ) => Promise<void>;
}

export const SinglePositionComponent: React.FC<
  SinglePositionComponentProps
> = ({
  positions,
  setPositions,
  expenseGroups,
  expenseTypes,
  customFields,
  costCenters,
  currencies,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
}) => {
  const { t } = useTranslation();
  const { isProcessingFiles, form, handleCurrencyChange } = useExpenseItem();

  return (
    <div data-testid="single-position-container">
      {positions.map((position, index) => (
        <React.Fragment key={index}>
          <div className="gba:mb-4" data-testid={`expense-group-container-${index}`}>
            <div className="gba:relative">
              <Form.Item
                name={`expenseGroup-${index}`}
                rules={[{ required: true, message: t('lowcoder:create_expense_item.change_expense_item_container.current_expense_group_custom_rule', 'Please select an expense group') }]}
                style={{ marginBottom: 0 }}
              >
                <SelectField
                  allowClear
                  label={t(
                    "lowcoder:create_expense_item.change_expense_item_container.current_expense_group_label",
                    "Expense Group"
                  )}
                  disabled={isProcessingFiles}
                  name="expenseGroup"
                  data-testid={`expense-group-select-${index}`}
                  data={
                    expenseGroups
                      ? expenseGroups.map((group) => ({
                          id: group.id,
                          name: getCatalogValue(group),
                        }))
                      : []
                  }
                  onChange={(value: any) => {
                    handleExpenseGroupChange(value.value, index);
                  }}
                  placeholder={t(
                    "lowcoder:create_expense_item.change_expense_item_container.current_expense_group_placeholder",
                    "Select Expense Group"
                  )}
                  value={position.expenseGroup || undefined}
                  required={true}
                />
              </Form.Item>
            </div>
          </div>

          <div className="gba:mb-4" data-testid={`expense-type-container-${index}`}>
            <div className="gba:relative">
              <Form.Item
                name={`expenseType-${index}`}
                rules={[{ required: true, message: t('lowcoder:create_expense_item.change_expense_item_container.current_expense_type_custom_rule', 'Please select an expense type') }]}
                style={{ marginBottom: 0 }}
              >
                <SelectField
                  allowClear
                  label={t(
                    "lowcoder:create_expense_item.change_expense_item_container.current_expense_type_label",
                    "Expense Type"
                  )}
                  disabled={isProcessingFiles || !position.expenseGroup}
                  name="expenseType"
                  data-testid={`expense-type-select-${index}`}
                  data={
                    position.expenseGroup && expenseTypes[position.expenseGroup]
                      ? expenseTypes[position.expenseGroup].map((type) => ({
                          id: type.id,
                          name: type.name,
                        }))
                      : []
                  }
                  onChange={(value: any) => {
                    handleExpenseTypeChange(value.value, index);
                  }}
                  placeholder={t(
                    "lowcoder:create_expense_item.change_expense_item_container.current_expense_type_placeholder",
                    "Select Expense Type"
                  )}
                  value={position.expenseType || undefined}
                  required={true}
                />
              </Form.Item>
            </div>
          </div>
          {position.expenseType &&
            customFields[position.expenseType] &&
            customFields[position.expenseType].length > 0 && (
              <div className="gba:mb-4" data-testid={`custom-field-container-${index}`}>
                <div
                  className="gba:relative"
                >
                  <Form.Item
                    name={`customField-${index}`}
                    rules={[
                      customFields[position.expenseType][0]?.mandatory 
                        ? { required: true, message: t('lowcoder:create_expense_type_item.custom_field_default_error_message', 'Please enter a value for this field') }
                        : {}
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputField
                      name={`customField-${index}`}
                      data-testid={`custom-field-input-${index}`}
                      label={
                        customFields[position.expenseType][0]?.infoValue ||
                        t(
                          "lowcoder:create_expense_type_item.custom_field_default_label",
                          "Custom Field"
                        )
                      }
                      onChange={(field) => {
                        form.setFieldsValue({ [`customField-${index}`]: field.value });
                        
                        const updatedPositions = [...positions];
                        updatedPositions[index].customField = field.value as string;
                        setPositions(updatedPositions);
                      }}
                      placeholder={t('lowcoder:create_expense_type_item.enter', 'Enter') + ' ' + 
                        (customFields[position.expenseType][0]?.infoValue || 
                         t("lowcoder:create_expense_type_item.custom_field_default_label", "Custom Field"))
                      }
                      required={
                        customFields[position.expenseType][0]?.mandatory || false
                      }
                      disabled={isProcessingFiles || !position.expenseType}
                    />
                  </Form.Item>
                </div>
              </div>
            )}
          <div className="gba:mb-4" data-testid={`amount-currency-container-${index}`}>
            <div className="gba:flex gba:gap-4">
              <div className="gba:w-1/2" data-testid={`amount-field-container-${index}`}>
                <Form.Item
                  name={`amount-${index}`}
                  rules={[{ required: true, message: t('lowcoder:create_expense_type_item.amount_error_message', 'Please enter an amount') }]}
                  style={{ marginBottom: 0 }}
                >
                  <NoSpinner>
                    <InputField
                      label={t(
                        "lowcoder:create_expense_item.change_expense_item_container.current_amount_label",
                        "Amount"
                      )}
                      disabled={isProcessingFiles}
                      name={`amount-${index}`}
                      data-testid={`amount-input-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={t(
                        "lowcoder:create_expense_item.change_expense_item_container.current_amount_placeholder",
                        "Enter Amount"
                      )}
                      onChange={(field) => {
                        let value = field.value as string;
                        if (value.includes('.')) {
                          const parts = value.split('.');
                          if (parts[1] && parts[1].length > 2) {
                            value = `${parts[0]}.${parts[1].substring(0, 2)}`;
                        }
                      }
                      form.setFieldsValue({ [`amount-${index}`]: value });
                      const updatedPositions = [...positions];
                      updatedPositions[index].amount = parseFloat(value) || 0;
                      setPositions(updatedPositions);
                    }}
                    required={true}
                  />
                </NoSpinner>
                </Form.Item>
              </div>
              <div className="gba:w-1/2" data-testid={`currency-field-container-${index}`}>
                <Form.Item
                  name="currency"
                  style={{ marginBottom: 0 }}
                  rules={[{ required: true, message: t('lowcoder:create_expense_item.change_expense_item_container.current_currency_custom_rule', 'Please select a currency') }]}
                >
                  <SelectField
                    label={t(
                      "lowcoder:create_expense_item.change_expense_item_container.current_currency_label",
                      "Currency"
                    )}
                    disabled={isProcessingFiles || !!form.getFieldValue('fixedCurrency')}
                    name="currency"
                    data-testid={`currency-select-${index}`}
                    isDataSorted={false}
                    allowClear
                    data={currencies.map((currency) => ({
                      id: currency.id,
                      name: currency.code,
                    }))}
                    onChange={(value: any) => {
                      form.setFieldsValue({ currency: value.value });
                      
                      if (value && value.value) {
                        handleCurrencyChange(value.value);
                      }
                    }}
                    placeholder={t(
                      "lowcoder:create_expense_item.change_expense_item_container.current_currency_placeholder",
                      "Select Currency"
                    )}
                    required={true}
                  />
                </Form.Item>
              </div>
            </div>
          </div>

          <div className="gba:mb-4" data-testid={`cost-center-container-${index}`}>
            <div className="gba:relative">
              <Form.Item
                name={`costCenter-${index}`}
                rules={[{ required: true, message: t('lowcoder:create_expense_request.expense_request_container.current_cost_center_custom_rule', 'Please select a cost center') }]}
                style={{ marginBottom: 0 }}
              >
                <SelectField
                  allowClear
                  name="costCenter"
                  disabled={isProcessingFiles}
                  data-testid={`cost-center-select-${index}`}
                  data={costCenters.map((center) => ({
                    id: center.id,
                    name: center.name,
                  }))}
                  onChange={(value: any) => {
                    const updatedPositions = [...positions];
                    updatedPositions[index].costCenter = value.value as string;
                    setPositions(updatedPositions);
                  }}
                  label={t(
                    "lowcoder:create_expense_request.expense_request_container.current_cost_center_label",
                    "Cost Center"
                  )}
                  placeholder={t(
                    "lowcoder:create_expense_request.expense_request_container.current_cost_center_placeholder",
                    "Select Cost Center"
                  )}
                  value={position.costCenter || undefined}
                  required={true}
                />
              </Form.Item>
            </div>
          </div>

          <div className="gba:mb-4" data-testid={`reimbursable-container-${index}`}>
            <div style={{ marginBottom: "16px" }}>
              <Switch
                label={t(
                  "lowcoder:create_expense_type_item.is_reimbursable_solo_switch",
                  "is reimbursable"
                )}
                disabled={isProcessingFiles}
                name={"isReimbursable" + index}
                data-testid={`reimbursable-switch-${index}`}
                value={position.isReimbursable}
                onChange={(checked) => {
                  const updatedPositions = [...positions];
                  updatedPositions[index].isReimbursable =
                    checked.value as boolean;
                  setPositions(updatedPositions);
                }}
              />
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default SinglePositionComponent;
