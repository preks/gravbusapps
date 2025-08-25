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
        setError(errorMsg);
        return;
      }

      const rawRei = (result.investment as any).realEstateInvestment;
      const normalizedRei = Array.isArray(rawRei) ? (rawRei[0] || null) : rawRei;

      const hasRealEstateData = !!(normalizedRei && Object.keys(normalizedRei).length > 0);
      if (!hasRealEstateData) {
        const errorMsg = `Investment ${investmentId} is not a real estate investment or has no real estate-specific data`;
        setError(errorMsg);
        return;
      }

      const realEstateInvestmentData: RealEstateInvestmentData = {
        investment: result.investment,
        realEstateInvestment: normalizedRei
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