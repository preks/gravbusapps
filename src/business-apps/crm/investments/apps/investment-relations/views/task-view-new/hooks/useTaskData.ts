import { useState, useMemo, useCallback, useEffect } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { useTaskListData } from './useTaskListData';
import { Task } from '../types/TaskTypes';

interface UseTaskDataProps {
  type: 'my' | 'team';
  userInfo?: any;
  accessToken: string;
}

interface UseTaskDataReturn {
  // Data
  data: Task[];
  total: number;
  loading: boolean;
  error: Error | null;
  
  // UI State (for DataDisplay)
  search: string;
  setSearch: (search: string) => void;
  filters: Record<string, any>;
  setFilters: (filters: Record<string, any>) => void;
  
  // Table State (for DataTable)
  pagination: { pageIndex: number; pageSize: number };
  setPagination: (pagination: { pageIndex: number; pageSize: number }) => void;
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  selectedRows: Task[];
  setSelectedRows: (rows: Task[]) => void;
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;
}

export function useTaskData({
  type,
  userInfo,
  accessToken
}: UseTaskDataProps): UseTaskDataReturn {
  // UI State
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  
  // Debug filter changes (only when filters actually change)
  useEffect(() => {
    const hasActiveFilters = Object.values(filters).some(value => 
      Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== ''
    );
    if (hasActiveFilters) {
      console.log('useTaskData - Filter state changed:', filters);
    }
  }, [filters]);

  // Clean filters to remove empty arrays and undefined values
  const cleanedFilters = useMemo(() => {
    const cleaned: Record<string, any> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        cleaned[key] = value;
      } else if (!Array.isArray(value) && value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    });
    return cleaned;
  }, [filters]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true }
  ]);
  const [selectedRows, setSelectedRows] = useState<Task[]>([]);
  const [visibleColumns, setVisibleColumns] = useState([
    'name', 'assignedTo', 'type', 'priority', 'status', 'reference', 'dueDate', 'createdBy', 'createdAt'
  ]);
  
  // Track initial loading separately from subsequent operations
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Build query from state
  const queryParams = useMemo(() => {
    const params: any = {
      search,
      // Map filters based on the filter IDs from filter configuration
      // Ensure all filter values are arrays
      statusRefs: Array.isArray(filters.status) ? filters.status : (filters.status ? [filters.status] : []),
      priorityRefs: Array.isArray(filters.priority) ? filters.priority : (filters.priority ? [filters.priority] : []),
      taskTypes: Array.isArray(filters.type) ? filters.type : (filters.type ? [filters.type] : []),
      assignedEmployeeIds: Array.isArray(filters.assignedEmployeeIds) ? filters.assignedEmployeeIds : (filters.assignedEmployeeIds ? [filters.assignedEmployeeIds] : []),
      referenceTypes: Array.isArray(filters.referenceType) ? filters.referenceType : (filters.referenceType ? [filters.referenceType] : []),
      createdAfter: filters.createdAfter,
      createdBefore: filters.createdBefore,
      dueDateAfter: filters.dueDateAfter,
      dueDateBefore: filters.dueDateBefore,
      sortField: sorting[0]?.id || 'createdAt',
      sortOrder: sorting[0]?.desc ? 'DESC' : 'ASC',
      accessToken
    };
    
        // Debug logging
        console.log('useTaskData - Query params:', params);
    
    // Add type-specific filters
    if (type === 'my' && userInfo?.employeeDetails?.employeeId) {
      params.assignedEmployeeIds = [userInfo.employeeDetails.employeeId];
    } else if (type === 'my' && (userInfo as any)?.employeeId) {
      params.assignedEmployeeIds = [(userInfo as any).employeeId];
    } else if (type === 'my' && userInfo?.id) {
      params.assignedEmployeeIds = [userInfo.id];
    }
    
    return params;
  }, [search, filters, pagination, sorting, type, userInfo, accessToken]);
  
  // Fetch data using existing hook
  const { 
    tasks, 
    total, 
    loading, 
    error, 
    loadPage
  } = useTaskListData(queryParams);
  
  // Handle pagination changes
  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination);
    // Don't call loadPage here - let the useEffect handle it
  }, []);
  
  // Handle sorting changes
  const handleSortingChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    // Don't call loadPage here - let the useEffect handle it
  }, []);
  
  // Single effect to handle all data loading
  useEffect(() => {
    if (accessToken) {
      const isInitial = isInitialLoad;
      loadPage(pagination.pageIndex + 1, pagination.pageSize).then(() => {
        if (isInitial) {
          setIsInitialLoad(false);
        }
      });
    }
  }, [accessToken, loadPage, pagination.pageIndex, pagination.pageSize, sorting, search, filters, isInitialLoad]);
  
  return {
    // Data
    data: tasks,
    total,
    loading: isInitialLoad && loading, // Only show loading during initial load
    error,
    
    // UI State (for DataDisplay)
    search,
    setSearch,
    filters: cleanedFilters,
    setFilters,
    
    // Table State (for DataTable)
    pagination,
    setPagination: handlePaginationChange,
    sorting,
    setSorting: handleSortingChange,
    selectedRows,
    setSelectedRows,
    visibleColumns,
    setVisibleColumns
  };
}
