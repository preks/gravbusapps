import React, { useEffect } from 'react';
import { useContactFormContext } from '../../contact-form/context/ContactFormContext';
import { ContactFormValues } from '../../contact-form/types';

interface ContactFormChangeMonitorProps {
  onFormChange?: (values: Partial<ContactFormValues>) => void;
}

const ContactFormChangeMonitor: React.FC<ContactFormChangeMonitorProps> = ({ onFormChange }) => {
  const { formValues } = useContactFormContext();

  useEffect(() => {
    if (onFormChange) {
      onFormChange(formValues);
    }
  }, [formValues, onFormChange]);

  return null; // This component doesn't render anything
};

export default ContactFormChangeMonitor;
