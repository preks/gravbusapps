import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeSkill {
  id: string
  level: string | null
  isDeleted: boolean
  skill: {
    id: string
    name: string
  }
}

const GET_EMPLOYEE_SKILLS = (employeeId: string) => `
  query GetEmployeeSkills {
    Employee(where: { id: { _eq: "${employeeId}" } }, limit: 1) {
      id
      skills(where: { isDeleted: { _eq: false } }) {
        id
        level
        isDeleted
        skill {
          id
          name
        }
      }
    }
  }
`

interface EmployeeSkillsResponse {
  Employee: Array<{
    id: string
    skills: EmployeeSkill[]
  }>
}

interface UseEmployeeSkillsProps {
  accessToken: string
  employeeId?: string
}

export const useEmployeeSkills = ({ accessToken, employeeId }: UseEmployeeSkillsProps) => {
  const [skills, setSkills] = useState<EmployeeSkill[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEmployeeSkills = useCallback(
    async (targetEmployeeId: string) => {
      if (!accessToken || !targetEmployeeId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const query = GET_EMPLOYEE_SKILLS(targetEmployeeId)
        const result = await graphqlClient.request<EmployeeSkillsResponse>(query)

        if (result.Employee && result.Employee.length > 0) {
          const employeeSkills = result.Employee[0].skills || []
          setSkills(employeeSkills)
        } else {
          setSkills([])
        }
      } catch (err) {
        console.error('[useEmployeeSkills] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch employee skills')
        setSkills([])
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeSkills(employeeId)
    } else {
      setSkills([])
      setLoading(false)
    }
  }, [employeeId, fetchEmployeeSkills])

  return { skills, loading, error, fetchEmployeeSkills }
}
