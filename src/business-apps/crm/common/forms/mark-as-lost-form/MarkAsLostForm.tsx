import React from 'react';
import { MarkAsLostFormProvider } from './context/MarkAsLostFormContext';
import MarkAsLostFormComponent from './components/MarkAsLostFormComponent';
import { MarkAsLostFormValues } from './types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface MarkAsLostFormProps {
  onSubmit?: (values: MarkAsLostFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
}

const MarkAsLostForm: React.FC<BusinessAppContextProps & MarkAsLostFormProps> = ({
  onSubmit,
  onCancel,
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
    <MarkAsLostFormProvider
      businessAppContext={businessAppContext}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <MarkAsLostFormComponent />
    </MarkAsLostFormProvider>
  );
};

export default MarkAsLostForm; 