import React, { useEffect, useRef } from 'react';
import { useOpportunityFormContext } from '../../opportunity-form/context/OpportunityFormContext';
import { InvestmentOpportunityFormValues } from '../../opportunity-form/types';

interface OpportunityFormChangeMonitorProps {
  onFormChange?: (values: Partial<InvestmentOpportunityFormValues>) => void;
}

const OpportunityFormChangeMonitor: React.FC<OpportunityFormChangeMonitorProps> = ({ onFormChange }) => {
  const { formValues } = useOpportunityFormContext();
  const previousValues = useRef<Partial<InvestmentOpportunityFormValues>>({});

  useEffect(() => {
    // Check if form values have changed
    const hasChanged = Object.keys(formValues).some(key => {
      const currentValue = formValues[key as keyof InvestmentOpportunityFormValues];
      const previousValue = previousValues.current[key as keyof InvestmentOpportunityFormValues];
      return currentValue !== previousValue;
    });

    if (hasChanged && onFormChange) {
      // Only send meaningful fields (non-empty values)
      const meaningfulValues = {} as Record<string, unknown>;
      
      // Type-safe iteration over form values
      (Object.keys(formValues) as (keyof InvestmentOpportunityFormValues)[]).forEach(key => {
        const value = formValues[key];
        
        // Runtime type guards for meaningful values
        if (typeof value === 'string') {
          if (value.trim()) {
            meaningfulValues[key] = value;
          }
        } else if (value !== undefined && value !== null) {
          meaningfulValues[key] = value;
        }
      });

      // Only call onChange if we have meaningful data
      if (Object.keys(meaningfulValues).length > 0) {
        onFormChange(meaningfulValues as Partial<InvestmentOpportunityFormValues>);
      }

      // Update previous values
      previousValues.current = { ...formValues };
    }
  }, [formValues, onFormChange]);

  return null; // This component doesn't render anything
};

export default OpportunityFormChangeMonitor;
