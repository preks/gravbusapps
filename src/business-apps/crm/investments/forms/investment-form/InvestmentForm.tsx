import React from 'react';
import { InvestmentFormProvider } from './context/InvestmentFormContext';
import InvestmentFormComponent from './components/InvestmentFormComponent';
import { InvestmentFormValues } from './types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface InvestmentFormProps {
  initialValues?: Partial<InvestmentFormValues>;
  onSubmit?: (values: InvestmentFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  investmentId?: string; // For loading existing investment data
}

const InvestmentForm: React.FC<BusinessAppContextProps & InvestmentFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  onDelete,
  investmentId,
  accessToken,
  userInfo,
  additionalData
}) => {
  if (!accessToken) {
    return (
      <div>
        <div>
          Error: No access token found. Please ensure you are properly authenticated.
        </div>
      </div>
    );
  }

  const businessAppContext: BusinessAppContextProps = {
    accessToken,
    userInfo,
    additionalData: { ...additionalData }
  };

  // Extract investmentId from additionalData if not provided directly
  const extractedInvestmentId = investmentId || additionalData?.investmentId || additionalData?.id;
  
  // Enhanced initial values with investmentId for updates
  const enhancedInitialValues = {
    ...initialValues,
    ...(extractedInvestmentId && {
      investment: {
        ...initialValues?.investment,
        id: extractedInvestmentId
      }
    })
  };
  // Handle form submission - just a pass-through for optional custom handler
  // AppActionForm handles the process event dispatching
  const handleSubmit = async (payload: any) => {
    if (onSubmit) {
      await onSubmit(payload);
    }
    // Return payload so AppActionForm can dispatch it
    return payload;
  };

  // Handle form cancellation - just a pass-through for optional custom handler
  // AppActionForm handles the process event dispatching
  const handleCancel = async () => {
    if (onCancel) {
      await onCancel();
    }
  };

  // Handle investment deletion - just a pass-through for optional custom handler
  // AppActionForm handles the process event dispatching
  const handleDelete = async (id: string) => {
    if (onDelete) {
      await onDelete(id);
    }
  };

  return (
    <InvestmentFormProvider
      businessAppContext={businessAppContext}
      initialValues={enhancedInitialValues}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onDelete={handleDelete}
    >
      <InvestmentFormComponent />
    </InvestmentFormProvider>
  );
};

export default InvestmentForm; 