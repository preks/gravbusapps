/**
 * EveryBox Component
 * Unified inbox and outbox for all tasks and workflows
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  ThemeProvider,
  Button
} from '@newwork/nw-design-system'
import { Inbox, Send, Zap } from 'lucide-react'
import { message } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { useInboxTasks } from './hooks/useInboxTasks'
import { useOutboxFlows } from './hooks/useOutboxFlows'
import { useCompletedTasks } from './hooks/useCompletedTasks'
import { InboxView } from './components/InboxView'
import { OutboxView } from './components/OutboxView'
import { ErrorBoundary } from './components/ErrorBoundary'
import {
  QuickTaskModal,
  QuickTaskFormData,
  QuickTaskFlowService
} from '@/business-apps/flow/common/components/flow-quick-task'

interface EveryBoxProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const POLLING_INTERVAL = 15000 // 15 seconds

export const EveryBox: React.FC<EveryBoxProps> = ({ prefixDataTestId = 'every-box', ...context }) => {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false)

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

  // Handle Quick Task (Blink) submission
  const handleQuickTaskSubmit = async (data: QuickTaskFormData) => {
    try {
      const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine'

      // Execute the quick task using the service method
      await QuickTaskFlowService.executeQuickTask({
        formData: data,
        uploadResults: [], // File upload results if needed
        accessToken: context.accessToken,
        initiatorId: context.userInfo?.id || context.userInfo?.employeeDetails?.employeeId || 'unknown',
        apiBaseUrl: baseUrl
      })

      message.success(`Blink "${data.title}" created successfully!`)

      // Refresh the task lists in the background (don't wait for them)
      // This allows the modal to close immediately
      Promise.all([refetchTasks(), refetchFlows(), refetchCompleted()]).catch(err => {
        console.error('[EveryBox] Failed to refresh task lists:', err)
      })
    } catch (error) {
      console.error('[EveryBox] Failed to create Blink:', error)
      message.error(`Failed to create Blink: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error // Re-throw to prevent modal from closing on error
    }
  }

  return (
    <ThemeProvider defaultTheme="light">
      <ErrorBoundary>
        <div
          className="gba:h-screen gba:flex gba:flex-col gba:overflow-hidden gba:p-6"
          data-testid={`${prefixDataTestId}-container`}
        >
          <div className="gba:container gba:mx-auto gba:max-w-7xl gba:flex gba:flex-col gba:h-full">
            <Card className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden">
              <CardContent className="gba:p-4 gba:flex gba:flex-col gba:h-full gba:overflow-hidden">
                {/* Header */}
                <div className="gba:mb-3 gba:flex gba:items-center gba:justify-between">
                  <div>
                    <h1 className="gba:text-xl gba:font-bold" data-testid={`${prefixDataTestId}-title`}>
                      EveryBox
                    </h1>
                  </div>

                  {/* Blink Button */}
                  <Button
                    onClick={() => setIsQuickTaskModalOpen(true)}
                    className="gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600 hover:gba:from-blue-700 hover:gba:to-indigo-700 gba:text-white gba:shadow-lg"
                    size="sm"
                    data-testid={`${prefixDataTestId}-blink-button`}
                  >
                    <Zap className="gba:h-4 gba:w-4 gba:mr-2" />
                    Blink
                  </Button>
                </div>

                {/* Tabs */}
                <Tabs
                  defaultValue="inbox"
                  className="gba:flex gba:flex-col gba:flex-1 gba:overflow-hidden"
                  data-testid={`${prefixDataTestId}-tabs`}
                >
                  <TabsList className="gba:mb-3 gba:flex-shrink-0">
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
                      InFlows
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
                      OutFlows
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="inbox" className="gba:flex-1 gba:overflow-hidden">
                    <InboxView
                      {...context}
                      tasks={tasks}
                      totalCount={totalTaskCount}
                      isLoading={tasksLoading}
                      error={tasksError}
                      onRefresh={refetchTasks}
                      onLoadMore={loadMoreTasks}
                      hasMore={hasMoreTasks}
                      completedTasks={completedTasks}
                      completedTotalCount={totalCompletedCount}
                      completedIsLoading={completedLoading}
                      completedError={completedError}
                      onCompletedRefresh={refetchCompleted}
                      onCompletedLoadMore={loadMoreCompleted}
                      completedHasMore={hasMoreCompleted}
                    />
                  </TabsContent>

                  <TabsContent value="outbox" className="gba:flex-1 gba:overflow-hidden">
                    <OutboxView
                      flows={flows}
                      isLoading={flowsLoading}
                      error={flowsError}
                      onRefresh={refetchFlows}
                      accessToken={context.accessToken}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Blink Modal */}
          <QuickTaskModal
            open={isQuickTaskModalOpen}
            onOpenChange={setIsQuickTaskModalOpen}
            accessToken={context.accessToken}
            currentUserId={context.userInfo?.id}
            onSubmit={handleQuickTaskSubmit}
            title="Blink"
            description="Create and assign a quick task instantly"
            config={{
              assigneeSelector: { mode: 'employee-search', required: true },
              enableFileUpload: true,
              enableDueDate: true,
              maxFiles: 5,
              maxFileSize: 10,
              allowedFileTypes: ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip']
            }}
          />
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
