import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface QueryVariablesJobLevel {
  jobLevelId?: string
  jobLevelGroupId?: string
  offset?: number
  limit?: number
  search?: string
}

const createSearchCondition = (search?: string, jobLevelId?: string): string => {
  if (jobLevelId) return ''
  if (!search) return ''
  return `
    _or: [
      { name: { _ilike: "%${search}%" } }
    ]
  `
}

export const GET_JOB_LEVEL_DATA = (variables: QueryVariablesJobLevel): string => {
  const { offset, limit, search, jobLevelId, jobLevelGroupId } = variables

  const searchCondition = createSearchCondition(search, jobLevelId)
  const whereJobLevelGroup = jobLevelGroupId
    ? ` jobLevelGroupRef: { _eq: "${jobLevelGroupId}" }, isDeleted: { _eq: false} `
    : 'isDeleted: { _eq: false}'
  const whereCondition = jobLevelId ? `id: { _eq: "${jobLevelId}" }, isDeleted: { _eq: false} ` : whereJobLevelGroup
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getJobLevelData {
  jobLevels: JobLevel(
    limit: ${limit},
    offset: ${offset},
    where: { ${whereClause}}) {
    id
    name
    nameI18n
    code
    description
    descriptionI18n
    jobLevelGroup {
      id
      value
    }
    jobLevelGroupRef
    compensationBand {
      id
      name
      payGrade
    }
    compensationBandId
    hierarchyOrder
    version
  }
  JobLevelAggregate(
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

export type JobLevelByJobLevelGroupIdData = {
  jobLevels?: {
    id: string
    name?: string
    nameI18n?: { [key: string]: string }
    version?: number
    code?: string
    description?: string
    descriptionI18n?: { [key: string]: string }
    hierarchyOrder?: number
    jobLevelGroup?: { id: string; value: string }
    compensationBand?: { id: string; name: string; payGrade?: number }
    compensationBandId?: string
    jobLevelGroupRef?: string
  }[]
  JobLevelAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface JobLevelDataVariables {
  offset?: number
  limit?: number
  search?: string
  jobLevelId?: string
  jobLevelGroupId?: string
}

export const useGetJobLevelData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken)

  const fetchJobLevelData = async (variables: JobLevelDataVariables = {}) => {
    const query = GET_JOB_LEVEL_DATA({
      limit: variables.limit || 100,
      offset: variables.offset || 0,
      search: variables.search,
      jobLevelId: variables.jobLevelId,
      jobLevelGroupId: variables.jobLevelGroupId
    })

    try {
      const result = await graphqlClient.request<JobLevelByJobLevelGroupIdData>(query)
      return result
    } catch (error) {
      console.error('Error fetching job level data:', error)
      throw error
    }
  }

  return { fetchJobLevelData }
}
