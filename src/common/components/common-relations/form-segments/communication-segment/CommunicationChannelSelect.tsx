import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { LinkIcon } from '@phosphor-icons/react'
import { resolvePhosphorIconComponent } from '@/common/utils/phosphorIconUtils'
import type { CommunicationChannelOption } from './useCommunicationChannelOptions'

interface CommunicationChannelSelectProps {
  options: CommunicationChannelOption[]
  loading: boolean
  accessToken?: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  triggerClassName?: string
  'data-testid'?: string
}

const getFallbackLabel = (value: string): string => {
  const code = value.split(':').pop() || value
  return code
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(segment => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(' ')
}

const CommunicationChannelLabel = React.memo<{ label: string; iconName?: string }>(({ label, iconName }) => {
  const IconComponent = resolvePhosphorIconComponent(iconName, LinkIcon)

  return (
    <span className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
      <IconComponent className="gba:h-4 gba:w-4 gba:flex-none" aria-hidden="true" />
      <span className="gba:min-w-0 gba:flex-1 gba:truncate">{label}</span>
    </span>
  )
})

CommunicationChannelLabel.displayName = 'CommunicationChannelLabel'

const CommunicationChannelSelect: React.FC<CommunicationChannelSelectProps> = ({
  options,
  loading,
  accessToken,
  value,
  onValueChange,
  disabled = false,
  invalid = false,
  describedBy,
  triggerClassName = 'gba:w-44',
  'data-testid': dataTestId
}) => {
  const selectedOption = React.useMemo(() => options.find(option => option.value === value), [options, value])
  const selectedLabel = selectedOption?.label || (value ? getFallbackLabel(value) : '')

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || loading || !accessToken}
      showClearButton={false}
    >
      <SelectTrigger
        className={`gba:h-full ${triggerClassName} gba:rounded-none gba:border-0 gba:bg-transparent gba:shadow-none focus:gba:ring-0 focus-visible:gba:ring-0`}
        data-testid={dataTestId}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder={loading ? 'Loading...' : 'Select...'} className="gba:min-w-0 gba:flex-1">
          {selectedLabel ? (
            <CommunicationChannelLabel label={selectedLabel} iconName={selectedOption?.iconName} />
          ) : (
            <span className="gba:text-muted-foreground">Select...</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="gba:w-56 gba:max-w-56 gba:overflow-y-auto">
        {options.map(option => (
          <SelectItem
            key={option.value}
            value={option.value}
            data-testid={dataTestId ? `${dataTestId}-item-${option.value}` : undefined}
            title={option.label}
          >
            <CommunicationChannelLabel label={option.label} iconName={option.iconName} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default React.memo(CommunicationChannelSelect)
