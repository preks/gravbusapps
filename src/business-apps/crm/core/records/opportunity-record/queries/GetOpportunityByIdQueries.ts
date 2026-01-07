import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface GetOpportunityByIdResponse {
  Opportunity: OpportunityResponse[]
}

export interface StageConditionStatusResponse {
  id: string
  completed: boolean
  completedAt?: string | null
  completedByEmployee?: {
    id: string
    firstName: string
    lastName: string
    displayName: string
  } | null
  deadlineAt?: string | null
  processInstanceId?: string | null
  salesPipelineStageCondition?: {
    id: string
    value: string
    code: string
    type?: string | null
    objectValue?: any
    parentEntryId?: string | null
  }
  configSnapshot?: any
  createdAt: string
  updatedAt: string
}

export interface OpportunityResponse {
  id: string
  version: string
  name: string
  estimatedAmount?: number
  // Indicates which source app created/owns the opportunity (e.g. 'CRM' or 'IRM')
  sourceApp?: string
  salesPipelineRef?: string
  salesPipeline?: {
    id: string
    value: string
    type: string
    code: string
    objectValue?: any
  }
  salesPipelineStageRef?: string
  salesPipelineStage?: {
    id: string
    value: string
    type: string
    code: string
    objectValue?: any
  }
  opportunityStatus?: {
    id: string
    value: string
    type: string
    code: string
    objectValue?: any
  }
  currency?: {
    id: string
    value: string
    type: string
    code: string
  }
  ownerEmployee?: {
    id: string
    firstName: string
    lastName: string
  }
  opportunityAccounts?: Array<{
    id: string
    accountId: string
    accountType?: {
      id: string
      value: string
      code: string
    }
    account: {
      id: string
      version: string
      name: string
      industryRef: string
      industry: {
        id: string
        value: string
        type: string
        code: string
      }
      numberOfEmployees: {
        id: string
        value: string
        type: string
        code: string
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
      foundationDate: string
      annualRevenue: {
        id: string
        value: string
        type: string
        code: string
      }
      website: string
      ownerEmployee?: {
        firstName: string
        lastName: string
      }
    }
  }>
  lead?: {
    id: string
    companyName: string
    leadStatus: {
      id: string
      value: string
      type: string
      code: string
      objectValue?: any
    }
  }
  stageConditionStatuses?: StageConditionStatusResponse[]
  createdAt: string
  updatedAt: string
}

export interface OpportunityContactResponse {
  id: string
  version?: number
  contactType?: string
  contactId: string
  contact: {
    id: string
    version?: number
    firstName: string
    lastName: string
    email?: string
    phone?: string
    jobTitle?: string
    department?: string
    contactType?: string
    pictureUrl?: string
    academicTitle?: {
      id: string
      value: string
      code: string
    }
    communicationChannels?: Array<{
      id: string
      communicationChannelRef: string
      value: string
    }>
  }
}

export interface GetOpportunityByIdResponse {
  Opportunity: OpportunityResponse[]
  OpportunityContact?: OpportunityContactResponse[]
}

export const GET_OPPORTUNITY_BY_ID = `
  query GetOpportunityById($id: uuid!) {
    Opportunity(where: { id: {_eq: $id}, isDeleted: {_eq: false} }) {
      id
      version
      name
      sourceApp
      estimatedAmount
      salesPipelineRef
      salesPipeline {
        id
        value
        type
        code
        objectValue
      }
      salesPipelineStageRef
      salesPipelineStage {
        id
        value
        type
        code
        objectValue
      }
      opportunityStatus {
        id
        value
        type
        code
        objectValue
      }
      currency {
        id
        value
        type
        code
      }
      ownerEmployee {
        id
        firstName
        lastName
      }
      opportunityAccounts(where: { isDeleted: { _eq: false } }) {
        id
        accountId
        accountType {
          id
          value
          code
        }
        account {
          id
          version
          name
          email
          phone
          website
          industryRef
          industry {
            id
            value
            type
            code
          }
          numberOfEmployees {
            id
            value
            type
            code
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
          foundationDate
          annualRevenue {
            id
            value
            type
            code
          }
          ownerEmployee {
            firstName
            lastName
          }
        }
      }
      lead {
        id
        companyName
        leadStatus {
          id
          value
          type
          code
          objectValue
        }
      }
      stageConditionStatuses {
        id
        completed
        completedAt
        completedByEmployee {
          id
          firstName
          lastName
          displayName
        }
        deadlineAt
        processInstanceId
        salesPipelineStageCondition {
          id
          value
          code
          type
          objectValue
          parentEntryId
        }
        configSnapshot
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
    OpportunityContact(where: { opportunityId: { _eq: $id }, isDeleted: { _eq: false } }) {
      id
      version
      contactType
      contactId
      contact {
        id
        version
        firstName
        lastName
        email
        phone
        jobTitle
        department
        contactType
        pictureUrl
        academicTitle {
          id
          value
          code
        }
        communicationChannels(where: { isDeleted: { _eq: false } }) {
          id
          communicationChannelRef
          value
        }
      }
    }
  }
`

export const useGetOpportunityById = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchOpportunityById = async (id: string) => {
    try {
      const result = await graphQLClient.request<GetOpportunityByIdResponse>(GET_OPPORTUNITY_BY_ID, { id })
      return result
    } catch (error) {
      console.error('Error fetching opportunity by ID:', error)
      throw error
    }
  }

  return { fetchOpportunityById }
}
