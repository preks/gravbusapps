import { memo, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import type {
  SpreadsheetTraceEvent,
  SpreadsheetTraceFinding,
  SpreadsheetTraceScope,
  SpreadsheetTraceSession
} from '../services/spreadsheetDiagnostics'
import { SPREADSHEET_TRACE_SCOPE_OPTIONS, SPREADSHEET_TRACE_TTL_OPTIONS } from '../services/spreadsheetDiagnostics'

type EventSourceFilter = 'all' | 'server' | 'client'
type SortDirection = 'asc' | 'desc'
type EventIdentityFilter = 'all' | string

type SpreadsheetDiagnosticsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTraceSession: SpreadsheetTraceSession | null
  scope: SpreadsheetTraceScope
  ttlMinutes: number
  isStarting: boolean
  isStopping: boolean
  isRefreshing: boolean
  traceSessions: SpreadsheetTraceSession[]
  selectedTraceSessionId?: string | null
  events: SpreadsheetTraceEvent[]
  findings: SpreadsheetTraceFinding[]
  currentUserId?: string | null
  currentTabId?: string | null
  onScopeChange: (scope: SpreadsheetTraceScope) => void
  onTtlChange: (ttlMinutes: number) => void
  onStartTrace: () => void
  onStopTrace: () => void
  onRefresh: () => void
  onClearDisplayedData: () => void
  onSelectTraceSession: (traceSessionId: string) => void
  testId: string
}

const renderJson = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return String(value ?? '')
  }
}

const matchesSearch = (parts: unknown[], query: string): boolean => {
  if (!query) return true
  const haystack = parts
    .map(part => (typeof part === 'string' ? part : renderJson(part)))
    .join('\n')
    .toLowerCase()
  return haystack.includes(query)
}

const compareCreatedAt = (
  left: { createdAt: string },
  right: { createdAt: string },
  sortDirection: SortDirection
): number => {
  const leftTime = Date.parse(left.createdAt)
  const rightTime = Date.parse(right.createdAt)
  return sortDirection === 'asc' ? leftTime - rightTime : rightTime - leftTime
}

const formatTraceScope = (scope: SpreadsheetTraceScope): string =>
  SPREADSHEET_TRACE_SCOPE_OPTIONS.find(option => option.value === scope)?.label ?? scope

const formatTraceUser = (value: string): string => {
  if (/^[0-9a-f-]{32,}$/i.test(value)) return `${value.slice(0, 8)}...`
  return value.length > 28 ? `${value.slice(0, 28)}...` : value
}

const formatTraceSessionOption = (session: SpreadsheetTraceSession): string => {
  const endedAt = session.stoppedAt ?? session.expiresAt
  const status = session.stoppedAt
    ? 'Stopped'
    : new Date(session.expiresAt).getTime() <= Date.now()
      ? 'Expired'
      : 'Active'
  const startedBy = session.startedByUserName?.trim() || formatTraceUser(session.startedByUserId)
  return `${status} ${new Date(endedAt).toLocaleTimeString()} · ${formatTraceScope(session.scope)} · by ${formatTraceUser(
    startedBy
  )}`
}

export const SpreadsheetDiagnosticsDialog = memo(function SpreadsheetDiagnosticsDialog({
  open,
  onOpenChange,
  activeTraceSession,
  scope,
  ttlMinutes,
  isStarting,
  isStopping,
  isRefreshing,
  traceSessions,
  selectedTraceSessionId,
  events,
  findings,
  currentUserId,
  currentTabId,
  onScopeChange,
  onTtlChange,
  onStartTrace,
  onStopTrace,
  onRefresh,
  onClearDisplayedData,
  onSelectTraceSession,
  testId
}: SpreadsheetDiagnosticsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<EventSourceFilter>('all')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [tabFilter, setTabFilter] = useState<EventIdentityFilter>('all')
  const [actorFilter, setActorFilter] = useState<EventIdentityFilter>('all')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [sourceOptionSearch, setSourceOptionSearch] = useState('')
  const [eventTypeOptionSearch, setEventTypeOptionSearch] = useState('')
  const [expandedPayloadIds, setExpandedPayloadIds] = useState<Set<string>>(() => new Set())
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const hasDisplayedData = selectedTraceSessionId != null || events.length > 0 || findings.length > 0
  const canRefreshDisplayedData = activeTraceSession != null || selectedTraceSessionId != null
  const sourceOptions = useMemo(
    () =>
      [
        { value: 'all' as const, label: 'All sources' },
        { value: 'server' as const, label: 'Server' },
        { value: 'client' as const, label: 'Client' }
      ].filter(option => option.label.toLowerCase().includes(sourceOptionSearch.trim().toLowerCase())),
    [sourceOptionSearch]
  )
  const eventCountByStage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const event of events) {
      counts.set(event.stage, (counts.get(event.stage) ?? 0) + 1)
    }
    return Array.from(counts.entries()).slice(0, 10)
  }, [events])
  const eventTypeOptions = useMemo(() => {
    const stages = Array.from(new Set(events.map(event => event.stage).filter(Boolean)))
    const query = eventTypeOptionSearch.trim().toLowerCase()
    return stages.sort((a, b) => a.localeCompare(b)).filter(stage => stage.toLowerCase().includes(query))
  }, [eventTypeOptionSearch, events])
  const tabOptions = useMemo(
    () => Array.from(new Set(events.map(event => event.tabId).filter((tabId): tabId is string => Boolean(tabId)))),
    [events]
  )
  const actorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          events.map(event => event.actorUserId).filter((actorUserId): actorUserId is string => Boolean(actorUserId))
        )
      ),
    [events]
  )
  const filteredEvents = useMemo(
    () =>
      events
        .filter(event => {
          if (sourceFilter !== 'all' && event.source !== sourceFilter) return false
          if (eventTypeFilter !== 'all' && event.stage !== eventTypeFilter) return false
          if (tabFilter !== 'all' && event.tabId !== tabFilter) return false
          if (actorFilter !== 'all' && event.actorUserId !== actorFilter) return false
          return matchesSearch(
            [
              event.stage,
              event.source,
              event.severity,
              event.eventType,
              event.operationType,
              event.batchId,
              event.traceId,
              event.actorUserId,
              event.sessionId,
              event.tabId,
              event.payload
            ],
            normalizedSearchQuery
          )
        })
        .sort((left, right) => compareCreatedAt(left, right, sortDirection)),
    [actorFilter, eventTypeFilter, events, normalizedSearchQuery, sortDirection, sourceFilter, tabFilter]
  )
  const filteredFindings = useMemo(
    () =>
      findings
        .filter(finding => {
          if (sourceFilter !== 'all') return false
          if (eventTypeFilter !== 'all' && finding.findingType !== eventTypeFilter) return false
          return matchesSearch(
            [finding.findingType, finding.severity, finding.message, finding.batchId, finding.traceId, finding.details],
            normalizedSearchQuery
          )
        })
        .sort((left, right) => compareCreatedAt(left, right, sortDirection)),
    [eventTypeFilter, findings, normalizedSearchQuery, sortDirection, sourceFilter]
  )
  const togglePayload = (id: string): void => {
    setExpandedPayloadIds(current => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-6xl gba:w-[min(96vw,1200px)] gba:h-[min(88vh,860px)] gba:flex gba:flex-col">
        <DialogHeader>
          <DialogTitle>Spreadsheet diagnostics</DialogTitle>
        </DialogHeader>

        <div className="gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3">
          <div className="gba:flex gba:flex-nowrap gba:items-center gba:gap-3">
            <div className="gba:flex gba:min-w-0 gba:flex-wrap gba:items-center gba:gap-2">
              <Badge variant={activeTraceSession ? 'default' : 'secondary'}>
                {activeTraceSession ? 'Tracing active' : 'Tracing off'}
              </Badge>
              {activeTraceSession && (
                <>
                  <Badge variant="outline">{formatTraceScope(activeTraceSession.scope)}</Badge>
                  <Badge variant="outline">TTL {activeTraceSession.ttlMinutes} min</Badge>
                  <span className="gba:text-xs gba:text-muted-foreground">
                    Expires {new Date(activeTraceSession.expiresAt).toLocaleString()}
                  </span>
                </>
              )}
              {currentUserId && <Badge variant="outline">user {formatTraceUser(currentUserId)}</Badge>}
              {currentTabId && <Badge variant="outline">tab {formatTraceUser(currentTabId)}</Badge>}
            </div>

            <div className="gba:ml-auto gba:flex gba:flex-nowrap gba:items-center gba:justify-end gba:gap-3">
              <div className="gba:w-[260px] gba:shrink-0">
                <Select value={scope} onValueChange={value => onScopeChange(value as SpreadsheetTraceScope)}>
                  <SelectTrigger
                    size="sm"
                    className="gba:w-full gba:rounded-r-none"
                    data-testid={`${testId}-scope-select`}
                  >
                    <SelectValue placeholder="Choose scope" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPREADSHEET_TRACE_SCOPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="gba:w-[130px] gba:shrink-0">
                <Select value={String(ttlMinutes)} onValueChange={value => onTtlChange(Number(value))}>
                  <SelectTrigger
                    size="sm"
                    className="gba:-ml-px gba:w-full gba:rounded-l-none"
                    data-testid={`${testId}-ttl-select`}
                  >
                    <SelectValue placeholder="TTL" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPREADSHEET_TRACE_TTL_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="gba:mt-2 gba:flex gba:flex-nowrap gba:items-center gba:justify-between gba:gap-3 gba:border-t gba:border-border/60 gba:pt-2">
            <div className="gba:flex gba:w-[265px] gba:min-w-0 gba:flex-nowrap gba:items-center gba:gap-2">
              {!activeTraceSession && traceSessions.length > 0 && (
                <>
                  <span className="gba:shrink-0 gba:text-xs gba:text-muted-foreground">Past sessions</span>
                  <div className="gba:min-w-0 gba:flex-1">
                    <Select value={selectedTraceSessionId ?? ''} onValueChange={onSelectTraceSession}>
                      <SelectTrigger size="sm" className="gba:w-full" data-testid={`${testId}-trace-session-select`}>
                        <SelectValue placeholder="Select past session" />
                      </SelectTrigger>
                      <SelectContent>
                        {traceSessions.map(session => (
                          <SelectItem key={session.id} value={session.id}>
                            {formatTraceSessionOption(session)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <div className="gba:ml-auto gba:flex gba:shrink-0 gba:flex-nowrap gba:items-center gba:justify-end gba:gap-2">
              <Button size="sm" onClick={onStartTrace} disabled={isStarting} data-testid={`${testId}-start-trace`}>
                {isStarting ? 'Starting...' : 'Start trace'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onStopTrace}
                disabled={!activeTraceSession || isStopping}
                data-testid={`${testId}-stop-trace`}
              >
                {isStopping ? 'Stopping...' : 'Stop trace'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onRefresh}
                disabled={!canRefreshDisplayedData || isRefreshing}
                data-testid={`${testId}-refresh-trace`}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearDisplayedData}
                disabled={!hasDisplayedData}
                data-testid={`${testId}-clear-displayed-data`}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="timeline" className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col">
          <div className="gba:mt-3 gba:flex gba:flex-col gba:gap-2">
            <div className="gba:flex gba:flex-nowrap gba:items-center gba:gap-2">
              <TabsList className="gba:w-fit gba:shrink-0">
                <TabsTrigger value="timeline" data-testid={`${testId}-tab-timeline`}>
                  Timeline ({filteredEvents.length}
                  {filteredEvents.length !== events.length ? `/${events.length}` : ''})
                </TabsTrigger>
                <TabsTrigger value="findings" data-testid={`${testId}-tab-findings`}>
                  Findings ({filteredFindings.length}
                  {filteredFindings.length !== findings.length ? `/${findings.length}` : ''})
                </TabsTrigger>
                <TabsTrigger value="summary" data-testid={`${testId}-tab-summary`}>
                  Summary
                </TabsTrigger>
              </TabsList>
              <div className="gba:ml-auto gba:flex gba:flex-nowrap gba:items-center gba:justify-end gba:gap-2">
                <Select value={sourceFilter} onValueChange={value => setSourceFilter(value as EventSourceFilter)}>
                  <SelectTrigger size="sm" className="gba:w-[180px]" data-testid={`${testId}-source-filter`}>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="gba:p-2">
                      <input
                        value={sourceOptionSearch}
                        onChange={event => setSourceOptionSearch(event.target.value)}
                        onKeyDown={event => event.stopPropagation()}
                        placeholder="Search sources..."
                        className="gba:h-8 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-2 gba:text-sm gba:outline-none"
                        data-testid={`${testId}-source-filter-search`}
                      />
                    </div>
                    {sourceOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger size="sm" className="gba:w-[180px]" data-testid={`${testId}-event-type-filter`}>
                    <SelectValue placeholder="Event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="gba:p-2">
                      <input
                        value={eventTypeOptionSearch}
                        onChange={event => setEventTypeOptionSearch(event.target.value)}
                        onKeyDown={event => event.stopPropagation()}
                        placeholder="Search event types..."
                        className="gba:h-8 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-2 gba:text-sm gba:outline-none"
                        data-testid={`${testId}-event-type-filter-search`}
                      />
                    </div>
                    <SelectItem value="all">All event types</SelectItem>
                    {eventTypeOptions.map(stage => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tabFilter} onValueChange={setTabFilter}>
                  <SelectTrigger size="sm" className="gba:w-[150px]" data-testid={`${testId}-tab-filter`}>
                    <SelectValue placeholder="Tab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tabs</SelectItem>
                    {tabOptions.map(tabId => (
                      <SelectItem key={tabId} value={tabId}>
                        Tab {formatTraceUser(tabId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={actorFilter} onValueChange={setActorFilter}>
                  <SelectTrigger size="sm" className="gba:w-[170px]" data-testid={`${testId}-actor-filter`}>
                    <SelectValue placeholder="Participant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All participants</SelectItem>
                    {actorOptions.map(actorUserId => (
                      <SelectItem key={actorUserId} value={actorUserId}>
                        User {formatTraceUser(actorUserId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="gba:flex gba:flex-nowrap gba:items-center gba:justify-end gba:gap-2">
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search stage, batch, trace, tab, payload..."
                className="gba:h-9 gba:w-[min(100%,520px)] gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm gba:outline-none focus:gba:ring-2 focus:gba:ring-ring"
                data-testid={`${testId}-search`}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSortDirection(current => (current === 'desc' ? 'asc' : 'desc'))}
                aria-label={sortDirection === 'desc' ? 'Sort ascending' : 'Sort descending'}
                title={sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}
                data-testid={`${testId}-sort-toggle`}
              >
                {sortDirection === 'desc' ? '↓' : '↑'}
              </Button>
            </div>
          </div>

          <TabsContent value="timeline" className="gba:flex-1 gba:min-h-0 gba:overflow-auto gba:mt-3">
            <div className="gba:flex gba:flex-col gba:gap-3">
              {filteredEvents.length === 0 && (
                <div className="gba:rounded-md gba:border gba:border-dashed gba:p-4 gba:text-sm gba:text-muted-foreground">
                  {events.length === 0 ? 'No trace events captured yet.' : 'No trace events match the current search.'}
                </div>
              )}
              {filteredEvents.map(event => {
                const isPayloadExpanded = expandedPayloadIds.has(event.id)
                return (
                  <div
                    key={event.id}
                    className="gba:rounded-md gba:border gba:border-border/60 gba:bg-background gba:p-3 gba:space-y-2"
                  >
                    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                      <Badge
                        variant={
                          event.severity === 'error'
                            ? 'destructive'
                            : event.severity === 'warning'
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        {event.stage}
                      </Badge>
                      <Badge variant="outline">{event.source}</Badge>
                      {event.operationType && <Badge variant="outline">{event.operationType}</Badge>}
                      {event.batchId && <Badge variant="outline">batch {event.batchId}</Badge>}
                      {event.traceId && <Badge variant="outline">trace {event.traceId}</Badge>}
                      {event.tabId && <Badge variant="outline">tab {formatTraceUser(event.tabId)}</Badge>}
                      {event.actorUserId && <Badge variant="outline">user {formatTraceUser(event.actorUserId)}</Badge>}
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePayload(event.id)}
                        data-testid={`${testId}-event-payload-toggle`}
                      >
                        {isPayloadExpanded ? 'Hide payload' : 'Show payload'}
                      </Button>
                    </div>
                    {isPayloadExpanded && (
                      <pre className="gba:overflow-auto gba:rounded-md gba:bg-muted/20 gba:p-3 gba:text-xs">
                        {renderJson(event.payload)}
                      </pre>
                    )}
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="findings" className="gba:flex-1 gba:min-h-0 gba:overflow-auto gba:mt-3">
            <div className="gba:flex gba:flex-col gba:gap-3">
              {filteredFindings.length === 0 && (
                <div className="gba:rounded-md gba:border gba:border-dashed gba:p-4 gba:text-sm gba:text-muted-foreground">
                  {findings.length === 0
                    ? 'No diagnostics findings detected for the current trace.'
                    : 'No diagnostics findings match the current search.'}
                </div>
              )}
              {filteredFindings.map(finding => {
                const isPayloadExpanded = expandedPayloadIds.has(finding.id)
                return (
                  <div
                    key={finding.id}
                    className="gba:rounded-md gba:border gba:border-border/60 gba:bg-background gba:p-3 gba:space-y-2"
                  >
                    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                      <Badge
                        variant={
                          finding.severity === 'error'
                            ? 'destructive'
                            : finding.severity === 'warning'
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        {finding.findingType}
                      </Badge>
                      {finding.batchId && <Badge variant="outline">batch {finding.batchId}</Badge>}
                      {finding.traceId && <Badge variant="outline">trace {finding.traceId}</Badge>}
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {new Date(finding.createdAt).toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePayload(finding.id)}
                        data-testid={`${testId}-finding-details-toggle`}
                      >
                        {isPayloadExpanded ? 'Hide details' : 'Show details'}
                      </Button>
                    </div>
                    <p className="gba:text-sm">{finding.message}</p>
                    {isPayloadExpanded && (
                      <pre className="gba:overflow-auto gba:rounded-md gba:bg-muted/20 gba:p-3 gba:text-xs">
                        {renderJson(finding.details)}
                      </pre>
                    )}
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="gba:flex-1 gba:min-h-0 gba:overflow-auto gba:mt-3">
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-3">
              <div className="gba:rounded-md gba:border gba:border-border/60 gba:bg-background gba:p-3">
                <h3 className="gba:font-medium gba:mb-2">Trace session</h3>
                <pre className="gba:overflow-auto gba:rounded-md gba:bg-muted/20 gba:p-3 gba:text-xs">
                  {renderJson(activeTraceSession)}
                </pre>
              </div>
              <div className="gba:rounded-md gba:border gba:border-border/60 gba:bg-background gba:p-3">
                <h3 className="gba:font-medium gba:mb-2">Stage counts</h3>
                <div className="gba:flex gba:flex-col gba:gap-2">
                  {eventCountByStage.map(([stage, count]) => (
                    <div key={stage} className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                      <span className="gba:text-muted-foreground">{stage}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                  {eventCountByStage.length === 0 && (
                    <span className="gba:text-sm gba:text-muted-foreground">No stage counts yet.</span>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
})
