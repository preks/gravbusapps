import React from 'react';
import { Row, Col } from 'antd';
import { getTranslationFromI18nKeyAndLabel, formatDate, getCatalogValue, formatNumberFunction } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/business-apps/types';
import { useExpenseRequestWizardContext } from '../context/ExpenseRequestWizardContext';
import { PlanCard } from '../../expense-request/components';
import ExpenseItemRow from '../components/ExpenseItemRow';
import { noAllowanceItemsFunction, getAllowanceItemsFunction } from '../utils/itemsScreenUtils';
import { getDayName } from '../utils/allowanceScreenUtils';



/**
 * SummaryScreen component props
 */
interface SummaryScreenProps extends BusinessAppContextProps {
  additionalData?: { 
    mdi_modulePayload?: {
      tripData?: any;
    };
    [key: string]: any;
  };
}

/**
 * SummaryScreen component for expense request wizard
 * @param props - Component props
 * @returns SummaryScreen component
 */
const SummaryScreen: React.FC<SummaryScreenProps> = () => {
  const { expenseRequestData } = useExpenseRequestWizardContext();
  const requestData = expenseRequestData?.ExpenseRequestByPk;
  const requestItemData = expenseRequestData.ExpenseItem;
  const expenseItems = noAllowanceItemsFunction(requestItemData);
  
  const allowanceItems = getAllowanceItemsFunction(requestItemData);
  const positionsArray :any= [];
  
  if (expenseItems && expenseItems.length > 0) {
    expenseItems.forEach((item) => {
      if(item.expensePosition && item.expensePosition.length>0)
      item.expensePosition.forEach((positionElement:any)=>{
        positionsArray.push({
          id: positionElement.id,
          title: item.title,
          currency: item.currency && item.currency.code || "",
          amount: formatNumberFunction(positionElement.totalAmount),
          expenseGroup: getCatalogValue(positionElement.expenseGroup) || (positionElement.expenseGroup && positionElement.expenseGroup.code) || "",
          expenseType: positionElement.expenseRuleGeneralExpense && positionElement.expenseRuleGeneralExpense.name || "",
          costCenter: item.costCenter && item.costCenter.name || ""
        });
      })
    });
  }
  console.log("positionsArray",positionsArray)
  return (
    <div className="gba:summaryScreenContainer" data-testid="expense-request-wizard-summary-screen">
      <div className="gba:summaryContent" data-testid="expense-request-wizard-summary-screen-content">
        <div className="gba:summaryHeader gba:rounded-lg" data-testid="expense-request-summary-header">
          <Row gutter={[24, 16]} className="gba:mb-2">
            <Col xs={24} md={12} className="gba:text-left">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:font-normal" data-testid="expense-request-id-label">ID:</span>
                <span data-testid="expense-request-id-value">
                  {requestData?.code || getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.no_code', 'No code')}
                </span>
              </div>
            </Col>
            <Col xs={24} md={12} className="gba:text-right">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
                <span className="gba:font-normal" data-testid="expense-request-creation-label">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.request_creation', 'Request Creation:')}
                </span>
                <span data-testid="expense-request-creation-value">
                  {requestData?.createdAt 
                    ? formatDate(requestData.createdAt)
                    : getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.no_creation_date', 'No creation date')}
                </span>
              </div>
            </Col>
          </Row>
          
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12} className="gba:text-left">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:font-normal" data-testid="expense-request-cost-center-label">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.id_cost_center_text_main_cost', 'Main Cost Center:')}
                </span>
                <span data-testid="expense-request-cost-center-value">
                  {requestData?.costCenter?.name || getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.no_cost_center', 'No cost center')}
                </span>
              </div>
            </Col>
          </Row>
        </div>
        
        <div className="gba:mt-6" data-testid="expense-request-plan-section">
          <span 
            className="gba:inline-block gba:font-bold gba:w-full gba:bg-[#F7F7F7] gba:px-4 gba:py-5 gba:text-sm gba:mb-3" 
            data-testid="expense-request-plan-section-title"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initial_expense_plan_select_label', 'Expense Plan')}
          </span>
          {requestData?.expensePlan && (
            <div className="gba:mb-4" data-testid="expense-request-plan-card-container">
              <PlanCard 
                key={requestData.expensePlan.id} 
                plan={{
                  id: requestData.expensePlan.id,
                  planType: requestData.expensePlan.planType,
                  title: requestData.expensePlan.title,
                  creationDate: requestData.expensePlan.createdAt,
                  tripStart: requestData.expensePlan.tripStart,
                  tripEnd: requestData.expensePlan.tripEnd,
                  tripInterval: requestData.expensePlan.tripInterval,
                  paymentAmount: requestData.expensePlan.paymentAmount,
                  paymentCurrency: requestData.expensePlan.paymentCurrency,
                  planAmount: requestData.expensePlan.planAmount,
                  planCurrency: requestData.expensePlan.planCurrency
                }} 
                selectable={false}
                onClick={undefined}
              />
            </div>
          )}
        </div>
        
        <div className="gba:mt-6" data-testid="expense-request-allowances-section">
          <span 
            className="gba:inline-block gba:font-bold gba:w-full gba:bg-[#F7F7F7] gba:px-4 gba:py-5 gba:text-sm gba:mb-3" 
            data-testid="expense-request-allowances-section-title"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule_details.calculation_allowance_code_list.calculation_allowance_code_modal.expense_group_placeholder', 'Allowances') + " ("+allowanceItems?.length + ")"}
          </span>
          
          {allowanceItems && allowanceItems.length > 0 ? (
            <div className="gba:allowances-list" data-testid="expense-request-allowances-list">
              {allowanceItems.map((item) => (
                <ExpenseItemRow 
                  key={item.id}
                  id={item.id}
                  leftPrimary={getDayName(item.expenseDate)}
                  leftSecondary={formatDate(item.expenseDate)}
                  rightSecondary={`${formatNumberFunction(item.totalAmount)} ${item.currency.code}`}
                />
              ))}
            </div>
          ) : (
            <div className="gba:text-gray-500 gba:px-4 gba:py-5" data-testid="expense-request-no-allowances">
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_allowance_info_request.no_allowances_text', 'No allowances created')}
            </div>
          )}
        </div>
        
        <div className="gba:mt-6" data-testid="expense-request-expense-items-section">
          <span 
            className="gba:inline-block gba:font-bold gba:w-full gba:bg-[#F7F7F7] gba:px-4 gba:py-5 gba:text-sm gba:mb-3" 
            data-testid="expense-request-expense-items-section-title"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.search_module.text_content', 'Expense Items') + " (" + positionsArray.length + ")"}
          </span>
          
          {positionsArray && positionsArray.length > 0 ? (
            <div className="gba:expense-items-list" data-testid="expense-request-expense-items-list">
              {positionsArray.map((element:any) => (
                <ExpenseItemRow 
                  key={element.id}
                  id={element.id}
                  leftPrimary={element.title}
                  leftSecondary={`${element.expenseGroup} ${element.expenseType}`}
                  rightSecondary={`${element.amount} ${element.currency}`}
                />
              ))}
            </div>
          ) : (
            <div className="gba:text-gray-500 gba:px-4 gba:py-5" data-testid="expense-request-no-expense-items">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.no_expense_items', 'No expense items created')}
            </div>
          )}
        </div>
        
        {/* Additional summary sections can be added here */}
      </div>
    </div>
  );
};

export default SummaryScreen;
