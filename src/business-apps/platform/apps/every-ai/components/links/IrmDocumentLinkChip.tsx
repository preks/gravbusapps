import React, { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildFileUrl } from '@/common/utils/fileUtils'

interface IrmDocumentLinkChipProps {
  documentId: string
  token: string
  children: React.ReactNode
  /**
   * Original href from markdown (e.g. "investment_document://<uuid>")
   * Used as a graceful fallback when file resolution fails
   */
  fallbackHref?: string
}

interface InvestmentDocumentFileInfo {
  id: string
  fileInfo?: any | null
}

interface GetInvestmentDocumentFileResponse {
  InvestmentDocumentByPk: InvestmentDocumentFileInfo | null
}

const IrmDocumentLinkChip: React.FC<IrmDocumentLinkChipProps> = ({ documentId, token, children, fallbackHref }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(token)

  useEffect(() => {
    let isCancelled = false

    const fetchFileInfo = async () => {
      if (!documentId || !token) {
        return
      }

      try {
        // Load file info for the IRM investment document so we can build a direct download URL
        const query = `
          query GetInvestmentDocumentFile($id: uuid!) {
            InvestmentDocumentByPk(id: $id) {
              id
              fileInfo
            }
          }
        `

        const result = await graphqlClient.request<GetInvestmentDocumentFileResponse>(query, { id: documentId })
        const doc = result?.InvestmentDocumentByPk

        if (!doc || !doc.fileInfo) {
          console.warn('[EveryAI][IrmDocumentLinkChip] Missing investment document fileInfo', {
            documentId,
            hasDoc: !!doc
          })
          return
        }

        try {
          const url = buildFileUrl(doc.fileInfo)
          if (!isCancelled) {
            setResolvedUrl(url)
          }
        } catch (err) {
          console.error('[EveryAI][IrmDocumentLinkChip] Failed to build file URL', err)
        }
      } catch (error) {
        console.error('[EveryAI][IrmDocumentLinkChip] Failed to load investment document fileInfo', error)
      }
    }

    void fetchFileInfo()

    return () => {
      isCancelled = true
    }
  }, [documentId, token, graphqlClient])

  // If we have a resolved URL, always use it
  if (resolvedUrl) {
    return (
      <a
        href={resolvedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="gba:text-primary gba:underline hover:gba:opacity-80"
      >
        {children}
      </a>
    )
  }

  // Graceful fallback: keep link clickable using the original custom protocol
  if (fallbackHref) {
    return (
      <a
        href={fallbackHref}
        className="gba:text-primary gba:underline hover:gba:opacity-80"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  }

  // Last resort: show plain text (should be rare)
  return <span>{children}</span>
}

export default IrmDocumentLinkChip
