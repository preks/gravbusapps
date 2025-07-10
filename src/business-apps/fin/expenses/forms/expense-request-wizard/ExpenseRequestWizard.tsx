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

// Import context and constants
import { ExpenseRequestWizardProvider, useExpenseRequestWizardContext } from './context/ExpenseRequestWizardContext';
import { SCREEN_NAMES_ENUM } from './constants/constants';

// Import screen components
import ItemsScreen from './screens/ItemsScreen';
import CreateItemScreen from './screens/CreateItemScreen';
import TripScreen from './screens/TripScreen';
import LoadScreen from './screens/LoadScreen';
import AllowanceScreen from './screens/AllowanceScreen';
import SummaryScreen from './screens/SummaryScreen';

// Import custom components
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
const ExpenseRequestWizardContent: React.FC<ExpenseRequestWizardContentProps> = ({ onCancel, accessToken, userInfo }) => {
  const { loading, expenseRuleError, expenseRequestData, currentTitle, setCurrentTitle, isTripFormValid } = useExpenseRequestWizardContext();
  const [currentScreen, setCurrentScreen] = useState<string>(SCREEN_NAMES_ENUM.ITEMS_TAB);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleValue, setTitleValue] = useState<string>('');
  const [titleError, setTitleError] = useState<string>('');

  // Get request type (trip or expense)
  const isTrip = expenseRequestData?.ExpenseRequestByPk?.requestTypeRef?.toLowerCase().includes('trip');

  // Initialize title value when data is loaded
  useEffect(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      setTitleValue(expenseRequestData.ExpenseRequestByPk.title || '');
    }
  }, [expenseRequestData]);

  // Title validation functions
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

  // Initialize current title when data is loaded
  useEffect(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      const initialTitle = expenseRequestData.ExpenseRequestByPk.title || getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.untitled', 'Untitled');
      setCurrentTitle(initialTitle);
      setTitleValue(initialTitle);
    }
  }, [expenseRequestData, setCurrentTitle]);

  const saveTitle = () => {
    // Here you would implement the API call to save the title
    // For now, we'll just update the local state
    setCurrentTitle(titleValue);
    setIsEditingTitle(false);
  };

  // Effect to set initial screen based on request type
  useEffect(() => {
    if (expenseRequestData) {
      if (isTrip) {
        setCurrentScreen(SCREEN_NAMES_ENUM.TRIPS_TAB);
      } else {
        setCurrentScreen(SCREEN_NAMES_ENUM.ITEMS_TAB);
      }
    }
  }, [expenseRequestData, isTrip]);
  
  // Navigate to next screen
  const navigateToNextScreen = () => {
    switch (currentScreen) {
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ALLOWANCE_TAB);
        break;
      case SCREEN_NAMES_ENUM.CREATE_ITEM_TAB:
        setCurrentScreen(SCREEN_NAMES_ENUM.ALLOWANCE_TAB);
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
  
  // Navigate to previous screen
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
        setCurrentScreen(SCREEN_NAMES_ENUM.ALLOWANCE_TAB);
        break;
      default:
        break;
    }
  };
  
  // Determine if back button should be shown
  const shouldShowBackButton = () => {
    if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB && isTrip) {
      return false;
    }
    if (currentScreen === SCREEN_NAMES_ENUM.ITEMS_TAB && !isTrip) {
      return false;
    }
    return true;
  };
  
  // Render the current screen
  const renderCurrentScreen = () => {    
    switch (currentScreen) {
      case SCREEN_NAMES_ENUM.ITEMS_TAB:
        return <ItemsScreen accessToken={accessToken} userInfo={userInfo} />;
      case SCREEN_NAMES_ENUM.CREATE_ITEM_TAB:
        return <CreateItemScreen accessToken={accessToken} userInfo={userInfo} />;
      case SCREEN_NAMES_ENUM.TRIPS_TAB:
        return <TripScreen accessToken={accessToken} userInfo={userInfo} />;
      case SCREEN_NAMES_ENUM.LOAD_TAB:
        return <LoadScreen accessToken={accessToken} userInfo={userInfo} />;
      case SCREEN_NAMES_ENUM.ALLOWANCE_TAB:
        return <AllowanceScreen accessToken={accessToken} userInfo={userInfo} />;
      case SCREEN_NAMES_ENUM.SUMMARY_TAB:
        return <SummaryScreen accessToken={accessToken} userInfo={userInfo} />;
      default:
        return <ItemsScreen accessToken={accessToken} userInfo={userInfo} />;
    }
  };
  
  // If loading, show only the spinner instead of the form content
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
      <ProgressIndicator currentScreen={currentScreen} />
      
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
                // If we're on the trip screen, the TripScreen component will handle the save
                // through its own handleSave method which is connected to the context
                if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB) {
                  // Dispatch a custom event that TripScreen will listen for
                  const saveEvent = new CustomEvent('expense-request-save-trip');
                  document.dispatchEvent(saveEvent);
                } else {
                  // Handle save click for current screen
                }
              }}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.save_button', 'Save')}
            </Button>
              <Button 
                variant="primary" 
                className="gba:submitButton" 
                data-testid="expense-request-wizard-next-button"
                disabled ={currentScreen !== SCREEN_NAMES_ENUM.TRIPS_TAB ? false : (!isTripFormValid)}
                onClick={() => {
                  // If we're on the trip screen, the TripScreen component will handle the save
                  // through its own handleSave method which is connected to the context
                  if (currentScreen === SCREEN_NAMES_ENUM.TRIPS_TAB) {
                    // Dispatch a custom event that TripScreen will listen for
                    const nextEvent = new CustomEvent('expense-request-next-trip');
                    document.dispatchEvent(nextEvent);
                    navigateToNextScreen()
                  } else {
                    // Handle save click for current screen
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
    <ExpenseRequestWizardProvider 
      accessToken={accessToken} 
      userInfo={userInfo} 
      additionalData={additionalData}
    >
      <div className="gba:expenseRequestWizardWrapper" data-testid="expense-request-wizard-wrapper">
        <ExpenseRequestWizardContent 
          onCancel={handleCancel} 
          accessToken={accessToken} 
          userInfo={userInfo} 
          additionalData={additionalData} 
        />
      </div>
    </ExpenseRequestWizardProvider>
  );
};

export default ExpenseRequestWizard;
