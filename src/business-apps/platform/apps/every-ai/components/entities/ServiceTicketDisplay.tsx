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
  title: string | null
  status: string | null
  code: string | null
  businessKey: string | null
  processInstanceId: string | null
  recordState: string | null
  updatedAt: string | null
  createdAt: string | null
  additionalProperties: Record<string, unknown> | null
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
            ServiceTicketByPk(id: $id) {
              id
              title
              status
              code
              businessKey
              processInstanceId
              recordState
              updatedAt
              createdAt
              additionalProperties
            }
          }
        `

        const result = await graphqlClient.request<{ ServiceTicketByPk: ServiceTicket }>(query, {
          id: serviceTicketId
        })

        if (result.ServiceTicketByPk) {
          setTicket(result.ServiceTicketByPk)
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

  const formatDateTime = (value: string | null) => {
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

  const additionalDetails =
    ticket.additionalProperties && typeof ticket.additionalProperties === 'object'
      ? Object.entries(ticket.additionalProperties ?? {})
      : []

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
          {ticket.title && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Title</div>
              <div className="gba:text-foreground gba:text-base gba:font-bold">{ticket.title}</div>
            </div>
          )}

          {ticket.status && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Status</div>
              <div className="gba:text-foreground gba:text-sm">{ticket.status}</div>
            </div>
          )}

          {ticket.code && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Code</div>
              <div className="gba:text-foreground gba:text-sm">{ticket.code}</div>
            </div>
          )}

          {ticket.businessKey && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Business Key</div>
              <div className="gba:text-foreground gba:text-sm">{ticket.businessKey}</div>
            </div>
          )}

          {ticket.recordState && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Record State</div>
              <div className="gba:text-foreground gba:text-sm">{ticket.recordState}</div>
            </div>
          )}

          {ticket.processInstanceId && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Process Instance ID</div>
              <div className="gba:text-foreground gba:text-sm">{ticket.processInstanceId}</div>
            </div>
          )}

          {formatDateTime(ticket.updatedAt) && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Updated</div>
              <div className="gba:text-foreground gba:text-sm">{formatDateTime(ticket.updatedAt)}</div>
            </div>
          )}

          {formatDateTime(ticket.createdAt) && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Created</div>
              <div className="gba:text-foreground gba:text-sm">{formatDateTime(ticket.createdAt)}</div>
            </div>
          )}

          {additionalDetails.length > 0 && (
            <div>
              <div className="gba:text-muted-foreground gba:text-sm">Additional Details</div>
              <div className="gba:mt-2 gba:space-y-2">
                {additionalDetails.map(([key, value]) => (
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
