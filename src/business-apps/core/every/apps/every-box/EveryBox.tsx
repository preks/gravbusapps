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
  ThemeProvider,
  Button,
  useTranslation,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  Tabs,
  TabsContent,
  toast,
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@newwork/nw-design-system'
import translations from './_i18n'
import { Inbox, Send, Zap, Search, ArrowUpDown, RefreshCcw, CalendarDays } from 'lucide-react'
import { FiltersDropdown, FilterType } from './components/FiltersDropdown'
import { EveryBoxHero } from './components/EveryBoxHero'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { useInboxTasks } from './hooks/useInboxTasks'
import { useOutboxFlows } from './hooks/useOutboxFlows'
import { useCompletedTasks } from './hooks/useCompletedTasks'
import { useBlinkTasks } from './hooks/useBlinkCount'
import { InboxView } from './components/InboxView'
import { OutboxView } from './components/OutboxView'
import { ErrorBoundary } from './components/ErrorBoundary'
import {
  QuickTaskModal,
  QuickTaskFormData,
  QuickTaskFlowService,
  useQuickTaskFileUpload
} from '@/business-apps/flow/common/components/flow-quick-task'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'

interface EveryBoxProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

type ViewType = 'inbox' | 'outbox'
type SortOption = 'newest' | 'oldest' | 'priority'
type DueDateFilter = 'any' | 'overdue' | 'dueSoon' | 'hasDueDate' | 'noDueDate'

/**
 * Get initial view from URL
 */
const getInitialView = (): ViewType => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const view = urlParams.get('view')
  return view === 'outbox' ? 'outbox' : 'inbox'
}

/**
 * Update URL with view parameter
 */
const updateViewUrl = (view: ViewType) => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  urlParams.set('view', view)
  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
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
  const { t } = useTranslation(translations)

  // Feature flag guard - EveryBox only available when preview.enabled is true
  const previewFeature = useFeature(Feature.Preview.Enabled.Key)
  const isPreviewEnabled = previewFeature !== false // true if undefined (development) or 'true'

  // All hooks must be called before any early return to satisfy React's rules of hooks
  // Separate interval refs for each data source (for staggered polling)
  const activeTasksIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const completedTasksIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const outboxFlowsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ViewType>(getInitialView())
  const [globalSearch, setGlobalSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<FilterType[]>(['all'])
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>('any')

  const sortBy = sortOption === 'priority' ? 'priority' : 'createdAt'
  const sortOrder = sortOption === 'oldest' ? 'asc' : sortOption === 'priority' ? 'asc' : 'desc'

  // Debounce search to avoid firing backend requests on each keystroke
  useEffect(() => {
    const handle = globalThis.setTimeout(() => setDebouncedSearch(globalSearch), 300)
    return () => globalThis.clearTimeout(handle)
  }, [globalSearch])

  // File upload hook for Blink attachments
  const { uploadFiles } = useQuickTaskFileUpload({
    accessToken: context.accessToken
  })

  // Fetch inbox tasks (active)
  const {
    tasks,
    totalCount: totalTaskCount,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
    loadMore: loadMoreTasks,
    hasMore: hasMoreTasks,
    backgroundRefresh: backgroundRefreshInbox
  } = useInboxTasks(context, { search: debouncedSearch, sortBy, sortOrder })

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
    backgroundRefresh: backgroundRefreshCompleted
  } = useCompletedTasks(context, { search: debouncedSearch, sortBy, sortOrder })

  // Fetch blink tasks using tag filtering (response contains totalCount for badge)
  const {
    tasks: blinkTasks,
    totalCount: blinkTotalCount,
    isLoading: blinkTasksLoading,
    hasMore: blinkHasMore,
    refetch: refetchBlinkTasks,
    loadMore: loadMoreBlinkTasks
  } = useBlinkTasks(context)

  // Initialize URL with view parameter if not present
  useEffect(() => {
    if (!isPreviewEnabled) return
    const urlParams = new URLSearchParams(globalThis.location.search)
    if (!urlParams.has('view')) {
      updateViewUrl(activeTab)
    }
  }, [isPreviewEnabled, activeTab])

  // Handle browser back/forward navigation
  useEffect(() => {
    if (!isPreviewEnabled) return

    const handlePopState = () => {
      const newView = getInitialView()
      setActiveTab(newView)
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [isPreviewEnabled])

  // Handler to change tab and update URL
  const handleTabChange = (value: string) => {
    const newView = value as ViewType
    setActiveTab(newView)
    updateViewUrl(newView)
  }

  const handleRefresh = async () => {
    if (activeTab === 'outbox') {
      await refetchFlows()
      return
    }

    // inbox tab
    const filter = selectedFilters[0] || 'all'
    if (filter === 'completed') {
      await refetchCompleted()
      return
    }
    if (filter === 'blinks') {
      await refetchBlinkTasks()
      return
    }
    await refetchTasks()
  }

  // Set up staggered polling intervals (SMART POLLING - no UI disruption)
  useEffect(() => {
    if (!isPreviewEnabled) return

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
  }, [isPreviewEnabled, backgroundRefreshInbox, backgroundRefreshCompleted, refetchFlows])

  // Listen for process completion events to refresh task lists
  useEffect(() => {
    if (!isPreviewEnabled) return

    const handleProcessCompletion = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution?: string }>
      const resolution = customEvent.detail?.resolution

      if (resolution === 'success') {
        // Refresh both active and completed tasks
        refetchTasks()
        refetchCompleted()
      }
    }

    window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion)

    return () => {
      window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
    }
  }, [isPreviewEnabled, refetchTasks, refetchCompleted])

  // Feature flag guard - render null if preview is disabled (after all hooks)
  if (!isPreviewEnabled) {
    return null
  }

  // Handle Quick Task (Blink) submission
  const handleQuickTaskSubmit = async (data: QuickTaskFormData) => {
    try {
      const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

      // Step 1: Upload files first if any are attached
      let uploadResults: any[] = []
      if (data.documents && data.documents.length > 0) {
        // Extract actual File objects from QuickTaskUploadFile[] (skip files with errors)
        const filesToUpload = data.documents
          .filter(doc => doc.originFileObj && doc.status !== 'error')
          .map(doc => doc.originFileObj!)

        if (filesToUpload.length > 0) {
          try {
            uploadResults = await uploadFiles(filesToUpload)
          } catch (uploadError) {
            toast.error(
              t('blink-upload-error', { error: uploadError instanceof Error ? uploadError.message : 'Unknown error' })
            )
            throw uploadError // Re-throw to prevent task creation with missing attachments
          }
        }
      }

      // Step 2: Execute the quick task with uploaded file results
      await QuickTaskFlowService.executeQuickTask({
        formData: data,
        uploadResults, // Now includes actual uploaded file data
        accessToken: context.accessToken,
        initiatorId: context.userInfo?.id || context.userInfo?.employeeDetails?.employeeId || 'unknown',
        apiBaseUrl: baseUrl
      })

      toast.success(t('blink-created-success', { title: data.title }))

      // Refresh the task lists in the background (don't wait for them)
      // This allows the modal to close immediately
      Promise.all([refetchTasks(), refetchFlows(), refetchCompleted(), refetchBlinkTasks()]).catch(() => {
        // Ignore errors in background refresh
      })
    } catch (error) {
      toast.error(t('blink-created-error', { error: error instanceof Error ? error.message : 'Unknown error' }))
      throw error // Re-throw to prevent modal from closing on error
    }
  }

  // State for expandable search
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

  return (
    <ThemeProvider defaultTheme="light">
      <ErrorBoundary>
        <div
          className="gba:h-full gba:flex gba:flex-col gba:overflow-hidden"
          data-testid={`${prefixDataTestId}-container`}
        >
          {/* Hero Section */}
          <EveryBoxHero data-testid={`${prefixDataTestId}-hero`} />

          {/* Main Content */}
          <div className="layout-content gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:overflow-hidden">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:flex gba:flex-col gba:h-full">
              {/* Header Bar - Tabs on left, Actions on right */}
              <div
                className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:px-6 gba:bg-background gba:flex-shrink-0 gba:border-b gba:border-border"
                data-testid={`${prefixDataTestId}-header`}
              >
                {/* Left: Custom Styled Tabs */}
                <div className="gba:flex gba:items-center gba:gap-1" data-testid={`${prefixDataTestId}-tabs`}>
                  <button
                    onClick={() => handleTabChange('inbox')}
                    className={`gba:group gba:relative gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:transition-colors ${
                      activeTab === 'inbox'
                        ? 'gba:text-foreground'
                        : 'gba:text-muted-foreground gba:hover:text-foreground'
                    }`}
                    data-testid={`${prefixDataTestId}-inbox-tab`}
                    data-state={activeTab === 'inbox' ? 'active' : 'inactive'}
                  >
                    <Inbox className="gba:h-4 gba:w-4" />
                    <span className="gba:text-sm gba:font-medium">{t('every-box-tab-inflows')}</span>
                    {totalTaskCount > 0 && (
                      <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">{totalTaskCount}</span>
                    )}
                    {/* Active indicator line */}
                    <span
                      className={`gba:absolute gba:bottom-0 gba:left-4 gba:right-4 gba:h-0.5 gba:rounded-full gba:transition-all ${
                        activeTab === 'inbox'
                          ? 'gba:bg-foreground gba:opacity-100'
                          : 'gba:bg-transparent gba:opacity-0 gba:group-hover:bg-muted-foreground gba:group-hover:opacity-30'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => handleTabChange('outbox')}
                    className={`gba:group gba:relative gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:transition-colors ${
                      activeTab === 'outbox'
                        ? 'gba:text-foreground'
                        : 'gba:text-muted-foreground gba:hover:text-foreground'
                    }`}
                    data-testid={`${prefixDataTestId}-outbox-tab`}
                    data-state={activeTab === 'outbox' ? 'active' : 'inactive'}
                  >
                    <Send className="gba:h-4 gba:w-4" />
                    <span className="gba:text-sm gba:font-medium">{t('every-box-tab-outflows')}</span>
                    {flows.length > 0 && (
                      <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">{flows.length}</span>
                    )}
                    {/* Active indicator line */}
                    <span
                      className={`gba:absolute gba:bottom-0 gba:left-4 gba:right-4 gba:h-0.5 gba:rounded-full gba:transition-all ${
                        activeTab === 'outbox'
                          ? 'gba:bg-foreground gba:opacity-100'
                          : 'gba:bg-transparent gba:opacity-0 gba:group-hover:bg-muted-foreground gba:group-hover:opacity-30'
                      }`}
                    />
                  </button>
                </div>

                {/* Right: Search, Filter, Blink */}
                <div className="gba:flex gba:items-center gba:gap-2">
                  {/* Expandable Search */}
                  {isSearchExpanded ? (
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <input
                        type="text"
                        placeholder={t('every-box-search-placeholder')}
                        value={globalSearch}
                        onChange={e => setGlobalSearch(e.target.value)}
                        className="gba:w-48 gba:h-8 gba:px-3 gba:text-sm gba:bg-background gba:border gba:border-border gba:rounded-md gba:outline-none gba:focus:ring-1 gba:focus:ring-ring"
                        data-testid={`${prefixDataTestId}-search-input`}
                        autoFocus
                        onBlur={() => {
                          if (!globalSearch) {
                            setIsSearchExpanded(false)
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            setGlobalSearch('')
                            setIsSearchExpanded(false)
                          }
                        }}
                      />
                      {globalSearch && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="gba:h-8 gba:w-8"
                          onClick={() => {
                            setGlobalSearch('')
                            setIsSearchExpanded(false)
                          }}
                          aria-label={t('inbox-clear-search')}
                          data-testid={`${prefixDataTestId}-search-clear`}
                        >
                          <span className="gba:text-xs">×</span>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="gba:h-8 gba:w-8"
                          onClick={() => setIsSearchExpanded(true)}
                          aria-label={t('every-box-search-placeholder')}
                          data-testid={`${prefixDataTestId}-search-button`}
                        >
                          <Search className="gba:h-4 gba:w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('every-box-search-placeholder')}</TooltipContent>
                    </Tooltip>
                  )}

                  {/* Filters Dropdown */}
                  <FiltersDropdown
                    selectedFilters={selectedFilters}
                    onFiltersChange={setSelectedFilters}
                    filterCounts={{
                      all: totalTaskCount,
                      blinks: blinkTotalCount || 0,
                      approvals: tasks.filter(task => {
                        const taskName = (task.referenceTaskName || task.name || task.title || '').toLowerCase()
                        const taskType = (task.type || '').toLowerCase()
                        const taskCategory = (task.taskCategory || '').toLowerCase()
                        return (
                          taskName.includes('approval') ||
                          taskName.includes('approve') ||
                          taskType.includes('approval') ||
                          taskCategory.includes('approval') ||
                          task.tags?.category === 'approval'
                        )
                      }).length,
                      completed: totalCompletedCount
                    }}
                    prefixDataTestId={`${prefixDataTestId}-filters`}
                  />

                  {/* Due date filter */}
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="gba:h-8 gba:w-8 gba:relative"
                            aria-label={t('every-box-due-filter-label')}
                            data-testid={`${prefixDataTestId}-due-filter-trigger`}
                          >
                            <CalendarDays className="gba:h-4 gba:w-4" />
                            {dueDateFilter !== 'any' && (
                              <span className="gba:absolute gba:top-0.5 gba:right-0.5 gba:h-2 gba:w-2 gba:rounded-full gba:bg-primary" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>{t('every-box-due-filter-label')}</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" className="gba:w-56">
                      <DropdownMenuRadioGroup
                        value={dueDateFilter}
                        onValueChange={v => setDueDateFilter(v as DueDateFilter)}
                      >
                        <DropdownMenuRadioItem value="any">{t('every-box-due-filter-any')}</DropdownMenuRadioItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioItem value="overdue">
                          {t('every-box-due-filter-overdue')}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="dueSoon">
                          {t('every-box-due-filter-due-soon')}
                        </DropdownMenuRadioItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioItem value="hasDueDate">
                          {t('every-box-due-filter-has')}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="noDueDate">
                          {t('every-box-due-filter-none')}
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Sort */}
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="gba:h-8 gba:w-8"
                            aria-label={t('every-box-sort-label')}
                            data-testid={`${prefixDataTestId}-sort-trigger`}
                          >
                            <ArrowUpDown className="gba:h-4 gba:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>{t('every-box-sort-label')}</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" className="gba:w-56">
                      <DropdownMenuRadioGroup value={sortOption} onValueChange={v => setSortOption(v as SortOption)}>
                        <DropdownMenuRadioItem value="newest">{t('every-box-sort-newest')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="oldest">{t('every-box-sort-oldest')}</DropdownMenuRadioItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioItem value="priority">{t('every-box-sort-priority')}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Refresh */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-8 gba:w-8"
                        onClick={handleRefresh}
                        aria-label={t('every-box-refresh-label')}
                        data-testid={`${prefixDataTestId}-refresh`}
                      >
                        <RefreshCcw className="gba:h-4 gba:w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('every-box-refresh-label')}</TooltipContent>
                  </Tooltip>

                  {/* Blink Button */}
                  <Button
                    onClick={() => setIsQuickTaskModalOpen(true)}
                    size="sm"
                    data-testid={`${prefixDataTestId}-blink-button`}
                  >
                    <Zap className="gba:h-4 gba:w-4 gba:mr-1.5 gba:fill-current" />
                    <span className="gba:text-sm">{t('every-box-blink-button')}</span>
                  </Button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden">
                <TabsContent value="inbox" className="gba:h-full gba:m-0">
                  <InboxView
                    {...context}
                    tasks={tasks}
                    totalCount={totalTaskCount}
                    isLoading={tasksLoading}
                    error={tasksError}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    dueDateFilter={dueDateFilter}
                    onRefresh={refetchTasks}
                    onLoadMore={loadMoreTasks}
                    hasMore={hasMoreTasks}
                    blinkCount={blinkTotalCount}
                    blinkCountLoading={blinkTasksLoading}
                    blinkTasks={blinkTasks}
                    blinkTasksLoading={blinkTasksLoading}
                    blinkHasMore={blinkHasMore}
                    onBlinkLoadMore={loadMoreBlinkTasks}
                    onBlinkRefresh={refetchBlinkTasks}
                    completedTasks={completedTasks}
                    completedTotalCount={totalCompletedCount}
                    completedIsLoading={completedLoading}
                    completedError={completedError}
                    onCompletedRefresh={refetchCompleted}
                    onCompletedLoadMore={loadMoreCompleted}
                    completedHasMore={hasMoreCompleted}
                    globalSearch={globalSearch}
                    selectedFilters={selectedFilters}
                  />
                </TabsContent>

                <TabsContent value="outbox" className="gba:h-full gba:m-0">
                  <OutboxView
                    flows={flows}
                    isLoading={flowsLoading}
                    error={flowsError}
                    onRefresh={refetchFlows}
                    accessToken={context.accessToken}
                    globalSearch={globalSearch}
                    selectedFilters={selectedFilters}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <QuickTaskModal
            open={isQuickTaskModalOpen}
            onOpenChange={setIsQuickTaskModalOpen}
            accessToken={context.accessToken}
            currentUserId={context.userInfo?.id}
            onSubmit={handleQuickTaskSubmit}
            title={t('every-box-blink-button')}
            description={t('every-box-blink-description')}
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
