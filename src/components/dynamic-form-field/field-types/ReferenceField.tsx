import { DynamicFieldDefinition } from '../DynamicFormField'

interface ReferenceFieldProps {
  entityType: string
  field: DynamicFieldDefinition
  fieldName: string
  renderReferenceField: (entityType: string, field: DynamicFieldDefinition, fieldName: string) => React.ReactNode
}

export function ReferenceField({ entityType, field, fieldName, renderReferenceField }: ReferenceFieldProps) {
  if (!renderReferenceField) {
    throw new Error(
      `DynamicFormField: REF_ field type "${field.type}" requires a renderReferenceField prop. ` +
        `Please provide a custom renderer for reference fields.`
    )
  }

  return <>{renderReferenceField(entityType, field, fieldName)}</>
}
