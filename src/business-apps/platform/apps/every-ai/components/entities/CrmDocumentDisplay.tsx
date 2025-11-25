import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

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

  if (isLoading) {
    return (
      <Card className="gba:w-full gba:animate-pulse">
        <CardContent className="gba:p-4">
          <div className="gba:h-24 gba:bg-muted gba:rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:w-full">
        <CardContent className="gba:p-4">
          <p className="gba:text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!document) return null

  return (
    <Card className="gba:w-full gba:rounded-2xl" data-testid="crm-document-display">
      <CardContent className="gba:p-6">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            <svg className="gba:h-5 gba:w-5 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span className="gba:text-lg gba:font-semibold">Document</span>
          </div>
          {operation && (
            <span
              className={`gba:text-sm gba:font-medium gba:px-2.5 gba:py-0.5 gba:rounded-xl gba:capitalize ${
                operation === 'create'
                  ? 'gba:bg-success-secondary gba:text-success'
                  : 'gba:bg-info-secondary gba:text-info'
              }`}
            >
              {operation}
            </span>
          )}
        </div>

        <div className="gba:space-y-3">
          <div>
            <div className="gba:text-foreground gba:text-base gba:font-bold">{document.name}</div>
          </div>

          {document.description && (
            <div>
              <div className="gba:text-foreground gba:text-sm">{document.description}</div>
            </div>
          )}

          {document.documentType && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Type</div>
              <div className="gba:text-foreground gba:text-sm">{document.documentType}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default CrmDocumentDisplay
