import React, { useState} from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  DateInputField,
  Divider,
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
import { ExpensePosition, ExpenseGroup, ExpenseType, CostCenter, Currency, CustomField } from "../../types";
import UploadComponent from "../UploadComponent";
import SinglePositionComponent from "./SinglePositionComponent";
import MultiPositionComponent from "./MultiPositionComponent";
import { useExpenseItem } from "../../context/ExpenseItemContext";
import { Alert } from "antd";
import { getDateFormat } from "../../../../../../../common/utils/windowUtils";

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
  setCurrentSelectedDate: (date:Date|null)=>void;
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
  setCurrentSelectedDate,
  setMultiPosition,
  handleSubmit,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
  handleAddPosition,
  handleRemovePosition,
  calculateTotal,
}) => {
  const { t } = useTranslation();
  const {
    isProcessingFiles,
    isFormDisabled,
    expenseRuleError,
    handleCurrencyChange,
  } = useExpenseItem();

  const [formIsValid, setFormIsValid] = useState(false);

  return (
    <Form
      form={form}
      layout="vertical"
      
      onFieldsChange={()=>{
        const isFormValidValue = form.getFieldsError().every((fieldErr:  any ) => fieldErr.errors.length === 0);
    setFormIsValid(isFormValidValue)
      }}
      onValuesChange={()=>{
        form.validateFields()
        const isFormValidValue = form.getFieldsError().every((fieldErr:  any ) => fieldErr.errors.length === 0);
    setFormIsValid(isFormValidValue)
      }}
      validateTrigger={['onChange', 'onBlur']}
      initialValues={{
        date: new Date(),
        currency: "Currency:v1:EUR",
      }}
    >
      <div className={`gba:marginBottom16`}>
        <UploadComponent 
          fileList={fileList} 
          setFileList={setFileList} 
        />
      </div>

      <div className={`gba:marginBottom16`}>
        <div>
          <Form.Item
            name="title"
            rules={[{ required: true, message: t('create_expense_type_item.current_title_custom_rule', 'Please enter a title')}]}
          >
            <InputField
              label={t("create_expense_type_item.current_title_label", "Title")}
              name="title"
              disabled={isFormDisabled || isProcessingFiles}
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

      <div className={`gba:marginBottom16`}>
        <div style={{ position: "relative" }}>
          <Form.Item
          shouldUpdate
            name="date"
            rules={[{ required: true, message: t('create_expense_type_item.current_date_custom_rule', 'Please select a date') }]}
            style={{ marginBottom: 0 }}
          >
            <div className={`gba:relativePosition`}>
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
                  onChange={(field) => {
                    if(field.value)
                    setCurrentSelectedDate(field.value as Date)
                    form.setFieldsValue({ date: field.value }
                    )
                }}
                  required={true}
                  format={getDateFormat('date.long')}
                  value={form.getFieldValue('date')}
                />
              </div>
            </div>
          </Form.Item>
          {expenseRuleError && (
            <Alert
              message={t('create_expense_item.missing_expense_rule_message', 'No expense rule found for this date. Please contact your administrator.')}
              type="error"
              style={{ marginTop: 8 }}
              showIcon
            />
          )}
        </div>
      </div>

      <div className={`gba:marginBottom16`}>
        <div className={`gba:relativePosition`}>
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
                if (!newMultiPositionValue && positions.length > 1) {
                  const firstPosition = positions[0];
                  setPositions([firstPosition]);
                  if (firstPosition.expenseType && 
                      firstPosition.customField && 
                      customFields[firstPosition.expenseType]) {
                    setTimeout(() => {
                      form.setFieldsValue({
                        [`customField-0`]: firstPosition.customField
                      });
                    }, 100);
                  }
                } else if (newMultiPositionValue) {
                  setTimeout(() => {
                    positions.forEach((position, index) => {
                      if (position.expenseType && 
                          position.customField && 
                          customFields[position.expenseType]) {
                        form.setFieldsValue({
                          [`customField-${index}`]: position.customField
                        });
                      }
                    });
                  }, 100);
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
          currencies={currencies}
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
        <Button 
          variant="ghost" 
          onClick={handleAddPosition}
          disabled={isProcessingFiles}
          className={`gba:marginBottom16`}
        >
          <PlusCircleOutlined style={{ width: "17px", height: "17px" }} /> 
          {isProcessingFiles ? "Processing..." : "Add Position"}
        </Button>
      )}

      {/* Total amount and currency row - only visible in multi-position mode */}
      {multiPosition && (
        <Row
          gutter={16}
          className={`gba:marginTop16 gba:marginBottom16`}
        >
          <Col span={12}>
            <Form.Item className={`gba:marginBottom0`}>
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
                required={true}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="currency"
              rules={[{ required: true, message: t('create_expense_item.change_expense_item_container.current_currency_custom_rule', 'Please select a currency') }]}

              className={`gba:marginBottom0`}
            >
              <SelectField
                allowClear
                label={t(
                  "create_expense_item.change_expense_item_container.current_currency_label",
                  "Currency"
                )}
                disabled={isProcessingFiles}
                name="currency"
                isDataSorted={false}
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
                  "create_expense_item.change_expense_item_container.current_currency_placeholder",
                  "Select Currency"
                )}
                required={true}
              />
            </Form.Item>
          </Col>
        </Row>
      )}
      
      <Form.Item
        name="expenseRequestId"
        rules={[{ required: true, message: t('create_expense_item.change_expense_item_container.current_request_custom_rule', 'Please select a request') }]}
        className={`gba:marginBottom16`}
      >
        <SelectField
          allowClear
          name="expenseRequestId"
          data={[
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
          disabled={isProcessingFiles}
        />
      </Form.Item>
          <Divider 
            color="#EFEFEF"
            horizontal
            size={1}
            className="gba:mt-[30px] gba:mb-[30px]"
          />
      <Form.Item>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isProcessingFiles || !formIsValid || !!expenseRuleError}
          className={`gba:submitButton`}
        >
          {t("expense_item.submit", "Submit")}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default FormScreenComponent;
