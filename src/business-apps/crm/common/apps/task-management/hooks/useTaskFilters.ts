"use client";

import React, { useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

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

// Task filter state interface
export interface TaskFilters {
  search: string;
  taskStatuses: string[];
  taskPriorities: string[];
  taskTypes: string[];
  assignees: string[];
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

  // Static filter data (in a real app, these would come from API hooks)
  const taskStatusFilters: DataFilter[] = [
    { id: 'status_pending', label: 'Pending', selected: selectedFilters.includes('status_pending'), count: 1 },
    { id: 'status_in_progress', label: 'In Progress', selected: selectedFilters.includes('status_in_progress'), count: 2 },
    { id: 'status_completed', label: 'Completed', selected: selectedFilters.includes('status_completed'), count: 1 },
    { id: 'status_overdue', label: 'Overdue', selected: selectedFilters.includes('status_overdue'), count: 1 }
  ];

  const taskPriorityFilters: DataFilter[] = [
    { id: 'priority_urgent', label: 'Urgent', selected: selectedFilters.includes('priority_urgent'), count: 1 },
    { id: 'priority_high', label: 'High', selected: selectedFilters.includes('priority_high'), count: 2 },
    { id: 'priority_medium', label: 'Medium', selected: selectedFilters.includes('priority_medium'), count: 2 },
    { id: 'priority_low', label: 'Low', selected: selectedFilters.includes('priority_low'), count: 0 }
  ];

  const taskTypeFilters: DataFilter[] = [
    { id: 'type_deadline', label: 'Deadline', selected: selectedFilters.includes('type_deadline'), count: 3 },
    { id: 'type_scheduled', label: 'Scheduled', selected: selectedFilters.includes('type_scheduled'), count: 2 }
  ];

  const assigneeFilters: DataFilter[] = [
    { id: 'assignee_john_smith', label: 'John Smith', selected: selectedFilters.includes('assignee_john_smith'), count: 1 },
    { id: 'assignee_sarah_johnson', label: 'Sarah Johnson', selected: selectedFilters.includes('assignee_sarah_johnson'), count: 1 },
    { id: 'assignee_mike_davis', label: 'Mike Davis', selected: selectedFilters.includes('assignee_mike_davis'), count: 1 },
    { id: 'assignee_lisa_wilson', label: 'Lisa Wilson', selected: selectedFilters.includes('assignee_lisa_wilson'), count: 1 },
    { id: 'assignee_tom_brown', label: 'Tom Brown', selected: selectedFilters.includes('assignee_tom_brown'), count: 1 }
  ];

  const referenceTypeFilters: DataFilter[] = [
    { id: 'ref_opportunity', label: 'Opportunity', selected: selectedFilters.includes('ref_opportunity'), count: 2 },
    { id: 'ref_account', label: 'Account', selected: selectedFilters.includes('ref_account'), count: 1 },
    { id: 'ref_lead', label: 'Lead', selected: selectedFilters.includes('ref_lead'), count: 1 },
    { id: 'ref_contact', label: 'Contact', selected: selectedFilters.includes('ref_contact'), count: 1 }
  ];

  // Build filter groups for DataFilter component
  const filterGroups: DataFilterGroup[] = [
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
  ];

  // Create filter label map for DataController
  const filterLabelMap = React.useMemo(() => {
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

  // Convert selected filters to API format
  const getFilters = useCallback((): TaskFilters => {
    const filters: TaskFilters = {
      search,
      taskStatuses: selectedFilters.filter(f => f.startsWith('status_')).map(f => f.replace('status_', '')),
      taskPriorities: selectedFilters.filter(f => f.startsWith('priority_')).map(f => f.replace('priority_', '')),
      taskTypes: selectedFilters.filter(f => f.startsWith('type_')).map(f => f.replace('type_', '')),
      assignees: selectedFilters.filter(f => f.startsWith('assignee_')).map(f => f.replace('assignee_', '').replace('_', ' ')),
      referenceTypes: selectedFilters.filter(f => f.startsWith('ref_')).map(f => f.replace('ref_', '')),
      createdAfter,
      createdBefore
    };
    return filters;
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