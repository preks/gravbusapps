import React from 'react'
import { useFormContext } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import CampaignSelect, { type CampaignOption } from './CampaignSelect'

interface SalesCampaignFieldProps {
  /** Business app context required by the underlying CampaignSelect hook. */
  businessAppContext: BusinessAppContextProps
  /** Pre-selected campaign data so the value renders before the search list resolves. */
  initialCampaign?: CampaignOption | null
  /** Required prefix for data-testids so callers stay distinguishable. */
  dataTestIdPrefix: string
  /** Form field name to bind to. Defaults to the conventional `salesCampaignId`. */
  fieldName?: string
}

/**
 * Form-bound wrapper around `CampaignSelect`. Wires the underlying combobox to a RHF field
 * (default `salesCampaignId`) and standardizes label / placeholder / data-testid plumbing.
 *
 * Lives next to the underlying select so anyone discovering "the campaign UI" finds both the
 * raw primitive and the form-bound wrapper in one folder.
 */
const SalesCampaignField: React.FC<SalesCampaignFieldProps> = ({
  businessAppContext,
  initialCampaign = null,
  dataTestIdPrefix,
  fieldName = 'salesCampaignId'
}) => {
  const form = useFormContext<any>()

  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Sales Campaign</FormLabel>
          <FormControl>
            <CampaignSelect
              value={field.value || null}
              onValueChange={(v: string | null) => field.onChange(v || '')}
              businessAppContext={businessAppContext}
              selectedCampaign={initialCampaign}
              placeholder="Search Campaign..."
              data-testid={formatDataTestId(dataTestIdPrefix, 'campaign-select')}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export default SalesCampaignField
export { SalesCampaignField }
