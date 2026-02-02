import React, { useState, useMemo } from 'react'
import { Card, CardContent, Spinner } from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { FileText, FileSpreadsheet, StickyNote, TrendingUp } from 'lucide-react'

interface ActivityData {
  day: string
  documents: number
  spreadsheets: number
  notes: number
}

interface Stats {
  totalItems: number
  documents: { total: number; shared: number }
  spreadsheets: { total: number; shared: number }
  notes: { total: number; shared: number }
}

interface ActivityVisualizationProps {
  activityData: ActivityData[]
  stats: Stats
  isLoading: boolean
  'data-testid'?: string
}

const COLORS = {
  documents: '#0284c7',
  spreadsheets: '#0d9488',
  notes: '#d97706'
}

/**
 * ActivityVisualization - Interactive activity chart with hover effects
 * Shows content creation activity over the past 7 days
 */
export const ActivityVisualization: React.FC<ActivityVisualizationProps> = ({
  activityData,
  stats,
  isLoading,
  'data-testid': testId = 'desk-activity'
}) => {
  const [hoveredType, setHoveredType] = useState<string | null>(null)

  // Calculate totals for the period
  const periodTotals = useMemo(() => {
    return activityData.reduce(
      (acc, day) => ({
        documents: acc.documents + day.documents,
        spreadsheets: acc.spreadsheets + day.spreadsheets,
        notes: acc.notes + day.notes
      }),
      { documents: 0, spreadsheets: 0, notes: 0 }
    )
  }, [activityData])

  const total = periodTotals.documents + periodTotals.spreadsheets + periodTotals.notes

  // Legend items
  const legendItems = [
    {
      key: 'documents',
      label: 'Documents',
      icon: FileText,
      color: COLORS.documents,
      count: stats.documents.total,
      activity: periodTotals.documents
    },
    {
      key: 'spreadsheets',
      label: 'Spreadsheets',
      icon: FileSpreadsheet,
      color: COLORS.spreadsheets,
      count: stats.spreadsheets.total,
      activity: periodTotals.spreadsheets
    },
    {
      key: 'notes',
      label: 'Notes',
      icon: StickyNote,
      color: COLORS.notes,
      count: stats.notes.total,
      activity: periodTotals.notes
    }
  ]

  return (
    <section
      className="gba:py-6 gba:px-6 gba:relative"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.5s both' }}
    >
      {/* Background */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-muted/20 gba:via-muted/30 gba:to-muted/20" />

      <div className="gba:relative gba:max-w-6xl gba:mx-auto">
        {/* Section header */}
        <div className="gba:text-center gba:mb-6">
          <div className="gba:inline-flex gba:items-center gba:gap-2 gba:text-muted-foreground gba:mb-3">
            <TrendingUp className="gba:h-5 gba:w-5" />
            <span className="gba:text-sm gba:font-medium gba:uppercase gba:tracking-wider">7-Day Activity</span>
          </div>
          <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-2">
            {isLoading ? '—' : total} updates this week
          </h2>
          <p className="gba:text-muted-foreground">
            Track your content creation across all applications
          </p>
        </div>

        {/* Main content grid */}
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-4 gba:gap-6">
          {/* Chart */}
          <Card className="gba:lg:col-span-3">
            <CardContent className="gba:p-6">
              {isLoading ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="gba:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData} barGap={2}>
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="gba:bg-popover gba:border gba:border-border gba:rounded-xl gba:px-4 gba:py-3 gba:shadow-lg">
                                <p className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-2">{label}</p>
                                {payload.map((entry: { name: string; value: number; color: string }) => (
                                  <div key={entry.name} className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                                    <div
                                      className="gba:w-2 gba:h-2 gba:rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="gba:text-muted-foreground gba:capitalize">{entry.name}:</span>
                                    <span className="gba:font-medium gba:text-foreground">{entry.value}</span>
                                  </div>
                                ))}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar
                        dataKey="documents"
                        stackId="a"
                        fill={COLORS.documents}
                        radius={[0, 0, 0, 0]}
                        opacity={!hoveredType || hoveredType === 'documents' ? 1 : 0.3}
                      >
                        {activityData.map((_, index) => (
                          <Cell key={`doc-${index}`} />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="spreadsheets"
                        stackId="a"
                        fill={COLORS.spreadsheets}
                        radius={[0, 0, 0, 0]}
                        opacity={!hoveredType || hoveredType === 'spreadsheets' ? 1 : 0.3}
                      >
                        {activityData.map((_, index) => (
                          <Cell key={`sheet-${index}`} />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="notes"
                        stackId="a"
                        fill={COLORS.notes}
                        radius={[4, 4, 0, 0]}
                        opacity={!hoveredType || hoveredType === 'notes' ? 1 : 0.3}
                      >
                        {activityData.map((_, index) => (
                          <Cell key={`note-${index}`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats sidebar */}
          <div className="gba:space-y-3">
            {legendItems.map(item => {
              const Icon = item.icon
              const isHovered = hoveredType === item.key

              return (
                <Card
                  key={item.key}
                  className={`gba:cursor-pointer gba:transition-all gba:duration-200 ${isHovered ? 'gba:ring-2 gba:ring-offset-2' : ''}`}
                  style={{ '--tw-ring-color': item.color } as React.CSSProperties}
                  onMouseEnter={() => setHoveredType(item.key)}
                  onMouseLeave={() => setHoveredType(null)}
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <div
                        className="gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <Icon className="gba:w-5 gba:h-5" style={{ color: item.color }} />
                      </div>
                      <div className="gba:flex-1">
                        <p className="gba:text-xs gba:text-muted-foreground">{item.label}</p>
                        <div className="gba:flex gba:items-baseline gba:gap-2">
                          <span className="gba:text-lg gba:font-bold gba:text-foreground">
                            {isLoading ? '—' : item.count}
                          </span>
                          {item.activity > 0 && (
                            <span className="gba:text-xs gba:text-success">
                              +{item.activity}
                            </span>
                          )}
                        </div>
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
