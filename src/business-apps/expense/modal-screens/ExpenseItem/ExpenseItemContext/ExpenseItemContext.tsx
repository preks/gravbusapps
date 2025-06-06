import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { Form, message } from "antd";
import {
  ExpensePosition,
  ExpenseType,
  CostCenter,
  Currency,
  ExpenseGroup,
  CustomField,
} from "../types";

import { getCurrentActiveUserLocale } from "../utils/windowUtils";
import { getCatalogValue } from "../utils/windowUtils";
import {
  fetchExpenseCatalogueData,
  fetchExpenseRuleGeneralData,
  getStructureCostCenter,
} from "../ExpenseItemQueries";
import { fetchEmployeeRule } from "../ExpenseItemQueries";
import { DEFAULT_EMPLOYEE_ID, DEFAULT_POSITION } from "./constants";
import { formatDateToDDMMYYYY } from "../utils/dateUtils";
import { transformCurrencies } from "../utils/currencyUtils";
import { createGraphQLClient } from "../services/graphqlClient";
import {
  addRequests,
  fetchCustomFields,
  fetchExpenseTypes,
  calculateTotal,
  handleAmountChange,
  handleAddPosition,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
  handleRemovePosition,
  handleSubmit,
  handleFileUpload
} from "./services";

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
            // Fetch cost center data first
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
            
            // Update positions with the selected cost center
            const updatedPositions = [...positions];
            
            // If employee position has a cost center, use it; otherwise use the first cost center from structure
            if (catalogueData?.data.EmployeePosition[0]?.costCenterId) {
              updatedPositions[0].costCenter = catalogueData.data.EmployeePosition[0].costCenterId;
            } else if (costCenterData?.data.userCostCenters && costCenterData.data.userCostCenters.length > 0) {
              updatedPositions[0].costCenter = costCenterData.data.userCostCenters[0].id;
            }
            
            setPositions(updatedPositions);
            
            // If using form, also set the form value
            if (form) {
              form.setFieldsValue({
                [`positions[0].costCenter`]: updatedPositions[0].costCenter
              });
            }

            // Sort and set currencies with priority
            if (catalogueData?.data?.currency) {
              try {
                const finalCurrencies = transformCurrencies(catalogueData.data.currency);
                setCurrencies(finalCurrencies);
              } catch (error) {
                console.error("Error transforming currencies:", error);
              }
            }
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
      addRequestsWrapper();
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

  const addRequestsWrapper = () => {
    addRequests(
      catalogueDataResponse,
      expenseRequestByCurrency,
      multiPosition,
      form,
      setExpenseRequests,
      t
    );
  };

  // Fetch expense types for a specific group ID
  const fetchExpenseTypesWrapper = async (groupId: string): Promise<ExpenseType[]> => {
    return await fetchExpenseTypes(groupId, positions, employeeRuleId, graphqlClient, setExpenseTypes, t);
  };

  // Fetch custom fields for expense types
  const fetchCustomFieldsWrapper = async (expenseTypeIds: string[]): Promise<CustomField[]> => {
    return await fetchCustomFields(expenseTypeIds, graphqlClient, setCustomFields, t);
  };

  // Calculate total amount from all positions
  const calculateTotalWrapper = (): number => {
    return calculateTotal(positions);
  };

  // Handle file upload
  const handleFileUploadWrapper = async (): Promise<any | null> => {
    return await handleFileUpload(fileList, t);
  };

  // Handle form submission
  const handleSubmitWrapper = async (): Promise<void> => {
    await handleSubmit(
      form,
      positions,
      customFields,
      employeeRuleId,
      generalDataResponse,
      multiPosition,
      setPositions,
      setFileList,
      setCurrentStep,
      setLoading,
      t
    );
  };

  // This inline function has been moved to services/eventHandlers.ts

  // This inline function has been moved to services/eventHandlers.ts

  // This inline function has been moved to services/eventHandlers.ts

  // Handle expense group change wrapper
  const handleExpenseGroupChangeWrapper = async (value: string, positionIndex: number): Promise<void> => {
    await handleExpenseGroupChange(
      value,
      positionIndex,
      positions,
      setPositions,
      expenseTypes,
      employeeRuleId,
      graphqlClient,
      setExpenseTypes,
      t
    );
  };

  // Handle expense type change wrapper
  const handleExpenseTypeChangeWrapper = async (value: string, positionIndex: number): Promise<void> => {
    await handleExpenseTypeChange(
      value,
      positionIndex,
      positions,
      setPositions,
      customFields,
      graphqlClient,
      setCustomFields,
      t
    );
  };

  // Handle adding a position wrapper
  const handleAddPositionWrapper = (): void => {
    handleAddPosition(positions, setPositions);
  };

  // Handle removing a position wrapper
  const handleRemovePositionWrapper = (positionId: string): void => {
    handleRemovePosition(positionId, positions, setPositions, t);
  };

  // Handle amount change wrapper
  const handleAmountChangeWrapper = (value: number, positionIndex: number): void => {
    handleAmountChange(value, positionIndex, positions, setPositions);
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
    calculateTotal: calculateTotalWrapper,
    handleFileUpload: handleFileUploadWrapper,
    handleSubmit: handleSubmitWrapper,
    handleExpenseGroupChange: handleExpenseGroupChangeWrapper,
    handleExpenseTypeChange: handleExpenseTypeChangeWrapper,
    handleAddPosition: handleAddPositionWrapper,
    handleRemovePosition: handleRemovePositionWrapper,
    handleAmountChange: handleAmountChangeWrapper,
    fetchExpenseTypes: fetchExpenseTypesWrapper,
    fetchCustomFields: fetchCustomFieldsWrapper,
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
