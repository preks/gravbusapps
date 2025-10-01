import React from 'react';
import { Spinner, WizardFormStep } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import AccountFormWrapper from './AccountFormWrapper';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AccountFormValues } from '../account-form/types';

interface CreateAccountStepProps extends BusinessAppContextProps {
  loading: boolean;
  leadData: any;
  actualLeadId: string;
  accountInitialValues: Partial<AccountFormValues>;
  onFormChange: (values: Partial<AccountFormValues>) => void;
  onSubmit: (values: AccountFormValues) => Promise<void>;
}

export const CreateAccountStep: React.FC<CreateAccountStepProps> = ({
  accessToken,
  userInfo,
  additionalData,
  loading,
  leadData,
  actualLeadId,
  accountInitialValues,
  onFormChange,
  onSubmit,
}) => {
  return (
    <WizardFormStep>
      <div data-testid="convert-lead-create-account-step">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
          {getTranslationFromI18nKeyAndLabel("crm:convertLead.createAccountDetails", "Create Account Details")}
        </h3>
        
        {loading ? (
          <div className="gba:flex gba:justify-center gba:py-8">
            <Spinner size="lg" />
            <span className="gba:ml-2">Loading lead data...</span>
          </div>
        ) : (
          (() => {
            
            return (
              <AccountFormWrapper
                key={`account-form-${actualLeadId}-${leadData?.id || 'no-data'}`}
                accessToken={accessToken}
                userInfo={userInfo}
                additionalData={{ 
                  ...additionalData, 
                  isLeadConversion: true, // Flag to prevent auto-selection of current user
                  leadOwnerId: leadData?.ownerEmployeeId // Explicit lead owner for context
                }}
                initialValues={accountInitialValues}
                onFormChange={onFormChange}
                onSubmit={onSubmit}
                data-testid="account-form-wrapper"
              />
            );
          })()
        )}
      </div>
    </WizardFormStep>
  );
};
