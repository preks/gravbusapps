import React, { useState, useEffect, Dispatch, SetStateAction, useMemo, useCallback } from 'react'
import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage, Combobox } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from 'react-i18next'
import {
  SiteLocation,
  SiteLocationCountry,
  SiteLocationRegion
} from '@/business-apps/mdm/apps/organizational-data/types'
import { FormWrapperModal } from '@/components/form-wrapper'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

const DATA_TEST_ID_PREFIX = 'SiteLocationForm'

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
}

const SiteLocationForm: React.FC<SiteLocationFormProps> = ({
  siteLocation,
  refetch = () => {},
  structureId = '',
  open: _open,
  setOpen,
  isDrawerActive,
  childAddButton,
  isEditSiteLocation = false,
  onCancel,
  prefixDataTestId,
  accessToken,
  countries = [],
  fetchRegionsForCountries = async () => {},
  getRegionsForCountry = () => []
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const { t } = useTranslation('master-data')
  const orgchartClient = useOrgchartClient(accessToken)
  const [countriesOptions, setCountriesOptions] = useState<Array<{ value: string; label: string; code: string }>>([])
  const [regions, setRegions] = useState<Array<{ value: string; label: string; code: string }>>([])
  const [isLoadingRegions, setIsLoadingRegions] = useState(false)
  const [loading, setLoading] = useState(false)

  const defaultValues = useMemo(
    () => ({
      code: siteLocation?.code || '',
      name: siteLocation?.name || '',
      country: siteLocation?.country || '',
      region: siteLocation?.region || '',
      city: siteLocation?.locality || '',
      streetAddress: siteLocation?.addressLine?.streetAddress || '',
      addressLine2: siteLocation?.addressLine?.addressLine2 || '',
      addressLine3: siteLocation?.addressLine?.addressLine3 || '',
      postalCode: siteLocation?.postalCode || ''
    }),
    [siteLocation]
  )

  // Load regions when country changes
  const handleCountryChange = useCallback(
    async (countryCode: string) => {
      if (!countryCode) {
        setRegions([])
        return
      }

      // First check if regions are already cached
      const cachedRegions = getRegionsForCountry(countryCode) ?? []
      if (cachedRegions.length > 0) {
        const regionsOptions = cachedRegions.map(region => ({
          value: region.value,
          label: region.value,
          code: region.code
        }))
        setRegions(regionsOptions)
        return
      }

      // If not cached, fetch them
      setIsLoadingRegions(true)
      try {
        await fetchRegionsForCountries([countryCode])
        // After fetching, get regions from cache again
        const updatedRegions = getRegionsForCountry(countryCode) ?? []
        const regionsOptions = updatedRegions.map(region => ({
          value: region.value,
          label: region.value,
          code: region.code
        }))
        setRegions(regionsOptions)
      } catch (error) {
        console.error('Error loading regions:', error)
      } finally {
        setIsLoadingRegions(false)
      }
    },
    [getRegionsForCountry, fetchRegionsForCountries]
  )

  // Load countries options from props
  useEffect(() => {
    if (countries.length > 0) {
      const countriesOptions = countries.map(country => ({
        value: country.value,
        label: country.value,
        code: country.code
      }))
      setCountriesOptions(countriesOptions)
    }
  }, [countries])

  useEffect(() => {
    if (siteLocation?.country && countries.length > 0) {
      const countryCode = countries.find(country => country.value === siteLocation.country)?.code
      if (countryCode) {
        handleCountryChange(countryCode)
      }
    }
  }, [siteLocation?.country, countries, handleCountryChange])

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      setLoading(true)
      const regionCode = values.region ? regions.find(region => region.value === values.region)?.code : undefined
      const countryCode = values.country
        ? countriesOptions.find(country => country.value === values.country)?.code
        : undefined

      const siteLocationData = {
        structureId,
        code: values.code,
        name: values.name,
        ...(values.streetAddress || values.addressLine2 || values.addressLine3
          ? {
              addressLine: {
                streetAddress: values.streetAddress || '',
                addressLine2: values.addressLine2 || '',
                addressLine3: values.addressLine3 || ''
              }
            }
          : {}),
        ...(values.postalCode ? { postalCode: values.postalCode } : {}),
        locality: values.city,
        ...(regionCode ? { region_ref: `CountryRegion:v1:${regionCode}` } : {}),
        country_ref: countryCode ? `Country:v1:${countryCode}` : undefined
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
                <Combobox
                  options={countriesOptions}
                  value={field.value}
                  onValueChange={value => {
                    field.onChange(value)
                    handleCountryChange(countriesOptions.find(country => country.value === value)?.code || '')
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
                  disabled={countriesOptions.length === 0}
                  data-testid={`${dataTestId}-country-combobox`}
                />
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
                <FormLabel>{t('forms.siteLocation.fields.region.label', { defaultValue: 'Region' })}</FormLabel>
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
                    disabled={isLoadingRegions}
                    data-testid={`${dataTestId}-region-combobox`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
                  data-testid={`${dataTestId}-city-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Street Address Field */}
        <FormField
          name="streetAddress"
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
                  data-testid={`${dataTestId}-street-address-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address Line 2 Field */}
        <FormField
          name="addressLine2"
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
          name="addressLine3"
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
