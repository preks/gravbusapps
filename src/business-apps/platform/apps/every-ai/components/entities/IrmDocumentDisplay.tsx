import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getOperationBadge } from './utils/displayUtils'

interface IrmDocumentDisplayProps {
  documentId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface IrmDocument {
  id: string
  name: string
  description?: string
  documentType?: string
  account?: { name: string }
  opportunity?: { name: string }
}

export const IrmDocumentDisplay: React.FC<IrmDocumentDisplayProps> = ({ documentId, accessToken, operation }) => {
  const [document, setDocument] = useState<IrmDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchDocument = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetIrmDocument($id: uuid!) {
            investmentDocuments_by_pk(id: $id) {
              id
              name
              description
              documentType
              account {
                name
              }
              opportunity {
                name
              }
            }
          }
        `

        const result = await graphqlClient.request<{ investmentDocuments_by_pk: IrmDocument }>(query, {
          id: documentId
        })

        if (result.investmentDocuments_by_pk) {
          setDocument(result.investmentDocuments_by_pk)
        } else {
          setError('IRM Document not found')
        }
      } catch (err) {
        console.error('Error fetching IRM document:', err)
        setError('Failed to load IRM document')
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
          <div className="gba:h-32 gba:bg-muted gba:rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:w-full">
        <CardContent className="gba:p-4">
          <span className="gba:text-destructive">{error}</span>
        </CardContent>
      </Card>
    )
  }

  if (!document) return null

  return (
    <Card className="gba:w-full gba:rounded-2xl" data-testid="irm-document-display">
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
            <span className="gba:text-lg gba:font-semibold">IRM Document</span>
          </div>
          {(() => {
            const operationBadge = getOperationBadge(operation)
            return operationBadge ? (
              <span
                className={`gba:text-sm gba:font-medium gba:px-2.5 gba:py-0.5 gba:rounded-xl ${
                  operationBadge.variant === 'success'
                    ? 'gba:bg-success-secondary gba:text-success'
                    : operationBadge.variant === 'destructive'
                      ? 'gba:bg-destructive-secondary gba:text-destructive'
                      : 'gba:bg-info-secondary gba:text-info'
                }`}
              >
                {operationBadge.text}
              </span>
            ) : null
          })()}
        </div>

        <div className="gba:space-y-3">
          <div>
            <div className="gba:text-foreground gba:text-base gba:font-bold">{document.name || '-'}</div>
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

          {document.account && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Linked Account</div>
              <div className="gba:text-foreground gba:text-sm">{document.account.name}</div>
            </div>
          )}

          {document.opportunity && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Linked Opportunity</div>
              <div className="gba:text-foreground gba:text-sm">{document.opportunity.name}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default IrmDocumentDisplay
