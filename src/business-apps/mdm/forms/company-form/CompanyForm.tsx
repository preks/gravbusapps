import React, { Dispatch, SetStateAction, useState, useMemo } from 'react'
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
  commercial_registration_number: z.string().min(1, 'Please enter commercial registration number').optional(),
  currency: z.string().optional(),
  tax_identification_number: z.string().min(1, 'Please enter tax identification number').optional(),
  tax_number: z.string().min(1, 'Please enter tax number').optional(),
  value_added_tax_number: z.string().min(1, 'Please enter value added tax number').optional()
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

  const companyData = company as (Company & Partial<CompanyFormData>) | undefined

  // Calculează defaultValues pentru form
  const formDefaultValues = useMemo<CompanyFormData>(
    () => ({
      name: companyData?.name || '',
      code: companyData?.code || '',
      description: companyData?.description || '',
      director: companyData?.director || '',
      percentage: companyData?.percentage || 0,
      commercial_registration_number: companyData?.commercial_registration_number || '',
      currency: companyData?.currency || '',
      tax_identification_number: companyData?.tax_identification_number || '',
      tax_number: companyData?.tax_number || '',
      value_added_tax_number: companyData?.value_added_tax_number || ''
    }),
    [companyData]
  )

  // Creează form-ul extern pentru a-l partaja cu CatalogSelect.Provider
  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: formDefaultValues,
    mode: 'onChange'
  })

  const handleSubmit = async (values: Record<string, unknown>) => {
    const formValues = values as CompanyFormData
    console.log('formValues', formValues)

    try {
      setLoading(true)
      const payload = {
        code: formValues.code,
        name: formValues.name,
        structureId: structureId,
        tax_number: formValues.tax_number,
        ...(formValues.description ? { description: formValues.description } : {}),
        ...(companyData?.id ? { id: companyData.id } : {})
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
        await restClient.put(`/companies/${companyData.id}`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } else {
        await restClient.post(`/nodes/${structureId}`, createCompanyPayload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      }

      // Handle percentage update for companyEdges (only if percentage changed)
      if (companyData?.id && formValues.percentage !== undefined && formValues.percentage !== companyData.percentage) {
        const updateCompanyEdgesPayload = [
          {
            operation: 'UPDATE',
            edge: {
              id: companyData.edgeId,
              percentage: formValues.percentage,
              relationshipType: 'hierarchical',
              source: companyData.parentNodeId,
              target: companyData.nodeId
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
      console.error('Form validation error:', error)
    } finally {
      setLoading(false)
      setOpen?.(false)
    }
  }

  return (
    <CatalogSelect.Provider
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
      form={form as any}
    >
      <FormWrapperModal
        childAddButton={childAddButton}
        title={company ? 'Edit Company' : 'Create Company'}
        description="Configure company details and information"
        onSubmit={handleSubmit}
        onCancel={onCancel}
        form={form as any}
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
                  <Input
                    placeholder="e.g., NEWWORK Software GmbH, NEWWORK Software Inc."
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
                <FormLabel>Company Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., NW" {...field} data-testid={`${dataTestId}-code-input`} />
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
                  placeholder="Describe this company and its business activities"
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
                <EmployeeSelect />
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
                    placeholder="e.g., 1234567890"
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
            render={() => (
              <FormItem className="gba:flex-1">
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <CatalogSelect catalogIdentifier="Currency:v1" />
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
                      placeholder="e.g., 1234567890"
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
                    <Input placeholder="e.g., 1234567890" {...field} data-testid={`${dataTestId}-tax-number-input`} />
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
                      placeholder="e.g., 1234567890"
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
      </FormWrapperModal>
    </CatalogSelect.Provider>
  )
}

export default CompanyForm
