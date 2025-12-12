import React, { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildFileUrl } from '@/common/utils/fileUtils'

interface IrmDocumentLinkChipProps {
  documentId: string
  token: string
  children: React.ReactNode
}

interface InvestmentDocumentFileInfo {
  id: string
  fileInfo?: any | null
}

interface GetInvestmentDocumentFileResponse {
  investmentDocuments_by_pk: InvestmentDocumentFileInfo | null
}

const IrmDocumentLinkChip: React.FC<IrmDocumentLinkChipProps> = ({ documentId, token, children }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)
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
            investmentDocuments_by_pk(id: $id) {
              id
              fileInfo
            }
          }
        `

        const result = await graphqlClient.request<GetInvestmentDocumentFileResponse>(query, { id: documentId })
        const doc = result?.investmentDocuments_by_pk

        if (!doc || !doc.fileInfo) {
          if (!isCancelled) {
            console.warn('[EveryAI][IrmDocumentLinkChip] Missing investment document fileInfo', {
              documentId,
              hasDoc: !!doc
            })
            setHasError(true)
          }
          return
        }

        try {
          const url = buildFileUrl(doc.fileInfo)
          if (!isCancelled) {
            setResolvedUrl(url)
          }
        } catch (err) {
          console.error('[EveryAI][IrmDocumentLinkChip] Failed to build file URL', err)
          if (!isCancelled) {
            setHasError(true)
          }
        }
      } catch (error) {
        console.error('[EveryAI][IrmDocumentLinkChip] Failed to load investment document fileInfo', error)
        if (!isCancelled) {
          setHasError(true)
        }
      }
    }

    void fetchFileInfo()

    return () => {
      isCancelled = true
    }
  }, [documentId, token, graphqlClient])

  if (!resolvedUrl || hasError) {
    // Fallback: show the original markdown text without a clickable link
    return <span>{children}</span>
  }

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

export default IrmDocumentLinkChip
