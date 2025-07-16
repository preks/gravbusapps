import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { showToast } from '../../../utils/notificationUtils';
import { fetchEmployeeRule, fetchExpenseRequestAndItems } from '../ExpenseRequestWizardQueries';
import { handleTripSubmitAction } from '../utils/tripScreenUtils';
import { LocationData } from '../utils/types';
import { getCurrencyWithFallback } from '../utils/currencyUtils';

/**
 * ExpenseRequestWizardContext props interface
 */
export interface ExpenseRequestWizardContextProps {
  loading: boolean;
  employeeRuleId: string | null;
  setEmployeeRuleId: (id: string) => void;
  isTripFormValid: boolean;
  updateTripFormValidation: (isValid: boolean) => void;
  expenseRuleError: string | null;
  setExpenseRuleError: (error: string | null) => void;
  expenseRequestData: any | null;
  setExpenseRequestData: (data: any | null) => void;
  form: any;
  userInfo?: any;
  currentTitle: string;
  setCurrentTitle: (title: string) => void;
  currentCurrency: string | null;
  setCurrentCurrency: (currency: string | null) => void;
  submitActionTripData: (startLocation: LocationData, destinations: LocationData[], endLocation: LocationData, expenseRulesData: any,event:string) => boolean;
  showExpenseItem: boolean;
  setShowExpenseItem: (show: boolean) => void;
  expenseItemParams: { expenseRequestId?: string; itemCurrency?: string };
  setExpenseItemParams: (params: { expenseRequestId?: string; itemCurrency?: string }) => void;
  showCreateItem: () => void;
  hideExpenseItem: (shouldRefetch?: boolean) => void;
  refetchExpenseData: () => Promise<void>;
  deletedItems: any[];
  setDeletedItems: (items: any[]) => void;
}

/**
 * ExpenseRequestWizardProvider props interface
 */
interface ExpenseRequestWizardProviderProps {
  children: ReactNode;
  accessToken: string;
  userInfo?: any;
  additionalData?: { [k: string]: any };
}

/**
 * ExpenseRequestWizardContext
 */
export const ExpenseRequestWizardContext = createContext<ExpenseRequestWizardContextProps | undefined>(undefined);

/**
 * ExpenseRequestWizardProvider component
 * @param props - Provider props
 * @returns Provider component
 */
export const ExpenseRequestWizardProvider: React.FC<ExpenseRequestWizardProviderProps> = ({
  children,
  accessToken,
  userInfo,
  additionalData,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(true);
  const [employeeRuleId, setEmployeeRuleId] = useState<string | null>(null);
  const [expenseRuleError, setExpenseRuleError] = useState<string | null>(null);
  const [isTripFormValid, setIsTripFormValid] = useState<boolean>(false);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [currentCurrency, setCurrentCurrency] = useState<string | null>(null);
  const [expenseRequestData, setExpenseRequestData] = useState<any | null>(null);
  
  // New state for ExpenseItem integration
  const [showExpenseItem, setShowExpenseItem] = useState<boolean>(false);
  const [expenseItemParams, setExpenseItemParams] = useState<{ expenseRequestId?: string; itemCurrency?: string }>({});
  // State for deleted items that need to persist across navigation
  const [deletedItems, setDeletedItems] = useState<any[]>([]);
  const graphqlClient = useGraphqlClient(accessToken);

  // Mock additionalData for testing
  const mockAdditionalData = {
    psi_taskPayload: {
      stepKey: "Tab3_pse_save",
      initialParameters:{expenseItems:[{
        itemId: "3734da7b-d212-4d93-9217-f2ecb9034284",
        currencyId: "Currency:v1:EUR"
    }]},
      expenseRequest: {
        id: "90c7cdc0-ccef-4c0a-b5ba-a57af67bd38d",
        version: 4,
        businessKey: "0a844413-9c9b-45b7-8fda-106ae1808f61",
        additionalProperties: {
          transportationMeans: []
        },
      }
    },
    nvi_navigationPayload: {},
    psi_processMetadata: {
      processMetadata: {
        domain: "employee-expense",
        name: "changeExpenseRequest"
      },
      processInstanceId: "eab911a1-1336-40b1-bde8-f4742166f6c9",
      lastOpenedTask: {
        id: "697018fc-c027-493f-a815-69fb061828dc",
        name: "addItemsToRequest",
        parameters: {
          stepKey: "ItemsScreen_pse_next",
          expenseRequest: {
            id: "3c5b82b3-1487-4b57-8930-1d0d873a2226",
            version: 3
          }
        },
        screenKey: "frm_changeExpenseRequestAddItemsToRequest",
        screen: {
          id: "1e3d736b-29f8-4a7b-b461-a1e229a5afd4",
          namespaceId: "31bb6427-8f98-11ef-b686-1e4781e89729",
          namespaceCode: "nw_employee_expense",
          screenKey: "frm_changeExpenseRequestAddItemsToRequest",
          name: "Add Expense Items To Request",
          namespaceDescription: "Employee Expense",
          createdAt: "2024-11-01T14:41:47.644",
          updatedAt: "2024-11-01T14:41:47.644",
          isDeleted: false,
          type: "FORM",
          screenComponents: {
            key: "frm_changeExpenseRequestAddItemsToRequest",
            name: "Add Expense Items To Request",
            builderType: "LOWCODER",
            appId: "66cf3a923227892ac4685ffd",
            appName: "flw_modifyExpenseRequest",
            formDefinition: {},
            release: "true"
          }
        }
      }
    }
  };

  const actualAdditionalData = additionalData || mockAdditionalData;

  // Fetch expense data when employeeRuleId is available
  // Made public so it can be called after expense item creation
  const fetchExpenseData = async () => {
    try {
      if (!accessToken || !employeeRuleId || !userInfo) return;

      setLoading(true);

      // Extract expenseId from additionalData
      const expenseId = actualAdditionalData?.psi_taskPayload?.expenseRequest?.id;
      if (!expenseId) {
        showToast(
          t("lowcoder:create_expense_request_wizard.missing_expense_id", "Missing expense ID"),
          "error"
        );
        setLoading(false);
        return;
      }

      // Get employee ID
      const employeeId = userInfo?.employeeDetails?.employeeId;
      if (!employeeId) {
        showToast(
          t("lowcoder:create_expense_request_wizard.missing_employee_id", "Missing employee ID"),
          "error"
        );
        setLoading(false);
        return;
      }

      // Get active user locale
      const activeUserLocale = getCurrentActiveUserLocale();

      // Prepare query variables
      const variables = {
        expenseId,
        activeUserLocale,
        employeeId
      };

      // Execute query
      const response = await graphqlClient.request(fetchExpenseRequestAndItems, variables);
      
      // Preserve any manually selected items that aren't part of the fetched data
      if (expenseRequestData?.ExpenseItem && Array.isArray(expenseRequestData.ExpenseItem)) {
        // Get IDs of items from the API response
        const fetchedItemIds = response.ExpenseItem?.map((item: any) => item.id) || [];
        
        // Find manually selected items that aren't in the API response
        const manuallySelectedItems = expenseRequestData.ExpenseItem.filter(
          (item: any) => !fetchedItemIds.includes(item.id) && item.isManuallySelected
        );
        
        // Combine API items with manually selected items
        if (manuallySelectedItems.length > 0) {
          response.ExpenseItem = [...(response.ExpenseItem || []), ...manuallySelectedItems];
        }
      }
      
      setExpenseRequestData(response);
    } catch (error) {
      showToast(
        t("lowcoder:modify_expense_request.error_fetching_expense_data", "Error fetching expense data"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        if (!accessToken || !userInfo) return;

        const employeeId = userInfo?.employeeDetails?.employeeId;
        if (!employeeId) {
          showToast(
            t("lowcoder:create_expense_request_wizard.missing_employee_id", "Missing employee ID"),
            "error"
          );
          setLoading(false);
          return;
        }

        // Get current date
        const currentDate = new Date().toISOString();
        
        // Fetch employee rule using the imported function
        const employeeRuleData = await fetchEmployeeRule(employeeId, currentDate, accessToken);

        if (employeeRuleData && employeeRuleData.expenseRuleId) {
          setEmployeeRuleId(employeeRuleData.expenseRuleId);
          setExpenseRuleError(null);
        } else {
          setExpenseRuleError(
            t("lowcoder:create_expense_request.missing_expense_rule_message", "No expense rule found for this employee")
          );
          showToast(
            t("lowcoder:create_expense_request.missing_expense_rule_message", "No expense rule found for this employee"),
            "error"
          );
        }
      } catch (error) {
        setExpenseRuleError(
          t("lowcoder:create_expense_request.error_employee_rule", "Error fetching employee expense rule")
        );
        showToast(
          t("lowcoder:create_expense_request.error_employee_rule", "Error fetching employee expense rule"),
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [accessToken, userInfo, t]);

  // Fetch expense data when employeeRuleId is available
  useEffect(() => {
    if (employeeRuleId) {
      fetchExpenseData();
    }
  }, [employeeRuleId]);

  /**
   * Save trip data function
   * @param startLocation - Start location data
   * @param destinations - Destinations data
   * @param endLocation - End location data
   * @param expenseRulesData - Expense rules data
   * @returns True if save was successful, false otherwise
   */
  const submitActionTripData = (
    startLocation: LocationData,
    destinations: LocationData[],
    endLocation: LocationData,
    expenseRulesData: any,
    event:string
  ): boolean => {
    // Determine currency based on trip data
    const determinedCurrency = getCurrencyWithFallback(
      startLocation,
      destinations,
      endLocation,
      expenseRulesData
    );
    
    // Update currency in context
    setCurrentCurrency(determinedCurrency);
    
    return handleTripSubmitAction(
      startLocation,
      destinations,
      endLocation,
      expenseRulesData,
      expenseRequestData,
      employeeRuleId || '',
      currentTitle,
      determinedCurrency,
      event
    );
  };

  // Function to update trip form validation state
  const updateTripFormValidation = (isValid: boolean) => {
    setIsTripFormValid(isValid);
  };
  
  // Function to show expense item component with the necessary parameters
  const showCreateItem = () => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      // Set the parameters for the ExpenseItem component
      setExpenseItemParams({
        expenseRequestId: expenseRequestData.ExpenseRequestByPk.id,
        itemCurrency: currentCurrency || (expenseRequestData.ExpenseItem?.[0]?.currencyRef || "")
      });
      
      // Show the ExpenseItem component
      setShowExpenseItem(true);
    }
  };
  
  // Function to hide expense item component and return to wizard
  // Optional parameter to refetch expense request data when returning from successful submission
  const hideExpenseItem = async (shouldRefetch: boolean = false) => {
    setShowExpenseItem(false);
    
    // If shouldRefetch is true, refetch the expense request data
    if (shouldRefetch) {
      await fetchExpenseData();
    }
  };
  
  // Context value
  const contextValue: ExpenseRequestWizardContextProps = {
    loading,
    employeeRuleId,
    setEmployeeRuleId,
    isTripFormValid,
    updateTripFormValidation,
    expenseRuleError,
    setExpenseRuleError,
    expenseRequestData,
    setExpenseRequestData,
    form,
    userInfo,
    currentTitle,
    setCurrentTitle,
    currentCurrency,
    setCurrentCurrency,
    submitActionTripData,
    // New properties for ExpenseItem integration
    showExpenseItem,
    setShowExpenseItem,
    expenseItemParams,
    setExpenseItemParams,
    showCreateItem,
    hideExpenseItem,
    refetchExpenseData: fetchExpenseData,
    // Deleted items management
    deletedItems,
    setDeletedItems,
  };

  return (
    <ExpenseRequestWizardContext.Provider value={contextValue}>
      {children}
    </ExpenseRequestWizardContext.Provider>
  );
};

/**
 * Hook to use the expense request wizard context
 * @returns Expense request wizard context
 */
export const useExpenseRequestWizardContext = () => {
  const context = useContext(ExpenseRequestWizardContext);
  if (context === undefined) {
    throw new Error("useExpenseRequestWizardContext must be used within an ExpenseRequestWizardProvider");
  }
  return context;
};
