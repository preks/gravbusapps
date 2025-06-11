import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  InputField,
  SelectField,
  Switch,
} from "@newwork/gravity-ui-catalog";
import { Card, Form } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import styles from "../../ExpenseItem.module.css";
import {
  ExpensePosition,
  ExpenseGroup,
  ExpenseType,
  CostCenter,
  CustomField,
} from "../../types";
import { getCatalogValue } from "../../utils/windowUtils";
import { useExpenseItem } from "../../ExpenseItemContext/ExpenseItemContext";

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
    <div>
      {positions.map((position, index) => (
        <Card
          key={index}
          title={`Position ${index + 1}`}
          className={`${styles.marginBottom16} gba:marginBottom16`}
          extra={
            positions.length > 1 && (
              <Button
                variant="ghost"
                onClick={() => handleRemovePosition(position.id)}
                className={`${styles.deleteButton} gba:deleteButton`}
                disabled={isProcessingFiles}
              >
                <DeleteOutlined />
              </Button>
            )
          }
          headStyle={{ borderBottom: "none" }}
        >
          <div className={`${styles.marginBottom16} gba:marginBottom16`}>
            <div className={`${styles.relativePosition} gba:relativePosition`}>
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
                  data={expenseGroups.map((group) => ({
                    id: group.id,
                    name: getCatalogValue(group),
                  }))}
                  onChange={(value: any) => {
                    handleExpenseGroupChange(value.value as string, index);
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

          <div className={`${styles.marginBottom16} gba:marginBottom16`}>
            <div className={`${styles.relativePosition} gba:relativePosition`}>
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
                  name="expenseType"
                  data={
                    position.expenseGroup
                      ? expenseTypes[position.expenseGroup]?.map((type) => ({
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
              <div className={`${styles.marginBottom16} gba:marginBottom16`}>
                <div
                  className={`${styles.relativePosition} gba:relativePosition`}
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
          <div className={`${styles.marginBottom16} gba:marginBottom16`}>
            <div className={`${styles.relativePosition} gba:relativePosition`}>
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
          </div>

          <div className={`${styles.marginBottom16} gba:marginBottom16`}>
            <div className={`${styles.relativePosition} gba:relativePosition`}>
              <Form.Item
                name={`costCenter-${index}`}
                rules={[{ required: true, message: t('create_expense_request.expense_request_container.current_cost_center_custom_rule', 'Please select a cost center') }]}
                style={{ marginBottom: 0 }}
              >
                <SelectField
                  allowClear
                  disabled={isProcessingFiles}
                  name="costCenter"
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

          <div className={`${styles.marginBottom16} gba:marginBottom16`}>
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
        </Card>
      ))}
    </div>
  );
};

export default MultiPositionComponent;
