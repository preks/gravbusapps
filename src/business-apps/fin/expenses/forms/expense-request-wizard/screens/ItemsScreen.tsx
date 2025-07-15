import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@newwork/gravity-ui-catalog';
import { Pagination } from 'antd';
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/business-apps/types';
import { useExpenseRequestWizardContext } from '../context/ExpenseRequestWizardContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { ICONS } from '../../../utils/icons';
import ExpenseItemCard from '../components/ExpenseItemCard/ExpenseItemCard';
import { createItemsScreenLogObject, formatArrayOfItems, noAllowanceItemsFunction } from '../utils/itemsScreenUtils';
import { fetchEmployeeExpenseItems } from '../ExpenseRequestWizardQueries';
import { SearchBarWithLabel } from '../../../forms/expense-request/components';
import { EVENTS } from '../../../utils/constants';


interface ItemsScreenProps extends BusinessAppContextProps {
  additionalData?: { 
    mdi_modulePayload?: {
      tripData?: any;
    };
    [key: string]: any;
  };
}





const ItemsScreen: React.FC<ItemsScreenProps> = (props) => {
  const { accessToken, additionalData, userInfo } = props;
  const { expenseRequestData, setExpenseRequestData, employeeRuleId, currentTitle, currentCurrency } = useExpenseRequestWizardContext();
  const [showSelectItems, setShowSelectItems] = useState<boolean>(false);
  const [selectItemsList, setSelectItemsList] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deletedItems, setDeletedItems] = useState<any[]>([]);
  const [selectedItemsToInitial, setSelectedItemsToInitial] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [selectedItemIdsForSelection, setSelectedItemIdsForSelection] = useState<string[]>([]);
  const [initialCurrentPage, setInitialCurrentPage] = useState<number>(1);
  
  const employeeId = userInfo?.employeeDetails?.employeeId;
  const itemListLimit = 4;
  
  const graphQLClient = useGraphqlClient(accessToken);

  const expenseItems = useMemo(() => {
    if (!expenseRequestData?.ExpenseItem || !Array.isArray(expenseRequestData.ExpenseItem)) {
      return [];
    }
    
    return noAllowanceItemsFunction(expenseRequestData.ExpenseItem);
  }, [expenseRequestData]);

  const totalExpenses = useMemo(() => {
    return expenseItems.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
  }, [expenseItems]);
  


  const fetchSelectItems = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const currentItemIds = expenseRequestData.ExpenseItem?.map((item: any) => item.id) || [];
      
      const excludedIds = [...currentItemIds, ...selectedItemsToInitial.map(item => item.id)];
      
      let itemCurrency = null;
      if (currentCurrency) {
        itemCurrency = currentCurrency;
      } else if (expenseRequestData.ExpenseItem && expenseRequestData.ExpenseItem.length > 0) {
        itemCurrency = expenseRequestData.ExpenseItem[0].currencyRef;
      }
      else if(expenseItems && expenseItems.length >0){
        itemCurrency = expenseItems[0].currencyRef || ""
      }
      
      const userLocale = getCurrentActiveUserLocale();
      const countVariables = {
        employeeId,
        status: "CREATED",
        activeUserLocale: userLocale,
        idsArray: excludedIds,
        itemCurrency: itemCurrency
      };
      
      await graphQLClient.request(fetchEmployeeExpenseItems, {
        ...countVariables,
        limit: 1,
        offset: 0
      });
      
      const offset = (currentPage - 1) * itemListLimit;
      
      const variables = {
        ...countVariables,
        limit: Number(itemListLimit),
        offset: Math.max(0, Number(offset))
      };
            
      const response = await graphQLClient.request(fetchEmployeeExpenseItems, variables);
      
      const items = response?.ExpenseItemEmployee || [];
      
      const filteredApiItems = noAllowanceItemsFunction(items);
      
      const filteredDeletedItems = deletedItems.filter(item => !excludedIds.includes(item.id));
      
      const apiItemsCount = response?.ExpenseItemAggregate?.aggregate?.count || 0;
      const totalItemsCount = apiItemsCount + filteredDeletedItems.length;
      setTotalItems(totalItemsCount);
      
      let finalItems = filteredApiItems;
      
      if (finalItems.length < itemListLimit) {
        const remainingSlots = itemListLimit - finalItems.length;
        const deletedItemsToShow = filteredDeletedItems.slice(0, remainingSlots);
        finalItems = [...finalItems, ...deletedItemsToShow];
      }
      
      setSelectItemsList(finalItems);
    } catch (error) {
      console.error('Error fetching expense items:', error);
      const filteredDeletedItems = deletedItems.filter(item => 
        !expenseRequestData.ExpenseItem?.map((i: any) => i.id).includes(item.id) &&
        !selectedItemsToInitial.map(i => i.id).includes(item.id)
      );
      
      setTotalItems(filteredDeletedItems.length);
      setSelectItemsList(filteredDeletedItems.slice(0, itemListLimit));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, deletedItems, employeeId, expenseRequestData?.ExpenseItem, graphQLClient, itemListLimit, selectedItemsToInitial, currentCurrency]);

  const handleDeleteItem = (itemId: string) => {
    if (!expenseRequestData?.ExpenseItem) return;
    
    const deletedItem = expenseRequestData.ExpenseItem.find((item: any) => item.id === itemId);
    if (!deletedItem) return;
    
    const isInSelectedItems = selectedItemsToInitial.some(item => item.id === itemId);
    
    const updatedExpenseItems = expenseRequestData.ExpenseItem.filter((item: any) => item.id !== itemId);
    setExpenseRequestData({
      ...expenseRequestData,
      ExpenseItem: updatedExpenseItems
    });
    
    if (isInSelectedItems) {
      setSelectedItemsToInitial(prev => prev.filter(item => item.id !== itemId));
    } else {
      setDeletedItems(prev => [...prev, deletedItem]);
    }
    

    if (showSelectItems) {
      fetchSelectItems();
    }
  };
  
  const toggleSelectItemsView = () => {
    const newShowSelectItems = !showSelectItems;
    setShowSelectItems(newShowSelectItems);
    
    if (newShowSelectItems) {
      setCurrentPage(1);
      setSelectedItemIdsForSelection([]);
      const event = new CustomEvent('expense-wizard-update-footer', {
        detail: { 
          showCustomFooter: true,
          selectedItemCount: 0
        }
      });
      document.dispatchEvent(event);
    } else {

      const event = new CustomEvent('expense-wizard-update-footer', {
        detail: { showCustomFooter: false }
      });
      document.dispatchEvent(event);
    }
  };
  
  const handleConfirmSelection = useCallback(() => {
    if (selectedItemIdsForSelection.length > 0) {
      const selectedItems = selectItemsList.filter(item => 
        selectedItemIdsForSelection.includes(item.id)
      );
      
      const currentItems = expenseRequestData?.ExpenseItem || [];
      const updatedItems = [...currentItems, ...selectedItems];
      setExpenseRequestData({
        ...expenseRequestData,
        ExpenseItem: updatedItems
      });
      
      setSelectedItemsToInitial(prev => [...prev, ...selectedItems]);
      
      setDeletedItems(prev => prev.filter(item => 
        !selectedItemIdsForSelection.includes(item.id)
      ));
      setSelectedItemIdsForSelection([]);
    }
    
    setShowSelectItems(false);
    const footerEvent = new CustomEvent('expense-wizard-update-footer', {
      detail: { showCustomFooter: false }
    });
    document.dispatchEvent(footerEvent);
  }, [expenseRequestData, selectItemsList, selectedItemIdsForSelection]);

  const handleCancelSelection = useCallback(() => {
    setSelectedItemIdsForSelection([]);
    setShowSelectItems(false);
    
    const footerEvent = new CustomEvent('expense-wizard-update-footer', {
      detail: { showCustomFooter: false }
    });
    document.dispatchEvent(footerEvent);
  }, []);
  
  const handleSearch = (_value: string) => {
  };
  
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  const paginatedInitialItems = useMemo(() => {
    const startIndex = (initialCurrentPage - 1) * itemListLimit;
    const endIndex = startIndex + itemListLimit;
    return expenseItems.slice(startIndex, endIndex);
  }, [expenseItems, initialCurrentPage, itemListLimit]);

  useEffect(() => {
    if (showSelectItems) {
      fetchSelectItems();
    }
  }, [currentPage, fetchSelectItems, showSelectItems]);

  useEffect(() => {
    document.addEventListener('expense-items-cancel-selection', handleCancelSelection);
    document.addEventListener('expense-items-confirm-selection', handleConfirmSelection);
    document.addEventListener('expense-request-next-items', handleNextItems);
    document.addEventListener('expense-request-save-items', handleSaveItems);
    
    return () => {
      document.removeEventListener('expense-items-cancel-selection', handleCancelSelection);
      document.removeEventListener('expense-items-confirm-selection', handleConfirmSelection);
      document.removeEventListener('expense-request-next-items', handleNextItems);
      document.removeEventListener('expense-request-save-items', handleSaveItems);
    };
  }, [handleCancelSelection, handleConfirmSelection]);
  
  const handleNextItems = useCallback(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      const logObject = createItemsScreenLogObject(
        expenseRequestData.ExpenseRequestByPk,
        employeeRuleId,
        currentTitle,
        currentCurrency || (expenseItems[0]?.currencyRef || ""),
        expenseItems,
        expenseRequestData,
        EVENTS.NEXT
      );
      console.log('Items Screen Next Event:', logObject);
    }
  }, [expenseRequestData, employeeRuleId, currentTitle, currentCurrency, expenseItems]);
  
  const handleSaveItems = useCallback(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      const logObject = createItemsScreenLogObject(
        expenseRequestData.ExpenseRequestByPk,
        employeeRuleId,
        currentTitle,
        currentCurrency || (expenseItems[0]?.currencyRef || ""),
        expenseItems,
        expenseRequestData,
        EVENTS.SAVE
      );
      console.log('Items Screen Save Event:', logObject);
    }
  }, [expenseRequestData, employeeRuleId, currentTitle, currentCurrency, expenseItems]);
  
  useEffect(() => {
    if (showSelectItems) {
      const event = new CustomEvent('expense-wizard-update-footer', {
        detail: { 
          showCustomFooter: true,
          selectedItemCount: selectedItemIdsForSelection.length 
        }
      });
      document.dispatchEvent(event);
    }
  }, [selectedItemIdsForSelection, showSelectItems]);
  
  const toggleItemSelection = (itemId: string) => {
    if (selectedItemIdsForSelection.includes(itemId)) {
      setSelectedItemIdsForSelection(prevSelected => 
        prevSelected.filter(id => id !== itemId)
      );
    } else {
      setSelectedItemIdsForSelection(prevSelected => 
        [...prevSelected, itemId]
      );
    }
  };
  
  const handleInitialPageChange = (page: number) => {
    setInitialCurrentPage(page);
  };

  if (showSelectItems) {
    return (
      <div className="gba:itemsScreenContainer" data-testid="expense-request-wizard-select-items-screen">
        <div className="gba:screenHeader gba:flex gba:justify-between gba:items-center gba:mb-4" data-testid="expense-request-wizard-select-items-header">
          <SearchBarWithLabel 
            onSearch={handleSearch} 
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.search_module', 'My Expense Items')}
            label={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.expense_header_title', 'Search In Expense Items List') + ` (${totalItems})`}
            data-testid="expense-request-wizard-search-bar"
          />
        </div>
        
        <div className="gba:itemsContent gba:bg-[#F7F7F7] gba:border-t gba:border-b gba:border-[#F7F7F7] gba:py-2 gba:px-2" data-testid="expense-request-wizard-select-items-content">
          {isLoading ? (
            <div className="gba:text-center gba:p-8 gba:bg-white" data-testid="loading-message">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request.loading', 'Loading items...')}
            </div>
          ) : selectItemsList.length > 0 ? (
            <>
              <div className="gba:grid gba:grid-cols-1 gba:gap-4" data-testid="selectable-items-list">
                {selectItemsList.map((item: any) => {
                  const formattedItem = formatArrayOfItems([item])[0];
                  return (
                    <div
                      key={item.id}
                      className={`gba:cursor-pointer gba:hover:bg-gray-50 ${selectedItemIdsForSelection.includes(item.id) ? 'gba:border-4 gba:border-black' : ''}`}
                      onClick={() => toggleItemSelection(item.id)}
                      data-testid={`select-item-${item.id}`}
                    >
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
                      />
                    </div>
                  );
                })}
              </div>
              {totalItems > itemListLimit &&
              <div className="gba:paginationContainer gba:mt-4 gba:flex gba:justify-center" data-testid="expense-items-pagination-container">
                <Pagination
                  current={currentPage}
                  onChange={handlePageChange}
                  total={totalItems}
                  pageSize={itemListLimit}
                  showSizeChanger={false}
                  data-testid="expense-items-pagination"
                />
              </div>}
            </>
          ) : (
            <div className="gba:text-center gba:p-8 gba:bg-white" data-testid="no-items-message">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request.no_items_to_select', 'No expense items available to select')}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="gba:itemsScreenContainer" data-testid="expense-request-wizard-items-screen">
      <div className="gba:flex gba:flex-row gba:justify-between gba:items-center gba:mb-4 gba:px-4">
        <div className="gba:screenTitle gba:m-0 gba:text-[16px] gba:font-bold" data-testid="expense-request-wizard-items-screen-title">
          {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.items_subtitle', 'Expense Items')}
          {expenseItems.length > 0 && `(${expenseItems.length})`}
        </div>
        <div className="gba:flex gba:gap-2">
          <Button 
            variant="secondary" 
            icon={<img src={ICONS.ADD_CIRCLE} alt="Add" className="gba:w-4 gba:h-4" />}
            className="gba:flex gba:items-center gba:gap-1"
            style={{ backgroundColor: '#EFEFEF', borderRadius: '9999px', fontWeight:600 }}
            data-testid="add-item-button"
            onClick={toggleSelectItemsView}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.add_items_text', 'Add Items')}
          </Button>
          <Button 
            variant="secondary" 
            icon={<img src={ICONS.FOCUS} alt="Create" className="gba:w-4 gba:h-4" />}
            className="gba:flex gba:items-center gba:gap-1"
            style={{ backgroundColor: '#EFEFEF', borderRadius: '9999px', fontWeight:600 }}
            data-testid="create-item-button"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.create_item', 'Create Item')}
          </Button>
        </div>
      </div>

      <div className="gba:itemsContent gba:bg-[#F7F7F7] gba:border-t gba:border-b gba:border-[#F7F7F7] gba:py-2 gba:px-2" data-testid="expense-request-wizard-items-screen-content">
        {expenseItems.length > 0 ? (
          <>
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
          </>
        ) : (
          <div className="gba:text-center gba:p-8 gba:bg-white" data-testid="no-items-message">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.no_items', 'No expense items found')}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsScreen;
