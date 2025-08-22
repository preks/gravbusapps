import { useState, useEffect, useCallback } from 'react';
import { useGetInvestmentById } from '@/common/data/investment';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { Investment, EquityInvestment } from '@/common/data/investment';

export interface EquityInvestmentData {
  // Core investment data
  investment: Investment;
  // Equity-specific data if available
  equityInvestment?: EquityInvestment;
}

export const useEquityRecordData = (context: BusinessAppContextProps, investmentId?: string) => {
  const [equityData, setEquityData] = useState<EquityInvestmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestmentById } = useGetInvestmentById(context);

  const fetchEquityData = useCallback(async () => {
    if (!investmentId || !context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching equity data for investmentId:', investmentId);

      const result = await fetchInvestmentById(investmentId);

      if (!result.investment) {
        const errorMsg = `No investment found for ID: ${investmentId}`;
        console.warn(errorMsg);
        setError(errorMsg);
        return;
      }

      // Check if this investment has equity-specific data
      const hasEquityData = result.investment.equityInvestment && 
                           Object.keys(result.investment.equityInvestment).length > 0;

      if (!hasEquityData) {
        const errorMsg = `Investment ${investmentId} is not an equity investment or has no equity-specific data`;
        console.warn(errorMsg);
        setError(errorMsg);
        return;
      }

      // Create the equity data structure
      const equityInvestmentData: EquityInvestmentData = {
        investment: result.investment,
        equityInvestment: result.investment.equityInvestment
      };

      setEquityData(equityInvestmentData);
      console.log('Successfully loaded equity data:', equityInvestmentData);

    } catch (err) {
      console.error('Error fetching equity data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred while fetching equity data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [investmentId, context.accessToken, fetchInvestmentById]);

  useEffect(() => {
    fetchEquityData();
  }, [fetchEquityData]);

  return {
    equityData,
    isLoading,
    error,
    refetch: fetchEquityData
  };
}; 