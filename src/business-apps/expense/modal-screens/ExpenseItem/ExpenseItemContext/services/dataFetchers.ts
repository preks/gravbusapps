import { message } from "antd";
import { ExpenseType, CustomField } from "../../types";
import { getNewTypes, getCustomFields } from "../../ExpenseItemQueries";
import { prepareExpenseRequestsList } from "../../utils/expenseRequestUtils";

/**
 * Fetch expense types for a specific expense group
 */
export const fetchExpenseTypes = async (
  groupId: string,
  positions: any[],
  employeeRuleId: string | null | object,
  graphqlClient: any,
  setExpenseTypes: (types: { [classId: string]: ExpenseType[] }) => void,
  t: (key: string, fallback: string) => string
) => {
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
    message.error(t("expense_item.error_message", "Failed to load expense types"));
    return [];
  }
};

/**
 * Fetch custom fields for specific expense types
 */
export const fetchCustomFields = async (
  expenseTypeIds: string[],
  graphqlClient: any,
  setCustomFields: (fields: { [expenseTypeId: string]: CustomField[] } | ((prev: { [expenseTypeId: string]: CustomField[] }) => { [expenseTypeId: string]: CustomField[] })) => void,
  t: (key: string, fallback: string) => string
) => {
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
    message.error(t("expense_item.error_message", "Failed to load custom fields"));
    return [];
  }
};

/**
 * Add expense requests to the state
 */
export const addRequests = (
  catalogueDataResponse: any,
  expenseRequestByCurrency: any,
  multiPosition: boolean,
  form: any,
  setExpenseRequests: (requests: any[]) => void,
  t: (key: string, fallback: string) => string
) => {
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
