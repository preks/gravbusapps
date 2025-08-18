import React from "react";
import { useTranslation } from "react-i18next";
import { ExpenseItemProvider, useExpenseItem } from './context';
import { Button } from "@newwork/gravity-ui-catalog";
import { Typography, Divider } from "antd";
import { ExpenseItemProps } from "./types";
import StartScreenComponent from "./components/StartScreenComponent";
import FormScreenComponent from "./components/FormScreenComponent";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { ICONS } from "../../utils/icons";
import { FORM_STEPS } from "./constants/constants";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { showToast } from "../../utils/notificationUtils";

const { Title } = Typography;

const ExpenseItem: React.FC<BusinessAppContextProps & ExpenseItemProps> = ({ accessToken, userInfo, additionalData, onClose }) => {
  // Get URL query parameters
  const [localAdditionalData, setLocalAdditionalData] = React.useState(() => {
    // Parse URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const expenseRequestId = urlParams.get('expenseRequestId');
    const itemCurrency = urlParams.get('itemCurrency');
    
    // Merge URL parameters with additionalData, but prioritize additionalData
    return {
      ...additionalData,
      expenseRequestId: additionalData?.expenseRequestId || expenseRequestId,
      itemCurrency: additionalData?.itemCurrency || itemCurrency
    };
  });

  // Update localAdditionalData when additionalData changes
  React.useEffect(() => {
    if (additionalData) {
      setLocalAdditionalData((prevData: any) => ({
        ...prevData,
        ...additionalData,
        // Prioritize additionalData over URL parameters
        expenseRequestId: additionalData.expenseRequestId || prevData.expenseRequestId,
        itemCurrency: additionalData.itemCurrency || prevData.itemCurrency
      }));
    }
  }, [additionalData]);
  
  // For backward compatibility, still listen for the custom event
  React.useEffect(() => {
    const handleShowExpenseItem = (event: CustomEvent) => {
      if (event.detail) {
        const { expenseRequestId, itemCurrency } = event.detail;
        
        // Update additionalData with the parameters from the event
        setLocalAdditionalData((prevData: any) => ({
          ...prevData,
          expenseRequestId,
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

  const ExpenseItemContent: React.FC<{ onClose?: (shouldRefetch?: boolean) => void }> = ({ onClose }) => {
    const { t } = useTranslation();
    
    const {
      form,
      currentStep,
      setCurrentStep,
      fileList,
      setFileList,
      positions,
      setPositions,
      expenseGroups,
      expenseRequests,
      loading,
      expenseTypes,
      customFields,
      costCenters,
      multiPosition,
      setCurrentSelectedDate,
      setMultiPosition,
      handleSubmit,
      handleCancel,
      handleExpenseGroupChange,
      handleExpenseTypeChange,
      handleAddPosition,
      handleRemovePosition,
      calculateTotal,
      currencies,
      isEditMode
    } = useExpenseItem();

    // Modified handleCancel to use onClose callback if provided
    // Do NOT refetch when cancelling to preserve selected items in the wizard
    const handleCancelWithCallback = () => {
      handleCancel();
      if (onClose) {
        onClose(false);
      }
    };

    // Modified handleSubmit to use onClose callback if provided
    // When successful, pass true to onClose to indicate we need to refetch expense request data
    const handleSubmitWithCallback = async () => {
      try {
        await handleSubmit();
        if (onClose) {
          // Pass true to indicate we should refetch the expense request data
          // This is needed because we've created a new expense item
          // The hideExpenseItem function in ExpenseRequestWizardContext will handle the refetch
          onClose(true);
        }
      } catch (error) {
        showToast(
              getTranslationFromI18nKeyAndLabel(
                "lowcoder:expense_summary_request.no_expense_items",
                "No expense items created"
              ),
              "error"
            )
      }
    };

    return (
      <div className={`gba:mainContainer`} data-testid="expense-item-main-container">
        <div className={`gba:headerContainer`} data-testid="expense-item-header-container">
          {currentStep === FORM_STEPS.FORM && (
            <Button
              variant="ghost"
              onClick={() => {
                setCurrentStep(FORM_STEPS.START);
                setFileList([]);
              }}
              className={`gba:backButton`}
              data-testid="back-button"
            >
              <img 
                src={ICONS.BACK_ARROW} 
                alt={t('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.back_btn', 'Back')} 
                className={`gba:backIcon`}
                width="24"
                height="24"
              />
            </Button>
          )}
          <div className={`gba:titleContainer`} data-testid="expense-item-title-container">
            <Title level={4} className={`gba:headerTitle`} data-testid="expense-item-header-title">
              {isEditMode 
                ? t("lowcoder:create_expense_type_item.header_container_title_edit", "Edit Item | Expense")
                : t("lowcoder:create_expense_type_item.header_container_title_new", "New Item | Expense")
              }
            </Title>
          </div>
        </div>
        <Divider className={`gba:headerDivider`} data-testid="expense-item-header-divider" />

        {currentStep === FORM_STEPS.START ? (
          <StartScreenComponent 
            fileList={fileList}
            setFileList={setFileList}
            setCurrentStep={setCurrentStep}
            handleCancel={handleCancelWithCallback}
          />
        ) : (
          <FormScreenComponent
            form={form}
            fileList={fileList}
            setFileList={setFileList}
            positions={positions}
            setPositions={setPositions}
            expenseGroups={expenseGroups}
            expenseTypes={expenseTypes}
            customFields={customFields}
            costCenters={costCenters}
            currencies={currencies}
            expenseRequests={expenseRequests}
            multiPosition={multiPosition}
            setCurrentSelectedDate={setCurrentSelectedDate}
            setMultiPosition={setMultiPosition}
            handleSubmit={handleSubmitWithCallback}
            handleCancel={handleCancelWithCallback}
            handleExpenseGroupChange={handleExpenseGroupChange}
            handleExpenseTypeChange={handleExpenseTypeChange}
            handleAddPosition={handleAddPosition}
            handleRemovePosition={handleRemovePosition}
            loading={loading}
            calculateTotal={calculateTotal}
          />
        )}
      </div>
    );
  };
  
  return (
    <ExpenseItemProvider accessToken={accessToken} userInfo={userInfo} additionalData={localAdditionalData}>
      <ExpenseItemContent onClose={onClose} />
    </ExpenseItemProvider>
  );
};

export default ExpenseItem;
