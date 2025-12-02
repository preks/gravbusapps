import React, { useEffect, useRef } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { PiPlus, PiMinus, PiTrash } from 'react-icons/pi'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { COUNTRY, COUNTRY_REGION } from '@/common/constants/commonCatalogs'
import { AddressType, ADDRESS_TYPE_OPTIONS } from '@/common/data/relations/types/relationEnums'
import translations from './_i18n'

interface AddressSegmentProps {
  customFields?: React.ReactNode
}

// Separate component for each address item to allow useFieldArray for address lines
const AddressItem: React.FC<{
  addressIndex: number
  onRemove: () => void
}> = ({ addressIndex, onRemove }) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Use field array for address lines within this address (working with addressLine.lines)
  const {
    fields: lineFields,
    append: appendLine,
    remove: removeLine
  } = useFieldArray({
    control: form.control,
    name: `addresses.${addressIndex}.addressLine.lines`
  })

  // Ensure at least one address line always exists
  React.useEffect(() => {
    if (lineFields.length === 0) {
      appendLine('')
    }
  }, [addressIndex, lineFields.length, appendLine])

  return (
    <div className="gba:space-y-4 gba:pb-6 gba:border-b last:gba:border-0">
      {/* Address Header with Type and Remove */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <FormField
          control={form.control}
          name={`addresses.${addressIndex}.addressType`}
          render={({ field: typeField }) => (
            <FormItem className="gba:flex-1 gba:mr-4">
              <FormLabel>{t('address-type-label')}</FormLabel>
              <FormControl>
                <Select value={typeField.value || AddressType.PRIMARY_ADDRESS} onValueChange={typeField.onChange}>
                  <SelectTrigger className="gba:w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADDRESS_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemove}
          className="gba:mt-6"
          data-testid={`address-segment-remove-address-${addressIndex}`}
        >
          <PiTrash className="gba:w-4 gba:h-4" />
        </Button>
      </div>

      {/* Address Lines - All directly available */}
      <div className="gba:space-y-2">
        <FormLabel>{t('address-lines-label')}</FormLabel>

        {lineFields.map((lineField, lineIndex) => (
          <div key={lineField.id} className="gba:flex gba:items-center gba:gap-2">
            <FormField
              control={form.control}
              name={`addresses.${addressIndex}.addressLine.lines.${lineIndex}`}
              render={({ field: addressLineField }) => (
                <FormItem className="gba:flex-1">
                  <FormControl>
                    <Input
                      placeholder={t('address-line-placeholder', { index: lineIndex + 1 })}
                      data-testid={`address-segment-line-${addressIndex}-${lineIndex + 1}`}
                      value={addressLineField.value || ''}
                      onChange={e => addressLineField.onChange(e.target.value)}
                      onBlur={addressLineField.onBlur}
                      name={addressLineField.name}
                      ref={addressLineField.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {lineFields.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (lineFields.length > 1) {
                    removeLine(lineIndex)
                  }
                }}
                className="gba:flex gba:items-center gba:gap-1"
                data-testid={`address-segment-remove-line-${addressIndex}-${lineIndex + 1}`}
              >
                <PiMinus className="gba:w-4 gba:h-4" />
              </Button>
            )}
          </div>
        ))}

        {/* Add Line Button - Below the last address line, aligned right */}
        <div className="gba:flex gba:justify-end">
          <Button
            variant="outline"
            type="button"
            size="sm"
            onClick={() => appendLine('')}
            className="gba:text-xs gba:px-2 gba:py-1"
            data-testid={`address-segment-add-line-${addressIndex}`}
          >
            <PiPlus className="gba:w-3 gba:h-3 gba:mr-1" />
            {t('address-add-line')}
          </Button>
        </div>
      </div>

      {/* Postal Code and City/Locality - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name={`addresses.${addressIndex}.postalCode`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('postal-code-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('postal-code-placeholder')}
                  data-testid={`address-segment-postal-code-${addressIndex}`}
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`addresses.${addressIndex}.locality`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('locality-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('locality-placeholder')}
                  data-testid={`address-segment-locality-${addressIndex}`}
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Country and Region - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name={`addresses.${addressIndex}.countryRef`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('country-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={COUNTRY}
                  childField={`addresses.${addressIndex}.regionRef`}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid={`address-segment-country-${addressIndex}`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`addresses.${addressIndex}.regionRef`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('region-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={COUNTRY_REGION}
                  parentField={`addresses.${addressIndex}.countryRef`}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid={`address-segment-region-${addressIndex}`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

const AddressSegment: React.FC<AddressSegmentProps> = ({ customFields }) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Use field array for multiple addresses
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'addresses'
  })

  // Track if we've already initialized defaults to prevent infinite loops
  const hasInitializedDefaults = useRef(false)

  // Auto-populate 1 default address with PRIMARY type when no data exists
  useEffect(() => {
    if (fields.length === 0 && !hasInitializedDefaults.current) {
      hasInitializedDefaults.current = true
      append({
        addressType: AddressType.PRIMARY_ADDRESS,
        addressLine: { lines: [''] },
        postalCode: '',
        locality: '',
        regionRef: '',
        countryRef: ''
      })
    }
  }, [fields.length, append])

  const handleAddAddress = () => {
    append({
      addressType: AddressType.SECONDARY_ADDRESS,
      addressLine: { lines: [''] },
      postalCode: '',
      locality: '',
      regionRef: '',
      countryRef: ''
    })
  }

  const handleRemoveAddress = (index: number) => {
    remove(index)
  }

  return (
    <div className="gba:space-y-6">
      {fields.map((field, addressIndex) => (
        <AddressItem key={field.id} addressIndex={addressIndex} onRemove={() => handleRemoveAddress(addressIndex)} />
      ))}

      {/* Add Address Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddAddress}
        className="gba:w-full gba:mt-4"
        data-testid="address-segment-add-address"
      >
        <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
        {t('address-add-address')}
      </Button>

      {/* Custom fields slot */}
      {customFields}
    </div>
  )
}

export default AddressSegment
