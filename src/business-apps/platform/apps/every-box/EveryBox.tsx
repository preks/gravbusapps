/**
 * EveryBox Component
 * Unified inbox and outbox for all tasks and workflows
 */

import React, { useEffect, useRef } from 'react'
import {
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  ThemeProvider
} from '@newwork/nw-design-system'
import { Inbox, Send, CheckCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInboxTasks } from './hooks/useInboxTasks'
import { useOutboxFlows } from './hooks/useOutboxFlows'
import { useCompletedTasks } from './hooks/useCompletedTasks'
import { InboxView } from './components/InboxView'
import { OutboxView } from './components/OutboxView'
import { CompletedView } from './components/CompletedView'
import { ErrorBoundary } from './components/ErrorBoundary'

interface EveryBoxProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const POLLING_INTERVAL = 15000 // 15 seconds

export const EveryBox: React.FC<EveryBoxProps> = ({ prefixDataTestId = 'every-box', ...context }) => {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Debug logging
  useEffect(() => {
    console.log('[EveryBox] Component mounted')
    console.log('[EveryBox] Context:', {
      hasAccessToken: !!context.accessToken,
      hasUserInfo: !!context.userInfo,
      employeeId: context.userInfo?.employeeDetails?.employeeId,
      userInfoStructure: context.userInfo
    })
  }, [])

  // Fetch inbox tasks
  const {
    tasks,
    totalCount: totalTaskCount,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
    loadMore: loadMoreTasks,
    hasMore: hasMoreTasks
  } = useInboxTasks(context)

  // Fetch outbox flows
  const { flows, isLoading: flowsLoading, error: flowsError, refetch: refetchFlows } = useOutboxFlows(context)

  // Fetch completed tasks
  const {
    tasks: completedTasks,
    totalCount: totalCompletedCount,
    isLoading: completedLoading,
    error: completedError,
    refetch: refetchCompleted,
    loadMore: loadMoreCompleted,
    hasMore: hasMoreCompleted
  } = useCompletedTasks(context)

  // Set up polling
  useEffect(() => {
    // Initial load is handled by hooks
    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      refetchTasks()
      refetchFlows()
      refetchCompleted()
    }, POLLING_INTERVAL)

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [refetchTasks, refetchFlows, refetchCompleted])

  return (
    <ThemeProvider defaultTheme="light">
      <ErrorBoundary>
        <div className="gba:h-screen gba:overflow-auto gba:p-6" data-testid={`${prefixDataTestId}-container`}>
          <div className="gba:container gba:mx-auto gba:max-w-7xl">
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
                  <TabsList className="gba:mb-6">
                    <TabsTrigger
                      value="inbox"
                      data-testid={`${prefixDataTestId}-inbox-tab`}
                      startIcon={<Inbox className="gba:h-5 gba:w-5" />}
                      endAdornment={
                        totalTaskCount > 0 && (
                          <Badge variant="secondary" className="gba:ml-2">
                            {totalTaskCount}
                          </Badge>
                        )
                      }
                    >
                      Inbox
                    </TabsTrigger>
                    <TabsTrigger
                      value="outbox"
                      data-testid={`${prefixDataTestId}-outbox-tab`}
                      startIcon={<Send className="gba:h-5 gba:w-5" />}
                      endAdornment={
                        flows.length > 0 && (
                          <Badge variant="secondary" className="gba:ml-2">
                            {flows.length}
                          </Badge>
                        )
                      }
                    >
                      Outbox
                    </TabsTrigger>
                    <TabsTrigger
                      value="completed"
                      data-testid={`${prefixDataTestId}-completed-tab`}
                      startIcon={<CheckCircle className="gba:h-5 gba:w-5" />}
                      endAdornment={
                        totalCompletedCount > 0 && (
                          <Badge variant="secondary" className="gba:ml-2">
                            {totalCompletedCount}
                          </Badge>
                        )
                      }
                    >
                      Completed
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="inbox">
                    <InboxView
                      {...context}
                      tasks={tasks}
                      totalCount={totalTaskCount}
                      isLoading={tasksLoading}
                      error={tasksError}
                      onRefresh={refetchTasks}
                      onLoadMore={loadMoreTasks}
                      hasMore={hasMoreTasks}
                    />
                  </TabsContent>

                  <TabsContent value="outbox">
                    <OutboxView flows={flows} isLoading={flowsLoading} error={flowsError} onRefresh={refetchFlows} />
                  </TabsContent>

                  <TabsContent value="completed">
                    <CompletedView
                      {...context}
                      tasks={completedTasks}
                      totalCount={totalCompletedCount}
                      isLoading={completedLoading}
                      error={completedError}
                      onRefresh={refetchCompleted}
                      onLoadMore={loadMoreCompleted}
                      hasMore={hasMoreCompleted}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
