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
                catalogIdentifier="AcademicTitle:v1"
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

      {/* Custom fields injection point */}
      {customFields && <div>{customFields}</div>}
    </div>
  )
}

export default LeadPersonSegment
