import React, { useState, useEffect } from "react";
import styles from "./ExpenseItem.module.css";
import {
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Upload,
  Switch,
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
const { Option } = Select;

const ExpenseItem: React.FC<ExpenseItemProps> = ({ accessToken, userInfo }) => {
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
  const [employeeRule,setEmployeeRuleId]= useState<string | null>(null)
  const [firstRunVariable,setFirstRunVariable]= useState<boolean>(false)
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
      const values = await form.validateFields();
      setLoading(true);

      // Upload file if exists
      const fileData = await handleFileUpload();

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
        type="link"
        onClick={() => setCurrentStep("form")}
        style={{ marginTop: "20px" }}
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
        <div className={styles.relativePosition}>
          <Form.Item
            name="title"
            rules={[{ required: true, message: "Please enter a title" }]}
            className={styles.marginBottom0}
            noStyle
          >
            <div className={styles.formFieldContainer}>
              <div className={styles.formFieldLabel}>
                Title<span className={styles.requiredAsterisk}>*</span>
              </div>
              <Input 
                placeholder="Vendor name here, it's a free text field" 
                className={styles.formFieldInput}
              />
            </div>
          </Form.Item>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ position: "relative" }}>
          <Form.Item
            name="date"
            rules={[{ required: true, message: "Please select a date" }]}
            style={{ marginBottom: 0 }}
            noStyle
          >
            <div className={styles.relativePosition}>
              <div className={styles.dateFieldContainer}>
                <div className={styles.formFieldLabel}>
                  Date<span className={styles.requiredAsterisk}>*</span>
                </div>
                <DatePicker 
                  className={styles.formFieldInput} 
                  placeholder="Select date"
                  format="DD.MM.YYYY"
                  allowClear={false}
                  suffixIcon={null}
                  mode="date"
                  onPanelChange={(value, mode) => {
                    if (mode === 'date') {
                      form.setFieldsValue({ date: value });
                    }
                  }}
                />
              </div>
              <div className={styles.calendarIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="#000000" strokeWidth="2"/>
                  <path d="M16 2V6" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 2V6" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M3 10H21" stroke="#000000" strokeWidth="2"/>
                </svg>
              </div>
            </div>
          </Form.Item>
        </div>
      </div>

      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}
      >
        <Switch
          checked={multiPosition}
          onChange={(checked) => setMultiPosition(checked)}
        />
        <span className={styles.switchLabel}>Multi Position Item</span>
      </div>

      {positions.map((position, index) => (
        <Card
          key={position.id}
          title={`Position ${index + 1}`}
          className={styles.positionCard}
          extra={
            positions.length > 1 && (
              <Button
                icon={<DeleteOutlined />}
                onClick={() => handleRemovePosition(position.id)}
                type="text"
                danger
              />
            )
          }
        >
          <div className={styles.marginBottom16}>
            <div className={styles.relativePosition}>
              <div className={styles.formFieldContainer}>
                <div className={styles.formFieldLabel}>
                  Expense Group<span className={styles.requiredAsterisk}>*</span>
                </div>
                <Select
                  placeholder="Select Expense Group"
                  value={position.expenseGroup}
                  onChange={(value) => handleExpenseClassChange(value, index)}
                  className={styles.formFieldInput}
                  bordered={false}
                  dropdownClassName={styles.dropdownStyle}
                >
                  {expenseClasses.map((group) => (
                    <Option key={group.id} value={group.id}>
                      {group.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className={styles.marginBottom16}>
            <div className={styles.relativePosition}>
              <div className={styles.formFieldContainer}>
                <div className={styles.formFieldLabel}>
                  Expense Type<span className={styles.requiredAsterisk}>*</span>
                </div>
                <Select
                  placeholder="Select Expense Type"
                  value={position.expenseType}
                  onChange={(value) => {
                    const updatedPositions = [...positions];
                    updatedPositions[index].expenseType = value;
                    setPositions(updatedPositions);
                  }}
                  className={styles.formFieldInput}
                  bordered={false}
                  dropdownClassName={styles.dropdownStyle}
                  disabled={!position.expenseGroup}
                >
                  {position.expenseGroup &&
                    expenseTypes[position.expenseGroup]?.map((type) => (
                      <Option key={type.id} value={type.id}>
                        {type.name}
                      </Option>
                    ))}
                </Select>
              </div>
            </div>
          </div>

          <div className={styles.marginBottom16}>
            <div className={styles.relativePosition}>
              <div className={styles.formFieldContainer}>
                <div className={styles.formFieldLabel}>
                  Amount<span className={styles.requiredAsterisk}>*</span>
                </div>
                <Input
                  type="number"
                  value={position.amount}
                  onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0, index)}
                  className={styles.formFieldInput}
                />
              </div>
            </div>
          </div>

          <div className={styles.marginBottom16}>
            <div className={styles.relativePosition}>
              <div className={styles.formFieldContainer}>
                <div className={styles.formFieldLabel}>
                  Cost Center<span className={styles.requiredAsterisk}>*</span>
                </div>
                <Select
                  placeholder="Select Cost Center"
                  value={position.costCenter}
                  onChange={(value) => {
                    const updatedPositions = [...positions];
                    updatedPositions[index].costCenter = value;
                    setPositions(updatedPositions);
                  }}
                  className={styles.formFieldInput}
                  bordered={false}
                  dropdownClassName={styles.dropdownStyle}
                >
                  {costCenters.map((center) => (
                    <Option key={center.id} value={center.id}>
                      {center.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className={styles.marginBottom16}>
            <div className={styles.relativePosition}>
              <div className={styles.formFieldContainer}>
                <div className={styles.formFieldLabel}>
                  Expense Type Custom Field
                </div>
                <Select
                  placeholder="Select Custom Field Value"
                  value={position.customField}
                  onChange={(value) => {
                    const updatedPositions = [...positions];
                    updatedPositions[index].customField = value;
                    setPositions(updatedPositions);
                  }}
                  className={styles.formFieldInput}
                  bordered={false}
                  dropdownClassName={styles.dropdownStyle}
                  allowClear
                >
                  <Option value="option1">Option 1</Option>
                  <Option value="option2">Option 2</Option>
                  <Option value="option3">Option 3</Option>
                </Select>
              </div>
            </div>
          </div>

          {multiPosition && index > 0 && (
            <Form.Item>
              <div className={styles.switchContainer}>
                <Switch
                  checked={position.isReimbursable}
                  onChange={(checked) => {
                    const updatedPositions = [...positions];
                    updatedPositions[index].isReimbursable = checked;
                    setPositions(updatedPositions);
                  }}
                />
                <span className={styles.switchLabel}>Is reimbursable</span>
              </div>
            </Form.Item>
          )}
        </Card>
      ))}

      {multiPosition && (
        <Button
          type="dashed"
          onClick={handleAddPosition}
          block
          icon={<PlusOutlined />}
          className={styles.marginBottom16}
        >
          Add Position
        </Button>
      )}

      <Row gutter={16} className={styles.marginTop16}>
        <Col span={12}>
          <Form.Item noStyle className={styles.marginBottom0}>
            <div className={styles.formFieldContainer}>
              <div className={styles.formFieldLabel}>
                Amount
              </div>
              <Input
                value={calculateTotal().toFixed(2)}
                disabled
                className={styles.formFieldInput}
              />
            </div>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="currency"
            rules={[{ required: true, message: "Please select a currency" }]}
            className={styles.marginBottom0}
            noStyle
          >
            <div className={styles.formFieldContainer}>
              <div className={styles.formFieldLabel}>
                Currency<span className={styles.requiredAsterisk}>*</span>
              </div>
              <Select
                placeholder="Select Currency"
                className={styles.formFieldInput}
                bordered={false}
                dropdownStyle={{ borderRadius: 0 }}
              >
                {currencies.map((currency) => (
                  <Option key={currency.id} value={currency.id}>
                    {currency.code}
                  </Option>
                ))}
              </Select>
            </div>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item 
        name="expenseRequestId" 
        className={`${styles.marginBottom16} ${styles.marginTop16}`}
        noStyle
      >
        <div className={styles.formFieldContainer}>
          <div className={styles.formFieldLabel}>
            Add to Expense Request
          </div>
          <Select 
            placeholder="None" 
            allowClear 
            className={styles.formFieldInput}
            bordered={false}
            dropdownStyle={{ borderRadius: 0 }}
          >
            <Option value="none">None</Option>
            {expenseRequests.map((request) => (
              <Option key={request.id} value={request.id}>
                {request.title || request.code}
              </Option>
            ))}
          </Select>
        </div>
      </Form.Item>

      <Form.Item>
        <Button type="primary" onClick={handleSubmit} loading={loading} block>
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
            icon={<ArrowLeftOutlined />}
            type="text"
            onClick={() => setCurrentStep("start")}
          />
        )}
        <Title level={4} className={styles.headerTitle}>
          New Expense Item
        </Title>
        <Button icon={<CloseOutlined />} type="text" />
      </div>
      <Divider className={styles.headerDivider} />

      {currentStep === "start" ? renderStartScreen() : renderFormScreen()}
    </div>
  );
};

export default ExpenseItem;
