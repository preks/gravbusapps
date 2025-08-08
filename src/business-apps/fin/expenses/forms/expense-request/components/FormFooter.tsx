import React from 'react';
import { Divider } from 'antd';
import { Button } from '@newwork/gravity-ui-catalog';
import { useTranslation } from 'react-i18next';

interface FormFooterProps {
  step: string;
  loading?: boolean;
  formIsValid?: boolean;
  onCancel: () => void;
  onSubmit?: () => void;
  testIdPrefix?: string;
  additionalData?: any;
}

/**
 * Footer component with cancel and submit buttons
 */
const FormFooter: React.FC<FormFooterProps> = ({ step, loading = false, formIsValid = false, onCancel, onSubmit, testIdPrefix = "expense", additionalData }) => {
  const { t } = useTranslation();
  return (
    <div className="gba:footerContainer" data-testid={`${testIdPrefix}-footer`}>
      <Divider className="gba:divider" data-testid={`${testIdPrefix}-bottom-divider`} />
      <div className="gba:actionButtonsContainer" data-testid={`${testIdPrefix}-actions`}>
        <Button 
          variant="outline" 
          className="gba:cancelButton" 
          data-testid={`${testIdPrefix}-cancel-button`}
          onClick={onCancel}
          disabled={loading}
        >
          {t('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
        </Button>
        {step === 'expense' && (
          <Button 
            variant="primary" 
            className="gba:submitButton" 
            data-testid={`${testIdPrefix}-form-submit-button`}
            onClick={onSubmit}
            disabled={loading || !formIsValid}
          >
            {t('lowcoder:create_expense_request.expense_request_container.btn_submit', 'Create')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default FormFooter;
