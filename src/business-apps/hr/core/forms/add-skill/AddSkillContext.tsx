import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ADD_SKILL_QUERY, SEARCH_SKILLS_QUERY, GET_SKILLS_BY_NAMES } from './AddSkillQueries'
import { useRestClient } from '@/common/network/rest/useRestClient'

import { env } from '@/common/env/EnvUtils'

export interface SkillRecord {
  id: string
  name: string
  version: number
}

export interface EmployeeSkillLink {
  id: string
  version: number
  skill: SkillRecord
}

export interface DetailedEmployee {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  employeePosition?:
    | Array<{
        jobPosition?: {
          name?: string
        }
      }>
    | {
        jobPosition?: {
          name?: string
        }
      }
  skills: EmployeeSkillLink[]
}

export interface AddSkillDataResponse {
  employee: DetailedEmployee
}

interface AddSkillContextValue {
  data: AddSkillDataResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  searchSkills: (term: string) => Promise<SkillRecord[]>
  createSkillAndFetchByNames: (name: string, namesAccumulator: string[]) => Promise<SkillRecord[]>
  employeeId?: string
}

const AddSkillContext = createContext<AddSkillContextValue | undefined>(undefined)

interface ProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

export const AddSkillProvider: React.FC<ProviderProps> = ({ children, accessToken, additionalData, userInfo }) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(env('NEXT_PUBLIC_BASE_URL'))
  const [data, setData] = useState<AddSkillDataResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const employeeId: string | undefined = useMemo(() => {
    return (
      additionalData?.employeeId ||
      additionalData?.psi_taskPayload?.employeeId ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
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
      type AddSkillQueryVariables = { id: string }
      const variables: AddSkillQueryVariables = { id: employeeId }
      const response = await graphqlClient.request<AddSkillDataResponse>(ADD_SKILL_QUERY, variables)
      setData(response)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      setError(message)
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
      type SearchSkillsVariables = { search: string }
      const result = await graphqlClient.request<{ skill: SkillRecord[] }>(SEARCH_SKILLS_QUERY, {
        search: pattern
      } as SearchSkillsVariables)
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
      type GetSkillsByNamesVariables = { names: string[] }
      const result = await graphqlClient.request<{ skill: SkillRecord[] }>(GET_SKILLS_BY_NAMES, {
        names: queryNames
      } as GetSkillsByNamesVariables)
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
