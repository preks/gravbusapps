import React, { useState, useEffect, useMemo } from 'react';
import { Eye, User, MagnifyingGlass, Funnel, Calendar, Clock, Warning, UserPlus, UserMinus } from '@phosphor-icons/react';
import { Bug } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { StepReceiver, StepInstance, TicketStatus, StepStatus } from 'packages/services-plus-core';
import { formatRequestId } from '../../../utils'; // ✨ Import formatRequestId utility
import { TicketDetail } from './TicketDetail';
import { DebugFlowModal } from './DebugFlowModal';
import { useDeskTickets } from '../hooks/useDeskTickets';
import { useTicketActions } from '../hooks/useTicketActions';
import { EmployeeDisplayName } from './EmployeeDisplayName';
// Note: DebouncedInput would be preferred but using Input with onChange for now

// UI Components - TODO: Replace with @newwork/nw-design-system when available
import { Table, Button, Tag, Drawer, Select, Input, Card, Space, Typography, Badge, message } from 'antd';

const { Option } = Select;
const { Text } = Typography;

export interface DeskQueueProps extends BusinessAppContextProps {
  deskKey: StepReceiver;
  ticketId?: string;
}

// Priority options for stub implementation
const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: '#ff4d4f' },
  { value: 'high', label: 'High', color: '#ff7a45' },
  { value: 'medium', label: 'Medium', color: '#faad14' },
  { value: 'low', label: 'Low', color: '#52c41a' },
];

// Get random priority for stub
const getRandomPriority = () => {
  const priorities = ['critical', 'high', 'medium', 'low'];
  return priorities[Math.floor(Math.random() * priorities.length)];
};

// Calculate SLA due date based on ticket data
const calculateSLADue = (ticket: StepInstance): Date | null => {
  if (!ticket.startedAt) return null;
  
  // Default SLA hours based on priority (stub logic)
  const slaHours = {
    critical: 4,
    high: 8,
    medium: 24,
    low: 72
  };
  
  const priority = getRandomPriority();
  const hours = slaHours[priority as keyof typeof slaHours] || 24;
  
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
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(ticketId || null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(!!ticketId);

  // Debug modal state for development
  const [debugTicket, setDebugTicket] = useState<StepInstance | null>(null);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState<boolean>(false);

  // Filter and search state
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
        requesterName: ticket.requesterName,
        hasRequesterName: !!(ticket.requesterName && ticket.requesterName.trim().length > 0)
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
      message.error(getTranslationFromI18nKeyAndLabel('services.error.noUser', 'User information not available'));
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

    const loadingMessage = message.loading(
      getTranslationFromI18nKeyAndLabel('services.queue.claiming', 'Claiming ticket...'), 
      0
    );

    try {
      await claimTicket(ticket.id);
      message.success(getTranslationFromI18nKeyAndLabel('services.queue.claimed.success', 'Ticket claimed successfully'));
    } catch (err) {
      // Remove optimistic update on error
      setOptimisticUpdates(prev => {
        const { [ticket.id]: removed, ...rest } = prev;
        return rest;
      });
      message.error(getTranslationFromI18nKeyAndLabel('services.queue.claimed.error', 'Failed to claim ticket'));
    } finally {
      loadingMessage();
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

    const loadingMessage = message.loading(
      getTranslationFromI18nKeyAndLabel('services.queue.unclaiming', 'Unclaiming ticket...'), 
      0
    );

    try {
      // Use assign with empty string to simulate unclaim
      await assignTicket(ticket.id, '');
      message.success(getTranslationFromI18nKeyAndLabel('services.queue.unclaimed.success', 'Ticket unclaimed successfully'));
    } catch (err) {
      // Remove optimistic update on error
      setOptimisticUpdates(prev => {
        const { [ticket.id]: removed, ...rest } = prev;
        return rest;
      });
      message.error(getTranslationFromI18nKeyAndLabel('services.queue.unclaimed.error', 'Failed to unclaim ticket'));
    } finally {
      loadingMessage();
    }
  };

  // Update drawer state when ticketId prop changes
  useEffect(() => {
    if (ticketId) {
      setSelectedTicketId(ticketId);
      setIsDetailDrawerOpen(true);
    }
  }, [ticketId]);

  // Filter and search tickets
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];

    // Apply optimistic updates to tickets
    const ticketsWithOptimisticUpdates = tickets.map(ticket => ({
      ...ticket,
      ...optimisticUpdates[ticket.id]
    }));

    return ticketsWithOptimisticUpdates.filter(ticket => {
      // Status filter
      if (statusFilter !== 'all' && ticket.status !== statusFilter) {
        return false;
      }

      // Assignee filter
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned' && (ticket.assignedToUserId || ticket.claimedByUserId)) {
          return false;
        }
        if (assigneeFilter === 'assigned' && !ticket.assignedToUserId && !ticket.claimedByUserId) {
          return false;
        }
        if (assigneeFilter !== 'unassigned' && assigneeFilter !== 'assigned') {
          if (ticket.assignedToUserId !== assigneeFilter && ticket.claimedByUserId !== assigneeFilter) {
            return false;
          }
        }
      }

      // Search filter (requestId, formatted requestId, requester, or step name)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesRequestId = ticket.requestId?.toLowerCase().includes(searchLower);
        const matchesFormattedRequestId = ticket.requestId ? formatRequestId(ticket.requestId).toLowerCase().includes(searchLower) : false;
        const matchesRequester = ticket.requesterId?.toLowerCase().includes(searchLower);
        const matchesStepName = ticket.name?.toLowerCase().includes(searchLower);
        
        if (!matchesRequestId && !matchesFormattedRequestId && !matchesRequester && !matchesStepName) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, statusFilter, assigneeFilter, searchTerm, optimisticUpdates]);

  // Get unique assignees for filter dropdown
  const uniqueAssignees = useMemo(() => {
    if (!tickets) return [];
    const assignees = new Set<string>();
    tickets.forEach(ticket => {
      if (ticket.assignedToUserId) assignees.add(ticket.assignedToUserId);
      if (ticket.claimedByUserId) assignees.add(ticket.claimedByUserId);
    });
    return Array.from(assignees);
  }, [tickets]);

  // Handle ticket selection
  const handleViewTicket = (ticket: StepInstance) => {
    setSelectedTicketId(ticket.id);
    setIsDetailDrawerOpen(true);
    
    // Update URL to reflect ticket detail view
    const newPath = `/desk/${deskKey}/tickets/${ticket.id}`;
    window.history.pushState({}, '', newPath);
  };

  // Handle sheet close
  const handleCloseDetail = () => {
    setIsDetailDrawerOpen(false);
    setSelectedTicketId(null);
    
    // Update URL to go back to queue
    const newPath = `/desk/${deskKey}`;
    window.history.pushState({}, '', newPath);
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

  // Get status color for badges/tags
  const getStatusColor = (status: TicketStatus): string => {
    switch (status) {
      case 'queued': return 'blue';
      case 'claimed': return 'orange';
      case 'in_progress': return 'processing';
      case 'waiting': return 'yellow';
      case 'done': return 'green';
      case 'canceled': return 'red';
      default: return 'default';
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
        <Text 
          code 
          className="gba:text-sm"
          data-testid={`request-id-${requestId}`}
        >
          {requestId ? formatRequestId(requestId) : 'N/A'}
        </Text>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.stepName', 'Step Name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: StepInstance) => (
        <div>
          <div className="gba:font-medium gba:text-sm">{name}</div>
          <div className="gba:text-xs gba:text-gray-500">
            ID: {record.id}
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
        return (
          <EmployeeDisplayName
            userId={requesterId}
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
      render: (status: TicketStatus) => (
        <Tag 
          color={getStatusColor(status)} 
          data-testid={`status-tag-${status}`}
          className="gba:rounded-md gba:text-xs"
        >
          {getTranslationFromI18nKeyAndLabel(
            `services.status.${status}`,
            status.replace('_', ' ').toUpperCase()
          )}
        </Tag>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('services.queue.columns.priority', 'Priority'),
      key: 'priority',
      width: 90,
      render: (_: unknown, record: StepInstance) => {
        const priority = getRandomPriority();
        const priorityOption = PRIORITY_OPTIONS.find(p => p.value === priority);
        return (
          <Badge 
            color={priorityOption?.color}
            text={priorityOption?.label}
            className="gba:text-xs"
            data-testid={`priority-${record.id}`}
          />
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
          return <Text className="gba:text-gray-400 gba:text-xs">-</Text>;
        }
        
        const slaStatus = getSLAStatus(dueDate);
        const now = new Date();
        const isOverdue = dueDate < now;
        
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            {isOverdue && <Warning className="gba:w-3 gba:h-3 gba:text-red-500" />}
            {!isOverdue && slaStatus.status === 'warning' && <Clock className="gba:w-3 gba:h-3 gba:text-yellow-500" />}
            <div>
              <div className="gba:text-xs" style={{ color: slaStatus.color }}>
                {dueDate.toLocaleDateString()}
              </div>
              <div className="gba:text-xs gba:text-gray-400">
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
          <Text className="gba:text-gray-400 gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('services.queue.unassigned', 'Unassigned')}
          </Text>
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
            <Calendar className="gba:w-3 gba:h-3 gba:text-gray-400" />
            <div>
              <div className="gba:text-xs gba:text-gray-600">
                {date.toLocaleDateString()}
              </div>
              <div className="gba:text-xs gba:text-gray-400">
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
            type="default"
            size="small"
            icon={<Bug className="gba:w-3 gba:h-3" />}
            onClick={() => handleOpenDebugModal(record)}
            data-testid={`debug-ticket-${record.id}`}
            className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:border-purple-300 gba:text-purple-600 hover:gba:border-purple-500 hover:gba:text-purple-700"
            title={getTranslationFromI18nKeyAndLabel('services.queue.actions.debug.tooltip', 'Show debug data from flow engine')}
          >
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
          <Space size="small" className="gba:flex gba:flex-nowrap">
            {/* Claim Button */}
            {canClaim && (
              <Button
                type="default"
                size="small"
                icon={<UserPlus className="gba:w-3 gba:h-3" />}
                onClick={() => handleClaimTicket(record)}
                loading={isPerformingAction && isOptimisticallyUpdating}
                disabled={isPerformingAction}
                data-testid={`claim-ticket-${record.id}`}
                className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:border-blue-300 gba:text-blue-600 hover:gba:border-blue-500 hover:gba:text-blue-700"
                title={getTranslationFromI18nKeyAndLabel('services.queue.actions.claim.tooltip', 'Claim this ticket')}
              >
                {getTranslationFromI18nKeyAndLabel('services.queue.actions.claim', 'Claim')}
              </Button>
            )}

            {/* Unclaim Button */}
            {canUnclaim && (
              <Button
                type="default"
                size="small"
                icon={<UserMinus className="gba:w-3 gba:h-3" />}
                onClick={() => handleUnclaimTicket(record)}
                loading={isPerformingAction && isOptimisticallyUpdating}
                disabled={isPerformingAction}
                data-testid={`unclaim-ticket-${record.id}`}
                className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:border-orange-300 gba:text-orange-600 hover:gba:border-orange-500 hover:gba:text-orange-700"
                title={getTranslationFromI18nKeyAndLabel('services.queue.actions.unclaim.tooltip', 'Unclaim this ticket')}
              >
                {getTranslationFromI18nKeyAndLabel('services.queue.actions.unclaim', 'Unclaim')}
              </Button>
            )}

            {/* View Button - always show */}
            <Button
              type="primary"
              size="small"
              icon={<Eye className="gba:w-3 gba:h-3" />}
              onClick={() => handleViewTicket(record)}
              data-testid={`view-ticket-${record.id}`}
              className="gba:flex gba:items-center gba:gap-1 gba:text-xs"
              title={getTranslationFromI18nKeyAndLabel('services.queue.actions.view.tooltip', 'View ticket details')}
            >
              {getTranslationFromI18nKeyAndLabel('services.queue.actions.view', 'View')}
            </Button>
          </Space>
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
            count={filteredTickets.length} 
            showZero 
            style={{ backgroundColor: '#1890ff' }}
            className="gba:text-sm"
          />
        )}
      </div>

      {/* Filters and Search */}
      <Card className="gba:mb-4" size="small">
        <div className="gba:flex gba:flex-wrap gba:gap-4 gba:items-center">
          {/* Search */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-64">
            <MagnifyingGlass className="gba:w-4 gba:h-4 gba:text-gray-400" />
            <Input
              placeholder={getTranslationFromI18nKeyAndLabel(
                'services.queue.search.placeholder',
                'Search by Request ID, Requester, or Step Name...'
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="gba:flex-1"
              size="small"
              allowClear
            />
          </div>

          {/* Status Filter */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <Funnel className="gba:w-4 gba:h-4 gba:text-gray-400" />
            <Text className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('services.queue.filters.status', 'Status:')}
            </Text>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              size="small"
              className="gba:min-w-32"
              data-testid="status-filter"
            >
              <Option value="all">
                {getTranslationFromI18nKeyAndLabel('services.queue.filters.all', 'All')}
              </Option>
              <Option value="queued">
                {getTranslationFromI18nKeyAndLabel('services.status.queued', 'Queued')}
              </Option>
              <Option value="claimed">
                {getTranslationFromI18nKeyAndLabel('services.status.claimed', 'Claimed')}
              </Option>
              <Option value="in_progress">
                {getTranslationFromI18nKeyAndLabel('services.status.in_progress', 'In Progress')}
              </Option>
              <Option value="waiting">
                {getTranslationFromI18nKeyAndLabel('services.status.waiting', 'Waiting')}
              </Option>
              <Option value="done">
                {getTranslationFromI18nKeyAndLabel('services.status.done', 'Done')}
              </Option>
              <Option value="canceled">
                {getTranslationFromI18nKeyAndLabel('services.status.canceled', 'Canceled')}
              </Option>
            </Select>
          </div>

          {/* Assignee Filter */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <User className="gba:w-4 gba:h-4 gba:text-gray-400" />
            <Text className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('services.queue.filters.assignee', 'Assignee:')}
            </Text>
            <Select
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              size="small"
              className="gba:min-w-32"
              data-testid="assignee-filter"
            >
              <Option value="all">
                {getTranslationFromI18nKeyAndLabel('services.queue.filters.all', 'All')}
              </Option>
              <Option value="unassigned">
                {getTranslationFromI18nKeyAndLabel('services.queue.filters.unassigned', 'Unassigned')}
              </Option>
              <Option value="assigned">
                {getTranslationFromI18nKeyAndLabel('services.queue.filters.assigned', 'Assigned')}
              </Option>
              {uniqueAssignees.map(assignee => (
                <Option key={assignee} value={assignee}>
                  {assignee}
                </Option>
              ))}
            </Select>
          </div>

          {/* Results Count */}
          <div className="gba:ml-auto">
            <Text className="gba:text-sm gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel(
                'services.queue.results',
                `${filteredTickets.length} of ${tickets?.length || 0} tickets`
              )}
            </Text>
          </div>
        </div>
      </Card>

      {/* Enhanced Table */}
      <Card className="gba:overflow-hidden">
        <Table
          columns={columns}
          dataSource={filteredTickets}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              getTranslationFromI18nKeyAndLabel(
                'services.queue.pagination',
                `${range[0]}-${range[1]} of ${total} tickets`
              ),
          }}
          data-testid={`tickets-table-${deskKey.toLowerCase()}`}
          className="gba:w-full"
          size="small"
          locale={{
            emptyText: (
              <div className="gba:text-center gba:py-8 gba:text-gray-500">
                <div className="gba:mb-2">
                  {searchTerm || statusFilter !== 'all' || assigneeFilter !== 'all' ? (
                    <div>
                      <div className="gba:mb-2">
                        {getTranslationFromI18nKeyAndLabel(
                          'services.queue.noResults',
                          'No tickets match your filters'
                        )}
                      </div>
                      <Button 
                        size="small"
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('all');
                          setAssigneeFilter('all');
                        }}
                      >
                        {getTranslationFromI18nKeyAndLabel('services.queue.clearFilters', 'Clear Filters')}
                      </Button>
                    </div>
                  ) : (
                    getTranslationFromI18nKeyAndLabel(
                      'services.queue.empty',
                      'No tickets found for this desk'
                    )
                  )}
                </div>
              </div>
            ),
          }}
        />
      </Card>

      {/* Ticket Detail Drawer */}
      <Drawer
        title={getTranslationFromI18nKeyAndLabel('services.ticket.detail.title', 'Ticket Details')}
        open={isDetailDrawerOpen}
        onClose={handleCloseDetail}
        width={800}
        data-testid="ticket-detail-drawer"
        className="gba:rounded-l-lg"
        styles={{
          header: {
            borderBottom: '1px solid #f0f0f0',
            padding: '16px 24px',
          },
          body: {
            padding: '24px',
          },
        }}
      >
        {selectedTicketId && (
          <TicketDetail
            ticketId={selectedTicketId}
            deskKey={deskKey}
            accessToken={accessToken}
            userInfo={userInfo}
            onTicketUpdate={refetch}
          />
        )}
      </Drawer>

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
