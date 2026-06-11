import React, { useMemo } from 'react'
import { Badge, Button, Card, CardContent, IconAvatar } from '@newwork/nw-design-system'
import { Play } from 'lucide-react'
import { FlowTriggerType } from '@/common/network/flows/FlowTemplateClient'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { FlowTemplateLibraryItem } from '../hooks/useFlowTemplateLibrary'

const NON_MANUAL_TRIGGER_LABELS: Partial<Record<FlowTriggerType, string>> = {
  [FlowTriggerType.WEBHOOK]: 'Webhook',
  [FlowTriggerType.EMAIL]: 'Email',
  [FlowTriggerType.EVENT]: 'Event',
  [FlowTriggerType.SCHEDULE]: 'Schedule',
  [FlowTriggerType.API_SCHEMA]: 'API'
}

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

  const automaticTriggerBadges = useMemo(() => {
    const seen = new Set<string>()
    const badges: Array<{ key: string; label: string }> = []
    for (const trigger of item.triggerTypes) {
      const label = NON_MANUAL_TRIGGER_LABELS[trigger]
      if (!label) continue
      if (seen.has(trigger)) continue
      seen.add(trigger)
      badges.push({ key: trigger, label })
    }
    return badges
  }, [item.triggerTypes])

  const handleActivate = () => {
    if (item.isManualLaunchable) {
      onStart(item.templateId)
      return
    }
    onViewDetails?.(item.templateId)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    handleActivate()
  }

  const handleDetailsClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    onViewDetails?.(item.templateId)
  }

  return (
    <Card
      className="gba:bg-card gba:border gba:border-border gba:hover:bg-accent/10 gba:transition-colors gba:cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      data-testid={testId}
    >
      <CardContent className="gba:p-4 gba:flex gba:items-start gba:gap-3 gba:cursor-pointer">
        <IconAvatar
          icon={Play}
          variant="decorative"
          size="lg"
          decorative
          className="gba:mt-0.5 gba:shrink-0"
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
              {automaticTriggerBadges.length > 0 ? (
                <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-2" data-testid={`${testId}-trigger-badges`}>
                  {automaticTriggerBadges.map(badge => (
                    <Badge key={badge.key} variant="secondary">
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="gba:shrink-0">
              {!item.isManualLaunchable ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDetailsClick}
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
}

export default FlowTemplateLibraryCard
