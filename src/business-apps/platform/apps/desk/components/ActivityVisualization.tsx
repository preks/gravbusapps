import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  Spinner,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  useTranslation,
  type ChartConfig
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { FileText, FileSpreadsheet, StickyNote, Presentation, TrendingUp } from 'lucide-react'
import { DESK_TYPE_COLORS } from '../constants/deskColors'
import deskTranslations from '../_i18n'

interface ActivityData {
  day: string
  documents: number
  spreadsheets: number
  notes: number
  slides: number
}

interface Stats {
  totalItems: number
  documents: { total: number; shared: number }
  spreadsheets: { total: number; shared: number }
  notes: { total: number; shared: number }
  slides: { total: number; shared: number }
}

interface ActivityVisualizationProps {
  activityData: ActivityData[]
  stats: Stats
  isLoading: boolean
  'data-testid'?: string
}

const CHART_COLORS = DESK_TYPE_COLORS

/**
 * ActivityVisualization - Interactive activity chart with design system compliance
 * Shows content creation activity over the past 7 days
 */
export const ActivityVisualization: React.FC<ActivityVisualizationProps> = ({
  activityData,
  stats,
  isLoading,
  'data-testid': testId = 'desk-activity'
}) => {
  const { t } = useTranslation(deskTranslations)
  const [hoveredType, setHoveredType] = useState<string | null>(null)

  const periodTotals = useMemo(() => {
    return activityData.reduce(
      (acc, day) => ({
        documents: acc.documents + day.documents,
        spreadsheets: acc.spreadsheets + day.spreadsheets,
        notes: acc.notes + day.notes,
        slides: acc.slides + (day.slides ?? 0)
      }),
      { documents: 0, spreadsheets: 0, notes: 0, slides: 0 }
    )
  }, [activityData])

  const total = periodTotals.documents + periodTotals.spreadsheets + periodTotals.notes + periodTotals.slides

  const maxBarValue = useMemo(() => {
    const daySums = activityData.map(d => d.documents + d.spreadsheets + d.notes + (d.slides ?? 0))
    const max = Math.max(...daySums, 1)
    return Math.ceil(max * 1.05)
  }, [activityData])

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      documents: { label: t('type-documents'), color: CHART_COLORS[0] },
      spreadsheets: { label: t('type-spreadsheets'), color: CHART_COLORS[1] },
      notes: { label: t('type-notes'), color: CHART_COLORS[2] },
      slides: { label: t('type-slides'), color: CHART_COLORS[3] }
    }),
    [t]
  )

  const legendItems = [
    {
      key: 'documents',
      label: t('type-documents'),
      icon: FileText,
      color: CHART_COLORS[0],
      count: stats.documents.total,
      activity: periodTotals.documents
    },
    {
      key: 'spreadsheets',
      label: t('type-spreadsheets'),
      icon: FileSpreadsheet,
      color: CHART_COLORS[1],
      count: stats.spreadsheets.total,
      activity: periodTotals.spreadsheets
    },
    {
      key: 'notes',
      label: t('type-notes'),
      icon: StickyNote,
      color: CHART_COLORS[2],
      count: stats.notes.total,
      activity: periodTotals.notes
    },
    {
      key: 'slides',
      label: t('type-slides'),
      icon: Presentation,
      color: CHART_COLORS[3],
      count: stats.slides?.total ?? 0,
      activity: periodTotals.slides
    }
  ]

  return (
    <section
      className="gba:py-6 gba:px-6 gba:relative"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.5s both' }}
    >
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-muted/20 gba:via-muted/30 gba:to-muted/20" />

      <div className="gba:relative gba:max-w-6xl gba:mx-auto">
        <div className="gba:text-center gba:mb-6">
          <div className="gba:inline-flex gba:items-center gba:gap-2 gba:text-muted-foreground gba:mb-3">
            <TrendingUp className="gba:h-5 gba:w-5" />
            <span className="gba:text-sm gba:font-medium gba:uppercase gba:tracking-wider">{t('activity-7-day')}</span>
          </div>
          <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-2">
            {isLoading ? '—' : t('activity-updates', { count: total })}
          </h2>
          <p className="gba:text-muted-foreground">{t('activity-subtitle')}</p>
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-4 gba:gap-6">
          <Card variant="outlined" className="gba:lg:col-span-3 gba:overflow-hidden gba:bg-background">
            <CardContent className="gba:p-6">
              {isLoading ? (
                <div
                  className="gba:flex gba:items-center gba:justify-center gba:h-[280px]"
                  data-testid={`${testId}-loading`}
                >
                  <Spinner size="lg" />
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="gba:h-[280px] gba:w-full">
                  <BarChart
                    data={activityData}
                    barGap={2}
                    barCategoryGap="14%"
                    margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={12} tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, maxBarValue]} hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="documents"
                      stackId="a"
                      fill={CHART_COLORS[0]}
                      radius={[0, 0, 0, 0]}
                      opacity={!hoveredType || hoveredType === 'documents' ? 1 : 0.25}
                    >
                      {activityData.map((_, index) => (
                        <Cell key={`doc-${index}`} />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="spreadsheets"
                      stackId="a"
                      fill={CHART_COLORS[1]}
                      radius={[0, 0, 0, 0]}
                      opacity={!hoveredType || hoveredType === 'spreadsheets' ? 1 : 0.25}
                    >
                      {activityData.map((_, index) => (
                        <Cell key={`sheet-${index}`} />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="notes"
                      stackId="a"
                      fill={CHART_COLORS[2]}
                      radius={[0, 0, 0, 0]}
                      opacity={!hoveredType || hoveredType === 'notes' ? 1 : 0.25}
                    >
                      {activityData.map((_, index) => (
                        <Cell key={`note-${index}`} />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="slides"
                      stackId="a"
                      fill={CHART_COLORS[3]}
                      radius={[6, 6, 0, 0]}
                      opacity={!hoveredType || hoveredType === 'slides' ? 1 : 0.25}
                    >
                      {activityData.map((_, index) => (
                        <Cell key={`slide-${index}`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <div className="gba:flex gba:flex-col gba:gap-1.5 gba:min-h-0 gba:overflow-y-auto">
            {legendItems.map(item => {
              const Icon = item.icon
              const isHovered = hoveredType === item.key

              return (
                <Card
                  key={item.key}
                  variant="outlined"
                  className={`gba:relative gba:cursor-pointer gba:transition-colors gba:duration-200 gba:ease-out gba:flex-shrink-0 ${isHovered ? 'gba:bg-card-decorative gba:border-decorative-foreground/30' : 'gba:bg-background hover:gba:bg-primary/5 hover:gba:border-primary/20'}`}
                  onMouseEnter={() => setHoveredType(item.key)}
                  onMouseLeave={() => setHoveredType(null)}
                  data-testid={`${testId}-stat-${item.key}`}
                >
                  {item.activity > 0 && (
                    <span className="gba:absolute gba:top-2 gba:right-2 gba:inline-flex gba:items-center gba:px-1.5 gba:py-0 gba:h-5 gba:rounded-full gba:bg-desk-badge-golden gba:text-desk-badge-golden-foreground gba:text-xs gba:font-semibold">
                      +{item.activity}
                    </span>
                  )}
                  <CardContent className="gba:p-2">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div
                        className={`gba:w-8 gba:h-8 gba:rounded gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 ${isHovered ? 'gba:bg-decorative-foreground/15' : 'gba:bg-muted/50'}`}
                      >
                        <div
                          className="gba:w-1 gba:h-5 gba:rounded-sm gba:flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <Icon
                          className={`gba:w-4 gba:h-4 gba:ml-1.5 ${isHovered ? 'gba:text-decorative-foreground' : ''}`}
                          style={!isHovered ? { color: item.color } : undefined}
                        />
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <p
                          className={`gba:text-xs gba:font-medium ${isHovered ? 'gba:text-decorative-foreground/80' : 'gba:text-foreground'}`}
                        >
                          {item.label}
                        </p>
                        <p
                          className={`gba:text-base gba:font-bold gba:mt-0 ${isHovered ? 'gba:text-decorative-foreground' : 'gba:text-foreground'}`}
                        >
                          {isLoading ? '—' : item.count}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ActivityVisualization
