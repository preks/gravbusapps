import React from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { Plug, ArrowRight } from 'lucide-react'
import type { ConnectorSummary } from '../../types'

export interface ConnectorSelectorProps {
  connectors: ConnectorSummary[]
  selectedId: string | null
  onSelect: (connector: ConnectorSummary) => void
  onNext: () => void
  isLoading: boolean
  error?: string | null
  'data-testid'?: string
}

export const ConnectorSelector: React.FC<ConnectorSelectorProps> = ({
  connectors,
  selectedId,
  onSelect,
  onNext,
  isLoading,
  error,
  'data-testid': testId = 'connector-selector'
}) => {
  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid={testId}>
        <Spinner size="md" />
        <span className="gba:ml-2 gba:text-sm gba:text-muted-foreground">Loading connectors...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:py-8 gba:text-center" data-testid={testId}>
        <p className="gba:text-sm gba:text-destructive">{error}</p>
      </div>
    )
  }

  if (!connectors.length) {
    return (
      <div className="gba:py-8 gba:text-center gba:space-y-2" data-testid={testId}>
        <Plug className="gba:w-8 gba:h-8 gba:mx-auto gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">
          No connectors available. Create a connector function in the Function Manager with{' '}
          <code>connectorEnabled</code> flag.
        </p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <p className="gba:text-sm gba:text-muted-foreground">
        Select a connector to import external data into this sheet.
      </p>

      <div className="gba:space-y-2">
        {connectors.map(c => (
          <button
            key={c.id}
            type="button"
            className={`gba:w-full gba:text-left gba:rounded-md gba:border gba:p-3 gba:transition-colors ${
              selectedId === c.id ? 'gba:border-primary gba:bg-accent' : 'gba:border-border gba:hover:bg-accent/50'
            }`}
            onClick={() => onSelect(c)}
            data-testid={`${testId}-option-${c.id}`}
          >
            <div className="gba:flex gba:items-center gba:gap-2">
              <Plug className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:shrink-0" />
              <div className="gba:min-w-0">
                <div className="gba:text-sm gba:font-medium gba:truncate">{c.name}</div>
                {c.description && (
                  <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{c.description}</div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="gba:flex gba:justify-end gba:pt-2">
        <Button size="sm" onClick={onNext} disabled={!selectedId} data-testid={`${testId}-next`}>
          Configure <ArrowRight className="gba:w-3 gba:h-3 gba:ml-1" />
        </Button>
      </div>
    </div>
  )
}
