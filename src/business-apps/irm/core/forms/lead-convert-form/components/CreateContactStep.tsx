import React from 'react'
import { Spinner, WizardFormStep } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import ContactFormWrapper from './ContactFormWrapper'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContactFormValues } from '../contact-form/types'

interface CreateContactStepProps extends BusinessAppContextProps {
  loading: boolean
  leadData: any
  actualLeadId: string
  contactInitialValues: Partial<ContactFormValues>
  onFormChange: (values: Partial<ContactFormValues>) => void
  onSubmit: (values: ContactFormValues) => Promise<void>
}

export const CreateContactStep: React.FC<CreateContactStepProps> = ({
  accessToken,
  userInfo,
  additionalData,
  loading,
  leadData,
  actualLeadId,
  contactInitialValues,
  onFormChange,
  onSubmit
}) => {
  return (
    <WizardFormStep>
      <div data-testid="convert-lead-create-contact-step">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
          {getTranslationFromI18nKeyAndLabel('crm:convertLead.createContactDetails', 'Create Contact Details')}
        </h3>

        {loading ? (
          <div className="gba:flex gba:justify-center gba:py-8">
            <Spinner size="lg" />
            <span className="gba:ml-2">Loading lead data...</span>
          </div>
        ) : (
          (() => {
            return (
              <ContactFormWrapper
                key={`contact-form-${actualLeadId}-${leadData?.id || 'no-data'}`}
                accessToken={accessToken}
                userInfo={userInfo}
                additionalData={{
                  ...additionalData,
                  isLeadConversion: true, // Flag to prevent auto-selection of current user
                  leadOwnerId: leadData?.ownerEmployeeId // Explicit lead owner for context
                }}
                initialValues={contactInitialValues}
                onFormChange={onFormChange}
                onSubmit={onSubmit}
                data-testid="contact-form-wrapper"
              />
            )
          })()
        )}
      </div>
    </WizardFormStep>
  )
}
