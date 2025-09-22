import { useMemo } from 'react';
import { InvestmentReportClient } from './InvestmentReportClient';

export const useInvestmentReportClient = (accessToken: string) => {
  const client = useMemo(() => new InvestmentReportClient(), []);
  
  return useMemo(() => ({
    generateInvestmentReport: (request: any) => 
      client.generateInvestmentReport(request, accessToken),
    generateInvestmentReportBlob: (request: any) => 
      client.generateInvestmentReportBlob(request, accessToken),
  }), [client, accessToken]);
};
