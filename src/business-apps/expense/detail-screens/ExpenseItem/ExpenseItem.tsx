import React from "react";
import styles from "./ExpenseItem.module.css";
import { useTranslation } from "react-i18next";
import { BusinessAppContextProps } from '../../../../common/BusinessAppContext';
import { ExpenseItemProvider, useExpenseItem } from './ExpenseItemContext';
import {
  Button,
  DateInputField,
  InputField,
  SelectField,
  Switch,
} from "@newwork/gravity-ui-catalog";
import {
  Form,
  Upload,
  Card,
  Typography,
  Row,
  Col,
  Divider,
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  ArrowLeftOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import {
  ExpenseItemProps,
} from "./types";

const { Title } = Typography;

const ExpenseItemContent: React.FC = () => {
  const { t } = useTranslation();
  
  // Get all states and functions from context
  const {
    form,
    currentStep,
    setCurrentStep,
    fileList,
    setFileList,
    positions,
    setPositions,
    expenseClasses,
    expenseRequests,
    loading,
    expenseTypes,
    costCenters,
    multiPosition,
    setMultiPosition,
    handleFileUpload,
    handleSubmit,
    handleExpenseClassChange,
    handleAddPosition,
    handleRemovePosition,
    handleAmountChange,
    calculateTotal,
    currencies
  } = useExpenseItem();

  // Render upload component
  const renderUpload = () => (
    <Upload
      listType="picture"
      fileList={fileList}
      beforeUpload={(file) => {
        setFileList([file]);
        return false;
      }}
      onRemove={() => setFileList([])}
      maxCount={1}
    >
      <div className={styles.uploadDragContainer}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">Attach Receipt</p>
      </div>
    </Upload>
  );

  // Render start screen
  const renderStartScreen = () => (
    <div style={{ textAlign: "center", padding: "20px" }}>
      {renderUpload()}
      <Button
        variant="ghost"
        onClick={() => setCurrentStep("form")}
        className={styles.continueButton}
      >
        Continue without receipt
      </Button>
    </div>
  );

  // Render form screen
  const renderFormScreen = () => (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        date: new Date(),
        currency: "EUR",
      }}
    >
      {fileList.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <Upload
            listType="text"
            fileList={fileList}
            onRemove={() => setFileList([])}
            disabled
          />
          <Button
            icon={<UploadOutlined />}
            onClick={() => setFileList([])}
            style={{ marginTop: "10px" }}
          >
            Attach Receipt
          </Button>
        </div>
      )}

      <div className={styles.marginBottom16}>
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

      <div style={{ marginBottom: "16px" }}>
        <div style={{ position: "relative" }}>
          <Form.Item
            name="date"
            rules={[{ required: true, message: "Please select a date" }]}
            style={{ marginBottom: 0 }}
          >
            <div className={styles.relativePosition}>
              <div>
                <DateInputField
                  label={t(
                    "create_expense_item.change_expense_item_container.current_date_label",
                    "Date"
                  )}
                  name="formFieldDate"
                  format="DD.MM.YYYY"
                  placeholder={t(
                    "create_expense_item.change_expense_item_container.current_date_placeholder",
                    "Select Date"
                  )}
                  onChange={(value) => {
                    form.setFieldsValue({ date: value });
                  }}
                />
              </div>
            </div>
          </Form.Item>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <Switch
          label={t(
            "create_expense_type_item.multi_position_item",
            "Multi Position Item"
          )}
          name="switchfield"
          value={multiPosition}
          onChange={(checked) => {
            setMultiPosition(checked.value as boolean);
          }}
        />
      </div>

      {multiPosition ? (
        // Display positions as cards when multi-position is on
        positions.map((position, index) => (
          <Card
            key={index}
            headStyle={{ borderBottom: 0 }}
            title={`Position ${index + 1}`}
            className={styles.positionCard}
            extra={
              positions.length > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => handleRemovePosition(position.id)}
                  className={styles.deleteButton}
                >
                  <DeleteOutlined />
                </Button>
              )
            }
          >
            <div className={styles.marginBottom16}>
              <div className={styles.relativePosition}>
                <SelectField
                  allowClear
                  name="group"
                  data={expenseClasses}
                  onChange={(value) => {
                    handleExpenseClassChange(value.value as string, index);
                  }}
                  label={t(
                    "create_expense_item.change_expense_item_container.current_expense_group_label",
                    "Expense Group"
                  )}
                  placeholder={t(
                    "create_expense_item.change_expense_item_container.current_expense_group_placeholder",
                    "Select Expense Group"
                  )}
                />
              </div>
            </div>

            <div className={styles.marginBottom16}>
              <div>
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

            <div className={styles.marginBottom16}>
              <div className={styles.relativePosition}>
                <div>
                  <InputField
                    label={t(
                      "create_expense_item.change_expense_item_container.current_amount_label",
                      "Amount"
                    )}
                    name="amount"
                    value={position.amount}
                    placeholder={t(
                      "create_expense_item.change_expense_item_container.current_amount_placeholder",
                      "Enter Amount"
                    )}
                    onChange={(field) => {
                      const value =
                        typeof field.value === "string"
                          ? field.value
                          : String(field.value);
                      handleAmountChange(parseFloat(value) || 0, index);
                    }}
                    required={true}
                  />
                </div>
              </div>
            </div>

            <div className={styles.marginBottom16}>
              <div className={styles.relativePosition}>
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
                  value={position.costCenter}
                />
              </div>
            </div>

            <div className={styles.marginBottom16}>
              <div className={styles.relativePosition}>
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
                    updatedPositions[index].customField = value.value as string;
                    setPositions(updatedPositions);
                  }}
                  placeholder="Select Custom Field Value"
                  value={position.customField}
                />
              </div>
            </div>

            <div className={styles.marginBottom16}>
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
        ))
      ) : (
        // Display position fields directly when multi-position is off
        <div className={styles.singlePositionContainer}>
          {positions.map((position, index) => (
            <React.Fragment key={index}>
              <div className={styles.marginBottom16}>
                <div className={styles.relativePosition}>
                  <SelectField
                    allowClear
                    name="group"
                    data={expenseClasses}
                    onChange={(value) => {
                      handleExpenseClassChange(value.value as string, index);
                    }}
                    label={t(
                      "create_expense_item.change_expense_item_container.current_expense_group_label",
                      "Expense Group"
                    )}
                    placeholder={t(
                      "create_expense_item.change_expense_item_container.current_expense_group_placeholder",
                      "Select Expense Group"
                    )}
                  />
                </div>
              </div>

              <div className={styles.marginBottom16}>
                <div>
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
                      updatedPositions[index].expenseType =
                        value.value as string;
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

              <div className={styles.marginBottom16}>
                <div className={styles.relativePosition}>
                  <div>
                    <InputField
                      label={t(
                        "create_expense_item.change_expense_item_container.current_amount_label",
                        "Amount"
                      )}
                      name="amount"
                      value={position.amount}
                      placeholder={t(
                        "create_expense_item.change_expense_item_container.current_amount_placeholder",
                        "Enter Amount"
                      )}
                      onChange={(field) => {
                        const value =
                          typeof field.value === "string"
                            ? field.value
                            : String(field.value);
                        handleAmountChange(parseFloat(value) || 0, index);
                      }}
                      required={true}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.marginBottom16}>
                <div className={styles.relativePosition}>
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

              <div className={styles.marginBottom16}>
                <div className={styles.relativePosition}>
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

              <div className={styles.marginBottom16}>
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
            </React.Fragment>
          ))}
        </div>
      )}

      {multiPosition && (
        <Button variant="ghost" onClick={handleAddPosition}>
          <PlusCircleOutlined style={{ width: "17px", height: "17px" }} /> Add
          Position
        </Button>
      )}

      <Row
        gutter={16}
        className={styles.marginTop16 + " " + styles.marginBottom16}
      >
        <Col span={12}>
          <Form.Item className={styles.marginBottom0}>
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
            className={styles.marginBottom0}
          >
            <SelectField
              allowClear
              label={t(
                "create_expense_item.change_expense_item_container.current_currency_label",
                "Currency"
              )}
              name="currency"
              data={currencies}
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
        className={`${styles.marginBottom16} `}
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
          className={styles.submitButton}
        >
          Submit
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <div className={styles.mainContainer}>
      <div className={styles.headerContainer}>
        {currentStep === "form" && (
          <Button
            variant="ghost"
            onClick={() => setCurrentStep("start")}
            className={styles.button}
          >
            <ArrowLeftOutlined />
          </Button>
        )}
        <Title level={4} className={styles.headerTitle}>
          New Expense Item
        </Title>
        <Button variant="ghost" className={styles.button}>
          <CloseOutlined />
        </Button>
      </div>
      <Divider className={styles.headerDivider} />

      {currentStep === "start" ? renderStartScreen() : renderFormScreen()}
    </div>
  );
};

// Wrapper component that provides the context
const ExpenseItem: React.FC<BusinessAppContextProps & ExpenseItemProps> = ({ accessToken, userInfo, additionalData }) => {
  return (
    <ExpenseItemProvider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData}>
      <ExpenseItemContent />
    </ExpenseItemProvider>
  );
};

export default ExpenseItem;
