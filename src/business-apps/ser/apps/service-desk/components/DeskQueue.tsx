import React, { useState, useEffect, useMemo } from 'react';
import { Eye, User, MagnifyingGlass, Funnel, Calendar, Clock, Warning, UserPlus, UserMinus } from '@phosphor-icons/react';
import { Bug } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { StepReceiver, TicketStatus, StepStatus } from 'packages/services-plus-core';
import type { StepInstance } from '../../../types';
import { formatRequestId } from '../../../utils'; // ✨ Import formatRequestId utility
import { TicketDetail } from './TicketDetail';
import { DebugFlowModal } from './DebugFlowModal';
import { useDeskTickets } from '../hooks/useDeskTickets';
import { useTicketActions } from '../hooks/useTicketActions';
import { EmployeeDisplayName } from './EmployeeDisplayName';
// Note: DebouncedInput would be preferred but using Input with onChange for now

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
  SheetTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system';

export interface DeskQueueProps extends BusinessAppContextProps {
  deskKey: StepReceiver;
  ticketId?: string;
  onTaskSelect?: (taskId: string, deskKey: string) => void;
}

// Priority options for stub implementation
const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: '#ff4d4f' },
  { value: 'high', label: 'High', color: '#ff7a45' },
  { value: 'medium', label: 'Medium', color: '#faad14' },
  { value: 'low', label: 'Low', color: '#52c41a' },
];

// Priority options remain for mapping urgency levels to display labels

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

  // UI FILTERING DISABLED - Filter state variables removed
  // All filtering now happens at the backend level only

  // Fetch tickets for this desk
  const { tickets, isLoading, refetch } = useDeskTickets({
    deskKey,
    accessToken,
    userInfo,
  });

  // Debug: Log tickets data whenever it changes
  useEffect(() => {
    console.log(`[ConductorAdapterRequester] 🔍 Received ${tickets?.length || 0} tickets for desk ${deskKey}:`);
    
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
  }, [tickets, deskKey]);

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

  // Optimistic updates state
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Partial<StepInstance>>>({});

  const currentUserId = userInfo?.employeeDetails?.employeeId;


  // Handle claim ticket with optimistic update
  const handleClaimTicket = async (ticket: StepInstance) => {
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
  };

  // Handle unclaim ticket (assign to null)
  const handleUnclaimTicket = async (ticket: StepInstance) => {
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
  };

  // Update drawer state when ticketId prop changes
  useEffect(() => {
    if (ticketId) {
      setSelectedTicketId(ticketId);
      setIsDetailDrawerOpen(true);
    }
  }, [ticketId]);

  // Filter and search tickets - UI FILTERING DISABLED
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];

    // Apply optimistic updates to tickets
    const ticketsWithOptimisticUpdates = tickets.map(ticket => ({
      ...ticket,
      ...optimisticUpdates[ticket.id]
    }));

    // UI FILTERING DISABLED - Return all tickets without filtering
    console.log(`[DeskQueue] UI filtering disabled - showing all ${ticketsWithOptimisticUpdates.length} tickets for desk: ${deskKey}`);
    return ticketsWithOptimisticUpdates;

    // DISABLED FILTERS:
    // - Status filter (statusFilter)
    // - Assignee filter (assigneeFilter) 
    // - Search filter (searchTerm)
    // All filtering now happens at the backend level only
  }, [tickets, optimisticUpdates, deskKey]);

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

  // Handle debug modal open
  const handleOpenDebugModal = (ticket: StepInstance) => {
    setDebugTicket(ticket);
    setIsDebugModalOpen(true);
    console.log(`[DeskQueue] 🔍 Opening debug modal for ticket: ${ticket.id}`);
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

  // Enhanced table columns with all requested fields
  const columns = [
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.requestId', 'Request ID'),
      dataIndex: 'requestId',
      key: 'requestId',
      width: 120,
      render: (requestId: string) => (
        <code 
          className="gba:text-sm gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded gba:text-muted-foreground"
          data-testid={`request-id-${requestId}`}
        >
          {requestId ? formatRequestId(requestId) : 'N/A'}
        </code>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.stepName', 'Ticket Title'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: StepInstance) => (
        <div className="gba:max-w-xs">
          <div 
            className="gba:font-medium gba:text-sm gba:text-blue-600 hover:gba:text-blue-800 gba:cursor-pointer gba:hover:underline gba:break-words"
            onClick={() => onTaskSelect?.(record.id, deskKey)}
            data-testid={`step-name-${record.id}`}
          >
            {name}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground gba:break-words gba:whitespace-normal">
            {(record as any).message || `ID: ${record.id}`}
          </div>
        </div>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.requester', 'Requester'),
      dataIndex: 'requesterId',
      key: 'requesterId',
      width: 120,
      render: (requesterId: string, record: StepInstance) => {
        // Use EmployeeDisplayName to get user names from Employee table
        // Prefer flowInitiatedBy over requesterId for more accurate requester identification
        const userId = record.flowInitiatedBy || requesterId;
        return (
          <EmployeeDisplayName
            userId={userId}
            accessToken={accessToken}
            showIcon={true}
            fallback={record.requesterName || "Unknown User"}
            testId={`requester-${record.id}`}
          />
        );
      },
    },
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.status', 'Status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: StepStatus) => (
        <Badge 
          variant={getStatusVariant(status)}
          data-testid={`status-badge-${status}`}
          className="gba:text-xs"
        >
          {status}
        </Badge>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.urgency', 'Urgency'),
      key: 'urgency',
      width: 90,
      render: (_: unknown, record: StepInstance) => {
        // Use actual urgency_level from API response instead of random generation
        const urgencyLevel = (record as any).urgency_level || 'medium'; // Default to medium if not provided
        const priorityOption = PRIORITY_OPTIONS.find(p => p.value === urgencyLevel);
        const variant = urgencyLevel === 'critical' || urgencyLevel === 'high' ? 'destructive' : 
                       urgencyLevel === 'medium' ? 'default' : 'secondary';
        return (
          <Badge 
            variant={variant}
            className="gba:text-xs"
            data-testid={`urgency-${record.id}`}
          >
            {priorityOption?.label || urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)}
          </Badge>
        );
      },
    },
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.slaDue', 'SLA Due'),
      key: 'slaDue',
      width: 140,
      render: (_: unknown, record: StepInstance) => {
        const dueDate = calculateSLADue(record);
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
                {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.assignee', 'Assignee'),
      dataIndex: 'assignedToUserId',
      key: 'assignedToUserId',
      width: 120,
      render: (assignedToUserId: string | undefined, record: StepInstance) => {
        if (assignedToUserId) {
          return (
            <EmployeeDisplayName
              userId={assignedToUserId}
              accessToken={accessToken}
              showIcon={true}
              fallback="Assigned User"
              testId={`assigned-user-${record.id}`}
            />
          );
        }
        if (record.claimedByUserId) {
          return (
            <EmployeeDisplayName
              userId={record.claimedByUserId}
              accessToken={accessToken}
              showIcon={true}
              fallback="Claimed User"
              testId={`claimed-user-${record.id}`}
            />
          );
        }
        return (
          <span className="gba:text-muted-foreground gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('services.queue.unassigned', 'Unassigned')}
          </span>
        );
      },
    },
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.updated', 'Updated'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      render: (updatedAt: string | undefined, record: StepInstance) => {
        const date = updatedAt ? new Date(updatedAt) : new Date(record.startedAt || Date.now());
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
            <div>
              <div className="gba:text-xs gba:text-foreground">
                {date.toLocaleDateString()}
              </div>
              <div className="gba:text-xs gba:text-muted-foreground">
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.debug', 'Debug'),
      key: 'debug',
      width: 80,
      render: (_: unknown, record: StepInstance) => {
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenDebugModal(record)}
            data-testid={`debug-ticket-${record.id}`}
            className="gba:gap-1 gba:text-xs"
            title={getTranslationFromI18nKeyAndLabel('services.queue.actions.debug.tooltip', 'Show debug data from flow engine')}
          >
            <Bug className="gba:w-3 gba:h-3" />
            <span className="gba:hidden md:gba:inline">
              {getTranslationFromI18nKeyAndLabel('services.queue.actions.debug', 'Debug')}
            </span>
          </Button>
        );
      },
    },
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.actions', 'Actions'),
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (_: unknown, record: StepInstance) => {
        // Allow everyone to claim any unclaimed ticket (regardless of status)
        const canClaim = !record.claimedByUserId && currentUserId;
        // Only allow the original claimer to unclaim
        const canUnclaim = record.claimedByUserId === currentUserId;
        const isOptimisticallyUpdating = !!optimisticUpdates[record.id];

        // Debug: Log button visibility
        console.log(`🔍 [DeskQueue] Buttons for ticket ${record.id}:`, {
          status: record.status,
          claimedByUserId: record.claimedByUserId,
          currentUserId: currentUserId,
          canClaim: canClaim,
          canUnclaim: canUnclaim,
          'not claimed?': !record.claimedByUserId,
          'has currentUser?': !!currentUserId,
          'claimed by me?': record.claimedByUserId === currentUserId
        });

        return (
          <div className="gba:flex gba:gap-2 gba:flex-nowrap">
            {/* Claim Button */}
            {canClaim && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClaimTicket(record)}
                disabled={isPerformingAction && isOptimisticallyUpdating}
                data-testid={`claim-ticket-${record.id}`}
                className="gba:gap-1 gba:text-xs"
                title={getTranslationFromI18nKeyAndLabel('services.queue.actions.claim.tooltip', 'Claim this ticket')}
              >
                <UserPlus className="gba:w-3 gba:h-3" />
                {getTranslationFromI18nKeyAndLabel('services.queue.actions.claim', 'Claim')}
              </Button>
            )}

            {/* Unclaim Button */}
            {canUnclaim && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUnclaimTicket(record)}
                disabled={isPerformingAction && isOptimisticallyUpdating}
                data-testid={`unclaim-ticket-${record.id}`}
                className="gba:gap-1 gba:text-xs"
                title={getTranslationFromI18nKeyAndLabel('services.queue.actions.unclaim.tooltip', 'Unclaim this ticket')}
              >
                <UserMinus className="gba:w-3 gba:h-3" />
                {getTranslationFromI18nKeyAndLabel('services.queue.actions.unclaim', 'Unclaim')}
              </Button>
            )}

            {/* View Button - always show */}
            <Button
              size="sm"
              onClick={() => handleViewTicket(record)}
              data-testid={`view-ticket-${record.id}`}
              className="gba:gap-1 gba:text-xs"
              title={getTranslationFromI18nKeyAndLabel('services.queue.actions.view.tooltip', 'View ticket details')}
            >
              <Eye className="gba:w-3 gba:h-3" />
              {getTranslationFromI18nKeyAndLabel('services.queue.actions.view', 'View')}
            </Button>
          </div>
        );
      },
    },
  ];



  return (
    <div data-testid={`desk-queue-${deskKey.toLowerCase()}`} className="gba:w-full gba:space-y-4">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:mb-1">
            {getTranslationFromI18nKeyAndLabel(
              `services.desk.${deskKey.toLowerCase()}.queue.title`,
              `${deskKey} Queue`
            )}
          </h2>
          <p className="gba:text-gray-500 gba:text-sm">
            {getTranslationFromI18nKeyAndLabel(
              'services.queue.description',
              'Manage tickets and service requests for your desk'
            )}
          </p>
        </div>
        
        {tickets && tickets.length > 0 && (
          <Badge 
            variant="default"
            className="gba:text-sm"
          >
            {filteredTickets.length}
          </Badge>
        )}
      </div>

      {/* UI FILTERING DISABLED - Filter controls hidden */}
      {/* 
      Filters and Search controls have been hidden since UI filtering is disabled.
      All filtering now happens at the backend level only:
      - Desk filtering by task assignment targets
      - Orphaned task removal  
      - User access control by capabilities
      */}

      {/* Enhanced Table */}
      <Card className="gba:overflow-hidden">
        <CardContent className="gba:p-0">
          <div className="gba:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.key} className="gba:whitespace-nowrap">
                      {column.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={columns.length} 
                      className="gba:text-center gba:py-8 gba:text-muted-foreground"
                    >
                      <div className="gba:mb-2">
                        {getTranslationFromI18nKeyAndLabel(
                          'services.queue.empty',
                          'No tickets found for this desk'
                        )}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground/70">
                        {getTranslationFromI18nKeyAndLabel(
                          'services.queue.emptyHint',
                          'Tasks are filtered at the backend level by assignment targets and workflow validation'
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      {columns.map((column) => (
                        <TableCell key={column.key} className="gba:align-top">
                          {column.render ? column.render(column.dataIndex ? ticket[column.dataIndex as keyof StepInstance] as any : undefined, ticket) : (column.dataIndex ? String(ticket[column.dataIndex as keyof StepInstance] || '') : '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
