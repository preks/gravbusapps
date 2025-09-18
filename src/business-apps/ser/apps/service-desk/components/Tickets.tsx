import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { Tabs, Badge } from 'antd';
import { DeskQueue } from './DeskQueue';
import { CompletedTickets } from './CompletedTickets';
import { useUserCapabilities } from '../hooks/useUserCapabilities';
import { useCompletedTickets } from '../hooks/useCompletedTickets';
import { useServiceDeskCatalog } from '../hooks/useServiceDeskCatalog';
import { useDeskTickets } from '../hooks/useDeskTickets';
import type { StepReceiver } from 'packages/services-plus-core';

/**
 * Tickets component for managing service requests across different desks
 * Provides tabs for each desk the user is entitled to based on capabilities
 */
export interface TicketsProps extends BusinessAppContextProps {
  deskKey?: StepReceiver | string;
  ticketId?: string;
  onTaskSelect?: (taskId: string, deskKey: string) => void;
  onTabChange?: (tabKey: string) => void;
}

export const Tickets: React.FC<TicketsProps> = ({
  accessToken,
  userInfo,
  deskKey,
  ticketId,
  onTaskSelect,
  onTabChange,
}) => {
  // Get user capabilities to determine available desks
  const { capabilities, isLoading, error } = useUserCapabilities({
    accessToken,
    userInfo,
  });

  // Get Service Desk Catalog entries for all available desk tabs
  const { 
    catalogEntries, 
    isLoading: catalogLoading, 
    error: catalogError 
  } = useServiceDeskCatalog({
    accessToken,
    userInfo,
  });

  // Get completed tickets count for badge
  const { totalCount: completedCount } = useCompletedTickets({
    accessToken,
    userInfo,
    limit: 1, // We only need the count, not the actual tickets
    offset: 0,
  });

  // Get "Under desk" tickets count for badge
  const { tickets: underDeskTickets } = useDeskTickets({
    deskKey: 'Under desk' as StepReceiver,
    accessToken,
    userInfo,
  });
  const underDeskCount = underDeskTickets?.length || 0;

  // Tab state management
  const [activeTab, setActiveTab] = useState<string>(deskKey || '');

  // Update tab from props
  useEffect(() => {
    if (deskKey) {
      setActiveTab(deskKey);
    }
  }, [deskKey]);

  // Default to first available desk if no tab is selected and no deskKey prop
  useEffect(() => {
    if (catalogEntries && catalogEntries.length > 0) {
      // Get available tabs after filtering
      const availableTabs = catalogEntries.filter((entry) => {
        if (entry.code === 'Under desk') {
          return underDeskCount > 0;
        }
        return true;
      });

      // If no activeTab or activeTab is invalid, set to first available tab
      if (!activeTab && !deskKey && availableTabs.length > 0) {
        const firstEntry = availableTabs[0];
        console.log(`[Tickets] Setting default tab to first available catalog entry: ${firstEntry.code}`);
        setActiveTab(firstEntry.code);
      } 
      // If activeTab is "Under desk" but it's being filtered out, switch to first available tab
      else if (activeTab === 'Under desk' && underDeskCount === 0 && availableTabs.length > 0) {
        const firstEntry = availableTabs[0];
        console.log(`[Tickets] "Under desk" tab hidden due to no tickets, switching to: ${firstEntry.code}`);
        setActiveTab(firstEntry.code);
        // Notify parent component of tab change
        if (onTabChange) {
          onTabChange(firstEntry.code);
        }
      }
    }
  }, [activeTab, deskKey, catalogEntries, underDeskCount, onTabChange]);

  // Handle tab change
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    // Notify parent component about tab change
    if (onTabChange) {
      onTabChange(key);
    }
  };

  // Handle task selection
  const handleTaskSelect = (taskId: string, deskKey: string) => {
    if (onTaskSelect) {
      onTaskSelect(taskId, deskKey);
    }
  };

  // Loading state
  if (isLoading || catalogLoading) {
    return (
      <div 
        data-testid="tickets-loading" 
        className="gba:p-6 gba:text-center gba:text-gray-500"
      >
        {getTranslationFromI18nKeyAndLabel(
          'services.tickets.loading',
          'Loading tickets...'
        )}
      </div>
    );
  }

  // Error state
  if (error || catalogError) {
    return (
      <div 
        data-testid="tickets-error" 
        className="gba:p-6 gba:text-center gba:text-red-500"
      >
        {getTranslationFromI18nKeyAndLabel(
          'services.tickets.error',
          'Error loading tickets. Please try again.'
        )}
        {catalogError && (
          <div className="gba:mt-2 gba:text-sm">
            Catalog Error: {catalogError}
          </div>
        )}
      </div>
    );
  }

  // No catalog entries available
  if (!catalogEntries || catalogEntries.length === 0) {
    return (
      <div 
        data-testid="tickets-no-access" 
        className="gba:p-6 gba:text-center gba:text-gray-500"
      >
        {getTranslationFromI18nKeyAndLabel(
          'services.tickets.noAccess',
          'No service desk categories available.'
        )}
      </div>
    );
  }

  return (
    <div data-testid="service-desk-tickets" className="gba:h-full gba:flex gba:flex-col">
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        data-testid="tickets-tabs"
        className="gba:w-full gba:flex-1 gba:flex gba:flex-col [&_.ant-tabs-content-holder]:gba:flex-1 [&_.ant-tabs-tabpane]:gba:h-full"
        items={[
          // Service Desk Catalog tabs (all available entries)
          ...catalogEntries
            .filter((entry) => {
              // Hide "Under desk" tab when there are no uncategorized tickets
              if (entry.code === 'Under desk') {
                return underDeskCount > 0;
              }
              return true; // Show all other tabs
            })
            .map((entry) => {
            // Find matching capability for ticket count
            const capability = capabilities?.find(cap => cap.desk === entry.code);
            let ticketCount = capability?.ticketCount || 0;
            
            // Special case for "Under desk" - use our direct count
            if (entry.code === 'Under desk') {
              ticketCount = underDeskCount;
            }
            
            return {
              key: entry.code,
              label: (
                <span 
                  data-testid={`tickets-tab-${entry.code.toLowerCase()}`}
                  className="gba:flex gba:items-center gba:gap-2"
                >
                  <span>
                    {getTranslationFromI18nKeyAndLabel(
                      `services.desk.${entry.code.toLowerCase()}.name`,
                      entry.value || entry.code // Use value as primary, code as fallback
                    )}
                  </span>
                  {ticketCount > 0 && (
                    <Badge 
                      count={ticketCount} 
                      size="small"
                      className="gba:ml-1" 
                    />
                  )}
                </span>
              ),
              children: (
                <div className="gba:h-full">
                  <DeskQueue
                    deskKey={entry.code as StepReceiver}
                    ticketId={ticketId}
                    accessToken={accessToken}
                    userInfo={userInfo}
                    onTaskSelect={handleTaskSelect}
                  />
                </div>
              ),
            };
          }),
          // Completed Tickets tab
          {
            key: 'completed',
            label: (
              <span 
                data-testid="tickets-tab-completed"
                className="gba:flex gba:items-center gba:gap-2"
              >
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'services.desk.completed.name',
                    'Completed'
                  )}
                </span>
                {completedCount > 0 && (
                  <Badge 
                    count={completedCount} 
                    size="small"
                    className="gba:ml-1" 
                  />
                )}
              </span>
            ),
            children: (
              <div className="gba:h-full">
                <CompletedTickets
                  accessToken={accessToken}
                  userInfo={userInfo}
                  onTaskSelect={handleTaskSelect}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

