"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Task } from '../types/TaskTypes';
import { TaskFilters } from './useTaskFilters';
import { useSalesTaskQueries } from './useSalesTaskQueries';
import { SalesTask } from '../types/SalesTaskTypes';

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

// Transform SalesTask to Task
const transformSalesTaskToTask = (salesTask: SalesTask): Task | null => {
  // Skip if essential data is missing
  if (!salesTask.id) {
    return null;
  }

  // Get task name - use name field or description as fallback
  const taskName = salesTask.name || salesTask.description;
  if (!taskName?.trim()) {
    return null; // Skip if no meaningful name
  }

  // Get task type from typeRef (extract the actual type from the ref)
  const taskType = salesTask.typeRef?.split(':').pop() || 'GENERAL';

  // Get status from statusRef or default to pending
  let status: 'pending' | 'in_progress' | 'completed' | 'overdue' = 'pending';
  if (salesTask.statusRef) {
    const statusValue = salesTask.statusRef.split(':').pop()?.toLowerCase();
    switch (statusValue) {
      case 'completed':
      case 'done':
        status = 'completed';
        break;
      case 'in_progress':
      case 'active':
        status = 'in_progress';
        break;
      case 'overdue':
        status = 'overdue';
        break;
      default:
        status = 'pending';
    }
  } else {
    // Calculate status from due date if no statusRef
    if (salesTask.dueDate) {
      const dueDate = new Date(salesTask.dueDate);
      const now = new Date();
      if (dueDate < now) {
        status = 'overdue';
      } else {
        status = 'pending';
      }
    }
  }

  // Get priority from priorityRef (extract the actual priority from the ref)
  let priority: 'high' | 'medium' | 'urgent' | 'low' = 'medium';
  if (salesTask.priorityRef) {
    const priorityValue = salesTask.priorityRef.split(':').pop()?.toLowerCase();
    switch (priorityValue) {
      case 'high':
        priority = 'high';
        break;
      case 'urgent':
      case 'critical':
        priority = 'urgent';
        break;
      case 'low':
        priority = 'low';
        break;
      default:
        priority = 'medium';
    }
  }

  // Create reference object based on related entity with fallbacks
  let reference: Task['reference'];
  
  if (salesTask.opportunity?.name) {
    reference = {
      type: 'opportunity',
      id: salesTask.opportunity.id,
      name: salesTask.opportunity.name
    };
  } else if (salesTask.account?.name) {
    reference = {
      type: 'account',
      id: salesTask.account.id,
      name: salesTask.account.name
    };
  } else if (salesTask.lead) {
    const leadName = `${salesTask.lead.firstName || ''} ${salesTask.lead.lastName || ''}`.trim() || salesTask.lead.companyName;
    reference = {
      type: 'lead',
      id: salesTask.lead.id,
      name: leadName || 'Lead'
    };
  } else if (salesTask.contact) {
    const contactName = `${salesTask.contact.firstName || ''} ${salesTask.contact.lastName || ''}`.trim();
    reference = {
      type: 'contact',
      id: salesTask.contact.id,
      name: contactName || 'Contact'
    };
  } else {
    // Default reference if none found
    reference = {
      type: 'account',
      id: salesTask.id,
      name: 'General'
    };
  }

  // Create assigned employee - use available data or minimal defaults
  const assignedTo: Task['assignedTo'] = {
    id: salesTask.assignedEmployeeId || salesTask.id,
    firstName: salesTask.assignedEmployee?.firstName || '',
    lastName: salesTask.assignedEmployee?.lastName || '',
    displayName: salesTask.assignedEmployee?.displayName || 
                 `${salesTask.assignedEmployee?.firstName || ''} ${salesTask.assignedEmployee?.lastName || ''}`.trim() || 'Unassigned',
    department: '', // No department data available from GraphQL
    initials: `${(salesTask.assignedEmployee?.firstName || 'U').charAt(0)}${(salesTask.assignedEmployee?.lastName || 'U').charAt(0)}`.toUpperCase(),
    avatar: salesTask.assignedEmployee?.pictureThumbnail || undefined
  };

  return {
    id: salesTask.id,
    name: taskName, // Use validated task name
    assignedTo,
    type: taskType, // Use actual activity type value
    priority: priority,
    status,
    reference,
    dueDate: salesTask.dueDate || salesTask.createdAt,
    scheduleDate: salesTask.createdAt,
    timingType: salesTask.timingType as 'Deadline' | 'Scheduled' | undefined,
    createdAt: salesTask.createdAt,
    updatedAt: salesTask.updatedAt || salesTask.createdAt,
    version: salesTask.version,
    rawSalesTask: salesTask
  };
};

export const useTaskListData = (props: UseTaskListDataProps): UseTaskListDataReturn => {
  const {
    search,
    statusRefs,
    priorityRefs,
    taskTypes,
    assignedEmployeeIds,
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

  // GraphQL queries
  const { fetchSalesTasks, fetchSalesTasksCount, fetchSalesTasksWithCount } = useSalesTaskQueries({ accessToken });

  // Refs to track the latest props
  const propsRef = useRef(props);
  propsRef.current = props;

  // Build GraphQL variables from filters
  const buildQueryVariables = useCallback((page: number, size: number) => {
    const variables: any = {
      offset: (page - 1) * size,
      limit: size,
      search: search?.trim() || undefined,
    };

    // Add filter conditions for SalesTask
    if (statusRefs.length > 0) {
      variables.statusRefs = statusRefs;
    }

    if (priorityRefs.length > 0) {
      variables.priorityRefs = priorityRefs;
    }

    if (taskTypes.length > 0) {
      variables.taskTypes = taskTypes;
    }

    if (assignedEmployeeIds.length > 0) {
      variables.assignedEmployeeIds = assignedEmployeeIds;
    }

    if (referenceTypes.length > 0) {
      // We can filter by entity type (account, lead, opportunity, contact)
      // This would require multiple queries or a more complex where clause
    }

    if (createdAfter) {
      variables.createdAfter = createdAfter;
    }

    if (createdBefore) {
      variables.createdBefore = createdBefore;
    }

    // Convert sort field
    if (sortField && sortOrder) {
      const orderByField = (() => {
        switch (sortField) {
          case 'name': return 'name';
          case 'assignedTo': return 'assignedEmployee';
          case 'type': return 'typeRef';
          case 'dueDate': return 'dueDate';
          case 'createdAt': return 'createdAt';
          default: return 'createdAt';
        }
      })();

      variables.orderBy = [{ [orderByField]: sortOrder }];
    }

    return variables;
  }, [search, statusRefs, priorityRefs, taskTypes, assignedEmployeeIds, referenceTypes, createdAfter, createdBefore, sortField, sortOrder]);

  // Load data function
  const loadData = useCallback(async (page: number, size: number) => {
    if (!accessToken) {
      console.warn('No access token provided to useTaskListData');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const variables = buildQueryVariables(page, size);
      
      // Fetch both data and count in a single API call (like LeadList)
      const result = await fetchSalesTasksWithCount(variables);

      // Transform sales tasks to task format and filter out null values
      const transformedTasks = result.SalesTask
        .map(transformSalesTaskToTask)
        .filter((task): task is Task => task !== null);
      
      const totalCount = result.SalesTaskAggregate.aggregate.count;
      
      setTasks(transformedTasks);
      setTotal(totalCount);
      setCurrentPage(page);
      setPageSize(size);
      setHasMore(page * size < totalCount);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load tasks');
      setError(error);
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, buildQueryVariables, fetchSalesTasksWithCount]);

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

  // REMOVED: This useEffect was causing duplicate fetches!
  // TaskManagement component handles all data loading via loadPage()
  // This hook only provides the loadPage, retry, and loadMore functions

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