import { useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface QueryVariablesJobProfile {
  jobProfileId?: string
  offset?: number
  limit?: number
  search?: string
}

const createSearchCondition = (search?: string, jobProfileId?: string): string => {
  if (jobProfileId) return ''
  if (!search) return ''
  return `
    _or: [
      { name: { _ilike: "%${search}%" } },
      { code: { _ilike: "%${search}%" } },
      { description: { _ilike: "%${search}%" } }
    ]
  `
}

export const GET_JOB_PROFILE_DATA = (variables: QueryVariablesJobProfile): string => {
  const { offset, limit, search, jobProfileId } = variables

  const searchCondition = createSearchCondition(search, jobProfileId)
  const whereCondition = jobProfileId
    ? `id: { _eq: "${jobProfileId}" }, isDeleted: { _eq: false}`
    : 'isDeleted: { _eq: false}'
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getJobProfileData {
  jobProfiles: JobProfile(
    limit: ${limit},
    offset: ${offset},
    where: { ${whereClause}}) {
    id
    name
    nameI18n
    code
    description
    descriptionI18n
    jobFunction {
      id
      name
    }
    jobFunctionId
    jobLevel {
      id
      name
    }
    jobLevelId
    contractType {
      id
      value
    }
    contractTypeRef
    employmentType {
      id
      value
    }
    employmentTypeRef
    recordState
    version
    jobProfileSkills {
      id
      skillId
      requiredLevel
      skill {
        id
        name
      }
    }
  }
  JobProfileAggregate(
    limit: ${limit},
    offset: ${offset},
    where: { ${whereClause}}
  ) {
    aggregate {
      count
    }
  }
  }`
}

export type JobProfileByIdData = {
  jobProfiles?: {
    id: string
    name?: string
    nameI18n?: { [key: string]: string }
    code?: string
    description?: string
    descriptionI18n?: { [key: string]: string }
    jobFunction?: { id: string; name: string }
    jobFunctionId?: string
    jobLevel?: { id: string; name: string }
    jobLevelId?: string
    contractType?: { id: string; value: string }
    contractTypeRef?: string
    employmentType?: { id: string; value: string }
    employmentTypeRef?: string
    recordState?: string
    version?: number
    jobProfileSkills?: Array<{
      id: string
      skillId: string
      requiredLevel?: number | null
      skill?: {
        id: string
        name: string
      }
    }>
  }[]
  JobProfileAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface JobProfileDataVariables {
  offset?: number
  limit?: number
  search?: string
  jobProfileId?: string
}

export const useGetJobProfileData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken)

  const fetchJobProfileData = useCallback(
    async (variables: JobProfileDataVariables = {}) => {
      const query = GET_JOB_PROFILE_DATA({
        limit: variables.limit || 100,
        offset: variables.offset || 0,
        search: variables.search,
        jobProfileId: variables.jobProfileId
      })

      try {
        const result = await graphqlClient.request<JobProfileByIdData>(query)
        return result
      } catch (error) {
        console.error('Error fetching job profile data:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchJobProfileData }
}
