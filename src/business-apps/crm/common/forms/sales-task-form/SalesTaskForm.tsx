import React from 'react';
import { SalesTaskFormProvider } from './context/SalesTaskFormContext';
import SalesTaskFormComponent from './components/SalesTaskFormComponent';
import { SalesTaskFormValues } from './types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface SalesTaskFormProps {
  initialValues?: Partial<SalesTaskFormValues>;
  onSubmit?: (values: SalesTaskFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
  taskData?: any;
  isApprovalRequest?: boolean;
}

const SalesTaskForm: React.FC<BusinessAppContextProps & SalesTaskFormProps> = ({
  initialValues,
  onSubmit = async () => {},
  onCancel = async () => {},
  taskData,
  isApprovalRequest = false,
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
    additionalData: {
      ...additionalData,
      isApprovalRequest
    }
  };

  return (
    <SalesTaskFormProvider
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
      taskData={taskData}
    >
      <SalesTaskFormComponent />
    </SalesTaskFormProvider>
  );
};

export default SalesTaskForm; 