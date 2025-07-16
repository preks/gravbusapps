import React, { useState, useEffect } from 'react';
import { Typography, Input } from 'antd';
import { Button } from '@newwork/gravity-ui-catalog';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { showToast } from '../../utils/notificationUtils';
import { EVENTS } from '../../utils/constants';
import { ICONS } from '../../utils/icons';
import './ExpenseRequestWizard.css';

import { ExpenseRequestWizardProvider, useExpenseRequestWizardContext } from './context/ExpenseRequestWizardContext';
import { SCREEN_NAMES_ENUM } from './constants/constants';

import ItemsScreen from './screens/ItemsScreen';
import CreateItemScreen from './screens/CreateItemScreen';
import TripScreen from './screens/TripScreen';
import LoadScreen from './screens/LoadScreen';
import ExpenseItem from '../expense-item/ExpenseItem';
import AllowanceScreen from './screens/AllowanceScreen';
import SummaryScreen from './screens/SummaryScreen';

import ProgressIndicator from './components/ProgressIndicator';

const { Title } = Typography;

interface ExpenseRequestWizardContentProps extends BusinessAppContextProps {
  onCancel: () => void;
}

/**
 * Expense Request Wizard Content component
 * @param props - Component props
 * @returns Expense Request Wizard Content component
 */
const ExpenseRequestWizardContent: React.FC<ExpenseRequestWizardContentProps> = ({ onCancel, accessToken, userInfo,additionalData }) => {
  const { 
    loading, 
    expenseRuleError, 
    expenseRequestData, 
    currentTitle, 
    setCurrentTitle, 
    isTripFormValid, 
    setCurrentCurrency,
    showExpenseItem,
    expenseItemParams,
    hideExpenseItem
  } = useExpenseRequestWizardContext();
  const [currentScreen, setCurrentScreen] = useState<string>(SCREEN_NAMES_ENUM.ITEMS_TAB);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleValue, setTitleValue] = useState<string>('');
  const [titleError, setTitleError] = useState<string>('');
  const [showCustomFooter, setShowCustomFooter] = useState<boolean>(false);

  const mockAdditionalData = {
    psi_taskPayload: {
      stepKey: "Tab3_pse_save",
      initialParameters:{expenseItems:[{
        itemId: "2eea7deb-a2b2-4a9f-a3ff-7265143ff15d",
        currencyId: "Currency:v1:RON"
    }]},
      expenseRequest: {
        id: "90c7cdc0-ccef-4c0a-b5ba-a57af67bd38d",
        version: 4,
        businessKey: "0a844413-9c9b-45b7-8fda-106ae1808f61",
        additionalProperties: {
          transportationMeans: []
        },
      }
    },
    nvi_navigationPayload: {},
    psi_processMetadata: {
      processMetadata: {
        domain: "employee-expense",
        name: "changeExpenseRequest"
      },
      processInstanceId: "eab911a1-1336-40b1-bde8-f4742166f6c9",
      lastOpenedTask: {
        id: "697018fc-c027-493f-a815-69fb061828dc",
        name: "addItemsToRequest",
        parameters: {
          stepKey: "ItemsScreen_pse_next",
          expenseRequest: {
            id: "3c5b82b3-1487-4b57-8930-1d0d873a2226",
            version: 3
          }
        },
        screenKey: "frm_changeExpenseRequestAddItemsToRequest",
        screen: {
          id: "1e3d736b-29f8-4a7b-b461-a1e229a5afd4",
          namespaceId: "31bb6427-8f98-11ef-b686-1e4781e89729",
          namespaceCode: "nw_employee_expense",
          screenKey: "frm_changeExpenseRequestAddItemsToRequest",
          name: "Add Expense Items To Request",
          namespaceDescription: "Employee Expense",
          createdAt: "2024-11-01T14:41:47.644",
          updatedAt: "2024-11-01T14:41:47.644",
          isDeleted: false,
          type: "FORM",
          screenComponents: {
            key: "frm_changeExpenseRequestAddItemsToRequest",
            name: "Add Expense Items To Request",
            builderType: "LOWCODER",
            appId: "66cf3a923227892ac4685ffd",
            appName: "flw_modifyExpenseRequest",
            formDefinition: {},
            release: "true"
          }
        }
      }
    }
  };

  const isTrip = !expenseRequestData?.ExpenseRequestByPk?.requestTypeRef?.toLowerCase().includes('trip');

  useEffect(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      setCurrentTitle(expenseRequestData.ExpenseRequestByPk.title || '');
      setTitleValue(expenseRequestData.ExpenseRequestByPk.title || '');
    }
  }, [expenseRequestData, setCurrentTitle]);

  const [selectedItemCount, setSelectedItemCount] = useState<number>(0);
  
  useEffect(() => {
    if (expenseRequestData?.ExpenseRequestByPk?.currencyRef) {
      setCurrentCurrency(expenseRequestData.ExpenseRequestByPk.currencyRef);
    } else if (expenseRequestData?.ExpenseItem && expenseRequestData.ExpenseItem.length > 0) {
      const firstItem = expenseRequestData.ExpenseItem[0];
      if (firstItem && firstItem.currencyRef) {
        setCurrentCurrency(firstItem.currencyRef);
      } else {
        setCurrentCurrency(null);
      }
    } else {
      setCurrentCurrency(null);
    }
  }, [expenseRequestData?.ExpenseRequestByPk?.currencyRef, expenseRequestData?.ExpenseItem, setCurrentCurrency]);
  
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
    
    document.addEventListener('expense-wizard-update-footer', handleFooterUpdate);
    
    return () => {
      document.removeEventListener('expense-wizard-update-footer', handleFooterUpdate);
    };
  }, []);
  
  const validateTitle = (value: string): string => {
    if (!value.trim()) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.expense_request_container.current_title_custom_rule',
        'Please enter a title'
      );
    }
    if (value.length > 50) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.maximum_characters_title_error_message',
        'Maximum limit reached: The title can be up to 50 characters only.'
      );
    }
    return '';
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTitleValue(newValue);
    setTitleError(validateTitle(newValue));
  };

  const startEditingTitle = () => {
    setIsEditingTitle(true);
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setTitleValue(expenseRequestData?.ExpenseRequestByPk?.title || '');
    setTitleError('');
  };

  useEffect(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      const initialTitle = expenseRequestData.ExpenseRequestByPk.title || getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.untitled', 'Untitled');
      setCurrentTitle(initialTitle);
      setTitleValue(initialTitle);
    }
  }, [expenseRequestData, setCurrentTitle]);

  const saveTitle = () => {
    setCurrentTitle(titleValue);
    setIsEditingTitle(false);
  };

  useEffect(() => {
    if (expenseRequestData) {
      if (isTrip) {
        setCurrentScreen(SCREEN_NAMES_ENUM.TRIPS_TAB);
      } else {
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB);
      }
    }
  }, [expenseRequestData, isTrip]);
  
  const navigateToNextScreen = () => {
    switch (currentScreen) {
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        if(!isTrip)
          setCurrentScreen(SCREEN_NAMES_ENUM.SUMMARY_TAB);
        else
        setCurrentScreen(SCREEN_NAMES_ENUM.ALLOWANCE_TAB);
        break;
      case SCREEN_NAMES_ENUM.CREATE_ITEM_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB);
        break;
      case SCREEN_NAMES_ENUM.TRIPS_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB);
        break;
      case SCREEN_NAMES_ENUM.ALLOWANCE_TAB:
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
      case SCREEN_NAMES_ENUM.ALLOWANCE_TAB:
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
        setCurrentScreen(SCREEN_NAMES_ENUM.ALLOWANCE_TAB);
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
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        return <ItemsScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData||mockAdditionalData} />;
      case SCREEN_NAMES_ENUM.CREATE_ITEM_TAB:
        return <CreateItemScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData||mockAdditionalData}/>;
      case SCREEN_NAMES_ENUM.TRIPS_TAB:
        return <TripScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData||mockAdditionalData} />;
      case SCREEN_NAMES_ENUM.LOAD_TAB:
        return <LoadScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData||mockAdditionalData} />;
      case SCREEN_NAMES_ENUM.ALLOWANCE_TAB:
        return <AllowanceScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData||mockAdditionalData} />;
      case SCREEN_NAMES_ENUM.SUMMARY_TAB:
        return <SummaryScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData||mockAdditionalData} />;
      default:
        return <ItemsScreen accessToken={accessToken} userInfo={userInfo} additionalData={additionalData||mockAdditionalData}/>;
    }
  };
  
  if (loading) {
    return (
      <div 
        className="gba:flex gba:items-center gba:justify-center gba:h-full gba:w-full" 
        data-testid="expense-request-wizard-loading"
      >
        <img 
          src={ICONS.SPINNER_ICON} 
          alt="Loading" 
          className="gba:w-20 gba:h-20" 
          data-testid="expense-request-wizard-spinner-icon" 
        />
      </div>
    );
  }
  
  if (showExpenseItem) {
    return (
      <ExpenseItem 
        accessToken={accessToken} 
        userInfo={userInfo} 
        additionalData={expenseItemParams}
        onClose={hideExpenseItem}
      />
    );
  }
  
  return (
    <div className="gba:mainContainer" data-testid="expense-request-wizard-content">
      <div className="gba:headerContainer" data-testid="expense-request-wizard-header">
        <div className="gba:backButtonContainer" data-testid="expense-request-wizard-back-button-container">
          {shouldShowBackButton() && (
            <Button
              variant="text"
              className="gba:backButton"
              data-testid="expense-request-wizard-back-button"
              onClick={navigateToPreviousScreen}
            >
              <img 
                src={ICONS.BACK_ARROW} 
                alt={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.back', 'Back')}
                className="gba:backIcon"
                width="24"
                height="24"
                data-testid="back-button-icon"
              />
            </Button>
          )}
        </div>
        <div className="gba:headerTitleWrapper" data-testid="expense-request-wizard-header-title-wrapper">
          <div className="gba:titleContainer" data-testid="expense-request-wizard-title-container">
            {isEditingTitle ? (
              <div className="gba:editingTitleContainer" data-testid="expense-request-wizard-editing-title-container">
                <div className="gba:titleInputWrapper" data-testid="expense-request-wizard-title-input-wrapper">
                  <Input
                    className="gba:titleInput"
                    data-testid="expense-request-wizard-title-input"
                    value={titleValue}
                    onChange={handleTitleChange}
                    placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.title_placeholder', 'Enter title')}
                    maxLength={50}
                    autoFocus
                  />
                </div>
                <div className="gba:titleEditButtons" data-testid="expense-request-wizard-title-edit-buttons">
                  <div className="gba:buttonWrapper" data-testid="expense-request-wizard-save-button-wrapper">
                    <Button
                      variant="text"
                      size="small"
                      data-testid="expense-request-wizard-title-save-button"
                      onClick={saveTitle}
                      disabled={!!titleError || !titleValue.trim()}
                    >
                      <img
                        src={ICONS.CHECK_ICON}
                        alt={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.save_title', 'Save')}
                        width="20"
                        height="20"
                        data-testid="title-save-button-icon"
                      />
                    </Button>
                  </div>
                  <div className="gba:buttonWrapper" data-testid="expense-request-wizard-cancel-button-wrapper">
                    <Button
                      variant="text"
                      size="small"
                      data-testid="expense-request-wizard-title-cancel-button"
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
                {/* Error message hidden as requested, using disabled button state instead */}
              </div>
            ) : (
              <div className="gba:displayTitleContainer" data-testid="expense-request-wizard-display-title-container">
                <Title level={4} className="gba:headerTitle" data-testid="expense-request-wizard-title">
                  {currentTitle || getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.untitled', 'Untitled')}
                </Title>
                <div className="gba:editButtonWrapper" data-testid="expense-request-wizard-edit-button-wrapper">
                  <Button
                    variant="text"
                    size="small"
                    data-testid="expense-request-wizard-title-edit-button"
                    onClick={startEditingTitle}
                    className="gba:editTitleButton"
                  >
                    <img
                      src={ICONS.EDIT_ICON}
                      alt={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.edit_title', 'Edit')}
                      width="20"
                      height="20"
                      data-testid="edit-title-button-icon"
                    />
                  </Button>
                </div>
              </div>
            )}
            <div className="gba:headerSubtitle" data-testid="expense-request-wizard-subtitle">
              {currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB && 
                getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.items_subtitle', 'Expense Items')}
              {currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB && 
                getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.add_trip_info_to_plan.title', 'Trip Details')}
              {currentScreen === SCREEN_NAMES_ENUM.ALLOWANCE_TAB && 
                getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.allowances_subtitle', 'Allowances')}
              {currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB && 
                getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.summary_subtitle', 'Summary')}
            </div>
          </div>
        </div>
      </div>
      <ProgressIndicator currentScreen={currentScreen} isTrip={isTrip} />
      
      <div data-testid="expense-request-wizard-content-container">
        {loading ? (
          <div className="gba:loadingContainer" data-testid="expense-request-wizard-loading">
            {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.loading', 'Loading...')}
          </div>
        ) : expenseRuleError ? (
          <div className="gba:validationContainer" data-testid="expense-request-wizard-error-container">
            <h3 className="gba:validationTitle" data-testid="expense-request-wizard-error-title">
              {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.invalid_profile_title', 'Validation Issue')}
            </h3>
            <p className="gba:validationMessage" data-testid="expense-request-wizard-error-message">
              {expenseRuleError}
            </p>
          </div>
        ) : (
          <div className="gba:screenContainer" data-testid="expense-request-wizard-screen-container">
            {renderCurrentScreen()}
          </div>
        )}
      </div>
      
      <div className="gba:footerContainer" data-testid="expense-request-wizard-footer">
        <hr className="gba:divider" data-testid="expense-request-wizard-bottom-divider" />
        <div className="gba:actionButtonsContainer" data-testid="expense-request-wizard-actions">
          {showCustomFooter ? (
            <>
              <Button 
                variant="outline" 
                className="gba:cancelButton" 
                data-testid="expense-request-wizard-cancel-selection-button"
                onClick={() => {
                  const cancelEvent = new CustomEvent('expense-items-cancel-selection');
                  document.dispatchEvent(cancelEvent);
                }}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request.btn_cancel', 'Cancel')}
              </Button>
              <div className="gba:rightButtonsContainer">
                <Button 
                  variant="primary" 
                  className="gba:submitButton" 
                  data-testid="expense-request-wizard-confirm-selection-button"
                  disabled={selectedItemCount === 0}
                  onClick={() => {
                    const confirmEvent = new CustomEvent('expense-items-confirm-selection');
                    document.dispatchEvent(confirmEvent);
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.btn_items_submit', 'Confirm')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="gba:cancelButton" 
                data-testid="expense-request-wizard-cancel-button"
                onClick={onCancel}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.cancel_items_button', 'Cancel')}
              </Button>
              <div className="gba:rightButtonsContainer">
                <Button 
                  variant="outline" 
                  className="gba:submitButton" 
                  data-testid="expense-request-wizard-save-button"
                  onClick={() => {
                    if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB) {
                      const saveEvent = new CustomEvent('expense-request-save-trip');
                      document.dispatchEvent(saveEvent);
                    } else if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB) {
                      const saveEvent = new CustomEvent('expense-request-save-items');
                      document.dispatchEvent(saveEvent);
                    } else {
                    }
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.save_button', 'Save')}
                </Button>
                <Button 
                  variant="primary" 
                  className="gba:submitButton" 
                  data-testid="expense-request-wizard-next-button"
                  disabled={currentScreen !== SCREEN_NAMES_ENUM.TRIPS_TAB ? false : (!isTripFormValid)}
                  onClick={() => {
                    if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB) {
                      const nextEvent = new CustomEvent('expense-request-next-trip');
                      document.dispatchEvent(nextEvent);
                      navigateToNextScreen()
                    } else if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB) {
                      const nextEvent = new CustomEvent('expense-request-next-items');
                      document.dispatchEvent(nextEvent);
                      navigateToNextScreen()
                    } else {
                      navigateToNextScreen()
                    }
                  }}
                >
                  {currentScreen === SCREEN_NAMES_ENUM.SUMMARY_TAB
                    ? getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.btn_submit', 'Submit')
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
 * Expense Request Wizard component
 * @param props - Business app context props
 * @returns Expense Request Wizard component
 */
const ExpenseRequestWizard: React.FC<BusinessAppContextProps> = (props) => {
  const { accessToken, userInfo } = props;
  
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
    <ExpenseRequestWizardProvider 
      accessToken={accessToken} 
      userInfo={userInfo}
    >
      <div className="gba:expenseRequestWizardWrapper" data-testid="expense-request-wizard-wrapper">
        <ExpenseRequestWizardContent 
          onCancel={handleCancel} 
          accessToken={accessToken} 
          userInfo={userInfo}
        />
      </div>
    </ExpenseRequestWizardProvider>
  );
};

export default ExpenseRequestWizard;
