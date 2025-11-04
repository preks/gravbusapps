import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { env } from '@/common/env'

interface ServiceTicketDisplayProps {
  serviceTicketId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface ServiceTicket {
  id: string
  name?: string
  status?: string
  assignee?: string
  workflowId?: string
  workflowMeta?: {
    rootWorkflowId?: string
  }
  tags?: Record<string, any>
  templateName?: string
  assignment?: {
    currentStatus?: string
  }
  createdAt?: string
  updatedAt?: string
}

export const ServiceTicketDisplay: React.FC<ServiceTicketDisplayProps> = ({
  serviceTicketId,
  accessToken,
  operation
}) => {
  const [ticket, setTicket] = useState<ServiceTicket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTicket = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const baseUrl = env('NEXT_PUBLIC_BASE_URL') || 'https://newwork-dev.newwork.com'
        const url = `${baseUrl}/every-api/v1/flows/outbox/${serviceTicketId}`

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch service ticket: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.status === 'success' && data.data) {
          setTicket(data.data)
        } else {
          setError('Service ticket not found')
        }
      } catch (err) {
        console.error('Error fetching service ticket:', err)
        setError('Failed to load service ticket')
      } finally {
        setIsLoading(false)
      }
    }

    if (serviceTicketId && accessToken) {
      fetchTicket()
    }
  }, [serviceTicketId, accessToken])

  if (isLoading) {
    return (
      <Card className="gba:w-full gba:animate-pulse">
        <CardContent className="gba:p-4">
          <div className="gba:h-32 gba:bg-muted gba:rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:w-full">
        <CardContent className="gba:p-4">
          <span className="gba:text-destructive">{error}</span>
        </CardContent>
      </Card>
    )
  }

  if (!ticket) return null

  const formatDateTime = (value?: string) => {
    if (!value) return null
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value))
    } catch (err) {
      console.warn('Failed to format date value', err)
      return value
    }
  }

  const getOperationBadge = () => {
    switch (operation) {
      case 'create':
        return { text: 'Created', color: 'gba:bg-success-secondary gba:text-success' }
      case 'update':
        return { text: 'Updated', color: 'gba:bg-info-secondary gba:text-info' }
      case 'delete':
        return { text: 'Deleted', color: 'gba:bg-destructive-secondary gba:text-destructive' }
      case 'read':
        return { text: 'Read', color: 'gba:bg-muted gba:text-muted-foreground' }
      default:
        return undefined
    }
  }

  const operationBadge = getOperationBadge()
  const title = ticket.name || ticket.templateName || 'Service Ticket'
  const taskTags = ticket.tags || {}

  return (
    <Card
      className="gba:w-full gba:rounded-2xl hover:gba:bg-accent gba:border-2 gba:shadow-lg"
      data-testid="service-ticket-display"
    >
      <CardContent className="gba:p-6">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-info-secondary gba:flex gba:items-center gba:justify-center">
              <svg className="gba:h-6 gba:w-6 gba:text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <h4 className="gba:text-lg gba:font-bold gba:text-foreground">{title}</h4>
              <p className="gba:text-sm gba:text-muted-foreground">Service Request</p>
            </div>
          </div>
          {operationBadge && (
            <span className={`gba:text-sm gba:font-medium gba:px-3 gba:py-1 gba:rounded-xl ${operationBadge.color}`}>
              {operationBadge.text}
            </span>
          )}
        </div>

        <div className="gba:space-y-3">
          {ticket.status && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Status</div>
              <div className="gba:text-foreground gba:text-base gba:font-medium">{ticket.status}</div>
            </div>
          )}

          {ticket.assignee && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Assignee</div>
              <div className="gba:text-foreground gba:text-sm">{ticket.assignee}</div>
            </div>
          )}

          {ticket.workflowId && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Workflow ID</div>
              <div className="gba:text-foreground gba:text-sm gba:font-mono gba:text-xs">{ticket.workflowId}</div>
            </div>
          )}

          {formatDateTime(ticket.createdAt) && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Created</div>
              <div className="gba:text-foreground gba:text-sm">{formatDateTime(ticket.createdAt)}</div>
            </div>
          )}

          {formatDateTime(ticket.updatedAt) && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Updated</div>
              <div className="gba:text-foreground gba:text-sm">{formatDateTime(ticket.updatedAt)}</div>
            </div>
          )}

          {Object.keys(taskTags).length > 0 && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm gba:mb-2">Task Details</div>
              <div className="gba:space-y-2">
                {Object.entries(taskTags).map(([key, value]) => (
                  <div key={key} className="gba:flex gba:flex-col">
                    <span className="gba:text-xs gba:text-muted-foreground">{key}</span>
                    <span className="gba:text-sm gba:text-foreground">
                      {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ServiceTicketDisplay
