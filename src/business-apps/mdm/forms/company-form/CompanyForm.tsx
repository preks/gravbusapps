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
  useTranslation,
  Combobox
} from '@newwork/nw-design-system'
import type { Company, CompanyAddress, Director } from '../../apps/organizational-data/types'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AddressSegment } from '@/common/components/common-relations/form-segments/address-segment'
import { EmployeeSelect } from '@/components/employee-select'
import { CatalogSelect } from '@/components/catalog-select'
import { DynamicForm } from '@/components/dynamic-form'
import { useCompanyAdditionalProperties } from '../../hooks/useCompanyAdditionalProperties'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import translations from './_i18n'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

// Helper to validate no leading whitespace (trailing will be trimmed on submit)
const noLeadingWhitespace = (value: string) => value === value.trimStart()

/** Build EmployeeLiteOption from company.director so useEmployeeSearch can show director in the list when not in first 20 results */
function directorToEmployeeLiteOption(director: Director): EmployeeLiteOption {
  const displayName =
    director.displayName || `${director.firstName || ''} ${director.lastName || ''}`.trim() || 'Unknown'
  return {
    id: director.id,
    displayName,
    firstName: director.firstName,
    lastName: director.lastName,
    pictureThumbnail: director.pictureThumbnail
  }
}

// Address schema for validation (id and companyId preserved for existing addresses)
const createAddressSchema = (t: (key: string) => string) =>
  z.object({
    id: z.string().optional(),
    companyId: z.string().optional(),
    addressType: z.string().optional(),
    addressLine: z
      .object({
        lines: z.array(z.string().max(20, t('validation-address-line-max'))).optional()
      })
      .optional(),
    postalCode: z
      .string()
      .max(20, t('validation-postal-code-max'))
      .refine(val => !val || noLeadingWhitespace(val), t('validation-no-leading-whitespace'))
      .optional(),
    locality: z
      .string()
      .max(20, t('validation-locality-max'))
      .refine(val => !val || noLeadingWhitespace(val), t('validation-no-leading-whitespace'))
      .optional(),
    regionRef: z.string().optional(),
    countryRef: z.string().optional()
  })

/**
 * Create validation schema with translations
 */
const createCompanySchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .min(1, t('validation-name-required'))
      .max(64, t('validation-company-name-max'))
      .refine(val => !val || noLeadingWhitespace(val), t('validation-no-leading-whitespace')),
    code: z
      .string()
      .min(1, t('validation-code-required'))
      .max(20, t('validation-company-code-max'))
      .refine(val => !val || noLeadingWhitespace(val), t('validation-no-leading-whitespace')),
    description: z
      .string()
      .max(100, t('validation-description-max'))
      .refine(val => !val || noLeadingWhitespace(val), t('validation-no-leading-whitespace'))
      .optional(),
    director: z.string().optional(),
    percentage: z.number().min(0, t('validation-percentage-min')).max(100, t('validation-percentage-max')).optional(),
    commercial_registration_number: z
      .string()
      .max(20, t('validation-commercial-registration-number-max'))
      .refine(val => !val || noLeadingWhitespace(val), t('validation-no-leading-whitespace'))
      .optional(),
    currency: z.string().optional(),
    tax_identification_number: z
      .string()
      .max(20, t('validation-tax-identification-number-max'))
      .refine(val => !val || noLeadingWhitespace(val), t('validation-no-leading-whitespace'))
      .optional(),
    tax_number: z
      .string()
      .max(20, t('validation-tax-number-max'))
      .refine(val => !val || noLeadingWhitespace(val), t('validation-no-leading-whitespace'))
      .optional(),
    value_added_tax_number: z
      .string()
      .max(20, t('validation-value-added-tax-number-max'))
      .refine(val => !val || noLeadingWhitespace(val), t('validation-no-leading-whitespace'))
      .optional(),
    // Addresses array for AddressSegment
    addresses: z.array(createAddressSchema(t)).optional(),
    // Dynamic additional properties from catalog
    additionalProperties: z.record(z.string(), z.unknown()).optional(),
    // Hidden field for dirty tracking when user uploads/removes picture (not stored in backend)
    pictureModified: z.boolean().optional()
  })

export type CompanyFormData = z.infer<ReturnType<typeof createCompanySchema>>

const DATA_TEST_ID_PREFIX = 'CompanyForm'

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
  const orgchartClient = useOrgchartClient(accessToken)

  const [loading, setLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(company?.directorId || null)
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [picturePreview, setPicturePreview] = useState<string | null>(company?.pictureThumbnail || null)
  // Key to force CatalogSelect.Provider remount when modal closes (resets internal state)
  const [providerKey, setProviderKey] = useState(0)
  // Key to force FileUpload remount when logo is removed (clears its internal file list)
  const [logoFileUploadKey, setLogoFileUploadKey] = useState(0)

  // Director from company (tree enriches with director) – we prepend them at top of list so they’re always visible
  const directorFromCompany = useMemo(
    () => (company?.director ? directorToEmployeeLiteOption(company.director) : undefined),
    [company?.director]
  )

  // Fetch dynamic fields configuration from catalog
  const { configuration: additionalPropertiesConfig, isLoading: additionalPropertiesLoading } =
    useCompanyAdditionalProperties(accessToken)
  const { employees, loading: searchLoading, search, hasMore, loadMore } = useEmployeeSearch(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  // When we have a director: if hook list is still empty, pass it through so select triggers initial search (no race with user search).
  // Once hook has results, prepend director and drop duplicate from results.
  const employeesForSelect = useMemo(() => {
    if (!directorFromCompany || !company?.directorId) return employees
    if (employees.length === 0) return employees
    return [directorFromCompany, ...employees.filter(e => e.id !== company.directorId)]
  }, [directorFromCompany, company?.directorId, employees])

  const companyData = company as (Company & Partial<CompanyFormData>) | undefined

  // Create validation schema with translations
  const companySchema = useMemo(() => createCompanySchema(t), [t])
  // Fetch currency catalog entries to display codes instead of values
  const [currencyOptions, setCurrencyOptions] = useState<Array<{ value: string; label: string }>>([])
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const [currencySearchQuery, setCurrencySearchQuery] = useState('')

  useEffect(() => {
    const loadCurrencyOptions = async () => {
      if (!accessToken) return
      setCurrencyLoading(true)
      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'Currency',
            version: 'v1'
          },
          {
            limit: 200,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: false
          }
        )

        const catalogEntries = response?.data || []
        const options = catalogEntries.map(entry => ({
          value: entry.id,
          label: entry.code || entry.value || entry.id // Use code if available, fallback to value
        }))

        // Sort by code for better UX
        options.sort((a, b) => a.label.localeCompare(b.label))
        setCurrencyOptions(options)
      } catch (error) {
        console.error('Failed to load currency options:', error)
        setCurrencyOptions([])
      } finally {
        setCurrencyLoading(false)
      }
    }
    loadCurrencyOptions()
  }, [accessToken, catalogClient])

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
      id: addr.id,
      companyId: addr.companyId,
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
      form.setValue('pictureModified', true, { shouldDirty: true })
      return
    }

    const file = files[0].file
    if (!(file instanceof File)) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return
    }

    setPictureFile(file)
    form.setValue('pictureModified', true, { shouldDirty: true })

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
      addresses:
        transformBackendAddressesToForm(companyData?.addresses)?.map(addr => ({
          ...addr,
          companyId: addr.companyId ?? companyData?.id
        })) ?? [],
      additionalProperties: (companyData?.additionalProperties as Record<string, unknown>) || {},
      pictureModified: false
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
      setPicturePreview(`data:image/jpeg;base64,${company.picture.additionalProp1}`)
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
   * Transform addresses array to backend shape (no changeMode).
   * Preserves id for existing addresses.
   */
  const transformAddresses = (
    addresses?: CompanyFormData['addresses']
  ): Array<{
    id?: string
    companyId?: string
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

        if (addr.id) transformed.id = addr.id
        if (addr.companyId) transformed.companyId = addr.companyId
        if (addr.addressType) transformed.addressType = addr.addressType
        const addressLine = transformAddressLine(addr.addressLine)
        if (addressLine) transformed.addressLine = addressLine
        if (addr.postalCode) transformed.postalCode = addr.postalCode
        if (addr.locality) transformed.locality = addr.locality
        if (addr.regionRef) transformed.regionRef = addr.regionRef
        if (addr.countryRef) transformed.countryRef = addr.countryRef

        const hasData = Object.keys(transformed).some(key => !['id', 'companyId', 'addressType'].includes(key))
        return hasData ? transformed : null
      })
      .filter(Boolean) as Array<{
      id?: string
      companyId?: string
      addressType?: string
      addressLine?: Record<string, string>
      postalCode?: string
      locality?: string
      regionRef?: string
      countryRef?: string
    }>
  }

  type AddressPayloadFields = {
    id?: string
    companyId?: string
    addressType?: string
    addressLine?: Record<string, string>
    postalCode?: string
    locality?: string
    regionRef?: string
    countryRef?: string
  }

  type AddressChangePayload =
    | ({ changeMode: 'UPSERT' } & AddressPayloadFields)
    | ({ changeMode: 'DELETE' } & AddressPayloadFields)

  /**
   * Build addresses payload as delta only: UPSERT for create/update, DELETE for removed.
   * Empty array means "delete all" when in edit mode and company had addresses.
   * Each address includes companyId when available (from form or companyId param for new addresses).
   */
  const buildAddressesDelta = (
    formAddresses: CompanyFormData['addresses'],
    originalAddresses: Company['addresses'] | undefined,
    isEditMode: boolean,
    companyId?: string
  ): AddressChangePayload[] => {
    const transformed = transformAddresses(formAddresses)

    if (isEditMode && originalAddresses && originalAddresses.length > 0 && transformed.length === 0) {
      return []
    }

    const originalIds = (originalAddresses?.map(a => a.id).filter(Boolean) ?? []) as string[]
    const currentIds = transformed.map(a => a.id).filter(Boolean) as string[]
    const deletedIds = originalIds.filter(id => !currentIds.includes(id))

    const upserts: AddressChangePayload[] = transformed.map(addr => ({
      changeMode: 'UPSERT' as const,
      ...addr,
      ...(companyId && !addr.companyId && { companyId })
    }))

    const originalById = new Map<string, CompanyAddress>(
      (originalAddresses ?? []).filter((a): a is CompanyAddress & { id: string } => Boolean(a.id)).map(a => [a.id, a])
    )
    const deletes: AddressChangePayload[] = deletedIds
      .map(id => {
        const addr = originalById.get(id)
        if (!addr) return null
        return { changeMode: 'DELETE' as const, ...addr }
      })
      .filter(Boolean) as AddressChangePayload[]

    return [...upserts, ...deletes]
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
      code: formValues.code.trim(),
      name: formValues.name.trim(),
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
   * Add addresses to payload as delta only (UPSERT for create/update, DELETE for removed).
   * Empty array = delete all when in edit and company had addresses.
   */
  const addAddressesToPayload = (
    payload: Record<string, unknown>,
    formValues: CompanyFormData,
    isEditMode: boolean
  ): void => {
    const addressesDelta = buildAddressesDelta(
      formValues.addresses,
      companyData?.addresses,
      isEditMode,
      companyData?.id
    )
    if (addressesDelta.length > 0 || (isEditMode && companyData?.addresses && companyData.addresses.length > 0)) {
      payload.addresses = addressesDelta
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
        payload.picture = { additionalProp1: pictureBase64 }
        payload.pictureThumbnail = thumbnailBase64
      } catch {
        // Continue without picture if there's an error
      }
    } else if (isEditMode && companyData?.picture && !picturePreview) {
      // Clear picture if it was removed in edit mode
      payload.picture = {}
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

      await orgchartClient.updateCompanyEdges(
        updateCompanyEdgesPayload,
        { structureId },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
    }
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    const formValues = values as CompanyFormData
    const isEditMode = Boolean(companyData?.id)

    // Trim all string values before processing
    const trimmedData = {
      ...formValues,
      name: formValues.name?.trim() || '',
      code: formValues.code?.trim() || '',
      description: formValues.description?.trim() || '',
      commercial_registration_number: formValues.commercial_registration_number?.trim() || '',
      tax_identification_number: formValues.tax_identification_number?.trim() || '',
      tax_number: formValues.tax_number?.trim() || '',
      value_added_tax_number: formValues.value_added_tax_number?.trim() || ''
    }

    try {
      setLoading(true)

      // Build payload using helper functions
      const payload = buildBasePayload(formValues)
      addOptionalFields(payload, formValues, isEditMode)
      addAddressesToPayload(payload, formValues, isEditMode)
      addAdditionalPropertiesToPayload(payload, formValues, isEditMode)
      await addPictureToPayload(payload, isEditMode)

      // Optional string fields - include empty string in edit mode if field was cleared
      const description = getStringFieldValue(trimmedData.description, companyData?.description, isEditMode)
      if (description !== undefined) payload.description = description

      // Director ID - special handling (UUID, not string)
      if (selectedUserId) {
        payload.directorId = selectedUserId
      } else if (isEditMode && companyData?.directorId) {
        payload.directorId = '' // Send empty string to clear director
      }

      const commercialRegNum = getStringFieldValue(
        trimmedData.commercial_registration_number,
        companyData?.commercialRegistrationNumber,
        isEditMode
      )
      if (commercialRegNum !== undefined) payload.commercialRegistrationNumber = commercialRegNum

      const taxIdNum = getStringFieldValue(
        trimmedData.tax_identification_number,
        companyData?.taxIdentificationNumber,
        isEditMode
      )
      if (taxIdNum !== undefined) payload.taxIdentificationNumber = taxIdNum

      const taxNum = getStringFieldValue(trimmedData.tax_number, companyData?.taxNumber, isEditMode)
      if (taxNum !== undefined) payload.taxNumber = taxNum

      const vatNum = getStringFieldValue(
        trimmedData.value_added_tax_number,
        companyData?.valueAddedTaxNumber,
        isEditMode
      )
      if (vatNum !== undefined) payload.valueAddedTaxNumber = vatNum

      const currency = getStringFieldValue(trimmedData.currency, companyData?.currencyRef, isEditMode)
      if (currency !== undefined) payload.currencyRef = currency

      // Include addresses as delta (UPSERT/DELETE only)
      const addressesDelta = buildAddressesDelta(
        formValues.addresses,
        companyData?.addresses,
        isEditMode,
        companyData?.id
      )
      if (addressesDelta.length > 0 || (isEditMode && companyData?.addresses && companyData.addresses.length > 0)) {
        payload.addresses = addressesDelta
      }

      // Transform and include additionalProperties
      const transformedAdditionalProps = transformAdditionalProperties(formValues.additionalProperties)
      if (isEditMode) {
        // Always include additionalProperties in edit mode - BE will replace entire JSONB
        payload.additionalProperties = transformedAdditionalProps || {}
      } else if (transformedAdditionalProps) {
        // In create mode, only include if there are values
        payload.additionalProperties = transformedAdditionalProps
      }

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
        await orgchartClient.updateCompany(companyData.id, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } else {
        await orgchartClient.createCompanyNode(structureId, createCompanyPayload, {
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
    setLogoFileUploadKey(prev => prev + 1)
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
                    value={field.value ? `${field.value}%` : t('percentage-default-value')}
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
                      setLogoFileUploadKey(prev => prev + 1)
                      form.setValue('pictureModified', true, { shouldDirty: true })
                    }}
                    className="gba:text-sm gba:text-destructive hover:gba:underline"
                    data-testid={`${dataTestId}-picture-remove-button`}
                  >
                    {t('button-remove')}
                  </button>
                </div>
              )}
              <FileUpload key={logoFileUploadKey} multiple={false} accept="image/*" onChange={handlePictureUpload} />
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
                  employees={employeesForSelect}
                  onValueChange={value => {
                    setSelectedUserId(value)
                    form.setValue('director', value ?? '', { shouldDirty: true })
                  }}
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
            render={({ field }) => {
              // Filter options based on search query
              const filteredOptions = currencySearchQuery
                ? currencyOptions.filter(option =>
                    option.label.toLowerCase().includes(currencySearchQuery.toLowerCase())
                  )
                : currencyOptions

              return (
                <FormItem className="gba:flex-1">
                  <FormLabel>{t('label-currency')}</FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={filteredOptions}
                      placeholder={t('placeholder-currency')}
                      searchPlaceholder={t('placeholder-currency-search')}
                      emptyText={currencyLoading ? t('message-currency-loading') : t('message-currency-no-results')}
                      onSearch={setCurrencySearchQuery}
                      searchDebounce={300}
                      loading={currencyLoading}
                      disabled={currencyLoading}
                      data-testid={`${dataTestId}-currency-select`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
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
