import { useState, useEffect, useCallback } from 'react'
import { Combobox, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { Control, FieldValues, Path } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { DynamicFieldDefinition } from '../DynamicFormField'

interface CatalogFieldProps<TFieldValues extends FieldValues = FieldValues> {
  catalogName: string
  field: DynamicFieldDefinition
  fieldName: string
  control: Control<TFieldValues>
  accessToken: string
  testIdPrefix: string
}

export function CatalogField<TFieldValues extends FieldValues = FieldValues>({
  catalogName,
  field,
  fieldName,
  control,
  accessToken,
  testIdPrefix
}: CatalogFieldProps<TFieldValues>) {
  const catalogClient = useCatalogManagerClient(accessToken)
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(false)

  const loadCatalogData = useCallback(
    async (search: string = '') => {
      setLoading(true)
      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: catalogName,
            version: 'v1'
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: false,
            includeChildCatalogEntries: true,
            ...(search && { searchCriteria: search })
          }
        )

        const catalogOptions = (response.data || []).map((entry: any) => ({
          value: entry.id || '',
          label: entry.value || entry.code || entry.id || ''
        }))

        setOptions(catalogOptions)
      } catch (error) {
        console.error(`Error loading catalog ${catalogName}:`, error)
        setOptions([])
      } finally {
        setLoading(false)
      }
    },
    [catalogClient, catalogName]
  )

  // Initial load
  useEffect(() => {
    loadCatalogData('')
  }, [loadCatalogData])

  // Handle search
  const handleSearch = useCallback(
    (query: string) => {
      loadCatalogData(query)
    },
    [loadCatalogData]
  )

  return (
    <FormField
      key={fieldName}
      control={control}
      name={fieldName as Path<TFieldValues>}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>
            {field.label} {field.required && <span className="gba:text-destructive">*</span>}
          </FormLabel>
          <FormControl>
            <Combobox
              className="gba:w-full"
              options={options}
              value={typeof formField.value === 'object' ? formField.value?.id || '' : formField.value || ''}
              onValueChange={value => {
                // Store as object if value exists, undefined if cleared
                formField.onChange(value ? ({ id: value } as any) : undefined)
              }}
              placeholder={`Select ${field.label.toLowerCase()}`}
              searchPlaceholder="Type to search..."
              emptyText={loading ? 'Loading...' : 'No results found'}
              onSearch={handleSearch}
              searchDebounce={300}
              loading={loading}
              data-testid={formatDataTestId(testIdPrefix, `${fieldName}Combobox`)}
              align="start"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
