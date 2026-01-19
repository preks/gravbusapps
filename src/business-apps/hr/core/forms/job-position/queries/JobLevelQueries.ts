import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

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
      { name: { _ilike: "%${search}%" } },
      { code: { _ilike: "%${search}%" } }
    ]
  `
}

export const GET_JOB_LEVEL_DATA = (variables: QueryVariablesJobLevel): string => {
  const { offset, limit, search, jobLevelId, jobLevelGroupId } = variables
  const whereJobLevelGroup = jobLevelGroupId
    ? ` jobLevelGroupRef: { _eq: "${jobLevelGroupId}" }, isDeleted: { _eq: false} `
    : 'isDeleted: { _eq: false}'
  const whereCondition = jobLevelId ? `id: { _eq: "${jobLevelId}" }, isDeleted: { _eq: false} ` : whereJobLevelGroup
  const searchCondition = createSearchCondition(search, jobLevelId)
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getJobLevelData {
    jobLevels: JobLevel(
      limit: ${limit || 100},
      offset: ${offset || 0},
      where: { ${whereClause}}
    ) {
      id
      name
      code
      description
      jobLevelGroupRef
      isDeleted
    }
    JobLevelAggregate(
      limit: ${limit || 100},
      offset: ${offset || 0},
      where: { ${whereClause}}
    ) {
      aggregate {
        count
      }
    }
  }`
}

export type JobLevelData = {
  jobLevels: {
    id: string
    name: string
    code: string
    description?: string
    jobLevelGroupRef?: string
    isDeleted?: boolean
  }[]
  JobLevelAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const fetchJobLevelData = async (
  accessToken: string,
  variables: QueryVariablesJobLevel = {}
): Promise<JobLevelData> => {
  const client = useGraphqlClient(accessToken)
  const query = GET_JOB_LEVEL_DATA(variables)
  return await client.request<JobLevelData>(query)
}
