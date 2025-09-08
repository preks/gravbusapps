import { useState, useEffect, useCallback } from 'react';
import { useGetInvestmentById } from '@/common/data/investment';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { Investment, EquityInvestment } from '@/common/data/investment';

export interface EquityInvestmentData {
  investment: Investment;
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
      const result = await fetchInvestmentById(investmentId);

      if (!result.investment) {
        const errorMsg = `No investment found for ID: ${investmentId}`;
        console.warn(errorMsg);
        setError(errorMsg);
        return;
      }

      // Check if this investment has equity-specific data (array format)
      const equityInvestmentArray = (result.investment as any).equityInvestment;
      const hasEquityData = equityInvestmentArray && 
                           Array.isArray(equityInvestmentArray) && 
                           equityInvestmentArray.length > 0;

      // Always create the equity data structure, even without equity-specific data
      const equityInvestmentData: EquityInvestmentData = {
        investment: result.investment,
        equityInvestment: hasEquityData ? equityInvestmentArray[0] : undefined
      };

      setEquityData(equityInvestmentData);

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