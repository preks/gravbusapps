import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Eye, Calendar, Clock, Warning, UserPlus, UserMinus } from '@phosphor-icons/react';
import { Bug, ChevronUp, ChevronDown } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { StepReceiver, StepStatus } from 'packages/services-plus-core';
import type { StepInstance } from '../../../types';
import { formatRequestId } from '../../../utils';
import { TicketDetail } from './TicketDetail';
import { DebugFlowModal } from './DebugFlowModal';
import { useDeskTickets } from '../hooks/useDeskTickets';
import { useTicketActions } from '../hooks/useTicketActions';
import { EmployeeDisplayName } from './EmployeeDisplayName';
import { useEmployeeNamesBatch } from '../../../hooks/useEmployeeNamesBatch';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { useDeskTablePreferencesSimple } from '../../../hooks/useDeskTablePreferencesSimple';

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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Spinner
} from '@newwork/nw-design-system';

export interface DeskQueueProps extends BusinessAppContextProps {
  deskKey: StepReceiver;
  ticketId?: string;
  onTaskSelect?: (taskId: string, deskKey: string) => void;
}

// Priority options for urgency level mapping
const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: '#ff4d4f' },
  { value: 'high', label: 'High', color: '#ff7a45' },
  { value: 'medium', label: 'Medium', color: '#faad14' },
  { value: 'low', label: 'Low', color: '#52c41a' },
];

// Calculate SLA due date based on ticket data
const calculateSLADue = (ticket: StepInstance): Date | null => {
  if (!ticket.startedAt) return null;
  
  // Default SLA hours based on urgency level from API
  const slaHours = {
    critical: 4,
    high: 8,
    medium: 24,
    low: 72
  };
  
  // Use actual urgency_level from API response instead of random generation
  const urgencyLevel = (ticket as any).urgency_level || 'medium';
  const hours = slaHours[urgencyLevel as keyof typeof slaHours] || 24;
  
  const startDate = new Date(ticket.startedAt);
  const dueDate = new Date(startDate.getTime() + (hours * 60 * 60 * 1000));
  return dueDate;
};

// Format SLA status
const getSLAStatus = (dueDate: Date | null): { status: 'ok' | 'warning' | 'overdue'; color: string } => {
  if (!dueDate) return { status: 'ok', color: '#52c41a' };
  
  const now = new Date();
  const timeDiff = dueDate.getTime() - now.getTime();
  const hoursLeft = timeDiff / (1000 * 60 * 60);
  
  if (hoursLeft < 0) return { status: 'overdue', color: '#ff4d4f' };
  if (hoursLeft < 2) return { status: 'warning', color: '#faad14' };
  return { status: 'ok', color: '#52c41a' };
};

// Sortable table header component
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

export const DeskQueue: React.FC<DeskQueueProps> = ({
  deskKey,
  ticketId,
  accessToken,
  userInfo,
  onTaskSelect,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(ticketId || null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(!!ticketId);

  // Debug modal state for development
  const [debugTicket, setDebugTicket] = useState<StepInstance | null>(null);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState<boolean>(false);

  // Desk-scoped table preferences - simple and bulletproof
  const {
    search,
    setSearch,
    sortField,
    sortOrder,
    selectedFilters,
    setSelectedFilters,
    columnConfig,
    handleSortingChange: handleSortingChangeFromHook,
    handleFilterChange,
    handleColumnVisibilityChange,
    isLoading: preferencesLoading
  } = useDeskTablePreferencesSimple(deskKey);

  // Calculate visible columns from column configuration
  const visibleColumns = useMemo(() => {
    return columnConfig.filter(col => col.visible).map(col => col.id);
  }, [columnConfig]);


  // Filter groups for tickets
  const filterGroups = useMemo(() => [
    {
      id: "status",
      title: "Status",
      filters: [
        // Core statuses
        { id: "status:SCHEDULED", label: "Scheduled", value: "SCHEDULED", selected: selectedFilters.includes("status:SCHEDULED") },
        { id: "status:OPEN", label: "Open", value: "OPEN", selected: selectedFilters.includes("status:OPEN") },
        { id: "status:IN_PROGRESS", label: "In Progress", value: "IN_PROGRESS", selected: selectedFilters.includes("status:IN_PROGRESS") },
        { id: "status:COMPLETED", label: "Completed", value: "COMPLETED", selected: selectedFilters.includes("status:COMPLETED") },
        { id: "status:REJECTED", label: "Rejected", value: "REJECTED", selected: selectedFilters.includes("status:REJECTED") },
        { id: "status:FAILED", label: "Failed", value: "FAILED", selected: selectedFilters.includes("status:FAILED") },
        { id: "status:PAUSED", label: "Paused", value: "PAUSED", selected: selectedFilters.includes("status:PAUSED") },
      ],
    },
    {
      id: "assignmentStatus",
      title: "Assignment",
      filters: [
        { id: "assignment:ASSIGNED", label: "Assigned", value: "ASSIGNED", selected: selectedFilters.includes("assignment:ASSIGNED") },
        { id: "assignment:CLAIMED", label: "Claimed", value: "CLAIMED", selected: selectedFilters.includes("assignment:CLAIMED") },
        { id: "assignment:UNASSIGNED", label: "Unassigned", value: "UNASSIGNED", selected: selectedFilters.includes("assignment:UNASSIGNED") },
      ],
    },
    {
      id: "urgency",
      title: "Urgency",
      filters: [
        { id: "urgency:HIGH", label: "High", value: "HIGH", selected: selectedFilters.includes("urgency:HIGH") },
        { id: "urgency:MEDIUM", label: "Medium", value: "MEDIUM", selected: selectedFilters.includes("urgency:MEDIUM") },
        { id: "urgency:LOW", label: "Low", value: "LOW", selected: selectedFilters.includes("urgency:LOW") },
      ],
    },
  ], [selectedFilters]);

  // Use the sorting handler from the preferences hook
  const handleSortingChange = handleSortingChangeFromHook;

  // UI FILTERING DISABLED - Filter state variables removed
  // All filtering now happens at the backend level only

  // Fetch tickets for this desk
  const { tickets, isLoading, refetch } = useDeskTickets({
    deskKey,
    accessToken,
    userInfo,
  });

  // Extract all userIds from tickets for batch fetching
  const allUserIds = useMemo(() => {
    if (!tickets) return [];
    
    const userIds: string[] = [];
    for (const ticket of tickets) {
      // Add requester user IDs (flowInitiatedBy takes priority over requesterId)
      const requesterUserId = ticket.flowInitiatedBy || ticket.requesterId;
      if (requesterUserId && requesterUserId !== 'unknown') {
        userIds.push(requesterUserId);
      }
      
      // Add assignee user IDs
      if (ticket.assignedToUserId) userIds.push(ticket.assignedToUserId);
      if (ticket.claimedByUserId) userIds.push(ticket.claimedByUserId);
    }
    
    // Remove duplicates
    return [...new Set(userIds)];
  }, [tickets]);

  // Batch fetch employee names for all users in the table
  const { displayNames: batchedDisplayNames } = useEmployeeNamesBatch({
    userIds: allUserIds,
    accessToken,
    enabled: allUserIds.length > 0,
  });

  // Debug: Log tickets data whenever it changes
  useEffect(() => {
    console.log(`[ConductorAdapterRequester] 🔍 Received ${tickets?.length || 0} tickets for desk ${deskKey}:`);
    console.log(`[ConductorAdapterRequester] 👥 Batch fetching ${allUserIds.length} unique employee names`);
    console.log(`[ConductorAdapterRequester] 📋 User IDs to fetch:`, allUserIds);
    
    if (tickets && tickets.length > 0) {
      console.log(`[ConductorAdapterRequester] 📋 All tickets data:`, tickets.map(ticket => ({
        id: ticket.id,
        name: ticket.name,
        requesterId: ticket.requesterId,
        flowInitiatedBy: ticket.flowInitiatedBy,
        requesterName: ticket.requesterName,
        hasRequesterName: !!(ticket.requesterName && ticket.requesterName.trim().length > 0),
        urgency_level: (ticket as any).urgency_level // Debug urgency_level
      })));
    } else {
      console.log(`[ConductorAdapterRequester] ❌ No tickets received or tickets is empty`);
    }
  }, [tickets, deskKey, allUserIds.length]);

  // Debug: Log batch names when they change
  useEffect(() => {
    console.log(`[DeskQueue] 🏷️ Batch display names updated - ${batchedDisplayNames.size} entries:`, Array.from(batchedDisplayNames.entries()));
  }, [batchedDisplayNames]);

  // Ticket actions (claim, unclaim)
  const { 
    claimTicket, 
    assignTicket, 
    isPerformingAction 
  } = useTicketActions({
    accessToken,
    userInfo,
    onSuccess: () => {
      setOptimisticUpdates({}); // Clear all optimistic updates
      refetch(); // Refresh the ticket list after successful action
    },
  });

  // Get current user ID for action permissions
  const currentUserId = userInfo?.employeeDetails?.employeeId;

  // Optimistic updates state
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Partial<StepInstance>>>({});

  // Handle claim ticket with optimistic update
  const handleClaimTicket = useCallback(async (ticket: StepInstance) => {
    if (!currentUserId) {
      console.error(getTranslationFromI18nKeyAndLabel('services.error.noUser', 'User information not available'));
      return;
    }

    // Optimistic update
    setOptimisticUpdates(prev => ({
      ...prev,
      [ticket.id]: {
        claimedByUserId: currentUserId,
        status: 'claimed' as StepStatus
      }
    }));

    console.log(getTranslationFromI18nKeyAndLabel('services.queue.claiming', 'Claiming ticket...'));

    try {
      await claimTicket(ticket.id);
      console.log(getTranslationFromI18nKeyAndLabel('services.queue.claimed.success', 'Ticket claimed successfully'));
    } catch (err) {
      // Remove optimistic update on error
      setOptimisticUpdates(prev => {
        const { [ticket.id]: removed, ...rest } = prev;
        return rest;
      });
      console.error(getTranslationFromI18nKeyAndLabel('services.queue.claimed.error', 'Failed to claim ticket'));
    }
  }, [currentUserId, claimTicket]);

  // Handle unclaim ticket (assign to null)
  const handleUnclaimTicket = useCallback(async (ticket: StepInstance) => {
    // Optimistic update
    setOptimisticUpdates(prev => ({
      ...prev,
      [ticket.id]: {
        claimedByUserId: undefined,
        assignedToUserId: undefined,
        status: 'queued' as StepStatus
      }
    }));

    console.log(getTranslationFromI18nKeyAndLabel('services.queue.unclaiming', 'Unclaiming ticket...'));

    try {
      // Use assign with empty string to simulate unclaim
      await assignTicket(ticket.id, '');
      console.log(getTranslationFromI18nKeyAndLabel('services.queue.unclaimed.success', 'Ticket unclaimed successfully'));
    } catch (err) {
      // Remove optimistic update on error
      setOptimisticUpdates(prev => {
        const { [ticket.id]: removed, ...rest } = prev;
        return rest;
      });
      console.error(getTranslationFromI18nKeyAndLabel('services.queue.unclaimed.error', 'Failed to unclaim ticket'));
    }
  }, [assignTicket]);

  // Handle debug modal open
  const handleOpenDebugModal = useCallback((ticket: StepInstance) => {
    setDebugTicket(ticket);
    setIsDebugModalOpen(true);
    console.log(`[DeskQueue] 🔍 Opening debug modal for ticket: ${ticket.id}`);
  }, []);

  // Update drawer state when ticketId prop changes
  useEffect(() => {
    if (ticketId) {
      setSelectedTicketId(ticketId);
      setIsDetailDrawerOpen(true);
    }
  }, [ticketId]);

  // Enhanced filtering with search and client-side operations
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];

    // Apply optimistic updates to tickets
    let ticketsWithOptimisticUpdates = tickets.map(ticket => ({
      ...ticket,
      ...optimisticUpdates[ticket.id]
    }));

    // Apply filters if any are selected
    if (selectedFilters.length > 0) {
      ticketsWithOptimisticUpdates = ticketsWithOptimisticUpdates.filter(ticket => {
        return selectedFilters.every(filterId => {
          if (filterId.startsWith('status:')) {
            const status = filterId.replace('status:', '');
            return ticket.status === status;
          }
          
          if (filterId.startsWith('assignment:')) {
            const assignmentType = filterId.replace('assignment:', '');
            if (assignmentType === 'ASSIGNED') {
              return ticket.assignedToUserId && !ticket.claimedByUserId;
            } else if (assignmentType === 'CLAIMED') {
              return ticket.claimedByUserId;
            } else if (assignmentType === 'UNASSIGNED') {
              return !ticket.assignedToUserId && !ticket.claimedByUserId;
            }
          }
          
          if (filterId.startsWith('urgency:')) {
            const urgency = filterId.replace('urgency:', '');
            // Get urgency from ticket data - this might need adjustment based on actual data structure
            const ticketUrgency = (ticket as any).urgency_level || (ticket as any).urgency || 'MEDIUM';
            return ticketUrgency.toUpperCase() === urgency;
          }
          
          return true;
        });
      });
    }

    // Apply search filter if search term exists
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      console.log(`[DeskQueue] 🔍 Searching for: "${search}"`);
      console.log(`[DeskQueue] 👥 Batch display names available: ${batchedDisplayNames.size} entries`);
      
      // Debug: Show all available batch names
      if (batchedDisplayNames.size > 0) {
        console.log(`[DeskQueue] 📝 Available batch names:`, Array.from(batchedDisplayNames.entries()));
      }
      
      ticketsWithOptimisticUpdates = ticketsWithOptimisticUpdates.filter(ticket => {
        
        // Basic ticket fields
        const basicMatch = 
          ticket.name?.toLowerCase().includes(searchLower) ||
          ticket.id.toLowerCase().includes(searchLower) ||
          ticket.requestId?.toLowerCase().includes(searchLower) ||
          ticket.requesterId?.toLowerCase().includes(searchLower) ||
          ticket.requesterName?.toLowerCase().includes(searchLower) ||
          // Also search in formatted Request ID (REQ-XXXXX format)
          (ticket.requestId ? formatRequestId(ticket.requestId).toLowerCase().includes(searchLower) : false) ||
          // Search in requester details (flowInitiatedBy user)
          ticket.flowInitiatedBy?.toLowerCase().includes(searchLower) ||
          // Search in assignee details
          ticket.assignedToUserId?.toLowerCase().includes(searchLower) ||
          ticket.claimedByUserId?.toLowerCase().includes(searchLower);
        
        if (basicMatch) {
          console.log(`[DeskQueue] ✅ Basic match found for "${search}" in ticket ${ticket.id}`);
          return true;
        }
        
        // Search in resolved employee display names - check all possible user roles
        // For requester, use the same logic as the display: flowInitiatedBy || requesterId
        const requesterUserId = ticket.flowInitiatedBy || ticket.requesterId;
        const requesterDisplayName = requesterUserId ? batchedDisplayNames.get(requesterUserId) : null;
        const assigneeDisplayName = ticket.assignedToUserId ? batchedDisplayNames.get(ticket.assignedToUserId) : null;
        const claimerDisplayName = ticket.claimedByUserId ? batchedDisplayNames.get(ticket.claimedByUserId) : null;
        
        const nameMatch = 
          requesterDisplayName?.toLowerCase().includes(searchLower) ||
          assigneeDisplayName?.toLowerCase().includes(searchLower) ||
          claimerDisplayName?.toLowerCase().includes(searchLower);
        
        if (nameMatch) {
          console.log(`[DeskQueue] 👤 Found name match for "${search}" in ticket ${ticket.id}:`, {
            requesterUserId,
            requesterDisplayName,
            assigneeDisplayName,
            claimerDisplayName
          });
        }
        
        return nameMatch;
      });
    }

    // Apply sorting
    if (sortField && sortOrder) {
      console.log(`[DeskQueue] 🔄 Applying sort: ${sortField} ${sortOrder}`);
      
      ticketsWithOptimisticUpdates.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        // Get the values to compare based on the sort field
        switch (sortField) {
          case 'requestId':
            aValue = a.requestId || '';
            bValue = b.requestId || '';
            break;
          case 'name':
            aValue = a.name || '';
            bValue = b.name || '';
            break;
          case 'requesterName':
            // Use the same logic as display: get name from batch or fallback to requesterName
            const aRequesterUserId = a.flowInitiatedBy || a.requesterId;
            const bRequesterUserId = b.flowInitiatedBy || b.requesterId;
            aValue = (aRequesterUserId ? batchedDisplayNames.get(aRequesterUserId) : null) || a.requesterName || '';
            bValue = (bRequesterUserId ? batchedDisplayNames.get(bRequesterUserId) : null) || b.requesterName || '';
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'assignedToUserId':
            // Sort by assignee display name
            aValue = a.assignedToUserId ? (batchedDisplayNames.get(a.assignedToUserId) || a.assignedToUserId) : '';
            bValue = b.assignedToUserId ? (batchedDisplayNames.get(b.assignedToUserId) || b.assignedToUserId) : '';
            break;
          case 'slaDue':
            // Sort by SLA due date
            const aSLADue = calculateSLADue(a);
            const bSLADue = calculateSLADue(b);
            // Tickets without SLA due dates go to the end
            aValue = aSLADue ? aSLADue.getTime() : Number.MAX_SAFE_INTEGER;
            bValue = bSLADue ? bSLADue.getTime() : Number.MAX_SAFE_INTEGER;
            break;
          case 'updatedAt':
            // Use the same logic as display: updatedAt || startedAt || Date.now()
            const aDate = a.updatedAt ? new Date(a.updatedAt) : new Date(a.startedAt || Date.now());
            const bDate = b.updatedAt ? new Date(b.updatedAt) : new Date(b.startedAt || Date.now());
            
            // Handle invalid dates
            aValue = isNaN(aDate.getTime()) ? Date.now() : aDate.getTime();
            bValue = isNaN(bDate.getTime()) ? Date.now() : bDate.getTime();
            
            // Debug: Show the actual date values being compared
            console.log(`[DeskQueue] 📅 Comparing dates:`, {
              ticketA: a.id.slice(-8),
              aUpdatedAt: a.updatedAt,
              aStartedAt: a.startedAt,
              aParsedDate: aDate.toISOString(),
              aTimestamp: aValue,
              ticketB: b.id.slice(-8),
              bUpdatedAt: b.updatedAt,
              bStartedAt: b.startedAt,
              bParsedDate: bDate.toISOString(),
              bTimestamp: bValue,
              comparison: aValue - bValue
            });
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
        
        // Handle numeric comparison (for dates)
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'ASC' ? aValue - bValue : bValue - aValue;
        }
        
        return 0;
      });
    }

    console.log(`[DeskQueue] Enhanced filtering - ${ticketsWithOptimisticUpdates.length} tickets after filters, search and sort (${sortField} ${sortOrder}) for desk: ${deskKey}`);
    return ticketsWithOptimisticUpdates;
  }, [tickets, optimisticUpdates, deskKey, selectedFilters, search, batchedDisplayNames, sortField, sortOrder]);

  // Total count for display
  const totalCount = filteredTickets.length;

  // Handle ticket selection
  const handleViewTicket = (ticket: StepInstance) => {
    setSelectedTicketId(ticket.id);
    setIsDetailDrawerOpen(true);
    
    // Update URL to reflect ticket detail view
    const newPath = `/desk/${deskKey}/tickets/${ticket.id}`;
    window.history.pushState({}, '', newPath);
  };

  // Handle sheet close
  const handleCloseDetail = (open: boolean) => {
    setIsDetailDrawerOpen(open);
    if (!open) {
      setSelectedTicketId(null);
      
      // Update URL to go back to queue
      const newPath = `/desk/${deskKey}`;
      window.history.pushState({}, '', newPath);
    }
  };

  // Handle debug modal close
  const handleCloseDebugModal = () => {
    setIsDebugModalOpen(false);
    setDebugTicket(null);
    console.log(`[DeskQueue] ❌ Closing debug modal`);
  };

  // Get status variant for badges
  const getStatusVariant = (status: StepStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'SCHEDULED':
      case 'READY':
      case 'QUEUED': 
        return 'secondary';
      case 'IN_PROGRESS':
      case 'RUNNING':
        return 'default';
      case 'COMPLETED':
      case 'DONE':
      case 'SKIPPED':
        return 'outline';
      case 'FAILED':
      case 'ERROR':
      case 'REJECTED':
      case 'CANCELLED':
      case 'CANCELED':
      case 'TIMED_OUT':
        return 'destructive';
      default: 
        return 'outline';
    }
  };

  // Loading state - wait for both preferences and tickets
  if ((isLoading || preferencesLoading) && filteredTickets.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64" data-testid={`desk-queue-${deskKey.toLowerCase()}-loading`}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
          <Spinner size="lg" />
          <span className="gba:text-sm gba:text-muted-foreground">
            {preferencesLoading ? 'Loading preferences...' : 'Loading tickets...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid={`desk-queue-${deskKey.toLowerCase()}`} className="gba:w-full">
      <DataContainer
        dataControllerProps={{
          search,
          setSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: setSelectedFilters,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    `services.desk.${deskKey.toLowerCase()}.queue.title`,
                    `${deskKey} Queue`
                  )}
                </span>
                <span className="gba:text-gray-500">({totalCount})</span>
              </div>
            </div>
          ),
          columnVisibility: {
            columns: columnConfig,
            onColumnVisibilityChange: handleColumnVisibilityChange,
            'data-testid': `desk-queue-${deskKey.toLowerCase()}-column-visibility`
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
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.requestId', 'Request ID')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('stepName') && (
                    <SortableTableHead field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.stepName', 'Ticket Title')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('requester') && (
                    <SortableTableHead field="requesterName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.requester', 'Requester')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('status') && (
                    <SortableTableHead field="status" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.status', 'Status')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('urgency') && (
                    <TableHead className="gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.urgency', 'Urgency')}
                    </TableHead>
                  )}
                  {visibleColumns.includes('slaDue') && (
                    <SortableTableHead field="slaDue" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange} className="gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.slaDue', 'SLA Due')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('assignee') && (
                    <SortableTableHead field="assignedToUserId" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.assignee', 'Assignee')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('updated') && (
                    <SortableTableHead field="updatedAt" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.updated', 'Updated')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('debug') && (
                    <TableHead className="gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.debug', 'Debug')}
                    </TableHead>
                  )}
                  {visibleColumns.includes('actions') && (
                    <TableHead className="gba:w-[180px] gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.actions', 'Actions')}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={visibleColumns.length} 
                      className="gba:text-center gba:py-8 gba:text-muted-foreground"
                    >
                      <div className="gba:mb-2">
                        {search.trim() ? 
                          getTranslationFromI18nKeyAndLabel('services.queue.searchEmpty', 'No tickets found matching your search') :
                          getTranslationFromI18nKeyAndLabel('services.queue.empty', 'No tickets found for this desk')
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id}
                      className="gba:border-b gba:hover:gba:bg-gray-50 gba:cursor-pointer gba:transition-colors"
                      onClick={() => handleViewTicket(ticket)}
                    >
                      {visibleColumns.includes('requestId') && (
                        <TableCell className="gba:align-top">
                          <code 
                            className="gba:text-sm gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded gba:text-muted-foreground"
                            data-testid={`request-id-${ticket.requestId}`}
                          >
                            {ticket.requestId ? formatRequestId(ticket.requestId) : 'N/A'}
                          </code>
                        </TableCell>
                      )}
                      {visibleColumns.includes('stepName') && (
                        <TableCell className="gba:align-top">
                          <div className="gba:max-w-xs">
                            <div 
                              className="gba:font-medium gba:text-sm gba:text-blue-600 hover:gba:text-blue-800 gba:cursor-pointer gba:hover:underline gba:break-words"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaskSelect?.(ticket.id, deskKey);
                              }}
                              data-testid={`step-name-${ticket.id}`}
                            >
                              {ticket.name}
                            </div>
                            <div className="gba:text-xs gba:text-muted-foreground gba:break-words gba:whitespace-normal">
                              {(ticket as any).message || `ID: ${ticket.id}`}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('requester') && (
                        <TableCell className="gba:align-top">
                          <EmployeeDisplayName
                            userId={ticket.flowInitiatedBy || ticket.requesterId || ''}
                            accessToken={accessToken}
                            showIcon={true}
                            fallback={ticket.requesterName || "Unknown User"}
                            testId={`requester-${ticket.id}`}
                            prefetchedDisplayName={batchedDisplayNames.get(ticket.flowInitiatedBy || ticket.requesterId || '')}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.includes('status') && (
                        <TableCell className="gba:align-top">
                          <Badge 
                            variant={getStatusVariant(ticket.status)}
                            data-testid={`status-badge-${ticket.status}`}
                            className="gba:text-xs"
                          >
                            {ticket.status}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes('urgency') && (
                        <TableCell className="gba:align-top">
                          {(() => {
                            const urgencyLevel = (ticket as any).urgency_level || 'medium';
                            const priorityOption = PRIORITY_OPTIONS.find(p => p.value === urgencyLevel);
                            const variant = urgencyLevel === 'critical' || urgencyLevel === 'high' ? 'destructive' : 
                                           urgencyLevel === 'medium' ? 'default' : 'secondary';
                            return (
                              <Badge 
                                variant={variant}
                                className="gba:text-xs"
                                data-testid={`urgency-${ticket.id}`}
                              >
                                {priorityOption?.label || urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.includes('slaDue') && (
                        <TableCell className="gba:align-top">
                          {(() => {
                            const dueDate = calculateSLADue(ticket);
                            if (!dueDate) {
                              return <span className="gba:text-muted-foreground gba:text-xs">-</span>;
                            }
                            
                            const slaStatus = getSLAStatus(dueDate);
                            const now = new Date();
                            const isOverdue = dueDate < now;
                            
                            return (
                              <div className="gba:flex gba:items-center gba:gap-2">
                                {isOverdue && <Warning className="gba:w-3 gba:h-3 gba:text-destructive" />}
                                {!isOverdue && slaStatus.status === 'warning' && <Clock className="gba:w-3 gba:h-3 gba:text-warning" />}
                                <div>
                                  <div className={`gba:text-xs ${slaStatus.status === 'overdue' ? 'gba:text-destructive' : slaStatus.status === 'warning' ? 'gba:text-warning' : 'gba:text-success'}`}>
                                    {dueDate.toLocaleDateString()}
                                  </div>
                                  <div className="gba:text-xs gba:text-muted-foreground">
                                    {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.includes('assignee') && (
                        <TableCell className="gba:align-top">
                          {ticket.assignedToUserId ? (
                            <EmployeeDisplayName
                              userId={ticket.assignedToUserId}
                              accessToken={accessToken}
                              showIcon={true}
                              fallback="Assigned User"
                              testId={`assigned-user-${ticket.id}`}
                              prefetchedDisplayName={batchedDisplayNames.get(ticket.assignedToUserId)}
                            />
                          ) : ticket.claimedByUserId ? (
                            <EmployeeDisplayName
                              userId={ticket.claimedByUserId}
                              accessToken={accessToken}
                              showIcon={true}
                              fallback="Claimed User"
                              testId={`claimed-user-${ticket.id}`}
                              prefetchedDisplayName={batchedDisplayNames.get(ticket.claimedByUserId)}
                            />
                          ) : (
                            <span className="gba:text-muted-foreground gba:text-sm">
                              {getTranslationFromI18nKeyAndLabel('services.queue.unassigned', 'Unassigned')}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes('updated') && (
                        <TableCell className="gba:align-top">
                          {(() => {
                            const date = ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(ticket.startedAt || Date.now());
                            return (
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <Calendar className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                                <div>
                                  <div className="gba:text-xs gba:text-foreground">
                                    {date.toLocaleDateString()}
                                  </div>
                                  <div className="gba:text-xs gba:text-muted-foreground">
                                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.includes('debug') && (
                        <TableCell className="gba:align-top" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDebugModal(ticket)}
                            data-testid={`debug-ticket-${ticket.id}`}
                            className="gba:gap-1 gba:text-xs"
                            title={getTranslationFromI18nKeyAndLabel('services.queue.actions.debug.tooltip', 'Show debug data from flow engine')}
                          >
                            <Bug className="gba:w-3 gba:h-3" />
                            <span className="gba:hidden md:gba:inline">
                              {getTranslationFromI18nKeyAndLabel('services.queue.actions.debug', 'Debug')}
                            </span>
                          </Button>
                        </TableCell>
                      )}
                      {visibleColumns.includes('actions') && (
                        <TableCell className="gba:align-top" onClick={(e) => e.stopPropagation()}>
                          <div className="gba:flex gba:gap-2 gba:flex-nowrap">
                            {(() => {
                              const canClaim = !ticket.claimedByUserId && currentUserId;
                              const canUnclaim = ticket.claimedByUserId === currentUserId;
                              const isOptimisticallyUpdating = !!optimisticUpdates[ticket.id];

                              return (
                                <>
                                  {canClaim && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleClaimTicket(ticket)}
                                      disabled={isPerformingAction && isOptimisticallyUpdating}
                                      data-testid={`claim-ticket-${ticket.id}`}
                                      className="gba:gap-1 gba:text-xs"
                                      title={getTranslationFromI18nKeyAndLabel('services.queue.actions.claim.tooltip', 'Claim this ticket')}
                                    >
                                      <UserPlus className="gba:w-3 gba:h-3" />
                                      {getTranslationFromI18nKeyAndLabel('services.queue.actions.claim', 'Claim')}
                                    </Button>
                                  )}

                                  {canUnclaim && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUnclaimTicket(ticket)}
                                      disabled={isPerformingAction && isOptimisticallyUpdating}
                                      data-testid={`unclaim-ticket-${ticket.id}`}
                                      className="gba:gap-1 gba:text-xs"
                                      title={getTranslationFromI18nKeyAndLabel('services.queue.actions.unclaim.tooltip', 'Unclaim this ticket')}
                                    >
                                      <UserMinus className="gba:w-3 gba:h-3" />
                                      {getTranslationFromI18nKeyAndLabel('services.queue.actions.unclaim', 'Unclaim')}
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    onClick={() => handleViewTicket(ticket)}
                                    data-testid={`view-ticket-${ticket.id}`}
                                    className="gba:gap-1 gba:text-xs"
                                    title={getTranslationFromI18nKeyAndLabel('services.queue.actions.view.tooltip', 'View ticket details')}
                                  >
                                    <Eye className="gba:w-3 gba:h-3" />
                                    {getTranslationFromI18nKeyAndLabel('services.queue.actions.view', 'View')}
                                  </Button>
                                </>
                              );
                            })()}
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


      {/* Ticket Detail Sheet */}
      <Sheet open={isDetailDrawerOpen} onOpenChange={handleCloseDetail}>
        <SheetContent 
          side="right" 
          className="gba:w-[800px] sm:gba:max-w-[800px]"
          data-testid="ticket-detail-sheet"
        >
          <SheetHeader>
            <SheetTitle>
              {getTranslationFromI18nKeyAndLabel('services.ticket.detail.title', 'Ticket Details')}
            </SheetTitle>
            <SheetDescription>
              View and manage ticket details and actions
            </SheetDescription>
          </SheetHeader>
          <div className="gba:mt-6">
            {selectedTicketId && (
              <TicketDetail
                ticketId={selectedTicketId}
                deskKey={deskKey}
                accessToken={accessToken}
                userInfo={userInfo}
                onTicketUpdate={refetch}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Debug Flow Modal - Development Tool */}
      <DebugFlowModal
        ticket={debugTicket}
        deskKey={deskKey}
        isOpen={isDebugModalOpen}
        onClose={handleCloseDebugModal}
        accessToken={accessToken}
        userInfo={userInfo}
      />
    </div>
  );
};
