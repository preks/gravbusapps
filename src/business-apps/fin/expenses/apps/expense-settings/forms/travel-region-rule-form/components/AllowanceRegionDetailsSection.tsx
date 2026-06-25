import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { RegionGroupCard } from './RegionGroupCard'
import { SmartColumnGroup, CatalogOption } from '../types'

interface AllowanceRegionDetailsSectionProps {
  groups: SmartColumnGroup[]
  countries: CatalogOption[]
  travelRegions: CatalogOption[]
  currencies: CatalogOption[]
  isLoadingRegions: boolean
  hasMoreRegions: boolean
  onSearchRegions: (searchTerm: string) => void
  onLoadMoreRegions: () => void
  onAddGroup: () => void
  onUpdateGroupDetail: (groupKey: string, field: string, value: any) => void
  onUpdateAmount: (groupKey: string, amountIndex: number, value: string) => void
  onRemoveGroup: (groupKey: string) => void
  isUsedInTransactions?: boolean
  showValidation?: boolean
}

export const AllowanceRegionDetailsSection: React.FC<AllowanceRegionDetailsSectionProps> = ({
  groups,
  countries,
  travelRegions,
  currencies,
  isLoadingRegions,
  hasMoreRegions,
  onSearchRegions,
  onLoadMoreRegions,
  onAddGroup,
  onUpdateGroupDetail,
  onUpdateAmount,
  onRemoveGroup,
  isUsedInTransactions = false,
  showValidation = false
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Allowance Region Details</CardTitle>
          <Button onClick={onAddGroup} size="sm" className="gba:flex gba:items-center gba:gap-2">
            <PlusIcon className="gba:h-4 gba:w-4" />
            Add Group
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length > 0 ? (
          <div className="gba:space-y-4">
            {groups.map((group, groupIndex) => (
              <RegionGroupCard
                key={group.stableKey}
                group={group}
                groupIndex={groupIndex}
                countries={countries}
                travelRegions={travelRegions}
                currencies={currencies}
                isLoadingRegions={isLoadingRegions}
                hasMoreRegions={hasMoreRegions}
                onSearchRegions={onSearchRegions}
                onLoadMoreRegions={onLoadMoreRegions}
                onUpdateField={(field, value) => onUpdateGroupDetail(group.key, field, value)}
                onUpdateAmount={(amountIndex, value) => onUpdateAmount(group.key, amountIndex, value)}
                onRemoveGroup={() => onRemoveGroup(group.key)}
                isUsedInTransactions={isUsedInTransactions}
                showValidation={showValidation}
              />
            ))}
          </div>
        ) : (
          <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
            No allowance details added yet. Click "Add Group" to start.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
