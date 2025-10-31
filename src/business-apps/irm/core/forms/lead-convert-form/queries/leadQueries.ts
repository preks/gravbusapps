// GraphQL query for fetching complete lead data for pre-filling account and contact forms
export const GET_INVESTMENT_LEAD_PREFILL_DATA = `
  query GetInvestmentLeadPrefillData($leadId: uuid!) {
    InvestmentLead(where: { id: { _eq: $leadId } }) {
      id
      businessKey
      code
      description
      
      # Personal information for contact pre-filling
      firstName
      lastName
      email
      phoneNumber
      position
      
      # Company information for account pre-filling
      companyName
      companyEmail
      companyPhone
      companyWebsite
      
      # Address information
      addressLine
      postalCode
      locality
      countryRef
      country {
        id
        value
      }
      regionRef
      region {
        id
        value
      }
      
      # Catalog relationships for account pre-filling
      legalForm {
        id
        value
      }
      legalFormRef
      companySize {
        id
        value
      }
      companySizeRef
      industryClass {
        id
        value
      }
      industryClassRef
      accountAnnualRevenueBand {
        id
        value
      }
      accountAnnualRevenueBandRef
      
      # Catalog relationships for contact pre-filling
      academicTitle {
        id
        value
      }
      academicTitleRef
      salutation {
        id
        value
      }
      salutationRef
      
      # Communication Channels (for LinkedIn, Xing, etc.)
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
      
      # Owner information
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
      ownerEmployeeId
      
      # Investment-specific fields for opportunity pre-filling
      investmentName
      investmentGroup {
        id
        value
      }
      investmentGroupRef
      investmentType {
        id
        value
      }
      investmentTypeRef
      investmentRole {
        id
        value
      }
      investmentRoleRef
      investmentStakeType {
        id
        value
      }
      investmentStakeTypeRef
      stakePercentage
      marketValue
      initialInvestmentAmount
      loanAmount
      loanInterestRate
      requiredCapitalAmount
      forecastedProfitAmount
      annualNetColdRent
      
      # Real Estate Specific Fields
      buildingYear
      size
      sizeMeasurementUnitRef
      sizeMeasurementUnit {
        id
        value
      }
    }
  }
`

// GraphQL queries for fetching account and contact lists with infinite scrolling support
export const GET_INVESTMENT_ACCOUNTS_LIST = (variables: {
  limit?: number
  offset?: number
  search?: string | null
}) => {
  const searchFilter = variables.search ? `name: { _ilike: "%${variables.search}%" }` : ''

  const whereClause = variables.search
    ? `where: { 
        isDeleted: { _eq: false },
        ${searchFilter}
      }`
    : `where: { isDeleted: { _eq: false } }`

  return `
    query GetInvestmentAccountsList {
      InvestmentAccount(
        ${whereClause}
        limit: ${variables.limit || 20}
        offset: ${variables.offset || 0}
        orderBy: [{ name: ASC }]
      ) {
        id
        name
        email
        website
        foundationDate
        ownerEmployee {
          displayName
        }
      }
      
      InvestmentAccountAggregate(
        ${whereClause}
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

export const GET_INVESTMENT_CONTACTS_LIST = (variables: {
  limit?: number
  offset?: number
  search?: string | null
}) => {
  const searchFilter = variables.search
    ? `_or: [
        { firstName: { _ilike: "%${variables.search}%" } },
        { lastName: { _ilike: "%${variables.search}%" } },
        { fullName: { _ilike: "%${variables.search}%" } },
        { email: { _ilike: "%${variables.search}%" } }
      ]`
    : ''

  const whereClause = variables.search
    ? `where: { 
        isDeleted: { _eq: false },
        ${searchFilter}
      }`
    : `where: { isDeleted: { _eq: false } }`

  return `
    query GetInvestmentContactsList {
      InvestmentContact(
        ${whereClause}
        limit: ${variables.limit || 20}
        offset: ${variables.offset || 0}
        orderBy: [{ fullName: ASC }]
      ) {
        id
        firstName
        lastName
        fullName
        email
        jobPosition
        ownerEmployee {
          displayName
        }
      }
      
      InvestmentContactAggregate(
        ${whereClause}
      ) {
        aggregate {
          count
        }
      }
    }
  `
}
