import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Label } from '@newwork/nw-design-system';
import { TravelRegionRuleFormData } from '../types';

interface BasicInformationSectionProps {
  formData: TravelRegionRuleFormData;
  onUpdate: (updates: Partial<TravelRegionRuleFormData>) => void;
}

export const BasicInformationSection: React.FC<BasicInformationSectionProps> = ({
  formData,
  onUpdate,
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
              Rule Code <span className="gba:text-red-500 gba:ml-1">*</span>
            </Label>
            <Input
              id="rule-code"
              value={formData.code}
              onChange={(e) => onUpdate({ code: e.target.value })}
              placeholder="Enter rule code"
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="rule-name">
              Rule Name <span className="gba:text-red-500 gba:ml-1">*</span>
            </Label>
            <Input
              id="rule-name"
              value={formData.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Enter rule name"
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="active-from">Active From</Label>
            <Input
              id="active-from"
              type="date"
              value={formData.activeFrom || ''}
              onChange={(e) => onUpdate({ activeFrom: e.target.value })}
              data-testid="travel-region-rule-form-active-from"
              min="1900-01-01"
              max="2099-12-31"
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="active-to">Active To</Label>
            <Input
              id="active-to"
              type="date"
              value={formData.activeTo || ''}
              onChange={(e) => onUpdate({ activeTo: e.target.value })}
              data-testid="travel-region-rule-form-active-to"
              min="1900-01-01"
              max="2099-12-31"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


