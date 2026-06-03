import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerContact } from '@/common/data/customer/hooks/useCustomerContact'
import {
  ComplianceUpdatePopup,
  extractEntityId
} from '@/common/components/common-relations/popups/compliance-update-popup'

const popupTestId = 'contact-compliance-update-popup'

export interface ContactComplianceUpdatePopupProps extends BusinessAppContextProps {
  initialValues?: {
    contactId?: string
  }
}

const ContactComplianceUpdatePopup: React.FC<ContactComplianceUpdatePopupProps> = ({ initialValues, ...props }) => {
  const contactId = useMemo(
    () =>
      extractEntityId({
        additionalData: props.additionalData,
        initialId: initialValues?.contactId,
        idKeys: ['contactId']
      }),
    [props.additionalData, initialValues?.contactId]
  )

  const { contact, loading, error } = useCustomerContact(props.accessToken || '', contactId)

  return (
    <ComplianceUpdatePopup
      {...props}
      entityType="contact"
      entityId={contactId}
      entity={contact}
      loading={loading}
      error={error}
      popupTestId={popupTestId}
    />
  )
}

ContactComplianceUpdatePopup.displayName = 'ContactComplianceUpdatePopup'

export default ContactComplianceUpdatePopup
export { ContactComplianceUpdatePopup }
