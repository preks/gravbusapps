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
import { ExpensePosition, ExpenseGroup, ExpenseType, CostCenter, Currency, CustomField } from "../../types";
import UploadComponent from "../UploadComponent";
import SinglePositionComponent from "./SinglePositionComponent";
import MultiPositionComponent from "./MultiPositionComponent";
import { useExpenseItem } from "../../context/ExpenseItemContext";

import { Alert } from "antd";
import { getCurrentActiveUserLocale, getDateFormat } from "../../../../../../../common/utils/windowUtils";
import { ICONS } from "@/business-apps/fin/expenses/utils/icons";

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
  handleCancel: () => void;
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
  handleCancel,
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
    isEditMode
  } = useExpenseItem();

  const [formIsValid, setFormIsValid] = useState(false);

  return (
    <Form
      form={form}
      layout="vertical"
      data-testid="expense-form"
      className="gba:flex gba:flex-col gba:flex-grow"
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
      <div className="gba:m-0 gba:mb-[30px]" data-testid="form-upload-container">
        <UploadComponent 
          fileList={fileList} 
          setFileList={setFileList} 
        />
      </div>

      <div className="gba:mb-4" data-testid="title-field-container">
        <div className="gba:relative">
          <Form.Item
            name="title"
            rules={[{ required: true, message: t('lowcoder:create_expense_type_item.current_title_custom_rule', 'Please enter a title')}]}
            style={{ marginBottom: 0 }}
          >
            <InputField
              label={t("lowcoder:create_expense_type_item.current_title_label", "Title")}
              name="title"
              disabled={isFormDisabled || isProcessingFiles}
              placeholder={t(
                "lowcoder:create_expense_type_item.current_title_placeholder",
                "Enter Title"
              )}
              onChange={(field) => form.setFieldsValue({ title: field.value })}
              required={true}
              data-testid="title-input"
            />
          </Form.Item>
        </div>
      </div>

      <div className="gba:mb-4" data-testid="date-field-container">
        <div className="gba:relative">
          <Form.Item
            shouldUpdate
            name="date"
            rules={[{ required: true, message: t('lowcoder:create_expense_type_item.current_date_custom_rule', 'Please select a date') }]}
            style={{ marginBottom: 0 }}
          >
            <DateInputField
              label={t(
                "lowcoder:create_expense_item.change_expense_item_container.current_date_label",
                "Date"
              )}
              name="date"
              placeholder={t(
                "lowcoder:create_expense_item.change_expense_item_container.current_date_placeholder",
                "Select date"
              )}
              data-testid="date-input"
              onChange={(field) => {
                if(field.value)
                setCurrentSelectedDate(field.value as Date)
                form.setFieldsValue({ date: field.value }
                )
              }}
              language={getCurrentActiveUserLocale().split("-")[0] as "en" | "de" | "ro" | undefined}
              required={true}
              format={getDateFormat('date.long')}
              value={form.getFieldValue('date')}
            />
          </Form.Item>
          {expenseRuleError && (
            <Alert
              message={t('lowcoder:create_expense_item.missing_expense_rule_message', 'No expense rule found for this date. Please contact your administrator.')}
              type="error"
              style={{ marginTop: 8 }}
              showIcon
              data-testid="expense-rule-error-alert"
            />
          )}
        </div>
      </div>

      <div className="gba:mb-4" data-testid="multi-position-switch-container">
        <div className="gba:relative">
          <div>
            <Switch
              label={t(
                "lowcoder:create_expense_type_item.multi_position_item",
                "Multi Position Item"
              )}
              name="multiPosition"
              value={multiPosition}
              data-testid="multi-position-switch"
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
          className="gba:flex gba:!justify-start"
          onClick={handleAddPosition}
          data-testid="add-position-button"
          disabled={isProcessingFiles}
        >
          <img 
            src={ICONS.ADD_CIRCLE}
            alt={t("lowcoder:create_expense_type_item.add_position_button", "Add Position")}
            style={{ width: "17px", height: "17px" }}
            data-testid="add-position-icon"
          /> 
          {isProcessingFiles ? t("lowcoder:create_expense_item.file_add_document_processing","Processing...") : t("lowcoder:create_expense_type_item.add_position_button","Add Position")}
        </Button>
      )}

      {/* Total amount and currency row - only visible in multi-position mode */}
      {multiPosition && (
        <Row
          gutter={16}
          className="gba:mt-4 gba:mb-4"
          data-testid="total-row"
        >
          <Col span={12} data-testid="total-amount-col">
            <Form.Item className="gba:mb-0" data-testid="total-amount-form-item">
                <InputField
                  label={t(
                    "lowcoder:create_expense_item.change_expense_item_container.current_amount_label",
                    "Amount"
                  )}
                  className="gba:[&>input[type=number]]:appearance-textfield 
         gba:[&>input[type=number]::-webkit-inner-spin-button]:appearance-none 
         gba:[&>input[type=number]::-webkit-inner-spin-button]:m-0 
         gba:[&>input[type=number]::-webkit-outer-spin-button]:appearance-none 
         gba:[&>input[type=number]::-webkit-outer-spin-button]:m-0"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  data-testid="total-amount-input"
                  value={calculateTotal().toFixed(2)}
                  placeholder={t(
                    "lowcoder:create_expense_item.change_expense_item_container.current_amount_placeholder",
                    "Enter Amount"
                  )}
                  required={true}
                />
            </Form.Item>
          </Col>
          <Col span={12} data-testid="total-currency-col">
            <Form.Item
              name="currency"
              rules={[{ required: true, message: t('lowcoder:create_expense_item.change_expense_item_container.current_currency_custom_rule', 'Please select a currency') }]}
              className="gba:mb-0"
              data-testid="total-currency-form-item"
            >
              <SelectField
                allowClear
                label={t(
                  "lowcoder:create_expense_item.change_expense_item_container.current_currency_label",
                  "Currency"
                )}
                disabled={isProcessingFiles || !!form.getFieldValue('fixedCurrency')}
                name="currency"
                data-testid="total-currency-select"
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
                  "lowcoder:create_expense_item.change_expense_item_container.current_currency_placeholder",
                  "Select Currency"
                )}
                required={true}
              />
            </Form.Item>
          </Col>
        </Row>
      )}
      
      {/* Only show expense request select if not embedded in ExpenseRequestWizard */}
      {!form.getFieldValue('expenseRequestId') ? (
        <Form.Item
          name="expenseRequestId"
          rules={[{ required: true, message: t('lowcoder:create_expense_item.change_expense_item_container.current_request_custom_rule', 'Please select a request') }]}
          className="gba:mb-4"
          data-testid="expense-request-container"
        >
          <SelectField
            allowClear
            name="expenseRequestId"
            data-testid="expense-request-select"
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
              "lowcoder:create_expense_type_item.current_request",
              "Add Expense Request"
            )}
            placeholder={t(
              "lowcoder:create_expense_item.change_expense_item_container.current_request_placeholder",
              "Select Request"
            )}
            disabled={isProcessingFiles}
          />
        </Form.Item>
      ) : null}
      
      {/* Spacer to push content to the bottom */}
      <div className="gba:flex-grow" data-testid="expense-item-spacer" />
      
      <Divider 
        color="#EFEFEF"
        horizontal
        size={1}
        className="gba:mt-[30px] gba:mb-[30px]"
        data-testid="form-divider"
      />
      <div className="gba:flex gba:justify-between gba:py-4" style={{ width: '100%' }} data-testid="expense-item-actions">
        <Button
          variant="outline" 
          onClick={handleCancel}
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', height: '40px' }}
          data-testid="cancel-button"
        >
          {t("lowcoder:create_expense_request.initiate_cancel_button", "Cancel")}
        </Button>
        <Button
          variant="primary"
          onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
          disabled={isProcessingFiles || !formIsValid || !!expenseRuleError}
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', width: 'auto', height: '40px' }}
          data-testid="submit-button"
        >
          {isEditMode ? t("lowcoder:expense_calculation_rule_details.calculation_rule_tab_custom_fields.custom_fields_modal.btn_update", "Update") : t("lowcoder:expense_calculation_rule_details.calculation_rule_tab_custom_fields.custom_fields_modal.btn_save", "Create")}
        </Button>
      </div>
    </Form>
  );
};

export default FormScreenComponent;
