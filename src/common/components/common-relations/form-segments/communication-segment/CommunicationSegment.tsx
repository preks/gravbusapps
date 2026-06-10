import React, { useEffect, useRef } from 'react'
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  Button,
  useTranslation,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CommunicationChannelCode } from '@/common/data/relations/types/relationEnums'
import { COMMUNICATION_CHANNEL } from '@/common/constants/commonCatalogs'
import translations from './_i18n'
import CommunicationChannelSelect from './CommunicationChannelSelect'
import { useCommunicationChannelOptions } from './useCommunicationChannelOptions'

// Default channel codes for different entity types
export const DEFAULT_ACCOUNT_CHANNELS = [CommunicationChannelCode.EMAIL, CommunicationChannelCode.PHONE]
export const DEFAULT_CONTACT_CHANNELS = [
  CommunicationChannelCode.EMAIL,
  CommunicationChannelCode.PHONE,
  CommunicationChannelCode.LINKEDIN,
  CommunicationChannelCode.XING
]

const isHiddenChannelRef = (channelRef: string | undefined, hiddenChannelCodes: string[]): boolean => {
  if (!channelRef || hiddenChannelCodes.length === 0) return false

  const channelCode = channelRef.split(':').pop() || ''

  return hiddenChannelCodes.some(
    code =>
      channelCode === code ||
      channelCode.toLowerCase() === code.toLowerCase() ||
      (code === CommunicationChannelCode.EMAIL && channelRef.includes(':EMAIL'))
  )
}

interface CommunicationSegmentProps {
  businessAppContext?: BusinessAppContextProps
  customFields?: React.ReactNode
  // Default channel codes to pre-populate when no data exists
  defaultChannelCodes?: string[]
  // Channel rows to render elsewhere (e.g. contact email in ContactInformationSegment)
  hiddenChannelCodes?: string[]
}

// Separate component for each communication channel item
const CommunicationChannelItem: React.FC<{
  channelIndex: number
  businessAppContext?: BusinessAppContextProps
  channelOptions: ReturnType<typeof useCommunicationChannelOptions>['options']
  channelOptionsLoading: boolean
  onRemove: () => void
}> = ({ channelIndex, businessAppContext, channelOptions, channelOptionsLoading, onRemove }) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Get the selected communication channel ref (reactive)
  const channelRef = form.watch(`communicationChannels.${channelIndex}.communicationChannelRef`)

  // Determine input type based on channel code (reactive - recalculates when channelRef changes)
  const inputType = React.useMemo(() => {
    if (!channelRef) return 'text'

    const channelCode = channelRef.split(':').pop() || ''

    // Map channel codes to input types
    if (channelCode === CommunicationChannelCode.EMAIL || channelCode.toLowerCase() === 'e-mail') {
      return 'email'
    }
    if (channelCode === CommunicationChannelCode.PHONE || channelCode === CommunicationChannelCode.MOBILE) {
      return 'tel'
    }
    if (
      channelCode === CommunicationChannelCode.WEBSITE ||
      channelCode === CommunicationChannelCode.LINKEDIN ||
      channelCode === CommunicationChannelCode.XING ||
      channelCode === CommunicationChannelCode.FACEBOOK ||
      channelCode === CommunicationChannelCode.INSTAGRAM ||
      channelCode === CommunicationChannelCode.X ||
      channelCode === CommunicationChannelCode.YOUTUBE
    ) {
      return 'url'
    }

    return 'text'
  }, [channelRef])

  return (
    <div className="gba:space-y-2">
      <FormField
        control={form.control}
        name={`communicationChannels.${channelIndex}.communicationChannelRef`}
        render={({ field: channelRefField, fieldState: channelRefFieldState }) => (
          <FormItem>
            <FormControl>
              <InputGroup>
                {/* Communication channel selector - Left side */}
                <InputGroupAddon className="gba:flex-none gba:self-stretch gba:border-r gba:border-input gba:bg-muted/50">
                  <CommunicationChannelSelect
                    options={channelOptions}
                    loading={channelOptionsLoading}
                    accessToken={businessAppContext?.accessToken}
                    value={channelRefField.value || ''}
                    onValueChange={v => {
                      channelRefField.onChange(v || '')
                      form.trigger(`communicationChannels.${channelIndex}.communicationChannelRef`)
                    }}
                    data-testid={`communication-channel-type-${channelIndex}`}
                    invalid={channelRefFieldState.invalid}
                    describedBy={
                      channelRefFieldState.error ? `communication-channel-ref-error-${channelIndex}` : undefined
                    }
                  />
                </InputGroupAddon>

                {/* Value Input - Right side, takes remaining space */}
                <FormField
                  control={form.control}
                  name={`communicationChannels.${channelIndex}.value`}
                  render={({ field: valueField, fieldState: valueFieldState }) => (
                    <InputGroupInput
                      type={inputType}
                      placeholder={t('communication-channel-value-placeholder')}
                      data-testid={`communication-channel-value-${channelIndex}`}
                      value={valueField.value || ''}
                      onChange={e => valueField.onChange(e.target.value)}
                      onBlur={valueField.onBlur}
                      aria-invalid={valueFieldState.invalid}
                      aria-describedby={
                        valueFieldState.error ? `communication-channel-value-error-${channelIndex}` : undefined
                      }
                    />
                  )}
                />

                {/* Remove Button - Right side */}
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    variant="ghost"
                    size="iconXs"
                    onClick={onRemove}
                    className="gba:text-destructive hover:gba:bg-destructive-secondary"
                    data-testid={`communication-channel-remove-${channelIndex}`}
                    aria-label="Remove channel"
                  >
                    <TrashIcon className="gba:w-4 gba:h-4" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* Separate FormField for value to show validation errors properly */}
      <FormField
        control={form.control}
        name={`communicationChannels.${channelIndex}.value`}
        render={({ fieldState }) => (
          <FormItem>
            <FormMessage id={fieldState.error ? `communication-channel-value-error-${channelIndex}` : undefined} />
          </FormItem>
        )}
      />
    </div>
  )
}

const CommunicationSegment: React.FC<CommunicationSegmentProps> = ({
  businessAppContext,
  customFields,
  defaultChannelCodes = DEFAULT_CONTACT_CHANNELS,
  hiddenChannelCodes = []
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)
  const { options: channelOptions, loading: channelOptionsLoading } = useCommunicationChannelOptions(
    businessAppContext?.accessToken
  )

  // Use field array for multiple communication channels
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'communicationChannels'
  })

  // Track if we've already initialized defaults to prevent infinite loops
  const hasInitializedDefaults = useRef(false)

  // Auto-populate default communication channels when no data exists
  useEffect(() => {
    if (fields.length === 0 && !hasInitializedDefaults.current) {
      hasInitializedDefaults.current = true
      const defaults = defaultChannelCodes.map(code => ({
        communicationChannelRef: `${COMMUNICATION_CHANNEL}:${code}`,
        value: ''
      }))
      append(defaults)
    }
  }, [fields.length, append, defaultChannelCodes])

  const handleAddChannel = () => {
    append({
      communicationChannelRef: '',
      value: ''
    })
  }

  const handleRemoveChannel = (index: number) => {
    remove(index)
  }

  return (
    <div className="gba:space-y-4">
      {fields.map((field, channelIndex) => {
        const channelRef = form.watch(`communicationChannels.${channelIndex}.communicationChannelRef`)
        if (isHiddenChannelRef(channelRef, hiddenChannelCodes)) {
          return null
        }

        return (
          <CommunicationChannelItem
            key={field.id}
            channelIndex={channelIndex}
            businessAppContext={businessAppContext}
            channelOptions={channelOptions}
            channelOptionsLoading={channelOptionsLoading}
            onRemove={() => handleRemoveChannel(channelIndex)}
          />
        )
      })}

      {/* Add Channel Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddChannel}
        className="gba:w-full gba:mt-2"
        data-testid="communication-channels-add-channel"
      >
        <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
        {t('communication-channels-add-channel')}
      </Button>

      {/* Custom fields slot */}
      {customFields}
    </div>
  )
}

export default CommunicationSegment
