import React, { useState, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import dayjs from 'dayjs'
import translations from '../../../../_i18n'
import MarketingActivitiesCalendar, { type CalendarDay } from './MarketingActivitiesCalendar'
import MarketingActivitiesSheet from './MarketingActivitiesSheet'
import { useMarketingActivities } from '@/common/data/customer/hooks/useMarketingActivities'
import type { MarketingActivity } from '@/common/data/customer/queries/campaignDashboardQueries'

type MarketingActivitiesOverlayProps = BusinessAppContextProps

const activityColors: Record<string, string> = {
  event: 'gba:bg-success',
  content: 'gba:bg-info'
}

const MarketingActivitiesOverlay: React.FC<MarketingActivitiesOverlayProps> = context => {
  const { t } = useTranslation(translations)
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [activeView, setActiveView] = useState<'calendar' | 'gantt'>('calendar')
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [activitiesSheetOpen, setActivitiesSheetOpen] = useState(false)
  const [calendarActivities, setCalendarActivities] = useState<MarketingActivity[]>([])
  const [timelineActivities, setTimelineActivities] = useState<MarketingActivity[]>([])
  const { fetchCalendarActivities, fetchTimelineActivities, isLoading, error } = useMarketingActivities(context)

  const calendarRange = useMemo(
    () => ({
      fromDate: currentMonth.startOf('month').toISOString(),
      toDate: currentMonth.endOf('month').toISOString()
    }),
    [currentMonth]
  )

  const timelineRange = useMemo(
    () => ({
      fromDate: dayjs().subtract(1, 'month').startOf('month').toISOString(),
      toDate: dayjs().add(3, 'month').endOf('month').toISOString()
    }),
    []
  )

  React.useEffect(() => {
    if (activeView !== 'calendar') return

    let cancelled = false
    const loadCalendarActivities = async () => {
      const result = await fetchCalendarActivities(calendarRange)
      if (!cancelled) {
        setCalendarActivities(result)
      }
    }
    void loadCalendarActivities()

    return () => {
      cancelled = true
    }
  }, [activeView, calendarRange, fetchCalendarActivities])

  React.useEffect(() => {
    if (activeView !== 'gantt') return

    let cancelled = false
    const loadTimelineActivities = async () => {
      const result = await fetchTimelineActivities(timelineRange)
      if (!cancelled) {
        setTimelineActivities(result)
      }
    }
    void loadTimelineActivities()

    return () => {
      cancelled = true
    }
  }, [activeView, fetchTimelineActivities, timelineRange])

  const calendarDays = useMemo((): CalendarDay[] => {
    const startOfMonth = currentMonth.startOf('month')
    const endOfMonth = currentMonth.endOf('month')
    const startOfCalendar = startOfMonth.startOf('week')
    const endOfCalendar = endOfMonth.endOf('week')

    const days: CalendarDay[] = []
    let day = startOfCalendar

    while (day.isBefore(endOfCalendar) || day.isSame(endOfCalendar, 'day')) {
      const dayStr = day.format('YYYY-MM-DD')
      const dayActivities = calendarActivities.filter(a => {
        const activityDate = dayjs(a.date).format('YYYY-MM-DD')
        if (a.endDate) {
          const activityEnd = dayjs(a.endDate).format('YYYY-MM-DD')
          return dayStr >= activityDate && dayStr <= activityEnd
        }
        return dayStr === activityDate
      })

      days.push({
        date: day,
        activities: dayActivities,
        isCurrentMonth: day.month() === currentMonth.month()
      })
      day = day.add(1, 'day')
    }

    return days
  }, [currentMonth, calendarActivities])

  const ganttData = useMemo(() => {
    const startRange = dayjs(timelineRange.fromDate)
    const endRange = dayjs(timelineRange.toDate)
    const totalDays = endRange.diff(startRange, 'day')

    return timelineActivities
      .filter(a => {
        const start = dayjs(a.date)
        const end = a.endDate ? dayjs(a.endDate) : start
        return end.isAfter(startRange) && start.isBefore(endRange)
      })
      .map(a => {
        const start = dayjs(a.date)
        const end = a.endDate ? dayjs(a.endDate) : start.add(1, 'day')
        const leftPercent = Math.max(0, (start.diff(startRange, 'day') / totalDays) * 100)
        const widthPercent = Math.max(1, (end.diff(start, 'day') / totalDays) * 100)

        return {
          ...a,
          leftPercent: Math.min(leftPercent, 100),
          widthPercent: Math.min(widthPercent, 100 - leftPercent)
        }
      })
  }, [timelineActivities, timelineRange.fromDate, timelineRange.toDate])

  const months = useMemo(() => {
    const startRange = dayjs(timelineRange.fromDate)
    const endRange = dayjs(timelineRange.toDate)
    const result: { label: string; leftPercent: number; widthPercent: number }[] = []
    const totalDays = endRange.diff(startRange, 'day')
    let m = startRange

    while (m.isBefore(endRange)) {
      const monthEnd = m.endOf('month')
      const leftPercent = (m.diff(startRange, 'day') / totalDays) * 100
      const widthPercent = (monthEnd.diff(m, 'day') / totalDays) * 100
      result.push({ label: m.format('MMM YYYY'), leftPercent, widthPercent })
      m = m.add(1, 'month').startOf('month')
    }
    return result
  }, [timelineRange.fromDate, timelineRange.toDate])

  const handleCalendarDayClick = useCallback((day: CalendarDay) => {
    if (day.activities.length === 0) return
    setSelectedDay(day)
    setActivitiesSheetOpen(true)
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card data-testid="marketing-activities-overlay">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle>{t('dashboard-activities-title')}</CardTitle>
            <div className="gba:flex gba:gap-2">
              <Badge variant="success" data-testid="legend-event">
                {t('dashboard-activities-event')}
              </Badge>
              <Badge variant="info" data-testid="legend-content">
                {t('dashboard-activities-content')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="gba:text-destructive gba:text-sm gba:mb-4">{error}</p>}

          <Tabs
            value={activeView}
            onValueChange={(value: string) => {
              if (value === 'calendar' || value === 'gantt') {
                setActiveView(value)
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="calendar" data-testid="activities-calendar-tab">
                {t('dashboard-activities-calendarTab')}
              </TabsTrigger>
              <TabsTrigger value="gantt" data-testid="activities-gantt-tab">
                {t('dashboard-activities-timelineTab')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <MarketingActivitiesCalendar
                currentMonth={currentMonth}
                calendarDays={calendarDays}
                onMonthChange={setCurrentMonth}
                onDayClick={handleCalendarDayClick}
                t={t}
              />
            </TabsContent>

            <TabsContent value="gantt">
              <div className="gba:space-y-2">
                {/* Month headers */}
                <div className="gba:relative gba:h-8 gba:bg-muted gba:rounded">
                  {months.map(m => (
                    <div
                      key={m.label}
                      className="gba:absolute gba:top-0 gba:h-full gba:flex gba:items-center gba:text-xs gba:font-medium gba:px-2 gba:border-r gba:border-muted-foreground/20"
                      style={{ left: `${m.leftPercent}%`, width: `${m.widthPercent}%` }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>

                {/* Gantt rows */}
                <div className="gba:space-y-1">
                  {ganttData.map(item => (
                    <TooltipProvider key={item.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="gba:relative gba:h-8 gba:bg-muted/30 gba:rounded"
                            data-testid={`gantt-row-${item.id}`}
                          >
                            <div
                              className={`gba:absolute gba:top-1 gba:h-6 gba:rounded gba:flex gba:items-center gba:px-2 gba:text-xs gba:truncate ${
                                activityColors[item.type] || 'gba:bg-muted'
                              } gba:text-primary-foreground`}
                              style={{
                                left: `${item.leftPercent}%`,
                                width: `${Math.max(item.widthPercent, 2)}%`
                              }}
                            >
                              {item.title}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>
                            <p className="gba:font-medium">{item.title}</p>
                            <p className="gba:text-xs">
                              {item.type} · {dayjs(item.date).format('DD MMM')}
                              {item.endDate ? ` – ${dayjs(item.endDate).format('DD MMM')}` : ''}
                            </p>
                            {item.campaignName && (
                              <p className="gba:text-xs">
                                {t('dashboard-activities-campaignLabel')}: {item.campaignName}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                  {ganttData.length === 0 && (
                    <p className="gba:text-muted-foreground gba:text-sm gba:text-center gba:py-8">
                      {t('dashboard-activities-emptyTimeline')}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <MarketingActivitiesSheet
        open={activitiesSheetOpen}
        onOpenChange={setActivitiesSheetOpen}
        dateLabel={selectedDay?.date.format('MMMM D, YYYY') || ''}
        activities={selectedDay?.activities || []}
        t={t}
      />
    </>
  )
}

export default MarketingActivitiesOverlay
