import React, { useEffect, useMemo, useReducer, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentUrlWithUpdatedSearchParams, navigateTo } from '@/common/utils/navigationUtils'
import { FlowDetailView } from '@/common/components/flow/flow-detail'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { useFlowList, type FlowSummary } from '@/common/data/flow/hooks/useFlowList'

export interface MyLaunchesTabProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  'data-testid'?: string
}

const ALL_STATUSES = '_all'

const getStatusBadgeVariant = (status: string): 'success' | 'running' | 'warning' | 'destructive' | 'secondary' => {
  switch (String(status || '').toUpperCase()) {
    case 'COMPLETED':
      return 'success'
    case 'RUNNING':
    case 'IN_PROGRESS':
      return 'running'
    case 'SCHEDULED':
    case 'PAUSED':
      return 'warning'
    case 'FAILED':
    case 'TIMED_OUT':
    case 'TERMINATED':
      return 'destructive'
    default:
      return 'secondary'
  }
}

const formatDateTime = (value?: string): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const readFlowIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('flowId')
}

export const MyLaunchesTab: React.FC<MyLaunchesTabProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'flow-launcher-my-launches'
}) => {
  const userId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(ALL_STATUSES)
  const [urlTick, bumpUrl] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    const onPopState = () => bumpUrl()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const detailFlowId = useMemo(() => {
    void urlTick
    return readFlowIdFromUrl()
  }, [urlTick])

  const openFlowDetails = (flowId: string) => {
    navigateTo(
      getCurrentUrlWithUpdatedSearchParams({
        tab: 'my-launches',
        flowId
      })
    )
  }

  const closeFlowDetails = () => {
    navigateTo(getCurrentUrlWithUpdatedSearchParams({ flowId: null }))
  }

  const { flows, totalCount, loading, error, refetch } = useFlowList('initiated', userId, accessToken || '', {
    searchTerm: search.trim() ? search.trim() : undefined,
    status: status !== ALL_STATUSES ? (status as any) : undefined,
    limit: 20,
    offset: 0
  })

  const sortedFlows = useMemo(() => {
    return [...(flows || [])].sort((a: FlowSummary, b: FlowSummary) => {
      const ta = new Date(a.lastActivityTime || a.updateTime || a.startTime).getTime()
      const tb = new Date(b.lastActivityTime || b.updateTime || b.startTime).getTime()
      return tb - ta
    })
  }, [flows])

  if (!accessToken) {
    return (
      <Alert variant="destructive" data-testid={`${testId}-no-token`}>
        <div className="gba:space-y-2">
          <div className="gba:font-medium">Access token missing</div>
          <div className="gba:text-sm">You must be authenticated to view your launched flows.</div>
        </div>
      </Alert>
    )
  }

  if (!userId) {
    return (
      <Alert variant="destructive" data-testid={`${testId}-no-user`}>
        <div className="gba:space-y-2">
          <div className="gba:font-medium">User identity missing</div>
          <div className="gba:text-sm">We couldn’t determine your user ID to load initiated flows.</div>
        </div>
      </Alert>
    )
  }

  return (
    <Card className="gba:bg-background gba:border gba:border-border" data-testid={testId}>
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div>
            <CardTitle data-testid={`${testId}-title`}>My launches</CardTitle>
            <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-subtitle`}>
              {totalCount} flow{totalCount === 1 ? '' : 's'} initiated by you
            </div>
          </div>
          <Button type="button" variant="outline" onClick={refetch} data-testid={`${testId}-refresh`}>
            Refresh
          </Button>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-3 gba:mt-4" data-testid={`${testId}-filters`}>
          <DebouncedInput
            value={search}
            onChange={setSearch}
            placeholder="Search by flow name or template…"
            className="gba:w-full"
            debounceDelay={300}
            data-testid={`${testId}-search`}
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid={`${testId}-status`}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
              <SelectItem value="RUNNING">Running</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="TERMINATED">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="gba:pt-0">
        {loading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-10" data-testid={`${testId}-loading`}>
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Alert variant="destructive" data-testid={`${testId}-error`}>
            <div className="gba:space-y-2">
              <div className="gba:font-medium">Failed to load your flows</div>
              <div className="gba:text-sm">{error}</div>
            </div>
          </Alert>
        ) : sortedFlows.length === 0 ? (
          <div className="gba:text-sm gba:text-muted-foreground gba:py-6" data-testid={`${testId}-empty`}>
            No launched flows found.
          </div>
        ) : (
          <div className="gba:space-y-3" data-testid={`${testId}-list`}>
            {sortedFlows.map((flow, idx) => (
              <button
                key={flow.flowId}
                type="button"
                className="gba:block gba:w-full gba:text-left gba:!cursor-pointer"
                onClick={() => openFlowDetails(flow.flowId)}
                data-testid={`${testId}-flow-${idx}`}
              >
                <Card className="gba:bg-background gba:border gba:border-border gba:hover:bg-accent/10 gba:transition-colors gba:!cursor-pointer">
                  <CardContent className="gba:p-4 gba:flex gba:flex-col gba:gap-2 gba:!cursor-pointer">
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                      <div className="gba:min-w-0">
                        <div className="gba:font-medium gba:truncate" data-testid={`${testId}-flow-${idx}-name`}>
                          {flow.flowName || flow.templateName || `Flow ${flow.flowId.slice(-8)}`}
                        </div>
                        <div className="gba:text-sm gba:text-muted-foreground gba:truncate">
                          {flow.templateName || flow.templateId}
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(flow.status)} data-testid={`${testId}-flow-${idx}-status`}>
                        {String(flow.status || 'UNKNOWN').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-3 gba:gap-2 gba:text-sm gba:text-muted-foreground">
                      <div data-testid={`${testId}-flow-${idx}-started`}>Started: {formatDateTime(flow.startTime)}</div>
                      <div data-testid={`${testId}-flow-${idx}-updated`}>
                        Updated: {formatDateTime(flow.updateTime)}
                      </div>
                      <div data-testid={`${testId}-flow-${idx}-activity`}>
                        Activity: {formatDateTime(flow.lastActivityTime || flow.updateTime)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog
        open={Boolean(detailFlowId)}
        onOpenChange={open => {
          if (!open) closeFlowDetails()
        }}
      >
        <DialogContent
          className="gba:max-w-[92vw] gba:w-[92vw] gba:h-[92vh] gba:overflow-hidden gba:p-0"
          data-testid={`${testId}-details-dialog`}
        >
          <DialogHeader className="gba:sr-only">
            <DialogTitle>{detailFlowId ? `Flow ${detailFlowId}` : 'Flow details'}</DialogTitle>
          </DialogHeader>

          <div className="gba:h-full gba:overflow-y-auto" data-testid={`${testId}-details-content`}>
            {detailFlowId ? (
              <FlowDetailView flowId={detailFlowId} accessToken={accessToken} showBackButton={false} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default MyLaunchesTab
