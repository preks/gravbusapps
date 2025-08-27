import { useCallback, useEffect, useMemo, useState } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useOrgScope } from "@/business-apps/crm/customers/apps/customer-team-performance/hooks/useOrgScope";

export interface DistributionItem {
  key: string;
  label: string;
  value: number;
}

export interface DashboardData {
  activities7d: number;
  perTeam: DistributionItem[];
  perCapability: DistributionItem[];
  perRegion: DistributionItem[];
}

export interface DashboardState {
  data: DashboardData;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const buildLast7DaysIso = () => {
  const now = new Date();
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return last7.toISOString();
};

export const useCustomerTeamDashboardData = (
  context: BusinessAppContextProps
): DashboardState => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  const { employeeIds, loading: scopeLoading } = useOrgScope(context);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    activities7d: 0,
    perTeam: [],
    perCapability: [],
    perRegion: [],
  });

  const last7DaysIso = useMemo(() => buildLast7DaysIso(), []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Activities count in last 7 days
      const activitiesQuery = `
        query Activities7d($from: timestamptz!) {
          SalesActivityAggregate(where: { createdAt: { _gte: $from }, isDeleted: { _eq: false }, ownerEmployeeId: { _in: ${JSON.stringify(employeeIds)} } }) {
            aggregate { count }
          }
        }
      `;

      // Distribution by team via EmployeePosition.matrixUnitEmployees
      const perTeamQuery = `
        query PerTeamDistribution {
          EmployeePosition(where: { employeeId: { _in: ${JSON.stringify(employeeIds)} } }) {
            id
            matrixUnitEmployees(where: { matrixUnit: { isDeleted: { _eq: false } } }) {
              matrixUnit { id name }
            }
          }
        }
      `;

      // Distribution by capability using EmployeePosition.capability
      const perCapabilityQuery = `
        query PerCapabilityDistribution {
          EmployeePosition(where: { capabilityId: { _isNull: false }, employeeId: { _in: ${JSON.stringify(employeeIds)} } }) {
            id
            capability { id name }
          }
        }
      `;

      // Distribution by region using EmployeePosition.siteLocation.region
      const perRegionQuery = `
        query PerRegionDistribution {
          EmployeePosition(where: { siteLocationId: { _isNull: false }, employeeId: { _in: ${JSON.stringify(employeeIds)} } }) {
            id
            siteLocation { id regionRef region { value } }
          }
        }
      `;

      const [activitiesRes, perTeamRes, perCapabilityRes, perRegionRes] = await Promise.all([
        graphqlClient.request<{ SalesActivityAggregate: { aggregate: { count: number } } }>(activitiesQuery, { from: last7DaysIso }),
        graphqlClient.request<{ EmployeePosition: Array<{ id: string; matrixUnitEmployees: Array<{ matrixUnit?: { id?: string; name?: string } | null }> }> }>(perTeamQuery),
        graphqlClient.request<{ EmployeePosition: Array<{ id: string; capability?: { id?: string; value?: string | null; code?: string | null } | null }> }>(perCapabilityQuery),
        graphqlClient.request<{ EmployeePosition: Array<{ id: string; siteLocation?: { id?: string; region?: { value?: string | null; code?: string | null } | null } | null }> }>(perRegionQuery),
      ]);

      const activities7d = activitiesRes.SalesActivityAggregate?.aggregate?.count || 0;

      // Team distribution: count occurrences of matrixUnit id from matrixUnitEmployees
      const teamCounts = new Map<string, { label: string; value: number }>();
      (perTeamRes.EmployeePosition || []).forEach((ep) => {
        (ep.matrixUnitEmployees || []).forEach((mue) => {
          const id = mue.matrixUnit?.id || "unknown";
          const label = mue.matrixUnit?.name || "Team";
          const entry = teamCounts.get(id) || { label, value: 0 };
          entry.value += 1;
          teamCounts.set(id, entry);
        });
      });
      const perTeam: DistributionItem[] = Array.from(teamCounts.entries()).map(([key, { label, value }]) => ({ key, label, value }));

      // Capability distribution: count occurrences of capability.value
      const capabilityCounts = new Map<string, number>();
      (perCapabilityRes.EmployeePosition || []).forEach((ep) => {
        const label = ep.capability?.name || "Unknown";
        capabilityCounts.set(label, (capabilityCounts.get(label) || 0) + 1);
      });
      const perCapability: DistributionItem[] = Array.from(capabilityCounts.entries()).map(([label, value]) => ({ key: label, label, value }));

      // Region distribution: count occurrences of siteLocation.region.value
      const regionCounts = new Map<string, number>();
      (perRegionRes.EmployeePosition || []).forEach((ep) => {
        const label = ep.siteLocation?.region?.value || ep.siteLocation?.regionRef || "Unknown";
        if (label) regionCounts.set(label, (regionCounts.get(label) || 0) + 1);
      });
      const perRegion: DistributionItem[] = Array.from(regionCounts.entries()).map(([label, value]) => ({ key: label, label, value }));

      setData({ activities7d, perTeam, perCapability, perRegion });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      setData({ activities7d: 0, perTeam: [], perCapability: [], perRegion: [] });
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, last7DaysIso, employeeIds]);

  useEffect(() => {
    if (context.accessToken && !scopeLoading) {
      void fetchData();
    }
  }, [context.accessToken, fetchData, scopeLoading]);

  return { data, isLoading, error, refetch: fetchData };
};


