import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@newwork/nw-design-system'
import type { ConnectionConfig } from '../../types/agentMesh'

interface ConnectionConfigPopoverProps {
  callerName: string
  calleeName: string
  existingConfig?: ConnectionConfig
  onSubmit: (config: ConnectionConfig) => void
  onCancel: () => void
}

export const ConnectionConfigPopover = ({
  callerName,
  calleeName,
  existingConfig,
  onSubmit,
  onCancel
}: ConnectionConfigPopoverProps) => {
  const [direction, setDirection] = useState<'caller_to_callee' | 'bidirectional'>('caller_to_callee')
  const [allDomains, setAllDomains] = useState(false)
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])
  const [timeout, setTimeout] = useState(30)
  const [rateLimit, setRateLimit] = useState(100)
  const [retryAttempts, setRetryAttempts] = useState(3)

  // Mock available domains - replace with actual data
  const availableDomains = ['customer_data', 'financial_data', 'product_data', 'order_data']

  useEffect(() => {
    if (existingConfig) {
      setDirection(existingConfig.direction)
      setAllDomains(existingConfig.data_domains.length === 0 || existingConfig.data_domains.includes('*'))
      setSelectedDomains(existingConfig.data_domains.filter(d => d !== '*'))
      setTimeout(existingConfig.timeout_seconds)
      setRateLimit(existingConfig.rate_limit_per_hour)
      setRetryAttempts(existingConfig.retry_attempts)
    }
  }, [existingConfig])

  const handleDomainToggle = (domain: string) => {
    if (selectedDomains.includes(domain)) {
      setSelectedDomains(selectedDomains.filter(d => d !== domain))
    } else {
      setSelectedDomains([...selectedDomains, domain])
    }
  }

  const handleSubmit = () => {
    const config: ConnectionConfig = {
      direction,
      data_domains: allDomains ? ['*'] : selectedDomains,
      timeout_seconds: timeout,
      rate_limit_per_hour: rateLimit,
      retry_attempts: retryAttempts
    }
    onSubmit(config)
  }

  return (
    <Card className="gba:w-full gba:max-w-md" data-testid="connection-config-popover">
      <CardHeader>
        <CardTitle data-testid="connection-config-popover-title">
          {existingConfig ? 'Edit Connection' : 'Create Connection'}
        </CardTitle>
        <div className="gba:text-sm gba:text-muted-foreground" data-testid="connection-config-popover-description">
          {callerName} → {calleeName}
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {/* Direction */}
        <div>
          <label
            className="gba:text-sm gba:font-medium gba:text-foreground"
            data-testid="connection-config-popover-direction-label"
          >
            Direction
          </label>
          <select
            value={direction}
            onChange={e => setDirection(e.target.value as 'caller_to_callee' | 'bidirectional')}
            data-testid="connection-config-popover-direction-select"
            className="gba:w-full gba:mt-1 gba:px-3 gba:py-2 gba:border gba:border-border gba:rounded-md gba:bg-background gba:text-foreground"
          >
            <option value="caller_to_callee">Caller → Callee</option>
            <option value="bidirectional">Bidirectional</option>
          </select>
        </div>

        {/* Data Domains */}
        <div>
          <label
            className="gba:text-sm gba:font-medium gba:text-foreground"
            data-testid="connection-config-popover-domains-label"
          >
            Data Domains
          </label>
          <div className="gba:mt-2 gba:space-y-2">
            <label className="gba:flex gba:items-center gba:gap-2">
              <input
                type="checkbox"
                checked={allDomains}
                onChange={e => {
                  setAllDomains(e.target.checked)
                  if (e.target.checked) {
                    setSelectedDomains([])
                  }
                }}
                data-testid="connection-config-popover-domains-all-checkbox"
              />
              <span className="gba:text-sm gba:text-foreground">All domains</span>
            </label>
            {!allDomains && (
              <div className="gba:space-y-2 gba:ml-6">
                {availableDomains.map(domain => (
                  <label key={domain} className="gba:flex gba:items-center gba:gap-2">
                    <input
                      type="checkbox"
                      checked={selectedDomains.includes(domain)}
                      onChange={() => handleDomainToggle(domain)}
                      data-testid={`connection-config-popover-domains-${domain}-checkbox`}
                    />
                    <span className="gba:text-sm gba:text-foreground">{domain}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Limits */}
        <div className="gba:space-y-4">
          <div>
            <label
              className="gba:text-sm gba:font-medium gba:text-foreground"
              data-testid="connection-config-popover-timeout-label"
            >
              Timeout (seconds)
            </label>
            <Input
              type="number"
              value={timeout}
              onChange={e => setTimeout(parseInt(e.target.value) || 0)}
              min="1"
              data-testid="connection-config-popover-timeout-input"
              className="gba:mt-1"
            />
          </div>

          <div>
            <label
              className="gba:text-sm gba:font-medium gba:text-foreground"
              data-testid="connection-config-popover-rate-limit-label"
            >
              Rate Limit (per hour)
            </label>
            <Input
              type="number"
              value={rateLimit}
              onChange={e => setRateLimit(parseInt(e.target.value) || 0)}
              min="1"
              data-testid="connection-config-popover-rate-limit-input"
              className="gba:mt-1"
            />
          </div>

          <div>
            <label
              className="gba:text-sm gba:font-medium gba:text-foreground"
              data-testid="connection-config-popover-retry-label"
            >
              Retry Attempts
            </label>
            <Input
              type="number"
              value={retryAttempts}
              onChange={e => setRetryAttempts(parseInt(e.target.value) || 0)}
              min="0"
              max="10"
              data-testid="connection-config-popover-retry-input"
              className="gba:mt-1"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="gba:flex gba:gap-2 gba:justify-end gba:pt-4">
          <Button variant="outline" onClick={onCancel} data-testid="connection-config-popover-cancel-button">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allDomains && selectedDomains.length === 0}
            data-testid="connection-config-popover-submit-button"
          >
            {existingConfig ? 'Save' : 'Create'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
