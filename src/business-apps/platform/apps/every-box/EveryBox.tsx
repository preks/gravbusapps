/**
 * EveryBox Component
 * Unified inbox and outbox for all tasks and workflows
 */

import React, { useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge
} from '@newwork/nw-design-system';
import { Inbox, Send } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useInboxTasks } from './hooks/useInboxTasks';
import { useOutboxFlows } from './hooks/useOutboxFlows';
import { InboxView } from './components/InboxView';
import { OutboxView } from './components/OutboxView';
import { ErrorBoundary } from './components/ErrorBoundary';

interface EveryBoxProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const POLLING_INTERVAL = 15000; // 15 seconds

export const EveryBox: React.FC<EveryBoxProps> = ({
  prefixDataTestId = 'every-box',
  ...context
}) => {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('[EveryBox] Component mounted');
    console.log('[EveryBox] Context:', {
      hasAccessToken: !!context.accessToken,
      hasUserInfo: !!context.userInfo,
      employeeId: context.userInfo?.employeeDetails?.employeeId,
      userInfoStructure: context.userInfo
    });
  }, []);

  // Fetch inbox tasks
  const {
    tasks,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks
  } = useInboxTasks(context);

  // Fetch outbox flows
  const {
    flows,
    isLoading: flowsLoading,
    error: flowsError,
    refetch: refetchFlows
  } = useOutboxFlows(context);

  // Set up polling
  useEffect(() => {
    // Initial load is handled by hooks
    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      refetchTasks();
      refetchFlows();
    }, POLLING_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [refetchTasks, refetchFlows]);

  const handleRefreshAll = () => {
    refetchTasks();
    refetchFlows();
  };

  return (
    <ErrorBoundary>
      <div
        className="gba:container gba:mx-auto gba:py-6 gba:px-4"
        data-testid={`${prefixDataTestId}-container`}
      >
        <Card>
        <CardContent className="gba:p-6">
          {/* Header */}
          <div className="gba:mb-6">
            <h1 className="gba:text-2xl gba:font-bold gba:mb-2" data-testid={`${prefixDataTestId}-title`}>
              EveryBox
            </h1>
            <p className="gba:text-muted-foreground gba:text-sm">
              Manage all your tasks and workflows in one place
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="inbox" data-testid={`${prefixDataTestId}-tabs`}>
            <TabsList className="gba:grid gba:w-full gba:grid-cols-2 gba:mb-6">
              <TabsTrigger value="inbox" data-testid={`${prefixDataTestId}-inbox-tab`}>
                <Inbox className="gba:mr-2 gba:h-4 gba:w-4" />
                Inbox
                {tasks.length > 0 && (
                  <Badge variant="secondary" className="gba:ml-2">
                    {tasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="outbox" data-testid={`${prefixDataTestId}-outbox-tab`}>
                <Send className="gba:mr-2 gba:h-4 gba:w-4" />
                Outbox
                {flows.length > 0 && (
                  <Badge variant="secondary" className="gba:ml-2">
                    {flows.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inbox">
              <InboxView
                {...context}
                tasks={tasks}
                isLoading={tasksLoading}
                error={tasksError}
                onRefresh={refetchTasks}
              />
            </TabsContent>

            <TabsContent value="outbox">
              <OutboxView
                flows={flows}
                isLoading={flowsLoading}
                error={flowsError}
                onRefresh={refetchFlows}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </ErrorBoundary>
  );
};

