/**
 * Full Page Calendar View
 * Shows week view with time slots and appointments from manager and team
 */

import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDirectReports } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useDirectReports'
import {
  Card,
  CardContent,
  Badge,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import {
  Calendar,
  Clock,
  Video,
  CheckCircle,
  User,
  MapPin,
  CaretLeft,
  CaretRight,
  FunnelSimple
} from '@phosphor-icons/react'

interface CalendarEvent {
  id: string
  type: 'meeting' | 'task' | 'approval' | 'training'
  title: string
  description?: string
  startTime: Date
  endTime: Date
  employeeId?: string
  employeeName?: string
  employeeAvatar?: string
  location?: string
  color?: string
}

export const FullPageCalendar: React.FC<BusinessAppContextProps> = (context) => {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [calendarView, setCalendarView] = useState<'my-calendar' | 'team-calendar'>('my-calendar')
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('all')

  // Get real team members
  const { directReports } = useDirectReports({
    accessToken: context.accessToken,
    managerId: context.userInfo?.employeeDetails?.employeeId || ''
  })

  // Generate week days
  const weekDays = useMemo(() => {
    const start = new Date(currentWeek)
    start.setDate(start.getDate() - start.getDay() + 1) // Monday
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }, [currentWeek])

  // Generate events using real team members
  const events: CalendarEvent[] = useMemo(() => {
    const now = new Date()
    const generatedEvents: CalendarEvent[] = []

    // Use real team members or fallback
    const teamMembers = directReports && directReports.length > 0 
      ? directReports.map(r => ({
          id: r.id,
          name: r.fullName,
          avatar: r.pictureThumbnail
        }))
      : [
          { id: '1', name: 'Anna Weber', avatar: undefined },
          { id: '2', name: 'Michael Fischer', avatar: undefined },
          { id: '3', name: 'Thomas Berger', avatar: undefined }
        ]

    // Today's events
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    // Morning meeting with VIP customer
    const vipMeeting = new Date(today)
    vipMeeting.setHours(10, 0, 0, 0)
    generatedEvents.push({
      id: 'evt-1',
      type: 'meeting',
      title: 'VIP-Kunde Weber - Investment-Beratung',
      description: 'Portfolio-Diversifikation und Anlagestrategien',
      startTime: vipMeeting,
      endTime: new Date(vipMeeting.getTime() + 90 * 60000), // 1.5 hours
      employeeName: context.userInfo?.employeeDetails?.firstName || 'Sie',
      location: 'Beratungsraum 1',
      color: '#3B82F6' // Blue
    })

    // Afternoon team meeting
    const teamMeeting = new Date(today)
    teamMeeting.setHours(14, 0, 0, 0)
    generatedEvents.push({
      id: 'evt-2',
      type: 'meeting',
      title: 'Team-Meeting Filiale Hauptstraße',
      description: `Wöchentliche Besprechung mit ${teamMembers.length} Mitarbeitern`,
      startTime: teamMeeting,
      endTime: new Date(teamMeeting.getTime() + 60 * 60000), // 1 hour
      employeeName: 'Team',
      location: 'Konferenzraum',
      color: '#8B5CF6' // Purple
    })

    // Tomorrow - 1-on-1 with team member
    if (teamMembers.length > 0) {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 30, 0, 0)
      
      generatedEvents.push({
        id: 'evt-3',
        type: 'meeting',
        title: `1-on-1: ${teamMembers[0].name}`,
        description: 'Quartalsgespräch, Ziele und Entwicklung',
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 45 * 60000), // 45 min
        employeeId: teamMembers[0].id,
        employeeName: teamMembers[0].name,
        employeeAvatar: teamMembers[0].avatar,
        location: 'Ihr Büro',
        color: '#10B981' // Green
      })
    }

    // Day after tomorrow - Compliance training
    const dayAfter = new Date(today)
    dayAfter.setDate(dayAfter.getDate() + 2)
    dayAfter.setHours(9, 0, 0, 0)
    
    generatedEvents.push({
      id: 'evt-4',
      type: 'training',
      title: 'Compliance-Schulung: AML-Richtlinien',
      description: 'Pflichtschulung für alle Berater',
      startTime: dayAfter,
      endTime: new Date(dayAfter.getTime() + 120 * 60000), // 2 hours
      employeeName: 'Compliance Team',
      location: 'Online (Teams)',
      color: '#F59E0B' // Orange
    })

    // Team member meetings throughout the week
    teamMembers.forEach((member, idx) => {
      // Multiple events per team member
      for (let eventIdx = 0; eventIdx < 2; eventIdx++) {
        const meetingDate = new Date(today)
        meetingDate.setDate(meetingDate.getDate() + (idx % 5)) // Spread across week
        meetingDate.setHours(9 + (idx * 2 + eventIdx) % 8, eventIdx * 30, 0, 0)
        
        const eventTypes = [
          { title: 'Kundengespräch', desc: 'Beratung und Verkauf', color: '#3B82F6' },
          { title: 'Interne Besprechung', desc: 'Team-Abstimmung', color: '#8B5CF6' },
          { title: 'Compliance-Check', desc: 'AML-Prüfung', color: '#F59E0B' },
          { title: 'Kundenakquise', desc: 'Neukundengewinnung', color: '#10B981' }
        ]
        const eventType = eventTypes[(idx + eventIdx) % eventTypes.length]
        
        generatedEvents.push({
          id: `evt-team-${idx}-${eventIdx}`,
          type: 'meeting',
          title: `${member.name}: ${eventType.title}`,
          description: eventType.desc,
          startTime: meetingDate,
          endTime: new Date(meetingDate.getTime() + (30 + eventIdx * 15) * 60000),
          employeeId: member.id,
          employeeName: member.name,
          employeeAvatar: member.avatar,
          location: eventIdx === 0 ? 'Filiale' : 'Kundenstandort',
          color: eventType.color
        })
      }
    })

    // Tasks
    const taskDate = new Date(today)
    taskDate.setDate(taskDate.getDate() + 4)
    taskDate.setHours(16, 0, 0, 0)
    
    generatedEvents.push({
      id: 'task-1',
      type: 'task',
      title: 'Quartalsbericht Q1 2025 fertigstellen',
      description: 'Deadline für Filial-Performance Report',
      startTime: taskDate,
      endTime: new Date(taskDate.getTime() + 60 * 60000),
      color: '#EF4444' // Red for deadline
    })

    return generatedEvents
  }, [directReports, context.userInfo])

  // Time slots (8 AM to 6 PM)
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 8; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return slots
  }, [])

  // Get events for a specific day and time
  const getEventsForDayAndTime = (day: Date, hour: number) => {
    return events.filter(event => {
      const eventDay = event.startTime.toDateString()
      const dayStr = day.toDateString()
      const eventHour = event.startTime.getHours()
      
      return eventDay === dayStr && eventHour === hour
    })
  }

  // Navigate week
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  const goToToday = () => {
    setCurrentWeek(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Filter events based on view and selected team member
  const filteredEvents = useMemo(() => {
    if (calendarView === 'my-calendar') {
      // Show only manager's own events
      return events.filter(e => !e.employeeId || e.employeeName === context.userInfo?.employeeDetails?.firstName)
    } else {
      // Team calendar - filter by selected member or show all
      if (selectedTeamMember === 'all') {
        return events.filter(e => e.employeeId) // All team member events
      } else {
        return events.filter(e => e.employeeId === selectedTeamMember)
      }
    }
  }, [events, calendarView, selectedTeamMember, context.userInfo])

  // Get events for a specific day and time (using filtered events)
  const getEventsForDayAndTimeFiltered = (day: Date, hour: number) => {
    return filteredEvents.filter(event => {
      const eventDay = event.startTime.toDateString()
      const dayStr = day.toDateString()
      const eventHour = event.startTime.getHours()
      
      return eventDay === dayStr && eventHour === hour
    })
  }

  // Team members for filter dropdown
  const teamMemberOptions = useMemo(() => {
    const members = directReports && directReports.length > 0 
      ? directReports.map(r => ({ id: r.id, name: r.fullName }))
      : [
          { id: '1', name: 'Anna Weber' },
          { id: '2', name: 'Michael Fischer' },
          { id: '3', name: 'Thomas Berger' }
        ]
    return [{ id: 'all', name: 'Alle Mitarbeiter' }, ...members]
  }, [directReports])

  return (
    <div className="gba:space-y-4" data-testid="full-page-calendar">
      {/* Calendar Tabs (Mein Kalender / Mein Team) */}
      <Tabs value={calendarView} onValueChange={(value) => setCalendarView(value as typeof calendarView)}>
        <TabsList>
          <TabsTrigger value="my-calendar">Mein Kalender</TabsTrigger>
          <TabsTrigger value="team-calendar">Mein Team</TabsTrigger>
        </TabsList>

        <TabsContent value={calendarView} className="gba:mt-4">
          {/* Calendar Header */}
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h2 className="gba:text-2xl gba:font-bold">
            {weekDays[0].toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </h2>
          <Badge variant="info">
            KW {Math.ceil((weekDays[0].getDate() + weekDays[0].getDay()) / 7)}
          </Badge>
        </div>
        <div className="gba:flex gba:items-center gba:gap-3">
          {/* Team Member Filter (only in team view) */}
          {calendarView === 'team-calendar' && (
            <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
              <SelectTrigger className="gba:w-[220px]">
                <FunnelSimple className="gba:h-4 gba:w-4 gba:mr-2" />
                <SelectValue placeholder="Mitarbeiter filtern" />
              </SelectTrigger>
              <SelectContent>
                {teamMemberOptions.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="gba:flex gba:gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <CaretLeft className="gba:h-4 gba:w-4" />
            </Button>
            <Button variant="default" size="sm" onClick={goToToday}>
              Heute
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <CaretRight className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        </div>
      </div>

          {/* Event Count Badge */}
          <div className="gba:mb-3">
            <Badge variant="info">
              {filteredEvents.length} {calendarView === 'my-calendar' ? 'Ihre Termine' : 'Team-Aktivitäten'}
              {calendarView === 'team-calendar' && selectedTeamMember !== 'all' && 
                ` (${teamMemberOptions.find(m => m.id === selectedTeamMember)?.name})`
              }
            </Badge>
          </div>

      {/* Week Calendar Grid */}
      <Card>
        <CardContent className="gba:p-0">
          <div className="gba:overflow-x-auto">
            <table className="gba:w-full gba:border-collapse">
              <thead>
                <tr>
                  <th className="gba:w-20 gba:p-2 gba:border gba:bg-muted gba:sticky gba:left-0 gba:z-10">
                    <Clock className="gba:h-4 gba:w-4 gba:mx-auto gba:text-muted-foreground" />
                  </th>
                  {weekDays.map(day => (
                    <th
                      key={day.toISOString()}
                      className={`gba:p-3 gba:border gba:text-center gba:min-w-[150px] ${
                        isToday(day) ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-muted'
                      }`}
                    >
                      <div className="gba:font-semibold">
                        {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                      </div>
                      <div className={`gba:text-sm ${isToday(day) ? '' : 'gba:text-muted-foreground'}`}>
                        {day.getDate()}.{(day.getMonth() + 1).toString().padStart(2, '0')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(timeSlot => {
                  const hour = parseInt(timeSlot.split(':')[0])
                  
                  return (
                    <tr key={timeSlot}>
                      <td className="gba:p-2 gba:border gba:bg-muted gba:text-center gba:text-sm gba:font-medium gba:sticky gba:left-0 gba:z-10">
                        {timeSlot}
                      </td>
                      {weekDays.map(day => {
                        const dayEvents = getEventsForDayAndTimeFiltered(day, hour)
                        
                        return (
                          <td
                            key={`${day.toISOString()}-${timeSlot}`}
                            className={`gba:p-1 gba:border gba:align-top gba:h-20 ${
                              isToday(day) ? 'gba:bg-primary/5' : ''
                            }`}
                          >
                            {dayEvents.map(event => (
                              <div
                                key={event.id}
                                className="gba:p-2 gba:rounded gba:text-xs gba:cursor-pointer gba:mb-1 hover:gba:shadow-md gba:transition-shadow"
                                style={{
                                  backgroundColor: event.color || '#3B82F6',
                                  color: 'white'
                                }}
                                onClick={() => setSelectedEvent(event)}
                              >
                                <div className="gba:font-medium gba:mb-0.5">{event.title}</div>
                                <div className="gba:opacity-90">
                                  {event.startTime.getHours().toString().padStart(2, '0')}:
                                  {event.startTime.getMinutes().toString().padStart(2, '0')} -
                                  {event.endTime.getHours().toString().padStart(2, '0')}:
                                  {event.endTime.getMinutes().toString().padStart(2, '0')}
                                </div>
                                {event.employeeName && (
                                  <div className="gba:opacity-80 gba:mt-1">
                                    {event.employeeName}
                                  </div>
                                )}
                              </div>
                            ))}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Legend */}
      <div className="gba:flex gba:items-center gba:gap-4 gba:flex-wrap">
        <span className="gba:text-sm gba:text-muted-foreground">Legende:</span>
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: '#3B82F6' }} />
          <span className="gba:text-sm">Kunden-Meetings</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: '#8B5CF6' }} />
          <span className="gba:text-sm">Team-Meetings</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: '#10B981' }} />
          <span className="gba:text-sm">1-on-1 Gespräche</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: '#F59E0B' }} />
          <span className="gba:text-sm">Schulungen</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: '#EF4444' }} />
          <span className="gba:text-sm">Aufgaben/Deadlines</span>
        </div>
      </div>

      {/* Event Detail Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent className="gba:p-6">
          <SheetHeader className="gba:mb-6">
            <SheetTitle className="gba:flex gba:items-center gba:gap-2">
              {selectedEvent?.type === 'meeting' ? (
                <Video className="gba:h-5 gba:w-5" />
              ) : (
                <CheckCircle className="gba:h-5 gba:w-5" />
              )}
              {selectedEvent?.title}
            </SheetTitle>
            <SheetDescription>
              {selectedEvent?.description}
            </SheetDescription>
          </SheetHeader>

          {selectedEvent && (
            <div className="gba:space-y-4">
              {/* Time */}
              <div className="gba:p-4 gba:bg-muted gba:rounded-lg">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  <Clock className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  <span className="gba:font-medium">Zeit</span>
                </div>
                <p className="gba:text-sm">
                  {selectedEvent.startTime.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
                </p>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {selectedEvent.startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {selectedEvent.endTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  {' '}({Math.round((selectedEvent.endTime.getTime() - selectedEvent.startTime.getTime()) / 60000)} Min)
                </p>
              </div>

              {/* Participant */}
              {selectedEvent.employeeName && (
                <div className="gba:p-4 gba:bg-muted gba:rounded-lg">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                    <User className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    <span className="gba:font-medium">Teilnehmer</span>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-3">
                    {selectedEvent.employeeAvatar ? (
                      <Avatar className="gba:h-10 gba:w-10">
                        <AvatarImage
                          src={
                            selectedEvent.employeeAvatar && !selectedEvent.employeeAvatar.startsWith('{')
                              ? `data:image/jpeg;base64,${selectedEvent.employeeAvatar}`
                              : undefined
                          }
                          alt={selectedEvent.employeeName}
                        />
                        <AvatarFallback>
                          {selectedEvent.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                    <span className="gba:text-sm">{selectedEvent.employeeName}</span>
                  </div>
                </div>
              )}

              {/* Location */}
              {selectedEvent.location && (
                <div className="gba:p-4 gba:bg-muted gba:rounded-lg">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                    <MapPin className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    <span className="gba:font-medium">Ort</span>
                  </div>
                  <p className="gba:text-sm">{selectedEvent.location}</p>
                </div>
              )}

              {/* Actions */}
              <div className="gba:flex gba:gap-2 gba:pt-4">
                {selectedEvent.type === 'meeting' && (
                  <Button className="gba:flex-1">
                    <Video className="gba:h-4 gba:w-4 gba:mr-2" />
                    Meeting beitreten
                  </Button>
                )}
                <Button variant="outline" className="gba:flex-1">
                  Details bearbeiten
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default FullPageCalendar

