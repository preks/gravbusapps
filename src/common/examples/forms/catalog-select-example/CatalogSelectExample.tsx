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
  SelectValue,
  Combobox,
  Input,
  Textarea,
  Switch
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CatalogSelect } from '@/components/catalog-select'

/**
 * CatalogSelect Example Form
 *
 * Demonstrates:
 * - Namespace-style imports: import { CatalogSelect } from '@/components/catalog-select'
 * - Usage: <CatalogSelect.Provider>, CatalogSelect.useValidation(), CatalogSelect.useContext()
 * - Regular form fields (Input, Textarea, Switch) with standard validation
 * - CatalogSelect fields with self-registration pattern
 * - Multiple instances of same catalog (Birth/Residence Country)
 * - Bi-directional dependencies (Country ↔ Region)
 * - Uni-directional dependencies (InvestmentGroup → InvestmentType)
 * - External filtering (Pipeline Type filters Pipeline Stage)
 * - Conditional validation via CatalogSelect.useValidation hook
 */

type FormValues = {
  // Regular form fields (non-catalog)
  fullName: string
  email: string
  age?: number
  notes?: string
  isActive: boolean
  // Native design system components (for comparison)
  nativeSelect: string
  nativeCombobox: string
  // Catalog select fields
  birthCountry: string
  birthRegion?: string
  residenceCountry: string
  residenceRegion?: string
  language: string
  investmentGroup: string
  investmentType: string
  pipelineType: string
  pipelineStage: string
  contentType: string
}

const FormContent: React.FC<BusinessAppContextProps> = context => {
  const { validateField } = CatalogSelect.useValidation()
  const catalogContext = CatalogSelect.useContext()

  const schema = z
    .object({
      // Regular form fields
      fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
      email: z.email('Invalid email address'),
      age: z.number().int().min(18, 'Must be at least 18').max(120, 'Invalid age').optional(),
      notes: z.string().max(500, 'Notes too long (max 500 characters)').optional(),
      isActive: z.boolean(),

      // Native design system components
      nativeSelect: z.string().min(1, 'Native Select is required'),
      nativeCombobox: z.string().min(1, 'Native Combobox is required'),

      // Catalog fields - always required
      language: z.string().min(1, 'Language is required'),
      birthCountry: z.string().min(1, 'Birth Country is required'),
      residenceCountry: z.string().min(1, 'Residence Country is required'),
      investmentGroup: z.string().min(1, 'InvestmentGroup is required'),
      investmentType: z.string().min(1, 'InvestmentType is required'),
      pipelineType: z.string().min(1, 'Type is required'),
      pipelineStage: z.string().min(1, 'Pipeline Stage is required'),
      contentType: z.string().min(1, 'Content Type is required'),

      // Region fields - conditionally required (validated in superRefine)
      birthRegion: z.string().optional(),
      residenceRegion: z.string().optional()
    })
    .superRefine((data, ctx) => {
      // Conditional validation: regions required only when they have options
      if (validateField('birthRegion')) {
        if (!data.birthRegion || data.birthRegion.trim() === '') {
          ctx.addIssue({
            code: 'custom',
            path: ['birthRegion'],
            message: 'Birth Region is required'
          })
        }
      }

      if (validateField('residenceRegion')) {
        if (!data.residenceRegion || data.residenceRegion.trim() === '') {
          ctx.addIssue({
            code: 'custom',
            path: ['residenceRegion'],
            message: 'Residence Region is required'
          })
        }
      }
    })

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      age: undefined,
      notes: '',
      isActive: true,
      nativeSelect: '',
      nativeCombobox: '',
      birthCountry: 'Country:v1:US',
      birthRegion: 'CountryRegion:v1:US_AL',
      residenceCountry: '',
      residenceRegion: '',
      language: '',
      investmentGroup: '',
      investmentType: '',
      pipelineType: '',
      pipelineStage: '',
      contentType: ''
    },
    mode: 'onSubmit'
  })

  // Register form with provider
  React.useEffect(() => {
    if (catalogContext?.registerForm) {
      catalogContext.registerForm(form)
    }
  }, [catalogContext, form])

  // Form handlers
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
      {/* ===== REGULAR FORM FIELDS (Non-Catalog) ===== */}

      {/* Text Input */}
      <FormField
        control={form.control}
        name="fullName"
        render={({ field }) => (
          <FormItem data-testid="fullname-field">
            <FormLabel data-testid="fullname-label">Full Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Enter your full name" data-testid="fullname-input" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Email Input + Number Input side by side */}
      <div className="gba:flex gba:items-start gba:gap-2">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="gba:w-full" data-testid="email-field">
              <FormLabel data-testid="email-label">Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="email@example.com" data-testid="email-input" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="age"
          render={({ field }) => (
            <FormItem className="gba:w-full" data-testid="age-field">
              <FormLabel data-testid="age-label">Age</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="25"
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  data-testid="age-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Textarea */}
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem data-testid="notes-field">
            <FormLabel data-testid="notes-label">Notes</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value || ''}
                placeholder="Enter any additional notes..."
                rows={3}
                data-testid="notes-textarea"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Switch/Toggle */}
      <FormField
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <FormItem
            className="gba:flex gba:items-center gba:justify-between gba:space-y-0"
            data-testid="isactive-field"
          >
            <div className="gba:space-y-0.5">
              <FormLabel data-testid="isactive-label">Active Status</FormLabel>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="isactive-switch" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ===== NATIVE DESIGN SYSTEM COMPONENTS (For Comparison) ===== */}

      {/* Native Select + Native Combobox side by side */}
      <div className="gba:flex gba:items-start gba:gap-2">
        {/* Native Select */}
        <FormField
          control={form.control}
          name="nativeSelect"
          render={({ field }) => (
            <FormItem className="gba:w-full" data-testid="native-select-field">
              <FormLabel data-testid="native-select-label">Native Select (Design System)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="native-select-trigger">
                    <SelectValue placeholder="Select an option..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="option-1">Option 1</SelectItem>
                  <SelectItem value="option-2">Option 2</SelectItem>
                  <SelectItem value="option-3">Option 3</SelectItem>
                  <SelectItem value="option-4">Option 4</SelectItem>
                  <SelectItem value="option-5">Option 5</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Native Combobox */}
        <FormField
          control={form.control}
          name="nativeCombobox"
          render={({ field }) => (
            <FormItem className="gba:w-full" data-testid="native-combobox-field">
              <FormLabel data-testid="native-combobox-label">Native Combobox (Design System)</FormLabel>
              <FormControl>
                <Combobox
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  options={[
                    { value: 'item-1', label: 'Item 1' },
                    { value: 'item-2', label: 'Item 2' },
                    { value: 'item-3', label: 'Item 3' },
                    { value: 'item-4', label: 'Item 4' },
                    { value: 'item-5', label: 'Item 5' },
                    { value: 'item-6', label: 'Item 6' },
                    { value: 'item-7', label: 'Item 7' },
                    { value: 'item-8', label: 'Item 8' },
                    { value: 'item-9', label: 'Item 9' },
                    { value: 'item-10', label: 'Item 10' }
                  ]}
                  placeholder="Search items..."
                  emptyText="No items found."
                  data-testid="native-combobox"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* ===== CATALOG SELECT FIELDS ===== */}

      {/* standalone Language on one line */}
      <FormField
        control={form.control}
        name="language"
        render={({ field }) => (
          <FormItem data-testid="language-field">
            <FormLabel data-testid="language-label">Language (Catalog)</FormLabel>
            <FormControl>
              <CatalogSelect
                catalogIdentifier="Language:v1"
                value="Language:v1:EA"
                onValueChange={v => field.onChange(v)}
                data-testid="language-combobox"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* a) Birth Country <-> Birth Region */}
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
                  catalogIdentifier="Country:v1"
                  childField="birthRegion"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="birth-country-combobox"
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
                  catalogIdentifier="CountryRegion:v1"
                  parentField="birthCountry"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="birth-region-combobox"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* b) Residence Country <-> Residence Region */}
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
                  catalogIdentifier="Country:v1"
                  childField="residenceRegion"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="residence-country-combobox"
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
                  catalogIdentifier="CountryRegion:v1"
                  parentField="residenceCountry"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="residence-region-combobox"
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
                  catalogIdentifier="InvestmentGroup:v1"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="investment-group-combobox"
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
                  catalogIdentifier="InvestmentType:v1"
                  parentField="investmentGroup"
                  requireSourceForEnable={true}
                  variant="select"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="investment-type-combobox"
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
              <Select value={field.value || ''} onValueChange={v => field.onChange(v)}>
                <FormControl>
                  <SelectTrigger className="gba:w-full" data-testid="pipeline-type-select">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DISCOVERY" data-testid="selectitem-DISCOVERY">
                    Discovery
                  </SelectItem>
                  <SelectItem value="QUALIFICATION" data-testid="selectitem-QUALIFICATION">
                    Qualification
                  </SelectItem>
                  <SelectItem value="NEGOTIATION" data-testid="selectitem-NEGOTIATION">
                    Negotiation
                  </SelectItem>
                  <SelectItem value="CLOSED_WON" data-testid="selectitem-CLOSED_WON">
                    Closed Won
                  </SelectItem>
                </SelectContent>
              </Select>
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
                  catalogIdentifier="InvestmentOpportunityPipelineStage:v1"
                  requireSourceForEnable={true}
                  filterField="pipelineType:type"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="pipeline-stage-combobox"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {/* standalone Content Type on one line */}
      <FormField
        control={form.control}
        name="contentType"
        render={({ field }) => (
          <FormItem data-testid="contentType-field">
            <FormLabel data-testid="contentType-label">Content Type</FormLabel>
            <FormControl>
              <CatalogSelect
                catalogIdentifier="content_type:v1"
                variant="combobox"
                value={field.value || ''}
                onValueChange={v => field.onChange(v)}
                data-testid="content-type-combobox"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </AppActionForm>
  )
}

// Outer component - wraps with Provider (with type-safe form integration)
const CatalogSelectExample: React.FC<BusinessAppContextProps> = context => {
  return (
    <CatalogSelect.Provider<FormValues> {...context}>
      <FormContent {...context} />
    </CatalogSelect.Provider>
  )
}

export default CatalogSelectExample
