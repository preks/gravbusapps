import React, { useMemo, useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayView } from '../../../../chat/calendar/components/DayView'
import { MonthView } from '../../../../chat/calendar/components/MonthView'
import { WeekView } from '../../../../chat/calendar/components/WeekView'
import type { CalendarViewData } from '../../../types/models'
import {
  type FlowbotCalendarView,
  getFlowbotCalendarCurrentDate,
  getFlowbotCalendarDateRange,
  mapFlowbotCalendarEvents
} from './flowbotCalendarAdapter'

interface FlowbotCalendarDisplayProps {
  data: CalendarViewData
}

export const FlowbotCalendarDisplay: React.FC<FlowbotCalendarDisplayProps> = ({ data }) => {
  const initialCurrentDate = useMemo(() => getFlowbotCalendarCurrentDate(data), [data])
  const initialView: FlowbotCalendarView = data.view === 'year' ? 'month' : data.view
  const [selectedView, setSelectedView] = useState<FlowbotCalendarView>(initialView)
  const [currentDate, setCurrentDate] = useState<Date>(initialCurrentDate)
  const dateRange = useMemo(() => getFlowbotCalendarDateRange(selectedView, currentDate), [selectedView, currentDate])
  const events = useMemo(() => mapFlowbotCalendarEvents(data.events), [data.events])
  const activeConversationCalls = useMemo(() => new Map<string, unknown>(), [])

  const onEventClick = () => {}
  const onDayClick = (date: Date) => {
    setCurrentDate(new Date(date))
  }
  const onTimeSlotClick = () => {}

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const goToPrevious = () => {
    const nextDate = new Date(currentDate)
    if (selectedView === 'day') {
      nextDate.setDate(nextDate.getDate() - 1)
    } else if (selectedView === 'week') {
      nextDate.setDate(nextDate.getDate() - 7)
    } else {
      nextDate.setMonth(nextDate.getMonth() - 1)
    }
    setCurrentDate(nextDate)
  }

  const goToNext = () => {
    const nextDate = new Date(currentDate)
    if (selectedView === 'day') {
      nextDate.setDate(nextDate.getDate() + 1)
    } else if (selectedView === 'week') {
      nextDate.setDate(nextDate.getDate() + 7)
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1)
    }
    setCurrentDate(nextDate)
  }

  const dateLabel = useMemo(() => {
    if (selectedView === 'day') {
      return dayjs(currentDate).format('DD MMM YYYY')
    }
    if (selectedView === 'week') {
      return `${dayjs(dateRange.start).format('DD MMM')} - ${dayjs(dateRange.end).format('DD MMM YYYY')}`
    }
    return dayjs(currentDate).format('MMMM YYYY')
  }, [currentDate, dateRange.end, dateRange.start, selectedView])

  const renderCalendarView = () => {
    if (selectedView === 'week') {
      return (
        <WeekView
          dateRange={dateRange}
          events={events}
          onEventClick={onEventClick}
          onTimeSlotClick={onTimeSlotClick}
          activeConversationCalls={activeConversationCalls}
        />
      )
    }

    if (selectedView === 'day') {
      return (
        <DayView
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
          onTimeSlotClick={onTimeSlotClick}
          activeConversationCalls={activeConversationCalls}
        />
      )
    }

    return (
      <MonthView
        dateRange={dateRange}
        currentDate={currentDate}
        events={events}
        onEventClick={onEventClick}
        onDayClick={onDayClick}
        activeConversationCalls={activeConversationCalls}
      />
    )
  }

  return (
    <Card data-testid="calendar-display">
      {(data.title || data.description) && (
        <CardHeader className="gba:pb-3">
          {data.title && <CardTitle className="gba:text-base">{data.title}</CardTitle>}
          {data.description && <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>}
          {data.view === 'year' && (
            <Badge variant="secondary" className="gba:w-fit">
              Year view shown as month
            </Badge>
          )}
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:flex-wrap">
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button
                size="sm"
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={goToPrevious}
                aria-label="Previous period"
              >
                <ChevronLeft className="gba:h-4 gba:w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={goToNext}
                aria-label="Next period"
              >
                <ChevronRight className="gba:h-4 gba:w-4" />
              </Button>
              <Button size="sm" variant="outline" className="gba:h-8" onClick={goToToday}>
                Today
              </Button>
            </div>
            <p className="gba:text-sm gba:font-medium gba:text-foreground">{dateLabel}</p>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              size="sm"
              variant={selectedView === 'day' ? 'default' : 'outline'}
              className="gba:h-8"
              onClick={() => setSelectedView('day')}
            >
              Day
            </Button>
            <Button
              size="sm"
              variant={selectedView === 'week' ? 'default' : 'outline'}
              className="gba:h-8"
              onClick={() => setSelectedView('week')}
            >
              Week
            </Button>
            <Button
              size="sm"
              variant={selectedView === 'month' ? 'default' : 'outline'}
              className="gba:h-8"
              onClick={() => setSelectedView('month')}
            >
              Month
            </Button>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <div className="gba:h-[520px]">{renderCalendarView()}</div>
      </CardContent>
    </Card>
  )
}
