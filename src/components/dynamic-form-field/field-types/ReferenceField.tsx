import { ControllerRenderProps, FieldValues } from 'react-hook-form'
import { DynamicFieldDefinition } from '../DynamicFormField'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface ReferenceFieldProps<TFieldValues extends FieldValues = FieldValues> {
  entityType: string
  field: DynamicFieldDefinition
  fieldName: string
  formField: ControllerRenderProps<TFieldValues>
  renderReferenceField?: (
    entityType: string,
    field: DynamicFieldDefinition,
    fieldName: string,
    formField: ControllerRenderProps<TFieldValues>,
    businessAppContext: BusinessAppContextProps
  ) => React.ReactNode
  businessAppContext: BusinessAppContextProps
}

export function ReferenceField<TFieldValues extends FieldValues = FieldValues>({
  entityType,
  field,
  fieldName,
  formField,
  renderReferenceField,
  businessAppContext
}: ReferenceFieldProps<TFieldValues>) {
  if (!renderReferenceField) {
    throw new Error(
      `DynamicFormField: REF_ field type "${field.type}" requires a renderReferenceField prop. ` +
        `Please provide a custom renderer for reference fields.`
    )
  }

  return <>{renderReferenceField(entityType, field, fieldName, formField, businessAppContext)}</>
}
