/**
 * Calendar & Activities Widget
 * Shows appointments, planned tasks, and past activities
 */

import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Calendar as CalendarComponent
} from '@newwork/nw-design-system'
import {
  Calendar,
  Clock,
  CheckCircle,
  User,
  Users,
  Video,
  MapPin,
  ArrowRight,
  List,
  CalendarBlank
} from '@phosphor-icons/react'
import { formatDateTime, getTimeAgo } from '../utils/formatters'

interface Activity {
  id: string
  type: 'meeting' | 'task' | 'approval' | 'activity'
  title: string
  description?: string
  time: string
  status: 'completed' | 'upcoming' | 'in-progress'
  participants?: { name: string; avatar?: string }[]
  location?: string
}

export interface CalendarActivitiesWidgetProps extends BusinessAppContextProps {}

export const CalendarActivitiesWidget: React.FC<CalendarActivitiesWidgetProps> = (context) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Mock data - in real implementation, fetch from calendar API
  const upcomingActivities: Activity[] = [
    {
      id: '1',
      type: 'meeting',
      title: 'VIP-Kunde Weber - Investment-Beratung',
      description: 'Portfolio-Diversifikation besprechen',
      time: new Date(Date.now() + 3600000 * 2).toISOString(), // 2 hours from now
      status: 'upcoming',
      participants: [{ name: 'Herr Weber' }, { name: 'Sie' }],
      location: 'Beratungsraum 1'
    },
    {
      id: '2',
      type: 'meeting',
      title: 'Team-Meeting',
      description: 'Wöchentliche Filial-Besprechung',
      time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      status: 'upcoming',
      participants: [{ name: 'Team Hauptstraße' }],
      location: 'Konferenzraum'
    },
    {
      id: '3',
      type: 'task',
      title: 'Quartalsbericht vorbereiten',
      description: 'Q1 2025 Performance Review',
      time: new Date(Date.now() + 172800000).toISOString(), // 2 days
      status: 'upcoming'
    },
    {
      id: '4',
      type: 'meeting',
      title: 'Compliance-Schulung',
      description: 'Neue Geldwäsche-Richtlinien',
      time: new Date(Date.now() + 259200000).toISOString(), // 3 days
      status: 'upcoming',
      participants: [{ name: 'Compliance Team' }],
      location: 'Online'
    }
  ]

  const pastActivities: Activity[] = [
    {
      id: '5',
      type: 'approval',
      title: 'Kreditantrag - Müller GmbH genehmigt',
      description: '€150.000 Firmenkredit',
      time: new Date(Date.now() - 900000).toISOString(), // 15 min ago
      status: 'completed'
    },
    {
      id: '6',
      type: 'meeting',
      title: 'Neukundengespräch - Schmidt Immobilien',
      description: 'Baufinanzierung besprochen',
      time: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      status: 'completed',
      participants: [{ name: 'Herr Schmidt' }],
      location: 'Filiale Hauptstraße'
    },
    {
      id: '7',
      type: 'activity',
      title: 'Spesenabrechnung freigegeben',
      description: 'Thomas Berger - €245,50',
      time: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      status: 'completed'
    }
  ]

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'meeting':
        return <Video className="gba:h-5 gba:w-5 gba:text-info" />
      case 'task':
        return <CheckCircle className="gba:h-5 gba:w-5 gba:text-warning" />
      case 'approval':
        return <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
      case 'activity':
        return <Clock className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: Activity['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Abgeschlossen</Badge>
      case 'upcoming':
        return <Badge variant="info">Geplant</Badge>
      case 'in-progress':
        return <Badge variant="warning">Läuft</Badge>
    }
  }

  // Get appointments for selected date
  const appointmentsOnDate = useMemo(() => {
    const dateStr = selectedDate.toDateString()
    return upcomingActivities.filter(activity => {
      const activityDate = new Date(activity.time).toDateString()
      return activityDate === dateStr
    })
  }, [selectedDate, upcomingActivities])

  // Get dates with appointments for calendar highlighting
  const datesWithAppointments = useMemo(() => {
    return upcomingActivities.map(activity => new Date(activity.time))
  }, [upcomingActivities])

  return (
    <Card data-testid="calendar-activities-widget">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Calendar className="gba:h-5 gba:w-5" />
              Kalender & Aktivitäten
            </CardTitle>
            <CardDescription>
              {upcomingActivities.length} geplant • {pastActivities.length} heute abgeschlossen
            </CardDescription>
          </div>
          <div className="gba:flex gba:gap-1">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarBlank className="gba:h-4 gba:w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'calendar' ? (
          <div className="gba:space-y-4">
            {/* Calendar View */}
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="gba:rounded-md gba:border"
              modifiers={{
                hasAppointment: datesWithAppointments
              }}
              modifiersStyles={{
                hasAppointment: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  color: 'var(--primary)'
                }
              }}
            />

            {/* Appointments on selected date */}
            <div>
              <h4 className="gba:text-sm gba:font-medium gba:mb-3">
                Termine am {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
              </h4>
              {appointmentsOnDate.length === 0 ? (
                <div className="gba:text-center gba:py-6 gba:text-sm gba:text-muted-foreground">
                  <CalendarBlank className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:opacity-50" />
                  Keine Termine an diesem Tag
                </div>
              ) : (
                <div className="gba:space-y-2">
                  {appointmentsOnDate.map(activity => (
                    <div
                      key={activity.id}
                      className="gba:p-3 gba:border gba:rounded-lg gba:bg-card hover:gba:shadow-md gba:transition-shadow"
                    >
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                        {getActivityIcon(activity.type)}
                        <span className="gba:font-medium gba:text-sm">{activity.title}</span>
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:space-y-1 gba:ml-7">
                        <p className="gba:flex gba:items-center gba:gap-1">
                          <Clock className="gba:h-3 gba:w-3" />
                          {new Date(activity.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {activity.location && (
                          <p className="gba:flex gba:items-center gba:gap-1">
                            <MapPin className="gba:h-3 gba:w-3" />
                            {activity.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
              <TabsTrigger value="upcoming">
                Geplant ({upcomingActivities.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Erledigt ({pastActivities.length})
              </TabsTrigger>
            </TabsList>

          <TabsContent value="upcoming" className="gba:mt-4">
            <div className="gba:space-y-3 gba:max-h-[400px] gba:overflow-y-auto gba:pr-2">
              {upcomingActivities.map(activity => (
                <div
                  key={activity.id}
                  className="gba:p-4 gba:border gba:rounded-lg hover:gba:bg-accent gba:cursor-pointer gba:transition-colors"
                  data-testid={`upcoming-activity-${activity.id}`}
                >
                  <div className="gba:flex gba:items-start gba:gap-3">
                    {getActivityIcon(activity.type)}
                    <div className="gba:flex-1">
                      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-1">
                        <h4 className="gba:font-medium gba:text-sm">{activity.title}</h4>
                        {getStatusBadge(activity.status)}
                      </div>
                      {activity.description && (
                        <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">{activity.description}</p>
                      )}
                      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Clock className="gba:h-3 gba:w-3" />
                          {formatDateTime(activity.time)}
                        </span>
                        {activity.location && (
                          <span className="gba:flex gba:items-center gba:gap-1">
                            <MapPin className="gba:h-3 gba:w-3" />
                            {activity.location}
                          </span>
                        )}
                        {activity.participants && activity.participants.length > 0 && (
                          <span className="gba:flex gba:items-center gba:gap-1">
                            {activity.participants.length === 1 ? (
                              <User className="gba:h-3 gba:w-3" />
                            ) : (
                              <Users className="gba:h-3 gba:w-3" />
                            )}
                            {activity.participants.map(p => p.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="past" className="gba:mt-4">
            <div className="gba:space-y-3 gba:max-h-[400px] gba:overflow-y-auto gba:pr-2">
              {pastActivities.map(activity => (
                <div
                  key={activity.id}
                  className="gba:p-4 gba:border gba:rounded-lg gba:opacity-80"
                  data-testid={`past-activity-${activity.id}`}
                >
                  <div className="gba:flex gba:items-start gba:gap-3">
                    {getActivityIcon(activity.type)}
                    <div className="gba:flex-1">
                      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-1">
                        <h4 className="gba:font-medium gba:text-sm">{activity.title}</h4>
                        <CheckCircle className="gba:h-4 gba:w-4 gba:text-success" />
                      </div>
                      {activity.description && (
                        <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">{activity.description}</p>
                      )}
                      <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                        <span>{getTimeAgo(activity.time)}</span>
                        {activity.location && (
                          <span className="gba:flex gba:items-center gba:gap-1">
                            <MapPin className="gba:h-3 gba:w-3" />
                            {activity.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          </Tabs>
        )}

        {/* Quick Action */}
        <div className="gba:mt-4 gba:pt-4 gba:border-t">
          <Button variant="outline" className="gba:w-full" onClick={() => console.log('Open full calendar')}>
            <Calendar className="gba:h-4 gba:w-4 gba:mr-2" />
            Vollständigen Kalender öffnen
            <ArrowRight className="gba:h-4 gba:w-4 gba:ml-auto" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

