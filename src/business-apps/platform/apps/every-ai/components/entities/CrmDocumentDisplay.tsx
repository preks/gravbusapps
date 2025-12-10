import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getOperationBadge } from './utils/displayUtils'

interface CrmDocumentDisplayProps {
  documentId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface CrmDocument {
  id: string
  name: string
  description?: string
  documentType?: string
  createdAt: string
}

export const CrmDocumentDisplay: React.FC<CrmDocumentDisplayProps> = ({ documentId, accessToken, operation }) => {
  const [document, setDocument] = useState<CrmDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchDocument = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetCrmDocument($id: uuid!) {
            customerDocuments_by_pk(id: $id) {
              id
              name
              description
              documentType
              createdAt
            }
          }
        `

        const result = await graphqlClient.request<{ customerDocuments_by_pk: CrmDocument }>(query, { id: documentId })

        if (result.customerDocuments_by_pk) {
          setDocument(result.customerDocuments_by_pk)
        } else {
          setError('Document not found')
        }
      } catch (err) {
        console.error('Error fetching document:', err)
        setError('Failed to load document')
      } finally {
        setIsLoading(false)
      }
    }

    if (documentId && accessToken) {
      fetchDocument()
    }
  }, [documentId, accessToken, graphqlClient])

  const operationBadge = getOperationBadge(operation)

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-primary-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    </div>
  )

  return (
    <EntityCard
      title={document?.name || 'Document'}
      subtitle={document?.documentType}
      description={document?.description}
      icon={icon}
      status={operationBadge?.text}
      statusVariant={operationBadge?.variant}
      fields={
        document?.createdAt
          ? [{ label: 'Created', value: new Date(document.createdAt).toLocaleDateString() }]
          : undefined
      }
      isLoading={isLoading}
      error={error || undefined}
      data-testid="crm-document-display"
    />
  )
}

export default CrmDocumentDisplay
