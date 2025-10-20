import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface GetAccountByIdQueryVariables {
  id: string
}

export interface GetAccountByIdResponse {
  Account: Array<{
    id: string
    version: string
    name: string
    email: string
    phone: string
    website: string
    ownerEmployee?: {
      firstName: string
      lastName: string
    }
    createdAt: string
    legalForm?: {
      id: string
      value: string
    }
    industry?: {
      id: string
      value: string
    }
    addresses?: Array<{
      addressLine?: any
      city?: string
      country?: {
        id: string
        value: string
        code: string
      }
      region?: {
        id: string
        value: string
        code: string
      }
    }>
    numberOfEmployees?: {
      id: string
      value: string
    }
    annualRevenue?: {
      id: string
      value: string
    }
  }>
}

export const GET_ACCOUNT_BY_ID = `
  query GetAccountById($id: uuid!) {
    Account(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
      id
      version
      name
      email
      phone
      website
      ownerEmployee {
        firstName
        lastName
      }
      createdAt
      legalForm {
        id
        value
      }
      industry {
        id
        value
      }
      addresses {
        addressLine
        city
        country {
          id
          value
          code
        }
        region {
          id
          value
          code
        }
      }
      numberOfEmployees {
        id
        value
      }
      annualRevenue {
        id
        value
      }
    }
  }
`

export const useGetAccountById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchAccountById = async (variables: GetAccountByIdQueryVariables) => {
    const query = GET_ACCOUNT_BY_ID
    try {
      const result = await graphqlClient.request<GetAccountByIdResponse>(query, variables)
      return result
    } catch (error) {
      console.error('Error fetching account by ID:', error)
      throw error
    }
  }

  return { fetchAccountById }
}
