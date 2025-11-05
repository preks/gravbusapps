import { INVESTMENT_ACTIVITY } from './fragments/investmentRelationFragments'

// Query variables interface
export interface InvestmentActivityQueryVariables {
  id?: string
  offset?: number
  limit?: number
  search?: string
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
}

// Get investment activity by ID
export const GET_INVESTMENT_ACTIVITY_BY_ID = (id: string): string => `
  query GetInvestmentActivityById {
    InvestmentActivity(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
      ${INVESTMENT_ACTIVITY}
      
      # Entity references
      investment {
        id
        code
        name
      }
      account {
        id
        name
      }
      contact {
        id
        firstName
        lastName
      }
      opportunity {
        id
        name
      }
      lead {
        id
        firstName
        lastName
      }
      
      # Documents relationship
      investmentDocument(where: { isDeleted: { _eq: false } }) {
        id
        version
        name
        description
        file
        fileSize
        mimeType
        documentGroup {
          id
          value
          code
        }
        documentType {
          id
          value
          code
        }
      }
    }
  }
`

// Get investment activities with filtering
export const GET_INVESTMENT_ACTIVITIES = (variables: InvestmentActivityQueryVariables = {}): string => {
  const whereConditions = [`isDeleted: { _eq: false }`]

  if (variables.id) {
    whereConditions.push(`id: { _eq: "${variables.id}" }`)
  }

  if (variables.accountId) {
    whereConditions.push(`account: { id: { _eq: "${variables.accountId}" } }`)
  }

  if (variables.contactId) {
    whereConditions.push(`contact: { id: { _eq: "${variables.contactId}" } }`)
  }

  if (variables.opportunityId) {
    whereConditions.push(`opportunity: { id: { _eq: "${variables.opportunityId}" } }`)
  }

  if (variables.leadId) {
    whereConditions.push(`lead: { id: { _eq: "${variables.leadId}" } }`)
  }

  if (variables.search?.trim()) {
    const searchPattern = `%${variables.search.trim()}%`
    whereConditions.push(`
      _or: [
        { title: { _ilike: "${searchPattern}" } }
        { description: { _ilike: "${searchPattern}" } }
      ]
    `)
  }

  const whereClause = `where: { ${whereConditions.join(', ')} }`

  return `
    query GetInvestmentActivities(
      $offset: Int = ${variables.offset || 0}
      $limit: Int = ${variables.limit || 20}
    ) {
      InvestmentActivity(
        ${whereClause}
        offset: $offset
        limit: $limit
      ) {
        ${INVESTMENT_ACTIVITY}
      }
      InvestmentActivityAggregate {
        aggregate {
          count
        }
      }
    }
  `
}

// Get investment activities by account ID (alias for backward compatibility)
export const GET_INVESTMENT_ACTIVITIES_BY_ACCOUNT_ID = (accountId: string): string => {
  return GET_INVESTMENT_ACTIVITIES({ accountId })
}
