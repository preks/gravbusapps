import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  InputField,
  SelectField,
  Switch,
} from "@newwork/gravity-ui-catalog";
import { Card, Form } from "antd";
import {
  ExpensePosition,
  ExpenseGroup,
  ExpenseType,
  CostCenter,
  CustomField,
} from "../../types";
import { getCatalogValue } from "../../../../../../../common/utils/windowUtils";
import { useExpenseItem } from "../../context/ExpenseItemContext";
import { ICONS } from "@/business-apps/fin/expenses/utils/icons";


interface MultiPositionComponentProps {
  positions: ExpensePosition[];
  setPositions: (positions: ExpensePosition[]) => void;
  expenseGroups: ExpenseGroup[];
  expenseTypes: { [classId: string]: ExpenseType[] };
  customFields: { [expenseTypeId: string]: CustomField[] };
  costCenters: CostCenter[];
  handleExpenseGroupChange: (
    value: string,
    positionIndex: number
  ) => Promise<void>;
  handleExpenseTypeChange: (
    value: string,
    positionIndex: number
  ) => Promise<void>;
  handleRemovePosition: (positionId: string) => void;
}

export const MultiPositionComponent: React.FC<MultiPositionComponentProps> = ({
  positions,
  setPositions,
  expenseGroups,
  expenseTypes,
  customFields,
  costCenters,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
  handleRemovePosition,
}) => {
  const { t } = useTranslation();
  const { isProcessingFiles, form } = useExpenseItem();

  return (
    <div data-testid="multi-position-container">
      {positions.map((position, index) => (
        <Card
          key={index}
          title={`Position ${index + 1}`}
          className="gba:mb-4 gba:border-[3px] gba:border-[#EFEFEF]"
          data-testid={`position-card-${index}`}
          extra={
            positions.length > 1 && (
              <Button
                variant="ghost"
                onClick={() => handleRemovePosition(position.id)}
                className="gba:text-[#f5222d] hover:gba:text-[#cf1322] hover:gba:bg-[rgba(245,34,45,0.1)]"
                disabled={isProcessingFiles}
                data-testid={`delete-position-button-${index}`}
              >
                <img 
                  src={ICONS.DELETE}
                  alt={t("lowcoder:create_expense_type_item.delete_position", "Delete Position")}
                  width="16"
                  height="16"
                  data-testid="delete-position-icon"
                />
              </Button>
            )
          }
          headStyle={{ borderBottom: "none" }}
        >
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
                  data={expenseGroups.map((group) => ({
                    id: group.id,
                    name: getCatalogValue(group),
                  }))}
                  onChange={(value: any) => {
                    handleExpenseGroupChange(value.value as string, index);
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
                  name="expenseType"
                  data-testid={`expense-type-select-${index}`}
                  data={
                    position.expenseGroup
                      ? expenseTypes[position.expenseGroup]?.map((type) => ({
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
                  disabled={isProcessingFiles || !position.expenseGroup}
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

          <div className="gba:mb-4" data-testid={`amount-container-${index}`}>
            <div className="gba:relative">
              <Form.Item
                name={`amount-${index}`}
                rules={[{ required: true, message: t('lowcoder:create_expense_type_item.amount_error_message', 'Please enter an amount') }]}
                style={{ marginBottom: 0 }}
              >
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
                  className="gba:no-spinner"
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
              </Form.Item>
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
                  disabled={isProcessingFiles}
                  name="costCenter"
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
        </Card>
      ))}
    </div>
  );
};

export default MultiPositionComponent;
