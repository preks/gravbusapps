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

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('EquityRecordData: Process completion event received:', event.type, event.detail);
        
        // Skip immediate form submission events from AppActionForm to avoid double refresh
        if (event.type === 'com.newwork.process.continue' && 
            event.detail?.event === 'pse_submit') {
          console.log('EquityRecordData: Skipping immediate form submission event to avoid double refresh');
          return;
        }
        
        // Check for successful completion from backend
        if (event.detail?.resolution === 'success') {
          console.log('EquityRecordData: Backend process completed successfully, refreshing equity investment data');
          fetchEquityData();
          return;
        }
        
        // Check for different event structures - specifically for equity investments
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || 
            response?.investment || 
            response?.equityInvestment) {
          console.log('EquityRecordData: Equity investment data detected from backend, refreshing record');
          fetchEquityData();
          return;
        }
        
        // Check for continue events with actual backend payload (not form submission)
        if (event.type === 'com.newwork.process.continue' && 
            event.detail?.payload && 
            event.detail?.event !== 'pse_submit') {
          console.log('EquityRecordData: Backend continue event with payload detected, refreshing data');
          fetchEquityData();
        }
      } catch (err) {
        console.error('Error handling process completion in EquityRecordData:', err);
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
  }, [fetchEquityData]);

  return {
    equityData,
    isLoading,
    error,
    refetch: fetchEquityData
  };
}; 