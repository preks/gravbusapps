import React from 'react'
import { Badge, Card, CardContent } from '@newwork/nw-design-system'
import { DatabaseIcon, DropIcon, TrendUpIcon } from '@phosphor-icons/react'
import { CatalogEntryWithConfig, TargetLevel } from '../types'

interface ConfigurationScopeSummaryProps {
  targetLevel: TargetLevel
  selectedGroup: CatalogEntryWithConfig | null
  selectedType: CatalogEntryWithConfig | null
  selectedLiquidFundType: CatalogEntryWithConfig | null
  inheritedSections: string[]
  inheritedFrom?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'configuration-scope-summary'

const getScopeLabel = (targetLevel: TargetLevel): string => {
  switch (targetLevel) {
    case 'liquidFundType':
      return 'Liquid Fund Type'
    case 'type':
      return 'Investment Type'
    default:
      return 'Investment Group'
  }
}

const getScopeTitle = (
  targetLevel: TargetLevel,
  selectedGroup: CatalogEntryWithConfig | null,
  selectedType: CatalogEntryWithConfig | null,
  selectedLiquidFundType: CatalogEntryWithConfig | null
): string => {
  if (targetLevel === 'liquidFundType') {
    return selectedLiquidFundType?.value || 'Liquid fund type configuration'
  }

  if (targetLevel === 'type') {
    return selectedType?.value || 'Investment type configuration'
  }

  return selectedGroup?.value || 'Investment group defaults'
}

const getScopeDescription = (targetLevel: TargetLevel): string => {
  switch (targetLevel) {
    case 'liquidFundType':
      return 'Most specific configuration for a liquid fund type. Missing sections inherit from the selected investment type.'
    case 'type':
      return 'Configuration for one investment type. Missing sections inherit from the investment group defaults.'
    default:
      return 'Default configuration for this investment group. Investment types can inherit or override these fields.'
  }
}

const getScopeIcon = (targetLevel: TargetLevel) => {
  if (targetLevel === 'liquidFundType') return <DropIcon className="gba:w-4 gba:h-4" />
  if (targetLevel === 'type') return <TrendUpIcon className="gba:w-4 gba:h-4" />
  return <DatabaseIcon className="gba:w-4 gba:h-4" />
}

export const ConfigurationScopeSummary: React.FC<ConfigurationScopeSummaryProps> = ({
  targetLevel,
  selectedGroup,
  selectedType,
  selectedLiquidFundType,
  inheritedSections,
  inheritedFrom,
  prefixDataTestId
}) => {
  const breadcrumbItems = [selectedGroup?.value, selectedType?.value, selectedLiquidFundType?.value].filter(Boolean)
  const inheritedLabel = inheritedSections.join(', ')

  return (
    <Card variant="default" data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`}>
      <CardContent className="gba:space-y-3">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:flex-wrap">
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
              <Badge variant="secondary" className="gba:flex gba:items-center gba:gap-1">
                {getScopeIcon(targetLevel)}
                {getScopeLabel(targetLevel)}
              </Badge>
              {breadcrumbItems.length > 0 && (
                <span className="gba:text-sm gba:text-muted-foreground">{breadcrumbItems.join(' / ')}</span>
              )}
            </div>
            <div>
              <h2 className="gba:text-xl gba:font-semibold gba:m-0">
                {getScopeTitle(targetLevel, selectedGroup, selectedType, selectedLiquidFundType)}
              </h2>
              <p className="gba:text-sm gba:text-muted-foreground gba:m-0">{getScopeDescription(targetLevel)}</p>
            </div>
          </div>

          {inheritedSections.length > 0 && inheritedFrom && (
            <Badge variant="outline" className="gba:shrink-0">
              Inherits {inheritedLabel} from {inheritedFrom}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
