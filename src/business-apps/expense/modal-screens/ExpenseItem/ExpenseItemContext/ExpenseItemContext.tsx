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
  isProcessingFiles: boolean;
  setIsProcessingFiles: (isProcessing: boolean) => void;
  isFormDisabled: boolean;
  setIsFormDisabled: (isDisabled: boolean) => void;
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
  handleFileUpload: (files: File[]) => Promise<any | null>;
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
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);
  const [isFormDisabled, setIsFormDisabled] = useState<boolean>(false);
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
  // These states are reserved for future implementation
  const [, setStructureCostCenter] = useState<any>(null);
  const [, setExpenseRequestByCurrency] = useState<any>(null);

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
      console.log("expenseRequests",expenseRequests)
      form.setFieldsValue({ expenseRequestId: "0" });
    }
  }, [catalogueDataResponse]);

  // This variable is used for future AI-based expense type suggestions
  // Currently not actively used but kept for future implementation
  const aiGroupsAndTypes = useMemo(() => {
    // Format today's date for logging/debugging purposes
    const today = formatDateToDDMMYYYY(new Date().toISOString());
    console.debug(`Loading expense types data on ${today}`);
    
    if (typeof employeeRuleId === "object" || !generalDataResponse?.data.ExpenseRuleGeneralExpense) {
      return [];
    }
    
    // Create a map to track unique labels
    const uniqueLabels = new Map<string, boolean>();
    
    // Define the type for expense items
    type ExpenseAIItem = {
      expenseCode: string;
      expenseLabel: string;
      expenseGroupCode: string;
      expenseGroupLabel: string;
    };
    
    const result: ExpenseAIItem[] = [];
    
    // Process each expense type and ensure unique labels
    generalDataResponse.data.ExpenseRuleGeneralExpense.forEach((item: any) => {
      let expenseLabel = item.name;
      
      // If this label already exists, make it unique by appending the code
      if (uniqueLabels.has(expenseLabel.toLowerCase())) {
        expenseLabel = `${item.name} (${item.code})`;
      }
      
      // If still not unique, add the group code as well
      if (uniqueLabels.has(expenseLabel.toLowerCase())) {
        expenseLabel = `${item.name} (${item.code}-${item.expenseGroup.code})`;
      }
      
      // Add to unique labels map
      uniqueLabels.set(expenseLabel.toLowerCase(), true);
      
      // Add to result array
      result.push({
        expenseCode: item.code,
        expenseLabel: expenseLabel,
        expenseGroupCode: item.expenseGroup.code,
        expenseGroupLabel: getCatalogValue(item.expenseGroup),
      });
    });
    
    return result;
  }, [generalDataResponse, employeeRuleId]);

  const addRequestsWrapper = () => {
    addRequests(
      catalogueDataResponse,
      null, // expenseRequestByCurrency is no longer used, passing null instead
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

  // Process receipt data and populate form fields
  const setByReceipts = (receiptData: any): void => {
    if (!receiptData || !receiptData.data) {
      console.debug('No receipt data to process');
      return;
    }
    
    try {
      const data = receiptData.data;
      console.debug('Processing receipt data:', data);
      
      // Check if currency from receipt matches the request currency (if additionalData exists)
      if (additionalData?.currencyData) {
        const requestCurrency = currencies.find(c => c.id === additionalData.currencyData);
        if (requestCurrency && requestCurrency.code !== data.currencyCode) {
          message.error(t("expense_item.currency_mismatch", "The Receipt could not be added as it does not match the request currency"));
          return;
        }
      }
      
      // Set title if available
      if (data.vendor?.name) {
        form.setFieldsValue({ title: data.vendor.name });
      }
      
      // Set date if available
      if (data.invoiceDate) {
        try {
          // Handle different date formats
          let dateValue;
          
          // Check if the date is already a valid date string
          if (typeof data.invoiceDate === 'string') {
            // Try to parse the date string
            if (data.invoiceDate.includes('T')) {
              // ISO format with time
              dateValue = new Date(data.invoiceDate);
            } else {
              // Simple date format (YYYY-MM-DD)
              const [year, month, day] = data.invoiceDate.split('-').map(Number);
              dateValue = new Date(year, month - 1, day); // month is 0-indexed in JS Date
            }
          } else {
            // If it's already a date object or timestamp
            dateValue = new Date(data.invoiceDate);
          }
          
          // Validate the date is valid before setting it
          if (!isNaN(dateValue.getTime())) {
            console.debug(`Setting date value: ${dateValue}`);
            form.setFieldsValue({ date: dateValue });
          } else {
            console.error(`Invalid date format: ${data.invoiceDate}`);
          }
        } catch (error) {
          console.error(`Error parsing date ${data.invoiceDate}:`, error);
        }
      }
      
      // Set currency if available
      if (data.currencyCode) {
        const currencyId = currencies.find(c => c.code === data.currencyCode)?.id;
        if (currencyId) {
          form.setFieldsValue({ currency: currencyId });
        }
      }
      
      // Handle positions based on items in receipt
      if (data.items && data.items.length > 0) {
        // Create new positions array
        const newPositions: ExpensePosition[] = [];
        
        // Get the cost center from the first position (if exists)
        const costCenterId = positions[0]?.costCenter || '';
        
        // Process each item in the receipt
        data.items.forEach((item: any, index: number) => {
          // Create a new position
          const newPosition: ExpensePosition = {
            id: `position-${Date.now()}-${index}`,
            expenseGroup: '',
            expenseType: '',
            amount: item.totalPrice || 0,
            costCenter: costCenterId,
            isReimbursable: true,
            customField: ''
          };
          
          // Map expense group and type if available in the receipt item
          if (item.expenseDetails) {
            // Find matching expense group by code
            if (item.expenseDetails.expenseGroupCode) {
              const matchingGroup = expenseGroups.find(
                group => group.code === item.expenseDetails.expenseGroupCode
              );
              
              if (matchingGroup) {
                newPosition.expenseGroup = matchingGroup.id;
                console.debug(`Mapped expense group code ${item.expenseDetails.expenseGroupCode} to ID ${matchingGroup.id}`);
                
                // After setting the group, find the matching expense type
                if (item.expenseDetails.expenseCode && expenseTypes[matchingGroup.id]) {
                  const matchingType = expenseTypes[matchingGroup.id].find(
                    type => type.code === item.expenseDetails.expenseCode
                  );
                  
                  if (matchingType) {
                    newPosition.expenseType = matchingType.id;
                    console.debug(`Mapped expense type code ${item.expenseDetails.expenseCode} to ID ${matchingType.id}`);
                  } else {
                    // If we can't find the type in the loaded types, try to fetch it
                    console.debug(`Expense type with code ${item.expenseDetails.expenseCode} not found in loaded types, will try to fetch`);
                    // We'll handle this in a separate effect after positions are set
                  }
                }
              } else {
                console.debug(`Expense group with code ${item.expenseDetails.expenseGroupCode} not found`);
              }
            }
          }
          
          // If we still don't have a group/type match from the system, try to match using aiGroupsAndTypes
          if (!newPosition.expenseGroup && item.expenseDetails?.expenseGroupCode) {
            const aiMatch = aiGroupsAndTypes.find(
              ai => ai.expenseGroupCode === item.expenseDetails.expenseGroupCode && 
                   ai.expenseCode === item.expenseDetails.expenseCode
            );
            
            if (aiMatch) {
              console.debug(`Found AI match for group ${aiMatch.expenseGroupCode} and type ${aiMatch.expenseCode}`);
              // Now we need to find the actual IDs from our loaded data
              const matchingGroup = expenseGroups.find(
                group => group.code === aiMatch.expenseGroupCode
              );
              
              if (matchingGroup) {
                newPosition.expenseGroup = matchingGroup.id;
                // We'll need to fetch expense types for this group if not already loaded
              }
            }
          }
          
          newPositions.push(newPosition);
        });
        
        // Update positions state
        setPositions(newPositions);
        
        // Set multiPosition mode if there are multiple items
        if (newPositions.length > 1) {
          setMultiPosition(true);
        } else {
          setMultiPosition(false);
        }
        
        // For each position with a group but no type, fetch the types
        newPositions.forEach(async (position, index) => {
          if (position.expenseGroup && !position.expenseType) {
            try {
              const types = await fetchExpenseTypesWrapper(position.expenseGroup);
              
              // Now try to find the matching type by code
              if (data.items[index]?.expenseDetails?.expenseCode) {
                const matchingType = types.find(
                  type => type.code === data.items[index].expenseDetails.expenseCode
                );
                
                if (matchingType) {
                  // Update the position with the found type
                  const updatedPositions = [...newPositions];
                  updatedPositions[index].expenseType = matchingType.id;
                  setPositions(updatedPositions);
                  console.debug(`Updated position ${index} with expense type ${matchingType.id}`);
                }
              }
            } catch (error) {
              console.error(`Error fetching expense types for group ${position.expenseGroup}:`, error);
            }
          }
        });
      }
      
      console.debug('Receipt data processed successfully');
    } catch (error) {
      console.error('Error processing receipt data:', error);
      message.error(t("expense_item.receipt_processing_error", "Error processing receipt data"));
    }
  };

  // Handle file upload
  const handleFileUploadWrapper = async (files: File[]): Promise<any | null> => {
    if (!files || files.length === 0) {
      message.error(t("expense_item.no_files", "No files selected for upload"));
      return null;
    }

    try {
      // Set processing state to true
      setIsProcessingFiles(true);
      setIsFormDisabled(true);
      
      console.debug(`Starting file upload process with ${files.length} files`);
      
      // Call the handleFileUpload function with the required parameters
      const result = await handleFileUpload(files, accessToken, aiGroupsAndTypes, t);
      
      if (result) {
        console.debug('File upload completed successfully');
        // Process the receipt data to populate form fields
        setByReceipts(result);
      } else {
        console.debug('File upload completed but returned no data');
      }
      
      // Move to the next step regardless of success or failure
      setCurrentStep("form");
      
      // Reset processing state
      setIsProcessingFiles(false);
      setIsFormDisabled(false);
      
      return result;
    } catch (error) {
      console.error("Error in file upload:", error);
      message.error(t("expense_item.upload_error", "Error processing receipt. Continuing without receipt data."));
      
      // Reset processing state
      setIsProcessingFiles(false);
      setIsFormDisabled(false);
      
      // Move to the next step even if there's an error
      setCurrentStep("form");
      
      return null;
    }
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
    isProcessingFiles,
    setIsProcessingFiles,
    isFormDisabled,
    setIsFormDisabled,
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
