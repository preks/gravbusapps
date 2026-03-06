import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import type { LatestPublishedResourceVersion, SessionUsageMetric } from '@/common/network/ai/builder/BuilderClient'
import { navigateTo } from '@/common/utils/navigationUtils'
import { HubPaginationFooter } from '@/business-apps/platform/apps/shared/components/HubPaginationFooter'

const GENERATED_PREFIX = '/platform/generated'
const PAGE_SIZE = 20

type GeneratedResourceUrlsDebugProps = BusinessAppContextProps & {
  'data-testid'?: string
}

export const GeneratedResourceUrlsDebug: React.FC<GeneratedResourceUrlsDebugProps> = ({
  accessToken,
  'data-testid': testId = 'generated-resource-urls-debug'
}) => {
  const builderClient = useBuilderClient(accessToken)
  const [generatedUrls, setGeneratedUrls] = useState<LatestPublishedResourceVersion[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [sessionUsageById, setSessionUsageById] = useState<Record<string, SessionUsageMetric>>({})
  const [isLoadingSessionUsage, setIsLoadingSessionUsage] = useState(false)

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim())
    }, 350)

    return () => {
      globalThis.clearTimeout(timeout)
    }
  }, [searchTerm])

  const fetchGeneratedUrls = useCallback(async () => {
    if (!accessToken) {
      setGeneratedUrls([])
      setTotalCount(0)
      setError('Access token is missing. Open settings and set a valid token to query AI Builder Service.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const offset = (currentPage - 1) * PAGE_SIZE
      const result = await builderClient.listLatestPublishedResources({
        prefix: GENERATED_PREFIX,
        search: debouncedSearchTerm || undefined,
        limit: PAGE_SIZE,
        offset
      })

      setGeneratedUrls(result.data ?? [])
      setTotalCount(result.totalCount ?? 0)
      setLastUpdatedAt(new Date())
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load generated resource URLs'
      setError(message)
      setGeneratedUrls([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, builderClient, currentPage, debouncedSearchTerm])

  useEffect(() => {
    void fetchGeneratedUrls()
  }, [fetchGeneratedUrls])

  const visibleSessionIds = useMemo(
    () =>
      Array.from(
        new Set(
          generatedUrls
            .map(item => item.sessionId)
            .filter((sessionId): sessionId is string => typeof sessionId === 'string' && sessionId.trim().length > 0)
        )
      ),
    [generatedUrls]
  )

  useEffect(() => {
    let isCancelled = false

    if (!accessToken || visibleSessionIds.length === 0) {
      setSessionUsageById({})
      setIsLoadingSessionUsage(false)
      return
    }

    setIsLoadingSessionUsage(true)
    builderClient
      .getSessionUsageMetrics({
        timeframe: 'all',
        sessionIds: visibleSessionIds,
        limit: visibleSessionIds.length
      })
      .then(result => {
        if (isCancelled) return

        const mapped = Object.fromEntries(result.sessions.map(metric => [metric.sessionId, metric]))
        setSessionUsageById(mapped)
      })
      .catch(() => {
        if (isCancelled) return
        setSessionUsageById({})
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingSessionUsage(false)
      })

    return () => {
      isCancelled = true
    }
  }, [accessToken, builderClient, visibleSessionIds])

  const formatTimestamp = useCallback((value?: string | null) => {
    if (!value) return '--'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString()
  }, [])

  const formatTokens = useCallback((value?: number | null) => {
    if (value == null) return '--'
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
  }, [])

  const openResourceUrl = useCallback((resourceUrl: string) => {
    navigateTo(resourceUrl)
  }, [])

  const openSession = useCallback((sessionId: string | null) => {
    if (!sessionId) return
    navigateTo(`/platform/create/screen-builder?sessionId=${encodeURIComponent(sessionId)}`)
  }, [])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount])

  return (
    <div className="gba:p-6 gba:space-y-4" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:space-y-1">
          <h1 className="gba:text-2xl gba:font-semibold">Generated Screen URLs</h1>
          <p className="gba:text-sm gba:text-muted-foreground">
            Data comes from AI Builder latest published versions with prefix <code>{GENERATED_PREFIX}</code>.
          </p>
          <p className="gba:text-xs gba:text-muted-foreground">
            Token usage is sourced from AI Builder session metrics.
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigateTo('/platform/create/ai-builder-metrics')
            }}
          >
            Open Metrics Dashboard
          </Button>
          <Button onClick={() => void fetchGeneratedUrls()} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="gba:gap-3">
          <CardTitle className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <span>Resource URLs</span>
            <Badge variant="secondary">{generatedUrls.length} in current page</Badge>
            <Badge variant="outline">{totalCount} total matched</Badge>
          </CardTitle>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <Input
              value={searchTerm}
              onChange={event => {
                setCurrentPage(1)
                setSearchTerm(event.target.value)
              }}
              placeholder="Extra backend search terms"
              className="gba:max-w-md"
            />
            {lastUpdatedAt && (
              <span className="gba:text-xs gba:text-muted-foreground">
                Updated {lastUpdatedAt.toLocaleTimeString()}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:border gba:border-border gba:rounded-md">
            {isLoading && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                <Spinner size="md" />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Published Session ID</TableHead>
                  <TableHead>Resource Created At</TableHead>
                  <TableHead>Resource Updated At</TableHead>
                  <TableHead>LLM Tokens</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedUrls.map((item, index) => {
                  const sessionUsage = item.sessionId ? sessionUsageById[item.sessionId] : undefined

                  return (
                    <TableRow
                      key={`${item.resourceUrl}-${index}`}
                      className="gba:cursor-pointer hover:gba:bg-muted/30"
                      onClick={() => openResourceUrl(item.resourceUrl)}
                    >
                      <TableCell>{(currentPage - 1) * PAGE_SIZE + index + 1}</TableCell>
                      <TableCell className="gba:font-mono">{item.resourceUrl}</TableCell>
                      <TableCell className="gba:font-mono">{item.sessionId || '--'}</TableCell>
                      <TableCell>{formatTimestamp(item.firstPublishedAt)}</TableCell>
                      <TableCell>{formatTimestamp(item.publishedAt)}</TableCell>
                      <TableCell>
                        {!item.sessionId && '--'}
                        {item.sessionId && !sessionUsage && isLoadingSessionUsage && (
                          <span className="gba:text-xs gba:text-muted-foreground">Loading...</span>
                        )}
                        {item.sessionId && !sessionUsage && !isLoadingSessionUsage && (
                          <span className="gba:text-xs gba:text-muted-foreground">No usage</span>
                        )}
                        {sessionUsage && (
                          <div className="gba:space-y-0.5">
                            <div className="gba:text-xs gba:font-medium">
                              {formatTokens(sessionUsage.totalTokens)} tokens
                            </div>
                            <div className="gba:text-[11px] gba:text-muted-foreground">
                              In {formatTokens(sessionUsage.totalInputTokens)} / Out{' '}
                              {formatTokens(sessionUsage.totalOutputTokens)}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:flex-wrap gba:gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={event => {
                              event.stopPropagation()
                              openResourceUrl(item.resourceUrl)
                            }}
                          >
                            Open Resource
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!item.sessionId}
                            onClick={event => {
                              event.stopPropagation()
                              openSession(item.sessionId)
                            }}
                          >
                            Open Session
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {!isLoading && generatedUrls.length === 0 && (
              <div className="gba:px-3 gba:py-6 gba:text-sm gba:text-muted-foreground">
                No generated resource URLs found for the current filter.
              </div>
            )}
          </div>
          <HubPaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            data-testid={`${testId}-pagination`}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default GeneratedResourceUrlsDebug
