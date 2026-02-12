/**
 * IRM DocumentDeletePopup - Wrapper Component
 *
 * Fetches IRM document data and passes it to the common presentation component.
 * - Queries InvestmentDocument via GraphQL
 * - Extracts documentId from additionalData
 * - Passes fetched data to common popup with payloadKey='investmentDocument'
 */

import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  DocumentDeletePopup as CommonDocumentDeletePopup,
  type DocumentData
} from '@/common/components/common-relations/popups/document-delete-popup'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { INVESTMENT_DOCUMENT_REF } from '@/common/data/investment/queries/fragments/investmentReferenceFragments'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type InvestmentDocumentEntityType = 'account' | 'contact' | 'lead' | 'opportunity' | 'investment'

export interface DocumentDeletePopupValues {
  documentId: string
}

export interface DocumentDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<DocumentDeletePopupValues>
}

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
          query GetInvestmentDocument($id: uuid!) {
            InvestmentDocument(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              ${INVESTMENT_DOCUMENT_REF}
            }
          }
        `

        const result = await graphqlClient.request<{ InvestmentDocument: any[] }>(query, { id: documentId })

        if (!result?.InvestmentDocument || result.InvestmentDocument.length === 0) {
          setError(getTranslationFromI18nKeyAndLabel('document.delete.error.notFound', 'Document not found'))
          setLoading(false)
          return
        }

        const doc = result.InvestmentDocument[0]

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
        console.error('Error fetching IRM document:', err)
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
      payloadKey="investmentDocument"
      loading={loading}
      error={error}
      data-testid="irm-document-delete-popup"
    />
  )
}

export default DocumentDeletePopup
export { DocumentDeletePopup }
