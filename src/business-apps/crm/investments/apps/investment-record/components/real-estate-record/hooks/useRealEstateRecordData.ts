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

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('RealEstateRecordData: Process completion event received:', event.type, event.detail);
        
        // Skip immediate form submission events from AppActionForm to avoid double refresh
        if (event.type === 'com.newwork.process.continue' && 
            event.detail?.event === 'pse_submit') {
          console.log('RealEstateRecordData: Skipping immediate form submission event to avoid double refresh');
          return;
        }
        
        // Check for successful completion from backend
        if (event.detail?.resolution === 'success') {
          console.log('RealEstateRecordData: Backend process completed successfully, refreshing real estate investment data');
          fetchRealEstateData();
          return;
        }
        
        // Check for different event structures - specifically for real estate investments
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || 
            response?.investment || 
            response?.realEstateInvestment) {
          console.log('RealEstateRecordData: Real estate investment data detected from backend, refreshing record');
          fetchRealEstateData();
          return;
        }
        
        // Check for continue events with actual backend payload (not form submission)
        if (event.type === 'com.newwork.process.continue' && 
            event.detail?.payload && 
            event.detail?.event !== 'pse_submit') {
          console.log('RealEstateRecordData: Backend continue event with payload detected, refreshing data');
          fetchRealEstateData();
        }
      } catch (err) {
        console.error('Error handling process completion in RealEstateRecordData:', err);
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
  }, [fetchRealEstateData]);

  return {
    realEstateData,
    isLoading,
    error,
    refetch: fetchRealEstateData
  };
}; 