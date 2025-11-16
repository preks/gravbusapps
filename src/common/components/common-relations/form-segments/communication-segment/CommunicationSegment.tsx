import React from 'react'
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
import { PiPlus, PiTrash } from 'react-icons/pi'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { CommunicationChannelCode } from '@/common/data/relations/types/relationEnums'
import translations from './_i18n'

interface CommunicationSegmentProps {
  customFields?: React.ReactNode
}

// Separate component for each communication channel item
const CommunicationChannelItem: React.FC<{
  channelIndex: number
  canRemove: boolean
  onRemove: () => void
}> = ({ channelIndex, canRemove, onRemove }) => {
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
                {/* CatalogSelect for Communication Channel Type - Left side */}
                <InputGroupAddon className="gba:min-w-0 gba:flex-shrink-0">
                  <CatalogSelect
                    catalogIdentifier="CommunicationChannel:v1"
                    variant="select"
                    value={channelRefField.value || ''}
                    onValueChange={v => {
                      channelRefField.onChange(v || null)
                      form.trigger(`communicationChannels.${channelIndex}.communicationChannelRef`)
                    }}
                    data-testid={`communication-channel-type-${channelIndex}`}
                    className="gba:w-auto gba:ml-[-5.3px]"
                    aria-invalid={channelRefFieldState.invalid}
                    aria-describedby={
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
                      onChange={e => valueField.onChange(e.target.value || null)}
                      onBlur={valueField.onBlur}
                      aria-invalid={valueFieldState.invalid}
                      aria-describedby={
                        valueFieldState.error ? `communication-channel-value-error-${channelIndex}` : undefined
                      }
                    />
                  )}
                />

                {/* Remove Button - Right side */}
                {canRemove && (
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
                      <PiTrash className="gba:w-4 gba:h-4" />
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
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

const CommunicationSegment: React.FC<CommunicationSegmentProps> = ({ customFields }) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Use field array for multiple communication channels
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'communicationChannels'
  })

  // Note: Initialization with PHONE and EMAIL is now handled in AccountFormComponent defaultValues
  // This ensures proper initialization before form render

  const handleAddChannel = () => {
    append({
      id: `channel-${Date.now()}`,
      communicationChannelRef: '',
      value: ''
    })
  }

  const handleRemoveChannel = (index: number) => {
    remove(index)
  }

  return (
    <div className="gba:space-y-4">
      {fields.map((field, channelIndex) => (
        <CommunicationChannelItem
          key={field.id}
          channelIndex={channelIndex}
          canRemove={fields.length > 1}
          onRemove={() => handleRemoveChannel(channelIndex)}
        />
      ))}

      {/* Add Channel Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddChannel}
        className="gba:w-full gba:mt-2"
        data-testid="communication-channels-add-channel"
      >
        <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
        {t('communication-channels-add-channel')}
      </Button>

      {/* Custom fields slot */}
      {customFields}
    </div>
  )
}

export default CommunicationSegment
