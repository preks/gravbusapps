import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { Form } from "antd";
import { message } from "antd";
import {
  ExpensePosition,
  ExpenseType,
  CostCenter,
  Currency,
  ExpenseGroup,
  CustomField,
} from "../types";

import {
  getCurrentActiveUserLocale,
  getCatalogValue
} from "../utils/windowUtils";
import {
  getNewTypes,
  getCustomFields,
  fetchEmployeeRule,
  fetchExpenseCatalogueData,
  fetchExpenseRuleGeneralData,
  getStructureCostCenter,
} from "../ExpenseItemQueries";
import { DEFAULT_EMPLOYEE_ID, DEFAULT_EXPENSE_SOURCE, DEFAULT_EXPENSE_STATUS, DEFAULT_POSITION } from "./constants";
import { createGraphQLClient } from "../services/graphqlClient";
import { transformCurrencies } from "../utils/currencyUtils";
import { formatDateToISOString, formatDateToDDMMYYYY } from "../utils/dateUtils";
import { prepareExpenseRequestsList } from "../utils/expenseRequestUtils";
import { calculateTotalAmount } from "../utils/calculationUtils";


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
  expenseGroups: ExpenseGroup[];
  expenseTypes: { [classId: string]: ExpenseType[] };
  customFields: { [expenseTypeId: string]: CustomField[] };
  costCenters: CostCenter[];
  currencies: Currency[];
  expenseRequests: any[];

  // Employee and rule states
  employeeRuleId: string | null | object;

  // Actions
  calculateTotal: () => number;
  handleFileUpload: () => Promise<any | null>;
  handleSubmit: () => Promise<void>;
  handleExpenseGroupChange: (
    value: string,
    positionIndex: number
  ) => Promise<void>;
  handleExpenseTypeChange: (
    value: string,
    positionIndex: number
  ) => Promise<void>;
  handleAddPosition: () => void;
  handleRemovePosition: (positionId: string) => void;
  handleAmountChange: (value: number, positionIndex: number) => void;
  fetchExpenseTypes: (classId: string) => Promise<ExpenseType[]>;
  fetchCustomFields: (expenseTypeIds: string[]) => Promise<CustomField[]>;
}

interface ExpenseItemProviderProps {
  children: ReactNode;
  accessToken: string;
  userInfo?: any;
  additionalData?: { [k: string]: any };
}

// Create the context
export const ExpenseItemContext = createContext<
  ExpenseItemContextProps | undefined
>(undefined);

// Create the provider component
export const ExpenseItemProvider: React.FC<ExpenseItemProviderProps> = ({
  children,
  accessToken,
  userInfo,
  additionalData,
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
    DEFAULT_POSITION,
  ]);
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<{
    [classId: string]: ExpenseType[];
  }>({});
  const [customFields, setCustomFields] = useState<{
    [expenseTypeId: string]: CustomField[];
  }>({});
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<any[]>([]);

  // Employee and rule states
  const [employeeRuleId, setEmployeeRuleId] = useState<string | null | object>(
    null
  );
  const [firstRunVariable, setFirstRunVariable] = useState<boolean>(false);
  const [rerunRule, setRerunRule] = useState<boolean>(false);

  // API response states
  const [generalDataResponse, setGeneralDataResponse] = useState<any>(null);
  const [catalogueDataResponse, setCatalogueDataResponse] = useState<any>(null);
  const [structureCostCenter, setStructureCostCenter] = useState<any>(null);
  const [expenseRequestByCurrency, setExpenseRequestByCurrency] =
    useState<any>(null);

  // GraphQL client - using useMemo to prevent recreation on every render
  const graphqlClient = useMemo(
    () => createGraphQLClient(accessToken),
    [accessToken]
  );

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch employee rule
        const currentDate = new Date().toISOString();
        const employeeIdValue =
          additionalData?.mdi_employeeId ||
          (additionalData?.psi_taskPayload &&
            additionalData.psi_taskPayload.initialParameters
              .employeeId) ||
          "" ||
          userInfo?.employeeDetails?.employeeId ||
          DEFAULT_EMPLOYEE_ID;

        const employeeRuleData = await fetchEmployeeRule(
          employeeIdValue,
          currentDate,
          accessToken
        );

        if (employeeRuleData) {
          setEmployeeRuleId(employeeRuleData.expenseRuleId);
        }

        const generalData = await graphqlClient.query({
          query: fetchExpenseRuleGeneralData,
          variables: {
            expenseRuleId: employeeRuleId,
            activeUserLocale: getCurrentActiveUserLocale(),
            objectFilter: { useInExpense: true },
          },
        });
        setGeneralDataResponse(generalData);
        if (rerunRule === false) {
          const catalogueData = await graphqlClient.query({
            query: fetchExpenseCatalogueData,
            variables: {
              employeeId: employeeIdValue,
              expenseRuleId: employeeRuleId,
              activeUserLocale: getCurrentActiveUserLocale(),
              objectFilter: { useInExpense: true },
            },
          });
          setCatalogueDataResponse(catalogueData);
          if (firstRunVariable === false) {
            if (catalogueData?.data.EmployeePosition[0]?.costCenterId) {
              const updatedPositions = [...positions];
              updatedPositions[0].costCenter =
                catalogueData?.data.EmployeePosition[0]?.costCenterId;
              setPositions(updatedPositions);
            }
            const costCenterData = await graphqlClient.query({
              query: getStructureCostCenter,
              variables: {
                structureId:
                  (catalogueData?.data.EmployeePosition[0] &&
                    catalogueData?.data.EmployeePosition[0].structureId) ||
                  "",
              },
            });
            setStructureCostCenter(costCenterData);
            setCostCenters(costCenterData?.data.userCostCenters || []);

            // Sort and set currencies with priority
            if (catalogueData?.data?.currency) {
              try {
                const finalCurrencies = transformCurrencies(catalogueData.data.currency);
                console.log(finalCurrencies,"currencies")
                setCurrencies(finalCurrencies);
              } catch (error) {
                console.error("Error transforming currencies:", error);
              }
            }

            // addRequests is now called right after setCatalogueDataResponse
            // changeDisplayedColumn.run(); most likely not needed anymore
            setFirstRunVariable(true);

            // if (additionalData &&
            //   additionalData.psi_taskPayload?.initialParameters?.expenseId
            // ) {
            //   await graphqlClient.query({
            //     query: fetchExpenseData,
            //     variables: {
            //       expenseId:
            //         (additionalData.psi_taskPayload &&
            //           additionalData.psi_taskPayload.initialParameters &&
            //           additionalData.psi_taskPayload.initialParameters
            //         (additionalData.psi_taskPayload &&
            //           additionalData.psi_taskPayload.expenseRequest &&
            //           additionalData.psi_taskPayload.expenseRequest.id),
            //           activeUserLocale: getCurrentActiveUserLocale(),
            //     },
            //   });
            // }
          }
        }
        setRerunRule(false);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        message.error("Failed to load expense data");
      }
    };
    fetchInitialData();
  }, [
    // graphqlClient is now memoized with accessToken as dependency
    // so we don't need it in this dependency array
    accessToken,
    userInfo,
    employeeRuleId,
    firstRunVariable,
    rerunRule,
  ]);

  useEffect(() => {
    const uniqueExpenseGroupRefs = [
      ...new Set(
        typeof employeeRuleId === "object" ||
        !generalDataResponse ||
        !catalogueDataResponse
          ? []
          : generalDataResponse.data.ExpenseRuleGeneralExpense.map(
              (item: any) => item.expenseGroupRef
            )
      ),
    ];

    const matchingItems = catalogueDataResponse
      ? catalogueDataResponse.data.expenseGroup.filter((item: any) =>
          uniqueExpenseGroupRefs.includes(item.id)
        )
      : [];
    setExpenseGroups(matchingItems);
  }, [generalDataResponse, catalogueDataResponse]);

  // Call addRequests whenever catalogueDataResponse changes
  useEffect(() => {
    if (catalogueDataResponse) {
      addRequests();
    }
  }, [catalogueDataResponse]);

  // This variable is used for future AI-based expense type suggestions
  // Currently not actively used but kept for future implementation
  const aiGroupsAndTypes = useMemo(() => {
    // Format today's date for logging/debugging purposes
    const today = formatDateToDDMMYYYY(new Date().toISOString());
    console.debug(`Loading expense types data on ${today}`);
    
    return typeof employeeRuleId === "object"
      ? []
      : generalDataResponse?.data.ExpenseRuleGeneralExpense.map(
          (item: any) => ({
            expenseCode: item.code,
            expenseLabel: item.name,
            expenseGroupCode: item.expenseGroup.code,
            expenseGroupLabel: getCatalogValue(item.expenseGroup),
          })
        );
  }, [generalDataResponse, employeeRuleId]);

  const addRequests = () => {
    if (catalogueDataResponse?.data.ExpenseRequest) {
      let itemsWithCurrency = [];
      if (expenseRequestByCurrency && expenseRequestByCurrency.data) {
        if (multiPosition === true && form.getFieldValue("currency")) {
          itemsWithCurrency = expenseRequestByCurrency.data.ExpenseRequest;
        } else if (multiPosition === false && form.getFieldValue("currency")) {
          itemsWithCurrency = expenseRequestByCurrency.data.ExpenseRequest;
        }
      }

      const allExpenseRequests = [
        ...itemsWithCurrency,
        ...catalogueDataResponse?.data.ExpenseRequest,
      ];
      
      const formattedRequests = prepareExpenseRequestsList(
        allExpenseRequests,
        t("create_expense_type_item.none", "None")
      );
      
      setExpenseRequests(formattedRequests);
    }
  };

  const fetchExpenseTypes = async (groupId: string) => {
    try {
      // Check if employeeRuleId is valid
      if (typeof employeeRuleId === "object" || !employeeRuleId) {
        console.error("Invalid employeeRuleId for fetching expense types");
        return [];
      }

      // Get all current expense group IDs from the positions
      const expenseGroupIds = positions
        .map((position) => position.expenseGroup)
        .filter((id) => id && id.length > 0);

      // Add the current groupId if it's not already in the list
      if (groupId && !expenseGroupIds.includes(groupId)) {
        expenseGroupIds.push(groupId);
      }

      // If there are no expense groups selected, return empty array
      if (expenseGroupIds.length === 0) {
        return [];
      }

      const response = await graphqlClient.query({
        query: getNewTypes,
        variables: {
          expenseRuleId: employeeRuleId,
          objectFilter: { useInExpense: true },
          expenseGroupId: expenseGroupIds, // Pass array of all expense group IDs
        },
      });


      // Check if response has the expected structure
      if (!response?.data?.ExpenseRuleGeneralExpense) {
        console.error("Invalid response structure for expense types");
        return [];
      }

      // Map the response to the expected format
      const expenseTypesList = response.data.ExpenseRuleGeneralExpense.map(
        (item: any) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          classId: item.expenseGroupRef,
          reimbursable: item.reimbursable,
        })
      );

      // Group expense types by their classId (expenseGroupRef)
      const expenseTypesByGroup = expenseTypesList.reduce(
        (acc: { [key: string]: ExpenseType[] }, item: ExpenseType) => {
          if (!acc[item.classId]) {
            acc[item.classId] = [];
          }
          acc[item.classId].push(item);
          return acc;
        },
        {}
      );

      // Update the state with all expense types organized by group
      setExpenseTypes(expenseTypesByGroup);

      return expenseTypesList;
    } catch (error) {
      console.error("Error fetching expense types:", error);
      message.error(
        t("expense_item.error_message", "Failed to load expense types")
      );
      return [];
    }
  };

  const fetchCustomFields = async (expenseTypeIds: string[]) => {
    try {
      // If no expense type IDs provided, return empty array
      if (!expenseTypeIds || expenseTypeIds.length === 0) {
        return [];
      }

      const response = await graphqlClient.query({
        query: getCustomFields,
        variables: {
          expenseRuleGeneralId: expenseTypeIds,
        },
      });


      // Check if response has the expected structure
      if (!response?.data?.ExpenseRuleOtherInfo) {
        console.error("Invalid response structure for custom fields");
        return [];
      }

      // Map the response to the expected format
      const customFieldsList = response.data.ExpenseRuleOtherInfo.map(
        (item: any) => ({
          id: item.id,
          infoValue: item.infoValue,
          mandatory: item.mandatory,
          source: item.source,
          expenseRuleGeneralExpenseId: item.expenseRuleGeneralExpenseId,
          expenseGroupRef: item.expenseRuleGeneralExpense?.expenseGroupRef,
        })
      );

      // Group custom fields by their expenseRuleGeneralExpenseId
      const customFieldsByType = customFieldsList.reduce(
        (acc: { [key: string]: CustomField[] }, item: CustomField) => {
          if (!acc[item.expenseRuleGeneralExpenseId]) {
            acc[item.expenseRuleGeneralExpenseId] = [];
          }
          acc[item.expenseRuleGeneralExpenseId].push(item);
          return acc;
        },
        {}
      );

      // Update the state with all custom fields organized by expense type ID
      setCustomFields((prev) => ({
        ...prev,
        ...customFieldsByType,
      }));

      return customFieldsList;
    } catch (error) {
      console.error("Error fetching custom fields:", error);
      message.error(
        t("expense_item.error_message", "Failed to load custom fields")
      );
      return [];
    }
  };

  // Calculate total amount from all positions
  const calculateTotal = () => {
    return calculateTotalAmount(positions);
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

      // Format the expense positions with custom fields
      const formattedPositions = positions.map((position, index) => {
        // Prepare custom fields array if a custom field exists
        const customFieldsArray = [];
        if (
          position.expenseType &&
          customFields[position.expenseType] &&
          position.customField
        ) {
          const customFieldData = customFields[position.expenseType][0];
          if (customFieldData) {
            customFieldsArray.push({
              id: customFieldData.id,
              infoValue: customFieldData.infoValue,
              mandatory: customFieldData.mandatory || false,
              value: position.customField,
            });
          }
        }

        return {
          expenseGroupRef: position.expenseGroup,
          expenseTypeRef: position.expenseType,
          totalAmount: position.amount || 0,
          positionOrder: index,
          expenseRuleGeneralExpense: position.expenseType,
          costCenter: position.costCenter,
          reimbursable: position.isReimbursable,
          additionalProperties: {
            customFields: customFieldsArray,
          },
          source: DEFAULT_EXPENSE_SOURCE,
          expenseRule: employeeRuleId as string,
        };
      });

      // Prepare data for submission in the required format
      const submitData = {
        expenseItem: {
          title: values.title,
          expenseDate: values.date
            ? formatDateToISOString(values.date)
            : formatDateToISOString(new Date()),
          totalAmount: calculateTotal(),
          source: DEFAULT_EXPENSE_SOURCE,
          currencyRef: values.currency || "EUR",
          costCenter: positions[0]?.costCenter || "",
          reimbursable: positions[0]?.isReimbursable || false,
          expenseClassRef: "ExpenseClass:v1:EXPENSE",
          status: DEFAULT_EXPENSE_STATUS,
          multiplePositions: multiPosition,
          expenseRequest: values.expenseRequest || "",
          employee: generalDataResponse?.data?.Employee?.[0]?.id || "",
          expenseRule: employeeRuleId as string,
        },
        event: "pse_submit",
        expensePositions: {
          expensePositions: formattedPositions,
        },
        expenseItemFiles: {
          expenseFiles: [],
        },
      };

      console.log("Submitting data:", submitData);

      // Here you would typically make an API call to submit the data
      // For now, we'll just show a success message
      message.success(
        t("expense_item.success_message", "Expense item created successfully!")
      );

      // Reset form and state
      form.resetFields();
      setPositions([
        DEFAULT_POSITION,
      ]);
      setFileList([]);
      setCurrentStep("start");
    } catch (error) {
      console.error("Submit error:", error);
      message.error(
        t(
          "expense_item.error_message",
          "Failed to create expense item. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle expense group change
  const handleExpenseGroupChange = async (
    value: string,
    positionIndex: number
  ) => {
    try {
      // Update the position with the new expense group and reset its expense type
      const updatedPositions = [...positions];
      updatedPositions[positionIndex].expenseGroup = value;
      updatedPositions[positionIndex].expenseType = ""; // Reset expense type for this position only
      updatedPositions[positionIndex].customField = ""; // Reset custom field for this position
      setPositions(updatedPositions);

      // Check if we already have expense types for this group
      const hasExpenseTypesForGroup = Object.keys(expenseTypes).includes(value);

      // If we don't have expense types for this group or we want to refresh them,
      // fetch all expense types for all selected groups
      if (!hasExpenseTypesForGroup) {
        await fetchExpenseTypes(value);
      }
    } catch (error) {
      console.error("Error handling expense group change:", error);
      message.error(
        t(
          "expense_item.error_message",
          "Failed to update expense types. Please try again."
        )
      );
    }
  };

  // Handle expense type change
  const handleExpenseTypeChange = async (
    value: string,
    positionIndex: number
  ) => {
    try {
      // Update the position with the new expense type and reset its custom field
      const updatedPositions = [...positions];
      updatedPositions[positionIndex].expenseType = value;
      updatedPositions[positionIndex].customField = ""; // Reset custom field when expense type changes
      setPositions(updatedPositions);

      // Check if we already have custom fields for this expense type
      const hasCustomFieldsForType = Object.keys(customFields).includes(value);

      // If we don't have custom fields for this type or we want to refresh them,
      // fetch custom fields for all selected expense types
      if (!hasCustomFieldsForType && value) {
        // Get all current expense type IDs from the positions
        const expenseTypeIds = positions
          .map((position) => position.expenseType)
          .filter((id) => id && id.length > 0);

        // Add the current type ID if it's not already in the list
        if (!expenseTypeIds.includes(value)) {
          expenseTypeIds.push(value);
        }

        await fetchCustomFields(expenseTypeIds);
      }
    } catch (error) {
      console.error("Error handling expense type change:", error);
      message.error(
        t(
          "expense_item.error_message",
          "Failed to update custom fields. Please try again."
        )
      );
    }
  };

  // Handle adding a new position
  const handleAddPosition = () => {
    setPositions([
      ...positions,
      DEFAULT_POSITION,
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
    expenseGroups,
    expenseTypes,
    customFields,
    costCenters,
    currencies,
    expenseRequests,
    employeeRuleId,
    calculateTotal,
    handleFileUpload,
    handleSubmit,
    handleExpenseGroupChange,
    handleExpenseTypeChange,
    handleAddPosition,
    handleRemovePosition,
    handleAmountChange,
    fetchExpenseTypes,
    fetchCustomFields,
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
    throw new Error(
      "useExpenseItem must be used within an ExpenseItemProvider"
    );
  }
  return context;
};
