import { useCallback, useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeRecordSkillCategory {
  id: string
  name: string
  description?: string | null
  isDeleted?: boolean
  version?: number
}

const GET_SKILL_CATEGORIES = `
query GetSkillCategories {
  skillCategories: SkillCategory(
    where: { isDeleted: { _eq: false } }
    orderBy: { name: ASC }
  ) {
    id
    name
    description
    isDeleted
    version
  }
}
`

export function useSkillCategories(accessToken?: string) {
  const graphqlClient = useGraphqlClient(accessToken)
  const [categories, setCategories] = useState<EmployeeRecordSkillCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCategories = useCallback(async () => {
    if (!accessToken) {
      setCategories([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<{ skillCategories?: EmployeeRecordSkillCategory[] }>(
        GET_SKILL_CATEGORIES
      )
      setCategories(result?.skillCategories ?? [])
    } catch (err) {
      console.error('[useEmployeeRecordSkillCategories] Error:', err)
      setError(err instanceof Error ? err : new Error('Failed to load skill categories'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories
  }
}
