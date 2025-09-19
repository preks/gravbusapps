import React from 'react';
import { InvestmentFormProvider } from './context/InvestmentFormContext';
import InvestmentFormComponent from './components/InvestmentFormComponent';
import { InvestmentFormValues } from './types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads';

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
    ...(extractedInvestmentId && { id: extractedInvestmentId })
  };
  // Handle form submission with payload building for Kogito flow
  const handleSubmit = async (values: InvestmentFormValues) => {
    try {

      // Call the provided onSubmit handler if available
      if (onSubmit) {
        await onSubmit(values);
      }
      
      // Prepare payload for process continuation using the payload builder
      const payload = buildInvestmentPayload(
        values,
        businessAppContext,
        { isUpdate: Boolean(values.id) }
      );
      
      
      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent('pse_submit', payload);
      
    } catch (error) {
      console.error('Error building investment payload:', error);
      throw error; // Re-throw to let AppActionForm handle error display
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      // Call the provided onCancel handler if available
      if (onCancel) {
        await onCancel();
      }
      
      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent('pse_pause', null);
      
    } catch (error) {
      console.error('Error cancelling investment form:', error);
      throw error; // Re-throw to let the form context handle it
    }
  };

  // Handle investment deletion
  const handleDelete = async (id: string) => {
    try {
      // Get the current version from initial values if available
      const version = enhancedInitialValues.version;
      
      // Call the provided onDelete handler if available
      if (onDelete) {
        await onDelete(id);
      }

      // Prepare payload for process continuation
      const payload = {
        investment: {
          id,
          deleted: true,
          version
        }
      };
      
      
      // Dispatch process continue event on successful deletion
      dispatchProcessContinueEvent('pse_submit', payload);
      
    } catch (error) {
      console.error('Error deleting investment:', error);
      throw error; // Re-throw to let the form context handle it
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