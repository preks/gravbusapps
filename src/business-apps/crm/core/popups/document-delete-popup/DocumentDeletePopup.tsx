import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  DocumentDeletePopup as CommonDocumentDeletePopup,
  type DocumentData
} from '@/common/components/common-relations/popups/document-delete-popup'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { COMMON_DOCUMENT_FIELDS } from '@/common/data/relations/queries/commonFragments'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface DocumentDeletePopupProps extends BusinessAppContextProps {
  initialValues?: any
}

/**
 * CRM DocumentDeletePopup - Wrapper Component
 *
 * Fetches CRM document data and passes it to the common presentation component.
 * - Queries CrmDocument via GraphQL
 * - Extracts documentId from additionalData
 * - Passes fetched data to common popup with payloadKey='crmDocument'
 */
const DocumentDeletePopup: React.FC<DocumentDeletePopupProps> = props => {
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(props.accessToken || '')

  const documentId =
    props.additionalData?.documentId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.documentId ||
    props.additionalData?.id ||
    props.initialValues?.documentId ||
    ''

  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId || !props.accessToken) {
        setError(
          getTranslationFromI18nKeyAndLabel(
            'document.delete.error.noId',
            'Document ID not provided or access token missing'
          )
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = `
          query GetCrmDocument($id: uuid!) {
            CrmDocument(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              ${COMMON_DOCUMENT_FIELDS}
            }
          }
        `

        const result = await graphqlClient.request<{ CrmDocument: any[] }>(query, { id: documentId })

        if (!result?.CrmDocument || result.CrmDocument.length === 0) {
          setError(getTranslationFromI18nKeyAndLabel('document.delete.error.notFound', 'Document not found'))
          setLoading(false)
          return
        }

        const doc = result.CrmDocument[0]

        setDocument({
          id: doc.id,
          version: doc.version || 0,
          name: doc.name || 'Unnamed Document',
          folder: Boolean(doc.folder),
          description: doc.description,
          documentType: doc.documentType,
          documentGroup: doc.documentGroup,
          expirationDate: doc.expirationDate
        })
        setLoading(false)
      } catch (err) {
        console.error('Error fetching CRM document:', err)
        setError(
          getTranslationFromI18nKeyAndLabel('document.delete.error.loadFailed', 'Failed to load document details')
        )
        setLoading(false)
      }
    }

    loadDocument()
  }, [documentId, props.accessToken, graphqlClient])

  return (
    <CommonDocumentDeletePopup
      {...props}
      document={document}
      payloadKey="crmDocument"
      loading={loading}
      error={error}
      data-testid="crm-document-delete-popup"
    />
  )
}

export default DocumentDeletePopup
export { DocumentDeletePopup }
