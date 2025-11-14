import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface AccountQueryVariables {
  accountId: string
}

export interface AccountDataResponse {
  Account: Array<{
    id: string
    version: string
    name: string
    email?: string
    phone?: string
    website?: string
    foundationDate?: string
    ownerEmployee?: {
      id: string
      firstName: string
      lastName: string
      pictureThumbnail?: string
    }
    legalForm?: {
      id: string
      value: string
      code: string
      objectValue?: any
    }
    industry?: {
      id: string
      value: string
      code: string
      objectValue?: any
    }
    numberOfEmployees?: {
      id: string
      value: string
      code: string
    }
    annualRevenue?: {
      id: string
      value: string
      code: string
      objectValue?: any
    }
    addresses?: Array<{
      id?: string
      version?: number
      addressType?: string
      addressLine?: string
      postalCode?: string
      city?: string
      regionRef?: string
      countryRef?: string
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
    // Contact relationships
    accountContacts?: Array<{
      id: string
      version?: number
      contactType?: string
      contact: {
        id: string
        firstName?: string
        lastName?: string
        email?: string
      }
    }>
    // Campaign Information
    salesCampaign?: {
      id: string
      name: string
    }
    salesCampaignId?: string
    createdAt?: string
    updatedAt?: string
  }>
}

export const GET_ACCOUNT_BY_ID = `
  query GetAccountById($accountId: uuid!) {
    Account(where: { id: { _eq: $accountId }, isDeleted: { _eq: false } }) {
      id
      version
      name
      email
      phone
      website
      foundationDate
      ownerEmployee {
        id
        firstName
        lastName
        pictureThumbnail
      }
      legalForm {
        id
        value
        code
        objectValue
      }
      industry {
        id
        value
        code
        objectValue
      }
      numberOfEmployees {
        id
        value
        code
      }
      annualRevenue {
        id
        value
        code
        objectValue
      }
      addresses {
        id
        version
        addressType
      addressLine
        postalCode
        city
        regionRef
        countryRef
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
      
      # Contact relationships
      accountContacts(where: { isDeleted: { _eq: false } }) {
        id
        version
        contactType
        contact {
          id
          firstName
          lastName
          email
        }
      }
      
      salesCampaign {
        id
        name
      }
      salesCampaignId
      createdAt
      updatedAt
    }
  }
`

export const useGetAccountData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchAccountData = async (variables: AccountQueryVariables) => {
    const query = GET_ACCOUNT_BY_ID
    try {
      const result = await graphqlClient.request<AccountDataResponse>(query, variables)
      return result
    } catch (error) {
      console.error('Error fetching account data:', error)
      throw error
    }
  }

  return { fetchAccountData }
}
