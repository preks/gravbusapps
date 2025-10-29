/**
 * OutboxView Component
 * Displays outbox flows with search and filtering
 */

import React, { useState, useMemo } from 'react';
import { Input, Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system';
import { Search, RefreshCw } from 'lucide-react';
import { Flow } from '../types';
import { FlowCard } from './FlowCard';
import { FlowDetailDialog } from './FlowDetailDialog';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';
import { sortFlowsByDate, filterFlowsBySearch } from '../utils/taskGrouping';

interface OutboxViewProps {
  flows: Flow[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const OutboxView: React.FC<OutboxViewProps> = ({ flows, isLoading, error, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);

  // Filter and sort flows
  const filteredFlows = useMemo(() => {
    let result = flows;

    // Apply search filter
    if (searchQuery.trim()) {
      result = filterFlowsBySearch(result, searchQuery);
    }

    // Sort by date
    result = sortFlowsByDate(result);

    return result;
  }, [flows, searchQuery]);

  if (isLoading && flows.length === 0) {
    return <LoadingSkeleton count={5} type="flow" />;
  }

  return (
    <div className="gba:space-y-4" data-testid="outbox-view">
      {/* Search and Actions */}
      <div className="gba:flex gba:items-center gba:gap-4">
        <div className="gba:relative gba:flex-1">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="gba:pl-10"
            data-testid="outbox-search-input"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          data-testid="outbox-refresh-button"
        >
          <RefreshCw className={`gba:h-4 gba:w-4 ${isLoading ? 'gba:animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error Loading Flows</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Flow List */}
      {filteredFlows.length === 0 ? (
        <EmptyState
          type="outbox"
          message={
            searchQuery.trim()
              ? `No workflows found matching "${searchQuery}"`
              : 'You have not initiated any workflows yet'
          }
        />
      ) : (
        <div className="gba:space-y-3" data-testid="outbox-flow-list">
          {filteredFlows.map((flow) => (
            <FlowCard key={flow.id} flow={flow} onView={setSelectedFlow} />
          ))}
        </div>
      )}

      {/* Flow Detail Dialog */}
      <FlowDetailDialog
        flow={selectedFlow}
        open={!!selectedFlow}
        onClose={() => setSelectedFlow(null)}
      />
    </div>
  );
};

