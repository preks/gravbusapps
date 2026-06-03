import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ThemeSwitch,
  Separator
} from '@newwork/nw-design-system'

export type SupportedLocale = 'en-US' | 'de-DE' | 'ro-RO'
export type DensityOption = 'default' | 'compact' | 'comfortable'

export interface PreferencesPopoverProps {
  density: DensityOption
  onDensityChange: (density: DensityOption) => void
}

export const PreferencesPopover: React.FC<PreferencesPopoverProps> = ({ density, onDensityChange }) => {
  return (
    <div className="gba:w-full gba:min-w-0 gba:space-y-3 gba:p-4">
      <div className="gba:space-y-2">
        <label className="gba:text-xs gba:font-medium gba:text-muted-foreground">Theme</label>
        <ThemeSwitch data-testid="PreferencesPopover-theme-switch" />
      </div>

      <Separator />

      <div className="gba:space-y-2">
        <label className="gba:text-xs gba:font-medium gba:text-muted-foreground">Density</label>
        <Select value={density} onValueChange={v => onDensityChange(v as DensityOption)}>
          <SelectTrigger data-testid="PreferencesPopover-density-select" aria-label="Density">
            <SelectValue placeholder="Density" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default" data-testid="PreferencesPopover-density-default">
              Default
            </SelectItem>
            <SelectItem value="compact" data-testid="PreferencesPopover-density-compact">
              Compact
            </SelectItem>
            <SelectItem value="comfortable" data-testid="PreferencesPopover-density-comfortable">
              Comfortable
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
