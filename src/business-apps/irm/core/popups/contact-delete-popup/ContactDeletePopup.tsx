import React, { useEffect } from 'react'
import { ContactDeletePopup as CommonContactDeletePopup } from '@/common/components/common-relations/popups/contact-delete-popup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentContact } from '@/common/data/investment/hooks/useInvestmentContact'
import { navigateTo } from '@/common/utils/navigationUtils'

export interface ContactDeletePopupValues {
  contactId: string
}

export interface ContactDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<ContactDeletePopupValues>
}

/**
 * IRM Contact Delete Popup
 * Uses useInvestmentContact hook and passes data to common component
 */
const ContactDeletePopup: React.FC<ContactDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const contactId =
    props.additionalData?.contactId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId ||
    props.additionalData?.id ||
    initialValues?.contactId ||
    ''

  const { contact, loading, error } = useInvestmentContact(props.accessToken || '', contactId)

  useEffect(() => {
    const handleProcessComplete = (e: Event) => {
      if ((e as CustomEvent)?.detail?.resolution === 'success') {
        navigateTo('/platform/irm/investment-relations?view=contacts')
      }
    }
    window.addEventListener('com.newwork.process.processCompletion', handleProcessComplete)
    return () => window.removeEventListener('com.newwork.process.processCompletion', handleProcessComplete)
  }, [])

  return (
    <CommonContactDeletePopup
      {...props}
      initialValues={initialValues}
      domain="investments"
      contact={contact}
      loading={loading}
      error={error}
    />
  )
}

export default ContactDeletePopup
export { ContactDeletePopup }
