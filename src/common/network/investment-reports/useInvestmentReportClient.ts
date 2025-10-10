import { useCallback, useMemo } from 'react'
import { investmentReportClient } from './InvestmentReportClient'
import type { GenerateInvestmentReportRequest, GenerateInvestmentReportResponse } from './InvestmentReportClient'

export const useInvestmentReportClient = (accessToken: string) => {
  const generateInvestmentReport = useCallback(
    (request: GenerateInvestmentReportRequest): Promise<GenerateInvestmentReportResponse> =>
      investmentReportClient.generateInvestmentReport(request, accessToken),
    [accessToken]
  )

  const generateInvestmentReportBlob = useCallback(
    (request: GenerateInvestmentReportRequest): Promise<Blob> =>
      investmentReportClient.generateInvestmentReportBlob(request, accessToken),
    [accessToken]
  )

  return useMemo(
    () => ({
      generateInvestmentReport,
      generateInvestmentReportBlob
    }),
    [generateInvestmentReport, generateInvestmentReportBlob]
  )
}
