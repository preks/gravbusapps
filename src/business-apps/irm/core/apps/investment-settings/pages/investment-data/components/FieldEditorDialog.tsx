import React, { useState, useEffect } from 'react'
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
  SelectItem,
  Textarea
} from '@newwork/nw-design-system'
import { FieldDefinition } from '../types'

interface FieldEditorDialogProps {
  field: FieldDefinition
  onSave: (field: FieldDefinition) => void
  onCancel: () => void
  prefixDataTestId?: string
}

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'TEXTAREA', label: 'Text Area' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'AMOUNT', label: 'Amount' },
  { value: 'DATE', label: 'Date' },
  { value: 'DATETIME', label: 'Date & Time' },
  { value: 'BOOLEAN', label: 'Boolean (Yes/No)' },
  { value: 'SELECT', label: 'Select (Dropdown)' }
]

export const FieldEditorDialog: React.FC<FieldEditorDialogProps> = ({
  field,
  onSave,
  onCancel,
  prefixDataTestId = 'field-editor-dialog'
}) => {
  const [formData, setFormData] = useState<FieldDefinition>(field)

  useEffect(() => {
    setFormData({ ...field })
  }, [field])

  const handleChange = <K extends keyof FieldDefinition>(key: K, value: FieldDefinition[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }
  const handleSave = () => {
    onSave(formData)
  }

  return (
    <Dialog open={true} onOpenChange={open => !open && onCancel()}>
      <DialogContent data-testid={prefixDataTestId} className="gba:max-w-[600px]">
        {' '}
        <DialogHeader>
          <DialogTitle>Edit Field</DialogTitle>
        </DialogHeader>
        <div className="gba:space-y-4 gba:py-4">
          {/* Field Label */}
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

          {/* Property Path */}
          <div className="gba:space-y-2">
            <Label htmlFor="property">Property Path</Label>
            <Input
              id="property"
              value={formData.property}
              onChange={e => handleChange('property', e.target.value)}
              placeholder="e.g., investment.name or equityInvestment.marketValue"
              data-testid={`${prefixDataTestId}-property-input`}
            />
            <p className="gba:text-xs gba:text-muted-foreground">Path to the data field in the investment object</p>
          </div>

          {/* Display Order */}
          <div className="gba:space-y-2">
            <Label htmlFor="displayOrder">Display Order (X.Y format)</Label>
            <Input
              id="displayOrder"
              value={formData.displayOrder}
              onChange={e => handleChange('displayOrder', e.target.value)}
              placeholder="e.g., 1.1, 1.2, 2.1"
              data-testid={`${prefixDataTestId}-displayorder-input`}
            />
            <p className="gba:text-xs gba:text-muted-foreground">
              X = row number, Y = column within row (e.g., 1.1, 1.2, 2.1)
            </p>
          </div>

          {/* Field Type */}
          <div className="gba:space-y-2">
            <Label htmlFor="type">Field Type</Label>
            <Select value={formData.type} onValueChange={value => handleChange('type', value)}>
              <SelectTrigger data-testid={`${prefixDataTestId}-type-select`}>
                <SelectValue placeholder="Select field type" />
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

          {/* Required */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <input
              type="checkbox"
              id="required"
              checked={formData.required}
              onChange={e => handleChange('required', e.target.checked)}
              data-testid={`${prefixDataTestId}-required-checkbox`}
            />
            <Label htmlFor="required">Required Field</Label>
          </div>

          {/* Placeholder */}
          <div className="gba:space-y-2">
            <Label htmlFor="placeholder">Placeholder (Optional)</Label>
            <Input
              id="placeholder"
              value={formData.placeholder || ''}
              onChange={e => handleChange('placeholder', e.target.value)}
              placeholder="Enter placeholder text"
              data-testid={`${prefixDataTestId}-placeholder-input`}
            />
          </div>

          {/* Help Text */}
          <div className="gba:space-y-2">
            <Label htmlFor="helpText">Help Text (Optional)</Label>
            <Textarea
              id="helpText"
              value={formData.helpText || ''}
              onChange={e => handleChange('helpText', e.target.value)}
              placeholder="Enter help text"
              rows={2}
              data-testid={`${prefixDataTestId}-helptext-input`}
            />
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
