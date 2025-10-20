import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface LeadContactData {
  leadId: string
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

export interface GetLeadContactResponse {
  LeadContact: LeadContactData[]
}

export interface GetLeadContactQueryVariables {
  leadId: string
  contactType?: string
}

// Query to fetch LeadContact data with primary contact filter
export const GET_LEAD_CONTACT = `
  query GetLeadContact($leadId: uuid!, $contactType: String = "PRIMARY_CONTACT") {
    LeadContact(where: { 
      leadId: { _eq: $leadId }, 
      contactType: { _eq: $contactType } 
    }) {
      leadId
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

export const useGetLeadContact = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchLeadContact = async (variables: GetLeadContactQueryVariables) => {
    try {
      const result = await graphqlClient.request<GetLeadContactResponse>(GET_LEAD_CONTACT, variables)
      return result
    } catch (error) {
      console.error('Error fetching lead contact:', error)
      throw error
    }
  }

  return { fetchLeadContact }
}
