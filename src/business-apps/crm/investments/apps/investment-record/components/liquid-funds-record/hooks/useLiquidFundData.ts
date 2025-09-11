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

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('LiquidFundData: Process completion event received:', event.type, event.detail);
        
        // Skip immediate form submission events from AppActionForm to avoid double refresh
        if (event.type === 'com.newwork.process.continue' && 
            event.detail?.event === 'pse_submit') {
          console.log('LiquidFundData: Skipping immediate form submission event to avoid double refresh');
          return;
        }
        
        // Check for successful completion from backend
        if (event.detail?.resolution === 'success') {
          console.log('LiquidFundData: Backend process completed successfully, refreshing liquid fund investment data');
          fetchLiquidFundData();
          return;
        }
        
        // Check for different event structures - specifically for liquid fund investments
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || 
            response?.investment || 
            response?.liquidFundInvestment) {
          console.log('LiquidFundData: Liquid fund investment data detected from backend, refreshing record');
          fetchLiquidFundData();
          return;
        }
        
        // Check for continue events with actual backend payload (not form submission)
        if (event.type === 'com.newwork.process.continue' && 
            event.detail?.payload && 
            event.detail?.event !== 'pse_submit') {
          console.log('LiquidFundData: Backend continue event with payload detected, refreshing data');
          fetchLiquidFundData();
        }
      } catch (err) {
        console.error('Error handling process completion in LiquidFundData:', err);
      }
    };

    // Listen to multiple possible event names for investment updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion',
    ];

    eventNames.forEach((eventName) => {
      window.addEventListener(eventName, handleProcessCompletion);
    });

    return () => {
      eventNames.forEach((eventName) => {
        window.removeEventListener(eventName, handleProcessCompletion);
      });
    };
  }, [fetchLiquidFundData]);

  return {
    liquidFundData,
    isLoading,
    error,
    refetch: fetchLiquidFundData
  };
};