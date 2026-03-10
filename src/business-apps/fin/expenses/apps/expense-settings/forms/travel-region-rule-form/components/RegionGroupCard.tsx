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
  Checkbox,
  DateInput
} from '@newwork/nw-design-system'
import { TrashIcon } from '@phosphor-icons/react'
import { SmartColumnGroup, CatalogOption } from '../types'
import { normalizeDateInputValue } from '../../../utils'

interface RegionGroupCardProps {
  group: SmartColumnGroup
  groupIndex: number
  countries: CatalogOption[]
  travelRegions: CatalogOption[]
  currencies: CatalogOption[]
  isLoadingMoreRegions: boolean
  onUpdateField: (field: string, value: any) => void
  onUpdateAmount: (amountIndex: number, value: string) => void
  onRemoveGroup: () => void
  isUsedInTransactions?: boolean
  showValidation?: boolean
}

export const RegionGroupCard: React.FC<RegionGroupCardProps> = ({
  group,
  groupIndex,
  countries,
  travelRegions,
  currencies,
  isLoadingMoreRegions,
  onUpdateField,
  onUpdateAmount,
  onRemoveGroup,
  isUsedInTransactions = false,
  showValidation = false
}) => {
  // Check if this is an existing detail (has real ID) or a new one (temp ID)
  const isExistingDetail = group.detailIds.length > 0 && group.detailIds.some(id => id && !id.startsWith('temp-'))
  // Only restrict editing for EXISTING details when the rule is used in transactions
  const isEditRestricted = isUsedInTransactions && isExistingDetail

  const hasInvalidAmounts =
    showValidation && (group.amounts.length === 0 || group.amounts.some(a => a === null || a === undefined))
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
          <TrashIcon className="gba:h-3.5 gba:w-3.5 gba:mr-1" />
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
            <SelectContent className="gba:max-h-48">
              {travelRegions.map(region => (
                <SelectItem key={region.id} value={region.id}>
                  {region.value}
                </SelectItem>
              ))}

              {isLoadingMoreRegions && (
                <div className="gba:p-2 gba:text-center gba:border-t">
                  <Spinner size="sm" className="gba:mr-2" />
                  <span className="gba:text-muted-foreground gba:text-xs">Loading regions...</span>
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
            <DateInput
              value={group.activeFrom}
              onChange={date => onUpdateField('activeFrom', normalizeDateInputValue(date) || '')}
              outputFormat="iso"
              data-testid={`travel-region-rule-group-valid-from-${groupIndex}`}
              disabled={isEditRestricted}
            />
          </div>
          <div className="gba:space-y-1">
            <Label className="gba:text-xs gba:font-medium">Valid To</Label>
            <DateInput
              value={group.activeTo || ''}
              onChange={date => onUpdateField('activeTo', normalizeDateInputValue(date) || '')}
              outputFormat="iso"
              data-testid={`travel-region-rule-group-valid-to-${groupIndex}`}
              max="2099-12-31"
            />
            {isEditRestricted && (
              <p className="gba:text-xs gba:text-muted-foreground">Only "Valid To" can be modified.</p>
            )}
          </div>
        </div>

        {/* Amounts Section */}
        <div className="gba:space-y-1.5">
          <Label className="gba:text-xs gba:font-medium">
            Allowance Amount <span className="gba:text-destructive gba:ml-1">*</span>
          </Label>
          <Input
            type="number"
            step="0.01"
            value={group.amounts[0] !== null && group.amounts[0] !== undefined ? group.amounts[0] : ''}
            onChange={e => onUpdateAmount(0, e.target.value)}
            placeholder="0.00"
            className={`gba:h-8 gba:text-sm ${hasInvalidAmounts ? 'gba:border-destructive focus:gba:border-destructive' : ''}`}
            data-testid={`travel-region-rule-amount-${group.key}`}
            disabled={isEditRestricted}
          />
        </div>
      </div>
    </div>
  )
}
