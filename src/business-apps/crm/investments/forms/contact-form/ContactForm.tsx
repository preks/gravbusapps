import React from 'react';
import { ContactFormProvider } from './context/ContactFormContext';
import ContactFormComponent from './components/ContactFormComponent';
import { ContactFormValues } from './types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface ContactFormProps {
  initialValues?: Partial<ContactFormValues>;
  onSubmit?: (values: ContactFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
  hideActions?: boolean; // Hide submit/cancel buttons when embedded
}

const ContactForm: React.FC<BusinessAppContextProps & ContactFormProps> = ({
  initialValues,
  onSubmit = async () => {},
  onCancel = async () => {},
  hideActions = false,
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
    <ContactFormProvider
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
      hideActions={hideActions}
    >
      <ContactFormComponent />
    </ContactFormProvider>
  );
};

export default ContactForm;
