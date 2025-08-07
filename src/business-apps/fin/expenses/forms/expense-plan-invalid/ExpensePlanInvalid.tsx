import React from 'react';
import { Divider, Typography } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Button } from '@newwork/gravity-ui-catalog';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import '../expense-request-invalid/ExpenseRequestInvalid.css';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { showToast } from '../../utils/notificationUtils';
import { EVENTS } from '../../utils/constants';

const { Title } = Typography;

interface ExpensePlanInvalidContentProps {
  onCancel: () => void;
}

/**
 * Expense Plan Invalid Content component
 * @param props - Component props
 * @returns Expense Plan Invalid Content component
 */
const ExpensePlanInvalidContent: React.FC<ExpensePlanInvalidContentProps> = ({ onCancel }) => {
  return (
    <div className="gba:mainContainer" data-testid="expense-plan-invalid-content">
      <div className="gba:headerContainer" data-testid="expense-plan-invalid-header">
        <div className="gba:titleContainer">
          <Title level={4} className="gba:headerTitle" data-testid="expense-plan-invalid-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_expense_plan.header_container', 'Create Expense Plan')}
          </Title>
        </div>
      </div>
      <Divider className="gba:headerDivider" data-testid="expense-plan-invalid-divider" />
      
      <div className="gba:validationContainer" data-testid="expense-plan-invalid-validation-container">
        <h3 className="gba:validationTitle" data-testid="expense-plan-invalid-validation-title">
          {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.invalid_profile_title', 'Validation Issue')}
        </h3>
        <p className="gba:validationMessage" data-testid="expense-plan-invalid-validation-message">
          {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.invalid_profile_text_plan', 'Code/SAP number missing in your profile. Please reach out to your administration to provide the missing data before starting an expense plan.')}
        </p>
      </div>
      
      <div className="gba:footerContainer" data-testid="expense-plan-invalid-footer">
        <Divider className="gba:divider" data-testid="expense-plan-invalid-bottom-divider" />
        <div className="gba:actionButtonsContainer" data-testid="expense-plan-invalid-actions">
          <Button 
            variant="outline" 
            className="gba:cancelButton" 
            data-testid="expense-plan-invalid-cancel-button"
            onClick={onCancel}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Expense Plan Invalid component
 * @param props - Business app context props
 * @returns Expense Plan Invalid component
 */
const ExpensePlanInvalid: React.FC<BusinessAppContextProps> = () => {
  const handleCancel = () => {
        try {
          dispatchProcessContinueEvent(
            EVENTS.ABORT, {
              "event": EVENTS.ABORT,
              pso_exitStrategy: "abort",
              pso_completeNotification: {
                type: 'error',
                messageKey: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_module.toast_notification_cancel_create_absence',
                  'The action has been canceled.'
                  )
              }
            })
        } catch (processError) {
          showToast(
            getTranslationFromI18nKeyAndLabel("lowcoder:create_expense_type_item.error_flows_message", "Error in flow process"),
            "error"
          );
        }
  };
  
  return (
    <div className="gba:expensePlanInvalidWrapper" data-testid="expense-plan-invalid-wrapper">
      <ExpensePlanInvalidContent onCancel={handleCancel} />
    </div>
  );
};

export default ExpensePlanInvalid; 