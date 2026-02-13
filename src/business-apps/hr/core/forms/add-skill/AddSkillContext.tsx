import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  ADD_SKILL_QUERY,
  ADD_SKILL_DOCUMENT_CATALOGS_QUERY,
  SEARCH_SKILLS_QUERY,
  GET_SKILLS_BY_NAMES
} from './AddSkillQueries'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { hybridSearchSkills } from '@/common/network/flowbot/hybridSearchSkills'
import { env } from '@/common/env/EnvUtils'

export interface CatalogEntry {
  id: string | number
  value?: string
  translations?: { localeCode?: string; value?: string }[]
  parentEntryId?: string | null
  catalog?: { defaultLocale?: string }
}

export interface SkillRecord {
  id: string
  name: string
  version: number
}

export interface EmployeeSkillLink {
  id: string
  version: number
  level?: number | string | null
  validFrom?: string | null
  validTo?: string | null
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
  catalogs?: {
    documentGroup?: CatalogEntry[]
    documentType?: CatalogEntry[]
  }
}

export interface ChangeLevelParams {
  mode: 'changeLevel'
  skillId: string
  employeeSkillId: string
  skillName?: string
  currentLevel: number | null
}

export interface DeactivateSkillParams {
  mode: 'deactivate'
  skillId: string
  employeeSkillId: string
  skillName: string
}

export interface ActivateSkillParams {
  mode: 'activate'
  skillId: string
  employeeSkillId: string
  skillName: string
}

export interface AttachVerificationSkillParams {
  mode: 'attachVerification'
  skillId: string
  employeeSkillId: string
  skillName: string
}

export type FlowFormParams =
  | ChangeLevelParams
  | DeactivateSkillParams
  | ActivateSkillParams
  | AttachVerificationSkillParams

interface AddSkillContextValue {
  data: AddSkillDataResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  searchSkills: (term: string) => Promise<SkillRecord[]>
  createSkillAndFetchByNames: (name: string, namesAccumulator: string[]) => Promise<SkillRecord[]>
  employeeId?: string
  changeLevelParams: ChangeLevelParams | null
  flowFormParams: FlowFormParams | null
}

const DEFAULT_ADD_SKILL_VALUE: AddSkillContextValue = {
  data: null,
  isLoading: false,
  error: 'Missing context. Open this form from the employee record (Add skill) or from a flow.',
  refetch: async () => {},
  searchSkills: async () => [],
  createSkillAndFetchByNames: async () => [],
  employeeId: undefined,
  changeLevelParams: null,
  flowFormParams: null
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

  const changeLevelParams: ChangeLevelParams | null = useMemo(() => {
    const params = additionalData?.contextData ?? additionalData?.psi_taskPayload?.psi_initialParameters ?? undefined
    if (!params || params.mode !== 'changeLevel' || !params.skillId) return null
    const currentLevel =
      params.currentLevel != null
        ? typeof params.currentLevel === 'number'
          ? params.currentLevel
          : Number.parseInt(String(params.currentLevel), 10)
        : null
    const level = Number.isNaN(currentLevel as number) ? null : (currentLevel as number)
    return {
      mode: 'changeLevel',
      skillId: String(params.skillId),
      employeeSkillId: params.employeeSkillId != null ? String(params.employeeSkillId) : '',
      skillName: params.skillName != null ? String(params.skillName) : undefined,
      currentLevel: level
    }
  }, [additionalData?.contextData, additionalData?.psi_taskPayload?.psi_initialParameters])

  const flowFormParams: FlowFormParams | null = useMemo(() => {
    const params = additionalData?.contextData ?? additionalData?.psi_taskPayload?.psi_initialParameters ?? undefined
    if (!params || !params.skillId) return changeLevelParams
    if (params.mode === 'deactivate') {
      return {
        mode: 'deactivate',
        skillId: String(params.skillId),
        employeeSkillId: params.employeeSkillId != null ? String(params.employeeSkillId) : '',
        skillName: params.skillName != null ? String(params.skillName) : ''
      }
    }
    if (params.mode === 'activate') {
      return {
        mode: 'activate',
        skillId: String(params.skillId),
        employeeSkillId: params.employeeSkillId != null ? String(params.employeeSkillId) : '',
        skillName: params.skillName != null ? String(params.skillName) : ''
      }
    }
    if (params.mode === 'attachVerification') {
      return {
        mode: 'attachVerification',
        skillId: String(params.skillId),
        employeeSkillId: params.employeeSkillId != null ? String(params.employeeSkillId) : '',
        skillName: params.skillName != null ? String(params.skillName) : ''
      }
    }
    return changeLevelParams
  }, [additionalData?.contextData, additionalData?.psi_taskPayload?.psi_initialParameters, changeLevelParams])

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
      const activeUserLocale = getCurrentActiveUserLocale() || 'en-US'
      const catalogsResponse = await graphqlClient.request<{
        documentType?: CatalogEntry[]
      }>(ADD_SKILL_DOCUMENT_CATALOGS_QUERY, { activeUserLocale })
      setData({
        ...response,
        catalogs: {
          documentType: catalogsResponse?.documentType ?? []
        }
      })
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

  const searchSkills = useCallback(
    async (term: string): Promise<SkillRecord[]> => {
      const trimmed = (term || '').trim()
      if (!trimmed || trimmed.length < 2) return []
      try {
        const matches = await hybridSearchSkills(trimmed, accessToken ?? '', 20)
        return matches.map(m => ({ id: m.id, name: m.name, version: m.version }))
      } catch {
        const pattern = `%${trimmed}%`
        type SearchSkillsVariables = { search: string }
        const result = await graphqlClient.request<{ skill: SkillRecord[] }>(SEARCH_SKILLS_QUERY, {
          search: pattern
        } as SearchSkillsVariables)
        return result?.skill ?? []
      }
    },
    [accessToken, graphqlClient]
  )

  const createSkillAndFetchByNames = useCallback(
    async (name: string, namesAccumulator: string[]) => {
      const trimmed = (name || '').trim()
      if (!trimmed) return []
      await restClient.post(
        '/processes/employee/saveSkill',
        { changeMode: 'INSERT', skill: { name: trimmed } },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      const queryNames = Array.from(new Set([...(namesAccumulator || []), trimmed]))
      type GetSkillsByNamesVariables = { names: string[] }
      const result = await graphqlClient.request<{ skill: SkillRecord[] }>(GET_SKILLS_BY_NAMES, {
        names: queryNames
      } as GetSkillsByNamesVariables)
      return result?.skill || []
    },
    [accessToken, graphqlClient, restClient]
  )

  const value = useMemo<AddSkillContextValue>(
    () => ({
      data,
      isLoading,
      error,
      refetch: fetchData,
      searchSkills,
      createSkillAndFetchByNames,
      employeeId,
      changeLevelParams,
      flowFormParams
    }),
    [
      data,
      isLoading,
      error,
      fetchData,
      searchSkills,
      createSkillAndFetchByNames,
      employeeId,
      changeLevelParams,
      flowFormParams
    ]
  )

  return <AddSkillContext.Provider value={value}>{children}</AddSkillContext.Provider>
}

export const useAddSkill = (): AddSkillContextValue => {
  const ctx = useContext(AddSkillContext)
  return ctx ?? DEFAULT_ADD_SKILL_VALUE
}

export default AddSkillContext
