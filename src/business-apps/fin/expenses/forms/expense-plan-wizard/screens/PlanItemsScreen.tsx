import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@newwork/gravity-ui-catalog';
import { Pagination } from 'antd';
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/business-apps/types';
import { useExpensePlanWizardContext } from '../context/ExpensePlanWizardContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { ICONS } from '../../../utils/icons';
import { createItemsScreenLogObject, formatArrayOfItems, noAllowanceItemsFunction } from '../utils/itemsScreenUtils';
import { fetchEmployeeExpenseItemsFromPayload } from '../queries/ExpensePlanWizardQueries';
import { EVENTS } from '../../../utils/constants';
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState';
import { showToast } from '../../../utils/notificationUtils';
import ExpenseItemCard from '../../expense-request-wizard/components/ExpenseItemCard';
import RejectionComment from '../../expense-request-wizard/components/RejectionComment';
import { getLatestRejectComment } from '../utils/tripScreenUtils';


interface ItemsScreenProps extends BusinessAppContextProps {
  additionalData?: { 
    mdi_modulePayload?: {
      tripData?: any;
    };
    [key: string]: any;
  };
  isTrip:boolean
}

const PlanItemsScreen: React.FC<ItemsScreenProps> = (props) => {
  const { accessToken, additionalData, userInfo, isTrip } = props;
  const { 
    expensePlanData, 
    setExpensePlanData, 
    employeeRuleId, 
    currentTitle, 
    currentCurrency,
    deletedItems,
    setDeletedItems,
    payloadItemsLoaded,
    setPayloadItemsLoaded,
    setPayloadItemIds
  } = useExpensePlanWizardContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedItemsToInitial, setSelectedItemsToInitial] = useState<any[]>([]);
  const [initialCurrentPage, setInitialCurrentPage] = useState<number>(1);
  const [expenseTotals, setExpenseTotals] = useState<{currency: string, amount: number}[]>([]);
  
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData);
  
  const employeeId = userInfo?.employeeDetails?.employeeId;
  const itemListLimit = 3;
  
  const graphQLClient = useGraphqlClient(accessToken);

  const latestRejectComment = getLatestRejectComment(expensePlanData);

  const expenseItems = useMemo(() => {
    const expensesArray = expensePlanData?.ExpensePlanItem
    if (!expensesArray || !Array.isArray(expensesArray)) {
      return [];
    }
    const mappedDeletedItems = deletedItems.map((element:any)=> element.id)
    const removeDeletedItems = expensesArray.filter((element:any)=> !mappedDeletedItems.includes(element.id))
    return noAllowanceItemsFunction(removeDeletedItems);
  }, [expensePlanData,deletedItems]);

  useEffect(() => {
    const calculateTotals = () => {
      if (!expenseItems || expenseItems.length === 0) {
        const defaultCurrency = expensePlanData?.ExpensePlanByPk?.currency?.code || 'RON';
        return [{ currency: defaultCurrency, amount: 0 }];
      }

      const totals: Record<string, number> = {};
      expenseItems.forEach(item => {
        const currency = item.currency?.code || '';
        const amount = item.totalAmount || 0;
        
        if (currency) {
          if (!totals[currency]) {
            totals[currency] = 0;
          }
          totals[currency] += parseFloat(amount);
        }
      });
      return Object.entries(totals).map(([currency, amount]) => ({
        currency,
        amount
      }));
    };

    setExpenseTotals(calculateTotals());
  }, [expenseItems, expensePlanData]);

  const handleDeleteItem = (itemId: string) => {
    if (!expensePlanData?.ExpensePlanItem) return;
    
    const deletedItem = expensePlanData.ExpensePlanItem.find((item: any) => item.id === itemId);
    if (!deletedItem) return;
    
    const isInSelectedItems = selectedItemsToInitial.some((item: any) => item.id === itemId);
    
    const updatedExpenseItems = expensePlanData.ExpensePlanItem.filter((item: any) => item.id !== itemId);
    setExpensePlanData({
      ...expensePlanData,
      ExpensePlanItem: updatedExpenseItems
    });
    
    if (isInSelectedItems) {
      setSelectedItemsToInitial((prev: any[]) => prev.filter((item: any) => item.id !== itemId));
    }
    
    const isAlreadyDeleted = deletedItems.some((item: any) => item.id === itemId);
    if (!isAlreadyDeleted) {
      setDeletedItems([...deletedItems, deletedItem]);
    }

  };
  
  const paginatedInitialItems = useMemo(() => {
    const startIndex = (initialCurrentPage - 1) * itemListLimit;
    const endIndex = startIndex + itemListLimit;
    return expenseItems.slice(startIndex, endIndex);
  }, [expenseItems, initialCurrentPage, itemListLimit]);

  useEffect(() => {
    const fetchItemsFromPayload = async () => {
      if (payloadItemsLoaded) return;
      if (additionalData && 
          additionalData.psi_taskPayload && 
          additionalData.psi_taskPayload.initialParameters && 
          additionalData.psi_taskPayload.initialParameters.expenseItems && 
          additionalData.psi_taskPayload.initialParameters.expenseItems.length > 0) {
        
        try {
          setIsLoading(true);
          const extractedPayloadItemIds = additionalData.psi_taskPayload.initialParameters.expenseItems
            .filter((item: any) => item.itemId)
            .map((item: any) => item.itemId);
          
          if (extractedPayloadItemIds.length === 0) return;
          setPayloadItemIds(extractedPayloadItemIds);
          const existingItemIds = expensePlanData?.ExpensePlanItem?.map((item: any) => item.id) || [];
          const newItemIds = extractedPayloadItemIds.filter((id: string) => !existingItemIds.includes(id));
          
          if (newItemIds.length === 0) return;
          
          let itemCurrency = currentCurrency || "";
          if (expensePlanData?.ExpensePlanByPk?.currencyRef) {
            itemCurrency = expensePlanData.ExpensePlanByPk.currencyRef;
          } else if (expensePlanData?.ExpensePlanItem && expensePlanData?.ExpensePlanItem.length > 0) {
            itemCurrency = expensePlanData.ExpensePlanItem[0].currencyRef;
          }
          
          const userLocale = getCurrentActiveUserLocale();

          const variables = {
            employeeId,
            status: "CREATED",
            activeUserLocale: userLocale,
            idsArray: newItemIds,
            itemCurrency: itemCurrency
          };
          const response = await graphQLClient.request(fetchEmployeeExpenseItemsFromPayload, variables);
          const payloadItems = response?.ExpenseItemEmployee || [];
          
          if (payloadItems.length > 0) {
            const itemsToAdd = payloadItems.map((item: any) => ({
              ...item
            }));
            
            const currentItems = expensePlanData?.ExpensePlanItem || [];
            const updatedItems = [...currentItems, ...itemsToAdd];
            
            setExpensePlanData({
              ...expensePlanData,
              ExpensePlanItem: updatedItems
            });
            
            setSelectedItemsToInitial((prev: any[]) => [...prev, ...itemsToAdd]);
            setPayloadItemsLoaded(true);
          }
        } catch (error) {
          showToast(
          getTranslationFromI18nKeyAndLabel("lowcoder:modify_expense_request.error_fetch_items_payload",
          "Error fetching items from payload"),
           "error")
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchItemsFromPayload();
  }, [additionalData, employeeId, graphQLClient, expensePlanData, setExpensePlanData, currentCurrency]);

  useEffect(() => {

    document.addEventListener('expense-plan-next-items', handleNextItems);
    document.addEventListener('expense-plan-save-items', handleSaveItems);
    
    return () => {
      document.removeEventListener('expense-plan-next-items', handleNextItems);
      document.removeEventListener('expense-plan-save-items', handleSaveItems);
    };
  }, []);
  
  const handleNextItems = useCallback(() => {
    if (expensePlanData?.ExpensePlanByPk) {
      let skipStep =false
      if(additionalData?.psi_taskPayload?.stepKey){
        skipStep = true
      }
      const logObject = createItemsScreenLogObject(
        expensePlanData.ExpensePlanByPk,
        employeeRuleId,
        currentTitle,
        currentCurrency || (expenseItems[0]?.currencyRef || ""),
        expenseItems,
        expensePlanData,
        EVENTS.NEXT,
        skipStep
      );
      dispatchProcessContinueEventIfEnabled(EVENTS.NEXT, logObject);
    }
  }, [expensePlanData, employeeRuleId, currentTitle, currentCurrency, expenseItems, additionalData, dispatchProcessContinueEventIfEnabled]);
  
  const handleSaveItems = useCallback(() => {
    if (expensePlanData?.ExpensePlanByPk) {
      let skipStep =false
      if(additionalData?.psi_taskPayload?.stepKey){
        skipStep = true
      }
      const logObject = createItemsScreenLogObject(
        expensePlanData.ExpensePlanByPk,
        employeeRuleId,
        currentTitle,
        currentCurrency || (expenseItems[0]?.currencyRef || ""),
        expenseItems,
        expensePlanData,
        EVENTS.SAVE,
        skipStep
      );
      dispatchProcessContinueEventIfEnabled(EVENTS.SAVE, logObject);
    }
  }, [expensePlanData, employeeRuleId, currentTitle, currentCurrency, expenseItems, additionalData, dispatchProcessContinueEventIfEnabled]);
  
  const { showCreateItem } = useExpensePlanWizardContext();
  
  const handleCreateItem = useCallback(() => {
    showCreateItem();
  }, [showCreateItem]);
  
  
  const handleInitialPageChange = (page: number) => {
    setInitialCurrentPage(page);
  };

  return (
    <div className="gba:itemsScreenContainer gba:flex gba:flex-col gba:h-full" data-testid="expense-plan-wizard-items-screen" style={{flexGrow:1}}>
      {!isTrip && latestRejectComment && (
       <div className="gba:mb-4">
        <RejectionComment isRequest={false} comment={latestRejectComment} />
        </div>
      )}
      {expenseItems.length > 0 && (
        <div className="gba:flex gba:flex-row gba:justify-between gba:items-center gba:mb-4 gba:px-4">
          <div className="gba:screenTitle gba:m-0 gba:text-[16px] gba:font-bold" data-testid="expense-plan-wizard-items-screen-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.expense_items_counter', 'Estimated Expense Items')}
            {expenseItems.length > 0 && ` (${expenseItems.length})`}
          </div>
          <div className="gba:flex gba:gap-2">
            <Button 
              variant="secondary" 
              icon={<img src={ICONS.FOCUS} alt="Create" className="gba:w-4 gba:h-4" />}
              className="gba:flex gba:items-center gba:gap-1"
              style={{ backgroundColor: '#EFEFEF', borderRadius: '9999px', fontWeight:600 }}
              data-testid="create-item-button"
              onClick={handleCreateItem}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.add_position_btn', 'Add Expense Item')}
            </Button>
          </div>
        </div>
      )}

      <div className="gba:bg-[#F7F7F7] gba:flex gba:flex-col gba:flex-grow gba:border-t gba:border-b gba:border-[#F7F7F7]" 
           data-testid="expense-plan-wizard-items-screen-content"
           style={{ flex: '1 1 auto', minHeight: expenseItems.length === 0 ? '50vh' : 'auto' }}>
        {expenseItems.length > 0 ? (
          <div className="gba:py-2 gba:px-2 gba:flex gba:flex-col gba:flex-grow">
            <div className="gba:flex gba:flex-col gba:gap-2">
              {paginatedInitialItems.map((item) => {
                const formattedItem = formatArrayOfItems([item])[0];
                return (
                  <ExpenseItemCard
                    key={item.id}
                    id={item.id}
                    title={formattedItem.title}
                    expenseGroup={formattedItem.expenseGroup}
                    expenseType={formattedItem.expenseType}
                    costCenter={formattedItem.costCenter}
                    amount={formattedItem.amount}
                    currency={formattedItem.currency}
                    attachmentDate={formattedItem.attachmentDate}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                );
              })}
            </div>
            
            {expenseItems.length > itemListLimit && (
              <div className="gba:paginationContainer gba:mt-4 gba:flex gba:justify-center" data-testid="expense-items-initial-pagination-container">
                <Pagination
                  current={initialCurrentPage}
                  onChange={handleInitialPageChange}
                  total={expenseItems.length}
                  pageSize={itemListLimit}
                  showSizeChanger={false}
                  data-testid="expense-items-initial-pagination"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:p-8 gba:bg-[#F7F7F7] gba:gap-8" 
               data-testid="empty-items-container"
               style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Button 
              variant="ghost" 
              icon={<img src={ICONS.FOCUS} alt="Create" style={{ width: '50px', height: '50px' }} />}
              className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:p-6"
              style={{ 
                height: 'auto',
                width: 'auto',
                padding:'0px',
                borderRadius: '9999px', 
                fontWeight: 600,  
                fontSize: '24px',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none'
              }}
              data-testid="empty-create-item-button"
              onClick={handleCreateItem}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.add_items_button', 'Add Estimated Expense Items')}
            </Button>
          </div>
        )}
      </div>

      {/* Expense Total Display */}
      <div className="gba:expense-total-container gba:mt-8 gba:mb-4 gba:px-4" data-testid="expense-items-total-container">
        <div className="gba:flex gba:justify-between gba:items-center">
          <span className="gba:text-base gba:font-normal">
            {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.total_text', 'Estimated Expenses')}
          </span>
          <div className="gba:flex gba:flex-col gba:items-end">
            {expenseTotals.length > 0 ? (
              expenseTotals.map((total, index) => (
                <span 
                  key={`total-${index}`} 
                  className="gba:text-3xl gba:font-bold"
                  data-testid={`expense-items-total-${total.currency}`}
                >
                  {total.amount.toFixed(2)} {total.currency}
                </span>
              ))
            ) : (
              <span className="gba:text-3xl gba:font-bold" data-testid="expense-items-total-default">
                {expensePlanData?.ExpensePlanByPk && expensePlanData.ExpensePlanByPk.currency ? 
                  `0.00 ${expensePlanData.ExpensePlanByPk.currency.code}` : 
                  "0.00 RON"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanItemsScreen; 