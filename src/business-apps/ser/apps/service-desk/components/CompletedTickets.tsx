import React, { useState, useMemo } from 'react';
import { Calendar, Clock, CheckCircle, Search, XCircle, AlertCircle, PlayCircle, PauseCircle } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { StepStatus } from 'packages/services-plus-core';
import type { StepInstance } from '../../../types';
import { formatRequestId } from '../../../utils';
import { useCompletedTickets } from '../hooks/useCompletedTickets';
import { EmployeeDisplayName } from './EmployeeDisplayName';
import { useEmployeeNamesBatch } from '../../../hooks/useEmployeeNamesBatch';
import { CompletedTicketsKPICards } from './CompletedTicketsKPICards';

// Import nw-design-system components
import { 
  DataTable,
  DataTableDataSet,
  Button, 
  Badge,
  Card,
  CardContent,
  Alert,
  AlertDescription,
  Input
} from '@newwork/nw-design-system';
import { ColumnDef } from "@tanstack/react-table";

export interface CompletedTicketsProps extends BusinessAppContextProps {
  onTaskSelect?: (taskId: string, deskKey: string) => void;
}

export const CompletedTickets: React.FC<CompletedTicketsProps> = ({
  accessToken,
  userInfo,
  onTaskSelect,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 20;
  const offset = currentPage * pageSize;

  // Fetch completed tickets
  const { tickets, totalCount, isLoading, error, hasMore } = useCompletedTickets({
    accessToken,
    userInfo,
    limit: pageSize,
    offset,
  });

  // Extract all userIds from tickets for batch fetching
  const allUserIds = useMemo(() => {
    if (!tickets) return [];
    
    const userIds: string[] = [];
    for (const ticket of tickets) {
      const ticketAny = ticket as any;
      const completedBy = ticketAny.assignedTo || ticketAny.assignment?.assignedTo;
      if (completedBy) userIds.push(completedBy);
    }
    
    return userIds;
  }, [tickets]);

  // Batch fetch employee names for all users in the table
  const { displayNames: batchedDisplayNames, isLoading: isBatchLoading } = useEmployeeNamesBatch({
    userIds: allUserIds,
    accessToken,
    enabled: allUserIds.length > 0,
  });

  // Get status variant for badges with better color mapping
  const getStatusVariant = (status: StepStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'COMPLETED':
      case 'DONE':
        return 'default'; // Green/success color for completed
      case 'SKIPPED':
        return 'secondary'; // Gray for skipped
      case 'FAILED':
      case 'ERROR':
      case 'REJECTED':
      case 'CANCELLED':
      case 'CANCELED':
      case 'TIMED_OUT':
        return 'destructive'; // Red for errors/failures
      case 'IN_PROGRESS':
      case 'RUNNING':
        return 'outline'; // Blue outline for in progress
      case 'SCHEDULED':
      case 'OPEN':
      case 'QUEUED':
        return 'secondary'; // Gray for waiting states
      default: 
        return 'secondary';
    }
  };

  // Get status icon for visual distinction
  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'COMPLETED':
      case 'DONE':
        return <CheckCircle className="gba:w-3 gba:h-3" />;
      case 'FAILED':
      case 'ERROR':
      case 'REJECTED':
        return <XCircle className="gba:w-3 gba:h-3" />;
      case 'CANCELLED':
      case 'CANCELED':
      case 'TIMED_OUT':
        return <AlertCircle className="gba:w-3 gba:h-3" />;
      case 'IN_PROGRESS':
      case 'RUNNING':
        return <PlayCircle className="gba:w-3 gba:h-3" />;
      case 'SCHEDULED':
      case 'OPEN':
      case 'QUEUED':
      case 'SKIPPED':
        return <PauseCircle className="gba:w-3 gba:h-3" />;
      default:
        return <Clock className="gba:w-3 gba:h-3" />;
    }
  };


  // Enhanced table columns for completed tickets using DataTable format
  const columns: ColumnDef<StepInstance>[] = [
    {
      accessorKey: 'requestId',
      header: getTranslationFromI18nKeyAndLabel('services.completed.columns.requestId', 'Request ID'),
      cell: ({ row }) => {
        const ticket = row.original;
        const ticketAny = ticket as any;
        // Use the same logic as DeskQueue - check multiple possible sources for requestId
        const requestId = ticketAny.requestId || 
                         ticket.flowId || 
                         ticket.id;
        return (
          <code 
            className="gba:text-sm gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded gba:text-muted-foreground"
            data-testid={`request-id-${requestId}`}
          >
            {formatRequestId(requestId)}
          </code>
        );
      },
    },
    {
      accessorKey: 'title',
      header: getTranslationFromI18nKeyAndLabel('services.completed.columns.ticketTitle', 'Ticket Title'),
      cell: ({ getValue, row }) => {
        const title = getValue() as string;
        const record = row.original;
        const ticketAny = record as any;
        // Use the name field from StepInstance if title is not available
        const displayTitle = title || record.name || 'Untitled Task';
        
        return (
          <div>
            <div 
              className="gba:font-medium gba:text-sm gba:text-blue-600 hover:gba:text-blue-800 gba:cursor-pointer gba:hover:underline"
              onClick={() => onTaskSelect?.(record.id, ticketAny.desk || 'completed')}
              data-testid={`ticket-title-${record.id}`}
            >
              {displayTitle}
            </div>
            {ticketAny.message && (
              <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                {ticketAny.message}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: getTranslationFromI18nKeyAndLabel('services.completed.columns.status', 'Status'),
      cell: ({ getValue }) => {
        const status = getValue() as StepStatus;
        return (
          <Badge 
            variant={getStatusVariant(status)}
            data-testid={`status-badge-${status}`}
            className="gba:text-xs gba:flex gba:items-center gba:gap-1"
          >
            {getStatusIcon(status)}
            {status}
          </Badge>
        );
      },
    },
    {
      id: 'completedBy',
      header: getTranslationFromI18nKeyAndLabel('services.completed.columns.completedBy', 'Completed By'),
      cell: ({ row }) => {
        const record = row.original;
        const ticketAny = record as any;
        // Use assignedTo directly from the API response
        const completedBy = ticketAny.assignedTo || ticketAny.assignment?.assignedTo;
        if (completedBy) {
          return (
            <EmployeeDisplayName
              userId={completedBy}
              accessToken={accessToken}
              showIcon={true}
              fallback="Completed User"
              testId={`completed-by-${record.id}`}
              prefetchedDisplayName={batchedDisplayNames.get(completedBy)}
            />
          );
        }
        return (
          <span className="gba:text-muted-foreground gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('services.completed.unknown', 'Unknown')}
          </span>
        );
      },
    },
    {
      accessorKey: 'dueDate',
      header: getTranslationFromI18nKeyAndLabel('services.completed.columns.dueDate', 'Due Date'),
      cell: ({ getValue }) => {
        const dueDate = getValue() as string;
        if (!dueDate) return (
          <span className="gba:text-muted-foreground gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('services.completed.noDueDate', 'No due date')}
          </span>
        );
        
        const date = new Date(dueDate);
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
      id: 'urgency',
      header: getTranslationFromI18nKeyAndLabel('services.completed.columns.urgency', 'Urgency'),
      cell: ({ row }) => {
        const record = row.original;
        const ticketAny = record as any;
        const urgencyLevel = ticketAny.urgency_level;
        
        
        const getUrgencyVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
          switch (level?.toLowerCase()) {
            case 'high': return 'destructive';
            case 'medium': return 'default';
            case 'low': return 'secondary';
            default: return 'outline';
          }
        };

        return (
          <Badge 
            variant={getUrgencyVariant(urgencyLevel)}
            data-testid={`urgency-badge-${urgencyLevel || 'normal'}`}
            className="gba:text-xs gba:capitalize"
          >
            {urgencyLevel || 'Normal'}
          </Badge>
        );
      },
    },
  ];

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    
    if (!searchTerm.trim()) return tickets;
    
    const searchLower = searchTerm.toLowerCase();
    return tickets.filter((ticket) => {
      // Search in multiple fields - using type assertion for properties that might exist
      const ticketAny = ticket as any;
      const searchableFields = [
        ticket.id,
        ticket.name, // StepInstance has 'name' property
        ticketAny.title, // might exist from API response
        ticket.status,
        ticketAny.message, // might exist from API response
        ticketAny.urgency_level, // might exist from API response
        ticketAny.assignment?.assignedTo, // completed by user ID
      ];
      
      return searchableFields.some(field => 
        field && String(field).toLowerCase().includes(searchLower)
      );
    });
  }, [tickets, searchTerm]);

  // Create data set for DataTable
  const dataSets: DataTableDataSet[] = useMemo(() => [
    {
      id: 'completed-tickets',
      label: getTranslationFromI18nKeyAndLabel('services.completed.title', 'Completed Tickets'),
      data: filteredTickets,
      columns: columns,
    }
  ], [filteredTickets, columns]);

  // Handle pagination
  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (error) {
    return (
      <div data-testid="completed-tickets-error" className="gba:p-6">
        <Alert variant="destructive">
          <AlertDescription>
            {getTranslationFromI18nKeyAndLabel('services.completed.error', 'Failed to load completed tickets')}: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div data-testid="completed-tickets" className="gba:w-full gba:h-full gba:flex gba:flex-col gba:space-y-4">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('services.completed.title', 'Completed Tickets')}
          </h2>
          <p className="gba:text-gray-500 gba:text-sm">
            {getTranslationFromI18nKeyAndLabel(
              'services.completed.description',
              'View all tickets that have been completed'
            )}
          </p>
        </div>
        
        {totalCount > 0 && (
          <Badge 
            variant="default"
            className="gba:text-sm"
          >
            {totalCount} {getTranslationFromI18nKeyAndLabel('services.completed.total', 'Total')}
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <CompletedTicketsKPICards 
        tickets={filteredTickets}
        isLoading={isLoading}
      />

      {/* Search Box */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        <div className="gba:relative gba:flex-1 gba:max-w-sm">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel(
              'services.completed.search.placeholder',
              'Search tickets by ID, title, status, or urgency...'
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="gba:pl-10"
            data-testid="completed-tickets-search"
          />
        </div>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm('')}
            data-testid="clear-search"
          >
            {getTranslationFromI18nKeyAndLabel('services.completed.search.clear', 'Clear')}
          </Button>
        )}
      </div>

      {/* Search Results Indicator */}
      {searchTerm && (
        <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">
          {filteredTickets.length === 0 
            ? getTranslationFromI18nKeyAndLabel('services.completed.search.noResults', 'No tickets found matching your search')
            : getTranslationFromI18nKeyAndLabel(
                'services.completed.search.results', 
                `Found ${filteredTickets.length} ticket${filteredTickets.length !== 1 ? 's' : ''} matching "${searchTerm}"`
              )
          }
        </div>
      )}

      {/* Completed Tickets Table */}
      <div className="gba:w-full gba:flex-1 gba:flex gba:flex-col">
        {isLoading ? (
          <Card className="gba:overflow-hidden">
            <CardContent className="gba:p-8 gba:text-center">
              <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:text-muted-foreground">
                <Clock className="gba:w-4 gba:h-4 gba:animate-spin" />
                {getTranslationFromI18nKeyAndLabel('services.completed.loading', 'Loading completed tickets...')}
              </div>
            </CardContent>
          </Card>
        ) : filteredTickets.length === 0 ? (
          <Card className="gba:overflow-hidden">
            <CardContent className="gba:p-8 gba:text-center">
              <div className="gba:mb-2">
                <CheckCircle className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:text-muted-foreground/50" />
                <div className="gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'services.completed.empty',
                    'No completed tickets found'
                  )}
                </div>
              </div>
              <div className="gba:text-xs gba:text-muted-foreground/70">
                {getTranslationFromI18nKeyAndLabel(
                  'services.completed.emptyHint',
                  'Completed tickets will appear here once tasks are finished'
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden completed-tickets-datatable-container">
            <style>{`
              .completed-tickets-datatable-container .nw\\:max-h-\\[calc\\(100vh-300px\\)\\] {
                max-height: none !important;
                height: 100% !important;
              }
              .completed-tickets-datatable-container .nw\\:overflow-auto {
                overflow: visible !important;
              }
              .completed-tickets-datatable-container .nw\\:flex-col {
                height: 100% !important;
              }
            `}</style>
            <DataTable
              dataSets={dataSets}
              defaultDataSetId="completed-tickets"
            />
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="gba:flex gba:justify-between gba:items-center gba:mt-4">
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('services.completed.showing', 'Showing')} {offset + 1}-{Math.min(offset + pageSize, totalCount)} {getTranslationFromI18nKeyAndLabel('services.completed.of', 'of')} {totalCount}
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 0}
              data-testid="previous-page"
            >
              {getTranslationFromI18nKeyAndLabel('services.completed.previous', 'Previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasMore}
              data-testid="next-page"
            >
              {getTranslationFromI18nKeyAndLabel('services.completed.next', 'Next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
