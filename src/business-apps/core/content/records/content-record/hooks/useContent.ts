import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ALL_CONTENTS_QUERY, QueryVariables } from '../../../apps/content-hub/queries/ContentQueries'
import { Content, ContentFormVals } from '../../../apps/content-hub/types/content.types'

export interface UseContentResult {
  isUpdating: boolean
  isMutating: boolean
  item: Content | null
  create: (values: ContentFormVals) => Promise<void>
  error: any
  contentNotFound: boolean
}

export const useContent = (contentId: string, accessToken?: string): UseContentResult => {
  const [item, setItem] = useState<Content | null>(null)
  const [isUpdating, setIsUpdating] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<any>(null)
  const [contentNotFound, setContentNotFound] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchContent = useCallback(async () => {
    if (!contentId || !accessToken) {
      setIsUpdating(false)
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      const variables: QueryVariables = {
        articleId: contentId,
        offset: 0,
        limit: 1
      }

      const query = GET_ALL_CONTENTS_QUERY(variables)
      const result = await graphqlClient.request<{
        ArticleEmployeeView: Content[]
      }>(query)

      if (result?.ArticleEmployeeView && result.ArticleEmployeeView.length > 0) {
        setItem(result.ArticleEmployeeView[0])
        setContentNotFound(false)
      } else {
        setContentNotFound(true)
      }
    } catch (err) {
      console.error('Error fetching content:', err)
      setError(err)
      setContentNotFound(true)
    } finally {
      setIsUpdating(false)
    }
  }, [contentId, accessToken, graphqlClient])

  const create = useCallback(
    async (values: ContentFormVals) => {
      setIsMutating(true)
      setError(null)

      try {
        // TODO: Implement mutation query
        // const result = await graphqlClient.request(CREATE_OR_UPDATE_CONTENT_MUTATION, values);
        console.log('Create/Update content:', values)
        await fetchContent()
      } catch (err) {
        setError(err)
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [graphqlClient, fetchContent]
  )

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  return {
    isUpdating,
    isMutating,
    item,
    create,
    error,
    contentNotFound
  }
}
