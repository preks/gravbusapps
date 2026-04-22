import React from 'react'
import { Card, CardContent, Badge, useTranslation } from '@newwork/nw-design-system'
import { EnvelopeIcon, PhoneIcon, BuildingsIcon, MapPinIcon } from '@phosphor-icons/react'
import { ConvertedEntity } from '@/common/components/common-relations/apps/data-import/types'
import translations from './ConversionResultStep/_i18n'

export interface EntityPreviewCardProps {
  entity: ConvertedEntity
  'data-testid'?: string
}

function getRefCode(ref?: unknown): string | undefined {
  if (typeof ref !== 'string') return undefined
  const parts = ref.split(':')
  return parts.length ? parts[parts.length - 1] : undefined
}

export const EntityPreviewCard: React.FC<EntityPreviewCardProps> = ({
  entity,
  'data-testid': testId = 'entity-preview-card'
}) => {
  const { t } = useTranslation(translations)

  return (
    <Card data-testid={testId}>
      <CardContent className="gba:p-3">
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <span className="gba:font-medium">
              {(entity as any).name ||
                [entity.firstName, entity.lastName].filter(Boolean).join(' ') ||
                entity.companyName ||
                ''}
            </span>
            {(entity.position || entity.jobPosition || (entity as any).opportunityPipelineStageRef) && (
              <Badge variant="secondary" size="sm">
                {entity.position ||
                  entity.jobPosition ||
                  getRefCode((entity as any).salesPipelineStageRef) ||
                  getRefCode((entity as any).opportunityPipelineStageRef)}
              </Badge>
            )}
          </div>

          {entity.companyName && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
              <BuildingsIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <span>{entity.companyName}</span>
              {entity.industryRef && (
                <Badge variant="success" size="sm">
                  {t('industry-badge')}
                </Badge>
              )}
              {entity.numberOfEmployeesRef && (
                <Badge variant="info" size="sm">
                  {t('size-badge')}
                </Badge>
              )}
            </div>
          )}

          {(entity.city || entity.countryRef) && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
              <MapPinIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <span>
                {entity.city}
                {entity.city && entity.countryRef && ', '}
                {entity.countryRef && (
                  <Badge variant="secondary" size="sm">
                    {entity.countryRef.split(':').pop()}
                  </Badge>
                )}
              </span>
            </div>
          )}

          <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
            {entity.email && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <EnvelopeIcon className="gba:w-4 gba:h-4" />
                <span className="gba:text-xs">{entity.email}</span>
              </div>
            )}
            {entity.phoneNumber && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <PhoneIcon className="gba:w-4 gba:h-4" />
                <span className="gba:text-xs">{entity.phoneNumber}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
