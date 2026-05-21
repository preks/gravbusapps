import React from 'react'
import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import { MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { COUNTRY, COUNTRY_REGION } from '@/common/constants/commonCatalogs'
import { getAutoFilledClassName } from '../utils/autoFilledClassName'
import translations from './_i18n'

interface LeadAddressFieldsProps {
  autoFilledFields: Set<string>
  onFieldChange?: (fieldName: string) => void
}

const LeadAddressFields: React.FC<LeadAddressFieldsProps> = ({ autoFilledFields, onFieldChange }) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  const {
    fields: lineFields,
    append: appendLine,
    remove: removeLine
  } = useFieldArray({
    control: form.control,
    name: 'addressLine.lines'
  })

  React.useEffect(() => {
    if (lineFields.length === 0) {
      appendLine('')
    }
  }, [lineFields.length, appendLine])

  return (
    <div className="gba:space-y-6">
      <h3 className="gba:text-base gba:font-semibold">{t('lead-segment-address-title')}</h3>

      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <FormLabel>{t('lead-segment-address-lines-label')}</FormLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendLine('')}
            className="gba:text-xs gba:px-2 gba:py-1"
            data-testid="lead-segment-add-address-line"
          >
            <PlusIcon className="gba:w-3 gba:h-3 gba:mr-1" />
            {t('lead-segment-add-address-line')}
          </Button>
        </div>

        {lineFields.map((lineField, lineIndex) => (
          <div key={lineField.id} className="gba:flex gba:items-center gba:gap-2">
            <FormField
              control={form.control}
              name={`addressLine.lines.${lineIndex}`}
              render={({ field: addressLineField }) => (
                <FormItem className="gba:flex-1">
                  <FormControl>
                    <Input
                      placeholder={t('lead-segment-address-line', { number: lineIndex + 1 })}
                      data-testid={`lead-segment-address-line-${lineIndex + 1}`}
                      value={addressLineField.value || ''}
                      onChange={event => {
                        addressLineField.onChange(event.target.value)
                        if (onFieldChange) onFieldChange('addressLine.lines')
                      }}
                      onBlur={addressLineField.onBlur}
                      name={addressLineField.name}
                      ref={addressLineField.ref}
                      className={getAutoFilledClassName('addressLine.lines', autoFilledFields)}
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
                data-testid={`lead-segment-remove-address-line-${lineIndex + 1}`}
              >
                <MinusIcon className="gba:w-4 gba:h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-postal-code')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('lead-segment-placeholder-enter')}
                  data-testid="lead-segment-postal-code"
                  value={field.value || ''}
                  onChange={event => {
                    field.onChange(event.target.value)
                    if (onFieldChange) onFieldChange('postalCode')
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  className={getAutoFilledClassName('postalCode', autoFilledFields)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="locality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-locality')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('lead-segment-placeholder-enter')}
                  data-testid="lead-segment-locality"
                  value={field.value || ''}
                  onChange={event => {
                    field.onChange(event.target.value)
                    if (onFieldChange) onFieldChange('locality')
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  className={getAutoFilledClassName('locality', autoFilledFields)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="countryRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-country')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={COUNTRY}
                  value={field.value || ''}
                  onValueChange={value => {
                    field.onChange(value)
                    if (onFieldChange) onFieldChange('countryRef')
                  }}
                  data-testid="lead-segment-country"
                  className={getAutoFilledClassName('countryRef', autoFilledFields)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="regionRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-region')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={COUNTRY_REGION}
                  parentField="countryRef"
                  value={field.value || ''}
                  onValueChange={value => {
                    field.onChange(value)
                    if (onFieldChange) onFieldChange('regionRef')
                  }}
                  data-testid="lead-segment-region"
                  className={getAutoFilledClassName('regionRef', autoFilledFields)}
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

export default LeadAddressFields
