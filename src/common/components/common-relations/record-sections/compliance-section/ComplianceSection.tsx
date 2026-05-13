import React from 'react'
import { EmptyState } from '@newwork/nw-design-system'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { createGetPages } from '../utils'

export interface ComplianceData {
  doubleOptIn?: boolean | null
  doubleOptInDate?: string | null
  optInSource?: CatalogEntry | null
  optInSourceRef?: string | null
  optInStatus?: CatalogEntry | null
  optInStatusRef?: string | null
  singleOptIn?: boolean | null
  singleOptInDate?: string | null
}

interface ComplianceSectionProps {
  entity?: ComplianceData | null
  entities?: ComplianceData[]
  className?: string
  'data-testid'?: string
}

interface ComplianceField {
  id: string
  label: string
  value: string
}

const notSetLabel = () => getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')

const formatBoolean = (value?: boolean | null): string => {
  if (value === true) {
    return getTranslationFromI18nKeyAndLabel('crm.common.yes', 'Yes')
  }

  if (value === false) {
    return getTranslationFromI18nKeyAndLabel('crm.common.no', 'No')
  }

  return notSetLabel()
}

const formatDate = (value?: string | null): string => {
  if (!value) {
    return notSetLabel()
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return notSetLabel()
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

const formatCatalog = (entry?: CatalogEntry | null, fallbackRef?: string | null): string => {
  if (entry?.value) {
    return entry.value
  }

  if (entry?.code) {
    return entry.code
  }

  if (fallbackRef) {
    return fallbackRef
  }

  return notSetLabel()
}

const buildComplianceFields = (entity: ComplianceData): ComplianceField[] => [
  {
    id: 'single-opt-in',
    label: getTranslationFromI18nKeyAndLabel('crm.compliance.singleOptIn', 'Single opt-in'),
    value: formatBoolean(entity.singleOptIn)
  },
  {
    id: 'single-opt-in-date',
    label: getTranslationFromI18nKeyAndLabel('crm.compliance.singleOptInDate', 'Single opt-in date'),
    value: formatDate(entity.singleOptInDate)
  },
  {
    id: 'double-opt-in',
    label: getTranslationFromI18nKeyAndLabel('crm.compliance.doubleOptIn', 'Double opt-in'),
    value: formatBoolean(entity.doubleOptIn)
  },
  {
    id: 'double-opt-in-date',
    label: getTranslationFromI18nKeyAndLabel('crm.compliance.doubleOptInDate', 'Double opt-in date'),
    value: formatDate(entity.doubleOptInDate)
  },
  {
    id: 'opt-in-source',
    label: getTranslationFromI18nKeyAndLabel('crm.compliance.optInSource', 'Opt-in source'),
    value: formatCatalog(entity.optInSource, entity.optInSourceRef)
  },
  {
    id: 'opt-in-status',
    label: getTranslationFromI18nKeyAndLabel('crm.compliance.optInStatus', 'Opt-in status'),
    value: formatCatalog(entity.optInStatus, entity.optInStatusRef)
  }
]

const ComplianceDetails: React.FC<{ entity?: ComplianceData | null }> = ({ entity }) => {
  if (!entity) {
    return (
      <div className="gba:w-full gba:relative gba:flex gba:flex-col gba:h-full">
        <EmptyState
          type="no-data"
          title={getTranslationFromI18nKeyAndLabel('crm.compliance.noDataTitle', 'No Compliance Data')}
          description={getTranslationFromI18nKeyAndLabel(
            'crm.compliance.noDataDescription',
            'No compliance data is available for this record.'
          )}
          data-testid="compliance-section-empty-state"
        />
      </div>
    )
  }

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:sm:grid-cols-2" data-testid="compliance-section-fields">
      {buildComplianceFields(entity).map(field => (
        <div
          key={field.id}
          className="gba:flex gba:flex-col gba:gap-1 gba:rounded-md gba:border gba:border-border gba:p-3"
        >
          <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground">{field.label}</dt>
          <dd className="gba:text-sm gba:font-medium gba:text-card-foreground gba:break-words">{field.value}</dd>
        </div>
      ))}
    </div>
  )
}

const ComplianceSection: React.FC<ComplianceSectionProps> = ({ entity, entities, className = '', ...props }) => {
  const entityList = Array.isArray(entities) ? entities.filter(Boolean) : []
  const displayEntity = entity || (entityList.length > 0 ? entityList[0] : null)

  return (
    <div data-testid={props['data-testid'] || 'compliance-section'} className={`gba:w-full gba:h-full ${className}`}>
      <ComplianceDetails entity={displayEntity} />
    </div>
  )
}

;(ComplianceSection as any).sectionTitle = 'Compliance'
;(ComplianceSection as any).getPages = createGetPages<ComplianceData, ComplianceSectionProps>(
  (props: ComplianceSectionProps) => props.entities,
  (props: ComplianceSectionProps) => props.entity || undefined
)
;(ComplianceSection as any).renderPage = (pageData: ComplianceData) => <ComplianceDetails entity={pageData} />

export default ComplianceSection
