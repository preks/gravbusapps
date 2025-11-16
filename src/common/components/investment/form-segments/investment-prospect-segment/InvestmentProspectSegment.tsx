import React from 'react'
import { useFormContext } from 'react-hook-form'
import { DynamicForm } from '@/components/dynamic-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProspectFields } from './useProspectFields'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { InvestmentTypeSelect } from '../investment-type-select'
import { CatalogSelect } from '@/components/catalog-select'

interface InvestmentProspectSegmentProps {
  /** Investment Group ID (catalog entry ID) */
  investmentGroupId?: string | null
  /** Investment Type ID (catalog entry ID) */
  investmentTypeId?: string | null
  /** Business app context for API access */
  businessAppContext?: BusinessAppContextProps
  /** Optional data-testid prefix */
  testIdPrefix?: string
  /** Optional currency symbol for amount fields */
  currencySymbol?: string
}

/**
 * InvestmentProspectSegment Component
 *
 * Renders dynamic prospect fields (referenceFields) from Investment Group/Type catalog configuration.
 * Uses DynamicForm to render form fields based on referenceFields configuration.
 *
 * @example
 * ```tsx
 * <InvestmentProspectSegment
 *   investmentGroupId={formValues.investmentGroup?.id}
 *   investmentTypeId={formValues.investmentType?.id}
 *   businessAppContext={businessAppContext}
 *   testIdPrefix="LeadForm"
 * />
 * ```
 */
export const InvestmentProspectSegment: React.FC<InvestmentProspectSegmentProps> = ({
  investmentGroupId,
  investmentTypeId: initialInvestmentTypeId,
  businessAppContext,
  testIdPrefix = 'InvestmentProspectSegment',
  currencySymbol
}) => {
  const { control, watch, setValue } = useFormContext()

  // Watch the investment type from form state (in case it changes via InvestmentTypeSelect)
  const formInvestmentType = watch('investmentType')
  const currentInvestmentTypeId =
    typeof formInvestmentType === 'object' ? formInvestmentType?.id : formInvestmentType || initialInvestmentTypeId

  // Load prospect fields configuration from catalog
  const { configuration, isLoading, error } = useProspectFields({
    investmentGroupId,
    investmentTypeId: currentInvestmentTypeId,
    businessAppContext
  })

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

      {/* Investment Group Selection - Always visible */}
      <FormField
        control={control}
        name="investmentGroup"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Investment Group</FormLabel>
            <FormControl>
              <CatalogSelect
                catalogIdentifier="InvestmentGroup:v1"
                value={field.value || ''}
                onValueChange={v => {
                  field.onChange(v || '')
                  // Clear investment type when group changes
                  setValue('investmentType', null)
                }}
                data-testid={formatDataTestId(testIdPrefix, 'investment-group')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Investment Type Selection and prospect fields - only if investment group is selected */}
      {investmentGroupId && (
        <>
          {/* Investment Type Selection - shown before prospect fields */}
          <InvestmentTypeSelect
            investmentGroupId={investmentGroupId}
            fieldName="investmentType"
            businessAppContext={businessAppContext}
            testIdPrefix={formatDataTestId(testIdPrefix, 'type-select')}
            required={false}
            readOnly={false}
            label="Investment Type"
            description="Select the investment type to configure investment details"
          />

          {/* Render DynamicForm with prospect fields configuration - only if type is selected */}
          {currentInvestmentTypeId && (
            <DynamicForm
              configuration={configuration || { formFields: [] }}
              control={control}
              accessToken={businessAppContext?.accessToken || ''}
              testIdPrefix={formatDataTestId(testIdPrefix, 'prospect-fields')}
              currencySymbol={currencySymbol}
              isLoading={isLoading}
              error={error}
              emptyMessage="No investment details fields configured for this investment type"
            />
          )}
        </>
      )}
    </div>
  )
}

export default InvestmentProspectSegment
