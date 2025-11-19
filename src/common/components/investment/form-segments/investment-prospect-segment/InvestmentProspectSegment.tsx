import React from 'react'
import { useFormContext } from 'react-hook-form'
import { DynamicForm, DynamicFormConfiguration } from '@/components/dynamic-form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FilteredGroup, FilteredType } from './useProspectFields'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { InvestmentTypeSelect } from '../investment-type-select'

interface InvestmentProspectSegmentProps {
  /** Investment Group Ref (catalog entry ID) - matches interface field name */
  investmentGroupRef?: string | null
  /** Investment Type Ref (catalog entry ID) - matches interface field name */
  investmentTypeRef?: string | null
  /** Business app context for API access */
  businessAppContext?: BusinessAppContextProps
  /** Optional data-testid prefix */
  testIdPrefix?: string
  /** Optional currency symbol for amount fields */
  currencySymbol?: string
  /** Prospect fields configuration (passed from parent) */
  configuration?: DynamicFormConfiguration | null
  /** Filtered groups with referenceFields (passed from parent) */
  groups?: FilteredGroup[]
  /** Filtered types for selected group (passed from parent) */
  types?: FilteredType[]
  /** Loading state (passed from parent) */
  isLoading?: boolean
}

/**
 * InvestmentProspectSegment Component
 *
 * Renders dynamic prospect fields (referenceFields) from Investment Group/Type catalog configuration.
 * Uses DynamicForm to render form fields based on referenceFields configuration.
 *
 * Receives all catalog data as props from parent component (LeadForm/OpportunityForm) to avoid duplicate requests.
 *
 * @example
 * ```tsx
 * <InvestmentProspectSegment
 *   investmentGroupRef={formValues.investmentGroupRef}
 *   investmentTypeRef={formValues.investmentTypeRef}
 *   businessAppContext={businessAppContext}
 *   configuration={configuration}
 *   groups={groups}
 *   types={types}
 *   isLoading={isLoading}
 *   testIdPrefix="LeadForm"
 * />
 * ```
 */
export const InvestmentProspectSegment: React.FC<InvestmentProspectSegmentProps> = ({
  investmentGroupRef: initialInvestmentGroupRef,
  investmentTypeRef: initialInvestmentTypeRef,
  businessAppContext,
  testIdPrefix = 'InvestmentProspectSegment',
  currencySymbol,
  configuration = null,
  groups = [],
  types = [],
  isLoading = false
}) => {
  const { control, watch, setValue } = useFormContext()

  // Watch investmentGroupRef and investmentTypeRef from form state (matches interface)
  const formInvestmentGroupRef = watch('investmentGroupRef')
  const formInvestmentTypeRef = watch('investmentTypeRef')

  // Use form values directly (they are already strings) or fallback to initial props
  const currentInvestmentGroupRef = formInvestmentGroupRef || initialInvestmentGroupRef || null
  const currentInvestmentTypeRef = formInvestmentTypeRef || initialInvestmentTypeRef || null

  return (
    <div data-testid={formatDataTestId(testIdPrefix, 'Container')} className="gba:space-y-6">
      {/* Investment Name - Always visible */}
      <FormField
        control={control}
        name="investmentName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Investment Name</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter investment name..."
                data-testid={formatDataTestId(testIdPrefix, 'investment-name')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Investment Group Selection - Always visible (filtered to only groups with referenceFields) */}
      <FormField
        control={control}
        name="investmentGroupRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Investment Group</FormLabel>
            <FormControl>
              <Select
                value={field.value || ''}
                onValueChange={v => {
                  field.onChange(v || '')
                  // Clear investment type when group changes
                  setValue('investmentTypeRef', null)
                }}
                disabled={isLoading}
                data-testid={formatDataTestId(testIdPrefix, 'investment-group')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select investment group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Investment Type Selection and prospect fields - only if investment group is selected */}
      {currentInvestmentGroupRef && (
        <>
          {/* Investment Type Selection - shown before prospect fields */}
          <InvestmentTypeSelect
            investmentGroupRef={currentInvestmentGroupRef}
            fieldName="investmentTypeRef"
            businessAppContext={businessAppContext}
            testIdPrefix={formatDataTestId(testIdPrefix, 'type-select')}
            required={false}
            readOnly={false}
            label="Investment Type"
            description="Select the investment type to configure investment details"
            types={types}
            isLoading={isLoading}
          />

          {/* Render DynamicForm with prospect fields configuration - only if type is selected */}
          {currentInvestmentTypeRef && (
            <DynamicForm
              configuration={configuration || { formFields: [] }}
              control={control}
              accessToken={businessAppContext?.accessToken || ''}
              testIdPrefix={formatDataTestId(testIdPrefix, 'prospect-fields')}
              currencySymbol={currencySymbol}
              isLoading={isLoading}
              error={null}
              emptyMessage="No investment details fields configured for this investment type"
            />
          )}
        </>
      )}
    </div>
  )
}

export default InvestmentProspectSegment
