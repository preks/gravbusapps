import React, { useEffect } from 'react';
import { useOpportunityFormContext } from '../../opportunity-form/context/OpportunityFormContext';
import { InvestmentOpportunityFormValues } from '../../opportunity-form/types';

interface OpportunityFormChangeMonitorProps {
  onFormChange?: (values: Partial<InvestmentOpportunityFormValues>) => void;
}

const OpportunityFormChangeMonitor: React.FC<OpportunityFormChangeMonitorProps> = ({ onFormChange }) => {
  const { formValues } = useOpportunityFormContext();

  useEffect(() => {
    if (onFormChange) {
      onFormChange(formValues);
    }
  }, [formValues, onFormChange]);

  return null; // This component doesn't render anything
};

export default OpportunityFormChangeMonitor;
