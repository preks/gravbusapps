import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Combobox
} from '@newwork/nw-design-system'
import type { Control } from 'react-hook-form'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Percent } from '@phosphor-icons/react'
import type { PersonalDataFormValues, CatalogEntry } from '../types'

export interface NationalityLanguageStatusGroupProps {
  control: Control<PersonalDataFormValues>
  catalogs: { nationality?: CatalogEntry[]; language?: CatalogEntry[]; maritalStatus?: CatalogEntry[] }
}

const getCatalogOptionLabel = (entry: CatalogEntry, preferTranslation: boolean): string => {
  if (preferTranslation) {
    return entry.translations?.[0]?.value || entry.value || ''
  }

  return entry.value || entry.translations?.[0]?.value || ''
}

const getSortedCatalogOptions = (entries: CatalogEntry[] = [], preferTranslation = true) =>
  [...entries]
    .sort((a, b) =>
      getCatalogOptionLabel(a, preferTranslation).localeCompare(getCatalogOptionLabel(b, preferTranslation))
    )
    .map(entry => ({
      value: String(entry.id),
      label: getCatalogOptionLabel(entry, preferTranslation)
    }))

const NationalityLanguageStatusGroup: React.FC<NationalityLanguageStatusGroupProps> = ({ control, catalogs }) => {
  const placeholderSelect = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
    'Please Select'
  )
  const placeholderEnter = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder',
    'Please Enter'
  )
  const nationalityLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.nationality',
    'Nationality'
  )
  const languageLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.language',
    'Native Language'
  )
  const nationalityOptions = getSortedCatalogOptions(catalogs.nationality, nationalityLabel !== 'Nationality')
  const languageOptions = getSortedCatalogOptions(catalogs.language, languageLabel !== 'Native Language')

  return (
    <div className="gba:space-y-4" data-testid="change-personal-data-nationality-language-status-group">
      {/* Nationality */}
      <FormField
        control={control}
        name={'nationalityRef' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-nationality-label">{nationalityLabel}</FormLabel>
            <FormControl>
              <Combobox
                className={`gba:!w-full gba:min-w-0 gba:!max-w-none ${field.value ? '' : 'gba:text-muted-foreground'}`}
                options={nationalityOptions}
                value={
                  field.value === null || field.value === undefined || field.value === '' ? '' : String(field.value)
                }
                onValueChange={v => field.onChange(v || null)}
                placeholder={placeholderSelect}
                searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.personal_information_container.search_nationality',
                  'Search nationality...'
                )}
                emptyText={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.personal_information_container.no_nationalities_found',
                  'No nationalities found'
                )}
                data-testid="flw_changePersonalData_currentNationality"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Native Language */}
      <FormField
        control={control}
        name={'languageRef' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-language-label">{languageLabel}</FormLabel>
            <FormControl>
              <Combobox
                className={`gba:!w-full gba:min-w-0 gba:!max-w-none ${field.value ? '' : 'gba:text-muted-foreground'}`}
                options={languageOptions}
                value={
                  field.value === null || field.value === undefined || field.value === '' ? '' : String(field.value)
                }
                onValueChange={v => field.onChange(v || null)}
                placeholder={placeholderSelect}
                searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.personal_information_container.search_language',
                  'Search language...'
                )}
                emptyText={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.personal_information_container.no_languages_found',
                  'No languages found'
                )}
                data-testid="flw_changePersonalData_currentLanguage"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Marital Status */}
      <FormField
        control={control}
        name={'maritalStatusRef' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-marital-status-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.personal_information_container.marital_status',
                'Marital Status'
              )}
            </FormLabel>
            <Select
              value={
                field.value === null || field.value === undefined || field.value === ''
                  ? undefined
                  : String(field.value)
              }
              onValueChange={v => field.onChange(v || null)}
            >
              <FormControl>
                <SelectTrigger
                  className="gba:!w-full gba:min-w-0 gba:!max-w-none"
                  data-testid="flw_changePersonalData_currentMaritalStatus"
                >
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs.maritalStatus || []).map(entry => (
                  <SelectItem
                    key={entry.id}
                    value={String(entry.id)}
                    data-testid={`change-personal-data-marital-status-option-${entry.id}`}
                  >
                    {entry?.translations?.[0]?.value || entry?.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Degree of Disability */}
      <FormField
        control={control}
        name={'severelyDisabilityDegree' as any}
        rules={{
          validate: (v: any) => {
            if (v === undefined || v === null || v === '') return true
            const num = Number(v)
            const valid = !Number.isNaN(num) && num >= 0 && num <= 100
            return (
              valid ||
              `${getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.valid_number', 'Please enter a valid number')} (0-100)`
            )
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-disability-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.personal_information_container.disability',
                'Degree of Disability'
              )}
            </FormLabel>
            <FormControl>
              <Input
                className="gba:w-full"
                {...field}
                placeholder={placeholderEnter}
                inputMode="decimal"
                data-testid="flw_changePersonalData_disabilityInput"
                endAddOn={<Percent className="gba:w-4 gba:h-4" />}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

export default NationalityLanguageStatusGroup
