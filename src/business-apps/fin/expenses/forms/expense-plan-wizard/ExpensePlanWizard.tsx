import React, { useState, useEffect } from 'react';
import { Typography, Input } from 'antd';
import { Button } from '@newwork/gravity-ui-catalog';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { showToast } from '../../utils/notificationUtils';
import { EVENTS } from '../../utils/constants';
import { ICONS } from '../../utils/icons';
import '../expense-request-wizard/ExpenseRequestWizard.css';

import { SCREEN_NAMES_ENUM } from './constants/constants';

import LoadScreen from '../expense-request-wizard/screens/LoadScreen';

import ProgressIndicator from '../expense-request-wizard/components/ProgressIndicator';

import PlanTripScreen from './screens/PlanTripScreen';

// Import context provider and hook
import { ExpensePlanWizardProvider, useExpensePlanWizardContext } from './context/ExpensePlanWizardContext';

// Import date validation hook
import { useExpensePlanDateValidation } from './utils/dateValidationUtils';

import { setInitialScreen } from './utils/tripScreenUtils';
import PlanItemsScreen from './screens/PlanItemsScreen';
import ExpensePlanItem from '../expense-plan-item';

const { Title } = Typography;

interface ExpensePlanWizardContentProps extends BusinessAppContextProps {
  onCancel: () => void;
}

/**
 * Expense Plan Wizard Content component
 * @param props - Component props
 * @returns Expense Plan Wizard Content component
 */
const ExpensePlanWizardContent: React.FC<ExpensePlanWizardContentProps> = ({ onCancel, accessToken, userInfo, additionalData }) => {
  // Use context instead of local state
  const {
    loading,
    expenseRuleError,
    expensePlanData,
    currentTitle,
    setCurrentTitle,
    isFormValid,
    currentCurrency,
    setCurrentCurrency,
    showExpenseItem,
    expenseItemParams,
    hideExpenseItem,
    skipAdvancePayment,
    setSkipAdvancePayment
  } = useExpensePlanWizardContext();

  const [currentScreen, setCurrentScreen] = useState<string>(SCREEN_NAMES_ENUM.LOAD_TAB);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const { hasPastDates } = useExpensePlanDateValidation();
  const [titleValue, setTitleValue] = useState<string>('');
  const [titleError, setTitleError] = useState<string>('');
  const [showCustomFooter, setShowCustomFooter] = useState<boolean>(false);
  const [selectedItemCount, setSelectedItemCount] = useState<number>(0);

  const isTrip = expensePlanData?.ExpensePlanByPk?.requestTypeRef?.toLowerCase().includes('trip');
  // Update title and titleValue when expensePlanData changes
  useEffect(() => {
    if (expensePlanData?.ExpensePlanByPk) {
      setCurrentTitle(expensePlanData.ExpensePlanByPk.title || '');
      setTitleValue(expensePlanData.ExpensePlanByPk.title || '');
    }
  }, [expensePlanData, setCurrentTitle]);

  // Update currency when expensePlanData changes
  useEffect(() => {
    if (expensePlanData?.ExpensePlanByPk?.currencyRef) {
      setCurrentCurrency(expensePlanData.ExpensePlanByPk.currencyRef);
    } else if (expensePlanData?.ExpensePlanItem && expensePlanData.ExpensePlanItem.length > 0) {
      const firstItem = expensePlanData.ExpensePlanItem[0];
      if (firstItem && firstItem.currencyRef) {
        setCurrentCurrency(firstItem.currencyRef);
      } else {
        setCurrentCurrency(null);
      }
    } else {
      setCurrentCurrency(null);
    }
  }, [expensePlanData?.ExpensePlanByPk?.currencyRef, expensePlanData?.ExpensePlanItem, setCurrentCurrency]);

  useEffect(() => {
    const handleFooterUpdate = (event: any) => {
      if (event.detail) {
        if (typeof event.detail.showCustomFooter === 'boolean') {
          setShowCustomFooter(event.detail.showCustomFooter);
        }
        if (typeof event.detail.selectedItemCount === 'number') {
          setSelectedItemCount(event.detail.selectedItemCount);
        }
      }
    };
    
    document.addEventListener('expense-plan-wizard-update-footer', handleFooterUpdate);
    
    return () => {
      document.removeEventListener('expense-plan-wizard-update-footer', handleFooterUpdate);
    };
  }, []);

  const validateTitle = (value: string): string => {
    if (!value.trim()) {
      return getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.expense_request_container.current_title_custom_rule', 'Please enter a title');
    }
    if (value.length > 50) {
      return getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.maximum_characters_title_error_message',
        'Maximum limit reached: The title can be up to 50 characters only.');
    }
    return '';
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitleValue(value);
    setTitleError(validateTitle(value));
  };

  const startEditingTitle = () => {
    setIsEditingTitle(true);
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setTitleValue(expensePlanData?.ExpensePlanByPk?.title || '');
    setTitleError('');
  };

  // Additional useEffect for title initialization
  useEffect(() => {
    if (expensePlanData?.ExpensePlanByPk) {
      const initialTitle = expensePlanData.ExpensePlanByPk.title || "";
      setCurrentTitle(initialTitle);
      setTitleValue(initialTitle);
    }
  }, [expensePlanData, setCurrentTitle]);

  const saveTitle = () => {
    setCurrentTitle(titleValue);
    setIsEditingTitle(false);
  };

  // useEffect for screen navigation based on data
  useEffect(() => {
    setInitialScreen(additionalData,expensePlanData,isTrip,setCurrentScreen,setSkipAdvancePayment)
  }, [expensePlanData, isTrip]);

  const navigateToNextScreen = () => {
    switch (currentScreen) {
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        if(!isTrip)
          setCurrentScreen(SCREEN_NAMES_ENUM.SUMMARY_TAB);
        else
        setCurrentScreen(SCREEN_NAMES_ENUM.PAYMENT_TAB);
        break;
      case SCREEN_NAMES_ENUM.CREATE_ITEM_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB);
        break;
      case SCREEN_NAMES_ENUM.TRIPS_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB);
        break;
      case SCREEN_NAMES_ENUM.PAYMENT_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.SUMMARY_TAB);
        break;
      default:
        break;
    }
  };
  
  const navigateToPreviousScreen = () => {
    switch (currentScreen) {
      case SCREEN_NAMES_ENUM.CREATE_ITEM_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB);
        break;
      case SCREEN_NAMES_ENUM.TRIPS_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB);
        break;
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.TRIPS_TAB);
        break;
      case SCREEN_NAMES_ENUM.PAYMENT_TAB:
        if (isTrip) {
          setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB);
        } else {
          setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB);
        }
        break;
      case SCREEN_NAMES_ENUM.SUMMARY_TAB:
        if(!isTrip)
          setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB);
          else
        setCurrentScreen(SCREEN_NAMES_ENUM.PAYMENT_TAB);
        break;
      default:
        break;
    }
  };
  
  const shouldShowBackButton = () => {
    if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB && isTrip) {
      return false;
    }
    if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB && !isTrip) {
      return false;
    }
    return true;
  };

  const renderCurrentScreen = () => {    
    switch (currentScreen) {
      case SCREEN_NAMES_ENUM.LOAD_TAB:
        return <LoadScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />;
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        return (
          <PlanItemsScreen
            isTrip={isTrip}
            accessToken={accessToken} 
            userInfo={userInfo} 
            additionalData={additionalData} 
          />
        );
      case SCREEN_NAMES_ENUM.TRIPS_TAB:
        return (
          <PlanTripScreen 
            accessToken={accessToken} 
            userInfo={userInfo} 
            additionalData={additionalData} 
          />
        );
      case SCREEN_NAMES_ENUM.PAYMENT_TAB:
        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:w-full" data-testid="expense-plan-wizard-payment-screen">
            <p>{getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.advance_payment', 'Advance Payment')} - Coming Soon</p>
          </div>
        );
      case SCREEN_NAMES_ENUM.SUMMARY_TAB:
        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:w-full" data-testid="expense-plan-wizard-summary-screen">
            <p>{getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.summary', 'Summary')} - Coming Soon</p>
          </div>
        );
      default:
        return <LoadScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} />;
    }
  };
  
  if (loading) {
    return (
      <div 
        className="gba:flex gba:items-center gba:justify-center gba:h-full gba:w-full" 
        data-testid="expense-plan-wizard-loading"
      >
        <img 
          src={ICONS.SPINNER_ICON} 
          alt="Loading" 
          className="gba:w-20 gba:h-20" 
          data-testid="expense-plan-wizard-spinner-icon" 
        />
      </div>
    );
  }
  
  if (showExpenseItem) {
    return (
      <ExpensePlanItem
        accessToken={accessToken} 
        userInfo={userInfo} 
        additionalData={expenseItemParams}
        onClose={hideExpenseItem}
      />
    );
  }
  
  return (
    <div className="gba:mainContainer" data-testid="expense-plan-wizard-content">
      <div className="gba:headerContainer" data-testid="expense-plan-wizard-header">
        <div className="gba:backButtonContainer" data-testid="expense-plan-wizard-back-button-container">
          {shouldShowBackButton() && (
            <Button
              variant="text"
              className="gba:backButton"
              data-testid="expense-plan-wizard-back-button"
              onClick={navigateToPreviousScreen}
            >
              <img 
                src={ICONS.BACK_ARROW} 
                alt={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_plan.back_text', 'Back')}
                className="gba:backIcon"
                width="24"
                height="24"
                data-testid="back-button-icon"
              />
            </Button>
          )}
        </div>
        <div className="gba:headerTitleWrapper" data-testid="expense-plan-wizard-header-title-wrapper">
          <div className="gba:titleContainer" data-testid="expense-plan-wizard-title-container">
            {isEditingTitle ? (
              <div className="gba:editingTitleContainer" data-testid="expense-plan-wizard-editing-title-container">
                <div className="gba:titleInputWrapper" data-testid="expense-plan-wizard-title-input-wrapper">
                  <Input
                    className="gba:titleInput"
                    data-testid="expense-plan-wizard-title-input"
                    value={titleValue}
                    onChange={handleTitleChange}
                    placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_plan.title_placeholder', 'Enter title')}
                    maxLength={50}
                    autoFocus
                  />
                </div>
                <div className="gba:titleEditButtons" data-testid="expense-plan-wizard-title-edit-buttons">
                  <div className="gba:buttonWrapper" data-testid="expense-plan-wizard-save-button-wrapper">
                    <Button
                      variant="text"
                      size="small"
                      data-testid="expense-plan-wizard-title-save-button"
                      onClick={saveTitle}
                      disabled={!!titleError || !titleValue.trim()}
                    >
                      <img
                        src={ICONS.CHECK_ICON}
                        alt={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_plan.save_btn', 'Save')}
                        width="20"
                        height="20"
                        data-testid="title-save-button-icon"
                      />
                    </Button>
                  </div>
                  <div className="gba:buttonWrapper" data-testid="expense-plan-wizard-cancel-button-wrapper">
                    <Button
                      variant="text"
                      size="small"
                      data-testid="expense-plan-wizard-title-cancel-button"
                      onClick={cancelEditingTitle}
                    >
                      <img
                        src={ICONS.X_ICON}
                        alt={getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.cancel_items_button', 'Cancel')}
                        width="20"
                        height="20"
                        data-testid="title-cancel-button-icon"
                      />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="gba:displayTitleContainer" data-testid="expense-plan-wizard-display-title-container">
                <Title level={4} className="gba:headerTitle" data-testid="expense-plan-wizard-title">
                  {currentTitle || ""}
                </Title>
                <div className="gba:editButtonWrapper" data-testid="expense-plan-wizard-edit-button-wrapper">
                  <Button
                    variant="text"
                    size="small"
                    data-testid="expense-plan-wizard-title-edit-button"
                    onClick={startEditingTitle}
                    className="gba:editTitleButton"
                  >
                    <img
                      src={ICONS.EDIT_ICON}
                      alt={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_plan.back_text', 'Edit')}
                      width="20"
                      height="20"
                      data-testid="edit-title-button-icon"
                    />
                  </Button>
                </div>
              </div>
            )}
            <div className="gba:headerSubtitle" data-testid="expense-plan-wizard-subtitle">
              {currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB && 
                getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.subtitle', 'Expenses')}
              {currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB && 
                getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.add_trip_info_to_plan.title', 'Trip Details')}
              {currentScreen === SCREEN_NAMES_ENUM.PAYMENT_TAB && 
                getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.advance_payment', 'Advance Payment')}
              {currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB && 
                getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.summary', 'Summary')}
            </div>
          </div>
        </div>
      </div>
      <ProgressIndicator currentScreen={currentScreen} isTrip={isTrip} />
      
      {/* Main content container with responsive height */}
      <div 
        data-testid="expense-plan-wizard-content-container"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: '1 1 auto',
          minHeight: '50vh'
        }}
      >
        {loading ? (
          <div className="gba:loadingContainer" data-testid="expense-plan-wizard-loading">
            {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
          </div>
        ) : expenseRuleError ? (
          <div className="gba:validationContainer" data-testid="expense-plan-wizard-error-container">
            <h3 className="gba:validationTitle" data-testid="expense-plan-wizard-error-title">
              {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_plan.invalid_profile_title', 'Validation Issue')}
            </h3>
            <p className="gba:validationMessage" data-testid="expense-plan-wizard-error-message">
              {expenseRuleError}
            </p>
          </div>
        ) : (
          <div 
            className="gba:screenContainer" 
            data-testid="expense-plan-wizard-screen-container"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              flex: '1 1 auto',
              minHeight: '50vh'
            }}
          >
            {renderCurrentScreen()}
          </div>
        )}
      </div>
      
      <div className="gba:footerContainer" data-testid="expense-plan-wizard-footer">
        <hr className="gba:divider" data-testid="expense-plan-wizard-bottom-divider" />
        <div className="gba:actionButtonsContainer" data-testid="expense-plan-wizard-actions">
          {showCustomFooter ? (
            <>
              <Button 
                variant="outline" 
                className="gba:cancelButton" 
                data-testid="expense-plan-wizard-cancel-selection-button"
                onClick={() => {
                  const cancelEvent = new CustomEvent('expense-plan-items-cancel-selection');
                  document.dispatchEvent(cancelEvent);
                }}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_plan.btn_cancel', 'Cancel')}
              </Button>
              <div className="gba:rightButtonsContainer">
                <Button 
                  variant="primary" 
                  className="gba:submitButton" 
                  data-testid="expense-plan-wizard-confirm-selection-button"
                  disabled={selectedItemCount === 0}
                  onClick={() => {
                    const confirmEvent = new CustomEvent('expense-plan-items-confirm-selection');
                    document.dispatchEvent(confirmEvent);
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_plan.btn_items_submit', 'Confirm')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="gba:cancelButton" 
                data-testid="expense-plan-wizard-cancel-button"
                onClick={onCancel}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.cancel_items_button', 'Cancel')}
              </Button>
              <div className="gba:rightButtonsContainer">
                <Button 
                  variant="outline" 
                  className="gba:submitButton" 
                  data-testid="expense-plan-wizard-save-button"
                  onClick={() => {
                    if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB) {
                      const saveEvent = new CustomEvent('expense-plan-save-trip');
                      document.dispatchEvent(saveEvent);
                    } else if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB) {
                      const saveEvent = new CustomEvent('expense-plan-save-items');
                      document.dispatchEvent(saveEvent);
                    } else if (currentScreen === SCREEN_NAMES_ENUM.PAYMENT_TAB) {
                      const saveEvent = new CustomEvent('expense-plan-save-payment');
                      document.dispatchEvent(saveEvent);
                    } else if (currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB) {
                      const saveEvent = new CustomEvent('expense-plan-save-summary');
                      document.dispatchEvent(saveEvent);
                    } else {
                      // Default save action for other screens
                    }
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.save_button', 'Save')}
                </Button>
                <Button 
                  variant="primary" 
                  className="gba:submitButton" 
                  data-testid="expense-plan-wizard-next-button"
                  disabled={(
                    (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB && !isFormValid) ||
                    (currentScreen === SCREEN_NAMES_ENUM.PAYMENT_TAB && !isFormValid) ||
                    (currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB && false) // TODO: Add validation logic
                  )}
                  onClick={() => {
                    if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB) {
                      const nextEvent = new CustomEvent('expense-plan-next-trip');
                      document.dispatchEvent(nextEvent);
                    } else if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB) {
                      const nextEvent = new CustomEvent('expense-plan-next-items');
                      document.dispatchEvent(nextEvent);
                    } else if (currentScreen === SCREEN_NAMES_ENUM.PAYMENT_TAB) {
                      const nextEvent = new CustomEvent('expense-plan-next-payment');
                      document.dispatchEvent(nextEvent);
                    } else if (currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB) {
                      const submitEvent = new CustomEvent('expense-plan-submit-summary');
                      document.dispatchEvent(submitEvent);
                    } else {
                      navigateToNextScreen();
                    }
                  }}
                >
                  {currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB
                    ? getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_plan.btn_submit', 'Submit')
                  : getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.submit_button', 'Next')
                }
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Expense Plan Wizard component
 * @param props - Business app context props
 * @returns Expense Plan Wizard component
 */
const ExpensePlanWizard: React.FC<BusinessAppContextProps> = (props) => {
  const { accessToken, userInfo, additionalData } = props;
  
  const handleCancel = () => {
    try {
      dispatchProcessContinueEvent(EVENTS.CANCEL, {event:EVENTS.SUBMIT,pso_exitStrategy:"abort"});
    } catch (processError) {
      showToast(
        getTranslationFromI18nKeyAndLabel("lowcoder:create_expense_type_item.error_flows_message", "Error in flow process"),
        "error"
      );
    }
  };
  
  return (
    <ExpensePlanWizardProvider
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
    >
      <div className="gba:expenseRequestWizardWrapper" data-testid="expense-plan-wizard-wrapper">
        <ExpensePlanWizardContent 
          onCancel={handleCancel} 
          accessToken={accessToken} 
          userInfo={userInfo}
          additionalData={additionalData}
        />
      </div>
    </ExpensePlanWizardProvider>
  );
};

export default ExpensePlanWizard; 