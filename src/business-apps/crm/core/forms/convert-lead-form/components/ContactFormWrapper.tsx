import React, { useMemo } from 'react'
import { ContactFormProvider } from '../../contact-form/context/ContactFormContext'
import ContactFormComponent from '../../contact-form/components/ContactFormComponent'
import ContactFormChangeMonitor from './ContactFormChangeMonitor'
import { ContactFormValues } from '../../contact-form/types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface ContactFormWrapperProps extends BusinessAppContextProps {
  initialValues?: Partial<ContactFormValues>
  onFormChange?: (values: Partial<ContactFormValues>) => void
  onSubmit?: (values: ContactFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  hideActions?: boolean
}

const ContactFormWrapper: React.FC<ContactFormWrapperProps> = ({
  initialValues = {},
  onFormChange,
  onSubmit = async () => {},
  onCancel = async () => {},
  hideActions = true,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Memoize businessAppContext to prevent unnecessary re-renders - must be before early return
  const businessAppContext: BusinessAppContextProps = useMemo(
    () => ({
      accessToken,
      userInfo,
      additionalData
    }),
    [accessToken, userInfo, additionalData]
  )

  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: No access token found. Please ensure you are properly authenticated.
        </div>
      </div>
    )
  }

  return (
    <div data-testid="contact-form-wrapper">
      <ContactFormProvider
        businessAppContext={businessAppContext}
        initialValues={initialValues}
        onSubmit={onSubmit}
        onCancel={onCancel}
        hideActions={hideActions}
      >
        <ContactFormComponent />
        <ContactFormChangeMonitor onFormChange={onFormChange} />
      </ContactFormProvider>
    </div>
  )
}

export default ContactFormWrapper
