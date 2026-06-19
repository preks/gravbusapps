import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { ACADEMIC_TITLE } from '@/common/constants/commonCatalogs'
import { PhonePrefixNumberInput } from '@/common/components/phone-prefix-combobox/PhonePrefixNumberInput'
import translations from './_i18n'

interface LeadPersonSegmentProps {
  // Custom fields
  customFields?: React.ReactNode
}

/**
 * LeadPersonSegment - Personal details for leads
 *
 * Contains:
 * - Academic Title (Catalog Select)
 * - Job Position (Text Input)
 * - Phone Number (Text Input - flat field)
 *
 * Used in Accordion
 */
const LeadPersonSegment: React.FC<LeadPersonSegmentProps> = ({ customFields }) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)
  const countryRef = form.watch('countryRef') as string | null | undefined

  return (
    <div className="gba:space-y-6">
      {/* Academic Title */}
      <FormField
        control={form.control}
        name="academicTitleRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-academic-title')}</FormLabel>
            <FormControl>
              <CatalogSelect
                catalogIdentifier={ACADEMIC_TITLE}
                value={field.value || ''}
                onValueChange={v => field.onChange(v)}
                data-testid="lead-segment-academic-title"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Job Position */}
      <FormField
        control={form.control}
        name="jobPosition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-job-position')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('lead-segment-placeholder-enter')}
                data-testid="lead-segment-job-position"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Phone numbers */}
      <div className="gba:space-y-6">
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-phone')}</FormLabel>
              <FormControl>
                <PhonePrefixNumberInput
                  value={field.value || ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  defaultCountryRef={countryRef}
                  prefixPlaceholder={t('lead-segment-phone-prefix-placeholder')}
                  numberPlaceholder={t('lead-segment-placeholder-enter')}
                  invalid={fieldState.invalid}
                  describedBy={fieldState.error ? 'lead-segment-phone-error' : undefined}
                  fieldName="phoneNumber"
                  invalidMessage="Please enter a valid phone number"
                  data-testid="lead-segment-phone"
                />
              </FormControl>
              <FormMessage id={fieldState.error ? 'lead-segment-phone-error' : undefined} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="secondaryNumber"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-secondary-number')}</FormLabel>
              <FormControl>
                <PhonePrefixNumberInput
                  value={field.value || ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  defaultCountryRef={countryRef}
                  prefixPlaceholder={t('lead-segment-phone-prefix-placeholder')}
                  numberPlaceholder={t('lead-segment-placeholder-enter')}
                  invalid={fieldState.invalid}
                  describedBy={fieldState.error ? 'lead-segment-secondary-number-error' : undefined}
                  fieldName="secondaryNumber"
                  invalidMessage="Please enter a valid phone number"
                  data-testid="lead-segment-secondary-number"
                />
              </FormControl>
              <FormMessage id={fieldState.error ? 'lead-segment-secondary-number-error' : undefined} />
            </FormItem>
          )}
        />
      </div>

      {/* LinkedIn URL */}
      <FormField
        control={form.control}
        name="linkedinUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('lead-segment-linkedin-url')}</FormLabel>
            <FormControl>
              <Input
                type="url"
                placeholder={t('lead-segment-placeholder-enter')}
                data-testid="lead-segment-linkedin-url"
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

      {/* Custom fields injection point */}
      {customFields && <div>{customFields}</div>}
    </div>
  )
}

export default LeadPersonSegment
