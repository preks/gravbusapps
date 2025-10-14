/**
 * Calendar View Component
 * Large visual calendar with appointments from real team members
 * Click on dates to see detailed drawer
 */

import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDirectReports } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useDirectReports'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Calendar as CalendarComponent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import {
  Calendar,
  Clock,
  Video,
  CheckCircle,
  User,
  MapPin,
  ArrowRight
} from '@phosphor-icons/react'

interface CalendarActivity {
  id: string
  type: 'meeting' | 'task' | 'approval'
  title: string
  description?: string
  time: Date
  employeeId?: string
  employeeName?: string
  employeeAvatar?: string
  location?: string
  status: 'upcoming' | 'completed'
}

export interface CalendarViewProps extends BusinessAppContextProps {}

export const CalendarView: React.FC<CalendarViewProps> = (context) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Get real team members
  const { directReports, loading } = useDirectReports({
    accessToken: context.accessToken,
    managerId: context.userInfo?.employeeDetails?.employeeId || ''
  })

  // Generate activities using real team members
  const activities: CalendarActivity[] = useMemo(() => {
    const now = new Date()
    const generatedActivities: CalendarActivity[] = []

    // Use real team members or fallback to mock
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

    // VIP Customer meeting (2 hours from now)
    generatedActivities.push({
      id: 'meet-1',
      type: 'meeting',
      title: 'VIP-Kunde Weber - Investment-Beratung',
      description: 'Portfolio-Diversifikation und Anlagestrategien besprechen',
      time: new Date(now.getTime() + 2 * 3600000),
      employeeName: 'Sie',
      location: 'Beratungsraum 1',
      status: 'upcoming'
    })

    // Team meeting (tomorrow)
    if (teamMembers.length > 0) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      
      generatedActivities.push({
        id: 'meet-2',
        type: 'meeting',
        title: 'Team-Meeting Filiale Hauptstraße',
        description: 'Wöchentliche Besprechung, Q1 Performance Review',
        time: tomorrow,
        employeeName: `Team (${teamMembers.length} Personen)`,
        location: 'Konferenzraum',
        status: 'upcoming'
      })
    }

    // 1-on-1 with team member (in 3 days)
    if (teamMembers.length > 0) {
      const in3Days = new Date(now)
      in3Days.setDate(in3Days.getDate() + 3)
      in3Days.setHours(14, 0, 0, 0)
      
      generatedActivities.push({
        id: 'meet-3',
        type: 'meeting',
        title: `1-on-1 mit ${teamMembers[0].name}`,
        description: 'Quartalsgespräch, Ziele und Entwicklung',
        time: in3Days,
        employeeId: teamMembers[0].id,
        employeeName: teamMembers[0].name,
        employeeAvatar: teamMembers[0].avatar,
        location: 'Ihr Büro',
        status: 'upcoming'
      })
    }

    // Compliance training (in 5 days)
    const in5Days = new Date(now)
    in5Days.setDate(in5Days.getDate() + 5)
    in5Days.setHours(9, 30, 0, 0)
    
    generatedActivities.push({
      id: 'meet-4',
      type: 'meeting',
      title: 'Compliance-Schulung: Neue AML-Richtlinien',
      description: 'Pflichtschulung für alle Berater',
      time: in5Days,
      employeeName: 'Compliance Team',
      location: 'Online (Teams)',
      status: 'upcoming'
    })

    // Tasks
    generatedActivities.push({
      id: 'task-1',
      type: 'task',
      title: 'Quartalsbericht Q1 2025 vorbereiten',
      description: 'Performance Review und Zielplanung Q2',
      time: new Date(now.getTime() + 2 * 86400000), // 2 days
      status: 'upcoming'
    })

    // Past activities (completed today)
    const earlier = new Date(now)
    earlier.setHours(9, 0, 0, 0)
    
    generatedActivities.push({
      id: 'past-1',
      type: 'approval',
      title: 'Kreditantrag Müller GmbH genehmigt',
      description: '€150.000 Firmenkredit',
      time: earlier,
      status: 'completed'
    })

    return generatedActivities
  }, [directReports])

  // Get activities for selected date
  const activitiesOnDate = useMemo(() => {
    if (!selectedDate) return []
    
    const dateStr = selectedDate.toDateString()
    return activities.filter(activity => {
      const activityDate = activity.time.toDateString()
      return activityDate === dateStr
    })
  }, [selectedDate, activities])

  // Get dates with activities for calendar highlighting
  const datesWithActivities = useMemo(() => {
    return activities.map(activity => activity.time)
  }, [activities])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setDrawerOpen(true)
    }
  }

  const getActivityIcon = (type: CalendarActivity['type']) => {
    switch (type) {
      case 'meeting':
        return <Video className="gba:h-5 gba:w-5 gba:text-info" />
      case 'task':
        return <CheckCircle className="gba:h-5 gba:w-5 gba:text-warning" />
      case 'approval':
        return <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
    }
  }

  const getStatusBadge = (status: CalendarActivity['status']) => {
    return status === 'completed' ? (
      <Badge variant="success">Abgeschlossen</Badge>
    ) : (
      <Badge variant="info">Geplant</Badge>
    )
  }

  return (
    <>
      <Card data-testid="calendar-view">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:h-5 gba:w-5" />
            Kalender
          </CardTitle>
          <CardDescription>
            {activities.filter(a => a.status === 'upcoming').length} geplante Termine • Klicken Sie auf ein Datum für Details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Large Calendar */}
          <div className="gba:flex gba:justify-center">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="gba:rounded-lg gba:border gba:p-3"
              modifiers={{
                hasActivity: datesWithActivities,
                today: new Date()
              }}
              modifiersClassNames={{
                hasActivity: 'gba:font-bold gba:text-primary gba:underline',
                today: 'gba:bg-primary gba:text-primary-foreground gba:rounded-md'
              }}
            />
          </div>

          {/* Today's Appointments Preview */}
          <div className="gba:mt-6 gba:pt-4 gba:border-t">
            <h4 className="gba:text-sm gba:font-medium gba:mb-3 gba:flex gba:items-center gba:gap-2">
              <Clock className="gba:h-4 gba:w-4" />
              Heute ({activitiesOnDate.filter(a => a.time.toDateString() === new Date().toDateString()).length})
            </h4>
            <div className="gba:space-y-2">
              {activitiesOnDate
                .filter(a => a.time.toDateString() === new Date().toDateString())
                .slice(0, 3)
                .map(activity => (
                  <div
                    key={activity.id}
                    className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:bg-muted gba:rounded-lg"
                  >
                    {getActivityIcon(activity.type)}
                    <div className="gba:flex-1 gba:min-w-0">
                      <p className="gba:text-sm gba:font-medium gba:truncate">{activity.title}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {activity.time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>
                ))}
              {activitiesOnDate.filter(a => a.time.toDateString() === new Date().toDateString()).length === 0 && (
                <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
                  Keine Termine heute
                </p>
              )}
            </div>
          </div>

          {/* Quick Action */}
          <div className="gba:mt-4">
            <Button 
              variant="outline" 
              className="gba:w-full" 
              onClick={() => setDrawerOpen(true)}
            >
              <Calendar className="gba:h-4 gba:w-4 gba:mr-2" />
              Alle Termine anzeigen
              <ArrowRight className="gba:h-4 gba:w-4 gba:ml-auto" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Drawer with full day details */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="gba:w-[500px] gba:overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="gba:flex gba:items-center gba:gap-2">
              <Calendar className="gba:h-5 gba:w-5" />
              {selectedDate?.toLocaleDateString('de-DE', { 
                weekday: 'long', 
                day: '2-digit', 
                month: 'long',
                year: 'numeric'
              })}
            </SheetTitle>
            <SheetDescription>
              {activitiesOnDate.length} {activitiesOnDate.length === 1 ? 'Termin' : 'Termine'} an diesem Tag
            </SheetDescription>
          </SheetHeader>

          <div className="gba:mt-6 gba:space-y-4">
            {activitiesOnDate.length === 0 ? (
              <div className="gba:text-center gba:py-12">
                <Calendar className="gba:h-16 gba:w-16 gba:mx-auto gba:mb-4 gba:text-muted-foreground gba:opacity-50" />
                <p className="gba:text-muted-foreground">Keine Termine an diesem Tag</p>
              </div>
            ) : (
              activitiesOnDate.map(activity => (
                <Card key={activity.id} className="gba:overflow-hidden">
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-start gba:gap-4">
                      {/* Time Badge */}
                      <div className="gba:flex gba:flex-col gba:items-center gba:min-w-[60px] gba:p-2 gba:bg-primary/10 gba:rounded-lg">
                        <span className="gba:text-2xl gba:font-bold gba:text-primary">
                          {activity.time.getHours().toString().padStart(2, '0')}
                        </span>
                        <span className="gba:text-sm gba:text-primary">
                          {activity.time.getMinutes().toString().padStart(2, '0')}
                        </span>
                      </div>

                      {/* Activity Details */}
                      <div className="gba:flex-1">
                        <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-2">
                          <div>
                            <h4 className="gba:font-semibold gba:mb-1">{activity.title}</h4>
                            {activity.description && (
                              <p className="gba:text-sm gba:text-muted-foreground">{activity.description}</p>
                            )}
                          </div>
                          {getStatusBadge(activity.status)}
                        </div>

                        {/* Metadata */}
                        <div className="gba:space-y-2 gba:mt-3">
                          {activity.employeeName && (
                            <div className="gba:flex gba:items-center gba:gap-2">
                              {activity.employeeAvatar ? (
                                <Avatar className="gba:h-6 gba:w-6">
                                  <AvatarImage
                                    src={
                                      activity.employeeAvatar && !activity.employeeAvatar.startsWith('{')
                                        ? `data:image/jpeg;base64,${activity.employeeAvatar}`
                                        : undefined
                                    }
                                    alt={activity.employeeName}
                                  />
                                  <AvatarFallback className="gba:text-xs">
                                    {activity.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <User className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                              )}
                              <span className="gba:text-sm gba:text-muted-foreground">{activity.employeeName}</span>
                            </div>
                          )}
                          
                          {activity.location && (
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <MapPin className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                              <span className="gba:text-sm gba:text-muted-foreground">{activity.location}</span>
                            </div>
                          )}

                          {/* Activity Type Badge */}
                          <div className="gba:flex gba:items-center gba:gap-2">
                            {getActivityIcon(activity.type)}
                            <span className="gba:text-xs gba:text-muted-foreground">
                              {activity.type === 'meeting' ? 'Meeting' : activity.type === 'task' ? 'Aufgabe' : 'Genehmigung'}
                            </span>
                          </div>
                        </div>

                        {/* Actions for upcoming */}
                        {activity.status === 'upcoming' && (
                          <div className="gba:flex gba:gap-2 gba:mt-4">
                            <Button size="sm" variant="outline" className="gba:flex-1">
                              Details
                            </Button>
                            <Button size="sm" variant="default" className="gba:flex-1">
                              <Video className="gba:h-3 gba:w-3 gba:mr-1" />
                              Beitreten
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Drawer Actions */}
          <div className="gba:mt-6 gba:pt-4 gba:border-t">
            <Button variant="outline" className="gba:w-full" onClick={() => console.log('Add new appointment')}>
              <Calendar className="gba:h-4 gba:w-4 gba:mr-2" />
              Neuen Termin erstellen
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

