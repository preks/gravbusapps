import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CatalogSelect, CatalogSelectProvider } from '@/components/catalog-select'

/**
 * Enhanced CatalogSelect Example Form
 *
 * This form demonstrates the enhanced catalog select configuration that supports:
 * - Multiple instances of the same catalog (Birth Country vs Residence Country)
 * - Explicit version specification (all catalogs use ":v1")
 * - Simplified bi-directional dependencies using parentConfigId/childConfigId
 * - Uni-directional dependencies (InvestmentGroup -> InvestmentType)
 * - External filtering (Pipeline Type filters Pipeline Stage)
 *
 * Key features:
 * - Same catalog (Country:v1) used for both birth and residence
 * - Clean dependency syntax: parentConfigId for filtering, childConfigId for bi-directional
 * - Instance IDs separate from catalog identifiers
 */
const ExampleCatalogSelectForm: React.FC<BusinessAppContextProps> = context => {
  type FormValues = {
    birthCountry: string
    birthRegion: string
    residenceCountry: string
    residenceRegion: string
    language: string
    investmentGroup: string
    investmentType: string
    pipelineType: string
    pipelineStage: string
    content_type: string
  }

  const schema = z.object({
    language: z.string().min(1, 'Language is required'),
    birthCountry: z.string().min(1, 'Birth Country is required'),
    birthRegion: z.string().min(1, 'Birth Region is required'),
    residenceCountry: z.string().min(1, 'Residence Country is required'),
    residenceRegion: z.string().min(1, 'Residence Region is required'),
    investmentGroup: z.string().min(1, 'InvestmentGroup is required'),
    investmentType: z.string().min(1, 'InvestmentType is required'),
    pipelineType: z.string().min(1, 'Type is required'),
    pipelineStage: z.string().min(1, 'Pipeline Stage is required'),
    content_type: z.string().min(1, 'Content Type is required')
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      birthCountry: '',
      birthRegion: '',
      residenceCountry: '',
      residenceRegion: '',
      language: '',
      investmentGroup: '',
      investmentType: '',
      pipelineType: '',
      pipelineStage: '',
      content_type: ''
    },
    mode: 'onSubmit'
  })

  const catalogsConfig = React.useMemo(
    () => [
      // standalone Language
      { id: 'language', catalogIdentifier: 'Language:v1', prefetch: true, pageSize: 25 },

      // a) Multiple Country instances - Birth Country/Region (bi-directional)
      {
        id: 'birthCountry',
        catalogIdentifier: 'Country:v1',
        prefetch: true,
        pageSize: 25,
        childConfigId: 'birthRegion'
      },
      {
        id: 'birthRegion',
        catalogIdentifier: 'CountryRegion:v1',
        prefetch: true,
        pageSize: 25,
        parentConfigId: 'birthCountry'
      },

      // b) Multiple Country instances - Residence Country/Region (bi-directional)
      {
        id: 'residenceCountry',
        catalogIdentifier: 'Country:v1',
        prefetch: true,
        pageSize: 25,
        childConfigId: 'residenceRegion'
      },
      {
        id: 'residenceRegion',
        catalogIdentifier: 'CountryRegion:v1',
        prefetch: true,
        pageSize: 25,
        parentConfigId: 'residenceCountry'
      },

      // c) Uni-directional InvestmentGroup -> InvestmentType
      { id: 'investmentGroup', catalogIdentifier: 'InvestmentGroup:v1', prefetch: true, pageSize: 25 },
      {
        id: 'investmentType',
        catalogIdentifier: 'InvestmentType:v1',
        prefetch: true,
        pageSize: 25,
        parentConfigId: 'investmentGroup',
        requireSourceForEnable: true
      },

      // d) External Type -> InvestmentOpportunityPipelineStage
      {
        id: 'pipelineStage',
        catalogIdentifier: 'InvestmentOpportunityPipelineStage:v1',
        prefetch: true,
        pageSize: 25,
        requireSourceForEnable: true,
        externalEqualsFilters: [{ externalKey: 'pipelineType', field: 'type' }]
      },

      // standalone Content Type
      { id: 'contentType', catalogIdentifier: 'content_type:v1', prefetch: true, pageSize: 25 }
    ],
    []
  )

  const handleSubmit = React.useCallback(async (data: FormValues) => {
    return data
  }, [])

  const handleCancel = React.useCallback(() => {
    form.reset()
  }, [form])

  return (
    <AppActionForm
      processType="custom"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      formData={form.getValues()}
      businessAppContext={context}
      form={form}
      data-testid="example-catalog-select-form"
    >
      <CatalogSelectProvider
        {...context}
        configs={catalogsConfig}
        externalValues={{ pipelineType: form.watch('pipelineType') || null }}
      >
        {/* standalone Language on one line */}
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem data-testid="language-field">
              <FormLabel data-testid="language-label">Language</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogInstanceId="language"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="language-combobox"
                  {...context}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* a) Birth Country <-> Birth Region on one line */}
        <div
          className="gba:flex gba:items-start gba:justify-between gba:flex-wrap gba:sm:flex-nowrap gba:w-full gba:gap-2"
          data-testid="row-birth-country-region"
        >
          <FormField
            control={form.control}
            name="birthCountry"
            render={({ field }) => (
              <FormItem className="gba:w-full" data-testid="birth-country-field">
                <FormLabel data-testid="birth-country-label">Birth Country</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogInstanceId="birthCountry"
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v)}
                    data-testid="birth-country-combobox"
                    {...context}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="birthRegion"
            render={({ field }) => (
              <FormItem className="gba:w-full" data-testid="birth-region-field">
                <FormLabel data-testid="birth-region-label">Birth Region</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogInstanceId="birthRegion"
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v)}
                    data-testid="birth-region-combobox"
                    {...context}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* b) Residence Country <-> Residence Region on one line */}
        <div
          className="gba:flex gba:items-start gba:justify-between gba:flex-wrap gba:sm:flex-nowrap gba:w-full gba:gap-2"
          data-testid="row-residence-country-region"
        >
          <FormField
            control={form.control}
            name="residenceCountry"
            render={({ field }) => (
              <FormItem className="gba:w-full" data-testid="residence-country-field">
                <FormLabel data-testid="residence-country-label">Residence Country</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogInstanceId="residenceCountry"
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v)}
                    data-testid="residence-country-combobox"
                    {...context}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="residenceRegion"
            render={({ field }) => (
              <FormItem className="gba:w-full" data-testid="residence-region-field">
                <FormLabel data-testid="residence-region-label">Residence Region</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogInstanceId="residenceRegion"
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v)}
                    data-testid="residence-region-combobox"
                    {...context}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* c) InvestmentGroup -> InvestmentType on one line */}
        <div
          className="gba:flex gba:items-start gba:justify-between gba:flex-wrap gba:sm:flex-nowrap gba:w-full gba:gap-2"
          data-testid="row-unidir-investment-group-type"
        >
          <FormField
            control={form.control}
            name="investmentGroup"
            render={({ field }) => (
              <FormItem className="gba:w-full" data-testid="investment-group-field">
                <FormLabel data-testid="investment-group-label">InvestmentGroup</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogInstanceId="investmentGroup"
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v)}
                    data-testid="investment-group-combobox"
                    {...context}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="investmentType"
            render={({ field }) => (
              <FormItem className="gba:w-full" data-testid="investment-type-field">
                <FormLabel data-testid="investment-type-label">InvestmentType</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogInstanceId="investmentType"
                    variant="select"
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v)}
                    data-testid="investment-type-combobox"
                    {...context}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* d) External Type -> InvestmentOpportunityPipelineStage on one line */}
        <div
          className="gba:flex gba:items-start gba:justify-between gba:flex-wrap gba:sm:flex-nowrap gba:w-full gba:gap-2"
          data-testid="row-external-type-pipeline-stage"
        >
          <FormField
            control={form.control}
            name="pipelineType"
            render={({ field }) => (
              <FormItem className="gba:w-full" data-testid="pipeline-type-field">
                <FormLabel data-testid="pipeline-type-label">Pipeline Type</FormLabel>
                <FormControl>
                  <Select value={field.value || ''} onValueChange={v => field.onChange(v)}>
                    <SelectTrigger className="gba:w-full" data-testid="pipeline-type-select">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DISCOVERY">Discovery</SelectItem>
                      <SelectItem value="QUALIFICATION">Qualification</SelectItem>
                      <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                      <SelectItem value="CLOSED_WON">Closed Won</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pipelineStage"
            render={({ field }) => (
              <FormItem className="gba:w-full" data-testid="pipeline-stage-field">
                <FormLabel data-testid="pipeline-stage-label">Pipeline Stage</FormLabel>
                <FormControl>
                  <CatalogSelect
                    catalogInstanceId="pipelineStage"
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v)}
                    data-testid="pipeline-stage-combobox"
                    {...context}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* standalone Language on one line */}
        <FormField
          control={form.control}
          name="content_type"
          render={({ field }) => (
            <FormItem data-testid="content_type-field">
              <FormLabel data-testid="content_type-label">Content Type</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogInstanceId="contentType"
                  variant="combobox"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="language-combobox"
                  {...context}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CatalogSelectProvider>
    </AppActionForm>
  )
}

export default ExampleCatalogSelectForm
