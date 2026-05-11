import { useCallback } from 'react'
import { useInvestmentReportClient } from '@/common/network/investment-reports'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
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

interface OrgchartCompanyNode {
  id: string
  type: string
  parentNode?: string
  data?: {
    companyData?: {
      name?: string
    }
  }
}

interface OrgchartStructureResponse {
  nodes: OrgchartCompanyNode[]
}

const GET_ACTIVE_STRUCTURE_ID_QUERY = `
  query GetActiveStructureIdForNda {
    Structure(where: { isActive: { _eq: true } }, limit: 1) {
      id
    }
  }
`

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
  ourCompanyLegalName: string
  ourCompanyLegalStreet: string
  ourCompanyLegalAddressPostalCode: string
  ourCompanyLegalAddressCity: string
  ourCompanyLegalAddressRegion: string
  ourCompanyLegalAddressCountry: string
  contactFirstName: string
  contactLastName: string
  contactJobPosition: string
  ourCompanyContactFirstName: string
  ourCompanyContactLastName: string
  ourCompanyContactJobPosition: string
}

export interface GenerateNdaReportParams {
  opportunity: OpportunityData
  account: AccountOption | null
  contact: ContactOption | null
  employee: EmployeeOption
}

export const useNdaReportGeneration = (accessToken: string) => {
  const reportClient = useInvestmentReportClient(accessToken)
  const graphqlClient = useGraphQLClient(accessToken)
  const orgchartClient = useOrgchartClient(accessToken)

  const getMainOrgchartCompanyName = useCallback(async (): Promise<string | null> => {
    try {
      let structureId = getCurrentActiveStructureId()

      if (!structureId) {
        const activeStructureResult = await graphqlClient.request<{ Structure?: Array<{ id?: string }> }>(
          GET_ACTIVE_STRUCTURE_ID_QUERY
        )
        structureId = activeStructureResult.Structure?.[0]?.id || null
      }

      if (!structureId) {
        return null
      }

      const structure = await orgchartClient.getStructure<OrgchartStructureResponse>(structureId, {
        nodeType: 'company'
      })
      const companyNodes = (structure.nodes || []).filter(node => node.type === 'company')
      if (!companyNodes.length) {
        return null
      }

      const rootCompany = companyNodes.find(node => !node.parentNode)
      const selectedCompany = rootCompany || companyNodes[0]
      return selectedCompany.data?.companyData?.name || null
    } catch (error) {
      console.error('Failed to load main orgchart company name:', error)
      return null
    }
  }, [graphqlClient, orgchartClient])

  const generateNdaReport = useCallback(
    async (params: GenerateNdaReportParams): Promise<NdaReportResponse> => {
      const { opportunity, account, contact, employee } = params
      const mainOrgchartCompanyName = await getMainOrgchartCompanyName()

      // Prepare report data matching the required structure
      const reportData: NdaReportData = {
        // Investment Opportunity Details (using selected account PRIMARY address)
        investmentOpportunityName: opportunity.name || '',
        investmentOpportunityStreet: account?.address?.addressLine || '',
        investmentOpportunityAddressPostalCode: account?.address?.postalCode || '',
        investmentOpportunityAddressCity: account?.address?.locality || '',
        investmentOpportunityAddressRegion: account?.address?.region || '',
        investmentOpportunityAddressCountry: account?.address?.country || '',

        // Our company legal details (from opportunity's company)
        ourCompanyLegalName: mainOrgchartCompanyName || opportunity.investmentCompany?.name || '',
        ourCompanyLegalStreet: '', // Company address not available in current schema
        ourCompanyLegalAddressPostalCode: '',
        ourCompanyLegalAddressCity: '',
        ourCompanyLegalAddressRegion: '',
        ourCompanyLegalAddressCountry: '',

        // Contact Details (from selected contact)
        contactFirstName: contact?.firstName || '',
        contactLastName: contact?.lastName || '',
        contactJobPosition: contact?.jobPosition || '',

        // Our company contact details (from selected employee)
        ourCompanyContactFirstName: employee.firstName || '',
        ourCompanyContactLastName: employee.lastName || '',
        ourCompanyContactJobPosition: employee.employeePosition?.jobPosition?.name || ''
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
    [getMainOrgchartCompanyName, reportClient]
  )

  return { generateNdaReport }
}
