import React, { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import type {
  GlobalSearchAnalyticsOverview,
  GlobalSearchAnalyticsSeedPreset,
  GlobalSearchClickThroughRate,
  GlobalSearchClient,
  GlobalSearchPopularEntity,
  GlobalSearchTopQuery,
  GlobalSearchTrendScore,
  GlobalSearchVolumeBucket,
  GlobalSearchZeroResultQuery
} from '@/common/network/global-search/GlobalSearchClient'
import { formatCount, formatDateTime } from '../utils'

interface AnalyticsTabProps {
  client: GlobalSearchClient
}

interface AnalyticsState {
  overview: GlobalSearchAnalyticsOverview | null
  trendScores: GlobalSearchTrendScore[]
  topQueries: GlobalSearchTopQuery[]
  popularEntities: GlobalSearchPopularEntity[]
  clickThroughRates: GlobalSearchClickThroughRate[]
  searchVolume: GlobalSearchVolumeBucket[]
  zeroResultQueries: GlobalSearchZeroResultQuery[]
}

const EMPTY_STATE: AnalyticsState = {
  overview: null,
  trendScores: [],
  topQueries: [],
  popularEntities: [],
  clickThroughRates: [],
  searchVolume: [],
  zeroResultQueries: []
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ client }) => {
  const [state, setState] = useState<AnalyticsState>(EMPTY_STATE)
  const [seedPreset, setSeedPreset] = useState<GlobalSearchAnalyticsSeedPreset>('MEDIUM')
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [overview, trendScores, topQueries, popularEntities, clickThroughRates, searchVolume, zeroResultQueries] =
        await Promise.all([
          client.getSearchStatistics(),
          client.getTrendScores(15),
          client.getTopQueries(15),
          client.getPopularEntities(15),
          client.getClickThroughRates(),
          client.getSearchVolume(),
          client.getZeroResultQueries(15)
        ])
      setState({
        overview,
        trendScores: trendScores.data,
        topQueries: topQueries.data,
        popularEntities: popularEntities.data,
        clickThroughRates: clickThroughRates.data,
        searchVolume: searchVolume.data,
        zeroResultQueries: zeroResultQueries.data
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Loading analytics failed')
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    loadAnalytics().catch(() => undefined)
  }, [loadAnalytics])

  const seedAnalytics = async () => {
    setIsMutating(true)
    try {
      const result = await client.seedAnalytics(seedPreset)
      setStatusMessage(`Seeded ${result.seeded} events (${result.preset})`)
      await loadAnalytics()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Seeding failed')
    } finally {
      setIsMutating(false)
    }
  }

  const deleteAnalytics = async () => {
    if (!globalThis.confirm('Delete all analytics seed data?')) return
    setIsMutating(true)
    try {
      await client.deleteAnalyticsSeeds()
      setStatusMessage('Analytics seed data deleted')
      await loadAnalytics()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Deleting seed data failed')
    } finally {
      setIsMutating(false)
    }
  }

  const kpis = [
    { label: 'Total Searches', value: formatCount(state.overview?.events.totalSearches) },
    { label: 'Total Clicks', value: formatCount(state.overview?.events.totalClicks) },
    { label: 'Overall CTR', value: `${state.overview?.queries.overallClickThroughRate ?? 0}%` },
    { label: 'Unique Users', value: formatCount(state.overview?.events.uniqueUsers) },
    { label: 'Unique Queries', value: formatCount(state.overview?.events.uniqueQueries) },
    { label: 'Tracked Entities', value: formatCount(state.overview?.entities.trackedEntities) }
  ]

  return (
    <div className="gba:space-y-4" data-testid="global-search-manager-analytics-tab">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button onClick={() => loadAnalytics().catch(() => undefined)} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : null}
            Refresh
          </Button>
        </div>
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          <Select value={seedPreset} onValueChange={value => setSeedPreset(value as GlobalSearchAnalyticsSeedPreset)}>
            <SelectTrigger className="gba:w-44">
              <SelectValue placeholder="Seed preset" />
            </SelectTrigger>
            <SelectContent>
              {(['SMALL', 'MEDIUM', 'LARGE', 'STRESS'] as GlobalSearchAnalyticsSeedPreset[]).map(preset => (
                <SelectItem key={preset} value={preset}>
                  {preset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => seedAnalytics().catch(() => undefined)} disabled={isMutating}>
            Seed
          </Button>
          <Button variant="destructive" onClick={() => deleteAnalytics().catch(() => undefined)} disabled={isMutating}>
            Delete All
          </Button>
        </div>
      </div>

      {statusMessage && <p className="gba:text-sm gba:text-muted-foreground">{statusMessage}</p>}
      {errorMessage && <p className="gba:text-sm gba:text-destructive">{errorMessage}</p>}

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:xl:grid-cols-6 gba:gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardHeader className="gba:pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle>{kpi.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-4">
        <AnalyticsTable
          title="Trending Queries"
          rows={state.trendScores}
          columns={['Query', 'Category', 'Searches', 'Clicks', 'Trend']}
        />
        <AnalyticsTable
          title="Top Queries"
          rows={state.topQueries}
          columns={['Query', 'Category', 'Searches', 'Clicks', 'CTR']}
        />
        <AnalyticsTable
          title="Popular Entities"
          rows={state.popularEntities}
          columns={['Entity', 'Document', 'User', 'Clicks', 'Trend']}
        />
        <AnalyticsTable
          title="Zero-Result Queries"
          rows={state.zeroResultQueries}
          columns={['Query', 'Category', 'Searches', 'Last']}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Click-through rates</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-2">
          {state.clickThroughRates.map(rate => (
            <div key={rate.categoryId} className="gba:flex gba:items-center gba:justify-between gba:border-b gba:py-2">
              <span>{rate.categoryId}</span>
              <span className="gba:text-sm gba:text-muted-foreground">
                {rate.clickThroughRate}% ({rate.searches}s/{rate.clicks}c)
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search Volume</CardTitle>
          <CardDescription>Last {state.searchVolume.length} hourly buckets</CardDescription>
        </CardHeader>
        <CardContent className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2">
          {state.searchVolume.slice(-12).map(bucket => (
            <div
              key={bucket.bucket}
              className="gba:flex gba:items-center gba:justify-between gba:rounded gba:border gba:p-2"
            >
              <span className="gba:text-sm">{formatDateTime(bucket.bucket)}</span>
              <span className="gba:text-sm gba:text-muted-foreground">{bucket.searches} searches</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

const formatAnalyticsCell = (value: unknown): string => {
  if (value == null) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const AnalyticsTable: React.FC<{ title: string; rows: unknown[]; columns: string[] }> = ({ title, rows, columns }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(column => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="gba:text-center gba:text-muted-foreground">
                No data
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow key={JSON.stringify(row)}>
                {Object.values(row as Record<string, unknown>)
                  .slice(0, columns.length)
                  .map((value, cellIndex) => (
                    <TableCell key={`${rowIndex}-${columns[cellIndex]}`}>{formatAnalyticsCell(value)}</TableCell>
                  ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)
