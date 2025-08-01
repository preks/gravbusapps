import { SCREEN_NAMES_ENUM } from "../constants/constants";
import dayjs from "dayjs";
import { noAllowanceItemsFunction } from "./itemsScreenUtils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

interface ExpenseItem {
  id: any;
  code: string;
  title: string;
  expenseRequest: string;
  costCenterId?: string;
  projectId?: string;
  ruleId?: string;
  expenseRuleId?: string;
}

/**
 * Creates a log object for the AllowanceScreen button events
 * @param initialRequest - The initial expense request data
 * @param employeeRuleId - The employee rule ID
 * @param currentTitle - The current title of the expense request
 * @param expenseItems - The expense items array
 * @param expenseRequestData - The full expense request data
 * @param event - The event type (NEXT, SAVE, etc.)
 * @returns Log object for analytics
 */
export const createAllowanceScreenLogObject = (
  initialRequest: any,
  employeeRuleId: string | null,
  currentTitle: string,
  expenseItems: any[],
  expenseRequestData: any,
  event: string
) => {
  // Map allowance items
  const allowanceItems: ExpenseItem[] = expenseItems.map(item => ({
    id: item.id,
    version: item.version,
    code: item.code || '',
    title: item.title || '',
    expenseRequest: initialRequest?.id || '',
    costCenterId: item.costCenterId || '',
    projectId: item.projectId || ''
  }));
  
  // Map non-allowance items
  const nonAllowanceItems: ExpenseItem[] = noAllowanceItemsFunction(expenseRequestData?.ExpenseItem || []).map(item => ({
    id: item.id,
    version: item.version,
    code: item.code || '',
    title: item.title || '',
    ruleId: item.expenseRuleId || '',
    expenseRequest: initialRequest?.id || '',
    costCenterId: item.costCenterId || '',
    projectId: item.projectId || ''
  }));
  
  // Combine both arrays
  const expenseItemsArray: ExpenseItem[] = [...allowanceItems, ...nonAllowanceItems];
  
  return {
    stepKey: SCREEN_NAMES_ENUM.ALLOWANCE_TAB + "_" + event,
    event: event,
    expenseRequest: {
      id: initialRequest?.id,
      startDate: initialRequest?.startDate || "",
      endDate: initialRequest?.endDate || "",
      expenseRule: employeeRuleId || "",
      version: initialRequest?.version || "",
      costCenter: initialRequest?.costCenterId || "",
      employee: initialRequest?.employeeId || "",
      expensePlan: initialRequest?.expensePlanId || "",
      title: currentTitle || initialRequest?.title || "",
      status: initialRequest?.status,
      requestDate: initialRequest?.requestDate ? dayjs(initialRequest.requestDate).format("YYYY-MM-DD") : "",
      requestTypeRef: initialRequest?.requestTypeRef,
      additionalProperties: initialRequest?.additionalProperties,
      currencyRef: initialRequest?.currency?.id || ""
    },
    expenseRequestItems: {
      expenseItems: expenseItemsArray
    },
    expenseRequestTrips: {
      expenseTrips: (expenseRequestData?.ExpenseRequestByPk?.expenseRequestTrip || [])
    }
  };
};

/**
 * Helper function to get the day name from an ISO date string
 */
export const getDayName = (isoDate: string): string => {
  const days = [
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.sunday', 'Sunday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.monday', 'Monday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.tuesday', 'Tuesday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.wednesday', 'Wednesday'), 
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.thursday', 'Thursday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.friday', 'Friday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.saturday', 'Saturday')
  ];
  return days[new Date(isoDate).getDay()];
};