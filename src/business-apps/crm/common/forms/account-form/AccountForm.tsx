import React from 'react';
import { AccountFormProvider } from './context/AccountFormContext';
import AccountFormComponent from './components/AccountFormComponent';
import { AccountFormValues } from './types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface AccountFormProps {
  initialValues?: Partial<AccountFormValues>;
  onSubmit?: (values: AccountFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
}

const AccountForm: React.FC<BusinessAppContextProps & AccountFormProps> = ({
  initialValues,
  onSubmit = async () => {},
  onCancel = async () => {},
  accessToken,
  userInfo,
  additionalData
}) => {
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: No access token found. Please ensure you are properly authenticated.
        </div>
      </div>
    );
  }

  const businessAppContext: BusinessAppContextProps = {
    accessToken,
    userInfo,
    additionalData
  };

  return (
    <AccountFormProvider
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <AccountFormComponent />
    </AccountFormProvider>
  );
};

export default AccountForm; 