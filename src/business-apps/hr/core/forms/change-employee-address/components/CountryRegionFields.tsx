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
  SelectItem
} from '@newwork/nw-design-system'
import {
  getTranslationFromI18nKeyAndLabel,
  getCatalogValue,
  getCurrentActiveUserLocale
} from '@/common/utils/windowUtils'
import { useWatch, useFormState } from 'react-hook-form'

interface CountryRegionFieldsProps {
  control: any
  catalogs: { countries?: any[]; regions?: any[] }
  setValue: (name: string, value: any) => void
  isDeleteMode?: boolean
  suppressValidation?: boolean
  suspendRegionRender?: boolean
  /** When true, only the region/county block is rendered. Used by AddressCommonFields so
   * the Country select can appear above the autocomplete map while the region stays below. */
  suspendCountryRender?: boolean
  /**
   * When true, the Region/State/County Select is disabled. Used by the address form when
   * the address-autocomplete map is available so the only way to set a region is via the
   * autocomplete tools (search pick, pin drag, "Use my location"). The current value is
   * preserved and still submitted with the form.
   */
  regionReadonly?: boolean
  /**
   * When true, the Country Select is disabled. Used by the address form when the address-
   * autocomplete map is available so the only way to set a country is via the autocomplete
   * tools. The current value is preserved and still submitted with the form.
   */
  countryReadonly?: boolean
}

const CountryRegionFields: React.FC<CountryRegionFieldsProps> = ({
  control,
  catalogs,
  setValue,
  isDeleteMode,
  suppressValidation,
  suspendRegionRender,
  suspendCountryRender,
  regionReadonly,
  countryReadonly
}) => {
  const countryField = useWatch({ control, name: 'countryId' })
  const regionField = useWatch({ control, name: 'regionId' })
  const { isSubmitted, submitCount, touchedFields } = useFormState({ control })
  const activeUserLocale = React.useMemo(() => getCurrentActiveUserLocale() || undefined, [])
  const sortedCountries = React.useMemo(
    () =>
      [...(catalogs?.countries || [])].sort((firstCountry: any, secondCountry: any) =>
        getCatalogValue(firstCountry).localeCompare(getCatalogValue(secondCountry), activeUserLocale)
      ),
    [activeUserLocale, catalogs?.countries]
  )
  // Compute derived display values and keep effect at top-level (no nested hooks)
  const selectedCountry = (catalogs?.countries || []).find((c: any) => String(c.id) === String(countryField))
  const countryVal = selectedCountry?.id as string | undefined
  const regionsForCountry = (catalogs?.regions || []).filter((r: any) => r?.additionalValue2 === countryVal)
  const selectedRegion = regionsForCountry.find((r: any) => String(r.id) === String(regionField))
  const regionDisplay =
    countryVal === 'Country:v1:RO' ? selectedRegion?.additionalValue1 : selectedRegion?.alternativeCode
  React.useEffect(() => {
    setValue('regionLabel', regionDisplay || '')
  }, [regionDisplay, setValue])
  return (
    <>
      {!suspendCountryRender && (
        <FormField
          control={control}
          name={'countryId' as any}
          rules={{
            validate: (v: any) => {
              if (isDeleteMode || suppressValidation) return true
              const enforce = isSubmitted || submitCount > 0 || Boolean((touchedFields as any)?.countryId)
              if (!enforce) return true
              if (v === null || v === undefined || v === '') {
                return getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.address_container.country_validation_message',
                  'The Country field is required. Please select a value.'
                )
              }
              return true
            }
          }}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.details_layout.address_container.country',
                  'Country'
                )}
                <span className="gba:text-destructive"> *</span>
              </FormLabel>
              <Select
                value={
                  field.value === null || field.value === undefined || field.value === '' ? '' : String(field.value)
                }
                disabled={Boolean(countryReadonly)}
                onValueChange={v => {
                  field.onChange(v || null)
                  setValue('regionId', null)
                }}
              >
                <FormControl>
                  <SelectTrigger
                    className="gba:!w-full gba:min-w-0 gba:!max-w-none"
                    data-testid="flw_changeEmployeeAddressList_country"
                  >
                    <SelectValue
                      placeholder={`${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder', 'Please Select')} ${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.country', 'Country')}`}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sortedCountries.map((entry: any) => (
                    <SelectItem
                      key={entry.id}
                      value={String(entry.id)}
                      data-testid={`flw_changeEmployeeAddressList_countryOption-${entry.id}`}
                    >
                      {getCatalogValue(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!suppressValidation && !isDeleteMode && (fieldState.isTouched || isSubmitted || submitCount > 0) ? (
                <FormMessage />
              ) : null}
            </FormItem>
          )}
        />
      )}

      {(() => {
        if (suspendRegionRender) return null
        if (!(countryVal === 'Country:v1:DE' || countryVal === 'Country:v1:US' || countryVal === 'Country:v1:RO'))
          return null
        const getLabelName = (countryIdVal: string | null | undefined) => {
          switch (countryIdVal) {
            case 'Country:v1:DE':
              return getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.address_container.region',
                'Region'
              )
            case 'Country:v1:US':
              return getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.address_container.state',
                'State'
              )
            case 'Country:v1:RO':
              return getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.address_container.county',
                'County'
              )
            default:
              return getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.address_container.unknown',
                'Unknown'
              )
          }
        }
        const label = getLabelName(countryVal)
        const regions = regionsForCountry
        return (
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <FormField
              control={control}
              name={'regionId' as any}
              rules={{
                validate: (v: any) => {
                  if (isDeleteMode || suppressValidation) return true
                  if (
                    countryVal === 'Country:v1:DE' ||
                    countryVal === 'Country:v1:US' ||
                    countryVal === 'Country:v1:RO'
                  ) {
                    if (!v) {
                      return getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_profile.details_layout.address_container.region_validation_message',
                        'Please select a value.'
                      )
                    }
                  }
                  return true
                }
              }}
              render={({ field, fieldState }) => {
                return (
                  <FormItem>
                    <FormLabel>
                      {label}
                      <span className="gba:text-destructive"> *</span>
                    </FormLabel>
                    <Select
                      value={
                        field.value === null || field.value === undefined || field.value === ''
                          ? ''
                          : String(field.value)
                      }
                      disabled={Boolean(regionReadonly)}
                      onValueChange={v => {
                        // Ignore empty-value callbacks. The region Select has no "None" option,
                        // so a real user pick is always a concrete value. Radix emits ('') as a
                        // self-reset when the current value isn't in the options list (e.g. right
                        // after a programmatic country change, before the region value is updated
                        // to a region belonging to the new country). Without this guard, that
                        // spurious reset clobbers autofilled region values.
                        if (!v) return
                        field.onChange(v)
                      }}
                    >
                      <FormControl>
                        <SelectTrigger
                          className="gba:!w-full gba:min-w-0 gba:!max-w-none"
                          data-testid="flw_changeEmployeeAddressList_region"
                        >
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
                              'Please Select'
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regions.map((entry: any) => (
                          <SelectItem
                            key={entry.id}
                            value={String(entry.id)}
                            data-testid={`flw_changeEmployeeAddressList_regionOption-${entry.id}`}
                          >
                            {countryVal === 'Country:v1:RO' ? entry?.additionalValue1 : entry?.alternativeCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!suppressValidation &&
                    !isDeleteMode &&
                    (fieldState.isTouched || isSubmitted || submitCount > 0) ? (
                      <FormMessage />
                    ) : null}
                  </FormItem>
                )
              }}
            />
            <FormItem>
              <FormLabel className="gba:opacity-0">Region Display</FormLabel>
              <div className="gba:flex gba:items-center">
                <span
                  className="gba:block gba:w-full gba:h-10 gba:min-h-10 gba:px-3 gba:py-2 gba:rounded-md gba:bg-muted gba:text-muted-foreground gba:border gba:border-muted"
                  data-testid="flw_changeEmployeeAddressList_regionName"
                >
                  {(countryVal === 'Country:v1:RO'
                    ? getCatalogValue(regionsForCountry.find((r: any) => String(r.id) === String(regionField)))
                    : getCatalogValue(regionsForCountry.find((r: any) => String(r.id) === String(regionField)))) || ''}
                </span>
              </div>
            </FormItem>
          </div>
        )
      })()}
    </>
  )
}

export default CountryRegionFields
