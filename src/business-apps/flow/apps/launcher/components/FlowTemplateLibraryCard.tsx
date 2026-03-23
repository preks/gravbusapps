import React, { useMemo } from 'react'
import { Button, Card, CardContent, IconAvatar } from '@newwork/nw-design-system'
import { Play } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { FlowTemplateLibraryItem } from '../hooks/useFlowTemplateLibrary'

export interface FlowTemplateLibraryCardProps extends Partial<BusinessAppContextProps> {
  item: FlowTemplateLibraryItem
  onStart: (templateId: string) => void
  onViewDetails?: (templateId: string) => void
  'data-testid'?: string
}

export const FlowTemplateLibraryCard: React.FC<FlowTemplateLibraryCardProps> = ({
  item,
  onStart,
  onViewDetails,
  'data-testid': testId = 'flow-template-library-card'
}) => {
  const shortDescription = useMemo(() => {
    const d = (item.description || '').trim()
    return d.length > 0 ? d : 'No description provided.'
  }, [item.description])

  const isClickable = item.isManualLaunchable

  const body = (
    <Card
      className={[
        'gba:bg-card gba:border gba:border-border gba:hover:bg-accent/10 gba:transition-colors',
        isClickable ? 'gba:!cursor-pointer' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
    >
      <CardContent
        className={['gba:p-4 gba:flex gba:items-start gba:gap-3', isClickable ? 'gba:!cursor-pointer' : '']
          .filter(Boolean)
          .join(' ')}
      >
        <IconAvatar
          icon={Play}
          variant="decorative"
          size="lg"
          className={['gba:mt-0.5 gba:shrink-0', isClickable ? 'gba:!cursor-pointer' : ''].filter(Boolean).join(' ')}
          data-testid={`${testId}-avatar`}
        />

        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
            <div className="gba:min-w-0">
              <div className="gba:font-semibold gba:text-sm gba:truncate" data-testid={`${testId}-title`}>
                {item.name}
              </div>
              <div
                className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:line-clamp-2"
                data-testid={`${testId}-description`}
              >
                {shortDescription}
              </div>
            </div>

            <div className="gba:shrink-0">
              {!item.isManualLaunchable ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetails?.(item.templateId)}
                  data-testid={`${testId}-details`}
                >
                  Details
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (item.isManualLaunchable) {
    return (
      <button
        type="button"
        onClick={() => onStart(item.templateId)}
        className="gba:block gba:w-full gba:text-left gba:!cursor-pointer gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:rounded-lg"
        data-testid={`${testId}-click`}
      >
        {body}
      </button>
    )
  }

  return body
}

export default FlowTemplateLibraryCard
