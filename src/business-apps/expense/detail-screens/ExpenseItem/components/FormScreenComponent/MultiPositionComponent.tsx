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
import { ExpensePosition, ExpenseGroup, ExpenseType, CostCenter } from "../../types";

interface MultiPositionComponentProps {
  positions: ExpensePosition[];
  setPositions: (positions: ExpensePosition[]) => void;
  expenseClasses: ExpenseGroup[];
  expenseTypes: { [classId: string]: ExpenseType[] };
  costCenters: CostCenter[];
  handleExpenseClassChange: (value: string, positionIndex: number) => Promise<void>;
  handleRemovePosition: (positionId: string) => void;
}

export const MultiPositionComponent: React.FC<MultiPositionComponentProps> = ({
  positions,
  setPositions,
  expenseClasses,
  expenseTypes,
  costCenters,
  handleExpenseClassChange,
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
                  "create_expense_item.change_expense_item_container.current_expense_class_label",
                  "Expense Class"
                )}
                name="expenseGroup"
                data={expenseClasses.map((group) => ({
                  id: group.id,
                  name: group.name,
                }))}
                onChange={(value: any) => {
                  handleExpenseClassChange(value.value as string, index);
                }}
                placeholder={t(
                  "create_expense_item.change_expense_item_container.current_expense_class_placeholder",
                  "Select Expense Class"
                )}
                value={position.expenseGroup}
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
                  const updatedPositions = [...positions];
                  updatedPositions[index].expenseType = value.value as string;
                  setPositions(updatedPositions);
                }}
                placeholder={t(
                  "create_expense_item.change_expense_item_container.current_expense_type_placeholder",
                  "Select Expense Type"
                )}
                disabled={!position.expenseGroup}
                value={position.expenseType}
              />
            </div>
          </div>

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
                  updatedPositions[index].costCenter =
                    value.value as string;
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
                value={position.costCenter}
              />
            </div>
          </div>

          <div className={`${styles.marginBottom16} gba:marginBottom16`}>
            <div className={`${styles.relativePosition} gba:relativePosition`}>
              <SelectField
                allowClear
                name="customField"
                data={[
                  { id: "option1", name: "Option 1" },
                  { id: "option2", name: "Option 2" },
                  { id: "option3", name: "Option 3" },
                ]}
                onChange={(value: any) => {
                  const updatedPositions = [...positions];
                  updatedPositions[index].customField =
                    value.value as string;
                  setPositions(updatedPositions);
                }}
                placeholder="Select Custom Field Value"
                value={position.customField}
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
