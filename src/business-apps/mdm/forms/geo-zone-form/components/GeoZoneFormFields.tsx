import { TextField, TextAreaField } from '@/business-apps/mdm/components/form-fields/FormFields'
import { GeoZoneFormValues } from '@/business-apps/mdm/apps/organizational-data/types/GeoZone.types'

interface GeoZoneFormFieldsProps {
  prefixDataTestId: string
}

export function GeoZoneFormFields(props: Readonly<GeoZoneFormFieldsProps>) {
  const { prefixDataTestId } = props

  return (
    <>
      <TextField<GeoZoneFormValues>
        name="code"
        label="Code"
        required
        placeholder="Enter geo zone code"
        maxLength={255}
        dataTestId={`${prefixDataTestId}-code-input`}
      />

      <TextField<GeoZoneFormValues>
        name="name"
        label="Name"
        required
        placeholder="Enter geo zone name"
        maxLength={255}
        dataTestId={`${prefixDataTestId}-name-input`}
      />

      <TextAreaField<GeoZoneFormValues>
        name="description"
        label="Description"
        required={false}
        placeholder="Enter geo zone description"
        rows={3}
        maxLength={1024}
        dataTestId={`${prefixDataTestId}-description-input`}
      />
    </>
  )
}
