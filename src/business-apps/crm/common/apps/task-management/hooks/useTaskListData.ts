"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Task } from '../types/TaskTypes';
import { TaskFilters } from './useTaskFilters';
import { mockTasks } from '../utils/mockData';

interface UseTaskListDataProps extends TaskFilters {
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  accessToken: string;
  sourceApp?: string;
}

interface UseTaskListDataReturn {
  tasks: Task[];
  total: number;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (page: number, pageSize?: number) => Promise<void>;
  retry: () => void;
}

export const useTaskListData = (props: UseTaskListDataProps): UseTaskListDataReturn => {
  const {
    search,
    taskStatuses,
    taskPriorities,
    taskTypes,
    assignees,
    referenceTypes,
    createdAfter,
    createdBefore,
    sortField,
    sortOrder,
    accessToken,
    sourceApp
  } = props;

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  // Refs to track the latest props
  const propsRef = useRef(props);
  propsRef.current = props;

  // Apply filters to mock data
  const getFilteredTasks = useCallback((page: number, size: number): { tasks: Task[]; total: number } => {
    let filtered = [...mockTasks];

    // Apply search filter
    if (search?.trim()) {
      const searchTerm = search.toLowerCase();
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(searchTerm) ||
        task.assignedTo.displayName.toLowerCase().includes(searchTerm) ||
        task.assignedTo.department.toLowerCase().includes(searchTerm) ||
        task.reference.name.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filters
    if (taskStatuses.length > 0) {
      filtered = filtered.filter(task => taskStatuses.includes(task.status));
    }

    // Apply priority filters
    if (taskPriorities.length > 0) {
      filtered = filtered.filter(task => taskPriorities.includes(task.priority));
    }

    // Apply type filters
    if (taskTypes.length > 0) {
      filtered = filtered.filter(task => taskTypes.includes(task.type));
    }

    // Apply assignee filters
    if (assignees.length > 0) {
      filtered = filtered.filter(task => {
        const assigneeName = task.assignedTo.displayName.toLowerCase();
        return assignees.some(assignee => assigneeName.includes(assignee.toLowerCase()));
      });
    }

    // Apply reference type filters
    if (referenceTypes.length > 0) {
      filtered = filtered.filter(task => referenceTypes.includes(task.reference.type));
    }

    // Apply date range filters
    if (createdAfter) {
      filtered = filtered.filter(task => new Date(task.createdAt) >= new Date(createdAfter));
    }
    if (createdBefore) {
      filtered = filtered.filter(task => new Date(task.createdAt) <= new Date(createdBefore));
    }

    // Apply sorting
    if (sortField && sortOrder) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'assignedTo':
            aValue = a.assignedTo.displayName;
            bValue = b.assignedTo.displayName;
            break;
          case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
          case 'priority':
            aValue = a.priority;
            bValue = b.priority;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'reference':
            aValue = a.reference.name;
            bValue = b.reference.name;
            break;
          case 'dueDate':
            aValue = new Date(a.dueDate);
            bValue = new Date(b.dueDate);
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortOrder === 'ASC' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    const totalFiltered = filtered.length;
    
    // Apply pagination
    const start = (page - 1) * size;
    const end = start + size;
    const paginatedTasks = filtered.slice(start, end);

    return {
      tasks: paginatedTasks,
      total: totalFiltered
    };
  }, [search, taskStatuses, taskPriorities, taskTypes, assignees, referenceTypes, createdAfter, createdBefore, sortField, sortOrder]);

  // Load data function
  const loadData = useCallback(async (page: number, size: number) => {
    if (!accessToken) {
      console.warn('No access token provided to useTaskListData');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      const result = getFilteredTasks(page, size);
      
      setTasks(result.tasks);
      setTotal(result.total);
      setCurrentPage(page);
      setPageSize(size);
      setHasMore(page * size < result.total);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load tasks');
      setError(error);
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, getFilteredTasks]);

  // Load page function
  const loadPage = useCallback(async (page: number, size?: number) => {
    const targetPageSize = size || pageSize;
    await loadData(page, targetPageSize);
  }, [loadData, pageSize]);

  // Load more function (for infinite scroll scenarios)
  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await loadData(currentPage + 1, pageSize);
    }
  }, [hasMore, loading, currentPage, pageSize, loadData]);

  // Retry function
  const retry = useCallback(async () => {
    await loadData(currentPage, pageSize);
  }, [loadData, currentPage, pageSize]);

  // Auto-reload when filters change
  useEffect(() => {
    if (accessToken) {
      loadData(1, pageSize);
    }
  }, [
    search,
    JSON.stringify(taskStatuses),
    JSON.stringify(taskPriorities),
    JSON.stringify(taskTypes),
    JSON.stringify(assignees),
    JSON.stringify(referenceTypes),
    createdAfter,
    createdBefore,
    sortField,
    sortOrder,
    accessToken,
    pageSize
  ]);

  return {
    tasks,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry
  };
}; 