import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  DateInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useTranslation
} from '@newwork/nw-design-system'
import type { Control } from 'react-hook-form'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { PersonalDataFormValues, CatalogEntry } from '../types'
import translations from '../../../apps/employee-record/_i18n'

export interface BirthAndGenderGroupProps {
  control: Control<PersonalDataFormValues>
  catalogs: { gender?: CatalogEntry[] }
}

const BirthAndGenderGroup: React.FC<BirthAndGenderGroupProps> = ({ control, catalogs }) => {
  const { t } = useTranslation(translations)
  const placeholderSelect = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
    'Please Select'
  )
  const placeholderEnter = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder',
    'Please Enter'
  )

  return (
    <div className="gba:space-y-4" data-testid="change-personal-data-birth-gender-group">
      {/* Birth Name (should appear between Preferred Name and Date of Birth) */}
      <FormField
        control={control}
        name={'birthName' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-birth-name-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.personal_information_container.birth_mame',
                'Birth Name'
              )}
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder={placeholderEnter} data-testid="flw_changePersonalData_currentBirthName" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Birth Date */}
      <FormField
        control={control}
        name={'birthDate' as any}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.personal_information_container.date_of_birth_validation_message',
            'Date of birth is not selected.'
          )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-dob-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.personal_information_container.date_of_birth',
                'Date of Birth'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <div data-testid="flw_changePersonalData_currentBirthDate" className="gba:overflow-hidden">
                <DateInput
                  type="date"
                  value={(field.value as string) || ''}
                  onChange={value => field.onChange(typeof value === 'string' ? value : (value?.[0] ?? ''))}
                  placeholder={placeholderSelect}
                  className="gba:w-[100%]"
                  {...({ locale: getCurrentActiveUserLocale() } as any)}
                  captionLayout="dropdown"
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Birth Place */}
      <FormField
        control={control}
        name={'birthPlace' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-birth-place-label">
              {t('details-label-place-of-birth')}
            </FormLabel>
            <FormControl>
              <Input
                className="gba:w-full"
                {...field}
                placeholder={placeholderEnter}
                data-testid="flw_changePersonalData_placeInput"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Gender */}
      <FormField
        control={control}
        name={'genderRef' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-gender-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.personal_information_container.gender',
                'Gender'
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
                  data-testid="flw_changePersonalData_currentGender"
                >
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(() => {
                  const order = ['female', 'male', 'divers', 'not defined']
                  const byValue = new Map<string, any>(
                    (catalogs.gender || []).map((e: any) => [
                      String(e?.value || e?.translations?.[0]?.value).toLowerCase(),
                      e
                    ])
                  )
                  const ordered = order
                    .map(v => byValue.get(v))
                    .filter(Boolean)
                    .concat(
                      (catalogs.gender || []).filter(
                        (e: any) => !order.includes(String(e?.value || e?.translations?.[0]?.value).toLowerCase())
                      )
                    )
                  return ordered.map((entry: any) => (
                    <SelectItem
                      key={entry.id}
                      value={String(entry.id)}
                      data-testid={`change-personal-data-gender-option-${entry.id}`}
                    >
                      {entry?.translations?.[0]?.value || entry?.value}
                    </SelectItem>
                  ))
                })()}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

export default BirthAndGenderGroup
