"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useTaskEmployees } from './useTaskEmployees';
import { useTaskCatalogs } from './useTaskCatalogs';
import { useTaskReferenceCounts } from './useTaskReferenceCounts';

// DataFilter interfaces to match DataContainer expectations
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

// Task filter state interface - matches SalesTaskQueryVariables structure
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

export const useTaskFilters = (context: BusinessAppContextProps) => {
  // Main search and filter state
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Date range filter state
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();



    // Dynamic data hooks  
  const { employees } = useTaskEmployees({ 
    accessToken: context.accessToken
  });
  
  const { statuses, priorities, types } = useTaskCatalogs({ 
    accessToken: context.accessToken,
    sourceApp: 'CRM' 
  });
  
  const { counts } = useTaskReferenceCounts({ 
    accessToken: context.accessToken 
  });

  // Create dynamic filter arrays based on API data
  const taskStatusFilters: DataFilter[] = useMemo(() => {
    const dynamicStatuses = statuses.map(status => ({
      id: `status_${status.code?.toLowerCase() || status.value.toLowerCase()}`,
      label: status.value,
      selected: selectedFilters.includes(`status_${status.code?.toLowerCase() || status.value.toLowerCase()}`)
    }));

    // Add hardcoded statuses that don't come from catalog but are computed
    const computedStatuses = [
      { id: 'status_overdue', label: 'Overdue', selected: selectedFilters.includes('status_overdue') },
      { id: 'status_unassigned', label: 'Unassigned', selected: selectedFilters.includes('status_unassigned') }
    ];

    return [...dynamicStatuses, ...computedStatuses];
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

  // Build filter groups for DataFilter component
  const filterGroups: DataFilterGroup[] = useMemo(() => [
    {
      id: 'status',
      title: 'Status',
      filters: taskStatusFilters
    },
    {
      id: 'priority',
      title: 'Priority',
      filters: taskPriorityFilters
    },
    {
      id: 'type',
      title: 'Type',
      filters: taskTypeFilters
    },
    {
      id: 'assignee',
      title: 'Assignee',
      filters: assigneeFilters
    },
    {
      id: 'reference',
      title: 'Reference Type',
      filters: referenceTypeFilters
    }
  ], [taskStatusFilters, taskPriorityFilters, taskTypeFilters, assigneeFilters, referenceTypeFilters]);

  // Create filter label map for DataController
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    filterGroups.forEach(group => {
      group.filters.forEach(filter => {
        map[filter.id] = filter.label;
      });
    });
    return map;
  }, [filterGroups]);

  // Filter management functions
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterId) ? prev : [...prev, filterId]
    );
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId));
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedFilters([]);
    setCreatedAfter(undefined);
    setCreatedBefore(undefined);
  }, []);

  // Date range handler
  const handleDateRangeChange = useCallback((after?: string, before?: string) => {
    setCreatedAfter(after);
    setCreatedBefore(before);
  }, []);

  // Convert selected filters to API format matching SalesTaskQueryVariables
  const getFilters = useCallback((): TaskFilters => {
    // Convert status filters to statusRef format - map back to catalog entries
    const statusRefs = selectedFilters
      .filter(f => f.startsWith('status_'))
      .map(f => {
        const statusKey = f.replace('status_', '');
        if (statusKey === 'unassigned') return null; // Handle unassigned status separately
        if (statusKey === 'overdue') return null; // Overdue is computed, not from catalog
        
        // Find the corresponding catalog entry
        const catalogStatus = statuses.find(s => 
          s.code?.toLowerCase() === statusKey || 
          s.value.toLowerCase() === statusKey
        );
        
        return catalogStatus ? `SalesTaskStatus:v1:${catalogStatus.code || statusKey.toUpperCase()}` : null;
      })
      .filter(ref => ref !== null) as string[];

    // Convert priority filters to priorityRef format
    const priorityRefs = selectedFilters
      .filter(f => f.startsWith('priority_'))
      .map(f => {
        const priorityKey = f.replace('priority_', '');
        
        // Find the corresponding catalog entry
        const catalogPriority = priorities.find(p => 
          p.code?.toLowerCase() === priorityKey || 
          p.value.toLowerCase() === priorityKey
        );
        
        return catalogPriority ? `SalesTaskPriority:v1:${catalogPriority.code || priorityKey.toUpperCase()}` : null;
      })
      .filter(ref => ref !== null) as string[];

    // Convert type filters to typeRef format
    const taskTypes = selectedFilters
      .filter(f => f.startsWith('type_'))
      .map(f => {
        const typeKey = f.replace('type_', '');
        
        // Find the corresponding catalog entry
        const catalogType = types.find(t => 
          t.code?.toLowerCase() === typeKey || 
          t.value.toLowerCase() === typeKey
        );
        
        return catalogType ? `SalesTaskType:v1:${catalogType.code || typeKey.toUpperCase()}` : null;
      })
      .filter(ref => ref !== null) as string[];

    // Extract employee IDs from assignee filters
    const assignedEmployeeIds = selectedFilters
      .filter(f => f.startsWith('assignee_'))
      .map(f => f.replace('assignee_', ''));

    // Keep reference types as before (for future use)
    const referenceTypes = selectedFilters
      .filter(f => f.startsWith('ref_'))
      .map(f => f.replace('ref_', ''));

    const filters: TaskFilters = {
      search,
      statusRefs,
      priorityRefs,
      taskTypes,
      assignedEmployeeIds,
      referenceTypes,
      createdAfter,
      createdBefore
    };
    return filters;
  }, [search, selectedFilters, createdAfter, createdBefore, statuses, priorities, types]);

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