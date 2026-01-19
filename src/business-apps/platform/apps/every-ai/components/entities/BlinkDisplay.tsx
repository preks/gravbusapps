import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { env } from '@/common/env/EnvUtils'
import { getOperationBadge } from './utils/displayUtils'

interface BlinkDisplayProps {
  blinkId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface Blink {
  id: string
  templateName: string
  status: string
  initiatedBy: string
  startedAt: string
  assignedUserId?: string
  tags?: {
    title?: string
    message?: string
    dueDate?: string
    app?: string
  }
  metadata?: Record<string, any>
}

export const BlinkDisplay: React.FC<BlinkDisplayProps> = ({ blinkId, accessToken, operation }) => {
  const [blink, setBlink] = useState<Blink | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBlink = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const baseUrl = env('NEXT_PUBLIC_BASE_URL') || 'https://newwork-dev.newwork.com'
        const url = `${baseUrl}/every-api/v1/flows/outbox/${blinkId}`

        console.log('Fetching blink with ID:', blinkId)
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch blink: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('Blink fetch result:', data)

        if (data.status === 'success' && data.data) {
          setBlink(data.data)
        } else {
          setError('Blink not found')
        }
      } catch (err) {
        console.error('Error fetching blink:', err, 'Blink ID:', blinkId)
        setError('Failed to load blink')
      } finally {
        setIsLoading(false)
      }
    }

    if (blinkId && accessToken) {
      fetchBlink()
    }
  }, [blinkId, accessToken])

  const operationBadge = getOperationBadge(operation)

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'success'
      case 'RUNNING':
        return 'info'
      case 'FAILED':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-info-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
  )

  // Extract title and subtitle from blink data
  const title = blink?.tags?.title || blink?.templateName || 'Blink Task'
  const subtitle = blink?.tags?.message || `Status: ${blink?.status || 'Unknown'}`

  return (
    <EntityCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      status={operationBadge?.text || blink?.status}
      statusVariant={operationBadge?.variant || (getStatusColor(blink?.status) as any)}
      fields={
        blink
          ? [
              { label: 'Due Date', value: formatDate(blink.tags?.dueDate) },
              { label: 'Started', value: formatDate(blink.startedAt) }
            ]
          : undefined
      }
      isLoading={isLoading}
      error={error || undefined}
    />
  )
}

export default BlinkDisplay
