import React from 'react'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'

interface AutomationVersionSelectProps {
  label: string
  value?: number
  options: number[]
  loading?: boolean
  onChange: (version: number) => void
  'data-testid'?: string
}

export const AutomationVersionSelect: React.FC<AutomationVersionSelectProps> = ({
  label,
  value,
  options,
  loading = false,
  onChange,
  'data-testid': testId = 'automation-version-select'
}) => {
  if (!loading && options.length === 0 && typeof value !== 'number') return null

  return (
    <div className="gba:flex gba:flex-col gba:gap-1.5" data-testid={testId}>
      <Label className="gba:text-xs gba:font-medium">{label}</Label>
      <Select
        value={typeof value === 'number' ? String(value) : undefined}
        onValueChange={next => onChange(Number(next))}
        disabled={loading || options.length === 0}
      >
        <SelectTrigger className="gba:h-9 gba:bg-background" data-testid={`${testId}-trigger`}>
          <SelectValue placeholder={loading ? `${label}...` : label} />
        </SelectTrigger>
        <SelectContent>
          {options.map(version => (
            <SelectItem key={version} value={String(version)}>
              {`v${version}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
