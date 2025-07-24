import React from 'react';
import { InvestmentFormProvider } from './context/InvestmentFormContext';
import InvestmentFormComponent from './components/InvestmentFormComponent';
import { InvestmentFormValues } from './types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { saveInvestment, deleteInvestment } from './utils/apiClient';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';

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
    additionalData: { ...additionalData }
  };

  // Extract investmentId from additionalData if not provided directly
  const extractedInvestmentId = investmentId || additionalData?.investmentId || additionalData?.id;
  
  // Enhanced initial values with investmentId for updates
  const enhancedInitialValues = {
    ...initialValues,
    ...(extractedInvestmentId && { id: extractedInvestmentId })
  };
  // Handle form submission with API integration
  const handleSubmit = async (values: InvestmentFormValues) => {
    try {
      // Call the API to save the investment
      const result = await saveInvestment(values);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save investment');
      }

      // Log success


      // Call the provided onSubmit handler if available
      if (onSubmit) {
        await onSubmit(values);
      }
      
      // Prepare payload for process continuation
      const payload = {
          investment: {
            id: values.id || result.data?.id,
            ownerEmployeeId: values.ownerEmployeeId,
            name: values.name,
            accountId: values.accountId,
            initialInvestmentAmount: values.initialInvestmentAmount,
            group: values.group,
            version: values.version,
            ...result.data
          }
      };
      
      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent('pse_submit', payload);
      
    } catch (error) {
      console.error('Error saving investment:', error);
      throw error; // Re-throw to let the form context handle it
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
      
      // Call the API to delete the investment
      const result = await deleteInvestment(id, version);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete investment');
      }

      // Log success
      

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