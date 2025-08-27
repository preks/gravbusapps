import { useEffect, useMemo, useState } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useTeammates } from "@/common/hooks/useTeammates";

export interface OrgScopeResult {
  employeeIds: string[];
  isManager: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * Resolve org scope (AE vs Manager) and return employeeIds to query for.
 * AE: only own employeeId. Manager: own + teammates (orgchart API).
 */
export const useOrgScope = (context: BusinessAppContextProps): OrgScopeResult => {
  const selfEmployeeId = context.userInfo?.employeeDetails?.employeeId || "";
  const { teammates, loading, error } = useTeammates(selfEmployeeId, context.accessToken);

  const result = useMemo(() => {
    if (!selfEmployeeId) {
      return { employeeIds: [], isManager: false };
    }
    const teammateIds = (teammates || []).map(t => t.id).filter(Boolean);
    const isManager = teammateIds.length > 0;
    const employeeIds = isManager ? [selfEmployeeId, ...teammateIds] : [selfEmployeeId];
    return { employeeIds, isManager };
  }, [selfEmployeeId, teammates]);

  return {
    employeeIds: result.employeeIds,
    isManager: result.isManager,
    loading,
    error,
  };
};

export default useOrgScope;


