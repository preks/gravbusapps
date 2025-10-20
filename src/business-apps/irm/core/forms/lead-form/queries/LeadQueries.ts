import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'

export interface InvestmentLeadQueryVariables {
  id: string
}

export interface InvestmentLeadQueryResult {
  id: string
  code?: string
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  position?: string

  // Company Information
  companyName?: string
  companyEmail?: string
  companyPhone?: string
  companyWebsite?: string

  // Owner Information
  ownerEmployeeId?: string // ✅ ADDED - This was missing!
  ownerEmployee?: {
    id: string
    firstName: string
    lastName: string
    displayName: string
  }

  // Contact Information
  academicTitleRef?: string // ✅ ADDED
  academicTitle?: {
    id: string
    code: string
    value: string
  }

  // Lead Information
  leadSourceRef?: string
  leadSource?: {
    id: string
    code: string
    value: string
  }
  leadSourceType?: string // ✅ ADDED
  leadStatusRef?: string
  leadStatus?: {
    id: string
    code: string
    value: string
  }
  leadRatingRef?: string
  leadRating?: {
    id: string
    code: string
    value: string
  }
  description?: string // ✅ ADDED - Lead description/notes
  sensitive?: boolean // ✅ ADDED

  // Company Details
  legalFormRef?: string
  legalForm?: {
    id: string
    code: string
    value: string
  }
  industryClassRef?: string // ✅ FIXED - was industryRef
  industryClass?: {
    id: string
    code: string
    value: string
  }
  companySizeRef?: string
  companySize?: {
    id: string
    code: string
    value: string
  }
  accountAnnualRevenueBandRef?: string
  accountAnnualRevenueBand?: {
    id: string
    code: string
    value: string
  }

  // Address Information - Direct fields (NOT addresses relationship)
  addressLine?: any // JSON field with lines array
  locality?: string
  postalCode?: string
  countryRef?: string
  country?: {
    id: string
    code: string
    value: string
  }
  regionRef?: string
  region?: {
    id: string
    code: string
    value: string
  }

  // Conversion Information
  conversionDate?: string // ✅ ADDED
  convertedAccountId?: string // ✅ ADDED
  convertedAccount?: {
    id: string
    name: string
  }
  convertedContactId?: string // ✅ ADDED
  convertedContact?: {
    id: string
    firstName: string
    lastName: string
  }
  convertedOpportunityId?: string // ✅ ADDED
  convertedOpportunity?: {
    id: string
    name: string
  }

  // Investment-specific fields
  investmentName?: string
  investmentGroupRef?: string
  investmentGroup?: {
    id: string
    code: string
    value: string
  }
  investmentTypeRef?: string
  investmentType?: {
    id: string
    code: string
    value: string
  }
  investmentRoleRef?: string
  investmentRole?: {
    id: string
    code: string
    value: string
  }
  investmentStakeTypeRef?: string
  investmentStakeType?: {
    id: string
    code: string
    value: string
  }
  stakePercentage?: number
  marketValue?: number
  initialInvestmentAmount?: number
  loanAmount?: number
  loanInterestRate?: number
  requiredCapitalAmount?: number
  forecastedProfitAmount?: number
  annualNetColdRent?: number

  // Real Estate specific fields
  buildingYear?: number
  size?: number
  sizeMeasurementUnitRef?: string
  sizeMeasurementUnit?: {
    id: string
    code: string
    value: string
  }

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

  // System fields
  version?: number
  createdAt?: string // ✅ ADDED
  updatedAt?: string // ✅ ADDED
  createdBy?: string // ✅ ADDED
  updatedBy?: string // ✅ ADDED
}

export const GET_INVESTMENT_LEAD_BY_ID = `
  query GetInvestmentLeadById($leadId: uuid!) {
    InvestmentLead(where: {id: {_eq: $leadId}}) {
      # Basic Information
      id
      code
      firstName
      lastName
      email
      phoneNumber
      position
      description
      sensitive
      
      # Company Information
      companyName
      companyEmail
      companyPhone
      companyWebsite
      
      # Owner Information - ✅ FIXED: Added ownerEmployeeId
      ownerEmployeeId
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
      
      # Contact Information - ✅ ADDED: Academic Title
      academicTitleRef
      academicTitle {
        id
        code
        value
      }
      
      # Lead Information - ✅ ADDED: leadSourceType
      leadSourceRef
      leadSource {
        id
        code
        value
      }
      leadSourceType
      leadStatusRef
      leadStatus {
        id
        code
        value
      }
      leadRatingRef
      leadRating {
        id
        code
        value
      }
      
      # Company Details - ✅ FIXED: industryClassRef (was industryRef)
      legalFormRef
      legalForm {
        id
        code
        value
      }
      industryClassRef
      industryClass {
        id
        code
        value
      }
      companySizeRef
      companySize {
        id
        code
        value
      }
      accountAnnualRevenueBandRef
      accountAnnualRevenueBand {
        id
        code
        value
      }
      
      # Address Information - Direct fields (NOT addresses relationship)
      addressLine
      locality
      postalCode
      countryRef
      country {
        id
        code
        value
      }
      regionRef
      region {
        id
        code
        value
      }
      
      # Conversion Information - ✅ ADDED: All conversion fields
      conversionDate
      convertedAccountId
      convertedAccount {
        id
        name
      }
      convertedContactId
      convertedContact {
        id
        firstName
        lastName
      }
      convertedOpportunityId
      convertedOpportunity {
        id
        name
      }
      
      # Investment-specific fields
      investmentName
      investmentGroupRef
      investmentGroup {
        id
        code
        value
      }
      investmentTypeRef
      investmentType {
        id
        code
        value
      }
      investmentRoleRef
      investmentRole {
        id
        code
        value
      }
      investmentStakeTypeRef
      investmentStakeType {
        id
        code
        value
      }
      stakePercentage
      marketValue
      initialInvestmentAmount
      loanAmount
      loanInterestRate
      requiredCapitalAmount
      forecastedProfitAmount
      annualNetColdRent
      
      # Real Estate specific fields
      buildingYear
      size
      sizeMeasurementUnitRef
      sizeMeasurementUnit {
        id
        code
        value
      }
      
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
      
      # System fields - ✅ ADDED: All system fields
      version
      createdAt
      updatedAt
      createdBy
      updatedBy
    }
  }
`

export const useGetInvestmentLeadById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentLeadById = useCallback(
    async (leadId: string): Promise<InvestmentLeadQueryResult | null> => {
      if (!leadId) return null

      try {
        const result = await graphqlClient.request<{
          InvestmentLead: InvestmentLeadQueryResult[]
        }>(GET_INVESTMENT_LEAD_BY_ID, { leadId: leadId })
        return result.InvestmentLead?.[0] || null
      } catch (error) {
        console.error('Error fetching investment lead by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentLeadById }
}

// Legacy exports for backward compatibility (can be removed later)
export const GET_LEAD_BY_ID = GET_INVESTMENT_LEAD_BY_ID
export const useGetLeadById = useGetInvestmentLeadById
export type LeadQueryResult = InvestmentLeadQueryResult
export type LeadQueryVariables = InvestmentLeadQueryVariables
