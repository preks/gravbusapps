import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface QueryVariablesCompensationBand {
  compensationBandId?: string
  offset?: number
  limit?: number
  search?: string
}

const createSearchCondition = (search?: string, compensationBandId?: string): string => {
  if (compensationBandId) return ''
  if (!search) return ''
  return `
    _or: [
      { name: { _ilike: "%${search}%" } }
    ]
  `
}

export const GET_COMPENSATION_BAND_DATA = (variables: QueryVariablesCompensationBand): string => {
  const { offset, limit, search, compensationBandId } = variables

  const searchCondition = createSearchCondition(search, compensationBandId)
  const whereCondition = compensationBandId
    ? `id: { _eq: "${compensationBandId}" }, isDeleted: { _eq: false} `
    : 'isDeleted: { _eq: false}'
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getCompensationBandData {
  compensationBands: CompensationBand(
    limit: ${limit}
    offset: ${offset}
    where: { ${whereClause}}) {
    id
    description
    currency {
      id
      value
    }
    version
    currencyRef
    name
    nameI18n
    descriptionI18n
    payGrade
    minSalary
    maxSalary
  }
  CompensationBandAggregate(
    where: { ${whereClause}}
  ) {
    aggregate {
      count
    }
  }
}`
}

export type CompensationBandData = {
  compensationBands?: {
    id: string
    description?: string
    currency?: { id: string; value: string }
    currencyRef?: string
    name?: string
    version?: number
    payGrade?: number
    minSalary?: number
    maxSalary?: number
    nameI18n?: { [key: string]: string }
    descriptionI18n?: { [key: string]: string }
  }[]
  CompensationBandAggregate: {
    aggregate: {
      count: number
    }
  }
  error: {
    status: number | null
    message: string | null
  }
}

export type CompensationBand = {
  id: string
  description?: string
  currency?: {
    id: string
    value: string
  }
  currencyRef?: string
  name?: string
  version?: number
  payGrade?: number
  minSalary?: number
  maxSalary?: number
  nameI18n?: {
    [key: string]: string
  }
  descriptionI18n?: {
    [key: string]: string
  }
}

export interface GetCompensationBandDataVariables {
  offset?: number
  limit?: number
  search?: string
  compensationBandId?: string
}

export const useGetCompensationBandData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken)

  const fetchCompensationBandData = async (variables: GetCompensationBandDataVariables = {}) => {
    const query = GET_COMPENSATION_BAND_DATA({
      limit: variables.limit || 100,
      offset: variables.offset || 0,
      search: variables.search,
      compensationBandId: variables.compensationBandId
    })

    try {
      const result = await graphqlClient.request<CompensationBandData>(query)
      return result
    } catch (error) {
      console.error('Error fetching compensation band data:', error)
      throw error
    }
  }

  return { fetchCompensationBandData }
}
