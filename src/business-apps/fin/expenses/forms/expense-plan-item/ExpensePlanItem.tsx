import React from "react";
import { Typography, Divider } from "antd";
import { ExpensePlanItemProvider, useExpensePlanItem } from "./context/ExpensePlanItemContext";
import { ExpensePlanItemForm } from "./ExpensePlanItemForm";
import { ExpensePlanItemProps } from "./types";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { showToast } from "../../utils/notificationUtils";
import "../expense-item/ExpenseItem.css";

const { Title } = Typography;

const ExpensePlanItem: React.FC<BusinessAppContextProps & ExpensePlanItemProps> = ({ 
  accessToken, 
  userInfo, 
  additionalData, 
  onClose 
}) => {

  const [localAdditionalData, setLocalAdditionalData] = React.useState(() => {
    // Parse URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const expensePlanId = urlParams.get('expensePlanId');
    const itemCurrency = urlParams.get('itemCurrency');
    
    // Merge URL parameters with additionalData
    return {
      ...additionalData,
      expensePlanId: expensePlanId || additionalData?.expensePlanId,
      itemCurrency: itemCurrency || additionalData?.itemCurrency
    };
  });
  
   // For backward compatibility, still listen for the custom event
   React.useEffect(() => {
    const handleShowExpenseItem = (event: CustomEvent) => {
      if (event.detail) {
        const { expensePlanId, itemCurrency } = event.detail;
        
        // Update additionalData with the parameters from the event
        setLocalAdditionalData((prevData: any) => ({
          ...prevData,
          expensePlanId,
          itemCurrency
        }));
      }
    };
    
    // Add event listener
    document.addEventListener('expense-item-show', handleShowExpenseItem as EventListener);
    
    // Clean up
    return () => {
      document.removeEventListener('expense-item-show', handleShowExpenseItem as EventListener);
    };
  }, []);

  const ExpensePlanItemContent: React.FC<{ onClose?: (shouldRefetch?: boolean) => void }> = ({ onClose }) => {
    const {
      form,
      loading,
      expenseGroups,
      expenseTypes,
      customFields,
      costCenters,
      currencies,
      handleSubmit,
      handleCancel,
      handleExpenseGroupChange,
      handleExpenseTypeChange,
      handleCurrencyChange,
      isEditMode,
    } = useExpensePlanItem();

    const handleCancelWithCallback = () => {
      handleCancel();
      if (onClose) {
        onClose(false);
      }
    };

    const handleSubmitWithCallback = async () => {
      try {
        await handleSubmit();
        if (onClose) {
          onClose(true);
        }
      } catch (error) {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            "lowcoder:expense_summary_request.no_expense_items",
            "No expense items created"
          ),
          "error"
        );
      }
    };

    return (
      <div className={`gba:mainContainer`} data-testid="expense-plan-item-main-container">
        <div className={`gba:headerContainer`} data-testid="expense-plan-item-header-container">
          <div className={`gba:titleContainer`} data-testid="expense-plan-item-title-container">
            <Title level={4} className={`gba:headerTitle`} data-testid="expense-plan-item-header-title">
              {isEditMode
                ? getTranslationFromI18nKeyAndLabel("lowcoder:create_expense_type_item.header_container_title_edit", "Edit Item | Expense")
                : getTranslationFromI18nKeyAndLabel("lowcoder:create_expense_type_item.header_container_title_new", "New Item | Expense")
              }
            </Title>
          </div>
        </div>
        <Divider className={`gba:headerDivider`} data-testid="expense-plan-item-header-divider" />

        <ExpensePlanItemForm
          form={form}
          expenseGroups={expenseGroups}
          expenseTypes={expenseTypes}
          customFields={customFields}
          costCenters={costCenters}
          currencies={currencies}
          handleSubmit={handleSubmitWithCallback}
          handleCancel={handleCancelWithCallback}
          handleExpenseGroupChange={handleExpenseGroupChange}
          handleExpenseTypeChange={handleExpenseTypeChange}
          handleCurrencyChange={handleCurrencyChange}
          loading={loading}
        />
      </div>
    );
  };

  return (
    <ExpensePlanItemProvider 
      accessToken={accessToken} 
      userInfo={userInfo} 
      additionalData={localAdditionalData}
    >
      <ExpensePlanItemContent onClose={onClose} />
    </ExpensePlanItemProvider>
  );
};

export default ExpensePlanItem; 
