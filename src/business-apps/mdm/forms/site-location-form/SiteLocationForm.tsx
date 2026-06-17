import React, { useState, useEffect, Dispatch, SetStateAction, useMemo, useCallback } from 'react'
import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage, Combobox } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from 'react-i18next'
import { useForm, type FieldValues } from 'react-hook-form'
import {
  SiteLocation,
  SiteLocationCountry,
  SiteLocationRegion
} from '@/business-apps/mdm/apps/organizational-data/types'
import { GeoZone } from '@/business-apps/mdm/apps/organizational-data/types/GeoZone.types'
import { FormWrapperModal } from '@/components/form-wrapper'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import {
  AddressAutocomplete,
  mapGeoapifyToFormValues,
  type MappedFormValues
} from '@/business-apps/hr/core/components/address-autocomplete'

const DATA_TEST_ID_PREFIX = 'SiteLocationForm'
const EMPTY_COUNTRIES: SiteLocationCountry[] = []
const EMPTY_REGIONS: SiteLocationRegion[] = []
const noopRefetch = () => {}
const noopFetchRegions = async () => {}
const noopGetRegions = () => EMPTY_REGIONS

const areOptionsEqual = (
  current: Array<{ value: string; label: string; code: string }>,
  next: Array<{ value: string; label: string; code: string }>
) =>
  current.length === next.length &&
  current.every(
    (item, index) =>
      item.value === next[index]?.value && item.label === next[index]?.label && item.code === next[index]?.code
  )

interface SiteLocationFormProps extends BusinessAppContextProps {
  siteLocation?: SiteLocation
  refetch?: () => void
  structureId?: string
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  isDrawerActive?: boolean
  childAddButton?: React.ReactNode
  isEditSiteLocation?: boolean
  onCancel?: () => void
  prefixDataTestId?: string
  /** Parent loads catalog; `RenderRemoteComponent` omits — default `[]`. */
  countries?: SiteLocationCountry[]
  fetchRegionsForCountries?: (_countryCodes: string[]) => Promise<void>
  getRegionsForCountry?: (_countryCode: string) => SiteLocationRegion[]
  geoZones: GeoZone[]
}

const SiteLocationForm: React.FC<SiteLocationFormProps> = ({
  siteLocation,
  refetch = noopRefetch,
  structureId = '',
  open: _open,
  setOpen,
  isDrawerActive,
  childAddButton,
  isEditSiteLocation = false,
  onCancel,
  prefixDataTestId,
  accessToken,
  countries = EMPTY_COUNTRIES,
  fetchRegionsForCountries = noopFetchRegions,
  getRegionsForCountry = noopGetRegions,
  geoZones
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const { t } = useTranslation('master-data')
  const optionalLabel = t('forms.common.optional', { defaultValue: 'optional' })
  const orgchartClient = useOrgchartClient(accessToken)
  const isDevEnabled = useFeature<boolean>(Feature.Dev.Enabled.Key)
  const showAddressAutocompleteMap = Boolean(isDevEnabled)
  const [isGeoapifyUnavailable, setIsGeoapifyUnavailable] = useState(false)
  const isAddressReadonly = showAddressAutocompleteMap && !isGeoapifyUnavailable
  const [regions, setRegions] = useState<Array<{ value: string; label: string; code: string }>>([])
  const [isLoadingRegions, setIsLoadingRegions] = useState(false)
  const [loading, setLoading] = useState(false)
  const countriesOptions = useMemo(
    () =>
      countries.map(country => ({
        value: country.id,
        label: country.value,
        code: country.code
      })),
    [countries]
  )

  const getCountryId = useCallback(
    (countryName?: string) => countries.find(country => country.value === countryName)?.id || '',
    [countries]
  )

  const getCountryCodeFromId = useCallback(
    (countryId?: string) => countries.find(country => country.id === countryId)?.code || '',
    [countries]
  )

  const defaultValues = useMemo(
    () => ({
      code: siteLocation?.code || '',
      name: siteLocation?.name || '',
      country: getCountryId(siteLocation?.country),
      region: '',
      geoZone: siteLocation?.geoZone || '',
      city: siteLocation?.locality || '',
      addressLines: [
        siteLocation?.addressLine?.streetAddress || '',
        siteLocation?.addressLine?.addressLine2 || '',
        siteLocation?.addressLine?.addressLine3 || ''
      ],
      postalCode: siteLocation?.postalCode || '',
      latitude: typeof siteLocation?.latitude === 'number' ? siteLocation.latitude : null,
      longitude: typeof siteLocation?.longitude === 'number' ? siteLocation.longitude : null
    }),
    [siteLocation, getCountryId]
  )

  const form = useForm<FieldValues>({ defaultValues, mode: 'onChange' })
  const selectedCountryId = form.watch('country') as string | undefined

  // Load regions when country changes
  const handleCountryChange = useCallback(
    async (countryCode: string) => {
      if (!countryCode) {
        setRegions(current => (current.length === 0 ? current : []))
        return
      }

      // First check if regions are already cached
      const cachedRegions = getRegionsForCountry(countryCode) ?? []
      if (cachedRegions.length > 0) {
        const regionsOptions = cachedRegions.map(region => ({
          value: region.id,
          label: region.value,
          code: region.code
        }))
        setRegions(current => (areOptionsEqual(current, regionsOptions) ? current : regionsOptions))
        return
      }

      // If not cached, fetch them
      setIsLoadingRegions(true)
      try {
        await fetchRegionsForCountries([countryCode])
        // After fetching, get regions from cache again
        const updatedRegions = getRegionsForCountry(countryCode) ?? []
        const regionsOptions = updatedRegions.map(region => ({
          value: region.id,
          label: region.value,
          code: region.code
        }))
        setRegions(current => (areOptionsEqual(current, regionsOptions) ? current : regionsOptions))
      } catch (error) {
        console.error('Error loading regions:', error)
      } finally {
        setIsLoadingRegions(false)
      }
    },
    [getRegionsForCountry, fetchRegionsForCountries]
  )

  useEffect(() => {
    if (selectedCountryId) {
      const countryCode = getCountryCodeFromId(selectedCountryId)
      if (countryCode) {
        handleCountryChange(countryCode)
      }
    } else {
      setRegions(current => (current.length === 0 ? current : []))
    }
  }, [selectedCountryId, getCountryCodeFromId, handleCountryChange])

  useEffect(() => {
    if (!_open) return
    form.reset(defaultValues)
  }, [_open, defaultValues, form])

  useEffect(() => {
    if (!siteLocation?.region || regions.length === 0 || form.getValues('region')) return
    const regionId = regions.find(region => region.label === siteLocation.region)?.value
    if (regionId) {
      form.setValue('region', regionId, { shouldDirty: false, shouldValidate: false })
    }
  }, [siteLocation?.region, regions, form])

  const resolveMappedAddress = useCallback(
    async (args: {
      result: Parameters<typeof mapGeoapifyToFormValues>[0]
      mapped: MappedFormValues
    }): Promise<MappedFormValues> => {
      if (!args.mapped.countryId || args.mapped.regionId) return args.mapped

      const countryCode = getCountryCodeFromId(args.mapped.countryId)
      if (!countryCode) return args.mapped

      await fetchRegionsForCountries([countryCode])
      const countryRegions = getRegionsForCountry(countryCode) ?? []
      const remapped = mapGeoapifyToFormValues(args.result, { countries, regions: countryRegions })

      return { ...args.mapped, regionId: remapped.regionId }
    },
    [countries, fetchRegionsForCountries, getCountryCodeFromId, getRegionsForCountry]
  )

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      setLoading(true)
      const addressLines = Array.isArray(values.addressLines) ? values.addressLines : []
      const streetAddress = String(addressLines[0] || '').trim()
      const addressLine2 = String(addressLines[1] || '').trim()
      const addressLine3 = String(addressLines[2] || '').trim()
      const latitude = typeof values.latitude === 'number' ? values.latitude : null
      const longitude = typeof values.longitude === 'number' ? values.longitude : null
      const geoZoneId = values.geoZone ? geoZones.find(geoZone => geoZone.name === values.geoZone)?.id : undefined

      const siteLocationData = {
        structureId,
        code: values.code,
        name: values.name,
        ...(streetAddress || addressLine2 || addressLine3
          ? {
              addressLine: {
                streetAddress,
                addressLine2,
                addressLine3
              }
            }
          : {}),
        ...(values.postalCode ? { postalCode: values.postalCode } : {}),
        locality: values.city,
        ...(values.region ? { region_ref: values.region } : {}),
        country_ref: values.country || undefined,
        ...(latitude !== null && longitude !== null ? { latitude, longitude } : {}),
        geo_zone: geoZoneId ?? ''
      }

      if (isEditSiteLocation && siteLocation?.id) {
        // Update existing site location
        await orgchartClient.updateSiteLocation(siteLocation.id, siteLocationData, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })
      } else {
        // Create new site location
        await orgchartClient.createSiteLocation(siteLocationData, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })
      }

      refetch()
      setOpen?.(false)
    } catch (error) {
      console.error('Error saving site location:', error)
    } finally {
      setLoading(false)
    }
  }

  const onCancelForm = () => {
    setOpen?.(false)
    // setRegions([]);
    if (onCancel) {
      onCancel()
    }
  }

  return (
    <FormWrapperModal
      open={_open}
      setOpen={setOpen}
      title={isEditSiteLocation ? 'Edit Site Location' : 'Add Site Location'}
      description="Configure site location details and information"
      isDrawerActive={isDrawerActive}
      childAddButton={childAddButton}
      onCancel={onCancelForm}
      onSubmit={handleSubmit}
      isEditing={isEditSiteLocation}
      loading={loading}
      dataTestId={dataTestId}
      defaultValues={defaultValues}
      form={form}
    >
      <div className="gba:space-y-6">
        {/* Code Field */}
        <FormField
          name="code"
          rules={{
            required: t('forms.siteLocation.fields.code.validation', {
              defaultValue: 'Code is required'
            }),
            maxLength: {
              value: 64,
              message: t('forms.siteLocation.fields.code.maxLength', {
                defaultValue: 'Code must be at most 64 characters'
              })
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.siteLocation.fields.code.label', { defaultValue: 'Code' })} *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('forms.siteLocation.fields.code.placeholder', {
                    defaultValue: 'Enter site location code'
                  })}
                  data-testid={`${dataTestId}-code-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Name Field */}
        <FormField
          name="name"
          rules={{
            required: t('forms.siteLocation.fields.name.validation', {
              defaultValue: 'Name is required'
            }),
            maxLength: {
              value: 64,
              message: t('forms.siteLocation.fields.name.maxLength', {
                defaultValue: 'Name must be at most 64 characters'
              })
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.siteLocation.fields.name.label', { defaultValue: 'Name' })} *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('forms.siteLocation.fields.name.placeholder', {
                    defaultValue: 'Enter site location name'
                  })}
                  data-testid={`${dataTestId}-name-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showAddressAutocompleteMap && (
          <AddressAutocomplete
            form={form}
            catalogs={{ countries, regions: getRegionsForCountry(getCountryCodeFromId(selectedCountryId)) }}
            fieldNames={{
              countryId: 'country',
              regionId: 'region',
              addressLines: 'addressLines',
              postalCode: 'postalCode',
              city: 'city',
              latitude: 'latitude',
              longitude: 'longitude'
            }}
            testIdPrefix={`${dataTestId}-address-autocomplete`}
            resolveMappedAddress={resolveMappedAddress}
            onProviderUnavailable={() => setIsGeoapifyUnavailable(true)}
          />
        )}

        {/* Country Field */}
        <FormField
          name="country"
          rules={{
            required: t('forms.siteLocation.fields.country.validation', {
              defaultValue: 'Country is required'
            })
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.siteLocation.fields.country.label', { defaultValue: 'Country' })} *</FormLabel>
              <FormControl>
                {isAddressReadonly ? (
                  <Input
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={countriesOptions.find(country => country.value === field.value)?.label || ''}
                    placeholder={t('forms.siteLocation.fields.country.placeholder', {
                      defaultValue: 'Select country'
                    })}
                    readOnly
                    data-testid={`${dataTestId}-country-input`}
                  />
                ) : (
                  <Combobox
                    options={countriesOptions}
                    value={field.value}
                    onValueChange={value => {
                      field.onChange(value)
                      form.setValue('region', '', { shouldDirty: true, shouldValidate: true })
                    }}
                    placeholder={t('forms.siteLocation.fields.country.placeholder', {
                      defaultValue: 'Select country'
                    })}
                    searchPlaceholder={t('forms.siteLocation.fields.country.searchPlaceholder', {
                      defaultValue: 'Search countries...'
                    })}
                    emptyText={t('forms.siteLocation.fields.country.emptyText', {
                      defaultValue: 'No countries found.'
                    })}
                    data-testid={`${dataTestId}-country-combobox`}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Region Field */}
        {regions.length > 0 && (
          <FormField
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('forms.siteLocation.fields.region.label', { defaultValue: 'Region' })}{' '}
                  <span className="gba:text-muted-foreground">({optionalLabel})</span>
                </FormLabel>
                <FormControl>
                  <Combobox
                    options={regions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={
                      isLoadingRegions
                        ? t('forms.siteLocation.fields.region.loadingPlaceholder', {
                            defaultValue: 'Loading regions...'
                          })
                        : t('forms.siteLocation.fields.region.placeholder', {
                            defaultValue: 'Select region'
                          })
                    }
                    searchPlaceholder={t('forms.siteLocation.fields.region.searchPlaceholder', {
                      defaultValue: 'Search regions...'
                    })}
                    emptyText={t('forms.siteLocation.fields.region.emptyText', {
                      defaultValue: 'No regions found.'
                    })}
                    disabled={isLoadingRegions || (isAddressReadonly && Boolean(field.value))}
                    data-testid={`${dataTestId}-region-combobox`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Geo Zone Field */}
        <FormField
          name="geoZone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.siteLocation.fields.geoZone.label', { defaultValue: 'Geo Zone' })}</FormLabel>
              <FormControl>
                <Combobox
                  options={geoZones.map(geoZone => ({
                    value: geoZone.name,
                    label: geoZone.name,
                    id: geoZone.id
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t('forms.siteLocation.fields.geoZone.placeholder', {
                    defaultValue: 'Select geo zone'
                  })}
                  searchPlaceholder={t('forms.siteLocation.fields.geoZone.searchPlaceholder', {
                    defaultValue: 'Search geo zones...'
                  })}
                  emptyText={t('forms.siteLocation.fields.geoZone.emptyText', {
                    defaultValue: 'No geo zones found.'
                  })}
                  disabled={geoZones.length === 0}
                  data-testid={`${dataTestId}-geo-zone-combobox`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* City Field */}
        <FormField
          name="city"
          rules={{
            required: t('forms.siteLocation.fields.city.validation', {
              defaultValue: 'City is required'
            }),
            maxLength: {
              value: 64,
              message: t('forms.siteLocation.fields.city.maxLength', {
                defaultValue: 'City must be at most 64 characters'
              })
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.siteLocation.fields.city.label', { defaultValue: 'City' })} *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('forms.siteLocation.fields.city.placeholder', {
                    defaultValue: 'Enter city'
                  })}
                  readOnly={isAddressReadonly}
                  data-testid={`${dataTestId}-city-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Street Address Field */}
        <FormField
          name="addressLines.0"
          rules={{
            maxLength: {
              value: 35,
              message: t('forms.siteLocation.fields.streetAddress.maxLength', {
                defaultValue: 'Street address must be at most 35 characters'
              })
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('forms.siteLocation.fields.streetAddress.label', {
                  defaultValue: 'Street Address'
                })}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('forms.siteLocation.fields.streetAddress.placeholder', {
                    defaultValue: 'Enter street address'
                  })}
                  readOnly={isAddressReadonly}
                  data-testid={`${dataTestId}-street-address-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address Line 2 Field */}
        <FormField
          name="addressLines.1"
          rules={{
            maxLength: {
              value: 35,
              message: t('forms.siteLocation.fields.addressLine2.maxLength', {
                defaultValue: 'Address line 2 must be at most 35 characters'
              })
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('forms.siteLocation.fields.addressLine2.label', {
                  defaultValue: 'Address Line 2'
                })}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('forms.siteLocation.fields.addressLine2.placeholder', {
                    defaultValue: 'Enter address line 2'
                  })}
                  data-testid={`${dataTestId}-address-line2-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address Line 3 Field */}
        <FormField
          name="addressLines.2"
          rules={{
            maxLength: {
              value: 35,
              message: t('forms.siteLocation.fields.addressLine3.maxLength', {
                defaultValue: 'Address line 3 must be at most 35 characters'
              })
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('forms.siteLocation.fields.addressLine3.label', {
                  defaultValue: 'Address Line 3'
                })}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('forms.siteLocation.fields.addressLine3.placeholder', {
                    defaultValue: 'Enter address line 3'
                  })}
                  data-testid={`${dataTestId}-address-line3-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Postal Code Field */}
        <FormField
          name="postalCode"
          rules={{
            maxLength: {
              value: 10,
              message: t('forms.siteLocation.fields.postalCode.maxLength', {
                defaultValue: 'Postal code must be at most 10 characters'
              })
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.siteLocation.fields.postalCode.label', { defaultValue: 'Postal Code' })}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('forms.siteLocation.fields.postalCode.placeholder', {
                    defaultValue: 'Enter postal code'
                  })}
                  readOnly={isAddressReadonly}
                  data-testid={`${dataTestId}-postal-code-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormWrapperModal>
  )
}

export default SiteLocationForm
