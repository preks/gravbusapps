import React from 'react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Spinner,
  Checkbox
} from '@newwork/nw-design-system'
import { PiPlus, PiTrash } from 'react-icons/pi'
import { SmartColumnGroup, CatalogOption } from '../types'

interface RegionGroupCardProps {
  group: SmartColumnGroup
  groupIndex: number
  countries: CatalogOption[]
  travelRegions: CatalogOption[]
  currencies: CatalogOption[]
  isLoadingMoreRegions: boolean
  hasMore: boolean
  onUpdateField: (field: string, value: any) => void
  onUpdateAmount: (amountIndex: number, value: string) => void
  onAddAmount: () => void
  onRemoveAmount: (amountIndex: number) => void
  onRemoveGroup: () => void
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
  isUsedInTransactions?: boolean
}

export const RegionGroupCard: React.FC<RegionGroupCardProps> = ({
  group,
  groupIndex,
  countries,
  travelRegions,
  currencies,
  isLoadingMoreRegions,
  hasMore,
  onUpdateField,
  onUpdateAmount,
  onAddAmount,
  onRemoveAmount,
  onRemoveGroup,
  onScroll,
  isUsedInTransactions = false
}) => {
  // Check if this is an existing detail (has real ID) or a new one (temp ID)
  const isExistingDetail = group.detailIds.length > 0 && group.detailIds.some(id => id && !id.startsWith('temp-'))
  // Only restrict editing for EXISTING details when the rule is used in transactions
  const isEditRestricted = isUsedInTransactions && isExistingDetail
  return (
    <div className="gba:border gba:rounded-lg gba:p-3 gba:space-y-3 gba:bg-card">
      {/* Group Header */}
      <div className="gba:flex gba:items-center gba:justify-end gba:pb-2 gba:border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemoveGroup}
          className="gba:text-destructive hover:gba:text-destructive gba:h-7 gba:text-xs"
          title="Remove Group"
          disabled={isEditRestricted}
        >
          <PiTrash className="gba:h-3.5 gba:w-3.5 gba:mr-1" />
          Remove
        </Button>
      </div>

      {/* Group Fields */}
      <div className="gba:space-y-2.5">
        {/* Country */}
        <div className="gba:space-y-1">
          <Label className="gba:text-xs gba:font-medium">
            Country <span className="gba:text-destructive gba:ml-1">*</span>
          </Label>
          <Select
            value={group.countryRef}
            onValueChange={value => onUpdateField('countryRef', value)}
            disabled={isEditRestricted}
          >
            <SelectTrigger className="gba:w-full gba:h-8 gba:text-sm">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="gba:max-h-48">
              {countries.map(country => (
                <SelectItem key={country.id} value={country.id}>
                  {country.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Travel Region */}
        <div className="gba:space-y-1">
          <Label className="gba:text-xs gba:font-medium">
            Travel Region <span className="gba:text-destructive gba:ml-1">*</span>
          </Label>
          <Select
            value={group.travelRegion}
            onValueChange={value => onUpdateField('travelRegion', value)}
            disabled={isEditRestricted}
          >
            <SelectTrigger className="gba:w-full gba:h-8 gba:text-sm">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent onScroll={onScroll} className="gba:max-h-48">
              {travelRegions.map(region => (
                <SelectItem key={region.id} value={region.id}>
                  {region.value}
                </SelectItem>
              ))}

              {/* Loading indicator */}
              {isLoadingMoreRegions && (
                <div className="gba:p-2 gba:text-center gba:border-t">
                  <Spinner size="sm" className="gba:mr-2" />
                  <span className="gba:text-muted-foreground gba:text-xs">Loading...</span>
                </div>
              )}

              {/* Has more indicator */}
              {hasMore && !isLoadingMoreRegions && (
                <div className="gba:p-2 gba:text-center gba:text-muted-foreground gba:text-xs gba:border-t">
                  Scroll down to load more...
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Currency */}
        <div className="gba:space-y-1">
          <Label className="gba:text-xs gba:font-medium">
            Currency <span className="gba:text-destructive gba:ml-1">*</span>
          </Label>
          <Select
            value={group.currencyRef}
            onValueChange={value => onUpdateField('currencyRef', value)}
            disabled={isEditRestricted}
          >
            <SelectTrigger className="gba:w-full gba:h-8 gba:text-sm">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map(currency => (
                <SelectItem key={currency.id} value={currency.id}>
                  {currency.code} - {currency.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Home Flag */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:py-1">
          <Checkbox
            id={`home-${group.key}`}
            checked={group.homeFlag}
            onCheckedChange={checked => onUpdateField('home', checked)}
            className="gba:h-4 gba:w-4"
            disabled={isEditRestricted}
          />
          <Label htmlFor={`home-${group.key}`} className="gba:text-xs gba:font-medium gba:cursor-pointer">
            Home Region
          </Label>
        </div>

        {/* Validity Period */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          <div className="gba:space-y-1">
            <Label className="gba:text-xs gba:font-medium">
              Valid From <span className="gba:text-destructive gba:ml-1">*</span>
            </Label>
            <Input
              type="date"
              value={group.validFrom}
              onChange={e => onUpdateField('activeFrom', e.target.value)}
              data-testid={`travel-region-rule-group-valid-from-${groupIndex}`}
              className="gba:h-8 gba:text-sm"
              min="1900-01-01"
              max="2099-12-31"
              disabled={isEditRestricted}
            />
          </div>
          <div className="gba:space-y-1">
            <Label className="gba:text-xs gba:font-medium">Valid To</Label>
            <Input
              type="date"
              value={group.validTo || ''}
              onChange={e => onUpdateField('activeTo', e.target.value || undefined)}
              data-testid={`travel-region-rule-group-valid-to-${groupIndex}`}
              placeholder="Leave empty for unlimited"
              className="gba:h-8 gba:text-sm"
              min="1900-01-01"
              max="2099-12-31"
            />
            {isEditRestricted && (
              <p className="gba:text-xs gba:text-muted-foreground">
                Only "Valid To" can be modified.
              </p>
            )}
          </div>
        </div>

        {/* Amounts Section */}
        <div className="gba:space-y-1.5">
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs gba:font-medium">
              Allowance Amounts <span className="gba:text-destructive gba:ml-1">*</span>
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddAmount}
              className="gba:flex gba:items-center gba:gap-1 gba:h-7 gba:text-xs"
              disabled={isEditRestricted}
            >
              <PiPlus className="gba:h-3 gba:w-3" />
              Add Amount
            </Button>
          </div>

          {group.amounts.length > 0 ? (
            <div className="gba:space-y-1.5">
              {group.amounts.map((amount, amountIndex) => (
                <div key={`${group.key}-amount-${amountIndex}`} className="gba:flex gba:items-center gba:gap-2">
                  <Label className="gba:text-xs gba:text-muted-foreground gba:w-16">Amount {amountIndex + 1}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount || ''}
                    onChange={e => onUpdateAmount(amountIndex, e.target.value)}
                    placeholder="0.00"
                    className="gba:w-48 gba:h-8 gba:text-sm"
                    data-testid={`travel-region-rule-amount-${group.key}-${amountIndex}`}
                    disabled={isEditRestricted}
                  />
                  {group.amounts.length > 1 && !isEditRestricted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveAmount(amountIndex)}
                      className="gba:text-destructive hover:gba:text-destructive gba:h-7 gba:w-7 gba:p-0"
                      title="Remove this amount"
                    >
                      <PiTrash className="gba:h-3.5 gba:w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="gba:text-center gba:py-3 gba:text-muted-foreground gba:text-xs gba:italic">
              No amounts added yet. Click "Add Amount" above.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
