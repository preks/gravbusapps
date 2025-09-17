import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { Tabs, Badge } from 'antd';
import { DeskQueue } from './DeskQueue';
import { CompletedTickets } from './CompletedTickets';
import { useUserCapabilities } from '../hooks/useUserCapabilities';
import { useCompletedTickets } from '../hooks/useCompletedTickets';
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

  // Get completed tickets count for badge
  const { totalCount: completedCount } = useCompletedTickets({
    accessToken,
    userInfo,
    limit: 1, // We only need the count, not the actual tickets
    offset: 0,
  });

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
    if (!activeTab && !deskKey && capabilities && capabilities.length > 0) {
      setActiveTab(capabilities[0].desk);
    }
  }, [activeTab, deskKey, capabilities]);

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
  if (isLoading) {
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
  if (error) {
    return (
      <div 
        data-testid="tickets-error" 
        className="gba:p-6 gba:text-center gba:text-red-500"
      >
        {getTranslationFromI18nKeyAndLabel(
          'services.tickets.error',
          'Error loading tickets. Please try again.'
        )}
      </div>
    );
  }

  // No capabilities
  if (!capabilities || capabilities.length === 0) {
    return (
      <div 
        data-testid="tickets-no-access" 
        className="gba:p-6 gba:text-center gba:text-gray-500"
      >
        {getTranslationFromI18nKeyAndLabel(
          'services.tickets.noAccess',
          'No desk access available.'
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
          // Regular desk tabs (IT, HR, etc.)
          ...capabilities.map(({ desk, name, ticketCount }) => ({
            key: desk,
            label: (
              <span 
                data-testid={`tickets-tab-${desk.toLowerCase()}`}
                className="gba:flex gba:items-center gba:gap-2"
              >
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    `services.desk.${desk.toLowerCase()}.name`,
                    name
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
                  deskKey={desk}
                  ticketId={ticketId}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  onTaskSelect={handleTaskSelect}
                />
              </div>
            ),
          })),
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

