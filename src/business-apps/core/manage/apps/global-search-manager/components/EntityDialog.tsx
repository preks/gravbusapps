import React from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { ACCESS_CONTROL_OPTIONS, ENTITY_KIND_OPTIONS, type EntityFormValues } from '../utils'

export type EntityDialogMode = 'create' | 'edit'

interface EntityDialogProps {
  mode: EntityDialogMode
  open: boolean
  values: EntityFormValues
  onOpenChange: (open: boolean) => void
  onChange: <K extends keyof EntityFormValues>(field: K, value: EntityFormValues[K]) => void
  onSubmit: () => void
}

export const EntityDialog: React.FC<EntityDialogProps> = ({ mode, open, values, onOpenChange, onChange, onSubmit }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? 'Create Entity Type' : `Edit ${values.entityType}`}</DialogTitle>
      </DialogHeader>
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        <Field label="Entity Type">
          <Input
            value={values.entityType}
            disabled={mode === 'edit'}
            onChange={event => onChange('entityType', event.target.value)}
          />
        </Field>
        <Field label="Label">
          <Input value={values.entityTypeLabel} onChange={event => onChange('entityTypeLabel', event.target.value)} />
        </Field>
        <Field label="Category Key">
          <Input value={values.categoryKey} onChange={event => onChange('categoryKey', event.target.value)} />
        </Field>
        <Field label="Category Label">
          <Input value={values.categoryLabel} onChange={event => onChange('categoryLabel', event.target.value)} />
        </Field>
        <Field label="Kind">
          <Select value={values.kind} onValueChange={value => onChange('kind', value as EntityFormValues['kind'])}>
            <SelectTrigger>
              <SelectValue placeholder="Kind" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_KIND_OPTIONS.map(kind => (
                <SelectItem key={kind} value={kind}>
                  {kind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Access Control">
          <Select
            value={values.accessControlType}
            onValueChange={value => onChange('accessControlType', value as EntityFormValues['accessControlType'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Access control" />
            </SelectTrigger>
            <SelectContent>
              {ACCESS_CONTROL_OPTIONS.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Icon">
          <Input value={values.icon} onChange={event => onChange('icon', event.target.value)} />
        </Field>
        <Field label="Sort Order">
          <Input type="number" value={values.sortOrder} onChange={event => onChange('sortOrder', event.target.value)} />
        </Field>
        <label className="gba:flex gba:items-center gba:gap-2">
          <Checkbox checked={values.active} onCheckedChange={checked => onChange('active', checked === true)} />
          <span>Active</span>
        </label>
      </div>
      <Field label="Action Config JSON">
        <Textarea
          rows={8}
          value={values.actionConfig}
          onChange={event => onChange('actionConfig', event.target.value)}
        />
      </Field>
      <Field label="Search Config JSON">
        <Textarea
          rows={12}
          value={values.searchConfig}
          onChange={event => onChange('searchConfig', event.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>{mode === 'create' ? 'Create' : 'Save'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="gba:space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
)
