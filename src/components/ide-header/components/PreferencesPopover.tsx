import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ThemeSwitch,
  Separator,
  Switch
} from '@newwork/nw-design-system'

export type SupportedLocale = 'en-US' | 'de-DE' | 'ro-RO'
export type DensityOption = 'default' | 'compact' | 'comfortable'

export interface PreferencesPopoverProps {
  locale: SupportedLocale
  onLocaleChange: (locale: SupportedLocale) => void
  density: DensityOption
  onDensityChange: (density: DensityOption) => void
  enableChat: boolean
  onEnableChatChange: (enabled: boolean) => void
}

export const PreferencesPopover: React.FC<PreferencesPopoverProps> = ({
  locale,
  onLocaleChange,
  density,
  onDensityChange,
  enableChat,
  onEnableChatChange
}) => {
  return (
    <div className="gba:w-[240px] gba:space-y-3">
      <div className="gba:space-y-2">
        <label className="gba:text-xs gba:font-medium gba:text-muted-foreground">Language</label>
        <Select value={locale} onValueChange={v => onLocaleChange(v as SupportedLocale)}>
          <SelectTrigger data-testid="PreferencesPopover-locale-select" aria-label="Language">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en-US" data-testid="PreferencesPopover-locale-en-US">
              English (US)
            </SelectItem>
            <SelectItem value="de-DE" data-testid="PreferencesPopover-locale-de-DE">
              Deutsch (DE)
            </SelectItem>
            <SelectItem value="ro-RO" data-testid="PreferencesPopover-locale-ro-RO">
              Română (RO)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

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

      <Separator />

      <div className="gba:flex gba:items-center gba:justify-between">
        <label className="gba:text-xs gba:font-medium gba:text-muted-foreground">Chat</label>
        <Switch
          checked={enableChat}
          onCheckedChange={onEnableChatChange}
          data-testid="PreferencesPopover-chat-switch"
        />
      </div>
    </div>
  )
}
