import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ContactRelationshipData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  linkedinUrl?: string
  xingUrl?: string
  bio?: string
  academicTitle?: {
    id: string
    value: string
  }
  createdAt: string
  updatedAt: string
  accountId?: string
  leadId?: string
  opportunityId?: string
  account?: {
    id: string
    name: string
  }
  lead?: {
    id: string
    companyName: string
  }
  opportunity?: {
    id: string
    name: string
  }
}

export interface GetContactsByEntityResponse {
  Contact: ContactRelationshipData[]
}

// Query to fetch contacts from Contact table based on account relationship
export const GET_CONTACTS_BY_ACCOUNT = `
  query GetContactsByAccount($accountId: uuid!) {
    Contact(where: { accountId: { _eq: $accountId }, isDeleted: { _eq: false } }) {
      id
      firstName
      lastName
      email
      phone
      jobTitle
      linkedinUrl
      xingUrl
      bio
      academicTitle {
        id
        value
      }
      createdAt
      updatedAt
      accountId
      account {
        id
        name
      }
    }
  }
`

// Query to fetch contacts from Contact table based on lead relationship
export const GET_CONTACTS_BY_LEAD = `
  query GetContactsByLead($leadId: uuid!) {
    Contact(where: { leadId: { _eq: $leadId }, isDeleted: { _eq: false } }) {
      id
      firstName
      lastName
      email
      phone
      jobTitle
      linkedinUrl
      xingUrl
      bio
      academicTitle {
        id
        value
      }
      createdAt
      updatedAt
      leadId
      lead {
        id
        companyName
      }
    }
  }
`

// Query to fetch contacts from Contact table based on opportunity relationship
export const GET_CONTACTS_BY_OPPORTUNITY = `
  query GetContactsByOpportunity($opportunityId: uuid!) {
    Contact(where: { opportunityId: { _eq: $opportunityId }, isDeleted: { _eq: false } }) {
      id
      firstName
      lastName
      email
      phone
      jobTitle
      linkedinUrl
      xingUrl
      bio
      academicTitle {
        id
        value
      }
      createdAt
      updatedAt
      opportunityId
      opportunity {
        id
        name
      }
    }
  }
`

export const useGetContactsByEntity = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchContactsByAccount = async (accountId: string) => {
    try {
      const result = await graphqlClient.request<GetContactsByEntityResponse>(GET_CONTACTS_BY_ACCOUNT, { accountId })
      return result
    } catch (error) {
      console.error('Error fetching contacts by account:', error)
      throw error
    }
  }

  const fetchContactsByLead = async (leadId: string) => {
    try {
      const result = await graphqlClient.request<GetContactsByEntityResponse>(GET_CONTACTS_BY_LEAD, { leadId })
      return result
    } catch (error) {
      console.error('Error fetching contacts by lead:', error)
      throw error
    }
  }

  const fetchContactsByOpportunity = async (opportunityId: string) => {
    try {
      const result = await graphqlClient.request<GetContactsByEntityResponse>(GET_CONTACTS_BY_OPPORTUNITY, {
        opportunityId
      })
      return result
    } catch (error) {
      console.error('Error fetching contacts by opportunity:', error)
      throw error
    }
  }

  return {
    fetchContactsByAccount,
    fetchContactsByLead,
    fetchContactsByOpportunity
  }
}
