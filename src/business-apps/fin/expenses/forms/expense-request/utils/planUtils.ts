import { formatDate, formatNumberFunction } from '@/common/utils/windowUtils';
import { ICONS } from '../../../utils/icons';


/**
 * Find catalog entry by type code
 * @param typeNeeded - Type code to search for
 * @param expenseCatalogueData - Expense catalogue data
 * @returns Catalog entry object or empty object if not found
 */
export const getCatalogTypeTransformer = (typeNeeded: string, expenseCatalogueData: any): any => {
  try { 
    const catalogValue = expenseCatalogueData?.expenseRequestType?.find(
      (element: any) => element.code.toLowerCase().includes(typeNeeded.toLowerCase())
    ) ?? {};
    return catalogValue;
  } catch (error) {
    return {};
  }
};

/**
 * Transform plan data into card data for display
 * @param planData - Plan data from API
 * @param expenseCatalogueData - Expense catalogue data
 * @param t - Translation function
 * @returns Transformed plan card data
 */
export const getPlanCardData = (planData: any, expenseCatalogueData: any, t: any): any => {
  if (!planData) return null;
  
  const expenseType = getCatalogTypeTransformer('expense', expenseCatalogueData);
  const planTypeData = planData.requestTypeRef === expenseType?.id ? 'EXPENSE' : 'TRIP';
  
  const amountFormated = formatNumberFunction(planData.totalAmount ? planData.totalAmount : 0);
  const paymentamountFormated = formatNumberFunction(planData.advancePaymentTotalAmount || 0);
  
  let cardDate = formatDate(planData.startDate, 'date.long') || '';
  cardDate += cardDate !== '' ? ' - ' : '';
  cardDate += formatDate(planData.endDate, 'date.long') || '';
  
  return {
    id: planData.id,
    planType: planTypeData,
    avatarImg: planTypeData === 'EXPENSE' ? ICONS.RECEIPT_ICON : ICONS.TRIP_ICON,
    avatarTitle: planTypeData === 'EXPENSE' 
      ? t('lowcoder:create_expense_request.expense_select_button', 'Expense') 
      : t('lowcoder:create_expense_request.trip_select_button', 'Trip'),
    title: planData.title || '',
    creationDate: planData.createdAt 
      ? formatDate(planData.createdAt, 'date.long') 
      : `${t('lowcoder:expense_summary_request.no_creation_date', 'No creation date')}`,
    tripStart: planData.startDate || '',
    tripEnd: planData.endDate || '',
    tripInterval: cardDate || '',
    paymentAmount: paymentamountFormated || '',
    paymentCurrency: (planData.currency && planData.currency.code) ? planData.currency.code : 'EUR',
    planCurrency: (planData.currency && planData.currency.code) ? planData.currency.code : 'EUR',
    planAmount: amountFormated || ''
  };
};

/**
 * Transform all plans into card data
 * @param expenseCatalogueData - Expense catalogue data
 * @param t - Translation function
 * @returns Array of plan card data
 */
export const transformPlansToCardData = (expenseCatalogueData: any, t: any): any[] => {
  if (!expenseCatalogueData?.ExpensePlan) return [];
  
  return expenseCatalogueData.ExpensePlan.map((plan: any) => 
    getPlanCardData(plan, expenseCatalogueData, t)
  );
};
