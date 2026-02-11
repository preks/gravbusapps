import React from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface DocumentDeletePopupProps extends BusinessAppContextProps {
  // Required
  document: DocumentData | null
  payloadKey: string // e.g., 'crmDocument', 'investmentDocument'
  loading?: boolean
  error?: string | null

  // Optional customization
  itemTitle?: string // Override document name
  customMessage?: string
  onSuccess?: () => void
  'data-testid'?: string
}

export interface DocumentData {
  id: string
  version: number
  name: string
  folder: boolean
  description?: string
  documentGroup?: {
    id: string
    value: string
    code?: string
  }
  documentType?: {
    id: string
    value: string
    code?: string
  }
  expirationDate?: string
}

const prefixDataTestId = 'document-delete-popup'

/**
 * Generic Document Delete Popup (Presentation Component)
 *
 * Pure presentation component for deleting documents/folders.
 * - NO GraphQL logic - wrappers handle data fetching
 * - Accepts document data and payloadKey as props
 * - Differentiates between folders and files
 * - Routes deletion through Flow Registry via AppActionForm
 *
 * This component is used by CRM and IRM wrappers that fetch their own data.
 */
const DocumentDeletePopup: React.FC<DocumentDeletePopupProps> = ({
  document,
  payloadKey,
  loading = false,
  error = null,
  itemTitle,
  customMessage,
  onSuccess,
  'data-testid': dataTestId = prefixDataTestId,
  ...props
}) => {
  const handleSubmit = async () => {
    if (!document) {
      throw new Error(getTranslationFromI18nKeyAndLabel('document.delete.error.noData', 'Document data not loaded'))
    }

    // Build the delete payload dynamically using the provided payloadKey
    const deletePayload = {
      [payloadKey]: {
        id: document.id,
        version: document.version,
        isDeleted: true
      }
    }

    return deletePayload
  }

  const validateForm = (): string[] | null => {
    if (!document) {
      return [getTranslationFromI18nKeyAndLabel('document.delete.error.noData', 'Document data not loaded')]
    }
    return null
  }

  if (loading) {
    return (
      <div
        className="gba:p-6 gba:flex gba:items-center gba:justify-center"
        data-testid={formatDataTestId(dataTestId, 'loading')}
      >
        <Spinner size="md" />
        <span className="gba:ml-2">{getTranslationFromI18nKeyAndLabel('common.loading', 'Loading...')}</span>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(dataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription data-testid={formatDataTestId(dataTestId, 'error-message')}>
            {error || getTranslationFromI18nKeyAndLabel('document.delete.error.notFound', 'Document not found')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const itemType = document.folder ? 'folder' : 'document'
  const displayTitle = itemTitle || document.name
  const displayMessage =
    customMessage ||
    getTranslationFromI18nKeyAndLabel(
      `${itemType}.delete.confirmation.question`,
      `Are you sure you want to delete this ${itemType}?`
    )

  return (
    <AppActionForm
      {...props}
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ documentId: document.id }}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      onSuccess={onSuccess}
      data-testid={formatDataTestId(dataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(dataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold gba:mb-2" data-testid={formatDataTestId(dataTestId, 'title')}>
            {getTranslationFromI18nKeyAndLabel(
              `${itemType}.delete.title`,
              `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`
            )}
          </h2>
        </div>

        <div
          className="gba:border gba:border-destructive gba:rounded-md gba:p-4"
          data-testid={formatDataTestId(dataTestId, 'warning')}
        >
          <div className="gba:flex">
            <div className="gba:shrink-0">
              <svg className="gba:h-5 gba:w-5 gba:text-destructive" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="gba:ml-3">
              <h3 className="gba:text-sm gba:font-medium gba:text-destructive">{displayMessage}</h3>
              <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                <p>
                  <strong>{getTranslationFromI18nKeyAndLabel('common.name', 'Name')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {displayTitle}
                  </Badge>
                </p>
                {document.description && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('common.description', 'Description')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {document.description.length > 50
                        ? `${document.description.substring(0, 50)}...`
                        : document.description}
                    </Badge>
                  </p>
                )}
                {!document.folder && document.documentType && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('document.type', 'Document Type')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {document.documentType.value}
                    </Badge>
                  </p>
                )}
                {!document.folder && document.documentGroup && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('document.group', 'Document Group')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {document.documentGroup.value}
                    </Badge>
                  </p>
                )}
                {!document.folder && document.expirationDate && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('document.expirationDate', 'Expiration Date')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {new Date(document.expirationDate).toLocaleDateString()}
                    </Badge>
                  </p>
                )}
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

export default DocumentDeletePopup
export { DocumentDeletePopup }
