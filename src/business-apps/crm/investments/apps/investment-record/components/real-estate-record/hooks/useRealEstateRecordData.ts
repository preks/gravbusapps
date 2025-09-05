import { useState, useEffect, useCallback } from 'react';
import { useGetInvestmentById } from '@/common/data/investment';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { Investment, RealEstateInvestment } from '@/common/data/investment';

export interface RealEstateInvestmentData {
  investment: Investment;
  realEstateInvestment?: RealEstateInvestment;
}

export const useRealEstateRecordData = (context: BusinessAppContextProps, investmentId?: string) => {
  const [realEstateData, setRealEstateData] = useState<RealEstateInvestmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestmentById } = useGetInvestmentById(context);

  const fetchRealEstateData = useCallback(async () => {
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

      // Check if this investment has real estate-specific data (array format)
      const realEstateInvestmentArray = (result.investment as any).realEstateInvestment;
      const hasRealEstateData = realEstateInvestmentArray && 
                               Array.isArray(realEstateInvestmentArray) && 
                               realEstateInvestmentArray.length > 0;

      // Always create the real estate data structure, even without real estate-specific data
      const realEstateInvestmentData: RealEstateInvestmentData = {
        investment: result.investment,
        realEstateInvestment: hasRealEstateData ? realEstateInvestmentArray[0] : undefined
      };

      setRealEstateData(realEstateInvestmentData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred while fetching real estate data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [investmentId, context.accessToken, fetchInvestmentById]);

  useEffect(() => {
    fetchRealEstateData();
  }, [fetchRealEstateData]);

  return {
    realEstateData,
    isLoading,
    error,
    refetch: fetchRealEstateData
  };
}; 