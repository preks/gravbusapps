import { useCallback } from 'react'
import { useInvestmentReportClient } from '@/common/network/investment-reports'
import type { OpportunityData } from './useOpportunityData'
import type { AccountOption } from './useOpportunityAccounts'
import type { ContactOption } from './useOpportunityContacts'
import type { EmployeeOption } from './useTeamEmployees'

// Actual API response structure
interface ActualApiResponse {
  id: string
  reportPath: string
  templateName: string
  reportData: any
}

// Standardized response format
interface NdaReportResponse {
  success: boolean
  reportUrl?: string
  filename?: string
  message?: string
}

export interface NdaReportData {
  investmentOpportunityName: string
  investmentOpportunityStreet: string
  investmentOpportunityAddressPostalCode: string
  investmentOpportunityAddressCity: string
  investmentOpportunityAddressRegion: string
  investmentOpportunityAddressCountry: string
  athosLegalName: string
  athosLegalStreet: string
  athosLegalAddressPostalCode: string
  athosLegalAddressCity: string
  athosLegalAddressRegion: string
  athosLegalAddressCountry: string
  contactFirstName: string
  contactLastName: string
  contactJobPosition: string
  athosContactFirstName: string
  athosContactLastName: string
  athosContactJobPosition: string
}

export interface GenerateNdaReportParams {
  opportunity: OpportunityData
  account: AccountOption | null
  contact: ContactOption | null
  employee: EmployeeOption
}

export const useNdaReportGeneration = (accessToken: string) => {
  const reportClient = useInvestmentReportClient(accessToken)

  const generateNdaReport = useCallback(
    async (params: GenerateNdaReportParams): Promise<NdaReportResponse> => {
      const { opportunity, account, contact, employee } = params

      // Prepare report data matching the required structure
      const reportData: NdaReportData = {
        // Investment Opportunity Details (using selected account PRIMARY address)
        investmentOpportunityName: opportunity.name || '',
        investmentOpportunityStreet: account?.address?.addressLine || '',
        investmentOpportunityAddressPostalCode: account?.address?.postalCode || '',
        investmentOpportunityAddressCity: account?.address?.locality || '',
        investmentOpportunityAddressRegion: account?.address?.region || '',
        investmentOpportunityAddressCountry: account?.address?.country || '',

        // Athos Legal Details (Your company details - from opportunity's company)
        athosLegalName: opportunity.company?.name || '',
        athosLegalStreet: '', // Company address not available in current schema
        athosLegalAddressPostalCode: '',
        athosLegalAddressCity: '',
        athosLegalAddressRegion: '',
        athosLegalAddressCountry: '',

        // Contact Details (from selected contact)
        contactFirstName: contact?.firstName || '',
        contactLastName: contact?.lastName || '',
        contactJobPosition: contact?.jobPosition || '',

        // Athos Contact Details (from selected employee)
        athosContactFirstName: employee.firstName || '',
        athosContactLastName: employee.lastName || '',
        athosContactJobPosition: employee.employeePosition?.jobPosition?.name || ''
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
