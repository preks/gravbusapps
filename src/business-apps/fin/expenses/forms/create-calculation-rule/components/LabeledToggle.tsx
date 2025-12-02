import React from 'react'
import { Switch, Label } from '@newwork/nw-design-system'

interface LabeledToggleProps {
  label: string
  name: string
  value: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
  testId: string
}

const LabeledToggle: React.FC<LabeledToggleProps> = ({ label, name, value, disabled, onChange, testId }) => {
  return (
    <div className="gba:mb-4" data-testid={`${testId}-container`}>
      <div
        className={`${disabled ? 'gba:cursor-not-allowed' : ''} gba:flex gba:items-center gba:justify-between gba:w-full gba:h-[64px] gba:px-4 gba:rounded gba:bg-card gba:border gba:border-input`}
      >
        <Label
          htmlFor={name}
          className={`${disabled ? 'gba:text-muted-foreground' : 'gba:text-foreground'} gba:text-sm gba:font-medium`}
        >
          {label}
        </Label>
        <Switch
          id={name}
          data-testid={testId}
          checked={value}
          disabled={disabled}
          onCheckedChange={checked => onChange(!!checked)}
        />
      </div>
    </div>
  )
}

export default LabeledToggle
