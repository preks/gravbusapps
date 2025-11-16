import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput,
  useTranslation
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import translations from './_i18n'

interface ContactDetailsSegmentProps {
  customFields?: React.ReactNode
}

const ContactDetailsSegment: React.FC<ContactDetailsSegmentProps> = ({ customFields }) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-6">
      {/* Academic Title and Language - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="academicTitleRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contact-academic-title-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier="AcademicTitle:v1"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v || null)}
                  data-testid="contact-details-segment-academic-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="languageRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contact-language-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier="Languages:v1"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v || null)}
                  data-testid="contact-details-segment-language"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Birth Date */}
      <FormField
        control={form.control}
        name="birthDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('contact-birth-date-label')}</FormLabel>
            <FormControl>
              <DateInput
                value={field.value || ''}
                onChange={value => field.onChange(value || null)}
                placeholder={t('contact-birth-date-placeholder')}
                data-testid="contact-details-segment-birth-date"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom fields slot */}
      {customFields}
    </div>
  )
}

export default ContactDetailsSegment
