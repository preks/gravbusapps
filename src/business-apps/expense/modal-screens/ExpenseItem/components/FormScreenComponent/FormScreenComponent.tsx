import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  DateInputField,
  InputField,
  SelectField,
  Switch,
} from "@newwork/gravity-ui-catalog";
import {
  Form,
  Row,
  Col,
} from "antd";
import {
  PlusCircleOutlined,
} from "@ant-design/icons";
import styles from "../../ExpenseItem.module.css";
import { ExpensePosition, ExpenseGroup, ExpenseType, CostCenter, Currency, CustomField } from "../../types";
import UploadComponent from "../UploadComponent";
import SinglePositionComponent from "./SinglePositionComponent";
import MultiPositionComponent from "./MultiPositionComponent";

interface FormScreenComponentProps {
  form: any;
  fileList: any[];
  setFileList: (files: any[]) => void;
  positions: ExpensePosition[];
  setPositions: (positions: ExpensePosition[]) => void;
  expenseGroups: ExpenseGroup[];
  expenseTypes: { [classId: string]: ExpenseType[] };
  customFields: { [expenseTypeId: string]: CustomField[] };
  costCenters: CostCenter[];
  currencies: Currency[];
  expenseRequests: any[];
  multiPosition: boolean;
  setMultiPosition: (isMulti: boolean) => void;
  handleSubmit: () => Promise<void>;
  handleExpenseGroupChange: (value: string, positionIndex: number) => Promise<void>;
  handleExpenseTypeChange: (value: string, positionIndex: number) => Promise<void>;
  handleAddPosition: () => void;
  handleRemovePosition: (positionId: string) => void;
  loading: boolean;
  calculateTotal: () => number;
}

export const FormScreenComponent: React.FC<FormScreenComponentProps> = ({
  form,
  fileList,
  setFileList,
  positions,
  setPositions,
  expenseGroups,
  expenseTypes,
  customFields,
  costCenters,
  currencies,
  expenseRequests,
  multiPosition,
  setMultiPosition,
  handleSubmit,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
  handleAddPosition,
  handleRemovePosition,
  loading,
  calculateTotal,
}) => {
  const { t } = useTranslation();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        date: new Date(),
        currency: "EUR",
      }}
    >
      {fileList.length > 0 && (
        <div className={`${styles.marginBottom16} gba:marginBottom16`}>
          <UploadComponent fileList={fileList} setFileList={setFileList} />
        </div>
      )}

      <div className={`${styles.marginBottom16} gba:marginBottom16`}>
        <div>
          <Form.Item
            name="title"
            rules={[{ required: true, message: "Please enter a title" }]}
          >
            <InputField
              label={t("create_expense_type_item.current_title_label", "Title")}
              name="title"
              placeholder={t(
                "create_expense_type_item.current_title_placeholder",
                "Enter Title"
              )}
              onChange={(field) => form.setFieldsValue({ title: field.value })}
              required={true}
            />
          </Form.Item>
        </div>
      </div>

      <div className={`${styles.marginBottom16} gba:marginBottom16`}>
        <div style={{ position: "relative" }}>
          <Form.Item
            name="date"
            rules={[{ required: true, message: "Please select a date" }]}
            style={{ marginBottom: 0 }}
          >
            <div className={`${styles.relativePosition} gba:relativePosition`}>
              <div>
                <DateInputField
                  label={t(
                    "create_expense_type_item.current_date_label",
                    "Date"
                  )}
                  name="date"
                  placeholder={t(
                    "create_expense_type_item.current_date_placeholder",
                    "Select date"
                  )}
                  onChange={(field) => form.setFieldsValue({ date: field.value })}
                  required={true}
                  format="DD.MM.YYYY"
                />
              </div>
            </div>
          </Form.Item>
        </div>
      </div>

      <div className={`${styles.marginBottom16} gba:marginBottom16`}>
        <div className={`${styles.relativePosition} gba:relativePosition`}>
          <div>
            <Switch
              label={t(
                "create_expense_item.multi_position",
                "Multiple Positions"
              )}
              name="multiPosition"
              value={multiPosition}
              onChange={(checked) => {
                const newMultiPositionValue = checked.value as boolean;
                
                // If switching from multi to single position, keep only the first position
                if (!newMultiPositionValue && positions.length > 1) {
                  const firstPosition = positions[0];
                  setPositions([firstPosition]);
                }
                
                setMultiPosition(newMultiPositionValue);
              }}
            />
          </div>
        </div>
      </div>

      {!multiPosition ? (
        <SinglePositionComponent
          positions={positions}
          setPositions={setPositions}
          expenseGroups={expenseGroups}
          expenseTypes={expenseTypes}
          customFields={customFields}
          costCenters={costCenters}
          handleExpenseGroupChange={handleExpenseGroupChange}
          handleExpenseTypeChange={handleExpenseTypeChange}
        />
      ) : (
        <MultiPositionComponent
          positions={positions}
          setPositions={setPositions}
          expenseGroups={expenseGroups}
          expenseTypes={expenseTypes}
          customFields={customFields}
          costCenters={costCenters}
          handleExpenseGroupChange={handleExpenseGroupChange}
          handleExpenseTypeChange={handleExpenseTypeChange}
          handleRemovePosition={handleRemovePosition}
        />
      )}

      {multiPosition && (
        <Button variant="ghost" onClick={handleAddPosition}>
          <PlusCircleOutlined style={{ width: "17px", height: "17px" }} /> Add
          Position
        </Button>
      )}

      <Row
        gutter={16}
        className={`${styles.marginTop16} ${styles.marginBottom16} gba:marginTop16 gba:marginBottom16`}
      >
        <Col span={12}>
          <Form.Item className={`${styles.marginBottom0} gba:marginBottom0`}>
            <InputField
              label={t(
                "create_expense_item.change_expense_item_container.current_amount_label",
                "Amount"
              )}
              name="amount"
              value={calculateTotal().toFixed(2)}
              placeholder={t(
                "create_expense_item.change_expense_item_container.current_amount_placeholder",
                "Enter Amount"
              )}
              onChange={() => {
                console.log("changed");
              }}
              required={true}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="currency"
            rules={[{ required: true, message: "Please select a currency" }]}
            className={`${styles.marginBottom0} gba:marginBottom0`}
          >
            <SelectField
              allowClear
              label={t(
                "create_expense_item.change_expense_item_container.current_currency_label",
                "Currency"
              )}
              name="currency"
              isDataSorted={false}
              data={currencies.map((currency) => {
                return {
                  id: currency.id,
                  name: currency.code,
                  value: currency.code
                };
              })}
              onChange={(value: any) => {
                form.setFieldsValue({ currency: value.value });
              }}
              placeholder={t(
                "create_expense_item.change_expense_item_container.current_currency_placeholder",
                "Select Currency"
              )}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="expenseRequestId"
        className={`${styles.marginBottom16} gba:marginBottom16`}
      >
        <SelectField
          allowClear
          name="expenseRequestId"
          data={[
            { id: "none", name: "None" },
            ...expenseRequests.map((request) => ({
              id: request.id,
              name: request.title || request.code,
            })),
          ]}
          onChange={(value: any) => {
            form.setFieldsValue({ expenseRequestId: value.value });
          }}
          label={t(
            "create_expense_type_item.current_request",
            "Add Expense Request"
          )}
          placeholder={t(
            "create_expense_item.change_expense_item_container.current_request_placeholder",
            "Select Request"
          )}
        />
      </Form.Item>

      <Form.Item>
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={loading}
          className={`${styles.submitButton} gba:submitButton`}
        >
          {t("expense_item.submit", "Submit")}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default FormScreenComponent;
