import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface QueryVariablesJobLevelGroup {
  jobLevelGroupId?: string
  offset?: number
  limit?: number
  search?: string
}

const createSearchCondition = (search?: string, jobLevelGroupId?: string): string => {
  if (jobLevelGroupId) return ''
  if (!search) return ''
  return `
    _or: [
      { name: { _ilike: "%${search}%" } },
      { code: { _ilike: "%${search}%" } }
    ]
  `
}

export const GET_JOB_LEVEL_GROUP_DATA = (variables: QueryVariablesJobLevelGroup): string => {
  const { offset, limit, search, jobLevelGroupId } = variables
  const whereCondition = jobLevelGroupId
    ? `id: { _eq: "${jobLevelGroupId}" }, isActive: { _eq: true } `
    : 'isActive: { _eq: true }'
  const searchCondition = createSearchCondition(search, jobLevelGroupId)
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getJobLevelGroupData {
    jobLevelGroups: JobLevelGroup(
      limit: ${limit || 100},
      offset: ${offset || 0},
      where: { ${whereClause} }
    ) {
      id
      name
      code
      description
      category
      isActive
    }
    JobLevelGroupAggregate(
      limit: ${limit || 100},
      offset: ${offset || 0},
      where: { ${whereClause} }
    ) {
      aggregate {
        count
      }
    }
  }`
}

export type JobLevelGroupData = {
  jobLevelGroups: {
    id: string
    name: string
    code: string
    description?: string
    category?: string
    isActive: boolean
  }[]
  JobLevelGroupAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const fetchJobLevelGroupData = async (
  accessToken: string,
  variables: QueryVariablesJobLevelGroup = {}
): Promise<JobLevelGroupData> => {
  const client = useGraphqlClient(accessToken)
  const query = GET_JOB_LEVEL_GROUP_DATA(variables)
  return await client.request<JobLevelGroupData>(query)
}
