/**
 * InstanceHealthIndicator Component
 * Shows connection status for an instance
 */

import React, { useState, useEffect } from 'react'
import { FlowEngineInstance } from '../../types/instance'
import { templateApi } from '../../services/templateApi'
import { Badge } from '@newwork/nw-design-system'

interface InstanceHealthIndicatorProps {
  instance: FlowEngineInstance
  accessToken: string
}

export const InstanceHealthIndicator: React.FC<InstanceHealthIndicatorProps> = ({ instance, accessToken }) => {
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
    return <Badge variant="secondary">Checking...</Badge>
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Badge variant={isHealthy ? 'success' : 'destructive'}>{isHealthy ? '● Online' : '● Offline'}</Badge>
      {lastChecked && (
        <span className="gba:text-sm gba:text-muted-foreground">Last checked: {lastChecked.toLocaleTimeString()}</span>
      )}
    </div>
  )
}
