import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_SKILLS_DIRECTORY, GET_SKILLS_KPI, GET_SKILL_CATEGORY_SKILLS } from '../services/SkillManagementQueries'
import type { SkillDirectoryRecord } from '../types'

export interface SkillKpiData {
  totalSkills: number
  activeSkills: number
  employeesWithSkills: number
  pendingRequests: number
}

const INITIAL_KPI: SkillKpiData = {
  totalSkills: 0,
  activeSkills: 0,
  employeesWithSkills: 0,
  pendingRequests: 0
}

function getStartOfTodayIso(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

export function useSkillCatalog(accessToken?: string) {
  const graphqlClient = useGraphqlClient(accessToken)
  const [skills, setSkills] = useState<SkillDirectoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [kpi, setKpi] = useState<SkillKpiData>(INITIAL_KPI)
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})

  const fetchSkills = useCallback(async () => {
    if (!accessToken) return
    setError(null)
    try {
      const todayIso = getStartOfTodayIso()
      const [skillsResult, kpiResult, categoryResult] = await Promise.all([
        graphqlClient.request(GET_SKILLS_DIRECTORY, { limit: 500 }),
        graphqlClient.request(GET_SKILLS_KPI, { today: todayIso }),
        graphqlClient.request(GET_SKILL_CATEGORY_SKILLS)
      ])

      const loadedSkills = skillsResult?.skills ?? []
      setSkills(loadedSkills)

      setKpi({
        totalSkills: kpiResult?.totalSkills?.aggregate?.count ?? 0,
        activeSkills: kpiResult?.activeSkills?.aggregate?.count ?? 0,
        employeesWithSkills: kpiResult?.employeesWithSkills?.aggregate?.count ?? 0,
        pendingRequests: kpiResult?.pendingRequests?.aggregate?.count ?? 0
      })

      const catSkills = categoryResult?.skillCategorySkills ?? []
      const map: Record<string, string> = {}
      for (const cs of catSkills) {
        if (cs.skillId && cs.skillCategory?.name) {
          map[cs.skillId] = cs.skillCategory.name
        }
      }
      setCategoryMap(map)
    } catch (err) {
      console.error('[useSkillCatalog] Error:', err)
      setError(err instanceof Error ? err : new Error('Failed to load skills'))
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, accessToken])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  const categories = useMemo(() => {
    const unique = new Set(Object.values(categoryMap))
    return Array.from(unique).sort((left, right) => left.localeCompare(right))
  }, [categoryMap])

  return {
    skills,
    isLoading,
    error,
    kpi,
    categoryMap,
    categories,
    refetch: fetchSkills
  }
}
