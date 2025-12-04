import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GenericDeletePopup } from '../utils/GenericDeletePopup'
import type { Contact } from '@/common/data/relations/types/contactTypes'

export interface ContactDeletePopupValues {
  contactId: string
}

export interface ContactDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<ContactDeletePopupValues>
  domain?: 'crm' | 'investments'
  contact: Contact | null
  loading: boolean
  error: string | null
}

/**
 * Contact Delete Popup Component
 * Uses GenericDeletePopup for all common functionality
 */
const ContactDeletePopup: React.FC<ContactDeletePopupProps> = ({
  initialValues = {},
  domain = 'crm',
  contact,
  loading,
  error,
  ...props
}) => {
  const getDisplayName = (entity: Contact): string => {
    return `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || 'Unnamed Contact'
  }

  const getPayloadKey = (domain: 'crm' | 'investments'): string => {
    return domain === 'investments' ? 'investmentContact' : 'contact'
  }

  return (
    <GenericDeletePopup
      {...props}
      initialValues={initialValues}
      domain={domain}
      entityType="contacts"
      entityData={contact}
      loading={loading}
      error={error}
      getDisplayName={getDisplayName}
      getPayloadKey={getPayloadKey}
    />
  )
}

export default ContactDeletePopup
export { ContactDeletePopup }
