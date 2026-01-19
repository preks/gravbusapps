import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@newwork/nw-design-system'
import { Clock, AlertTriangle, CheckCircle, ArrowUpDown, Eye, MessageCircle } from 'lucide-react'
import { useMyTickets } from './hooks/useMyTickets'
import { formatDate } from '../../../../config/dateTimeConfig'
import { getSLAStatus } from '../../../../utils'
import type { StepInstance } from '../../../../types'

/**
 * My Tickets Summary - Shows user's most urgent tickets in a table format
 * Provides quick overview and actions for personal workload
 */
export interface MyTicketsSummaryProps extends BusinessAppContextProps {
  onTicketClick?: (ticketId: string, deskKey: string) => void
}

type SortField = 'dueDate' | 'priority' | 'updatedAt' | 'status'

export const MyTicketsSummary: React.FC<MyTicketsSummaryProps> = ({ accessToken, userInfo, onTicketClick }) => {
  const [sortField, setSortField] = useState<SortField>('dueDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showCompleted, setShowCompleted] = useState(false)

  const { myTickets, openTickets, isLoading, error } = useMyTickets({
    accessToken,
    userInfo,
    limit: 50,
    sortBy: sortField,
    sortOrder
  })

  // Filter tickets based on completion status
  const displayTickets = useMemo(() => {
    const tickets = showCompleted ? myTickets : openTickets
    return tickets.slice(0, 10) // Show top 10
  }, [myTickets, openTickets, showCompleted])

  // Handle sort change
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Get priority badge variant
  const getPriorityVariant = (priority?: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return 'destructive'
      case 'HIGH':
        return 'secondary'
      case 'MEDIUM':
        return 'outline'
      case 'LOW':
        return 'outline'
      default:
        return 'outline'
    }
  }

  // Get status badge variant
  const getStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    const upperStatus = status.toUpperCase()
    if (upperStatus === 'COMPLETED' || upperStatus === 'DONE') return 'secondary'
    if (upperStatus === 'IN_PROGRESS' || upperStatus === 'RUNNING') return 'default'
    if (upperStatus === 'FAILED' || upperStatus === 'ERROR') return 'destructive'
    return 'outline'
  }

  // Get SLA indicator
  const getSLAIndicator = (ticket: StepInstance) => {
    const slaStatus = getSLAStatus(ticket)
    if (!slaStatus) return null

    if (slaStatus.status === 'overdue') {
      return (
        <Badge variant="destructive" className="gba:text-xs gba:gap-1">
          <AlertTriangle className="gba:w-3 gba:h-3" />
          Overdue
        </Badge>
      )
    }

    if (slaStatus.hoursLeft < 4) {
      return (
        <Badge variant="secondary" className="gba:text-xs gba:gap-1 gba:bg-orange-100 gba:text-orange-700">
          <Clock className="gba:w-3 gba:h-3" />
          {Math.floor(slaStatus.hoursLeft)}h left
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="gba:text-xs gba:gap-1 gba:text-green-700">
        <CheckCircle className="gba:w-3 gba:h-3" />
        On track
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Clock className="gba:w-5 gba:h-5 gba:animate-pulse" />
            {getTranslationFromI18nKeyAndLabel('services.dashboard.my_tickets.title', 'My Urgent Tickets')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="gba:h-16 gba:bg-muted gba:rounded-lg gba:animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-destructive">
            <AlertTriangle className="gba:w-5 gba:h-5" />
            {getTranslationFromI18nKeyAndLabel('services.dashboard.my_tickets.error', 'Error Loading Tickets')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-sm gba:text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="my-tickets-summary">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Clock className="gba:w-5 gba:h-5 gba:text-primary" />
            {getTranslationFromI18nKeyAndLabel('services.dashboard.my_tickets.title', 'My Urgent Tickets')}
            <Badge variant="secondary" className="gba:ml-2">
              {displayTickets.length}
            </Badge>
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant={showCompleted ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className="gba:text-xs"
            >
              {showCompleted ? 'Show Open' : 'Show All'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayTickets.length === 0 ? (
          <div className="gba:text-center gba:py-12">
            <CheckCircle className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-3 gba:text-muted-foreground" />
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.my_tickets.no_tickets',
                showCompleted ? 'No tickets found' : 'No open tickets - great work!'
              )}
            </p>
          </div>
        ) : (
          <div className="gba:space-y-2">
            {/* Table Header */}
            <div className="gba:grid gba:grid-cols-12 gba:gap-3 gba:pb-2 gba:border-b gba:text-xs gba:font-medium gba:text-muted-foreground">
              <div className="gba:col-span-4">
                <button
                  onClick={() => handleSort('dueDate')}
                  className="gba:flex gba:items-center gba:gap-1 hover:gba:text-foreground"
                >
                  Ticket
                  <ArrowUpDown className="gba:w-3 gba:h-3" />
                </button>
              </div>
              <div className="gba:col-span-2">
                <button
                  onClick={() => handleSort('priority')}
                  className="gba:flex gba:items-center gba:gap-1 hover:gba:text-foreground"
                >
                  Priority
                  <ArrowUpDown className="gba:w-3 gba:h-3" />
                </button>
              </div>
              <div className="gba:col-span-2">
                <button
                  onClick={() => handleSort('status')}
                  className="gba:flex gba:items-center gba:gap-1 hover:gba:text-foreground"
                >
                  Status
                  <ArrowUpDown className="gba:w-3 gba:h-3" />
                </button>
              </div>
              <div className="gba:col-span-2">SLA</div>
              <div className="gba:col-span-2 gba:text-right">Actions</div>
            </div>

            {/* Table Rows */}
            {displayTickets.map(ticket => (
              <div
                key={ticket.id}
                className="gba:grid gba:grid-cols-12 gba:gap-3 gba:py-3 gba:border-b gba:border-border/50 hover:gba:bg-muted/30 gba:transition-colors gba:rounded-lg gba:px-2"
              >
                {/* Ticket Info */}
                <div className="gba:col-span-4 gba:min-w-0">
                  <div className="gba:flex gba:flex-col gba:gap-1">
                    <p className="gba:text-sm gba:font-medium gba:truncate" title={ticket.name}>
                      {ticket.name || 'Untitled Ticket'}
                    </p>
                    <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                      <span className="gba:font-mono">{ticket.id.substring(0, 8)}</span>
                      {ticket.dueDate && (
                        <>
                          <span>•</span>
                          <Clock className="gba:w-3 gba:h-3" />
                          <span>{formatDate(ticket.dueDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Priority */}
                <div className="gba:col-span-2 gba:flex gba:items-center">
                  <Badge variant={getPriorityVariant(ticket.priority)} className="gba:text-xs">
                    {ticket.priority || 'Medium'}
                  </Badge>
                </div>

                {/* Status */}
                <div className="gba:col-span-2 gba:flex gba:items-center">
                  <Badge variant={getStatusVariant(ticket.status)} className="gba:text-xs">
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                </div>

                {/* SLA Indicator */}
                <div className="gba:col-span-2 gba:flex gba:items-center">{getSLAIndicator(ticket)}</div>

                {/* Actions */}
                <div className="gba:col-span-2 gba:flex gba:items-center gba:justify-end gba:gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onTicketClick?.(ticket.id, ticket.desk || '')}
                    className="gba:h-7 gba:px-2"
                    title="View ticket details"
                  >
                    <Eye className="gba:w-3 gba:h-3" />
                  </Button>
                  {ticket.comments && ticket.comments.length > 0 && (
                    <Badge variant="outline" className="gba:text-xs gba:gap-1">
                      <MessageCircle className="gba:w-3 gba:h-3" />
                      {ticket.comments.length}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {displayTickets.length > 0 && (
          <div className="gba:mt-4 gba:pt-3 gba:border-t gba:text-xs gba:text-muted-foreground gba:text-center">
            {getTranslationFromI18nKeyAndLabel(
              'services.dashboard.my_tickets.footer',
              `Showing ${displayTickets.length} of ${showCompleted ? myTickets.length : openTickets.length} tickets`
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
