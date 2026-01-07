import React from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ChannelTypeFieldProps {
  value?: string
  onChange: (value: string) => void
  channels: Array<{ id: string; label: string }>
  loading: boolean
  error?: string
  touched: boolean
}

export const ChannelTypeField: React.FC<ChannelTypeFieldProps> = ({
  value,
  onChange,
  channels,
  loading,
  error,
  touched
}) => {
  return (
    <div className="gba:space-y-2">
      <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.channelType', 'Channel Type')}*
      </div>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="gba:w-full" data-testid="flw_changePrivateCommunication_currentChannelType">
          <SelectValue
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:communication_form.selectChannel',
              'Select Channel Type'
            )}
          />
        </SelectTrigger>
        <SelectContent>
          {channels.map(c => (
            <SelectItem key={c.id} value={c.id}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {touched && error && (
        <div className="gba:mt-1 gba:text-destructive" data-testid="change-communication-channel-error">
          {error}
        </div>
      )}
    </div>
  )
}
