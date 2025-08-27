"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useTaskEmployees } from '../../../../../../customers/apps/customer-relations/components/views/task-view/hooks/useTaskEmployees';
import { useTaskCatalogs } from '../../../../../../customers/apps/customer-relations/components/views/task-view/hooks/useTaskCatalogs';
import { useTaskReferenceCounts } from '../../../../../../customers/apps/customer-relations/components/views/task-view/hooks/useTaskReferenceCounts';

export interface DataFilter {
  id: string;
  label: string;
  selected: boolean;
  count?: number;
}

export interface DataFilterGroup {
  id: string;
  title: string;
  filters: DataFilter[];
  backendSearch?: (search: string) => { filters: DataFilter[]; loading: boolean; error: any };
}

export interface TaskFilters {
  search: string;
  statusRefs: string[];
  priorityRefs: string[];
  taskTypes: string[];
  assignedEmployeeIds: string[];
  referenceTypes: string[];
  createdAfter?: string;
  createdBefore?: string;
}

export const useTaskFilters = (context: BusinessAppContextProps & { sourceApp?: string }) => {
  const sourceApp = context.sourceApp || 'IRM';

  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();

  const { employees } = useTaskEmployees({ accessToken: context.accessToken });
  const { statuses, priorities, types } = useTaskCatalogs({ accessToken: context.accessToken, sourceApp: sourceApp === 'IRM' ? 'IRM' : 'CRM' });
  const { counts } = useTaskReferenceCounts({ accessToken: context.accessToken, sourceApp });

  const taskStatusFilters: DataFilter[] = useMemo(() => {
    const dynamic = statuses.map(status => ({
      id: `status_${status.code?.toLowerCase() || status.value.toLowerCase()}`,
      label: status.value,
      selected: selectedFilters.includes(`status_${status.code?.toLowerCase() || status.value.toLowerCase()}`)
    }));
    const computed = [
      { id: 'status_overdue', label: 'Overdue', selected: selectedFilters.includes('status_overdue') },
      { id: 'status_unassigned', label: 'Unassigned', selected: selectedFilters.includes('status_unassigned') }
    ];
    return [...dynamic, ...computed];
  }, [statuses, selectedFilters]);

  const taskPriorityFilters: DataFilter[] = useMemo(() => {
    return priorities.map(priority => ({
      id: `priority_${priority.code?.toLowerCase() || priority.value.toLowerCase()}`,
      label: priority.value,
      selected: selectedFilters.includes(`priority_${priority.code?.toLowerCase() || priority.value.toLowerCase()}`)
    }));
  }, [priorities, selectedFilters]);

  const taskTypeFilters: DataFilter[] = useMemo(() => {
    return types.map(type => ({
      id: `type_${type.code?.toLowerCase() || type.value.toLowerCase()}`,
      label: type.value,
      selected: selectedFilters.includes(`type_${type.code?.toLowerCase() || type.value.toLowerCase()}`)
    }));
  }, [types, selectedFilters]);

  const assigneeFilters: DataFilter[] = useMemo(() => {
    return employees.map(employee => ({
      id: `assignee_${employee.id}`,
      label: employee.displayName,
      selected: selectedFilters.includes(`assignee_${employee.id}`)
    }));
  }, [employees, selectedFilters]);

  const referenceTypeFilters: DataFilter[] = useMemo(() => [
    { id: 'ref_opportunity', label: 'Opportunity', selected: selectedFilters.includes('ref_opportunity'), count: counts.opportunity },
    { id: 'ref_account', label: 'Account', selected: selectedFilters.includes('ref_account'), count: counts.account },
    { id: 'ref_lead', label: 'Lead', selected: selectedFilters.includes('ref_lead'), count: counts.lead },
    { id: 'ref_contact', label: 'Contact', selected: selectedFilters.includes('ref_contact'), count: counts.contact }
  ], [selectedFilters, counts]);

  const filterGroups: DataFilterGroup[] = useMemo(() => [
    { id: 'status', title: 'Status', filters: taskStatusFilters },
    { id: 'priority', title: 'Priority', filters: taskPriorityFilters },
    { id: 'type', title: 'Type', filters: taskTypeFilters },
    { id: 'assignee', title: 'Assignee', filters: assigneeFilters },
    { id: 'reference', title: 'Reference Type', filters: referenceTypeFilters }
  ], [taskStatusFilters, taskPriorityFilters, taskTypeFilters, assigneeFilters, referenceTypeFilters]);

  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    filterGroups.forEach(group => {
      group.filters.forEach(filter => { map[filter.id] = filter.label; });
    });
    return map;
  }, [filterGroups]);

  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.includes(filterId) ? prev : [...prev, filterId]);
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId));
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedFilters([]);
    setCreatedAfter(undefined);
    setCreatedBefore(undefined);
  }, []);

  const handleDateRangeChange = useCallback((after?: string, before?: string) => {
    setCreatedAfter(after);
    setCreatedBefore(before);
  }, []);

  const getFilters = useCallback((): TaskFilters => {
    const statusRefs = selectedFilters
      .filter(f => f.startsWith('status_'))
      .map(f => {
        const key = f.replace('status_', '');
        if (key === 'unassigned' || key === 'overdue') return null;
        return `InvestmentTaskStatus:v1:${key.toUpperCase()}`;
      })
      .filter(Boolean) as string[];

    const priorityRefs = selectedFilters
      .filter(f => f.startsWith('priority_'))
      .map(f => {
        const key = f.replace('priority_', '');
        return `InvestmentTaskPriority:v1:${key.toUpperCase()}`;
      }) as string[];

    const taskTypes = selectedFilters
      .filter(f => f.startsWith('type_'))
      .map(f => {
        const key = f.replace('type_', '');
        return `InvestmentTaskType:v1:${key.toUpperCase()}`;
      }) as string[];

    const assignedEmployeeIds = selectedFilters
      .filter(f => f.startsWith('assignee_'))
      .map(f => f.replace('assignee_', ''));

    const referenceTypes = selectedFilters
      .filter(f => f.startsWith('ref_'))
      .map(f => f.replace('ref_', ''));

    return {
      search,
      statusRefs,
      priorityRefs,
      taskTypes,
      assignedEmployeeIds,
      referenceTypes,
      createdAfter,
      createdBefore
    };
  }, [search, selectedFilters, createdAfter, createdBefore]);

  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    resetFilters,
    getFilters,
    createdAfter,
    createdBefore,
    handleDateRangeChange
  };
};


