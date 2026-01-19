import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { RestClient, type RequestOptions, ResponseType } from '../rest/RestClient'

const BASE_PATH = 'processes/investment-relations'

export interface GenerateInvestmentReportRequest {
  reportPath: string
  templateName: string
  reportData: {
    investment: any
    equityInvestment?: any
    equityInvestmentRounds?: any[]
    investmentRole?: any
    realEstateInvestment?: any
    ownerEmployeeName?: string
    holdingPeriod?: number
    aboutInvestment?: string
    motivation?: string
    topicsAndOutlook?: string[]
    aboutProjectDevelopment?: string
    review?: string
    outlook?: string[]
    mainActionItems?: string[]
    investmentPotential?: string
    aboutProperty?: string
    aboutArea?: string
  }
}

export interface GenerateInvestmentReportResponse {
  success: boolean
  reportUrl?: string
  message?: string
}

export class InvestmentReportClient extends RestClient {
  constructor() {
    let url: string = env('NEXT_PUBLIC_INVESTMENT_REPORT_API') ?? env('NEXT_PUBLIC_BASE_URL') ?? ''
    if (!url) {
      throw new Error('Missing NEXT_PUBLIC_INVESTMENT_REPORT_API or NEXT_PUBLIC_BASE_URL')
    }
    if (!url.endsWith('/')) {
      url += '/'
    }

    url += BASE_PATH

    super(url, {})
  }

  /**
   * Generate investment one-pager report
   */
  public async generateInvestmentReport(
    request: GenerateInvestmentReportRequest,
    accessToken: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GenerateInvestmentReportResponse> {
    if (!accessToken) {
      throw new Error('accessToken is required for generateInvestmentReport')
    }
    const headers = {
      ...options.headers,
      Authorization: setAccessTokenToAuthorizationHeader(accessToken)
    }

    return this.post<GenerateInvestmentReportResponse>('/generateInvestmentReport', request, {
      ...options,
      headers,
      responseType: ResponseType.JSON
    })
  }

  /**
   * Alternative method for blob response (if the API returns a file directly)
   */
  public async generateInvestmentReportBlob(
    request: GenerateInvestmentReportRequest,
    accessToken: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<Blob> {
    if (!accessToken) {
      throw new Error('accessToken is required for generateInvestmentReportBlob')
    }
    const headers = {
      ...options.headers,
      Authorization: setAccessTokenToAuthorizationHeader(accessToken)
    }

    return this.post<Blob>('/generateInvestmentReport', request, {
      ...options,
      headers,
      responseType: ResponseType.BLOB
    })
  }
}

// Singleton instance for reuse across the application
export const investmentReportClient = new InvestmentReportClient()
