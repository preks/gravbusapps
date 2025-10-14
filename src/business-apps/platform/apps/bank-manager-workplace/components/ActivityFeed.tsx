/**
 * Activity Feed Component
 * Real-time updates on team activities, approvals, and customer interactions
 */

import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ScrollArea,
  Avatar,
  AvatarFallback,
  Badge
} from '@newwork/nw-design-system'
import {
  CheckCircle,
  UserCircle,
  FileText,
  CurrencyDollar,
  Users,
  Bell
} from '@phosphor-icons/react'
import { ActivityItem } from '../types/banking.types'
import { getTimeAgo } from '../utils/formatters'

export interface ActivityFeedProps extends BusinessAppContextProps {
  maxItems?: number
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ maxItems = 10, ...context }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([])

  // Listen for process completions to add to activity feed
  useProcessCompletion({
    onSuccess: () => {
      // Add new activity when a process completes
      const newActivity: ActivityItem = {
        id: `activity-${Date.now()}`,
        type: 'process-completion',
        title: 'Prozess abgeschlossen',
        description: 'Ein Workflow wurde erfolgreich abgeschlossen',
        timestamp: new Date().toISOString(),
        status: 'completed'
      }
      setActivities(prev => [newActivity, ...prev].slice(0, maxItems))
    }
  })

  // Initialize with mock activities (in real implementation, fetch from API)
  useEffect(() => {
    const mockActivities: ActivityItem[] = [
      {
        id: 'act-1',
        type: 'approval',
        title: 'Kreditantrag genehmigt',
        description: 'Müller GmbH - €150.000 Firmenkredit',
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15 min ago
        actor: {
          id: 'you',
          name: 'Sie'
        },
        status: 'completed',
        icon: 'check-circle'
      },
      {
        id: 'act-2',
        type: 'customer-interaction',
        title: 'VIP-Kunde Termin bestätigt',
        description: 'Weber Industries AG - Investment-Beratung, morgen 14:00',
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
        actor: {
          id: 'emp-1',
          name: 'Anna Weber'
        },
        status: 'completed',
        icon: 'user'
      },
      {
        id: 'act-3',
        type: 'team-activity',
        title: 'Urlaubsantrag eingereicht',
        description: 'Michael Fischer - 2 Wochen ab 15.03.2025',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        actor: {
          id: 'emp-2',
          name: 'Michael Fischer'
        },
        status: 'pending',
        icon: 'calendar'
      },
      {
        id: 'act-4',
        type: 'approval',
        title: 'Spesenabrechnung freigegeben',
        description: 'Thomas Berger - €245,50 Reisekosten',
        timestamp: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
        actor: {
          id: 'you',
          name: 'Sie'
        },
        status: 'completed',
        icon: 'check-circle'
      },
      {
        id: 'act-5',
        type: 'system-notification',
        title: 'Compliance-Score aktualisiert',
        description: 'Filiale Hauptstraße: 98% (↑ 2%)',
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        status: 'completed',
        icon: 'bell'
      }
    ]

    setActivities(mockActivities)
  }, [maxItems])

  const getActivityIcon = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'approval':
        return <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
      case 'customer-interaction':
        return <UserCircle className="gba:h-5 gba:w-5 gba:text-info" />
      case 'team-activity':
        return <Users className="gba:h-5 gba:w-5 gba:text-primary" />
      case 'system-notification':
        return <Bell className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
      case 'process-completion':
        return <FileText className="gba:h-5 gba:w-5 gba:text-success" />
      default:
        return <FileText className="gba:h-5 gba:w-5" />
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null
    
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="gba:text-xs">Erledigt</Badge>
      case 'pending':
        return <Badge variant="warning" className="gba:text-xs">Ausstehend</Badge>
      case 'failed':
        return <Badge variant="destructive" className="gba:text-xs">Fehlgeschlagen</Badge>
      default:
        return null
    }
  }

  return (
    <Card data-testid="activity-feed">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:justify-between">
          <span>Aktivitäten</span>
          <Badge variant="default" className="gba:text-xs">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="gba:h-[400px]">
          <div className="gba:space-y-4">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="gba:flex gba:gap-3 gba:pb-4 gba:border-b last:gba:border-0"
                data-testid={`activity-item-${activity.id}`}
              >
                <div className="gba:mt-1">{getActivityIcon(activity)}</div>
                <div className="gba:flex-1">
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                    <div className="gba:flex-1">
                      <h4 className="gba:font-medium gba:text-sm">{activity.title}</h4>
                      <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                        {activity.description}
                      </p>
                      {activity.actor && activity.actor.id !== 'you' && (
                        <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                          von {activity.actor.name}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                    {getTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

