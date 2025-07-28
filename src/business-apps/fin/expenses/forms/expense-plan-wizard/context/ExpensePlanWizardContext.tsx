import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { showToast } from '../../../utils/notificationUtils';
import { fetchEmployeeRule, fetchExpenseRequestAndItems } from '../queries/ExpensePlanWizardQueries';
import { handleTripSubmitAction } from '../utils/tripScreenUtils';
import { getCurrencyWithFallback } from '../utils/currencyUtils';
import { LocationData } from '../../expense-request-wizard/utils/types';


/**
 * ExpensePlanWizardContext props interface
 */
export interface ExpensePlanWizardContextProps {
  loading: boolean;
  employeeRuleId: string | null;
  setEmployeeRuleId: (id: string) => void;
  isFormValid: boolean;
  updateTripFormValidation: (isValid: boolean) => void;
  expenseRuleError: string | null;
  setExpenseRuleError: (error: string | null) => void;
  expensePlanData: any | null;
  setExpensePlanData: (data: any | null) => void;
  form: any;
  userInfo?: any;
  currentTitle: string;
  setCurrentTitle: (title: string) => void;
  currentCurrency: string | null;
  setCurrentCurrency: (currency: string | null) => void;
  submitActionTripData: (startLocation: LocationData, destinations: LocationData[], endLocation: LocationData, expenseRulesData: any, event: string, skipStep?: boolean) => boolean;
  showExpenseItem: boolean;
  setShowExpenseItem: (show: boolean) => void;
  expenseItemParams: { expensePlanId?: string; itemCurrency?: string };
  setExpenseItemParams: (params: { expensePlanId?: string; itemCurrency?: string }) => void;
  showCreateItem: () => void;
  hideExpenseItem: (shouldRefetch?: boolean) => void;
  refetchExpenseData: () => Promise<void>;
  deletedItems: any[];
  setDeletedItems: (items: any[]) => void;
  payloadItemsLoaded: boolean;
  setPayloadItemsLoaded: (loaded: boolean) => void;
  payloadItemIds: string[];
  setPayloadItemIds: (ids: string[]) => void;
  skipAdvancePayment: boolean;
  setSkipAdvancePayment: (skip: boolean) => void;
}

/**
 * ExpensePlanWizardProvider props interface
 */
interface ExpensePlanWizardProviderProps {
  children: ReactNode;
  accessToken: string;
  userInfo?: any;
  additionalData?: { [k: string]: any };
}

/**
 * ExpensePlanWizardContext
 */
export const ExpensePlanWizardContext = createContext<ExpensePlanWizardContextProps | undefined>(undefined);

/**
 * ExpensePlanWizardProvider component
 * @param props - Provider props
 * @returns Provider component
 */
export const ExpensePlanWizardProvider: React.FC<ExpensePlanWizardProviderProps> = ({
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
  const [isFormValid, setisFormValid] = useState<boolean>(false);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [currentCurrency, setCurrentCurrency] = useState<string | null>(null);
  const [expensePlanData, setExpensePlanData] = useState<any | null>(null);
  
  // New state for ExpenseItem integration
  const [showExpenseItem, setShowExpenseItem] = useState<boolean>(false);
  const [expenseItemParams, setExpenseItemParams] = useState<{ expensePlanId?: string; itemCurrency?: string }>({});
  // State for deleted items that need to persist across navigation
  const [deletedItems, setDeletedItems] = useState<any[]>([]);
  // State to track if payload items have been loaded
  const [payloadItemsLoaded, setPayloadItemsLoaded] = useState<boolean>(false);
  // State to track payload item IDs for exclusion from queries
  const [payloadItemIds, setPayloadItemIds] = useState<string[]>([]);
  const [skipAdvancePayment, setSkipAdvancePayment] = useState<boolean>(false);
  const graphqlClient = useGraphqlClient(accessToken);

  // Fetch expense data when employeeRuleId is available
  // Made public so it can be called after expense item creation
  const fetchExpenseData = async () => {
    try {
      if (!accessToken || !employeeRuleId || !userInfo) return;

      setLoading(true);
      
      if (!additionalData) {
        setLoading(false);
        return;
      }

      // Extract expenseId from additionalData
      const expenseId = additionalData?.psi_taskPayload?.expensePlan?.id;
      if (!expenseId) {
        showToast(
          t("lowcoder:create_expense_plan_wizard.missing_expense_id", "Missing expense plan ID"),
          "error"
        );
        setLoading(false);
        return;
      }

      // Get employee ID
      const employeeId = userInfo?.employeeDetails?.employeeId;
      if (!employeeId) {
        showToast(
          t("lowcoder:create_expense_plan_wizard.missing_employee_id", "Missing employee ID"),
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
      if (expensePlanData?.ExpensePlanItem && Array.isArray(expensePlanData.ExpensePlanItem)) {
        // Get IDs of items from the API response
        const fetchedItemIds = response.ExpensePlanItem?.map((item: any) => item.id) || [];
        
        // Find manually selected items that aren't in the API response
        const manuallySelectedItems = expensePlanData.ExpensePlanItem.filter(
          (item: any) => !fetchedItemIds.includes(item.id) && item.isManuallySelected
        );
        
        // Combine API items with manually selected items
        if (manuallySelectedItems.length > 0) {
          response.ExpensePlanItem = [...(response.ExpensePlanItem || []), ...manuallySelectedItems];
        }
      }
      
      setExpensePlanData(response);
    } catch (error) {
      showToast(
        t("lowcoder:modify_expense_plan.error_fetching_expense_data", "Error fetching expense plan data"),
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
            t("lowcoder:create_expense_plan_wizard.missing_employee_id", "Missing employee ID"),
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
            t("lowcoder:create_expense_plan.missing_expense_rule_message", "No expense rule found for this employee")
          );
          showToast(
            t("lowcoder:create_expense_plan.missing_expense_rule_message", "No expense rule found for this employee"),
            "error"
          );
        }
      } catch (error) {
        setExpenseRuleError(
          t("lowcoder:create_expense_plan.error_employee_rule", "Error fetching employee expense rule")
        );
        showToast(
          t("lowcoder:create_expense_plan.error_employee_rule", "Error fetching employee expense rule"),
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
    event: string,
    skipStep?: boolean
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
      expensePlanData,
      employeeRuleId || '',
      currentTitle,
      determinedCurrency,
      event,
      skipStep
    );
  };

  // Function to update trip form validation state
  const updateTripFormValidation = (isValid: boolean) => {
    setisFormValid(isValid);
  };
  
  // Function to show expense item component with the necessary parameters
  const showCreateItem = () => {
    if (expensePlanData?.ExpensePlanByPk) {
      // Set the parameters for the ExpenseItem component
      setExpenseItemParams({
        expensePlanId: expensePlanData.ExpensePlanByPk.id,
        itemCurrency: currentCurrency || (expensePlanData.ExpensePlanItem?.[0]?.currencyRef || "")
      });
      
      // Show the ExpenseItem component
      setShowExpenseItem(true);
    }
  };
  
  // Function to hide expense item component and return to wizard
  // Optional parameter to refetch expense plan data when returning from successful submission
  const hideExpenseItem = async (shouldRefetch: boolean = false) => {
    setShowExpenseItem(false);
    
    // If shouldRefetch is true, refetch the expense plan data
    if (shouldRefetch) {
      await fetchExpenseData();
    }
  };
  
  // Context value
  const contextValue: ExpensePlanWizardContextProps = {
    loading,
    employeeRuleId,
    setEmployeeRuleId,
    isFormValid,
    updateTripFormValidation,
    expenseRuleError,
    setExpenseRuleError,
    expensePlanData,
    setExpensePlanData,
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
    // Payload items tracking
    payloadItemsLoaded,
    setPayloadItemsLoaded,
    payloadItemIds,
    setPayloadItemIds,
    // Skip advance payment state
    skipAdvancePayment,
    setSkipAdvancePayment,
  };

  return (
    <ExpensePlanWizardContext.Provider value={contextValue}>
      {children}
    </ExpensePlanWizardContext.Provider>
  );
};

/**
 * Hook to use the expense plan wizard context
 * @returns Expense plan wizard context
 */
export const useExpensePlanWizardContext = () => {
  const context = useContext(ExpensePlanWizardContext);
  if (context === undefined) {
    throw new Error("useExpensePlanWizardContext must be used within an ExpensePlanWizardProvider");
  }
  return context;
}; 