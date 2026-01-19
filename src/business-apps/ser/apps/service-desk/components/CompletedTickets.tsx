import React, { useState, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useCompletedTickets } from '../hooks/useCompletedTickets';
import { CompletedTicketsKPICards } from './CompletedTicketsKPICards';
import { TicketTable, type FilterGroup, type TicketAction } from '../../../components/shared/TicketTable';
import type { ColumnConfig } from '@/components/dataController';

// Import nw-design-system components
import { 
  Button, 
  Badge,
  Alert,
  AlertDescription,
} from '@newwork/nw-design-system';

export interface CompletedTicketsProps extends BusinessAppContextProps {
  onTaskSelect?: (taskId: string, deskKey: string) => void;
}

export const CompletedTickets: React.FC<CompletedTicketsProps> = ({
  accessToken,
  userInfo,
  onTaskSelect,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;
  const offset = currentPage * pageSize;

  // Fetch completed tickets
  const { tickets, totalCount, isLoading, error, hasMore } = useCompletedTickets({
    accessToken,
    userInfo,
    limit: pageSize,
    offset,
  });

  // Custom columns for completed tickets
  const completedTicketsColumns: ColumnConfig[] = useMemo(() => [
    { id: "requestId", label: "Request ID", visible: true },
    { id: "stepName", label: "Ticket Title", visible: true },
    { id: "requester", label: "Requester", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "urgency", label: "Urgency", visible: true },
    { id: "assignee", label: "Completed By", visible: true }, // Renamed for completed tickets
    { id: "updated", label: "Completed At", visible: true }, // Renamed for completed tickets
    { id: "actions", label: "Actions", visible: true, disabled: true },
  ], []);

  // Custom filter groups for completed tickets (completed-specific statuses)
  const completedFilterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "status",
      title: "Status",
      filters: [
        { id: "status:COMPLETED", label: "Completed", value: "COMPLETED", selected: false },
        { id: "status:DONE", label: "Done", value: "DONE", selected: false },
        { id: "status:SKIPPED", label: "Skipped", value: "SKIPPED", selected: false },
        { id: "status:FAILED", label: "Failed", value: "FAILED", selected: false },
        { id: "status:REJECTED", label: "Rejected", value: "REJECTED", selected: false },
        { id: "status:CANCELLED", label: "Cancelled", value: "CANCELLED", selected: false },
        { id: "status:CANCELED", label: "Canceled", value: "CANCELED", selected: false },
        { id: "status:TIMED_OUT", label: "Timed Out", value: "TIMED_OUT", selected: false },
      ],
    },
    {
      id: "urgency",
      title: "Urgency",
      filters: [
        { id: "urgency:HIGH", label: "High", value: "HIGH", selected: false },
        { id: "urgency:MEDIUM", label: "Medium", value: "MEDIUM", selected: false },
        { id: "urgency:LOW", label: "Low", value: "LOW", selected: false },
      ],
    },
  ], []);

  // Actions for completed tickets (only view)
  const completedTicketActions: TicketAction[] = useMemo(() => [
    {
      type: 'view',
      label: getTranslationFromI18nKeyAndLabel('services.completed.actions.view', 'View'),
      icon: <Eye className="gba:w-3 gba:h-3" />,
      onClick: (ticket) => onTaskSelect?.(ticket.id, 'completed'),
      show: () => true,
      title: getTranslationFromI18nKeyAndLabel('services.completed.actions.view.tooltip', 'View ticket details')
    }
  ], [onTaskSelect]);

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
        tickets={tickets || []}
        isLoading={isLoading}
      />

      {/* Advanced Ticket Table */}
      <div className="gba:w-full gba:flex-1 gba:flex gba:flex-col">
        <TicketTable
          // Data
          tickets={tickets || []}
          isLoading={isLoading}
          
          // Configuration
          tableId="completedTickets"
          
          // Customization
          customColumns={completedTicketsColumns}
          filterGroups={completedFilterGroups}
          actions={completedTicketActions}
          
          // Callbacks
          onTicketSelect={(ticket) => onTaskSelect?.(ticket.id, 'completed')}
          
          // Display options
          showDebug={false}
          emptyMessage={getTranslationFromI18nKeyAndLabel('services.completed.empty', 'No completed tickets found')}
          emptySearchMessage={getTranslationFromI18nKeyAndLabel('services.completed.searchEmpty', 'No tickets found matching your search')}
          
          // Context
          accessToken={accessToken}
          userInfo={userInfo}
        />
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

