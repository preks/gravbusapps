import React, { useMemo, useState } from 'react'
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
  ScrollArea
} from '@newwork/nw-design-system'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  Package,
  SquaresFour,
  HardDrives,
  Link as LinkIcon,
  ClockCounterClockwise,
  CaretDown,
  CaretRight
} from '@phosphor-icons/react'
import bundleDoc from '../../../../../bundle-top-dependencies.json'

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

function fmtKb(bytes: number) {
  if (bytes == null || Number.isNaN(bytes)) return '—'
  return `${(bytes / 1024).toFixed(1)} KB`
}

type TableRow = {
  key: string
  entry: BundleEntry
}

export function BundleDashboard() {
  const [openKey, setOpenKey] = useState<string | null>(null)

  const rows = useMemo<TableRow[]>(() => {
    const out: TableRow[] = []
    for (const [key, val] of Object.entries(doc)) {
      if (key === '_meta' || !val || typeof val !== 'object') continue
      out.push({ key, entry: val as BundleEntry })
    }
    return out.sort((a, b) => a.key.localeCompare(b.key))
  }, [])

  const kpis = useMemo(() => {
    const totalChunk = rows.reduce((s, r) => s + (r.entry.chunkJsBytes ?? 0), 0)
    const withPipeline = rows.filter(r => r.entry.pipelineUrl).length
    const generated = doc._meta?.generatedAt
      ? new Date(doc._meta.generatedAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      : '—'

    const cards: KpiCardData[] = [
      {
        id: 'screens',
        title: 'Screens in report',
        value: rows.length,
        icon: <SquaresFour className="nw:size-4" weight="duotone" />,
        footer: 'Distinct remote entry keys with bundle stats'
      },
      {
        id: 'total-chunk',
        title: 'Combined main chunk',
        value: totalChunk > 0 ? (totalChunk / (1024 * 1024)).toFixed(2) : '0',
        suffix: totalChunk > 0 ? ' MB' : '',
        icon: <HardDrives className="nw:size-4" weight="duotone" />,
        trend: {
          value: totalChunk > 0 ? `${fmtKb(totalChunk)} total` : 'No size data',
          description: 'Sum of on-disk index.js sizes',
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
          value: rows.length ? `${Math.round((withPipeline / rows.length) * 100)}%` : '—',
          description: 'Entries tied to a CI run',
          badgeVariant: withPipeline === rows.length ? 'success' : 'warning'
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
  }, [rows])

  const chartData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => (b.entry.chunkJsBytes ?? 0) - (a.entry.chunkJsBytes ?? 0))
    const top = sorted.slice(0, 12)
    return top.map(r => {
      const label = r.key.length > 28 ? `${r.key.slice(0, 14)}…${r.key.slice(-10)}` : r.key
      return {
        name: label,
        fullName: r.key,
        kb: Math.round((r.entry.chunkJsBytes ?? 0) / 1024)
      }
    })
  }, [rows])

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
              Top entries by on-disk index.js size (KB). Truncated labels in the chart; see the table for full keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="gba:pt-0">
            {chartData.length === 0 ? (
              <p className="gba:text-sm gba:text-muted-foreground">No chunk data yet.</p>
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
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-base">All screens</CardTitle>
            <CardDescription>Open a row to see the full top bucket/asset list from the analyzer.</CardDescription>
          </CardHeader>
          <CardContent className="gba:p-0 gba:pt-0">
            <ScrollArea className="gba:h-[min(560px,70vh)]">
              <Table xScrollable={false}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="gba:w-8" />
                    <TableHead>Screen / entry</TableHead>
                    <TableHead className="gba:text-right">Main chunk</TableHead>
                    <TableHead className="gba:text-right">Pipeline #</TableHead>
                    <TableHead>Pipeline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => {
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
                          <TableCell>
                            {r.entry.pipelineUrl ? (
                              <Button variant="link" size="sm" className="gba:h-auto gba:p-0" asChild>
                                <a href={r.entry.pipelineUrl} target="_blank" rel="noreferrer">
                                  Open in Bitbucket
                                </a>
                              </Button>
                            ) : (
                              <span className="gba:text-muted-foreground">—</span>
                            )}
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
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
