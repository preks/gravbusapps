import React from 'react'
import { Card, CardContent, Badge } from '@newwork/nw-design-system'
import {
  EnvelopeIcon,
  PhoneIcon,
  BuildingsIcon,
  MapPinIcon,
  CurrencyCircleDollarIcon,
  CalendarBlankIcon
} from '@phosphor-icons/react'
import { ConvertedEntity, ImportConfig } from '@/common/components/common-relations/apps/data-import/types'

export interface InvestmentPreviewDetails {
  name: string
  totalInvestmentAmount?: number
  currency?: string
}

export interface InvestmentImportPreviewDetails {
  investmentGroup?: string
  investmentType?: string
  currency?: string
}

export interface EntityPreviewCardProps {
  entity: ConvertedEntity
  config?: ImportConfig
  investmentPreviewDetails?: InvestmentPreviewDetails
  investmentImportPreviewDetails?: InvestmentImportPreviewDetails
  catalogValueByRef?: Map<string, string>
  'data-testid'?: string
}

const STANDARD_IDENTITY_BADGE_FIELDS = [
  'salutationRef',
  'academicTitleRef',
  'languageRef',
  'leadStatusRef',
  'leadSourceRef',
  'leadRatingRef',
  'opportunityStatusRef',
  'opportunityForecastRef',
  'salesPipelineRef',
  'salesPipelineStageRef',
  'opportunityPipelineRef',
  'opportunityPipelineStageRef',
  'investmentGroupRef',
  'investmentTypeRef',
  'investmentRoleRef',
  'investmentStakeTypeRef'
] as const

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function humanizeKey(key: string): string {
  const lastPart = key.includes('.') ? key.split('.').pop()! : key
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim()
}

function getResolvedCatalogValue(value: unknown, catalogValueByRef?: Map<string, string>): string | undefined {
  return typeof value === 'string' ? catalogValueByRef?.get(value) : undefined
}

function toDisplayString(value: unknown): string {
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return typeof value === 'string' ? value : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getResolvedEntityCatalogValue(
  entity: ConvertedEntity,
  field: string,
  catalogValueByRef?: Map<string, string>
): string | undefined {
  return getResolvedCatalogValue(getEntityValue(entity, field), catalogValueByRef)
}

function getStandardIdentityBadgeValues(entity: ConvertedEntity, catalogValueByRef?: Map<string, string>): string[] {
  const position = toDisplayString(entity.position || entity.jobPosition)
  const catalogValues = STANDARD_IDENTITY_BADGE_FIELDS.map(field =>
    getResolvedEntityCatalogValue(entity, field, catalogValueByRef)
  ).filter((value): value is string => Boolean(value))

  return [...(position ? [position] : []), ...catalogValues]
}

function formatValue(value: unknown, catalogValueByRef?: Map<string, string>): string | null {
  if (value === null || value === undefined || value === '') return null
  const catalogValue = getResolvedCatalogValue(value, catalogValueByRef)
  if (catalogValue) return catalogValue
  if (typeof value === 'string' && UUID_PATTERN.test(value)) return null
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string') return value
  return null
}

function formatRequiredValue(value: unknown): string {
  return toDisplayString(value)
}

function extractPreviewFields(
  entity: ConvertedEntity,
  catalogValueByRef?: Map<string, string>
): Array<{ label: string; value: string }> {
  const fields: Array<{ label: string; value: string }> = []
  const MAX_FIELDS = 6

  for (const [key, val] of Object.entries(entity)) {
    if (fields.length >= MAX_FIELDS) break

    if (isRecord(val)) {
      for (const [nestedKey, nestedVal] of Object.entries(val)) {
        if (fields.length >= MAX_FIELDS) break
        const formatted = formatValue(nestedVal, catalogValueByRef)
        if (formatted) {
          fields.push({ label: humanizeKey(nestedKey), value: formatted })
        }
      }
    } else {
      const formatted = formatValue(val, catalogValueByRef)
      if (formatted) {
        fields.push({ label: humanizeKey(key), value: formatted })
      }
    }
  }

  return fields
}

function hasStandardIdentityFields(entity: ConvertedEntity): boolean {
  return Boolean(entity.firstName || entity.lastName || entity.name || entity.companyName || entity.email)
}

function getEntityValue(entity: ConvertedEntity, key: string): unknown {
  if (key in entity) return entity[key]
  const [root, field] = key.split('.')
  const rootValue = entity[root]
  if (isRecord(rootValue)) {
    return rootValue[field]
  }
  return undefined
}

function isInvestmentImport(config?: ImportConfig): boolean {
  return Boolean(config?.investmentPayloadKey)
}

function isInvestmentReportImport(config?: ImportConfig): boolean {
  return Boolean(config?.investmentReportPayloadKey) || /investmentreport$/i.test(config?.flowbotEntityType ?? '')
}

const PreviewRow: React.FC<{
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}> = ({ icon: Icon, label, value }) => (
  <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm">
    <Icon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-muted-foreground" />
    <div className="gba:min-w-0">
      <p className="gba:text-xs gba:text-muted-foreground">{label}</p>
      <p className="gba:truncate gba:font-medium">{value}</p>
    </div>
  </div>
)

function formatAmountWithCurrency(amount: unknown, currency: unknown): string {
  return `${formatRequiredValue(amount)} ${formatRequiredValue(currency)}`
}

function getOpportunityEstimatedAmountValue(
  entity: ConvertedEntity,
  config?: ImportConfig,
  catalogValueByRef?: Map<string, string>
): string | undefined {
  if (config?.entityType !== 'opportunity') {
    return undefined
  }

  if (entity.estimatedAmount === null || entity.estimatedAmount === undefined || entity.estimatedAmount === '') {
    return undefined
  }

  const currency = getResolvedEntityCatalogValue(entity, 'currencyRef', catalogValueByRef)
  return formatAmountWithCurrency(entity.estimatedAmount, currency)
}

function getStandardIdentityTitle(entity: ConvertedEntity): string {
  const fullName = [entity.firstName, entity.lastName].filter(Boolean).map(toDisplayString).join(' ')
  return toDisplayString(entity.name) || fullName || toDisplayString(entity.companyName)
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

const InvestmentPreviewCard: React.FC<EntityPreviewCardProps> = ({
  entity,
  investmentImportPreviewDetails,
  catalogValueByRef,
  'data-testid': testId = 'entity-preview-card'
}) => {
  const investmentName = formatRequiredValue(getEntityValue(entity, 'investment.name'))
  const totalInvestmentAmount = formatRequiredValue(getEntityValue(entity, 'investment.totalInvestmentAmount'))
  const investmentGroup =
    getResolvedCatalogValue(getEntityValue(entity, 'investment.investmentGroupRef'), catalogValueByRef) ??
    investmentImportPreviewDetails?.investmentGroup
  const investmentType =
    getResolvedCatalogValue(getEntityValue(entity, 'investment.investmentTypeRef'), catalogValueByRef) ??
    investmentImportPreviewDetails?.investmentType
  const currency =
    getResolvedCatalogValue(getEntityValue(entity, 'investment.currencyRef'), catalogValueByRef) ??
    investmentImportPreviewDetails?.currency

  return (
    <PreviewCard testId={testId}>
      <PreviewCardContent>
        <div className="gba:space-y-1.5">
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap">
            <span className="gba:font-medium">{investmentName}</span>
            <Badge variant="secondary" size="sm">
              {investmentGroup}
            </Badge>
            <Badge variant="info" size="sm">
              {investmentType}
            </Badge>
          </div>
          <PreviewRow
            icon={CurrencyCircleDollarIcon}
            label="Total investment amount"
            value={formatAmountWithCurrency(totalInvestmentAmount, currency)}
          />
        </div>
      </PreviewCardContent>
    </PreviewCard>
  )
}

const InvestmentReportPreviewCard: React.FC<EntityPreviewCardProps> = ({
  entity,
  investmentPreviewDetails,
  'data-testid': testId = 'entity-preview-card'
}) => {
  const reportDate = formatRequiredValue(getEntityValue(entity, 'date'))

  return (
    <PreviewCard testId={testId}>
      <PreviewCardContent>
        <div className="gba:space-y-1.5">
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap">
            <span className="gba:font-medium">{formatRequiredValue(investmentPreviewDetails?.name)}</span>
          </div>
          <PreviewRow icon={CalendarBlankIcon} label="Report date" value={reportDate} />
          <PreviewRow
            icon={CurrencyCircleDollarIcon}
            label="Total investment amount"
            value={formatAmountWithCurrency(
              investmentPreviewDetails?.totalInvestmentAmount,
              investmentPreviewDetails?.currency
            )}
          />
        </div>
      </PreviewCardContent>
    </PreviewCard>
  )
}

const GenericPreviewCard: React.FC<EntityPreviewCardProps> = ({
  entity,
  catalogValueByRef,
  'data-testid': testId = 'entity-preview-card'
}) => {
  const fields = extractPreviewFields(entity, catalogValueByRef)

  return (
    <PreviewCard testId={testId}>
      <PreviewCardContent>
        <div className="gba:grid gba:grid-cols-2 gba:gap-x-3 gba:gap-y-0.5">
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
      </PreviewCardContent>
    </PreviewCard>
  )
}

const StandardIdentityPreviewCard: React.FC<EntityPreviewCardProps> = ({
  entity,
  config,
  catalogValueByRef,
  'data-testid': testId = 'entity-preview-card'
}) => {
  const estimatedAmountValue = getOpportunityEstimatedAmountValue(entity, config, catalogValueByRef)

  return (
    <PreviewCard testId={testId}>
      <PreviewCardContent>
        <div className="gba:space-y-1.5">
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap">
            <span className="gba:font-medium">{getStandardIdentityTitle(entity)}</span>
            {getStandardIdentityBadgeValues(entity, catalogValueByRef).map(value => (
              <Badge key={value} variant="secondary" size="sm">
                {value}
              </Badge>
            ))}
          </div>

          {estimatedAmountValue && (
            <PreviewRow icon={CurrencyCircleDollarIcon} label="Estimated amount" value={estimatedAmountValue} />
          )}

          {entity.companyName && (
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm">
              <BuildingsIcon className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
              <span>{formatRequiredValue(entity.companyName)}</span>
              {getResolvedEntityCatalogValue(entity, 'industryRef', catalogValueByRef) && (
                <Badge variant="success" size="sm">
                  {getResolvedEntityCatalogValue(entity, 'industryRef', catalogValueByRef)}
                </Badge>
              )}
              {getResolvedEntityCatalogValue(entity, 'numberOfEmployeesRef', catalogValueByRef) && (
                <Badge variant="info" size="sm">
                  {getResolvedEntityCatalogValue(entity, 'numberOfEmployeesRef', catalogValueByRef)}
                </Badge>
              )}
              {getResolvedEntityCatalogValue(entity, 'legalFormRef', catalogValueByRef) && (
                <Badge variant="secondary" size="sm">
                  {getResolvedEntityCatalogValue(entity, 'legalFormRef', catalogValueByRef)}
                </Badge>
              )}
              {getResolvedEntityCatalogValue(entity, 'accountAnnualRevenueBandRef', catalogValueByRef) && (
                <Badge variant="secondary" size="sm">
                  {getResolvedEntityCatalogValue(entity, 'accountAnnualRevenueBandRef', catalogValueByRef)}
                </Badge>
              )}
            </div>
          )}

          {(entity.city || entity.countryRef) && (
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm">
              <MapPinIcon className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
              <span>
                {entity.city ? formatRequiredValue(entity.city) : ''}
                {entity.city && entity.countryRef && ', '}
                {getResolvedEntityCatalogValue(entity, 'countryRef', catalogValueByRef) && (
                  <Badge variant="secondary" size="sm">
                    {getResolvedEntityCatalogValue(entity, 'countryRef', catalogValueByRef)}
                  </Badge>
                )}
                {getResolvedEntityCatalogValue(entity, 'regionRef', catalogValueByRef) && (
                  <Badge variant="secondary" size="sm">
                    {getResolvedEntityCatalogValue(entity, 'regionRef', catalogValueByRef)}
                  </Badge>
                )}
              </span>
            </div>
          )}

          <div className="gba:flex gba:items-center gba:gap-3 gba:text-sm gba:text-muted-foreground">
            {entity.email && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <EnvelopeIcon className="gba:w-3.5 gba:h-3.5" />
                <span className="gba:text-xs">{formatRequiredValue(entity.email)}</span>
              </div>
            )}
            {entity.phoneNumber && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <PhoneIcon className="gba:w-3.5 gba:h-3.5" />
                <span className="gba:text-xs">{formatRequiredValue(entity.phoneNumber)}</span>
              </div>
            )}
          </div>
        </div>
      </PreviewCardContent>
    </PreviewCard>
  )
}

export const EntityPreviewCard: React.FC<EntityPreviewCardProps> = props => {
  if (isInvestmentImport(props.config)) {
    return <InvestmentPreviewCard {...props} />
  }

  if (isInvestmentReportImport(props.config)) {
    return <InvestmentReportPreviewCard {...props} />
  }

  if (!hasStandardIdentityFields(props.entity)) {
    return <GenericPreviewCard {...props} />
  }

  return <StandardIdentityPreviewCard {...props} />
}
