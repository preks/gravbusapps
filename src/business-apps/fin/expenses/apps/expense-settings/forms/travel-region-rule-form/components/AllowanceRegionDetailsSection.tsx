import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system';
import { PiPlus } from 'react-icons/pi';
import { RegionGroupCard } from './RegionGroupCard';
import { SmartColumnGroup, CatalogOption } from '../types';

interface AllowanceRegionDetailsSectionProps {
  groups: SmartColumnGroup[];
  countries: CatalogOption[];
  travelRegions: CatalogOption[];
  currencies: CatalogOption[];
  isLoadingMoreRegions: boolean;
  hasMore: boolean;
  onAddGroup: () => void;
  onUpdateGroupDetail: (groupKey: string, field: string, value: any) => void;
  onUpdateAmount: (groupKey: string, amountIndex: number, value: string) => void;
  onAddAmountColumn: (groupKey: string) => void;
  onRemoveAmount: (groupKey: string, amountIndex: number) => void;
  onRemoveGroup: (groupKey: string) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  isUsedInTransactions?: boolean;
}

export const AllowanceRegionDetailsSection: React.FC<AllowanceRegionDetailsSectionProps> = ({
  groups,
  countries,
  travelRegions,
  currencies,
  isLoadingMoreRegions,
  hasMore,
  onAddGroup,
  onUpdateGroupDetail,
  onUpdateAmount,
  onAddAmountColumn,
  onRemoveAmount,
  onRemoveGroup,
  onScroll,
  isUsedInTransactions = false,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Allowance Region Details</CardTitle>
          <Button onClick={onAddGroup} size="sm" className="gba:flex gba:items-center gba:gap-2">
            <PiPlus className="gba:h-4 gba:w-4" />
            Add Group
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length > 0 ? (
          <div className="gba:space-y-4">
            {groups.map((group, groupIndex) => (
              <RegionGroupCard
                key={group.key}
                group={group}
                groupIndex={groupIndex}
                countries={countries}
                travelRegions={travelRegions}
                currencies={currencies}
                isLoadingMoreRegions={isLoadingMoreRegions}
                hasMore={hasMore}
                onUpdateField={(field, value) => onUpdateGroupDetail(group.key, field, value)}
                onUpdateAmount={(amountIndex, value) => onUpdateAmount(group.key, amountIndex, value)}
                onAddAmount={() => onAddAmountColumn(group.key)}
                onRemoveAmount={(amountIndex) => onRemoveAmount(group.key, amountIndex)}
                onRemoveGroup={() => onRemoveGroup(group.key)}
                onScroll={onScroll}
                isUsedInTransactions={isUsedInTransactions}
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
  );
};


