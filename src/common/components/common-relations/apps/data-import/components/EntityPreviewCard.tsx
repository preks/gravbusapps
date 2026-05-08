import React from 'react'
import { Badge, Card, CardContent } from '@newwork/nw-design-system'
import {
  BuildingsIcon,
  CalendarBlankIcon,
  CurrencyCircleDollarIcon,
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon
} from '@phosphor-icons/react'
import { EntityPreviewCardData, EntityPreviewIcon } from '@/common/components/common-relations/apps/data-import/types'

export interface EntityPreviewCardProps {
  preview: EntityPreviewCardData
  'data-testid'?: string
}

const ICON_BY_NAME: Record<EntityPreviewIcon, React.ComponentType<{ className?: string }>> = {
  building: BuildingsIcon,
  calendar: CalendarBlankIcon,
  currency: CurrencyCircleDollarIcon,
  email: EnvelopeIcon,
  location: MapPinIcon,
  phone: PhoneIcon
}

const PreviewCard: React.FC<{ children: React.ReactNode; testId: string }> = ({ children, testId }) => (
  <Card
    variant="surface"
    className="gba:w-full gba:md:w-1/2 gba:border gba:border-border gba:bg-background"
    data-testid={testId}
  >
    {children}
  </Card>
)

const PreviewCardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CardContent className="gba:!p-0">
    <div className="gba:px-2.5 gba:py-1">{children}</div>
  </CardContent>
)

const PreviewRow: React.FC<EntityPreviewCardData['rows'][number]> = ({ icon, label, value, badges }) => {
  const Icon = icon ? ICON_BY_NAME[icon] : undefined

  return (
    <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm">
      {Icon && <Icon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-muted-foreground" />}
      <div className="gba:min-w-0">
        <p className="gba:text-xs gba:text-muted-foreground">{label}</p>
        <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap">
          {value && <p className="gba:truncate gba:font-medium">{value}</p>}
          {badges?.map(badge => (
            <Badge key={`${label}-${badge.value}`} variant={badge.variant ?? 'secondary'} size="sm">
              {badge.value}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

const PreviewFooterItem: React.FC<EntityPreviewCardData['footerItems'][number]> = ({ icon, value }) => {
  const Icon = icon ? ICON_BY_NAME[icon] : undefined

  return (
    <div className="gba:flex gba:items-center gba:gap-1">
      {Icon && <Icon className="gba:w-3.5 gba:h-3.5" />}
      <span className="gba:text-xs">{value}</span>
    </div>
  )
}

export const EntityPreviewCard: React.FC<EntityPreviewCardProps> = ({
  preview,
  'data-testid': testId = 'entity-preview-card'
}) => (
  <PreviewCard testId={testId}>
    <PreviewCardContent>
      <div className="gba:space-y-1.5">
        {(preview.title || preview.badges.length > 0) && (
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap">
            {preview.title && <span className="gba:font-medium">{preview.title}</span>}
            {preview.badges.map(badge => (
              <Badge key={badge.value} variant={badge.variant ?? 'secondary'} size="sm">
                {badge.value}
              </Badge>
            ))}
          </div>
        )}

        {preview.rows.map(row => (
          <PreviewRow key={`${row.label}-${row.value}`} {...row} />
        ))}

        {preview.footerItems.length > 0 && (
          <div className="gba:flex gba:items-center gba:gap-3 gba:text-sm gba:text-muted-foreground">
            {preview.footerItems.map(item => (
              <PreviewFooterItem key={`${item.icon}-${item.value}`} {...item} />
            ))}
          </div>
        )}

        {!preview.title && preview.rows.length === 0 && preview.footerItems.length === 0 && (
          <span className="gba:text-sm gba:text-muted-foreground">No preview data available</span>
        )}
      </div>
    </PreviewCardContent>
  </PreviewCard>
)
