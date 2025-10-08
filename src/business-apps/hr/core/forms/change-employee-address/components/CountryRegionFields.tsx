import React, { useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils';
import { useWatch } from 'react-hook-form';

interface CountryRegionFieldsProps {
  control: any;
  catalogs: { countries?: any[]; regions?: any[] };
  setValue: (name: string, value: any) => void;
}

const CountryRegionFields: React.FC<CountryRegionFieldsProps> = ({ control, catalogs, setValue }) => {
  const countryField = useWatch({ control, name: 'countryId' });
  const regionField = useWatch({ control, name: 'regionId' });
  return (
    <>
      <FormField
        control={control}
        name={"countryId" as any}
        rules={{
          required: getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.country_validation_message','The Country field is required. Please select a value.'),
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.country','Country')}<span className="gba:text-destructive"> *</span>
            </FormLabel>
            <Select
              value={field.value === null || field.value === undefined || field.value === '' ? undefined : String(field.value)}
              onValueChange={(v) => { field.onChange(v || null); setValue('regionId', null); }}
            >
              <FormControl>
                <SelectTrigger className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none">
                  <SelectValue placeholder={`${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder','Please Select')} ${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.country','Country')}`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(catalogs?.countries || []).map((entry: any) => (
                  <SelectItem key={entry.id} value={String(entry.id)}>
                    {getCatalogValue(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {(() => {
        const selectedCountry = (catalogs?.countries || []).find((c: any) => String(c.id) === String(countryField));
        const countryVal = selectedCountry?.id;
        if (!(countryVal === 'Country:v1:DE' || countryVal === 'Country:v1:US' || countryVal === 'Country:v1:RO')) return null;
        const getLabelName = (countryIdVal: string | null | undefined) => {
          switch (countryIdVal) {
            case 'Country:v1:DE':
              return getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.region','Region');
            case 'Country:v1:US':
              return getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.state','State');
            case 'Country:v1:RO':
              return getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.county','County');
            default:
              return getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.unknown','Unknown');
          }
        };
        const label = getLabelName(countryVal);
        const regions = (catalogs?.regions || []).filter((r: any) => r?.additionalValue2 === countryVal);
        return (
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <FormField
              control={control}
              name={"regionId" as any}
              rules={{
                validate: (v: any) => {
                  if (countryVal === 'Country:v1:DE' || countryVal === 'Country:v1:US' || countryVal === 'Country:v1:RO') {
                    if (!v) {
                      return getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.region_validation_message','Please select a value.');
                    }
                  }
                  return true;
                }
              }}
              render={({ field }) => {
                const selected = regions.find((r: any) => String(r.id) === String(field.value));
                const regionDisplay = countryVal === 'Country:v1:RO' ? selected?.additionalValue1 : selected?.alternativeCode;
                useEffect(() => {
                  setValue('regionLabel', regionDisplay || '');
                }, [regionDisplay]);
                return (
                  <FormItem>
                    <FormLabel>{label}<span className="gba:text-destructive"> *</span></FormLabel>
                    <Select
                      value={field.value === null || field.value === undefined || field.value === '' ? undefined : String(field.value)}
                      onValueChange={(v) => field.onChange(v || null)}
                    >
                      <FormControl>
                        <SelectTrigger className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none">
                          <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder','Please Select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regions.map((entry: any) => (
                          <SelectItem key={entry.id} value={String(entry.id)}>
                            {countryVal === 'Country:v1:RO' ? entry?.additionalValue1 : entry?.alternativeCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormItem>
              <FormLabel className="gba:opacity-0">Region Display</FormLabel>
              <div className="gba:flex gba:items-center">
                <span className="gba:block gba:w-full gba:h-10 gba:min-h-10 gba:px-3 gba:py-2 gba:rounded-md gba:bg-muted gba:text-muted-foreground gba:border gba:border-muted">
                  {(countryVal === 'Country:v1:RO' ? getCatalogValue(regions.find((r: any) => String(r.id) === String(regionField))) : getCatalogValue(regions.find((r: any) => String(r.id) === String(regionField)))) || ''}
                </span>
              </div>
              <FormMessage />
            </FormItem>
          </div>
        );
      })()}
    </>
  );
};

export default CountryRegionFields;


