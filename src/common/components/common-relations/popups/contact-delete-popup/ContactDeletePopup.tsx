import React from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { createRedirectAfterDelete } from '../utils/redirectAfterDelete'
import { renderLoadingState, renderErrorState, renderDeleteWarning } from '../utils/deletePopupHelpers'
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

const ContactDeletePopup: React.FC<ContactDeletePopupProps> = ({
  initialValues = {},
  domain = 'crm',
  contact,
  loading,
  error,
  ...props
}) => {
  const prefixDataTestId = domain === 'investments' ? 'irm-contact-delete-popup' : 'crm-contact-delete-popup'

  const contactId =
    props.additionalData?.contactId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId ||
    props.additionalData?.id ||
    initialValues?.contactId ||
    ''

  const handleSubmit = async () => {
    if (!contact) {
      throw new Error(getTranslationFromI18nKeyAndLabel('contact.delete.error.noData', 'Contact data not loaded'))
    }

    const deletePayload =
      domain === 'investments'
        ? {
            investmentContact: {
              id: contact.id,
              version: contact.version,
              isDeleted: true
            }
          }
        : {
            contact: {
              id: contact.id,
              version: contact.version,
              isDeleted: true
            }
          }

    return deletePayload
  }

  const validateForm = (): string[] | null => {
    if (!contact) {
      return [getTranslationFromI18nKeyAndLabel('contact.delete.error.noData', 'Contact data not loaded')]
    }
    return null
  }

  if (loading) {
    return renderLoadingState(prefixDataTestId, 'contact')
  }

  if (error || !contact) {
    return renderErrorState(prefixDataTestId, 'contact', error || '')
  }

  const displayName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact'
  const ownerName = contact.ownerEmployee
    ? `${contact.ownerEmployee.firstName} ${contact.ownerEmployee.lastName}`
    : getTranslationFromI18nKeyAndLabel('common.notAssigned', 'Not Assigned')

  const title =
    domain === 'investments'
      ? getTranslationFromI18nKeyAndLabel('contact.delete.title', 'Delete Investment Contact')
      : getTranslationFromI18nKeyAndLabel('contact.delete.title', 'Delete Contact')

  const confirmationQuestion =
    domain === 'investments'
      ? getTranslationFromI18nKeyAndLabel(
          'contact.delete.confirmation.question',
          'Are you sure you want to delete this investment contact?'
        )
      : getTranslationFromI18nKeyAndLabel(
          'contact.delete.confirmation.question',
          'Are you sure you want to delete this contact?'
        )

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ contactId }}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      onProcessCompletion={createRedirectAfterDelete(domain, 'contacts')}
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'title')}
          >
            {title}
          </h2>
        </div>

        {renderDeleteWarning(prefixDataTestId, confirmationQuestion, displayName, contact.createdAt, ownerName)}
      </div>
    </AppActionForm>
  )
}

export default ContactDeletePopup
export { ContactDeletePopup }
