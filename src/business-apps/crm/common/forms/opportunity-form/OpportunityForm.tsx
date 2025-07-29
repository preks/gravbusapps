import React from 'react';
import { OpportunityFormProvider } from './context/OpportunityFormContext';
import OpportunityFormComponent from './components/OpportunityFormComponent';
import { OpportunityFormValues } from './types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface OpportunityFormProps {
  initialValues?: Partial<OpportunityFormValues>;
  onSubmit?: (values: OpportunityFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
}

const OpportunityForm: React.FC<BusinessAppContextProps & OpportunityFormProps> = ({
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
    <OpportunityFormProvider
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <OpportunityFormComponent />
    </OpportunityFormProvider>
  );
};

export default OpportunityForm; 