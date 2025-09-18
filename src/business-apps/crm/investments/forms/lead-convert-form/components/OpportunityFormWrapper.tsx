import React from 'react';
import { OpportunityFormProvider } from '../../opportunity-form/context/OpportunityFormContext';
import OpportunityFormComponent from '../../opportunity-form/components/OpportunityFormComponent';
import OpportunityFormChangeMonitor from './OpportunityFormChangeMonitor';
import { InvestmentOpportunityFormValues } from '../../opportunity-form/types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface OpportunityFormWrapperProps extends BusinessAppContextProps {
  initialValues?: Partial<InvestmentOpportunityFormValues>;
  onFormChange?: (values: Partial<InvestmentOpportunityFormValues>) => void;
  onSubmit?: (values: InvestmentOpportunityFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
  hideActions?: boolean;
}

const OpportunityFormWrapper: React.FC<OpportunityFormWrapperProps> = ({
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
    <div data-testid="opportunity-form-wrapper">
      <OpportunityFormProvider
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
          <OpportunityFormComponent />
        </form>
        {/* Monitor form changes inside the context */}
        <OpportunityFormChangeMonitor onFormChange={onFormChange} />
      </OpportunityFormProvider>
    </div>
  );
};

export default OpportunityFormWrapper;
