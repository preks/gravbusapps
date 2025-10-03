import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system';
import type { Control } from 'react-hook-form';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface BirthAndGenderGroupProps {
  control: Control<any>;
  catalogs: { gender?: any[] };
}

const BirthAndGenderGroup: React.FC<BirthAndGenderGroupProps> = ({ control, catalogs }) => {
  const placeholderSelect = getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder', 'Please Select');
  const placeholderEnter = getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder', 'Please Enter');

  return (
    <div className="gba:space-y-4" data-testid="change-personal-data-birth-gender-group">
      {/* Birth Name (should appear between Preferred Name and Date of Birth) */}
      <FormField
        control={control}
        name={"birthName" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-birth-name-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.birth_mame', 'Birth Name')}
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder={placeholderEnter} data-testid="change-personal-data-birth-name-input" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Birth Date */}
      <FormField
        control={control}
        name={"birthDate" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-dob-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.date_of_birth', 'Date of Birth')}
            </FormLabel>
            <FormControl>
              <Input
                className="gba:w-full"
                {...field}
                type="date"
                placeholder={placeholderSelect}
                data-testid="change-personal-data-date-of-birth-input"
                title={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder', 'Please Select')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Birth Place */}
      <FormField
        control={control}
        name={"birthPlace" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-birth-place-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.place_of_birth', 'Place of Birth')}
            </FormLabel>
            <FormControl>
              <Input className="gba:w-full" {...field} placeholder={placeholderEnter} data-testid="change-personal-data-birth-place-input" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Gender */}
      <FormField
        control={control}
        name={"genderRef" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-gender-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.gender', 'Gender')}
            </FormLabel>
            <Select
              value={field.value === null || field.value === undefined || field.value === '' ? undefined : String(field.value)}
              onValueChange={(v) => field.onChange(v || null)}
            >
              <FormControl>
                <SelectTrigger className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none" data-testid="change-personal-data-gender-select">
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs.gender || []).map((entry: any) => (
                  <SelectItem key={entry.id} value={String(entry.id)} data-testid={`change-personal-data-gender-option-${entry.id}`}>
                    {entry?.translations?.[0]?.value || entry?.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default BirthAndGenderGroup;


