import React from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { createRedirectAfterDelete } from '../utils/redirectAfterDelete'
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
 * Common Contact Delete Popup Component
 * Agnostic component that receives contact data from domain-specific wrappers
 */
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
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(prefixDataTestId, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p>{getTranslationFromI18nKeyAndLabel('contact.delete.loading', 'Loading contact...')}</p>
      </div>
    )
  }

  if (error || !contact) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription data-testid={formatDataTestId(prefixDataTestId, 'error-message')}>
            {error || getTranslationFromI18nKeyAndLabel('contact.delete.error.failed', 'Failed to load contact')}
          </AlertDescription>
        </Alert>
      </div>
    )
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

        <div
          className="gba:border gba:border-destructive gba:rounded-md gba:p-4"
          data-testid={formatDataTestId(prefixDataTestId, 'warning')}
        >
          <div className="gba:flex">
            <div className="gba:flex-shrink-0">
              <svg className="gba:h-5 gba:w-5 gba:text-destructive" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="gba:ml-3">
              <h3 className="gba:text-sm gba:font-medium gba:text-destructive">{confirmationQuestion}</h3>
              <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                <p>
                  <strong>{getTranslationFromI18nKeyAndLabel('common.name', 'Name')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {displayName}
                  </Badge>
                </p>
                <p className="gba:mt-1">
                  <strong>{getTranslationFromI18nKeyAndLabel('common.createdAt', 'Created At')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {formatDate(contact.createdAt)}
                  </Badge>
                </p>
                <p className="gba:mt-1">
                  <strong>{getTranslationFromI18nKeyAndLabel('common.owner', 'Owner')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {ownerName}
                  </Badge>
                </p>
                <p className="gba:mt-2 gba:font-medium gba:text-destructive">
                  {getTranslationFromI18nKeyAndLabel('common.deleteWarning', 'This action cannot be undone.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppActionForm>
  )
}

export default ContactDeletePopup
export { ContactDeletePopup }
