import React from 'react'
import { Checkbox } from '@newwork/gravity-ui-catalog'

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
    <div className={`gba:mb-4`} data-testid={`${testId}-container`}>
      <div className={`gba:relative`}>
        <div
          className={`${disabled ? 'gba:bg-muted gba:cursor-not-allowed' : 'gba:bg-muted'} gba:flex gba:items-center gba:justify-between gba:w-[100%] gba:h-[64px] gba:px-4 gba:rounded`}
        >
          <span
            className={`${disabled ? 'gba:text-muted' : 'gba:text-muted-foreground'} gba:text-[12px] gba:font-medium`}
          >
            {label}
          </span>
          <Checkbox
            name={name}
            data-testid={testId}
            value={value}
            disabled={disabled}
            onChange={(f: any) => onChange(!!f?.value)}
          />
        </div>
      </div>
    </div>
  )
}

export default LabeledToggle
