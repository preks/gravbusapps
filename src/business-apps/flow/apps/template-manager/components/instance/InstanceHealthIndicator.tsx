/**
 * InstanceHealthIndicator Component
 * Shows connection status for an instance
 */

import React, { useState, useEffect } from 'react'
import { FlowEngineInstance } from '../../types/instance'
import { templateApi } from '../../services/templateApi'
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'

interface InstanceHealthIndicatorProps {
  instance: FlowEngineInstance
  accessToken: string
  compact?: boolean
}

export const InstanceHealthIndicator: React.FC<InstanceHealthIndicatorProps> = ({
  instance,
  accessToken,
  compact = false
}) => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkHealth = async () => {
    try {
      // Use apiKey from instance, fallback to accessToken for current platform
      const authToken = instance.apiKey || accessToken
      const healthy = await templateApi.testConnection(instance.baseUrl, authToken)
      setIsHealthy(healthy)
      setLastChecked(new Date())
    } catch {
      setIsHealthy(false)
      setLastChecked(new Date())
    }
  }

  useEffect(() => {
    checkHealth()

    // Refresh every 60 seconds
    const interval = setInterval(checkHealth, 60000)

    return () => clearInterval(interval)
  }, [instance.baseUrl, instance.apiKey, accessToken])

  if (isHealthy === null) {
    if (compact) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gba:text-xs">
              Checking...
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Testing connection...</TooltipContent>
        </Tooltip>
      )
    }
    return <Badge variant="secondary">Checking...</Badge>
  }

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={isHealthy ? 'success' : 'warning'} className="gba:text-xs">
            {isHealthy ? 'Online' : 'Offline'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {isHealthy ? 'Connection successful' : 'Connection failed'}
          {lastChecked && <div className="gba:text-xs gba:opacity-80">Checked: {lastChecked.toLocaleTimeString()}</div>}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Badge variant={isHealthy ? 'success' : 'warning'}>{isHealthy ? '● Online' : '● Offline'}</Badge>
      {lastChecked && (
        <span className="gba:text-sm gba:text-muted-foreground">Last checked: {lastChecked.toLocaleTimeString()}</span>
      )}
    </div>
  )
}
