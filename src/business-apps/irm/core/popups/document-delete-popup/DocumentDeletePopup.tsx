import React, { useMemo, useState, useEffect } from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type InvestmentDocumentEntityType = 'account' | 'contact' | 'lead' | 'opportunity' | 'investment'

export interface DocumentDeletePopupValues {
  documentId: string
}

export interface DocumentDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<DocumentDeletePopupValues>
}

interface DocumentData {
  id: string
  name: string
  format: 'FILE' | 'FOLDER'
  description?: string
  entityType: InvestmentDocumentEntityType
  entityId: string
}

const prefixDataTestId = 'DocumentDeletePopup'

const DocumentDeletePopup: React.FC<DocumentDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(props.accessToken || '')

  // Extract document ID from context
  const documentId = useMemo(() => {
    const src = { ...(props as any), ...(initialValues as any) } as any
    const ad = src?.additionalData || {}
    const payload =
      ad?.payload ||
      ad?.psi_taskPayload?.psi_initialParameters?.payload ||
      ad?.psi_taskPayload?.initialParameters?.payload ||
      {}
    const docFromAd =
      ad?.investmentDocument ||
      ad?.psi_taskPayload?.psi_initialParameters?.investmentDocument ||
      ad?.psi_taskPayload?.initialParameters?.investmentDocument ||
      payload?.investmentDocument

    return (
      src?.documentId ||
      src?.investmentDocumentId ||
      docFromAd?.id ||
      payload?.documentId ||
      payload?.investmentDocumentId ||
      ''
    )
  }, [initialValues, props])

  // Load document data
  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId || !props.accessToken) {
        setError('Document ID not provided or access token missing')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = `
          query GetInvestmentDocument($id: uuid!) {
            InvestmentDocument(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              id
              name
              folder
              description
              account {
                id
              }
              contact {
                id
              }
              lead {
                id
              }
              opportunity {
                id
              }
              investment {
                id
              }
            }
          }
        `

        const result = await graphqlClient.request<{ InvestmentDocument: any[] }>(query, { id: documentId })

        if (!result?.InvestmentDocument || result.InvestmentDocument.length === 0) {
          setError('Document not found')
          return
        }

        const doc = result.InvestmentDocument[0]

        // Determine entity type and ID
        let entityType: InvestmentDocumentEntityType = 'account'
        let entityId = ''

        if (doc.account?.id) {
          entityType = 'account'
          entityId = doc.account.id
        } else if (doc.contact?.id) {
          entityType = 'contact'
          entityId = doc.contact.id
        } else if (doc.lead?.id) {
          entityType = 'lead'
          entityId = doc.lead.id
        } else if (doc.opportunity?.id) {
          entityType = 'opportunity'
          entityId = doc.opportunity.id
        } else if (doc.investment?.id) {
          entityType = 'investment'
          entityId = doc.investment.id
        }

        setDocument({
          id: doc.id,
          name: doc.name || 'Unnamed Document',
          format: doc.folder ? 'FOLDER' : 'FILE',
          description: doc.description,
          entityType,
          entityId
        })
      } catch (err) {
        console.error('Failed to load document:', err)
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    loadDocument()
  }, [documentId, props.accessToken, graphqlClient])

  // Submit handler for deletion
  const handleSubmit = async () => {
    if (!document) {
      throw new Error('Document data not loaded')
    }

    // Prepare payload for process submission
    const entityIdKey = (() => {
      switch (document.entityType) {
        case 'account':
          return 'accountId'
        case 'contact':
          return 'contactId'
        case 'lead':
          return 'leadId'
        case 'opportunity':
          return 'opportunityId'
        case 'investment':
          return 'investmentId'
        default:
          return 'accountId'
      }
    })()

    const deletePayload = {
      [entityIdKey]: document.entityId,
      documentId: document.id,
      investmentDocument: {
        id: document.id,
        name: document.name,
        format: document.format,
        isDeleted: true
      }
    }

    return deletePayload
  }

  // Validation function
  const validateForm = (): string[] | null => {
    if (!document) {
      return ['Document data not loaded']
    }
    return null
  }

  const itemType = document?.format === 'FOLDER' ? 'folder' : 'file'
  const title = `Delete ${itemType === 'folder' ? 'Folder' : 'Document'}`

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(prefixDataTestId, 'loading')}>
        <div className="gba:animate-spin gba:h-8 gba:w-8 gba:border-4 gba:border-gray-300 gba:border-t-blue-600 gba:rounded-full gba:mx-auto gba:mb-4"></div>
        <p>Loading document...</p>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
        <div className="gba:text-red-600 gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold gba:mb-2">Error</h2>
          <p>{error || 'Failed to load document'}</p>
        </div>
      </div>
    )
  }

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ documentId }}
      validateForm={validateForm}
      submitButtonText="Delete"
      submitButtonVariant="destructive"
      businessAppContext={props}
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'Title')}
          >
            {title}
          </h2>
        </div>

        <div
          className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4"
          data-testid={formatDataTestId(prefixDataTestId, 'warning')}
        >
          <div className="gba:flex">
            <div className="gba:flex-shrink-0">
              <svg className="gba:h-5 gba:w-5 gba:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="gba:ml-3">
              <h3 className="gba:text-sm gba:font-medium gba:text-red-800">
                Are you sure you want to delete this {itemType}?
              </h3>
              <div className="gba:mt-2 gba:text-sm gba:text-red-700">
                <p>
                  <strong>Name:</strong> {document.name}
                </p>
                {document.description && (
                  <p className="gba:mt-1">
                    <strong>Description:</strong> {document.description}
                  </p>
                )}
                <p className="gba:mt-2 gba:font-medium">This action cannot be undone.</p>
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
