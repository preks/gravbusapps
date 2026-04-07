import React, { useEffect, useMemo, useState } from 'react'
import {
  PageLayout,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  type KpiCardData,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Input
} from '@newwork/nw-design-system'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  Package,
  SquaresFour,
  HardDrives,
  Link as LinkIcon,
  ClockCounterClockwise,
  CaretDown,
  CaretRight,
  ArrowDown,
  ArrowUp,
  ArrowsDownUp,
  Funnel,
  MagnifyingGlass,
  XCircle
} from '@phosphor-icons/react'
import bundleDoc from '../../../../../bundle-top-dependencies.json'
import { PipelineOpenLink } from './PipelineOpenLink'
import { safeExternalHttpUrl } from './safeExternalHttpUrl'

type TopRow = { kind: string; name: string; rendered: number; gzip: number }

type BundleEntry = {
  chunkJsBytes?: number
  bitbucketBuildNumber?: number | null
  pipelineUrl?: string | null
  top?: TopRow[]
}

type BundleDoc = {
  _meta?: { schemaVersion?: number; generatedAt?: string }
  [key: string]: unknown
}

const doc = bundleDoc as BundleDoc

/** First path segment of a screen key — same idea as `moduleName` in BusinessAppIDE (e.g. core, platform, hr). */
export function getModuleFromScreenKey(screenKey: string): string {
  const i = screenKey.indexOf('/')
  return i === -1 ? screenKey : screenKey.slice(0, i)
}

function fmtKb(bytes: number) {
  if (bytes == null || Number.isNaN(bytes)) return '—'
  return `${(bytes / 1024).toFixed(1)} KB`
}

type TableRow = {
  key: string
  entry: BundleEntry
}

type SortColumn = 'key' | 'chunk' | 'pipeline'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 25

function compareRows(a: TableRow, b: TableRow, column: SortColumn, dir: SortDir): number {
  const mul = dir === 'asc' ? 1 : -1
  if (column === 'key') {
    return mul * a.key.localeCompare(b.key)
  }
  if (column === 'chunk') {
    return mul * ((a.entry.chunkJsBytes ?? 0) - (b.entry.chunkJsBytes ?? 0))
  }
  const na = a.entry.bitbucketBuildNumber
  const nb = b.entry.bitbucketBuildNumber
  if (na == null && nb == null) return 0
  if (na == null) return 1 * mul
  if (nb == null) return -1 * mul
  return mul * (na - nb)
}

export function BundleDashboard() {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [moduleFilter, setModuleFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<{ column: SortColumn; dir: SortDir }>({ column: 'key', dir: 'asc' })
  const [page, setPage] = useState(0)

  const baseRows = useMemo<TableRow[]>(() => {
    const out: TableRow[] = []
    for (const [key, val] of Object.entries(doc)) {
      if (key === '_meta' || !val || typeof val !== 'object') continue
      out.push({ key, entry: val as BundleEntry })
    }
    return out
  }, [])

  const moduleOptions = useMemo(() => {
    const set = new Set<string>()
    for (const r of baseRows) {
      set.add(getModuleFromScreenKey(r.key))
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [baseRows])

  const filteredRows = useMemo(() => {
    let rows = !moduleFilter ? baseRows : baseRows.filter(r => getModuleFromScreenKey(r.key) === moduleFilter)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      rows = rows.filter(r => r.key.toLowerCase().includes(q))
    }
    return rows
  }, [baseRows, moduleFilter, searchQuery])

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => compareRows(a, b, sort.column, sort.dir))
  }, [filteredRows, sort])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))

  useEffect(() => {
    setPage(p => Math.min(p, totalPages - 1))
  }, [totalPages, moduleFilter, searchQuery, sort.column, sort.dir])

  const paginatedRows = useMemo(() => {
    const start = page * PAGE_SIZE
    return sortedRows.slice(start, start + PAGE_SIZE)
  }, [sortedRows, page])

  const handleSortClick = (column: SortColumn) => {
    setSort(s => {
      if (s.column === column) {
        return { column, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { column, dir: column === 'key' ? 'asc' : 'desc' }
    })
    setPage(0)
  }

  const sortLabels: Record<SortColumn, string> = {
    key: 'screen path',
    chunk: 'main chunk size',
    pipeline: 'pipeline build number'
  }

  const SortHeader = ({
    column,
    children,
    align = 'left'
  }: {
    column: SortColumn
    children: React.ReactNode
    align?: 'left' | 'right'
  }) => {
    const active = sort.column === column
    const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
    return (
      <TableHead scope="col" aria-sort={ariaSort} className={align === 'right' ? 'gba:text-right' : undefined}>
        <button
          type="button"
          onClick={() => handleSortClick(column)}
          title={`Sort by ${sortLabels[column]}`}
          className={
            align === 'right'
              ? 'gba:inline-flex gba:w-full gba:justify-end gba:items-center gba:gap-1.5 gba:font-medium hover:gba:text-foreground gba:-mr-1 gba:px-1 gba:py-0.5 gba:rounded-md hover:gba:bg-muted/60 gba:text-inherit'
              : 'gba:inline-flex gba:items-center gba:gap-1.5 gba:font-medium hover:gba:text-foreground gba:-ml-1 gba:px-1 gba:py-0.5 gba:rounded-md hover:gba:bg-muted/60 gba:text-inherit'
          }
        >
          <span>{children}</span>
          {active ? (
            sort.dir === 'asc' ? (
              <ArrowUp className="nw:size-3.5 gba:shrink-0 gba:text-primary" weight="bold" aria-hidden />
            ) : (
              <ArrowDown className="nw:size-3.5 gba:shrink-0 gba:text-primary" weight="bold" aria-hidden />
            )
          ) : (
            <ArrowsDownUp
              className="nw:size-3.5 gba:shrink-0 gba:text-muted-foreground/70"
              weight="regular"
              aria-hidden
            />
          )}
        </button>
      </TableHead>
    )
  }

  const hasActiveFilters = Boolean(moduleFilter || searchQuery.trim())

  const kpis = useMemo(() => {
    const totalChunk = filteredRows.reduce((s, r) => s + (r.entry.chunkJsBytes ?? 0), 0)
    const withPipeline = filteredRows.filter(r => safeExternalHttpUrl(r.entry.pipelineUrl)).length
    const generated = doc._meta?.generatedAt
      ? new Date(doc._meta.generatedAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      : '—'

    const filterBits: string[] = []
    if (moduleFilter) filterBits.push(`module “${moduleFilter}”`)
    if (searchQuery.trim()) filterBits.push(`search “${searchQuery.trim()}”`)
    const filterNote =
      filterBits.length > 0 ? ` (${filteredRows.length} of ${baseRows.length} — ${filterBits.join(', ')})` : ''

    const cards: KpiCardData[] = [
      {
        id: 'screens',
        title: 'Screens in report',
        value: filteredRows.length,
        icon: <SquaresFour className="nw:size-4" weight="duotone" />,
        footer: `Distinct remote entry keys with bundle stats${filterNote}`
      },
      {
        id: 'total-chunk',
        title: 'Combined main chunk',
        value: totalChunk > 0 ? (totalChunk / (1024 * 1024)).toFixed(2) : '0',
        suffix: totalChunk > 0 ? ' MB' : '',
        icon: <HardDrives className="nw:size-4" weight="duotone" />,
        trend: {
          value: totalChunk > 0 ? `${fmtKb(totalChunk)} total` : 'No size data',
          description:
            moduleFilter || searchQuery.trim()
              ? 'Sum for rows matching current filters'
              : 'Sum of on-disk index.js sizes',
          badgeVariant: 'info'
        },
        footer: 'Approximate; see per-screen breakdown below'
      },
      {
        id: 'pipelines',
        title: 'With pipeline link',
        value: withPipeline,
        icon: <LinkIcon className="nw:size-4" weight="duotone" />,
        trend: {
          value: filteredRows.length ? `${Math.round((withPipeline / filteredRows.length) * 100)}%` : '—',
          description: 'Entries tied to a CI run',
          badgeVariant: filteredRows.length && withPipeline === filteredRows.length ? 'success' : 'warning'
        },
        footer: 'From Bitbucket when analyzed on develop'
      },
      {
        id: 'report-age',
        title: 'Report metadata',
        value: generated,
        icon: <ClockCounterClockwise className="nw:size-4" weight="duotone" />,
        footer: doc._meta?.schemaVersion != null ? `Schema v${doc._meta.schemaVersion}` : 'Schema version n/a'
      }
    ]
    return cards
  }, [filteredRows, baseRows.length, moduleFilter, searchQuery])

  const chartData = useMemo(() => {
    const sorted = [...filteredRows].sort((a, b) => (b.entry.chunkJsBytes ?? 0) - (a.entry.chunkJsBytes ?? 0))
    const top = sorted.slice(0, 12)
    return top.map(r => {
      const label = r.key.length > 28 ? `${r.key.slice(0, 14)}…${r.key.slice(-10)}` : r.key
      return {
        name: label,
        fullName: r.key,
        kb: Math.round((r.entry.chunkJsBytes ?? 0) / 1024)
      }
    })
  }, [filteredRows])

  const chartConfig = useMemo(
    () =>
      ({
        kb: { label: 'Main chunk (KB)' }
      }) satisfies ChartConfig,
    []
  )

  return (
    <PageLayout
      headerTitle="Bundle / dependency report"
      headerDescription="Rollup analyzer output merged when screens are built and published on develop. Use pipeline links to inspect the CI run that produced each analysis."
      headerPhosphorIcon={{
        icon: Package,
        variant: 'decorative',
        size: 'lg',
        label: 'Bundle report'
      }}
      sectionTitle="Overview"
      sectionDescription="Key metrics from bundle-top-dependencies.json at the repo root."
      kpiCardsData={kpis}
      contentTitle="Screens and dependency hotspots"
    >
      <div className="gba:flex gba:flex-col gba:gap-6">
        <Card className="gba:overflow-hidden">
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-base">Largest main chunks</CardTitle>
            <CardDescription>
              Top entries by on-disk index.js size (KB){moduleFilter ? ` (module: ${moduleFilter})` : ''}. Truncated
              labels in the chart; see the table for full keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="gba:pt-0">
            {chartData.length === 0 ? (
              <p className="gba:text-sm gba:text-muted-foreground">No chunk data for this filter.</p>
            ) : (
              <ChartContainer config={chartConfig} className="gba:h-[280px] gba:w-full">
                <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 64 }}>
                  <CartesianGrid strokeDasharray="3 3" className="gba:stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    angle={-35}
                    textAnchor="end"
                    height={56}
                    interval={0}
                    className="gba:text-[10px]"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={44}
                    label={{ value: 'KB', angle: -90, position: 'insideLeft' }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={label => {
                          const row = chartData.find(d => d.name === label)
                          return row?.fullName ?? label
                        }}
                        formatter={value => (value != null ? `${value} KB` : '—')}
                      />
                    }
                  />
                  <Bar dataKey="kb" fill="var(--color-kb)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gba:pb-2 gba:space-y-3">
            <div>
              <CardTitle className="gba:text-base">All screens</CardTitle>
              <CardDescription>
                Open a row to see the full top bucket/asset list from the analyzer. Filter by top-level module (first
                segment of the path, e.g. <span className="gba:font-mono">platform</span>,{' '}
                <span className="gba:font-mono">core</span>) — same convention as screen keys in the IDE.
              </CardDescription>
            </div>
            <div className="gba:flex gba:flex-wrap gba:items-end gba:gap-4">
              <div className="gba:flex gba:flex-col gba:gap-1.5 gba:min-w-[200px]">
                <Label className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
                  <Funnel className="nw:size-3.5" weight="duotone" aria-hidden />
                  Module
                </Label>
                <Select
                  value={moduleFilter || 'all'}
                  onValueChange={v => {
                    setModuleFilter(v === 'all' ? '' : v)
                    setPage(0)
                    setOpenKey(null)
                  }}
                >
                  <SelectTrigger className="gba:w-full gba:max-w-[280px]" aria-label="Filter by module">
                    <SelectValue placeholder="All modules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All modules</SelectItem>
                    {moduleOptions.map(m => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="gba:flex gba:flex-col gba:gap-1.5 gba:flex-1 gba:min-w-[200px] gba:max-w-md">
                <Label
                  htmlFor="bundle-dashboard-search"
                  className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground"
                >
                  <MagnifyingGlass className="nw:size-3.5" weight="duotone" aria-hidden />
                  Search screen path
                </Label>
                <Input
                  id="bundle-dashboard-search"
                  type="search"
                  placeholder="Filter by path substring…"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value)
                    setPage(0)
                    setOpenKey(null)
                  }}
                  autoComplete="off"
                  className="gba:w-full"
                  aria-label="Filter table by screen path"
                />
              </div>
              {hasActiveFilters && (
                <div className="gba:flex gba:items-end gba:pb-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gba:gap-1.5 gba:text-muted-foreground"
                    onClick={() => {
                      setModuleFilter('')
                      setSearchQuery('')
                      setPage(0)
                      setOpenKey(null)
                    }}
                  >
                    <XCircle className="nw:size-4" weight="duotone" aria-hidden />
                    Clear filters
                  </Button>
                </div>
              )}
              <p className="gba:text-sm gba:text-muted-foreground gba:pb-2">
                Showing <span className="gba:font-medium gba:text-foreground">{sortedRows.length}</span> screen
                {sortedRows.length !== 1 ? 's' : ''}
                {sortedRows.length > 0 && (
                  <>
                    {' '}
                    — page {page + 1} of {totalPages} ({PAGE_SIZE} per page)
                  </>
                )}
              </p>
            </div>
          </CardHeader>
          <CardContent className="gba:p-0 gba:pt-0">
            <div className="gba:overflow-x-auto">
              <Table xScrollable={false}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="gba:w-8" />
                    <SortHeader column="key">Screen / entry</SortHeader>
                    <SortHeader column="chunk" align="right">
                      Main chunk
                    </SortHeader>
                    <SortHeader column="pipeline" align="right">
                      Pipeline #
                    </SortHeader>
                    <TableHead>Pipeline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="gba:h-28 gba:text-center gba:text-muted-foreground gba:text-sm">
                        {baseRows.length === 0
                          ? 'No bundle entries in the report.'
                          : 'No screens match the current module or search filters.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map(r => {
                      const open = openKey === r.key
                      const top = r.entry.top ?? []
                      return (
                        <React.Fragment key={r.key}>
                          <TableRow
                            className="gba:cursor-pointer"
                            onClick={() => setOpenKey(open ? null : r.key)}
                            data-state={open ? 'selected' : undefined}
                          >
                            <TableCell className="gba:w-8 gba:align-middle">
                              {open ? (
                                <CaretDown className="nw:size-4 gba:text-muted-foreground" weight="bold" />
                              ) : (
                                <CaretRight className="nw:size-4 gba:text-muted-foreground" weight="bold" />
                              )}
                            </TableCell>
                            <TableCell className="gba:font-mono gba:text-xs gba:max-w-[min(360px,40vw)]">
                              <span className="gba:truncate gba:block" title={r.key}>
                                {r.key}
                              </span>
                            </TableCell>
                            <TableCell className="gba:text-right gba:tabular-nums">
                              {fmtKb(r.entry.chunkJsBytes ?? 0)}
                            </TableCell>
                            <TableCell className="gba:text-right gba:tabular-nums">
                              {r.entry.bitbucketBuildNumber != null ? String(r.entry.bitbucketBuildNumber) : '—'}
                            </TableCell>
                            <TableCell className="gba:relative gba:z-[1]" onClick={e => e.stopPropagation()}>
                              <PipelineOpenLink pipelineUrl={r.entry.pipelineUrl} />
                            </TableCell>
                          </TableRow>
                          {open && (
                            <TableRow>
                              <TableCell colSpan={5} className="gba:bg-muted/40 gba:align-top">
                                <div className="gba:py-2 gba:px-1">
                                  <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
                                    Top buckets &amp; bundled assets (rendered / gzip)
                                  </p>
                                  {top.length === 0 ? (
                                    <p className="gba:text-sm gba:text-muted-foreground">No top list for this entry.</p>
                                  ) : (
                                    <ul className="gba:m-0 gba:list-none gba:space-y-1.5 gba:text-sm">
                                      {top.map((t, i) => (
                                        <li
                                          key={`${r.key}-top-${i}`}
                                          className="gba:flex gba:flex-wrap gba:items-baseline gba:gap-2"
                                        >
                                          <Badge
                                            variant={t.kind === 'asset' ? 'warning' : 'default'}
                                            className="gba:shrink-0"
                                          >
                                            {t.kind}
                                          </Badge>
                                          <span className="gba:min-w-0 gba:break-all">{t.name}</span>
                                          <span className="gba:text-muted-foreground gba:tabular-nums">
                                            {fmtKb(t.rendered)} / {fmtKb(t.gzip)}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {sortedRows.length > 0 && (
              <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2 gba:border-t gba:border-border gba:px-4 gba:py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <span className="gba:text-sm gba:text-muted-foreground">
                  Page {page + 1} of {totalPages}
                  {totalPages > 1 ? ` (${PAGE_SIZE} per page)` : ''}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
