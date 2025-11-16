import React from 'react'
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
import { AddressType, ADDRESS_TYPE_OPTIONS } from '@/common/data/relations/types/relationEnums'
import translations from './_i18n'

interface AddressSegmentProps {
  // Pre-selected country and region data from account query (for immediate display)
  addresses?: Array<{
    country?: { id: string; value: string; displayValue?: string; additionalValue3?: string }
    region?: { id: string; value: string; displayValue?: string; additionalValue3?: string }
  }>
  customFields?: React.ReactNode
}

// Separate component for each address item to allow useFieldArray for address lines
const AddressItem: React.FC<{
  addressIndex: number
  canRemove: boolean
  onRemove: () => void
  country?: { id: string; value: string; displayValue?: string; additionalValue3?: string }
  region?: { id: string; value: string; displayValue?: string; additionalValue3?: string }
}> = ({ addressIndex, canRemove, onRemove, country, region }) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Use field array for address lines within this address
  const {
    fields: lineFields,
    append: appendLine,
    remove: removeLine
  } = useFieldArray({
    control: form.control,
    name: `addresses.${addressIndex}.addressLines`
  })

  // Ensure at least one line exists
  React.useEffect(() => {
    if (lineFields.length === 0) {
      appendLine('')
    }
  }, [lineFields.length, appendLine])

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
        {canRemove && (
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
        )}
      </div>

      {/* Address Lines - All directly available */}
      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <FormLabel>{t('address-lines-label')}</FormLabel>
          <Button
            variant="outline"
            size="sm"
            onClick={() => appendLine('')}
            className="gba:text-xs gba:px-2 gba:py-1"
            data-testid={`address-segment-add-line-${addressIndex}`}
          >
            <PiPlus className="gba:w-3 gba:h-3 gba:mr-1" />
            {t('address-add-line')}
          </Button>
        </div>

        {lineFields.map((lineField, lineIndex) => (
          <div key={lineField.id} className="gba:flex gba:items-center gba:gap-2">
            <FormField
              control={form.control}
              name={`addresses.${addressIndex}.addressLines.${lineIndex}`}
              render={({ field: addressLineField }) => (
                <FormItem className="gba:flex-1">
                  <FormControl>
                    <Input
                      placeholder={t('address-line-placeholder', { index: lineIndex + 1 })}
                      data-testid={`address-segment-line-${addressIndex}-${lineIndex + 1}`}
                      {...addressLineField}
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
                onClick={() => removeLine(lineIndex)}
                className="gba:flex gba:items-center gba:gap-1"
                data-testid={`address-segment-remove-line-${addressIndex}-${lineIndex + 1}`}
              >
                <PiMinus className="gba:w-4 gba:h-4" />
              </Button>
            )}
          </div>
        ))}
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
                  {...field}
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
                  {...field}
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
                  catalogIdentifier="Country:v1"
                  childField={`addresses.${addressIndex}.regionRef`}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  selectedOption={
                    country && field.value === country.id
                      ? {
                          value: country.id,
                          label: country.displayValue || country.value || '',
                          icon: country.additionalValue3
                        }
                      : undefined
                  }
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
                  catalogIdentifier="CountryRegion:v1"
                  parentField={`addresses.${addressIndex}.countryRef`}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  selectedOption={
                    region && field.value === region.id
                      ? {
                          value: region.id,
                          label: region.displayValue || region.value || '',
                          icon: region.additionalValue3
                        }
                      : undefined
                  }
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

const AddressSegment: React.FC<AddressSegmentProps> = ({ addresses: propAddresses = [], customFields }) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Use field array for multiple addresses
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'addresses'
  })

  // Ensure at least one address exists
  React.useEffect(() => {
    if (fields.length === 0) {
      append({
        id: `address-${Date.now()}`,
        addressType: AddressType.PRIMARY_ADDRESS,
        addressLines: [''],
        postalCode: '',
        locality: '',
        regionRef: '',
        countryRef: ''
      })
    }
  }, [fields.length, append])

  const handleAddAddress = () => {
    append({
      id: `address-${Date.now()}`,
      addressType: AddressType.SECONDARY_ADDRESS,
      addressLines: [''],
      postalCode: '',
      locality: '',
      regionRef: '',
      countryRef: ''
    })
  }

  const handleRemoveAddress = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  return (
    <div className="gba:space-y-6">
      {fields.map((field, addressIndex) => {
        const propAddress = propAddresses[addressIndex]
        return (
          <AddressItem
            key={field.id}
            addressIndex={addressIndex}
            canRemove={fields.length > 1}
            onRemove={() => handleRemoveAddress(addressIndex)}
            country={propAddress?.country}
            region={propAddress?.region}
          />
        )
      })}

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
