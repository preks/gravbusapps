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
    <div>
      {positions.map((position, index) => (
        <React.Fragment key={index}>
          <div className={`gba:marginBottom16`}>
            <div className={`gba:relativePosition`}>
              <Form.Item
                name={`expenseGroup-${index}`}
                rules={[{ required: true, message: t('create_expense_item.change_expense_item_container.current_expense_group_custom_rule', 'Please select an expense group') }]}
                style={{ marginBottom: 0 }}
              >
                <SelectField
                  allowClear
                  label={t(
                    "create_expense_item.change_expense_item_container.current_expense_group_label",
                    "Expense Group"
                  )}
                  disabled={isProcessingFiles}
                  name="expenseGroup"
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
                    "create_expense_item.change_expense_item_container.current_expense_group_placeholder",
                    "Select Expense Group"
                  )}
                  value={position.expenseGroup || undefined}
                  required={true}
                />
              </Form.Item>
            </div>
          </div>

          <div className={`gba:marginBottom16`}>
            <div className={`gba:relativePosition`}>
              <Form.Item
                name={`expenseType-${index}`}
                rules={[{ required: true, message: t('create_expense_item.change_expense_item_container.current_expense_type_custom_rule', 'Please select an expense type') }]}
                style={{ marginBottom: 0 }}
              >
                <SelectField
                  allowClear
                  label={t(
                    "create_expense_item.change_expense_item_container.current_expense_type_label",
                    "Expense Type"
                  )}
                  disabled={isProcessingFiles || !position.expenseGroup}
                  name="expenseType"
                  data={
                    position.expenseGroup && expenseTypes[position.expenseGroup]
                      ? expenseTypes[position.expenseGroup].map((type) => ({
                          id: type.id,
                          name: type.name,
                        }))
                      : []
                  }
                  onChange={(value: any) => {
                    handleExpenseTypeChange(value?.value || "", index);
                  }}
                  placeholder={t(
                    "create_expense_item.change_expense_item_container.current_expense_type_placeholder",
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
              <div className={`gba:marginBottom16`}>
                <div
                  className={`gba:relativePosition`}
                >
                  <Form.Item
                    name={`customField-${index}`}
                    rules={[
                      customFields[position.expenseType][0]?.mandatory 
                        ? { required: true, message: t('create_expense_item.change_expense_item_container.custom_field_required', 'Please enter a value for this field') }
                        : {}
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputField
                      name={`customField-${index}`}
                      label={
                        customFields[position.expenseType][0]?.infoValue ||
                        t(
                          "create_expense_item.change_expense_item_container.custom_field_label",
                          "Custom Field"
                        )
                      }
                      onChange={(field) => {
                        const updatedPositions = [...positions];
                        updatedPositions[index].customField = field.value as string;
                        setPositions(updatedPositions);
                      }}
                      placeholder={t(
                        "create_expense_item.change_expense_item_container.custom_field_placeholder",
                        "Enter custom field value"
                      )}
                      required={
                        customFields[position.expenseType][0]?.mandatory || false
                      }
                      disabled={isProcessingFiles || !position.expenseType}
                    />
                  </Form.Item>
                </div>
              </div>
            )}
          <div className={`gba:marginBottom16`}>
            <div className="gba:amountCurrencyRow">
              <div className="gba:amountField">
                <Form.Item
                  name={`amount-${index}`}
                  rules={[{ required: true, message: t('create_expense_item.change_expense_item_container.current_amount_custom_rule', 'Please enter an amount') }]}
                  style={{ marginBottom: 0 }}
                >
                  <InputField
                    label={t(
                      "create_expense_item.change_expense_item_container.current_amount_label",
                      "Amount"
                    )}
                    disabled={isProcessingFiles}
                    name={`amount-${index}`}
                    type="number"
                    step="0.01"
                    min="0"
                    className="gba:no-spinner"
                    placeholder={t(
                      "create_expense_item.change_expense_item_container.current_amount_placeholder",
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
                </Form.Item>
              </div>

              <div className="gba:currencyField">
                <Form.Item
                  name="currency"
                  style={{ marginBottom: 0 }}
                >
                  <SelectField
                    label={t(
                      "create_expense_item.change_expense_item_container.current_currency_label",
                      "Currency"
                    )}
                    disabled={isProcessingFiles}
                    name="currency"
                    isDataSorted={false}
                    allowClear
                    data={currencies.map((currency) => ({
                      id: currency.code,
                      name: currency.code,
                    }))}
                    onChange={(value: any) => {
                      form.setFieldsValue({ currency: value.value });
                      
                      if (value && value.value) {
                        handleCurrencyChange(value.value);
                      }
                    }}
                    placeholder={t(
                      "create_expense_item.change_expense_item_container.current_currency_placeholder",
                      "Select Currency"
                    )}
                    required={true}
                  />
                </Form.Item>
              </div>
            </div>
          </div>

          <div className={`gba:marginBottom16`}>
            <div className={`gba:relativePosition`}>
              <Form.Item
                name={`costCenter-${index}`}
                rules={[{ required: true, message: t('create_expense_request.expense_request_container.current_cost_center_custom_rule', 'Please select a cost center') }]}
                style={{ marginBottom: 0 }}
              >
                <SelectField
                  allowClear
                  name="costCenter"
                  disabled={isProcessingFiles}
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
                    "create_expense_request.expense_request_container.current_cost_center_label",
                    "Cost Center"
                  )}
                  placeholder={t(
                    "create_expense_request.expense_request_container.current_cost_center_placeholder",
                    "Select Cost Center"
                  )}
                  value={position.costCenter || undefined}
                  required={true}
                />
              </Form.Item>
            </div>
          </div>

          <div className={`gba:marginBottom16`}>
            <div style={{ marginBottom: "16px" }}>
              <Switch
                label={t(
                  "create_expense_item.is_reimbursable",
                  "Is Reimbursable"
                )}
                disabled={isProcessingFiles}
                name={"isReimbursable" + index}
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
