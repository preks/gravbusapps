import React, { useMemo } from 'react';
import { Calendar, CheckCircle, ChatCircle } from '@phosphor-icons/react';
import { Bug, ChevronUp, ChevronDown } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { SubmittedRequest, WorkflowEngine } from '../../types';
import { formatRequestId, formatStatusText } from '../../utils';
import { useEmployeeNamesBatch } from '../../hooks/useEmployeeNamesBatch';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { useMyRequestsTablePreferences } from '../../hooks/useMyRequestsTablePreferences';
import type { ColumnConfig } from '@/components/dataController';
import { useFlowComments } from '../../apps/service-portal/hooks/useFlowComments';
import { formatDate } from '../../config/dateTimeConfig';

// Import nw-design-system components
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button, 
  Badge,
  Spinner,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@newwork/nw-design-system';

// Filter group interface (copied from TicketTable)
export interface FilterGroup {
  id: string;
  title: string;
  filters: {
    id: string;
    label: string;
    value: string;
    selected: boolean;
  }[];
}

// Request action interface (adapted for SubmittedRequest)
export interface RequestAction {
  type: 'view' | 'cancel' | 'debug' | 'custom';
  label: string;
  icon?: React.ReactNode;
  onClick: (request: SubmittedRequest) => void;
  show: (request: SubmittedRequest, currentUserId?: string) => boolean;
  disabled?: (request: SubmittedRequest) => boolean;
  testId?: string;
  title?: string;
}

// Props interface (adapted for SubmittedRequest)
export interface MyRequestsTableProps extends Omit<BusinessAppContextProps, 'children'> {
  // Data
  requests: SubmittedRequest[];
  isLoading: boolean;
  
  // Configuration
  tableId: string; // For preferences scoping (e.g., "myRequests", "myRequestsCompleted")
  
  // Customization
  customColumns?: ColumnConfig[]; // Override default columns
  filterGroups?: FilterGroup[]; // Custom filter groups
  actions?: RequestAction[]; // Custom actions per request
  
  // Callbacks
  onRequestSelect?: (request: SubmittedRequest) => void;
  onDebugRequest?: (request: SubmittedRequest) => void;
  
  // Display options
  showDebug?: boolean;
  emptyMessage?: string;
  emptySearchMessage?: string;
  
  // Context
  workflowEngine: WorkflowEngine; // Required for comment functionality
}


// Sortable table header component (copied from TicketTable)
const SortableTableHead: React.FC<{
  children: React.ReactNode;
  field: string;
  currentSortField: string;
  currentSortOrder: "ASC" | "DESC";
  onSort: (field: string, order: "ASC" | "DESC" | "") => void;
  className?: string;
}> = ({ children, field, currentSortField, currentSortOrder, onSort, className }) => {
  const isSorted = currentSortField === field;
  const nextOrder = isSorted 
    ? (currentSortOrder === "ASC" ? "DESC" : "")
    : "ASC";

  return (
    <TableHead 
      className={`gba:cursor-pointer gba:select-none gba:hover:gba:bg-gray-100 gba:transition-colors ${className || ''}`}
      onClick={() => onSort(field, nextOrder)}
    >
      <div className="gba:flex gba:items-center gba:gap-1">
        {children}
        {isSorted && (
          currentSortOrder === "ASC" ? 
            <ChevronUp className="gba:w-4 gba:h-4" /> : 
            <ChevronDown className="gba:w-4 gba:h-4" />
        )}
      </div>
    </TableHead>
  );
};

// Component to show comment count for a request in the table
const CommentCountIndicator: React.FC<{
  flowId: string;
  contextProps: BusinessAppContextProps;
  workflowEngine: WorkflowEngine;
}> = ({ flowId, contextProps, workflowEngine }) => {
  const { comments, totalComments, isLoading, error } = useFlowComments(flowId, contextProps, workflowEngine);

  // Get the latest comment for tooltip
  const latestComment = comments.length > 0 ? comments[0] : null;

  // Format time ago for tooltip
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return commentDate.toLocaleDateString();
  };

  // Create tooltip content
  const tooltipContent = latestComment ? (
    <div className="gba:max-w-xs">
      <div className="gba:font-semibold gba:mb-1">Latest Comment</div>
      <div className="gba:text-sm gba:mb-2 gba:line-clamp-3">
        "{latestComment.body.length > 100 ? latestComment.body.substring(0, 100) + '...' : latestComment.body}"
      </div>
      <div className="gba:text-xs gba:text-gray-300 gba:flex gba:justify-between gba:gap-4">
        <span>{latestComment.stepName}</span>
        <span>{formatTimeAgo(latestComment.createdAt)}</span>
      </div>
      {totalComments > 1 && (
        <div className="gba:text-xs gba:text-gray-400 gba:mt-1 gba:pt-1 gba:border-t gba:border-gray-600">
          +{totalComments - 1} more comment{totalComments - 1 !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  ) : null;

  // Show loading state for debugging
  if (isLoading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gba:text-xs gba:bg-gray-50 gba:text-gray-500 gba:border-gray-200 gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:cursor-help">
            <ChatCircle className="gba:w-3 gba:h-3" />
            ...
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Loading comments...
        </TooltipContent>
      </Tooltip>
    );
  }

  // Show error state for debugging
  if (error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gba:text-xs gba:bg-red-50 gba:text-red-500 gba:border-red-200 gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:cursor-help">
            <ChatCircle className="gba:w-3 gba:h-3" />
            !
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Error loading comments: {error}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Show comment count even if 0 (different from original - always show for consistency)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={`gba:text-xs gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:cursor-help gba:transition-colors ${
            totalComments > 0 
              ? 'gba:bg-blue-50 gba:text-blue-700 gba:border-blue-200 hover:gba:bg-blue-100' 
              : 'gba:bg-gray-50 gba:text-gray-500 gba:border-gray-200'
          }`}
        >
          <ChatCircle className="gba:w-3 gba:h-3" />
          {totalComments}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {totalComments > 0 ? tooltipContent : 'No comments yet'}
      </TooltipContent>
    </Tooltip>
  );
};

export const MyRequestsTable: React.FC<MyRequestsTableProps> = ({
  // Data
  requests,
  isLoading,
  
  // Configuration
  tableId,
  
  // Customization
  customColumns,
  filterGroups: customFilterGroups,
  actions = [],
  
  // Callbacks
  onRequestSelect,
  onDebugRequest,
  
  // Display options
  showDebug = false,
  emptyMessage,
  emptySearchMessage,
  
  // Context
  accessToken,
  userInfo,
  workflowEngine
}) => {
  // Desk-scoped table preferences - simple and bulletproof (copied from TicketTable)
  const {
    search,
    setSearch,
    sortField,
    sortOrder,
    selectedFilters,
    setSelectedFilters,
    columnConfig: rawColumnConfig,
    handleSortingChange,
    handleFilterChange,
    handleColumnVisibilityChange,
    isLoading: preferencesLoading
  } = useMyRequestsTablePreferences(tableId);

  // Use the column configuration from the dedicated My Requests preferences hook
  const columnConfig = useMemo(() => {
    // If custom columns are provided, merge them with saved preferences
    if (customColumns) {
      return customColumns.map(customCol => {
        const savedCol = rawColumnConfig.find(saved => saved.id === customCol.id);
        return {
          ...customCol,
          visible: savedCol ? savedCol.visible : customCol.visible,
          // Only Service column is required (non-togglable)
          disabled: customCol.id === 'name'
        };
      });
    }
    
    // Use the column configuration from the My Requests preferences hook
    // This already includes proper defaults for My Requests and saved preferences
    return rawColumnConfig;
  }, [customColumns, rawColumnConfig]);

  // Calculate visible columns from column configuration
  const visibleColumns = useMemo(() => {
    return columnConfig.filter(col => col.visible).map(col => col.id);
  }, [columnConfig]);

  // Extract all userIds from requests for batch fetching
  const allUserIds = useMemo(() => {
    if (!requests) return [];
    
    const userIds: string[] = [];
    for (const request of requests) {
      // Add requester user ID
      if (request.requesterId && request.requesterId !== 'unknown') {
        userIds.push(request.requesterId);
      }
      
      // Add assignee user IDs from current active steps
      if (request.steps) {
        for (const step of request.steps) {
          if (step.assignedToUserId) userIds.push(step.assignedToUserId);
          if (step.claimedByUserId) userIds.push(step.claimedByUserId);
        }
      }
    }
    
    // Remove duplicates
    return [...new Set(userIds)];
  }, [requests]);

  // Batch fetch employee names and data for all users in the table
  const { displayNames: batchedDisplayNames } = useEmployeeNamesBatch({
    userIds: allUserIds,
    accessToken,
    enabled: allUserIds.length > 0,
  });

  // Generate unique people filters from current requests
  const peopleFilters = useMemo(() => {
    if (!requests) return { requesters: [], assignees: [] };
    
    const requesterSet = new Set<string>();
    const assigneeSet = new Set<string>();
    
    requests.forEach(request => {
      // Collect requester info
      const requesterUserId = request.requesterId;
      const requesterName = requesterUserId ? batchedDisplayNames.get(requesterUserId) : null;
      if (requesterName) {
        requesterSet.add(`requester:${requesterUserId}:${requesterName}`);
      }
      
      // Collect assignee info from active steps
      if (request.steps) {
        request.steps.forEach(step => {
          if (step.assignedToUserId) {
            const assigneeName = batchedDisplayNames.get(step.assignedToUserId);
            if (assigneeName) {
              assigneeSet.add(`assignee:${step.assignedToUserId}:${assigneeName}`);
            }
          }
          
          if (step.claimedByUserId) {
            const claimerName = batchedDisplayNames.get(step.claimedByUserId);
            if (claimerName) {
              assigneeSet.add(`assignee:${step.claimedByUserId}:${claimerName}`);
            }
          }
        });
      }
    });
    
    return {
      requesters: Array.from(requesterSet).map(item => {
        const [, userId, name] = item.split(':');
        return {
          id: `requester:${userId}`,
          label: name,
          value: userId,
          selected: selectedFilters.includes(`requester:${userId}`)
        };
      }).sort((a, b) => a.label.localeCompare(b.label)),
      
      assignees: Array.from(assigneeSet).map(item => {
        const [, userId, name] = item.split(':');
        return {
          id: `assignee:${userId}`,
          label: name,
          value: userId,
          selected: selectedFilters.includes(`assignee:${userId}`)
        };
      }).sort((a, b) => a.label.localeCompare(b.label))
    };
  }, [requests, batchedDisplayNames, selectedFilters]);

  // Default filter groups with dynamic selected state (adapted for SubmittedRequest)
  const defaultFilterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "status",
      title: "Status",
      filters: [
        { id: "status:open", label: "Open", value: "open", selected: selectedFilters.includes("status:open") },
        { id: "status:in_progress", label: "In Progress", value: "in_progress", selected: selectedFilters.includes("status:in_progress") },
        { id: "status:completed", label: "Completed", value: "completed", selected: selectedFilters.includes("status:completed") },
        { id: "status:canceled", label: "Canceled", value: "canceled", selected: selectedFilters.includes("status:canceled") },
      ],
    },
    {
      id: "category",
      title: "Category",
      filters: [
        // Dynamic categories from requests
        ...Array.from(new Set(requests.map(r => r.categoryIdSnapshot || 'general'))).map(category => ({
          id: `category:${category}`,
          label: category.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: category,
          selected: selectedFilters.includes(`category:${category}`)
        }))
      ],
    },
    {
      id: "progress",
      title: "Progress",
      filters: [
        { id: "progress:not-started", label: "Not Started (0%)", value: "not-started", selected: selectedFilters.includes("progress:not-started") },
        { id: "progress:in-progress", label: "In Progress (1-99%)", value: "in-progress", selected: selectedFilters.includes("progress:in-progress") },
        { id: "progress:completed", label: "Completed (100%)", value: "completed", selected: selectedFilters.includes("progress:completed") },
      ],
    },
    ...(peopleFilters.requesters.length > 0 ? [{
      id: "requester",
      title: "Requester",
      filters: peopleFilters.requesters,
    }] : []),
    ...(peopleFilters.assignees.length > 0 ? [{
      id: "assignee", 
      title: "Assignee",
      filters: peopleFilters.assignees,
    }] : []),
  ], [selectedFilters, peopleFilters, requests]);

  // Use custom filter groups if provided, otherwise use defaults with dynamic selected state
  const filterGroups = useMemo(() => {
    if (customFilterGroups && customFilterGroups.length > 0) {
      // Update custom filter groups with current selected state
      return customFilterGroups.map(group => ({
        ...group,
        filters: group.filters.map(filter => ({
          ...filter,
          selected: selectedFilters.includes(filter.id)
        }))
      }));
    }
    return defaultFilterGroups;
  }, [customFilterGroups, selectedFilters, defaultFilterGroups]);

  // Create filter label map for displaying human-readable names in badges
  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {};
    
    // Add people filter labels
    peopleFilters.requesters.forEach(filter => {
      labelMap[filter.id] = filter.label;
    });
    
    peopleFilters.assignees.forEach(filter => {
      labelMap[filter.id] = filter.label;
    });
    
    // Add static filter labels for better display
    labelMap['status:open'] = 'Open';
    labelMap['status:in_progress'] = 'In Progress';
    labelMap['status:completed'] = 'Completed';
    labelMap['status:canceled'] = 'Canceled';
    labelMap['progress:not-started'] = 'Not Started (0%)';
    labelMap['progress:in-progress'] = 'In Progress (1-99%)';
    labelMap['progress:completed'] = 'Completed (100%)';
    
    // Add category labels
    Array.from(new Set(requests.map(r => r.categoryIdSnapshot || 'general'))).forEach(category => {
      labelMap[`category:${category}`] = category.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    });
    
    return labelMap;
  }, [peopleFilters, requests]);

  // Get current user ID for action permissions
  const currentUserId = userInfo?.employeeDetails?.employeeId;

  // Enhanced filtering with search and client-side operations (adapted for SubmittedRequest)
  const filteredRequests = useMemo(() => {
    if (!requests) return [];

    let filteredList = [...requests];

    // Apply filters if any are selected - OR within groups, AND between groups
    if (selectedFilters.length > 0) {
      filteredList = filteredList.filter(request => {
        // Group filters by type
        const statusFilters = selectedFilters.filter(f => f.startsWith('status:'));
        const categoryFilters = selectedFilters.filter(f => f.startsWith('category:'));
        const progressFilters = selectedFilters.filter(f => f.startsWith('progress:'));
        const requesterFilters = selectedFilters.filter(f => f.startsWith('requester:'));
        const assigneeFilters = selectedFilters.filter(f => f.startsWith('assignee:'));
        
        // Check each group - if any filters in a group are selected, at least one must match
        const statusMatch = statusFilters.length === 0 || statusFilters.some(filterId => {
          const status = filterId.replace('status:', '');
          return request.status === status;
        });
        
        const categoryMatch = categoryFilters.length === 0 || categoryFilters.some(filterId => {
          const category = filterId.replace('category:', '');
          return (request.categoryIdSnapshot || 'general') === category;
        });
        
        const progressMatch = progressFilters.length === 0 || progressFilters.some(filterId => {
          const progressType = filterId.replace('progress:', '');
          const completed = request.steps.filter(s => s.status === 'COMPLETED' || s.status === 'DONE').length;
          const total = request.steps.length;
          const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
          
          if (progressType === 'not-started') return percentage === 0;
          if (progressType === 'in-progress') return percentage > 0 && percentage < 100;
          if (progressType === 'completed') return percentage === 100;
          return false;
        });
        
        // Check requester filters
        const requesterMatch = requesterFilters.length === 0 || requesterFilters.some(filterId => {
          const userId = filterId.replace('requester:', '');
          return request.requesterId === userId;
        });
        
        // Check assignee filters (from active steps)
        const assigneeMatch = assigneeFilters.length === 0 || assigneeFilters.some(filterId => {
          const userId = filterId.replace('assignee:', '');
          return request.steps.some(step => 
            step.assignedToUserId === userId || step.claimedByUserId === userId
          );
        });
        
        // AND logic between groups: request must match ALL non-empty groups
        return statusMatch && categoryMatch && progressMatch && requesterMatch && assigneeMatch;
      });
    }

    // Apply search filter if search term exists
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      
      filteredList = filteredList.filter(request => {
        // Basic request fields
        const basicMatch = 
          request.titleSnapshot?.toLowerCase().includes(searchLower) ||
          request.id.toLowerCase().includes(searchLower) ||
          request.requesterId?.toLowerCase().includes(searchLower) ||
          // Also search in formatted Request ID (REQ-XXXXX format)
          formatRequestId(request.id).toLowerCase().includes(searchLower) ||
          // Search in category
          (request.categoryIdSnapshot || '').toLowerCase().includes(searchLower) ||
          // Search in status
          request.status.toLowerCase().includes(searchLower);
        
        if (basicMatch) return true;
        
        // Search in resolved employee display names
        const requesterDisplayName = request.requesterId ? batchedDisplayNames.get(request.requesterId) : null;
        
        // Search in assignee names from active steps
        const assigneeNames = request.steps
          .map(step => {
            const assigneeId = step.assignedToUserId || step.claimedByUserId;
            return assigneeId ? batchedDisplayNames.get(assigneeId) : null;
          })
          .filter(Boolean);
        
        const nameMatch = 
          requesterDisplayName?.toLowerCase().includes(searchLower) ||
          assigneeNames.some(name => name?.toLowerCase().includes(searchLower));
        
        return nameMatch;
      });
    }

    // Apply sorting
    if (sortField && sortOrder) {
      filteredList.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        // Get the values to compare based on the sort field
        switch (sortField) {
          case 'requestId':
            aValue = a.id || '';
            bValue = b.id || '';
            break;
          case 'name':
            aValue = a.titleSnapshot || '';
            bValue = b.titleSnapshot || '';
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'category':
            aValue = a.categoryIdSnapshot || 'general';
            bValue = b.categoryIdSnapshot || 'general';
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'progress':
            // Calculate progress percentage for sorting
            const aCompleted = a.steps.filter(s => s.status === 'COMPLETED' || s.status === 'DONE').length;
            const aTotal = a.steps.length;
            const aPercentage = aTotal > 0 ? (aCompleted / aTotal) * 100 : 0;
            
            const bCompleted = b.steps.filter(s => s.status === 'COMPLETED' || s.status === 'DONE').length;
            const bTotal = b.steps.length;
            const bPercentage = bTotal > 0 ? (bCompleted / bTotal) * 100 : 0;
            
            aValue = aPercentage;
            bValue = bPercentage;
            break;
          default:
            aValue = '';
            bValue = '';
        }
        
        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
          return sortOrder === 'ASC' ? comparison : -comparison;
        }
        
        // Handle numeric comparison (for dates and progress)
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'ASC' ? aValue - bValue : bValue - aValue;
        }
        
        return 0;
      });
    }

    return filteredList;
  }, [requests, selectedFilters, search, batchedDisplayNames, sortField, sortOrder]);

  // Total count for display
  const totalCount = filteredRequests.length;

  // Get status variant for badges (adapted for SubmittedRequest statuses)
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'outline';
      case 'canceled':
      case 'cancelled':
        return 'destructive';
      default: 
        return 'outline';
    }
  };

  // Loading state - wait for both preferences and requests
  if ((isLoading || preferencesLoading) && filteredRequests.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64" data-testid={`my-requests-table-${tableId.toLowerCase()}-loading`}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
          <Spinner size="lg" />
          <span className="gba:text-sm gba:text-muted-foreground">
            {preferencesLoading ? 'Loading preferences...' : 'Loading requests...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid={`my-requests-table-${tableId.toLowerCase()}`} className="gba:w-full">
      <DataContainer
        dataControllerProps={{
          search,
          setSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: setSelectedFilters,
          filterLabelMap: filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Requests</span>
                <span className="gba:text-gray-500">({totalCount})</span>
              </div>
            </div>
          ),
          columnVisibility: {
            columns: columnConfig,
            onColumnVisibilityChange: handleColumnVisibilityChange,
            'data-testid': `my-requests-table-${tableId.toLowerCase()}-column-visibility`
          },
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange,
        }}
        dataBody={
          <div className="gba:bg-white gba:rounded-lg gba:border">
            <Table>
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-gray-50">
                  {visibleColumns.includes('requestId') && (
                    <SortableTableHead field="requestId" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                      {getTranslationFromI18nKeyAndLabel('services.myRequests.columns.requestId', 'Request ID')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('name') && (
                    <SortableTableHead field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                      {getTranslationFromI18nKeyAndLabel('services.myRequests.columns.name', 'Service')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('comments') && (
                    <TableHead className="gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('services.myRequests.columns.comments', 'Comments')}
                    </TableHead>
                  )}
                  {visibleColumns.includes('progress') && (
                    <SortableTableHead field="progress" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                      {getTranslationFromI18nKeyAndLabel('services.myRequests.columns.progress', 'Progress')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('category') && (
                    <SortableTableHead field="category" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                      {getTranslationFromI18nKeyAndLabel('services.myRequests.columns.category', 'Category')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('status') && (
                    <SortableTableHead field="status" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                      {getTranslationFromI18nKeyAndLabel('services.myRequests.columns.status', 'Status')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('createdAt') && (
                    <SortableTableHead field="createdAt" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                      {getTranslationFromI18nKeyAndLabel('services.myRequests.columns.createdAt', 'Created')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('debug') && (
                    <TableHead className="gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('services.myRequests.columns.debug', 'Debug')}
                    </TableHead>
                  )}
                  {visibleColumns.includes('actions') && (
                    <TableHead className="gba:w-[180px] gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('services.myRequests.columns.actions', 'Actions')}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={visibleColumns.length} 
                      className="gba:text-center gba:py-8 gba:text-muted-foreground"
                    >
                      <div className="gba:mb-2">
                        {search.trim() ? 
                          (emptySearchMessage || getTranslationFromI18nKeyAndLabel('services.myRequests.searchEmpty', 'No requests found matching your search')) :
                          (emptyMessage || getTranslationFromI18nKeyAndLabel('services.myRequests.empty', 'No requests found'))
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow 
                      key={request.id}
                      className="gba:border-b gba:hover:gba:bg-gray-50 gba:cursor-pointer gba:transition-colors"
                      onClick={() => onRequestSelect?.(request)}
                    >
                      {visibleColumns.includes('requestId') && (
                        <TableCell className="gba:align-middle">
                          <code 
                            className="gba:text-sm gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded gba:text-muted-foreground"
                            data-testid={`request-id-${request.id}`}
                          >
                            {formatRequestId(request.id)}
                          </code>
                        </TableCell>
                      )}
                      {visibleColumns.includes('name') && (
                        <TableCell className="gba:align-middle">
                          <div className="gba:max-w-xs">
                            <div 
                              className="gba:font-medium gba:text-sm gba:text-blue-600 hover:gba:text-blue-800 gba:cursor-pointer gba:hover:underline gba:break-words"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestSelect?.(request);
                              }}
                              data-testid={`service-name-${request.id}`}
                            >
                              {request.titleSnapshot}
                            </div>
                            {(() => {
                              // Show current step for submitted requests
                              let currentStepName = '';
                              if (request.progress && request.progress.currentStep && request.steps.length > 0) {
                                const currentStepIndex = request.progress.currentStep - 1;
                                const currentStep = request.steps[currentStepIndex];
                                currentStepName = currentStep?.name || '';
                              } else {
                                const activeStep = request.steps.find(s => s.status === 'IN_PROGRESS' || s.status === 'READY') || 
                                                  request.steps[request.steps.length - 1];
                                currentStepName = activeStep?.name || '';
                              }
                              
                              return currentStepName ? (
                                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:flex gba:items-center gba:gap-1">
                                  <div className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-muted-foreground"></div>
                                  {currentStepName}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('comments') && (
                        <TableCell className="gba:align-middle">
                          <div className="gba:text-center">
                            <CommentCountIndicator 
                              flowId={request.id} 
                              contextProps={{ accessToken, userInfo }}
                              workflowEngine={workflowEngine}
                            />
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('progress') && (
                        <TableCell className="gba:align-middle">
                          {(() => {
                            // Calculate progress for submitted requests
                            let percentage, completed, total;
                            
                            if (request.progress) {
                              percentage = request.progress.percentage || 0;
                              completed = request.progress.completedSteps || 0;
                              total = request.progress.totalSteps || request.steps.length;
                            } else {
                              completed = request.steps.filter(s => s.status === 'COMPLETED' || s.status === 'DONE').length;
                              total = request.steps.length;
                              percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                            }

                            const getProgressColor = (percent: number) => {
                              if (percent === 100) return 'var(--nw-success)';
                              if (percent >= 75) return 'var(--nw-info)';
                              if (percent >= 50) return 'var(--nw-warning)';
                              if (percent > 0) return 'var(--nw-muted-foreground)';
                              return 'var(--nw-muted)';
                            };
                            
                            return (
                              <div className="gba:space-y-2 gba:py-1 gba:min-w-[120px]">
                                <div className="gba:flex gba:items-center gba:gap-3">
                                  <span className="gba:text-sm gba:font-semibold gba:min-w-[35px]">
                                    {Math.round(percentage)}%
                                  </span>
                                  <div 
                                    className="gba:flex-1 gba:h-2 gba:bg-muted gba:rounded"
                                  >
                                    <div 
                                      className="gba:h-2 gba:transition-all gba:duration-300 gba:rounded"
                                      style={{ 
                                        width: `${percentage}%`,
                                        backgroundColor: getProgressColor(percentage)
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="gba:text-xs gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground">
                                  <CheckCircle className="gba:w-3 gba:h-3" />
                                  {completed} of {total} steps
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.includes('category') && (
                        <TableCell className="gba:align-middle">
                          <Badge 
                            variant="outline" 
                            className="gba:text-xs gba:font-medium gba:px-2.5 gba:py-1"
                          >
                            {(request.categoryIdSnapshot || 'general')
                              .replace(/[-_]/g, ' ')
                              .replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes('status') && (
                        <TableCell className="gba:align-middle">
                          <Badge 
                            variant={getStatusVariant(request.status)}
                            data-testid={`status-badge-${request.status}`}
                            className="gba:text-xs"
                          >
                            {formatStatusText(request.status.toUpperCase())}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes('createdAt') && (
                        <TableCell className="gba:align-middle">
                          <div className="gba:space-y-1.5 gba:py-1">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Calendar className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
                              <div className="gba:text-sm gba:font-medium">
                                {formatDate(request.createdAt)}
                              </div>
                            </div>
                            <div className="gba:text-xs gba:font-medium gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground">
                              <div className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-muted-foreground"></div>
                              {(() => {
                                const createdDate = new Date(request.createdAt);
                                const now = new Date();
                                const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                                
                                if (diffDays === 0) return 'Today';
                                if (diffDays === 1) return '1 day ago';
                                if (diffDays <= 7) return `${diffDays} days ago`;
                                if (diffDays <= 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
                                return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
                              })()}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('debug') && (
                        <TableCell className="gba:align-middle" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDebugRequest?.(request)}
                            data-testid={`debug-request-${request.id}`}
                            className="gba:gap-1 gba:text-xs"
                            title={getTranslationFromI18nKeyAndLabel('services.myRequests.actions.debug.tooltip', 'Show debug data from flow engine')}
                          >
                            <Bug className="gba:w-3 gba:h-3" />
                            <span className="gba:hidden md:gba:inline">
                              {getTranslationFromI18nKeyAndLabel('services.myRequests.actions.debug', 'Debug')}
                            </span>
                          </Button>
                        </TableCell>
                      )}
                      {visibleColumns.includes('actions') && (
                        <TableCell className="gba:align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="gba:flex gba:gap-2 gba:flex-nowrap">
                            {actions.map((action, index) => {
                              if (!action.show(request, currentUserId)) return null;
                              
                              return (
                                <Button
                                  key={`${action.type}-${index}`}
                                  variant={action.type === 'view' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => action.onClick(request)}
                                  disabled={action.disabled?.(request)}
                                  data-testid={action.testId || `${action.type}-request-${request.id}`}
                                  className="gba:gap-1 gba:text-xs"
                                  title={action.title}
                                >
                                  {action.icon}
                                  {action.label}
                                </Button>
                              );
                            })}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        }
      />
    </div>
  );
};
