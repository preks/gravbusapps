import React from 'react'
import { ContactDeletePopup as CommonContactDeletePopup } from '@/common/components/common-relations/popups/contact-delete-popup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerContact } from '@/common/data/customer/hooks/useCustomerContact'

export interface ContactDeletePopupValues {
  contactId: string
}

export interface ContactDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<ContactDeletePopupValues>
}

/**
 * CRM Contact Delete Popup
 * Uses useCustomerContact hook and passes data to common component
 */
const ContactDeletePopup: React.FC<ContactDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const contactId =
    props.additionalData?.contactId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId ||
    props.additionalData?.id ||
    initialValues?.contactId ||
    ''

  const { contact, loading, error } = useCustomerContact(props.accessToken || '', contactId)

  return (
    <CommonContactDeletePopup
      {...props}
      initialValues={initialValues}
      domain="crm"
      contact={contact}
      loading={loading}
      error={error}
    />
  )
}

export default ContactDeletePopup
export { ContactDeletePopup }
