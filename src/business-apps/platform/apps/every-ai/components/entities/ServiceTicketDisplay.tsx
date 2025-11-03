import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface ServiceTicketDisplayProps {
  serviceTicketId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface ServiceTicket {
  id: string
  flowName: string | null
  title: string | null
  message: string | null
  assignee: string | null
  updatedAt: string | null
  outputData: {
    description?: string
    priority?: string
    category?: string
  } | null
}

export const ServiceTicketDisplay: React.FC<ServiceTicketDisplayProps> = ({
  serviceTicketId,
  accessToken,
  operation
}) => {
  const [ticket, setTicket] = useState<ServiceTicket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchTicket = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetServiceTicket($id: uuid!) {
            serviceTickets_by_pk(id: $id) {
              id
              flowName
              title
              message
              assignee
              updatedAt
            }
          }
        `

        const result = await graphqlClient.request<{ serviceTickets_by_pk: ServiceTicket }>(query, {
          id: serviceTicketId
        })

        if (result.serviceTickets_by_pk) {
          setTicket(result.serviceTickets_by_pk)
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
  }, [serviceTicketId, accessToken, graphqlClient])

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

  return (
    <Card className="gba:w-full gba:rounded-2xl hover:gba:bg-accent" data-testid="service-ticket-display">
      <CardContent className="gba:p-6">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
          <span className="gba:text-lg gba:font-semibold">Service Ticket</span>
          {operation && (
            <span className="gba:bg-info-secondary gba:text-info gba:text-sm gba:font-medium gba:px-2.5 gba:py-0.5 gba:rounded-xl gba:capitalize">
              {operation}
            </span>
          )}
        </div>

        <div className="gba:space-y-3">
          {ticket.flowName && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Flow Name</div>
              <div className="gba:text-foreground gba:text-base gba:font-bold">{ticket.flowName}</div>
            </div>
          )}

          {ticket.title && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Title</div>
              <div className="gba:text-foreground gba:text-base gba:font-bold">{ticket.title}</div>
            </div>
          )}

          {ticket.message && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Message</div>
              <div className="gba:text-foreground gba:text-sm">{ticket.message}</div>
            </div>
          )}

          {ticket.assignee && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Assignee</div>
              <div className="gba:text-foreground gba:text-sm">{ticket.assignee}</div>
            </div>
          )}

          {ticket.updatedAt && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Updated</div>
              <div className="gba:text-foreground gba:text-sm">{ticket.updatedAt}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ServiceTicketDisplay
