import { useState, useEffect, useCallback } from 'react';
import { useGetInvestmentById } from '@/common/data/investment';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { Investment, LiquidFundInvestment } from '@/common/data/investment';

export interface LiquidFundInvestmentData {
  investment: Investment;
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
      const result = await fetchInvestmentById(investmentId);

      if (!result.investment) {
        const errorMsg = `No investment found for ID: ${investmentId}`;
        setError(errorMsg);
        return;
      }

      const rawLiquidFund = (result.investment as any)?.liquidFundInvestment;
      const normalizedLiquidFund = Array.isArray(rawLiquidFund) ? (rawLiquidFund[0] || undefined) : rawLiquidFund;

      const hasLiquidFundData = !!normalizedLiquidFund;
      if (!hasLiquidFundData) {
        const errorMsg = `Investment ${investmentId} is not a liquid fund investment or has no liquid fund-specific data`;
        setError(errorMsg);
        return;
      }

      const liquidFundInvestmentData: LiquidFundInvestmentData = {
        investment: result.investment,
        liquidFundInvestment: normalizedLiquidFund
      };

      setLiquidFundData(liquidFundInvestmentData);
    } catch (err) {
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