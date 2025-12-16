import React, { useEffect } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import type { Control } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import type { PersonalDataFormValues, CatalogEntry } from '../types'

export interface NamesGroupProps {
  control: Control<PersonalDataFormValues>
  catalogs: { salutation?: CatalogEntry[] }
  setValue: (
    name: keyof PersonalDataFormValues,
    value: any,
    options?: { shouldValidate?: boolean; shouldDirty?: boolean }
  ) => void
}

const NamesGroup: React.FC<NamesGroupProps> = ({ control, catalogs, setValue }) => {
  const placeholderSelect = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
    'Please Select'
  )
  const placeholderEnter = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder',
    'Please Enter'
  )

  // Watch fields for computed Display Name (top-level hooks)
  const titleWatch = useWatch({ control, name: 'title' })
  const preferredNameWatch = useWatch({ control, name: 'preferredName' })
  const firstNameWatch = useWatch({ control, name: 'firstName' })
  const lastNameWatch = useWatch({ control, name: 'lastName' })
  const partsDisplay =
    preferredNameWatch && String(preferredNameWatch).trim().length > 0
      ? [String(titleWatch || '').trim(), String(preferredNameWatch || '').trim(), String(lastNameWatch || '').trim()]
      : [String(titleWatch || '').trim(), String(firstNameWatch || '').trim(), String(lastNameWatch || '').trim()]
  const computedDisplayName = partsDisplay.filter(Boolean).join(' ').trim()

  // Update displayName field whenever computedDisplayName changes
  useEffect(() => {
    setValue('displayName', computedDisplayName, { shouldValidate: false, shouldDirty: false })
  }, [computedDisplayName, setValue])

  const validateNameFunction = (name: string): boolean => {
    const trimmed = (name || '').trim()
    const nameRegex =
      /^[A-Za-zÀ-ÿ\u00f1\u00d1\u0100-\u017F]{2,}(?:(?:\s*-\s*|\s)[A-Za-zÀ-ÿ\u00f1\u00d1\u0100-\u017F]{2,})*(?:\s*\([A-Za-zÀ-ÿ\u00f1\u00d1\u0100-\u017F]+\))?$/

    return nameRegex.test(trimmed)
  }

  return (
    <div className="gba:space-y-4" data-testid="change-personal-data-names-group">
      {/* Salutation */}
      <FormField
        control={control}
        name={'salutationRef' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-salutation-label" className="gba:w-[100%]">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.personal_information_container.salutation',
                'Salutation'
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
                  className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none"
                  data-testid="flw_changePersonalData_currentSalutation"
                >
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs.salutation || []).map((entry: any) => (
                  <SelectItem
                    key={entry.id}
                    value={String(entry.id)}
                    data-testid={`change-personal-data-salutation-option-${entry.id}`}
                  >
                    {getCatalogValue(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Title */}
      <FormField
        control={control}
        name={'title' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-title-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.personal_information_container.title',
                'Title'
              )}
            </FormLabel>
            <FormControl>
              <Input
                className="gba:w-full"
                {...field}
                placeholder={placeholderEnter}
                data-testid="flw_changePersonalData_titleInput"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* First Name */}
      <FormField
        control={control}
        name={'firstName' as any}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.personal_information_container.first_name_validation_message',
            'The First Name field is required. Please enter your first name.'
          ),
          validate: (value: string) =>
            validateNameFunction(value) ||
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:change_relationship.container_relationship.first_name_validation_message',
              'Please enter a valid first name.'
            )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-first-name-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.personal_information_container.first_name',
                'First Name'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                className="gba:w-full"
                {...field}
                placeholder={placeholderEnter}
                data-testid="flw_changePersonalData_currentFirstName"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Preferred Name */}
      <FormField
        control={control}
        name={'preferredName' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-preferred-name-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.summary_layout.public_profile_container.display_name',
                'Preferred Name'
              )}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={placeholderEnter}
                data-testid="flw_changePersonalData_currentPreferredName"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Last Name */}
      <FormField
        control={control}
        name={'lastName' as any}
        rules={{
          required: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.personal_information_container.last_name_validation_message',
            'The Last Name field is required. Please enter your last name.'
          ),
          validate: (value: string) =>
            validateNameFunction(value) ||
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:change_relationship.container_relationship.last_name_validation_message',
              'Please enter a valid last name.'
            )
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-last-name-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.personal_information_container.last_name',
                'Last Name'
              )}
              <span className="gba:text-destructive"> *</span>
            </FormLabel>
            <FormControl>
              <Input
                className="gba:w-full"
                {...field}
                placeholder={placeholderEnter}
                data-testid="flw_changePersonalData_currentLastName"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Display Name (computed, read-only) */}
      <FormField
        control={control}
        name={'displayName' as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-display-name-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.personal_information_container.preferred_name',
                'Display Name'
              )}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                disabled
                value={computedDisplayName}
                className="gba:w-full"
                data-testid="flw_changePersonalData_currentDisplayName"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

export default NamesGroup
