import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_SKILL_DETAILS, GET_EMPLOYEES_WITH_SKILL } from '../services/SkillManagementQueries'
import type { SkillRecord, EmployeeSkillRecord } from '../types'

export function useSkillDetails(skillId: string | null, accessToken?: string) {
  const graphqlClient = useGraphqlClient(accessToken)
  const [skill, setSkill] = useState<SkillRecord | null>(null)
  const [employees, setEmployees] = useState<EmployeeSkillRecord[]>([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSkill = useCallback(
    async (id: string) => {
      if (!accessToken) return
      try {
        setIsLoading(true)
        setError(null)
        const [skillResult, employeesResult] = await Promise.all([
          graphqlClient.request(GET_SKILL_DETAILS, { skillId: id }),
          graphqlClient.request(GET_EMPLOYEES_WITH_SKILL, { skillId: id, limit: 20, offset: 0 })
        ])
        setSkill(skillResult?.skill ?? null)
        setEmployees(employeesResult?.employeeSkills ?? [])
        setTotalEmployees(employeesResult?.employeeSkillsAggregate?.aggregate?.count ?? 0)
      } catch (err) {
        console.error('[useSkillDetails] Error:', err)
        setError(err instanceof Error ? err : new Error('Failed to load skill details'))
      } finally {
        setIsLoading(false)
      }
    },
    [graphqlClient, accessToken]
  )

  const fetchEmployeesOnly = useCallback(
    async (id: string, offset: number, limit = 20) => {
      if (!accessToken) return
      try {
        setIsLoading(true)
        const result = await graphqlClient.request(GET_EMPLOYEES_WITH_SKILL, { skillId: id, limit, offset })
        const newEmployees = result?.employeeSkills ?? []
        setEmployees(prev => (offset === 0 ? newEmployees : [...prev, ...newEmployees]))
        setTotalEmployees(result?.employeeSkillsAggregate?.aggregate?.count ?? 0)
      } catch (err) {
        console.error('[useSkillDetails] Pagination error:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [graphqlClient, accessToken]
  )

  useEffect(() => {
    if (skillId) {
      fetchSkill(skillId)
    } else {
      setSkill(null)
      setEmployees([])
      setTotalEmployees(0)
    }
  }, [skillId, fetchSkill])

  const refetch = useCallback(() => {
    if (skillId) fetchSkill(skillId)
  }, [skillId, fetchSkill])

  const loadMoreEmployees = useCallback(
    (offset: number, limit = 20) => {
      if (skillId) fetchEmployeesOnly(skillId, offset, limit)
    },
    [skillId, fetchEmployeesOnly]
  )

  return {
    skill,
    employees,
    totalEmployees,
    isLoading,
    error,
    refetch,
    loadMoreEmployees
  }
}
