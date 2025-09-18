import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import type { DataFilterGroup } from "@/components/data-filter/DataFilter";
import { DateRangeFilter } from "@/business-apps/crm/customers/apps/customer-relations/views/lead-view/components/DateRangeFilter";

interface SimpleItem { id: string; label: string }

export const useInvestmentOpportunityFilters = (
  context: BusinessAppContextProps,
  selectedFilters: string[],
  setSelectedFilters: (filters: string[]) => void
) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const [owners, setOwners] = useState<SimpleItem[]>([]);
  const [stages, setStages] = useState<SimpleItem[]>([]);
  const [pipelines, setPipelines] = useState<SimpleItem[]>([]);
  const [accounts, setAccounts] = useState<SimpleItem[]>([]);
  const [statuses, setStatuses] = useState<SimpleItem[]>([]);

  const [loading, setLoading] = useState({ owners: false, stages: false, pipelines: false, accounts: false, statuses: false });
  const [errors, setErrors] = useState<{ [k: string]: Error | null }>({});

  const [closeAfter, setCloseAfter] = useState<string | undefined>(undefined);
  const [closeBefore, setCloseBefore] = useState<string | undefined>(undefined);

  const loadOwners = useCallback(async () => {
    if (!context.accessToken) return;
    setLoading(prev => ({ ...prev, owners: true })); setErrors(prev => ({ ...prev, owners: null }));
    try {
      const res = await graphqlClient.request<{ InvestmentOpportunity: Array<{ ownerEmployee?: { id: string; displayName?: string; firstName?: string; lastName?: string } | null }> }>(`
        query GetOppOwners {
          InvestmentOpportunity(where: { isDeleted: { _eq: false }, ownerEmployee: { id: { _isNull: false } } }, distinctOn: [ownerEmployeeId], limit: 50) {
            ownerEmployee { id displayName firstName lastName }
          }
        }
      `);
      const items: SimpleItem[] = (res?.InvestmentOpportunity || []).filter(r => r.ownerEmployee).map(r => {
        const e = r.ownerEmployee!; const name = e.displayName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown';
        return { id: e.id, label: name };
      });
      setOwners(items);
    } catch (e) { setOwners([]); setErrors(prev => ({ ...prev, owners: e as Error })); }
    finally { setLoading(prev => ({ ...prev, owners: false })); }
  }, [context.accessToken, graphqlClient]);

  const loadStages = useCallback(async () => {
    if (!context.accessToken) return;
    setLoading(prev => ({ ...prev, stages: true })); setErrors(prev => ({ ...prev, stages: null }));
    try {
      const res = await graphqlClient.request<{ InvestmentOpportunity: Array<{ opportunityPipelineStage?: { id: string; code?: string; value?: string } | null }> }>(`
        query GetOppStages {
          InvestmentOpportunity(where: { isDeleted: { _eq: false } }, distinctOn: [opportunityPipelineStageRef], limit: 50) {
            opportunityPipelineStage { id code value }
          }
        }
      `);
      const map = new Map<string, string>();
      (res?.InvestmentOpportunity || []).forEach(r => { const s = r.opportunityPipelineStage; if (s?.id) map.set(s.id, s.value || s.code || s.id); });
      setStages(Array.from(map.entries()).map(([id, label]) => ({ id, label })));
    } catch (e) { setStages([]); setErrors(prev => ({ ...prev, stages: e as Error })); }
    finally { setLoading(prev => ({ ...prev, stages: false })); }
  }, [context.accessToken, graphqlClient]);

  const loadPipelines = useCallback(async () => {
    if (!context.accessToken) return;
    setLoading(prev => ({ ...prev, pipelines: true })); setErrors(prev => ({ ...prev, pipelines: null }));
    try {
      const res = await graphqlClient.request<{ InvestmentOpportunity: Array<{ opportunityPipeline?: { id: string; code?: string; value?: string } | null }> }>(`
        query GetOppPipelines {
          InvestmentOpportunity(where: { isDeleted: { _eq: false } }, distinctOn: [opportunityPipelineRef], limit: 50) {
            opportunityPipeline { id code value }
          }
        }
      `);
      const map = new Map<string, string>();
      (res?.InvestmentOpportunity || []).forEach(r => { const p = r.opportunityPipeline; if (p?.id) map.set(p.id, p.value || p.code || p.id); });
      setPipelines(Array.from(map.entries()).map(([id, label]) => ({ id, label })));
    } catch (e) { setPipelines([]); setErrors(prev => ({ ...prev, pipelines: e as Error })); }
    finally { setLoading(prev => ({ ...prev, pipelines: false })); }
  }, [context.accessToken, graphqlClient]);

  const loadAccounts = useCallback(async () => {
    if (!context.accessToken) return;
    setLoading(prev => ({ ...prev, accounts: true })); setErrors(prev => ({ ...prev, accounts: null }));
    try {
      const res = await graphqlClient.request<{ InvestmentOpportunity: Array<{ account?: { id: string; name: string } | null }> }>(`
        query GetOppAccounts {
          InvestmentOpportunity(where: { isDeleted: { _eq: false } }, limit: 100) {
            account { id name }
          }
        }
      `);
      const map = new Map<string, string>();
      (res?.InvestmentOpportunity || []).forEach(r => { const a = r.account; if (a?.id) map.set(a.id, a.name); });
      setAccounts(Array.from(map.entries()).map(([id, label]) => ({ id, label })));
    } catch (e) { setAccounts([]); setErrors(prev => ({ ...prev, accounts: e as Error })); }
    finally { setLoading(prev => ({ ...prev, accounts: false })); }
  }, [context.accessToken, graphqlClient]);

  const loadStatuses = useCallback(async () => {
    if (!context.accessToken) return;
    setLoading(prev => ({ ...prev, statuses: true })); setErrors(prev => ({ ...prev, statuses: null }));
    try {
      const res = await graphqlClient.request<{ InvestmentOpportunity: Array<{ opportunityStatus?: { id: string; code?: string; value?: string } | null }> }>(`
        query GetOppStatuses {
          InvestmentOpportunity(where: { isDeleted: { _eq: false } }, distinctOn: [opportunityStatusRef], limit: 50) {
            opportunityStatus { id code value }
          }
        }
      `);
      const map = new Map<string, string>();
      (res?.InvestmentOpportunity || []).forEach(r => { const s = r.opportunityStatus; if (s?.id) map.set(s.id, s.value || s.code || s.id); });
      setStatuses(Array.from(map.entries()).map(([id, label]) => ({ id, label })));
    } catch (e) { setStatuses([]); setErrors(prev => ({ ...prev, statuses: e as Error })); }
    finally { setLoading(prev => ({ ...prev, statuses: false })); }
  }, [context.accessToken, graphqlClient]);

  useEffect(() => {
    loadOwners();
    loadStages();
    loadPipelines();
    loadAccounts();
    loadStatuses();
  }, [loadOwners, loadStages, loadPipelines, loadAccounts, loadStatuses]);

  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    owners.forEach(o => map[`owner:${o.id}`] = o.label);
    stages.forEach(s => map[`stage:${s.id}`] = s.label);
    pipelines.forEach(p => map[`pipeline:${p.id}`] = p.label);
    accounts.forEach(a => map[`account:${a.id}`] = a.label);
    statuses.forEach(s => map[`status:${s.id}`] = s.label);
    return map;
  }, [owners, stages, pipelines, accounts, statuses]);

  const filterGroups: DataFilterGroup[] = useMemo(() => [
    {
      id: 'closeDate',
      title: 'Close Date',
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter: closeAfter,
        createdBefore: closeBefore,
        onDateRangeChange: (after?: string, before?: string) => { setCloseAfter(after); setCloseBefore(before); },
        className: "gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent",
      }),
      hideSearch: true,
    } as any,
    {
      id: 'owners',
      title: 'Owner',
      filters: owners.map(o => ({ id: `owner:${o.id}`, label: o.label, selected: selectedFilters.includes(`owner:${o.id}`) }))
    },
    {
      id: 'stage',
      title: 'Stage',
      filters: stages.map(s => ({ id: `stage:${s.id}`, label: s.label, selected: selectedFilters.includes(`stage:${s.id}`) }))
    },
    {
      id: 'pipeline',
      title: 'Pipeline',
      filters: pipelines.map(p => ({ id: `pipeline:${p.id}`, label: p.label, selected: selectedFilters.includes(`pipeline:${p.id}`) }))
    },
    {
      id: 'accounts',
      title: 'Account',
      filters: accounts.map(a => ({ id: `account:${a.id}`, label: a.label, selected: selectedFilters.includes(`account:${a.id}`) }))
    },
    {
      id: 'statuses',
      title: 'Status',
      filters: statuses.map(s => ({ id: `status:${s.id}`, label: s.label, selected: selectedFilters.includes(`status:${s.id}`) }))
    },
  ], [owners, stages, pipelines, accounts, statuses, selectedFilters, closeAfter, closeBefore]);

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilters(selected ? [...selectedFilters, filterId] : selectedFilters.filter(f => f !== filterId));
  }, [selectedFilters, setSelectedFilters]);

  return { filterGroups, filterLabelMap, handleFilterChange, closeAfter, closeBefore };
};


