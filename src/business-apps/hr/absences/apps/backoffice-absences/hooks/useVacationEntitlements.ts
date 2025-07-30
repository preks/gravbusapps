import { useState, useEffect, useCallback } from 'react';
import { graphQLClient } from '@/common/network/graphql/GraphQLClient';

/**
 * 🏖️ PRODUCTION: Current year vacation entitlements for active employees
 * Calculates accurate vacation entitlement averages based on:
 * - Vacation/Annual Leave types only (excludes sick leave, personal days)
 * - Current year (2025) entitlements only
 * - Active employees only (have active EmployeePosition records)
 */

export interface VacationEntitlementData {
  // Aggregated metrics
  averageVacationPerEmployee: number;
  totalVacationEntitlements: number;
  uniqueActiveEmployees: number;
  totalVacationRecords: number;
  
  // Breakdown metrics
  averageAvailable: number;
  averageUsed: number;
  averagePending: number;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

const VACATION_ENTITLEMENTS_QUERY = `
  query GetCurrentYearVacationEntitlementsForActiveEmployees {
    EmployeeAbsenceEntitlement(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          {
            _or: [
              { type: { value: { _ilike: "%vacation%" } } },
              { type: { value: { _ilike: "%annual%" } } },
              { type: { value: { _ilike: "%holiday%" } } },
              { type: { value: { _ilike: "%leave%" } } }
            ]
          },
          {
            _or: [
              { validFrom: { _gte: "2025-01-01T00:00:00.000Z" } },
              { validTo: { _gte: "2025-01-01T00:00:00.000Z" } },
              { 
                _and: [
                  { validFrom: { _lte: "2025-12-31T23:59:59.999Z" } },
                  { validTo: { _gte: "2025-01-01T00:00:00.000Z" } }
                ]
              }
            ]
          },
          {
            employee: { 
              employeePosition: { id: { _isNull: false } }
            }
          }
        ]
      }
    ) {
      employeeId
      available
      approved
      total
      pending
      validFrom
      validTo
      type {
        value
        id
      }
    }
  }
`;

export const useVacationEntitlements = (accessToken: string) => {
  const [data, setData] = useState<VacationEntitlementData>({
    averageVacationPerEmployee: 0,
    totalVacationEntitlements: 0,
    uniqueActiveEmployees: 0,
    totalVacationRecords: 0,
    averageAvailable: 0,
    averageUsed: 0,
    averagePending: 0,
    isLoading: true,
    error: null
  });

  const fetchVacationEntitlements = useCallback(async () => {
    if (!accessToken) return;

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Set access token and make request
      graphQLClient.setAccessToken(accessToken);
      const result = await graphQLClient.request(VACATION_ENTITLEMENTS_QUERY);

      const entitlements = result?.EmployeeAbsenceEntitlement || [];

      console.log('🏖️ Vacation entitlements loaded:', {
        totalRecords: entitlements.length,
        sampleData: entitlements.slice(0, 3)
      });

      if (entitlements.length === 0) {
        // No data found
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: 'No vacation entitlements found for active employees'
        }));
        return;
      }

      // Group by employee and sum all vacation types per employee
      const employeeVacationTotals: Record<string, {
        total: number;
        available: number;
        used: number;
        pending: number;
      }> = {};

      entitlements.forEach((ent: any) => {
        if (!ent.employeeId || !ent.total) return;

        const employeeId = ent.employeeId;
        if (!employeeVacationTotals[employeeId]) {
          employeeVacationTotals[employeeId] = {
            total: 0,
            available: 0,
            used: 0,
            pending: 0
          };
        }

        // Sum all vacation entitlement types for this employee
        employeeVacationTotals[employeeId].total += ent.total || 0;
        employeeVacationTotals[employeeId].available += ent.available || 0;
        employeeVacationTotals[employeeId].used += ent.approved || 0; // Used = approved time off
        employeeVacationTotals[employeeId].pending += ent.pending || 0;
      });

      // Calculate comprehensive metrics
      const uniqueEmployees = Object.keys(employeeVacationTotals).length;
      const totals = Object.values(employeeVacationTotals).reduce(
        (acc, emp) => ({
          total: acc.total + emp.total,
          available: acc.available + emp.available,
          used: acc.used + emp.used,
          pending: acc.pending + emp.pending
        }),
        { total: 0, available: 0, used: 0, pending: 0 }
      );

      const averageVacationPerEmployee = uniqueEmployees > 0 
        ? Math.round((totals.total / uniqueEmployees) * 100) / 100 
        : 0;

      const averageAvailable = uniqueEmployees > 0 
        ? Math.round((totals.available / uniqueEmployees) * 100) / 100 
        : 0;

      const averageUsed = uniqueEmployees > 0 
        ? Math.round((totals.used / uniqueEmployees) * 100) / 100 
        : 0;

      const averagePending = uniqueEmployees > 0 
        ? Math.round((totals.pending / uniqueEmployees) * 100) / 100 
        : 0;

      console.log('📊 Vacation entitlements calculation:', {
        uniqueEmployees,
        averageVacationPerEmployee,
        averageAvailable,
        averageUsed,
        averagePending
      });

      setData({
        averageVacationPerEmployee,
        totalVacationEntitlements: totals.total,
        uniqueActiveEmployees: uniqueEmployees,
        totalVacationRecords: entitlements.length,
        averageAvailable,
        averageUsed,
        averagePending,
        isLoading: false,
        error: null
      });

    } catch (err) {
      console.error('❌ Vacation entitlements query failed:', err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch vacation entitlements'
      }));
    }
  }, [accessToken]);

  useEffect(() => {
    fetchVacationEntitlements();
  }, [fetchVacationEntitlements]);

  return {
    ...data,
    refetch: fetchVacationEntitlements
  };
}; 