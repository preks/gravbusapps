import { useState, useEffect, useCallback } from 'react';
import { useGetInvestmentById } from '@/common/data/investment';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { Investment, LiquidFundInvestment } from '@/common/data/investment';

export interface LiquidFundInvestmentData {
  // Core investment data
  investment: Investment;
  // Liquid fund-specific data if available
  liquidFundInvestment?: LiquidFundInvestment;
}

export const useLiquidFundData = (context: BusinessAppContextProps, investmentId?: string) => {
  const [liquidFundData, setLiquidFundData] = useState<LiquidFundInvestmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestmentById } = useGetInvestmentById(context);

  const fetchLiquidFundData = useCallback(async () => {
    if (!investmentId || !context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching liquid fund data for investmentId:', investmentId);

      const result = await fetchInvestmentById(investmentId);

      if (!result.investment) {
        const errorMsg = `No investment found for ID: ${investmentId}`;
        console.warn(errorMsg);
        setError(errorMsg);
        return;
      }

      // Check if this investment has liquid fund-specific data
      const hasLiquidFundData = result.investment.liquidFundInvestment && 
                                Object.keys(result.investment.liquidFundInvestment).length > 0;

      if (!hasLiquidFundData) {
        const errorMsg = `Investment ${investmentId} is not a liquid fund investment or has no liquid fund-specific data`;
        console.warn(errorMsg);
        setError(errorMsg);
        return;
      }

      // Create the liquid fund data structure
      const liquidFundInvestmentData: LiquidFundInvestmentData = {
        investment: result.investment,
        liquidFundInvestment: result.investment.liquidFundInvestment
      };

      setLiquidFundData(liquidFundInvestmentData);
      console.log('Successfully loaded liquid fund data:', liquidFundInvestmentData);

    } catch (err) {
      console.error('Error fetching liquid fund data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred while fetching liquid fund data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [investmentId, context.accessToken, fetchInvestmentById]);

  useEffect(() => {
    fetchLiquidFundData();
  }, [fetchLiquidFundData]);

  return {
    liquidFundData,
    isLoading,
    error,
    refetch: fetchLiquidFundData
  };
}; 