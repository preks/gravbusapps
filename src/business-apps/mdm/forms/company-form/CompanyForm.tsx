import React, { Dispatch, SetStateAction, useState, useMemo, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  FormSection,
  FormFieldGroup,
  FileUpload,
  Avatar,
  AvatarImage,
  AvatarFallback,
  useTranslation
} from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import type { Company } from '../../apps/organizational-data/types'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AddressSegment } from '@/common/components/common-relations/form-segments/address-segment'
import { EmployeeSelect } from '@/components/employee-select'
import { CatalogSelect } from '@/components/catalog-select'
import { DynamicForm } from '@/components/dynamic-form'
import { useCompanyAdditionalProperties } from '../../hooks/useCompanyAdditionalProperties'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import translations from './_i18n'

// Address schema for validation (no translations needed)
const addressSchema = z.object({
  addressType: z.string().optional(),
  addressLine: z
    .object({
      lines: z.array(z.string()).optional()
    })
    .optional(),
  postalCode: z.string().optional(),
  locality: z.string().optional(),
  regionRef: z.string().optional(),
  countryRef: z.string().optional()
})

/**
 * Create validation schema with translations
 */
const createCompanySchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t('validation-name-required')),
    code: z.string().min(1, t('validation-code-required')),
    description: z.string().optional(),
    director: z.string().optional(),
    percentage: z.number().min(0, t('validation-percentage-min')).max(100, t('validation-percentage-max')).optional(),
    commercial_registration_number: z.string().optional(),
    currency: z.string().optional(),
    tax_identification_number: z.string().optional(),
    tax_number: z.string().optional(),
    value_added_tax_number: z.string().optional(),
    // Addresses array for AddressSegment
    addresses: z.array(addressSchema).optional(),
    // Dynamic additional properties from catalog
    additionalProperties: z.record(z.string(), z.unknown()).optional()
  })

export type CompanyFormData = z.infer<ReturnType<typeof createCompanySchema>>

const DATA_TEST_ID_PREFIX = 'CompanyForm'
const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

// Thumbnail configuration constants
const THUMBNAIL_MAX_WIDTH = 200
const THUMBNAIL_MAX_HEIGHT = 200
const THUMBNAIL_QUALITY = 0.7

export interface CompanyFormProps extends BusinessAppContextProps {
  company?: Company
  onCancel?: () => void
  prefixDataTestId?: string
  childAddButton?: React.ReactNode
  refetch: () => void
  isDrawerActive?: boolean
  structureId: string
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  parentNodeId?: string
  isRootCompany?: boolean
}

const CompanyForm: React.FC<CompanyFormProps> = ({
  company,
  onCancel,
  prefixDataTestId,
  childAddButton,
  accessToken,
  userInfo,
  additionalData,
  refetch,
  isDrawerActive = false,
  structureId,
  open,
  setOpen,
  parentNodeId,
  isRootCompany
}) => {
  const { t } = useTranslation(translations)
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(ORGCHART_BASE_URL)

  const [loading, setLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(company?.directorId || null)
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [picturePreview, setPicturePreview] = useState<string | null>(company?.pictureThumbnail || null)
  // Key to force CatalogSelect.Provider remount when modal closes (resets internal state)
  const [providerKey, setProviderKey] = useState(0)

  // Fetch dynamic fields configuration from catalog
  const { configuration: additionalPropertiesConfig, isLoading: additionalPropertiesLoading } =
    useCompanyAdditionalProperties(accessToken)
  const { employees, loading: searchLoading, search, hasMore, loadMore } = useEmployeeSearch(accessToken)

  const companyData = company as (Company & Partial<CompanyFormData>) | undefined

  // Create validation schema with translations
  const companySchema = useMemo(() => createCompanySchema(t), [t])

  const transformBackendAddressLineToForm = (addressLine?: {
    streetAddress?: string
    addressLine2?: string
    addressLine3?: string
    addressLine4?: string
  }): { lines: string[] } | undefined => {
    if (!addressLine) return undefined

    const lines: string[] = []
    if (addressLine.streetAddress) lines.push(addressLine.streetAddress)
    if (addressLine.addressLine2) lines.push(addressLine.addressLine2)
    if (addressLine.addressLine3) lines.push(addressLine.addressLine3)
    if (addressLine.addressLine4) lines.push(addressLine.addressLine4)

    return lines.length > 0 ? { lines } : undefined
  }

  const transformBackendAddressesToForm = (addresses?: Company['addresses']) => {
    if (!addresses || addresses.length === 0) return []

    return addresses.map(addr => ({
      addressType: addr.addressType,
      addressLine: transformBackendAddressLineToForm(addr.addressLine),
      postalCode: addr.postalCode,
      locality: addr.locality,
      regionRef: addr.regionRef,
      countryRef: addr.countryRef
    }))
  }

  /**
   * Convert file to base64 string
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove data:image/...;base64, prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = () => reject(new Error(t('error-failed-to-read-file')))
    })
  }

  /**
   * Read file as data URL
   */
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e: any) => resolve(e.target.result)
      reader.onerror = () => reject(new Error(t('error-failed-to-read-file')))
      reader.readAsDataURL(file)
    })
  }

  /**
   * Load image from source URL
   */
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(t('error-failed-to-load-image')))
      img.src = src
    })
  }

  /**
   * Load image from file using FileReader
   */
  const loadImageForThumbnail = async (file: File): Promise<HTMLImageElement> => {
    const dataUrl = await readFileAsDataURL(file)
    return await loadImage(dataUrl)
  }

  /**
   * Create thumbnail from image file
   */
  const createThumbnail = async (
    file: File,
    maxWidth: number = THUMBNAIL_MAX_WIDTH,
    maxHeight: number = THUMBNAIL_MAX_HEIGHT
  ): Promise<string> => {
    const img = await loadImageForThumbnail(file)

    const canvas = document.createElement('canvas')
    let width = img.width
    let height = img.height

    // Calculate new dimensions
    if (width > height && width > maxWidth) {
      height = (height * maxWidth) / width
      width = maxWidth
    } else if (height >= width && height > maxHeight) {
      width = (width * maxHeight) / height
      height = maxHeight
    }

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(img, 0, 0, width, height)

    // Get base64 without data URL prefix
    const thumbnail = canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY).split(',')[1]
    return thumbnail
  }

  /**
   * Handle picture file upload
   */
  const handlePictureUpload = async (files: any[]) => {
    if (files.length === 0) {
      setPictureFile(null)
      setPicturePreview(null)
      return
    }

    const file = files[0].file
    if (!(file instanceof File)) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return
    }

    setPictureFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPicturePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const formDefaultValues = useMemo<CompanyFormData>(
    () => ({
      name: companyData?.name || '',
      code: companyData?.code || '',
      description: companyData?.description || '',
      director: companyData?.directorId || '',
      percentage: companyData?.percentage || 0,
      commercial_registration_number: companyData?.commercialRegistrationNumber || '',
      currency: companyData?.currencyRef || '',
      tax_identification_number: companyData?.taxIdentificationNumber || '',
      tax_number: companyData?.taxNumber || '',
      value_added_tax_number: companyData?.valueAddedTaxNumber || '',
      addresses: transformBackendAddressesToForm(companyData?.addresses),
      additionalProperties: (companyData?.additionalProperties as Record<string, unknown>) || {}
    }),
    [companyData]
  )

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: formDefaultValues,
    mode: 'onChange'
  })

  // Sync selectedUserId, picturePreview and form when company changes (e.g., opening form for different company)
  useEffect(() => {
    setSelectedUserId(company?.directorId || null)
    setPictureFile(null)

    // Set picture preview from existing company data
    if (company?.pictureThumbnail) {
      setPicturePreview(`data:image/jpeg;base64,${company.pictureThumbnail}`)
    } else if (company?.picture) {
      setPicturePreview(`data:image/jpeg;base64,${company.picture}`)
    } else {
      setPicturePreview(null)
    }

    form.reset(formDefaultValues)
  }, [company?.id, form, formDefaultValues])

  /**
   * Only the first 4 lines are kept, additional lines are ignored
   */
  const transformAddressLine = (addressLine?: { lines?: string[] }): Record<string, string> | undefined => {
    if (!addressLine?.lines || addressLine.lines.length === 0) return undefined

    // Filter out empty lines first
    const nonEmptyLines = addressLine.lines.filter(line => line?.trim())
    if (nonEmptyLines.length === 0) return undefined

    const result: Record<string, string> = {}

    // Line 1 -> streetAddress
    // Line 2 -> addressLine2
    // Line 3 -> addressLine3
    // Line 4 -> addressLine4
    // Lines 5+ are ignored
    const keyMapping = ['streetAddress', 'addressLine2', 'addressLine3', 'addressLine4']

    nonEmptyLines.slice(0, 4).forEach((line, index) => {
      result[keyMapping[index]] = line.trim()
    })

    return Object.keys(result).length > 0 ? result : undefined
  }

  /**
   * Transform addresses array to backend format
   */
  const transformAddresses = (
    addresses?: CompanyFormData['addresses']
  ): Array<{
    addressType?: string
    addressLine?: Record<string, string>
    postalCode?: string
    locality?: string
    regionRef?: string
    countryRef?: string
  }> => {
    if (!addresses || addresses.length === 0) return []

    return addresses
      .map(addr => {
        const transformed: Record<string, unknown> = {}

        if (addr.addressType) transformed.addressType = addr.addressType
        const addressLine = transformAddressLine(addr.addressLine)
        if (addressLine) transformed.addressLine = addressLine
        if (addr.postalCode) transformed.postalCode = addr.postalCode
        if (addr.locality) transformed.locality = addr.locality
        if (addr.regionRef) transformed.regionRef = addr.regionRef
        if (addr.countryRef) transformed.countryRef = addr.countryRef

        // Only include address if it has meaningful data (not just addressType)
        const hasData = Object.keys(transformed).some(key => key !== 'addressType')
        return hasData ? transformed : null
      })
      .filter(Boolean) as Array<{
      addressType?: string
      addressLine?: Record<string, string>
      postalCode?: string
      locality?: string
      regionRef?: string
      countryRef?: string
    }>
  }

  /**
   * Transform additionalProperties - remove empty values
   */
  const transformAdditionalProperties = (props?: Record<string, unknown>): Record<string, unknown> | undefined => {
    if (!props) return undefined

    const result: Record<string, unknown> = {}
    Object.entries(props).forEach(([key, value]) => {
      // Include if value is not empty string, null, or undefined
      if (value !== '' && value !== null && value !== undefined) {
        result[key] = value
      }
    })

    return Object.keys(result).length > 0 ? result : undefined
  }

  /**
   * Build base payload with required fields
   */
  const buildBasePayload = (formValues: CompanyFormData): Record<string, unknown> => {
    return {
      code: formValues.code,
      name: formValues.name,
      structureId: structureId
    }
  }

  /**
   * Helper function to get string field value or empty string for edit mode
   */
  const getStringFieldValue = (
    value: string | undefined | null,
    originalValue?: string,
    isEditMode?: boolean
  ): string | undefined => {
    if (value) return value
    // In edit mode, send empty string to clear the field if it was previously set
    if (isEditMode && originalValue) return ''
    return undefined // Don't include in payload for create mode
  }

  /**
   * Add optional fields to payload
   */
  const addOptionalFields = (
    payload: Record<string, unknown>,
    formValues: CompanyFormData,
    isEditMode: boolean
  ): void => {
    const description = getStringFieldValue(formValues.description, companyData?.description, isEditMode)
    if (description !== undefined) payload.description = description

    // Director ID - special handling (UUID, not string)
    if (selectedUserId) {
      payload.directorId = selectedUserId
    } else if (isEditMode && companyData?.directorId) {
      payload.directorId = '' // Send empty string to clear director
    }

    const commercialRegNum = getStringFieldValue(
      formValues.commercial_registration_number,
      companyData?.commercialRegistrationNumber,
      isEditMode
    )
    if (commercialRegNum !== undefined) payload.commercialRegistrationNumber = commercialRegNum

    const taxIdNum = getStringFieldValue(
      formValues.tax_identification_number,
      companyData?.taxIdentificationNumber,
      isEditMode
    )
    if (taxIdNum !== undefined) payload.taxIdentificationNumber = taxIdNum

    const taxNum = getStringFieldValue(formValues.tax_number, companyData?.taxNumber, isEditMode)
    if (taxNum !== undefined) payload.taxNumber = taxNum

    const vatNum = getStringFieldValue(formValues.value_added_tax_number, companyData?.valueAddedTaxNumber, isEditMode)
    if (vatNum !== undefined) payload.valueAddedTaxNumber = vatNum

    const currency = getStringFieldValue(formValues.currency, companyData?.currencyRef, isEditMode)
    if (currency !== undefined) payload.currencyRef = currency
  }

  /**
   * Add addresses to payload
   */
  const addAddressesToPayload = (
    payload: Record<string, unknown>,
    formValues: CompanyFormData,
    isEditMode: boolean
  ): void => {
    const transformedAddresses = transformAddresses(formValues.addresses)
    if (transformedAddresses.length > 0) {
      payload.addresses = transformedAddresses
    } else if (isEditMode && companyData?.addresses && companyData.addresses.length > 0) {
      // In edit mode, send empty array to clear addresses if they were removed
      payload.addresses = []
    }
  }

  /**
   * Add additional properties to payload
   */
  const addAdditionalPropertiesToPayload = (
    payload: Record<string, unknown>,
    formValues: CompanyFormData,
    isEditMode: boolean
  ): void => {
    const transformedAdditionalProps = transformAdditionalProperties(formValues.additionalProperties)
    if (isEditMode) {
      // Always include additionalProperties in edit mode - BE will replace entire JSONB
      payload.additionalProperties = transformedAdditionalProps || {}
    } else if (transformedAdditionalProps) {
      // In create mode, only include if there are values
      payload.additionalProperties = transformedAdditionalProps
    }
  }

  /**
   * Add picture to payload (upload or clear)
   */
  const addPictureToPayload = async (payload: Record<string, unknown>, isEditMode: boolean): Promise<void> => {
    if (pictureFile) {
      try {
        const [pictureBase64, thumbnailBase64] = await Promise.all([
          fileToBase64(pictureFile),
          createThumbnail(pictureFile, THUMBNAIL_MAX_WIDTH, THUMBNAIL_MAX_HEIGHT)
        ])
        payload.picture = pictureBase64
        payload.pictureThumbnail = thumbnailBase64
      } catch {
        // Continue without picture if there's an error
      }
    } else if (isEditMode && companyData?.picture && !picturePreview) {
      // Clear picture if it was removed in edit mode
      payload.picture = ''
      payload.pictureThumbnail = ''
    }
  }

  /**
   * Handle percentage update for company edges
   */
  const handlePercentageUpdate = async (formValues: CompanyFormData): Promise<void> => {
    if (
      companyData?.id &&
      formValues.percentage !== undefined &&
      companyData?.percentage !== undefined &&
      formValues.percentage !== companyData.percentage
    ) {
      const updateCompanyEdgesPayload = [
        {
          operation: 'UPDATE',
          edge: {
            id: companyData?.edgeId,
            percentage: formValues.percentage,
            relationshipType: 'hierarchical',
            source: companyData?.parentNodeId,
            target: companyData?.nodeId
          }
        }
      ]

      await restClient.post(`/edges/operations`, updateCompanyEdgesPayload, {
        params: { structureId: structureId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
    }
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    const formValues = values as CompanyFormData
    const isEditMode = Boolean(companyData?.id)

    try {
      setLoading(true)

      // Build payload using helper functions
      const payload = buildBasePayload(formValues)
      addOptionalFields(payload, formValues, isEditMode)
      addAddressesToPayload(payload, formValues, isEditMode)
      addAdditionalPropertiesToPayload(payload, formValues, isEditMode)
      await addPictureToPayload(payload, isEditMode)

      // Include id for update
      if (companyData?.id) {
        payload.id = companyData.id
      }

      const createCompanyPayload = {
        data: {
          companyData: payload
        },
        parentNode: parentNodeId,
        type: 'company'
      }

      // Handle company creation/update
      if (companyData?.id) {
        await restClient.put(`/companies/${companyData?.id}`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } else {
        await restClient.post(`/nodes/${structureId}`, createCompanyPayload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      }

      // Handle percentage update for companyEdges
      await handlePercentageUpdate(formValues)

      refetch()
    } catch {
      // Error handling is done through UI feedback
    } finally {
      setSelectedUserId(null)
      setLoading(false)
      setOpen?.(false)
    }
  }

  // Reset provider when modal closes to clear CatalogSelect internal state
  const handleModalClose = useCallback(() => {
    setProviderKey(prev => prev + 1)
    setSelectedUserId(null)
    setPictureFile(null)
    setPicturePreview(null)
    onCancel?.()
  }, [onCancel])

  return (
    <CatalogSelect.Provider
      key={providerKey}
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
      form={form as any}
    >
      <FormWrapperModal
        childAddButton={childAddButton}
        title={company ? t('modal-title-edit') : t('modal-title-create')}
        description={t('modal-description')}
        onSubmit={handleSubmit}
        onCancel={handleModalClose}
        form={form as any}
        schema={companySchema}
        isEditing={!!company}
        loading={loading}
        dataTestId={dataTestId}
        isDrawerActive={isDrawerActive}
        open={open}
        setOpen={setOpen}
      >
        <FormFieldGroup title={t('section-company-details')}>
          <FormField
            name="name"
            render={({ field }) => (
              <FormItem className="gba:flex-2">
                <FormLabel>{t('label-company-name')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('placeholder-company-name')}
                    {...field}
                    data-testid={`${dataTestId}-name-input`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="code"
            render={({ field }) => (
              <FormItem className="gba:flex-1">
                <FormLabel>{t('label-company-code')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('placeholder-company-code')}
                    {...field}
                    data-testid={`${dataTestId}-code-input`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormFieldGroup>

        {company && !isRootCompany && (
          <FormField
            name="percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('label-holding')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('placeholder-percentage')}
                    value={field.value ? `${field.value}%` : '0%'}
                    onChange={e => {
                      const value = e.target.value.replace('%', '')
                      const numericValue = parseFloat(value) || 0
                      // Clamp the value between 0 and 100
                      const clampedValue = Math.min(Math.max(numericValue, 0), 100)
                      field.onChange(clampedValue)
                    }}
                    onFocus={e => {
                      e.target.select()
                    }}
                    data-testid={`${dataTestId}-holding-input`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('label-description')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('placeholder-description')}
                  rows={3}
                  {...field}
                  data-testid={`${dataTestId}-description-textarea`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Company Picture Upload */}
        <FormItem>
          <FormLabel>{t('label-logo')}</FormLabel>
          <FormControl>
            <div className="gba:space-y-4">
              {picturePreview && (
                <div className="gba:flex gba:items-center gba:gap-4">
                  <Avatar className="gba:w-24 gba:h-24">
                    <AvatarImage src={picturePreview} alt={t('alt-logo-preview')} />
                    <AvatarFallback className="gba:text-2xl">
                      {form.watch('name')?.substring(0, 2).toUpperCase() || t('avatar-fallback')}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => {
                      setPictureFile(null)
                      setPicturePreview(null)
                    }}
                    className="gba:text-sm gba:text-destructive hover:gba:underline"
                    data-testid={`${dataTestId}-picture-remove-button`}
                  >
                    {t('button-remove')}
                  </button>
                </div>
              )}
              <FileUpload
                multiple={false}
                accept="image/*"
                onChange={handlePictureUpload}
                dataTestId={`${dataTestId}-picture-upload`}
              />
              <p className="gba:text-sm gba:text-muted-foreground">{t('message-logo-upload-info')}</p>
            </div>
          </FormControl>
        </FormItem>

        {/* Director field */}
        <FormField
          name="director"
          render={() => (
            <FormItem>
              <FormLabel>{t('label-director')}</FormLabel>
              <FormControl>
                <EmployeeSelect
                  value={selectedUserId}
                  employees={employees}
                  onValueChange={setSelectedUserId}
                  onSearch={search}
                  loading={searchLoading}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  placeholder={t('placeholder-director')}
                  searchPlaceholder={t('placeholder-director-search')}
                  data-testid="director"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormFieldGroup>
          <FormField
            name="commercial_registration_number"
            render={({ field }) => (
              <FormItem className="gba:flex-1">
                <FormLabel>{t('label-commercial-registration-number')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('placeholder-commercial-registration')}
                    {...field}
                    data-testid={`${dataTestId}-commercial-registration-number-input`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="currency"
            render={({ field }) => (
              <FormItem className="gba:flex-1">
                <FormLabel>{t('label-currency')}</FormLabel>
                <FormControl>
                  <CatalogSelect catalogIdentifier="Currency:v1" value={field.value} onValueChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </FormFieldGroup>

        {/* Address information */}
        <div data-testid={`${dataTestId}-addresses-section`}>
          <FormSection title={t('section-address-information')} value="company-addresses">
            <AddressSegment />
          </FormSection>
        </div>

        {/* Tax Details */}
        <div data-testid={`${dataTestId}-tax-details-section`}>
          <FormSection title={t('section-tax-details')} value="company-tax-details">
            <FormField
              name="tax_identification_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label-tax-identification-number')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('placeholder-tax-identification')}
                      {...field}
                      data-testid={`${dataTestId}-tax-identification-number-input`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="tax_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label-tax-number')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('placeholder-tax-number')}
                      {...field}
                      data-testid={`${dataTestId}-tax-number-input`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="value_added_tax_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label-vat-number')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('placeholder-vat-number')}
                      {...field}
                      data-testid={`${dataTestId}-value-added-tax-number-input`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>
        </div>

        {/* Dynamic Additional Properties from Catalog */}
        {additionalPropertiesConfig && (
          <div data-testid={`${dataTestId}-additional-properties-section`}>
            <DynamicForm
              configuration={additionalPropertiesConfig}
              control={form.control}
              accessToken={accessToken}
              testIdPrefix={dataTestId}
              isLoading={additionalPropertiesLoading}
              error={null}
              emptyMessage={t('message-no-additional-properties')}
            />
          </div>
        )}
      </FormWrapperModal>
    </CatalogSelect.Provider>
  )
}

export default CompanyForm
