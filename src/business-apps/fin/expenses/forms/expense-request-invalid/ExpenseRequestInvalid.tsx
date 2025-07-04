import React from 'react';
import { Divider, Typography } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Button } from '@newwork/gravity-ui-catalog';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import './ExpenseRequestInvalid.css';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { showToast } from '../../utils/notificationUtils';
import { EVENTS } from '../../utils/constants';

const { Title } = Typography;

interface ExpenseRequestInvalidContentProps {
  onCancel: () => void;
}

/**
 * Expense Request Invalid Content component
 * @param props - Component props
 * @returns Expense Request Invalid Content component
 */
const ExpenseRequestInvalidContent: React.FC<ExpenseRequestInvalidContentProps> = ({ onCancel }) => {
  return (
    <div className="gba:mainContainer" data-testid="expense-request-invalid-content">
      <div className="gba:headerContainer" data-testid="expense-request-invalid-header">
        <div className="gba:titleContainer">
          <Title level={4} className="gba:headerTitle" data-testid="expense-request-invalid-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_title_header', 'Expense Request')}
          </Title>
        </div>
      </div>
      <Divider className="gba:headerDivider" data-testid="expense-request-invalid-divider" />
      
      <div className="gba:validationContainer" data-testid="expense-request-invalid-validation-container">
        <h3 className="gba:validationTitle" data-testid="expense-request-invalid-validation-title">
          {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.invalid_profile_title', 'Validation Issue')}
        </h3>
        <p className="gba:validationMessage" data-testid="expense-request-invalid-validation-message">
          {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.invalid_profile_text_request', 'Code/SAP number missing in your profile. Please reach out to your administration to provide the missing data before starting an expense request.')}
        </p>
      </div>
      
      <div className="gba:footerContainer" data-testid="expense-request-invalid-footer">
        <Divider className="gba:divider" data-testid="expense-request-invalid-bottom-divider" />
        <div className="gba:actionButtonsContainer" data-testid="expense-request-invalid-actions">
          <Button 
            variant="outline" 
            className="gba:cancelButton" 
            data-testid="expense-request-invalid-cancel-button"
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
 * Expense Request Invalid component
 * @param props - Business app context props
 * @returns Expense Request Invalid component
 */
const ExpenseRequestInvalid: React.FC<BusinessAppContextProps> = () => {
  const handleCancel = () => {
        try {
          dispatchProcessContinueEvent(EVENTS.CANCEL, {event:EVENTS.ABORT,pso_exitStrategy:"abort"});
        } catch (processError) {
          showToast(
            getTranslationFromI18nKeyAndLabel("lowcoder:create_expense_type_item.error_flows_message", "Error in flow process"),
            "error"
          );
        }
  };
  
  return (
    <div className="gba:expenseRequestInvalidWrapper" data-testid="expense-request-invalid-wrapper">
      <ExpenseRequestInvalidContent onCancel={handleCancel} />
    </div>
  );
};

export default ExpenseRequestInvalid;
