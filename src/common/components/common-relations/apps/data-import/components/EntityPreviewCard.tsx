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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function humanizeKey(key: string): string {
  const lastPart = key.includes('.') ? key.split('.').pop()! : key
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim()
}

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string' && UUID_PATTERN.test(value)) return null
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string') return value
  return null
}

function extractPreviewFields(entity: ConvertedEntity): Array<{ label: string; value: string }> {
  const fields: Array<{ label: string; value: string }> = []
  const MAX_FIELDS = 6

  for (const [key, val] of Object.entries(entity)) {
    if (fields.length >= MAX_FIELDS) break

    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const [nestedKey, nestedVal] of Object.entries(val as Record<string, unknown>)) {
        if (fields.length >= MAX_FIELDS) break
        const formatted = formatValue(nestedVal)
        if (formatted) {
          fields.push({ label: humanizeKey(nestedKey), value: formatted })
        }
      }
    } else {
      const formatted = formatValue(val)
      if (formatted) {
        fields.push({ label: humanizeKey(key), value: formatted })
      }
    }
  }

  return fields
}

function hasStandardIdentityFields(entity: ConvertedEntity): boolean {
  const e = entity as any
  return Boolean(e.firstName || e.lastName || e.name || e.companyName || e.email)
}

export const EntityPreviewCard: React.FC<EntityPreviewCardProps> = ({
  entity,
  'data-testid': testId = 'entity-preview-card'
}) => {
  const { t } = useTranslation(translations)

  if (!hasStandardIdentityFields(entity)) {
    const fields = extractPreviewFields(entity)
    return (
      <Card data-testid={testId}>
        <CardContent className="gba:p-3">
          <div className="gba:grid gba:grid-cols-2 gba:gap-x-4 gba:gap-y-1">
            {fields.map((field, idx) => (
              <div key={`${field.label}-${idx}`} className="gba:flex gba:flex-col">
                <span className="gba:text-xs gba:text-muted-foreground">{field.label}</span>
                <span className="gba:text-sm gba:font-medium gba:truncate">{field.value}</span>
              </div>
            ))}
          </div>
          {fields.length === 0 && (
            <span className="gba:text-sm gba:text-muted-foreground">No preview data available</span>
          )}
        </CardContent>
      </Card>
    )
  }

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
                {String(
                  entity.position ||
                    entity.jobPosition ||
                    getRefCode((entity as any).salesPipelineStageRef) ||
                    getRefCode((entity as any).opportunityPipelineStageRef) ||
                    ''
                )}
              </Badge>
            )}
          </div>

          {entity.companyName && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
              <BuildingsIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <span>{String(entity.companyName)}</span>
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
                {entity.city ? String(entity.city) : ''}
                {entity.city && entity.countryRef && ', '}
                {entity.countryRef && (
                  <Badge variant="secondary" size="sm">
                    {String(entity.countryRef).split(':').pop()}
                  </Badge>
                )}
              </span>
            </div>
          )}

          <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
            {entity.email && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <EnvelopeIcon className="gba:w-4 gba:h-4" />
                <span className="gba:text-xs">{String(entity.email)}</span>
              </div>
            )}
            {entity.phoneNumber && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <PhoneIcon className="gba:w-4 gba:h-4" />
                <span className="gba:text-xs">{String(entity.phoneNumber)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
