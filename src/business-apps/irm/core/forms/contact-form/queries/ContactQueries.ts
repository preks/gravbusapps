import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface InvestmentContactQueryVariables {
  contactId: string
}

export interface InvestmentContactDataResponse {
  InvestmentContact: Array<{
    id: string
    version?: number

    // Personal Information
    firstName?: string
    lastName?: string
    fullName?: string
    type?: string
    birthDate?: string

    // Professional Information
    jobPosition?: string
    department?: string

    // Contact Information
    email?: string
    phone?: string

    // Communication Channels
    communicationChannels?: Array<{
      id: string
      communicationChannelRef: string
      value: string
      valueExtension?: string
      source?: string
      activeFrom?: string
      activeTo?: string
      communicationChannel?: {
        id: string
        value: string
        code: string
      }
    }>

    // picture?: string; // ❌ NOT in schema
    // pictureThumbnail?: string; // ❌ NOT in schema

    // Owner Information
    ownerEmployeeId?: string
    ownerEmployee?: {
      id: string
      firstName: string
      lastName: string
      displayName: string
      pictureThumbnail?: string
    }

    // Additional Information
    notesSummary?: string
    businessKey?: string

    // Catalog relationships
    academicTitle?: {
      id: string
      value: string
      code: string
      objectValue?: any
    }
    academicTitleRef?: string
    languageRef?: string

    // ✅ REMOVED: Fields NOT in InvestmentContact database
    // salutationRef?: string; // ❌ NOT in schema

    // Account relationships
    investmentAccountContact?: Array<{
      id: string
      account: {
        id: string
        name: string
      }
    }>

    // System fields
    createdAt?: string
    createdBy?: string
    additionalProperties?: any

    // ✅ REMOVED: Fields NOT in expected payload structure
    // activeFrom?: string; // Not in expected payload
    // activeTo?: string; // Not in expected payload
    // acl?: any; // Not in expected payload
    // updatedAt?: string; // ❌ NOT in InvestmentContact schema
    // updatedBy?: string; // ❌ NOT in InvestmentContact schema
  }>
}

export const GET_INVESTMENT_CONTACT_BY_ID = `
  query GetInvestmentContactById($contactId: uuid!) {
    InvestmentContact(where: { id: { _eq: $contactId }, isDeleted: { _eq: false } }) {
      id
      version
      
      firstName
      lastName
      fullName
      type
      birthDate
      
      jobPosition
      department
      
      email
      phone
      
      # Communication Channels
      communicationChannels {
        id
        communicationChannelRef
        value
        valueExtension
        source
        activeFrom
        activeTo
        communicationChannel {
          id
          value
          code
        }
      }
      
      ownerEmployeeId
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
      
      notesSummary
      businessKey
      
      academicTitle {
        id
        value
        code
        objectValue
      }
      academicTitleRef
      languageRef
      
      # Account relationships
      investmentAccountContact(where: { isDeleted: { _eq: false } }) {
        id
        account {
          id
          name
        }
      }
      
      createdAt
      createdBy
      additionalProperties

    }
  }
`

export const useGetInvestmentContactData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentContactData = async (variables: InvestmentContactQueryVariables) => {
    const query = GET_INVESTMENT_CONTACT_BY_ID
    try {
      const result = await graphqlClient.request<InvestmentContactDataResponse>(query, variables)
      return result
    } catch (error) {
      console.error('Error fetching investment contact data:', error)
      throw error
    }
  }

  return { fetchInvestmentContactData }
}
