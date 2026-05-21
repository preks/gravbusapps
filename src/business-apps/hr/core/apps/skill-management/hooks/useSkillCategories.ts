import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_SKILL_CATEGORIES, GET_SKILL_CATEGORY_SKILLS } from '../services/SkillManagementQueries'
import type { SkillCategoryWithCount } from '../types'

export function useSkillCategories(accessToken?: string) {
  const graphqlClient = useGraphqlClient(accessToken)
  const [categories, setCategories] = useState<SkillCategoryWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCategories = useCallback(async () => {
    if (!accessToken) return
    setError(null)
    try {
      const [catResult, countResult] = await Promise.all([
        graphqlClient.request(GET_SKILL_CATEGORIES),
        graphqlClient.request(GET_SKILL_CATEGORY_SKILLS)
      ])
      const raw = catResult?.skillCategories ?? []
      const countLinks = countResult?.skillCategorySkills ?? []

      const countMap: Record<string, number> = {}
      for (const link of countLinks) {
        countMap[link.skillCategoryId] = (countMap[link.skillCategoryId] ?? 0) + 1
      }

      setCategories(
        raw.map((cat: SkillCategoryWithCount) => ({
          ...cat,
          skillCount: countMap[cat.id] ?? 0
        }))
      )
    } catch (err) {
      console.error('[useSkillCategories] Error:', err)
      setError(err instanceof Error ? err : new Error('Failed to load categories'))
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, accessToken])

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
