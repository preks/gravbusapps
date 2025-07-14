import React, { useMemo } from 'react';
import { Typography } from 'antd';
import { Button } from '@newwork/gravity-ui-catalog';
import { getTranslationFromI18nKeyAndLabel, formatNumberFunction, getCatalogValue } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/business-apps/types';
import { useExpenseRequestWizardContext } from '../context/ExpenseRequestWizardContext';
import { ICONS } from '../../../utils/icons';
import { formatDate } from '@/common/utils/windowUtils';
import ExpenseItemCard from '../components/ExpenseItemCard';

const { Title } = Typography;

/**
 * ItemsScreen component props
 */
interface ItemsScreenProps extends BusinessAppContextProps {}

/**
 * Function to filter out allowance items
 * @param arrayOfItems - Array of expense items
 * @returns Filtered array without allowance items
 */
const noAllowanceItemsFunction = (arrayOfItems: any[]) => {
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
const formatArrayOfItems = (arrayItems: any[]) => {
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
 * ItemsScreen component for expense request wizard
 * @param props - Component props
 * @returns ItemsScreen component
 */
const ItemsScreen: React.FC<ItemsScreenProps> = () => {
  const { expenseRequestData } = useExpenseRequestWizardContext();

  // Process expense items
  const expenseItems = useMemo(() => {
    if (!expenseRequestData?.ExpenseItem || !Array.isArray(expenseRequestData.ExpenseItem)) {
      return [];
    }
    
    // Filter out allowance items
    const filteredItems = noAllowanceItemsFunction(expenseRequestData.ExpenseItem);
    
    // Format items for display
    return formatArrayOfItems(filteredItems);
  }, [expenseRequestData]);

  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    return expenseItems.reduce((total, item) => total + parseFloat(item.amount), 0);
  }, [expenseItems]);

  // Handle delete item (placeholder for now)
  const handleDeleteItem = (itemId: string) => {
    console.log('Delete item:', itemId);
    // Implement delete functionality here
  };

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
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request_card.add_items_text', 'Add Items')}
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
              {expenseItems.map((item) => (
                <ExpenseItemCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  expenseGroup={item.expenseGroup}
                  expenseType={item.expenseType}
                  costCenter={item.costCenter}
                  amount={item.amount}
                  currency={item.currency}
                  attachmentDate={item.attachmentDate}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
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
