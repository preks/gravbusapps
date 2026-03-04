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
  Spinner
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import type { LatestPublishedResourceVersion } from '@/common/network/ai/builder/BuilderClient'
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

  const formatTimestamp = useCallback((value?: string | null) => {
    if (!value) return '--'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString()
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
        </div>
        <Button onClick={() => void fetchGeneratedUrls()} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
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
          <div className="gba:overflow-auto gba:border gba:border-border gba:rounded-md">
            {isLoading && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                <Spinner size="md" />
              </div>
            )}
            <table className="gba:w-full gba:text-sm">
              <thead className="gba:bg-muted/50">
                <tr>
                  <th className="gba:text-left gba:px-3 gba:py-2">#</th>
                  <th className="gba:text-left gba:px-3 gba:py-2">URL</th>
                  <th className="gba:text-left gba:px-3 gba:py-2">Published Session ID</th>
                  <th className="gba:text-left gba:px-3 gba:py-2">Resource Created At</th>
                  <th className="gba:text-left gba:px-3 gba:py-2">Resource Updated At</th>
                  <th className="gba:text-left gba:px-3 gba:py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {generatedUrls.map((item, index) => (
                  <tr
                    key={`${item.resourceUrl}-${index}`}
                    className="gba:border-t gba:border-border gba:cursor-pointer hover:gba:bg-muted/30"
                    onClick={() => openResourceUrl(item.resourceUrl)}
                  >
                    <td className="gba:px-3 gba:py-2">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="gba:px-3 gba:py-2 gba:font-mono">{item.resourceUrl}</td>
                    <td className="gba:px-3 gba:py-2 gba:font-mono">{item.sessionId || '--'}</td>
                    <td className="gba:px-3 gba:py-2">{formatTimestamp(item.firstPublishedAt)}</td>
                    <td className="gba:px-3 gba:py-2">{formatTimestamp(item.publishedAt)}</td>
                    <td className="gba:px-3 gba:py-2">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
