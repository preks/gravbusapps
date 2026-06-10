import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import type { CampaignRecord } from '../types'
import translations from '@/business-apps/crm/campaigns/_i18n'

interface CampaignDetailsSectionProps {
  campaign: CampaignRecord
}

interface DetailField {
  id: string
  label: string
  value: string
}

const EMPTY_VALUE = '-'

const formatCatalogValue = (entry?: { value?: string }): string => entry?.value?.trim() || EMPTY_VALUE

const formatCurrencyValue = (amount?: number | null): string => {
  if (amount == null || Number.isNaN(Number(amount))) {
    return EMPTY_VALUE
  }
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(amount))
}

const formatPercentValue = (rate?: number | null): string => {
  if (rate == null || Number.isNaN(Number(rate))) {
    return EMPTY_VALUE
  }
  return `${Number(rate)}%`
}

function DetailRow({ id, label, value }: Readonly<DetailField>) {
  return (
    <div className="gba:space-y-1" data-testid={`campaign-details-field-${id}`}>
      <dt className="gba:text-xs gba:font-medium gba:text-muted-foreground">{label}</dt>
      <dd className="gba:text-sm gba:text-foreground">{value}</dd>
    </div>
  )
}

function DetailGrid({ fields }: Readonly<{ fields: DetailField[] }>) {
  return (
    <dl className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
      {fields.map(field => (
        <DetailRow key={field.id} {...field} />
      ))}
    </dl>
  )
}

const CampaignDetailsSection: React.FC<Readonly<CampaignDetailsSectionProps>> = ({ campaign }) => {
  const { t } = useTranslation(translations)

  const strategicFields = useMemo<DetailField[]>(
    () => [
      { id: 'segment', label: t('campaign-segment'), value: formatCatalogValue(campaign.customerCampaignSegment) },
      { id: 'persona', label: t('campaign-persona'), value: formatCatalogValue(campaign.customerPersona) },
      {
        id: 'value-pack',
        label: t('campaign-valuePack'),
        value: formatCatalogValue(campaign.customerValuePackFocus)
      },
      {
        id: 'industry',
        label: t('campaign-industryFocus'),
        value: formatCatalogValue(campaign.customerIndustryFocus)
      },
      { id: 'geography', label: t('campaign-geography'), value: formatCatalogValue(campaign.country) }
    ],
    [campaign, t]
  )

  const financialFields = useMemo<DetailField[]>(
    () => [
      { id: 'budget', label: t('campaign-budget'), value: formatCurrencyValue(campaign.budgetAllocated) },
      {
        id: 'pipeline',
        label: t('campaign-pipelineTarget'),
        value: formatCurrencyValue(campaign.pipelineTarget)
      },
      { id: 'win-rate', label: t('campaign-winRate'), value: formatPercentValue(campaign.expectedWinRate) },
      {
        id: 'revenue',
        label: t('campaign-revenue'),
        value: formatCurrencyValue(campaign.expectedRevenueContribution)
      }
    ],
    [campaign, t]
  )

  const description = campaign.description?.trim()

  return (
    <Card className="gba:bg-muted" data-testid="campaign-details-section">
      <CardHeader>
        <CardTitle>{t('campaign-details-title')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-6">
        {description ? (
          <div className="gba:space-y-2" data-testid="campaign-details-description">
            <h3 className="gba:text-sm gba:font-medium">{t('campaign-description')}</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:whitespace-pre-wrap">{description}</p>
          </div>
        ) : null}

        <div className="gba:space-y-3" data-testid="campaign-details-strategic">
          <h3 className="gba:text-sm gba:font-medium">{t('campaign-strategic')}</h3>
          <DetailGrid fields={strategicFields} />
        </div>

        <div className="gba:space-y-3" data-testid="campaign-details-financial">
          <h3 className="gba:text-sm gba:font-medium">{t('campaign-financial')}</h3>
          <DetailGrid fields={financialFields} />
        </div>
      </CardContent>
    </Card>
  )
}

export default CampaignDetailsSection
