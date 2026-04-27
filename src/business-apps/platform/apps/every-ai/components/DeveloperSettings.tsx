/**
 * DeveloperSettings - Reusable primitives for the developer-facing
 * settings panel inside the My Preferences modal.
 *
 * The shapes here are intentionally generic so we can keep adding
 * rows (toggles, segmented controls, ...) without growing the
 * surrounding modal. Styling matches the rest of every-ai: the
 * `gba:` Tailwind prefix, the gold accent (rgb 183, 142, 78), and
 * an optional `darkMode` prop that flips colors to slate.
 */

import { CaretDown, Wrench } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

const GOLD_RGB = '183, 142, 78'

interface BaseProps {
  darkMode?: boolean
}

interface DeveloperSettingsProps extends BaseProps {
  title?: string
  subtitle?: string
  children: ReactNode
}

/**
 * Container that gives the developer settings their own visual block
 * inside the modal: title row + bordered card containing the rows.
 */
export function DeveloperSettings({
  darkMode = false,
  title = 'Developer settings',
  subtitle,
  children
}: DeveloperSettingsProps) {
  return (
    <div>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
        <Wrench className="gba:h-4 gba:w-4" style={{ color: `rgb(${GOLD_RGB})` }} />
        <h3 className="gba:text-sm gba:font-semibold" style={{ color: darkMode ? 'white' : 'var(--nw-foreground)' }}>
          {title}
        </h3>
      </div>
      {subtitle && (
        <p className="gba:text-xs gba:mb-3" style={{ color: darkMode ? 'rgba(255,255,255,0.5)' : '#888' }}>
          {subtitle}
        </p>
      )}
      <div
        className="gba:rounded-xl gba:border gba:divide-y"
        style={{
          borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'
        }}
      >
        {children}
      </div>
    </div>
  )
}

interface SettingRowProps extends BaseProps {
  label: string
  description?: string
  control: ReactNode
  /**
   * Layout for the row:
   * - `'inline'` (default): label + description on the left, control on the
   *   right. Good for compact controls (toggles, short segmented groups).
   * - `'stacked'`: label + description on top, control below, control takes
   *   the full row width. Use when the control would otherwise crush the
   *   label column (e.g. 4-5 segmented pills, wide dropdowns).
   */
  layout?: 'inline' | 'stacked'
}

/**
 * One row inside the developer settings card. See `SettingRowProps.layout`
 * for the two supported layouts.
 */
export function SettingRow({ darkMode = false, label, description, control, layout = 'inline' }: SettingRowProps) {
  const labelBlock = (
    <div className="gba:min-w-0 gba:flex-1">
      <div className="gba:text-sm gba:font-medium" style={{ color: darkMode ? 'white' : 'var(--nw-foreground)' }}>
        {label}
      </div>
      {description && (
        <div className="gba:text-xs gba:mt-0.5" style={{ color: darkMode ? 'rgba(255,255,255,0.5)' : '#777' }}>
          {description}
        </div>
      )}
    </div>
  )

  if (layout === 'stacked') {
    return (
      <div
        className="gba:flex gba:flex-col gba:gap-2 gba:px-4 gba:py-3"
        style={{ borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
      >
        {labelBlock}
        <div className="gba:w-full">{control}</div>
      </div>
    )
  }

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:px-4 gba:py-3"
      style={{ borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
    >
      {labelBlock}
      <div className="gba:flex-shrink-0">{control}</div>
    </div>
  )
}

interface SettingToggleProps extends BaseProps {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}

/**
 * iOS-style switch. The track turns gold when on. Keyboard accessible
 * (it's a native button with aria-pressed) and respects `disabled`.
 */
export function SettingToggle({
  darkMode = false,
  checked,
  onChange,
  disabled = false,
  ariaLabel
}: SettingToggleProps) {
  const trackOn = `rgb(${GOLD_RGB})`
  const trackOff = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="gba:relative gba:inline-flex gba:h-6 gba:w-11 gba:items-center gba:rounded-full gba:transition-colors gba:focus:outline-none disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
      style={{ background: checked ? trackOn : trackOff }}
    >
      <span
        className="gba:inline-block gba:h-5 gba:w-5 gba:transform gba:rounded-full gba:bg-white gba:transition-transform gba:shadow"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

interface SettingSegmentedControlProps<T extends string> extends BaseProps {
  value: T
  options: ReadonlyArray<SegmentedControlOption<T>>
  onChange: (next: T) => void
  disabled?: boolean
  ariaLabel?: string
}

/**
 * Compact pill group used to pick exactly one of N small string values
 * (e.g. LLM provider). Highlights the selected pill in gold and
 * collapses to a single visual unit.
 */
export function SettingSegmentedControl<T extends string>({
  darkMode = false,
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel
}: SettingSegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="gba:flex gba:flex-wrap gba:rounded-lg gba:p-0.5 gba:gap-0.5"
      style={{
        background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
      }}
    >
      {options.map(option => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className="gba:flex-1 gba:px-3 gba:py-1 gba:text-xs gba:font-medium gba:rounded-md gba:transition-colors disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
            style={{
              background: selected ? `rgb(${GOLD_RGB})` : 'transparent',
              color: selected ? 'white' : darkMode ? 'rgba(255,255,255,0.7)' : '#555'
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SettingSelectProps<T extends string> extends BaseProps {
  value: T
  options: ReadonlyArray<SelectOption<T>>
  onChange: (next: T) => void
  disabled?: boolean
  ariaLabel?: string
  /**
   * Rendered as a disabled leading option when `value` is not one of the
   * `options`. Useful for "Select a model..." placeholders.
   */
  placeholder?: string
}

/**
 * Compact styled native `<select>` for picking from more options than a
 * segmented control can comfortably show (e.g. model lists). Keeps native
 * keyboard + touch behaviour; we only restyle the trigger.
 */
export function SettingSelect<T extends string>({
  darkMode = false,
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  placeholder
}: SettingSelectProps<T>) {
  const hasMatch = options.some(opt => opt.value === value)
  return (
    <div className="gba:relative gba:flex gba:items-center gba:w-full">
      <select
        aria-label={ariaLabel}
        disabled={disabled}
        value={hasMatch ? value : ''}
        onChange={e => onChange(e.target.value as T)}
        className="gba:appearance-none gba:w-full gba:pr-7 gba:pl-3 gba:py-1.5 gba:rounded-md gba:border gba:text-xs gba:font-medium gba:outline-none gba:transition-colors disabled:gba:opacity-50 disabled:gba:cursor-not-allowed"
        style={{
          background: darkMode ? 'rgba(255,255,255,0.06)' : 'white',
          borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
          color: darkMode ? 'rgba(255,255,255,0.9)' : '#333'
        }}
      >
        {!hasMatch && placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CaretDown
        className="gba:absolute gba:right-2 gba:h-3 gba:w-3 gba:pointer-events-none"
        style={{ color: darkMode ? 'rgba(255,255,255,0.6)' : '#888' }}
      />
    </div>
  )
}

export default DeveloperSettings
