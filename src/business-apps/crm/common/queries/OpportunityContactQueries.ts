import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface OpportunityContactData {
  opportunityId: string
  contactType: string
  createdAt: string
  contact: {
    firstName: string
    lastName: string
    jobTitle: string
    email: string
    phone: string
  }
}

export interface GetOpportunityContactResponse {
  OpportunityContact: OpportunityContactData[]
}

export interface GetOpportunityContactQueryVariables {
  opportunityId: string
  contactType?: string
}

// Query to fetch OpportunityContact data with primary contact filter
export const GET_OPPORTUNITY_CONTACT = `
  query GetOpportunityContact($opportunityId: uuid!, $contactType: String = "PRIMARY_CONTACT") {
    OpportunityContact(where: { 
      opportunityId: { _eq: $opportunityId }, 
      contactType: { _eq: $contactType } 
    }) {
      opportunityId
      contactType
      createdAt
      contact {
        firstName
        lastName
        jobTitle
        email
        phone
      }
    }
  }
`

export const useGetOpportunityContact = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchOpportunityContact = async (variables: GetOpportunityContactQueryVariables) => {
    try {
      const result = await graphqlClient.request<GetOpportunityContactResponse>(GET_OPPORTUNITY_CONTACT, variables)
      return result
    } catch (error) {
      console.error('Error fetching opportunity contact:', error)
      throw error
    }
  }

  return { fetchOpportunityContact }
}
