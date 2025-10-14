import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ADD_SKILL_QUERY, SEARCH_SKILLS_QUERY, GET_SKILLS_BY_NAMES } from './AddSkillQueries'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

interface AddSkillDataResponse {
  skill: Array<any>
  employee: any
  allEmployees: Array<any>
}

interface AddSkillContextValue {
  data: AddSkillDataResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  searchSkills: (term: string) => Promise<Array<any>>
  createSkillAndFetchByNames: (name: string, namesAccumulator: string[]) => Promise<Array<any>>
  employeeId?: string
}

const AddSkillContext = createContext<AddSkillContextValue | undefined>(undefined)

interface ProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

export const AddSkillProvider: React.FC<ProviderProps> = ({ children, accessToken, additionalData, userInfo }) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const restClient = useRestClient('https://newwork-dev.newwork.com')
  const [data, setData] = useState<AddSkillDataResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const employeeId: string | undefined = useMemo(() => {
    return (
      additionalData?.psi_taskPayload?.employeeId ||
      additionalData?.psi_taskPayload?.initialParameters?.employeeId ||
      userInfo?.employeeDetails?.employeeId
    )
  }, [additionalData, userInfo])

  const fetchData = useCallback(async () => {
    if (!accessToken || !employeeId) {
      setIsLoading(false)
      setError(!employeeId ? 'Missing employeeId' : 'Missing accessToken')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const structureId = getCurrentActiveStructureId()
      const variables = { id: employeeId, structureId } as any
      const response = await graphqlClient.request<AddSkillDataResponse>(ADD_SKILL_QUERY, variables)
      setData(response)
    } catch (e: any) {
      setError(e?.message || 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, employeeId, graphqlClient])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const value: AddSkillContextValue = {
    data,
    isLoading,
    error,
    refetch: fetchData,
    searchSkills: async (term: string) => {
      const trimmed = (term || '').trim()
      if (!trimmed) return []
      const pattern = `%${trimmed}%`
      const result = await graphqlClient.request<{ skill: Array<any> }>(SEARCH_SKILLS_QUERY, { search: pattern } as any)
      return result?.skill || []
    },
    createSkillAndFetchByNames: async (name: string, namesAccumulator: string[]) => {
      // Validate
      const trimmed = (name || '').trim()
      if (!trimmed) return []
      // POST to processes + employee/saveSkill
      await restClient.post(
        '/processes/employee/saveSkill',
        { skill: { name: trimmed } },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      // Query back skills by provided names
      const queryNames = Array.from(new Set([...(namesAccumulator || []), trimmed]))
      const result = await graphqlClient.request<{ skill: Array<any> }>(GET_SKILLS_BY_NAMES, {
        names: queryNames
      } as any)
      return result?.skill || []
    },
    employeeId
  }

  return <AddSkillContext.Provider value={value}>{children}</AddSkillContext.Provider>
}

export const useAddSkill = () => {
  const ctx = useContext(AddSkillContext)
  if (!ctx) throw new Error('useAddSkill must be used within AddSkillProvider')
  return ctx
}

export default AddSkillContext
