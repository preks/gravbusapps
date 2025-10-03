import React, { useEffect, useRef } from 'react';
import { useContactFormContext } from '../../contact-form/context/ContactFormContext';
import { ContactFormValues } from '../../contact-form/types';

interface ContactFormChangeMonitorProps {
  onFormChange?: (values: Partial<ContactFormValues>) => void;
}

const ContactFormChangeMonitor: React.FC<ContactFormChangeMonitorProps> = ({ onFormChange }) => {
  const { formValues } = useContactFormContext();
  const previousValues = useRef<Partial<ContactFormValues>>({});

  useEffect(() => {
    // Check if form values have changed
    const hasChanged = Object.keys(formValues).some(key => {
      const currentValue = formValues[key as keyof ContactFormValues];
      const previousValue = previousValues.current[key as keyof ContactFormValues];
      return currentValue !== previousValue;
    });

    if (hasChanged && onFormChange) {
      // Only send meaningful fields (non-empty values)
      const meaningfulValues = {} as Record<string, unknown>;
      
      // Type-safe iteration over form values
      (Object.keys(formValues) as (keyof ContactFormValues)[]).forEach(key => {
        const value = formValues[key];
        
        // Runtime type guards for meaningful values
        if (value && typeof value === 'string' && value.trim()) {
          meaningfulValues[key] = value;
        } else if (value !== null && value !== undefined && typeof value !== 'string') {
          meaningfulValues[key] = value;
        }
      });

      // Only call onChange if we have meaningful data
      if (Object.keys(meaningfulValues).length > 0) {
        onFormChange(meaningfulValues as Partial<ContactFormValues>);
      }

      // Update previous values
      previousValues.current = { ...formValues };
    }
  }, [formValues, onFormChange]);

  return null; // This component doesn't render anything
};

export default ContactFormChangeMonitor;
