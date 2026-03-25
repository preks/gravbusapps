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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type ChartConfig
} from '@newwork/nw-design-system'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { navigateTo } from '@/common/utils/navigationUtils'
import type {
  BuilderMetricsTimeframe,
  BuilderServiceMetricsResponse,
  MetricsTimeseriesPoint,
  SessionUsageMetric,
  LlmPricingConfigEntry
} from '@/common/network/ai/builder/BuilderClient'

type AiBuilderMetricsDashboardProps = BusinessAppContextProps & {
  'data-testid'?: string
}

type PricingDraftRow = {
  id?: string
  provider: string
  model: string
  inputUsdPerMillion: string
  outputUsdPerMillion: string
}

const TIMEFRAME_OPTIONS: Array<{ value: BuilderMetricsTimeframe; label: string }> = [
  { value: 'last24h', label: 'Last 24h' },
  { value: 'last7d', label: 'Last 7d' },
  { value: 'last30d', label: 'Last 30d' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'all', label: 'All time' }
]

const PROVIDER_PRICING_URLS: Record<string, string> = {
  anthropic: 'https://docs.anthropic.com/en/docs/about-claude/pricing',
  openai: 'https://platform.openai.com/docs/pricing',
  groq: 'https://groq.com/pricing/',
  together: 'https://www.together.ai/pricing'
}

const formatInteger = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
}

const formatUsd = (value: number | null | undefined, digits: number = 2): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value)
}

const formatPricePerMillion = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--'
  return `${formatUsd(value, value >= 1 ? 2 : 4)} / 1M`
}

const formatPercent = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--'
  return `${value.toFixed(1)}%`
}

const sumTokenPair = (input: number, output: number) => input + output

const parseNonNegativeNumber = (value: string): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

const pricingKey = (provider: string, model: string): string =>
  `${provider.trim().toLowerCase()}::${(model || '*').trim().toLowerCase() || '*'}`

const formatChartBucketLabel = (isoDate: string, timeframe: BuilderMetricsTimeframe): string => {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return isoDate

  if (timeframe === 'last24h') {
    return parsed.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  return parsed.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
}

const toPricingDraftRows = (entries: LlmPricingConfigEntry[]): PricingDraftRow[] =>
  [...entries]
    .sort((a, b) => pricingKey(a.provider, a.model).localeCompare(pricingKey(b.provider, b.model)))
    .map(entry => ({
      id: entry.id,
      provider: entry.provider,
      model: entry.model,
      inputUsdPerMillion: String(entry.inputUsdPerMillion ?? 0),
      outputUsdPerMillion: String(entry.outputUsdPerMillion ?? 0)
    }))

const normalizePricingRowsForCompare = (rows: PricingDraftRow[]): string =>
  JSON.stringify(
    [...rows]
      .map(row => ({
        id: row.id || '',
        provider: row.provider.trim().toLowerCase(),
        model: (row.model || '*').trim().toLowerCase() || '*',
        inputUsdPerMillion: parseNonNegativeNumber(row.inputUsdPerMillion),
        outputUsdPerMillion: parseNonNegativeNumber(row.outputUsdPerMillion)
      }))
      .sort((a, b) => `${a.provider}:${a.model}:${a.id}`.localeCompare(`${b.provider}:${b.model}:${b.id}`))
  )

const getProviderPricingUrl = (provider: string): string | null => {
  const normalizedProvider = provider.trim().toLowerCase()
  return PROVIDER_PRICING_URLS[normalizedProvider] || null
}

export const AiBuilderMetricsDashboard: React.FC<AiBuilderMetricsDashboardProps> = ({
  accessToken,
  'data-testid': testId = 'ai-builder-metrics-dashboard'
}) => {
  const builderClient = useBuilderClient(accessToken)
  const [timeframe, setTimeframe] = useState<BuilderMetricsTimeframe>('last7d')
  const [serviceMetrics, setServiceMetrics] = useState<BuilderServiceMetricsResponse | null>(null)
  const [sessionMetrics, setSessionMetrics] = useState<SessionUsageMetric[]>([])
  const [timeseries, setTimeseries] = useState<MetricsTimeseriesPoint[]>([])
  const [pricingRows, setPricingRows] = useState<PricingDraftRow[]>([])
  const [pricingRowsSaved, setPricingRowsSaved] = useState<PricingDraftRow[]>([])
  const [pricingNote, setPricingNote] = useState<string>('')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [modelFilter, setModelFilter] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPricingLoading, setIsPricingLoading] = useState(false)
  const [isSavingPricing, setIsSavingPricing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const loadMetrics = useCallback(async () => {
    if (!accessToken) {
      setServiceMetrics(null)
      setSessionMetrics([])
      setTimeseries([])
      setError('Access token is missing. Open settings and set a valid token to query AI Builder metrics.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [service, sessions, chartData] = await Promise.all([
        builderClient.getServiceMetrics(timeframe),
        builderClient.getSessionUsageMetrics({ timeframe, limit: 100 }),
        builderClient.getMetricsTimeseries(timeframe)
      ])
      setServiceMetrics(service)
      setSessionMetrics(Array.isArray(sessions.sessions) ? sessions.sessions : [])
      setTimeseries(Array.isArray(chartData.points) ? chartData.points : [])
      setLastUpdatedAt(new Date())
    } catch (metricsError) {
      const message = metricsError instanceof Error ? metricsError.message : 'Failed to load AI Builder metrics'
      setError(message)
      setServiceMetrics(null)
      setSessionMetrics([])
      setTimeseries([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, builderClient, timeframe])

  const loadPricing = useCallback(async () => {
    if (!accessToken) {
      setPricingRows([])
      setPricingNote('')
      return
    }

    setIsPricingLoading(true)

    try {
      const pricingConfig = await builderClient.getLlmPricingConfig()
      const nextRows = toPricingDraftRows(Array.isArray(pricingConfig.entries) ? pricingConfig.entries : [])
      setPricingNote(pricingConfig.note || '')
      setPricingRows(nextRows)
      setPricingRowsSaved(nextRows)
    } catch (pricingError) {
      const message = pricingError instanceof Error ? pricingError.message : 'Failed to load pricing configuration'
      setError(message)
      setPricingRows([])
      setPricingRowsSaved([])
    } finally {
      setIsPricingLoading(false)
    }
  }, [accessToken, builderClient])

  useEffect(() => {
    void loadMetrics()
  }, [loadMetrics])

  useEffect(() => {
    void loadPricing()
  }, [loadPricing])

  const timeframeTokenTotal = useMemo(() => {
    if (!serviceMetrics) return 0
    return sumTokenPair(serviceMetrics.ai.totals.timeframeInputTokens, serviceMetrics.ai.totals.timeframeOutputTokens)
  }, [serviceMetrics])

  const allTimeTokenTotal = useMemo(() => {
    if (!serviceMetrics) return 0
    return sumTokenPair(serviceMetrics.ai.totals.totalInputTokens, serviceMetrics.ai.totals.totalOutputTokens)
  }, [serviceMetrics])

  const topSessions = useMemo(
    () =>
      [...sessionMetrics]
        .sort((a, b) => b.timeframeCostUsd - a.timeframeCostUsd || b.timeframeTokens - a.timeframeTokens)
        .slice(0, 20),
    [sessionMetrics]
  )

  const modelRows = useMemo(
    () =>
      serviceMetrics?.ai.byModel
        ? [...serviceMetrics.ai.byModel].sort(
            (a, b) =>
              b.timeframeCostUsd - a.timeframeCostUsd ||
              sumTokenPair(b.timeframeInputTokens, b.timeframeOutputTokens) -
                sumTokenPair(a.timeframeInputTokens, a.timeframeOutputTokens)
          )
        : [],
    [serviceMetrics]
  )

  const providerFilterOptions = useMemo(
    () => Array.from(new Set(modelRows.map(row => row.provider))).sort((a, b) => a.localeCompare(b)),
    [modelRows]
  )

  useEffect(() => {
    if (providerFilter === 'all') return
    if (!providerFilterOptions.includes(providerFilter)) {
      setProviderFilter('all')
    }
  }, [providerFilter, providerFilterOptions])

  const normalizedModelFilter = useMemo(() => modelFilter.trim().toLowerCase(), [modelFilter])

  const filteredModelRows = useMemo(
    () =>
      modelRows.filter(row => {
        const matchesProvider = providerFilter === 'all' || row.provider === providerFilter
        const matchesModel = !normalizedModelFilter || row.model.toLowerCase().includes(normalizedModelFilter)
        return matchesProvider && matchesModel
      }),
    [modelRows, providerFilter, normalizedModelFilter]
  )

  const chartSeries = useMemo(
    () =>
      timeseries.map(point => ({
        ...point,
        bucketLabel: formatChartBucketLabel(point.bucketStart, timeframe)
      })),
    [timeseries, timeframe]
  )

  const tokenChartConfig = useMemo<ChartConfig>(
    () => ({
      inputTokens: { label: 'Input tokens' },
      outputTokens: { label: 'Output tokens' }
    }),
    []
  )

  const costChartConfig = useMemo<ChartConfig>(
    () => ({
      totalCostUsd: { label: 'Cost (USD)' },
      calls: { label: 'Calls' }
    }),
    []
  )

  const openSession = useCallback((sessionId: string) => {
    navigateTo(`/platform/create/screen-builder?sessionId=${encodeURIComponent(sessionId)}`)
  }, [])

  const updatePricingField = useCallback(
    (rowIndex: number, field: 'inputUsdPerMillion' | 'outputUsdPerMillion', value: string) => {
      setPricingRows(prev =>
        prev.map((row, index) =>
          index === rowIndex
            ? {
                ...row,
                [field]: value
              }
            : row
        )
      )
    },
    []
  )

  const savePricingConfig = useCallback(async () => {
    if (!accessToken || pricingRows.length === 0) return

    setIsSavingPricing(true)
    setError(null)

    try {
      await builderClient.updateLlmPricingConfig({
        entries: pricingRows.map(row => ({
          id: row.id,
          provider: row.provider,
          model: row.model,
          inputUsdPerMillion: parseNonNegativeNumber(row.inputUsdPerMillion),
          outputUsdPerMillion: parseNonNegativeNumber(row.outputUsdPerMillion)
        }))
      })
      await Promise.all([loadPricing(), loadMetrics()])
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save pricing configuration'
      setError(message)
    } finally {
      setIsSavingPricing(false)
    }
  }, [accessToken, builderClient, pricingRows, loadPricing, loadMetrics])

  const pricingHasUnsavedChanges = useMemo(
    () => normalizePricingRowsForCompare(pricingRows) !== normalizePricingRowsForCompare(pricingRowsSaved),
    [pricingRows, pricingRowsSaved]
  )

  const resetPricingChanges = useCallback(() => {
    setPricingRows([...pricingRowsSaved])
  }, [pricingRowsSaved])

  return (
    <div className="layout gba:py-4" data-testid={testId}>
      <main className="layout-content gap-md gba:py-2">
        <header className="gba:w-full gba:mb-6 gba:py-2 gba:flex gba:flex-wrap gba:items-start gba:justify-between gba:gap-3">
          <div className="gba:space-y-1">
            <h1 className="gba:text-2xl gba:font-semibold">AI Builder Metrics Dashboard</h1>
            <p className="gba:text-sm gba:text-muted-foreground">
              Token usage and USD costs based on configurable provider pricing.
            </p>
            {lastUpdatedAt && (
              <p className="gba:text-xs gba:text-muted-foreground">Updated {lastUpdatedAt.toLocaleTimeString()}</p>
            )}
          </div>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-end gba:gap-2 gba:ml-auto">
            <Select value={timeframe} onValueChange={value => setTimeframe(value as BuilderMetricsTimeframe)}>
              <SelectTrigger className="gba:w-[180px]">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAME_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => void loadMetrics()} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </header>

        {!accessToken && (
          <Alert variant="destructive">
            <AlertDescription>Access token missing. Open IDE settings and paste a valid token.</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {serviceMetrics && (
          <div className="gba:space-y-6">
            <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2 gba:lg:grid-cols-4">
              <Card>
                <CardHeader className="gba:pb-2">
                  <CardTitle className="gba:text-sm">Cost ({timeframe})</CardTitle>
                </CardHeader>
                <CardContent className="gba:text-2xl gba:font-semibold">
                  {formatUsd(serviceMetrics.ai.totals.timeframeCostUsd)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="gba:pb-2">
                  <CardTitle className="gba:text-sm">Tokens ({timeframe})</CardTitle>
                </CardHeader>
                <CardContent className="gba:text-2xl gba:font-semibold">
                  {formatInteger(timeframeTokenTotal)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="gba:pb-2">
                  <CardTitle className="gba:text-sm">LLM Calls ({timeframe})</CardTitle>
                </CardHeader>
                <CardContent className="gba:text-2xl gba:font-semibold">
                  {formatInteger(serviceMetrics.ai.totals.timeframeCalls)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="gba:pb-2">
                  <CardTitle className="gba:text-sm">Sessions ({timeframe})</CardTitle>
                </CardHeader>
                <CardContent className="gba:text-2xl gba:font-semibold">
                  {formatInteger(serviceMetrics.sessions.withinTimeframe)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="gba:pb-2">
                  <CardTitle className="gba:text-sm">Build Success Rate</CardTitle>
                </CardHeader>
                <CardContent className="gba:text-2xl gba:font-semibold">
                  {formatPercent(serviceMetrics.builds.successRate)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="gba:pb-2">
                  <CardTitle className="gba:text-sm">All-Time Cost</CardTitle>
                </CardHeader>
                <CardContent className="gba:text-2xl gba:font-semibold">
                  {formatUsd(serviceMetrics.ai.totals.totalCostUsd)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="gba:pb-2">
                  <CardTitle className="gba:text-sm">All-Time Tokens</CardTitle>
                </CardHeader>
                <CardContent className="gba:text-2xl gba:font-semibold">{formatInteger(allTimeTokenTotal)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="gba:pb-2">
                  <CardTitle className="gba:text-sm">All-Time Calls</CardTitle>
                </CardHeader>
                <CardContent className="gba:text-2xl gba:font-semibold">
                  {formatInteger(serviceMetrics.ai.totals.totalCalls)}
                </CardContent>
              </Card>
            </div>

            <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-sm">Token Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={tokenChartConfig} className="gba:h-64">
                    <AreaChart data={chartSeries} margin={{ left: 10, right: 10 }}>
                      <defs>
                        <linearGradient id="tokensInputGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--nw-chart-1)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--nw-chart-1)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="tokensOutputGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--nw-chart-2)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--nw-chart-2)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="bucketLabel" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="inputTokens"
                        stroke="var(--nw-chart-1)"
                        fill="url(#tokensInputGradient)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="outputTokens"
                        stroke="var(--nw-chart-2)"
                        fill="url(#tokensOutputGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-sm">Cost and Call Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={costChartConfig} className="gba:h-64">
                    <LineChart data={chartSeries} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="bucketLabel" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="totalCostUsd"
                        stroke="var(--nw-chart-4)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="calls"
                        stroke="var(--nw-chart-6)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                  <span>Per-Model Usage and Cost</span>
                  <Badge variant="secondary">
                    {filteredModelRows.length}/{modelRows.length} models
                  </Badge>
                </CardTitle>
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                  <Select value={providerFilter} onValueChange={setProviderFilter}>
                    <SelectTrigger className="gba:w-[180px]">
                      <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All providers</SelectItem>
                      {providerFilterOptions.map(provider => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={modelFilter}
                    onChange={event => setModelFilter(event.target.value)}
                    placeholder="Filter model (contains...)"
                    className="gba:w-[260px]"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="gba:border gba:border-border gba:rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="gba:text-right">Price Input</TableHead>
                        <TableHead className="gba:text-right">Price Output</TableHead>
                        <TableHead className="gba:text-right">Tokens ({timeframe})</TableHead>
                        <TableHead className="gba:text-right">Cost ({timeframe})</TableHead>
                        <TableHead className="gba:text-right">All-Time Tokens</TableHead>
                        <TableHead className="gba:text-right">All-Time Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredModelRows.map(row => (
                        <TableRow key={`${row.provider}-${row.model}`}>
                          <TableCell>{row.provider}</TableCell>
                          <TableCell className="gba:font-mono">{row.model}</TableCell>
                          <TableCell className="gba:text-right">
                            {formatPricePerMillion(row.priceInputUsdPerMillion)}
                          </TableCell>
                          <TableCell className="gba:text-right">
                            {formatPricePerMillion(row.priceOutputUsdPerMillion)}
                          </TableCell>
                          <TableCell className="gba:text-right">
                            {formatInteger(sumTokenPair(row.timeframeInputTokens, row.timeframeOutputTokens))}
                          </TableCell>
                          <TableCell className="gba:text-right">{formatUsd(row.timeframeCostUsd, 4)}</TableCell>
                          <TableCell className="gba:text-right">
                            {formatInteger(sumTokenPair(row.totalInputTokens, row.totalOutputTokens))}
                          </TableCell>
                          <TableCell className="gba:text-right">{formatUsd(row.totalCostUsd, 4)}</TableCell>
                        </TableRow>
                      ))}
                      {filteredModelRows.length === 0 && (
                        <TableRow>
                          <TableCell className="gba:py-5 gba:text-muted-foreground" colSpan={8}>
                            {modelRows.length === 0
                              ? 'No model usage found for this timeframe.'
                              : 'No model rows match the current filters.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                  <span>Top Sessions by Token Usage</span>
                  <Badge variant="secondary">{topSessions.length} sessions</Badge>
                </CardTitle>
                <p className="gba:text-xs gba:text-muted-foreground">
                  Tip: click a row to open that session in Screen Builder.
                </p>
              </CardHeader>
              <CardContent>
                <div className="gba:border gba:border-border gba:rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session ID</TableHead>
                        <TableHead className="gba:text-right">Tokens ({timeframe})</TableHead>
                        <TableHead className="gba:text-right">Cost ({timeframe})</TableHead>
                        <TableHead className="gba:text-right">Calls ({timeframe})</TableHead>
                        <TableHead>Last Used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topSessions.map(session => (
                        <TableRow
                          key={session.sessionId}
                          className="gba:cursor-pointer"
                          onClick={() => openSession(session.sessionId)}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              openSession(session.sessionId)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open session ${session.sessionId}`}
                        >
                          <TableCell className="gba:font-mono">{session.sessionId}</TableCell>
                          <TableCell className="gba:text-right">{formatInteger(session.timeframeTokens)}</TableCell>
                          <TableCell className="gba:text-right">{formatUsd(session.timeframeCostUsd, 4)}</TableCell>
                          <TableCell className="gba:text-right">{formatInteger(session.timeframeCalls)}</TableCell>
                          <TableCell>
                            {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : '--'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {topSessions.length === 0 && (
                        <TableRow>
                          <TableCell className="gba:py-5 gba:text-muted-foreground" colSpan={5}>
                            No session usage found for this timeframe.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className={serviceMetrics ? 'gba:mt-6' : undefined}>
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2">
            <CardTitle className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
              <span>LLM Pricing Configuration</span>
              <Badge variant="secondary">{pricingRows.length} entries</Badge>
              <Badge variant="secondary">{pricingHasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}</Badge>
            </CardTitle>
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
              <Button
                variant="outline"
                onClick={resetPricingChanges}
                disabled={isSavingPricing || !pricingHasUnsavedChanges}
              >
                Reset
              </Button>
              <Button
                onClick={() => void savePricingConfig()}
                disabled={isPricingLoading || isSavingPricing || pricingRows.length === 0 || !pricingHasUnsavedChanges}
              >
                {isSavingPricing ? 'Saving...' : 'Save Prices'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <Alert>
              <AlertDescription>
                {pricingNote ||
                  'Pricing is user-configurable because providers do not reliably expose a complete runtime pricing API across all models and tiers.'}
              </AlertDescription>
            </Alert>
            <div className="gba:border gba:border-border gba:rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Official pricing</TableHead>
                    <TableHead>Input USD / 1M</TableHead>
                    <TableHead>Output USD / 1M</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingRows.map((row, index) => (
                    <TableRow key={row.id || `${row.provider}-${row.model}`}>
                      <TableCell className="gba:font-medium">{row.provider}</TableCell>
                      <TableCell className="gba:font-mono">{row.model}</TableCell>
                      <TableCell>
                        {getProviderPricingUrl(row.provider) ? (
                          <a
                            href={getProviderPricingUrl(row.provider)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gba:text-primary gba:underline gba:hover:opacity-80"
                          >
                            Open pricing page
                          </a>
                        ) : (
                          <span className="gba:text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.inputUsdPerMillion}
                          inputMode="decimal"
                          onChange={event => updatePricingField(index, 'inputUsdPerMillion', event.target.value)}
                          disabled={isSavingPricing}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.outputUsdPerMillion}
                          inputMode="decimal"
                          onChange={event => updatePricingField(index, 'outputUsdPerMillion', event.target.value)}
                          disabled={isSavingPricing}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {pricingRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="gba:py-5 gba:text-muted-foreground">
                        {isPricingLoading ? 'Loading pricing configuration...' : 'No pricing entries found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {pricingHasUnsavedChanges && (
              <p className="gba:text-xs gba:text-muted-foreground">
                You have unsaved pricing edits. Save to recalculate all cost metrics with these values.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default AiBuilderMetricsDashboard
