import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface QueryVariablesJobFunction {
  jobFunctionId?: string
  jobFamilyId?: string
  offset?: number
  limit?: number
  search?: string
}

const createSearchCondition = (search?: string, jobFunctionId?: string): string => {
  if (jobFunctionId) return ''
  if (!search) return ''
  return `
    _or: [
      { name: { _ilike: "%${search}%" } },
      { code: { _ilike: "%${search}%" } }
    ]
  `
}

export const GET_JOB_FUNCTION_DATA = (variables: QueryVariablesJobFunction): string => {
  const { offset, limit, search, jobFunctionId, jobFamilyId } = variables
  let whereCondition = jobFunctionId
    ? `id: { _eq: "${jobFunctionId}" }, isActive: { _eq: true } `
    : 'isActive: { _eq: true }'
  if (jobFamilyId) {
    whereCondition += `, jobFamilyId: { _eq: "${jobFamilyId}" }`
  }
  const searchCondition = createSearchCondition(search, jobFunctionId)
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getJobFunctionData {
    jobFunctions: JobFunction(
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
      jobFamilyId
    }
    JobFunctionAggregate(
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

export type JobFunctionData = {
  jobFunctions: {
    id: string
    name: string
    code: string
    description?: string
    category?: string
    isActive: boolean
    jobFamilyId?: string
  }[]
  JobFunctionAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const fetchJobFunctionData = async (
  accessToken: string,
  variables: QueryVariablesJobFunction = {}
): Promise<JobFunctionData> => {
  const client = useGraphqlClient(accessToken)
  const query = GET_JOB_FUNCTION_DATA(variables)
  return await client.request<JobFunctionData>(query)
}
