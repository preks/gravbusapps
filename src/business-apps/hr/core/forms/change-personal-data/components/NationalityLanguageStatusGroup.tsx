import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input } from '@newwork/nw-design-system';
import type { Control } from 'react-hook-form';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { Percent } from '@phosphor-icons/react';

export interface NationalityLanguageStatusGroupProps {
  control: Control<any>;
  catalogs: { nationality?: any[]; language?: any[]; maritalStatus?: any[] };
}

const NationalityLanguageStatusGroup: React.FC<NationalityLanguageStatusGroupProps> = ({ control, catalogs }) => {
  const placeholderSelect = getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder', 'Please Select');
  const placeholderEnter = getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder', 'Please Enter');

  return (
    <div className="gba:space-y-4" data-testid="change-personal-data-nationality-language-status-group">
      {/* Nationality */}
      <FormField
        control={control}
        name={"nationalityRef" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-nationality-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.nationality', 'Nationality')}
            </FormLabel>
            <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
              <FormControl className="gba:w-[100%]">
                <SelectTrigger data-testid="change-personal-data-nationality-select">
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs.nationality || []).map((entry: any) => (
                  <SelectItem key={entry.id} value={entry.id} data-testid={`change-personal-data-nationality-option-${entry.id}`}>
                    {entry?.translations?.[0]?.value || entry?.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Native Language */}
      <FormField
        control={control}
        name={"languageRef" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-language-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.language', 'Native Language')}
            </FormLabel>
            <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
              <FormControl className="gba:w-[100%]">
                <SelectTrigger data-testid="change-personal-data-language-select">
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs.language || []).map((entry: any) => (
                  <SelectItem key={entry.id} value={entry.id} data-testid={`change-personal-data-language-option-${entry.id}`}>
                    {entry?.translations?.[0]?.value || entry?.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Marital Status */}
      <FormField
        control={control}
        name={"maritalStatusRef" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-marital-status-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.marital_status', 'Marital Status')}
            </FormLabel>
            <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
              <FormControl className="gba:w-[100%]">
                <SelectTrigger data-testid="change-personal-data-marital-status-select">
                  <SelectValue placeholder={placeholderSelect} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs.maritalStatus || []).map((entry: any) => (
                  <SelectItem key={entry.id} value={entry.id} data-testid={`change-personal-data-marital-status-option-${entry.id}`}>
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
        name={"severelyDisabilityDegree" as any}
        rules={{
          validate: (v: any) => {
            if (v === undefined || v === null || v === '') return true;
            const num = Number(v);
            const valid = !Number.isNaN(num) && num >= 0 && num <= 100;
            return (
              valid ||
              `${getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.add_request_trip_details.valid_number', 'Please enter a valid number')} (0-100)`
            );
          },
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel data-testid="change-personal-data-disability-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.disability', 'Degree of Disability')}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={placeholderEnter}
                inputMode="decimal"
                data-testid="change-personal-data-disability-input"
                endAddOn={<Percent className="gba:w-4 gba:h-4" />}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default NationalityLanguageStatusGroup;


