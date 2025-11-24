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
 * - Email (Text Input - flat field)
 * - Phone Number (Text Input - flat field)
 *
 * Used in Accordion
 */
const LeadPersonSegment: React.FC<LeadPersonSegmentProps> = ({ customFields }) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

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

      {/* Email and Phone - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-email')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t('lead-segment-placeholder-enter')}
                  data-testid="lead-segment-email"
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
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('lead-segment-phone')}</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder={t('lead-segment-placeholder-enter')}
                  data-testid="lead-segment-phone"
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

      {/* Custom fields injection point */}
      {customFields && <div>{customFields}</div>}
    </div>
  )
}

export default LeadPersonSegment
