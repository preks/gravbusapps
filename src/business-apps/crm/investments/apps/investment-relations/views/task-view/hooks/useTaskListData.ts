"use client";

import { useState, useCallback, useRef } from 'react';
import { Task } from '../types/TaskTypes';
import { TaskFilters } from './useTaskFilters';
import { useInvestmentTasks } from '@/common/data/investment';

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
    statusRefs,
    priorityRefs,
    taskTypes,
    assignedEmployeeIds,
    referenceTypes,
    createdAfter,
    createdBefore,
    sortField,
    sortOrder,
    accessToken
  } = props;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  const { fetchInvestmentTasks } = useInvestmentTasks({ accessToken } as any);

  const buildQueryVariables = useCallback((page: number, size: number) => {
    const variables: any = {
      offset: (page - 1) * size,
      limit: size,
      search: search?.trim() || undefined,
    };

    if (statusRefs.length > 0) {
      // Convert statusRefs like SalesTaskStatus to InvestmentTask catalog
      variables.taskStatusIds = statusRefs.map((ref) => ref.split(':').pop()).filter(Boolean);
    }

    if (priorityRefs.length > 0) {
      variables.taskPriorityIds = priorityRefs.map((ref) => ref.split(':').pop()).filter(Boolean);
    }

    if (taskTypes.length > 0) {
      variables.taskTypeIds = taskTypes.map((ref) => ref.split(':').pop()).filter(Boolean);
    }

    if (assignedEmployeeIds.length > 0) {
      variables.assignedEmployeeIds = assignedEmployeeIds;
    }

    if (createdAfter) {
      variables.dueDateFrom = createdAfter;
    }

    if (createdBefore) {
      variables.dueDateTo = createdBefore;
    }

    if (sortField && sortOrder) {
      let field = 'createdAt';
      switch (sortField) {
        case 'name': field = 'name'; break;
        case 'assignedTo': field = 'assignedEmployee'; break;
        case 'type': field = 'taskType'; break;
        case 'dueDate': field = 'dueDate'; break;
        case 'createdAt': field = 'createdAt'; break;
      }
      variables.orderBy = [{ field, direction: sortOrder }];
    }

    return variables;
  }, [search, statusRefs, priorityRefs, taskTypes, assignedEmployeeIds, createdAfter, createdBefore, sortField, sortOrder]);

  const loadData = useCallback(async (page: number, size: number) => {
    if (!accessToken) {
      console.warn('No access token provided to useTaskListData (IRM)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const variables = buildQueryVariables(page, size);
      const result = await fetchInvestmentTasks(variables);
      // Map InvestmentTask to shared Task type shape
      const transformedTasks: Task[] = (result.tasks || []).map((it) => {
        const status = (it.taskStatusLabel || '').toLowerCase();
        let normalizedStatus: Task['status'] = 'pending';
        if (status.includes('completed') || status.includes('done')) normalizedStatus = 'completed';
        else if (status.includes('progress') || status.includes('active')) normalizedStatus = 'in_progress';
        else if (status.includes('overdue')) normalizedStatus = 'overdue';

        const priority = (it.taskPriorityLabel || '').toLowerCase();
        let normalizedPriority: Task['priority'] = 'medium';
        if (priority.includes('urgent') || priority.includes('critical')) normalizedPriority = 'urgent';
        else if (priority.includes('high')) normalizedPriority = 'high';
        else if (priority.includes('low')) normalizedPriority = 'low';

        const type = (it.taskTypeLabel || it.taskTiming || 'GENERAL').toString().toUpperCase();

        // Reference preference order
        let reference: Task['reference'] | undefined;
        if (it.opportunity?.id) reference = { type: 'opportunity', id: it.opportunity.id, name: it.opportunityDisplayName || it.opportunity.name || it.opportunity.code || 'Opportunity' } as any;
        else if (it.account?.id) reference = { type: 'account', id: it.account.id, name: it.accountDisplayName || it.account.name || it.account.code || 'Account' } as any;
        else if (it.lead?.id) {
          const leadName = it.leadDisplayName || `${it.lead.firstName || ''} ${it.lead.lastName || ''}`.trim() || it.lead.code || 'Lead';
          reference = { type: 'lead', id: it.lead.id, name: leadName } as any;
        } else if (it.contact?.id) {
          const contactName = it.contactDisplayName || `${it.contact.firstName || ''} ${it.contact.lastName || ''}`.trim() || 'Contact';
          reference = { type: 'contact', id: it.contact.id, name: contactName } as any;
        } else {
          reference = { type: 'account', id: it.id, name: 'General' } as any;
        }

        return {
          id: it.id,
          name: it.displayName || it.name || it.code || `Task ${it.id}`,
          assignedTo: {
            id: it.assignedEmployee?.id || it.id,
            firstName: it.assignedEmployee?.firstName || '',
            lastName: it.assignedEmployee?.lastName || '',
            displayName: it.assignedDisplayName || it.assignedEmployee?.displayName || 'Unassigned',
            department: '',
            initials: '',
            pictureThumbnail: it.assignedEmployee?.pictureThumbnail
          },
          type,
          priority: normalizedPriority,
          status: normalizedStatus,
          reference,
          dueDate: it.dueDate || it.createdAt!,
          scheduleDate: it.startDate,
          timingType: (it.taskTiming as any) || undefined,
          createdAt: it.createdAt!,
          updatedAt: it.updatedAt || it.createdAt!,
          version: it.version as any,
          rawSalesTask: undefined,
          createdBy: it.creatorUserId,
          creatorEmployee: it.creatorEmployee ? {
            id: it.creatorEmployee.id,
            firstName: it.creatorEmployee.firstName || '',
            lastName: it.creatorEmployee.lastName || '',
            displayName: it.creatorEmployee.displayName || 'Unknown',
            department: '',
            initials: '',
            pictureThumbnail: it.creatorEmployee.pictureThumbnail
          } : undefined
        } as Task;
      });

      setTasks(transformedTasks);
      setTotal(result.total || 0);
      setCurrentPage(page);
      setPageSize(size);
      setHasMore(page * size < (result.total || 0));
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to load tasks');
      setError(e);
      console.error('Error loading IRM tasks:', e);
    } finally {
      setLoading(false);
    }
  }, [accessToken, buildQueryVariables, fetchInvestmentTasks]);

  const loadPage = useCallback(async (page: number, size?: number) => {
    const targetPageSize = size || pageSize;
    await loadData(page, targetPageSize);
  }, [loadData, pageSize]);

  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await loadData(currentPage + 1, pageSize);
    }
  }, [hasMore, loading, currentPage, pageSize, loadData]);

  const retry = useCallback(async () => {
    await loadData(currentPage, pageSize);
  }, [loadData, currentPage, pageSize]);

  return { tasks, total, loading, error, hasMore, loadMore, loadPage, retry };
};


