import { useState, useEffect, useCallback, useRef } from 'react';
import { GuardianDataHookParams, GuardianDataHookResult, GuardianNetworkData, GuardianStatistics } from '../types/guardianTypes';
import { useGuardianWorkflowData } from './useGuardianWorkflowData';
import { useGuardianOrganizationalData } from './useGuardianOrganizationalData';
import { GuardianDataTransformationService } from '../utils/guardianDataTransformationService';
import { getAuditLogs } from '../queries/GuardianQueries';

export const useGuardianData = ({
  accessToken,
  viewMode,
  filters,
  isRealTime,
  refreshInterval = 30000, // 30 seconds default - much more reasonable for real-time updates
  userId
}: GuardianDataHookParams): GuardianDataHookResult => {
  const [networkData, setNetworkData] = useState<GuardianNetworkData | null>(null);
  const [statistics, setStatistics] = useState<GuardianStatistics | null>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to track interval and prevent memory leaks
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Data fetching hooks
  const { 
    fetchWorkflowData, 
    isLoading: workflowLoading 
  } = useGuardianWorkflowData(accessToken, userId);
  
  const { 
    fetchOrganizationalData, 
    isLoading: orgLoading 
  } = useGuardianOrganizationalData(accessToken);

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setError('Access token is required');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Fetch data from multiple sources in parallel
      const promises = [
        fetchWorkflowData({ viewMode, filters }),
        fetchOrganizationalData({ viewMode, filters })
      ];

      // Add audit data fetch with time range filtering (needed for timeline card)
      {
        // Calculate date range based on filters.timeRange
        const now = new Date();
        let startDate: Date;
        
        switch (filters.timeRange) {
          case '1h':
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case '6h':
            startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'all':
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
            break;
        }

        promises.push(
          getAuditLogs(accessToken, {
            limit: 200,
            startDate: startDate.toISOString(),
            endDate: now.toISOString()
          }).catch(error => {
            console.warn('Failed to fetch audit logs:', error);
            return {
              data: {
                entries: [],
                total: 0,
                summary: {}
              }
            };
          })
        );
      }

      const results = await Promise.all(promises);
      const [workflowData, organizationalData, auditResponse] = results;

      if (!mountedRef.current) return; // Component unmounted

      // Set audit data if available (always set since timeline card is always visible)
      if (auditResponse) {
        setAuditData(auditResponse.data);
      } else {
        setAuditData(null);
      }

      // Transform and combine data based on view mode
      const transformedData = GuardianDataTransformationService.transformToNetworkData({
        workflowData,
        organizationalData,
        viewMode,
        filters
      });

      // Calculate statistics using real backend data
      const calculatedStatistics = GuardianDataTransformationService.calculateStatistics({
        workflowData,
        organizationalData,
        networkData: transformedData
      });

      setNetworkData(transformedData);
      setStatistics(calculatedStatistics);
    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error loading Guardian data:', err);
      setError(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [accessToken, viewMode, filters, fetchWorkflowData, fetchOrganizationalData]);

  const refetch = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Set up real-time polling
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Initial load
    loadData();

    // Set up real-time polling if enabled
    if (isRealTime && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          loadData();
        }
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRealTime, refreshInterval, loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update loading state based on sub-hooks
  const combinedLoading = isLoading || workflowLoading || orgLoading;

  return {
    networkData,
    statistics,
    auditData,
    isLoading: combinedLoading,
    error,
    refetch
  };
};
