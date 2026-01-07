import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface GetLeadByIdQueryVariables {
  id: string
}

export interface GetLeadByIdResponse {
  Lead: Array<{
    id: string
    version: string
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    position: string
    academicTitle?: {
      id: string
      value: string
      code: string
    }
    salutation?: {
      id: string
      value: string
      code: string
    }
    leadSource?: {
      value: string
    }
    leadRating?: {
      value: string
    }
    leadStatus?: {
      value: string
    }
    ownerEmployee?: {
      firstName: string
      lastName: string
    }
    createdAt: string
    communicationChannels?: Array<{
      id: string
      communicationChannelRef: string
      value: string
      communicationChannel?: {
        id: string
        code: string
        value: string
      }
    }>
    companyName: string
    legalForm?: {
      id: string
      value: string
    }
    country?: {
      id: string
      value: string
    }
    industry?: {
      id: string
      value: string
    }
    companyWebsite: string
    companyEmail: string
    companyPhone: string
    addresses?: Array<{
      addressLine?: any
      postalCode?: string
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
    convertedOpportunityId: string
    sensitive?: boolean
  }>
}

export const GET_LEAD_BY_ID = `
  query GetLeadById($id: uuid!) {
    Lead(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
      #Core Lead Data
      id
      version
      name
      firstName
      lastName
      email
      phoneNumber
      position
      academicTitle {
        id
        value
        code
      }
      salutation {
        id
        value
        code
      }
      leadSource {
        value
      }
      leadRating {
        value
      }
      leadStatus { 
       value
      }
      ownerEmployee {
        firstName
        lastName
      }
      createdAt
      communicationChannels {
        id
        communicationChannelRef
        value
        communicationChannel {
          id
          code
          value
        }
      }
      
      #COMPANY
      companyName
      legalForm {
        id
       value
      }
      country {
        id
       value
      }
      industry {
        id
       value
      }
      companyWebsite
      companyEmail
      companyPhone
      addresses {
        addressLine
        postalCode
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
      convertedOpportunityId
      sensitive
    }
  }
`

export const useGetLeadById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchLeadById = async (variables: GetLeadByIdQueryVariables) => {
    const query = GET_LEAD_BY_ID
    try {
      const result = await graphqlClient.request<GetLeadByIdResponse>(query, variables)
      return result
    } catch (error) {
      console.error('Error fetching lead by ID:', error)
      throw error
    }
  }

  return { fetchLeadById }
}
