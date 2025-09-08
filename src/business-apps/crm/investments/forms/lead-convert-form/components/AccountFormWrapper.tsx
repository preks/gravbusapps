import React from 'react';
import { AccountFormProvider } from '../../account-form/context/AccountFormContext';
import AccountFormComponent from '../../account-form/components/AccountFormComponent';
import FormChangeMonitor from './FormChangeMonitor';
import { AccountFormValues } from '../../account-form/types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface AccountFormWrapperProps extends BusinessAppContextProps {
  initialValues?: Partial<AccountFormValues>;
  onFormChange?: (values: Partial<AccountFormValues>) => void;
  onSubmit?: (values: AccountFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
  hideActions?: boolean;
}

const AccountFormWrapper: React.FC<AccountFormWrapperProps> = ({
  initialValues = {},
  onFormChange,
  onSubmit = async () => {},
  onCancel = async () => {},
  hideActions = true,
  accessToken,
  userInfo,
  additionalData,
}) => {
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: No access token found. Please ensure you are properly
          authenticated.
        </div>
      </div>
    );
  }

  const businessAppContext: BusinessAppContextProps = {
    accessToken,
    userInfo,
    additionalData,
  };

  return (
    <div data-testid="account-form-wrapper">
      <AccountFormProvider
        businessAppContext={businessAppContext}
        initialValues={initialValues}
        onSubmit={onSubmit}
        onCancel={onCancel}
        hideActions={hideActions}
      >
        {/* Wrap in a form element to prevent submission bubbling to parent */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Don't trigger any submission - this is just for containment
          }}
        >
          <AccountFormComponent />
        </form>
        {/* Monitor form changes inside the context */}
        <FormChangeMonitor onFormChange={onFormChange} />
      </AccountFormProvider>
    </div>
  );
};

export default AccountFormWrapper;
