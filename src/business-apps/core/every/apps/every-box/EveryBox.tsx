/**
 * EveryBox Component
 * Unified inbox and outbox for all tasks and workflows
 *
 * Updates: SSE invalidation stream (everybox-service), tab visibility refresh, manual refresh,
 * and process-completion events — no timer-based polling.
 *
 * URL Parameters:
 * - view: 'inbox' | 'outbox' - Controls which tab is active
 *   Example: ?view=outbox will open the OutFlows tab
 * - taskId: ID of selected task (InFlows tab)
 *   Example: ?view=inbox&taskId=abc-123
 * - flowId: ID of selected flow (OutFlows tab)
 *   Example: ?view=outbox&flowId=xyz-789
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Inbox, Send, Zap, Search, ArrowUpDown, RefreshCcw, CalendarDays, Sparkles, Brain } from 'lucide-react'
import { FiltersDropdown, FilterType } from './components/FiltersDropdown'
import { EveryBoxHero } from './components/EveryBoxHero'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import {
  EVERYBOX_FIRST_PAGE_LIMIT,
  fetchTasksBootstrapCounts,
  fetchTasksInitialData,
  type FetchTasksBootstrapResult,
  type FetchTasksBootstrapCountsResult
} from '@/business-apps/core/every/apps/every-api'
import type { TaskFilters } from '@/business-apps/core/every/apps/every-api/types'
import { useInboxTasks } from './hooks/useInboxTasks'
import { useOutboxFlows } from './hooks/useOutboxFlows'
import { useCompletedTasks } from './hooks/useCompletedTasks'
import { useBlinkTasks } from './hooks/useBlinkCount'
import { useEveryboxInvalidationStream } from './hooks/useEveryboxInvalidationStream'
import { InboxView } from './components/InboxView'
import { OutboxView } from './components/OutboxView'
import { AiInsightsDashboard } from './components/AiInsightsDashboard'
import { ErrorBoundary } from './components/ErrorBoundary'
import {
  QuickTaskModal,
  QuickTaskFormData,
  QuickTaskFlowService,
  useQuickTaskFileUpload
} from '@/business-apps/flow/common/components/flow-quick-task'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { useAiCapabilities, useAiSearch } from './hooks/useAi'

interface EveryBoxProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

type ViewType = 'inbox' | 'outbox' | 'ai-insights'
type SortOption = 'newest' | 'oldest' | 'priority'
type DueDateFilter = 'any' | 'overdue' | 'dueSoon24h' | 'hasDueDate' | 'noDueDate'

/**
 * Get initial view from URL
 */
const getInitialView = (): ViewType => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const view = urlParams.get('view')
  if (view === 'outbox') return 'outbox'
  if (view === 'ai-insights') return 'ai-insights'
  return 'inbox'
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

export const EveryBox: React.FC<EveryBoxProps> = ({ prefixDataTestId = 'every-box', ...context }) => {
  const { t } = useTranslation(translations)

  // Feature flag guard - EveryBox only available when preview.enabled is true
  const previewFeature = useFeature(Feature.Preview.Enabled.Key)
  const isPreviewEnabled = previewFeature !== false // true if undefined (development) or 'true'

  // AI feature flag and capabilities (enabled by default in development when flag is undefined)
  const aiFeature = useFeature(Feature.EveryBox.AiEnabled.Key)
  const isAiFeatureEnabled = aiFeature === true || aiFeature === 'true' || aiFeature === undefined
  const { capabilities: aiCapabilities } = useAiCapabilities(context.accessToken)
  const showAiFeatures = isAiFeatureEnabled && aiCapabilities?.aiEnabled
  const semanticSearchAvailable = showAiFeatures && aiCapabilities?.semanticSearchAvailable

  // AI Insights feature flag (requires explicit enablement)
  const aiInsightsFeature = useFeature(Feature.EveryBox.AiInsightsEnabled.Key)
  const showAiInsights = (aiInsightsFeature === true || aiInsightsFeature === 'true') && showAiFeatures

  // AI semantic search
  const {
    results: aiSearchResults,
    searchMode: aiSearchMode,
    isSearching: aiIsSearching,
    search: aiSearch,
    clearResults: aiClearResults
  } = useAiSearch(context.accessToken, { limit: 15 })

  // All hooks must be called before any early return to satisfy React's rules of hooks
  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ViewType>(getInitialView())
  const [globalSearch, setGlobalSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<FilterType[]>(['all'])
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>('any')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

  const sortBy = sortOption === 'priority' ? 'priority' : 'createdAt'
  const sortOrder = sortOption === 'oldest' ? 'asc' : sortOption === 'priority' ? 'asc' : 'desc'
  const userId = context.userInfo?.id || ''
  const selectedFilter = selectedFilters[0] || 'all'
  const querySearch = semanticSearchAvailable ? '' : debouncedSearch
  const completedEnabled = activeTab === 'inbox' && selectedFilter === 'completed'
  const blinkEnabled = activeTab === 'inbox' && selectedFilter === 'blinks'
  const bootstrapRequestKey = `${userId}:${querySearch}:${sortBy}:${sortOrder}:${dueDateFilter}`
  const [bootstrapState, setBootstrapState] = useState<{
    key: string
    seedId: string | null
    data: FetchTasksBootstrapResult | null
    isLoading: boolean
  }>({
    key: bootstrapRequestKey,
    seedId: null,
    data: null,
    isLoading: true
  })
  const [countsState, setCountsState] = useState<{
    key: string
    data: FetchTasksBootstrapCountsResult['counts'] | null
    isLoading: boolean
  }>({
    key: bootstrapRequestKey,
    data: null,
    isLoading: true
  })
  /** Coalesce concurrent refetches for the same filter key (Strict Mode + overlapping triggers). */
  const bootstrapInflightRef = useRef<Map<string, Promise<void>>>(new Map())

  const refetchBootstrap = useCallback(async () => {
    if (!userId) {
      setBootstrapState({
        key: bootstrapRequestKey,
        seedId: null,
        data: null,
        isLoading: false
      })
      setCountsState({
        key: bootstrapRequestKey,
        data: null,
        isLoading: false
      })
      return
    }

    const existing = bootstrapInflightRef.current.get(bootstrapRequestKey)
    if (existing) {
      return existing
    }

    const listFilters: Partial<TaskFilters> = {
      ...(querySearch ? { search: querySearch } : {}),
      sortBy: sortBy as TaskFilters['sortBy'],
      sortOrder: sortOrder as TaskFilters['sortOrder'],
      dueFilter: dueDateFilter
    }

    setBootstrapState(prev => ({
      key: bootstrapRequestKey,
      seedId: prev.key === bootstrapRequestKey ? prev.seedId : null,
      data: prev.key === bootstrapRequestKey ? prev.data : null,
      isLoading: true
    }))
    setCountsState(prev => ({
      key: bootstrapRequestKey,
      data: prev.key === bootstrapRequestKey ? prev.data : null,
      isLoading: true
    }))

    const promise = (async () => {
      try {
        const payload = await fetchTasksInitialData(userId, context.accessToken || '', {
          limit: EVERYBOX_FIRST_PAGE_LIMIT,
          ...listFilters
        })
        const seedId = `${bootstrapRequestKey}:${Date.now()}`
        setBootstrapState({
          key: bootstrapRequestKey,
          seedId,
          data: { inbox: payload.inbox },
          isLoading: false
        })
        setCountsState({
          key: bootstrapRequestKey,
          data: payload.counts,
          isLoading: false
        })
      } catch {
        setBootstrapState({
          key: bootstrapRequestKey,
          seedId: null,
          data: null,
          isLoading: false
        })
        setCountsState({
          key: bootstrapRequestKey,
          data: null,
          isLoading: false
        })
      } finally {
        bootstrapInflightRef.current.delete(bootstrapRequestKey)
      }
    })()

    bootstrapInflightRef.current.set(bootstrapRequestKey, promise)
    return promise
  }, [userId, context.accessToken, querySearch, sortBy, sortOrder, dueDateFilter, bootstrapRequestKey])

  useEffect(() => {
    void refetchBootstrap()
  }, [refetchBootstrap])

  const bootstrapData = bootstrapState.key === bootstrapRequestKey ? bootstrapState.data : null
  const bootstrapLoading = bootstrapState.key !== bootstrapRequestKey || bootstrapState.isLoading
  const countsData = countsState.key === bootstrapRequestKey ? countsState.data : null

  const refetchBootstrapCounts = useCallback(async () => {
    if (!userId) {
      setCountsState({
        key: bootstrapRequestKey,
        data: null,
        isLoading: false
      })
      return
    }

    setCountsState(prev => ({
      key: bootstrapRequestKey,
      data: prev.key === bootstrapRequestKey ? prev.data : null,
      isLoading: true
    }))

    try {
      const result = await fetchTasksBootstrapCounts(userId, context.accessToken || '', {
        ...(querySearch ? { search: querySearch } : {}),
        sortBy,
        sortOrder,
        dueFilter: dueDateFilter
      })
      setCountsState({
        key: bootstrapRequestKey,
        data: result.counts,
        isLoading: false
      })
    } catch {
      setCountsState({
        key: bootstrapRequestKey,
        data: null,
        isLoading: false
      })
    }
  }, [userId, context.accessToken, querySearch, sortBy, sortOrder, dueDateFilter, bootstrapRequestKey])

  // Debounce search to avoid firing backend requests on each keystroke
  useEffect(() => {
    const handle = globalThis.setTimeout(() => setDebouncedSearch(globalSearch), 300)
    return () => globalThis.clearTimeout(handle)
  }, [globalSearch])

  // Trigger semantic search when search text changes (with debounce)
  useEffect(() => {
    if (semanticSearchAvailable && debouncedSearch.trim()) {
      aiSearch(debouncedSearch)
    } else {
      aiClearResults()
    }
  }, [debouncedSearch, semanticSearchAvailable, aiSearch, aiClearResults])

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
    // When semantic search is available, don't pass search to regular API - let AI search handle filtering
  } = useInboxTasks(context, {
    search: querySearch,
    sortBy,
    sortOrder,
    dueFilter: dueDateFilter,
    enabled: !bootstrapLoading,
    initialBatch: bootstrapData?.inbox ?? null,
    seedId: bootstrapState.seedId
  })

  // Track which tabs have been visited (lazy-load: only fetch data when tab is first opened)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([getInitialView()]))

  // Fetch outbox flows - DEFERRED until outbox tab is visited
  const outboxEnabled = visitedTabs.has('outbox')
  const {
    flows,
    totalCount: totalOutflowCount,
    isLoading: flowsLoading,
    error: flowsError,
    refetch: refetchFlows,
    backgroundRefresh: backgroundRefreshFlows
  } = useOutboxFlows(context, {
    enabled: outboxEnabled,
    initialTotalCount: countsData?.outflows ?? 0
  })

  // Fetch completed tasks - needed for filter badge counts in inbox view
  const {
    tasks: completedTasks,
    totalCount: totalCompletedCount,
    isLoading: completedLoading,
    error: completedError,
    refetch: refetchCompleted,
    loadMore: loadMoreCompleted,
    hasMore: hasMoreCompleted,
    backgroundRefresh: backgroundRefreshCompleted
    // When semantic search is available, don't pass search to regular API - let AI search handle filtering
  } = useCompletedTasks(context, {
    search: querySearch,
    sortBy,
    sortOrder,
    dueFilter: dueDateFilter,
    enabled: completedEnabled,
    initialTotalCount: countsData?.completed ?? 0
  })

  // Fetch blink tasks using tag filtering (response contains totalCount for badge)
  const {
    tasks: blinkTasks,
    totalCount: blinkTotalCount,
    isLoading: blinkTasksLoading,
    hasMore: blinkHasMore,
    refetch: refetchBlinkTasks,
    loadMore: loadMoreBlinkTasks
  } = useBlinkTasks(context, {
    enabled: blinkEnabled,
    initialTotalCount: countsData?.blinks ?? 0
  })

  const bootstrapInboxLen = bootstrapData?.inbox?.tasks?.length ?? 0
  const awaitingBootstrapHydration =
    Boolean(bootstrapState.seedId) && bootstrapInboxLen > 0 && tasks.length === 0 && !tasksError
  const inboxLoading = tasksLoading || (bootstrapLoading && !bootstrapData) || awaitingBootstrapHydration
  const completedCount = completedEnabled ? totalCompletedCount : (countsData?.completed ?? totalCompletedCount)
  const blinkCount = blinkEnabled ? blinkTotalCount : (countsData?.blinks ?? blinkTotalCount)
  const outflowCount = outboxEnabled ? totalOutflowCount : (countsData?.outflows ?? totalOutflowCount)
  const blinkCountLoading = !blinkEnabled ? countsState.isLoading && !countsData : blinkTasksLoading

  const lastSseRefreshRef = useRef(0)
  const handleStreamInvalidation = useCallback(
    (payload: { changed?: { inbox?: boolean; completed?: boolean; blinks?: boolean; outflows?: boolean } }) => {
      const now = Date.now()
      if (now - lastSseRefreshRef.current < 3000) {
        return
      }
      lastSseRefreshRef.current = now

      const changed = payload.changed
      if (!changed) return

      if (changed.inbox) {
        void refetchBootstrap()
      }
      if (!changed.inbox && (changed.completed || changed.blinks || changed.outflows)) {
        void refetchBootstrapCounts()
      }
      if (changed.completed && selectedFilter === 'completed') {
        void refetchCompleted()
      }
      if (changed.blinks && selectedFilter === 'blinks') {
        void refetchBlinkTasks()
      }
      if (changed.outflows && activeTab === 'outbox') {
        void refetchFlows()
      }
    },
    [
      activeTab,
      selectedFilter,
      refetchBootstrap,
      refetchBootstrapCounts,
      refetchCompleted,
      refetchBlinkTasks,
      refetchFlows
    ]
  )

  useEveryboxInvalidationStream({
    userId,
    accessToken: context.accessToken,
    search: querySearch,
    sortBy,
    sortOrder,
    dueFilter: dueDateFilter,
    enabled: isPreviewEnabled && !bootstrapLoading,
    startDelayMs: 3000,
    onInvalidate: handleStreamInvalidation
  })

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
  // PERF: Wrapped in useCallback — all captured values are stable (state setters + updateViewUrl)
  const handleTabChange = useCallback((value: string) => {
    const newView = value as ViewType
    setActiveTab(newView)
    updateViewUrl(newView)
    // Mark tab as visited to trigger lazy data loading
    setVisitedTabs(prev => {
      if (prev.has(newView)) return prev
      const next = new Set(prev)
      next.add(newView)
      return next
    })
  }, [])

  const handleRefresh = useCallback(async () => {
    if (activeTab === 'outbox') {
      await refetchFlows()
      return
    }

    // inbox tab
    if (selectedFilter === 'completed') {
      await refetchCompleted()
      return
    }
    if (selectedFilter === 'blinks') {
      await refetchBlinkTasks()
      return
    }
    await refetchBootstrap()
  }, [activeTab, selectedFilter, refetchFlows, refetchCompleted, refetchBlinkTasks, refetchBootstrap])

  // Background refresh callbacks in refs for visibility handler (avoids effect churn)
  const bgRefreshInboxRef = useRef(backgroundRefreshInbox)
  bgRefreshInboxRef.current = backgroundRefreshInbox
  const bgRefreshCompletedRef = useRef(backgroundRefreshCompleted)
  bgRefreshCompletedRef.current = backgroundRefreshCompleted
  const bgRefreshFlowsRef = useRef(backgroundRefreshFlows)
  bgRefreshFlowsRef.current = backgroundRefreshFlows

  // When the tab becomes visible again, run a lightweight hook refresh (throttled inside hooks)
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        if (selectedFilter !== 'completed' && selectedFilter !== 'blinks') {
          bgRefreshInboxRef.current()
        }
        if (selectedFilter === 'completed') {
          bgRefreshCompletedRef.current()
        }
        bgRefreshFlowsRef.current()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [selectedFilter])

  // PERF: Store refetch callbacks in refs so the process-completion listener
  // doesn't get torn down and re-added on every filter/sort change
  const refetchBootstrapRef = useRef(refetchBootstrap)
  refetchBootstrapRef.current = refetchBootstrap
  const refetchCompletedRef = useRef(refetchCompleted)
  refetchCompletedRef.current = refetchCompleted

  // Listen for process completion events to refresh task lists
  useEffect(() => {
    if (!isPreviewEnabled) return

    const handleProcessCompletion = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution?: string }>
      const resolution = customEvent.detail?.resolution

      if (resolution === 'success') {
        refetchBootstrapRef.current()
        if (selectedFilter === 'completed') {
          refetchCompletedRef.current()
        }
      }
    }

    window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion)

    return () => {
      window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
    }
  }, [isPreviewEnabled, selectedFilter])

  // Memoize filter counts to avoid .filter() on every render
  const filterCounts = useMemo(
    () => ({
      all: totalTaskCount,
      blinks: blinkCount || 0,
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
      completed: completedCount
    }),
    [tasks, totalTaskCount, blinkCount, completedCount]
  )

  // Handle Quick Task (Blink) submission
  const handleQuickTaskSubmit = useCallback(
    async (data: QuickTaskFormData) => {
      try {
        const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

        let uploadResults: any[] = []
        if (data.documents && data.documents.length > 0) {
          const filesToUpload = data.documents
            .filter(doc => doc.originFileObj && doc.status !== 'error')
            .map(doc => doc.originFileObj!)

          if (filesToUpload.length > 0) {
            try {
              uploadResults = await uploadFiles(filesToUpload)
            } catch (uploadError) {
              toast.error(
                t('blink-upload-error', {
                  error: uploadError instanceof Error ? uploadError.message : 'Unknown error'
                })
              )
              throw uploadError
            }
          }
        }

        await QuickTaskFlowService.executeQuickTask({
          formData: data,
          uploadResults,
          accessToken: context.accessToken,
          initiatorId: context.userInfo?.id || context.userInfo?.employeeDetails?.employeeId || 'unknown',
          apiBaseUrl: baseUrl
        })

        toast.success(t('blink-created-success', { title: data.title }))

        Promise.all([
          refetchBootstrap(),
          // Outbox list only if tab was opened; bootstrap-counts already refreshes outflows badge
          outboxEnabled ? refetchFlows() : Promise.resolve(),
          completedEnabled ? refetchCompleted() : Promise.resolve(),
          blinkEnabled ? refetchBlinkTasks() : Promise.resolve()
        ]).catch(() => {
          // Ignore errors in background refresh
        })
      } catch (error) {
        toast.error(t('blink-created-error', { error: error instanceof Error ? error.message : 'Unknown error' }))
        throw error
      }
    },
    [
      uploadFiles,
      context.accessToken,
      context.userInfo,
      t,
      refetchBootstrap,
      refetchFlows,
      refetchCompleted,
      refetchBlinkTasks,
      completedEnabled,
      blinkEnabled,
      outboxEnabled
    ]
  )

  // Feature flag guard - render null if preview is disabled (after all hooks)
  if (!isPreviewEnabled) {
    return null
  }

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
                    {outflowCount > 0 && (
                      <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">{outflowCount}</span>
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

                  {showAiInsights && (
                    <button
                      onClick={() => handleTabChange('ai-insights')}
                      className={`gba:group gba:relative gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:transition-colors ${
                        activeTab === 'ai-insights'
                          ? 'gba:text-foreground'
                          : 'gba:text-muted-foreground gba:hover:text-foreground'
                      }`}
                      data-testid={`${prefixDataTestId}-ai-insights-tab`}
                      data-state={activeTab === 'ai-insights' ? 'active' : 'inactive'}
                    >
                      <Brain className="gba:h-4 gba:w-4" />
                      <span className="gba:text-sm gba:font-medium">AI Insights</span>
                      {/* Active indicator line */}
                      <span
                        className={`gba:absolute gba:bottom-0 gba:left-4 gba:right-4 gba:h-0.5 gba:rounded-full gba:transition-all ${
                          activeTab === 'ai-insights'
                            ? 'gba:bg-foreground gba:opacity-100'
                            : 'gba:bg-transparent gba:opacity-0 gba:group-hover:bg-muted-foreground gba:group-hover:opacity-30'
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Right: Search, Filter, Blink */}
                <div className="gba:flex gba:items-center gba:gap-2">
                  {/* Expandable Search - AI search filters task list directly */}
                  {isSearchExpanded ? (
                    <div className="gba:relative gba:flex gba:items-center gba:gap-1">
                      <div className="gba:relative">
                        <input
                          type="text"
                          placeholder={
                            semanticSearchAvailable ? t('ai-search-placeholder') : t('every-box-search-placeholder')
                          }
                          value={globalSearch}
                          onChange={e => setGlobalSearch(e.target.value)}
                          className="gba:w-56 gba:h-8 gba:px-3 gba:pr-8 gba:text-sm gba:bg-background gba:border gba:border-border gba:rounded-md gba:outline-none gba:focus:ring-1 gba:focus:ring-ring"
                          data-testid={`${prefixDataTestId}-search-input`}
                          autoFocus
                          onBlur={() => {
                            setTimeout(() => {
                              if (!globalSearch) {
                                setIsSearchExpanded(false)
                              }
                            }, 300)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Escape') {
                              setGlobalSearch('')
                              setIsSearchExpanded(false)
                              aiClearResults()
                            }
                          }}
                        />
                        {/* AI indicator in search input */}
                        {semanticSearchAvailable && (
                          <div className="gba:absolute gba:right-2 gba:top-1/2 gba:-translate-y-1/2 gba:pointer-events-none">
                            {aiIsSearching ? (
                              <div className="gba:h-3.5 gba:w-3.5 gba:rounded-full gba:border-2 gba:border-slate-300 gba:border-t-slate-600 gba:animate-spin" />
                            ) : (
                              <Sparkles className="gba:h-3.5 gba:w-3.5 gba:text-slate-400" />
                            )}
                          </div>
                        )}
                      </div>
                      {globalSearch && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="gba:h-8 gba:w-8"
                          onClick={() => {
                            setGlobalSearch('')
                            setIsSearchExpanded(false)
                            aiClearResults()
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
                    filterCounts={filterCounts}
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
                        <DropdownMenuRadioItem value="dueSoon24h">
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
                    isLoading={inboxLoading}
                    error={tasksError}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onRefresh={refetchTasks}
                    onLoadMore={loadMoreTasks}
                    hasMore={hasMoreTasks}
                    blinkCount={blinkCount}
                    blinkCountLoading={blinkCountLoading}
                    blinkTasks={blinkTasks}
                    blinkTasksLoading={blinkEnabled ? blinkTasksLoading : false}
                    blinkHasMore={blinkHasMore}
                    onBlinkLoadMore={loadMoreBlinkTasks}
                    onBlinkRefresh={refetchBlinkTasks}
                    completedTasks={completedTasks}
                    completedTotalCount={completedCount}
                    completedIsLoading={completedEnabled ? completedLoading : false}
                    completedError={completedError}
                    onCompletedRefresh={refetchCompleted}
                    onCompletedLoadMore={loadMoreCompleted}
                    completedHasMore={hasMoreCompleted}
                    globalSearch={globalSearch}
                    selectedFilters={selectedFilters}
                    // AI Search - filters task list directly
                    aiSearchResults={aiSearchResults}
                    aiSearchMode={aiSearchMode}
                    aiIsSearching={aiIsSearching}
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

                {showAiInsights && (
                  <TabsContent value="ai-insights" className="gba:h-full gba:m-0">
                    <AiInsightsDashboard {...context} />
                  </TabsContent>
                )}
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
