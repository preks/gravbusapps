import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { ProspectField } from '../types'

interface ProspectFieldDialogProps {
  field: ProspectField
  onSave: (field: ProspectField) => void
  onCancel: () => void
  prefixDataTestId?: string
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'badge', label: 'Badge' }
]

const SECTIONS = [
  { value: 'overview', label: 'Overview' },
  { value: 'financial', label: 'Financial' },
  { value: 'details', label: 'Details' },
  { value: 'metadata', label: 'Metadata' }
]

export const ProspectFieldDialog: React.FC<ProspectFieldDialogProps> = ({
  field,
  onSave,
  onCancel,
  prefixDataTestId = 'prospect-field-dialog'
}) => {
  const [formData, setFormData] = useState<ProspectField>(field)

  const handleChange = (key: keyof ProspectField, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(formData)
  }

  return (
    <Dialog open={true} onOpenChange={open => !open && onCancel()}>
      <DialogContent data-testid={prefixDataTestId} className="gba:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Prospect Field</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Label */}
          <div className="gba:space-y-2">
            <Label htmlFor="label">Field Label</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={e => handleChange('label', e.target.value)}
              placeholder="Enter field label"
              data-testid={`${prefixDataTestId}-label-input`}
            />
          </div>

          {/* Property */}
          <div className="gba:space-y-2">
            <Label htmlFor="property">Property Path</Label>
            <Input
              id="property"
              value={formData.property}
              onChange={e => handleChange('property', e.target.value)}
              placeholder="e.g., investment.name"
              data-testid={`${prefixDataTestId}-property-input`}
            />
          </div>

          {/* Type */}
          <div className="gba:space-y-2">
            <Label htmlFor="type">Field Type</Label>
            <Select value={formData.type} onValueChange={(value: any) => handleChange('type', value)}>
              <SelectTrigger data-testid={`${prefixDataTestId}-type-select`}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section */}
          <div className="gba:space-y-2">
            <Label htmlFor="section">Section</Label>
            <Select value={formData.section} onValueChange={value => handleChange('section', value)}>
              <SelectTrigger data-testid={`${prefixDataTestId}-section-select`}>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map(section => (
                  <SelectItem key={section.value} value={section.value}>
                    {section.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid={`${prefixDataTestId}-cancel-button`}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid={`${prefixDataTestId}-save-button`}>
            Save Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
