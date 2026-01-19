import { useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface QueryVariablesJobFunction {
  jobFunctionId?: string
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
      { code: { _ilike: "%${search}%" } },
      { description: { _ilike: "%${search}%" } }
    ]
  `
}

export const GET_JOB_FUNCTION_DATA = (variables: QueryVariablesJobFunction): string => {
  const { offset, limit, search, jobFunctionId } = variables

  const searchCondition = createSearchCondition(search, jobFunctionId)
  const whereCondition = jobFunctionId
    ? `id: { _eq: "${jobFunctionId}" }, isDeleted: { _eq: false}`
    : 'isDeleted: { _eq: false}'
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getJobFunctionData {
  jobFunctions: JobFunction(
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
    jobFamily {
      id
      value
    }
    jobFamilyRef
    version
  }
  JobFunctionAggregate(
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

export type JobFunctionByIdData = {
  jobFunctions?: {
    id: string
    name?: string
    nameI18n?: { [key: string]: string }
    code?: string
    description?: string
    descriptionI18n?: { [key: string]: string }
    jobLevelGroup?: { id: string; value: string }
    jobLevelGroupRef?: string
    jobFamily?: { id: string; value: string }
    jobFamilyRef?: string
    version?: number
  }[]
  JobFunctionAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface JobFunctionDataVariables {
  offset?: number
  limit?: number
  search?: string
  jobFunctionId?: string
}

export const useGetJobFunctionData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken)

  const fetchJobFunctionData = useCallback(
    async (variables: JobFunctionDataVariables = {}) => {
      const query = GET_JOB_FUNCTION_DATA({
        limit: variables.limit || 100,
        offset: variables.offset || 0,
        search: variables.search,
        jobFunctionId: variables.jobFunctionId
      })

      try {
        const result = await graphqlClient.request<JobFunctionByIdData>(query)
        return result
      } catch (error) {
        console.error('Error fetching job function data:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchJobFunctionData }
}
