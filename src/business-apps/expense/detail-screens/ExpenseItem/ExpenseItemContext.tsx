import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "antd";
import { message } from "antd";
import {
  ExpensePosition,
  ExpenseType,
  CostCenter,
  Currency,
  ExpenseGroup,
} from "./types";
import {
  GET_EXPENSE_TYPES,
  fetchEmployeeRule,
  fetchExpenseCatalogueData,
  fetchExpenseRuleGeneralData,
} from "./ExpenseItemQueries";

// Default employee ID in case userInfo is undefined
const DEFAULT_EMPLOYEE_ID = "86a8317d-34ef-4e04-951b-b0bb9754dea0";

interface ExpenseItemContextProps {
  // Form and UI states
  form: any;
  currentStep: "start" | "form";
  setCurrentStep: (step: "start" | "form") => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  fileList: any[];
  setFileList: (files: any[]) => void;
  multiPosition: boolean;
  setMultiPosition: (isMulti: boolean) => void;
  
  // Data states
  positions: ExpensePosition[];
  setPositions: (positions: ExpensePosition[]) => void;
  expenseClasses: ExpenseGroup[];
  expenseTypes: { [classId: string]: ExpenseType[] };
  costCenters: CostCenter[];
  currencies: Currency[];
  expenseRequests: any[];
  
  // Employee and rule states
  employeeRuleId: string | null;
  
  // Actions
  calculateTotal: () => number;
  handleFileUpload: () => Promise<any | null>;
  handleSubmit: () => Promise<void>;
  handleExpenseClassChange: (value: string, positionIndex: number) => Promise<void>;
  handleAddPosition: () => void;
  handleRemovePosition: (positionId: string) => void;
  handleAmountChange: (value: number, positionIndex: number) => void;
  fetchExpenseTypes: (classId: string) => Promise<ExpenseType[]>;
}

interface ExpenseItemProviderProps {
  children: ReactNode;
  accessToken: string;
  userInfo?: any;
  additionalData?: { [k: string]: any };
}

// Create the context
export const ExpenseItemContext = createContext<ExpenseItemContextProps | undefined>(undefined);

// Create the provider component
export const ExpenseItemProvider: React.FC<ExpenseItemProviderProps> = ({ 
  children, 
  accessToken, 
  userInfo,
  additionalData
}) => {
  const { t } = useTranslation();
  // Form and UI states
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState<"start" | "form">("start");
  const [loading, setLoading] = useState<boolean>(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [multiPosition, setMultiPosition] = useState<boolean>(false);
  // Data states
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
  const [expenseClasses, setExpenseClasses] = useState<ExpenseGroup[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<{
    [classId: string]: ExpenseType[];
  }>({});
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<any[]>([]);
  
  // Employee and rule states
  const [employeeRuleId, setEmployeeRuleId] = useState<string | null>(null);
  const [firstRunVariable, setFirstRunVariable] = useState<boolean>(false);
  const [rerunRule, setRerunRule] = useState<boolean>(false);

  // GraphQL client
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

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch employee rule
        const currentDate = new Date().toISOString();
        const employeeIdValue =
          userInfo?.employeeDetails?.employeeId || DEFAULT_EMPLOYEE_ID;

        const employeeRuleData = await fetchEmployeeRule(
          employeeIdValue,
          currentDate,
          accessToken
        );

        if (employeeRuleData) {
          setEmployeeRuleId(employeeRuleData.expenseRuleId);
        }
        
        if (rerunRule === true) {
          await graphqlClient.query({
            query: fetchExpenseRuleGeneralData,
            variables: {
              expenseRuleId: employeeRuleId,
              activeUserLocale: "en-US",
              objectFilter: { useInExpense: true },
            },
          });
        } else {
          if (firstRunVariable === false) {
            const generalDataResponse = await graphqlClient.query({
              query: fetchExpenseRuleGeneralData,
              variables: {
                expenseRuleId: employeeRuleId,
                activeUserLocale: "en-US",
                objectFilter: { useInExpense: true },
              },
            });
            
            const catalogueDataResponse = await graphqlClient.query({
              query: fetchExpenseCatalogueData,
              variables: {
                employeeId: employeeIdValue,
                expenseRuleId: employeeRuleId,
                activeUserLocale: "en-US",
                objectFilter: { useInExpense: true },
              },
            });
            
            // Process and set data from responses
            if (generalDataResponse?.data) {
              // Set expense classes from the response
              const classes = generalDataResponse.data.ExpenseGroups || [];
              setExpenseClasses(classes.map((group: any) => ({
                id: group.id,
                name: group.name,
                code: group.code
              })));
            }
            
            if (catalogueDataResponse?.data) {
              // Set cost centers from the response
              const centers = catalogueDataResponse.data.CostCenters || [];
              setCostCenters(centers.map((center: any) => ({
                id: center.id,
                name: center.name
              })));
              
              // Set currencies from the response
              const currencyList = catalogueDataResponse.data.Currencies || [];
              setCurrencies(currencyList.map((currency: any) => ({
                id: currency.id,
                code: currency.code,
                name: currency.name
              })));
              
              // Set expense requests
              const requests = catalogueDataResponse.data.ExpenseRequests || [];
              setExpenseRequests(requests);
            }
            
            // Update firstRunVariable to prevent duplicate fetches
            setFirstRunVariable(true);
          } else {
            await graphqlClient.query({
              query: fetchExpenseRuleGeneralData,
              variables: {
                expenseRuleId: employeeRuleId,
                activeUserLocale: "en-US",
                objectFilter: { useInExpense: true },
              },
            });
          }
          setRerunRule(false);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        message.error("Failed to load expense data");
      }
    };

    fetchInitialData();
  }, [graphqlClient, accessToken, userInfo, employeeRuleId, firstRunVariable, rerunRule]);

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
      // File upload logic would go here
      return null;
    } catch (error) {
      console.error("Error uploading file:", error);
      message.error("Failed to upload receipt");
      return null;
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validate form fields
      await form.validateFields();
      
      // Get form values
      const values = form.getFieldsValue();
      
      // Upload file if present
      let fileId = null;
      if (fileList.length > 0) {
        fileId = await handleFileUpload();
      }
      
      // Prepare data for submission
      const submitData = {
        ...values,
        positions,
        fileId,
      };
      
      console.log('Submitting data:', submitData);
      
      // Here you would typically make an API call to submit the data
      // For now, we'll just show a success message
      message.success(t('expense_item.success_message', 'Expense item created successfully!'));
      
      // Reset form and state
      form.resetFields();
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
      setFileList([]);
      setCurrentStep("start");
    } catch (error) {
      console.error('Submit error:', error);
      message.error(t('expense_item.error_message', 'Failed to create expense item. Please try again.'));
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

  // Context value
  const contextValue: ExpenseItemContextProps = {
    form,
    currentStep,
    setCurrentStep,
    loading,
    setLoading,
    fileList,
    setFileList,
    multiPosition,
    setMultiPosition,
    positions,
    setPositions,
    expenseClasses,
    expenseTypes,
    costCenters,
    currencies,
    expenseRequests,
    employeeRuleId,
    calculateTotal,
    handleFileUpload,
    handleSubmit,
    handleExpenseClassChange,
    handleAddPosition,
    handleRemovePosition,
    handleAmountChange,
    fetchExpenseTypes,
  };

  return (
    <ExpenseItemContext.Provider value={contextValue}>
      {children}
    </ExpenseItemContext.Provider>
  );
};

// Custom hook for using the context
export const useExpenseItem = () => {
  const context = useContext(ExpenseItemContext);
  if (context === undefined) {
    throw new Error("useExpenseItem must be used within an ExpenseItemProvider");
  }
  return context;
};
