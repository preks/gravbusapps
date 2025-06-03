import React, { useState, useEffect } from "react";
import styles from "./ExpenseItem.module.css";
import { useTranslation } from "react-i18next";
import {
  Button,
  DateInputField,
  Input,
  InputField,
  SelectField,
  Switch,
} from "@newwork/gravity-ui-catalog";
import {
  Form,
  Upload,
  Card,
  Typography,
  Divider,
  message,
  Row,
  Col,
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  CloseOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import {
  ExpenseItemProps,
  ExpensePosition,
  ExpenseGroup,
  ExpenseType,
  CostCenter,
  Currency,
} from "./types";
import {
  GET_EXPENSE_CLASSES,
  GET_COST_CENTERS,
  GET_CURRENCIES,
  GET_EXPENSE_REQUESTS,
  GET_EXPENSE_TYPES,
  fetchEmployeeRule,
} from "./ExpenseItemQueries";

// Default employee ID in case userInfo is undefined
const DEFAULT_EMPLOYEE_ID = "86a8317d-34ef-4e04-951b-b0bb9754dea0";

const { Title } = Typography;

const ExpenseItem: React.FC<ExpenseItemProps> = ({ accessToken, userInfo }) => {
  const { t } = useTranslation();
  // Create a simple GraphQL client for API calls
  const graphqlClient = {
    query: async ({ query, variables }: { query: string; variables?: any }) => {
      const response = await fetch(
        "https://newwork-dev.newwork.com/v1/graphql",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query,
            variables,
          }),
        }
      );
      return response.json();
    },
  };
  // Component states
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState<"start" | "form">("start");
  const [loading, setLoading] = useState<boolean>(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [positions, setPositions] = useState<ExpensePosition[]>([
    {
      id: "",
      expenseGroup: "",
      expenseType: "",
      amount: 0,
      costCenter: "",
      customField: "",
      isReimbursable: false,
    },
  ]);

  // Employee rule ID is managed by the API customFieldsSoloData
  const [employeeRule, setEmployeeRuleId] = useState<string | null>(null);
  const [firstRunVariable, setFirstRunVariable] = useState<boolean>(false);
  const [expenseClasses, setExpenseClasses] = useState<ExpenseGroup[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<{
    [classId: string]: ExpenseType[];
  }>({});
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<any[]>([]);
  const [multiPosition, setMultiPosition] = useState<boolean>(false);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch employee rule
        const currentDate = new Date().toISOString();
        const employeeIdValue =
          userInfo?.employeeDetails?.employeeId || DEFAULT_EMPLOYEE_ID;

        // Use the fetchEmployeeRule function from the queries file
        const employeeRuleData = await fetchEmployeeRule(
          employeeIdValue,
          currentDate,
          accessToken
        );

        if (employeeRuleData) {
          setEmployeeRuleId(employeeRuleData.expenseRuleId);
          console.log("Employee rule data:", employeeRuleData);
        }

        // Fetch expense classes
        const classesResponse = await graphqlClient.query({
          query: GET_EXPENSE_CLASSES,
        });
        setExpenseClasses(classesResponse.data.ExpenseClass);

        // Fetch cost centers
        const costCentersResponse = await graphqlClient.query({
          query: GET_COST_CENTERS,
        });
        setCostCenters(costCentersResponse.data.CostCenter);

        // Fetch currencies
        const currenciesResponse = await graphqlClient.query({
          query: GET_CURRENCIES,
        });
        setCurrencies(currenciesResponse.data.Currency);

        // Fetch expense requests
        const employeeId =
          userInfo?.id ||
          userInfo?.employeeDetails?.employeeId ||
          DEFAULT_EMPLOYEE_ID;
        const requestsResponse = await graphqlClient.query({
          query: GET_EXPENSE_REQUESTS,
          variables: { employeeId },
        });
        setExpenseRequests(requestsResponse.data.ExpenseRequest || []);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        message.error("Failed to load expense data");
      }
    };

    fetchInitialData();
  }, [graphqlClient]);

  // Fetch expense types when expense class changes
  const fetchExpenseTypes = async (classId: string) => {
    try {
      const response = await graphqlClient.query({
        query: GET_EXPENSE_TYPES,
        variables: { classId },
      });

      setExpenseTypes((prev) => ({
        ...prev,
        [classId]: response.data.ExpenseType,
      }));

      return response.data.ExpenseType;
    } catch (error) {
      console.error("Error fetching expense types:", error);
      message.error("Failed to load expense types");
      return [];
    }
  };

  // Calculate total amount
  const calculateTotal = (): number => {
    return positions.reduce(
      (total, position) => total + (position.amount || 0),
      0
    );
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (fileList.length === 0) return null;

    try {
    } catch (error) {
      console.error("Error uploading file:", error);
      message.error("Failed to upload receipt");
      return null;
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      await form.validateFields();
      setLoading(true);

      // Upload file if exists
      await handleFileUpload();

      // // Create expense item
      // const createItemResponse = await graphqlClient.mutate({
      //   mutation: CREATE_EXPENSE_ITEM,
      //   variables: {
      //     title: values.title,
      //     date: values.date.toISOString(),
      //     totalAmount: calculateTotal(),
      //     currencyRef: values.currency,
      //     employeeId: userInfo?.id || userInfo?.employeeDetails?.employeeId || DEFAULT_EMPLOYEE_ID,
      //     attachmentUrl: fileData?.url || null,
      //     fileName: fileData?.fileName || null,
      //     expenseRequestId: values.expenseRequestId || null
      //   }
      // });

      // const expenseItemId = createItemResponse.data.insert_ExpenseItem_one.id;

      // Create expense positions
      // for (const position of positions) {
      //   await graphqlClient.mutate({
      //     mutation: CREATE_EXPENSE_POSITION,
      //     variables: {
      //       expenseItemId,
      //       expenseClassId: position.expenseGroup,
      //       expenseTypeId: position.expenseType,
      //       amount: position.amount,
      //       costCenterId: position.costCenter,
      //       customField: position.customField,
      //       isReimbursable: position.isReimbursable
      //     }
      //   });
      // }

      message.success("Expense item created successfully");
      // Reset form and state
      form.resetFields();
      setFileList([]);
      setPositions([
        {
          id: "",
          expenseGroup: "",
          expenseType: "",
          amount: 0,
          costCenter: "",
          customField: "",
          isReimbursable: false,
        },
      ]);
      setCurrentStep("start");
    } catch (error) {
      console.error("Error submitting form:", error);
      message.error("Failed to create expense item");
    } finally {
      setLoading(false);
    }
  };

  // Handle expense class change
  const handleExpenseClassChange = async (
    value: string,
    positionIndex: number
  ) => {
    // Update the position
    const updatedPositions = [...positions];
    updatedPositions[positionIndex].expenseGroup = value;
    updatedPositions[positionIndex].expenseType = ""; // Reset expense type
    setPositions(updatedPositions);

    // Fetch expense types if not already loaded
    if (!expenseTypes[value]) {
      await fetchExpenseTypes(value);
    }
  };

  // Handle adding a new position
  const handleAddPosition = () => {
    setPositions([
      ...positions,
      {
        id: "",
        expenseGroup: "",
        expenseType: "",
        amount: 0,
        costCenter: "",
        customField: "",
        isReimbursable: false,
      },
    ]);
  };

  // Handle removing a position
  const handleRemovePosition = (positionId: string) => {
    if (positions.length === 1) {
      message.warning("At least one position is required");
      return;
    }

    setPositions(positions.filter((position) => position.id !== positionId));
  };

  // Handle amount change
  const handleAmountChange = (value: number, positionIndex: number) => {
    const updatedPositions = [...positions];
    updatedPositions[positionIndex].amount = value;
    setPositions(updatedPositions);
  };

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
                  name={"isReimbursable"+index}
                  value={position.isReimbursable}
                  onChange={(checked) => {
                    const updatedPositions = [...positions];
                    updatedPositions[index].isReimbursable = checked.value as boolean;
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
                    name={"isReimbursable"+index}
                    value={position.isReimbursable}
                    onChange={(checked) => {
                      const updatedPositions = [...positions];
                      updatedPositions[index].isReimbursable = checked.value as boolean;
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
        <Button
          variant="ghost"
          onClick={handleAddPosition}
        >
          <PlusCircleOutlined style={{ width: '17px', height: '17px' }}/> Add Position
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

export default ExpenseItem;
