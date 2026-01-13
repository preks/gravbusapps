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
  FormFieldGroup
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

// Address schema for validation
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

// Zod validation schema
const companySchema = z.object({
  name: z.string().min(1, 'Please enter company name'),
  code: z.string().min(1, 'Please enter company code'),
  description: z.string().optional(),
  director: z.string().optional(),
  percentage: z
    .number()
    .min(0, 'Percentage cannot be less than 0%')
    .max(100, 'Percentage cannot be greater than 100%')
    .optional(),
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

export type CompanyFormData = z.infer<typeof companySchema>

const DATA_TEST_ID_PREFIX = 'CompanyForm'
const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

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
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(ORGCHART_BASE_URL)

  const [loading, setLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(company?.directorId || null)
  // Key to force CatalogSelect.Provider remount when modal closes (resets internal state)
  const [providerKey, setProviderKey] = useState(0)

  // Fetch dynamic fields configuration from catalog
  const { configuration: additionalPropertiesConfig, isLoading: additionalPropertiesLoading } =
    useCompanyAdditionalProperties(accessToken)
  const { employees, loading: searchLoading, search, hasMore, loadMore } = useEmployeeSearch(accessToken)

  const companyData = company as (Company & Partial<CompanyFormData>) | undefined

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

  // Sync selectedUserId and form when company changes (e.g., opening form for different company)
  useEffect(() => {
    setSelectedUserId(company?.directorId || null)
    form.reset(formDefaultValues)
  }, [company?.id, form, formDefaultValues])

  /**
   * Only the first 4 lines are kept, additional lines are ignored
   */
  const transformAddressLine = (addressLine?: { lines?: string[] }): Record<string, string> | undefined => {
    if (!addressLine?.lines || addressLine.lines.length === 0) return undefined

    // Filter out empty lines first
    const nonEmptyLines = addressLine.lines.filter(line => line && line.trim())
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

  const handleSubmit = async (values: Record<string, unknown>) => {
    const formValues = values as CompanyFormData
    const isEditMode = Boolean(companyData?.id)

    try {
      setLoading(true)
      const payload: Record<string, unknown> = {
        code: formValues.code,
        name: formValues.name,
        structureId: structureId
      }

      // Helper function to get string field value or empty string for edit mode
      // Backend ignores null, so we send empty string to clear fields
      const getStringFieldValue = (value: string | undefined | null, originalValue?: string): string | undefined => {
        if (value) return value
        // In edit mode, send empty string to clear the field if it was previously set
        if (isEditMode && originalValue) return ''
        return undefined // Don't include in payload for create mode
      }

      // Optional string fields - include empty string in edit mode if field was cleared
      const description = getStringFieldValue(formValues.description, companyData?.description)
      if (description !== undefined) payload.description = description

      // Director ID - special handling (UUID, not string)
      if (selectedUserId) {
        payload.directorId = selectedUserId
      } else if (isEditMode && companyData?.directorId) {
        payload.directorId = '' // Send empty string to clear director
      }

      const commercialRegNum = getStringFieldValue(
        formValues.commercial_registration_number,
        companyData?.commercialRegistrationNumber
      )
      if (commercialRegNum !== undefined) payload.commercialRegistrationNumber = commercialRegNum

      const taxIdNum = getStringFieldValue(formValues.tax_identification_number, companyData?.taxIdentificationNumber)
      if (taxIdNum !== undefined) payload.taxIdentificationNumber = taxIdNum

      const taxNum = getStringFieldValue(formValues.tax_number, companyData?.taxNumber)
      if (taxNum !== undefined) payload.taxNumber = taxNum

      const vatNum = getStringFieldValue(formValues.value_added_tax_number, companyData?.valueAddedTaxNumber)
      if (vatNum !== undefined) payload.valueAddedTaxNumber = vatNum

      const currency = getStringFieldValue(formValues.currency, companyData?.currencyRef)
      if (currency !== undefined) payload.currencyRef = currency

      // Transform and include addresses
      const transformedAddresses = transformAddresses(formValues.addresses)
      if (transformedAddresses.length > 0) {
        payload.addresses = transformedAddresses
      } else if (isEditMode && companyData?.addresses && companyData.addresses.length > 0) {
        // In edit mode, send empty array to clear addresses if they were removed
        payload.addresses = []
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
        await restClient.put(`/companies/${companyData?.id}`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } else {
        await restClient.post(`/nodes/${structureId}`, createCompanyPayload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      }

      // Handle percentage update for companyEdges (only if percentage changed)
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

      refetch()
    } catch (error) {
      console.error('Form submission error:', error)
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
        title={company ? 'Edit Company' : 'Create Company'}
        description="Enter company details"
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
        <FormFieldGroup title="Company Details">
          <FormField
            name="name"
            render={({ field }) => (
              <FormItem className="gba:flex-2">
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g.: Acme Corporation" {...field} data-testid={`${dataTestId}-name-input`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="code"
            render={({ field }) => (
              <FormItem className="gba:flex-1">
                <FormLabel>Company Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g.: ACME-001" {...field} data-testid={`${dataTestId}-code-input`} />
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
                <FormLabel>Holding</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0%"
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g.: Main headquarters..."
                  rows={3}
                  {...field}
                  data-testid={`${dataTestId}-description-textarea`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Director field */}
        <FormField
          name="director"
          render={() => (
            <FormItem>
              <FormLabel>Director</FormLabel>
              <FormControl>
                <EmployeeSelect
                  value={selectedUserId}
                  employees={employees}
                  onValueChange={setSelectedUserId}
                  onSearch={search}
                  loading={searchLoading}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  placeholder="Select director"
                  searchPlaceholder="Search by name..."
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
                <FormLabel>Commercial Registration Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g.: CRN123456"
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
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <CatalogSelect catalogIdentifier="Currency:v1" value={field.value} onValueChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </FormFieldGroup>

        {/* Address information */}
        <div data-testid={`${dataTestId}-addresses-section`}>
          <FormSection title="Address Information" value="company-addresses">
            <AddressSegment />
          </FormSection>
        </div>

        {/* Tax Details */}
        <div data-testid={`${dataTestId}-tax-details-section`}>
          <FormSection title="Company Tax Details" value="company-tax-details">
            <FormField
              name="tax_identification_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Identification Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g.: TIN123456789"
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
                  <FormLabel>Tax Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g.: 123456789" {...field} data-testid={`${dataTestId}-tax-number-input`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="value_added_tax_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value Added Tax Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g.: VAT123456789"
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
              emptyMessage="No additional properties"
            />
          </div>
        )}
      </FormWrapperModal>
    </CatalogSelect.Provider>
  )
}

export default CompanyForm
