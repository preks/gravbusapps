import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_CONTENT_TAGS_QUERY } from '../queries/ContentQueries'

export interface SelectOption {
  id: string
  name: string
  value: string
}

interface FetchTagsData {
  Tag: { id: number; tag: string }[]
}

export interface UseContentTagsResult {
  tags: SelectOption[]
  isLoading: boolean
  error: any
  rawData: { id: number; tag: string }[]
  refetch: () => void
}

export const useContentTags = (accessToken?: string): UseContentTagsResult => {
  const [tags, setTags] = useState<SelectOption[]>([])
  const [rawData, setRawData] = useState<{ id: number; tag: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchTags = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<FetchTagsData>(GET_CONTENT_TAGS_QUERY, {})

      const tagList = result?.Tag || []
      setRawData(tagList)

      // Convert tag data to the format expected by SelectFormField component
      const formattedTags = tagList.map(tag => ({
        id: tag.id.toString(),
        name: tag.tag,
        value: tag.id.toString()
      }))

      setTags(formattedTags)
    } catch (err) {
      setError(err)
      setTags([])
      setRawData([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  return {
    tags,
    isLoading,
    error,
    rawData,
    refetch: fetchTags
  }
}
