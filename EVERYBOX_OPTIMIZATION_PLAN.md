# EveryBox Optimization Implementation Plan

## Problem Statement

Current implementation fetches 1,000 tasks per source (2,000 total) to enable cross-source sorting and pagination. This creates significant backend load, especially with 15-second polling intervals.

**Backend Constraint:** Maximum 50 records per API request.

## Solution: Smart Buffered Pagination

### Core Strategy

- Fetch 50 from each source (100 total per request)
- Merge and sort client-side
- Show 50 to user, keep 50 in buffer
- Use smart proportional fetching based on learned distribution

### Phase 1: Update Fetch Limits (Week 1 - Day 1-2)

#### 1.1 Update UnifiedTaskService

**File:** `src/business-apps/core/every/apps/every-api/services/UnifiedTaskService.ts`

```typescript
// Change from 1000 to dynamic limits
const DEFAULT_FETCH_LIMIT = 50
const BUFFER_MULTIPLIER = 2 // Fetch 2× what we show for better sorting

export async function fetchAllUserTasks(
  userId: string,
  accessToken?: string,
  filters?: Partial<TaskFilters>
): Promise<FetchTasksResult> {
  const parsedFilters = parseFilters(filters)

  // Calculate fetch limits (respecting backend constraints)
  const requestedLimit = parsedFilters.limit
  const fetchLimit = Math.min(requestedLimit * BUFFER_MULTIPLIER, 50) // Max 50 per source

  // Fetch with limited size
  const cflowParams: Record<string, string> = {
    limit: fetchLimit.toString(),
    sortBy: parsedFilters.sortBy || 'createdAt',
    sortOrder: parsedFilters.sortOrder || 'desc'
  }

  const kogitoParams = {
    pageSize: fetchLimit,
    sortBy: mapSortField(parsedFilters.sortBy),
    sortOrder: parsedFilters.sortOrder === 'asc' ? ('ASC' as const) : ('DESC' as const)
  }

  // Fetch from both sources
  // ... existing parallel fetch logic

  // Merge and sort
  const merged = mergeAndSort(cflowTasks, kogitoTasks, parsedFilters)

  // Return requested page size + buffer
  const visible = merged.slice(0, requestedLimit)
  const buffer = merged.slice(requestedLimit, requestedLimit * 2)

  return {
    tasks: visible,
    buffer: buffer, // New: Return buffer for client-side pagination
    totalCount: merged.length, // Approximate count
    hasMore: merged.length >= requestedLimit * 2, // Might have more
    errors,
    warnings
  }
}
```

#### 1.2 Update Hook Interfaces

**File:** `src/business-apps/platform/apps/every-box/hooks/useInboxTasks.ts`

```typescript
interface UseInboxTasksResult {
  tasks: UnifiedTask[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  approximateCount: boolean // New: Indicate count is approximate
}

export const useInboxTasks = (context: BusinessAppContextProps): UseInboxTasksResult => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [buffer, setBuffer] = useState<UnifiedTask[]>([]) // New: Local buffer
  const [totalCount, setTotalCount] = useState(0)
  const [approximateCount, setApproximateCount] = useState(true) // New

  const ITEMS_PER_PAGE = 50

  const loadTasks = useCallback(
    async (append = false) => {
      // ... existing validation

      const response = await fetchAllUserTasks(userId, context.accessToken || '', {
        assignedOnly: true,
        limit: ITEMS_PER_PAGE,
        offset: append ? currentOffset : 0,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })

      // Store buffer for instant pagination
      if (!append) {
        setBuffer(response.buffer || [])
      }

      setTasks(prev => (append ? [...prev, ...response.tasks] : response.tasks))
      setTotalCount(response.totalCount)
      setApproximateCount(response.approximateCount || true)
    },
    [userId, context.accessToken, currentOffset]
  )

  const loadMore = useCallback(async () => {
    // Try to load from buffer first (instant, no API call)
    if (buffer.length > 0) {
      const nextBatch = buffer.slice(0, ITEMS_PER_PAGE)
      const remainingBuffer = buffer.slice(ITEMS_PER_PAGE)

      setTasks(prev => [...prev, ...nextBatch])
      setBuffer(remainingBuffer)
      setCurrentOffset(prev => prev + nextBatch.length)

      // If buffer is getting low, prefetch more in background
      if (remainingBuffer.length < ITEMS_PER_PAGE) {
        loadTasks(true).catch(console.error)
      }

      return
    }

    // Buffer empty - fetch from API
    await loadTasks(true)
  }, [buffer, loadTasks])

  return {
    tasks,
    totalCount,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore: buffer.length > 0 || currentOffset < totalCount,
    approximateCount
  }
}
```

### Phase 2: Smart Distribution Learning (Week 1 - Day 3-4)

#### 2.1 Add Distribution Tracker

**File:** `src/business-apps/core/every/apps/every-api/services/UnifiedTaskService.ts`

```typescript
// Track source distribution over time
interface SourceDistribution {
  cflow: number
  kogito: number
  lastUpdated: Date
  sampleSize: number
}

// Store in localStorage for persistence
const DISTRIBUTION_KEY = 'everybox_source_distribution'

function getDistribution(): SourceDistribution {
  const stored = localStorage.getItem(DISTRIBUTION_KEY)
  if (stored) {
    const parsed = JSON.parse(stored)
    // Use stored if less than 1 hour old
    if (Date.now() - new Date(parsed.lastUpdated).getTime() < 3600000) {
      return parsed
    }
  }

  // Default: 50/50 split
  return {
    cflow: 0.5,
    kogito: 0.5,
    lastUpdated: new Date(),
    sampleSize: 0
  }
}

function updateDistribution(cflowCount: number, kogitoCount: number) {
  const total = cflowCount + kogitoCount
  if (total === 0) return

  const current = getDistribution()

  // Exponential moving average (70% old, 30% new)
  const newDistribution: SourceDistribution = {
    cflow: current.cflow * 0.7 + (cflowCount / total) * 0.3,
    kogito: current.kogito * 0.7 + (kogitoCount / total) * 0.3,
    lastUpdated: new Date(),
    sampleSize: Math.min(current.sampleSize + total, 1000)
  }

  localStorage.setItem(DISTRIBUTION_KEY, JSON.stringify(newDistribution))

  console.log('Updated source distribution:', {
    cflow: `${(newDistribution.cflow * 100).toFixed(1)}%`,
    kogito: `${(newDistribution.kogito * 100).toFixed(1)}%`,
    sampleSize: newDistribution.sampleSize
  })
}

// Use distribution for proportional fetching
export async function fetchAllUserTasks(
  userId: string,
  accessToken?: string,
  filters?: Partial<TaskFilters>
): Promise<FetchTasksResult> {
  const distribution = getDistribution()
  const requestedLimit = parsedFilters.limit

  // Allocate fetch limits proportionally (still respecting 50 max)
  const totalFetch = Math.min(requestedLimit * 2, 100) // 2× buffer
  let cflowLimit = Math.ceil(totalFetch * distribution.cflow)
  let kogitoLimit = Math.ceil(totalFetch * distribution.kogito)

  // Ensure we don't exceed backend limits
  cflowLimit = Math.min(cflowLimit, 50)
  kogitoLimit = Math.min(kogitoLimit, 50)

  console.log('Fetching with learned distribution:', {
    cflow: `${(distribution.cflow * 100).toFixed(1)}% → ${cflowLimit} tasks`,
    kogito: `${(distribution.kogito * 100).toFixed(1)}% → ${kogitoLimit} tasks`
  })

  // Fetch with proportional limits
  const [cflowTasks, kogitoTasks] = await Promise.all([
    fetchCflowUserTasks(userId, accessToken, { limit: cflowLimit.toString() }),
    fetchKogitoUserTasks(userId, accessToken, { pageSize: kogitoLimit })
  ])

  // Update distribution for next time
  updateDistribution(cflowTasks.length, kogitoTasks.length)

  // ... merge and return
}
```

### Phase 3: Smart Polling (Week 1 - Day 5)

#### 3.1 Differential Polling Intervals

**File:** `src/business-apps/platform/apps/every-box/EveryBox.tsx`

```typescript
// Different intervals for different data types
const POLLING_CONFIG = {
  activeTasks: {
    interval: 15000, // 15s - Most important
    enabled: true
  },
  completedTasks: {
    interval: 60000, // 60s - Less urgent
    enabled: true
  },
  outboxFlows: {
    interval: 30000, // 30s - Moderate
    enabled: true
  }
}

export const EveryBox: React.FC<EveryBoxProps> = ({ ...context }) => {
  // Separate interval refs for each data source
  const activeTasksIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const completedTasksIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const outboxFlowsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Set up differential polling
  useEffect(() => {
    // Active tasks - most frequent
    if (POLLING_CONFIG.activeTasks.enabled) {
      activeTasksIntervalRef.current = setInterval(() => {
        console.log('[EveryBox] Polling active tasks')
        refetchTasks()
      }, POLLING_CONFIG.activeTasks.interval)
    }

    // Completed tasks - less frequent
    if (POLLING_CONFIG.completedTasks.enabled) {
      completedTasksIntervalRef.current = setInterval(() => {
        console.log('[EveryBox] Polling completed tasks')
        refetchCompleted()
      }, POLLING_CONFIG.completedTasks.interval)
    }

    // Outbox flows - moderate frequency
    if (POLLING_CONFIG.outboxFlows.enabled) {
      outboxFlowsIntervalRef.current = setInterval(() => {
        console.log('[EveryBox] Polling outbox flows')
        refetchFlows()
      }, POLLING_CONFIG.outboxFlows.interval)
    }

    // Cleanup all intervals
    return () => {
      if (activeTasksIntervalRef.current) clearInterval(activeTasksIntervalRef.current)
      if (completedTasksIntervalRef.current) clearInterval(completedTasksIntervalRef.current)
      if (outboxFlowsIntervalRef.current) clearInterval(outboxFlowsIntervalRef.current)
    }
  }, [refetchTasks, refetchCompleted, refetchFlows])

  // ... rest of component
}
```

### Phase 4: UI Updates (Week 2 - Day 1-2)

#### 4.1 Update Pagination UI for Approximate Counts

**File:** `src/business-apps/platform/apps/every-box/components/InboxView.tsx`

```typescript
// Show approximate count indicator
<div className="gba:flex gba:items-center gba:justify-between gba:pt-4">
  <p className="gba:text-sm gba:text-muted-foreground">
    Showing {filteredTasks.length} of {currentTotalCount}
    {approximateCount && '+'} tasks
  </p>
  {currentHasMore && (
    <Button
      variant="outline"
      onClick={currentOnLoadMore}
      disabled={currentIsLoading}
      data-testid="inbox-load-more-button"
    >
      {currentIsLoading ? 'Loading...' : 'Load More'}
    </Button>
  )}
</div>
```

## Performance Metrics

### Expected Improvements

| Metric                 | Current         | After Phase 1  | After Phase 2         | After Phase 3         |
| ---------------------- | --------------- | -------------- | --------------------- | --------------------- |
| **Initial Load**       | 2,000 records   | 100 records    | 100 records           | 100 records           |
| **Polling (15s)**      | 2,000 records   | 100 records    | 70-90 records         | 70-90 records         |
| **Hourly Load**        | 480,000 records | 24,000 records | 16,800-21,600 records | 10,000-15,000 records |
| **Backend Calls/Hour** | 960 calls       | 960 calls      | 960 calls             | 480 calls             |
| **Data Transfer/Hour** | ~100 MB         | ~5 MB          | ~3.5-4.5 MB           | ~2-3 MB               |

### Accuracy Trade-offs

| Aspect            | Current      | After Optimization | User Impact                               |
| ----------------- | ------------ | ------------------ | ----------------------------------------- |
| **Sort Accuracy** | 100%         | 95-97%             | Minimal - tasks still roughly in order    |
| **Total Count**   | Exact        | Approximate        | Low - users rarely care about exact count |
| **Pagination**    | Perfect      | Good               | None - "Load More" still works smoothly   |
| **Search**        | Cross-source | Cross-source       | None - search still works across both     |

## Testing Strategy

### 1. Unit Tests

- Test merge and sort logic with various distributions
- Test buffer management (load from buffer vs API)
- Test distribution learning algorithm

### 2. Integration Tests

- Test with 0 tasks (empty state)
- Test with <50 tasks (single page)
- Test with 100 tasks (buffer fills exactly)
- Test with 500+ tasks (multiple pages)
- Test with uneven distribution (90/10 split)

### 3. Load Testing

- Simulate 100 concurrent users
- Monitor backend response times
- Measure data transfer reduction
- Verify polling interval compliance

### 4. User Acceptance Testing

- Verify task ordering feels natural
- Verify "Load More" feels responsive
- Verify search works across sources
- Verify filter counts are reasonable

## Rollout Plan

### Week 1

- Days 1-2: Implement Phase 1 (fetch limits)
- Days 3-4: Implement Phase 2 (distribution learning)
- Day 5: Implement Phase 3 (smart polling)

### Week 2

- Days 1-2: Implement Phase 4 (UI updates)
- Days 3-4: Testing and bug fixes
- Day 5: Deploy to staging

### Week 3

- Days 1-2: User acceptance testing
- Days 3-4: Performance monitoring
- Day 5: Deploy to production (phased rollout)

## Monitoring and Alerts

### Key Metrics to Track

- API response times (should improve)
- Data transfer volume (should decrease by 80-90%)
- User engagement (should remain stable)
- Error rates (should remain low)
- Buffer hit rate (should be >70%)

### Success Criteria

- ✅ 80% reduction in data transfer
- ✅ No increase in user-reported issues
- ✅ Page load time <1 second
- ✅ "Load More" feels instant (buffer hits)

## Risk Mitigation

### Risk 1: Sorting feels wrong

- **Mitigation:** Fetch 2× requested amount (100 for 50 shown)
- **Fallback:** Increase buffer multiplier to 3× if needed

### Risk 2: Users with 1000+ tasks

- **Mitigation:** Virtual scrolling (Phase 5)
- **Fallback:** Keep local cache for smooth navigation

### Risk 3: Distribution learning is inaccurate

- **Mitigation:** Use exponential moving average with recent bias
- **Fallback:** Revert to 50/50 split if detection fails

## Future Enhancements (Post-Launch)

### Phase 5: Virtual Scrolling

- Implement `react-window` for large lists
- Render only visible tasks
- Further reduce memory footprint

### Phase 6: Server-Side Unified API

- Create backend endpoint that merges sources
- Eliminate client-side merging complexity
- Enable perfect pagination across sources

### Phase 7: Predictive Prefetching

- Prefetch next page when user scrolls to 80%
- Use ML to predict which tasks user will view
- Cache frequently accessed tasks

## Conclusion

This optimization plan reduces backend load by **80-90%** while maintaining **95%+ accuracy** in sorting and pagination. The solution respects the backend constraint of 50 records per request while providing a smooth user experience through smart buffering and distribution learning.

The implementation is incremental and low-risk, with each phase building on the previous one. Rollback is straightforward at any stage by reverting to the previous fetch limits.
