import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'

// Shared account structure to avoid duplication
export interface AccountSummary {
  id: string
  name: string
  email?: string
  phone?: string
  website?: string
  legalForm?: {
    id: string
    value: string
  }
  industry?: {
    id: string
    value: string
  }
  numberOfEmployees?: {
    id: string
    value: string
  }
  annualRevenue?: {
    id: string
    value: string
  }
  addresses?: Array<{
    addressType?: string
    addressLine?: string
    postalCode?: string
    city?: string
    country?: {
      id: string
      value: string
    }
    region?: {
      id: string
      value: string
    }
  }>
}

export interface ContactData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  department?: string
  linkedinUrl?: string
  xingUrl?: string
  bio?: string
  contactType?: string
  birthDate?: string
  version?: number
  academicTitle?: {
    id: string
    value: string
  }
  language?: {
    id: string
    value: string
  }
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
  updatedAt?: string
  createdAt?: string
  accountId?: string
  account?: AccountSummary
  accountContacts?: Array<{
    id: string
    version: number
    contactType?: string
    account: AccountSummary
  }>
  ownerEmployee?: {
    id: string
    firstName: string
    lastName: string
    displayName?: string
    fullName?: string
    employeePosition?: {
      company?: {
        name?: string
      }
    }
  }
}

export interface GetContactByIdResponse {
  Contact: ContactData[]
}

export const GET_CONTACT_BY_ID = `
  query GetContactById(
    $id: uuid!
  ) {
    Contact(
      where: { id: { _eq: $id } }
    ) {
      id
      firstName
      lastName
      email
      phone
      jobTitle
      department
      bio
      contactType
      birthDate
      version
      academicTitle {
        id
        value
      }
      language {
        id
        value
      }
      communicationChannels(where: { isDeleted: { _eq: false } }) {
        id
        communicationChannelRef
        value
        communicationChannel {
          id
          code
          value
        }
      }
      updatedAt
      createdAt
      accountId
      account {
        id
        name
        email
        phone
        website
        legalForm {
          id
          value
        }
        industry {
          id
          value
        }
        numberOfEmployees {
          id
          value
        }
        annualRevenue {
          id
          value
        }
        addresses {
          addressType
          addressLine
          postalCode
          city
          country {
            id
            value
          }
          region {
            id
            value
          }
        }
      }
      accountContacts(where: { isDeleted: { _eq: false } }) {
        id
        version
        contactType
        account {
          id
          name
          email
          phone
          website
          legalForm {
            id
            value
          }
          industry {
            id
            value
          }
          numberOfEmployees {
            id
            value
          }
          annualRevenue {
            id
            value
          }
          addresses {
            addressType
            addressLine
            postalCode
            city
            country {
              id
              value
            }
            region {
              id
              value
            }
          }
        }
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        fullName
        employeePosition {
          company {
            name
          }
        }
      }
    }
  }
`

export const useGetContactById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchContactById = useCallback(
    async (contactId: string): Promise<ContactData | null> => {
      if (!contactId) return null

      try {
        const result = await graphqlClient.request<GetContactByIdResponse>(GET_CONTACT_BY_ID, { id: contactId })

        if (result && result.Contact && result.Contact.length > 0) {
          return result.Contact[0]
        }
        return null
      } catch (error) {
        console.error('Error fetching contact by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchContactById }
}
