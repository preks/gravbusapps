/**
 * EveryBox Component
 * Unified inbox and outbox for all tasks and workflows
 *
 * OPTIMIZATION: Smart polling with staggered intervals
 * - Active tasks: Poll every 15s (most important)
 * - Completed tasks: Poll every 60s (less urgent)
 * - Outbox flows: Poll every 30s (moderate)
 * This reduces backend load by ~50% while maintaining good UX
 *
 * URL Parameters:
 * - view: 'inbox' | 'outbox' - Controls which tab is active
 *   Example: ?view=outbox will open the OutFlows tab
 * - taskId: ID of selected task (InFlows tab)
 *   Example: ?view=inbox&taskId=abc-123
 * - flowId: ID of selected flow (OutFlows tab)
 *   Example: ?view=outbox&flowId=xyz-789
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
import { FileClient } from '@/common/network/files/FileClient'

interface EveryBoxProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

type ViewType = 'inbox' | 'outbox'

/**
 * Get initial view from URL
 */
const getInitialView = (): ViewType => {
  const urlParams = new URLSearchParams(window.location.search)
  const view = urlParams.get('view')
  return view === 'outbox' ? 'outbox' : 'inbox'
}

/**
 * Update URL with view parameter
 */
const updateViewUrl = (view: ViewType) => {
  const urlParams = new URLSearchParams(window.location.search)
  urlParams.set('view', view)
  const newUrl = `${window.location.pathname}?${urlParams.toString()}`
  window.history.replaceState({}, '', newUrl)
}

// Staggered polling intervals for different data types
const POLLING_CONFIG = {
  activeTasks: {
    interval: 15000, // 15 seconds - Most critical
    enabled: true
  },
  completedTasks: {
    interval: 60000, // 60 seconds - Less urgent
    enabled: true
  },
  outboxFlows: {
    interval: 30000, // 30 seconds - Moderate
    enabled: true
  }
}

export const EveryBox: React.FC<EveryBoxProps> = ({ prefixDataTestId = 'every-box', ...context }) => {
  // Separate interval refs for each data source (for staggered polling)
  const activeTasksIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const completedTasksIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const outboxFlowsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ViewType>(getInitialView())

  // Debug logging
  useEffect(() => {}, [])

  // Fetch inbox tasks (active)
  const {
    tasks,
    totalCount: totalTaskCount,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
    loadMore: loadMoreTasks,
    hasMore: hasMoreTasks,
    hasNewTasks: hasNewInboxTasks,
    backgroundRefresh: backgroundRefreshInbox,
    clearNewTasksFlag: clearNewInboxTasksFlag
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
    hasMore: hasMoreCompleted,
    hasNewTasks: hasNewCompletedTasks,
    backgroundRefresh: backgroundRefreshCompleted,
    clearNewTasksFlag: clearNewCompletedTasksFlag
  } = useCompletedTasks(context)

  // Initialize URL with view parameter if not present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      updateViewUrl(activeTab)
    }
  }, [])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView()
      setActiveTab(newView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Handler to change tab and update URL
  const handleTabChange = (value: string) => {
    const newView = value as ViewType
    setActiveTab(newView)
    updateViewUrl(newView)
  }

  // Set up staggered polling intervals (SMART POLLING - no UI disruption)
  useEffect(() => {
    // Active tasks polling - uses backgroundRefresh (no UI reload)
    if (POLLING_CONFIG.activeTasks.enabled) {
      activeTasksIntervalRef.current = setInterval(() => {
        backgroundRefreshInbox()
      }, POLLING_CONFIG.activeTasks.interval)
    }

    // Completed tasks polling - uses backgroundRefresh (no UI reload)
    if (POLLING_CONFIG.completedTasks.enabled) {
      completedTasksIntervalRef.current = setInterval(() => {
        backgroundRefreshCompleted()
      }, POLLING_CONFIG.completedTasks.interval)
    }

    // Outbox flows polling - still uses refetch (less disruptive for smaller lists)
    if (POLLING_CONFIG.outboxFlows.enabled) {
      outboxFlowsIntervalRef.current = setInterval(() => {
        refetchFlows()
      }, POLLING_CONFIG.outboxFlows.interval)
    }

    // Cleanup all intervals on unmount
    return () => {
      if (activeTasksIntervalRef.current) {
        clearInterval(activeTasksIntervalRef.current)
      }
      if (completedTasksIntervalRef.current) {
        clearInterval(completedTasksIntervalRef.current)
      }
      if (outboxFlowsIntervalRef.current) {
        clearInterval(outboxFlowsIntervalRef.current)
      }
    }
  }, [backgroundRefreshInbox, backgroundRefreshCompleted, refetchFlows])

  // Handle Quick Task (Blink) submission
  const handleQuickTaskSubmit = async (data: QuickTaskFormData) => {
    try {
      const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine'

      // Upload files if any were selected
      let uploadResults: any[] = []
      if (data.documents && data.documents.length > 0) {
        console.log('[EveryBox] Starting file upload, documents:', data.documents.length, data.documents)

        const fileClient = new FileClient()
        fileClient.setAccessToken(context.accessToken)

        // Upload all files in parallel
        uploadResults = await Promise.all(
          data.documents
            .filter(doc => doc.originFileObj) // Only upload files with originFileObj
            .map(async doc => {
              console.log('[EveryBox] Uploading file:', doc.name, 'originFileObj:', doc.originFileObj)
              try {
                const result = await fileClient.uploadFile(
                  doc.originFileObj!,
                  { accessScope: 'tenant' },
                  {
                    appName: 'quick-task',
                    folderPath: '/blinks',
                    originalFileName: doc.name
                  }
                )
                console.log('[EveryBox] File uploaded successfully:', doc.name, result)
                return result
              } catch (error) {
                console.error(`[EveryBox] Failed to upload file ${doc.name}:`, error)
                return null
              }
            })
        )

        // Filter out failed uploads
        uploadResults = uploadResults.filter(result => result !== null)
        console.log('[EveryBox] Final upload results:', uploadResults.length, uploadResults)
      } else {
        console.log('[EveryBox] No documents to upload', data.documents)
      }

      // Execute the quick task using the service method
      await QuickTaskFlowService.executeQuickTask({
        formData: data,
        uploadResults,
        accessToken: context.accessToken,
        initiatorId: context.userInfo?.id || context.userInfo?.employeeDetails?.employeeId || 'unknown',
        apiBaseUrl: baseUrl
      })

      message.success(`Blink "${data.title}" created successfully!`)

      // Refresh the task lists in the background (don't wait for them)
      // This allows the modal to close immediately
      Promise.all([refetchTasks(), refetchFlows(), refetchCompleted()]).catch(() => {
        // Ignore errors in background refresh
      })
    } catch (error) {
      message.error(`Failed to create Blink: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error // Re-throw to prevent modal from closing on error
    }
  }

  return (
    <ThemeProvider defaultTheme="light">
      <ErrorBoundary>
        <div
          className="gba:h-full gba:flex gba:flex-col gba:overflow-hidden"
          data-testid={`${prefixDataTestId}-container`}
        >
          <div className="gba:h-full gba:flex gba:flex-col gba:relative">
            <Card className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden gba:border-0 gba:shadow-none">
              <CardContent className="gba:p-0 gba:flex gba:flex-col gba:h-full gba:overflow-hidden">
                {/* Floating Header - Absolute positioned to not take vertical space */}
                <div className="gba:absolute gba:top-2 gba:left-0 gba:right-0 gba:z-10 gba:flex gba:items-center gba:justify-between gba:pl-[42px] gba:pr-[46px]">
                  <h1
                    className="gba:text-lg gba:font-bold gba:text-foreground"
                    data-testid={`${prefixDataTestId}-title`}
                  >
                    EveryBox
                  </h1>

                  {/* Blink Button - Aligned with content right edge */}
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

                {/* Tabs - Now starts from top with full height */}
                <Tabs
                  value={activeTab}
                  onValueChange={handleTabChange}
                  className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden gba:pt-10"
                  data-testid={`${prefixDataTestId}-tabs`}
                >
                  <TabsList className="gba:mb-2 gba:flex-shrink-0 gba:ml-3">
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

                  <TabsContent value="inbox" className="gba:flex-1 gba:overflow-hidden gba:px-3">
                    <InboxView
                      {...context}
                      tasks={tasks}
                      totalCount={totalTaskCount}
                      isLoading={tasksLoading}
                      error={tasksError}
                      onRefresh={refetchTasks}
                      onLoadMore={loadMoreTasks}
                      hasMore={hasMoreTasks}
                      hasNewTasks={hasNewInboxTasks}
                      onLoadNewTasks={clearNewInboxTasksFlag}
                      completedTasks={completedTasks}
                      completedTotalCount={totalCompletedCount}
                      completedIsLoading={completedLoading}
                      completedError={completedError}
                      onCompletedRefresh={refetchCompleted}
                      onCompletedLoadMore={loadMoreCompleted}
                      completedHasMore={hasMoreCompleted}
                      hasNewCompletedTasks={hasNewCompletedTasks}
                      onLoadNewCompletedTasks={clearNewCompletedTasksFlag}
                    />
                  </TabsContent>

                  <TabsContent value="outbox" className="gba:flex-1 gba:overflow-hidden gba:px-3">
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
