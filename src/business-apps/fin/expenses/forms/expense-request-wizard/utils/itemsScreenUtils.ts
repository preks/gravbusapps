import { formatDate, getCatalogValue, getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import dayjs from "dayjs";
import { EVENTS } from "../../../utils/constants";
import { SCREEN_NAMES_ENUM } from "../constants/constants";

export const noAllowanceItemsFunction = (arrayOfItems: any[]) => {
  return arrayOfItems.filter((element) => !(
    (element.expenseClassRef && element.expenseClassRef.toLowerCase().includes("allowance")) || 
    (element.expenseGroupRef && element.expenseGroupRef.toLowerCase().includes("allowance"))
  ));
};

/**
 * Function to format array of items for display
 * @param arrayItems - Array of expense items
 * @returns Formatted array of items
 */
export const formatArrayOfItems = (arrayItems: any[]) => {
  return arrayItems.map((element) => {
    const positionArray = element.expensePosition;
    let singularItemValue = {expenseGroup:"",expenseType:"",costCenter:""};
    
    if (positionArray.length < 2 && positionArray.length !== 0) {
      singularItemValue = {
        expenseGroup: positionArray[0].expenseGroup,
        expenseType: positionArray[0].expenseRuleGeneralExpense.name,
        costCenter: positionArray[0].costCenter.name
      };
    } else {
      singularItemValue = {
        expenseGroup: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_item_request_card.multiple_positions',
          'Multiple Positions'),
        expenseType: "",
        costCenter: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_item_request_card.multiple', 'Multiple')
      };
    }

    return {
      "id": element.id,
      "title": element.title,
      "date": element.expenseDate,
      "amount": element.totalAmount,
      "currency": element.currency.code,
      "expenseGroup": singularItemValue?.expenseGroup ? (getCatalogValue(singularItemValue
          .expenseGroup) || singularItemValue.expenseGroup) :
        getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.no_expense_group',
          'No expense group') || "",
      "expenseType": singularItemValue?.expenseType || "",
      "costCenter": singularItemValue?.costCenter ? singularItemValue.costCenter :
        getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.no_cost_center',
          'No Cost Center') || "",
      "attachmentDate": element.expenseItemFile?.length > 0 ?
        formatDate(element?.expenseItemFile[0]?.createdAt, 'date.long') : "",
      "totalAdvancePayment": 0
    };
  });
};

/**
 * Creates a log object for the ItemsScreen button events
 * @param initialRequest - The initial expense request data
 * @param employeeRuleId - The employee rule ID
 * @param currentTitle - The current title of the expense request
 * @param currentCurrency - The current currency from context
 * @param expenseItems - The expense items array
 * @param expenseRequestData - The full expense request data
 * @param event - The event type (NEXT, SAVE, etc.)
 * @returns Log object for analytics
 */
export const createItemsScreenLogObject = (
  initialRequest: any,
  employeeRuleId: string | null,
  currentTitle: string,
  currentCurrency: string | null,
  expenseItems: any[],
  expenseRequestData: any,
  event: string
) => {
  return {
    stepKey: SCREEN_NAMES_ENUM.ITEMS_TAB + "_" + event,
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
      currencyRef: initialRequest?.currency?.id || currentCurrency || ""
    },
    expenseRequestItems: {
      expenseItems: expenseItems.map(item => ({
        id: item.id,
        code: item.code || '',
        title: item.title || '',
        ruleId: item.expenseRuleId || '',
        expenseRequest: initialRequest?.id || ''
      }))
    },
    expenseRequestTrips: {
      expenseTrips: (expenseRequestData?.ExpenseRequestByPk?.expenseRequestTrip || [])
    }
  };
};