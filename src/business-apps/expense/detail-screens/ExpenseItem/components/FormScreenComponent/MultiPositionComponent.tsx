import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  InputField,
  SelectField,
  Switch,
} from "@newwork/gravity-ui-catalog";
import { Card } from "antd";
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
              >
                <DeleteOutlined />
              </Button>
            )
          }
          headStyle={{ borderBottom: "none" }}
        >
          <div className={`${styles.marginBottom16} gba:marginBottom16`}>
            <div className={`${styles.relativePosition} gba:relativePosition`}>
              <SelectField
                allowClear
                label={t(
                  "create_expense_item.change_expense_item_container.current_expense_group_label",
                  "Expense Group"
                )}
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
            </div>
          </div>

          <div className={`${styles.marginBottom16} gba:marginBottom16`}>
            <div className={`${styles.relativePosition} gba:relativePosition`}>
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
                disabled={!position.expenseGroup}
                value={position.expenseType || undefined}
              />
            </div>
          </div>
          {position.expenseType &&
            customFields[position.expenseType] &&
            customFields[position.expenseType].length > 0 && (
              <div className={`${styles.marginBottom16} gba:marginBottom16`}>
                <div
                  className={`${styles.relativePosition} gba:relativePosition`}
                >
                  <InputField
                    name="customField"
                    label={
                      customFields[position.expenseType][0]?.infoValue ||
                      t(
                        "create_expense_item.change_expense_item_container.custom_field_label",
                        "Custom Field"
                      )
                    }
                    onChange={(field) => {
                      const updatedPositions = [...positions];
                      updatedPositions[index].customField =
                        field.value as string;
                      setPositions(updatedPositions);
                    }}
                    placeholder={t(
                      "create_expense_item.change_expense_item_container.custom_field_placeholder",
                      "Enter custom field value"
                    )}
                    value={position.customField || ""}
                    required={
                      customFields[position.expenseType][0]?.mandatory || false
                    }
                    disabled={!position.expenseType}
                  />
                </div>
              </div>
            )}
          <div className={`${styles.marginBottom16} gba:marginBottom16`}>
            <div className={`${styles.relativePosition} gba:relativePosition`}>
              <InputField
                label={t(
                  "create_expense_item.change_expense_item_container.current_amount_label",
                  "Amount"
                )}
                name="positionAmount"
                placeholder={t(
                  "create_expense_item.change_expense_item_container.current_amount_placeholder",
                  "Enter Amount"
                )}
                onChange={(field) => {
                  const updatedPositions = [...positions];
                  updatedPositions[index].amount = parseFloat(
                    field.value as string
                  );
                  setPositions(updatedPositions);
                }}
                value={position.amount.toString()}
                required={true}
              />
            </div>
          </div>

          <div className={`${styles.marginBottom16} gba:marginBottom16`}>
            <div className={`${styles.relativePosition} gba:relativePosition`}>
              <SelectField
                allowClear
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
              />
            </div>
          </div>

          <div className={`${styles.marginBottom16} gba:marginBottom16`}>
            <div style={{ marginBottom: "16px" }}>
              <Switch
                label={t(
                  "create_expense_item.is_reimbursable",
                  "Is Reimbursable"
                )}
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
