import React from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { X, Globe } from 'lucide-react'
import type { DataInternalEntityNodeData as InternalEntityNodeData } from '@/common/components/flow/data-viewer'

interface InternalEntityInfoPanelProps {
  data: InternalEntityNodeData
  onClose: () => void
  'data-testid'?: string
}

export const InternalEntityInfoPanel: React.FC<InternalEntityInfoPanelProps> = ({
  data,
  onClose,
  'data-testid': testId = 'internal-entity-info-panel'
}) => {
  const fields = data.fields ?? []

  return (
    <div
      className="gba:h-full gba:w-[420px] gba:max-w-full gba:bg-background gba:border-l gba:border-border gba:shadow-xl gba:flex gba:flex-col gba:animate-in gba:slide-in-from-right gba:duration-200"
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border gba:shrink-0">
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <Globe className="gba:h-4 gba:w-4 gba:text-secondary gba:shrink-0" />
          <span className="gba:font-semibold gba:text-sm gba:truncate">{data.label}</span>
          <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:shrink-0">
            Internal
          </Badge>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} data-testid={`${testId}-close`}>
          <X className="gba:h-3.5 gba:w-3.5" />
        </Button>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:p-4">
        <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">
          This is a platform-managed entity. Its schema is defined by the internal GraphQL API and cannot be modified
          here.
        </p>

        <h4 className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-2">
          Fields ({fields.length})
        </h4>

        {fields.length > 0 ? (
          <div className="gba:border gba:border-border gba:rounded-lg gba:overflow-hidden">
            {fields.map((field, idx) => (
              <div
                key={field.name}
                className={`gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-1.5 gba:text-xs ${idx > 0 ? 'gba:border-t gba:border-border' : ''}`}
              >
                <span className="gba:font-mono gba:text-foreground">{field.name}</span>
                <span className="gba:font-mono gba:text-muted-foreground">{field.type}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="gba:text-xs gba:text-muted-foreground gba:italic">
            Field information not available. Use the GraphQL tab to explore this entity.
          </p>
        )}
      </div>
    </div>
  )
}
