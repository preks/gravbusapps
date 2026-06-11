import { useCallback } from 'react'
import { useInvestmentReportClient } from '@/common/network/investment-reports'
import type { InvestmentAddressData, OpportunityData } from './useOpportunityData'
import type { AccountOption } from './useOpportunityAccounts'
import type { ContactOption } from './useOpportunityContacts'
import type { ExecutiveOption } from './useCompanyExecutives'

// Actual API response structure
interface ActualApiResponse {
  id: string
  reportPath: string
  templateName: string
  reportData: any
}

interface NormalizedAddress {
  street: string
  postalCode: string
  city: string
  region: string
  country: string
}

const extractAddressLine = (addressLine: unknown): string => {
  if (!addressLine) return ''
  if (typeof addressLine === 'string') return addressLine
  if (typeof addressLine === 'object') {
    const lines = (addressLine as { lines?: unknown }).lines
    if (Array.isArray(lines) && typeof lines[0] === 'string') {
      return lines[0]
    }
  }
  return ''
}

// Pick the PRIMARY address when available, otherwise the first entry, and
// flatten it into the flat string fields the NDA template expects.
const normalizeInvestmentAddress = (addresses?: InvestmentAddressData[] | null): NormalizedAddress => {
  const primaryAddress = addresses?.find(address => address.addressType === 'PRIMARY_ADDRESS') || addresses?.[0]

  return {
    street: extractAddressLine(primaryAddress?.addressLine),
    postalCode: primaryAddress?.postalCode || '',
    city: primaryAddress?.locality || '',
    region: primaryAddress?.region?.value || '',
    country: primaryAddress?.country?.value || ''
  }
}

// Standardized response format
interface NdaReportResponse {
  success: boolean
  reportUrl?: string
  filename?: string
  message?: string
}

export interface NdaReportData {
  investmentOpportunityAccountName: string
  investmentOpportunityAccountAddressStreet: string
  investmentOpportunityAccountAddressPostalCode: string
  investmentOpportunityAccountAddressCity: string
  investmentOpportunityAccountAddressRegion: string
  investmentOpportunityAccountAddressCountry: string
  investmentCompanyName: string
  investmentCompanyAddressStreet: string
  investmentCompanyAddressPostalCode: string
  investmentCompanyAddressCity: string
  investmentCompanyAddressRegion: string
  investmentCompanyAddressCountry: string
  investmentOpportunityContactFullName: string
  investmentOpportunityContactJobPosition: string
  investmentCompanyExecutiveFullName: string
  investmentCompanyExecutiveJobPosition: string
}

export interface GenerateNdaReportParams {
  opportunity: OpportunityData
  account: AccountOption | null
  contact: ContactOption | null
  executive: ExecutiveOption | null
}

export const useNdaReportGeneration = (accessToken: string) => {
  const reportClient = useInvestmentReportClient(accessToken)

  const generateNdaReport = useCallback(
    async (params: GenerateNdaReportParams): Promise<NdaReportResponse> => {
      const { opportunity, account, contact, executive } = params

      // Our company address comes from the selected opportunity's investmentCompany.
      const companyAddress = normalizeInvestmentAddress(opportunity.investmentCompany?.investmentAddress)

      // Prepare report data matching the required structure
      const reportData: NdaReportData = {
        // Investment Opportunity Account (from the selected account and its PRIMARY address)
        investmentOpportunityAccountName: account?.name || '',
        investmentOpportunityAccountAddressStreet: account?.address?.addressLine || '',
        investmentOpportunityAccountAddressPostalCode: account?.address?.postalCode || '',
        investmentOpportunityAccountAddressCity: account?.address?.locality || '',
        investmentOpportunityAccountAddressRegion: account?.address?.region || '',
        investmentOpportunityAccountAddressCountry: account?.address?.country || '',

        // Investment Company (from the selected opportunity's investmentCompany)
        investmentCompanyName: opportunity.investmentCompany?.name || '',
        investmentCompanyAddressStreet: companyAddress.street,
        investmentCompanyAddressPostalCode: companyAddress.postalCode,
        investmentCompanyAddressCity: companyAddress.city,
        investmentCompanyAddressRegion: companyAddress.region,
        investmentCompanyAddressCountry: companyAddress.country,

        // Investment Opportunity Contact (from the selected contact)
        investmentOpportunityContactFullName: contact?.name || '',
        investmentOpportunityContactJobPosition: contact?.jobPosition || '',

        // Investment Company Executive (from the selected executive)
        investmentCompanyExecutiveFullName: executive?.name || '',
        investmentCompanyExecutiveJobPosition: executive?.jobPosition || ''
      }

      // Prepare the request payload - NDA API expects investment object + flat structure in reportData
      const requestPayload = {
        templateName: 'NDA.odt',
        reportData: {
          investment: {
            name: opportunity.investmentName || opportunity.name || '',
            investmentTypeRef: opportunity.investmentTypeRef || ''
          },
          ...reportData // Spread the flat NDA fields
        }
      }

      try {
        const apiResponse = (await reportClient.generateInvestmentReport(
          requestPayload as any
        )) as unknown as ActualApiResponse

        let reportUrl = ''
        let filename = 'NDA.pdf'

        // Extract fileId from FileInfo string
        if (apiResponse.reportPath) {
          const fileIdRegex = /fileId=([^,)]+)/
          const fileIdMatch = fileIdRegex.exec(apiResponse.reportPath)
          if (fileIdMatch?.[1]) {
            filename = fileIdMatch[1]
            reportUrl = `/files/api/v1/tenant/downloads/investment_relations/generated-reports/${filename}`
          }
        }

        return {
          success: !!apiResponse.id,
          reportUrl: reportUrl,
          filename: filename,
          message: apiResponse.id ? 'Report generated successfully' : 'Failed to generate report'
        }
      } catch (error) {
        console.error('Failed to generate NDA report:', error)
        throw error
      }
    },
    [reportClient]
  )

  return { generateNdaReport }
}
