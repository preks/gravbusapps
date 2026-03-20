import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Input, Label, DateInput } from '@newwork/nw-design-system'
import { TravelRegionRuleFormData } from '../types'
import { normalizeDateInputValue } from '../../../utils'

interface BasicInformationSectionProps {
  formData: TravelRegionRuleFormData
  onUpdate: (updates: Partial<TravelRegionRuleFormData>) => void
  isUsedInTransactions?: boolean
}

export const BasicInformationSection: React.FC<BasicInformationSectionProps> = ({
  formData,
  onUpdate,
  isUsedInTransactions = false
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
          <div className="gba:space-y-2">
            <Label htmlFor="rule-code">
              Rule Code <span className="gba:text-destructive gba:ml-1">*</span>
            </Label>
            <Input
              id="rule-code"
              value={formData.code}
              onChange={e => onUpdate({ code: e.target.value })}
              placeholder="Enter rule code"
              disabled={isUsedInTransactions}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="rule-name">
              Rule Name <span className="gba:text-destructive gba:ml-1">*</span>
            </Label>
            <Input
              id="rule-name"
              value={formData.name}
              onChange={e => onUpdate({ name: e.target.value })}
              placeholder="Enter rule name"
              disabled={isUsedInTransactions}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="active-from">Active From</Label>
            <DateInput
              value={formData.activeFrom || ''}
              onChange={date => onUpdate({ activeFrom: normalizeDateInputValue(date) || '' })}
              outputFormat="iso"
              data-testid="travel-region-rule-form-active-from"
              disabled={isUsedInTransactions}
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="active-to">Active To</Label>
            <DateInput
              value={formData.activeTo || ''}
              onChange={date => onUpdate({ activeTo: normalizeDateInputValue(date) || '' })}
              outputFormat="iso"
              data-testid="travel-region-rule-form-active-to"
            />
            {isUsedInTransactions && (
              <p className="gba:text-xs gba:text-muted-foreground">
                Only the "Active To" date can be modified for rules in use.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
