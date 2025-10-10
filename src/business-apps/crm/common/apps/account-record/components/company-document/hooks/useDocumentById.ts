import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getDocumentByIdQuery } from '../queries/getDocumentByIdQuery'

interface DocumentData {
  id: string
  additionalProperties: any
}

interface DocumentResponse {
  CrmDocument: DocumentData[]
}

export const useDocumentById = (accessToken: string, documentId: string) => {
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)
  useEffect(() => {
    console.log('useDocumentById hook effect triggered', { accessToken, documentId })

    const fetchDocument = async () => {
      if (!documentId || !accessToken || !graphQLClient) {
        console.log('Missing required parameters', {
          documentId,
          hasAccessToken: !!accessToken,
          hasClient: !!graphQLClient
        })
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log('Fetching document with ID:', documentId)
        const response = await graphQLClient.request<DocumentResponse>(getDocumentByIdQuery, {
          id: documentId
        })

        console.log('Document fetch response:', response)
        if (response?.CrmDocument?.length > 0) {
          setDocument(response.CrmDocument[0])
        } else {
          console.log('No document found with ID:', documentId)
          setDocument(null)
        }
      } catch (err) {
        console.error('Error fetching document by ID:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [documentId, accessToken, graphQLClient])

  return { document, loading, error }
}
