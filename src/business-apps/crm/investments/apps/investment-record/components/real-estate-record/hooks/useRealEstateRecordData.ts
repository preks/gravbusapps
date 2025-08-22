import { useState, useEffect, useCallback } from 'react';
import { useGetInvestmentById } from '@/common/data/investment';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { Investment, RealEstateInvestment } from '@/common/data/investment';

export interface RealEstateInvestmentData {
  // Core investment data
  investment: Investment;
  // Real estate-specific data if available
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
      console.log('Fetching real estate data for investmentId:', investmentId);

      const result = await fetchInvestmentById(investmentId);

      if (!result.investment) {
        const errorMsg = `No investment found for ID: ${investmentId}`;
        console.warn(errorMsg);
        setError(errorMsg);
        return;
      }

      // Check if this investment has real estate-specific data
      const hasRealEstateData = result.investment.realEstateInvestment && 
                                Object.keys(result.investment.realEstateInvestment).length > 0;

      if (!hasRealEstateData) {
        const errorMsg = `Investment ${investmentId} is not a real estate investment or has no real estate-specific data`;
        console.warn(errorMsg);
        setError(errorMsg);
        return;
      }

      // Create the real estate data structure
      const realEstateInvestmentData: RealEstateInvestmentData = {
        investment: result.investment,
        realEstateInvestment: result.investment.realEstateInvestment
      };

      setRealEstateData(realEstateInvestmentData);
      console.log('Successfully loaded real estate data:', realEstateInvestmentData);

    } catch (err) {
      console.error('Error fetching real estate data:', err);
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